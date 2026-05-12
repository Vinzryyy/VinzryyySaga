/**
 * Taman Kebaikan — Petak R3: Telaga Harapan (DROUGHT VARIANT).
 *
 * Versi gersang dari Telaga Harapan, dirender saat 4000 ≤ count < 6000
 * (lihat App.jsx TamanR3RouteChooser). Setelah hit 6000, world ini
 * di-replace dengan TamanKolamKata.jsx (canonical restored). Pattern
 * sama dgn r1 TamanLorongPohonGersang.
 *
 * Perbedaan dari canonical:
 *   - Danau air → dasar telaga kering retak (DriedLakeBed inline)
 *   - Lily pad + teratai → di-skip (data wish tetap ada, akan muncul
 *     lagi di canonical 6000+)
 *   - Makhluk hidup (ducks, fish, pigeons, butterflies, dragonflies,
 *     fireflies, birds) → skip
 *   - Vegetasi alive (sunflowers, mushrooms, flower beds, wildflowers,
 *     cattails) → skip
 *   - Atmosphere: fog warm dusty + lighting dimmer + sky tone shift
 *
 * Artefak yg tetep ada: bench, picnic table, bike rack, bridge, dock,
 * sign post, walking path, banks (sisa peradaban di taman yang
 * ditinggalkan).
 *
 * Konsep dasar (sama dengan canonical): Wish panel 3D — taman kota di
 * tepi danau. Tiap teratai mekar di danau = 1 wish dari fans (sumber:
 * SITE_CONFIG.wishes.seeds + live Firebase via subscribeToWishes).
 *
 * Layout terinspirasi town park: danau tenang + bench kayu di tepi
 * untuk pengunjung duduk sambil melihat teratai, walking path
 * gravel sepanjang shore, dermaga kayu kecil yang menjulur ke air,
 * dan pohon-pohon di perimeter.
 *
 * Visual (daytime — referensi: foto town park user):
 *   - Sky: soft blue cerah (#bdd6ea) dengan light fog jauh
 *   - Danau lebar (14 wide × 28 long) bright water blue dengan
 *     reflection langit
 *   - Banks rumput hijau cerah keliling 4 sisi
 *   - Wooden bench di shore -x menghadap air (visitor seating)
 *   - Gravel walking path sepanjang shore -x parallel air
 *   - Wooden dock kecil menjulur dari shore +x ke air
 *   - Batu-batu di tepi danau (boundary stones)
 *   - Rumput tufts scatter di banks
 *   - 12 pohon di perimeter (BankTrees) — bright green foliage
 *   - 4 lentera di sepanjang shore — decoratif (no glow at daytime)
 *   - Dust motes putih drift halus = particle highlight di sun beam
 *   - 1-11 lily pad dengan teratai mekar pink/peach/cream/lavender
 *   - Pads gentle drift downstream + bobs idle
 *   - Bright sun directional dari atas warmer angle + ambient cerah
 *
 * Wish pertama (paling baru / featured) jadi teratai besar di tengah
 * danau; sisanya scatter di sekelilingnya dengan radius variasi.
 *
 * Click pad → modal full wish (nama Fraunces italic + handle +
 * message + tanggal). Layout modal sengaja lebih intim — text lebih
 * besar, ada quote-mark dekoratif, padding lega.
 */

import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Html,
  MeshReflectorMaterial,
  OrbitControls,
  Sky,
  Stats,
} from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
import RotateRecommendation from '../components/ui/RotateRecommendation';
import {
  RIVER_WIDTH,
  RIVER_LENGTH,
  BRIDGE_Z,
  BRIDGE_SPAN,
  FLOW_SPEED,
  FLOW_END_Z,
  FLOW_START_Z,
  LEAF_COLORS,
  BLOOM_COLORS,
  WILDFLOWER_COLORS,
} from '../components/taman/r3/constants';
import {
  useIsMobile,
  lerp,
  shortLabel,
  formatDate,
} from '../components/taman/r3/utils';
import { SITE_CONFIG } from '../config/siteConfig';
import { subscribeToWishes } from '../lib/wishesDb';

// Bunga teratai mekar — 6 outer petals (cone tilted outward) + 3 inner
// petals (cone tilted upright) + center stamen (sphere with strong
// emissive). Stylized & low-poly tapi recognizable. Posisi/rotasi
// petals di-precompute sekali untuk hindari useMemo per render.
const OUTER_PETALS = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2;
  return { angle };
});
const INNER_PETALS = Array.from({ length: 3 }, (_, i) => {
  const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
  return { angle };
});

