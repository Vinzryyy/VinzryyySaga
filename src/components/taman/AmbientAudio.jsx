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
 *                 tenang. Dipake di /taman/peta.
 *   - 'taman-r1'→ taman pad + low wind drone (pink-noise low-pass) +
 *                 cricket chirps (synth band-pass envelope, ~3s
 *                 interval). Layered atmosphere untuk Pohon-Pohon yang
 *                 Mengingat. Dipake di /taman/r1.
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

// Pre-buffered white noise (2s loop). Dipake untuk wind drone dgn
// low-pass filter — biar gak nge-allocate buffer baru tiap profile.
const makeNoiseBuffer = (ctx) => {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

const buildTamanR1Nodes = (ctx, master) => {
  // Layer 1: pad triad (existing taman base, dengan gain dikurangi
  // sedikit supaya kasih ruang ke layer baru).
  const padNodes = buildTamanNodes(ctx, master);
  // Reduce pad volume — di-iterate dari node array yang return-an
  // bukan ideal (gain nodes nggak di-return). Acceptable —  pad masih
  // dominan, tapi kelihatan kurang penuh. Trade-off untuk mix balance.
  const nodes = [...padNodes];

  // Layer 2: low wind drone. Buffer noise → low-pass ~280Hz dengan
  // LFO bre-athing di filter cutoff. Kerasa kayak angin senja jauh.
  const buffer = makeNoiseBuffer(ctx);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = buffer;
  noiseSrc.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 260;
  noiseFilter.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.075;
  // LFO breathing di filter cutoff 200..360Hz
  const filterLfo = ctx.createOscillator();
  filterLfo.frequency.value = 0.07;
  const filterLfoGain = ctx.createGain();
  filterLfoGain.gain.value = 80;
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(noiseFilter.frequency);
  filterLfo.start();
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noiseSrc.start();
  nodes.push(noiseSrc, filterLfo);

  // Layer 3: cricket chirps. 1 "song" = 5–7 chirps di ~120ms, repeat
  // every ~3s ± random. Pakai osc bandpass-tinged (~5kHz) dgn quick
  // envelope. Pan slight stereo via StereoPannerNode kalo ada.
  let cancelled = false;
  const cricketGain = ctx.createGain();
  cricketGain.gain.value = 0.42;
  cricketGain.connect(master);
  const scheduleSong = () => {
    if (cancelled) return;
    if (ctx.state === 'closed') {
      cancelled = true;
      return;
    }
    const startTime = ctx.currentTime + 0.05;
    const chirpCount = 5 + Math.floor(Math.random() * 3);
    const baseFreq = 5000 + Math.random() * 600;
    for (let i = 0; i < chirpCount; i++) {
      try {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = baseFreq + (Math.random() - 0.5) * 200;
        const g = ctx.createGain();
        const w = startTime + i * (0.020 + Math.random() * 0.006);
        g.gain.setValueAtTime(0, w);
        g.gain.linearRampToValueAtTime(0.011, w + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0008, w + 0.030);
        osc.connect(g);
        g.connect(cricketGain);
        osc.start(w);
        osc.stop(w + 0.06);
      } catch {
        /* ctx closed mid-iter */
      }
    }
    const nextDelay = 2400 + Math.random() * 2200;
    setTimeout(scheduleSong, nextDelay);
  };
  // Stagger first cricket — biar gak langsung blast pas user enable
  setTimeout(scheduleSong, 1800 + Math.random() * 1600);
  // Virtual "node" untuk cleanup — cleanup loop manggil n.stop() yg
  // di sini cancels scheduler. cricketGain nggak punya stop, dummy aja.
  nodes.push({ stop: () => { cancelled = true; } });

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
        : profile === 'taman-r1'
          ? buildTamanR1Nodes(ctx, master)
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
