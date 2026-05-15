/**
 * MenaraJamMusic — track khusus halaman r4 Menara Jam.
 *
 * Mount di TamanMenaraJam.jsx (halaman r4), unmount saat user keluar
 * halaman. Plays EFFECT JAM 2.mp3 — tone bell-tower ambient, beda dari
 * scoring default armeniacaTown.
 *
 * Pasangan dgn TownMusic (di AppShell): TownMusic mengecualikan r4 dari
 * `inTown` calc, jadi pas user masuk r4, TownMusic fade-out dan
 * MenaraJamMusic fade-in. Pas keluar r4, sebaliknya. Hasilnya: gak ada
 * dua track main bareng, transisi smooth.
 *
 * Pakai bus yg sama (townAudioBus) buat enabled + volume, jadi slider
 * AmbientAudio mengontrol kedua track konsisten.
 *
 * Autoplay/gesture handling persis sama dgn TownMusic.
 */

import { useEffect, useRef } from 'react';
import {
  subscribeEnabled,
  subscribeVolume,
  readEnabled,
  readVolume,
} from '../../../lib/townAudioBus';

const SRC = '/byUmusic/EFFECT%20JAM%202.mp3';
const FADE_IN_DUR = 1.4;
const FADE_OUT_DUR = 0.6;

const MenaraJamMusic = () => {
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

  const apply = () => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    const audio = audioRef.current;
    if (!ctx || !gain || !audio) return;

    const targetGain = enabledRef.current ? volumeRef.current : 0;
    // shouldPlay gak butuh check "inTown" — komponen ini cuma mount saat
    // user di r4. Cuma cek enabled + volume > 0.
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

  const armGestureFallback = () => {
    if (gestureCleanupRef.current) return;
    const onGesture = () => {
      const ctx = ctxRef.current;
      const audio = audioRef.current;
      if (!ctx || !audio) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      audio.play().catch(() => {});
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
      // Fade-out + pause cepat saat unmount supaya transisi balik ke
      // TownMusic gak hard-cut.
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

export default MenaraJamMusic;