const TerataiBloom = ({ color = '#f4c8d8', scale = 1 }) => (
  <group scale={scale}>
    {OUTER_PETALS.map((p, i) => (
      <mesh
        key={`outer-${i}`}
        position={[Math.cos(p.angle) * 0.085, 0.04, Math.sin(p.angle) * 0.085]}
        rotation={[Math.PI / 2.4, 0, -p.angle]}
      >
        <coneGeometry args={[0.085, 0.2, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.18}
          roughness={0.55}
        />
      </mesh>
    ))}
    {INNER_PETALS.map((p, i) => (
      <mesh
        key={`inner-${i}`}
        position={[Math.cos(p.angle) * 0.045, 0.13, Math.sin(p.angle) * 0.045]}
        rotation={[Math.PI / 3.2, 0, -p.angle]}
      >
        <coneGeometry args={[0.055, 0.16, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.55}
        />
      </mesh>
    ))}
    <mesh position={[0, 0.18, 0]}>
      <sphereGeometry args={[0.06, 10, 8]} />
      <meshStandardMaterial
        color="#f4e8a0"
        emissive="#f4e8a0"
        emissiveIntensity={0.6}
        roughness={0.4}
      />
    </mesh>
  </group>
);

// Lily pad + teratai bloom + label wish. Hover: lift Y + emissive
// glow di leaf disc + label brighter + ripple ring expanding di
// bawah pad. Plus subtle drift downstream — pad pelan-pelan bergerak
// ke +z, wrap saat lewat batas. Skala drift di-kecilin karena
// danau lebih lebar (lebih ada area untuk bergerak).
// FLOW_SPEED, FLOW_END_Z, FLOW_START_Z sekarang di constants.js.

const LilyWishPad = ({ pad, hovered, hideLabel, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const matRef = useRef();
  const rippleRef = useRef();
  const rippleMatRef = useRef();
  // Track drift z separately dari posisi awal pad — pad punya base
  // origin di pad.pos, drift di-akumulasi di useFrame.
  const driftZRef = useRef(0);
  const hoverElapsedRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current || !matRef.current) return;
    // Drift downstream — pelan-pelan ke +z. Reset kalau lewat batas.
    driftZRef.current += FLOW_SPEED * delta;
    let zPos = pad.pos[2] + driftZRef.current;
    if (zPos > FLOW_END_Z) {
      // Wrap ke awal sungai
      driftZRef.current -= FLOW_END_Z - FLOW_START_Z;
      zPos = pad.pos[2] + driftZRef.current;
    }

    const idleY = Math.sin(state.clock.elapsedTime * 0.55 + pad.phase) * 0.05;
    const targetY = (hovered ? 0.2 : 0) + idleY;
    const targetEmissive = hovered ? 0.4 : 0.06;
    const factor = Math.min(delta * 7, 1);
    groupRef.current.position.y = lerp(
      groupRef.current.position.y,
      targetY,
      factor
    );
    groupRef.current.position.x = pad.pos[0];
    groupRef.current.position.z = zPos;
    matRef.current.emissiveIntensity = lerp(
      matRef.current.emissiveIntensity,
      targetEmissive,
      factor
    );

    // Ripple animation — saat hovered, ring di bawah pad melebar &
    // fade. Reset elapsed saat unhovered. Cycle 1.8 detik.
    if (hovered) {
      hoverElapsedRef.current += delta;
    } else {
      hoverElapsedRef.current = 0;
    }
    if (rippleRef.current && rippleMatRef.current) {
      const t = (hoverElapsedRef.current % 1.8) / 1.8;
      const scale = 0.6 + t * 1.8; // 0.6 → 2.4
      rippleRef.current.scale.set(scale, scale, scale);
      rippleMatRef.current.opacity = hovered ? (1 - t) * 0.5 : 0;
    }
  });

  const padRadius = pad.isCenter ? 0.95 : 0.62;
  const bloomScale = pad.isCenter ? 1.5 : 1.0;

  return (
    <group
      ref={groupRef}
      position={pad.pos}
      rotation={[0, pad.tilt, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(pad.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(pad.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pad);
      }}
    >
      {/* Ripple ring di bawah pad — torus tipis di permukaan air,
          melebar & fade saat pad hovered. Render before pad supaya
          ring kelihatan keluar dari bawah pad, bukan nutup pad. */}
      <mesh
        ref={rippleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
      >
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshBasicMaterial
          ref={rippleMatRef}
          color="#cfe0f0"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* Daun teratai (lily pad disc) — hex cylinder rendah dengan
          warna hijau gelap (malam). Side surface catch light. */}
      <mesh>
        <cylinderGeometry args={[padRadius, padRadius * 1.05, 0.06, 24]} />
        <meshStandardMaterial
          ref={matRef}
          color={pad.leafColor}
          emissive={pad.leafColor}
          emissiveIntensity={0.06}
          roughness={0.7}
        />
      </mesh>
      {/* Bunga teratai mekar di atas daun */}
      <group position={[0, 0.04, 0]}>
        <TerataiBloom color={pad.bloomColor} scale={bloomScale} />
      </group>
      {!hideLabel && (
        <Html
          position={[0, pad.isCenter ? 0.65 : 0.5, 0]}
          center
          distanceFactor={11}
          occlude={false}
        >
          <div
            className={`text-center pointer-events-none select-none transition-all duration-300 ease-out ${
              hovered ? '-translate-y-1' : ''
            }`}
            style={{ minWidth: pad.isCenter ? '180px' : '140px' }}
          >
            {pad.isCenter && (
              <div className="text-pink-200/80 text-[8px] uppercase tracking-[0.25em] mb-1">
                Wish utama
              </div>
            )}
            <div
              className={`leading-snug transition-colors ${
                pad.isCenter ? 'text-[11px] font-medium' : 'text-[10px]'
              } ${hovered ? 'text-white' : 'text-white/75'}`}
            >
              — {pad.name}
            </div>
            <div
              className={`text-[9px] mt-0.5 transition-colors leading-snug ${
                hovered ? 'text-white/80' : 'text-white/55'
              }`}
            >
              {shortLabel(pad.message, pad.isCenter ? 6 : 4)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Kelopak bunga jatuh — falling petal particles untuk daytime
// atmosphere. Soft pink/cream warna, drift turun pelan dengan sway
// horizontal tipis. Reset ke atas saat sampai air. Pakai
// BufferGeometry 1 draw call.
const FallingPetals = ({ count = 60 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, [count]);

  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      // Slower fall — golden hour tempo lebih kontemplatif
      arr[i * 2] = -0.07 - Math.random() * 0.05;
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.03;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 2 + 1] * delta * 60;
      arr[i * 3 + 1] += velocities[i * 2] * delta;
      if (arr[i * 3 + 1] < 0.3) {
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 1] = 12 + Math.random() * 4;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.14}
        color="#f4c4b8"
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Ground mist — partikel asap rendah di ring perimeter (radius 16-30
// dari center). Bikin sense "world fades into mist" untuk area di luar
// playable scope. Posisi awal random di ring, motion gentle drift.
// Color cream-warm match ambient palette. Pakai BufferGeometry +
// Points untuk efisiensi (1 draw call utk 100 partikel besar).
const GroundMist = ({ count = 100 }) => {
  const ref = useRef();
  // Base positions — partikel oscillate di sekitar nilai ini, BUKAN
  // accumulate += per frame (yang dulu bisa bikin Y drift unbounded
  // dan akhirnya tembus ke bawah ground / atau terbang ke atas).
  const basePositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 16 + Math.random() * 16;
      arr[i * 3] = Math.cos(angle) * radius;
      // Raised: y=1.1..3.1 supaya sprite size 1.6 (bottom y - 0.8)
      // tetap di atas ground (lowest bottom = 0.3).
      arr[i * 3 + 1] = 1.1 + Math.random() * 2.0;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }, [count]);

  // Phase per partikel untuk drift natural (nggak grid-like)
  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = Math.random() * Math.PI * 2;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      // Absolute oscillation di sekitar base position — bounded, nggak
      // accumulate. Y amplitude 0.15 supaya tetap di atas ground.
      arr[i * 3] = basePositions[i * 3] + Math.sin(t * 0.15 + phase) * 0.4;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.cos(t * 0.18 + phase * 1.3) * 0.15;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(t * 0.13 + phase) * 0.4;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={basePositions.slice()}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.6}
        color="#dcd5c8"
        transparent
        opacity={0.42}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Distant tree line — pohon-pohon di radius jauh (20-32 dari center)
// dengan scale lebih kecil + color desaturated untuk simulate
// atmospheric perspective. Bikin layer background depth — ada
// "forest" beyond playable area. Posisi deterministik via index.
const DISTANT_TREES = [
  // Ring jauh — keliling perimeter
  { pos: [-22, 0, -8], scale: 0.7, hue: 0 },
  { pos: [-25, 0, 4], scale: 0.6, hue: 1 },
  { pos: [-20, 0, 14], scale: 0.65, hue: 0 },
  { pos: [-15, 0, 22], scale: 0.55, hue: 1 },
  { pos: [-3, 0, 25], scale: 0.6, hue: 0 },
  { pos: [10, 0, 23], scale: 0.65, hue: 1 },
  { pos: [22, 0, 18], scale: 0.7, hue: 0 },
  { pos: [26, 0, 5], scale: 0.6, hue: 1 },
  { pos: [24, 0, -8], scale: 0.65, hue: 0 },
  { pos: [20, 0, -20], scale: 0.7, hue: 1 },
  { pos: [8, 0, -25], scale: 0.6, hue: 0 },
  { pos: [-5, 0, -27], scale: 0.65, hue: 1 },
  { pos: [-15, 0, -23], scale: 0.7, hue: 0 },
  { pos: [-26, 0, -16], scale: 0.55, hue: 1 },
];

const DistantTreeLine = () => (
  <>
    {DISTANT_TREES.map((t, i) => (
      <group key={`distant-tree-${i}`} position={t.pos} scale={t.scale}>
        {/* Trunk — slightly faded */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.08, 0.13, 1.6, 6]} />
          <meshStandardMaterial color="#8a7060" roughness={1} />
        </mesh>
        {/* Foliage desaturated — atmospheric haze */}
        <mesh position={[0, 1.85, 0]}>
          <sphereGeometry args={[0.55, 10, 8]} />
          <meshStandardMaterial
            color={t.hue === 0 ? '#88a482' : '#7a9078'}
            roughness={0.9}
          />
        </mesh>
        <mesh position={[0.18, 2.05, 0.05]}>
          <sphereGeometry args={[0.4, 10, 8]} />
          <meshStandardMaterial
            color={t.hue === 0 ? '#92ae8c' : '#7e9580'}
            roughness={0.9}
          />
        </mesh>
      </group>
    ))}
  </>
);

// Bukit jauh — 360° ring of ridges, 2 layer (far + mid) untuk kasih
// "bumi bulat" feel. User pan camera ke arah mana pun selalu lihat
// horizon land. Box ridges placed evenly around angular sectors,
// rotated face origin, height varied untuk silhouette natural.
const HILL_FAR_DEFS = (() => {
  const arr = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
    const r = 28 + Math.random() * 4;
    arr.push({
      angle,
      r,
      width: 12 + Math.random() * 14,
      height: 2.5 + Math.random() * 1.8,
    });
  }
  return arr;
})();
const HILL_MID_DEFS = (() => {
  const arr = [];
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / count;
    const r = 21 + Math.random() * 3;
    arr.push({
      angle,
      r,
      width: 9 + Math.random() * 9,
      height: 1.8 + Math.random() * 1.2,
    });
  }
  return arr;
})();
const DistantHills = () => (
  <>
    {/* Far layer — paling biru-pucat, atmospheric haze */}
    {HILL_FAR_DEFS.map((h, i) => {
      const x = Math.cos(h.angle) * h.r;
      const z = Math.sin(h.angle) * h.r;
      // Rotate box face origin (negate angle, add π/2 untuk align width
      // tangent ke radius)
      const rotY = -h.angle + Math.PI / 2;
      return (
        <mesh
          key={`hill-far-${i}`}
          position={[x, h.height / 2 - 0.5, z]}
          rotation={[0, rotY, 0]}
        >
          <boxGeometry args={[h.width, h.height, 1]} />
          <meshStandardMaterial color="#9aaab5" roughness={1} fog={false} />
        </mesh>
      );
    })}
    {/* Mid layer — sedikit lebih hijau, lebih dekat user */}
    {HILL_MID_DEFS.map((h, i) => {
      const x = Math.cos(h.angle) * h.r;
      const z = Math.sin(h.angle) * h.r;
      const rotY = -h.angle + Math.PI / 2;
      return (
        <mesh
          key={`hill-mid-${i}`}
          position={[x, h.height / 2 - 0.3, z]}
          rotation={[0, rotY, 0]}
        >
          <boxGeometry args={[h.width, h.height, 1]} />
          <meshStandardMaterial color="#7d9583" roughness={1} fog={false} />
        </mesh>
      );
    })}
  </>
);

// Cattails (rumput air / typha) — tanaman ikonik tepi danau.
// Redesign: kombinasi blade leaves (daun pita panjang flat) di base
// + 1-2 main stem dengan cattail head proportional di atas. Lebih
// realistis dari versi lama yang cuma 5 silinder seragam.
//
// Blade leaves: planeGeometry vertical pakai side={2} doublesided,
// di-rotate ke arah berbeda biar fanning out kayak rumput beneran.
// Heights variasi acak per blade.
//
// Stems: lebih tipis (radius 0.012 vs 0.018 dulu), head lebih kecil
// (radius 0.04 vs 0.06, height 0.22 vs 0.28). Proporsi-nya match
// real cattail flora di lake.
//
// Posisi blades + stems + heights ALL randomized per mount —
// useMemo([]) jalan sekali per cluster mount, jadi tiap refresh
// scene punya cattail layout yang unik tapi tetap natural.
const CattailCluster = ({ pos }) => {
  const blades = useMemo(() => {
    const count = 5 + Math.floor(Math.random() * 3); // 5-7 blades
    const arr = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = 0.08 + Math.random() * 0.12;
      const height = 0.9 + Math.random() * 0.5;
      arr.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        height,
        rotation: angle + Math.random() * 0.5,
        // Slight outward lean for natural fanning
        tiltX: (Math.random() - 0.5) * 0.25,
        tiltZ: (Math.random() - 0.5) * 0.25,
      });
    }
    return arr;
  }, []);

  const stems = useMemo(() => {
    const count = 1 + Math.floor(Math.random() * 2); // 1-2 stems
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 0.18,
      z: (Math.random() - 0.5) * 0.18,
      height: 1.3 + Math.random() * 0.4, // 1.3-1.7
    }));
  }, []);

  // Wind sway — pivot di base cluster, gentle bend dua arah dengan phase
  // unik per cluster supaya nggak gerak serempak. Amplitude kecil (~3°)
  // supaya kerasa breeze halus, bukan badai.
  const groupRef = useRef();
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.x = Math.sin(t * 0.7 + phase) * 0.05;
    groupRef.current.rotation.z = Math.cos(t * 0.6 + phase * 1.3) * 0.04;
  });

  return (
    <group ref={groupRef} position={pos}>
      {/* Blade leaves — flat plane vertical, fanning out */}
      {blades.map((b, i) => (
        <mesh
          key={`blade-${i}`}
          position={[b.x, b.height / 2, b.z]}
          rotation={[b.tiltX, b.rotation, b.tiltZ]}
        >
          <planeGeometry args={[0.05, b.height]} />
          <meshStandardMaterial
            color="#5a8045"
            side={2}
            roughness={0.95}
          />
        </mesh>
      ))}
      {/* Stems with cattail head — lebih proportional */}
      {stems.map((s, i) => (
        <group key={`stem-${i}`} position={[s.x, 0, s.z]}>
          {/* Stem tipis */}
          <mesh position={[0, s.height / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.015, s.height, 6]} />
            <meshStandardMaterial color="#6a8050" roughness={1} />
          </mesh>
          {/* Cattail head — sausage-shape proportional */}
          <mesh position={[0, s.height + 0.11, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.22, 10]} />
            <meshStandardMaterial color="#5a3a1f" roughness={0.95} />
          </mesh>
          {/* Tip kecil di atas head */}
          <mesh position={[0, s.height + 0.27, 0]}>
            <cylinderGeometry args={[0.005, 0.01, 0.1, 4]} />
            <meshStandardMaterial color="#6a8050" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Cattails (typha) — water plants di shallow edge pond. Semua di
// pond shore (x=±6.5..±7 = water edge, atau z=±17.5 = top/bottom
// edge) supaya kerasa emerging from water natural.
const CATTAIL_POSITIONS = [
  // Tepi kiri (x=-7, sepanjang z)
  [-6.8, 0, -14],
  [-6.8, 0, -3],
  [-6.8, 0, 11],
  // Tepi kanan
  [6.8, 0, -10],
  [6.8, 0, -1],
  [6.8, 0, 13],
  // Tepi atas (z=-17.5)
  [-3, 0, -17.5],
  [4, 0, -17.5],
  // Tepi bawah (z=17.5)
  [-4, 0, 17.5],
  [3, 0, 17.5],
];

const Cattails = () => (
  <>
    {CATTAIL_POSITIONS.map((pos, i) => (
      <CattailCluster key={`cattail-${i}`} pos={pos} />
    ))}
  </>
);

// Wildflowers — bunga liar kecil scatter di grass area. Sphere kecil
// dengan warna variasi (yellow daisy, white, pink, blue, purple) +
// sedikit emissive untuk pop. Pakai Points untuk efisiensi visual,
// tapi karena warna variasi per bunga harus pakai vertex colors —
// untuk simplicity pakai mesh kecil (~50 mesh, manageable).
// WILDFLOWER_COLORS sekarang di constants.js.

// Wildflowers di-randomize per mount — useMemo([]) regenerate setiap
// kali user load /armeniacaTown/r3, jadi taman kerasa berubah-ubah tiap visit.
// Posisi acak di band sekitar tepi danau (avoid playable zones), color
// dipilih random dari palette, size variasi dikit.
const Wildflowers = () => {
  const flowers = useMemo(() => {
    const items = [];
    // Bank kiri — band x=-15 to -8.5, skip path area
    for (let i = 0; i < 28; i++) {
      const x = -8.5 - Math.random() * 6.5;
      const z = -16 + Math.random() * 32;
      const colorIdx = Math.floor(Math.random() * WILDFLOWER_COLORS.length);
      const size = 0.06 + Math.random() * 0.025;
      items.push({ pos: [x, size, z], colorIdx, size });
    }
    // Bank kanan — band x=8.5 to 15, skip dock area (z=2..6)
    for (let i = 0; i < 28; i++) {
      let z = -16 + Math.random() * 32;
      // Avoid dock z range with retry
      if (z > 2 && z < 6) z = z > 4 ? 6.2 : 1.8;
      const x = 8.5 + Math.random() * 6.5;
      const colorIdx = Math.floor(Math.random() * WILDFLOWER_COLORS.length);
      const size = 0.06 + Math.random() * 0.025;
      items.push({ pos: [x, size, z], colorIdx, size });
    }
    // Bank atas (-z) — z<-18 (outside pond yang sekarang ke z=-18)
    for (let i = 0; i < 16; i++) {
      const x = -10 + Math.random() * 20;
      const z = -18.5 - Math.random() * 4;
      const colorIdx = Math.floor(Math.random() * WILDFLOWER_COLORS.length);
      const size = 0.06 + Math.random() * 0.025;
      items.push({ pos: [x, size, z], colorIdx, size });
    }
    // Bank bawah (+z) — z>18
    for (let i = 0; i < 16; i++) {
      const x = -10 + Math.random() * 20;
      const z = 18.5 + Math.random() * 4;
      const colorIdx = Math.floor(Math.random() * WILDFLOWER_COLORS.length);
      const size = 0.06 + Math.random() * 0.025;
      items.push({ pos: [x, size, z], colorIdx, size });
    }
    return items;
  }, []);

  return (
    <>
      {flowers.map((f, i) => (
        <mesh key={`flower-${i}`} position={f.pos}>
          <sphereGeometry args={[f.size, 8, 6]} />
          <meshStandardMaterial
            color={WILDFLOWER_COLORS[f.colorIdx]}
            emissive={WILDFLOWER_COLORS[f.colorIdx]}
            emissiveIntensity={0.15}
            roughness={0.6}
          />
        </mesh>
      ))}
    </>
  );
};

// Kunang-kunang — bola kecil dengan emissive kuning-oranye yang flicker
// sin-based. Drift orbital di sekitar home position. Bloom pickup bikin
// glow halo. Late afternoon = baru sedikit muncul; jangan terlalu rame
// supaya tetap kerasa "first hint" bukan night swarm.
const Firefly = ({ def }) => {
  const ref = useRef();
  const matRef = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.x = def.home[0] + Math.sin(t * 0.4 + def.phase) * 0.7;
    ref.current.position.y = def.home[1] + Math.cos(t * 0.5 + def.phase) * 0.25;
    ref.current.position.z =
      def.home[2] + Math.cos(t * 0.35 + def.phase * 1.3) * 0.7;
    if (matRef.current) {
      // Pulse halus 0.3..1.5 — bloom pickup udah bikin glow, jadi
      // emissive ceiling moderate aja biar nggak overflow ke putih.
      const pulse = 0.5 + 0.5 * Math.sin(t * def.flicker + def.phase * 2);
      matRef.current.emissiveIntensity = 0.3 + pulse * 1.2;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.04, 6, 6]} />
      <meshStandardMaterial
        ref={matRef}
        color="#fff4a8"
        emissive="#ffc858"
        emissiveIntensity={1.0}
        roughness={1}
      />
    </mesh>
  );
};

// Spread di tepi rumput aja (kunang-kunang nggak terbang di tengah air),
// radius ring 8..14 dari center. Posisi deterministik per page load.
const FIREFLY_DEFS = Array.from({ length: 14 }, () => {
  const angle = Math.random() * Math.PI * 2;
  const r = 8 + Math.random() * 6;
  return {
    home: [
      Math.cos(angle) * r,
      0.4 + Math.random() * 1.4,
      Math.sin(angle) * r,
    ],
    phase: Math.random() * Math.PI * 2,
    flicker: 2.5 + Math.random() * 2.5,
  };
});

const Fireflies = ({ count }) => {
  const defs = count ? FIREFLY_DEFS.slice(0, count) : FIREFLY_DEFS;
  return (
    <>
      {defs.map((def, i) => (
        <Firefly key={`firefly-${i}`} def={def} />
      ))}
    </>
  );
};

// Wooden bridge — jembatan kayu kecil melintasi salah satu ujung
// danau (di z = -12.5, dekat ujung utara). Span x dari -7 ke 7 (lebar
// danau + sedikit overlap ke banks). Floor plank + 2 railing kiri/
// kanan + railing posts (4 di tiap side).
// BRIDGE_Z, BRIDGE_SPAN sekarang di constants.js.

const Bridge = () => {
  const posts = [];
  // 5 posts kiri-kanan masing-masing
  for (let i = 0; i < 5; i++) {
    const x = -BRIDGE_SPAN / 2 + 0.5 + (BRIDGE_SPAN - 1) * (i / 4);
    posts.push({ x, side: -1 }); // kiri railing
    posts.push({ x, side: 1 }); // kanan railing
  }
  return (
    <group position={[0, 0, BRIDGE_Z]}>
      {/* Floor (plank) */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[BRIDGE_SPAN, 0.1, 1.6]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.9} />
      </mesh>
      {/* Plank lines on top — dekoratif horizontal */}
      <mesh position={[0, 0.21, -0.5]}>
        <boxGeometry args={[BRIDGE_SPAN - 0.2, 0.005, 0.05]} />
        <meshStandardMaterial color="#3a2616" roughness={1} />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[BRIDGE_SPAN - 0.2, 0.005, 0.05]} />
        <meshStandardMaterial color="#3a2616" roughness={1} />
      </mesh>
      <mesh position={[0, 0.21, 0.5]}>
        <boxGeometry args={[BRIDGE_SPAN - 0.2, 0.005, 0.05]} />
        <meshStandardMaterial color="#3a2616" roughness={1} />
      </mesh>
      {/* Railing kiri & kanan — 2 horizontal rail */}
      <mesh position={[0, 0.7, -0.75]}>
        <boxGeometry args={[BRIDGE_SPAN, 0.06, 0.06]} />
        <meshStandardMaterial color="#4a3826" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 0.75]}>
        <boxGeometry args={[BRIDGE_SPAN, 0.06, 0.06]} />
        <meshStandardMaterial color="#4a3826" roughness={0.9} />
      </mesh>
      {/* Vertical posts */}
      {posts.map((p, i) => (
        <mesh
          key={`post-${i}`}
          position={[p.x, 0.45, p.side * 0.75]}
        >
          <boxGeometry args={[0.08, 0.6, 0.08]} />
          <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// Bebek berenang di danau — body sphere + leher panjang + kepala kecil
// + paruh oranye. Animasi: bob halus + slight rotasi Y untuk look-around
// + drift di permukaan air. Tiap bebek punya "patrol path" sendiri
// (lingkaran kecil di sekitar posisi awal).
const Duck = ({ def }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Drift dalam lingkaran kecil — radius 1.2 dari home position
    const angle = t * def.speed + def.phase;
    groupRef.current.position.x = def.home[0] + Math.cos(angle) * 1.2;
    groupRef.current.position.z = def.home[2] + Math.sin(angle) * 1.2;
    // Bob naik-turun — air gentle motion
    groupRef.current.position.y = 0.05 + Math.sin(t * 1.4 + def.phase) * 0.03;
    // Rotation Y — bebek ngadap ke arah swim direction. Body axis lokal
    // di +x (kepala di +x), velocity tangent circle di (-sin(angle),
    // cos(angle)). Solve: rotation.y = -angle - π/2 supaya kepala
    // align dengan velocity (sebelumnya +π/2 = mundur 180°).
    groupRef.current.rotation.y = -angle - Math.PI / 2;
  });
  return (
    <group ref={groupRef}>
      {/* Body — sphere putih/cream sedikit elongated */}
      <mesh scale={[1.1, 0.7, 0.85]}>
        <sphereGeometry args={[0.22, 14, 10]} />
        <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
      </mesh>
      {/* Tail kecil */}
      <mesh position={[-0.22, 0.05, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.08, 0.15, 6]} />
        <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
      </mesh>
      {/* Leher — silinder pendek miring */}
      <mesh position={[0.18, 0.18, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.07, 0.08, 0.22, 8]} />
        <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
      </mesh>
      {/* Kepala — sphere kecil di atas leher */}
      <mesh position={[0.27, 0.3, 0]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
      </mesh>
      {/* Paruh — cone oranye kecil */}
      <mesh position={[0.36, 0.28, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshStandardMaterial color="#e89858" roughness={0.7} />
      </mesh>
      {/* Mata — sphere hitam tipis */}
      <mesh position={[0.32, 0.33, 0.07]}>
        <sphereGeometry args={[0.018, 6, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
};

const DUCK_DEFS = [
  { home: [-3.5, 0, -7], speed: 0.18, phase: 0 },
  { home: [3.5, 0, -3], speed: 0.15, phase: 1.2 },
  { home: [-2, 0, 5], speed: 0.2, phase: 2.5 },
  { home: [4, 0, 8], speed: 0.16, phase: 0.8 },
];

const Ducks = () => (
  <>
    {DUCK_DEFS.map((def, i) => (
      <Duck key={`duck-${i}`} def={def} />
    ))}
  </>
);

// Ikan melompat — event-driven. Tiap fish punya cycle (jeda lama antar
// jump) supaya event lompatan kerasa surprise, bukan continuous noise.
// Selama jump, body ikut arc parabolic dan tilt nose-up→nose-down.
// Ripple ring di posisi entry/exit kasih splash visual.
const JumpingFish = ({ def }) => {
  const groupRef = useRef();
  const splashRef = useRef();
  const fadeRef = useRef({ active: false, t0: 0, mode: 'enter' });

  useFrame((state) => {
    if (!groupRef.current || !splashRef.current) return;
    const t = state.clock.elapsedTime;
    const localT = (t + def.offset) % def.cycle;
    const jumpT = def.jumpDuration;

    if (localT < jumpT) {
      // Arc — peak height = 1.2 di tengah
      const u = localT / jumpT; // 0..1
      const y = 4 * 1.2 * u * (1 - u);
      groupRef.current.visible = true;
      groupRef.current.position.set(def.pos[0], y, def.pos[2]);
      // Tilt sepanjang arc — head naik di awal, head turun di akhir
      groupRef.current.rotation.z = (0.5 - u) * Math.PI * 0.85;
      groupRef.current.rotation.y = def.facing + u * 0.4;
      // Trigger entry splash sekali per cycle
      if (!fadeRef.current.active && u < 0.05) {
        fadeRef.current = { active: true, t0: t, mode: 'enter' };
      }
      // Schedule exit splash di akhir arc
      if (fadeRef.current.mode === 'enter' && u > 0.94) {
        fadeRef.current = { active: true, t0: t, mode: 'exit' };
      }
    } else {
      groupRef.current.visible = false;
    }

    // Splash ring fade (0.6s lifecycle)
    const fade = fadeRef.current;
    if (fade.active) {
      const dt = t - fade.t0;
      if (dt < 0.6) {
        splashRef.current.visible = true;
        const s = 0.25 + dt * 1.6;
        splashRef.current.scale.set(s, 1, s);
        splashRef.current.material.opacity = 0.55 * (1 - dt / 0.6);
      } else {
        splashRef.current.visible = false;
        if (fade.mode === 'exit') {
          // Reset untuk cycle berikutnya
          fadeRef.current = { active: false, t0: 0, mode: 'enter' };
        } else {
          // Tunggu exit splash
          fadeRef.current = { ...fade, active: false };
        }
      }
    }
  });

  return (
    <>
      <group ref={groupRef} visible={false}>
        {/* Body — ellipsoid silver, long axis = +x (kepala) */}
        <mesh scale={[0.3, 0.13, 0.11]} castShadow>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            color="#b6c4d2"
            roughness={0.35}
            metalness={0.55}
          />
        </mesh>
        {/* Sirip dorsal kecil di atas */}
        <mesh position={[0, 0.11, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.04, 0.07, 4]} />
          <meshStandardMaterial
            color="#92a2b4"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        {/* Tail fin — cone horizontal nunjuk ke -x, base lebih lebar */}
        <mesh position={[-0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.09, 0.14, 8]} />
          <meshStandardMaterial
            color="#8a98a8"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        {/* Mata kecil di kedua sisi kepala */}
        <mesh position={[0.22, 0.03, 0.07]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.22, 0.03, -0.07]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
      {/* Splash ring di permukaan air — y sedikit lebih tinggi supaya
          nggak z-fight dgn reflector water */}
      <mesh
        ref={splashRef}
        position={[def.pos[0], 0.08, def.pos[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.25, 1, 0.25]}
        visible={false}
      >
        <ringGeometry args={[0.22, 0.32, 28]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          side={2}
          depthWrite={false}
        />
      </mesh>
    </>
  );
};

const FISH_DEFS = [
  // Fish #1 dipindah dari (-2.5, -6) — terlalu dekat duck #1 swim circle
  // (home -3.5,-7 radius 1.2; closest approach cuma 0.21u → splash ring
  // engulf duck). Sekarang di area kosong z=-10.
  { pos: [-2, 0, -10], cycle: 12, offset: 0, jumpDuration: 0.85, facing: 0.3 },
  { pos: [3.2, 0, 1.5], cycle: 15, offset: 5.5, jumpDuration: 0.9, facing: -0.4 },
  { pos: [-0.5, 0, 9], cycle: 17, offset: 10, jumpDuration: 0.95, facing: 1.1 },
];

const JumpingFishes = ({ count }) => (
  <>
    {FISH_DEFS.slice(0, count ?? FISH_DEFS.length).map((def, i) => (
      <JumpingFish key={`fish-${i}`} def={def} />
    ))}
  </>
);

// Burung merpati lagi makan — pigeon flock di sekitar picnic table
// (tempat manusia jatuhin remah). Body ellipsoid abu-abu + sayap gelap
// + paruh + kaki orange. Animasi: head pecking — group head berputar
// di base of neck (rotation.z) supaya beak swing turun & naik.
//
// Body axis lokal: head di +x, tail di -x. Outer rotation.y = facing.
// Body lifted y=0.13 supaya feet (cylinder length 0.08 di y=-0.10)
// nempel di ground.
const Pigeon = ({ def }) => {
  const headRef = useRef();
  useFrame((state) => {
    if (!headRef.current) return;
    const t = state.clock.elapsedTime;
    const localT = (t + def.offset) % def.cycle;
    let pitch = 0;
    if (localT < def.peckDuration) {
      // Sin arc — head nukik turun lalu naik (peak rotation di tengah)
      const u = localT / def.peckDuration;
      pitch = Math.sin(u * Math.PI) * 1.3; // peak ~74° pitch down
    }
    headRef.current.rotation.z = -pitch;
  });
  const bodyColor = def.color || '#8a8a92';
  return (
    <group position={def.pos} rotation={[0, def.facing, 0]}>
      <group position={[0, 0.13, 0]}>
        {/* Body — ellipsoid abu */}
        <mesh scale={[0.18, 0.13, 0.13]} castShadow>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={bodyColor} roughness={0.85} />
        </mesh>
        {/* Sayap kiri (-z) — slightly darker, tucked di sisi body */}
        <mesh
          position={[-0.02, 0.04, -0.10]}
          scale={[0.16, 0.09, 0.07]}
          rotation={[0, 0, 0.1]}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#5a5a64" roughness={0.85} />
        </mesh>
        {/* Sayap kanan (+z) */}
        <mesh
          position={[-0.02, 0.04, 0.10]}
          scale={[0.16, 0.09, 0.07]}
          rotation={[0, 0, 0.1]}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#5a5a64" roughness={0.85} />
        </mesh>
        {/* Tail — cone segitiga miring ke atas dikit di belakang */}
        <mesh position={[-0.20, 0.04, 0]} rotation={[0, 0, 1.4]} castShadow>
          <coneGeometry args={[0.06, 0.14, 4]} />
          <meshStandardMaterial color="#4a4a52" roughness={0.85} />
        </mesh>
        {/* Head group — pivot di base of neck untuk peck rotation */}
        <group ref={headRef} position={[0.14, 0.04, 0]}>
          {/* Neck — silinder pendek miring ke depan-atas */}
          <mesh position={[0.03, 0.05, 0]} rotation={[0, 0, -0.6]}>
            <cylinderGeometry args={[0.035, 0.045, 0.10, 8]} />
            <meshStandardMaterial color={bodyColor} roughness={0.85} />
          </mesh>
          {/* Kepala */}
          <mesh position={[0.08, 0.10, 0]} castShadow>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color={bodyColor} roughness={0.85} />
          </mesh>
          {/* Paruh — cone kecil oranye-cokelat */}
          <mesh position={[0.13, 0.09, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.015, 0.045, 6]} />
            <meshStandardMaterial color="#3a2618" roughness={0.7} />
          </mesh>
          {/* Mata kiri & kanan */}
          <mesh position={[0.10, 0.115, 0.04]}>
            <sphereGeometry args={[0.011, 6, 6]} />
            <meshStandardMaterial color="#1a0e08" />
          </mesh>
          <mesh position={[0.10, 0.115, -0.04]}>
            <sphereGeometry args={[0.011, 6, 6]} />
            <meshStandardMaterial color="#1a0e08" />
          </mesh>
        </group>
        {/* Kaki — 2 silinder oranye tipis, panjang 0.08 nempel ke ground */}
        <mesh position={[0.02, -0.10, 0.04]}>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 6]} />
          <meshStandardMaterial color="#d4775a" roughness={0.6} />
        </mesh>
        <mesh position={[0.02, -0.10, -0.04]}>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 6]} />
          <meshStandardMaterial color="#d4775a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

// Cluster di sekitar picnic table (world (10, 0, 7)) — pigeon emang
// suka kumpul di tempat orang piknik buat dapet remah. Cycle dan
// offset di-stagger supaya nggak peck serempak. 1 burung dengan tone
// lebih gelap untuk variety.
const PIGEON_DEFS = [
  { pos: [9.0, 0, 6.3], facing: -0.5, cycle: 4.2, offset: 0, peckDuration: 1.0 },
  { pos: [10.6, 0, 8.2], facing: 2.4, cycle: 5.0, offset: 1.5, peckDuration: 1.1, color: '#7a7a85' },
  { pos: [9.5, 0, 8.4], facing: -1.8, cycle: 4.7, offset: 3.0, peckDuration: 0.95 },
  { pos: [11.1, 0, 6.4], facing: 1.5, cycle: 4.5, offset: 2.2, peckDuration: 1.05, color: '#92928e' },
];

const Pigeons = ({ count }) => (
  <>
    {PIGEON_DEFS.slice(0, count ?? PIGEON_DEFS.length).map((def, i) => (
      <Pigeon key={`pigeon-${i}`} def={def} />
    ))}
  </>
);

// Bush / semak — sphere klaster low yang ngisi gap di antara
// pohon-pohon. Lebih bulat dan rendah dari tree, fungsi sebagai
// volume vegetation tambahan. Color match BankTree foliage.
const Bush = ({ pos, scale = 1 }) => (
  <group position={pos} scale={scale}>
    <mesh position={[0, 0.3, 0]} castShadow>
      <sphereGeometry args={[0.45, 12, 10]} />
      <meshStandardMaterial color="#5a8045" roughness={0.85} />
    </mesh>
    <mesh position={[0.3, 0.25, 0.1]} castShadow>
      <sphereGeometry args={[0.32, 12, 10]} />
      <meshStandardMaterial color="#6e9358" roughness={0.85} />
    </mesh>
    <mesh position={[-0.25, 0.28, 0.05]} castShadow>
      <sphereGeometry args={[0.36, 12, 10]} />
      <meshStandardMaterial color="#4f7438" roughness={0.85} />
    </mesh>
  </group>
);

const BUSH_POSITIONS = [
  // Bank kiri
  { pos: [-9.0, 0, -8], scale: 0.9 },
  { pos: [-10.5, 0, 0], scale: 1.0 },
  { pos: [-9.5, 0, 6], scale: 0.85 },
  { pos: [-10.0, 0, 12], scale: 0.95 },
  // Bank kanan — fix overlap dengan picnic table @ [10, 0, 7]
  { pos: [10.0, 0, -10], scale: 1.0 },
  { pos: [9.5, 0, -3], scale: 0.9 },
  { pos: [12.0, 0, 4], scale: 1.0 }, // moved from [10.5, 0, 7]
  { pos: [11.5, 0, 11], scale: 0.85 }, // moved from [9.8, 0, 13]
  // Bank atas (-z) — outside pond+path z<-19.5
  { pos: [-5, 0, -21], scale: 0.95 },
  { pos: [6, 0, -22], scale: 0.9 },
  // Bank bawah (+z) — outside pond+path z>19.5
  { pos: [-6, 0, 21], scale: 0.95 },
  { pos: [5, 0, 22], scale: 1.0 },
];

const Bushes = () => (
  <>
    {BUSH_POSITIONS.map((b, i) => (
      <Bush key={`bush-${i}`} pos={b.pos} scale={b.scale} />
    ))}
  </>
);

// Sign post di path entrance — tiang kayu + plank horizontal dengan
// teks "Telaga Harapan" via drei Html. Posisi di awal path supaya
// kelihatan kayak welcome sign. Warna kayu match bench/dock/bridge.
const SignPost = () => (
  <group position={[-(RIVER_WIDTH / 2 + 1.5), 0, -12]}>
    {/* Tiang */}
    <mesh position={[0, 0.7, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.08, 1.4, 6]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
    </mesh>
    {/* Plank papan horizontal */}
    <mesh position={[0, 1.15, 0]} castShadow>
      <boxGeometry args={[0.9, 0.32, 0.06]} />
      <meshStandardMaterial color="#5a3e2b" roughness={0.85} />
    </mesh>
    {/* Tepi plank — frame kayu lebih gelap */}
    <mesh position={[0, 1.32, 0.03]}>
      <boxGeometry args={[0.92, 0.04, 0.03]} />
      <meshStandardMaterial color="#3a2616" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.98, 0.03]}>
      <boxGeometry args={[0.92, 0.04, 0.03]} />
      <meshStandardMaterial color="#3a2616" roughness={0.95} />
    </mesh>
    <Html
      position={[0, 1.15, 0.04]}
      center
      distanceFactor={6}
      occlude={false}
    >
      <div
        className="text-center pointer-events-none select-none whitespace-nowrap"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        <div className="text-[10px] text-[#3a2616] font-medium">
          Telaga Harapan
        </div>
      </div>
    </Html>
  </group>
);

// Picnic table — meja kayu rectangular + 2 bench panjang di kiri/kanan.
// Posisi di bank kanan jauh dari dock & banks edge supaya kerasa human
// presence yang authentic.
const PicnicTable = () => (
  <group position={[10, 0, 7]} rotation={[0, -0.4, 0]}>
    {/* Meja top */}
    <mesh position={[0, 0.62, 0]} castShadow>
      <boxGeometry args={[1.6, 0.06, 0.7]} />
      <meshStandardMaterial color="#5a3e2b" roughness={0.85} />
    </mesh>
    {/* Plank lines on top */}
    <mesh position={[0, 0.66, -0.18]}>
      <boxGeometry args={[1.55, 0.005, 0.04]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    <mesh position={[0, 0.66, 0.18]}>
      <boxGeometry args={[1.55, 0.005, 0.04]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    {/* Meja kaki — 2 X-shaped support */}
    <mesh position={[-0.7, 0.32, 0]} rotation={[0, 0, 0.3]}>
      <boxGeometry args={[0.06, 0.7, 0.6]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
    </mesh>
    <mesh position={[0.7, 0.32, 0]} rotation={[0, 0, -0.3]}>
      <boxGeometry args={[0.06, 0.7, 0.6]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
    </mesh>
    {/* Bench depan */}
    <mesh position={[0, 0.36, 0.62]} castShadow>
      <boxGeometry args={[1.6, 0.06, 0.3]} />
      <meshStandardMaterial color="#5a3e2b" roughness={0.85} />
    </mesh>
    <mesh position={[-0.7, 0.18, 0.62]}>
      <boxGeometry args={[0.06, 0.4, 0.25]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
    </mesh>
    <mesh position={[0.7, 0.18, 0.62]}>
      <boxGeometry args={[0.06, 0.4, 0.25]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
    </mesh>
    {/* Bench belakang */}
    <mesh position={[0, 0.36, -0.62]} castShadow>
      <boxGeometry args={[1.6, 0.06, 0.3]} />
      <meshStandardMaterial color="#5a3e2b" roughness={0.85} />
    </mesh>
    <mesh position={[-0.7, 0.18, -0.62]}>
      <boxGeometry args={[0.06, 0.4, 0.25]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
    </mesh>
    <mesh position={[0.7, 0.18, -0.62]}>
      <boxGeometry args={[0.06, 0.4, 0.25]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
    </mesh>
  </group>
);

// Bike rack — 2 hoop inverted-U dari pipe metal di base concrete plate.
// Posisi di +x bank dekat picnic table (thematic: orang parkir lalu
// piknik). Long axis sejajar Z-axis. Lebar hoop ~0.5, tinggi ~0.6.
const RACK_HOOP_OFFSETS = [-0.5, 0.5];

const BikeRack = () => (
  <group position={[11.5, 0, -7]}>
    {/* Base concrete plate */}
    <mesh position={[0, 0.015, 0]} receiveShadow>
      <boxGeometry args={[0.7, 0.03, 1.5]} />
      <meshStandardMaterial color="#9a9690" roughness={0.95} />
    </mesh>
    {RACK_HOOP_OFFSETS.map((dz, i) => (
      <group key={`hoop-${i}`} position={[0, 0, dz]}>
        {/* Post kiri */}
        <mesh position={[-0.22, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.6, 10]} />
          <meshStandardMaterial color="#3a3530" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Post kanan */}
        <mesh position={[0.22, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.6, 10]} />
          <meshStandardMaterial color="#3a3530" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Top bar horizontal antara 2 post */}
        <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.44, 10]} />
          <meshStandardMaterial color="#3a3530" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Curve kiri (1/4 torus) */}
        <mesh position={[-0.22, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.022, 0.022, 6, 6, Math.PI / 2]} />
          <meshStandardMaterial color="#3a3530" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>
    ))}
  </group>
);

// Helper: tube cylinder antara 2 titik di plane XY (z=0 untuk semua).
// Hitung center, length, rotation.z dari delta. Cylinder default
// orient ke +y, jadi rotation.z = -atan2(dx, dy) supaya axis align
// ke vector b-a.
const tube = (a, b, color, radius = 0.018) => {
  const cx = (a[0] + b[0]) / 2;
  const cy = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = -Math.atan2(dx, dy);
  return (
    <mesh position={[cx, cy, 0]} rotation={[0, 0, angle]} castShadow>
      <cylinderGeometry args={[radius, radius, len, 8]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
    </mesh>
  );
};

// Sepeda low-poly — frame planar di plane XY (lebih gampang anchor
// node). Wheels = torus vertikal facing ke +/-z. Frame: top tube,
// down tube, seat tube, chain stays, seat stays, fork. Plus seat,
// handlebar, pedal kecil.
const Bike = ({ position, rotation = [0, 0, 0], color = '#c4544c' }) => {
  const BB = [0, 0.22, 0]; // bottom bracket
  const seatTop = [-0.12, 0.55, 0];
  const headTop = [0.28, 0.55, 0];
  const wheelBack = [-0.28, 0.20, 0];
  const wheelFront = [0.28, 0.20, 0];
  return (
    <group position={position} rotation={rotation}>
      {/* Wheels */}
      {[wheelBack, wheelFront].map((w, i) => (
        <group key={`w-${i}`} position={w}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.18, 0.018, 5, 18]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
          </mesh>
          {/* Hub */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.05, 8]} />
            <meshStandardMaterial
              color="#7a7a7a"
              roughness={0.4}
              metalness={0.7}
            />
          </mesh>
          {/* Spokes — 2 pasang silang tipis */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.34, 4]} />
            <meshStandardMaterial color="#9a9a9a" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.34, 4]} />
            <meshStandardMaterial color="#9a9a9a" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Frame tubes */}
      {tube(seatTop, headTop, color)}
      {tube(BB, headTop, color)}
      {tube(BB, seatTop, color)}
      {tube(BB, wheelBack, color, 0.014)}
      {tube(seatTop, wheelBack, color, 0.014)}
      {tube(headTop, wheelFront, color, 0.014)}
      {/* Seat */}
      <mesh position={[-0.14, 0.59, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={[0.16, 0.025, 0.06]} />
        <meshStandardMaterial color="#1a1410" roughness={0.85} />
      </mesh>
      {/* Handlebar — perpendicular ke frame */}
      <mesh
        position={[0.28, 0.62, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
        <meshStandardMaterial color="#2a2218" roughness={0.7} />
      </mesh>
      {/* Pedal kiri/kanan kecil di BB */}
      <mesh position={[0, 0.20, 0.06]}>
        <boxGeometry args={[0.06, 0.012, 0.025]} />
        <meshStandardMaterial color="#1a1410" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.24, -0.06]}>
        <boxGeometry args={[0.06, 0.012, 0.025]} />
        <meshStandardMaterial color="#1a1410" roughness={0.85} />
      </mesh>
    </group>
  );
};

const BikeParking = ({ bikeCount = 2 }) => (
  <>
    <BikeRack />
    {/* Sepeda leaning ke hoop, slight tilt + slightly behind rack */}
    {bikeCount >= 1 && (
      <Bike
        position={[11.4, 0, -7.5]}
        rotation={[0.12, Math.PI / 2, 0]}
        color="#6a4030"
      />
    )}
    {bikeCount >= 2 && (
      <Bike
        position={[11.4, 0, -6.5]}
        rotation={[0.12, Math.PI / 2, 0]}
        color="#4a78b8"
      />
    )}
  </>
);

// Kupu-kupu di sekitar bunga — 2 plane wings doublesided + body kecil.
// Animasi: hover position bobbing dengan sin waves di 3 axis, wing
// flap via rotation. Phase per butterfly biar nggak sync.
const Butterfly = ({ home, color, phase }) => {
  const groupRef = useRef();
  const wingsRef = useRef();

  useFrame((state) => {
    if (!groupRef.current || !wingsRef.current) return;
    const t = state.clock.elapsedTime;
    // Hover position dengan range kecil di sekitar home
    groupRef.current.position.x = home[0] + Math.sin(t * 0.7 + phase) * 0.5;
    groupRef.current.position.y =
      home[1] + Math.cos(t * 0.5 + phase) * 0.25;
    groupRef.current.position.z =
      home[2] + Math.sin(t * 0.6 + phase * 1.3) * 0.4;
    groupRef.current.rotation.y = Math.sin(t * 0.4 + phase) * 0.5;
    // Wings flap cepat
    wingsRef.current.rotation.y = Math.sin(t * 14 + phase) * 0.6;
  });

  return (
    <group ref={groupRef}>
      <group ref={wingsRef}>
        {/* Wing kiri */}
        <mesh position={[-0.08, 0, 0]} rotation={[0, 0.4, 0]}>
          <planeGeometry args={[0.14, 0.18]} />
          <meshStandardMaterial
            color={color}
            side={2}
            roughness={0.6}
            emissive={color}
            emissiveIntensity={0.1}
          />
        </mesh>
        {/* Wing kanan */}
        <mesh position={[0.08, 0, 0]} rotation={[0, -0.4, 0]}>
          <planeGeometry args={[0.14, 0.18]} />
          <meshStandardMaterial
            color={color}
            side={2}
            roughness={0.6}
            emissive={color}
            emissiveIntensity={0.1}
          />
        </mesh>
        {/* Body */}
        <mesh>
          <cylinderGeometry args={[0.012, 0.015, 0.16, 6]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
};

const BUTTERFLY_DEFS = [
  { home: [-9, 0.6, -7], color: '#f4a8c0', phase: 0 },
  { home: [-10, 0.5, 5], color: '#f4d870', phase: 1.5 },
  { home: [10, 0.6, -5], color: '#e89bb8', phase: 2.8 },
  { home: [9, 0.55, 11], color: '#c89be8', phase: 0.7 },
  { home: [-3, 0.5, -16], color: '#f4d870', phase: 3.2 },
  { home: [4, 0.6, 16], color: '#f4a8c0', phase: 1.2 },
];

const Butterflies = ({ count }) => (
  <>
    {BUTTERFLY_DEFS.slice(0, count ?? BUTTERFLY_DEFS.length).map((def, i) => (
      <Butterfly key={`butterfly-${i}`} {...def} />
    ))}
  </>
);

// Capung di atas air — body silinder hijau metallic + 4 plane wings
// transparan. Hover animation lebih darting (faster, less smooth)
// dari butterfly. Posisi sekitar lily pads.
const Dragonfly = ({ home, phase }) => {
  const groupRef = useRef();
  const wingsRef = useRef();

  useFrame((state) => {
    if (!groupRef.current || !wingsRef.current) return;
    const t = state.clock.elapsedTime;
    // Darting hover — quick small movements
    groupRef.current.position.x =
      home[0] + Math.sin(t * 1.2 + phase) * 0.7;
    groupRef.current.position.y =
      home[1] + Math.cos(t * 0.9 + phase) * 0.15;
    groupRef.current.position.z =
      home[2] + Math.cos(t * 1.0 + phase * 1.5) * 0.6;
    groupRef.current.rotation.y = Math.sin(t * 0.7 + phase) * 0.8;
    wingsRef.current.rotation.x = Math.sin(t * 30 + phase) * 0.3;
  });

  return (
    <group ref={groupRef}>
      {/* Body — silinder hijau metallic */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.018, 0.32, 8]} />
        <meshStandardMaterial
          color="#3a8060"
          roughness={0.4}
          metalness={0.5}
          emissive="#3a8060"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Eyes — 2 sphere kecil di kepala */}
      <mesh position={[0.16, 0.025, 0.04]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      <mesh position={[0.16, 0.025, -0.04]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {/* 4 wings transparent */}
      <group ref={wingsRef} position={[0.04, 0.04, 0]}>
        <mesh rotation={[0, 0.3, 0]} position={[0.04, 0, 0.16]}>
          <planeGeometry args={[0.18, 0.08]} />
          <meshStandardMaterial
            color="#cfe8e0"
            side={2}
            transparent
            opacity={0.55}
            roughness={0.3}
          />
        </mesh>
        <mesh rotation={[0, -0.3, 0]} position={[0.04, 0, -0.16]}>
          <planeGeometry args={[0.18, 0.08]} />
          <meshStandardMaterial
            color="#cfe8e0"
            side={2}
            transparent
            opacity={0.55}
            roughness={0.3}
          />
        </mesh>
        <mesh rotation={[0, 0.4, 0]} position={[-0.04, 0, 0.14]}>
          <planeGeometry args={[0.16, 0.07]} />
          <meshStandardMaterial
            color="#cfe8e0"
            side={2}
            transparent
            opacity={0.55}
            roughness={0.3}
          />
        </mesh>
        <mesh rotation={[0, -0.4, 0]} position={[-0.04, 0, -0.14]}>
          <planeGeometry args={[0.16, 0.07]} />
          <meshStandardMaterial
            color="#cfe8e0"
            side={2}
            transparent
            opacity={0.55}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
};

const DRAGONFLY_DEFS = [
  { home: [-3, 0.8, -2], phase: 0 },
  { home: [4, 0.9, 4], phase: 2.0 },
  { home: [0, 1.0, -8], phase: 4.0 },
];

const Dragonflies = ({ count }) => (
  <>
    {DRAGONFLY_DEFS.slice(0, count ?? DRAGONFLY_DEFS.length).map((def, i) => (
      <Dragonfly key={`dragonfly-${i}`} {...def} />
    ))}
  </>
);

// Bunga matahari — tinggi (1.5m), tall stem + center disk + 12 petal
// cones. Cluster di banks supaya jadi visual landmark di taman.
const Sunflower = ({ pos, scale = 1 }) => (
  <group position={pos} scale={scale}>
    {/* Stem panjang */}
    <mesh position={[0, 0.75, 0]} castShadow>
      <cylinderGeometry args={[0.025, 0.04, 1.5, 6]} />
      <meshStandardMaterial color="#4a7035" roughness={1} />
    </mesh>
    {/* Daun 1 di stem */}
    <mesh position={[0.15, 0.6, 0]} rotation={[0, 0, -0.4]} castShadow>
      <coneGeometry args={[0.06, 0.25, 4]} />
      <meshStandardMaterial color="#5a8045" roughness={0.9} />
    </mesh>
    {/* Daun 2 */}
    <mesh position={[-0.13, 0.4, 0.05]} rotation={[0, 0.3, 0.4]} castShadow>
      <coneGeometry args={[0.05, 0.22, 4]} />
      <meshStandardMaterial color="#5a8045" roughness={0.9} />
    </mesh>
    {/* Center disk — coklat-kuning */}
    <mesh position={[0, 1.55, 0]}>
      <cylinderGeometry args={[0.13, 0.13, 0.05, 16]} />
      <meshStandardMaterial color="#5a3826" roughness={0.95} />
    </mesh>
    {/* Petal kelopak — 12 cones di sekeliling disk */}
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      return (
        <mesh
          key={`petal-${i}`}
          position={[
            Math.cos(angle) * 0.18,
            1.55,
            Math.sin(angle) * 0.18,
          ]}
          rotation={[Math.PI / 2, 0, -angle - Math.PI / 2]}
        >
          <coneGeometry args={[0.07, 0.18, 4]} />
          <meshStandardMaterial
            color="#f4c038"
            roughness={0.55}
            emissive="#f4c038"
            emissiveIntensity={0.12}
          />
        </mesh>
      );
    })}
  </group>
);

const SUNFLOWER_PATCHES = [
  // Patch 1: 3 sunflowers di bank kiri jauh
  { pos: [-11, 0, -14], scale: 0.95 },
  { pos: [-11.5, 0, -13.4], scale: 0.85 },
  { pos: [-10.5, 0, -13.6], scale: 1.0 },
  // Patch 2: 3 sunflowers di bank kanan
  { pos: [12, 0, 0], scale: 1.0 },
  { pos: [12.6, 0, -0.3], scale: 0.9 },
  { pos: [12.3, 0, 0.6], scale: 0.95 },
  // Patch 3: 4 sunflowers di bank bawah
  { pos: [8, 0, 17], scale: 1.0 },
  { pos: [8.6, 0, 16.5], scale: 0.85 },
  { pos: [9.2, 0, 17.2], scale: 0.95 },
  { pos: [7.5, 0, 17.5], scale: 0.9 },
];

const Sunflowers = () => (
  <>
    {SUNFLOWER_PATCHES.map((s, i) => (
      <Sunflower key={`sunflower-${i}`} pos={s.pos} scale={s.scale} />
    ))}
  </>
);

// Mushroom clusters — small mushroom dengan stem putih + cap dome
// merah dengan dot putih (klasik fairy tale style). Cluster of 2-3
// mushroom di tempat shadowy (dekat trees/bushes).
const Mushroom = ({ size = 1 }) => (
  <group scale={size}>
    {/* Stem */}
    <mesh position={[0, 0.07, 0]}>
      <cylinderGeometry args={[0.04, 0.05, 0.15, 8]} />
      <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
    </mesh>
    {/* Cap dome */}
    <mesh position={[0, 0.16, 0]}>
      <sphereGeometry args={[0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial
        color="#8a5a3a"
        roughness={0.7}
        emissive="#8a5a3a"
        emissiveIntensity={0.1}
      />
    </mesh>
    {/* Dot putih kecil di cap */}
    <mesh position={[0.04, 0.21, 0]}>
      <sphereGeometry args={[0.018, 6, 6]} />
      <meshStandardMaterial color="#ffffff" roughness={0.9} />
    </mesh>
    <mesh position={[-0.05, 0.20, 0.03]}>
      <sphereGeometry args={[0.015, 6, 6]} />
      <meshStandardMaterial color="#ffffff" roughness={0.9} />
    </mesh>
  </group>
);

const MUSHROOM_CLUSTERS = [
  { pos: [-8.5, 0, -10], count: 3 },
  { pos: [9.5, 0, -12], count: 2 },
  { pos: [-9.5, 0, 9], count: 3 },
  { pos: [-11, 0, -5], count: 2 },
  { pos: [10.5, 0, 5], count: 2 },
];

const Mushrooms = () => (
  <>
    {MUSHROOM_CLUSTERS.map((cluster, i) => (
      <group key={`mushroom-cluster-${i}`} position={cluster.pos}>
        {Array.from({ length: cluster.count }).map((_, j) => {
          const angle = (j / cluster.count) * Math.PI * 2 + i;
          const r = 0.18 + ((j * 13) % 10) * 0.04;
          return (
            <group
              key={j}
              position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
            >
              <Mushroom size={0.85 + ((j + i) % 4) * 0.1} />
            </group>
          );
        })}
      </group>
    ))}
  </>
);

// =============================================================
// FILL DECOR — bunga + batu untuk area yang masih kosong
// =============================================================

// Cluster bunga warna-warni di patch — small spheres dengan emissive
// soft (kayak kelopak yg sedikit catch light). 5-7 bunga per bed,
// scattered di radius 0.6 sekitar pos.
// Flower beds di sisi pond — semua di luar pond bounds (x>±7 atau
// z>±18). Dulu beberapa di z=±14 yang sekarang INSIDE pond setelah
// extension ke z=±18.
const FLOWER_BED_DEFS = [
  { pos: [-9, 0, -8], colors: ['#f08080', '#ffd060', '#f4a4c4'] },
  { pos: [-10, 0, 4], colors: ['#d4a0e0', '#fff080', '#f8b0a0'] },
  { pos: [9, 0, -7], colors: ['#ffa0a0', '#c8e070', '#f8d8b0'] },
  { pos: [10, 0, 5], colors: ['#f4a0c8', '#ffd078', '#a4d4f4'] },
  { pos: [-9, 0, -21], colors: ['#ffb070', '#f8a8c0', '#d8d8a0'] },
  { pos: [9, 0, -21], colors: ['#a8d8c0', '#ffc878', '#f4a0c4'] },
  { pos: [-9, 0, 21], colors: ['#f4d488', '#e0a4d8', '#ffa888'] },
  { pos: [9, 0, 21], colors: ['#f8a8c8', '#c8e08c', '#ffcc88'] },
];
const FlowerBed = ({ pos, colors }) => {
  // Pre-compute petal positions deterministic dari pos
  const flowers = useMemo(() => {
    const arr = [];
    const seed = (n) => ((pos[0] * 13 + pos[2] * 17 + n * 7) % 100) / 100;
    for (let j = 0; j < 7; j++) {
      const angle = j * 0.97 + seed(j) * 1.5;
      const r = 0.2 + seed(j + 10) * 0.5;
      const colorIdx = j % colors.length;
      arr.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        h: 0.18 + seed(j + 20) * 0.12,
        scale: 0.7 + seed(j + 30) * 0.4,
        color: colors[colorIdx],
      });
    }
    return arr;
  }, [pos, colors]);
  return (
    <group position={pos}>
      {flowers.map((f, j) => (
        <group key={j} position={[f.x, 0, f.z]} scale={f.scale}>
          {/* Stem hijau tipis */}
          <mesh position={[0, f.h / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.018, f.h, 4]} />
            <meshStandardMaterial color="#5a7045" roughness={1} />
          </mesh>
          {/* Petal — sphere warna-warni dengan slight emissive */}
          <mesh position={[0, f.h, 0]}>
            <sphereGeometry args={[0.085, 8, 6]} />
            <meshStandardMaterial
              color={f.color}
              emissive={f.color}
              emissiveIntensity={0.18}
              roughness={0.7}
            />
          </mesh>
          {/* Center kuning kecil */}
          <mesh position={[0, f.h, 0]}>
            <sphereGeometry args={[0.04, 6, 5]} />
            <meshStandardMaterial color="#ffe070" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Soft grass patch di base bed */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 12]} />
        <meshStandardMaterial color="#5a7548" roughness={1} transparent opacity={0.55} />
      </mesh>
    </group>
  );
};
const FlowerBeds = ({ isMobile }) => {
  const list = isMobile
    ? FLOWER_BED_DEFS.slice(0, 5)
    : FLOWER_BED_DEFS;
  return (
    <>
      {list.map((b, i) => (
        <FlowerBed key={`fbed-${i}`} pos={b.pos} colors={b.colors} />
      ))}
    </>
  );
};

// Decor stones — kelompok batu kecil scattered, garden zen feel.
// 6-7 batu per cluster, ukuran variasi 0.15..0.35.
const STONE_CLUSTER_DEFS = [
  { pos: [-9.5, 0, -3], rot: 0.3 },
  { pos: [9.5, 0, -2], rot: -0.5 },
  { pos: [-9, 0, 11], rot: 0.8 },
  { pos: [9, 0, 12], rot: 1.2 },
  { pos: [-13, 0, 4], rot: 0.6 },
  { pos: [13, 0, -6], rot: -0.7 },
  { pos: [0, 0, -23], rot: 0 },
  { pos: [0, 0, 23], rot: 0.5 },
];
const StoneCluster = ({ pos, rot }) => {
  const stones = useMemo(() => {
    const arr = [];
    const seed = (n) => ((pos[0] * 11 + pos[2] * 19 + n * 5) % 100) / 100;
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.2 + seed(i) * 0.6;
      const r = 0.15 + seed(i + 10) * 0.4;
      arr.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        size: 0.12 + seed(i + 20) * 0.18,
        tilt: seed(i + 30) * 0.5,
      });
    }
    return arr;
  }, [pos]);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, s.size / 2, s.z]}
          rotation={[s.tilt * 0.3, s.tilt, 0]}
        >
          <boxGeometry args={[s.size * 1.4, s.size, s.size * 1.2]} />
          <meshStandardMaterial color="#7a7468" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};
const StoneClusters = () => (
  <>
    {STONE_CLUSTER_DEFS.map((c, i) => (
      <StoneCluster key={`stcl-${i}`} pos={c.pos} rot={c.rot} />
    ))}
  </>
);

// Path stepping stones — batu pipih sebagai path tambahan dari bench
// ke dock atau di tepi pond. Kasih hint "ada jalur" tanpa harus
// kontruksi WalkPath full.
// Stepping stones di bank zone (x>±7 atau z>±18) — gak boleh masuk
// pond. Path hint dari bench ke pond edge atau dock area.
const STEPPING_STONE_DEFS = [
  { pos: [-9, 0.02, -2], r: 0.45 },
  { pos: [-9.5, 0.02, -0.5], r: 0.4 },
  { pos: [-9.2, 0.02, 1], r: 0.45 },
  { pos: [9, 0.02, 8], r: 0.4 },
  { pos: [9.5, 0.02, 9.5], r: 0.42 },
  { pos: [10, 0.02, 11], r: 0.4 },
  { pos: [-9.5, 0.02, 7], r: 0.4 },
  { pos: [-9, 0.02, 8.5], r: 0.45 },
];
const SteppingStones = () => (
  <>
    {STEPPING_STONE_DEFS.map((s, i) => (
      <mesh
        key={`step-${i}`}
        position={s.pos}
        rotation={[-Math.PI / 2, 0, (i * 0.7) % 1.5]}
      >
        <circleGeometry args={[s.r, 12]} />
        <meshStandardMaterial color="#857668" roughness={1} />
      </mesh>
    ))}
  </>
);

// Burung-burung di langit — simple silhouette (V-shape via 2 cone)
// drifting horizontal. 3 burung dengan posisi & speed berbeda. Animasi
// sederhana di useFrame: x position drift + sedikit y oscillation.
const BIRD_DEFS = [
  { startX: -25, y: 14, z: -20, speed: 1.2, phase: 0 },
  { startX: -30, y: 12, z: -25, speed: 0.9, phase: 1.5 },
  { startX: -20, y: 16, z: -18, speed: 1.5, phase: 0.8 },
];

const Bird = ({ def }) => {
  const groupRef = useRef();
  const xRef = useRef(def.startX);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    xRef.current += def.speed * delta;
    if (xRef.current > 30) xRef.current = -30;
    const yBob = Math.sin(state.clock.elapsedTime * 0.8 + def.phase) * 0.3;
    groupRef.current.position.x = xRef.current;
    groupRef.current.position.y = def.y + yBob;
    groupRef.current.position.z = def.z;
  });

  return (
    <group ref={groupRef}>
      {/* Wing kiri */}
      <mesh rotation={[0, 0, 0.6]}>
        <coneGeometry args={[0.25, 0.5, 4]} />
        <meshStandardMaterial color="#2a1f15" roughness={1} />
      </mesh>
      {/* Wing kanan */}
      <mesh rotation={[0, 0, -0.6]}>
        <coneGeometry args={[0.25, 0.5, 4]} />
        <meshStandardMaterial color="#2a1f15" roughness={1} />
      </mesh>
    </group>
  );
};

const Birds = () => (
  <>
    {BIRD_DEFS.map((def, i) => (
      <Bird key={`bird-${i}`} def={def} />
    ))}
  </>
);

// Awan-awan kecil di langit — 5 cloud puff sebagai sphere putih
// dengan slight emissive warmth. Posisi tinggi (y=15..22) dan jauh
// (z=-25..15). Rotasi per cloud untuk variasi shape, scale 1-2x.
// Kasih sense of "langit ada isi", bukan flat color.
const CLOUD_POSITIONS = [
  { pos: [-7, 13, -15], scale: [2.0, 0.9, 1.4] },
  { pos: [8, 14, -12], scale: [1.8, 0.8, 1.5] },
  { pos: [-1, 15, -19], scale: [2.2, 1.0, 1.6] },
  { pos: [12, 12, 0], scale: [1.6, 0.8, 1.3] },
  { pos: [-12, 13, 4], scale: [1.8, 0.9, 1.4] },
];
const Cloud = ({ pos, scale }) => (
  <group position={pos} scale={scale}>
    <mesh>
      <sphereGeometry args={[1.5, 12, 10]} />
      <meshStandardMaterial color="#7a6a58" roughness={1} />
    </mesh>
    <mesh position={[1.0, 0.1, 0.2]}>
      <sphereGeometry args={[1.1, 12, 10]} />
      <meshStandardMaterial color="#7a6a58" roughness={1} />
    </mesh>
    <mesh position={[-0.9, -0.1, 0.1]}>
      <sphereGeometry args={[1.0, 12, 10]} />
      <meshStandardMaterial color="#7a6a58" roughness={1} />
    </mesh>
  </group>
);
const Clouds = () => (
  <>
    {CLOUD_POSITIONS.map((c, i) => (
      <Cloud key={`cloud-${i}`} pos={c.pos} scale={c.scale} />
    ))}
  </>
);

// =============================================================
// LANGIT — multi-layer atmospheric depth seperti r1, daytime palette
// =============================================================
//
// Approach mirip r1 tapi tema siang: dome gradient + sun visible focal
// point + layer cloud (existing mid + far backdrop + high cirrus) +
// distant high birds. User rotate orbit camera 360° → sky terasa
// "bulat" mengelilingi telaga. Polar diperluas supaya bisa menengadah.

// Gradient sky dome — large inverted sphere covering hemisphere.
// Vertex shader-less: pakai meshBasicMaterial + vertexColors yang
// di-bake ke geometry pas init. Bottom (horizon) pink-warm, top
// (zenith) deep blue. Bikin "we're in a dome" feel.
const SkyDome = () => {
  const geomRef = useRef();
  // Compute vertex colors gradient sekali on mount
  useLayoutEffect(() => {
    if (!geomRef.current) return;
    const positions = geomRef.current.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    // Senja palette tanpa area hitam — horizon warm orange → mid
    // dusty pink-purple → zenith soft lavender (gak deep dark).
    // Atmosphere "matahari hampir tenggelam" tapi sky tetap glow.
    // POLUTED palette: smog yellow-brown horizon → dirty brown-gray
    // mid → very dark muddy gray zenith. Push lebih jauh dari drought
    // ke "polluted sky" — kerasa langit ke-cover smog tebel, gak ada
    // celah biru sama sekali, matahari nembus tipis aja.
    const horizonR = 0.58, horizonG = 0.48, horizonB = 0.28; // sickly yellow-brown smog
    const midR = 0.40, midG = 0.34, midB = 0.28; // dirty brown-gray
    const zenithR = 0.22, zenithG = 0.20, zenithB = 0.20; // very dark muddy gray
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      // Normalize y to 0..1 across dome height (radius 32, so y goes 0..32)
      const t = Math.max(0, Math.min(1, y / 32));
      let r, g, b;
      if (t < 0.45) {
        const u = t / 0.45;
        r = horizonR + (midR - horizonR) * u;
        g = horizonG + (midG - horizonG) * u;
        b = horizonB + (midB - horizonB) * u;
      } else {
        const u = (t - 0.45) / 0.55;
        r = midR + (zenithR - midR) * u;
        g = midG + (zenithG - midG) * u;
        b = midB + (zenithB - midB) * u;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geomRef.current.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3),
    );
  }, []);
  return (
    <mesh position={[0, 0, 0]}>
      {/* Hemisphere — radius 32, only upper half. side BackSide
          karena kita di dalam sphere. Smaller dome = lebih intimate
          "lingkup bumi" feel. */}
      <sphereGeometry
        ref={geomRef}
        args={[32, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]}
      />
      <meshBasicMaterial
        side={THREE.BackSide}
        vertexColors
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
};

// HorizonSmogBand — ring/band tipis di horizon, tone sickly yellow-
// brown, fade ke transparent ke atas. Bikin "smog layer" yg kentel
// di tepi pandang — kerasa pencemaran nge-tebel di garis horizon.
// Pakai cylinder dome (back side) radius ~30, tinggi 6 supaya
// nge-cover horizon band aja, gak ke zenith.
const HorizonSmogBand = () => (
  <mesh position={[0, 3, 0]}>
    <cylinderGeometry args={[30, 30, 6, 32, 1, true]} />
    <meshBasicMaterial
      color="#8a6840"
      transparent
      opacity={0.45}
      side={THREE.BackSide}
      depthWrite={false}
      fog={false}
    />
  </mesh>
);

// Sun — visible disc + 3-layer halo, mirip r1 Moon tapi warm yellow
// dan posisi upper-front (afternoon sun). Slow pulse di outer haze.
const Sun = () => {
  const outerHaloRef = useRef();
  useFrame((state) => {
    if (!outerHaloRef.current) return;
    const t = state.clock.elapsedTime;
    outerHaloRef.current.material.opacity = 0.10 + Math.sin(t * 0.25) * 0.03;
  });
  return (
    <group position={[8, 16, -10]}>
      {/* POLUTED: Sun body shifted ke sickly amber-brown (smog filter).
          Body lebih kecil lagi — matahari "nembus" smog tipis2 aja. */}
      <mesh>
        <sphereGeometry args={[1.2, 24, 16]} />
        <meshBasicMaterial color="#b88858" toneMapped={false} fog={false} />
      </mesh>
      {/* Tight halo — dim brown-amber */}
      <mesh>
        <sphereGeometry args={[1.8, 18, 14]} />
        <meshBasicMaterial
          color="#8a6440"
          transparent
          opacity={0.18}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      {/* Soft outer haze — sickly brown, sangat lemah */}
      <mesh ref={outerHaloRef}>
        <sphereGeometry args={[2.8, 16, 12]} />
        <meshBasicMaterial
          color="#5a3e20"
          transparent
          opacity={0.08}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
};

// Far cloud layer — sparse small puffs di altitude tinggi (y=24-30)
// + farther z. Lebih kecil dari mid clouds, dimmer. Bikin depth
// layered (foreground existing clouds + background ini).
const FAR_CLOUD_POSITIONS = [
  { pos: [-15, 18, -22], scale: [1.2, 0.45, 0.9] },
  { pos: [17, 20, -14], scale: [1.4, 0.5, 1.0] },
  { pos: [-20, 17, 5], scale: [1.3, 0.45, 0.9] },
  { pos: [19, 19, 12], scale: [1.1, 0.45, 0.8] },
  { pos: [-8, 22, -26], scale: [1.5, 0.55, 1.0] },
  { pos: [5, 18, 20], scale: [1.2, 0.45, 0.9] },
  { pos: [-23, 16, -7], scale: [1.3, 0.45, 0.9] },
  { pos: [21, 17, -1], scale: [1.2, 0.45, 0.9] },
];
const FarCloud = ({ pos, scale }) => (
  <group position={pos} scale={scale}>
    <mesh>
      <sphereGeometry args={[1.5, 10, 8]} />
      <meshBasicMaterial color="#9a8878" transparent opacity={0.4} fog={false} />
    </mesh>
    <mesh position={[0.8, 0.05, 0.15]}>
      <sphereGeometry args={[1.0, 10, 8]} />
      <meshBasicMaterial color="#9a8878" transparent opacity={0.4} fog={false} />
    </mesh>
  </group>
);
const FarClouds = ({ isMobile }) => {
  const list = isMobile
    ? FAR_CLOUD_POSITIONS.slice(0, 5)
    : FAR_CLOUD_POSITIONS;
  return (
    <>
      {list.map((c, i) => (
        <FarCloud key={`fcloud-${i}`} pos={c.pos} scale={c.scale} />
      ))}
    </>
  );
};

// High birds — V-shape silhouettes flock distant di altitude tinggi.
// Slow drift horizontal, fade in/out via wing flap. Berbeda dari Birds
// existing yang dekat, ini lebih jauh + lebih banyak.
const HighBirdFlock = ({ count = 6 }) => {
  const refs = useRef([]);
  const defs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: -20 + Math.random() * 40,
      y: 13 + Math.random() * 4,
      z: -18 + Math.random() * 36,
      speed: 0.6 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    defs.forEach((d, i) => {
      const ref = refs.current[i];
      if (!ref) return;
      // Slow horizontal drift (X), wrap saat keluar batas
      const x = ((d.x + t * d.speed + 40) % 40) - 20;
      ref.position.x = x;
      // Subtle wing flap via Y wobble
      ref.position.y = d.y + Math.sin(t * 4 + d.phase) * 0.1;
    });
  });
  return (
    <>
      {defs.map((d, i) => (
        <group
          key={`hbird-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[d.x, d.y, d.z]}
        >
          {/* Tiny V silhouette */}
          <mesh rotation={[0, 0, 0.3]} position={[-0.1, 0, 0]}>
            <boxGeometry args={[0.18, 0.02, 0.04]} />
            <meshBasicMaterial color="#3a4858" fog={false} />
          </mesh>
          <mesh rotation={[0, 0, -0.3]} position={[0.1, 0, 0]}>
            <boxGeometry args={[0.18, 0.02, 0.04]} />
            <meshBasicMaterial color="#3a4858" fog={false} />
          </mesh>
        </group>
      ))}
    </>
  );
};

// Lentera kayu kecil di tepi sungai — tiang vertikal + body lentera
// box + atap. Daytime mode: nggak ada glow + nggak ada pointlight
// (lampu kan mati siang hari). Tetap berdiri sebagai dekorasi taman.
const Lantern = ({ pos }) => (
  <group position={pos}>
    {/* Tiang */}
    <mesh position={[0, 0.8, 0]}>
      <cylinderGeometry args={[0.04, 0.06, 1.6, 6]} />
      <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
    </mesh>
    {/* Body lentera */}
    <mesh position={[0, 1.65, 0]}>
      <boxGeometry args={[0.28, 0.32, 0.28]} />
      <meshStandardMaterial color="#2a1d14" roughness={0.9} />
    </mesh>
    {/* Atap lentera (piramida tipis) */}
    <mesh position={[0, 1.86, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.22, 0.12, 4]} />
      <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
    </mesh>
  </group>
);

const LANTERN_POSITIONS = [
  // 2 di sepanjang path kiri (parallel walkway)
  [-(RIVER_WIDTH / 2 + 0.5), 0, -10],
  [-(RIVER_WIDTH / 2 + 0.5), 0, 8],
  // 2 di shore kanan flank dock
  [RIVER_WIDTH / 2 + 0.5, 0, -8],
  [RIVER_WIDTH / 2 + 0.5, 0, 11],
];

const Lanterns = () => (
  <>
    {LANTERN_POSITIONS.map((pos, i) => (
      <Lantern key={`lantern-${i}`} pos={pos} />
    ))}
  </>
);

// Pohon kecil di banks — versi simpel dari CenterTree, ramping &
// dark night green. Frame visual untuk scene + dimensionality. Posisi
// scatter di kedua tepi, jauh dari sungai supaya nggak nutupin lily
// pads.
// BankTree dengan tree sway + shadow casting. Sway dijalanin via
// useFrame: foliage group rotation Y di-osilasi sin wave halus dengan
// phase berbeda per tree (deterministik dari posisi). Cast shadow ke
// banks supaya kerasa solid.
// DROUGHT VARIANT: BankTree canonical (trunk + 2 green foliage sphere
// dgn wind sway) diganti dead tree — trunk gray + 3 cabang gundul
// sticking out di angles. Phase wind sway tetap, tapi yg goyang
// cabang-cabang (skeletal silhouette di wind).
const BankTree = ({ pos, scale = 1 }) => {
  const branchRef = useRef();
  const phase = (pos[0] + pos[2]) * 0.3;

  useFrame((state) => {
    if (!branchRef.current) return;
    const t = state.clock.elapsedTime;
    branchRef.current.rotation.z = Math.sin(t * 0.6 + phase) * 0.025;
    branchRef.current.rotation.x = Math.cos(t * 0.5 + phase) * 0.02;
  });

  return (
    <group position={pos} scale={scale}>
      {/* Trunk — color shifted ke gray kering, sedikit lebih lebar
          (gak ada foliage di atas, jadi trunk perlu lebih prominent) */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 1.9, 8]} />
        <meshStandardMaterial color="#4a3a2a" roughness={1} />
      </mesh>
      {/* Dead branches group — sway tipis ngikut wind */}
      <group ref={branchRef} position={[0, 1.9, 0]}>
        {/* Cabang utama kanan */}
        <mesh
          position={[0.32, 0.15, 0]}
          rotation={[0, 0, -0.95]}
          castShadow
        >
          <cylinderGeometry args={[0.04, 0.07, 1.0, 6]} />
          <meshStandardMaterial color="#3a2818" roughness={1} />
        </mesh>
        {/* Cabang utama kiri */}
        <mesh
          position={[-0.28, 0.1, 0.05]}
          rotation={[0, 0, 0.85]}
          castShadow
        >
          <cylinderGeometry args={[0.04, 0.065, 0.9, 6]} />
          <meshStandardMaterial color="#3a2818" roughness={1} />
        </mesh>
        {/* Cabang atas kecil */}
        <mesh
          position={[0.08, 0.42, -0.1]}
          rotation={[0.2, 0, 0.3]}
          castShadow
        >
          <cylinderGeometry args={[0.03, 0.05, 0.65, 5]} />
          <meshStandardMaterial color="#3a2818" roughness={1} />
        </mesh>
        {/* Sub-cabang dari cabang kanan — kasih variasi silhouette */}
        <mesh
          position={[0.65, 0.45, 0]}
          rotation={[0, 0, -0.5]}
          castShadow
        >
          <cylinderGeometry args={[0.025, 0.04, 0.5, 4]} />
          <meshStandardMaterial color="#3a2818" roughness={1} />
        </mesh>
      </group>
    </group>
  );
};

// Outer trees — scattered di outer ring (r=18-22) di dalam ground
// circle r=24. Bank circle smaller jadi outer trees harus inward.
const OUTER_TREE_DEFS = (() => {
  const arr = [];
  // Two rings — inner ring r=22-25 dgn pond-axis skip, outer ring
  // r=28-33 fill seluruh keliling termasuk arah pond axis (jauh dari
  // pond jadi gak overlap).
  const innerCount = 16;
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
    const angDeg = (((angle * 180) / Math.PI) + 360) % 360;
    const isPondAxis =
      (angDeg > 75 && angDeg < 105) ||
      (angDeg > 255 && angDeg < 285);
    if (isPondAxis) continue;
    const r = 22 + Math.random() * 3;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      scale: 1.5 + Math.random() * 0.6,
    });
  }
  const outerCount = 18;
  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * Math.PI * 2 + Math.PI / outerCount + (Math.random() - 0.5) * 0.15;
    const r = 28 + Math.random() * 5;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      scale: 1.7 + Math.random() * 0.7,
    });
  }
  return arr;
})();
const OuterTrees = ({ isMobile }) => {
  const list = isMobile
    ? OUTER_TREE_DEFS.slice(0, 10)
    : OUTER_TREE_DEFS;
  return (
    <>
      {list.map((t, i) => (
        <BankTree key={`outer-tree-${i}`} pos={t.pos} scale={t.scale} />
      ))}
    </>
  );
};

// Outer flower beds — patches di lapangan luar (ground r=36).
// Posisi di antara outer trees, r=20-30. Skip pond axis di ring dalam
// supaya gak overlap path strips.
const OUTER_FLOWER_BED_DEFS = (() => {
  const arr = [];
  const innerCount = 14;
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2 + Math.PI / innerCount;
    const angDeg = (((angle * 180) / Math.PI) + 360) % 360;
    const isPondAxis =
      (angDeg > 75 && angDeg < 105) ||
      (angDeg > 255 && angDeg < 285);
    if (isPondAxis) continue;
    const r = 20 + Math.random() * 3;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      colors: [
        ['#f08080', '#ffd060', '#f4a4c4'],
        ['#d4a0e0', '#fff080', '#f8b0a0'],
        ['#ffa0a0', '#c8e070', '#f8d8b0'],
        ['#f4a0c8', '#ffd078', '#a4d4f4'],
      ][i % 4],
    });
  }
  const outerCount = 12;
  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const r = 27 + Math.random() * 5;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      colors: [
        ['#f4d870', '#ffffff', '#e89bb8'],
        ['#9bb8e8', '#c89be8', '#f4a570'],
        ['#fff080', '#f8b0a0', '#d4a0e0'],
        ['#a4d4f4', '#ffd078', '#f4a0c8'],
      ][i % 4],
    });
  }
  return arr;
})();
const OuterFlowerBeds = ({ isMobile }) => {
  const list = isMobile
    ? OUTER_FLOWER_BED_DEFS.slice(0, 6)
    : OUTER_FLOWER_BED_DEFS;
  return (
    <>
      {list.map((b, i) => (
        <FlowerBed key={`outer-fbed-${i}`} pos={b.pos} colors={b.colors} />
      ))}
    </>
  );
};

// Garden lantern — wood pole + paper lamp top, warm emissive supaya
// kerasa lentera taman senja yg mulai nyala. Scatter di outer ring.
const GardenLantern = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Wood pole */}
    <mesh position={[0, 0.8, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.06, 1.6, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* Cap di bawah lamp */}
    <mesh position={[0, 1.62, 0]}>
      <cylinderGeometry args={[0.16, 0.12, 0.06, 6]} />
      <meshStandardMaterial color="#3d2818" roughness={0.9} />
    </mesh>
    {/* Paper lamp body — soft warm glow */}
    <mesh position={[0, 1.82, 0]}>
      <sphereGeometry args={[0.18, 12, 8]} />
      <meshStandardMaterial
        color="#ffd690"
        emissive="#ffb060"
        emissiveIntensity={0.85}
        roughness={0.6}
        transparent
        opacity={0.92}
      />
    </mesh>
    {/* Top finial */}
    <mesh position={[0, 2.04, 0]}>
      <coneGeometry args={[0.07, 0.12, 6]} />
      <meshStandardMaterial color="#3d2818" roughness={0.9} />
    </mesh>
    {/* Soft halo */}
    <pointLight position={[0, 1.82, 0]} color="#ffb060" intensity={0.35} distance={4} decay={2} />
  </group>
);
const GARDEN_LANTERN_DEFS = [
  { pos: [-22, 0, -10], rot: 0.4 },
  { pos: [22, 0, -8], rot: -0.3 },
  { pos: [-20, 0, 12], rot: 0.6 },
  { pos: [20, 0, 14], rot: -0.5 },
  { pos: [-14, 0, -22], rot: 0.2 },
  { pos: [14, 0, 22], rot: 1.0 },
];
const GardenLanterns = ({ isMobile }) => {
  // Mobile cull 6→3 (drops 1 pointLight + 3 lantern groups, supaya total dynamic
  // lights di scene < Three.js 8-light cap).
  const list = isMobile ? GARDEN_LANTERN_DEFS.slice(0, 3) : GARDEN_LANTERN_DEFS;
  return (
    <>
      {list.map((l, i) => (
        <GardenLantern key={`gl-${i}`} pos={l.pos} rot={l.rot} />
      ))}
    </>
  );
};

// Wooden bench — simple 2-plank seat dgn 2 kaki kayu. Posisi facing
// pond supaya feel "duduk lihat danau".
const WoodenBench = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Seat plank */}
    <mesh position={[0, 0.45, 0]} castShadow>
      <boxGeometry args={[1.6, 0.08, 0.4]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </mesh>
    {/* Back rest */}
    <mesh position={[0, 0.78, -0.16]} castShadow>
      <boxGeometry args={[1.6, 0.5, 0.06]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </mesh>
    {/* Legs */}
    <mesh position={[-0.65, 0.22, 0]}>
      <boxGeometry args={[0.08, 0.45, 0.36]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    <mesh position={[0.65, 0.22, 0]}>
      <boxGeometry args={[0.08, 0.45, 0.36]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
  </group>
);
const BENCH_DEFS = [
  // Facing pond — rotation arah pondnya (origin)
  { pos: [-13, 0, -16], rot: Math.atan2(16, 13) }, // upper-left, face origin
  { pos: [16, 0, -14], rot: Math.atan2(14, -16) },
  { pos: [-15, 0, 18], rot: Math.atan2(-18, 15) },
  { pos: [15, 0, 18], rot: Math.atan2(-18, -15) },
];
const WoodenBenches = ({ isMobile }) => {
  const list = isMobile ? BENCH_DEFS.slice(0, 2) : BENCH_DEFS;
  return (
    <>
      {list.map((b, i) => (
        <WoodenBench key={`bench-${i}`} pos={b.pos} rot={b.rot} />
      ))}
    </>
  );
};

// Log pile — 3-4 cylinder logs stacked, decor rustik. Bagus dipasang
// near outer trees seperti firewood.
const LogPile = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Bottom 2 logs */}
    <mesh position={[-0.18, 0.16, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.16, 0.16, 1.0, 8]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
    </mesh>
    <mesh position={[0.18, 0.16, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.16, 0.16, 1.0, 8]} />
      <meshStandardMaterial color="#6a4d2f" roughness={0.95} />
    </mesh>
    {/* Top log */}
    <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.15, 0.15, 1.0, 8]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
    </mesh>
    {/* Cross log */}
    <mesh position={[0, 0.18, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.13, 0.13, 0.5, 8]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
  </group>
);
const LOG_PILE_DEFS = [
  { pos: [-19, 0, -4], rot: 0.3 },
  { pos: [21, 0, 6], rot: -0.4 },
  { pos: [-17, 0, 22], rot: 0.7 },
];
const LogPiles = () => (
  <>
    {LOG_PILE_DEFS.map((l, i) => (
      <LogPile key={`logpile-${i}`} pos={l.pos} rot={l.rot} />
    ))}
  </>
);

// Outer mushroom clusters — extend mushroom decor ke outer ring (r=20-28).
// Lebih banyak cluster supaya outer area gak kosong.
const OUTER_MUSHROOM_DEFS = [
  { pos: [-22, 0, -2], count: 3 },
  { pos: [-20, 0, 16], count: 2 },
  { pos: [22, 0, 0], count: 3 },
  { pos: [19, 0, -18], count: 2 },
  { pos: [-12, 0, -25], count: 3 },
  { pos: [13, 0, 25], count: 2 },
];
const OuterMushrooms = ({ isMobile }) => {
  const list = isMobile ? OUTER_MUSHROOM_DEFS.slice(0, 3) : OUTER_MUSHROOM_DEFS;
  return (
    <>
      {list.map((cluster, i) => (
        <group key={`omush-${i}`} position={cluster.pos}>
          {Array.from({ length: cluster.count }).map((_, j) => {
            const angle = (j / cluster.count) * Math.PI * 2 + i * 1.3;
            const r = 0.2 + ((j * 11) % 9) * 0.05;
            return (
              <group key={j} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
                <Mushroom size={0.85 + ((j + i) % 4) * 0.1} />
              </group>
            );
          })}
        </group>
      ))}
    </>
  );
};

// Scattered single-stem flowers — sparse, deterministic seed berdasar
// angle, fill outer area dgn warna soft. Lebih ringan dari FlowerBed
// (1 bloom only). Jumlah 36 desktop, 18 mobile.
const SCATTERED_FLOWER_DEFS = (() => {
  const arr = [];
  const colors = ['#f4d870', '#ffffff', '#e89bb8', '#c89be8', '#f4a570', '#9bb8e8'];
  const count = 40;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.21;
    // r=18-32, sparse fill ground
    const r = 18 + ((i * 7) % 14) + ((i * 3) % 5) * 0.4;
    // Skip if di pond corridor (z range ±19, x ±9)
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.abs(x) < 9 && Math.abs(z) < 19) continue;
    arr.push({
      pos: [x, 0, z],
      h: 0.22 + ((i * 13) % 7) * 0.03,
      color: colors[i % colors.length],
    });
  }
  return arr;
})();
const ScatteredFlower = ({ pos, h, color }) => (
  <group position={pos}>
    <mesh position={[0, h / 2, 0]}>
      <cylinderGeometry args={[0.012, 0.018, h, 4]} />
      <meshStandardMaterial color="#5a7045" roughness={1} />
    </mesh>
    <mesh position={[0, h, 0]}>
      <sphereGeometry args={[0.075, 6, 5]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.16}
        roughness={0.7}
      />
    </mesh>
  </group>
);
const ScatteredFlowers = ({ isMobile }) => {
  const list = isMobile
    ? SCATTERED_FLOWER_DEFS.slice(0, 18)
    : SCATTERED_FLOWER_DEFS;
  return (
    <>
      {list.map((f, i) => (
        <ScatteredFlower key={`sf-${i}`} pos={f.pos} h={f.h} color={f.color} />
      ))}
    </>
  );
};

// Wishing well — focal point: stone base, wood post, peaked roof.
// Pose di sisi outer area sebagai landmark sekunder.
const WishingWell = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Stone base ring */}
    <mesh position={[0, 0.4, 0]} castShadow>
      <cylinderGeometry args={[0.7, 0.75, 0.8, 12]} />
      <meshStandardMaterial color="#8a7d6a" roughness={1} />
    </mesh>
    {/* Inner dark hole */}
    <mesh position={[0, 0.78, 0]}>
      <cylinderGeometry args={[0.55, 0.55, 0.05, 12]} />
      <meshStandardMaterial color="#1a1410" roughness={1} />
    </mesh>
    {/* Two posts */}
    <mesh position={[-0.55, 1.4, 0]}>
      <cylinderGeometry args={[0.05, 0.06, 1.4, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    <mesh position={[0.55, 1.4, 0]}>
      <cylinderGeometry args={[0.05, 0.06, 1.4, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* Crossbar */}
    <mesh position={[0, 2.1, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.04, 0.04, 1.3, 6]} />
      <meshStandardMaterial color="#3d2818" roughness={0.95} />
    </mesh>
    {/* Roof — peaked tent shape */}
    <mesh position={[0, 2.4, 0]} castShadow>
      <coneGeometry args={[0.85, 0.5, 4]} />
      <meshStandardMaterial color="#6a4d2f" roughness={0.9} />
    </mesh>
    {/* Bucket hanging */}
    <mesh position={[0, 1.6, 0]}>
      <cylinderGeometry args={[0.16, 0.14, 0.22, 8]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </mesh>
    {/* Rope */}
    <mesh position={[0, 1.85, 0]}>
      <cylinderGeometry args={[0.012, 0.012, 0.32, 4]} />
      <meshStandardMaterial color="#5a4d3a" roughness={1} />
    </mesh>
  </group>
);

// Tree stump — short cylinder + flat top dgn bark texture warm.
// Scattered in outer area — small deko sederhana.
const TreeStump = ({ pos, rot = 0, scale = 1 }) => (
  <group position={pos} rotation={[0, rot, 0]} scale={scale}>
    <mesh position={[0, 0.22, 0]} castShadow>
      <cylinderGeometry args={[0.32, 0.36, 0.44, 10]} />
      <meshStandardMaterial color="#6a4d2f" roughness={0.95} />
    </mesh>
    {/* Top tan ring */}
    <mesh position={[0, 0.443, 0]}>
      <cylinderGeometry args={[0.31, 0.31, 0.01, 10]} />
      <meshStandardMaterial color="#a87850" roughness={0.85} />
    </mesh>
    {/* Center growth ring darker */}
    <mesh position={[0, 0.444, 0]}>
      <cylinderGeometry args={[0.16, 0.16, 0.01, 10]} />
      <meshStandardMaterial color="#7a5530" roughness={0.85} />
    </mesh>
  </group>
);
const TREE_STUMP_DEFS = [
  { pos: [-21, 0, 4], rot: 0.3, scale: 1.0 },
  { pos: [20, 0, -4], rot: -0.5, scale: 0.9 },
  { pos: [-16, 0, -23], rot: 0.7, scale: 1.1 },
  { pos: [17, 0, 23], rot: 1.2, scale: 1.0 },
  { pos: [-25, 0, -8], rot: 0.2, scale: 0.85 },
];
const TreeStumps = ({ isMobile }) => {
  const list = isMobile ? TREE_STUMP_DEFS.slice(0, 3) : TREE_STUMP_DEFS;
  return (
    <>
      {list.map((s, i) => (
        <TreeStump key={`stump-${i}`} pos={s.pos} rot={s.rot} scale={s.scale} />
      ))}
    </>
  );
};

// Wheelbarrow — bak kayu + 1 wheel + 2 handle posts. Rustik garden.
const Wheelbarrow = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Bak — flat box tilt slight */}
    <mesh position={[0, 0.42, 0]} rotation={[0.05, 0, 0]} castShadow>
      <boxGeometry args={[0.7, 0.32, 0.5]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </mesh>
    {/* Wheel */}
    <mesh position={[0, 0.22, 0.42]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.22, 0.22, 0.08, 12]} />
      <meshStandardMaterial color="#3d2818" roughness={0.9} />
    </mesh>
    {/* Wheel hub */}
    <mesh position={[0, 0.22, 0.42]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
      <meshStandardMaterial color="#1a1410" roughness={0.7} metalness={0.4} />
    </mesh>
    {/* Handles */}
    <mesh position={[-0.28, 0.42, -0.4]} rotation={[0.3, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    <mesh position={[0.28, 0.42, -0.4]} rotation={[0.3, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* Soil/flowers in bak — small bunga cluster */}
    <mesh position={[-0.1, 0.62, 0]}>
      <sphereGeometry args={[0.07, 6, 5]} />
      <meshStandardMaterial color="#f4a8c0" emissive="#f4a8c0" emissiveIntensity={0.15} />
    </mesh>
    <mesh position={[0.12, 0.62, 0.05]}>
      <sphereGeometry args={[0.06, 6, 5]} />
      <meshStandardMaterial color="#ffd060" emissive="#ffd060" emissiveIntensity={0.15} />
    </mesh>
    <mesh position={[0.05, 0.6, -0.1]}>
      <sphereGeometry args={[0.065, 6, 5]} />
      <meshStandardMaterial color="#d4a0e0" emissive="#d4a0e0" emissiveIntensity={0.15} />
    </mesh>
  </group>
);
const WHEELBARROW_DEFS = [
  { pos: [-18, 0, -2], rot: 0.6 },
  { pos: [18, 0, 16], rot: -0.4 },
];
const Wheelbarrows = () => (
  <>
    {WHEELBARROW_DEFS.map((w, i) => (
      <Wheelbarrow key={`wb-${i}`} pos={w.pos} rot={w.rot} />
    ))}
  </>
);

// Bird bath — pedestal kolom batu + shallow basin atas.
// Pose dekat tree stump / outer bench.
const BirdBath = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Base */}
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.32, 0.36, 0.12, 10]} />
      <meshStandardMaterial color="#7a7065" roughness={0.95} />
    </mesh>
    {/* Pedestal */}
    <mesh position={[0, 0.5, 0]} castShadow>
      <cylinderGeometry args={[0.13, 0.16, 0.76, 8]} />
      <meshStandardMaterial color="#8a7d6a" roughness={1} />
    </mesh>
    {/* Basin outer */}
    <mesh position={[0, 0.92, 0]}>
      <cylinderGeometry args={[0.42, 0.32, 0.1, 16]} />
      <meshStandardMaterial color="#7a7065" roughness={0.95} />
    </mesh>
    {/* Basin dry — air canonical #a8d4e8 ke cracked dirt #4a3520
        karena drought (kering, gak ada air). Material standard non-
        reflective. */}
    <mesh position={[0, 0.97, 0]}>
      <cylinderGeometry args={[0.36, 0.36, 0.04, 16]} />
      <meshStandardMaterial
        color="#4a3520"
        roughness={1}
      />
    </mesh>
  </group>
);
const BIRD_BATH_DEFS = [
  { pos: [-19, 0, 8], rot: 0.4 },
  { pos: [19, 0, -10], rot: -0.6 },
];
const BirdBaths = () => (
  <>
    {BIRD_BATH_DEFS.map((b, i) => (
      <BirdBath key={`bb-${i}`} pos={b.pos} rot={b.rot} />
    ))}
  </>
);

// Pinwheel — wood post + 4-blade pinwheel kertas warna, rotates dgn
// useFrame untuk subtle motion. Kasih playful kid-friendly vibe.
const Pinwheel = ({ pos, color, rot = 0 }) => {
  const bladeRef = useRef();
  useFrame((_, delta) => {
    if (bladeRef.current) bladeRef.current.rotation.z += delta * 1.4;
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Pole */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.9, 6]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
      </mesh>
      {/* Blade group */}
      <group ref={bladeRef} position={[0, 0.92, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0.13, 0.13, 0.04]}>
            <planeGeometry args={[0.26, 0.26]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.18}
              side={THREE.DoubleSide}
              roughness={0.7}
            />
          </mesh>
        ))}
        {/* Center hub */}
        <mesh position={[0, 0, 0.05]}>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
          <meshStandardMaterial color="#3d2818" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};
const PINWHEEL_DEFS = [
  { pos: [-14, 0, -22], color: '#ff8a8a', rot: 0.3 },
  { pos: [-22, 0, 18], color: '#8ad4ff', rot: -0.4 },
  { pos: [22, 0, 20], color: '#ffd470', rot: 0.6 },
  { pos: [18, 0, -22], color: '#d8a0e8', rot: 1.0 },
  { pos: [-13, 0, 24], color: '#a8e88a', rot: -0.2 },
  { pos: [12, 0, -25], color: '#ffa8d4', rot: 0.8 },
];
const Pinwheels = ({ isMobile }) => {
  const list = isMobile ? PINWHEEL_DEFS.slice(0, 3) : PINWHEEL_DEFS;
  return (
    <>
      {list.map((p, i) => (
        <Pinwheel key={`pw-${i}`} pos={p.pos} color={p.color} rot={p.rot} />
      ))}
    </>
  );
};

// Welcome arch — wooden archway dengan bunga rambat (vine + bloom dots)
// di top. Place sebagai entrance/landmark di belakang area.
const WelcomeArch = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Two posts */}
    <mesh position={[-1.0, 1.4, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.12, 2.8, 8]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    <mesh position={[1.0, 1.4, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.12, 2.8, 8]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* Top crossbar (curved approx with box) */}
    <mesh position={[0, 2.85, 0]} rotation={[0, 0, 0]}>
      <boxGeometry args={[2.4, 0.18, 0.18]} />
      <meshStandardMaterial color="#6a4d2f" roughness={0.95} />
    </mesh>
    {/* Vine bloom dots di top */}
    {[-0.9, -0.5, -0.1, 0.3, 0.7, 1.0].map((x, i) => (
      <mesh key={i} position={[x, 2.95 + (i % 2) * 0.06, 0.05]}>
        <sphereGeometry args={[0.09, 6, 5]} />
        <meshStandardMaterial
          color={['#f4a8c0', '#ffd060', '#d4a0e0', '#f08080'][i % 4]}
          emissive={['#f4a8c0', '#ffd060', '#d4a0e0', '#f08080'][i % 4]}
          emissiveIntensity={0.2}
          roughness={0.7}
        />
      </mesh>
    ))}
    {/* Vine green leaves */}
    {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
      <mesh key={`leaf-${i}`} position={[x, 2.92 + (i % 2) * 0.04, -0.03]}>
        <sphereGeometry args={[0.07, 6, 5]} />
        <meshStandardMaterial color="#5a8045" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

// Picnic blanket standalone — quilt + basket + 2 cup, tanpa NPC.
// Empty picnic spot — cocok untuk vibe "ada yang lagi jalan-jalan".
const PicnicBlanket = ({ pos, rot = 0, blanketColor }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Quilt */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
      <planeGeometry args={[1.6, 1.4]} />
      <meshStandardMaterial color={blanketColor} roughness={0.85} />
    </mesh>
    {/* Quilt accent stripe */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
      <ringGeometry args={[0.55, 0.62, 16]} />
      <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.45} />
    </mesh>
    {/* Basket */}
    <mesh position={[-0.4, 0.18, -0.3]}>
      <boxGeometry args={[0.36, 0.32, 0.28]} />
      <meshStandardMaterial color="#8a6a4a" roughness={0.95} />
    </mesh>
    {/* Basket handle */}
    <mesh position={[-0.4, 0.4, -0.3]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[0.12, 0.018, 6, 12, Math.PI]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.9} />
    </mesh>
    {/* Two cups */}
    <mesh position={[0.35, 0.06, -0.2]}>
      <cylinderGeometry args={[0.08, 0.07, 0.12, 8]} />
      <meshStandardMaterial color="#f4d4a0" roughness={0.7} />
    </mesh>
    <mesh position={[0.4, 0.06, 0.2]}>
      <cylinderGeometry args={[0.07, 0.06, 0.1, 8]} />
      <meshStandardMaterial color="#e8a878" roughness={0.7} />
    </mesh>
    {/* Plate kecil */}
    <mesh position={[0, 0.04, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.18, 12]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </mesh>
  </group>
);
const PICNIC_BLANKET_DEFS = [
  { pos: [-15, 0, 14], rot: 0.5, blanketColor: '#d48a8a' },
  { pos: [16, 0, -16], rot: -0.7, blanketColor: '#8aa4d4' },
  { pos: [14, 0, 12], rot: 1.2, blanketColor: '#d4b48a' },
];
const PicnicBlankets = ({ isMobile }) => {
  const list = isMobile ? PICNIC_BLANKET_DEFS.slice(0, 1) : PICNIC_BLANKET_DEFS;
  return (
    <>
      {list.map((b, i) => (
        <PicnicBlanket
          key={`pb-${i}`}
          pos={b.pos}
          rot={b.rot}
          blanketColor={b.blanketColor}
        />
      ))}
    </>
  );
};

// Gazebo — hexagonal pavilion sebagai landmark sekunder, place di
// south sisi pond sebagai counter-balance untuk WelcomeArch (north).
// 6 posts kayu + railing + peaked roof. Diameter ~5u — big enough to
// feel like a destination but not block view.
const Gazebo = ({ pos, rot = 0 }) => {
  const R = 2.2; // posts radius
  const ROOF_R = 2.7;
  const postAngles = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Floor — slight raised hex platform */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[R + 0.15, R + 0.2, 0.16, 6]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
      </mesh>
      {/* Inner floor lighter wood ring */}
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[R - 0.05, R - 0.05, 0.02, 6]} />
        <meshStandardMaterial color="#a88860" roughness={0.85} />
      </mesh>
      {/* 6 posts */}
      {postAngles.map((a, i) => (
        <mesh
          key={`post-${i}`}
          position={[Math.cos(a) * R, 1.4, Math.sin(a) * R]}
          castShadow
        >
          <cylinderGeometry args={[0.08, 0.1, 2.6, 8]} />
          <meshStandardMaterial color="#5a3d28" roughness={0.95} />
        </mesh>
      ))}
      {/* Railing — connect adjacent posts at y=0.6 */}
      {postAngles.map((a, i) => {
        const a2 = postAngles[(i + 1) % 6];
        const mx = (Math.cos(a) + Math.cos(a2)) / 2 * R;
        const mz = (Math.sin(a) + Math.sin(a2)) / 2 * R;
        const dx = Math.cos(a2) * R - Math.cos(a) * R;
        const dz = Math.sin(a2) * R - Math.sin(a) * R;
        const len = Math.sqrt(dx * dx + dz * dz);
        const yaw = Math.atan2(dz, dx);
        // Skip one side as entrance (facing pond, i.e. -z when rot=0)
        if (i === 4) return null;
        return (
          <mesh key={`rail-${i}`} position={[mx, 0.6, mz]} rotation={[0, -yaw, 0]}>
            <boxGeometry args={[len * 0.92, 0.06, 0.08]} />
            <meshStandardMaterial color="#6a4d2f" roughness={0.95} />
          </mesh>
        );
      })}
      {/* Roof — hex peaked cone */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <coneGeometry args={[ROOF_R, 1.4, 6]} />
        <meshStandardMaterial color="#7a4d2f" roughness={0.9} />
      </mesh>
      {/* Roof underside trim */}
      <mesh position={[0, 2.78, 0]}>
        <cylinderGeometry args={[ROOF_R - 0.05, ROOF_R - 0.05, 0.1, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Roof tip ornament */}
      <mesh position={[0, 3.95, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color="#c89858" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Hanging lantern di center underneath roof */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.3, 4]} />
        <meshStandardMaterial color="#3d2818" roughness={1} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[0.22, 0.28, 0.22]} />
        <meshStandardMaterial
          color="#ffdc9a"
          emissive="#ffb070"
          emissiveIntensity={0.7}
          roughness={0.6}
        />
      </mesh>
      <pointLight position={[0, 2.25, 0]} intensity={0.4} distance={6} color="#ffc890" />
    </group>
  );
};

// Hammock — kain tergantung antara 2 wood post, sedikit sag di tengah +
// gentle sway via useFrame. Bagus buat vibe "santai sore".
const Hammock = ({ pos, rot = 0, color = '#c4685a' }) => {
  const hammockRef = useRef();
  useFrame((state) => {
    if (hammockRef.current) {
      // Subtle sway side to side
      hammockRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
    }
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Two posts */}
      <mesh position={[-1.4, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 1.8, 8]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      <mesh position={[1.4, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 1.8, 8]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Post tops — small caps */}
      <mesh position={[-1.4, 1.82, 0]}>
        <coneGeometry args={[0.13, 0.16, 6]} />
        <meshStandardMaterial color="#3d2818" roughness={0.9} />
      </mesh>
      <mesh position={[1.4, 1.82, 0]}>
        <coneGeometry args={[0.13, 0.16, 6]} />
        <meshStandardMaterial color="#3d2818" roughness={0.9} />
      </mesh>
      {/* Hammock cloth — slight saggy curve approx with 3 boxes */}
      <group ref={hammockRef} position={[0, 1.5, 0]}>
        {/* Left rope */}
        <mesh position={[-1.1, -0.05, 0]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 4]} />
          <meshStandardMaterial color="#5a4d3a" roughness={1} />
        </mesh>
        {/* Right rope */}
        <mesh position={[1.1, -0.05, 0]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 4]} />
          <meshStandardMaterial color="#5a4d3a" roughness={1} />
        </mesh>
        {/* Cloth middle — saggy box */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[1.8, 0.08, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        {/* Cloth edge ends — slope up */}
        <mesh position={[-0.95, -0.32, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.3, 0.07, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        <mesh position={[0.95, -0.32, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.3, 0.07, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        {/* Decorative stripe */}
        <mesh position={[0, -0.405, 0]}>
          <boxGeometry args={[1.7, 0.01, 0.18]} />
          <meshStandardMaterial color="#f4d870" roughness={0.7} />
        </mesh>
        {/* Pillow */}
        <mesh position={[-0.6, -0.36, 0]}>
          <boxGeometry args={[0.4, 0.12, 0.55]} />
          <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
};

// Birdhouse on pole — small painted wood box + sloped roof + tiny perch
// + entrance hole. Mounted on tall pole. Scatter di outer ring.
const Birdhouse = ({ pos, rot = 0, color = '#d4685a', roofColor = '#5a3d28' }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Pole */}
    <mesh position={[0, 0.9, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.06, 1.8, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* House box */}
    <mesh position={[0, 1.95, 0]} castShadow>
      <boxGeometry args={[0.42, 0.42, 0.36]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
    {/* Sloped roof — 2 slanted planes (approximation) */}
    <mesh position={[0, 2.22, 0]} rotation={[0, 0, 0]}>
      <coneGeometry args={[0.32, 0.2, 4]} />
      <meshStandardMaterial color={roofColor} roughness={0.9} />
    </mesh>
    {/* Entrance hole (dark dot) */}
    <mesh position={[0, 2.0, 0.181]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.01, 12]} />
      <meshStandardMaterial color="#1a1410" roughness={1} />
    </mesh>
    {/* Tiny perch stick */}
    <mesh position={[0, 1.92, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.018, 0.018, 0.18, 5]} />
      <meshStandardMaterial color="#3d2818" roughness={0.95} />
    </mesh>
  </group>
);
const BIRDHOUSE_DEFS = [
  { pos: [-24, 0, 14], rot: -0.3, color: '#d4685a', roofColor: '#5a3d28' },
  { pos: [24, 0, -8], rot: 0.5, color: '#8aa4d4', roofColor: '#3d4858' },
  { pos: [15, 0, -25], rot: 1.0, color: '#f4c870', roofColor: '#7a5a3a' },
];
const Birdhouses = ({ isMobile }) => {
  const list = isMobile ? BIRDHOUSE_DEFS.slice(0, 2) : BIRDHOUSE_DEFS;
  return (
    <>
      {list.map((b, i) => (
        <Birdhouse key={`bh-${i}`} pos={b.pos} rot={b.rot} color={b.color} roofColor={b.roofColor} />
      ))}
    </>
  );
};

// Vegetable garden patch — raised wood plot dgn 3 rows of veggies
// (carrot tops + lettuce + tomato). Kasih hint "ada yg nanam" tanpa
// NPC.
const VeggiePatch = ({ pos, rot = 0 }) => {
  // Row spacings within patch
  const carrots = [-0.35, -0.15, 0.05, 0.25, 0.45];
  const lettuces = [-0.4, -0.1, 0.2, 0.5];
  const tomatoes = [-0.3, 0, 0.3];
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Raised bed frame — 4 wood planks */}
      <mesh position={[0, 0.08, -0.55]}>
        <boxGeometry args={[1.6, 0.16, 0.06]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.08, 0.55]}>
        <boxGeometry args={[1.6, 0.16, 0.06]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
      </mesh>
      <mesh position={[-0.78, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.16, 1.1]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
      </mesh>
      <mesh position={[0.78, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.16, 1.1]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
      </mesh>
      {/* Soil top */}
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.04, 1.05]} />
        <meshStandardMaterial color="#4a3522" roughness={1} />
      </mesh>
      {/* Carrot row — orange triangle tops + green sprig */}
      {carrots.map((x, i) => (
        <group key={`carrot-${i}`} position={[x, 0.16, -0.35]}>
          <mesh position={[0, 0.06, 0]}>
            <coneGeometry args={[0.04, 0.08, 5]} />
            <meshStandardMaterial color="#e88840" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <coneGeometry args={[0.05, 0.1, 5]} />
            <meshStandardMaterial color="#5a8045" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* Lettuce row — green leafy ball */}
      {lettuces.map((x, i) => (
        <mesh key={`lettuce-${i}`} position={[x, 0.21, 0]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshStandardMaterial color="#6e9358" roughness={0.85} />
        </mesh>
      ))}
      {/* Tomato row — small stake + red ball */}
      {tomatoes.map((x, i) => (
        <group key={`tomato-${i}`} position={[x, 0.16, 0.35]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.36, 4]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
          </mesh>
          <mesh position={[0.06, 0.18, 0]}>
            <sphereGeometry args={[0.07, 6, 5]} />
            <meshStandardMaterial color="#d44848" roughness={0.7} />
          </mesh>
          <mesh position={[-0.04, 0.26, 0.03]}>
            <sphereGeometry args={[0.055, 6, 5]} />
            <meshStandardMaterial color="#e85a4a" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Small wooden sign */}
      <mesh position={[-0.7, 0.42, -0.5]}>
        <boxGeometry args={[0.04, 0.5, 0.04]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      <mesh position={[-0.7, 0.6, -0.5]}>
        <boxGeometry args={[0.28, 0.16, 0.03]} />
        <meshStandardMaterial color="#a88860" roughness={0.9} />
      </mesh>
    </group>
  );
};

// Kite flying — diamond kite di sky dgn tail, anchored via string ke
// ground stake. Drift gentle horizontal + slight bob via useFrame.
// 1 kite saja sebagai sky accent.
const Kite = ({ stakePos = [-6, 0, 16], skyHeight = 8 }) => {
  const kiteRef = useRef();
  const tailRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (kiteRef.current) {
      // Drift in small ellipse around base sky position
      kiteRef.current.position.x = stakePos[0] + 3.5 + Math.sin(t * 0.4) * 1.4;
      kiteRef.current.position.y = skyHeight + Math.sin(t * 0.7) * 0.5;
      kiteRef.current.position.z = stakePos[2] - 2.5 + Math.cos(t * 0.4) * 1.2;
      // Slight tilt facing wind
      kiteRef.current.rotation.z = Math.sin(t * 0.5) * 0.15 - 0.35;
      kiteRef.current.rotation.y = Math.sin(t * 0.3) * 0.2;
    }
    if (tailRef.current) {
      tailRef.current.rotation.x = Math.sin(t * 1.2) * 0.25;
    }
  });
  return (
    <>
      {/* Ground stake */}
      <mesh position={[stakePos[0], 0.18, stakePos[2]]}>
        <cylinderGeometry args={[0.04, 0.02, 0.36, 5]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Kite + tail */}
      <group ref={kiteRef} position={[stakePos[0] + 3.5, skyHeight, stakePos[2] - 2.5]}>
        {/* Diamond kite — 4 triangle planes joined */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.9, 0.9]} />
          <meshStandardMaterial
            color="#f4a8c0"
            emissive="#f4a8c0"
            emissiveIntensity={0.2}
            side={THREE.DoubleSide}
            roughness={0.7}
          />
        </mesh>
        {/* Cross frame visible */}
        <mesh position={[0, 0, 0.005]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.9, 0.02, 0.005]} />
          <meshStandardMaterial color="#5a3d28" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0, 0.005]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.9, 0.02, 0.005]} />
          <meshStandardMaterial color="#5a3d28" roughness={0.95} />
        </mesh>
        {/* Tail with bowties */}
        <group ref={tailRef} position={[0, -0.45, 0]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={`bow-${i}`}
              position={[Math.sin(i * 0.4) * 0.1, -0.2 - i * 0.25, 0]}
              rotation={[0, 0, i * 0.3]}
            >
              <boxGeometry args={[0.14, 0.05, 0.01]} />
              <meshStandardMaterial
                color={['#ffd470', '#8ad4ff', '#d8a0e8', '#a8e88a', '#ffa8d4'][i]}
                emissive={['#ffd470', '#8ad4ff', '#d8a0e8', '#a8e88a', '#ffa8d4'][i]}
                emissiveIntensity={0.25}
                side={THREE.DoubleSide}
                roughness={0.7}
              />
            </mesh>
          ))}
          {/* String continuation down */}
          <mesh position={[0.05, -0.75, 0]} rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.005, 0.005, 1.4, 3]} />
            <meshStandardMaterial color="#f4ecd8" roughness={1} />
          </mesh>
        </group>
      </group>
    </>
  );
};

// Floating water lanterns — paper bowl lanterns drifting di pond
// surface, glow warm + subtle pointLight. Drift downstream slow
// (FLOW_SPEED/2.5), wrap dari FLOW_END_Z balik ke FLOW_START_Z (sama
// kayak lily pad logic). Pose offset di x untuk avoid bridge column.
const WATER_LANTERN_DEFS = [
  { startX: -3.5, startZ: -8, color: '#ffb070', phase: 0 },
  { startX: 2.8, startZ: -1, color: '#ff8a70', phase: 1.2 },
  { startX: -2.0, startZ: 5, color: '#ffcc88', phase: 2.5 },
  { startX: 3.2, startZ: 10, color: '#ff9468', phase: 0.6 },
];
const WaterLantern = ({ def, withLight = true }) => {
  const ref = useRef();
  const flameRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!ref.current) return;
    // Drift downstream slow (z increasing)
    const span = FLOW_END_Z - FLOW_START_Z;
    const drifted = ((def.startZ - FLOW_START_Z) + t * FLOW_SPEED * 0.4) % span;
    ref.current.position.z = FLOW_START_Z + drifted;
    // Lateral wobble
    ref.current.position.x = def.startX + Math.sin(t * 0.4 + def.phase) * 0.18;
    // Subtle bob
    ref.current.position.y = 0.04 + Math.sin(t * 0.9 + def.phase) * 0.015;
    // Flame flicker
    if (flameRef.current) {
      flameRef.current.scale.y = 0.85 + Math.sin(t * 8 + def.phase) * 0.12;
    }
  });
  return (
    <group ref={ref}>
      {/* Paper bowl — square base with tilted side panels (use box + cone) */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.16, 6]} />
        <meshStandardMaterial
          color={def.color}
          emissive={def.color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.92}
          roughness={0.6}
        />
      </mesh>
      {/* Base float — small wood disc */}
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.025, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Flame inside */}
      <mesh ref={flameRef} position={[0, 0.13, 0]}>
        <coneGeometry args={[0.05, 0.1, 5]} />
        <meshStandardMaterial
          color="#ffd470"
          emissive="#ffb050"
          emissiveIntensity={1.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      {withLight && (
        <pointLight position={[0, 0.2, 0]} intensity={0.35} distance={2.5} color={def.color} />
      )}
    </group>
  );
};
const WaterLanterns = ({ isMobile }) => {
  const list = isMobile ? WATER_LANTERN_DEFS.slice(0, 2) : WATER_LANTERN_DEFS;
  // Mobile: emissive only, skip pointLight (saves 2 active lights di <8 GPU limit)
  return (
    <>
      {list.map((d, i) => (
        <WaterLantern key={`wlan-${i}`} def={d} withLight={!isMobile} />
      ))}
    </>
  );
};

// Fire pit — circle of stones + animated flickering flame stack +
// warm pointLight glow. Cozy evening landmark. Place di SW outer
// clearing.
const FirePit = ({ pos }) => {
  const flameRef = useRef();
  const flame2Ref = useRef();
  const lightRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (flameRef.current) {
      flameRef.current.scale.y = 0.85 + Math.sin(t * 7) * 0.18;
      flameRef.current.rotation.y = Math.sin(t * 1.5) * 0.15;
    }
    if (flame2Ref.current) {
      flame2Ref.current.scale.y = 0.9 + Math.sin(t * 9 + 1.1) * 0.2;
      flame2Ref.current.rotation.y = Math.sin(t * 1.8 + 0.5) * 0.12;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.0 + Math.sin(t * 6) * 0.15;
    }
  });
  // 8 stones around ring
  const stoneAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  return (
    <group position={pos}>
      {/* Ash/sand patch underneath */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.95, 14]} />
        <meshStandardMaterial color="#3a322a" roughness={1} />
      </mesh>
      {/* Stone ring */}
      {stoneAngles.map((a, i) => {
        const sx = Math.cos(a) * 0.78;
        const sz = Math.sin(a) * 0.78;
        const sh = 0.18 + (i % 3) * 0.04;
        return (
          <mesh key={`fs-${i}`} position={[sx, sh / 2, sz]} rotation={[0, a, 0]} castShadow>
            <boxGeometry args={[0.34, sh, 0.28]} />
            <meshStandardMaterial color={['#7a7065', '#8a7d6a', '#6a605a'][i % 3]} roughness={1} />
          </mesh>
        );
      })}
      {/* Logs crossed di tengah */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.9, 6]} />
        <meshStandardMaterial color="#3d2818" roughness={1} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0.4]}>
        <cylinderGeometry args={[0.07, 0.07, 0.9, 6]} />
        <meshStandardMaterial color="#2a1810" roughness={1} />
      </mesh>
      {/* Flame inner */}
      <mesh ref={flameRef} position={[0, 0.32, 0]}>
        <coneGeometry args={[0.22, 0.52, 6]} />
        <meshStandardMaterial
          color="#ffd470"
          emissive="#ffb050"
          emissiveIntensity={1.6}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Flame outer (taller, more red) */}
      <mesh ref={flame2Ref} position={[0, 0.42, 0]}>
        <coneGeometry args={[0.16, 0.68, 6]} />
        <meshStandardMaterial
          color="#ff8a48"
          emissive="#ff6028"
          emissiveIntensity={1.3}
          transparent
          opacity={0.78}
        />
      </mesh>
      {/* Warm glow light */}
      <pointLight ref={lightRef} position={[0, 0.6, 0]} intensity={1.0} distance={6} color="#ff8a48" />
    </group>
  );
};

// Garden swing — A-frame wood structure dgn wooden plank seat hanging
// dari rope. Gentle sway via useFrame. Different vibe dari playground
// (lebih contemplative).
const GardenSwing = ({ pos, rot = 0 }) => {
  const swingRef = useRef();
  useFrame((state) => {
    if (swingRef.current) {
      // Pendulum swing — slower than hammock
      swingRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.7) * 0.12;
    }
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* A-frame left posts (2 angled meeting at top) */}
      <mesh position={[-0.6, 1.1, -0.6]} rotation={[0, 0, 0.22]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      <mesh position={[-0.6, 1.1, 0.6]} rotation={[0, 0, 0.22]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* A-frame right posts */}
      <mesh position={[0.6, 1.1, -0.6]} rotation={[0, 0, -0.22]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      <mesh position={[0.6, 1.1, 0.6]} rotation={[0, 0, -0.22]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Top crossbar */}
      <mesh position={[0, 2.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.6, 6]} />
        <meshStandardMaterial color="#6a4d2f" roughness={0.95} />
      </mesh>
      {/* Swinging plank assembly — pivot di top */}
      <group ref={swingRef} position={[0, 2.15, 0]}>
        {/* Rope L */}
        <mesh position={[0, -0.85, -0.4]}>
          <cylinderGeometry args={[0.015, 0.015, 1.7, 4]} />
          <meshStandardMaterial color="#5a4d3a" roughness={1} />
        </mesh>
        {/* Rope R */}
        <mesh position={[0, -0.85, 0.4]}>
          <cylinderGeometry args={[0.015, 0.015, 1.7, 4]} />
          <meshStandardMaterial color="#5a4d3a" roughness={1} />
        </mesh>
        {/* Plank seat */}
        <mesh position={[0, -1.7, 0]} castShadow>
          <boxGeometry args={[0.7, 0.06, 1.0]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

// Mailbox — vintage red mailbox on wooden post, place dekat
// WelcomeArch sebagai entrance accent. Curved-top box, small flag,
// "letter slot" detail.
const Mailbox = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Post */}
    <mesh position={[0, 0.65, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.07, 1.3, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* Box body — half cylinder approximation (cylinder tilted) */}
    <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.18, 0.18, 0.5, 8, 1, false, Math.PI, Math.PI]} />
      <meshStandardMaterial color="#8a5a3a" roughness={0.7} />
    </mesh>
    {/* Bottom flat plate for box */}
    <mesh position={[0, 1.22, 0]}>
      <boxGeometry args={[0.36, 0.02, 0.5]} />
      <meshStandardMaterial color="#6a4028" roughness={0.85} />
    </mesh>
    {/* Front door (slight darker) */}
    <mesh position={[0, 1.36, 0.251]}>
      <boxGeometry args={[0.3, 0.26, 0.01]} />
      <meshStandardMaterial color="#6a4028" roughness={0.8} />
    </mesh>
    {/* Letter slot (dark slit) */}
    <mesh position={[0, 1.4, 0.258]}>
      <boxGeometry args={[0.2, 0.04, 0.005]} />
      <meshStandardMaterial color="#1a1410" roughness={1} />
    </mesh>
    {/* Knob */}
    <mesh position={[0, 1.28, 0.258]}>
      <sphereGeometry args={[0.025, 6, 5]} />
      <meshStandardMaterial color="#d4c468" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Flag (red, raised up = mail) */}
    <mesh position={[-0.22, 1.5, 0]}>
      <boxGeometry args={[0.02, 0.18, 0.02]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    <mesh position={[-0.16, 1.55, 0]}>
      <boxGeometry args={[0.14, 0.1, 0.01]} />
      <meshStandardMaterial color="#ff5848" roughness={0.7} />
    </mesh>
  </group>
);

// Reading nook — wooden chair + side table dgn open book di atasnya +
// teacup. Cozy spot, contemplative. Pose under tree shade ideally.
const ReadingNook = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Chair seat */}
    <mesh position={[0, 0.42, 0]} castShadow>
      <boxGeometry args={[0.6, 0.08, 0.55]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </mesh>
    {/* Chair back */}
    <mesh position={[0, 0.85, -0.24]} castShadow>
      <boxGeometry args={[0.55, 0.85, 0.06]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </mesh>
    {/* Chair legs — 4 */}
    {[[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].map(([x, z], i) => (
      <mesh key={`leg-${i}`} position={[x, 0.19, z]}>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
    ))}
    {/* Cushion */}
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[0.52, 0.08, 0.48]} />
      <meshStandardMaterial color="#d4a8a0" roughness={0.85} />
    </mesh>
    {/* Side table */}
    <mesh position={[0.85, 0.46, 0]} castShadow>
      <boxGeometry args={[0.42, 0.05, 0.42]} />
      <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
    </mesh>
    {/* Table single leg post */}
    <mesh position={[0.85, 0.22, 0]}>
      <cylinderGeometry args={[0.04, 0.05, 0.44, 6]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* Table base disc */}
    <mesh position={[0.85, 0.02, 0]}>
      <cylinderGeometry args={[0.16, 0.18, 0.04, 8]} />
      <meshStandardMaterial color="#5a3d28" roughness={0.95} />
    </mesh>
    {/* Open book on table (V-shape — two slanted planes) */}
    <mesh position={[0.78, 0.5, 0]} rotation={[-0.3, 0, 0.15]}>
      <boxGeometry args={[0.16, 0.01, 0.22]} />
      <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
    </mesh>
    <mesh position={[0.92, 0.5, 0]} rotation={[-0.3, 0, -0.15]}>
      <boxGeometry args={[0.16, 0.01, 0.22]} />
      <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
    </mesh>
    {/* Book spine */}
    <mesh position={[0.85, 0.495, 0]} rotation={[-0.3, 0, 0]}>
      <boxGeometry args={[0.04, 0.02, 0.22]} />
      <meshStandardMaterial color="#7a4a28" roughness={0.85} />
    </mesh>
    {/* Teacup */}
    <mesh position={[0.92, 0.52, 0.13]}>
      <cylinderGeometry args={[0.05, 0.04, 0.07, 8]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </mesh>
    {/* Teacup handle */}
    <mesh position={[0.98, 0.53, 0.13]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[0.025, 0.008, 4, 8, Math.PI]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </mesh>
    {/* Saucer */}
    <mesh position={[0.92, 0.49, 0.13]}>
      <cylinderGeometry args={[0.08, 0.08, 0.008, 12]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </mesh>
  </group>
);

// Ema tablets — wooden wish tablets (Japanese ema-style) hanging dari
// horizontal beam di antara 2 post. Tiap tag punya warna soft pastel
// + tali pendek. Soft sway via useFrame (random phase per tag).
// Thematic core untuk "Telaga Harapan" — visualisasi harapan literal.
const EMA_TAG_DEFS = Array.from({ length: 8 }, (_, i) => ({
  x: -1.6 + i * 0.45,
  color: ['#f4a8c0', '#ffd470', '#c4d8a8', '#a8c8e8', '#d4a8e0'][i % 5],
  phase: i * 0.7,
  rope: 0.35 + (i % 3) * 0.08,
}));
const EmaTablets = ({ pos, rot = 0, isMobile = false }) => {
  const tagsRef = useRef([]);
  const defs = isMobile ? EMA_TAG_DEFS.slice(0, 5) : EMA_TAG_DEFS;
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    tagsRef.current.forEach((ref, i) => {
      if (!ref) return;
      const def = defs[i];
      if (!def) return;
      ref.rotation.z = Math.sin(t * 0.8 + def.phase) * 0.08;
      ref.rotation.x = Math.cos(t * 0.6 + def.phase) * 0.05;
    });
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* 2 posts */}
      <mesh position={[-2.0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      <mesh position={[2.0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 2.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 4.2, 6]} />
        <meshStandardMaterial color="#6a4d2f" roughness={0.95} />
      </mesh>
      {/* Decorative top caps */}
      <mesh position={[-2.0, 2.18, 0]}>
        <coneGeometry args={[0.11, 0.16, 5]} />
        <meshStandardMaterial color="#3d2818" roughness={0.9} />
      </mesh>
      <mesh position={[2.0, 2.18, 0]}>
        <coneGeometry args={[0.11, 0.16, 5]} />
        <meshStandardMaterial color="#3d2818" roughness={0.9} />
      </mesh>
      {/* Tablets hanging */}
      {defs.map((def, i) => (
        <group
          key={`ema-${i}`}
          ref={(el) => {
            tagsRef.current[i] = el;
          }}
          position={[def.x, 2.05, 0]}
        >
          {/* Tali */}
          <mesh position={[0, -def.rope / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, def.rope, 3]} />
            <meshStandardMaterial color="#5a4d3a" roughness={1} />
          </mesh>
          {/* Wood tag — pentagon-ish: use box w/ small triangle top */}
          <mesh position={[0, -def.rope - 0.15, 0]} castShadow>
            <boxGeometry args={[0.26, 0.3, 0.025]} />
            <meshStandardMaterial color={def.color} roughness={0.85} />
          </mesh>
          {/* Top triangle accent (small cone) */}
          <mesh position={[0, -def.rope - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.13, 0.08, 4]} />
            <meshStandardMaterial color={def.color} roughness={0.85} />
          </mesh>
          {/* Tiny "writing" dot */}
          <mesh position={[0, -def.rope - 0.15, 0.014]}>
            <boxGeometry args={[0.14, 0.02, 0.001]} />
            <meshStandardMaterial color="#3d2818" roughness={0.95} />
          </mesh>
          <mesh position={[0, -def.rope - 0.2, 0.014]}>
            <boxGeometry args={[0.1, 0.02, 0.001]} />
            <meshStandardMaterial color="#3d2818" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Stone toro lantern — Japanese stone lantern. Stack: base + middle
// shaft + chamber + roof. Soft warm pointLight di chamber utk senja
// glow. Place sebagai pasangan flanking pond.
const StoneToro = ({ pos, rot = 0, withLight = true }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Base block */}
    <mesh position={[0, 0.12, 0]} castShadow>
      <cylinderGeometry args={[0.4, 0.42, 0.24, 6]} />
      <meshStandardMaterial color="#7a7065" roughness={1} />
    </mesh>
    {/* Lower middle */}
    <mesh position={[0, 0.42, 0]}>
      <cylinderGeometry args={[0.18, 0.22, 0.32, 6]} />
      <meshStandardMaterial color="#8a7d70" roughness={1} />
    </mesh>
    {/* Mid platform */}
    <mesh position={[0, 0.62, 0]}>
      <cylinderGeometry args={[0.32, 0.32, 0.06, 6]} />
      <meshStandardMaterial color="#7a7065" roughness={1} />
    </mesh>
    {/* Chamber (lantern body) — open box dgn warm glow */}
    <mesh position={[0, 0.86, 0]}>
      <cylinderGeometry args={[0.24, 0.24, 0.36, 6]} />
      <meshStandardMaterial
        color="#f4d098"
        emissive="#ffb070"
        emissiveIntensity={withLight ? 0.6 : 0.95}
        transparent
        opacity={0.85}
      />
    </mesh>
    {/* Roof — wide hex cap */}
    <mesh position={[0, 1.13, 0]} castShadow>
      <coneGeometry args={[0.42, 0.22, 6]} />
      <meshStandardMaterial color="#6a605a" roughness={1} />
    </mesh>
    {/* Top finial */}
    <mesh position={[0, 1.32, 0]}>
      <sphereGeometry args={[0.06, 6, 5]} />
      <meshStandardMaterial color="#7a7065" roughness={1} />
    </mesh>
    {/* Warm glow */}
    {withLight && (
      <pointLight position={[0, 0.86, 0]} intensity={0.5} distance={4.5} color="#ffb070" />
    )}
  </group>
);
const STONE_TORO_DEFS = [
  { pos: [-3, 0, 14], rot: 0.3 },
  { pos: [3, 0, -14], rot: 2.4 },
];
const StoneToros = ({ isMobile }) => {
  const list = isMobile ? STONE_TORO_DEFS.slice(0, 1) : STONE_TORO_DEFS;
  // Mobile: bump emissive, skip pointLight
  return (
    <>
      {list.map((d, i) => (
        <StoneToro key={`toro-${i}`} pos={d.pos} rot={d.rot} withLight={!isMobile} />
      ))}
    </>
  );
};

// Wind chime — hanging dari top short post. 5 tubes brass + circular
// top cap + small wind catcher di bawah. Sway via useFrame. Low cost
// detail tapi atmospheric.
const WindChime = ({ pos, rot = 0 }) => {
  const chimeRef = useRef();
  useFrame((state) => {
    if (chimeRef.current) {
      const t = state.clock.elapsedTime;
      chimeRef.current.rotation.z = Math.sin(t * 1.2) * 0.1;
      chimeRef.current.rotation.x = Math.cos(t * 0.9) * 0.08;
    }
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Tall post */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 2.6, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Horizontal arm */}
      <mesh position={[0.45, 2.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      <mesh position={[0.85, 2.55, 0]}>
        <sphereGeometry args={[0.05, 6, 5]} />
        <meshStandardMaterial color="#3d2818" roughness={0.9} />
      </mesh>
      {/* Chime assembly hanging */}
      <group ref={chimeRef} position={[0.85, 2.5, 0]}>
        {/* Rope from arm */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.12, 3]} />
          <meshStandardMaterial color="#5a4d3a" roughness={1} />
        </mesh>
        {/* Top disc */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 8]} />
          <meshStandardMaterial color="#a8702a" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* 5 tubes hanging */}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          const r = 0.085;
          return (
            <mesh key={i} position={[Math.cos(a) * r, -0.45, Math.sin(a) * r]}>
              <cylinderGeometry args={[0.015, 0.015, 0.5 - (i % 3) * 0.05, 5]} />
              <meshStandardMaterial color="#d4a868" roughness={0.4} metalness={0.7} />
            </mesh>
          );
        })}
        {/* Center striker disc */}
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 8]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Wind catcher leaf di bawah */}
        <mesh position={[0, -0.78, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.12, 0.18, 0.008]} />
          <meshStandardMaterial
            color="#6a4838"
            emissive="#c4544c"
            emissiveIntensity={0.15}
            roughness={0.7}
          />
        </mesh>
        {/* String connecting striker to catcher */}
        <mesh position={[0, -0.66, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.22, 3]} />
          <meshStandardMaterial color="#5a4d3a" roughness={1} />
        </mesh>
      </group>
    </group>
  );
};

// Sleeping cat — small curled cat on top of log pile or bench.
// Stylized: ellipsoid body + smaller head + 2 ear cones. Subtle
// breathing scale via useFrame.
const SleepingCat = ({ pos, rot = 0, color = '#d4a868' }) => {
  const bodyRef = useRef();
  useFrame((state) => {
    if (bodyRef.current) {
      const t = state.clock.elapsedTime;
      // Subtle breathing
      const s = 1 + Math.sin(t * 1.4) * 0.025;
      bodyRef.current.scale.set(s, s, s);
    }
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <group ref={bodyRef}>
        {/* Body — curled ellipsoid (sphere scaled) */}
        <mesh position={[0, 0.12, 0]} scale={[0.32, 0.18, 0.22]} castShadow>
          <sphereGeometry args={[1, 10, 7]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        {/* Tail wrapped around — torus partial */}
        <mesh position={[0.16, 0.12, 0]} rotation={[Math.PI / 2, 0, 0.4]}>
          <torusGeometry args={[0.18, 0.04, 6, 12, Math.PI * 1.4]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        {/* Head — smaller sphere offset */}
        <mesh position={[-0.22, 0.14, 0.04]} scale={[0.13, 0.12, 0.13]}>
          <sphereGeometry args={[1, 8, 7]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        {/* Ear L */}
        <mesh position={[-0.28, 0.22, 0.0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.03, 0.06, 4]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        {/* Ear R */}
        <mesh position={[-0.28, 0.22, 0.08]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.03, 0.06, 4]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        {/* Stripe pattern accent (darker bands) */}
        <mesh position={[0.0, 0.21, 0]} scale={[0.28, 0.05, 0.2]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#a87838" roughness={0.85} transparent opacity={0.45} />
        </mesh>
      </group>
    </group>
  );
};

// Paper crane garland — line of origami cranes hanging dari string
// antara 2 short posts. Cranes pakai stylized: body diamond + 2 wing
// triangles. Gentle sway useFrame per crane dgn phase shift.
const CRANE_COLORS = ['#f4a8c0', '#a8c8e8', '#ffd470', '#c4d8a8', '#d4a8e0', '#f4b890'];
const PaperCraneGarland = ({ pos, rot = 0, isMobile }) => {
  const count = isMobile ? 4 : 7;
  const cranesRef = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    cranesRef.current.forEach((ref, i) => {
      if (!ref) return;
      ref.rotation.z = Math.sin(t * 0.9 + i * 0.6) * 0.18;
      ref.rotation.y = Math.cos(t * 1.1 + i * 0.4) * 0.25;
      ref.position.y = 1.85 + Math.sin(t * 1.3 + i * 0.5) * 0.04;
    });
  });
  const span = 3.6;
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* 2 short posts */}
      <mesh position={[-span / 2, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 2.0, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      <mesh position={[span / 2, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 2.0, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Suspended string — slight sag approximated dgn straight cylinder */}
      <mesh position={[0, 2.0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, span, 3]} />
        <meshStandardMaterial color="#f4ecd8" roughness={1} />
      </mesh>
      {/* Cranes */}
      {Array.from({ length: count }).map((_, i) => {
        const x = -span / 2 + 0.3 + (i / Math.max(count - 1, 1)) * (span - 0.6);
        const color = CRANE_COLORS[i % CRANE_COLORS.length];
        return (
          <group
            key={`crane-${i}`}
            ref={(el) => {
              cranesRef.current[i] = el;
            }}
            position={[x, 1.85, 0]}
          >
            {/* Hanging string */}
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.15, 3]} />
              <meshStandardMaterial color="#5a4d3a" roughness={1} />
            </mesh>
            {/* Body — diamond approx (rotated box) */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.14, 0.14, 0.04]} />
              <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            {/* Wings — 2 triangles (cones) */}
            <mesh position={[-0.08, 0.04, 0]} rotation={[0, 0, 0.5]}>
              <coneGeometry args={[0.06, 0.16, 3]} />
              <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0.08, 0.04, 0]} rotation={[0, 0, -0.5]}>
              <coneGeometry args={[0.06, 0.16, 3]} />
              <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            {/* Head/beak — small cone forward */}
            <mesh position={[-0.05, 0.05, 0.05]} rotation={[0.5, 0, 0]}>
              <coneGeometry args={[0.02, 0.08, 4]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// Torii gate — iconic Japanese red gate, BIG landmark. 2 vertical
// red pillars + curved top "kasagi" + straight "shimaki" below.
// Place sebagai entrance approach di corner.
const Torii = ({ pos, rot = 0, scale = 1 }) => {
  const PILLAR_H = 4.0 * scale;
  const SPAN = 3.4 * scale;
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Pillars (slightly tilted inward for authentic shape) */}
      <mesh position={[-SPAN / 2, PILLAR_H / 2, 0]} rotation={[0, 0, 0.025]} castShadow>
        <cylinderGeometry args={[0.18 * scale, 0.22 * scale, PILLAR_H, 8]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
      </mesh>
      <mesh position={[SPAN / 2, PILLAR_H / 2, 0]} rotation={[0, 0, -0.025]} castShadow>
        <cylinderGeometry args={[0.18 * scale, 0.22 * scale, PILLAR_H, 8]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
      </mesh>
      {/* Shimaki — straight beam below curved top */}
      <mesh position={[0, PILLAR_H - 0.45 * scale, 0]} castShadow>
        <boxGeometry args={[SPAN + 0.3 * scale, 0.22 * scale, 0.35 * scale]} />
        <meshStandardMaterial color="#3d2818" roughness={0.85} />
      </mesh>
      {/* Kasagi — curved top beam (approximated dgn wider box + 2 end caps) */}
      <mesh position={[0, PILLAR_H - 0.15 * scale, 0]} castShadow>
        <boxGeometry args={[SPAN + 1.0 * scale, 0.28 * scale, 0.45 * scale]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
      </mesh>
      {/* Upturned end caps on kasagi */}
      <mesh
        position={[-(SPAN + 1.0 * scale) / 2 + 0.08, PILLAR_H + 0.02 * scale, 0]}
        rotation={[0, 0, 0.3]}
      >
        <boxGeometry args={[0.4 * scale, 0.28 * scale, 0.45 * scale]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
      </mesh>
      <mesh
        position={[(SPAN + 1.0 * scale) / 2 - 0.08, PILLAR_H + 0.02 * scale, 0]}
        rotation={[0, 0, -0.3]}
      >
        <boxGeometry args={[0.4 * scale, 0.28 * scale, 0.45 * scale]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
      </mesh>
      {/* Center plaque (gakuzuka) */}
      <mesh position={[0, PILLAR_H - 0.85 * scale, 0]}>
        <boxGeometry args={[0.5 * scale, 0.4 * scale, 0.1 * scale]} />
        <meshStandardMaterial color="#e8d098" roughness={0.85} />
      </mesh>
      <mesh position={[0, PILLAR_H - 0.85 * scale, 0.055 * scale]}>
        <boxGeometry args={[0.32 * scale, 0.18 * scale, 0.01 * scale]} />
        <meshStandardMaterial color="#3d2818" roughness={0.9} />
      </mesh>
      {/* Tie at base pillars */}
      <mesh position={[-SPAN / 2, 0.5 * scale, 0]}>
        <cylinderGeometry args={[0.23 * scale, 0.23 * scale, 0.12 * scale, 8]} />
        <meshStandardMaterial color="#3d2818" roughness={0.85} />
      </mesh>
      <mesh position={[SPAN / 2, 0.5 * scale, 0]}>
        <cylinderGeometry args={[0.23 * scale, 0.23 * scale, 0.12 * scale, 8]} />
        <meshStandardMaterial color="#3d2818" roughness={0.85} />
      </mesh>
    </group>
  );
};

// Jizo statue — small stylized stone Buddha figure dengan red knit
// bib. Iconic Japanese guardian statue, scatter di outer/path area.
const JizoStatue = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Stone base */}
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.18, 0.2, 0.12, 8]} />
      <meshStandardMaterial color="#6a605a" roughness={1} />
    </mesh>
    {/* Body — pear-shaped (cylinder + sphere top) */}
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.14, 0.16, 0.4, 8]} />
      <meshStandardMaterial color="#a8a098" roughness={0.95} />
    </mesh>
    {/* Head — round dome */}
    <mesh position={[0, 0.62, 0]}>
      <sphereGeometry args={[0.15, 10, 8]} />
      <meshStandardMaterial color="#a8a098" roughness={0.95} />
    </mesh>
    {/* Eyes — closed (small slit dots) */}
    <mesh position={[-0.05, 0.64, 0.13]}>
      <boxGeometry args={[0.025, 0.005, 0.001]} />
      <meshStandardMaterial color="#3a2818" roughness={1} />
    </mesh>
    <mesh position={[0.05, 0.64, 0.13]}>
      <boxGeometry args={[0.025, 0.005, 0.001]} />
      <meshStandardMaterial color="#3a2818" roughness={1} />
    </mesh>
    {/* Small mouth */}
    <mesh position={[0, 0.6, 0.135]}>
      <boxGeometry args={[0.02, 0.004, 0.001]} />
      <meshStandardMaterial color="#3a2818" roughness={1} />
    </mesh>
    {/* Red knit bib — soft hanging cloth */}
    <mesh position={[0, 0.5, 0.08]} rotation={[0.3, 0, 0]}>
      <boxGeometry args={[0.28, 0.14, 0.02]} />
      <meshStandardMaterial color="#8a5a3a" roughness={0.85} />
    </mesh>
    {/* Bib bottom — slightly wider */}
    <mesh position={[0, 0.42, 0.1]} rotation={[0.4, 0, 0]}>
      <boxGeometry args={[0.3, 0.08, 0.02]} />
      <meshStandardMaterial color="#6a4028" roughness={0.85} />
    </mesh>
  </group>
);
const JIZO_DEFS = [
  { pos: [-8, 0, -16], rot: 0.4 },
  { pos: [10, 0, 16], rot: 2.8 },
  { pos: [-21, 0, 9], rot: 1.2 },
];
const Jizos = ({ isMobile }) => {
  const list = isMobile ? JIZO_DEFS.slice(0, 2) : JIZO_DEFS;
  return (
    <>
      {list.map((d, i) => (
        <JizoStatue key={`jizo-${i}`} pos={d.pos} rot={d.rot} />
      ))}
    </>
  );
};

// Bamboo grove — cluster of tall thin bamboo stalks dgn segmented
// node rings. Light green color, vertical accent contrast dgn round
// tree canopies.
const BambooStalk = ({ pos, height = 4.2, color = '#8ba868' }) => {
  // Node rings sepanjang stalk
  const nodes = Array.from({ length: Math.floor(height / 0.6) }, (_, i) => 0.4 + i * 0.6);
  return (
    <group position={pos}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, height, 6]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Nodes */}
      {nodes.map((y, i) => (
        <mesh key={`node-${i}`} position={[0, y, 0]}>
          <cylinderGeometry args={[0.082, 0.082, 0.03, 6]} />
          <meshStandardMaterial color="#5a7045" roughness={0.95} />
        </mesh>
      ))}
      {/* Top leaves — 3 small horizontal sprays */}
      <mesh position={[0.1, height - 0.2, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.35, 0.04, 0.08]} />
        <meshStandardMaterial color="#7a9858" roughness={0.85} />
      </mesh>
      <mesh position={[-0.08, height - 0.4, 0.1]} rotation={[0.3, 0.5, -0.4]}>
        <boxGeometry args={[0.3, 0.04, 0.08]} />
        <meshStandardMaterial color="#6e8c4c" roughness={0.85} />
      </mesh>
      <mesh position={[0.05, height - 0.6, -0.08]} rotation={[-0.2, 0.3, 0.4]}>
        <boxGeometry args={[0.32, 0.04, 0.08]} />
        <meshStandardMaterial color="#7a9858" roughness={0.85} />
      </mesh>
    </group>
  );
};
const BAMBOO_STALK_DEFS = (() => {
  // 7 stalks in tight cluster ~1.5u radius
  const arr = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.5;
    const r = 0.4 + (i % 3) * 0.35;
    arr.push({
      offset: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      height: 3.8 + (i % 4) * 0.4,
      color: ['#8ba868', '#9ab070', '#7a9858', '#8ba868'][i % 4],
    });
  }
  return arr;
})();
const BambooGrove = ({ pos, isMobile }) => {
  const list = isMobile ? BAMBOO_STALK_DEFS.slice(0, 5) : BAMBOO_STALK_DEFS;
  return (
    <group position={pos}>
      {list.map((s, i) => (
        <BambooStalk key={`bamboo-${i}`} pos={s.offset} height={s.height} color={s.color} />
      ))}
    </group>
  );
};

// Rowboat tied at dock — wooden boat hull (open shell), 2 oars, bench
// seat. Floating on pond surface, gentle bob via useFrame.
const Rowboat = ({ pos, rot = 0 }) => {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      ref.current.position.y = 0.05 + Math.sin(t * 0.8) * 0.025;
      ref.current.rotation.z = Math.sin(t * 0.6) * 0.025;
    }
  });
  return (
    <group ref={ref} position={pos} rotation={[0, rot, 0]}>
      {/* Hull bottom — flattened sphere/capsule */}
      <mesh position={[0, 0.1, 0]} scale={[1.2, 0.18, 0.45]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
      </mesh>
      {/* Hull rim — thin top ring */}
      <mesh position={[0, 0.22, 0]} scale={[1.2, 0.04, 0.45]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Inside dark (hollow effect) */}
      <mesh position={[0, 0.18, 0]} scale={[1.1, 0.13, 0.4]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshStandardMaterial color="#2a1810" roughness={1} />
      </mesh>
      {/* Bench seat across middle */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.16, 0.04, 0.7]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
      </mesh>
      {/* Bench seat second */}
      <mesh position={[-0.55, 0.25, 0]}>
        <boxGeometry args={[0.14, 0.04, 0.65]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
      </mesh>
      {/* Oar L */}
      <mesh position={[0.1, 0.35, -0.5]} rotation={[0, -0.4, 0.4]}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Oar L blade */}
      <mesh position={[0.55, 0.18, -0.95]} rotation={[0, -0.4, 0.4]}>
        <boxGeometry args={[0.32, 0.04, 0.14]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
      </mesh>
      {/* Oar R */}
      <mesh position={[0.1, 0.35, 0.5]} rotation={[0, 0.4, 0.4]}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 6]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.95} />
      </mesh>
      {/* Oar R blade */}
      <mesh position={[0.55, 0.18, 0.95]} rotation={[0, 0.4, 0.4]}>
        <boxGeometry args={[0.32, 0.04, 0.14]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
      </mesh>
      {/* Mooring rope to dock direction (+x toward bank) */}
      <mesh position={[0.8, 0.22, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.012, 0.012, 1.2, 4]} />
        <meshStandardMaterial color="#5a4d3a" roughness={1} />
      </mesh>
    </group>
  );
};

// Flying flock — burung yang terbang di mid altitude (y=5-9), drift
// bareng dalam flock pattern. Tambahan ke Birds + HighBirdFlock yang
// udah ada (low + high).
const FLYING_FLOCK_COUNT = 8;
const FLYING_FLOCK_DEFS = Array.from({ length: FLYING_FLOCK_COUNT }, (_, i) => ({
  offsetX: (Math.random() - 0.5) * 4,
  offsetY: (Math.random() - 0.5) * 1.5,
  offsetZ: (Math.random() - 0.5) * 4,
  flapPhase: Math.random() * Math.PI * 2,
  flapFreq: 6 + Math.random() * 2,
}));
const FlyingFlock = ({ isMobile }) => {
  const list = isMobile
    ? FLYING_FLOCK_DEFS.slice(0, 5)
    : FLYING_FLOCK_DEFS;
  const refs = useRef([]);
  const flockRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Flock leader drift — circular orbit di y~7 around pond
    if (flockRef.current) {
      const orbitR = 16;
      flockRef.current.position.x = Math.cos(t * 0.18) * orbitR;
      flockRef.current.position.y = 7 + Math.sin(t * 0.3) * 0.8;
      flockRef.current.position.z = Math.sin(t * 0.18) * orbitR;
      // Face flying direction
      flockRef.current.rotation.y = -t * 0.18 + Math.PI / 2;
    }
    list.forEach((d, i) => {
      const r = refs.current[i];
      if (!r) return;
      // Wing flap via Y bob
      r.position.y = d.offsetY + Math.sin(t * d.flapFreq + d.flapPhase) * 0.08;
    });
  });
  return (
    <group ref={flockRef}>
      {list.map((d, i) => (
        <group
          key={`fflk-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[d.offsetX, d.offsetY, d.offsetZ]}
        >
          {/* Tiny V silhouette */}
          <mesh rotation={[0, 0, 0.3]} position={[-0.12, 0, 0]}>
            <boxGeometry args={[0.22, 0.025, 0.05]} />
            <meshBasicMaterial color="#3a3a48" fog={false} />
          </mesh>
          <mesh rotation={[0, 0, -0.3]} position={[0.12, 0, 0]}>
            <boxGeometry args={[0.22, 0.025, 0.05]} />
            <meshBasicMaterial color="#3a3a48" fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Pohon di perimeter danau — pond sekarang z=±18, jadi top/bottom
// trees dipindah ke z<-18 atau z>18 (di luar air). Side trees tetap
// di x=±12 (outside pond width ±7).
const BANK_TREE_POSITIONS = [
  // Kiri
  { pos: [-12.0, 0, -10], scale: 1.9 },
  { pos: [-11.5, 0, -1], scale: 1.7 },
  { pos: [-12.5, 0, 8], scale: 1.85 },
  // Kanan
  { pos: [12.0, 0, -11], scale: 1.75 },
  { pos: [12.5, 0, -2], scale: 2.0 },
  { pos: [11.8, 0, 10], scale: 1.6 },
  // Atas (-z, outside pond -18)
  { pos: [-7, 0, -20.5], scale: 1.8 },
  { pos: [3, 0, -21], scale: 2.0 },
  { pos: [9, 0, -20], scale: 1.65 },
  // Bawah (+z, outside pond 18)
  { pos: [-8, 0, 20], scale: 1.85 },
  { pos: [2, 0, 21], scale: 1.75 },
  { pos: [10, 0, 20.5], scale: 1.6 },
];

const BankTrees = ({ count }) => (
  <>
    {BANK_TREE_POSITIONS.slice(0, count ?? BANK_TREE_POSITIONS.length).map((t, i) => (
      <BankTree key={`bank-tree-${i}`} pos={t.pos} scale={t.scale} />
    ))}
  </>
);

// Danau lebar di tengah taman — RIVER_WIDTH × RIVER_LENGTH (deklarasi
// di top file untuk hindari TDZ). Deep night blue dengan metalness
// moderate + roughness sedang untuk reflection halus dari moonlight
// + lentera. Static (no shader wave) untuk performa.
// DROUGHT Tumbleweed — bola twigs kering yg "menggelinding" karena
// angin. Sphere irregular (icosahedron 0 detail) dgn 6 ranting kecil
// sticking out di angles random. Animated: rolling x position lurus
// across the bank, reset saat lewat batas. Plus spinning rotation
// supaya kerasa bener-bener nggelinding.
const Tumbleweed = ({ startX = -22, z = 0, speed = 1, yOffset = 0 }) => {
  const groupRef = useRef();
  const offsetRef = useRef(Math.random() * 40); // initial phase offset

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Range x: -22 → +22, reset (44 unit span)
    let x = startX + ((t * speed + offsetRef.current) % 44);
    if (x > 22) x -= 44;
    groupRef.current.position.x = x;
    groupRef.current.position.y =
      0.35 + Math.abs(Math.sin(t * speed * 2)) * 0.08 + yOffset;
    // Rolling rotation ngikut arah gerak
    groupRef.current.rotation.z = -t * speed * 2;
    groupRef.current.rotation.x = t * speed * 0.5;
  });

  return (
    <group ref={groupRef} position={[startX, 0.35, z]}>
      <mesh>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#5a4028"
          roughness={1}
          flatShading
        />
      </mesh>
      {/* 4 ranting kecil sticking out di angles */}
      {[
        [0.3, 0, 0, 0, 0, 0.4],
        [-0.3, 0.1, 0.1, 0, 0, -0.3],
        [0.1, 0.25, -0.2, 0.4, 0, 0],
        [-0.1, -0.2, 0.25, -0.3, 0.2, 0],
      ].map((args, i) => (
        <mesh
          key={i}
          position={[args[0], args[1], args[2]]}
          rotation={[args[3], args[4], args[5]]}
        >
          <cylinderGeometry args={[0.012, 0.018, 0.4, 4]} />
          <meshStandardMaterial color="#3a2818" roughness={1} />
        </mesh>
      ))}
    </group>
  );
};
const Tumbleweeds = () => (
  <>
    <Tumbleweed startX={-22} z={-8} speed={0.6} />
    <Tumbleweed startX={-22} z={6} speed={0.85} yOffset={0.02} />
    <Tumbleweed startX={-22} z={-16} speed={0.5} />
  </>
);

// DROUGHT Bones — small fragments tulang scattered di banks. Bukan
// dramatic skeleton, just subtle decay marker. 4 spot, each punya
// 2-3 piece (rib + skull-ish). Color bone white-gray.
const BONE_SPOTS = [
  { pos: [-13, 0, 10], rot: 0.4 },
  { pos: [16, 0, -7], rot: 1.3 },
  { pos: [-15, 0, -14], rot: -0.6 },
  { pos: [12, 0, 14], rot: 2.1 },
];
const BoneCluster = ({ pos, rot }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Skull-ish flatter sphere */}
    <mesh position={[0, 0.06, 0]} scale={[0.18, 0.12, 0.16]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#a8a098" roughness={0.95} />
    </mesh>
    {/* Rib 1 — elongated box */}
    <mesh
      position={[0.22, 0.03, 0.08]}
      rotation={[0, 0, 0.2]}
    >
      <boxGeometry args={[0.32, 0.04, 0.04]} />
      <meshStandardMaterial color="#988e84" roughness={0.95} />
    </mesh>
    {/* Rib 2 */}
    <mesh
      position={[0.18, 0.03, -0.1]}
      rotation={[0, 0.3, -0.15]}
    >
      <boxGeometry args={[0.28, 0.04, 0.04]} />
      <meshStandardMaterial color="#988e84" roughness={0.95} />
    </mesh>
  </group>
);
const Bones = () => (
  <>
    {BONE_SPOTS.map((b, i) => (
      <BoneCluster key={`bone-${i}`} {...b} />
    ))}
  </>
);

// DROUGHT DryWell — replacement utk WishingWell di gersang variant.
// Sumur kering: post kanan patah pendek, crossbar miring jatuh, roof
// tilt dramatic, bucket terguling di tanah (bukan dangling), rope putus
// fray pendek, dasar lumpur kering brown (bukan air hitam). Plus 2
// chipped stone fragments scattered di samping base — sisa puing yg
// rontok. Stronger storytelling vs canonical WishingWell: "dulu ada
// air, sekarang sumur pun mati".
const DryWell = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Stone base ring — weathered lighter gray-brown */}
    <mesh position={[0, 0.4, 0]} castShadow>
      <cylinderGeometry args={[0.7, 0.75, 0.8, 12]} />
      <meshStandardMaterial color="#7a6c58" roughness={1} />
    </mesh>
    {/* Chipped stone fragments — sisa puing yg rontok dari base */}
    <mesh position={[0.62, 0.16, 0.55]} rotation={[0.3, 0.4, 0.2]} castShadow>
      <boxGeometry args={[0.22, 0.18, 0.16]} />
      <meshStandardMaterial color="#6a5d4a" roughness={1} />
    </mesh>
    <mesh position={[-0.52, 0.13, -0.6]} rotation={[0.1, -0.5, 0.3]} castShadow>
      <boxGeometry args={[0.18, 0.14, 0.14]} />
      <meshStandardMaterial color="#6a5d4a" roughness={1} />
    </mesh>
    {/* Dasar — cracked dry mud bukan air, brown tone */}
    <mesh position={[0, 0.78, 0]}>
      <cylinderGeometry args={[0.55, 0.55, 0.05, 12]} />
      <meshStandardMaterial color="#4a3825" roughness={1} />
    </mesh>
    {/* Left post — masih berdiri tapi tilted slight */}
    <mesh position={[-0.55, 1.4, 0]} rotation={[0, 0, 0.08]}>
      <cylinderGeometry args={[0.05, 0.06, 1.4, 6]} />
      <meshStandardMaterial color="#4a3220" roughness={0.95} />
    </mesh>
    {/* Right post — patah pendek, jagged stub */}
    <mesh position={[0.55, 0.95, 0]} rotation={[0, 0, -0.12]}>
      <cylinderGeometry args={[0.05, 0.06, 0.7, 6]} />
      <meshStandardMaterial color="#4a3220" roughness={0.95} />
    </mesh>
    {/* Crossbar — miring krn right post collapse, ujung jatuh */}
    <mesh position={[-0.1, 2.0, 0]} rotation={[0, 0, -0.35]}>
      <cylinderGeometry args={[0.04, 0.04, 1.0, 6]} />
      <meshStandardMaterial color="#2d1d10" roughness={0.95} />
    </mesh>
    {/* Roof — peaked tilted dramatic (collapsed sideways) */}
    <mesh position={[0.15, 2.45, 0]} rotation={[0, 0, 0.25]} castShadow>
      <coneGeometry args={[0.85, 0.5, 4]} />
      <meshStandardMaterial color="#4a3520" roughness={0.95} />
    </mesh>
    {/* Bucket — tipped over di tanah samping well */}
    <mesh
      position={[0.85, 0.16, 0.7]}
      rotation={[Math.PI / 2 - 0.2, 0, 0.4]}
      castShadow
    >
      <cylinderGeometry args={[0.16, 0.14, 0.22, 8]} />
      <meshStandardMaterial color="#5a3d24" roughness={1} />
    </mesh>
    {/* Rope putus — short frayed end dangling dari crossbar */}
    <mesh position={[-0.25, 1.75, 0]} rotation={[0, 0, 0.1]}>
      <cylinderGeometry args={[0.012, 0.014, 0.4, 4]} />
      <meshStandardMaterial color="#4a3d2a" roughness={1} />
    </mesh>
  </group>
);

// DROUGHT GroundCracks — garis tipis gelap di tanah bank, kasih
// texture "tanah retak karena kekeringan". Distribusi deterministic
// via seeded RNG, hindari path & lake footprint.
const groundCrackRand = (() => {
  let s = 1187;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
})();
const GROUND_CRACK_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 24; i++) {
    const angle = groundCrackRand() * Math.PI * 2;
    const r = 13 + groundCrackRand() * 7; // radius 13-20, di luar lake
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    arr.push({
      pos: [x, 0.001, z], // sedikit di atas ground
      len: 1.2 + groundCrackRand() * 2.6,
      rot: groundCrackRand() * Math.PI,
    });
  }
  return arr;
})();
const GroundCracks = () => (
  <>
    {GROUND_CRACK_DEFS.map((c, i) => (
      <mesh
        key={`gcrack-${i}`}
        position={c.pos}
        rotation={[-Math.PI / 2, 0, c.rot]}
      >
        <planeGeometry args={[c.len, 0.05]} />
        <meshStandardMaterial color="#1a120a" roughness={1} />
      </mesh>
    ))}
  </>
);

// DROUGHT DriedGrassTufts — small clusters rumput kering yellow-brown,
// scattered di bank tanah. Bukan green grass alive (skipped) — ini
// rumput yang mati kering, masih berdiri tapi udah mati. 5 spike kecil
// per tuft. Mobile cull dari 24 → 12.
const driedGrassRand = (() => {
  let s = 2389;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
})();
const DRIED_GRASS_TUFT_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 24; i++) {
    const angle = driedGrassRand() * Math.PI * 2;
    const r = 12 + driedGrassRand() * 8;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      rot: driedGrassRand() * Math.PI,
      color:
        driedGrassRand() < 0.5
          ? '#7a6038'
          : driedGrassRand() < 0.75
          ? '#8a6c3a'
          : '#6a5430',
      h: 0.16 + driedGrassRand() * 0.06,
    });
  }
  return arr;
})();
const DriedGrassTuft = ({ pos, rot, color, h }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh
        key={i}
        position={[(i - 2) * 0.035, h / 2, ((i * 7) % 3 - 1) * 0.025]}
        rotation={[0, 0, (i - 2) * 0.12]}
      >
        <boxGeometry args={[0.013, h, 0.013]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    ))}
  </group>
);
const DriedGrassTufts = ({ isMobile }) => {
  const list = isMobile
    ? DRIED_GRASS_TUFT_DEFS.slice(0, 12)
    : DRIED_GRASS_TUFT_DEFS;
  return (
    <>
      {list.map((d, i) => (
        <DriedGrassTuft key={`dgt-${i}`} {...d} />
      ))}
    </>
  );
};

