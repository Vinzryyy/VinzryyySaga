/**
 * HarmoniKebaikanIntro — cinematic entrance for /harmoni-kebaikan.
 *
 * Inspired by AngeKatrina-unofficial-fansite's start animation:
 * sequential phases chained via GSAP onComplete, session-gated by
 * caller, skip button available from phase 2.
 *
 * 4 phases, 9 animation layers:
 *   1 "Malam"   — dark screen; dust particles drift; radial glow pulses; tree fades in
 *   2 "Tumbuh"  — roots grow down; trunk draws up; branches extend; foliage blooms;
 *                 sparkle stars pop at canopy tips
 *   3 "Mekar"   — ripple rings expand; wipe bars cascade; petals burst; flash wipes
 *                 to cream; aftermath petals drift down
 *   4 "Nyata"   — title letters stagger in; ornament lines extend; subtitle + masuk reveal
 *
 * Reduced-motion: static cream card, all elements immediately visible.
 *
 * onComplete  {function}  called after dismiss animation finishes.
 *                         Parent sets sessionStorage + unmounts.
 */

import React, { useEffect, useId, useRef } from 'react';
import { gsap } from 'gsap';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Deterministic pseudo-random — avoids Math.random() in JSX render.
const seededVal = (i, mod) => Math.abs(Math.sin(i * 12.9898 + 1.0) * 43758.5453) % mod;

/* ─── palette ───────────────────────────────────────────────────── */
const C = {
  darkBg:    '#3D342B',
  cream:     '#FDF6E3',
  sepia:     '#D4A574',
  brown:     '#8B6F4E',
  brownDark: '#5C4A3A',
  burgundy:  '#8B4040',
  burLight:  '#A95050',
  gold:      '#C9A961',
  goldLight: '#E5C575',
};

/* ─── tree geometry ─────────────────────────────────────────────── */
const TRUNK_D = 'M 100 262 C 98 235 102 205 100 168';

const ROOTS = [
  { d: 'M 100 262 C 88 268 70 272 53 275', w: 3 },
  { d: 'M 100 262 C 112 268 130 272 147 275', w: 3 },
  { d: 'M 100 262 C 84 271 60 277 42 279', w: 2 },
  { d: 'M 100 262 C 116 271 140 277 158 279', w: 2 },
];

const BRANCHES = [
  { d: 'M 100 200 C 85 192 68 178 52 164', w: 5 },
  { d: 'M 100 195 C 115 185 132 172 148 158', w: 5 },
  { d: 'M 100 183 C 87 168 72 150 64 132', w: 3.5 },
  { d: 'M 100 180 C 113 165 127 148 133 130', w: 3.5 },
  { d: 'M 100 172 C 100 155 100 140 100 120', w: 3 },
];

const FOLIAGE = [
  { cx: 100, cy: 100, r: 48, fill: C.burgundy,  opacity: 0.88 },
  { cx: 64,  cy: 135, r: 34, fill: C.burLight,  opacity: 0.82 },
  { cx: 136, cy: 132, r: 32, fill: C.brown,     opacity: 0.82 },
  { cx: 78,  cy: 88,  r: 24, fill: C.gold,      opacity: 0.78 },
  { cx: 122, cy: 86,  r: 22, fill: C.sepia,     opacity: 0.78 },
  { cx: 100, cy: 74,  r: 19, fill: C.burgundy,  opacity: 0.72 },
];

// 4-point star path, centered at origin, ~7px wide
const SPARKLE_D = 'M 0 -3.5 L 0.7 -0.7 L 3.5 0 L 0.7 0.7 L 0 3.5 L -0.7 0.7 L -3.5 0 L -0.7 -0.7 Z';
// 3 sparkles per foliage circle = 18 total
const SPARKLE_POSITIONS = FOLIAGE.flatMap((f, fi) =>
  [0, 120, 240].map((deg, si) => {
    const rad = (deg + fi * 22 + 15) * Math.PI / 180;
    return {
      x:     f.cx + Math.cos(rad) * f.r * 0.72,
      y:     f.cy + Math.sin(rad) * f.r * 0.72,
      color: [C.gold, C.goldLight, C.cream][si % 3],
      delay: fi * 0.1 + si * 0.07,
    };
  }),
);

