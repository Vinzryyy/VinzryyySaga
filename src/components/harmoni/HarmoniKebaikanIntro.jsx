/**
 * HarmoniKebaikanIntro — cinematic entrance for /harmoni-kebaikan.
 *
 * Inspired by AngeKatrina-unofficial-fansite's start animation:
 * sequential phases chained via GSAP onComplete, session-gated by
 * caller, skip button available from phase 2.
 *
 * 4 phases + 4 animation layers:
 *   1 "Malam"   — dark screen; dust particles drift upward; tree fades in
 *   2 "Tumbuh"  — roots grow down; trunk draws up; branches + foliage bloom
 *   3 "Mekar"   — ripple rings expand; petals burst; flash wipes to cream
 *   4 "Nyata"   — title stamp; ornament lines extend; subtitle + masuk reveal
 *
 * Reduced-motion: skip drawing/burst/transition; show static title
 * card on cream bg immediately. Masuk button always rendered so
 * keyboard users can proceed without waiting.
 *
 * onComplete  {function}  called after dismiss animation finishes.
 *                         Parent sets sessionStorage + unmounts.
 */

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Deterministic pseudo-random — same as FloatingPetals, avoids
// Math.random() in JSX which would mismatch across renders.
const seededVal = (i, mod) => Math.abs(Math.sin(i * 12.9898 + 1.0) * 43758.5453) % mod;

/* ─── palette (matches Armeniaca CSS vars) ─────────────────────── */
const C = {
  darkBg:    '#3D342B', // --retro-bg-dark
  cream:     '#FDF6E3', // --retro-cream
  sepia:     '#D4A574', // --retro-sepia
  brown:     '#8B6F4E', // --retro-brown
  brownDark: '#5C4A3A', // --retro-brown-dark
  burgundy:  '#8B4040', // --retro-burgundy
  burLight:  '#A95050', // --retro-burgundy-light
  gold:      '#C9A961', // --retro-gold
  goldLight: '#E5C575', // --retro-gold-light
};

/* ─── tree geometry ─────────────────────────────────────────────── */
// ViewBox: 0 0 200 280. Trunk rises from bottom-center; 5 branches
// spread to different heights; 6 foliage blobs cluster at tips.
// Roots spread downward from trunk base, drawn simultaneously with trunk.
const TRUNK_D = 'M 100 262 C 98 235 102 205 100 168';

const ROOTS = [
  { d: 'M 100 262 C 88 268 70 272 53 275', w: 3 },   // left main root
  { d: 'M 100 262 C 112 268 130 272 147 275', w: 3 }, // right main root
  { d: 'M 100 262 C 84 271 60 277 42 279', w: 2 },    // left deep root
  { d: 'M 100 262 C 116 271 140 277 158 279', w: 2 }, // right deep root
];

const BRANCHES = [
  { d: 'M 100 200 C 85 192 68 178 52 164', w: 5 },   // left main
  { d: 'M 100 195 C 115 185 132 172 148 158', w: 5 }, // right main
  { d: 'M 100 183 C 87 168 72 150 64 132', w: 3.5 },  // left upper
  { d: 'M 100 180 C 113 165 127 148 133 130', w: 3.5 },// right upper
  { d: 'M 100 172 C 100 155 100 140 100 120', w: 3 },  // center top
];

const FOLIAGE = [
  { cx: 100, cy: 100, r: 48, fill: C.burgundy,  opacity: 0.88 }, // main canopy
  { cx: 64,  cy: 135, r: 34, fill: C.burLight,  opacity: 0.82 }, // left — covers left main
  { cx: 136, cy: 132, r: 32, fill: C.brown,     opacity: 0.82 }, // right
  { cx: 78,  cy: 88,  r: 24, fill: C.gold,      opacity: 0.78 }, // left-top
  { cx: 122, cy: 86,  r: 22, fill: C.sepia,     opacity: 0.78 }, // right-top
  { cx: 100, cy: 74,  r: 19, fill: C.burgundy,  opacity: 0.72 }, // apex
];

/* ─── dust particles (Phase 1 atmosphere) ──────────────────────── */
const DUST_COUNT = 14;

