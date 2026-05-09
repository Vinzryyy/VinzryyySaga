/**
 * Museum Kebaikan — Fase 2, Denah Museum.
 *
 * Hub navigasi setelah pengunjung lewat R0 (World Without Kindness).
 * Layout: 6 ruangan low-poly disusun heksagonal mengelilingi pohon
 * aprikot di tengah. Kamera isometrik (perspektif sudut tinggi)
 * supaya kerasa "memandang denah dari atas" — referensi visual:
 * Monument Valley, Florence.
 *
 * Round 2A: scene statis, label drei Html melayang di tiap ruangan.
 * Round 2B (file ini): hover lifts box + emissive glow + label
 *   highlights; click buka overlay info ruangan dengan pesan "akan
 *   dirilis di Fase 3"; cursor pointer saat hover.
 * Round 2C nanti: kamera fly-in dari R0 → Denah, OrbitControls
 *   terbatas, progress markers (R1 ✓, dst).
 *
 * Color palette: warm aprikot tones (sesuai identitas Armeniaca).
 * Background: dark-warm, bukan murni hitam — supaya kerasa "rumah",
 * bukan "void".
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Stats } from '@react-three/drei';
import Seo from '../components/Seo';

const HEX_RADIUS = 5;
const ROOMS = [
  {
    id: 'r1',
    name: 'Lorong Waktu',
    desc: 'Timeline perjalanan',
    longDesc:
      'Koridor panjang dengan frame-frame milestone karier Eli — debut, single, theater, generasi.',
    angle: 270,
    color: '#d4a574',
  },
  {
    id: 'r2',
    name: 'Galeri Fan Projects',
    desc: 'Karya penggemar',
    longDesc:
      'Ruang terbuka berisi karya-karya kontribusi penggemar: video, web, poster, dan lainnya.',
    angle: 330,
    color: '#c8956a',
  },
  {
    id: 'r3',
    name: 'Ruang Quotes',
    desc: 'Kata-kata Eli',
    longDesc:
      'Kutipan dari jikoshoukai, interview, dan tweet pilihan — melayang di ruang gelap.',
    angle: 30,
    color: '#b88060',
  },
  {
    id: 'r4',
    name: 'Arsip Kebaikan',
    desc: 'Sejarah charity',
    longDesc:
      'Galeri Kebaikan + program donasi + kunjungan komunitas — dokumentasi dampak nyata.',
    angle: 90,
    color: '#a87055',
  },
  {
    id: 'r5',
    name: 'Ruang Fanart',
    desc: 'Karya seni',
    longDesc:
      'Klasik gallery hall — lukisan, ilustrasi, dan sculpture digital dari komunitas.',
    angle: 150,
    color: '#b88060',
  },
  {
    id: 'r6',
    name: 'Taman Akhir',
    desc: 'Pohon + Langit Harapan',
    longDesc:
      'Climax museum: Pohon Kebaikan dalam mode malam, langit bertabur bintang dari kontributor.',
    angle: 210,
    color: '#c8956a',
  },
];

const polarToXZ = (angleDeg, radius) => {
  const rad = (angleDeg * Math.PI) / 180;
  return [Math.cos(rad) * radius, Math.sin(rad) * radius];
};

const lerp = (a, b, t) => a + (b - a) * t;

// Box ruangan dengan hover lift + emissive glow + click handler.
// Hover/click di-deteksi via R3F pointer events. Animasi hover (lift Y
// + emissive intensity) di-lerp di useFrame supaya halus, bukan jump
// instan. clamp factor delta*8 ngasih spring-feel ringan.
const RoomBox = ({ room, hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const matRef = useRef();
  const [x, z] = polarToXZ(room.angle, HEX_RADIUS);

  useFrame((_, delta) => {
    if (!groupRef.current || !matRef.current) return;
    const targetY = hovered ? 0.55 : 0.25;
    const targetEmissive = hovered ? 0.45 : 0;
    const factor = Math.min(delta * 8, 1);
    groupRef.current.position.y = lerp(
      groupRef.current.position.y,
      targetY,
      factor
    );
    matRef.current.emissiveIntensity = lerp(
      matRef.current.emissiveIntensity,
      targetEmissive,
      factor
    );
  });

  return (
    <group
      ref={groupRef}
      position={[x, 0.25, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(room.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(room.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(room);
      }}
    >
      <mesh>
        <boxGeometry args={[2.6, 0.5, 2.6]} />
        <meshStandardMaterial
          ref={matRef}
          color={room.color}
          emissive={room.color}
          emissiveIntensity={0}
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
        <div
          className={`text-center pointer-events-none select-none whitespace-nowrap transition-all duration-300 ease-out ${
            hovered ? '-translate-y-1' : ''
          }`}
        >
          <div
            className={`text-[11px] font-medium tracking-wide transition-colors ${
              hovered ? 'text-white' : 'text-white/85'
            }`}
          >
            {room.name}
          </div>
          <div
            className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
              hovered ? 'text-white/85' : 'text-white/55'
            }`}
          >
            {room.desc}
          </div>
        </div>
      </Html>
    </group>
  );
};

const CenterTree = () => {
  const groupRef = useRef();
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

const DenahScene = ({
  hoveredRoomId,
  onRoomHover,
  onRoomOut,
  onRoomClick,
}) => {
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
        <RoomBox
          key={room.id}
          room={room}
          hovered={hoveredRoomId === room.id}
          onPointerOver={onRoomHover}
          onPointerOut={onRoomOut}
          onClick={onRoomClick}
        />
      ))}
    </>
  );
};

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat denah museum...
  </div>
);

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

const DenahFooter = ({ hoveredRoomId }) => {
  const hint = hoveredRoomId
    ? 'Klik untuk lihat detail ruangan'
    : 'Arahkan kursor ke ruangan';
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.2em] text-center transition-opacity">
      {hint}
    </div>
  );
};

// Modal info ruangan saat di-click. Karena ruangan sebenarnya belum
// dibangun (Fase 3), overlay ini sementara nampilin deskripsi + CTA
// "Akan dirilis di Fase 3". Setelah ruangan jadi, ganti CTA jadi
// "Masuk ruangan →" yang navigate ke route ruangan.
const RoomDetailOverlay = ({ room, onClose }) => {
  // Lock body scroll saat overlay buka
  useEffect(() => {
    if (!room) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [room]);

  if (!room) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-md animate-[fadeIn_300ms_ease-out]"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#1a1310]/95 border border-white/15 rounded-2xl px-8 py-9 max-w-md mx-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-white/50 text-[10px] uppercase tracking-[0.25em]">
          {room.id.toUpperCase()}
        </div>
        <h2
          className="text-white text-2xl mb-3 leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {room.name}
        </h2>
        <p className="text-white/70 text-sm leading-relaxed mb-6">
          {room.longDesc}
        </p>
        <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 mb-6">
          <p className="text-white/55 text-xs leading-relaxed">
            Ruangan ini sedang dalam pembangunan.
            <br />
            Akan dirilis di{' '}
            <span className="text-white/85">Fase 3</span> — build
            out ruangan satu per satu.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
        >
          Kembali ke denah
        </button>
      </div>
    </div>
  );
};

const MuseumDenahPage = () => {
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Cursor pointer saat hover ruangan, normal saat tidak. Di-cleanup
  // ke 'auto' kalau component unmount.
  useEffect(() => {
    document.body.style.cursor = hoveredRoomId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredRoomId]);

  const handleRoomHover = (roomId) => setHoveredRoomId(roomId);
  const handleRoomOut = (roomId) => {
    // Hanya clear kalau yang keluar adalah ruangan yang sedang
    // hovered (defensive — kadang event leave fire belakangan dari
    // event enter di ruangan lain).
    setHoveredRoomId((current) => (current === roomId ? null : current));
  };
  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setHoveredRoomId(null); // reset hover state saat overlay buka
  };
  const handleCloseOverlay = () => setSelectedRoom(null);

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
            <DenahScene
              hoveredRoomId={hoveredRoomId}
              onRoomHover={handleRoomHover}
              onRoomOut={handleRoomOut}
              onRoomClick={handleRoomClick}
            />
            <Stats />
          </Canvas>
        </Suspense>

        <DenahHeader />
        <DenahFooter hoveredRoomId={hoveredRoomId} />
        <RoomDetailOverlay
          room={selectedRoom}
          onClose={handleCloseOverlay}
        />
      </div>
    </>
  );
};

export default MuseumDenahPage;
