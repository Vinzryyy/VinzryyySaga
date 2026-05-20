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
// 6 banner string radial dari Pohon top anchor (Y=4.0 di center) ke 6
// hex pole points di Y=2.8 — RADIAL TENT pattern. Pohon = center peak
// of tent, hex poles = outer pegs. Beda dari lantern strings (hexagonal
// perimeter di Y=4.5) — banners punya geometri unik (radial converging
// ke Pohon) sehingga ada variasi visual, gak duplicate location sama.
//
// KOORDINAT hex X/Z HARUS MATCH dgn FESTIVAL_HEX_POINTS di TamanPeta.jsx.
// Pohon anchor di tengah peta, sedikit ABOVE foliage canopy supaya
// banner gak clipping ke leaves.
const BANNER_POHON_ANCHOR = [0, 4.0, 0]; // di atas Pohon canopy (foliage max ~3.2)
const BANNER_HEX_LOWER = [
  [9, 2.8, 0],       // E (pole)
  [4.5, 2.8, 7.8],   // SE (pole)
  [-4.5, 2.8, 7.8],  // SW (pole)
  [-9, 2.8, 0],      // W (pole)
  [-4.5, 2.8, -7.8], // NW (pole)
  [4.5, 2.8, -7.8],  // NE (pole)
];
const BANNER_STRINGS = [
  { from: BANNER_POHON_ANCHOR, to: BANNER_HEX_LOWER[0], colorIdx: 0 }, // Pohon → E
  { from: BANNER_POHON_ANCHOR, to: BANNER_HEX_LOWER[1], colorIdx: 1 }, // Pohon → SE
  { from: BANNER_POHON_ANCHOR, to: BANNER_HEX_LOWER[2], colorIdx: 2 }, // Pohon → SW
  { from: BANNER_POHON_ANCHOR, to: BANNER_HEX_LOWER[3], colorIdx: 0 }, // Pohon → W
  { from: BANNER_POHON_ANCHOR, to: BANNER_HEX_LOWER[4], colorIdx: 1 }, // Pohon → NW
  { from: BANNER_POHON_ANCHOR, to: BANNER_HEX_LOWER[5], colorIdx: 2 }, // Pohon → NE
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
  // BUG FIX: Y harus di-interpolate antara from[1] dan to[1] supaya
  // banner radial (Pohon Y=4 → hex pole Y=2.8) slope DOWN naturally.
  // Sebelumnya Y stuck di from[1] = pennant + rope semua floating di
  // Pohon-height — itu yang user keluhin "plate kayu yang menganggu"
  // (banner rope thin box 9 unit panjang nyala di Y=4 horizontal kayak
  // plate floating). Sekarang interpolate Y + apply sag.
  //
  // 3D length harus pakai semua dimensi (X+Y+Z), bukan cuma horizontal.
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const lenHorizontal = Math.hypot(dx, dz);
  const length3D = Math.hypot(dx, dy, dz);

  // Rope mid-point (3D) + tilt sesuai slope from→to
  const midX = (from[0] + to[0]) / 2;
  const midY = (from[1] + to[1]) / 2 - 0.03; // interpolated mid Y, slight sag
  const midZ = (from[2] + to[2]) / 2;
  const angleYaw = Math.atan2(dz, dx);
  // Pitch — atan2(dy, horizontal). dy<0 → negative pitch → box tilts
  // DOWN. dy=0 (hex perimeter case) → pitch=0, horizontal. dy>0 →
  // positive pitch → box tilts UP. Three.js rotation.z convention:
  // positive value rotates +X toward +Y (up).
  const anglePitch = Math.atan2(dy, lenHorizontal);

  items.push(
    <mesh
      key={`rope-${stringIdx}`}
      position={[midX, midY, midZ]}
      rotation={[0, -angleYaw, anglePitch]}
    >
      <boxGeometry args={[length3D, 0.008, 0.008]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>,
  );

  // Pennants — pendulum dari rope, droops slightly via sag. Interpolate
  // X, Y, Z proper supaya pennants follow rope slope.
  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments;
    const x = from[0] + dx * t;
    const yInterp = from[1] + dy * t;
    const ySag = yInterp - Math.sin(t * Math.PI) * 0.12; // sag stronger
    const z = from[2] + dz * t;
    items.push(
      <Pennant
        key={`pen-${stringIdx}-${i}`}
        pos={[x, ySag - 0.12, z]}
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

// ── Fireworks Bursts ─────────────────────────────────────────────────
// 5 firework di sky tinggi (Y 8-12), staggered delays supaya gak
// barengan. Lifecycle per burst: 0.3s rise → 2.2s burst expand+fade
// → ~11s dormant. Cycle 14s, recycle. Visible festival peak (9000+).
const FIREWORK_DEFS = [
  { pos: [-6, 9, -4], delay: 0, color: '#f44878' },    // pink
  { pos: [6, 10, -2], delay: 3.2, color: '#f4d088' },  // gold
  { pos: [-3, 11, 4], delay: 5.7, color: '#88c8f4' },  // blue
  { pos: [4, 8, 6], delay: 8.4, color: '#f48848' },    // orange
  { pos: [0, 12, -7], delay: 11.1, color: '#f4a8c0' }, // rose
];
const FIREWORK_CYCLE = 14;
const FIREWORK_PARTICLES = 16;

const FireworkBurst = ({ pos, color, delay }) => {
  const groupRef = useRef();
  const particleRefs = useRef([]);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = (state.clock.elapsedTime + delay) % FIREWORK_CYCLE;
    if (t < 0.3) {
      // Rise phase — single particle visible at center, rising up
      const rise = t / 0.3;
      groupRef.current.position.set(pos[0], pos[1] - 2 + rise * 2, pos[2]);
      particleRefs.current.forEach((m, i) => {
        if (!m) return;
        m.position.set(0, 0, 0);
        m.material.opacity = i === 0 ? 0.85 : 0;
      });
    } else if (t < 2.5) {
      // Burst phase — expand particles outward + fade
      const burstT = (t - 0.3) / 2.2;
      const radius = burstT * 1.3;
      const fade = 1 - burstT;
      groupRef.current.position.set(pos[0], pos[1], pos[2]);
      particleRefs.current.forEach((m, i) => {
        if (!m) return;
        const angle = (i / FIREWORK_PARTICLES) * Math.PI * 2;
        const elevAngle = ((i % 4) - 1.5) * 0.5;
        m.position.x = Math.cos(angle) * radius * Math.cos(elevAngle);
        m.position.y = Math.sin(elevAngle) * radius - burstT * 0.5; // gravity droop
        m.position.z = Math.sin(angle) * radius * Math.cos(elevAngle);
        m.material.opacity = fade * 0.9;
      });
    } else {
      // Dormant — invisible
      particleRefs.current.forEach((m) => {
        if (m) m.material.opacity = 0;
      });
    }
  });
  return (
    <group ref={groupRef} position={pos}>
      {Array.from({ length: FIREWORK_PARTICLES }).map((_, i) => (
        <mesh
          key={`fw-${i}`}
          ref={(m) => {
            particleRefs.current[i] = m;
          }}
        >
          <sphereGeometry args={[0.08, 6, 5]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const FireworksBursts = ({ count }) => {
  if (count < FESTIVAL_PEAK) return null;
  return (
    <>
      {FIREWORK_DEFS.map((fw, i) => (
        <FireworkBurst key={`burst-${i}`} {...fw} />
      ))}
    </>
  );
};

// ── Confetti Drift ───────────────────────────────────────────────────
// Ambient confetti pieces tersebar di sky, drift turun pelan dgn sway
// + spin. Recycle per 12-16s cycle (per-idx variation). Festival peak
// (9000+). Plane geometry kecil DoubleSide, 6 warna alternasi.
const CONFETTI_COLORS = ['#f44878', '#f4d088', '#88c8f4', '#f48848', '#a8e8a0', '#f4a8c0'];
const CONFETTI_COUNT_DESKTOP = 30;
const CONFETTI_COUNT_MOBILE = 18;

const ConfettiPiece = ({ idx }) => {
  const meshRef = useRef();
  // Deterministic seeded position — stable across reload
  const sx = (((idx * 1234567) % 1009) / 1009 - 0.5) * 14;
  const sz = (((idx * 7654321) % 1013) / 1013 - 0.5) * 14;
  const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const cycle = 12 + (idx % 5); // 12-16s
    const cycleT = ((t + idx * 0.5) / cycle) % 1;
    const y = 8 - cycleT * 7.5; // 8 → 0.5
    meshRef.current.position.x = sx + 0.6 * Math.sin(t * 0.6 + idx);
    meshRef.current.position.y = y;
    meshRef.current.position.z = sz + 0.5 * Math.cos(t * 0.5 + idx);
    meshRef.current.rotation.z = t * 2 + idx;
    meshRef.current.rotation.x = t * 1.5 + idx * 0.3;
    // Fade peak di tengah cycle
    meshRef.current.material.opacity = Math.sin(cycleT * Math.PI) * 0.85;
  });
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[0.06, 0.1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
};

const ConfettiDrift = ({ count, isMobile }) => {
  if (count < FESTIVAL_PEAK) return null;
  const total = isMobile ? CONFETTI_COUNT_MOBILE : CONFETTI_COUNT_DESKTOP;
  return (
    <>
      {Array.from({ length: total }).map((_, i) => (
        <ConfettiPiece key={`conf-${i}`} idx={i} />
      ))}
    </>
  );
};

// ── Audience Silhouettes ─────────────────────────────────────────────
// 7 dark silhouette figures di front of Panggung [5, 0, 5] facing
// stage center. Body+head dark color, NO detail (kontras vs warga
// utama yg di-rendered colored). Subtle bounce (kepala anggukin
// pelan kayak ngedengerin music). Festival peak (9000+).
const AUDIENCE_DEFS = [
  { pos: [3.2, 0, 7.2] },
  { pos: [4.0, 0, 7.5] },
  { pos: [4.8, 0, 7.4] },
  { pos: [5.6, 0, 7.3] },
  { pos: [3.6, 0, 8.1] },
  { pos: [4.4, 0, 8.3] },
  { pos: [5.2, 0, 8.2] },
];
const AUDIENCE_TARGET = [5, 0.8, 5];

const AudienceFigure = ({ pos, idx }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Bouncing — abs sin supaya gerak naik turun cuma ke atas (gak ke
    // bawah ground)
    groupRef.current.position.y = pos[1] + 0.04 * Math.abs(Math.sin(t * 1.6 + idx * 0.7));
    // Subtle sway
    groupRef.current.rotation.z = 0.05 * Math.sin(t * 1.2 + idx * 0.5);
  });
  // Face toward panggung — static rotation Y
  const dx = AUDIENCE_TARGET[0] - pos[0];
  const dz = AUDIENCE_TARGET[2] - pos[2];
  const faceY = Math.atan2(dx, dz);
  return (
    <group ref={groupRef} position={pos} rotation={[0, faceY, 0]} scale={0.7}>
      {/* Soft shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.24, 16]} />
        <meshBasicMaterial color="#1c1f2a" transparent opacity={0.36} />
      </mesh>
      {/* Body — dark cone */}
      <mesh position={[0, 0.32, 0]}>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshStandardMaterial
          color="#1a1820"
          roughness={0.95}
          emissive="#2a2530"
          emissiveIntensity={0.08}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial
          color="#2a2530"
          roughness={0.95}
          emissive="#3a3540"
          emissiveIntensity={0.05}
        />
      </mesh>
    </group>
  );
};

const AudienceSilhouettes = ({ count }) => {
  if (count < FESTIVAL_PEAK) return null;
  return (
    <>
      {AUDIENCE_DEFS.map((a, i) => (
        <AudienceFigure key={`aud-${i}`} {...a} idx={i} />
      ))}
    </>
  );
};

// ── Main Export ──────────────────────────────────────────────────────
const FestivalDecorations = ({ count = 0, loaded = false, isMobile = false }) => {
  if (!loaded) return null;
  return (
    <>
      <HangingBanners count={count} />
      <GerbangWreath count={count} />
      <PlazaDanceRings count={count} />
      <FireworksBursts count={count} />
      <ConfettiDrift count={count} isMobile={isMobile} />
      <AudienceSilhouettes count={count} />
    </>
  );
};

export default FestivalDecorations;
