/**
 * AmbientAudio — generator suara latar prosedural via Web Audio API.
 *
 * Tidak butuh file audio. Tone-nya di-synthesize via OscillatorNode +
 * BiquadFilter + LFO modulation. Dua profile:
 *
 *   - 'drought' → drone rendah ~82 Hz dengan low-pass filter & slight
 *                 detune wobble. Kerasa kayak angin kemarau panjang.
 *                 Dipake di /taman (Padang Tandus).
 *   - 'taman'   → soft pad A-minor (A3, C4, E4) dengan modulasi pelan
 *                 di salah satu osc. Kerasa kayak senja taman yang
 *                 tenang. Dipake di /taman/peta dan /taman/r1.
 *
 * UX constraints:
 * - Browser autoplay policy: AudioContext nggak bisa dimulai tanpa
 *   user gesture pertama. Toggle button ini gesture itu.
 * - User preference disimpan di localStorage. Saat halaman re-load,
 *   ikon nampilin "siap dinyalakan" (intermediate) bukan auto-play —
 *   user harus klik lagi minimal sekali tiap session.
 * - Saat toggle off: master gain di-ramp ke 0 selama 0.4 detik
 *   (avoid pop), lalu osc.stop() & ctx.close().
 *
 * Tone palette dipilih konservatif: A minor + sine/triangle = lembut,
 * cocok untuk ambient. Saw drone untuk drought = sedikit "kasar" tapi
 * di-filter low-pass jadi nggak harsh.
 */

import React, { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'taman-audio-enabled';

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeStored = (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    /* storage blocked — no-op */
  }
};

const buildDroughtNodes = (ctx, master) => {
  // Saw drone ~82 Hz, di-filter low-pass biar nggak harsh + LFO
  // detune untuk wobble kayak angin.
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 82;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  filter.Q.value = 1.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 6;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.detune);
  osc.connect(filter);
  filter.connect(master);
  osc.start();
  lfo.start();
  return [osc, lfo];
};

const buildTamanNodes = (ctx, master) => {
  // Triad A-minor (A3, C4, E4). Sine + triangle untuk pad lembut.
  const freqs = [220, 261.63, 329.63];
  const nodes = [];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    osc.connect(g);
    g.connect(master);
    osc.start();
    nodes.push(osc);
  });
  // LFO halus di salah satu osc supaya pad nggak statis
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 4;
  lfo.connect(lfoGain);
  lfoGain.connect(nodes[1].detune);
  lfo.start();
  nodes.push(lfo);
  return nodes;
};

const SoundOnIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const SoundOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const AmbientAudio = ({ profile = 'taman', position = 'top-right' }) => {
  const [enabled, setEnabled] = useState(false);
  // Persist preference, tapi nggak auto-start (browser policy).
  // Indikator 'pending' berarti user pernah enable, tapi session
  // baru — perlu klik sekali untuk re-engage.
  const [pendingEnable] = useState(() => readStored());

  const ctxRef = useRef(null);
  const nodesRef = useRef([]);
  const masterRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Cleanup: ramp down master gain dulu, lalu stop & close ctx.
      const ctx = ctxRef.current;
      const master = masterRef.current;
      const nodes = nodesRef.current;
      if (ctx && master) {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        } catch {
          /* ctx mungkin udah closed */
        }
        const t = setTimeout(() => {
          nodes.forEach((n) => {
            try {
              n.stop();
            } catch {
              /* noop */
            }
          });
          try {
            ctx.close();
          } catch {
            /* noop */
          }
          ctxRef.current = null;
          masterRef.current = null;
          nodesRef.current = [];
        }, 500);
        return () => clearTimeout(t);
      }
      return undefined;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return undefined;
    const ctx = new Ctx();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.5);
    master.connect(ctx.destination);
    masterRef.current = master;

    nodesRef.current =
      profile === 'drought'
        ? buildDroughtNodes(ctx, master)
        : buildTamanNodes(ctx, master);

    return undefined;
  }, [enabled, profile]);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    writeStored(next);
  };

  const positionClass =
    position === 'top-right'
      ? 'top-5 right-20'
      : position === 'bottom-right'
        ? 'bottom-5 right-5'
        : 'bottom-5 left-5';

  const label = enabled
    ? 'Matikan suara taman'
    : pendingEnable
      ? 'Klik untuk nyalakan suara taman'
      : 'Nyalakan suara taman';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`pointer-events-auto absolute ${positionClass} z-20 w-9 h-9 rounded-full border border-white/20 bg-black/30 backdrop-blur-sm hover:bg-white/10 transition flex items-center justify-center text-white/70`}
      aria-label={label}
      title={label}
    >
      {enabled ? <SoundOnIcon /> : <SoundOffIcon />}
    </button>
  );
};

export default AmbientAudio;