/* ─── particle configs ──────────────────────────────────────────── */
const DUST_COUNT        = 14;
const PETAL_COUNT       = 20;
const AFTER_PETAL_COUNT = 10;
const WIPE_BAR_COUNT    = 5;
const TITLE_TEXT        = 'Harmoni Kebaikan';

const PETAL_FILLS = [C.burLight, C.sepia, C.gold, C.burgundy, C.goldLight];
const PETAL_D = 'M12 2 C18 6, 21 14, 19 22 C17 28, 13 30, 12 30 C11 30, 7 28, 5 22 C3 14, 6 6, 12 2 Z';

/* ─── component ─────────────────────────────────────────────────── */
const HarmoniKebaikanIntro = ({ onComplete }) => {
  const uid = useId();

  /* ── refs ── */
  const wrapRef         = useRef(null);
  const bgRef           = useRef(null);
  // Phase 1
  const dustRefs        = useRef([]);
  const glowRef         = useRef(null);
  // Phase 2 — tree
  const treeRef         = useRef(null);
  const rootRefs        = useRef([]);
  const trunkRef        = useRef(null);
  const branchRefs      = useRef([]);
  const foliageRefs     = useRef([]);
  const sparkleRefs     = useRef([]);
  // Phase 3
  const rippleRefs      = useRef([]);
  const wipeBarRefs     = useRef([]);
  const flashRef        = useRef(null);
  const petalWrapRef    = useRef(null);
  const petalRefs       = useRef([]);
  const afterPetalRefs  = useRef([]);
  // Phase 4
  const letterRefs      = useRef([]);
  const lineLeftRef     = useRef(null);
  const lineDotRef      = useRef(null);
  const lineRightRef    = useRef(null);
  const subtitleRef     = useRef(null);
  const btnRef          = useRef(null);
  const skipRef         = useRef(null);

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  /* ── reduced-motion: instant cream card ─────────────────────── */
  useEffect(() => {
    if (!prefersReducedMotion) return;
    gsap.set(bgRef.current,   { backgroundColor: C.cream });
    gsap.set(treeRef.current, { opacity: 0 });
    gsap.set(glowRef.current, { opacity: 0 });
    gsap.set(letterRefs.current.filter(Boolean), { opacity: 1, y: 0 });
    gsap.set([subtitleRef.current, btnRef.current], { opacity: 1 });
    gsap.set([lineLeftRef.current, lineRightRef.current, lineDotRef.current], { opacity: 0.75 });
    gsap.set(skipRef.current, { opacity: 0 });
  }, [prefersReducedMotion]);

  /* ── full animation ──────────────────────────────────────────── */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {

      /* ── stroke-dashoffset setup ── */
      const trunk    = trunkRef.current;
      const roots    = rootRefs.current.filter(Boolean);
      const branches = branchRefs.current.filter(Boolean);
      [trunk, ...roots, ...branches].filter(Boolean).forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });

      /* ── sparkle positions via GSAP translate ── */
      const sparkles = sparkleRefs.current.filter(Boolean);
      sparkles.forEach((el, i) => {
        const sp = SPARKLE_POSITIONS[i];
        if (!sp || !el) return;
        gsap.set(el, { x: sp.x, y: sp.y, scale: 0, opacity: 0 });
      });

      /* ── initial states ── */
      gsap.set(foliageRefs.current.filter(Boolean), { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(treeRef.current,  { opacity: 0 });
      gsap.set(glowRef.current,  { opacity: 0 });
      gsap.set(flashRef.current, { opacity: 0 });
      gsap.set(petalWrapRef.current, { opacity: 1 });
      petalRefs.current.forEach((el) => el && gsap.set(el, { opacity: 0, scale: 0 }));
      afterPetalRefs.current.forEach((el) => el && gsap.set(el, { opacity: 0 }));
      gsap.set(dustRefs.current.filter(Boolean), { opacity: 0 });
      gsap.set(rippleRefs.current.filter(Boolean), { scale: 0, opacity: 0 });
      gsap.set(wipeBarRefs.current.filter(Boolean), { scaleY: 0, opacity: 1, transformOrigin: 'bottom center' });
      gsap.set(letterRefs.current.filter(Boolean), { opacity: 0, y: 18, rotation: 0 });
      gsap.set([subtitleRef.current, btnRef.current, skipRef.current], { opacity: 0 });
      gsap.set([lineLeftRef.current, lineRightRef.current, lineDotRef.current], { opacity: 0 });

      /* ─────────────────────────────────────────────────────────── */
      /*  DUST — continuous float, independent of main tl           */
      /* ─────────────────────────────────────────────────────────── */
      const dust = dustRefs.current.filter(Boolean);
      gsap.to(dust, {
        opacity: (i) => 0.12 + (i % 4) * 0.07,
        duration: 1.0, stagger: 0.08, delay: 0.1, ease: 'sine.out',
      });
      dust.forEach((el) => {
        gsap.to(el, {
          y: -(22 + Math.random() * 38),
          x: (Math.random() - 0.5) * 18,
          duration: 3.2 + Math.random() * 2.5,
          repeat: -1, yoyo: true, ease: 'sine.inOut',
          delay: Math.random() * 1.8,
        });
      });

      /* ─────────────────────────────────────────────────────────── */
      /*  MAIN TIMELINE                                              */
      /* ─────────────────────────────────────────────────────────── */
      const tl = gsap.timeline();

      /* ── Phase 1: Malam ── */
      tl.to(treeRef.current, { opacity: 1, duration: 0.35 }, 0.15);
      tl.to(skipRef.current, { opacity: 0.55, duration: 0.5 }, 0.9);

      // Radial glow fades in behind tree as it appears
      tl.to(glowRef.current, { opacity: 0.55, duration: 0.8, ease: 'sine.out' }, 0.4);

      /* ── Phase 2: Tumbuh ── */
      // roots + trunk draw simultaneously
      tl.to(roots, { strokeDashoffset: 0, duration: 0.5, ease: 'power1.inOut', stagger: 0.07 }, 0.5);
      tl.to(trunk, { strokeDashoffset: 0, duration: 0.65, ease: 'power2.inOut' }, 0.5);

      // branches extend
      tl.to(branches, { strokeDashoffset: 0, duration: 0.45, ease: 'power1.inOut', stagger: 0.08 }, 0.95);

      // foliage blooms
      tl.to(foliageRefs.current.filter(Boolean), {
        scale: 1, duration: 0.42, ease: 'back.out(1.5)', stagger: 0.1,
      }, 1.75);

      // glow pulses at foliage peak then fades
      tl.to(glowRef.current, { opacity: 0.82, duration: 0.4, ease: 'sine.inOut' }, 2.1);
      tl.to(glowRef.current, { opacity: 0,    duration: 0.55, ease: 'sine.in'  }, 2.65);

      // sparkle stars pop at canopy tips right after each foliage blob
      sparkles.forEach((el, i) => {
        if (!el) return;
        const sp = SPARKLE_POSITIONS[i];
        const t  = 2.25 + sp.delay;
        tl.fromTo(el, { scale: 0, opacity: 0 }, { scale: 1.4, opacity: 0.9, duration: 0.18, ease: 'back.out(3)' }, t);
        tl.to(el, { scale: 0, opacity: 0, duration: 0.3, ease: 'power2.in' }, t + 0.18);
      });

      /* ── Phase 3: Mekar ── */
      // dust fades before transition
      tl.to(dust, { opacity: 0, duration: 0.35, stagger: 0.02 }, 2.85);

      // ripple rings expand outward
      const ripples = rippleRefs.current.filter(Boolean);
      ripples.forEach((el, i) => {
        tl.fromTo(
          el,
          { scale: 0.2, opacity: 0.65 },
          { scale: 5 + i * 1.8, opacity: 0, duration: 0.75, ease: 'power2.out' },
          2.75 + i * 0.14,
        );
      });

      // wipe bars cascade left→right across screen
      const wipes = wipeBarRefs.current.filter(Boolean);
      tl.to(wipes, { scaleY: 1, duration: 0.24, ease: 'power3.in',  stagger: 0.04 }, 3.0);
      tl.to(wipes, { opacity: 0, duration: 0.22, ease: 'power1.out', stagger: 0.02 }, 3.42);

      // white flash peak
      tl.to(flashRef.current, { opacity: 0.88, duration: 0.2, ease: 'power3.in' }, 3.12);

      // swap bg + fade tree during flash
      tl.to(bgRef.current,  { backgroundColor: C.cream, duration: 0.04 }, 3.3);
      tl.to(treeRef.current, { opacity: 0, duration: 0.28, ease: 'power2.in' }, 3.2);
      tl.to(flashRef.current, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 3.34);

      // petal burst — each petal flies outward
      petalRefs.current.forEach((el, i) => {
        if (!el) return;
        const angle   = (i / PETAL_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const dist    = 72 + Math.random() * 110;
        const startAt = 3.14 + i * 0.016;
        tl.to(el, {
          x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
          scale: 0.75 + Math.random() * 0.8, opacity: 0.85,
          rotation: `+=${(Math.random() - 0.5) * 280}`,
          duration: 0.58, ease: 'power2.out',
        }, startAt);
        tl.to(el, {
          opacity: 0, y: `+=${18 + Math.random() * 45}`,
          duration: 0.72, ease: 'power1.in',
        }, startAt + 0.46);
      });

      // aftermath petals — drift slowly down after burst
      afterPetalRefs.current.forEach((el, i) => {
        if (!el) return;
        const startAt = 3.82 + i * 0.18;
        tl.fromTo(el,
          { y: 0, opacity: 0.8, rotation: seededVal(i + 50, 360) },
          {
            y: '108vh',
            x: seededVal(i + 60, 100) - 50,
            opacity: 0,
            rotation: `+=${seededVal(i + 70, 180) - 90}`,
            duration: 3.0 + seededVal(i, 1.8),
            ease: 'none',
          },
          startAt,
        );
      });

      /* ── Phase 4: Nyata ── */
      // title letters stagger in with bounce
      const letters = letterRefs.current.filter(Boolean);
      tl.to(letters, {
        opacity: 1, y: 0,
        duration: 0.4, ease: 'back.out(1.8)', stagger: 0.04,
      }, 4.3);

      // ornament lines extend from center outward
      tl.fromTo(lineLeftRef.current,  { scaleX: 0, opacity: 0.75, transformOrigin: 'right center' }, { scaleX: 1, opacity: 0.75, duration: 0.5, ease: 'power2.out' }, 4.85);
      tl.fromTo(lineRightRef.current, { scaleX: 0, opacity: 0.75, transformOrigin: 'left center'  }, { scaleX: 1, opacity: 0.75, duration: 0.5, ease: 'power2.out' }, 4.85);
      tl.fromTo(lineDotRef.current,   { opacity: 0, scale: 0 }, { opacity: 0.9, scale: 1, duration: 0.3, ease: 'back.out(2)' }, 5.1);

      // subtitle
      tl.fromTo(subtitleRef.current, { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 0.45, ease: 'sine.out' }, 5.2);

      // masuk button
      tl.fromTo(btnRef.current, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.4, ease: 'sine.out' }, 5.58);

      // skip fades out when button appears
      tl.to(skipRef.current, { opacity: 0, duration: 0.3 }, 5.42);

    }, wrapRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  /* ── dismiss ─────────────────────────────────────────────────── */
  const dismiss = () => {
    gsap.to(wrapRef.current, { opacity: 0, duration: 0.4, ease: 'sine.in', onComplete });
  };

  /* ─── render ─────────────────────────────────────────────────── */
  const glowGradId = `hk-glow-${uid}`;

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: C.darkBg }}
      aria-label="Intro Harmoni Kebaikan"
    >
      {/* ── bg layer (animated to cream in Phase 3) ── */}
      <div ref={bgRef} className="absolute inset-0" style={{ backgroundColor: C.darkBg }} />

      {/* ── dust particles — Phase 1, drift upward ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {Array.from({ length: DUST_COUNT }).map((_, i) => {
          const size  = 2 + (i % 3);
          const left  = seededVal(i, 94) + 3;
          const top   = seededVal(i + 7, 85) + 5;
          const color = [C.gold, C.sepia, C.goldLight][i % 3];
          return (
            <div
              key={i}
              ref={(el) => { dustRefs.current[i] = el; }}
              className="absolute rounded-full"
              style={{ width: size, height: size, left: `${left}%`, top: `${top}%`, backgroundColor: color, opacity: 0 }}
            />
          );
        })}
      </div>

      {/* ── radial glow behind tree — Phase 1-2 ── */}
      <div ref={glowRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ opacity: 0 }}>
        <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id={glowGradId} cx="50%" cy="46%" r="38%">
              <stop offset="0%"   stopColor={C.gold}     stopOpacity="0.28" />
              <stop offset="45%"  stopColor={C.burgundy} stopOpacity="0.10" />
              <stop offset="100%" stopColor={C.darkBg}   stopOpacity="0"    />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${glowGradId})`} />
        </svg>
      </div>

      {/* ── ripple rings — Phase 3, expand before flash ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden="true">
        {[C.gold, C.burgundy, C.sepia].map((color, i) => (
          <div
            key={i}
            ref={(el) => { rippleRefs.current[i] = el; }}
            className="absolute rounded-full"
            style={{ width: 64, height: 64, border: `2px solid ${color}`, opacity: 0 }}
          />
        ))}
      </div>

      {/* ── wipe bars — Phase 3, AngeKatrina-style cascade ── */}
      <div className="absolute inset-0 pointer-events-none flex" aria-hidden="true">
        {Array.from({ length: WIPE_BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { wipeBarRefs.current[i] = el; }}
            className="flex-1 h-full"
            style={{ backgroundColor: C.cream }}
          />
        ))}
      </div>

      {/* ── white flash — Phase 3 peak ── */}
      <div ref={flashRef} className="absolute inset-0 bg-white pointer-events-none" aria-hidden="true" />

      {/* ── petal burst — Phase 3, centered ── */}
      <div
        ref={petalWrapRef}
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: PETAL_COUNT }).map((_, i) => {
          const fill = PETAL_FILLS[i % PETAL_FILLS.length];
          const size = 8 + (i % 3) * 4;
          return (
            <div key={i} ref={(el) => { petalRefs.current[i] = el; }} className="absolute">
              <svg width={size} height={Math.round(size * 1.33)} viewBox="0 0 24 32" aria-hidden="true">
                <path d={PETAL_D} fill={fill} />
              </svg>
            </div>
          );
        })}
      </div>

      {/* ── aftermath petals — drift slowly downward after burst ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {Array.from({ length: AFTER_PETAL_COUNT }).map((_, i) => {
          const left  = seededVal(i + 40, 85) + 7;
          const fill  = PETAL_FILLS[i % PETAL_FILLS.length];
          const size  = 7 + (i % 3) * 3;
          return (
            <div
              key={i}
              ref={(el) => { afterPetalRefs.current[i] = el; }}
              className="absolute"
              style={{ top: -25, left: `${left}%`, opacity: 0 }}
            >
              <svg width={size} height={Math.round(size * 1.33)} viewBox="0 0 24 32" aria-hidden="true">
                <path d={PETAL_D} fill={fill} />
              </svg>
            </div>
          );
        })}
      </div>

      {/* ── tree SVG — Phase 1 & 2 ── */}
      <div ref={treeRef} className="relative z-10" style={{ opacity: 0 }} aria-hidden="true">
        <svg viewBox="0 0 200 280" width="180" height="252" xmlns="http://www.w3.org/2000/svg" overflow="visible">

          {/* roots */}
          {ROOTS.map((r, i) => (
            <path
              key={i}
              ref={(el) => { rootRefs.current[i] = el; }}
              d={r.d} stroke={C.brown} fill="none"
              strokeWidth={r.w} strokeLinecap="round" opacity={0.7}
            />
          ))}

          {/* trunk */}
          <path
            ref={trunkRef}
            d={TRUNK_D} stroke={C.sepia} fill="none"
            strokeWidth="7" strokeLinecap="round"
          />

          {/* branches */}
          {BRANCHES.map((b, i) => (
            <path
              key={i}
              ref={(el) => { branchRefs.current[i] = el; }}
              d={b.d} stroke={C.sepia} fill="none"
              strokeWidth={b.w} strokeLinecap="round"
            />
          ))}

          {/* foliage blobs */}
          {FOLIAGE.map((f, i) => (
            <circle
              key={i}
              ref={(el) => { foliageRefs.current[i] = el; }}
              cx={f.cx} cy={f.cy} r={f.r} fill={f.fill} opacity={f.opacity}
            />
          ))}

          {/* sparkle stars — pop at canopy tips after foliage blooms */}
          {SPARKLE_POSITIONS.map((sp, i) => (
            <path
              key={i}
              ref={(el) => { sparkleRefs.current[i] = el; }}
              d={SPARKLE_D}
              fill={sp.color}
              opacity={0}
            />
          ))}

        </svg>
      </div>

      {/* ── Phase 4: title + ornaments + subtitle + button ── */}
      <div className="relative z-10 mt-5 text-center px-6">

        {/* title — letters animate in individually */}
        <h1
          className="uppercase font-black tracking-[0.28em] text-2xl sm:text-3xl"
          style={{ color: C.brownDark, fontFamily: '"Fraunces", serif' }}
          aria-label={TITLE_TEXT}
        >
          {TITLE_TEXT.split('').map((char, i) => (
            <span
              key={i}
              ref={(el) => { letterRefs.current[i] = el; }}
              className="inline-block"
              style={{ opacity: 0 }}
              aria-hidden="true"
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>

        {/* ornament lines */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <div ref={lineLeftRef}  className="h-px w-14 sm:w-20" style={{ backgroundColor: C.gold, opacity: 0 }} />
          <div ref={lineDotRef}   className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.gold, opacity: 0 }} />
          <div ref={lineRightRef} className="h-px w-14 sm:w-20" style={{ backgroundColor: C.gold, opacity: 0 }} />
        </div>

        <p
          ref={subtitleRef}
          className="mt-2 text-[10px] sm:text-xs uppercase tracking-[0.38em]"
          style={{ opacity: 0, color: C.brown }}
        >
          Helismiley × Armeniaca · 2026
        </p>

        <button
          ref={btnRef}
          onClick={dismiss}
          className="mt-6 px-7 py-2.5 text-[10px] uppercase tracking-[0.28em] font-bold transition-opacity hover:opacity-80 active:opacity-60"
          style={{ opacity: 0, backgroundColor: C.burgundy, color: C.cream }}
          aria-label="Masuk ke Harmoni Kebaikan"
        >
          Masuk →
        </button>
      </div>

      {/* ── skip button ── */}
      <button
        ref={skipRef}
        onClick={dismiss}
        className="absolute bottom-6 right-6 text-[9px] uppercase tracking-[0.32em] transition-opacity hover:opacity-100 active:opacity-60"
        style={{ opacity: 0, color: C.sepia }}
        aria-label="Lewati intro"
      >
        Lewati
      </button>
    </div>
  );
};

export default HarmoniKebaikanIntro;
