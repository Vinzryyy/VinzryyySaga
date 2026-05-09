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
 * Round 2B: hover lifts box + emissive glow + label highlights;
 *   click buka overlay info ruangan; cursor pointer saat hover.
 * Round 2C (file ini): kamera fly-in 2.5 detik dari posisi rendah
 *   ke isometrik saat halaman mount (kerasa "muncul" dari R0).
 *   OrbitControls limited (rotate horizontal terbatas, zoom clamp,
 *   no pan) aktif setelah fly-in selesai. Progress markers — tiap
 *   kali user buka overlay ruangan, ID ruangan disimpan di
 *   localStorage; label dapet checkmark "✓" untuk yang udah dilihat.
 *
 * Color palette: warm aprikot tones (sesuai identitas Armeniaca).
 * Background: dark-warm, bukan murni hitam — supaya kerasa "rumah",
 * bukan "void".
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import Seo from '../components/Seo';

// Hook deteksi mobile via matchMedia (sama pola dengan Museum.jsx —
// dijaga konsisten supaya keputusan downscale seragam antar halaman
// museum). Threshold 768px = batas Tailwind md breakpoint.
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

// localStorage key untuk track ruangan yang udah dibuka overlay-nya.
// Set of room IDs (string[]) di-serialize ke JSON. Reset cuma kalau
// user clear storage manual atau pindah profile.
const PREVIEWED_KEY = 'museum-rooms-previewed';

const readPreviewed = () => {
  try {
    const raw = localStorage.getItem(PREVIEWED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

const writePreviewed = (set) => {
  try {
    localStorage.setItem(PREVIEWED_KEY, JSON.stringify([...set]));
  } catch {
    /* storage blocked — no-op */
  }
};

// Kamera akhir setelah fly-in. Posisi sama dengan camera default di
// Canvas, di-track terpisah biar OrbitControls tau target rotation
// pivot-nya di mana.
const CAMERA_FINAL = { x: 9, y: 11, z: 9 };
const CAMERA_START = { x: 0, y: 1, z: 0 };
const FLY_IN_DURATION = 2.5;
const ORBIT_TARGET = [0, 1, 0];

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

// Fly-in kamera dari posisi rendah (deket lantai) ke posisi isometrik.
// Kerasa kayak "naik" dari R0 ke denah. Saat fly-in jalan, OrbitControls
// di-disable supaya user nggak bisa interrupt animasi. Setelah selesai,
// onComplete dipanggil sekali, dan parent enable OrbitControls.
const FlyInCamera = ({ onComplete, duration = FLY_IN_DURATION }) => {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    camera.position.set(CAMERA_START.x, CAMERA_START.y, CAMERA_START.z);
    camera.lookAt(0, 1, 0);
  }, [camera]);

  useFrame((_, delta) => {
    if (completedRef.current) return;
    elapsedRef.current = Math.min(elapsedRef.current + delta, duration);
    const t = elapsedRef.current / duration;
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.x = lerp(CAMERA_START.x, CAMERA_FINAL.x, eased);
    camera.position.y = lerp(CAMERA_START.y, CAMERA_FINAL.y, eased);
    camera.position.z = lerp(CAMERA_START.z, CAMERA_FINAL.z, eased);
    camera.lookAt(0, 1, 0);
    if (t >= 1) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  return null;
};

// Box ruangan dengan hover lift + emissive glow + click handler.
// Hover/click di-deteksi via R3F pointer events. Animasi hover (lift Y
// + emissive intensity) di-lerp di useFrame supaya halus, bukan jump
// instan. clamp factor delta*8 ngasih spring-feel ringan.
//
// previewed: ruangan udah pernah di-click & overlay-nya dibuka. Visual
// markernya: ✓ kecil di sebelah nama ruangan + label warna sedikit
// lebih cerah default (nggak perlu hover).
const RoomBox = ({
  room,
  hovered,
  previewed,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
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
            className={`text-[11px] font-medium tracking-wide transition-colors flex items-center justify-center gap-1 ${
              hovered
                ? 'text-white'
                : previewed
                  ? 'text-white/95'
                  : 'text-white/85'
            }`}
          >
            {previewed && (
              <span className="text-[9px] text-emerald-300/85">✓</span>
            )}
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

// Pohon aprikot: trunk lebih ramping & tinggi, foliage 4 sphere
// dengan variasi warna hijau (sedikit shift hue per cluster supaya
// nggak flat), dan 6 fruit sphere oranye-aprikot sebagai tribut ke
// identitas Armeniaca (= aprikot dalam Latin). Fruit punya emissive
// tipis supaya kerasa "fresh", dan ke-pickup oleh Bloom di R0 nanti
// kalau tree dipake di Taman Akhir.
//
// Posisi fruit deterministik (di-memo) — bukan acak per render.
const FOLIAGE_CLUSTERS = [
  { pos: [0, 1.85, 0], radius: 0.85, color: '#7a9d5e' },
  { pos: [0.35, 2.15, 0.15], radius: 0.55, color: '#8eb070' },
  { pos: [-0.3, 2.05, -0.1], radius: 0.6, color: '#86a868' },
  { pos: [0.05, 2.4, -0.2], radius: 0.45, color: '#94b878' },
];
const FRUIT_POSITIONS = [
  { pos: [0.55, 1.95, 0.3], color: '#e89870' },
  { pos: [-0.45, 1.7, 0.25], color: '#e8a87c' },
  { pos: [0.1, 2.35, 0.5], color: '#ed9b6a' },
  { pos: [-0.55, 2.1, -0.3], color: '#e89870' },
  { pos: [0.4, 2.45, -0.4], color: '#e8a87c' },
  { pos: [0.0, 1.6, -0.55], color: '#ed9b6a' },
];

const CenterTree = () => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
  });
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Trunk — ramping, tinggi 1.4, taper sedikit */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1.4, 10]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Foliage clusters */}
      {FOLIAGE_CLUSTERS.map((c, i) => (
        <mesh key={`foliage-${i}`} position={c.pos}>
          <sphereGeometry args={[c.radius, 16, 12]} />
          <meshStandardMaterial color={c.color} roughness={0.75} />
        </mesh>
      ))}
      {/* Fruit aprikot — emissive subtle untuk kerasa hidup */}
      {FRUIT_POSITIONS.map((f, i) => (
        <mesh key={`fruit-${i}`} position={f.pos}>
          <sphereGeometry args={[0.11, 12, 10]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.15}
            roughness={0.55}
            metalness={0.05}
          />
        </mesh>
      ))}
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
  previewedRooms,
  flyInActive,
  onFlyInComplete,
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
          previewed={previewedRooms.has(room.id)}
          onPointerOver={onRoomHover}
          onPointerOut={onRoomOut}
          onClick={onRoomClick}
        />
      ))}
      {flyInActive && <FlyInCamera onComplete={onFlyInComplete} />}
      {/*
        OrbitControls dirender selalu, tapi enabled=false saat fly-in.
        Constraint: rotate horizontal bebas, vertical dikunci di range
        atas (45°–72° dari atas), zoom limited 8–18 unit, no pan.
        Tujuan: user bisa muter denah untuk lihat sisi belakang
        ruangan, tapi nggak bisa ngerusak isometrik mood.
      */}
      <OrbitControls
        enabled={!flyInActive}
        target={ORBIT_TARGET}
        enableZoom
        minDistance={10}
        maxDistance={20}
        enablePan={false}
        minPolarAngle={Math.PI / 4.5}
        maxPolarAngle={Math.PI / 2.5}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
      />
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

