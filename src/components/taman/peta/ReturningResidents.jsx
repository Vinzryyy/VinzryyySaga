/**
 * ReturningResidents — warga ArmeniacaTown mulai balik post-purified.
 *
 * Bayar janji narasi Arme: pas purified (7000) dia bilang "yang lain
 * butuh waktu balik". Mulai dari 7500, sosok-sosok jauh muncul satu
 * per satu di pinggir kota. Density scales sama armeniacaCount:
 *   7500 = 3 sosok jauh di edge map
 *   8000 = 6 sosok mid-distance
 *   8500 = 8 sosok
 *   9000 = 10 sosok mulai ke jalan
 *   9500 = 11 sosok
 *   10000 = 14 sosok ramai di plaza
 *
 * Visual: simple R3F primitives (cone+sphere body), 3 variant silhouette
 * (tall slim / medium / short rounded) + 4 skin tone + 4 hair color
 * supaya gak monoton. Per-warga slow wander animation (drift dalam
 * radius ~0.4 unit, period 25-40s) plus subtle bob+sway — ngasih
 * kerasa kayak warga "lagi ada di sini" bukan statue.
 *
 * Position safety: semua titik >=1.8 unit jauh dari landmark mayor
 * (Pohon, Telaga, Arsip/Perpustakaan, Menara, Panggung, Air Mancur,
 * Aula, Gerbang) supaya gak ngeganggu hover/click target. Wander
 * radius kecil supaya warga gak nyangkut ke tap target lain.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Silhouette variants — 3 archetype supaya kerasa warga macem-macem
// (gak semua tinggi sama). idx → variant via modulo.
const WARGA_VARIANTS = [
  {
    // Tall slim
    bodyTop: 0.14,
    bodyBottom: 0.18,
    bodyHeight: 0.78,
    bodyY: 0.39,
    headSize: 0.105,
    headY: 0.85,
    scale: 0.82,
    hairLong: false,
  },
  {
    // Medium standard
    bodyTop: 0.18,
    bodyBottom: 0.22,
    bodyHeight: 0.62,
    bodyY: 0.31,
    headSize: 0.12,
    headY: 0.72,
    scale: 0.75,
    hairLong: false,
  },
  {
    // Shorter rounded (anak-anak / postur lebih bulat)
    bodyTop: 0.2,
    bodyBottom: 0.24,
    bodyHeight: 0.5,
    bodyY: 0.25,
    headSize: 0.135,
    headY: 0.6,
    scale: 0.7,
    hairLong: true,
  },
];

const SKIN_COLORS = ['#e8c8a8', '#d8b89a', '#c8a888', '#e0c0a0'];
const HAIR_COLORS = ['#3a2a1e', '#4a3a2a', '#2a1f1a', '#5a4030'];

// WARGA_DEFS — base position + jacket color + animation phase + variant.
// variant via idx % 3; skin/hair via idx % 4 — natural distribution.
const WARGA_DEFS = [
  // Tier 1 (7500) — 3 sosok jauh di edge map
  { pos: [-10, 0, 7], appearAt: 7500, color: '#c9a290', phase: 0.0 },
  { pos: [10, 0, 7], appearAt: 7500, color: '#d4b596', phase: 1.3 },
  { pos: [0, 0, -11], appearAt: 7500, color: '#a8a884', phase: 2.6 },

  // Tier 2 (8000) — +3 sosok, mid-distance
  { pos: [-9, 0, 4], appearAt: 8000, color: '#bea58a', phase: 0.7 },
  { pos: [9, 0, 4], appearAt: 8000, color: '#ad8e75', phase: 1.9 },
  { pos: [-5, 0, -10], appearAt: 8000, color: '#c5b294', phase: 3.2 },

  // Tier 3 (8500) — +2 sosok mendekati path luar
  { pos: [10, 0, -3], appearAt: 8500, color: '#b8a8a0', phase: 0.4 },
  { pos: [-3, 0, 10], appearAt: 8500, color: '#d8c0a0', phase: 2.1 },

  // Tier 4 (9000) — +2 sosok di path edge SE/SW
  { pos: [-7, 0, 7], appearAt: 9000, color: '#cdb094', phase: 1.5 },
  { pos: [7, 0, 7], appearAt: 9000, color: '#b09484', phase: 2.8 },

  // Tier 5 (9500) — +1 sosok inner NW
  { pos: [-4, 0, -4], appearAt: 9500, color: '#e0c8a8', phase: 0.9 },

  // Tier 6 (10000) — +3 sosok ramai plaza
  { pos: [2, 0, 2.5], appearAt: 10000, color: '#d4ac8c', phase: 1.1 },
  { pos: [-2, 0, 4], appearAt: 10000, color: '#caa688', phase: 2.4 },
  { pos: [4, 0, 3.5], appearAt: 10000, color: '#bda080', phase: 3.7 },
];

// Single warga — group of body cone + head sphere + hair cap +
// ground shadow. Idle: subtle vertical bob + horizontal sway (weight
// shift) + slow wander (drift radius 0.3-0.5 dalam circle), semua
// phase-offset per-individu via `phase`.
//
// Fade-in: opacity ramp dari 0 → 1 selama count delta 200 dari appearAt.
// Sebelumnya tiba-tiba pop pas threshold crossed; sekarang muncul
// halus seakan "sosok dari kabut" — kerasa ragu-ragu sebelum benar
// sosok tegas. Linear ramp via Math.min(1, (count - appearAt) / 200).
const Warga = ({ pos, color, phase, idx, appearedAt, count }) => {
  const groupRef = useRef();
  // Wander params per-idx — stable across renders, gak random tiap mount.
  const wander = useMemo(
    () => ({
      radius: 0.25 + ((idx * 17) % 25) / 100, // 0.25-0.49 deterministic
      period: 22 + ((idx * 11) % 18), // 22-39s
      offsetAngle: (idx * 1.7) % (Math.PI * 2),
    }),
    [idx],
  );
  // Variant lookup
  const variant = WARGA_VARIANTS[idx % WARGA_VARIANTS.length];
  const skinColor = SKIN_COLORS[idx % SKIN_COLORS.length];
  const hairColor = HAIR_COLORS[idx % HAIR_COLORS.length];

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Wander — slow circular drift around base pos
    const wanderT = (t / wander.period) * Math.PI * 2 + wander.offsetAngle;
    const dx = Math.cos(wanderT) * wander.radius;
    const dz = Math.sin(wanderT) * wander.radius * 0.7; // ellipse, lebih sedikit gerak Z
    groupRef.current.position.x = pos[0] + dx;
    groupRef.current.position.z = pos[2] + dz;
    // Vertical bob (breathing) — kecil banget supaya gak floaty
    groupRef.current.position.y = pos[1] + 0.025 * Math.sin(t * 0.7 + phase);
    // Sway — tubuh nguntak-anging dikit, plus rotate sedikit menghadap
    // arah jalan (atan2 dari delta wander step)
    groupRef.current.rotation.y =
      Math.atan2(-dx, -dz) * 0.3 + 0.08 * Math.sin(t * 0.4 + phase);
  });

  // Fade-in opacity — ramp 0→1 selama count delta 200 dari appearAt.
  // Body+head+hair semua di-clamp; shadow disc lebih cepat full (0.6x
  // delta) supaya ground presence muncul duluan sebelum sosok solid.
  const fadeProgress = Math.min(1, Math.max(0, (count - appearedAt) / 200));
  const shadowOpacity = 0.32 * Math.min(1, fadeProgress * 1.6);

  return (
    <group ref={groupRef} position={pos} scale={variant.scale}>
      {/* Soft shadow blob — fades in dulu sebelum sosok solid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[variant.bodyBottom * 1.2, 16]} />
        <meshBasicMaterial color="#1c1f2a" transparent opacity={shadowOpacity} />
      </mesh>
      {/* Body cone — torso (variant-sized) */}
      <mesh position={[0, variant.bodyY, 0]}>
        <coneGeometry args={[variant.bodyBottom, variant.bodyHeight, 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          transparent
          opacity={fadeProgress}
        />
      </mesh>
      {/* Head sphere */}
      <mesh position={[0, variant.headY, 0]}>
        <sphereGeometry args={[variant.headSize, 12, 10]} />
        <meshStandardMaterial
          color={skinColor}
          roughness={0.9}
          transparent
          opacity={fadeProgress}
        />
      </mesh>
      {/* Hair cap — variant: short cap atau longer (extend ke belakang) */}
      <mesh position={[0, variant.headY + 0.04, variant.hairLong ? -0.025 : -0.02]}>
        <sphereGeometry
          args={[
            variant.headSize + 0.01,
            12,
            10,
            0,
            Math.PI * 2,
            0,
            variant.hairLong ? Math.PI * 0.78 : Math.PI * 0.6,
          ]}
        />
        <meshStandardMaterial
          color={hairColor}
          roughness={0.95}
          transparent
          opacity={fadeProgress}
        />
      </mesh>
    </group>
  );
};

const ReturningResidents = ({ count = 0, loaded = false, isMobile = false }) => {
  if (!loaded || count < 7500) return null;
  const visible = WARGA_DEFS.filter((w) => count >= w.appearAt);
  // Mobile cap: max 8 figures
  const capped = isMobile ? visible.slice(0, 8) : visible;
  return (
    <>
      {capped.map((w, i) => (
        <Warga
          key={`warga-${i}`}
          pos={w.pos}
          color={w.color}
          phase={w.phase}
          idx={i}
          appearedAt={w.appearAt}
          count={count}
        />
      ))}
    </>
  );
};

export default ReturningResidents;
