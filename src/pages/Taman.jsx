/**
 * Taman Kebaikan — Fase 1, R0 "Padang Tandus".
 *
 * Pintu masuk Taman Kebaikan. Dunia di sini terasa kering & terik —
 * sebelum kebaikan tumbuh, hanya ada padang yang gersang dengan
 * langit sore yang berdebu. Saat user melangkah masuk, panas mereda,
 * suhu turun, dan langit pelan-pelan jadi senja taman.
 *
 * Mood shift bukan grayscale → color (kayak konsep museum awal),
 * tapi heat → cool. Drought → spring. Visual axes yang berubah saat
 * transisi:
 *   - Background & fog: warm hazy orange-brown (#5a3a25) → cool
 *     twilight blue-warm (#1c1f2a, match /taman/peta)
 *   - Vignette darkness: 0.7 → 0.3 (claustrofobia mereda)
 *   - Fog far: 28 → 60 (jarak pandang membuka)
 *   - Bloom intensity: peak sin πt × 1.5 di tengah → settle 0.4
 *     (cahaya menyembur sebagai catharsis)
 *
 * State machine ruangan ini ada 4 stage:
 *   idle         — kamera dolly maju, teks pembuka fade-in, padang
 *                  warm hazy, belum bisa di-click
 *   active       — dolly selesai; "tap untuk masuk" muncul; click di
 *                  mana saja akan mulai transisi
 *   transitioning — tween 3 detik di semua axes di atas
 *   done         — overlay "kehidupan telah kembali" + tombol lanjut
 *                  ke /taman/peta (peta taman) atau ulangi/keluar.
 *
 * Catatan teknis: postprocessing pakai controlled props (saturation,
 * darkness sebagai prop biasa), BUKAN ref-based mutation. @react-three/
 * postprocessing v3 forward ref ke Effect instance yang punya circular
 * reference ke EffectComposer parent — ngakibatin crash circular JSON
 * saat Vite HMR / DevTools coba serialize. Tween-nya dijalanin di
 * parent component pakai requestAnimationFrame + setState. Overhead
 * 60 re-render/detik selama 3 detik = bounded, nggak bermasalah.
 *
 * Performance budget: target 60fps desktop, 30fps+ mobile. Kalau drop,
 * kandidat downgrade: kurangi DustParticles count, matiin antialias,
 * dpr cap ke 1 di mobile.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';

// Hook deteksi mobile via matchMedia. Re-evaluate saat resize. Pakai
// untuk turunin DustParticles count dan dpr supaya R0 tetep smooth di
// HP entry-level. Threshold 768px = batas Tailwind md breakpoint.
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

const TRANSITION_DURATION = 3.0; // detik
const DOLLY_DURATION = 12.0;

// Palette Padang Tandus.
// IDLE/ACTIVE: warm hazy drought tone — kerasa kayak senja kemarau yang
// panjang, berdebu, sunyi.
// DONE: cool twilight — match palette /taman/peta supaya transisi
// halaman ke ranah peta taman kerasa kontinu visualnya.
const BG_DROUGHT = '#5a3a25';
const BG_TWILIGHT = '#1c1f2a';
const GROUND_COLOR = '#3a2a1a'; // cracked-dirt tone, statis
const GATE_COLOR = '#1f1814'; // weathered dark warm

// Lerp dua warna hex per channel — dipake untuk transisi bg/fog color
// di useEffect tick. Lebih murah dari instansiate THREE.Color tiap frame.
const lerpHex = (a, b, t) => {
  const av = parseInt(a.slice(1), 16);
  const bv = parseInt(b.slice(1), 16);
  const ar = (av >> 16) & 0xff;
  const ag = (av >> 8) & 0xff;
  const ab = av & 0xff;
  const br = (bv >> 16) & 0xff;
  const bg = (bv >> 8) & 0xff;
  const bb = bv & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
};

// Gerbang taman — pilar kayu weathered + 2 cross-beam (atas + tengah)
// + plank detail + hanging cloth tirai dgn gentle wind sway. Tone
// dark warm masih sesuai drought, tapi punya struktur lebih kerasa
// "gerbang" bukan abstract rect 3 box.
const Gate = () => {
  const tiraiLRef = useRef();
  const tiraiRRef = useRef();
  const chainRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (tiraiLRef.current) {
      tiraiLRef.current.rotation.x = Math.sin(t * 0.7) * 0.08;
    }
    if (tiraiRRef.current) {
      tiraiRRef.current.rotation.x = Math.sin(t * 0.7 + 0.4) * 0.08;
    }
    if (chainRef.current) {
      chainRef.current.rotation.z = Math.sin(t * 0.9) * 0.05;
    }
  });
  return (
    <group position={[0, 0, 0]}>
    {/* Stone bases di bawah pillar — kasih grounded feel */}
    <mesh position={[-2.2, 0.2, 0]}>
      <boxGeometry args={[0.7, 0.4, 0.7]} />
      <meshStandardMaterial color="#3a2e22" roughness={1} />
    </mesh>
    <mesh position={[2.2, 0.2, 0]}>
      <boxGeometry args={[0.7, 0.4, 0.7]} />
      <meshStandardMaterial color="#3a2e22" roughness={1} />
    </mesh>
    {/* Pilar kayu */}
    <mesh position={[-2.2, 2.2, 0]}>
      <boxGeometry args={[0.4, 4, 0.4]} />
      <meshStandardMaterial color={GATE_COLOR} roughness={0.95} />
    </mesh>
    <mesh position={[2.2, 2.2, 0]}>
      <boxGeometry args={[0.4, 4, 0.4]} />
      <meshStandardMaterial color={GATE_COLOR} roughness={0.95} />
    </mesh>
    {/* Pillar plank vertical accent (slight lighter strip di sisi) */}
    <mesh position={[-2.2, 2.2, 0.205]}>
      <boxGeometry args={[0.08, 3.6, 0.02]} />
      <meshStandardMaterial color="#2a1f15" roughness={0.95} />
    </mesh>
    <mesh position={[2.2, 2.2, 0.205]}>
      <boxGeometry args={[0.08, 3.6, 0.02]} />
      <meshStandardMaterial color="#2a1f15" roughness={0.95} />
    </mesh>
    {/* Cross-beam atas */}
    <mesh position={[0, 4.4, 0]}>
      <boxGeometry args={[5.2, 0.45, 0.45]} />
      <meshStandardMaterial color={GATE_COLOR} roughness={0.95} />
    </mesh>
    {/* Cross-beam atas atas (decorative kasagi style) */}
    <mesh position={[0, 4.8, 0]}>
      <boxGeometry args={[5.6, 0.18, 0.55]} />
      <meshStandardMaterial color="#181210" roughness={0.95} />
    </mesh>
    {/* Cross-beam tengah */}
    <mesh position={[0, 3.4, 0]}>
      <boxGeometry args={[4.8, 0.18, 0.35]} />
      <meshStandardMaterial color="#1a1410" roughness={0.95} />
    </mesh>
    {/* Plaque kayu di tengah cross-beam atas — sign Taman Kebaikan */}
    <mesh position={[0, 4.4, 0.24]}>
      <boxGeometry args={[1.2, 0.32, 0.04]} />
      <meshStandardMaterial color="#3a2818" roughness={0.9} />
    </mesh>
    <mesh position={[0, 4.4, 0.265]}>
      <boxGeometry args={[1.0, 0.18, 0.005]} />
      <meshStandardMaterial color="#6a4d2f" roughness={0.85} />
    </mesh>
    {/* Hanging cloth tirai dari cross-beam tengah — 2 strip kain
        weathered dgn gentle wind sway. Anchor di top, pivot rotation.x. */}
    <group ref={tiraiLRef} position={[-1.3, 3.4, 0.2]}>
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[0.4, 1.4, 0.02]} />
        <meshStandardMaterial color="#4a3022" roughness={0.95} />
      </mesh>
    </group>
    <group ref={tiraiRRef} position={[1.3, 3.4, 0.2]}>
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[0.4, 1.4, 0.02]} />
        <meshStandardMaterial color="#4a3022" roughness={0.95} />
      </mesh>
    </group>
    {/* Small hanging chain ornament dari beam atas (silhouette ringan)
        dgn subtle swing. Anchor top, rotate.z. */}
    <group ref={chainRef} position={[0, 4.0, 0.2]}>
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[0.04, 0.3, 0.04]} />
        <meshStandardMaterial color="#2a1d12" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.45, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#1a1410" roughness={0.95} />
      </mesh>
    </group>
  </group>
  );
};

