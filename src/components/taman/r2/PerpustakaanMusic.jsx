/**
 * PerpustakaanMusic — track khusus halaman r2 Arsip Ingatan (Perpustakaan).
 *
 * Mount di TamanArsipIngatan.jsx, unmount saat user keluar halaman. Plays
 * "PERPUSTAKAAN ATAU KOTA YANG SUDAH PULIH.mp3" — track yang sekaligus
 * jadi swap source TownMusic begitu kota fully purified (count ≥ 7000).
 * Di Perpustakaan track ini SELALU jalan, regardless of restore state.
 *
 * Pasangan dgn TownMusic (di AppShell): TownMusic mengecualikan r2 dari
 * `inTown` calc (sama treatment kayak r4), jadi pas user masuk r2,
 * TownMusic fade-out dan PerpustakaanMusic fade-in. Pas keluar r2,
 * sebaliknya.
 *
 * Pakai bus yg sama (townAudioBus) — slider AmbientAudio mengontrol
 * track konsisten.
 *
 * Autoplay/gesture handling persis sama dgn MenaraJamMusic.
 */

import { useEffect, useRef } from 'react';
import {
  subscribeEnabled,
  subscribeVolume,
  readEnabled,
  readVolume,
} from '../../../lib/townAudioBus';

const SRC = '/byUmusic/PERPUSTAKAAN%20%20ATAU%20KOTA%20YANG%20SUDAH%20PULIH.mp3';
const FADE_IN_DUR = 1.4;
const FADE_OUT_DUR = 0.6;

const PerpustakaanMusic = () => {
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

export default PerpustakaanMusic;
