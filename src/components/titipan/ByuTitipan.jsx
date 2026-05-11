/**
 * ByuTitipan — modul By-U Music di /byu-music.
 *
 * Fase 1 (sebelum 2026-06-15 00:00 WIB): kumpulkan dukungan.
 * Tombol "Saya menunggu" → increment Firebase counter (dedup
 * localStorage). Centerpiece: hati anatomis yg berdenyut, intensitas
 * glow naik per supporter. Plus countdown DD/HH/MM/SS.
 *
 * Fase 2 (15 Juni dan setelahnya): auto-reveal player. <audio> HTML5
 * dengan source FLAC (Chrome/Firefox/Edge desktop native; Safari iOS
 * < 17 mungkin tidak putar).
 *
 * URL override testing: ?force=release / ?force=preview.
 *
 * Reuse byuSupportDb.js Firebase wrapper.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  subscribeToByuSupportCount,
  incrementByuSupport,
} from '../../lib/byuSupportDb';

const RELEASE_ISO = '2026-06-15T00:00:00+07:00';
const RELEASE_DATE = new Date(RELEASE_ISO);
const AUDIO_URL = '/byUmusic/By-U%20-%20Putri%20Helisma%20(16%20BIT).flac';
const SUPPORT_CLICKED_KEY = 'byu-support-clicked';

const formatNumber = (n) => n.toLocaleString('id-ID');

const useCountdown = (target) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

// Anatomical heart SVG — shape sama dgn /denyut (ventricle asimetris,
// aorta arch, pulmonary trunk, vena cava, coronary arteries). Tone
// disesuaikan utk bg cream /byu-music (deep red yg masih kontras).
const AnatomicalHeartSvg = () => (
  <svg
    viewBox="0 0 100 100"
    width="100%"
    height="100%"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <defs>
      <radialGradient id="byuHeartGlow" cx="55%" cy="45%" r="65%">
        <stop offset="0%" stopColor="#e85060" />
        <stop offset="40%" stopColor="#b02838" />
        <stop offset="85%" stopColor="#6a1822" />
        <stop offset="100%" stopColor="#3a0810" />
      </radialGradient>
      <radialGradient id="byuHeartHighlight" cx="35%" cy="35%" r="40%">
        <stop offset="0%" stopColor="rgba(255,190,190,0.6)" />
        <stop offset="100%" stopColor="rgba(255,190,190,0)" />
      </radialGradient>
      <linearGradient id="byuAorta" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8a2028" />
        <stop offset="100%" stopColor="#b03d48" />
      </linearGradient>
      <linearGradient id="byuPulm" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5a3048" />
        <stop offset="100%" stopColor="#984868" />
      </linearGradient>
    </defs>
    <path d="M68 6 Q70 18 64 28" fill="none" stroke="#6a2a38" strokeWidth="5" strokeLinecap="round" />
    <path d="M48 26 Q48 8 60 6 Q74 6 76 22 L74 36" fill="none" stroke="url(#byuAorta)" strokeWidth="7" strokeLinecap="round" />
    <path d="M40 28 Q34 16 26 14" fill="none" stroke="url(#byuPulm)" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M30 18 Q24 16 20 22" fill="none" stroke="url(#byuPulm)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
    <path
      d="M50 30 Q32 24 22 38 Q14 52 24 70 Q34 86 44 92 Q48 94 46 88 Q42 78 44 70 Q38 66 36 58 Q44 64 50 62 Q58 66 64 60 Q66 70 62 78 Q60 86 64 90 Q76 80 80 64 Q84 48 76 38 Q66 28 56 32 Q52 30 50 30 Z"
      fill="url(#byuHeartGlow)"
      stroke="#2a0408"
      strokeWidth="0.6"
    />
    <ellipse cx="38" cy="46" rx="14" ry="10" fill="url(#byuHeartHighlight)" opacity="0.7" />
    <path d="M48 34 Q44 50 38 70 Q42 82 46 88" fill="none" stroke="#4a0810" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
    <path d="M58 36 Q66 42 70 56 Q70 70 64 84" fill="none" stroke="#4a0810" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
    <path d="M42 56 Q36 60 32 66" fill="none" stroke="#4a0810" strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
  </svg>
);

// Centerpiece beating heart. `intensity` (0–1) scales halo glow,
// `period` (CSS time) controls speed. Animation pakai PQRST shape
// (spike cepat 14%, dip 28%, second spike 42%, rest 70%+) — sama
// dgn /denyut supaya feel-nya konsisten antar fitur.
const BeatingHeart = ({ intensity = 0.5, period = '1.1s' }) => {
  const haloOpacity = 0.4 + intensity * 0.5;
  return (
    <div
      className="relative flex items-center justify-center mb-8"
      style={{ '--byu-beat': period }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -m-12 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(180,40,55,${haloOpacity}) 0%, transparent 65%)`,
          animation: 'byuHaloPulse var(--byu-beat) ease-in-out infinite',
        }}
      />
      <div
        className="relative w-44 h-44 sm:w-52 sm:h-52 drop-shadow-[0_4px_20px_rgba(139,30,40,0.4)]"
        style={{
          animation: 'byuHeartBeat var(--byu-beat) ease-in-out infinite',
        }}
      >
        <AnatomicalHeartSvg />
      </div>
      <style>{`
        @keyframes byuHeartBeat {
          0%   { transform: scale(1); }
          14%  { transform: scale(1.13); }
          28%  { transform: scale(0.99); }
          42%  { transform: scale(1.07); }
          70%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        @keyframes byuHaloPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          14%      { opacity: 0.95; transform: scale(1.07); }
          70%      { opacity: 0.55; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="byuHeartBeat"], [class*="byuHaloPulse"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

const CountdownDisplay = ({ days, hours, minutes, seconds }) => (
  <div className="flex items-center justify-center gap-4 sm:gap-6 mb-8">
    {[
      { v: days, label: 'hari' },
      { v: hours, label: 'jam' },
      { v: minutes, label: 'menit' },
      { v: seconds, label: 'detik' },
    ].map((u) => (
      <div key={u.label} className="text-center">
        <div
          className="font-header text-3xl sm:text-5xl font-black tabular-nums leading-none text-[color:var(--retro-burgundy)]"
        >
          {String(u.v).padStart(2, '0')}
        </div>
        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-2 text-[color:var(--retro-burgundy)]/60">
          {u.label}
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
    <>
      <BeatingHeart
        intensity={Math.min(1, 0.4 + supporters / 200)}
        period="1.1s"
      />

      <p className="text-center font-header italic text-base sm:text-lg text-[color:var(--retro-text-primary)] leading-relaxed mb-8 max-w-xl mx-auto">
        Lagu ini masih tersegel. Akan dibuka pada{' '}
        <span className="text-[color:var(--retro-burgundy)] not-italic font-bold">15 Juni 2026</span>.
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
              className="inline-block px-6 py-3 rounded-full border border-[color:var(--retro-burgundy)]/30 bg-[color:var(--retro-burgundy)]/5 text-[color:var(--retro-burgundy)] text-sm font-header italic"
            >
              Terima kasih, kau salah satu yang menjaga.
            </div>
            <div className="text-[11px] tracking-wide text-[color:var(--color-text-secondary)]">
              {formatNumber(supporters)} orang sedang menjaga lagu ini.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleClick}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)] hover:border-[color:var(--retro-burgundy-light)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-mail-line text-base" aria-hidden="true" />
              <span className="font-header text-[11px] sm:text-xs font-black uppercase tracking-[0.32em]">
                {submitting ? 'Mencatat...' : 'Saya menunggu'}
              </span>
            </button>
            <div className="text-[11px] tracking-wide text-[color:var(--color-text-secondary)]">
              {formatNumber(supporters)} orang sedang menjaga lagu ini.
            </div>
            {error && (
              <div className="text-[11px] text-[color:var(--retro-burgundy)]">{error}</div>
            )}
          </div>
        )}
      </div>
    </>
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
    <>
      {/* Released — heart yg sama, tapi denyut lebih cepat saat lagu
          jalan (kayak adrenalin), pelan saat di-pause. */}
      <BeatingHeart intensity={1} period={isPlaying ? '0.85s' : '1.1s'} />

      <audio ref={audioRef} src={AUDIO_URL} preload="metadata" />

      {audioError ? (
        <div className="text-center text-sm text-[color:var(--retro-burgundy)] mb-6 max-w-md mx-auto">
          Audio gagal dimuat. Coba di Chrome/Firefox/Edge desktop.
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <div
            className="w-full h-1.5 rounded-full bg-[color:var(--retro-burgundy)]/15 cursor-pointer mb-2 group"
            onClick={seek}
          >
            <div
              className="h-full rounded-full bg-[color:var(--retro-burgundy)] transition-all group-hover:bg-[color:var(--retro-burgundy-light)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] tabular-nums mb-6 text-[color:var(--color-text-secondary)]">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>

          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Jeda' : 'Putar'}
              className="w-16 h-16 rounded-full bg-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy-light)] text-[color:var(--retro-cream)] flex items-center justify-center transition shadow-xl"
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
        </div>
      )}

      <div className="text-center font-header italic text-sm text-[color:var(--color-text-secondary)]">
        Lagu ini dijaga oleh{' '}
        <span className="text-[color:var(--retro-burgundy)] not-italic font-bold">
          {formatNumber(supporters)} orang
        </span>{' '}
        sampai hari ini.
      </div>

      <div className="mt-4 text-center text-[10px] text-[color:var(--color-text-secondary)]/65 italic">
        iPhone Safari lama mungkin tidak putar FLAC — gunakan Chrome/Firefox.
      </div>
    </>
  );
};

const ByuTitipan = () => {
  const [searchParams] = useSearchParams();
  const force = searchParams.get('force');
  const [supporters, setSupporters] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsub = subscribeToByuSupportCount((count) => setSupporters(count));
    return unsub;
  }, []);

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
    <section
      id="titipan-byu"
      className="px-5 sm:px-6 md:px-12 lg:px-20 pb-14 md:pb-20"
    >
      <div className="max-w-3xl mx-auto">
        <div className="rounded-[2rem] bg-white/70 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/10 px-6 sm:px-10 py-10 sm:py-12 shadow-sm">
          <div className="text-center mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
              <i className="ri-music-2-line text-base" aria-hidden="true" />
              {isReleased ? 'Lagu Kebuka' : 'Lagu Kesegel'}
            </p>
          </div>
          {isReleased ? (
            <ReleasedView supporters={supporters} />
          ) : (
            <PreReleaseView supporters={supporters} />
          )}
        </div>
      </div>
    </section>
  );
};

export default ByuTitipan;
