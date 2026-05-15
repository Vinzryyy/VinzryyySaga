/**
 * BirthdayMusic — site-wide background song player utk hari ulang
 * tahun Eli, 15 Juni 2026. Active window 24 jam: 00:00 WIB 15 Juni
 * sampai 00:00 WIB 16 Juni. Setelah window lewat, component
 * auto-disable.
 *
 * Behavior:
 * - Window aktif: try muted autoplay (browser allow), unmute pas
 *   user first gesture (click/touch/keydown anywhere).
 * - Floating control widget di bottom-right: play/pause, mute toggle,
 *   dismiss X (sessionStorage persist supaya gak balik selama session).
 * - Hide di /byu-music — page itu udah punya audio player sendiri di
 *   ReleasedView, supaya gak double playback.
 *
 * Testing override: ?bg=force untuk paksa render widget di luar
 * window (dev only).
 *
 * Browser autoplay policy: muted autoplay allowed. Audible playback
 * butuh user gesture dulu. Strategy: start muted, gesture-listener
 * unmute, fallback ke manual play kalau autoplay di-block.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const RELEASE_ISO = '2026-06-15T00:00:00+07:00';
const END_ISO = '2026-06-16T00:00:00+07:00';
const AUDIO_URL = '/byUmusic/By-U%20-%20Putri%20Helisma%20(16%20BIT).flac';
const DISMISS_KEY = 'byu-bg-dismissed';

const BirthdayMusic = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const forceShow = searchParams.get('bg') === 'force';
  const audioRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Re-check window setiap menit, cukup utk transisi 00:00 batas window.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const inWindow = useMemo(() => {
    if (forceShow) return true;
    return now >= new Date(RELEASE_ISO).getTime() && now < new Date(END_ISO).getTime();
  }, [forceShow, now]);

  const onByuMusicPage = location.pathname === '/byu-music';
  const shouldRender = inWindow && !dismissed && !onByuMusicPage;

  // Muted autoplay attempt saat shouldRender true. Browser modern
  // izinin muted autoplay tanpa gesture.
  useEffect(() => {
    if (!shouldRender) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.muted = true;
    audio.loop = true;
    audio.volume = 0.25;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
    return undefined;
  }, [shouldRender]);

  // Unmute pas first user gesture. Browser default block audible
  // autoplay tanpa interaction. Once-only listener, cleanup setelah
  // satu trigger.
  useEffect(() => {
    if (!shouldRender || !muted) return undefined;
    const unlock = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = false;
      audio
        .play()
        .then(() => {
          setMuted(false);
          setPlaying(true);
        })
        .catch(() => {
          /* still blocked */
        });
    };
    const opts = { once: true, passive: true };
    document.addEventListener('click', unlock, opts);
    document.addEventListener('touchstart', unlock, opts);
    document.addEventListener('keydown', unlock, opts);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [shouldRender, muted]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.muted = false;
      setMuted(false);
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    if (!next && !playing) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const dismiss = () => {
    setDismissed(true);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage blocked */
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={AUDIO_URL}
        loop
        preload="auto"
        aria-hidden="true"
      />

      {/* Floating pill control — bottom-right, di atas footer.
          Backdrop blur supaya kerasa premium, retro-burgundy + cream. */}
      <div
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-[0_8px_28px_-6px_rgba(139,64,64,0.65)] backdrop-blur-sm border border-[color:var(--retro-cream)]/15"
        style={{ animation: 'byuBgIn 600ms ease-out' }}
        role="region"
        aria-label="Lagu ulang tahun"
      >
        {/* Animated music icon — bouncing dot pattern saat playing */}
        <div className="flex items-end gap-[2px] h-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-[color:var(--retro-gold-light)]"
              style={{
                animation: playing && !muted
                  ? `byuEq 0.9s ease-in-out infinite`
                  : 'none',
                animationDelay: `${i * 0.15}s`,
                height: playing && !muted ? '40%' : '20%',
              }}
            />
          ))}
        </div>

        <div className="flex flex-col leading-none mr-1">
          <span className="font-header italic text-[11px] tracking-wide">
            Hari Ulang Tahun
          </span>
          <span className="text-[9px] uppercase tracking-[0.22em] opacity-70 mt-0.5">
            Lagu untuk Eli · 26
          </span>
        </div>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Jeda lagu' : 'Putar lagu'}
          className="w-8 h-8 rounded-full bg-[color:var(--retro-cream)]/15 hover:bg-[color:var(--retro-cream)]/25 flex items-center justify-center transition"
        >
          {playing ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Suarakan lagu' : 'Bisukan lagu'}
          className="w-8 h-8 rounded-full bg-[color:var(--retro-cream)]/15 hover:bg-[color:var(--retro-cream)]/25 flex items-center justify-center transition"
        >
          {muted ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup pemutar"
          className="w-7 h-7 rounded-full hover:bg-[color:var(--retro-cream)]/15 flex items-center justify-center transition opacity-60 hover:opacity-100"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes byuBgIn {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes byuEq {
          0%, 100% { height: 30%; }
          50%      { height: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="byuBgIn"], [class*="byuEq"] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default BirthdayMusic;
