/**
 * Taman Kebaikan — Petak R1: Lorong Pohon Tahun.
 *
 * Petak pertama di /taman/peta yang punya isi konkret. Konsep:
 * jalur dengan pohon-pohon yang tumbuh seiring tahun, tiap pohon =
 * milestone karier Eli dari ELI_TIMELINE di src/data/eliProfile.js.
 *
 * View: top-down 3/4 isometric (sama palette dengan /taman/peta —
 * twilight evening). 10 pohon disusun alternating kiri-kanan di
 * sepanjang jalur dari z=-2 ke z=-32 (gap 3.3 unit per node). Tiap
 * pohon clickable: hover lift + glow, click buka modal info milestone.
 *
 * Vertical slice ini jadi template untuk 5 petak lain. Pattern yang
 * di-establish di sini (route /taman/rN, scene low-poly, hover/click
 * modal, header/footer minimal, palette match Peta Taman) bakal
 * di-replikasi untuk Petak Karya, Kolam Kata, dst.
 *
 * Performance: 10 pohon × ~6 mesh/pohon = 60 mesh total. Plus floor,
 * lighting, fog. Worst case 30+ fps di mobile dengan downscale.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
import { ELI_TIMELINE } from '../data/eliProfile';

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

// Layout konstan jalur. Pohon disusun alternating kiri/kanan di
// sepanjang jalur. Path z dari START_Z ke END_Z (ke arah negatif z).
const PATH_START_Z = -2;
const PATH_END_Z = -32;
const PATH_X_OFFSET = 2.6; // alternating ±2.6 dari sumbu jalur
const ORBIT_TARGET = [0, 0, -16]; // tengah jalur

// Bikin warna foliage progressive — pohon awal (debut) hijau muda
// (tunas), pohon akhir (sekarang) hijau matang & sedikit aprikot.
const foliageColorForIndex = (idx, total) => {
  const t = idx / Math.max(total - 1, 1);
  // green-young (#9bc474) → mature (#7a9d5e) → mature-warm (#a89d5e)
  if (t < 0.5) {
    const k = t / 0.5;
    return lerpHexColor('#9bc474', '#7a9d5e', k);
  }
  const k = (t - 0.5) / 0.5;
  return lerpHexColor('#7a9d5e', '#a89d5e', k);
};

const lerpHexColor = (a, b, t) => {
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

// Pohon-tahun: trunk pendek + 1 foliage cluster + label year
// melayang. Hover lift + emissive glow, click → modal milestone.
const YearTree = ({ tree, hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const matRef = useRef();

  useFrame((_, delta) => {
    if (!groupRef.current || !matRef.current) return;
    const targetY = hovered ? 0.25 : 0;
    const targetEmissive = hovered ? 0.4 : 0;
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
      position={[tree.x, 0, tree.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(tree.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(tree.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(tree);
      }}
    >
      {/* Trunk */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.08, 0.13, 1.2, 8]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Foliage cluster — 1 sphere per tree (V1, simpler than center tree) */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.6, 14, 10]} />
        <meshStandardMaterial
          ref={matRef}
          color={tree.color}
          emissive={tree.color}
          emissiveIntensity={0}
          roughness={0.75}
        />
      </mesh>
      {/* Year label */}
      <Html position={[0, 2.3, 0]} center distanceFactor={10}>
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
            {tree.year}
          </div>
          <div
            className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
              hovered ? 'text-white/80' : 'text-white/50'
            }`}
          >
            {tree.badge}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Jalur tanah membentang dari awal ke akhir lorong. Lebih sempit dari
// floor utama supaya kerasa kayak path/garden walk, bukan field.
const Path = () => (
  <>
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, (PATH_START_Z + PATH_END_Z) / 2]}
    >
      <planeGeometry args={[2.2, Math.abs(PATH_END_Z - PATH_START_Z) + 6]} />
      <meshStandardMaterial color="#3a3022" roughness={1} />
    </mesh>
    {/* Floor sekitar path — match palette /taman/peta */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, -16]}>
      <planeGeometry args={[40, 50]} />
      <meshStandardMaterial color="#1c1f2a" roughness={1} />
    </mesh>
  </>
);

const LorongScene = ({
  trees,
  hoveredTreeId,
  onTreeHover,
  onTreeOut,
  onTreeClick,
}) => (
  <>
    <fog attach="fog" args={['#1c1f2a', 14, 45]} />
    <color attach="background" args={['#1c1f2a']} />
    <ambientLight intensity={0.55} />
    <directionalLight
      position={[6, 12, 4]}
      intensity={1.3}
      color="#ffd9a8"
    />
    <directionalLight
      position={[-4, 8, -8]}
      intensity={0.4}
      color="#a8c5e0"
    />
    <Path />
    {trees.map((tree) => (
      <YearTree
        key={tree.id}
        tree={tree}
        hovered={hoveredTreeId === tree.id}
        onPointerOver={onTreeHover}
        onPointerOut={onTreeOut}
        onClick={onTreeClick}
      />
    ))}
    {/* OrbitControls limited — user bisa rotate horizontal sedikit
        + zoom in/out untuk eksplor jalur, tapi nggak bisa flip
        vertikal (anti-disorient). */}
    <OrbitControls
      target={ORBIT_TARGET}
      enableZoom
      minDistance={12}
      maxDistance={28}
      enablePan={false}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.4}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.4}
    />
  </>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#1c1f2a] text-white/50 text-sm">
    Memuat lorong pohon tahun...
  </div>
);

const LorongHeader = () => (
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
      Lorong Pohon Tahun
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        Keluar →
      </Link>
    </div>
  </div>
);

const LorongFooter = ({ hoveredTreeId }) => {
  const hint = hoveredTreeId
    ? 'Klik untuk baca milestone'
    : `Pilih pohon dari ${ELI_TIMELINE.length} tahun perjalanan · drag untuk berputar`;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.2em] text-center">
      {hint}
    </div>
  );
};

const MilestoneOverlay = ({ tree, onClose }) => {
  useEffect(() => {
    if (!tree) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [tree]);

  if (!tree) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#1c1f2a]/95 border border-white/15 rounded-2xl px-8 py-9 max-w-lg mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-emerald-300/80 text-[10px] uppercase tracking-[0.25em]">
            {tree.badge}
          </span>
          <span className="text-white/55 text-[10px] tracking-wide">
            {tree.period}
          </span>
        </div>
        <h2
          className="text-white text-2xl mb-4 leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {tree.title}
        </h2>
        <p className="text-white/75 text-sm leading-relaxed mb-7">
          {tree.body}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full px-5 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
        >
          Kembali ke lorong
        </button>
      </div>
    </div>
  );
};

const TamanLorongPohonPage = () => {
  const isMobile = useIsMobile();
  const [hoveredTreeId, setHoveredTreeId] = useState(null);
  const [selectedTree, setSelectedTree] = useState(null);

  // Map ELI_TIMELINE → tree positions di scene. Alternating kiri/kanan,
  // gap z = (PATH_END - PATH_START) / (count-1). Year color progressive.
  const trees = useMemo(() => {
    const total = ELI_TIMELINE.length;
    const gapZ = (PATH_END_Z - PATH_START_Z) / Math.max(total - 1, 1);
    return ELI_TIMELINE.map((entry, idx) => {
      const side = idx % 2 === 0 ? -1 : 1;
      const x = PATH_X_OFFSET * side;
      const z = PATH_START_Z + gapZ * idx;
      const year = entry.date ? entry.date.slice(0, 4) : entry.period;
      return {
        ...entry,
        x,
        z,
        year,
        color: foliageColorForIndex(idx, total),
      };
    });
  }, []);

  useEffect(() => {
    document.body.style.cursor = hoveredTreeId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredTreeId]);

  const handleTreeHover = (id) => setHoveredTreeId(id);
  const handleTreeOut = (id) =>
    setHoveredTreeId((c) => (c === id ? null : c));
  const handleTreeClick = (tree) => {
    setSelectedTree(tree);
    setHoveredTreeId(null);
  };
  const handleClose = () => setSelectedTree(null);

  return (
    <>
      <Seo
        title="Lorong Pohon Tahun"
        description="Tahun demi tahun perjalanan Eli — milestone karier dari debut sampai sekarang, dalam bentuk pohon-pohon di sebuah lorong."
        path="/taman/r1"
      />
      <div className="relative w-full h-screen bg-[#1c1f2a] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: [7, 9, 4] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 0, -16);
            }}
          >
            <LorongScene
              trees={trees}
              hoveredTreeId={hoveredTreeId}
              onTreeHover={handleTreeHover}
              onTreeOut={handleTreeOut}
              onTreeClick={handleTreeClick}
            />
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <LorongHeader />
        <LorongFooter hoveredTreeId={hoveredTreeId} />
        <MilestoneOverlay tree={selectedTree} onClose={handleClose} />
        <AmbientAudio profile="taman" position="top-right" />
      </div>
    </>
  );
};

export default TamanLorongPohonPage;