// Pohon mati di samping gerbang — siluet yang nguatin metafor
// "padang yang sudah lama tak hujan". Trunk bengkok + 3 ranting
// gundul tanpa daun. Tone gelap dengan tint warm-brown supaya
// blend in dengan padang kering. Posisinya offset ke kiri gerbang
// supaya nggak nutupin pintu masuk.
const DeadTree = () => (
  <group position={[-5, 0, -1]}>
    {/* Trunk dengan rotation slight tilt — kerasa lelah */}
    <mesh position={[0, 1.5, 0]} rotation={[0, 0, 0.08]}>
      <cylinderGeometry args={[0.12, 0.22, 3, 6]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    {/* Cabang utama kanan */}
    <mesh position={[0.55, 2.7, 0]} rotation={[0, 0, -1.0]}>
      <cylinderGeometry args={[0.05, 0.1, 1.2, 5]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    {/* Cabang utama kiri */}
    <mesh position={[-0.4, 2.5, 0]} rotation={[0, 0, 0.9]}>
      <cylinderGeometry args={[0.05, 0.09, 1.0, 5]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    {/* Cabang atas kecil */}
    <mesh position={[0.15, 3.4, 0.1]} rotation={[0.2, 0, 0.3]}>
      <cylinderGeometry args={[0.04, 0.06, 0.7, 5]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    {/* Sub-cabang dari ranting kanan */}
    <mesh position={[1.1, 3.0, 0]} rotation={[0, 0, -0.5]}>
      <cylinderGeometry args={[0.03, 0.04, 0.5, 4]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
  </group>
);

// Cluster dead tree extras — beberapa pohon kering scattered di
// kejauhan supaya padang gak kerasa cuma 1 deadtree solo. Variasi
// scale + tilt per def.
const EXTRA_DEAD_TREE_DEFS = [
  { pos: [8, 0, -2], scale: 0.85, tilt: -0.12 },
  { pos: [-12, 0, -8], scale: 1.1, tilt: 0.15 },
  { pos: [14, 0, -10], scale: 0.9, tilt: -0.18 },
  { pos: [-9, 0, 3], scale: 0.7, tilt: 0.05 },
];
const ExtraDeadTree = ({ pos, scale = 1, tilt = 0 }) => (
  <group position={pos} scale={scale}>
    <mesh position={[0, 1.5, 0]} rotation={[0, 0, tilt]}>
      <cylinderGeometry args={[0.1, 0.2, 3, 6]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    <mesh position={[0.45, 2.5, 0]} rotation={[0, 0, -0.9 + tilt]}>
      <cylinderGeometry args={[0.04, 0.08, 1.0, 5]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    <mesh position={[-0.35, 2.4, 0]} rotation={[0, 0, 0.85 + tilt]}>
      <cylinderGeometry args={[0.04, 0.08, 0.9, 5]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    <mesh position={[0.1, 3.1, 0]} rotation={[0.1, 0, 0.3 + tilt]}>
      <cylinderGeometry args={[0.03, 0.05, 0.6, 4]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
  </group>
);
const ExtraDeadTrees = ({ isMobile }) => {
  const list = isMobile ? EXTRA_DEAD_TREE_DEFS.slice(0, 2) : EXTRA_DEAD_TREE_DEFS;
  return (
    <>
      {list.map((d, i) => (
        <ExtraDeadTree key={`dt-${i}`} pos={d.pos} scale={d.scale} tilt={d.tilt} />
      ))}
    </>
  );
};

// Distant hills silhouette ring — siluet bukit jauh di horizon supaya
// "padang" gak kerasa flat infinite. Pakai dome ring trick: low cone
// rim ngitarin scene. Tone darker daripada ground.
const DistantHills = () => {
  const hillDefs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const r = 26;
        const scale = 0.8 + ((i * 7) % 6) * 0.15;
        return {
          pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
          scale,
          rot: angle + Math.PI / 2,
        };
      }),
    []
  );
  return (
    <>
      {hillDefs.map((h, i) => (
        <mesh key={`hill-${i}`} position={h.pos} rotation={[0, h.rot, 0]}>
          <coneGeometry args={[3 * h.scale, 1.6 * h.scale, 5]} />
          <meshStandardMaterial color="#3a2820" roughness={1} fog />
        </mesh>
      ))}
    </>
  );
};

// Dry grass tufts — small clusters of dead yellow-brown grass blades,
// scattered di tanah supaya gak completely barren plane.
const DRY_GRASS_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + ((i * 17) % 7) * 0.1;
    const r = 3 + ((i * 13) % 15);
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      rot: ((i * 31) % 360) * (Math.PI / 180),
      color: ['#7a6038', '#8a6c3a', '#6a5430'][i % 3],
      h: 0.18 + ((i * 11) % 5) * 0.04,
    });
  }
  return arr;
})();
const DryGrassTuft = ({ pos, rot, color, h }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh
        key={i}
        position={[(i - 2) * 0.04, h / 2, ((i * 7) % 3 - 1) * 0.03]}
        rotation={[0, 0, (i - 2) * 0.15]}
      >
        <boxGeometry args={[0.015, h, 0.015]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    ))}
  </group>
);
const DryGrassTufts = ({ isMobile }) => {
  const list = isMobile ? DRY_GRASS_DEFS.slice(0, 14) : DRY_GRASS_DEFS;
  return (
    <>
      {list.map((d, i) => (
        <DryGrassTuft key={`dg-${i}`} pos={d.pos} rot={d.rot} color={d.color} h={d.h} />
      ))}
    </>
  );
};

