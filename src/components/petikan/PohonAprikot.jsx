/**
 * PohonAprikot — composition utama SVG pohon aprikot. Hand-crafted
 * botanical illustration, retro paper-archive feel: muted sage leaves,
 * warm brown trunk, peach apricots. Bukan photoreal — lebih kayak
 * gambar buku tua.
 *
 * Komposisi:
 *   - Ground shadow (ellipse halus)
 *   - Trunk (organic filled path)
 *   - 6 branches (curves taper-stroke)
 *   - 6 leaf clusters di branch tips + canopy
 *   - 6 fruits scattered di canopy
 *
 * Animasi (GSAP, semua infinite + yoyo):
 *   - Leaf clusters sway ±2.5deg, 3-4s, staggered phase per cluster
 *   - Fruits bob ±1.5px y, 2.5-3s, staggered
 *   - Active fruit shimmer (glow opacity pulse), 1.8s
 *
 * State-driven:
 *   - canPluck=true  → fruit[0] active (clickable, shimmery)
 *   - canPluck=false → semua fruit idle (no shimmer, no click target)
 *
 * Designer swap path: keep API surface (canPluck, onPluck) — replace
 * SVG body sambil retain animation hook pattern.
 */

import React, { useEffect, useId, useRef } from 'react';
import { gsap } from 'gsap';
import Aprikot from './Aprikot';

// Fruit positions (cx, cy, r) — scattered di canopy untuk komposisi
// natural. Index 0 = "active candidate" (di posisi paling prominent
// canopy upper).
const FRUIT_POSITIONS = [
  { cx: 200, cy: 165, r: 14 }, // 0 — canopy top center, the "today" fruit
  { cx: 155, cy: 195, r: 12 },
  { cx: 245, cy: 200, r: 13 },
  { cx: 175, cy: 230, r: 10 },
  { cx: 230, cy: 235, r: 11 },
  { cx: 200, cy: 215, r: 10 },
];

// Leaf cluster anchors. Tiap cluster = group of 3-4 overlapping
// ellipses, di-render di-place.
const LEAF_CLUSTERS = [
  { cx: 200, cy: 155, scale: 1.2, tint: 'a' }, // canopy top
  { cx: 140, cy: 185, scale: 1.0, tint: 'b' },
  { cx: 260, cy: 185, scale: 1.0, tint: 'b' },
  { cx: 165, cy: 230, scale: 0.85, tint: 'a' },
  { cx: 235, cy: 230, scale: 0.85, tint: 'a' },
  { cx: 200, cy: 245, scale: 0.75, tint: 'b' },
];

const LEAF_TINTS = {
  a: { primary: '#6b7a47', mid: '#8a9659', highlight: '#a5b06f' },
  b: { primary: '#5e6f3e', mid: '#7d8a50', highlight: '#99a564' },
};

const LeafCluster = ({ cx, cy, scale = 1, tint = 'a', clusterRef }) => {
  const t = LEAF_TINTS[tint];
  return (
    <g
      ref={clusterRef}
      transform={`translate(${cx} ${cy}) scale(${scale})`}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <ellipse cx={-10} cy={4} rx={18} ry={12} fill={t.primary} opacity={0.92} />
      <ellipse cx={8} cy={2} rx={16} ry={11} fill={t.mid} opacity={0.9} />
      <ellipse cx={-2} cy={-8} rx={15} ry={10} fill={t.highlight} opacity={0.88} />
      <ellipse cx={4} cy={10} rx={12} ry={8} fill={t.primary} opacity={0.85} />
    </g>
  );
};

