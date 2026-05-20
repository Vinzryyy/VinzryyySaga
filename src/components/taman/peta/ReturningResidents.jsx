/**
 * ReturningResidents — warga ArmeniacaTown mulai balik post-purified.
 *
 * Bayar janji narasi Arme: pas purified (7000) dia bilang "yang lain
 * butuh waktu balik". Mulai dari 7500, sosok-sosok jauh muncul satu
 * per satu di pinggir kota. Density scales sama armeniacaCount:
 *   7500 = 3 sosok jauh di edge map
 *   8000 = 6 sosok, mid-distance
 *   8500 = 8 sosok
 *   9000 = 10 sosok mulai ke jalan
 *   9500 = 11 sosok
 *   10000 = 14 sosok ramai di plaza
 *
 * Visual: simple R3F cone+sphere (body+head), low-poly silhouette
 * dengan palette earth-tone muted (warga "weathered" dari perjalanan).
 * Gentle bob+sway animation per-individu (phase offset by index).
 *
 * Position safety: semua titik >=1.8 unit jauh dari landmark mayor
 * (Pohon, Telaga, Arsip/Perpustakaan, Menara, Panggung, Air Mancur,
 * Aula, Gerbang) supaya gak ngeganggu hover/click target.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Threshold tier defs. appearAt = count minimum supaya warga visible.
// color = jaket/baju body (earth-tone weathered palette).
const WARGA_DEFS = [
  // Tier 1 (7500) — 3 sosok jauh di edge map, masing-masing penjuru
  { pos: [-10, 0, 7], appearAt: 7500, color: '#c9a290', phase: 0.0 },
  { pos: [10, 0, 7], appearAt: 7500, color: '#d4b596', phase: 1.3 },
  { pos: [0, 0, -11], appearAt: 7500, color: '#a8a884', phase: 2.6 },

  // Tier 2 (8000) — +3 sosok, mid-distance, masih outer ring
  { pos: [-9, 0, 4], appearAt: 8000, color: '#bea58a', phase: 0.7 },
  { pos: [9, 0, 4], appearAt: 8000, color: '#ad8e75', phase: 1.9 },
  { pos: [-5, 0, -10], appearAt: 8000, color: '#c5b294', phase: 3.2 },

  // Tier 3 (8500) — +2 sosok, mendekati path luar
  { pos: [10, 0, -3], appearAt: 8500, color: '#b8a8a0', phase: 0.4 },
  { pos: [-3, 0, 10], appearAt: 8500, color: '#d8c0a0', phase: 2.1 },

  // Tier 4 (9000) — +2 sosok di path edge SE/SW (warga mulai ke jalan)
  { pos: [-7, 0, 7], appearAt: 9000, color: '#cdb094', phase: 1.5 },
  { pos: [7, 0, 7], appearAt: 9000, color: '#b09484', phase: 2.8 },

  // Tier 5 (9500) — +1 sosok inner NW
  { pos: [-4, 0, -4], appearAt: 9500, color: '#e0c8a8', phase: 0.9 },

  // Tier 6 (10000) — +3 sosok ramai di plaza (closest ke air mancur)
  { pos: [2, 0, 2.5], appearAt: 10000, color: '#d4ac8c', phase: 1.1 },
  { pos: [-2, 0, 4], appearAt: 10000, color: '#caa688', phase: 2.4 },
  { pos: [4, 0, 3.5], appearAt: 10000, color: '#bda080', phase: 3.7 },
];

// Skin-tone palette untuk kepala (random per-warga based on idx,
// stable across renders).
const HEAD_COLORS = ['#e8c8a8', '#d8b89a', '#c8a888', '#e0c0a0'];

// Single warga sprite — group of cone body + sphere head + subtle
// shadow blob. Idle bob & sway via useFrame, phase-offset per-warga.
const Warga = ({ pos, color, phase, idx }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle vertical bob (breathing) + horizontal sway (weight shift)
    groupRef.current.position.y = pos[1] + 0.025 * Math.sin(t * 0.7 + phase);
    groupRef.current.rotation.y = 0.12 * Math.sin(t * 0.35 + phase * 1.4);
  });

  const headColor = HEAD_COLORS[idx % HEAD_COLORS.length];

  return (
    <group ref={groupRef} position={pos} scale={0.75}>
      {/* Soft shadow blob di base — disc dark transparent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshBasicMaterial color="#1c1f2a" transparent opacity={0.32} />
      </mesh>
      {/* Body cone — torso */}
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.2, 0.65, 8]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Head sphere */}
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={headColor} roughness={0.9} />
      </mesh>
      {/* Hair cap — slightly darker sphere on top half */}
      <mesh position={[0, 0.82, -0.02]}>
        <sphereGeometry args={[0.13, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.95} />
      </mesh>
    </group>
  );
};

const ReturningResidents = ({ count = 0, loaded = false, isMobile = false }) => {
  if (!loaded || count < 7500) return null;
  // Mobile cap: max 8 figures buat hemat draw call di low-end devices.
  // Cut from highest-appearAt end (yang baru muncul) supaya tier visual
  // tetep terasa progresif walau di-clamp.
  const visible = WARGA_DEFS.filter((w) => count >= w.appearAt);
  const capped = isMobile ? visible.slice(0, 8) : visible;
  return (
    <>
      {capped.map((w, i) => (
        <Warga key={`warga-${i}`} pos={w.pos} color={w.color} phase={w.phase} idx={i} />
      ))}
    </>
  );
};

export default ReturningResidents;
