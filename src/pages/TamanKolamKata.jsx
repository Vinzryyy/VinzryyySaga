/**
 * Taman Kebaikan — Petak R3: Telaga Harapan.
 *
 * Wish panel 3D — taman kota di tepi danau di siang hari. Tiap
 * teratai mekar di danau = 1 wish dari fans (sumber: SITE_CONFIG.
 * wishes.seeds + live Firebase via subscribeToWishes).
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
import { Canvas, useFrame } from '@react-three/fiber';
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
import { SITE_CONFIG } from '../config/siteConfig';
import { subscribeToWishes } from '../lib/wishesDb';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
};

const lerp = (a, b, t) => a + (b - a) * t;

// Dimensi danau — dipake di banyak komponen (Banks, WalkPath, Bench,
// Dock, LANTERN_POSITIONS, dst). Deklarasi di sini supaya semua module-
// level constants yang reference ke nilai ini bisa baca tanpa TDZ.
const RIVER_WIDTH = 14;
const RIVER_LENGTH = 28;

// Truncate untuk preview label di pad — biar nggak ngerampokin scene.
const shortLabel = (text, maxWords = 4) => {
  const words = (text || '').trim().split(/\s+/);
  if (words.length <= maxWords) return text || '';
  return words.slice(0, maxWords).join(' ') + '…';
};

const formatDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

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
const FLOW_SPEED = 0.03; // unit per detik
const FLOW_END_Z = 12;
const FLOW_START_Z = -12;

const LilyWishPad = ({ pad, hovered, onPointerOver, onPointerOut, onClick }) => {
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
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribusi di ring perimeter — radius 16..32 (di luar danau
      // yang max 14, tapi sebelum hills di z=-33+)
      const angle = Math.random() * Math.PI * 2;
      const radius = 16 + Math.random() * 16;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = 0.4 + Math.random() * 2.5; // low Y, ground level
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
      // Slow horizontal drift + slight vertical bob
      arr[i * 3] += Math.sin(t * 0.15 + phase) * 0.008;
      arr[i * 3 + 1] += Math.cos(t * 0.18 + phase * 1.3) * 0.005;
      arr[i * 3 + 2] += Math.cos(t * 0.13 + phase) * 0.008;
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
        size={4.5}
        color="#dcd5c8"
        transparent
        opacity={0.32}
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

// Bukit jauh sebagai silhouette — 3 layer ridge di horizon untuk kasih
// atmospheric depth & sense of wider world. Pakai box geometry rendah
// dengan tone hijau-biru desaturated (atmospheric haze). Layer paling
// jauh = paling samar (lebih biru), paling depan = lebih hijau.
const DistantHills = () => (
  <>
    {/* Layer paling jauh */}
    <mesh position={[-20, 1.5, -55]}>
      <boxGeometry args={[60, 4, 1]} />
      <meshStandardMaterial color="#9aaab5" roughness={1} />
    </mesh>
    <mesh position={[15, 2.0, -52]}>
      <boxGeometry args={[40, 5, 1]} />
      <meshStandardMaterial color="#9aaab5" roughness={1} />
    </mesh>
    {/* Layer tengah */}
    <mesh position={[-5, 1.8, -45]}>
      <boxGeometry args={[35, 4.5, 1]} />
      <meshStandardMaterial color="#7d9583" roughness={1} />
    </mesh>
    <mesh position={[20, 1.5, -42]}>
      <boxGeometry args={[28, 4, 1]} />
      <meshStandardMaterial color="#7d9583" roughness={1} />
    </mesh>
    {/* Layer paling depan — lebih hijau, lebih kelihatan detail */}
    <mesh position={[-15, 1.2, -35]}>
      <boxGeometry args={[25, 3.5, 1]} />
      <meshStandardMaterial color="#5a7a55" roughness={1} />
    </mesh>
    <mesh position={[10, 1.0, -33]}>
      <boxGeometry args={[20, 3.0, 1]} />
      <meshStandardMaterial color="#5a7a55" roughness={1} />
    </mesh>
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

