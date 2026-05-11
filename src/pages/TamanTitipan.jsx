/**
 * Taman Kebaikan — Petak Titipan: By-U.
 *
 * Page khusus untuk lagu "By-U" oleh Putri Helisma (Eli) — titipan
 * yang dirilis di 15 Juni 2026.
 *
 * State machine date-based:
 * - PRE-RELEASE (sebelum 2026-06-15 00:00 WIB): hero amplop tersegel
 *   + countdown timer + tombol "Saya menunggu" yang increment counter
 *   Firebase. Setelah user klik (localStorage dedup), button replaced
 *   dgn "terima kasih, kau salah satu yang menjaga". Live counter
 *   "{N} orang sedang menjaga" subscribed dari /byu_support_count.
 * - RELEASED (15 Juni dan setelahnya): auto-reveal player <audio>
 *   dengan source FLAC. Final count: "Lagu ini dijaga oleh {N} orang".
 *
 * URL override testing: `?force=release` atau `?force=preview` di
 * query string untuk skip date check (dev only).
 *
 * FLAC compatibility: Chrome/Firefox/Edge/Safari Mac native. Safari
 * iOS < 17 mungkin gak putar — warning di footer untuk iPhone user.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import {
  subscribeToByuSupportCount,
  incrementByuSupport,
} from '../lib/byuSupportDb';

// Release date — 15 Juni 2026 00:00 WIB (UTC+7). Used buat state
// machine + countdown calculation.
const RELEASE_ISO = '2026-06-15T00:00:00+07:00';
const RELEASE_DATE = new Date(RELEASE_ISO);

// Audio file path — served from public/byUmusic/. URL-encoded.
const AUDIO_URL = '/byUmusic/By-U%20-%20Putri%20Helisma%20(16%20BIT).flac';

// localStorage key untuk dedup support click.
const SUPPORT_CLICKED_KEY = 'byu-support-clicked';

// Countdown hook — recompute remaining time per second.
const useCountdown = (targetDate) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, targetDate.getTime() - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, done: diff === 0 };
};

// Format number dgn separator ribuan.
const formatNumber = (n) => n.toLocaleString('id-ID');

const TitipanHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 md:px-6 md:py-5">
    <div className="pointer-events-auto">
      <Link
        to="/taman/peta"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        <span className="md:hidden">← Peta</span>
        <span className="hidden md:inline">← Peta Taman</span>
      </Link>
    </div>
    <div className="text-center">
      <div className="text-white/45 text-[8px] md:text-[9px] uppercase tracking-[0.35em] md:tracking-[0.45em] mb-0.5">
        Kenangan Titipan
      </div>
      <div
        className="text-white/85 text-[13px] md:text-sm tracking-wide"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        By-U
      </div>
    </div>
    <div className="pointer-events-auto w-[60px] md:w-[100px]" />
  </div>
);

// Sealed envelope visual — div-based (no Three.js, biar bundle ringan
// — page ini fokus pada audio + state, gak perlu scene 3D).
const SealedEnvelope = ({ supporters }) => {
  // Pulse intensity scaled dgn supporters count — lebih banyak penjaga,
  // glow lebih kuat (capped at 1.0).
  const glowScale = Math.min(1.0, 0.35 + supporters / 200);
  return (
    <div className="relative flex items-center justify-center mb-10">
      {/* Glow halo */}
      <div
        className="absolute inset-0 -m-12 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(255,170,80,${0.18 * glowScale}) 0%, transparent 70%)`,
          animation: 'byuGlowPulse 3.2s ease-in-out infinite',
        }}
      />
      {/* Pedestal */}
      <div
        className="relative w-56 h-44 rounded-md border-2 border-amber-200/40 bg-[#2a1f15]/85 backdrop-blur-sm shadow-2xl flex items-center justify-center"
        style={{
          boxShadow: `0 0 ${30 * glowScale}px rgba(255,170,80,${0.4 * glowScale}), inset 0 0 24px rgba(255,170,80,0.08)`,
          animation: 'byuEnvelopePulse 3.2s ease-in-out infinite',
        }}
      >
        {/* Wax seal — circle dengan B inside */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-red-700 to-red-900 border border-amber-200/30 flex items-center justify-center shadow-lg">
          <span
            className="text-amber-100 text-2xl"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
            }}
          >
            B
          </span>
        </div>
        {/* Envelope ribbon strips */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-amber-200/20" />
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-amber-200/20" />
      </div>
      <style>{`
        @keyframes byuEnvelopePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes byuGlowPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const CountdownDisplay = ({ days, hours, minutes, seconds }) => (
  <div className="flex items-center justify-center gap-3 md:gap-5 mb-8 text-center">
    {[
      { v: days, label: 'hari' },
      { v: hours, label: 'jam' },
      { v: minutes, label: 'menit' },
      { v: seconds, label: 'detik' },
    ].map((unit) => (
      <div key={unit.label}>
        <div
          className="text-white text-3xl md:text-5xl tabular-nums leading-none"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 400,
          }}
        >
          {String(unit.v).padStart(2, '0')}
        </div>
        <div className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-[0.3em] mt-2">
          {unit.label}
        </div>
      </div>
    ))}
  </div>
);

const PreReleaseView = ({ supporters }) => {
  const { days, hours, minutes, seconds } = useCountdown(RELEASE_DATE);
  const [hasClicked, setHasClicked] = useState(() => {
    try {
      return localStorage.getItem(SUPPORT_CLICKED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    if (hasClicked || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await incrementByuSupport();
    setSubmitting(false);
    if (result.ok) {
      try {
        localStorage.setItem(SUPPORT_CLICKED_KEY, '1');
      } catch {
        /* storage blocked */
      }
      setHasClicked(true);
    } else {
      setError(result.error || 'Gagal menyimpan dukungan.');
    }
  };

  return (
    <div className="max-w-xl w-full px-6">
      <div className="text-center mb-6">
        <div className="text-white/45 text-[10px] md:text-[11px] uppercase tracking-[0.4em] mb-3">
          Titipan Lagu
        </div>
        <h1
          className="text-white text-4xl md:text-6xl mb-2"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            textShadow: '0 0 30px rgba(255,170,80,0.18)',
          }}
        >
          By-U
        </h1>
        <p className="text-white/55 text-sm md:text-base tracking-wide mb-1">
          Putri Helisma
        </p>
      </div>

      <SealedEnvelope supporters={supporters} />

      <p
        className="text-center text-white/65 text-sm md:text-base leading-relaxed mb-8 px-4"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Lagu ini masih tersegel. Akan dibuka pada{' '}
        <span className="text-white/85">15 Juni 2026</span>.
        <br />
        Sampai saat itu, kita yang menjaganya.
      </p>

      <CountdownDisplay
        days={days}
        hours={hours}
        minutes={minutes}
        seconds={seconds}
      />

      <div className="text-center">
        {hasClicked ? (
          <div className="space-y-3">
            <div
              className="inline-block px-6 py-3 rounded-full border border-amber-200/30 bg-amber-200/5 text-amber-100/85 text-sm"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
              }}
            >
              Terima kasih, kau salah satu yang menjaga.
            </div>
            <div className="text-white/55 text-[11px] tracking-wide">
              {formatNumber(supporters)} orang sedang menjaga lagu ini.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleClick}
              disabled={submitting}
              className="px-7 py-3.5 rounded-full bg-white text-black text-sm md:text-base font-medium hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Mencatat...' : 'Saya menunggu'}
            </button>
            <div className="text-white/45 text-[11px] tracking-wide">
              {formatNumber(supporters)} orang sedang menjaga lagu ini.
            </div>
            {error && (
              <div className="text-red-300/85 text-[11px]">{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ReleasedView = ({ supporters }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setAudioError(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => setAudioError(true));
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const fmt = (sec) => {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-xl w-full px-6">
      <div className="text-center mb-8">
        <div className="text-white/45 text-[10px] md:text-[11px] uppercase tracking-[0.4em] mb-3">
          Titipan Terbuka
        </div>
        <h1
          className="text-white text-4xl md:text-6xl mb-2"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            textShadow: '0 0 30px rgba(255,170,80,0.25)',
          }}
        >
          By-U
        </h1>
        <p className="text-white/55 text-sm md:text-base tracking-wide">
          Putri Helisma
        </p>
      </div>

      {/* Album art / cover area — pakai sealed envelope style tapi
          "terbuka" — circle glow lebih kuat tanpa seal. */}
      <div className="relative flex items-center justify-center mb-8">
        <div
          className="absolute inset-0 -m-12 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(255,170,80,0.32) 0%, transparent 70%)',
            animation: isPlaying ? 'byuGlowPulse 1.8s ease-in-out infinite' : 'byuGlowPulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="relative w-56 h-56 rounded-full border-2 border-amber-200/40 bg-[#2a1f15]/85 backdrop-blur-sm shadow-2xl flex items-center justify-center"
          style={{
            boxShadow: '0 0 40px rgba(255,170,80,0.4), inset 0 0 30px rgba(255,170,80,0.12)',
          }}
        >
          <span
            className="text-amber-100/95 text-5xl"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
            }}
          >
            B
          </span>
        </div>
      </div>

      {/* Audio element — hidden, controlled by custom UI */}
      <audio ref={audioRef} src={AUDIO_URL} preload="metadata" />

      {audioError ? (
        <div className="text-center text-red-300/85 text-sm mb-6">
          Audio gagal dimuat. Coba di Chrome/Firefox/Edge desktop.
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div
            className="w-full h-1.5 rounded-full bg-white/10 cursor-pointer mb-2 group"
            onClick={seek}
          >
            <div
              className="h-full rounded-full bg-amber-200/85 transition-all group-hover:bg-amber-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-white/45 text-[11px] tabular-nums mb-6">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>

          {/* Play/pause control */}
          <div className="flex justify-center mb-8">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Jeda' : 'Putar'}
              className="w-16 h-16 rounded-full bg-amber-200/85 hover:bg-amber-200 text-[#2a1f15] flex items-center justify-center transition shadow-xl"
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </>
      )}

      <div
        className="text-center text-white/55 text-[12px] md:text-[13px] leading-relaxed"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Lagu ini dijaga oleh{' '}
        <span className="text-amber-100/90">{formatNumber(supporters)} orang</span>{' '}
        sampai hari ini.
      </div>
    </div>
  );
};

const TamanTitipanPage = () => {
  const [searchParams] = useSearchParams();
  const force = searchParams.get('force');
  const [supporters, setSupporters] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Subscribe live counter
  useEffect(() => {
    const unsub = subscribeToByuSupportCount((count) => {
      setSupporters(count);
    });
    return unsub;
  }, []);

  // Re-evaluate "released" status setiap menit supaya transition tepat
  // di hari rilis tanpa hard refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isReleased = useMemo(() => {
    if (force === 'release') return true;
    if (force === 'preview') return false;
    return now >= RELEASE_DATE.getTime();
  }, [force, now]);

  return (
    <>
      <Seo
        title="By-U · Titipan Lagu"
        description="Lagu By-U oleh Putri Helisma — titipan yang akan dibuka 15 Juni 2026. Kita yang menjaganya sampai hari itu."
        path="/taman/titipan"
      />
      <div className="relative w-full min-h-screen bg-gradient-to-b from-[#1c1f2a] via-[#1a1f2e] to-[#0d0f18] flex items-center justify-center overflow-hidden select-none">
        <TitipanHeader />

        <Suspense fallback={null}>
          {isReleased ? (
            <ReleasedView supporters={supporters} />
          ) : (
            <PreReleaseView supporters={supporters} />
          )}
        </Suspense>

        {/* Footer note — credit + iPhone Safari warning */}
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center px-4">
          <div className="text-white/30 text-[9px] md:text-[10px] tracking-wide leading-relaxed">
            {isReleased
              ? 'iPhone Safari lama mungkin tidak putar FLAC — gunakan Chrome/Firefox.'
              : 'Akan dibuka 15 Juni 2026'}
          </div>
        </div>
      </div>
    </>
  );
};

export default TamanTitipanPage;
