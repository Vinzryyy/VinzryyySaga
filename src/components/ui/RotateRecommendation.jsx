/**
 * RotateRecommendation — banner non-blocking yang nyaranin user puter
 * HP ke landscape buat experience yang lebih oke.
 *
 * Trigger render (semua harus true):
 *   - matchMedia (max-width: 767px)    — HP, bukan tablet/desktop
 *   - matchMedia (orientation: portrait)
 *   - sessionStorage flag belum di-set (belum dismiss)
 *
 * Action button "Putar otomatis" → request fullscreen + lock landscape
 * via Screen Orientation API. Catatan platform:
 *   - Android Chrome/Firefox: works
 *   - iOS Safari: Screen Orientation .lock() NOT supported, silent
 *     fail. Fullscreen sebagian limited juga. User akan rotate manual.
 *
 * Auto-hide kalau user puter ke landscape (orientation change). Kalau
 * user dismiss manual via X, sessionStorage di-set supaya gak nongol
 * lagi di session itu (sampai tab di-close).
 *
 * Pakai di page 3D yang detailnya kurang oke di portrait (semua route
 * /armeniacaTown/*). Place di top-level page render. z-[100] cover
 * canvas + overlay lain tapi gak block interaction (banner fixed top).
 */

import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'rotate-recommendation-dismissed';

// Try to request fullscreen + lock orientation. Wrapped dalam try/catch
// karena Screen Orientation API not universally supported (iOS Safari
// reject .lock, beberapa browser butuh user gesture context strict).
// Kalau gagal, banner tetep ada — user bisa rotate manual / dismiss.
const tryFullscreenLandscape = async () => {
  try {
    const el = document.documentElement;
    const requestFs =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (requestFs) {
      await requestFs.call(el);
    }
  } catch {
    /* fullscreen rejected — coba orientation lock aja */
  }
  try {
    if (window.screen?.orientation?.lock) {
      await window.screen.orientation.lock('landscape');
    }
  } catch {
    /* orientation lock rejected — user akan rotate manual */
  }
};

const RotateRecommendation = () => {
  const [portrait, setPortrait] = useState(false);
  const [smallScreen, setSmallScreen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const portraitMq = window.matchMedia('(orientation: portrait)');
    const sizeMq = window.matchMedia('(max-width: 767px)');
    const updateP = () => setPortrait(portraitMq.matches);
    const updateS = () => setSmallScreen(sizeMq.matches);
    updateP();
    updateS();
    portraitMq.addEventListener('change', updateP);
    sizeMq.addEventListener('change', updateS);
    return () => {
      portraitMq.removeEventListener('change', updateP);
      sizeMq.removeEventListener('change', updateS);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage blocked — state-only dismiss, oke */
    }
  };

  const handleAutoLandscape = () => {
    tryFullscreenLandscape();
  };

  if (!smallScreen || !portrait || dismissed) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] max-w-[96vw]">
      <div className="flex items-center gap-2 bg-black/85 backdrop-blur-sm border border-white/15 rounded-full pl-3 pr-1.5 py-1.5 shadow-lg">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-amber-200/85 flex-shrink-0 animate-pulse"
        >
          <rect
            x="6"
            y="3"
            width="12"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M21 9l-2 3h-3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-white/90 text-[10px] tracking-wider leading-tight">
          Putar HP buat experience lebih oke
        </span>
        <button
          type="button"
          onClick={handleAutoLandscape}
          className="px-2.5 py-1 rounded-full bg-amber-200/85 hover:bg-amber-200 text-black text-[10px] font-medium tracking-wider transition flex-shrink-0"
        >
          Putar
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss rekomendasi"
          className="w-6 h-6 rounded-full hover:bg-white/10 transition flex items-center justify-center text-white/55 hover:text-white/85 flex-shrink-0"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default RotateRecommendation;