/* ─── petal burst config ────────────────────────────────────────── */
const PETAL_COUNT = 20;
const PETAL_FILLS = [C.burLight, C.sepia, C.gold, C.burgundy, C.goldLight];
// petal SVG path (same as FloatingPetals, viewBox 0 0 24 32)
const PETAL_D = 'M12 2 C18 6, 21 14, 19 22 C17 28, 13 30, 12 30 C11 30, 7 28, 5 22 C3 14, 6 6, 12 2 Z';

/* ─── component ─────────────────────────────────────────────────── */
const HarmoniKebaikanIntro = ({ onComplete }) => {
  const wrapRef      = useRef(null);
  const bgRef        = useRef(null);
  const dustRefs     = useRef([]);
  const treeRef      = useRef(null);
  const trunkRef     = useRef(null);
  const rootRefs     = useRef([]);
  const branchRefs   = useRef([]);
  const foliageRefs  = useRef([]);
  const flashRef     = useRef(null);
  const rippleRefs   = useRef([]);
  const petalWrapRef = useRef(null);
  const petalRefs    = useRef([]);
  const titleRef     = useRef(null);
  const subtitleRef  = useRef(null);
  const btnRef       = useRef(null);
  const skipRef      = useRef(null);

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  /* ── reduced-motion: static cream card ──────────────────────── */
  useEffect(() => {
    if (!prefersReducedMotion) return;
    gsap.set(bgRef.current, { backgroundColor: C.cream });
    gsap.set(treeRef.current, { opacity: 0 });
    gsap.set([titleRef.current, subtitleRef.current, btnRef.current], { opacity: 1 });
    gsap.set(skipRef.current, { opacity: 0 });
  }, [prefersReducedMotion]);

  /* ── full animation ──────────────────────────────────────────── */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      /* set up stroke-dashoffset drawing */
      const trunk = trunkRef.current;
      const roots = rootRefs.current.filter(Boolean);
      const branches = branchRefs.current.filter(Boolean);
      [trunk, ...roots, ...branches].filter(Boolean).forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      });

      /* initial states */
      gsap.set(foliageRefs.current.filter(Boolean), {
        scale: 0,
        transformOrigin: '50% 50%',
      });
      gsap.set(treeRef.current, { opacity: 0 });
      gsap.set([titleRef.current, subtitleRef.current, btnRef.current], { opacity: 0 });
      gsap.set(skipRef.current, { opacity: 0 });
      gsap.set(flashRef.current, { opacity: 0 });
      gsap.set(petalWrapRef.current, { opacity: 1 });
      petalRefs.current.forEach((el) => el && gsap.set(el, { opacity: 0, scale: 0 }));

      /* ── dust particles: init + continuous float ── */
      const dust = dustRefs.current.filter(Boolean);
      gsap.set(dust, { opacity: 0 });
      // Stagger fade-in during Phase 1
      gsap.to(dust, {
        opacity: (i) => 0.12 + (i % 4) * 0.07,
        duration: 1.0,
        stagger: 0.08,
        delay: 0.1,
        ease: 'sine.out',
      });
      // Each particle drifts upward independently, looping
      dust.forEach((el, i) => {
        gsap.to(el, {
          y: -(22 + Math.random() * 38),
          x: (Math.random() - 0.5) * 18,
          duration: 3.2 + Math.random() * 2.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: Math.random() * 1.8,
        });
      });

      const tl = gsap.timeline();

      /* ── Phase 1: Malam (0 – 0.5s) ── */
      tl.to(treeRef.current, { opacity: 1, duration: 0.35 }, 0.15);
      // skip button drifts in quietly
      tl.to(skipRef.current, { opacity: 0.55, duration: 0.5 }, 0.9);

      /* ── Phase 2: Tumbuh (0.5 – 3.1s) ── */
      // roots spread downward simultaneously with trunk
      tl.to(roots, {
        strokeDashoffset: 0,
        duration: 0.5,
        ease: 'power1.inOut',
        stagger: 0.07,
      }, 0.5);

      // trunk draws upward
      tl.to(trunk, {
        strokeDashoffset: 0,
        duration: 0.65,
        ease: 'power2.inOut',
      }, 0.5);

      // branches extend with stagger after trunk is halfway done
      tl.to(branches, {
        strokeDashoffset: 0,
        duration: 0.45,
        ease: 'power1.inOut',
        stagger: 0.08,
      }, 0.95);

      // foliage blobs bloom at tips
      tl.to(foliageRefs.current.filter(Boolean), {
        scale: 1,
        duration: 0.42,
        ease: 'back.out(1.5)',
        stagger: 0.1,
      }, 1.75);

      /* ── Phase 3: Mekar (3.1 – 4.6s) ── */
      // dust fades before the flash
      tl.to(dust, { opacity: 0, duration: 0.4, stagger: 0.02 }, 2.9);

      // ripple rings expand outward before the flash peak
      const ripples = rippleRefs.current.filter(Boolean);
      gsap.set(ripples, { scale: 0, opacity: 0 });
      ripples.forEach((el, i) => {
        tl.fromTo(
          el,
          { scale: 0.2, opacity: 0.65 },
          { scale: 5 + i * 1.8, opacity: 0, duration: 0.75, ease: 'power2.out' },
          2.75 + i * 0.14,
        );
      });

      // white flash peaks
      tl.to(flashRef.current, {
        opacity: 0.88,
        duration: 0.22,
        ease: 'power3.in',
      }, 3.1);

      // during flash peak: swap bg to cream
      tl.to(bgRef.current, {
        backgroundColor: C.cream,
        duration: 0.05,
      }, 3.28);

      // fade tree out (dissolves into the light)
      tl.to(treeRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      }, 3.18);

      // flash fades revealing cream
      tl.to(flashRef.current, {
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
      }, 3.32);

      // petal burst — each petal flies outward independently
      petalRefs.current.forEach((el, i) => {
        if (!el) return;
        const angle = (i / PETAL_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const dist  = 72 + Math.random() * 110;
        const tx    = Math.cos(angle) * dist;
        const ty    = Math.sin(angle) * dist;
        const startAt = 3.12 + i * 0.016;

        tl.to(el, {
          x: tx, y: ty,
          scale: 0.75 + Math.random() * 0.8,
          opacity: 0.85,
          rotation: `+=${(Math.random() - 0.5) * 280}`,
          duration: 0.58,
          ease: 'power2.out',
        }, startAt);

        tl.to(el, {
          opacity: 0,
          y: `+=${18 + Math.random() * 45}`,
          duration: 0.72,
          ease: 'power1.in',
        }, startAt + 0.46);
      });

      /* ── Phase 4: Nyata (4.4 – 5.8s) ── */
      // title stamp
      tl.fromTo(
        titleRef.current,
        { opacity: 0, scale: 0.86, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.58, ease: 'back.out(1.4)' },
        4.35,
      );

      // subtitle
      tl.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 7 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'sine.out' },
        4.8,
      );

      // masuk button
      tl.fromTo(
        btnRef.current,
        { opacity: 0, y: 5 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'sine.out' },
        5.15,
      );

      // skip fades out (button takes over)
      tl.to(skipRef.current, { opacity: 0, duration: 0.3 }, 5.0);
    }, wrapRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  /* ── dismiss (both skip + masuk) ────────────────────────────── */
  const dismiss = () => {
    gsap.to(wrapRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: 'sine.in',
      onComplete,
    });
  };

  /* ─── render ──────────────────────────────────────────────────── */
  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: C.darkBg }}
      aria-label="Intro Harmoni Kebaikan"
    >
      {/* animated background layer */}
      <div
        ref={bgRef}
        className="absolute inset-0"
        style={{ backgroundColor: C.darkBg }}
      />

      {/* dust particles — phase 1 atmosphere, drift upward in dark */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: DUST_COUNT }).map((_, i) => {
          const size  = 2 + (i % 3);                              // 2, 3, 4 px
          const left  = seededVal(i, 94) + 3;                     // 3–97%
          const top   = seededVal(i + 7, 85) + 5;                 // 5–90%
          const color = [C.gold, C.sepia, C.goldLight][i % 3];
          return (
            <div
              key={i}
              ref={(el) => { dustRefs.current[i] = el; }}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                top: `${top}%`,
                backgroundColor: color,
                opacity: 0,
              }}
            />
          );
        })}
      </div>

      {/* white flash — phase 3 */}
      <div
        ref={flashRef}
        className="absolute inset-0 bg-white pointer-events-none"
        aria-hidden="true"
      />

      {/* petal burst — phase 3, centered on screen */}
      <div
        ref={petalWrapRef}
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: PETAL_COUNT }).map((_, i) => {
          const fill = PETAL_FILLS[i % PETAL_FILLS.length];
          const size = 8 + (i % 3) * 4; // 8, 12, 16 px
          return (
            <div
              key={i}
              ref={(el) => { petalRefs.current[i] = el; }}
              className="absolute"
            >
              <svg
                width={size}
                height={Math.round(size * 1.33)}
                viewBox="0 0 24 32"
                aria-hidden="true"
              >
                <path d={PETAL_D} fill={fill} />
              </svg>
            </div>
          );
        })}
      </div>

      {/* ripple rings — phase 3, expand outward before flash */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        aria-hidden="true"
      >
        {[C.gold, C.burgundy, C.sepia].map((color, i) => (
          <div
            key={i}
            ref={(el) => { rippleRefs.current[i] = el; }}
            className="absolute rounded-full"
            style={{
              width: 64,
              height: 64,
              border: `2px solid ${color}`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* tree SVG — phases 1 & 2 */}
      <div
        ref={treeRef}
        className="relative z-10"
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 200 280"
          width="180"
          height="252"
          xmlns="http://www.w3.org/2000/svg"
          overflow="visible"
        >
          {/* roots — draw downward from trunk base, same time as trunk */}
          {ROOTS.map((r, i) => (
            <path
              key={i}
              ref={(el) => { rootRefs.current[i] = el; }}
              d={r.d}
              stroke={C.brown}
              fill="none"
              strokeWidth={r.w}
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}

          {/* trunk */}
          <path
            ref={trunkRef}
            d={TRUNK_D}
            stroke={C.sepia}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* branches */}
          {BRANCHES.map((b, i) => (
            <path
              key={i}
              ref={(el) => { branchRefs.current[i] = el; }}
              d={b.d}
              stroke={C.sepia}
              fill="none"
              strokeWidth={b.w}
              strokeLinecap="round"
            />
          ))}

          {/* foliage blobs */}
          {FOLIAGE.map((f, i) => (
            <circle
              key={i}
              ref={(el) => { foliageRefs.current[i] = el; }}
              cx={f.cx}
              cy={f.cy}
              r={f.r}
              fill={f.fill}
              opacity={f.opacity}
            />
          ))}
        </svg>
      </div>

      {/* phase 4: title, subtitle, button */}
      <div className="relative z-10 mt-5 text-center px-6">
        <h1
          ref={titleRef}
          className="uppercase font-black tracking-[0.28em] text-2xl sm:text-3xl"
          style={{
            opacity: 0,
            color: C.brownDark,
            fontFamily: '"Fraunces", serif',
          }}
        >
          Harmoni Kebaikan
        </h1>

        <p
          ref={subtitleRef}
          className="mt-2 text-[10px] sm:text-xs uppercase tracking-[0.38em]"
          style={{
            opacity: 0,
            color: C.brown,
          }}
        >
          Helismiley × Armeniaca · 2026
        </p>

        <button
          ref={btnRef}
          onClick={dismiss}
          className="mt-6 px-7 py-2.5 text-[10px] uppercase tracking-[0.28em] font-bold transition-opacity hover:opacity-80 active:opacity-60"
          style={{
            opacity: 0,
            backgroundColor: C.burgundy,
            color: C.cream,
          }}
          aria-label="Masuk ke Harmoni Kebaikan"
        >
          Masuk →
        </button>
      </div>

      {/* skip — visible from phase 2, fades when masuk appears */}
      <button
        ref={skipRef}
        onClick={dismiss}
        className="absolute bottom-6 right-6 text-[9px] uppercase tracking-[0.32em] transition-opacity hover:opacity-100 active:opacity-60"
        style={{
          opacity: 0,
          color: C.sepia,
        }}
        aria-label="Lewati intro"
      >
        Lewati
      </button>
    </div>
  );
};

export default HarmoniKebaikanIntro;