const PohonAprikot = ({ canPluck = false, onPluck }) => {
  const leafRefs = useRef([]);
  const fruitRefs = useRef([]);
  const activeGlowRef = useRef(null);

  // Stable refs callback factory — React strict-mode safe.
  const setLeafRef = (i) => (el) => {
    leafRefs.current[i] = el;
  };
  const setFruitRef = (i) => (el) => {
    fruitRefs.current[i] = el;
  };

  // Animations — sway, bob, shimmer. Recreate ketika canPluck flip
  // (active fruit muncul/hilang, beda set of refs).
  useEffect(() => {
    const tweens = [];

    // Leaf sway — staggered phases biar gak sync (organic feel).
    leafRefs.current.forEach((el, i) => {
      if (!el) return;
      const tween = gsap.to(el, {
        rotation: i % 2 === 0 ? 2.5 : -2.5,
        duration: 3 + (i % 3) * 0.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.3,
        transformOrigin: '50% 100%',
      });
      tweens.push(tween);
    });

    // Fruit bob — subtle y oscillation, staggered.
    fruitRefs.current.forEach((el, i) => {
      if (!el) return;
      const tween = gsap.to(el, {
        y: 1.5,
        duration: 2.4 + (i % 4) * 0.25,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.18,
      });
      tweens.push(tween);
    });

    // Active fruit shimmer — glow halo opacity pulse.
    if (activeGlowRef.current) {
      const tween = gsap.to(activeGlowRef.current, {
        opacity: 0.85,
        scale: 1.15,
        duration: 1.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        transformOrigin: 'center',
      });
      tweens.push(tween);
    }

    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [canPluck]);

  // Active fruit ref — gabungkan setFruitRef(0) dgn glow ref attach.
  // Aprikot komponen sendiri yang render glow circle dengan
  // className="aprikot-glow"; kita query dari fruit[0] ref.
  useEffect(() => {
    if (!canPluck) {
      activeGlowRef.current = null;
      return;
    }
    const fruitEl = fruitRefs.current[0];
    if (!fruitEl) return;
    const glow = fruitEl.querySelector('.aprikot-glow');
    activeGlowRef.current = glow || null;
  }, [canPluck]);

  // Stable gradient/filter ids — pakai useId untuk avoid collision
  // kalau ada multiple PohonAprikot di same page. useId pure, SSR-safe.
  const uid = useId();
  const gradId = `aprikot-grad-${uid}`;
  const glowId = `aprikot-glow-${uid}`;

  return (
    <div className="w-full max-w-md mx-auto" aria-hidden={!canPluck}>
      <svg
        viewBox="0 0 400 500"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role={canPluck ? 'img' : 'presentation'}
        aria-label={canPluck ? 'Pohon aprikot dengan satu buah yang siap dipetik' : 'Pohon aprikot beristirahat'}
      >
        <defs>
          {/* Fruit body gradient — peach light → warm orange */}
          <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffd9b8" />
            <stop offset="50%" stopColor="#e8a06e" />
            <stop offset="100%" stopColor="#c4794a" />
          </radialGradient>
          {/* Glow halo — warm gold fade */}
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd97a" stopOpacity={0.9} />
            <stop offset="60%" stopColor="#ffb84d" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ffb84d" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Ground shadow — subtle ellipse di base trunk */}
        <ellipse cx={200} cy={488} rx={90} ry={6} fill="#3d342b" opacity={0.12} />

        {/* Trunk — organic filled path with slight taper.
            Bottom wider (12 wide), top narrower (6 wide), with slight
            S-curve untuk natural feel. */}
        <path
          d="M 188 482 Q 184 420 190 360 Q 195 300 197 240 L 203 240 Q 205 300 210 360 Q 216 420 212 482 Z"
          fill="#6b4a35"
        />
        {/* Trunk highlight — narrow strip kiri untuk depth */}
        <path
          d="M 188 482 Q 184 420 190 360 Q 195 300 197 240 L 194 240 Q 192 300 188 360 Q 184 420 185 482 Z"
          fill="#7d5a40"
          opacity={0.6}
        />

        {/* Branches — 6 organic curves from trunk top (y≈240) */}
        <g stroke="#6b4a35" strokeLinecap="round" fill="none">
          {/* Upper canopy branches */}
          <path d="M 200 240 Q 175 200 145 175" strokeWidth={5} />
          <path d="M 200 240 Q 225 200 255 175" strokeWidth={5} />
          {/* Mid canopy branches */}
          <path d="M 200 250 Q 180 230 160 220" strokeWidth={4} />
          <path d="M 200 250 Q 220 230 240 220" strokeWidth={4} />
          {/* Lower spreading branches */}
          <path d="M 200 260 Q 175 255 165 240" strokeWidth={3.5} />
          <path d="M 200 260 Q 225 255 235 240" strokeWidth={3.5} />
        </g>

        {/* Leaf clusters — di-render sebelum fruits supaya fruits di atas */}
        {LEAF_CLUSTERS.map((cluster, i) => (
          <LeafCluster
            key={`leaf-${i}`}
            cx={cluster.cx}
            cy={cluster.cy}
            scale={cluster.scale}
            tint={cluster.tint}
            clusterRef={setLeafRef(i)}
          />
        ))}

        {/* Fruits — index 0 active when canPluck */}
        {FRUIT_POSITIONS.map((pos, i) => (
          <Aprikot
            key={`fruit-${i}`}
            ref={setFruitRef(i)}
            cx={pos.cx}
            cy={pos.cy}
            r={pos.r}
            active={canPluck && i === 0}
            onClick={i === 0 ? onPluck : undefined}
            gradientId={gradId}
            glowId={glowId}
            label={
              canPluck && i === 0
                ? 'Petik aprikot hari ini'
                : 'Aprikot di pohon'
            }
          />
        ))}
      </svg>
    </div>
  );
};

export default PohonAprikot;
