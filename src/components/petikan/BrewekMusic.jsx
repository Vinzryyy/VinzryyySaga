/**
 * BrewekMusic — background track untuk halaman /petikan (Pohon Aprikot).
 *
 * Mount di Petikan.jsx, unmount saat user keluar halaman. Plays BREWEK.mp3
 * — track yang ngiringin proses buka kartu. Loop continuous selama
 * user di /petikan.
 *
 * Pakai plain HTMLAudio (bukan Web Audio API + AudioContext) supaya
 * autoplay restriction lebih lenient — user nggak perlu tap dulu kalau
 * navigation dari page lain (browser inherit gesture activation).
 *
 * Behavior:
 * - Always-on selama user di /petikan (independen dari townAudioBus —
 *   slider/mute global gak ngaruh)
 * - Fixed volume 0.1 (10%)
 * - Loop continuous
 * - Auto-play on mount via .play(). Kalau browser block (no gesture),
 *   fallback gesture listener: first click/keydown/touchstart kebuka.
 */

import { useEffect, useRef } from 'react';

const SRC = '/byUmusic/BREWEK.mp3';
const FIXED_VOLUME = 0.1;

const BrewekMusic = () => {
  const audioRef = useRef(null);
  const gestureCleanupRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = FIXED_VOLUME;
    audio.preload = 'auto';
    audioRef.current = audio;

    const armGestureFallback = () => {
      if (gestureCleanupRef.current) return;
      const onGesture = () => {
        audio.play().catch(() => {
          /* still blocked — give up silently */
        });
        cleanup();
      };
      const cleanup = () => {
        window.removeEventListener('click', onGesture, true);
        window.removeEventListener('keydown', onGesture, true);
        window.removeEventListener('touchstart', onGesture, true);
        window.removeEventListener('pointerdown', onGesture, true);
        gestureCleanupRef.current = null;
      };
      window.addEventListener('click', onGesture, true);
      window.addEventListener('keydown', onGesture, true);
      window.addEventListener('touchstart', onGesture, true);
      window.addEventListener('pointerdown', onGesture, true);
      gestureCleanupRef.current = cleanup;
    };

    // Attempt immediate playback. Browser autoplay policy: kalau document
    // udah punya user activation (mis. user navigate dari Home via click),
    // play() berhasil. Kalau gak, fallback ke gesture listener.
    audio.play().catch(() => {
      armGestureFallback();
    });

    return () => {
      if (gestureCleanupRef.current) gestureCleanupRef.current();
      try {
        audio.pause();
        audio.src = '';
      } catch {
        /* noop */
      }
      audioRef.current = null;
    };
  }, []);

  return null;
};

export default BrewekMusic;
