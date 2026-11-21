/**
 * gameSfx — tiny synthesized sounds + phone haptics for Pasangkan Momen.
 *
 * Web Audio only (no audio files, nothing to license). One AudioContext,
 * created lazily on the first sound (always after a tap, so autoplay rules
 * are satisfied). Quiet by design. One toggle (localStorage) controls both
 * sound and vibration; default on.
 */

const KEY = 'armeniaca_mg_sound';
let ctx = null;
const listeners = new Set();

export const readSoundOn = () => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
};

export const writeSoundOn = (on) => {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* not remembered */
  }
  listeners.forEach((fn) => fn(on));
};

export const subscribeSound = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const audio = () => {
  if (ctx && ctx.state !== 'closed') {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    ctx = C ? new C() : null;
  } catch {
    ctx = null;
  }
  return ctx;
};

const tone = (c, { freq, to, start = 0, dur = 0.12, gain = 0.05, type = 'sine' }) => {
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};

const noise = (c, { start = 0, dur = 0.3, gain = 0.06, cutoff = 900 }) => {
  const t = c.currentTime + start;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(cutoff, t);
  lp.frequency.exponentialRampToValueAtTime(120, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(lp).connect(g).connect(c.destination);
  src.start(t);
};

// Notes (Hz): C5 E5 G5 C6 …
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5;

const RECIPES = {
  flip: (c) => tone(c, { freq: 1400, to: 900, dur: 0.05, gain: 0.025, type: 'triangle' }),
  match: (c, { combo = 1 } = {}) => {
    const lift = 1 + Math.min(combo - 1, 6) * 0.06; // combos climb a little
    tone(c, { freq: E5 * lift, dur: 0.14, gain: 0.05 });
    tone(c, { freq: A5 * lift, start: 0.07, dur: 0.22, gain: 0.05 });
  },
  miss: (c) => tone(c, { freq: 220, to: 170, dur: 0.12, gain: 0.03, type: 'triangle' }),
  joker: (c) => [C6, E6, G5 * 2].forEach((f, i) => tone(c, { freq: f, start: i * 0.05, dur: 0.16, gain: 0.035 })),
  bomb: (c) => {
    noise(c, { dur: 0.45, gain: 0.09, cutoff: 1400 });
    tone(c, { freq: 140, to: 45, dur: 0.4, gain: 0.08, type: 'sine' });
  },
  swap: (c) => {
    tone(c, { freq: D5, to: G5, dur: 0.12, gain: 0.03, type: 'triangle' });
    tone(c, { freq: G5, to: D5, start: 0.1, dur: 0.12, gain: 0.03, type: 'triangle' });
  },
  life: (c) => [E5, C5, 392].forEach((f, i) => tone(c, { freq: f, start: i * 0.09, dur: 0.16, gain: 0.04, type: 'triangle' })),
  clear: (c) => [C5, E5, G5, C6].forEach((f, i) => tone(c, { freq: f, start: i * 0.08, dur: 0.22, gain: 0.045 })),
  win: (c) => {
    [C5, E5, G5, C6, E6].forEach((f, i) => tone(c, { freq: f, start: i * 0.09, dur: 0.3, gain: 0.045 }));
    tone(c, { freq: C6, start: 0.5, dur: 0.6, gain: 0.04 });
  },
  fail: (c) => [G5, E5, C5, 261.6].forEach((f, i) => tone(c, { freq: f, start: i * 0.12, dur: 0.25, gain: 0.04, type: 'triangle' })),
};

const HAPTICS = {
  match: 12,
  joker: [10, 40, 10],
  bomb: [60, 40, 90],
  life: [40, 60, 40],
  clear: [15, 50, 15, 50, 30],
  win: [20, 60, 20, 60, 60],
  fail: [80, 60, 120],
};

/** Fire-and-forget. Silently does nothing if muted or unsupported. */
export const sfx = (name, opts) => {
  if (!readSoundOn()) return;
  const c = audio();
  if (c && RECIPES[name]) {
    try {
      RECIPES[name](c, opts);
    } catch {
      /* ignore audio glitches */
    }
  }
  const h = HAPTICS[name];
  if (h && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(h);
    } catch {
      /* ignore */
    }
  }
};