// DROUGHT BrokenPillars — 12 pilar batu pecah scattered di banks
// telaga. Sisa colonnade kuno yg dulu nge-frame taman, sekarang
// tinggal stubs + cap pecah. Port dari r1 PillarRuins, scaled buat
// area r3 yg lebih luas. Posisi hindari path/lake/struktur existing
// (gazebo, torii, mailbox, dll).
const BROKEN_PILLAR_DEFS = [
  { pos: [-9, 0, -7], h: 1.8, tilt: -0.08 },
  { pos: [9, 0, -8], h: 0.6, tilt: 0.12 },
  { pos: [-9, 0, 5], h: 1.3, tilt: -0.05 },
  { pos: [9, 0, 6], h: 0.5, tilt: 0.18 },
  { pos: [-15, 0, -1], h: 1.5, tilt: 0.1 },
  { pos: [15, 0, 3], h: 0.9, tilt: -0.08 },
  { pos: [-7, 0, -20], h: 1.6, tilt: 0.15 },
  { pos: [5, 0, -19], h: 0.7, tilt: -0.12 },
  { pos: [-3, 0, 22], h: 1.2, tilt: 0.06 },
  { pos: [13, 0, 18], h: 0.5, tilt: -0.18 },
  { pos: [-18, 0, 8], h: 1.4, tilt: 0.09 },
  { pos: [16, 0, -4], h: 0.8, tilt: -0.1 },
];
const BrokenPillar = ({ pos, h, tilt }) => (
  <group position={pos} rotation={[0, 0, tilt]}>
    {/* Base block — square footing */}
    <mesh position={[0, 0.12, 0]} castShadow>
      <boxGeometry args={[0.65, 0.24, 0.65]} />
      <meshStandardMaterial color="#5a4e3e" roughness={1} />
    </mesh>
    {/* Pilar shaft */}
    <mesh position={[0, 0.24 + h / 2, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.24, h, 8]} />
      <meshStandardMaterial color="#7a6e5e" roughness={1} />
    </mesh>
    {/* Patah cap di atas — irregular flat */}
    <mesh
      position={[0, 0.26 + h, 0]}
      rotation={[0.05, 0, 0.08]}
      castShadow
    >
      <cylinderGeometry args={[0.17, 0.21, 0.1, 8]} />
      <meshStandardMaterial color="#4a3e2e" roughness={1} />
    </mesh>
  </group>
);
const BrokenPillars = () => (
  <>
    {BROKEN_PILLAR_DEFS.map((p, i) => (
      <BrokenPillar key={`bpillar-${i}`} {...p} />
    ))}
  </>
);

