/**
 * JapaneseFestivalDecor — Japanese matsuri-themed festival elements
 * untuk lengkapin festival vibes ArmeniacaTown (Tier 1+2).
 *
 * Tier 1 (festivalPrep, count >= 8000):
 *   - Yatai (2 food stalls dekat gerbang path)
 *   - KohakuMaku (red-white striped curtains di gerbang sides)
 *   - Tanzaku (paper wishes tied to bamboo cluster near Pohon)
 *
 * Tier 2 (festivalPeak, count >= 9000):
 *   - TaikoDrum (large drum di panggung center)
 *   - Festival masks (kitsune + oni hanging di yatai roofs)
 *   - SkyLanterns (4 origami lanterns naik perlahan ke langit)
 *
 * Tone: rural matsuri kecil (kota kecil yang akhirnya rame lagi),
 * BUKAN Akihabara neon. Warm soft lighting, slightly weathered. Pasangan
 * narrative: warga balik → stall reopen → festival kick off.
 *
 * Position safety: semua titik >=1.8 unit dari landmark mayor (Pohon
 * [0,0,0], Gerbang [0,0,8.5], Telaga [-7,0,-1], Arsip [7,0,-1], Menara
 * [0,0,-8], Panggung [5,0,5], Aula [5,0,-5], Air Mancur [-3,0,3.5]).
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FESTIVAL_PREP = 8000;
const FESTIVAL_PEAK = 9000;

// ── Yatai (Food Stall) ───────────────────────────────────────────────
// 2 wooden food stalls dekat gerbang path. Counter + roof + lantern +
// noren curtain. Hasil mask di roof (opsional, festivalPeak only).
const YATAI_DEFS = [
  { pos: [-2.2, 0, 6.4], rot: 0.4, lanternColor: '#f4a868', stallText: 'やきとり' },
  { pos: [2.2, 0, 6.4], rot: -0.4, lanternColor: '#e88848', stallText: 'だんご' },
];

const Yatai = ({ pos, rot, lanternColor, showMask, maskType, idx }) => {
  const lanternRef = useRef();
  // Smoke wisp refs — 3 wisps per yatai, naik dari counter top dengan
  // fade + sway. Cycle 3-4s per wisp, staggered phase.
  const smokeRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lanternRef.current) {
      lanternRef.current.rotation.z = 0.05 * Math.sin(t * 0.8 + idx);
      lanternRef.current.material.emissiveIntensity = 0.55 + Math.sin(t * 1.2 + idx) * 0.1;
    }
    // Smoke wisps — naik dari counter top, fade out di atas
    smokeRefs.current.forEach((m, sIdx) => {
      if (!m) return;
      const cycleLen = 3.5 + sIdx * 0.4;
      const cycle = ((t + idx * 1.2 + sIdx * 1.1) / cycleLen) % 1;
      // Y rises 0.85 → 2.0 per cycle (above counter top Y=0.72)
      m.position.y = 0.85 + cycle * 1.15;
      // Sway X+Z slight (smoke drifts)
      m.position.x = 0.15 * Math.sin(t * 0.6 + sIdx);
      m.position.z = 0.15 * Math.cos(t * 0.5 + sIdx) - 0.05;
      // Scale grow + fade
      const scale = 0.4 + cycle * 0.8;
      m.scale.setScalar(scale);
      m.material.opacity = (1 - cycle) * 0.32;
    });
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Counter base — wooden box, dark stained */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.55]} />
        <meshStandardMaterial color="#6a4828" roughness={0.95} />
      </mesh>
      {/* Counter top — slightly lighter wood */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.25, 0.04, 0.6]} />
        <meshStandardMaterial color="#8a6840" roughness={0.9} />
      </mesh>
      {/* 2 back vertical posts */}
      <mesh position={[-0.55, 0.95, -0.25]}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      <mesh position={[0.55, 0.95, -0.25]}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      {/* Sloped red roof — slightly tilted forward */}
      <mesh position={[0, 1.4, 0]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.4, 0.06, 0.8]} />
        <meshStandardMaterial color="#a83828" roughness={0.85} />
      </mesh>
      {/* Roof underside — paler red */}
      <mesh position={[0, 1.36, 0]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.35, 0.02, 0.75]} />
        <meshStandardMaterial color="#c84838" roughness={0.85} />
      </mesh>
      {/* Hanging chochin lantern di front */}
      <mesh position={[0, 0.98, 0.3]} ref={lanternRef}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial
          color={lanternColor}
          emissive={lanternColor}
          emissiveIntensity={0.55}
          roughness={0.7}
          toneMapped={false}
        />
      </mesh>
      {/* Lantern top cap */}
      <mesh position={[0, 1.13, 0.3]}>
        <cylinderGeometry args={[0.04, 0.05, 0.04, 6]} />
        <meshStandardMaterial color="#2a1810" roughness={0.95} />
      </mesh>
      {/* Lantern hanging cord */}
      <mesh position={[0, 1.22, 0.3]}>
        <cylinderGeometry args={[0.005, 0.005, 0.15, 4]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.95} />
      </mesh>
      {/* Noren curtain (short fabric divider above counter back) */}
      <mesh position={[0, 1.08, -0.24]}>
        <planeGeometry args={[1.15, 0.22]} />
        <meshStandardMaterial
          color="#3a4a78"
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>
      {/* Food items on counter — 3 small boxes */}
      {[-0.3, 0, 0.3].map((x, i) => (
        <mesh key={`food-${i}`} position={[x, 0.78, 0.1]}>
          <boxGeometry args={[0.16, 0.08, 0.18]} />
          <meshStandardMaterial
            color={i === 0 ? '#d8a878' : i === 1 ? '#a86838' : '#e8c898'}
            roughness={0.85}
          />
        </mesh>
      ))}
      {/* Hanging mask di roof side (Tier 2 only) */}
      {showMask && <YataiMask type={maskType} />}
      {/* Smoke wisps — 3 small spheres rising dari counter top, fade
          out. "Cooking aroma" feel. */}
      {[0, 1, 2].map((sIdx) => (
        <mesh
          key={`smoke-${sIdx}`}
          ref={(m) => {
            smokeRefs.current[sIdx] = m;
          }}
          position={[0, 0.85, -0.05]}
        >
          <sphereGeometry args={[0.07, 6, 5]} />
          <meshBasicMaterial
            color="#c8c0b8"
            transparent
            opacity={0.32}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// Festival mask hanging dari yatai roof side
const YataiMask = ({ type }) => {
  // type: 'kitsune' (white + red) atau 'oni' (red + gold horns)
  const isKitsune = type === 'kitsune';
  return (
    <group position={[0.65, 1.25, 0]} rotation={[0, 0, -0.3]}>
      {/* Hanging cord */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.15, 4]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.95} />
      </mesh>
      {/* Mask face — flattened sphere */}
      <mesh scale={[1, 1.3, 0.4]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial
          color={isKitsune ? '#f4e0c8' : '#c83828'}
          roughness={0.88}
          emissive={isKitsune ? '#f4d0a8' : '#a82818'}
          emissiveIntensity={0.08}
        />
      </mesh>
      {/* Kitsune: red ear/eye accent. Oni: gold horns */}
      {isKitsune ? (
        <>
          <mesh position={[0, 0.05, 0.04]} scale={[0.3, 0.5, 0.3]}>
            <sphereGeometry args={[0.08, 6, 5]} />
            <meshStandardMaterial color="#c83828" roughness={0.8} />
          </mesh>
        </>
      ) : (
        <>
          {/* 2 gold horns */}
          <mesh position={[-0.05, 0.12, 0]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.025, 0.08, 5]} />
            <meshStandardMaterial color="#e8c878" roughness={0.7} />
          </mesh>
          <mesh position={[0.05, 0.12, 0]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.025, 0.08, 5]} />
            <meshStandardMaterial color="#e8c878" roughness={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
};

const Yatais = ({ count }) => {
  if (count < FESTIVAL_PREP) return null;
  const showMask = count >= FESTIVAL_PEAK; // mask reveal di Tier 2
  return (
    <>
      {YATAI_DEFS.map((y, i) => (
        <Yatai
          key={`yatai-${i}`}
          {...y}
          idx={i}
          showMask={showMask}
          maskType={i === 0 ? 'kitsune' : 'oni'}
        />
      ))}
    </>
  );
};

// ── Kohaku-maku (Red-White Curtain) ──────────────────────────────────
// Vertical striped fabric panels — iconic JP festival visual. Hanging
// di sisi gerbang entrance. 5 vertical stripes per panel alternating
// red & white. Subtle flutter via opacity wave.
const KOHAKU_PANELS = [
  { pos: [-1.8, 1.5, 8.3], rot: -0.3 },
  { pos: [1.8, 1.5, 8.3], rot: 0.3 },
];

const KohakuPanel = ({ pos, rot, idx }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = 0.04 * Math.sin(t * 0.6 + idx);
  });
  const stripeColors = ['#c83828', '#fef4e8', '#c83828', '#fef4e8', '#c83828'];
  return (
    <group ref={groupRef} position={pos} rotation={[0, rot, 0]}>
      {/* Top rod (wooden support) — horizontal across panel width.
          rotation harus di MESH (not on geometry; three.js silently
          ignore rotation prop di geometry → rod jadi vertical floating
          bug. Fixed: pindah rotation ke <mesh>. */}
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 1.1, 6]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* 5 vertical stripes side-by-side */}
      {stripeColors.map((color, i) => {
        const x = (i - 2) * 0.2;
        return (
          <mesh key={`stripe-${i}`} position={[x, 0, 0]}>
            <planeGeometry args={[0.2, 1.2]} />
            <meshStandardMaterial
              color={color}
              side={THREE.DoubleSide}
              roughness={0.88}
              emissive={color}
              emissiveIntensity={color === '#fef4e8' ? 0.05 : 0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const KohakuMaku = ({ count }) => {
  if (count < FESTIVAL_PREP) return null;
  return (
    <>
      {KOHAKU_PANELS.map((p, i) => (
        <KohakuPanel key={`koh-${i}`} {...p} idx={i} />
      ))}
    </>
  );
};

// ── Tanzaku (Paper Wishes) ───────────────────────────────────────────
// Small colored paper strips tied ke bamboo branches dekat Pohon area.
// Like tanabata festival. 12 strips distributed di volume sekitar
// canopy area Pohon, 5 warna alternasi.
const TANZAKU_COLORS = ['#f4a8c0', '#f4d088', '#88c8e8', '#a8e8a0', '#f8f0d4'];
const TANZAKU_COUNT = 12;

const TanzakuStrip = ({ idx }) => {
  const meshRef = useRef();
  // Deterministic position around Pohon canopy area (radius 1.0-1.8,
  // Y 1.6-2.4, away dari trunk center [0,0,0])
  const s1 = ((idx * 1234567) % 997) / 997;
  const s2 = ((idx * 7654321) % 991) / 991;
  const s3 = ((idx * 3145927) % 1009) / 1009;
  const angle = (idx / TANZAKU_COUNT) * Math.PI * 2 + s1 * 0.3;
  const radius = 1.1 + s2 * 0.7;
  const y = 1.6 + s3 * 0.8;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const color = TANZAKU_COLORS[idx % TANZAKU_COLORS.length];
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle sway (kayak kena angin)
    meshRef.current.rotation.z = 0.12 * Math.sin(t * 1.0 + idx * 0.7);
    meshRef.current.rotation.x = 0.08 * Math.sin(t * 0.8 + idx * 0.5);
  });
  return (
    <group position={[x, y, z]}>
      {/* Cord (thin string attaching ke imaginary branch) */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.12, 4]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      {/* Paper strip — thin rectangle dangling */}
      <mesh ref={meshRef} position={[0, -0.05, 0]}>
        <planeGeometry args={[0.06, 0.16]} />
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          roughness={0.85}
          emissive={color}
          emissiveIntensity={0.08}
        />
      </mesh>
    </group>
  );
};

const Tanzaku = ({ count }) => {
  if (count < FESTIVAL_PREP) return null;
  return (
    <>
      {Array.from({ length: TANZAKU_COUNT }).map((_, i) => (
        <TanzakuStrip key={`tz-${i}`} idx={i} />
      ))}
    </>
  );
};

// ── Taiko Drum ───────────────────────────────────────────────────────
// Large drum static prop di Panggung [5, 0, 5] area. Cylindrical body
// horizontal + 2 wooden supports + 2 drumsticks. Festival peak only.
const TaikoDrum = ({ count }) => {
  if (count < FESTIVAL_PEAK) return null;
  return (
    <group position={[5, 0.5, 5]} rotation={[0, 0.2, 0]}>
      {/* Drum body — cylinder horizontal (axis along Z) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.55, 16]} />
        <meshStandardMaterial color="#8a3828" roughness={0.92} />
      </mesh>
      {/* Drum head cap (front face) — circle, slightly lighter */}
      <mesh position={[0, 0, 0.276]}>
        <circleGeometry args={[0.34, 16]} />
        <meshStandardMaterial color="#f4d8a8" roughness={0.85} />
      </mesh>
      {/* Drum head cap (back face) */}
      <mesh position={[0, 0, -0.276]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.34, 16]} />
        <meshStandardMaterial color="#f4d8a8" roughness={0.85} />
      </mesh>
      {/* 2 wooden X-supports */}
      <mesh position={[0, -0.3, 0.18]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.06, 0.55, 0.04]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.3, 0.18]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.06, 0.55, 0.04]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.3, -0.18]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.06, 0.55, 0.04]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.3, -0.18]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.06, 0.55, 0.04]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      {/* 2 drumsticks leaning on drum side */}
      <mesh position={[0.35, 0.15, 0.3]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.015, 0.018, 0.4, 5]} />
        <meshStandardMaterial color="#d4a878" roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 0.15, 0.15]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.015, 0.018, 0.4, 5]} />
        <meshStandardMaterial color="#d4a878" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ── Sky Lanterns (Rising) ────────────────────────────────────────────
