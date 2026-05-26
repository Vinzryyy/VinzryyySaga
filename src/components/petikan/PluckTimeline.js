/**
 * PluckTimeline — GSAP timeline factory untuk animasi reveal kartu
 * setelah user click aprikot di pohon.
 *
 * Pacing reference: TCG Pocket pack-opening (≈800ms anticipation, ≈600ms
 * reveal) + Genshin Impact wish (slower buildup untuk legenda tier).
 *
 * Phases:
 *   1. Entry (0 → 600ms)
 *      Container drops from above dgn slight tilt + opacity fade-in.
 *      ease: power2.out (gravity-feel deceleration).
 *
 *   2. Settle (600 → 900ms)
 *      Subtle bounce + rotation correction. Card sits front-down (back
 *      facing user). Pause moment — anticipation builds.
 *
 *   3. Flip (900 → 1500ms)
 *      Inner rotates rotateY 0 → 180. ease: power3.inOut (slow-fast-slow
 *      classic card flip).
 *
 *   4. Glow (1500 → 1700ms)
 *      Subtle outer glow pulse setelah reveal — settle confirmation.
 *      Legenda tier dapat extended glow (P6 cinematics).
 *
 * Returns: gsap.timeline instance. Caller can attach onComplete or kill
 * untuk early termination.
 */

import { gsap } from 'gsap';

export const createPluckTimeline = ({
  containerRef,
  innerRef,
  glowRef = null,
  onComplete = null,
  onFlipStart = null,
}) => {
  if (!containerRef.current || !innerRef.current) {
    return gsap.timeline(); // empty timeline — caller can still .kill() safely
  }

  // Initial state — set immediately (gsap.set), bukan tween.
  gsap.set(containerRef.current, {
    opacity: 0,
    y: -60,
    rotateZ: -3,
  });
  gsap.set(innerRef.current, {
    rotateY: 0,
  });
  if (glowRef?.current) {
    gsap.set(glowRef.current, { opacity: 0 });
  }

  const tl = gsap.timeline({
    onComplete: () => {
      if (typeof onComplete === 'function') onComplete();
    },
  });

  // Phase 1 — Entry (drop in from above)
  tl.to(
    containerRef.current,
    {
      opacity: 1,
      y: 0,
      rotateZ: 0,
      duration: 0.6,
      ease: 'power2.out',
    },
    0
  );

  // Phase 2 — Settle bounce (subtle, overlaps entry tail)
  tl.to(
    containerRef.current,
    {
      y: 6,
      duration: 0.12,
      ease: 'sine.out',
    },
    0.6
  ).to(
    containerRef.current,
    {
      y: 0,
      duration: 0.18,
      ease: 'sine.in',
    },
    0.72
  );

  // Anticipation pause built into timing — flip starts at 0.9s.
  // (No-op gap; tweens naturally schedule at next .to() call.)

  // Phase 3 — Flip (rotateY 0 → 180)
  tl.add(() => {
    if (typeof onFlipStart === 'function') onFlipStart();
  }, 0.9);
  tl.to(
    innerRef.current,
    {
      rotateY: 180,
      duration: 0.6,
      ease: 'power3.inOut',
    },
    0.9
  );

  // Phase 4 — Glow settle (only if glowRef provided)
  if (glowRef?.current) {
    tl.to(
      glowRef.current,
      {
        opacity: 0.5,
        duration: 0.4,
        ease: 'sine.out',
      },
      1.5
    ).to(
      glowRef.current,
      {
        opacity: 0,
        duration: 0.6,
        ease: 'sine.in',
      },
      1.9
    );
  }

  return tl;
};

/**
 * Synthesized page-turn sfx pakai Web Audio API. No asset file needed —
 * generate noise burst with bandpass filter envelope. Volume tied ke
 * townAudioBus untuk konsistensi sama music ambient.
 *
 * Safe to call repeatedly — each invocation creates a new AudioContext
 * yang di-close otomatis setelah burst selesai.
 */
export const playPageTurnSfx = (volumeMultiplier = 1) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const duration = 0.35;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // White noise dengan envelope decay
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.pow(1 - t, 2.5);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.18 * volumeMultiplier;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.onended = () => {
      try {
        ctx.close();
      } catch {
        /* already closed */
      }
    };
  } catch {
    // Audio blocked / unsupported — silent fail
  }
};
