/**
 * TownMusic — main song global ArmeniacaTown.
 *
 * Mount sekali di AppShell (di atas Routes), nggak unmount saat user
 * navigasi antar /armeniacaTown/* — playback continuous lintas halaman
 * (Padang Tandus → peta → r1 → r2 → r3). Saat user keluar dari
 * /armeniacaTown, fade out + pause; saat balik, resume dari posisi
 * terakhir (audio element retain currentTime).
 *
 * Satu-satunya sumber audio kontinyu di /armeniacaTown — AmbientAudio
 * (yang dulunya generate procedural ambient per halaman) sekarang
 * tinggal tombol toggle UI yang dispatch ke bus.
 *
 * Autoplay policy:
 * - Audio nggak start saat mount (browser block tanpa user gesture).
 * - Trigger pertama selalu dari bus event (= klik tombol AmbientAudio
 *   user gesture). `ensure()` di-call di event handler bus, jadi
 *   AudioContext + audio.play() runs dalam gesture activation window.
 * - State enabled awal NGGAK dibaca dari localStorage — kalo dibaca,
 *   bisa coba play tanpa gesture & ditolak browser. Konsisten dengan
 *   AmbientAudio yang juga start `enabled=false` walau localStorage '1'.
 *
 * Routing detection: pakai useLocation().pathname startsWith
 * '/armeniacaTown'. Rute /taman/* lama udah di-redirect ke
 * /armeniacaTown/* di App.jsx, jadi pathname efektif selalu canonical.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeEnabled } from '../../lib/townAudioBus';

const SRC = '/byUmusic/scoring-music-1.mp3';
// 0.5 sedikit dominan dibanding ambient procedural (target 0.18) — song
// jadi focal layer, procedural texture pelapis. User bisa adjust nanti.
const TARGET_GAIN = 0.5;
const FADE_IN_DUR = 1.8;
const FADE_OUT_DUR = 0.6;

const TownMusic = () => {
  const { pathname } = useLocation();
  const inTown = pathname.startsWith('/armeniacaTown');

  const enabledRef = useRef(false);
  const inTownRef = useRef(inTown);
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const pauseTimerRef = useRef(null);

  // Keep inTownRef in sync — apply() reads from ref supaya bus event
  // handler dapet nilai terbaru tanpa harus re-subscribe per render.
  inTownRef.current = inTown;

  const ensure = () => {
    if (ctxRef.current) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
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
    } catch {
      /* AudioContext blocked / decode fail — silently no-op */
    }
  };

  const apply = () => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    const audio = audioRef.current;
    if (!ctx || !gain || !audio) return;

    const shouldPlay = inTownRef.current && enabledRef.current;
    const now = ctx.currentTime;

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (shouldPlay) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      audio.play().catch(() => {});
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(TARGET_GAIN, now + FADE_IN_DUR);
    } else {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_DUR);
      // Pause AFTER fade settles — kalo pause langsung, fade out
      // gak ke-render (audio element berhenti decode mid-ramp).
      pauseTimerRef.current = setTimeout(() => {
        try {
          audio.pause();
        } catch {
          /* noop */
        }
      }, Math.ceil(FADE_OUT_DUR * 1000) + 100);
    }
  };

  // Subscribe ke bus — sekali aja. Bus event = sinyal user gesture
  // (datang dari klik tombol AmbientAudio), jadi ensure() di sini aman
  // create AudioContext.
  useEffect(() => {
    const unsub = subscribeEnabled((v) => {
      enabledRef.current = v;
      ensure();
      apply();
    });
    return () => {
      unsub();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
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

  // Pathname change → re-evaluate inTown gate. Kalau context belum
  // ada (user belum pernah enable), apply() no-op via guard.
  useEffect(() => {
    apply();
  }, [inTown]);

  return null;
};

export default TownMusic;