// Scattered rocks — small dark rock formations untuk variasi tanah.
const ROCK_DEFS = [
  { pos: [4, 0, 1], scale: 0.6, rot: 0.3 },
  { pos: [-6, 0, -3], scale: 0.8, rot: 1.2 },
  { pos: [9, 0, -5], scale: 0.45, rot: 0.7 },
  { pos: [-3, 0, 4], scale: 0.55, rot: -0.4 },
  { pos: [7, 0, 6], scale: 0.5, rot: 2.1 },
  { pos: [-11, 0, 1], scale: 0.7, rot: 1.5 },
];
const Rock = ({ pos, scale, rot }) => (
  <group position={pos} rotation={[0, rot, 0]} scale={scale}>
    <mesh position={[0, 0.18, 0]}>
      <dodecahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color="#3a2e22" roughness={1} flatShading />
    </mesh>
    <mesh position={[0.18, 0.12, 0.1]} scale={0.7}>
      <dodecahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial color="#2a2018" roughness={1} flatShading />
    </mesh>
  </group>
);
const Rocks = ({ isMobile }) => {
  const list = isMobile ? ROCK_DEFS.slice(0, 4) : ROCK_DEFS;
  return (
    <>
      {list.map((r, i) => (
        <Rock key={`rock-${i}`} pos={r.pos} scale={r.scale} rot={r.rot} />
      ))}
    </>
  );
};

// Broken lantern post — di samping gate, weathered & unlit. Narrative
// hint "dulu ada cahaya di sini". Akan jadi "alive" lagi setelah masuk
// taman (subtle storytelling).
const BrokenLanternPost = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Stone base */}
    <mesh position={[0, 0.15, 0]}>
      <boxGeometry args={[0.34, 0.3, 0.34]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    {/* Pole — slight tilt seperti udah miring */}
    <mesh position={[0.05, 1.3, 0]} rotation={[0, 0, 0.08]}>
      <cylinderGeometry args={[0.05, 0.06, 2.2, 6]} />
      <meshStandardMaterial color={GATE_COLOR} roughness={0.95} />
    </mesh>
    {/* Broken lantern body (cracked, no glow) */}
    <mesh position={[0.18, 2.3, 0]} rotation={[0, 0, 0.08]}>
      <boxGeometry args={[0.24, 0.28, 0.24]} />
      <meshStandardMaterial color="#1a1208" roughness={1} />
    </mesh>
    {/* Crack accent — small offset piece, kerasa "pecah" */}
    <mesh position={[0.32, 2.18, 0.13]} rotation={[0.3, 0.2, -0.2]}>
      <boxGeometry args={[0.08, 0.12, 0.05]} />
      <meshStandardMaterial color="#0d0805" roughness={1} />
    </mesh>
    {/* Sloped roof small */}
    <mesh position={[0.18, 2.5, 0]} rotation={[0, 0, 0.08]}>
      <coneGeometry args={[0.2, 0.12, 4]} />
      <meshStandardMaterial color="#181210" roughness={0.95} />
    </mesh>
  </group>
);