const DenahFooter = ({ hoveredRoomId, flyInActive, previewedCount }) => {
  let hint;
  if (flyInActive) hint = 'Memasuki denah museum...';
  else if (hoveredRoomId) hint = 'Klik untuk lihat detail ruangan';
  else hint = 'Klik & seret untuk berputar · Scroll untuk zoom';
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
      <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] transition-opacity">
        {hint}
      </div>
      <div className="text-white/30 text-[10px] mt-1.5 tracking-wide">
        {previewedCount} dari {ROOMS.length} ruangan dijelajahi
      </div>
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
  const isMobile = useIsMobile();
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [flyInActive, setFlyInActive] = useState(true);
  // Set of room IDs yang udah dibuka overlay-nya. Init dari localStorage.
  const [previewedRooms, setPreviewedRooms] = useState(() => readPreviewed());

  // Cursor pointer saat hover ruangan, normal saat tidak. Di-cleanup
  // ke 'auto' kalau component unmount. Saat fly-in jalan, lock cursor
  // ke default supaya user nggak salah kira bisa interact.
  useEffect(() => {
    document.body.style.cursor =
      !flyInActive && hoveredRoomId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredRoomId, flyInActive]);

  const handleFlyInComplete = () => setFlyInActive(false);

  const handleRoomHover = (roomId) => {
    if (flyInActive) return;
    setHoveredRoomId(roomId);
  };
  const handleRoomOut = (roomId) => {
    setHoveredRoomId((current) => (current === roomId ? null : current));
  };
  const handleRoomClick = (room) => {
    if (flyInActive) return;
    setSelectedRoom(room);
    setHoveredRoomId(null);
    setPreviewedRooms((prev) => {
      if (prev.has(room.id)) return prev;
      const next = new Set(prev);
      next.add(room.id);
      writePreviewed(next);
      return next;
    });
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
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 0, 0);
            }}
          >
            <DenahScene
              hoveredRoomId={hoveredRoomId}
              previewedRooms={previewedRooms}
              flyInActive={flyInActive}
              onFlyInComplete={handleFlyInComplete}
              onRoomHover={handleRoomHover}
              onRoomOut={handleRoomOut}
              onRoomClick={handleRoomClick}
            />
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <DenahHeader />
        <DenahFooter
          hoveredRoomId={hoveredRoomId}
          flyInActive={flyInActive}
          previewedCount={previewedRooms.size}
        />
        <RoomDetailOverlay
          room={selectedRoom}
          onClose={handleCloseOverlay}
        />
      </div>
    </>
  );
};

export default MuseumDenahPage;