// DROUGHT CrowsFlock — 5 burung gagak silhouette terbang lazy circles
// di atas lake. Black-on-smoggy-sky kerasa banget abandoned dead-town
// vibe. Lazy circle motion (slow lissajous), wing flap subtle, dark
// near-black material.
const CROW_DEFS = [
  { center: [0, 14, -2], radiusX: 12, radiusZ: 10, speed: 0.12, phase: 0 },
  { center: [-3, 16, 2], radiusX: 10, radiusZ: 9, speed: 0.1, phase: 1.7 },
  { center: [4, 13, -4], radiusX: 14, radiusZ: 11, speed: 0.14, phase: 3.4 },
  { center: [2, 17, 5], radiusX: 11, radiusZ: 10, speed: 0.09, phase: 5.0 },
  { center: [-6, 15, -3], radiusX: 13, radiusZ: 12, speed: 0.11, phase: 2.2 },
];
const Crow = ({ def }) => {
  const groupRef = useRef();
  const wingLRef = useRef();
  const wingRRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * def.speed + def.phase;
    // Lazy circle gerak dengan slight figure-8 (sin*2 di z)
    groupRef.current.position.x =
      def.center[0] + Math.cos(t) * def.radiusX;
    groupRef.current.position.y =
      def.center[1] + Math.sin(t * 0.7) * 0.5;
    groupRef.current.position.z =
      def.center[2] + Math.sin(t) * def.radiusZ;
    // Face direction of travel — tangent ke lingkaran
    groupRef.current.rotation.y = -t + Math.PI / 2;
    // Wing flap (subtle, slow — kerasa gliding bukan ngepak cepat)
    if (wingLRef.current && wingRRef.current) {
      const flap = Math.sin(state.clock.elapsedTime * 2.2 + def.phase) * 0.35;
      wingLRef.current.rotation.z = 0.3 + flap;
      wingRRef.current.rotation.z = -0.3 - flap;
    }
  });
  return (
    <group ref={groupRef}>
      {/* Body — small elongated box */}
      <mesh>
        <boxGeometry args={[0.4, 0.12, 0.16]} />
        <meshBasicMaterial color="#0d0a08" fog />
      </mesh>
      {/* Wing kiri */}
      <mesh ref={wingLRef} position={[0, 0, 0.08]}>
        <boxGeometry args={[0.35, 0.02, 0.45]} />
        <meshBasicMaterial color="#0d0a08" fog />
      </mesh>
      {/* Wing kanan */}
      <mesh ref={wingRRef} position={[0, 0, -0.08]}>
        <boxGeometry args={[0.35, 0.02, 0.45]} />
        <meshBasicMaterial color="#0d0a08" fog />
      </mesh>
    </group>
  );
};
const CrowsFlock = ({ isMobile }) => {
  const list = isMobile ? CROW_DEFS.slice(0, 3) : CROW_DEFS;
  return (
    <>
      {list.map((def, i) => (
        <Crow key={`crow-${i}`} def={def} />
      ))}
    </>
  );
};