// Bones scattered — sedikit, sebagai drama akhir kemarau. Pakai
// stylized: 2 elongated boxes (ribs) + 1 sphere (skull-ish). Subtle.
const BONE_DEFS = [
  { pos: [-7, 0, 5], rot: 0.5 },
  { pos: [10, 0, 2], rot: 1.3 },
];
const Bones = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Skull base (sphere flatter) */}
    <mesh position={[0, 0.06, 0]} scale={[0.18, 0.12, 0.16]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#a8a098" roughness={0.95} />
    </mesh>
    {/* Eye sockets (2 dark dots) */}
    <mesh position={[-0.06, 0.08, 0.14]}>
      <sphereGeometry args={[0.02, 6, 5]} />
      <meshStandardMaterial color="#1a1208" roughness={1} />
    </mesh>
    <mesh position={[0.06, 0.08, 0.14]}>
      <sphereGeometry args={[0.02, 6, 5]} />
      <meshStandardMaterial color="#1a1208" roughness={1} />
    </mesh>
    {/* Rib 1 */}
    <mesh position={[0.22, 0.04, 0.05]} rotation={[0, 0.3, -0.1]}>
      <boxGeometry args={[0.28, 0.04, 0.04]} />
      <meshStandardMaterial color="#9a9088" roughness={0.95} />
    </mesh>
    {/* Rib 2 */}
    <mesh position={[0.25, 0.04, -0.08]} rotation={[0, 0.2, 0.05]}>
      <boxGeometry args={[0.32, 0.04, 0.04]} />
      <meshStandardMaterial color="#a8a098" roughness={0.95} />
    </mesh>
    {/* Long bone */}
    <mesh position={[-0.25, 0.03, -0.08]} rotation={[0, 0.6, Math.PI / 2]}>
      <cylinderGeometry args={[0.025, 0.025, 0.36, 6]} />
      <meshStandardMaterial color="#a8a098" roughness={0.95} />
    </mesh>
  </group>
);
const BonesScatter = ({ isMobile }) => {
  const list = isMobile ? BONE_DEFS.slice(0, 1) : BONE_DEFS;
  return (
    <>
      {list.map((b, i) => (
        <Bones key={`bones-${i}`} pos={b.pos} rot={b.rot} />
      ))}
    </>
  );
};

// Vulture silhouette circling high di sky — drift slow di lingkaran
// besar, kasih atmospheric drought drama. Wing flap subtle.
const Vulture = () => {
  const ref = useRef();
  const wingLRef = useRef();
  const wingRRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!ref.current) return;
    const orbitR = 14;
    ref.current.position.x = Math.cos(t * 0.12) * orbitR;
    ref.current.position.z = Math.sin(t * 0.12) * orbitR;
    ref.current.position.y = 8 + Math.sin(t * 0.25) * 0.5;
    ref.current.rotation.y = -t * 0.12 + Math.PI / 2;
    // Wing flap — slow lazy
    const flap = Math.sin(t * 2.4) * 0.18;
    if (wingLRef.current) wingLRef.current.rotation.z = 0.3 + flap;
    if (wingRRef.current) wingRRef.current.rotation.z = -0.3 - flap;
  });
  return (
    <group ref={ref} position={[14, 8, 0]}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.12, 0.06, 0.32]} />
        <meshBasicMaterial color="#1a1208" fog={false} />
      </mesh>
      {/* Wing L */}
      <mesh ref={wingLRef} position={[-0.1, 0, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.1]} />
        <meshBasicMaterial color="#1a1208" fog={false} />
      </mesh>
      {/* Wing R */}
      <mesh ref={wingRRef} position={[0.1, 0, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.1]} />
        <meshBasicMaterial color="#1a1208" fog={false} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[0.06, 0.02, 0.12]} />
        <meshBasicMaterial color="#1a1208" fog={false} />
      </mesh>
    </group>
  );
};

// High thin clouds — flat hazy streaks di sky behind sun, kasih
// texture langit yg dustyhot. Static (no drift) untuk perf.
const HIGH_CLOUD_DEFS = [
  { pos: [-8, 9, -18], scale: [3.2, 0.18, 1] },
  { pos: [6, 11, -22], scale: [4, 0.22, 1] },
  { pos: [-2, 10, -24], scale: [2.6, 0.16, 1] },
  { pos: [12, 12, -20], scale: [2.2, 0.14, 1] },
];
const HighClouds = () => (
  <>
    {HIGH_CLOUD_DEFS.map((c, i) => (
      <mesh key={`hc-${i}`} position={c.pos} scale={c.scale}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#c4906a" transparent opacity={0.32} fog={false} />
      </mesh>
    ))}
  </>
);

