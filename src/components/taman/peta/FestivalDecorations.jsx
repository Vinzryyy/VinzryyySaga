/**
 * FestivalDecorations — bundle dekorasi festival ArmeniacaTown.
 *
 * Lengkapin "festival vibes" yang sebelumnya cuma FestivalLanterns
 * (string lampion) + FestivalPetals (petals jatuh). Komponen ini
 * tambahin:
 *
 *   - HangingBanners (>=8000) — 6 string pennant flag fabric segitiga
 *     fluttering di sekitar map, 3 warna alternasi (red/orange/cream)
 *   - GerbangWreath (>=8000) — wreath bunga circular di gerbang entrance,
 *     symbol welcome buat warga balik
 *   - PlazaDanceRings (>=9000) — 2 concentric glowing rings di plaza
 *     (sekitar air mancur), suggest dance circle area
 *   - PanggungSpotlights (>=9000) — 3 colored spotlights di sekitar
 *     panggung, beam aim ke center stage area
 *
 * Threshold sinkron dgn existing festival tiers (festivalPrep 8000,
 * festivalPeak 9000). Posisi semua >=1.8 unit dari landmark mayor.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FESTIVAL_PREP = 8000;
const FESTIVAL_PEAK = 9000;

// ── Hanging Banners ──────────────────────────────────────────────────
const BANNER_STRINGS = [
  // 6 string banner di sekeliling outer map, area aman
  { from: [-9, 3.0, -2], to: [-5.5, 3.0, -2], colorIdx: 0 }, // W
  { from: [5.5, 3.0, -2], to: [9, 3.0, -2], colorIdx: 1 },   // E
  { from: [-9, 2.8, 6], to: [-5, 2.8, 6], colorIdx: 2 },     // SW
  { from: [5, 2.8, 6], to: [9, 2.8, 6], colorIdx: 0 },       // SE
  { from: [-4, 3.2, -9], to: [4, 3.2, -9], colorIdx: 1 },    // N (across menara)
  { from: [-4, 3.0, 9.5], to: [4, 3.0, 9.5], colorIdx: 2 },  // S (across gerbang)
];

const BANNER_COLORS = ['#c84838', '#e88848', '#f8d068'];

const Pennant = ({ pos, color, phase }) => {
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Flutter — rotate sedikit di Y & Z axis (fabric bergerak angin)
    meshRef.current.rotation.z = 0.18 * Math.sin(t * 1.4 + phase);
    meshRef.current.rotation.y = 0.12 * Math.sin(t * 0.9 + phase * 1.3);
  });
  return (
    <mesh ref={meshRef} position={pos}>
      <planeGeometry args={[0.08, 0.14]} />
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.85}
        emissive={color}
        emissiveIntensity={0.12}
      />
    </mesh>
  );
};

const BannerString = ({ from, to, colorIdx, stringIdx }) => {
  const segments = 7;
  const items = [];
  // Connecting rope (boxGeometry thin tipis di sepanjang from→to)
  const midX = (from[0] + to[0]) / 2;
  const midY = from[1] - 0.03;
  const midZ = (from[2] + to[2]) / 2;
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const angle = Math.atan2(to[2] - from[2], to[0] - from[0]);
  items.push(
    <mesh
      key={`rope-${stringIdx}`}
      position={[midX, midY, midZ]}
      rotation={[0, -angle, 0]}
    >
      <boxGeometry args={[length, 0.008, 0.008]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>,
  );
  // Pennants — pendulum dari rope, droops slightly via sag
  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments;
    const x = from[0] + (to[0] - from[0]) * t;
    const ySag = from[1] - Math.sin(t * Math.PI) * 0.08;
    const z = from[2] + (to[2] - from[2]) * t;
    items.push(
      <Pennant
        key={`pen-${stringIdx}-${i}`}
        pos={[x, ySag - 0.1, z]}
        color={BANNER_COLORS[(colorIdx + i) % 3]}
        phase={stringIdx * 7 + i}
      />,
    );
  }
  return <>{items}</>;
};

const HangingBanners = ({ count }) => {
  if (count < FESTIVAL_PREP) return null;
  return (
    <>
      {BANNER_STRINGS.map((s, i) => (
        <BannerString key={`bstr-${i}`} {...s} stringIdx={i} />
      ))}
    </>
  );
};

// ── Gerbang Wreath ───────────────────────────────────────────────────
// Circular floral wreath di Gerbang [0, 0, 8] entrance, vertikal facing
// south (welcome arch decoration). 12 small flower spheres + 12 leaf
// spheres rotate-able subtle.
const GerbangWreath = ({ count }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle rotation — slow oscillation
    groupRef.current.rotation.z = 0.04 * Math.sin(t * 0.4);
  });
  if (count < FESTIVAL_PREP) return null;
  const ringRadius = 0.55;
  const flowerCount = 12;
  return (
    <group ref={groupRef} position={[0, 2.4, 8.4]} rotation={[0, 0, 0]}>
      {/* Ring base — thin torus-like (cylinder ring) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius, 0.04, 6, 24]} />
        <meshStandardMaterial color="#3a5a2a" roughness={0.95} />
      </mesh>
      {/* 12 flower spheres around ring */}
      {Array.from({ length: flowerCount }).map((_, i) => {
        const angle = (i / flowerCount) * Math.PI * 2;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius;
        const colorIdx = i % 3;
        const color =
          colorIdx === 0 ? '#f4a8c0' : colorIdx === 1 ? '#f4d088' : '#f8c8a0';
        return (
          <mesh key={`fl-${i}`} position={[x, y, 0]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.25}
              roughness={0.7}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      {/* Leaf accents — interleaved between flowers, smaller green */}
      {Array.from({ length: flowerCount }).map((_, i) => {
        const angle = ((i + 0.5) / flowerCount) * Math.PI * 2;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius;
        return (
          <mesh
            key={`lf-${i}`}
            position={[x, y, 0.02]}
            rotation={[0, 0, angle]}
          >
            <sphereGeometry args={[0.05, 6, 5]} />
            <meshStandardMaterial color="#5a8a3a" roughness={0.85} />
          </mesh>
        );
      })}
      {/* Ribbon tails 2 strands hanging dari bottom */}
      {[-0.1, 0.1].map((dx, i) => (
        <mesh
          key={`rib-${i}`}
          position={[dx, -ringRadius - 0.15, 0]}
          rotation={[0, 0, dx > 0 ? -0.1 : 0.1]}
        >
          <planeGeometry args={[0.06, 0.3]} />
          <meshStandardMaterial
            color={i === 0 ? '#c84838' : '#f4d088'}
            side={THREE.DoubleSide}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

// ── Plaza Dance Rings ────────────────────────────────────────────────
// 2 concentric glowing rings di plaza sekitar Air Mancur [-3, 0, 3.5],
// kasih kerasa dance circle area. Pulse + subtle rotation. Visible
// festival peak (9000+).
const PlazaDanceRings = ({ count }) => {
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.55 + Math.sin(t * 0.6) * 0.15;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.04;
      ring1Ref.current.material.opacity = pulse;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.03;
      ring2Ref.current.material.opacity = pulse * 0.7;
    }
  });
  if (count < FESTIVAL_PEAK) return null;
  // Plaza center antara Air Mancur [-3, 0, 3.5] & Aula [5, 0, -5]
  // — pilih spot di [1, 0, 2] (open plaza area, safe dari landmark)
  return (
    <group position={[1, 0.02, 2]}>
      {/* Outer ring — wider, slower spin */}
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.55, 48]} />
        <meshBasicMaterial
          color="#f4d088"
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Inner ring — counter-rotate */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.85, 1.05, 40]} />
        <meshBasicMaterial
          color="#f8b878"
          transparent
          opacity={0.4}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Subtle pattern dots di ring — 8 small dots di outer ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 1.42;
        const z = Math.sin(angle) * 1.42;
        return (
          <mesh key={`dot-${i}`} position={[x, 0.015, z]}>
            <sphereGeometry args={[0.04, 6, 5]} />
            <meshBasicMaterial color="#fff0c8" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// ── Panggung Spotlights ──────────────────────────────────────────────
// 3 colored spotlight beam aim ke panggung [5, 0, 5] area dari 3
// elevated points di sekitarnya. Beam = thin cone, additive emissive.
// Visible festival peak (9000+).
const SPOTLIGHT_DEFS = [
  // origin, target (selalu panggung), color
  { origin: [3, 3.5, 7.5], color: '#f48898' },   // pink, SW
  { origin: [7, 3.5, 7], color: '#88d4f4' },     // blue, SE
  { origin: [5, 3.8, 2.5], color: '#f8d088' },   // gold, N
];
const PanggungSpotlight = ({ origin, color, idx }) => {
  const meshRef = useRef();
  const target = [5, 0.5, 5]; // panggung center area
  // Compute orientation — cone default points +Y. Need to rotate so
  // tip (top) points from origin toward target = downward-angled.
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const dz = target[2] - origin[2];
  const len = Math.hypot(dx, dy, dz);
  // Mid position between origin and target
  const midX = (origin[0] + target[0]) / 2;
  const midY = (origin[1] + target[1]) / 2;
  const midZ = (origin[2] + target[2]) / 2;
  // Euler angles — cone Y-axis pointing toward target direction
  // Rotation around X axis: angle from Y to direction's vertical comp
  // Use lookAt-style approach via Euler from direction vector
  const dirYaw = Math.atan2(dx, dz);
  const dirPitch = Math.atan2(Math.hypot(dx, dz), -dy);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle pulse — opacity flicker (festival energy)
    const pulse = 0.5 + Math.sin(t * 1.2 + idx * 0.7) * 0.2;
    meshRef.current.material.opacity = pulse;
  });
  return (
    <mesh
      ref={meshRef}
      position={[midX, midY, midZ]}
      rotation={[dirPitch, dirYaw, 0]}
    >
      <coneGeometry args={[0.4, len, 12, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const PanggungSpotlights = ({ count }) => {
  if (count < FESTIVAL_PEAK) return null;
  return (
    <>
      {SPOTLIGHT_DEFS.map((s, i) => (
        <PanggungSpotlight key={`spot-${i}`} {...s} idx={i} />
      ))}
    </>
  );
};

// ── Main Export ──────────────────────────────────────────────────────
const FestivalDecorations = ({ count = 0, loaded = false }) => {
  if (!loaded) return null;
  return (
    <>
      <HangingBanners count={count} />
      <GerbangWreath count={count} />
      <PlazaDanceRings count={count} />
      <PanggungSpotlights count={count} />
    </>
  );
};

export default FestivalDecorations;