const CATTAIL_POSITIONS = [
  // Tepi kiri danau (skip area bench/dock/path)
  [-7.0, 0, -12],
  [-7.0, 0, 11],
  // Tepi kanan
  [7.0, 0, -10],
  [7.0, 0, -1],
  // Tepi atas/bawah
  [-2, 0, -13.5],
  [3, 0, 13.5],
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
const WILDFLOWER_COLORS = [
  '#f4d870', // dandelion yellow
  '#ffffff', // white daisy
  '#e89bb8', // pink wildflower
  '#9bb8e8', // blue wildflower
  '#c89be8', // purple wildflower
  '#f4a570', // soft orange
];

// Wildflowers di-randomize per mount — useMemo([]) regenerate setiap
// kali user load /taman/r3, jadi taman kerasa berubah-ubah tiap visit.
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
    // Bank atas (-z) — band z<-16
    for (let i = 0; i < 16; i++) {
      const x = -10 + Math.random() * 20;
      const z = -16 - Math.random() * 4;
      const colorIdx = Math.floor(Math.random() * WILDFLOWER_COLORS.length);
      const size = 0.06 + Math.random() * 0.025;
      items.push({ pos: [x, size, z], colorIdx, size });
    }
    // Bank bawah (+z)
    for (let i = 0; i < 16; i++) {
      const x = -10 + Math.random() * 20;
      const z = 16 + Math.random() * 4;
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
const BRIDGE_Z = -12.5;
const BRIDGE_SPAN = 16;

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
    // Rotation Y — bebek ngadap ke arah swim direction
    groupRef.current.rotation.y = -angle + Math.PI / 2;
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
  { pos: [-2.5, 0, -6], cycle: 12, offset: 0, jumpDuration: 0.85, facing: 0.3 },
  { pos: [3.2, 0, 1.5], cycle: 15, offset: 5.5, jumpDuration: 0.9, facing: -0.4 },
  { pos: [-0.5, 0, 9], cycle: 17, offset: 10, jumpDuration: 0.95, facing: 1.1 },
];

const JumpingFishes = () => (
  <>
    {FISH_DEFS.map((def, i) => (
      <JumpingFish key={`fish-${i}`} def={def} />
    ))}
  </>
);

// Kapal kertas (paper boat) — origami-like dengan 2 plane segitiga
// yang di-tilt jadi shape kapal. Subtle bob + slow drift downstream
// (mirror pattern lily pads). 3 kapal kertas drifting di air, fungsi
// thematic untuk wish wall — "harapan yang hanyut".
const PaperBoat = ({ def }) => {
  const groupRef = useRef();
  const driftZRef = useRef(0);
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    driftZRef.current += 0.02 * delta;
    let z = def.start[2] + driftZRef.current;
    if (z > 13) {
      driftZRef.current -= 26;
      z = def.start[2] + driftZRef.current;
    }
    const t = state.clock.elapsedTime;
    groupRef.current.position.x = def.start[0] + Math.sin(t * 0.5 + def.phase) * 0.08;
    groupRef.current.position.y = 0.06 + Math.sin(t * 0.8 + def.phase) * 0.025;
    groupRef.current.position.z = z;
    groupRef.current.rotation.z = Math.sin(t * 0.6 + def.phase) * 0.06;
  });
  return (
    <group ref={groupRef}>
      {/* Hull bawah — 2 segitiga miring kebawah membentuk V */}
      <mesh rotation={[Math.PI / 2.6, 0, 0]} position={[0, 0, 0]}>
        <coneGeometry args={[0.18, 0.4, 4]} />
        <meshStandardMaterial color="#f4ecd8" roughness={0.9} />
      </mesh>
      {/* Sail/atap segitiga — vertical dari tengah hull */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.18, 0]}>
        <coneGeometry args={[0.16, 0.3, 4]} />
        <meshStandardMaterial color="#fff8ea" roughness={0.85} />
      </mesh>
    </group>
  );
};