// Sun mesh — low orange sun di sky behind gate, kasih visible
// orientation light source. Hazy soft (no harsh ring).
const Sun = () => (
  <group position={[3, 7, -22]}>
    {/* Sun core */}
    <mesh>
      <sphereGeometry args={[1.4, 16, 12]} />
      <meshBasicMaterial color="#ffc488" fog={false} />
    </mesh>
    {/* Sun halo outer */}
    <mesh>
      <sphereGeometry args={[2.2, 14, 10]} />
      <meshBasicMaterial color="#f4a070" transparent opacity={0.35} fog={false} />
    </mesh>
    <mesh>
      <sphereGeometry args={[3.2, 14, 10]} />
      <meshBasicMaterial color="#d4806c" transparent opacity={0.15} fog={false} />
    </mesh>
  </group>
);

// Crow perched on dead tree — silhouette dgn occasional wing twitch +
// subtle head bob. Thematic top of DeadTree.
const PerchedCrow = ({ pos }) => {
  const wingsRef = useRef();
  const headRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Wing twitch — pulse setiap ~5s
    if (wingsRef.current) {
      const twitch = Math.max(0, Math.sin(t * 0.6)) * Math.sin(t * 5);
      wingsRef.current.rotation.z = twitch * 0.2;
    }
    // Head bob slight
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.3;
    }
  });
  return (
    <group position={pos}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshBasicMaterial color="#0a0805" fog={false} />
      </mesh>
      {/* Tail */}
      <mesh position={[-0.12, -0.02, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.14, 0.04, 0.06]} />
        <meshBasicMaterial color="#0a0805" fog={false} />
      </mesh>
      {/* Wings */}
      <group ref={wingsRef}>
        <mesh position={[0, 0.02, 0.07]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.16, 0.04, 0.08]} />
          <meshBasicMaterial color="#0a0805" fog={false} />
        </mesh>
        <mesh position={[0, 0.02, -0.07]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.16, 0.04, 0.08]} />
          <meshBasicMaterial color="#0a0805" fog={false} />
        </mesh>
      </group>
      {/* Head + beak */}
      <group ref={headRef} position={[0.1, 0.08, 0]}>
        <mesh>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshBasicMaterial color="#0a0805" fog={false} />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[0, 0, -0.2]}>
          <coneGeometry args={[0.022, 0.08, 5]} />
          <meshBasicMaterial color="#3a2818" fog={false} />
        </mesh>
        {/* Eye dot */}
        <mesh position={[0.025, 0.02, 0.05]}>
          <sphereGeometry args={[0.012, 6, 5]} />
          <meshBasicMaterial color="#c84838" fog={false} />
        </mesh>
      </group>
      {/* Legs (thin) */}
      <mesh position={[0, -0.12, 0.04]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 4]} />
        <meshBasicMaterial color="#0a0805" fog={false} />
      </mesh>
      <mesh position={[0, -0.12, -0.04]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 4]} />
        <meshBasicMaterial color="#0a0805" fog={false} />
      </mesh>
    </group>
  );
};

// Sand dunes — low wide mounds di tanah supaya ground gak rata
// sempurna. Pakai sphere flatten + tone slightly lighter dari ground.
const DUNE_DEFS = [
  { pos: [-14, 0, 6], scale: [3.2, 0.5, 2.4], color: '#4a3525' },
  { pos: [16, 0, 3], scale: [3.8, 0.6, 2.6], color: '#403020' },
  { pos: [-10, 0, -14], scale: [2.8, 0.45, 2.2], color: '#4a3525' },
  { pos: [12, 0, -16], scale: [3.4, 0.55, 2.4], color: '#403020' },
];
const SandDune = ({ pos, scale, color }) => (
  <mesh position={pos} scale={scale}>
    <sphereGeometry args={[1, 12, 8]} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>
);
const SandDunes = ({ isMobile }) => {
  const list = isMobile ? DUNE_DEFS.slice(0, 2) : DUNE_DEFS;
  return (
    <>
      {list.map((d, i) => (
        <SandDune key={`dune-${i}`} pos={d.pos} scale={d.scale} color={d.color} />
      ))}
    </>
  );
};

// Abandoned wagon wheel — weathered wood wheel terlentang di tanah.
// Storytelling prop, suggests "ada peradaban yg pernah lewat sini".
const WagonWheel = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[Math.PI / 2.2, 0, rot]}>
    {/* Outer ring */}
    <mesh>
      <torusGeometry args={[0.55, 0.05, 6, 18]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Inner hub */}
    <mesh>
      <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
      <meshStandardMaterial color="#2a1d12" roughness={0.95} />
    </mesh>
    {/* 6 spokes */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI * 2]} position={[0, 0, 0]}>
        <boxGeometry args={[0.96, 0.04, 0.04]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
    ))}
  </group>
);

