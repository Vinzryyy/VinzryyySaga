/**
 * RotateRecommendation — banner non-blocking yang nyaranin user puter
 * HP ke landscape buat experience yang lebih oke.
 *
 * Trigger render (semua harus true):
 *   - matchMedia (max-width: 767px)    — HP, bukan tablet/desktop
 *   - matchMedia (orientation: portrait)
 *   - sessionStorage flag belum di-set (belum dismiss)
 *
 * Action button "Putar":
 *   - Android Chrome/Firefox: request fullscreen + Screen Orientation
 *     .lock('landscape'). Works otomatis.
 *   - iOS Safari: API gak ada. Tap "Putar" → buka IOSInstructionModal
 *     yang ajarin user rotate manual + opsi Add to Home Screen buat
 *     fullscreen PWA mode.
 *
 * Auto-hide saat orientation berubah ke landscape (via matchMedia).
 * User bisa dismiss manual via X (sessionStorage flag).
 *
 * Pakai di page 3D /armeniacaTown/* via top-level page render.
 */

import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'rotate-recommendation-dismissed';

// iOS detection — termasuk iPadOS 13+ yang nyamar jadi MacIntel tapi
// punya touch. Engine WebKit Safari di iOS gak punya orientation .lock.
const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
};

// Try fullscreen + orientation lock (Android Chrome/FF works, iOS Safari
// silent-fails di catch blocks). Each step wrapped sendiri-sendiri biar
// kalau fullscreen rejected, masih coba orientation lock.
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

const IOSInstructionModal = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-instruction-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md max-h-full overflow-y-auto rounded-2xl border border-white/15 bg-[#1c1614]/95 px-5 py-6 sm:px-7 sm:py-8 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-amber-200/85 text-[9px] uppercase tracking-[0.4em] mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          <span>Petunjuk iOS</span>
        </div>
        <h3
          id="ios-instruction-title"
          className="text-xl sm:text-2xl mb-4 leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          Putar manual + opsi fullscreen
        </h3>
        <p className="text-white/70 text-[12px] sm:text-sm leading-relaxed mb-5">
          iOS Safari belum support rotate otomatis dari web. Ada dua cara
          buat experience yang lebih nyaman:
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-200/20 text-amber-200 flex items-center justify-center text-xs font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="text-white/90 text-[13px] sm:text-sm font-medium mb-1">
                Putar HP-mu ke landscape
              </p>
              <p className="text-white/55 text-[11px] sm:text-xs leading-relaxed">
                Kalau gak ke-rotate, cek <strong className="text-white/75">Control Center</strong> (swipe dari pojok kanan-atas) lalu pastiin{' '}
                <strong className="text-white/75">rotation lock</strong> mati.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-200/20 text-amber-200 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="text-white/90 text-[13px] sm:text-sm font-medium mb-1">
                Add to Home Screen (opsional, untuk fullscreen)
              </p>
              <p className="text-white/55 text-[11px] sm:text-xs leading-relaxed">
                Tap{' '}
                <span className="inline-block px-1 py-0.5 rounded bg-white/10 text-white/85">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="inline align-middle">
                    <path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {' '}share
                </span>
                {' '}di Safari → <strong className="text-white/75">Add to Home Screen</strong>. Buka dari icon home-mu — ArmeniacaTown akan launch fullscreen tanpa Safari chrome.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};

const RotateRecommendation = () => {
  const [portrait, setPortrait] = useState(false);
  const [smallScreen, setSmallScreen] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
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
    // iOS Safari: API gak ada. Buka instruction modal yg ajarin manual
    // rotate + Add to Home Screen route. Non-iOS: jalanin fullscreen +
    // orientation lock seperti biasa.
    if (isIOS()) {
      setIosModalOpen(true);
      return;
    }
    tryFullscreenLandscape();
  };

  if (!smallScreen || !portrait || dismissed) {
    // Modal iOS tetep render kalau dia open + user belum dismiss banner.
    // (Biar user yang baru ngerotate ke landscape pas modal kebuka,
    //  bisa close modal-nya tanpa kehilangan instruksi.)
    return <IOSInstructionModal open={iosModalOpen} onClose={() => setIosModalOpen(false)} />;
  }
  return (
    <>
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
      <IOSInstructionModal open={iosModalOpen} onClose={() => setIosModalOpen(false)} />
    </>
  );
};

export default RotateRecommendation;