// DROUGHT PerchedCrow — gagak diam hinggap di atas pillar tertinggi.
// Static (no useFrame) — kerasa "watching, waiting" vs flock yg terbang
// lazy circles. Static perch = ominous still, hugging silhouette. Body
// hunched (taller than flying variant), wings tucked flat samping body,
// kepala forward, beak tipis nongol.
const PerchedCrow = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Body — hunched perched posture, slightly tall */}
    <mesh>
      <boxGeometry args={[0.36, 0.2, 0.18]} />
      <meshBasicMaterial color="#0d0a08" fog />
    </mesh>
    {/* Head — cube forward */}
    <mesh position={[0.22, 0.1, 0]}>
      <boxGeometry args={[0.14, 0.14, 0.14]} />
      <meshBasicMaterial color="#0d0a08" fog />
    </mesh>
    {/* Beak — tiny dark pointer */}
    <mesh position={[0.32, 0.08, 0]}>
      <boxGeometry args={[0.07, 0.04, 0.04]} />
      <meshBasicMaterial color="#1a1208" fog />
    </mesh>
    {/* Wings tucked — folded flat against body sides */}
    <mesh position={[-0.02, 0, 0.1]}>
      <boxGeometry args={[0.32, 0.18, 0.04]} />
      <meshBasicMaterial color="#0d0a08" fog />
    </mesh>
    <mesh position={[-0.02, 0, -0.1]}>
      <boxGeometry args={[0.32, 0.18, 0.04]} />
      <meshBasicMaterial color="#0d0a08" fog />
    </mesh>
    {/* Tail — small protrusion belakang */}
    <mesh position={[-0.24, -0.04, 0]}>
      <boxGeometry args={[0.14, 0.06, 0.12]} />
      <meshBasicMaterial color="#0d0a08" fog />
    </mesh>
  </group>
);
// Posisi sesuai 3 pillar tertinggi (h>=1.5) di BROKEN_PILLAR_DEFS:
//   #0 [-9, 0, -7]   h=1.8 → y = 1.8 + 0.45 = 2.25
//   #4 [-15, 0, -1]  h=1.5 → y = 1.95
//   #6 [-7, 0, -20]  h=1.6 → y = 2.05
// y = h + 0.45 (clear cap + body half + small gap). rot variasi
// supaya tiap gagak menatap arah beda.
const PERCHED_CROW_DEFS = [
  { pos: [-9, 2.25, -7], rot: 0.6 },
  { pos: [-15, 1.95, -1], rot: 2.4 },
  { pos: [-7, 2.05, -20], rot: -1.2 },
];
const PerchedCrows = ({ isMobile }) => {
  const list = isMobile ? PERCHED_CROW_DEFS.slice(0, 2) : PERCHED_CROW_DEFS;
  return (
    <>
      {list.map((c, i) => (
        <PerchedCrow key={`pcrow-${i}`} pos={c.pos} rot={c.rot} />
      ))}
    </>
  );
};