// Broken fence posts — 4 segment broken wood post tersisa, kerasa
// "dulu ada pagar di sini". Variasi height + tilt per segment.
const FENCE_DEFS = [
  { pos: [-4.5, 0, 6], height: 0.9, tilt: 0.15, rot: 0.3 },
  { pos: [-3.0, 0, 6.5], height: 0.4, tilt: -0.2, rot: 0.4 },
  { pos: [-1.5, 0, 6.8], height: 0.7, tilt: 0.1, rot: 0.2 },
  { pos: [4.2, 0, 7], height: 0.5, tilt: -0.3, rot: -0.2 },
];
const FencePost = ({ pos, height, tilt, rot }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <mesh position={[0, height / 2, 0]} rotation={[0, 0, tilt]}>
      <boxGeometry args={[0.1, height, 0.08]} />
      <meshStandardMaterial color={GATE_COLOR} roughness={1} />
    </mesh>
    {/* Top crack chip */}
    <mesh position={[0.05, height, 0]} rotation={[0.3, 0, tilt + 0.2]}>
      <boxGeometry args={[0.06, 0.08, 0.04]} />
      <meshStandardMaterial color="#1a1208" roughness={1} />
    </mesh>
  </group>
);
const BrokenFence = ({ isMobile }) => {
  const list = isMobile ? FENCE_DEFS.slice(0, 2) : FENCE_DEFS;
  return (
    <>
      {list.map((f, i) => (
        <FencePost key={`fence-${i}`} {...f} />
      ))}
    </>
  );
};

// Tumbleweed — small ball rolling across padang, drift slow horizontal
// across z axis. Adds movement to otherwise static scene.
const Tumbleweed = () => {
  const ref = useRef();
  const rotRef = useRef(0);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Drift slow across scene (x axis)
    const cycle = 30; // 30s loop
    const phase = (t % cycle) / cycle;
    ref.current.position.x = -14 + phase * 28;
    ref.current.position.y = 0.35 + Math.sin(t * 2.2) * 0.06;
    ref.current.position.z = -1 + Math.sin(t * 0.7) * 0.8;
    rotRef.current += delta * 4;
    ref.current.rotation.x = rotRef.current;
    ref.current.rotation.z = rotRef.current * 0.7;
  });
  return (
    <group ref={ref} position={[-14, 0.35, -1]}>
      {/* Tumbleweed — bundle of tiny line segments approximated dgn small box ring */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 0]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.32, 0.025, 0.025]} />
            <meshStandardMaterial color="#8a6c3a" roughness={1} />
          </mesh>
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={`r-${i}`}
            position={[0, Math.cos(angle) * 0.22, Math.sin(angle) * 0.22]}
            rotation={[angle, 0, 0]}
          >
            <boxGeometry args={[0.025, 0.3, 0.025]} />
            <meshStandardMaterial color="#7a6038" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
};

// Lantai dasar — tanah retak gersang. Pakai crack lines pattern
// deterministic instead of gridHelper supaya kerasa "tanah pecah
// kering" bukan grid debug. Plus dirt path strip menuju gate.
const CRACK_DEFS = (() => {
  const arr = [];
  // 22 crack segments scattered with random length/angle, deterministic
  // dari index supaya stable across renders.
  for (let i = 0; i < 22; i++) {
    const angle = (i * 137.5) * (Math.PI / 180); // golden angle scatter
    const r = 2 + ((i * 13) % 14);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const len = 0.8 + ((i * 7) % 5) * 0.3;
    const rot = ((i * 41) % 360) * (Math.PI / 180);
    arr.push({ x, z, len, rot });
  }
  return arr;
})();
const Ground = ({ isMobile = false }) => {
  const cracks = isMobile ? CRACK_DEFS.slice(0, 14) : CRACK_DEFS;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={1} />
      </mesh>
      {/* Dirt path strip leading to gate — center alley */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 4]}>
        <planeGeometry args={[2.6, 16]} />
        <meshStandardMaterial color="#4a3625" roughness={1} />
      </mesh>
      {/* Path edges — slightly darker rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.3, 0.004, 4]}>
        <planeGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.3, 0.004, 4]}>
        <planeGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      {/* Crack lines — thin dark plane segments di tanah */}
      {cracks.map((c, i) => (
        <mesh
          key={`crack-${i}`}
          rotation={[-Math.PI / 2, 0, c.rot]}
          position={[c.x, 0.002, c.z]}
        >
          <planeGeometry args={[c.len, 0.03]} />
          <meshStandardMaterial color="#1a1208" roughness={1} />
        </mesh>
      ))}
    </>
  );
};

// Partikel debu drift pelan ke atas. Pakai BufferGeometry langsung
// supaya 300 partikel bisa render 1 draw call. Reset ke y=0 saat
// keluar atas — sirkulasi tak terhingga.
const DustParticles = ({ count = 300 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 9;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.06;
      if (arr[i * 3 + 1] > 9) arr[i * 3 + 1] = 0;
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
        size={0.06}
        color="#d4b07a"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Auto-dolly: camera mulai jauh, jalan pelan ke depan selama DURATION.
// Ease-out cubic supaya gerakannya kerasa "berjalan" — cepat di awal,
// melambat saat dekat gerbang. Saat dolly selesai, panggil
// onDollyComplete supaya parent bisa pindah stage idle → active.
//
// resetTrigger: saat parent set ulang ke nilai baru, useEffect reset
// elapsed counter — supaya restart dari "Ulangi R0" mulai dolly dari
// awal lagi tanpa harus remount Canvas.
const DollyCamera = ({
  startZ = 18,
  endZ = 6,
  duration = DOLLY_DURATION,
  resetTrigger = 0,
  onDollyComplete,
}) => {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    elapsedRef.current = 0;
    completedRef.current = false;
    camera.position.set(0, 1.6, startZ);
    camera.lookAt(0, 2, 0);
  }, [resetTrigger, camera, startZ]);

  useFrame((_, delta) => {
    elapsedRef.current = Math.min(elapsedRef.current + delta, duration);
    const t = elapsedRef.current / duration;
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.z = startZ + (endZ - startZ) * eased;
    camera.position.y = 1.6;
    camera.lookAt(0, 2, 0);

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true;
      onDollyComplete?.();
    }
  });

  return null;
};

