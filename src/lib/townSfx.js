/**
 * townSfx — interaction SFX synthesizer untuk armeniacaTown.
 *
 * Pakai Web Audio API murni, no asset (mirror pattern playBellStrike di
 * r4/utils.js). Module-level singleton AudioContext — reuse, gak leak
 * (browser cap ~5-6 contexts per origin).
 *
 * SFX subtle by design — peak gain 0.03-0.05, decay 0.08-0.5s. Tidak
 * scale dengan music volume slider (independen). Yang gate cuma flag
 * `enabled` dari townAudioBus — kalau user mute via icon, SFX juga mati.
 *
 * Throttle: same-name SFX dalam 50ms diabaikan supaya rapid-tap gak
 * bikin overlap-explode.
 *
 * Public API:
 *   playSfx(name) — fire-and-forget. name ∈ keys(RECIPES).
 *
 * Available recipes:
 *   - chime       — wind-chime ting (discovery click)
 *   - tap         — wooden short tap (petak/UI click)
 *   - paperSlide  — soft noise burst (modal close)
 *   - splash      — water bend + noise (air mancur)
 *   - meow        — cat vocalize w/ vibrato (TanTan klik)
 *   - pageTurn    — paper rustle (petak preview open)
 */

import { readEnabled } from './townAudioBus';

let ctxRef = null;
const lastFireMap = {};
const THROTTLE_MS = 50;

const ensureCtx = () => {
  if (ctxRef && ctxRef.state !== 'closed') return ctxRef;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctxRef = new Ctx();
    return ctxRef;
  } catch {
    return null;
  }
};

// === HELPERS ===

// Single oscillator dengan attack/decay envelope. Linear attack (cepat),
// exponential decay (alami kerasa). Default sine; pakai triangle/square
// kalau butuh karakter beda.
const playToneEnvelope = (
  ctx,
  freq,
  peakGain,
  attack,
  decay,
  type = 'sine',
) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + attack + decay + 0.05);
};

// White noise buffer dengan duration tertentu. Dipake untuk paperSlide,
// splash — texture organik tanpa asset.
const playNoiseBurst = (ctx, durationS, peakGain, filterFreq, filterQ = 1) => {
  const now = ctx.currentTime;
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(durationS * sampleRate));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationS);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
  source.stop(now + durationS + 0.02);
};

// Oscillator dengan pitch glide (slide). Dipake untuk splash + meow.
const playPitchSlide = (
  ctx,
  fromFreq,
  toFreq,
  peakGain,
  duration,
  type = 'sine',
) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, now);
  osc.frequency.exponentialRampToValueAtTime(toFreq, now + duration);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
};

// === RECIPES ===

// chime — wind-chime ting, 2 harmonics, cepat decay
const playChime = (ctx) => {
  playToneEnvelope(ctx, 1320, 0.04, 0.005, 0.5);
  playToneEnvelope(ctx, 2640, 0.018, 0.005, 0.32);
};

// tap — wooden short percussive, triangle wave bikin "knock" rasa
const playTap = (ctx) => {
  playToneEnvelope(ctx, 380, 0.05, 0.003, 0.09, 'triangle');
  playToneEnvelope(ctx, 190, 0.03, 0.003, 0.13);
};

// paperSlide — short filtered noise, kerasa kertas kena angin
const playPaperSlide = (ctx) => {
  playNoiseBurst(ctx, 0.18, 0.04, 2400, 1.4);
};

// splash — water drop: pitch slide low + thin noise tail
const playSplash = (ctx) => {
  playPitchSlide(ctx, 480, 140, 0.045, 0.22);
  playNoiseBurst(ctx, 0.15, 0.022, 3200, 2);
};

// meow — cat vocalize: triangle wave 320Hz dengan slight upward then
// down slide, satu burst pendek. Cat-like timbre via triangle (lebih
// nasal dari sine).
const playMeow = (ctx) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.32);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.04);
  gain.gain.setValueAtTime(0.05, now + 0.22);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
};

// pageTurn — slightly longer noise dengan mid-band filter, kerasa rustle
const playPageTurn = (ctx) => {
  playNoiseBurst(ctx, 0.28, 0.035, 1600, 1.2);
};

const RECIPES = {
  chime: playChime,
  tap: playTap,
  paperSlide: playPaperSlide,
  splash: playSplash,
  meow: playMeow,
  pageTurn: playPageTurn,
};

// === PUBLIC API ===

export const playSfx = (name) => {
  if (!readEnabled()) return;
  const recipe = RECIPES[name];
  if (!recipe) return;

  const now = Date.now();
  if (lastFireMap[name] && now - lastFireMap[name] < THROTTLE_MS) return;
  lastFireMap[name] = now;

  const ctx = ensureCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  try {
    recipe(ctx);
  } catch {
    /* WebAudio error — gak penting, fail silent */
  }
};
