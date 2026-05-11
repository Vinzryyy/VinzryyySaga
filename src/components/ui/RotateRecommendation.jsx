/**
 * RotateRecommendation — banner non-blocking yang nyaranin user puter
 * HP ke landscape buat experience yang lebih oke. Dismissable: user
 * bisa close dan tetep pake portrait kalau mau.
 *
 * Trigger render (semua harus true):
 *   - matchMedia (max-width: 767px)    — HP, bukan tablet/desktop
 *   - matchMedia (orientation: portrait)
 *   - sessionStorage flag belum di-set (belum dismiss)
 *
 * Auto-hide kalau user puter ke landscape (orientation change). Kalau
 * user dismiss manual, sessionStorage di-set supaya gak nongol lagi di
 * session itu (sampai tab di-close).
 *
 * Pakai di page 3D yang detailnya kurang oke di portrait (semua route
 * /armeniacaTown/*). Place di top-level page render. z-[100] cover
 * canvas + overlay lain tapi gak block interaction (banner fixed top).
 */

import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'rotate-recommendation-dismissed';

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

  if (!smallScreen || !portrait || dismissed) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw]">
      <div className="flex items-center gap-3 bg-black/85 backdrop-blur-sm border border-white/15 rounded-full pl-3 pr-2 py-2 shadow-lg">
        <svg
          width="20"
          height="20"
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
        <span className="text-white/90 text-[11px] tracking-wider leading-tight">
          Lebih oke kalau HP-nya diputar landscape
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss rekomendasi"
          className="ml-1 w-6 h-6 rounded-full hover:bg-white/10 transition flex items-center justify-center text-white/55 hover:text-white/85"
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