// Mutasi langsung scene.fog.far + fog.color + scene.background warna
// berdasarkan target dari parent. Pakai useFrame supaya konsisten
// dengan render loop, dan nggak recreate fog instance tiap state
// change (yang akan terjadi kalau kita pakai args reactive di
// <fog attach="fog" args={[...]} />). Tween color via lerpHex di
// parent → string, lalu di sini set ke Color object lewat .set().
const FogTuner = ({ targetFar, targetColor }) => {
  const { scene } = useThree();
  useFrame(() => {
    if (scene.fog) {
      scene.fog.far = targetFar;
      if (targetColor) scene.fog.color.set(targetColor);
    }
    if (scene.background && scene.background.set && targetColor) {
      scene.background.set(targetColor);
    }
  });
  return null;
};

const R0Scene = ({
  fogFar,
  fogColor,
  resetTrigger,
  particleCount = 300,
  isMobile = false,
  onDollyComplete,
}) => (
  <>
    {/* args[0] = warna initial saja — actual color di-mutate per frame
        oleh FogTuner. Kasih default warm drought biar mount frame
        pertama kelihatan benar sebelum useFrame jalan. */}
    <fog attach="fog" args={[BG_DROUGHT, 8, 28]} />
    <color attach="background" args={[BG_DROUGHT]} />
    <ambientLight intensity={0.32} color="#ffe0b8" />
    {/* Sun-like directional dari sudut rendah — kerasa kayak matahari
        sore terik di kemarau panjang. Tone hangat-orange. */}
    <directionalLight
      position={[6, 5, 3]}
      intensity={1.5}
      color="#ffc070"
    />
    {/* Soft fill dari arah berlawanan supaya scene nggak black-pitch
        di sisi shadow. Tone slightly cooler untuk variasi. */}
    <directionalLight
      position={[-4, 6, -2]}
      intensity={0.3}
      color="#a8a0c0"
    />
    <Sun />
    <HighClouds />
    <DistantHills />
    <SandDunes isMobile={isMobile} />
    <Ground isMobile={isMobile} />
    <Gate />
    <BrokenLanternPost pos={[2.95, 0, 0.4]} rot={-0.2} />
    <DeadTree />
    <PerchedCrow pos={[-5.0, 3.55, -1]} />
    <ExtraDeadTrees isMobile={isMobile} />
    <DryGrassTufts isMobile={isMobile} />
    <Rocks isMobile={isMobile} />
    <BonesScatter isMobile={isMobile} />
    <WagonWheel pos={[5.5, 0.1, 4]} rot={0.4} />
    <BrokenFence isMobile={isMobile} />
    {!isMobile && <Vulture />}
    {!isMobile && <Tumbleweed />}
    <DustParticles count={particleCount} />
    <DollyCamera
      resetTrigger={resetTrigger}
      onDollyComplete={onDollyComplete}
    />
    <FogTuner targetFar={fogFar} targetColor={fogColor} />
  </>
);

// Teks pembuka fade-in setelah delay singkat, lalu fade-out saat user
// trigger transisi (stage='transitioning' atau 'done'). Dipisah dari
// Canvas (di HTML overlay) supaya sharp di semua DPR + pakai font
// Fraunces yang udah self-hosted.
const OpeningText = ({ stage, resetTrigger }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [resetTrigger]);
  const shouldShow =
    visible && (stage === 'idle' || stage === 'active');
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-[2000ms] ease-out ${
        shouldShow ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center max-w-md px-6 -mt-24">
        <p
          className="text-white/75 text-lg md:text-2xl leading-relaxed tracking-wide"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          Sebelum kebaikan, padang ini hanya bayangan.
        </p>
        <p
          className="text-white/50 text-sm md:text-base leading-relaxed tracking-wide mt-4"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          Angin masih kering, tapi gerbang menunggu.
        </p>
      </div>
    </div>
  );
};

// Hint "tap untuk masuk" dengan pulse subtle. Muncul setelah dolly
// selesai, hilang saat user click.
const TapHint = ({ visible }) => (
  <div
    className={`pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 transition-opacity duration-1000 ${
      visible ? 'opacity-80' : 'opacity-0'
    }`}
  >
    <div className="flex flex-col items-center gap-3 animate-pulse">
      <div className="text-white/70 text-sm tracking-[0.3em] uppercase">
        Tap untuk masuk taman
      </div>
      <div className="w-px h-8 bg-white/40" />
    </div>
  </div>
);

