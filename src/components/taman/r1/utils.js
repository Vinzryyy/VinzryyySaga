/**
 * Shared utilities + constants untuk Taman R1 (Konstelasi Perjalanan).
 *
 * Berisi: layout konstanta path/corridor, color helpers, wind system,
 * audio synth singleton, firefly blackout cycle. No JSX/THREE
 * dependency — pure helpers + plain consts.
 */

// Layout konstan jalur. PATH_* tetap referensi ground (bench, swing,
// monument tied to z=-15..-32) — user "berdiri di taman" tetep di
// koridor ini. Bedanya: trees milestone udah pindah ke langit.
export const PATH_START_Z = -2;
export const PATH_END_Z = -32;
export const PATH_X_OFFSET = 2.6; // alternating ±2.6 dari sumbu jalur (legacy)

// Orbit target naik ke mid-air supaya camera arc mendominan langit,
// bukan ground. User tetep liat tanah di edge view, tapi langit
// dominant.
export const ORBIT_TARGET = [0, 5, -10];

// Path corridor bounds untuk distribute particle/firefly. Sedikit lebih
// lebar dari path itu sendiri supaya particle "wrap" tepi pohon, nggak
// cuma straight di tengah path.
export const CORRIDOR_X_HALF = 5;
export const CORRIDOR_Z_MIN = PATH_END_Z - 2;
export const CORRIDOR_Z_MAX = PATH_START_Z + 2;
export const CORRIDOR_Z_LEN = CORRIDOR_Z_MAX - CORRIDOR_Z_MIN;

// Hash sederhana → 0..1, deterministic per string. Dipake untuk
// per-milestone jitter posisi dalam konstelasi + per-star twinkle phase.
export const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
};

// Lerp dua warna hex string. Returns hex string.
export const lerpHexColor = (a, b, t) => {
  const av = parseInt(a.slice(1), 16);
  const bv = parseInt(b.slice(1), 16);
  const ar = (av >> 16) & 0xff;
  const ag = (av >> 8) & 0xff;
  const ab = av & 0xff;
  const br = (bv >> 16) & 0xff;
  const bg = (bv >> 8) & 0xff;
  const bb = bv & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
};

// Sistem angin global — semua component subscribe untuk dapat sway/drift
// yang sinkron antar elemen scene. getWind(t) return:
//   - sway: oscillation continuous halus (Math.sin combo)
//   - gust: spike periodic tiap WIND_GUST_PERIOD detik, active 30%
//     dari period (parabolic shape supaya smooth peak)
//   - total: sway + gust untuk konsumsi default
//
// Component bisa baca total untuk basic sway, atau gust khusus untuk
// rare effect (e.g., owl mata kedip cuma saat gust, leaves jatuh lebih
// banyak saat gust).
export const WIND_GUST_PERIOD = 16; // detik antar gust event
export const getWind = (t, phaseOffset = 0) => {
  const tt = t + phaseOffset;
  const sway = Math.sin(tt * 0.3) * 0.6 + Math.sin(tt * 0.7) * 0.3;
  const gustPhase =
    ((tt % WIND_GUST_PERIOD) + WIND_GUST_PERIOD) % WIND_GUST_PERIOD;
  const gustU = gustPhase / WIND_GUST_PERIOD;
  const gust =
    gustU > 0.4 && gustU < 0.7
      ? Math.sin(((gustU - 0.4) / 0.3) * Math.PI) * 1.5
      : 0;
  return { sway, gust, total: sway + gust };
};

// Firefly blackout — semua kunang-kunang dim bareng tiap ~75 detik.
// Active window 1.5% dari period (~1.1s), parabolic dim. Atmospheric
// blip — kayak "scene tahan napas sejenak".
export const FIREFLY_BLACKOUT_PERIOD = 75;
export const getFireflyBlackout = (t) => {
  const u =
    (((t % FIREFLY_BLACKOUT_PERIOD) + FIREFLY_BLACKOUT_PERIOD) %
      FIREFLY_BLACKOUT_PERIOD) /
    FIREFLY_BLACKOUT_PERIOD;
  if (u > 0.985 && u < 1.0) {
    const dim = (u - 0.985) / 0.015;
    return Math.sin(dim * Math.PI);
  }
  return 0;
};

// SFX singleton — lazy AudioContext untuk one-shot tones (wind chime
// click, dst). Dibuat saat first user gesture, di-respect localStorage
// 'taman-audio-enabled' supaya selaras dgn AmbientAudio toggle.
let _sfxCtx = null;
const getSfxCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!_sfxCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      _sfxCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (_sfxCtx.state === 'suspended') {
    _sfxCtx.resume().catch(() => {});
  }
  return _sfxCtx;
};

const isAudioEnabled = () => {
  try {
    return localStorage.getItem('taman-audio-enabled') === '1';
  } catch {
    return false;
  }
};

// Bell tone — base sine + 2 harmonics dgn quick attack + slow exp decay.
// Sounds metallic/chime-like. freq base ~880 default (A5), bisa di-vary
// untuk banyak tube notes.
export const playChimeTone = (frequency = 880, masterAmp = 0.18) => {
  if (!isAudioEnabled()) return;
  const ctx = getSfxCtx();
  if (!ctx) return;
  const partial = (freq, amp, decay) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(amp, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + decay);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + decay + 0.05);
  };
  partial(frequency, masterAmp, 1.6);
  partial(frequency * 2, masterAmp * 0.4, 1.0);
  partial(frequency * 3.01, masterAmp * 0.22, 0.7);
};