// DROUGHT polusi — soft round particles drifting di udara, warna
// dirty smog brown. Pattern sama dgn r1 gersang PollutedAir, tapi
// count + spread di-tune buat luas r3 (40×40 area, vs r1 corridor
// 14×38). Pakai CanvasTexture radial gradient supaya particle render
// soft round bukan kotak default.
const makeSoftSmogTexture = () => {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};
const PollutedAir = ({ count = 180, isMobile = false }) => {
  const ref = useRef();
  const actualCount = isMobile ? Math.floor(count * 0.55) : count;
  const softTexture = useMemo(() => makeSoftSmogTexture(), []);

  const basePositions = useMemo(() => {
    const arr = new Float32Array(actualCount * 3);
    for (let i = 0; i < actualCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = 0.5 + Math.random() * 5.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return arr;
  }, [actualCount]);

  const phases = useMemo(() => {
    const arr = new Float32Array(actualCount);
    for (let i = 0; i < actualCount; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [actualCount]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < actualCount; i++) {
      const phase = phases[i];
      arr[i * 3] =
        basePositions[i * 3] + Math.sin(t * 0.1 + phase) * 0.6;
      arr[i * 3 + 1] =
        basePositions[i * 3 + 1] + Math.cos(t * 0.12 + phase * 1.3) * 0.2;
      arr[i * 3 + 2] =
        basePositions[i * 3 + 2] + Math.cos(t * 0.09 + phase) * 0.55;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={basePositions.slice()}
          count={actualCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={softTexture}
        size={2.2}
        color="#7a6850"
        transparent
        opacity={0.32}
        sizeAttenuation
        depthWrite={false}
        alphaTest={0.01}
      />
    </points>
  );
};

// DROUGHT: scattered dead branches & dried debris di banks (radius
// 14..18, di luar lake). Deterministic seeded placement. Kasih
// detail decay di tanah tandus, gak cuma flat plane.
const droughtRand = (() => {
  let s = 891;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
})();
const DROUGHT_BRANCH_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 18; i++) {
    const angle = droughtRand() * Math.PI * 2;
    const r = 13 + droughtRand() * 6;
    arr.push({
      pos: [Math.cos(angle) * r, 0.04, Math.sin(angle) * r],
      yaw: droughtRand() * Math.PI * 2,
      len: 0.45 + droughtRand() * 0.85,
      thick: 0.03 + droughtRand() * 0.03,
    });
  }
  return arr;
})();
const DroughtBranches = ({ isMobile }) => {
  const list = isMobile ? DROUGHT_BRANCH_DEFS.slice(0, 10) : DROUGHT_BRANCH_DEFS;
  return (
    <>
      {list.map((b, i) => (
        <group key={`dbr-${i}`} position={b.pos} rotation={[0, b.yaw, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[b.thick, b.thick * 1.3, b.len, 5]} />
            <meshStandardMaterial color="#2a1d12" roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
};

// DROUGHT VARIANT: River canonical (MeshReflectorMaterial deep teal
// water) DIGANTI DriedLakeBed — flat plane dgn warna cracked-dirt
// brown + crack lines patches on top biar visual "telaga yg kering".
// Footprint sama (RIVER_WIDTH × RIVER_LENGTH) jadi semua component
// yang reference koordinat lake masih align.
const DRIED_BED_CRACK_DEFS = (() => {
  // Deterministic seeded random buat placement konsisten
  let seed = 547;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const arr = [];
  for (let i = 0; i < 28; i++) {
    arr.push({
      pos: [
        (rand() - 0.5) * (RIVER_WIDTH - 1),
        0,
        (rand() - 0.5) * (RIVER_LENGTH - 1),
      ],
      len: 0.8 + rand() * 2.4,
      rot: rand() * Math.PI,
      shade: rand() > 0.5 ? '#2a1a10' : '#3a2818',
    });
  }
  return arr;
})();
const River = ({ isMobile = false }) => (
  <group>
    {/* Dasar telaga kering — warna sandy brown match drought ground.
        Tetap di y=-0.05 supaya stepping stones + dock + bridge masih
        align dengan koordinat canonical. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[RIVER_WIDTH, RIVER_LENGTH]} />
      <meshStandardMaterial
        color="#4a3320"
        roughness={1}
        metalness={0}
      />
    </mesh>
    {/* Patches gelap di permukaan dasar — kasih variasi tone "tanah
        pecah" bukan flat plane. Mobile cull half. */}
    {(isMobile
      ? DRIED_BED_CRACK_DEFS.slice(0, 14)
      : DRIED_BED_CRACK_DEFS
    ).map((c, i) => (
      <mesh
        key={`bed-crack-${i}`}
        position={[c.pos[0], -0.045, c.pos[2]]}
        rotation={[-Math.PI / 2, 0, c.rot]}
      >
        <planeGeometry args={[c.len, 0.06]} />
        <meshStandardMaterial color={c.shade} roughness={1} />
      </mesh>
    ))}
  </group>
);

// Banks rumput keliling 4 sisi danau + lapangan taman luar. Tone
// earthy-green (slightly desaturated) — biar dense grass blades di
// atasnya yang ngasih warna utama, plane bawah cuma jadi base supaya
// nggak ada gap. Tiap bank tone sedikit beda untuk break uniformity.
// Bank — single circle ground r=24 (was 32, kecilin per user). Plus
// jalan setapak rect strips di 3 sisi pond (sisi kiri sudah covered
// oleh WalkPath existing). 4 sisi total surround pond untuk perimeter
// walkway feel.
// DROUGHT VARIANT: Banks main ground circle warna green grass (#5b7544
// canonical) diganti sandy-brown tandus #5a4530. Gravel bank strips di
// 3 sisi pond shifted ke warm-gray-brown lebih kering. Konsisten sama
// fog brown dusty + DriedLakeBed.
const Banks = () => (
  <>
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.07, 0]}
      receiveShadow
    >
      <circleGeometry args={[36, 56]} />
      <meshStandardMaterial color="#5a4530" roughness={1} />
    </mesh>
    {/* Top (z<0 side) — dried gravel strip */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, -(RIVER_LENGTH / 2 + 0.8)]}
      receiveShadow
    >
      <planeGeometry args={[RIVER_WIDTH + 2.8, 1.4]} />
      <meshStandardMaterial color="#6a5440" roughness={0.95} />
    </mesh>
    {/* Bottom (z>0 side) */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, RIVER_LENGTH / 2 + 0.8]}
      receiveShadow
    >
      <planeGeometry args={[RIVER_WIDTH + 2.8, 1.4]} />
      <meshStandardMaterial color="#6a5440" roughness={0.95} />
    </mesh>
    {/* Right (+x side, di belakang dock) */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[RIVER_WIDTH / 2 + 0.8, -0.05, 0]}
      receiveShadow
    >
      <planeGeometry args={[1.4, RIVER_LENGTH + 2]} />
      <meshStandardMaterial color="#6a5440" roughness={0.95} />
    </mesh>
  </>
);

// Walking path — gravel-toned strip di sepanjang bank kiri (-x),
// parallel sama danau. Tone warm-gray (#5a4f42) supaya kelihatan
// distinct dari grass banks. Lebar 1.4, panjang sesuai danau.
const WalkPath = () => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[-(RIVER_WIDTH / 2 + 1.5), -0.03, 0]}
  >
    <planeGeometry args={[1.4, RIVER_LENGTH + 1]} />
    <meshStandardMaterial color="#5a4f42" roughness={1} />
  </mesh>
);

