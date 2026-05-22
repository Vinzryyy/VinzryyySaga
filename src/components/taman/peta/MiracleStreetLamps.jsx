/**
 * MiracleStreetLamps — 3 lampu jalan klasik nyala bertahap di phase
 * miracle moments (post-purified). Sinkron sama dialog Arme
 * `lampu-pertama` (count 8500): "Lampu pertama itu mulai menyala
 * malem ini. Aku? Oh tidak, bukan aku yang menyalakan lampu itu.
 * Mungkin ada yang menggunakan lampu tersebut."
 *
 * Narrative: pas kota mendekati legacy phase, warga lain mulai
 * balik silent (di-implementasikan via ReturningResidents 7500+).
 * Lampu yang nyala = bukti someone-other-than-Arme udah ada di kota.
 *
 * Threshold:
 *   - 8500 → lampu A (gerbang area)
 *   - 8700 → lampu B (plaza area)
 *   - 8900 → lampu C (NE quadrant, jalur Menara Jam)
 *
 * Style: pole kayu/iron tipis (#3a3028) + globe frosted putih hangat
 * dgn emissive warm (#f8d090). PointLight halus per lampu supaya
 * glow ke ground subtle (gak overpowering map lighting). Fade-in
 * 250 count window per lampu (ease-out).
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';

const LAMP_POSITIONS = [
  // [x, z, threshold] — Y ground level di 0. Positioned di luar
  // perimeter petak (>=3 unit dari center) tapi inside scene bounds
  // (camera frustum ~12 unit radius). Triangulated spread (gerbang
  // S, plaza E, jalur NE) supaya glow ke-distribute, gak cluster.
  { pos: [3.2, 0, 8.5], threshold: 8500 }, // gerbang area (S-SE)
  { pos: [-7.5, 0, 1.8], threshold: 8700 }, // plaza W
  { pos: [6.0, 0, -6.5], threshold: 8900 }, // NE jalur Menara
];

const Lamp = ({ position, opacity }) => {
  // Globe + pole. Globe emissive warm + faint PointLight (range
  // pendek supaya tidak wash out scene)
  const globeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fff2d8',
        emissive: '#f8d090',
        emissiveIntensity: 0.9 * opacity,
        transparent: true,
        opacity: 0.85 + opacity * 0.15,
        roughness: 0.4,
      }),
    [opacity],
  );

  return (
    <group position={position}>
      {/* Base — small disc */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.08, 10]} />
        <meshStandardMaterial color="#2a2018" roughness={0.95} />
      </mesh>
      {/* Pole — tall thin */}
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 1.62, 8]} />
        <meshStandardMaterial color="#3a3028" roughness={0.9} metalness={0.2} />
      </mesh>
      {/* Cross-arm hook (cosmetic) */}
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[0.18, 0.04, 0.04]} />
        <meshStandardMaterial color="#3a3028" roughness={0.9} metalness={0.2} />
      </mesh>
      {/* Globe — frosted glass */}
      <mesh position={[0.08, 1.55, 0]} material={globeMat}>
        <sphereGeometry args={[0.13, 14, 12]} />
      </mesh>
      {/* Soft halo billboard — additive blending, fade dgn opacity */}
      <mesh position={[0.08, 1.55, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshBasicMaterial
          color="#f8d090"
          transparent
          opacity={0.18 * opacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Subtle warm point light — short range supaya cuma highlight
          ground sekitar lamp, gak wash out scene global lighting */}
      <pointLight
        position={[0.08, 1.55, 0]}
        intensity={0.6 * opacity}
        distance={3.5}
        decay={2}
        color="#f8d090"
      />
    </group>
  );
};

const MiracleStreetLamps = ({ count = 0 }) => {
  // Cull dini kalau belum cross threshold pertama
  if (count < LAMP_POSITIONS[0].threshold) return null;

  return (
    <group>
      {LAMP_POSITIONS.map((l, i) => {
        const delta = count - l.threshold;
        if (delta < 0) return null;
        // Fade-in window: 250 count → opacity 0→1, ease-out
        const t = Math.min(1, delta / 250);
        const opacity = 1 - Math.pow(1 - t, 2);
        return <Lamp key={`lamp-${i}`} position={l.pos} opacity={opacity} />;
      })}
    </group>
  );
};

export default MiracleStreetLamps;
