/**
 * TownMusic — main song global ArmeniacaTown.
 *
 * Mount sekali di AppShell (di atas Routes), nggak unmount saat user
 * navigasi antar /armeniacaTown/* — playback continuous lintas halaman.
 * Saat user keluar dari /armeniacaTown, fade out + pause; saat balik,
 * resume dari posisi terakhir (audio element retain currentTime).
 *
 * Pengecualian:
 * - /armeniacaTown/r4 (Menara Jam) → MenaraJamMusic.jsx (EFFECT JAM 2)
 * - /armeniacaTown/r2 (Perpustakaan) → PerpustakaanMusic.jsx
 * Saat user balik dari petak2 itu ke peta / petak lain, TownMusic resume.
 *
 * Source swap (kota pulih):
 * - count < 7000  → scoring-music-1.mp3 (drought)
 * - count ≥ 7000  → PERPUSTAKAAN ATAU KOTA YANG SUDAH PULIH.mp3 (track
 *   yang sama dipakai PerpustakaanMusic — kontinuitas tonal antara
 *   Perpustakaan dan kota yang udah purified)
 * Threshold sync dgn R2_RESTORATION_THRESHOLD di App.jsx (r2 purify =
 * milestone akhir kota). Cross-threshold swap pakai fade-out → src
 * swap → fade-in.
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
 * Routing detection: pathname startsWith '/armeniacaTown' AND bukan
 * /armeniacaTown/r4 / /armeniacaTown/r2. Rute /taman/* lama udah di-redirect
 * di App.jsx, jadi pathname efektif canonical.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  subscribeEnabled,
  subscribeVolume,
  subscribeDuckFactor,
  readEnabled,
  readVolume,
  readDuckFactor,
} from '../../lib/townAudioBus';
import { subscribeToTreeSupports } from '../../lib/treeDb';

const SRC_DROUGHT = '/byUmusic/scoring-music-1.mp3';
const SRC_PURIFIED = '/byUmusic/PERPUSTAKAAN%20%20ATAU%20KOTA%20YANG%20SUDAH%20PULIH.mp3';
// Sync dgn R2_RESTORATION_THRESHOLD di App.jsx — milestone akhir kota.
const PURIFIED_THRESHOLD = 7000;
const FADE_IN_DUR = 1.8;
const FADE_OUT_DUR = 0.6;

const TownMusic = () => {
  const { pathname } = useLocation();
  // r4 & r2 dikecualikan — masing-masing punya music sendiri yg di-mount
  // di halamannya (MenaraJamMusic, PerpustakaanMusic).
  const inTown =
    pathname.startsWith('/armeniacaTown') &&
    !pathname.startsWith('/armeniacaTown/r4') &&
    !pathname.startsWith('/armeniacaTown/r2');

  const enabledRef = useRef(readEnabled());
  const volumeRef = useRef(readVolume());
  // Duck factor (0..1) — ramping multiplier saat Arme/dialog voice
  // playing. Default 1 (no duck); ArmeMascot turunin ke 0 selagi
  // dialog aktif. Non-persisted, in-memory di bus.
  const duckRef = useRef(readDuckFactor());
  const inTownRef = useRef(inTown);
  const purifiedRef = useRef(false);
  const currentSrcRef = useRef(SRC_DROUGHT);
  const swappingRef = useRef(false);
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const swapTimerRef = useRef(null);
  const gestureCleanupRef = useRef(null);

  const ensure = () => {
    if (ctxRef.current) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    try {
      const initialSrc = purifiedRef.current ? SRC_PURIFIED : SRC_DROUGHT;
      const audio = new Audio(initialSrc);
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
      currentSrcRef.current = initialSrc;
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
    // Lagi mid-swap → biarin swap routine yang handle, jangan ganggu fade.
    if (swappingRef.current) return;

    const targetGain = enabledRef.current ? volumeRef.current * duckRef.current : 0;
    // shouldPlay decoupled dari duck — duck=0 ramping ke silent tapi
    // audio element tetap "playing" supaya un-duck instant (gak perlu
    // re-play() yang bisa kena autoplay block lagi).
    const shouldPlay = inTownRef.current && enabledRef.current && volumeRef.current > 0;
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

  // Swap source mid-session saat purified state berubah. Fade-out cepat,
  // swap src, load, fade-in via apply(). Threshold-crossing rare jadi
  // hard swap (bukan dual-element cross-fade) cukup.
  const swapSource = () => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    const audio = audioRef.current;
    if (!ctx || !gain || !audio) return;
    const wanted = purifiedRef.current ? SRC_PURIFIED : SRC_DROUGHT;
    if (currentSrcRef.current === wanted) return;

    swappingRef.current = true;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_DUR);

    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = setTimeout(() => {
      try {
        audio.src = wanted;
        audio.load();
      } catch {
        /* noop */
      }
      currentSrcRef.current = wanted;
      swappingRef.current = false;
      apply();
    }, Math.ceil(FADE_OUT_DUR * 1000) + 80);
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
    const unsubDuck = subscribeDuckFactor((d) => {
      duckRef.current = d;
      // Smooth ramp ke targetGain baru — un-duck pas dialog selesai
      // naik balik via existing FADE_IN_DUR, gak perlu replay/restart.
      apply();
    });
    // Subscribe count untuk track purified state. Pas count cross
    // threshold mid-session, swap source. First snapshot juga handle
    // case dimana audio element udah dibuat dgn SRC_DROUGHT padahal
    // user real-count udah ≥ 7000.
    const unsubCount = subscribeToTreeSupports((count) => {
      const nextPurified = count >= PURIFIED_THRESHOLD;
      if (nextPurified === purifiedRef.current) return;
      purifiedRef.current = nextPurified;
      if (audioRef.current) {
        swapSource();
      }
      // Kalau audio belum di-create, currentSrcRef belum dipakai —
      // ensure() berikutnya akan pilih src yg benar berdasarkan
      // purifiedRef.
    });
    return () => {
      unsubEnabled();
      unsubVolume();
      unsubDuck();
      unsubCount();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
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
