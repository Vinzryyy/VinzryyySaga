/**
 * Museum Kebaikan — Fase 2, Denah Museum.
 *
 * Hub navigasi setelah pengunjung lewat R0 (World Without Kindness).
 * Layout: 6 ruangan low-poly disusun heksagonal mengelilingi pohon
 * aprikot di tengah. Kamera isometrik (perspektif sudut tinggi)
 * supaya kerasa "memandang denah dari atas" — referensi visual:
 * Monument Valley, Florence.
 *
 * Round 2A (file ini): scene statis. Ruangan = box berwarna dengan
 * label HTML melayang di atasnya. Belum ada hover/click — itu di
 * 2B. Belum ada kamera fly-in dari R0 — itu di 2C.
 *
 * Color palette: warm aprikot tones (sesuai identitas Armeniaca).
 * Background: dark-warm, bukan murni hitam — supaya kerasa "rumah",
 * bukan "void".
 *
 * Pohon di tengah = placeholder primitif (cylinder trunk + sphere
 * foliage). Akan diganti dengan model proper di Round 2C atau
 * sekalian saat bangun R6 Taman Akhir.
 */

import React, { Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Stats } from '@react-three/drei';
import Seo from '../components/Seo';

// 6 ruangan museum, posisi heksagonal di sekeliling pohon (origin).
// Distance 5 unit dari pusat. Angle dalam derajat dengan konvensi
// 270° = utara (ke -z), searah jarum jam.
const HEX_RADIUS = 5;
const ROOMS = [
  {
    id: 'r1',
    name: 'Lorong Waktu',
    desc: 'Timeline perjalanan',
    angle: 270, // utara
    color: '#d4a574',
  },
  {
    id: 'r2',
    name: 'Galeri Fan Projects',
    desc: 'Karya penggemar',
    angle: 330,
    color: '#c8956a',
  },
  {
    id: 'r3',
    name: 'Ruang Quotes',
    desc: 'Kata-kata Eli',
    angle: 30,
    color: '#b88060',
  },
  {
    id: 'r4',
    name: 'Arsip Kebaikan',
    desc: 'Sejarah charity',
    angle: 90, // selatan
    color: '#a87055',
  },
  {
    id: 'r5',
    name: 'Ruang Fanart',
    desc: 'Karya seni',
    angle: 150,
    color: '#b88060',
  },
  {
    id: 'r6',
    name: 'Taman Akhir',
    desc: 'Pohon + Langit Harapan',
    angle: 210,
    color: '#c8956a',
  },
];

const polarToXZ = (angleDeg, radius) => {
  const rad = (angleDeg * Math.PI) / 180;
  return [Math.cos(rad) * radius, Math.sin(rad) * radius];
};

// Box ruangan dengan label HTML melayang di atas. Box-nya pake
// dimensi 2.6×0.5×2.6 — flat-ish supaya kerasa kayak "sel di denah",
// bukan kotak penuh. Label pake drei Html non-transform mode (anchored
// ke 3D point tapi render di DOM, jadi text tetap sharp di semua DPR).
const RoomBox = ({ room }) => {
  const [x, z] = polarToXZ(room.angle, HEX_RADIUS);
  return (
    <group position={[x, 0.25, z]}>
      <mesh>
        <boxGeometry args={[2.6, 0.5, 2.6]} />
        <meshStandardMaterial
          color={room.color}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      <Html
        position={[0, 0.6, 0]}
        center
        distanceFactor={10}
        occlude={false}
      >
        <div className="text-center pointer-events-none select-none whitespace-nowrap">
          <div className="text-white text-[11px] font-medium tracking-wide">
            {room.name}
          </div>
          <div className="text-white/55 text-[9px] mt-0.5 uppercase tracking-[0.15em]">
            {room.desc}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Pohon aprikot placeholder: trunk silinder + 2 sphere foliage tumpuk.
// Animasi sway pelan supaya nggak kerasa mati. Akan diganti dengan
// model proper di Round 2C.
const CenterTree = () => {
  const groupRef = React.useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
  });
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshStandardMaterial color="#7a9d5e" roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 1.95, 0.1]}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshStandardMaterial color="#8eb070" roughness={0.7} />
      </mesh>
      <mesh position={[-0.25, 1.85, -0.05]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshStandardMaterial color="#86a868" roughness={0.7} />
      </mesh>
    </group>
  );
};

// Lantai denah — plane besar warna warm dengan grid sangat tipis,
// disco-style untuk kasih sense of scale. Grid tone hampir nyatu sama
// background, fungsinya cuma jadi guide visual.
const DenahFloor = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#1f1612" roughness={1} />
    </mesh>
    <gridHelper
      args={[40, 40, '#3a2a1f', '#2a1d15']}
      position={[0, 0.005, 0]}
    />
  </>
);

const DenahScene = () => {
  return (
    <>
      <fog attach="fog" args={['#1a1310', 12, 35]} />
      <color attach="background" args={['#1a1310']} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.4}
        color="#ffd9a8"
      />
      <directionalLight
        position={[-6, 8, -4]}
        intensity={0.4}
        color="#a8c5e0"
      />
      <DenahFloor />
      <CenterTree />
      {ROOMS.map((room) => (
        <RoomBox key={room.id} room={room} />
      ))}
    </>
  );
};

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat denah museum...
  </div>
);

// Top bar mini buat navigasi keluar denah. Sengaja minimalis biar
// nggak nyaingin scene-nya. Kembali ke /museum = restart R0; kembali
// ke / = keluar museum sepenuhnya.
const DenahHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5">
    <div className="pointer-events-auto">
      <Link
        to="/"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        ← Keluar
      </Link>
    </div>
    <div
      className="text-white/85 text-sm tracking-wide"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      Denah Museum Kebaikan
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/museum"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        Ulangi R0 →
      </Link>
    </div>
  </div>
);

const DenahFooter = () => (
  <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/35 text-[10px] uppercase tracking-[0.2em] text-center">
    Fase 2 Round A · Denah Statis
    <br />
    <span className="text-white/25 normal-case tracking-normal text-[10px] mt-1 inline-block">
      (interaksi hover/click di Round 2B)
    </span>
  </div>
);

const MuseumDenahPage = () => {
  return (
    <>
      <Seo
        title="Denah Museum"
        description="Denah Museum Kebaikan — pilih ruangan untuk dijelajahi."
        path="/museum/denah"
      />
      <div className="relative w-full h-screen bg-[#1a1310] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 38, position: [9, 11, 9] }}
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 0, 0);
            }}
          >
            <DenahScene />
            <Stats />
          </Canvas>
        </Suspense>

        <DenahHeader />
        <DenahFooter />
      </div>
    </>
  );
};

export default MuseumDenahPage;