const PAPER_BOAT_DEFS = [
  { start: [-2.2, 0, -8], phase: 0 },
  { start: [2.5, 0, 0], phase: 2.0 },
  { start: [-1.0, 0, 7], phase: 4.0 },
];

const PaperBoats = () => (
  <>
    {PAPER_BOAT_DEFS.map((def, i) => (
      <PaperBoat key={`boat-${i}`} def={def} />
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
  // Bank atas
  { pos: [-5, 0, -16], scale: 0.95 },
  { pos: [6, 0, -17], scale: 0.9 },
  // Bank bawah
  { pos: [-6, 0, 17], scale: 0.95 },
  { pos: [5, 0, 16.5], scale: 1.0 },
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

const Butterflies = () => (
  <>
    {BUTTERFLY_DEFS.map((def, i) => (
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

const Dragonflies = () => (
  <>
    {DRAGONFLY_DEFS.map((def, i) => (
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
        color="#c84838"
        roughness={0.7}
        emissive="#c84838"
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
  { pos: [11.5, 0, -7], count: 2 },
  { pos: [-3, 0, -14], count: 2 },
];

const Mushrooms = () => (
  <>
    {MUSHROOM_CLUSTERS.map((cluster, i) => (
      <group key={`mushroom-cluster-${i}`} position={cluster.pos}>
        {Array.from({ length: cluster.count }).map((_, j) => {
          const angle = (j / cluster.count) * Math.PI * 2 + i;
          const r = 0.18 + (j * 13) % 10 / 100;
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
  { pos: [-10, 18, -22], scale: [2.2, 1.0, 1.5] },
  { pos: [12, 20, -18], scale: [2.0, 0.9, 1.6] },
  { pos: [-2, 22, -28], scale: [2.5, 1.1, 1.8] },
  { pos: [18, 17, 0], scale: [1.8, 0.9, 1.4] },
  { pos: [-18, 19, 5], scale: [2.0, 1.0, 1.5] },
];
const Cloud = ({ pos, scale }) => (
  <group position={pos} scale={scale}>
    <mesh>
      <sphereGeometry args={[1.5, 12, 10]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </mesh>
    <mesh position={[1.0, 0.1, 0.2]}>
      <sphereGeometry args={[1.1, 12, 10]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </mesh>
    <mesh position={[-0.9, -0.1, 0.1]}>
      <sphereGeometry args={[1.0, 12, 10]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
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
const BankTree = ({ pos, scale = 1 }) => {
  const foliageRef = useRef();
  // Phase deterministik dari position — supaya 2 tree dengan posisi
  // sama selalu sync, tapi tree berbeda nggak.
  const phase = (pos[0] + pos[2]) * 0.3;

  useFrame((state) => {
    if (!foliageRef.current) return;
    const t = state.clock.elapsedTime;
    foliageRef.current.rotation.z = Math.sin(t * 0.6 + phase) * 0.025;
    foliageRef.current.rotation.x = Math.cos(t * 0.5 + phase) * 0.02;
  });

  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 1.6, 8]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Foliage group — sway via parent rotation di useFrame.
          Anchor rotation di base pohon (y=0) supaya pohon "goyang"
          di atasnya, bukan rotate di tengah. */}
      <group ref={foliageRef} position={[0, 1.6, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <sphereGeometry args={[0.55, 12, 10]} />
          <meshStandardMaterial color="#5a8045" roughness={0.8} />
        </mesh>
        <mesh position={[0.18, 0.45, 0.05]} castShadow>
          <sphereGeometry args={[0.4, 12, 10]} />
          <meshStandardMaterial color="#6e9358" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
};

// Pohon di perimeter danau — 4 sisi. Posisi nge-frame scene tanpa
// nutupin lily pads atau bench/dock area.
const BANK_TREE_POSITIONS = [
  // Kiri (jauh dari path biar nggak nutupin bench)
  { pos: [-12.0, 0, -10], scale: 1.1 },
  { pos: [-11.5, 0, -1], scale: 0.95 },
  { pos: [-12.5, 0, 8], scale: 1.05 },
  // Kanan (jauh dari dock)
  { pos: [12.0, 0, -11], scale: 1.0 },
  { pos: [12.5, 0, -2], scale: 1.1 },
  { pos: [11.8, 0, 10], scale: 0.9 },
  // Atas (-z)
  { pos: [-6, 0, -17], scale: 1.0 },
  { pos: [3, 0, -18], scale: 1.1 },
  { pos: [8, 0, -16.5], scale: 0.95 },
  // Bawah (+z)
  { pos: [-7, 0, 17], scale: 1.05 },
  { pos: [2, 0, 18], scale: 1.0 },
  { pos: [9, 0, 17.5], scale: 0.9 },
];

const BankTrees = () => (
  <>
    {BANK_TREE_POSITIONS.map((t, i) => (
      <BankTree key={`bank-tree-${i}`} pos={t.pos} scale={t.scale} />
    ))}
  </>
);

// Danau lebar di tengah taman — RIVER_WIDTH × RIVER_LENGTH (deklarasi
// di top file untuk hindari TDZ). Deep night blue dengan metalness
// moderate + roughness sedang untuk reflection halus dari moonlight
// + lentera. Static (no shader wave) untuk performa.
// Permukaan air pakai MeshReflectorMaterial dari drei — beneran
// mantulin pohon, langit, awan. Blur 300/100 untuk soft reflection,
// mixStrength 35 untuk balance antara reflection vs base color.
// Mobile fallback: plain meshStandardMaterial (reflector mahal di GPU
// terbatas).
// Permukaan air: subtle reflection, BUKAN chrome mirror. Real water
// punya base color biru kuat + soft reflection scattered. Settings
// di-tune supaya warna air (deep teal-blue) keras dominan, refleksi
// langit/pohon cuma sentuhan tipis di permukaan — bukan mirror.
//
// Key params:
// - mirror 0.2 (was 0.5): refleksi subtle, base color tetap kebaca
// - mixStrength 8 (was 35): reflection ngebagusin warna, nggak nutupin
// - blur [800, 300]: refleksi sangat soft (kayak water dengan riak)
// - color #2d5470 (deep teal): base warna air yang tenang & dalam
// - roughness 0.85: matte permukaan air (bukan glassy)
// - metalness 0.05 (was 0.3): non-metalik
const River = ({ isMobile = false }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
    <planeGeometry args={[RIVER_WIDTH, RIVER_LENGTH]} />
    {isMobile ? (
      <meshStandardMaterial
        color="#3a6485"
        roughness={0.7}
        metalness={0.1}
      />
    ) : (
      <MeshReflectorMaterial
        blur={[800, 300]}
        resolution={512}
        mixBlur={2}
        mixStrength={8}
        roughness={0.85}
        depthScale={0.4}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.0}
        color="#2d5470"
        metalness={0.05}
        mirror={0.2}
      />
    )}
  </mesh>
);

// Banks rumput keliling 4 sisi danau + lapangan taman luar. Tone
// earthy-green (slightly desaturated) — biar dense grass blades di
// atasnya yang ngasih warna utama, plane bawah cuma jadi base supaya
// nggak ada gap. Tiap bank tone sedikit beda untuk break uniformity.
const Banks = () => (
  <>
    {/* Lapangan utama — frame visual luar, base earthy green */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.07, 0]}
      receiveShadow
    >
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial color="#536d3f" roughness={1} />
    </mesh>
    {/* Bank kiri (-x) — lebih lebar karena di sini ada bench + path */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[-(RIVER_WIDTH / 2 + 5), -0.04, 0]}
      receiveShadow
    >
      <planeGeometry args={[10, RIVER_LENGTH + 2]} />
      <meshStandardMaterial color="#5e7a48" roughness={1} />
    </mesh>
    {/* Bank kanan (+x) — sini ada dock */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[RIVER_WIDTH / 2 + 5, -0.04, 0]}
      receiveShadow
    >
      <planeGeometry args={[10, RIVER_LENGTH + 2]} />
      <meshStandardMaterial color="#587343" roughness={1} />
    </mesh>
    {/* Bank atas (-z) */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.04, -(RIVER_LENGTH / 2 + 4)]}
      receiveShadow
    >
      <planeGeometry args={[RIVER_WIDTH + 20, 8]} />
      <meshStandardMaterial color="#5b7846" roughness={1} />
    </mesh>
    {/* Bank bawah (+z) */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.04, RIVER_LENGTH / 2 + 4]}
      receiveShadow
    >
      <planeGeometry args={[RIVER_WIDTH + 20, 8]} />
      <meshStandardMaterial color="#557243" roughness={1} />
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
  // Bank atas (-z)
  { pos: [-2, 0, -16], color: '#5a8045' },
  { pos: [4, 0, -17], color: '#6e9358' },
  { pos: [-7, 0, -17.5], color: '#5a8045' },
  { pos: [9, 0, -16], color: '#65884d' },
  { pos: [-1, 0, -18.5], color: '#4f7438' },
  // Bank bawah (+z)
  { pos: [-3, 0, 16.5], color: '#4f7438' },
  { pos: [2, 0, 17], color: '#5a8045' },
  { pos: [-7, 0, 17.5], color: '#6e9358' },
  { pos: [10, 0, 18], color: '#65884d' },
  { pos: [0, 0, 18.5], color: '#5a8045' },
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
  return false;
};

// Generate posisi blade rumput pada grid jittered + filter landmark.
// densityScale lebih besar = grid lebih rapat = lebih banyak blade.
const generateGrassBlades = (densityScale = 1) => {
  const cellSize = 0.42 / densityScale;
  const halfExtent = 17;
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
const GROUND_PATCH_DEFS = [
  { pos: [-9, -0.035, -10], r: 1.6, color: '#5a7a45' },
  { pos: [-12, -0.035, 2], r: 2.0, color: '#4f6c3c' },
  { pos: [-10, -0.035, 8], r: 1.4, color: '#6e9358' },
  { pos: [-13, -0.035, -4], r: 1.8, color: '#557240' },
  { pos: [10, -0.035, -10], r: 1.6, color: '#4f6c3c' },
  { pos: [12, -0.035, -2], r: 1.5, color: '#6e9358' },
  { pos: [13, -0.035, 8], r: 1.7, color: '#5a7a45' },
  { pos: [11, -0.035, 12], r: 1.4, color: '#557240' },
  { pos: [-2, -0.035, -16], r: 1.8, color: '#5a7a45' },
  { pos: [5, -0.035, -16.5], r: 1.5, color: '#4f6c3c' },
  { pos: [-5, -0.035, 16.5], r: 1.6, color: '#6e9358' },
  { pos: [3, -0.035, 17], r: 1.5, color: '#557240' },
  { pos: [-9, -0.035, 13], r: 1.3, color: '#5a7a45' },
  { pos: [9, -0.035, -14], r: 1.4, color: '#6e9358' },
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

const TelagaScene = ({
  pads,
  hoveredPadId,
  isMobile,
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
    {/* IBL preset 'park' (lebih netral) bukan 'sunset' (over-warm).
        Match late afternoon, bukan extreme golden hour. */}
    {!isMobile && <Environment preset="park" background={false} />}
    {/* Fog lebih dense — distant elements fade ke haze, kasih sense
        atmospheric depth & "world has limits". Far 55 (was 75) bikin
        ground mist + distant trees + hills nyatu di horizon haze. */}
    <fog attach="fog" args={['#cdd8e2', 22, 55]} />
    {/* Ambient netral hangat */}
    <ambientLight intensity={isMobile ? 0.7 : 0.5} color="#ffeed8" />
    {/* Sun directional — late afternoon: tinggi cukup untuk
        illuminate scene, warm tone ringan. */}
    <directionalLight
      position={[8, 12, 4]}
      intensity={1.4}
      color="#ffe0b8"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-25}
      shadow-camera-right={25}
      shadow-camera-top={25}
      shadow-camera-bottom={-25}
      shadow-camera-near={0.5}
      shadow-camera-far={60}
      shadow-bias={-0.0005}
    />
    {/* Sky fill — cool blue dari arah berlawanan untuk balance */}
    <directionalLight
      position={[-6, 6, -4]}
      intensity={0.4}
      color="#b8d0e8"
    />
    <DistantHills />
    <DistantTreeLine />
    <Clouds />
    <Birds />
    <Banks />
    <GroundPatches />
    <WalkPath />
    <River isMobile={isMobile} />
    <RiverStones />
    <GrassTufts />
    <GrassBlades densityScale={isMobile ? 0.5 : 1} />
    <Bench />
    <BenchVisitor />
    <Dock />
    <Bridge />
    <SignPost />
    <PicnicTable />
    <Cattails />
    <Wildflowers />
    <Sunflowers />
    <Mushrooms />
    <Bushes />
    <Lanterns />
    <BankTrees />
    <Ducks />
    <JumpingFishes />
    <PaperBoats />
    <Butterflies />
    <Dragonflies />
    <Fireflies count={isMobile ? 8 : 14} />
    <FallingPetals count={isMobile ? 60 : 120} />
    <GroundMist count={isMobile ? 60 : 100} />
    {pads.map((pad) => (
      <LilyWishPad
        key={pad.id}
        pad={pad}
        hovered={hoveredPadId === pad.id}
        onPointerOver={onPadHover}
        onPointerOut={onPadOut}
        onClick={onPadClick}
      />
    ))}
    <OrbitControls
      target={[0, 0, 0]}
      enableZoom
      minDistance={12}
      maxDistance={32}
      enablePan={false}
      minPolarAngle={Math.PI / 4.5}
      maxPolarAngle={Math.PI / 2.4}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.4}
      autoRotate
      autoRotateSpeed={0.25}
    />
  </>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#0a1320] text-white/50 text-sm">
    Memuat telaga harapan...
  </div>
);

const TelagaHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5">
    <div className="pointer-events-auto">
      <Link
        to="/taman/peta"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        ← Peta Taman
      </Link>
    </div>
    <div
      className="text-white/85 text-sm tracking-wide"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      Telaga Harapan
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/wishes"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        Tinggalkan wish →
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

// Palet teratai bloom — variasi pink/peach/cream/lavender supaya
// telaga kerasa kayak ladang teratai mekar, bukan stamping.
const BLOOM_COLORS = [
  '#f4a8c0', // pink
  '#f4c890', // peach
  '#f5e0c0', // warm cream
  '#d4a8e0', // lavender
  '#f48ba0', // dusty rose
  '#f4d870', // sunny yellow
];
// Daun teratai — variasi hijau cerah (siang) untuk match daytime mood
const LEAF_COLORS = ['#5a8045', '#6e9358', '#4f7438', '#65884d'];

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
  const zMax = RIVER_LENGTH / 2 - 2;

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
    // Clamp ke water bounds
    x = Math.max(-xMax, Math.min(xMax, x));
    z = Math.max(-zMax, Math.min(zMax, z));
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

const TamanKolamKataPage = () => {
  const isMobile = useIsMobile();
  const [hoveredPadId, setHoveredPadId] = useState(null);
  const [selectedPad, setSelectedPad] = useState(null);
  const [firebaseWishes, setFirebaseWishes] = useState([]);

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
        title="Telaga Harapan"
        description="Telaga teratai dengan harapan-harapan dari fans untuk Eli — wish wall dalam bentuk taman 3D."
        path="/taman/r3"
      />
      <div className="relative w-full h-screen bg-[#0a1320] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: [13, 9, 12] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={!isMobile}
            onCreated={({ camera }) => {
              camera.lookAt(0, 0, 0);
            }}
          >
            <TelagaScene
              pads={pads}
              hoveredPadId={hoveredPadId}
              isMobile={isMobile}
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
        <TelagaFooter hoveredPadId={hoveredPadId} totalPads={pads.length} />
        <WishOverlay pad={selectedPad} onClose={handleClose} />
        <AmbientAudio profile="taman" position="top-right" />
      </div>
    </>
  );
};

export default TamanKolamKataPage;
