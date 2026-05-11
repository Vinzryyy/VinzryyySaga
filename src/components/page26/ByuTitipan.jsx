/**
 * ByuTitipan — modul kedua Harmoni Kebaikan: lagu "By-U" oleh Putri
 * Helisma. Section di /26, di bawah Pohon Kebaikan.
 *
 * Fase 1 (sebelum 2026-06-15 00:00 WIB): kumpulkan dukungan.
 * Tombol "Saya menunggu" → increment Firebase counter (dedup
 * localStorage). Sealed envelope + countdown DD/HH/MM/SS.
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

const SealedEnvelope = ({ supporters }) => {
  const glow = Math.min(1, 0.35 + supporters / 200);
  return (
    <div className="relative flex items-center justify-center mb-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 -m-10 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(201,169,97,${0.28 * glow}) 0%, transparent 70%)`,
          animation: 'byuGlowPulse 3.2s ease-in-out infinite',
        }}
      />
      <div
        className="relative w-56 h-44 rounded-md border-2 border-[color:var(--retro-gold)]/55 bg-[color:var(--retro-cream)] shadow-2xl flex items-center justify-center"
        style={{
          boxShadow: `0 0 ${28 * glow}px rgba(201,169,97,${0.45 * glow}), inset 0 0 22px rgba(139,64,64,0.06)`,
          animation: 'byuEnvelopePulse 3.2s ease-in-out infinite',
        }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-[color:var(--retro-burgundy)] to-[color:var(--retro-burgundy)]/80 border border-[color:var(--retro-gold)]/60 flex items-center justify-center shadow-lg">
          <span
            className="text-[color:var(--retro-cream)] text-2xl"
            style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
          >
            B
          </span>
        </div>
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-[color:var(--retro-gold)]/25" />
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-[color:var(--retro-gold)]/25" />
      </div>
      <style>{`
        @keyframes byuEnvelopePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes byuGlowPulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
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
      <SealedEnvelope supporters={supporters} />

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
      <div className="relative flex items-center justify-center mb-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -m-10 rounded-full blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(201,169,97,0.4) 0%, transparent 70%)',
            animation: isPlaying ? 'byuGlowPulse 1.8s ease-in-out infinite' : 'byuGlowPulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full border-2 border-[color:var(--retro-gold)]/55 bg-gradient-to-br from-[color:var(--retro-cream)] to-[color:var(--retro-cream-dark)] flex items-center justify-center shadow-2xl"
          style={{
            boxShadow: '0 0 36px rgba(201,169,97,0.4), inset 0 0 26px rgba(139,64,64,0.08)',
          }}
        >
          <span
            className="text-[color:var(--retro-burgundy)] text-5xl"
            style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
          >
            B
          </span>
        </div>
      </div>

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
        <div className="text-center mb-8 md:mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
            <i className="ri-music-2-line text-base" aria-hidden="true" />
            {isReleased ? 'Modul Kedua · Titipan Terbuka' : 'Modul Kedua · Titipan Lagu'}
          </p>
          <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-2">
            <span className="italic font-normal">By-U</span>
            <span className="text-[color:var(--retro-burgundy)]">.</span>
          </h2>
          <p className="font-header italic text-sm sm:text-base text-[color:var(--color-text-secondary)]">
            Putri Helisma
          </p>
        </div>

        <div className="rounded-[2rem] bg-white/70 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/10 px-6 sm:px-10 py-10 sm:py-12 shadow-sm">
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
