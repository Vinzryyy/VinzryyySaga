/**
 * TownMusic — main song global ArmeniacaTown.
 *
 * Mount sekali di AppShell (di atas Routes), nggak unmount saat user
 * navigasi antar /armeniacaTown/* — playback continuous lintas halaman.
 * Saat user keluar dari /armeniacaTown, fade out + pause; saat balik,
 * resume dari posisi terakhir (audio element retain currentTime).
 *
 * Autoplay policy:
 * - Default enabled = true (auto-ON) dibaca dari bus pas mount.
 * - Coba play langsung saat user masuk /armeniacaTown — kalau browser
 *   block (no user gesture yet), pasang gestureListener global: first
 *   click/keydown/touchstart di mana aja → trigger play. Setelah berhasil
 *   sekali, listener dilepas.
 * - Volume di-gate via gain node — subscribe ke bus volume changes.
 *   User geser slider ke 0 ≠ disabled; disabled flag terpisah (mute btn).
 *
 * Routing detection: pathname startsWith '/armeniacaTown'. Rute /taman/*
 * lama udah di-redirect di App.jsx, jadi pathname efektif canonical.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  subscribeEnabled,
  subscribeVolume,
  readEnabled,
  readVolume,
} from '../../lib/townAudioBus';

const SRC = '/byUmusic/scoring-music-1.mp3';
const FADE_IN_DUR = 1.8;
const FADE_OUT_DUR = 0.6;

const TownMusic = () => {
  const { pathname } = useLocation();
  const inTown = pathname.startsWith('/armeniacaTown');

  const enabledRef = useRef(readEnabled());
  const volumeRef = useRef(readVolume());
  const inTownRef = useRef(inTown);
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const gestureCleanupRef = useRef(null);

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
    const shouldPlay = inTownRef.current && enabledRef.current && targetGain > 0;
    const now = ctx.currentTime;

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (shouldPlay) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      audio.play().catch(() => {
        // play() rejected — pasang gesture listener global, retry sekali
        // begitu user interact di mana aja.
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

  // Pasang gesture listener global — first click/keydown/touchstart di
  // mana aja trigger retry play(). Dipasang sekali, di-lepas setelah
  // first fire. Buat handle autoplay-blocked-on-first-mount case.
  const armGestureFallback = () => {
    if (gestureCleanupRef.current) return; // already armed
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

  // Initial mount — kalau auto-ON dan udah inTown, ensure context + try
  // play (auto-attempt). Pasang gesture fallback kalau ditolak.
  useEffect(() => {
    if (enabledRef.current && inTownRef.current) {
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
      // Reapply gain target via apply() — kalau volume turun ke 0 saat
      // enabled, music tetep "running" tapi muted. Naik balik → fade in.
      apply();
    });
    return () => {
      unsubEnabled();
      unsubVolume();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (gestureCleanupRef.current) gestureCleanupRef.current();
      try {
        audioRef.current?.pause();
      } catch {
        /* noop */
      }
      try {
        ctxRef.current?.close();
      } catch {
        /* noop */
      }
      audioRef.current = null;
      ctxRef.current = null;
      gainRef.current = null;
    };
  }, []);

  useEffect(() => {
    inTownRef.current = inTown;
    if (enabledRef.current && inTown) {
      ensure();
    }
    apply();
  }, [inTown]);

  return null;
};

export default TownMusic;