// Wooden bench di shore kiri menghadap air — sandaran + tempat duduk
// + 2 kaki. Pengunjung "virtual" duduk di sini, lihat teratai. Posisi
// di z=-2 supaya kelihatan dari camera default angle yang nempel ke
// sisi kanan.
const Bench = () => (
  <group position={[-(RIVER_WIDTH / 2 + 2.5), 0, -2]} rotation={[0, Math.PI / 2, 0]}>
    {/* Tempat duduk (seat plank) */}
    <mesh position={[0, 0.45, 0]} castShadow>
      <boxGeometry args={[1.6, 0.06, 0.4]} />
      <meshStandardMaterial color="#4a3a26" roughness={0.85} />
    </mesh>
    {/* Sandaran (back rest) */}
    <mesh position={[0, 0.75, -0.18]} castShadow>
      <boxGeometry args={[1.6, 0.5, 0.06]} />
      <meshStandardMaterial color="#4a3a26" roughness={0.85} />
    </mesh>
    {/* Kaki kiri */}
    <mesh position={[-0.65, 0.22, 0]}>
      <boxGeometry args={[0.08, 0.45, 0.32]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
    {/* Kaki kanan */}
    <mesh position={[0.65, 0.22, 0]}>
      <boxGeometry args={[0.08, 0.45, 0.32]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
    {/* Sandaran tangan kiri */}
    <mesh position={[-0.78, 0.55, 0]}>
      <boxGeometry args={[0.08, 0.25, 0.4]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
    {/* Sandaran tangan kanan */}
    <mesh position={[0.78, 0.55, 0]}>
      <boxGeometry args={[0.08, 0.25, 0.4]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
  </group>
);

// Pengunjung duduk di bench — figur low-poly dengan transform sama dgn
// bench. Inner group offset y=0.48 = seat surface (jadi y=0 internal =
// permukaan tempat duduk). Hip di z=-0.05 (sedikit ke arah back rest),
// kaki extend ke +z (arah danau). Upper body (torso+kepala+lengan)
// di-group supaya breathing sway gerak natural sebagai satu unit.
const BenchVisitor = () => {
  const upperRef = useRef();
  useFrame((state) => {
    if (!upperRef.current) return;
    const t = state.clock.elapsedTime;
    upperRef.current.position.y = Math.sin(t * 1.0) * 0.008;
  });
  return (
    <group
      position={[-(RIVER_WIDTH / 2 + 2.5), 0, -2]}
      rotation={[0, Math.PI / 2, 0]}
    >
      <group position={[0, 0.48, -0.05]}>
        {/* Upper body — naik-turun pelan (breathing) */}
        <group ref={upperRef}>
          {/* Torso — sweater abu-tua, bottom nempel di atas paha (y=0.07) */}
          <mesh position={[0, 0.27, 0]} castShadow>
            <boxGeometry args={[0.32, 0.4, 0.22]} />
            <meshStandardMaterial color="#5a6878" roughness={0.9} />
          </mesh>
          {/* Kepala — di atas leher pendek */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <sphereGeometry args={[0.13, 14, 10]} />
            <meshStandardMaterial color="#d8b89a" roughness={0.85} />
          </mesh>
          {/* Rambut — hemisphere gelap di top kepala, sedikit ke belakang */}
          <mesh position={[0, 0.68, -0.02]}>
            <sphereGeometry
              args={[0.138, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color="#2a2218" roughness={0.95} />
          </mesh>
          {/* Lengan kiri — shoulder belakang & atas, hand di pangkuan */}
          <mesh
            position={[-0.18, 0.25, 0.05]}
            rotation={[-0.5, 0, 0.12]}
            castShadow
          >
            <cylinderGeometry args={[0.05, 0.05, 0.36, 8]} />
            <meshStandardMaterial color="#5a6878" roughness={0.9} />
          </mesh>
          {/* Lengan kanan */}
          <mesh
            position={[0.18, 0.25, 0.05]}
            rotation={[-0.5, 0, -0.12]}
            castShadow
          >
            <cylinderGeometry args={[0.05, 0.05, 0.36, 8]} />
            <meshStandardMaterial color="#5a6878" roughness={0.9} />
          </mesh>
        </group>
        {/* Paha — horizontal, dari pinggul ke arah danau, duduk di seat */}
        <mesh
          position={[-0.08, 0.07, 0.18]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
          <meshStandardMaterial color="#2c3848" roughness={0.92} />
        </mesh>
        <mesh
          position={[0.08, 0.07, 0.18]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
          <meshStandardMaterial color="#2c3848" roughness={0.92} />
        </mesh>
        {/* Betis — vertical turun dari lutut (z=0.38) */}
        <mesh position={[-0.08, -0.14, 0.4]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.42, 8]} />
          <meshStandardMaterial color="#2c3848" roughness={0.92} />
        </mesh>
        <mesh position={[0.08, -0.14, 0.4]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.42, 8]} />
          <meshStandardMaterial color="#2c3848" roughness={0.92} />
        </mesh>
        {/* Sepatu kecil — di ujung betis, sedikit forward */}
        <mesh position={[-0.08, -0.38, 0.46]} castShadow>
          <boxGeometry args={[0.1, 0.06, 0.16]} />
          <meshStandardMaterial color="#1a1410" roughness={0.85} />
        </mesh>
        <mesh position={[0.08, -0.38, 0.46]} castShadow>
          <boxGeometry args={[0.1, 0.06, 0.16]} />
          <meshStandardMaterial color="#1a1410" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
};

// Wooden dock (dermaga kecil) yang menjulur dari shore +x ke air.
// 4 plank kayu sejajar + 4 pilar pendukung di air. Posisi z=4 supaya
// nggak overlap dengan bench area yang di z=-2.
const Dock = () => {
  const PLANK_LENGTH = 3.6;
  const PLANK_WIDTH = 1.6;
  const baseX = RIVER_WIDTH / 2 + 0.2;
  return (
    <group position={[0, 0, 4]}>
      {/* Platform kayu — 1 plane datar */}
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.04, 0]} castShadow>
        <boxGeometry args={[PLANK_LENGTH, 0.08, PLANK_WIDTH]} />
        <meshStandardMaterial color="#4a3826" roughness={0.85} />
      </mesh>
      {/* Plank lines on top — dekoratif, kasih kesan plank-plank */}
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.085, -0.4]}>
        <boxGeometry args={[PLANK_LENGTH - 0.1, 0.005, 0.04]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.085, 0]}>
        <boxGeometry args={[PLANK_LENGTH - 0.1, 0.005, 0.04]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.085, 0.4]}>
        <boxGeometry args={[PLANK_LENGTH - 0.1, 0.005, 0.04]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      {/* 4 pilar pendukung di air — 1 di tiap sudut */}
      <mesh position={[baseX - 0.3, -0.3, -0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
      <mesh position={[baseX - 0.3, -0.3, 0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH + 0.3, -0.3, -0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH + 0.3, -0.3, 0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
    </group>
  );
};

// Batu-batu kecil di tepi sungai — irregular box meshes dengan tone
// warm-gray, scatter di kedua tepi sungai sepanjang aliran. Posisi
// deterministik via index supaya konsisten antar render.
// Boundary stones di tepi danau — keliling kiri-kanan-atas-bawah
// supaya kerasa kayak shoreline beneran.
const STONE_POSITIONS = [
  // Kiri (-x), spread sepanjang z (skip area bench z=-2..-3)
  { pos: [-7.2, 0.0, -11], scale: [0.45, 0.28, 0.4], rot: 0.3 },
  { pos: [-7.0, 0.0, -6], scale: [0.5, 0.3, 0.45], rot: 0.7 },
  { pos: [-7.4, 0.0, 1], scale: [0.35, 0.22, 0.3], rot: 1.1 },
  { pos: [-7.1, 0.0, 7], scale: [0.45, 0.28, 0.4], rot: 0.4 },
  { pos: [-7.3, 0.0, 12], scale: [0.3, 0.2, 0.28], rot: 0.9 },
  // Kanan (+x), skip area dock z=4
  { pos: [7.2, 0.0, -12], scale: [0.4, 0.26, 0.38], rot: 0.5 },
  { pos: [7.0, 0.0, -6], scale: [0.5, 0.3, 0.42], rot: 1.0 },
  { pos: [7.3, 0.0, -1], scale: [0.35, 0.23, 0.32], rot: 0.6 },
  { pos: [7.1, 0.0, 9], scale: [0.42, 0.27, 0.38], rot: 1.2 },
  { pos: [7.4, 0.0, 13], scale: [0.38, 0.25, 0.35], rot: 0.3 },
  // Atas (-z) & bawah (+z) — beberapa di tepi panjang danau
  { pos: [-3, 0.0, -14.3], scale: [0.4, 0.25, 0.35], rot: 0.5 },
  { pos: [3, 0.0, -14.3], scale: [0.45, 0.28, 0.4], rot: 0.8 },
  { pos: [-3, 0.0, 14.3], scale: [0.4, 0.25, 0.35], rot: 0.3 },
  { pos: [3, 0.0, 14.3], scale: [0.42, 0.27, 0.38], rot: 0.9 },
];
const RiverStones = () => (
  <>
    {STONE_POSITIONS.map((s, i) => (
      <mesh
        key={`stone-${i}`}
        position={s.pos}
        rotation={[0, s.rot, 0]}
        scale={s.scale}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#4a4540"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
    ))}
  </>
);

// Rumput tufts scatter di taman — small cone groups (3 cone per tuft)
// dengan tone hijau lebih cerah dari banks, supaya catch light dan
// kasih texture ke lapangan. Posisi deterministik per index.
const TUFT_POSITIONS = [
  // Bank kiri
  { pos: [-9.5, 0, -11], color: '#5a8045' },
  { pos: [-10.5, 0, -6], color: '#6e9358' },
  { pos: [-9.8, 0, 3], color: '#5a8045' },
  { pos: [-10.2, 0, 9], color: '#6e9358' },
  { pos: [-9.0, 0, 13], color: '#4f7438' },
  { pos: [-11.5, 0, -2], color: '#65884d' },
  { pos: [-11, 0, 4], color: '#5a8045' },
  { pos: [-12, 0, 10], color: '#6e9358' },
  { pos: [-12.5, 0, -8], color: '#4f7438' },
  // Bank kanan
  { pos: [9.5, 0, -13], color: '#6e9358' },
  { pos: [10.0, 0, -8], color: '#5a8045' },
  { pos: [9.8, 0, -2], color: '#4f7438' },
  { pos: [10.5, 0, 9], color: '#5a8045' },
  { pos: [9.0, 0, 14], color: '#6e9358' },
  { pos: [11.5, 0, -5], color: '#5a8045' },
  { pos: [12.5, 0, 2], color: '#65884d' },
  { pos: [13, 0, -10], color: '#4f7438' },
  { pos: [12.8, 0, 13], color: '#6e9358' },
  // Bank atas (-z, outside pond z<-18)
  { pos: [-2, 0, -19], color: '#5a8045' },
  { pos: [4, 0, -19.5], color: '#6e9358' },
  { pos: [-7.5, 0, -19], color: '#5a8045' },
  { pos: [9, 0, -19], color: '#65884d' },
  { pos: [-1, 0, -20.5], color: '#4f7438' },
  // Bank bawah (+z, outside pond z>18)
  { pos: [-3, 0, 19], color: '#4f7438' },
  { pos: [2, 0, 19.5], color: '#5a8045' },
  { pos: [-7.5, 0, 19], color: '#6e9358' },
  { pos: [10, 0, 19], color: '#65884d' },
  { pos: [0, 0, 20.5], color: '#5a8045' },
];

const GrassTuft = ({ pos, color }) => (
  <group position={pos}>
    <mesh position={[0, 0.12, 0]}>
      <coneGeometry args={[0.06, 0.24, 4]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh position={[0.08, 0.1, 0.04]} rotation={[0.1, 0.5, 0.1]}>
      <coneGeometry args={[0.05, 0.2, 4]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh position={[-0.07, 0.08, 0.05]} rotation={[-0.05, -0.4, -0.15]}>
      <coneGeometry args={[0.045, 0.18, 4]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  </group>
);

const GrassTufts = () => (
  <>
    {TUFT_POSITIONS.map((t, i) => (
      <GrassTuft key={`tuft-${i}`} pos={t.pos} color={t.color} />
    ))}
  </>
);

// Geometry custom: triangle blade — base 0.05 di y=0, tip lancip di
// y=1. Vertical default. Pakai geometry shared antar instance.
const GRASS_BLADE_GEOM = (() => {
  const geom = new THREE.BufferGeometry();
  const verts = new Float32Array([
    -0.025, 0, 0,
    0.025, 0, 0,
    0, 1, 0,
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geom.setIndex([0, 1, 2]);
  geom.computeVertexNormals();
  return geom;
})();

const GRASS_BLADE_COLORS = [
  new THREE.Color('#5a7a40'),
  new THREE.Color('#6e8f4e'),
  new THREE.Color('#48663a'),
  new THREE.Color('#7a9a5c'),
  new THREE.Color('#8aa86a'),
];

// Tentukan apakah titik (x,z) berada di area yang harus skip:
// air, walking path, dock platform, bench, picnic table, bridge.
// Semua landmark coords harus konsisten dengan komponen masing2.
const isBlockedForGrass = (x, z) => {
  // Water rectangle (ada margin tipis untuk shoreline blades)
  if (Math.abs(x) < RIVER_WIDTH / 2 - 0.1 && Math.abs(z) < RIVER_LENGTH / 2 - 0.1) return true;
  // Walking path (sepanjang -x bank)
  if (x > -10.5 && x < -7.8 && Math.abs(z) < 14) return true;
  // Dock platform (+x, z=4 area)
  if (x > 7.0 && x < 11.0 && z > 1.5 && z < 6.5) return true;
  // Bench area
  if (x > -10.5 && x < -8.5 && z > -3.2 && z < -0.8) return true;
  // Picnic table area
  if (x > 8.8 && x < 11.2 && z > 5.8 && z < 8.3) return true;
  // Bridge planks area (z=-12.5, span x=-7..7)
  if (z > -13.2 && z < -11.8 && Math.abs(x) < 7.5) return true;
  // Sign post area
  if (x > -10.0 && x < -8.5 && z > -12.7 && z < -11.3) return true;
  // Bike parking — base plate + sepeda di +x bank, z=-7
  if (x > 10.9 && x < 12.1 && z > -7.9 && z < -6.1) return true;
  return false;
};

// Generate posisi blade rumput pada grid jittered + filter landmark.
// densityScale lebih besar = grid lebih rapat = lebih banyak blade.
const generateGrassBlades = (densityScale = 1) => {
  const cellSize = 0.42 / densityScale;
  // halfExtent 21 supaya cover bank zone past pond (RIVER_LENGTH/2=18)
  // — isBlockedForGrass filter pond rect, sisanya rumput.
  const halfExtent = 21;
  const blades = [];
  for (let x = -halfExtent; x <= halfExtent; x += cellSize) {
    for (let z = -halfExtent; z <= halfExtent; z += cellSize) {
      // 70% chance per cell — biar nggak rigid grid pattern
      if (Math.random() > 0.72) continue;
      const jx = x + (Math.random() - 0.5) * cellSize * 0.95;
      const jz = z + (Math.random() - 0.5) * cellSize * 0.95;
      if (isBlockedForGrass(jx, jz)) continue;
      // Outside playable circle skip
      if (Math.hypot(jx, jz) > halfExtent) continue;
      blades.push({
        x: jx,
        z: jz,
        height: 0.14 + Math.random() * 0.22,
        yaw: Math.random() * Math.PI,
        tiltX: (Math.random() - 0.5) * 0.45,
        tiltZ: (Math.random() - 0.5) * 0.45,
        colorIdx: Math.floor(Math.random() * GRASS_BLADE_COLORS.length),
      });
    }
  }
  return blades;
};

// Instanced grass blades — render ribuan blade dengan 1 draw call.
// Tiap blade punya posisi/rotasi/scale sendiri via matrix per-instance.
// Color variation via instanceColor attribute (5 hijau tone).
const GrassBlades = ({ densityScale = 1 }) => {
  const meshRef = useRef();
  const blades = useMemo(() => generateGrassBlades(densityScale), [densityScale]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => {
    const arr = new Float32Array(blades.length * 3);
    blades.forEach((b, i) => {
      const c = GRASS_BLADE_COLORS[b.colorIdx];
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [blades]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    blades.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z);
      dummy.rotation.set(b.tiltX, b.yaw, b.tiltZ);
      dummy.scale.set(1, b.height, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [blades, dummy]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[GRASS_BLADE_GEOM, undefined, blades.length]}
      receiveShadow
    >
      <meshStandardMaterial
        side={THREE.DoubleSide}
        roughness={0.95}
        vertexColors={false}
      />
      <instancedBufferAttribute
        attach="instanceColor"
        args={[colorArray, 3]}
      />
    </instancedMesh>
  );
};

// Patches tanah lebih gelap/cerah untuk pecahin uniform green plane —
// lingkaran datar dengan tone variasi. Posisi deterministik.
// DROUGHT VARIANT: GROUND_PATCH_DEFS warna canonical (green grass
// #5a7a45/#4f6c3c/#6e9358/#557240) diganti mix sandy-brown tandus
// untuk variasi tone tanah kering — beberapa lebih amber, beberapa
// lebih gelap soil, satu-dua patch crackled tone.
const GROUND_PATCH_DEFS = [
  { pos: [-9, -0.035, -10], r: 1.6, color: '#6a4f30' },
  { pos: [-12, -0.035, 2], r: 2.0, color: '#4a3520' },
  { pos: [-10, -0.035, 8], r: 1.4, color: '#7a5f40' },
  { pos: [-13, -0.035, -4], r: 1.8, color: '#5a4028' },
  { pos: [10, -0.035, -10], r: 1.6, color: '#4a3520' },
  { pos: [12, -0.035, -2], r: 1.5, color: '#7a5f40' },
  { pos: [13, -0.035, 8], r: 1.7, color: '#6a4f30' },
  { pos: [11, -0.035, 12], r: 1.4, color: '#5a4028' },
  { pos: [-2, -0.035, -16], r: 1.8, color: '#6a4f30' },
  { pos: [5, -0.035, -16.5], r: 1.5, color: '#4a3520' },
  { pos: [-5, -0.035, 16.5], r: 1.6, color: '#7a5f40' },
  { pos: [3, -0.035, 17], r: 1.5, color: '#5a4028' },
  { pos: [-9, -0.035, 13], r: 1.3, color: '#6a4f30' },
  { pos: [9, -0.035, -14], r: 1.4, color: '#7a5f40' },
];

const GroundPatches = () => (
  <>
    {GROUND_PATCH_DEFS.map((p, i) => (
      <mesh
        key={`patch-${i}`}
        rotation={[-Math.PI / 2, 0, 0]}
        position={p.pos}
        receiveShadow
      >
        <circleGeometry args={[p.r, 16]} />
        <meshStandardMaterial color={p.color} roughness={1} />
      </mesh>
    ))}
  </>
);

// Cinematic intro — camera arc dari high overhead distant ke default
// orbit position ~3.5s saat first visit. Bikin entrance terasa
// "telaga perlahan terbuka". Persisted via localStorage flag.
const TELAGA_INTRO_STORAGE_KEY = 'taman-r3-intro-seen';
const TELAGA_INTRO_DURATION = 3.5;
const TELAGA_INTRO_START_POS = new THREE.Vector3(0, 32, 18);
const TELAGA_INTRO_END_POS = new THREE.Vector3(4, 20, 8);
const TELAGA_INTRO_LOOK = new THREE.Vector3(0, 4, 0);

const TelagaCinematicIntro = ({ active, onComplete }) => {
  const { camera } = useThree();
  const startTimeRef = useRef(-1);
  const completedRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    camera.position.copy(TELAGA_INTRO_START_POS);
    camera.lookAt(TELAGA_INTRO_LOOK);
    startTimeRef.current = -1;
    completedRef.current = false;
  }, [active, camera]);
  useFrame((state) => {
    if (!active || completedRef.current) return;
    const t = state.clock.elapsedTime;
    if (startTimeRef.current < 0) startTimeRef.current = t;
    const elapsed = t - startTimeRef.current;
    const progress = Math.min(1, elapsed / TELAGA_INTRO_DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(
      TELAGA_INTRO_START_POS,
      TELAGA_INTRO_END_POS,
      eased,
    );
    camera.lookAt(TELAGA_INTRO_LOOK);
    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });
  return null;
};

// Playground — set anak-anak: slide kayu + swing + sandbox kecil.
// Ditempatkan di outer lapangan, scale moderate dari overhead view.
const Playground = ({ pos = [-16, 0, 6], rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Slide — sloped plank + ladder + ground base */}
    <group position={[-1.8, 0, 0]}>
      {/* Ladder side */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.08, 1.6, 0.6]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.95} />
      </mesh>
      {/* Top platform */}
      <mesh position={[0.4, 1.55, 0]}>
        <boxGeometry args={[0.8, 0.06, 0.7]} />
        <meshStandardMaterial color="#a86848" roughness={0.9} />
      </mesh>
      {/* Slope (slide track) */}
      <mesh
        position={[1.4, 0.85, 0]}
        rotation={[0, 0, -0.7]}
      >
        <boxGeometry args={[2.0, 0.05, 0.55]} />
        <meshStandardMaterial color="#d8a050" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Slide rails */}
      <mesh
        position={[1.4, 1.0, 0.28]}
        rotation={[0, 0, -0.7]}
      >
        <boxGeometry args={[2.0, 0.06, 0.04]} />
        <meshStandardMaterial color="#c89048" />
      </mesh>
      <mesh
        position={[1.4, 1.0, -0.28]}
        rotation={[0, 0, -0.7]}
      >
        <boxGeometry args={[2.0, 0.06, 0.04]} />
        <meshStandardMaterial color="#c89048" />
      </mesh>
    </group>
    {/* Swing set — 2 vertical posts + horizontal beam + 2 swings */}
    <group position={[1.5, 0, 0]}>
      <mesh position={[-0.9, 1.1, 0]}>
        <boxGeometry args={[0.08, 2.2, 0.08]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      <mesh position={[0.9, 1.1, 0]}>
        <boxGeometry args={[0.08, 2.2, 0.08]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <boxGeometry args={[1.95, 0.08, 0.08]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Swing 1 — ropes + plank */}
      <mesh position={[-0.4, 1.45, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 4]} />
        <meshStandardMaterial color="#7a5a40" />
      </mesh>
      <mesh position={[-0.4, 0.78, 0]}>
        <boxGeometry args={[0.4, 0.04, 0.18]} />
        <meshStandardMaterial color="#a86848" />
      </mesh>
      {/* Swing 2 */}
      <mesh position={[0.4, 1.45, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 4]} />
        <meshStandardMaterial color="#7a5a40" />
      </mesh>
      <mesh position={[0.4, 0.78, 0]}>
        <boxGeometry args={[0.4, 0.04, 0.18]} />
        <meshStandardMaterial color="#a86848" />
      </mesh>
    </group>
    {/* Sandbox — square wooden border filled with sand */}
    <group position={[3.5, 0, 0]}>
      {/* Border 4 sisi */}
      <mesh position={[0, 0.05, -0.6]}>
        <boxGeometry args={[1.4, 0.1, 0.06]} />
        <meshStandardMaterial color="#8a5a3a" />
      </mesh>
      <mesh position={[0, 0.05, 0.6]}>
        <boxGeometry args={[1.4, 0.1, 0.06]} />
        <meshStandardMaterial color="#8a5a3a" />
      </mesh>
      <mesh position={[-0.7, 0.05, 0]}>
        <boxGeometry args={[0.06, 0.1, 1.2]} />
        <meshStandardMaterial color="#8a5a3a" />
      </mesh>
      <mesh position={[0.7, 0.05, 0]}>
        <boxGeometry args={[0.06, 0.1, 1.2]} />
        <meshStandardMaterial color="#8a5a3a" />
      </mesh>
      {/* Sand fill */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.34, 1.14]} />
        <meshStandardMaterial color="#e8d8a0" roughness={1} />
      </mesh>
    </group>
  </group>
);

// Picnic NPC — figure duduk di blanket dengan anatomy proper:
// torso vertical + head + arms relaxed + crossed legs flat di blanket.
// Style match BenchVisitor (proper proportions, gak cartoony capsule).
const PicnicNPC = ({ offset = [0, 0, 0], rot = 0, shirt, hair, skin = '#e8c8a8', pants = '#3a4858' }) => (
  <group position={offset} rotation={[0, rot, 0]}>
    {/* Crossed legs — 2 thigh cylinders horizontal di-overlap di tengah,
        scale flatter karena duduk di blanket. */}
    <mesh
      position={[-0.06, 0.07, 0.18]}
      rotation={[Math.PI / 2 - 0.3, 0, 0.4]}
    >
      <cylinderGeometry args={[0.07, 0.07, 0.42, 8]} />
      <meshStandardMaterial color={pants} roughness={0.92} />
    </mesh>
    <mesh
      position={[0.06, 0.07, 0.18]}
      rotation={[Math.PI / 2 - 0.3, 0, -0.4]}
    >
      <cylinderGeometry args={[0.07, 0.07, 0.42, 8]} />
      <meshStandardMaterial color={pants} roughness={0.92} />
    </mesh>
    {/* Torso vertical — duduk tegak di belakang legs */}
    <mesh position={[0, 0.34, -0.05]}>
      <boxGeometry args={[0.3, 0.4, 0.2]} />
      <meshStandardMaterial color={shirt} roughness={0.9} />
    </mesh>
    {/* Head */}
    <mesh position={[0, 0.7, -0.05]}>
      <sphereGeometry args={[0.12, 14, 10]} />
      <meshStandardMaterial color={skin} roughness={0.85} />
    </mesh>
    {/* Hair */}
    <mesh position={[0, 0.73, -0.07]}>
      <sphereGeometry
        args={[0.128, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
      />
      <meshStandardMaterial color={hair} roughness={0.95} />
    </mesh>
    {/* Lengan kiri — relaxed di samping turun ke pangkuan */}
    <mesh
      position={[-0.18, 0.3, -0.04]}
      rotation={[-0.2, 0, 0.25]}
    >
      <cylinderGeometry args={[0.045, 0.045, 0.34, 8]} />
      <meshStandardMaterial color={shirt} roughness={0.9} />
    </mesh>
    {/* Lengan kanan */}
    <mesh
      position={[0.18, 0.3, -0.04]}
      rotation={[-0.2, 0, -0.25]}
    >
      <cylinderGeometry args={[0.045, 0.045, 0.34, 8]} />
      <meshStandardMaterial color={shirt} roughness={0.9} />
    </mesh>
  </group>
);

const PicnicGroup = ({ pos, rot = 0, theme = 'red' }) => {
  const palette = theme === 'red'
    ? {
        blanket: '#c44048',
        accent: '#f4d048',
        shirts: ['#6a7ab8', '#c84858'],
        hairs: ['#3a2818', '#5a3e2b'],
      }
    : theme === 'blue'
      ? {
          blanket: '#4868a8',
          accent: '#f0e8d0',
          shirts: ['#d8a050', '#7a8e6a'],
          hairs: ['#2a2218', '#4a3828'],
        }
      : { // green
          blanket: '#3a8848',
          accent: '#fff0c8',
          shirts: ['#c8688c', '#5a8095'],
          hairs: ['#2a1d10', '#3a2818'],
        };
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Blanket — square colored di tanah */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshStandardMaterial color={palette.blanket} roughness={1} />
      </mesh>
      {/* Border — lighter strip border for plaid feel */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.3, 4]} />
        <meshStandardMaterial color={palette.accent} roughness={1} />
      </mesh>
      {/* Stripe pattern — 2 thin perpendicular strips */}
      <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 0.12]} />
        <meshStandardMaterial color={palette.accent} roughness={1} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[2.6, 0.12]} />
        <meshStandardMaterial color={palette.accent} roughness={1} transparent opacity={0.55} />
      </mesh>
      {/* NPC 1 — kiri menghadap center */}
      <PicnicNPC
        offset={[-0.65, 0, 0.45]}
        rot={Math.PI * 0.65}
        shirt={palette.shirts[0]}
        hair={palette.hairs[0]}
      />
      {/* NPC 2 — kanan menghadap center */}
      <PicnicNPC
        offset={[0.65, 0, 0.45]}
        rot={-Math.PI * 0.65}
        shirt={palette.shirts[1]}
        hair={palette.hairs[1]}
      />
      {/* Picnic basket — wood weave + handle + cloth cover */}
      <group position={[0, 0, -0.55]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.42, 0.24, 0.32]} />
          <meshStandardMaterial color="#a8784a" roughness={0.95} />
        </mesh>
        {/* Lid cloth lebar */}
        <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.46, 0.36]} />
          <meshStandardMaterial color="#f0e0c4" roughness={1} />
        </mesh>
        {/* Handle */}
        <mesh
          position={[0, 0.34, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.14, 0.018, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#7a5a3a" />
        </mesh>
      </group>
      {/* Drink bottle / cup di pinggir blanket */}
      <mesh position={[-0.85, 0.12, -0.4]}>
        <cylinderGeometry args={[0.06, 0.07, 0.24, 12]} />
        <meshStandardMaterial color="#8aa8d8" transparent opacity={0.78} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Apple/buah ungu accent */}
      <mesh position={[0.85, 0.06, -0.35]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#c0405a" roughness={0.7} />
      </mesh>
      <mesh position={[0.95, 0.06, -0.45]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#d4a850" roughness={0.7} />
      </mesh>
    </group>
  );
};

const PicnicGroups = () => (
  <>
    <PicnicGroup pos={[-15, 0, -8]} rot={0.6} theme="red" />
    <PicnicGroup pos={[14, 0, -7]} rot={-0.4} theme="blue" />
    <PicnicGroup pos={[-14, 0, 14]} rot={1.2} theme="green" />
  </>
);

const TelagaScene = ({
  pads,
  hoveredPadId,
  isMobile,
  hideLabels,
  introActive,
  onIntroComplete,
  onPadHover,
  onPadOut,
  onPadClick,
}) => (
  <>
    {/* Late afternoon sky — sun masih cukup tinggi tapi udah miring,
        warm undertone. Rayleigh & turbidity moderate supaya nggak
        over-hazy/washed out. */}
    <Sky
      distance={450000}
      sunPosition={[8, 8, 4]}
      inclination={0.52}
      azimuth={0.28}
      mieCoefficient={0.005}
      mieDirectionalG={0.88}
      rayleigh={2.8}
      turbidity={7}
    />
    {/* DROUGHT-SKIP: Environment preset="park" — di canonical load HDR
        dari CDN untuk IBL realistic lighting "park siang". Di drought:
        (1) suspend Canvas forever kalau CDN lambat / blocked (user lapor
        "memuat trs"), (2) palette HDR park bright/green gak match drought
        atmosphere brown dusty. Atmosphere udah cukup via fog + lights. */}
    {/* Fog lebih dense — distant elements fade ke haze, kasih sense
        atmospheric depth & "world has limits". Far 55 (was 75) bikin
        ground mist + distant trees + hills nyatu di horizon haze. */}
    {/* DROUGHT atmosphere: fog shifted dari warm pink-orange ke
        dusty brown match r1 gersang tone. Sky tone juga digeser
        supaya konsisten "siang berdebu di taman mati" bukan senja
        ramah pink. */}
    <fog attach="fog" args={['#5a4030', 20, 52]} />
    <color attach="background" args={['#5a4030']} />
    {/* Ambient sedikit diturunin dari canonical (0.85/0.70 →
        0.65/0.55), color shift ke warm-gray (kurangi rosy) */}
    <ambientLight intensity={isMobile ? 0.65 : 0.55} color="#c8a08a" />
    {/* Sun directional — intensity sedikit turun (1.2 → 1.0), warna
        amber kering match r1 drought */}
    <directionalLight
      position={[8, 14, -8]}
      intensity={1.0}
      color="#f4b078"
      castShadow
      shadow-mapSize={isMobile ? [1024, 1024] : [2048, 2048]}
      shadow-camera-left={-25}
      shadow-camera-right={25}
      shadow-camera-top={25}
      shadow-camera-bottom={-25}
      shadow-camera-near={0.5}
      shadow-camera-far={60}
      shadow-bias={-0.0005}
    />
    {/* Sky fill — warm-gray bukan dusty pink */}
    <directionalLight
      position={[-6, 6, -4]}
      intensity={0.45}
      color="#b8907a"
    />
    {/* Sky layers — dome gradient + sun + far cloud backdrop + high
        birds. Setara r1 multi-layer langit, palette daytime. */}
    <SkyDome />
    <HorizonSmogBand />
    <Sun />
    <FarClouds isMobile={isMobile} />
    {/* DROUGHT-SKIP: HighBirdFlock — burung tinggi alive */}
    {/* DistantHills + DistantTreeLine dropped — pembatas perimeter
        di-handle pure oleh fog senja, bikin "ujung dunia" kerasa
        soft-fade bukan ridge solid. */}
    <Clouds />
    {/* DROUGHT-SKIP: Birds, FlyingFlock, HighBirdFlock — flying creatures
        absen di ekosistem rusak. */}
    <Banks />
    <GroundPatches />
    <WalkPath />
    <River isMobile={isMobile} />
    <RiverStones />
    {/* Drought decay — scattered dead branches scattered di banks
        (radius 14-18, di luar lake). Detail decay di tanah tandus. */}
    <DroughtBranches isMobile={isMobile} />
    {/* Broken pillars — 12 sisa colonnade kuno scattered di banks.
        Tinggi mix (0.5-1.8m), tilt acak, kerasa "dulu ada struktur
        besar di sini, sekarang tinggal puing". */}
    <BrokenPillars />
    {/* Ground cracks — 24 retak tipis di tanah bank, radius 13-20.
        Tanah pecah karena kekeringan panjang. */}
    <GroundCracks />
    {/* Dried grass tufts — 24 cluster rumput kering yellow-brown,
        radius 12-20. Bukan green grass (skipped), tapi rumput mati
        masih berdiri kaku. */}
    <DriedGrassTufts isMobile={isMobile} />
    {/* Tumbleweeds — 3 bola twigs kering nggelinding pelan across
        the bank. Signature drought visual, kerasa "angin masih
        membawa sisa-sisa". */}
    <Tumbleweeds />
    {/* Bones — 4 cluster fragment tulang scattered di banks. Subtle
        decay marker, hint of past life. */}
    <Bones />
    {/* Polusi — soft round particles drifting warna dirty smog brown,
        match r1 gersang PollutedAir. Spread di area 50×50 (lebih luas
        dari r1 karena r3 area gede). */}
    <PollutedAir count={180} isMobile={isMobile} />
    {/* Gagak silhouette terbang lazy circles di atas lake — abandoned
        dead-town visual signature, unique ke r3 gersang. */}
    <CrowsFlock isMobile={isMobile} />
    {/* Gagak hinggap diam di atas 3 pillar tertinggi — ominous still
        watcher counterpoint ke flock yg gerak. */}
    <PerchedCrows isMobile={isMobile} />
    {/* DROUGHT-SKIP: GrassTufts + GrassBlades — rumput hijau gak ada,
        ground tone udah cracked dirt sendiri. */}
    <Bench />
    {/* DROUGHT-SKIP: BenchVisitor — orang duduk di bench, alive */}
    <Dock />
    <Bridge />
    <SignPost />
    <PicnicTable />
    <BikeParking bikeCount={isMobile ? 1 : 2} />
    {/* DROUGHT-SKIP: Vegetasi alive (cattails, wildflowers, sunflowers,
        mushrooms, bushes, flower beds, scattered flowers, bamboo,
        veggie patch). Sisanya artefak struktural tetap render. */}
    <StoneClusters />
    <SteppingStones />
    {/* Lanterns + GardenLanterns posts berdiri tapi gak nyala (canonical
        component gak punya prop dead — biarin dulu, secara visual masih
        OK di drought atmosphere). */}
    <Lanterns />
    <GardenLanterns isMobile={isMobile} />
    <WoodenBenches isMobile={isMobile} />
    <LogPiles />
    <TreeStumps isMobile={isMobile} />
    <Wheelbarrows />
    <BirdBaths />
    {/* DROUGHT-SKIP: Pinwheels — kincir colorful playful, alive feel */}
    {/* DROUGHT: WishingWell diganti DryWell — post patah, bucket terguling,
        rope putus, dasar lumpur kering bukan air. Narrative focal point. */}
    <DryWell pos={[-22, 0, -16]} rot={0.4} />
    <WelcomeArch pos={[0, 0, -28]} rot={0} />
    {/* DROUGHT-SKIP: PicnicBlankets — kain colorful, festive */}
    <Gazebo pos={[0, 0, 25]} rot={0} />
    {/* DROUGHT-SKIP: Hammock — implies rest/people */}
    {/* DROUGHT-SKIP: Birdhouses — implies birds */}
    {/* DROUGHT-SKIP: VeggiePatch — sayuran hidup */}
    {/* DROUGHT-SKIP: Kite — alive scene (anak main layangan) */}
    {/* DROUGHT-SKIP: WaterLanterns — perlu air, di drought lake kering */}
    <FirePit pos={[-19, 0, 20]} />
    <GardenSwing pos={[-12, 0, 22]} rot={-0.2} />
    <Mailbox pos={[3, 0, -26]} rot={-0.3} />
    <ReadingNook pos={[7, 0, -16]} rot={2.2} />
    <EmaTablets pos={[-19, 0, -14]} rot={1.2} isMobile={isMobile} />
    <StoneToros isMobile={isMobile} />
    <WindChime pos={[-22, 0, 0]} rot={0.4} />
    {/* DROUGHT-SKIP: SleepingCat — alive */}
    {/* DROUGHT-SKIP: PaperCraneGarland — colorful festive crane string */}
    <Torii pos={[22, 0, -16]} rot={-0.5} scale={1.1} />
    <Jizos isMobile={isMobile} />
    {/* DROUGHT-SKIP: BambooGrove — bambu hidup */}
    {/* DROUGHT-SKIP: Rowboat — perlu air */}
    {/* BankTrees + OuterTrees re-enabled — pakai dead-tree version
        (BankTree component di file ini overrided ke trunk + dead
        branches, no foliage). Pohon mati ngebatesin perimeter, kerasa
        "dulu ada hutan, sekarang tinggal kerangka". */}
    <BankTrees count={isMobile ? 8 : 12} />
    <OuterTrees isMobile={isMobile} />
    {/* DROUGHT-SKIP: FlyingFlock — alive */}
    {/* DROUGHT-SKIP: Playground — colorful play equipment, kids alive */}
    {/* DROUGHT-SKIP: PicnicGroups — alive people */}
    {/* DROUGHT-SKIP: Animals (Ducks, Fish, Pigeons, Butterflies,
        Dragonflies, Fireflies) — ekosistem mati */}
    {/* DROUGHT-SKIP: FallingPetals — petals dari bunga yang udah gak ada */}
    <GroundMist count={isMobile ? 40 : 70} />
    {/* DROUGHT-SKIP: LilyWishPad map — teratai di air. Lake kering di
        drought, wish-data masih ada (akan muncul di canonical 6000+). */}
    {/* OrbitControls disabled saat intro lerp aktif — biar gak fight
        dgn camera animation. Setelah intro complete, controls take
        over. */}
    {!introActive && (
      <OrbitControls
        target={[0, 4, 0]}
        enableZoom
        minDistance={10}
        maxDistance={34}
        enablePan={false}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={1.55}
        enableDamping
        // Damping low (0.04) = lebih banyak inertia = rotasi terasa
        // halus + glide-y. autoRotate slow 0.15 untuk graceful idle.
        dampingFactor={0.04}
        rotateSpeed={0.4}
        autoRotate
        autoRotateSpeed={0.15}
      />
    )}
    <TelagaCinematicIntro
      active={introActive}
      onComplete={onIntroComplete}
    />
  </>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#0a1320] text-white/50 text-sm">
    Memuat telaga harapan...
  </div>
);

// First-visit intro title overlay — sync sama TelagaCinematicIntro
// dolly. Frame R3 sebagai memori (masa lalu kebaikan) bukan present.
// Tampil saat introActive, fade out saat intro complete. Skip kalo
// udah pernah seen (localStorage check di parent via introActive).
const TelagaIntroTitle = ({ visible }) => (
  <div
    className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-[1800ms] ease-out ${
      visible ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <div className="text-center max-w-md mx-6 px-8 py-9 -translate-y-12 rounded-md border border-white/10 bg-[#0a1320]/75 backdrop-blur-md shadow-2xl">
      <div className="text-white/55 text-[9px] uppercase tracking-[0.5em] mb-4">
        R3 · Kenangan
      </div>
      <h1
        className="text-white text-3xl md:text-4xl mb-4 leading-[1.1]"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          letterSpacing: '0.01em',
          textShadow: '0 0 32px rgba(244,168,192,0.18)',
        }}
      >
        Telaga Harapan
      </h1>
      <div className="mx-auto mb-4 w-10 h-px bg-white/25" />
      <p
        className="text-white/65 text-[12px] md:text-[13px] leading-relaxed"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          letterSpacing: '0.02em',
        }}
      >
        Sebelum padang kering, di sini ada air.
        <br />
        Setiap teratai adalah harapan yang pernah hidup.
      </p>
    </div>
  </div>
);

const TelagaHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-20 md:px-6 md:pt-24 pb-4 md:pb-5">
    <div className="pointer-events-auto">
      <Link
        to="/armeniacaTown/peta"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        <span className="md:hidden">← Peta</span>
        <span className="hidden md:inline">← Peta Kota</span>
      </Link>
    </div>
    <div className="text-center">
      <div className="text-white/45 text-[8px] md:text-[9px] uppercase tracking-[0.35em] md:tracking-[0.45em] mb-0.5">
        Kenangan
      </div>
      <div
        className="text-white/85 text-[13px] md:text-sm tracking-wide"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Telaga Harapan
      </div>
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/wishes"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        <span className="md:hidden">Wish →</span>
        <span className="hidden md:inline">Tinggalkan wish →</span>
      </Link>
    </div>
  </div>
);

const TelagaFooter = ({ hoveredPadId, totalPads }) => {
  const hint = hoveredPadId
    ? 'Klik teratai untuk baca harapan'
    : `${totalPads} teratai mengalir di sungai · drag untuk berputar`;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.2em] text-center">
      {hint}
    </div>
  );
};

const WishOverlay = ({ pad, onClose }) => {
  useEffect(() => {
    if (!pad) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [pad]);

  if (!pad) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#0d1f3a]/95 border border-white/15 rounded-2xl px-8 py-10 max-w-lg mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-pink-200/70 text-3xl leading-none mb-2">“</div>
        <p
          className="text-white text-lg md:text-xl leading-relaxed mb-7"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {pad.message}
        </p>
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="text-white/85 text-base font-medium">
              {pad.name}
            </div>
            {pad.handle && (
              <div className="text-white/45 text-xs mt-0.5">
                {pad.handle}
              </div>
            )}
          </div>
          {pad.date && (
            <div className="text-white/40 text-[10px] uppercase tracking-[0.2em]">
              {formatDate(pad.date)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full px-5 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
        >
          Kembali ke sungai
        </button>
      </div>
    </div>
  );
};

// BLOOM_COLORS, LEAF_COLORS sekarang di constants.js (di-import di top).

// Ambil daftar wishes — merge seeds + Firebase (kalau ada). Sort
// newest-first by date, take top N supaya pad nggak crowded. Satu
// fungsi murni: input deps → output array of wish-shaped objects.
const buildWishList = (firebaseWishes, seeds, limit = 11) => {
  const merged = [...firebaseWishes, ...seeds];
  // Dedupe by name+message combo (seeds bisa duplicate dengan
  // submission live yang udah masuk Firebase)
  const seen = new Set();
  const unique = merged.filter((w) => {
    const key = `${(w.name || '').toLowerCase()}|${(w.message || '').slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });
  return unique.slice(0, limit);
};

// Convert wish list → pad layout di danau lebar. 1 center pad di
// (0,0,0) jadi teratai besar. Sisanya scatter di sekelilingnya
// pakai golden-angle spiral untuk distribusi natural (nggak ring/
// grid). Posisi deterministik per index.
//
// Margin dari shoreline: x dijaga di range ±(RIVER_WIDTH/2 - 1.6),
// z di range ±(RIVER_LENGTH/2 - 2). Jaga jarak juga dari dock (z=4,
// x>5) supaya pad nggak overlap dengan dermaga.
const buildPads = (wishes) => {
  if (!wishes.length) return [];
  const items = [];
  const xMax = RIVER_WIDTH / 2 - 1.6;
  // Asymmetric: south boundary normal 12, north boundary -10.5 untuk
  // avoid bridge area (bridge z=-12.5 ± 0.8, pad radius up to 0.95).
  const zMaxSouth = RIVER_LENGTH / 2 - 2;
  const zMaxNorth = 10.5;

  // Center wish — teratai besar di z=0
  const center = wishes[0];
  items.push({
    id: `pad-${center.id || 'seed-0'}-c`,
    name: center.name || 'Anonymous',
    handle: center.handle || '',
    message: center.message || '',
    date: center.date || '',
    isCenter: true,
    pos: [0, 0, 0],
    leafColor: LEAF_COLORS[0],
    bloomColor: BLOOM_COLORS[0],
    tilt: 0,
    phase: 0,
  });

  // Surrounding wishes — golden-angle spiral. Tiap step naik radius
  // dan rotasi 137.5° untuk distribusi yang nggak grid-like.
  const others = wishes.slice(1);
  if (others.length === 0) return items;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
  others.forEach((w, i) => {
    // r naik bertahap, di-clamp supaya nggak nempel ke shore
    const r = 2.5 + Math.sqrt(i) * 1.6;
    const angle = i * goldenAngle + 0.5;
    let x = Math.cos(angle) * r;
    let z = Math.sin(angle) * r;
    // Avoid dock area (kanan z=4, x sekitar 5..7)
    const dockBlock = x > 4.5 && z > 2.5 && z < 5.5;
    if (dockBlock) {
      x = -Math.abs(x); // mirror ke kiri
    }
    // Clamp ke water bounds (asymmetric z untuk hindari bridge di -z)
    x = Math.max(-xMax, Math.min(xMax, x));
    z = Math.max(-zMaxNorth, Math.min(zMaxSouth, z));
    const tilt = ((i * 73) % 360) * (Math.PI / 180);
    items.push({
      id: `pad-${w.id || `seed-${i}`}-${i}`,
      name: w.name || 'Anonymous',
      handle: w.handle || '',
      message: w.message || '',
      date: w.date || '',
      isCenter: false,
      pos: [x, 0, z],
      leafColor: LEAF_COLORS[(i + 1) % LEAF_COLORS.length],
      bloomColor: BLOOM_COLORS[(i + 1) % BLOOM_COLORS.length],
      tilt,
      phase: i * 0.7,
    });
  });
  return items;
};

const TamanKolamKataGersangPage = () => {
  const isMobile = useIsMobile();
  const [hoveredPadId, setHoveredPadId] = useState(null);
  const [selectedPad, setSelectedPad] = useState(null);
  const [firebaseWishes, setFirebaseWishes] = useState([]);
  // Cinematic intro — first visit only, persisted via localStorage.
  const [introActive, setIntroActive] = useState(() => {
    try {
      return localStorage.getItem(TELAGA_INTRO_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const handleIntroComplete = () => {
    setIntroActive(false);
    try {
      localStorage.setItem(TELAGA_INTRO_STORAGE_KEY, '1');
    } catch {
      /* storage blocked */
    }
  };

  const seeds = SITE_CONFIG.wishes?.seeds || [];

  // Subscribe ke Firebase realtime feed. Kalau Firebase belum
  // ke-config, callback dipanggil dengan [] dan kita pakai seeds aja.
  useEffect(() => {
    const unsub = subscribeToWishes((live) => {
      setFirebaseWishes(live);
    });
    return unsub;
  }, []);

  const pads = useMemo(() => {
    const wishes = buildWishList(firebaseWishes, seeds, 11);
    return buildPads(wishes);
  }, [firebaseWishes, seeds]);

  useEffect(() => {
    document.body.style.cursor = hoveredPadId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredPadId]);

  const handlePadHover = (id) => setHoveredPadId(id);
  const handlePadOut = (id) =>
    setHoveredPadId((c) => (c === id ? null : c));
  const handlePadClick = (pad) => {
    setSelectedPad(pad);
    setHoveredPadId(null);
  };
  const handleClose = () => setSelectedPad(null);

  return (
    <>
      <Seo
        title="Telaga Harapan — versi gersang"
        description="Telaga di taman yang masih kering. Siram di /26 untuk merestorasi ekosistem dan memunculkan teratai-teratai harapan."
        path="/armeniacaTown/r3"
      />
      <div className="relative w-full h-screen bg-[#0a1320] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 50, position: [4, 20, 8] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={!isMobile}
            onCreated={({ camera }) => {
              camera.lookAt(0, 4, 0);
            }}
          >
            <TelagaScene
              pads={pads}
              hoveredPadId={hoveredPadId}
              isMobile={isMobile}
              hideLabels={Boolean(selectedPad)}
              introActive={introActive}
              onIntroComplete={handleIntroComplete}
              onPadHover={handlePadHover}
              onPadOut={handlePadOut}
              onPadClick={handlePadClick}
            />
            {!isMobile && (
              <EffectComposer>
                {/* Bloom yang JAUH lebih subtle — threshold tinggi 0.95
                    biar cuma highlight ekstrem (specular sun) yang
                    glow, intensity 0.25 biar nggak mendominasi. */}
                <Bloom
                  intensity={0.25}
                  luminanceThreshold={0.95}
                  luminanceSmoothing={0.3}
                  mipmapBlur
                />
                {/* Soft vignette tipis */}
                <Vignette eskil={false} offset={0.4} darkness={0.3} />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            )}
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <TelagaHeader />
        <TelagaIntroTitle visible={introActive} />
        <TelagaFooter hoveredPadId={hoveredPadId} totalPads={pads.length} />
        <WishOverlay pad={selectedPad} onClose={handleClose} />
        <AmbientAudio profile="taman" position="top-right" />
        <RotateRecommendation />
        {/* Skip intro button — click anywhere during cinematic lerp
            atau press dedicated button untuk fast-forward. UX win:
            user yang udah pernah liat intro gak harus nunggu 3.5s. */}
        {introActive && (
          <button
            type="button"
            onClick={handleIntroComplete}
            className="pointer-events-auto absolute bottom-6 right-6 z-30 px-4 py-2 rounded-full border border-white/30 bg-black/35 backdrop-blur-sm text-white/85 text-[11px] uppercase tracking-[0.2em] hover:bg-white/15 transition"
            aria-label="Lewati intro animation"
          >
            Lewati intro
          </button>
        )}
      </div>
    </>
  );
};

export default TamanKolamKataGersangPage;