// Overlay akhir setelah transisi selesai. Untuk Fase 1 (denah belum
// dibangun), opsi yang ditampilkan: ulangi R0, atau kembali ke beranda.
// Setelah Fase 2 jadi, ganti jadi auto-navigate ke /museum/denah.
const ExitOverlay = ({ visible, onRestart }) => (
  <div
    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[1500ms] ${
      visible
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none'
    }`}
  >
    <div className="text-center max-w-md px-6 backdrop-blur-sm bg-black/30 rounded-2xl py-10 border border-white/10">
      <p
        className="text-white text-xl md:text-2xl leading-relaxed mb-2"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Kehidupan telah kembali.
      </p>
      <p className="text-white/60 text-sm leading-relaxed mb-8">
        Gerbang Taman Kebaikan telah terbuka.
        <br />
        Pilih petak untuk dijelajahi.
      </p>
      <div className="flex flex-col gap-3 justify-center px-6">
        <Link
          to="/taman/peta"
          className="px-5 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition"
        >
          Masuk Peta Taman →
        </Link>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onRestart}
            className="px-4 py-2 rounded-full border border-white/30 text-white/70 text-xs hover:bg-white/10 transition"
          >
            Ulangi gerbang
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-full border border-white/30 text-white/70 text-xs hover:bg-white/10 transition"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  </div>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat ruang museum...
  </div>
);

const MuseumPage = () => {
  const isMobile = useIsMobile();
  // Stage state machine — drives transition + UI overlays. Lihat header
  // file untuk semantik tiap stage.
  const [stage, setStage] = useState('idle');
  // Counter yang naik tiap restart — komponen anak yang perlu reset
  // local state-nya (DollyCamera, OpeningText) listen ke ini.
  const [resetTrigger, setResetTrigger] = useState(0);

  // Postprocessing values driven dari state — di-tween via rAF di
  // useEffect saat stage='transitioning'. Bukan ref mutation karena
  // postprocessing v3 ref-forward bikin circular JSON crash di HMR.
  //
  // Saturation tween-nya cuma -0.3 → 0 (drought hazy, bukan grayscale
  // total). Tujuannya kasih sedikit dust-haze feel di idle, lalu
  // saturasi pulih saat transisi.
  const [saturation, setSaturation] = useState(-0.3);
  const [vignette, setVignette] = useState(0.7);
  const [fogFar, setFogFar] = useState(28);
  // Bloom intensity tween: 0 (idle) → peak 1.5 di tengah transisi (saat
  // warna paling baru bersinar) → settle 0.4 (done). Dipake untuk
  // ngasih efek "cahaya menyembur" saat heat mereda jadi senja.
  const [bloom, setBloom] = useState(0);
  // Warna fog & background — di-tween dari drought warm hazy ke twilight
  // cool. Ini yang ngasih dramatic shift "kemarau → senja". Diterusin
  // ke FogTuner yang mutate scene.fog.color & scene.background per frame.
  const [bgColor, setBgColor] = useState(BG_DROUGHT);

  // Tween postprocessing values berdasar stage. Reset instan untuk idle/
  // active, animate selama TRANSITION_DURATION untuk transitioning,
  // hold di nilai akhir untuk done.
  //
  // Bloom kurva-nya beda dari saturation/vignette: bukan linear monoton,
  // tapi "puncak di tengah". Pakai sin(πt) supaya bloom climb tinggi
  // saat warna mulai pulih (dramatic flash), lalu turun ke nilai
  // istirahat saat transisi selesai.
  useEffect(() => {
    if (stage === 'idle' || stage === 'active') {
      setSaturation(-0.3);
      setVignette(0.7);
      setFogFar(28);
      setBloom(0);
      setBgColor(BG_DROUGHT);
      return undefined;
    }
    if (stage === 'done') {
      setSaturation(0);
      setVignette(0.3);
      setFogFar(60);
      setBloom(0.4);
      setBgColor(BG_TWILIGHT);
      return undefined;
    }
    if (stage !== 'transitioning') return undefined;

    let raf;
    let start;
    const tick = (now) => {
      if (start === undefined) start = now;
      const elapsed = (now - start) / 1000;
      const t = Math.min(elapsed / TRANSITION_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setSaturation(-0.3 + eased * 0.3);
      setVignette(0.7 - eased * 0.4);
      setFogFar(28 + eased * 32);
      setBgColor(lerpHex(BG_DROUGHT, BG_TWILIGHT, eased));
      // Bloom puncak di t=0.5, turun ke 0.4 di t=1. Ngasih "flash"
      // saat heat mereda jadi senja.
      const bloomPeak = Math.sin(t * Math.PI) * 1.5;
      const bloomSettle = 0.4 * t;
      setBloom(Math.max(bloomPeak, bloomSettle));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setStage('done');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const handleDollyComplete = () => {
    setStage((s) => (s === 'idle' ? 'active' : s));
  };

  const handleClick = () => {
    if (stage === 'active') setStage('transitioning');
  };

  const handleRestart = () => {
    setStage('idle');
    setResetTrigger((c) => c + 1);
  };

  return (
    <>
      <Seo
        title="Taman Kebaikan"
        description="Pengalaman taman digital — perjalanan kebaikan, kenangan, dan harapan yang tumbuh."
        path="/taman"
      />
      <div
        className="relative w-full h-screen overflow-hidden cursor-pointer select-none"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        style={{ backgroundColor: bgColor }}
      >
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 55, position: [0, 1.6, 18] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
          >
            <R0Scene
              fogFar={fogFar}
              fogColor={bgColor}
              resetTrigger={resetTrigger}
              particleCount={isMobile ? 100 : 300}
              isMobile={isMobile}
              onDollyComplete={handleDollyComplete}
            />
            <EffectComposer>
              <HueSaturation saturation={saturation} />
              <Vignette eskil={false} offset={0.25} darkness={vignette} />
              <Bloom
                intensity={bloom}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.4}
                mipmapBlur
              />
            </EffectComposer>
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <OpeningText stage={stage} resetTrigger={resetTrigger} />
        <TapHint visible={stage === 'active'} />
        <ExitOverlay visible={stage === 'done'} onRestart={handleRestart} />
        <AmbientAudio profile="drought" position="top-right" />

        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-[10px] uppercase tracking-[0.2em]">
          Padang Tandus · stage: {stage}
        </div>
      </div>
    </>
  );
};

export default MuseumPage;