// 4 origami-style square lanterns naik perlahan dari Y=1 → Y=8, recycle
// per cycle 15-20s. Festival peak only. Beda dari FloatingPaperLanterns
// existing (horizontal float di air). Sky lanterns = naik VERTIKAL.
const SKY_LANTERN_COUNT = 4;

const SkyLantern = ({ idx }) => {
  const groupRef = useRef();
  const matRef = useRef();
  // Deterministic base position (sebar di plaza area)
  const sx = (((idx * 2654435761) % 997) / 997 - 0.5) * 8;
  const sz = (((idx * 1597463) % 991) / 991 - 0.5) * 8;
  const cycleLen = 15 + (idx % 3) * 2; // 15-19s
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const cycleT = ((t + idx * 3) / cycleLen) % 1;
    // Rise Y=1 → Y=8 linear
    const y = 1 + cycleT * 7;
    // Sway
    groupRef.current.position.x = sx + 0.3 * Math.sin(t * 0.5 + idx);
    groupRef.current.position.z = sz + 0.3 * Math.cos(t * 0.4 + idx);
    groupRef.current.position.y = y;
    // Spin slow Y
    groupRef.current.rotation.y = t * 0.15 + idx;
    // Fade in/out — visible mid-cycle
    const fade = Math.sin(cycleT * Math.PI);
    if (matRef.current) {
      matRef.current.opacity = fade * 0.85;
      matRef.current.emissiveIntensity = 0.4 + fade * 0.3;
    }
  });
  return (
    <group ref={groupRef}>
      {/* Box body lantern */}
      <mesh>
        <boxGeometry args={[0.16, 0.18, 0.16]} />
        <meshStandardMaterial
          ref={matRef}
          color="#f4d8a0"
          emissive="#f4a868"
          emissiveIntensity={0.5}
          transparent
          opacity={0.85}
          roughness={0.7}
          toneMapped={false}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.08]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Bottom cap */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.1, 0.02, 0.1]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
    </group>
  );
};

const SkyLanterns = ({ count }) => {
  if (count < FESTIVAL_PEAK) return null;
  return (
    <>
      {Array.from({ length: SKY_LANTERN_COUNT }).map((_, i) => (
        <SkyLantern key={`sky-${i}`} idx={i} />
      ))}
    </>
  );
};

// ── Main Export ──────────────────────────────────────────────────────
const JapaneseFestivalDecor = ({ count = 0, loaded = false }) => {
  if (!loaded) return null;
  return (
    <>
      <Yatais count={count} />
      <KohakuMaku count={count} />
      <Tanzaku count={count} />
      <TaikoDrum count={count} />
      <SkyLanterns count={count} />
    </>
  );
};

export default JapaneseFestivalDecor;
