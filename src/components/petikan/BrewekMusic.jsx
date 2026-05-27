/**
 * BrewekMusic — background track untuk halaman /petikan (Pohon Aprikot).
 *
 * Mount di Petikan.jsx, unmount saat user keluar halaman. Plays BREWEK.mp3
 * — track yang ngiringin proses buka kartu (brewek = TCG-style pack
 * opening). Loop continuous selama user di /petikan.
 *
 * Pasangan dgn TownMusic (di AppShell): TownMusic udah ngecualikan
 * /petikan (gak startsWith '/armeniacaTown'), jadi nggak ada overlap.
 *
 * Pakai bus yg sama (townAudioBus) — slider AmbientAudio mengontrol
 * track konsisten. Mute icon global mati = semua track + SFX mati.
 *
 * Pattern mirror PerpustakaanMusic / MenaraJamMusic — autoplay attempt
 * + gesture fallback kalau browser block first play.
 */

import { useEffect, useRef } from 'react';
import {
  subscribeEnabled,
  subscribeVolume,
  readEnabled,
  readVolume,
} from '../../lib/townAudioBus';

const SRC = '/byUmusic/BREWEK.mp3';
const FADE_IN_DUR = 1.4;
const FADE_OUT_DUR = 0.6;
// BREWEK.mp3 source kerasa terlalu loud relatif ke ambient track lain.
// Cap output gain ke 40% dari bus volume — slider tetep berfungsi proporsional
// (slider 50% = 0.2 gain, slider 100% = 0.4 gain) tapi peak music dibatasi
// supaya gak overshadow SFX dan dialog.
const MUSIC_VOLUME_MULTIPLIER = 0.4;

const BrewekMusic = () => {
  const enabledRef = useRef(readEnabled());
  const volumeRef = useRef(readVolume());
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const gestureCleanupRef = useRef(null);
  const mountedRef = useRef(true);

  const ensure = () => {
    if (ctxRef.current) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    try {
      const audio = new Audio(SRC);
      audio.loop = true;
      audio.preload = 'auto';
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(ctx.destination);
      audioRef.current = audio;
      ctxRef.current = ctx;
      gainRef.current = gain;
      return true;
    } catch {
      return false;
    }
  };

  const armGestureFallback = () => {
    if (gestureCleanupRef.current) return;
    const onGesture = () => {
      const ctx = ctxRef.current;
      const audio = audioRef.current;
      if (!ctx || !audio) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      audio.play().catch(() => {});
      // eslint-disable-next-line no-use-before-define
      apply();
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

  const apply = () => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    const audio = audioRef.current;
    if (!ctx || !gain || !audio) return;

    const targetGain = enabledRef.current
      ? volumeRef.current * MUSIC_VOLUME_MULTIPLIER
      : 0;
    const shouldPlay = mountedRef.current && enabledRef.current && targetGain > 0;
    const now = ctx.currentTime;

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (shouldPlay) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      audio.play().catch(() => {
        armGestureFallback();
      });
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + FADE_IN_DUR);
    } else {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_DUR);
      pauseTimerRef.current = setTimeout(() => {
        try {
          audio.pause();
        } catch {
          /* noop */
        }
      }, Math.ceil(FADE_OUT_DUR * 1000) + 100);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (enabledRef.current) {
      if (ensure()) {
        apply();
      }
    }
    const unsubEnabled = subscribeEnabled((v) => {
      enabledRef.current = v;
      ensure();
      apply();
    });
    const unsubVolume = subscribeVolume((v) => {
      volumeRef.current = v;
      apply();
    });

    return () => {
      mountedRef.current = false;
      unsubEnabled();
      unsubVolume();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (gestureCleanupRef.current) gestureCleanupRef.current();
      const ctx = ctxRef.current;
      const gain = gainRef.current;
      const audio = audioRef.current;
      if (ctx && gain && audio) {
        try {
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_DUR);
          setTimeout(() => {
            try {
              audio.pause();
              ctx.close();
            } catch {
              /* noop */
            }
          }, Math.ceil(FADE_OUT_DUR * 1000) + 100);
        } catch {
          try {
            audio.pause();
            ctx.close();
          } catch {
            /* noop */
          }
        }
      }
      audioRef.current = null;
      ctxRef.current = null;
      gainRef.current = null;
    };
  }, []);

  return null;
};

export default BrewekMusic;
