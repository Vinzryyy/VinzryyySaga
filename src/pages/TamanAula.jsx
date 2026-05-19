/**
 * ArmeniacaTown — Petak R6: Aula (working name, naming TBD).
 *
 * Virtual replica dari pavilion offline event di FX Sudirman untuk
 * seitansai Eli (15 Juni 2026 — date placeholder, tunggu jadwal resmi
 * dari office JKT48). Tujuan: fans yang gak bisa datang offline event
 * tetap bisa "berkunjung" liat setup venue secara virtual.
 *
 * Design source: public/STSVanue.png — 3-wall indoor pavilion dengan:
 *   - Back wall: heading "KEBAIKAN APA YANG SUDAH KAMU LAKUKAN?"
 *                + grid sticky notes pastel 7x5 (decorative/empty di
 *                virtual karena content sticky notes hidup di event
 *                fisik, virtual ini display-only)
 *   - 5 spotlight ilumination dari top back wall
 *   - Side walls (kiri+kanan): 4 sertifikat donasi each (dari
 *                data/galeriKebaikan.js)
 *   - Center: table + glass bowl + mascot placeholder
 *   - Floral foreground: bunga warna-warni di perimeter
 *
 * Gating: date-locked via SITE_CONFIG.aulaGaleri.eventDateIso
 * (configurable — update saat JKT48 office umumkan jadwal resmi).
 * Pre-event UI: countdown chip "Buka X hari lagi".
 *
 * Status: scaffold awal — single-file, display-only, no drought
 * variant, mascot placeholder. Bisa di-refactor ke modular (mirror
 * r4 MenaraJam structure) saat scope expand.
 */

import React, { Suspense, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats, Text } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import Seo from '../components/Seo';
import RotateRecommendation from '../components/ui/RotateRecommendation';
import { useIsMobile } from '../hooks/useMediaQuery';
import { KEBAIKAN_ENTRIES } from '../data/galeriKebaikan';

// ============================================================
// Constants — pavilion dimensions
// ============================================================

const PAVILION = {
  width: 12,
  depth: 10,
  height: 6,
  wallThickness: 0.12,
  floorY: 0,
};

const BACK_WALL_Z = -PAVILION.depth / 2;
const LEFT_WALL_X = -PAVILION.width / 2;
const RIGHT_WALL_X = PAVILION.width / 2;

// Sticky note grid (7 cols × 5 rows = 35 notes)
const STICKY = {
  cols: 7,
  rows: 5,
  size: 0.42,
  spacing: 0.55,
  // Pastel rainbow per row (top → bottom)
  rowColors: [
    '#f4c5d5', // pink
    '#f4dba5', // yellow
    '#c5e3c5', // mint
    '#b8d6e8', // light blue
    '#d4c4e8', // lavender
  ],
};

// Pavilion palette
const PALETTE = {
  wallCream: '#f5efe6',
  floorGray: '#9aa0a8',
  tableWood: '#a07555',
  tableLeg: '#7a5a40',
  bowlGlass: '#e8f0f5',
  mascotDark: '#1a1820',
  certificateBg: '#f0e8d8',
  certificateBorder: '#3a2818',
  spotlightWarm: '#ffe8c8',
};

// Floral palette (pop-art)
const FLORAL_COLORS = [
  '#f48aa8', // hot pink
  '#f4a050', // orange
  '#c878d8', // magenta
  '#5ac8d8', // teal
  '#7898d8', // blue
  '#f4d870', // mustard
  '#a8d488', // green
];

// ============================================================
// Geometry primitives
// ============================================================

const Floor = () => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0, PAVILION.floorY, 0]}
    receiveShadow={false}
  >
    <planeGeometry args={[PAVILION.width + 6, PAVILION.depth + 6]} />
    <meshStandardMaterial color={PALETTE.floorGray} roughness={0.95} />
  </mesh>
);

const BackWall = () => (
  <mesh position={[0, PAVILION.height / 2, BACK_WALL_Z]}>
    <boxGeometry
      args={[PAVILION.width, PAVILION.height, PAVILION.wallThickness]}
    />
    <meshStandardMaterial color={PALETTE.wallCream} roughness={0.85} />
  </mesh>
);

const SideWall = ({ side }) => {
  const x = side === 'left' ? LEFT_WALL_X : RIGHT_WALL_X;
  return (
    <mesh position={[x, PAVILION.height / 2, 0]}>
      <boxGeometry
        args={[PAVILION.wallThickness, PAVILION.height, PAVILION.depth]}
      />
      <meshStandardMaterial color={PALETTE.wallCream} roughness={0.85} />
    </mesh>
  );
};

// ============================================================
// Heading text — "KEBAIKAN APA YANG SUDAH KAMU LAKUKAN?"
// ============================================================

const HeadingText = () => {
  // 3D text mounted di back wall, di atas sticky note grid.
  // Position: z slightly in front of wall biar gak z-fight.
  const z = BACK_WALL_Z + PAVILION.wallThickness / 2 + 0.02;
  return (
    <group position={[0, 5.0, z]}>
      <Text
        fontSize={0.32}
        color="#3a2818"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={8}
        lineHeight={1.15}
        letterSpacing={0.02}
      >
        KEBAIKAN APA YANG{'\n'}SUDAH KAMU LAKUKAN?
      </Text>
    </group>
  );
};

// ============================================================
// Sticky note grid — 7×5 pastel notes, empty (decorative)
// ============================================================

const StickyNote = ({ position, color, rotation }) => (
  <group position={position} rotation={[0, 0, rotation]}>
    <mesh>
      <planeGeometry args={[STICKY.size, STICKY.size]} />
      <meshStandardMaterial
        color={color}
        roughness={0.75}
        side={THREE.DoubleSide}
      />
    </mesh>
    {/* Subtle shadow di sticky note (sedikit lebih gelap dari color base) */}
    <mesh position={[0.015, -0.015, -0.001]}>
      <planeGeometry args={[STICKY.size, STICKY.size]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.08} />
    </mesh>
  </group>
);

const StickyNoteGrid = () => {
  const z = BACK_WALL_Z + PAVILION.wallThickness / 2 + 0.015;
  // Grid centered horizontally + vertically.
  const totalW = (STICKY.cols - 1) * STICKY.spacing;
  const totalH = (STICKY.rows - 1) * STICKY.spacing;
  const baseY = 3.0; // center mid-height
  const notes = useMemo(() => {
    const arr = [];
    for (let r = 0; r < STICKY.rows; r++) {
      for (let c = 0; c < STICKY.cols; c++) {
        const x = c * STICKY.spacing - totalW / 2;
        const y = baseY - (r * STICKY.spacing - totalH / 2);
        // Deterministic tilt — small angle per note untuk vibe "stuck-on"
        const seed = (r * 7 + c * 3) % 10;
        const tilt = ((seed - 5) / 5) * 0.07; // -0.07 to +0.07 rad
        arr.push({
          pos: [x, y, z],
          color: STICKY.rowColors[r],
          rotation: tilt,
          key: `note-${r}-${c}`,
        });
      }
    }
    return arr;
  }, [z, totalW, totalH, baseY]);
  return (
    <>
      {notes.map((n) => (
        <StickyNote
          key={n.key}
          position={n.pos}
          color={n.color}
          rotation={n.rotation}
        />
      ))}
    </>
  );
};

// ============================================================
// Side wall certificates — 4 per side, pulled from KEBAIKAN_ENTRIES
// ============================================================

const Certificate = ({ position, rotation, entry, index }) => {
  const w = 1.4;
  const h = 1.0;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Border frame */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[w + 0.12, h + 0.12]} />
        <meshStandardMaterial
          color={PALETTE.certificateBorder}
          roughness={0.6}
        />
      </mesh>
      {/* Paper body */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={PALETTE.certificateBg} roughness={0.7} />
      </mesh>
      {/* Title label (truncated) */}
      <Text
        position={[0, 0.25, 0.005]}
        fontSize={0.09}
        color="#3a2818"
        anchorX="center"
        anchorY="middle"
        maxWidth={w - 0.2}
        textAlign="center"
        lineHeight={1.15}
      >
        {entry ? entry.title.toUpperCase() : `SERTIFIKAT ${index + 1}`}
      </Text>
      {/* Decorative line separator */}
      <mesh position={[0, 0.05, 0.005]}>
        <planeGeometry args={[w - 0.4, 0.012]} />
        <meshBasicMaterial color="#3a2818" />
      </mesh>
      {/* Body text (recipient + amount stub) */}
      <Text
        position={[0, -0.15, 0.005]}
        fontSize={0.07}
        color="#5a4828"
        anchorX="center"
        anchorY="middle"
        maxWidth={w - 0.2}
        textAlign="center"
        lineHeight={1.2}
      >
        {entry
          ? `${entry.contributorCredit || 'Armeniaca × Helismiley'}`
          : 'Atas nama Ceu Eli'}
      </Text>
    </group>
  );
};

const CertificateWallSide = ({ side, entries }) => {
  // 4 certificates per side, 2 rows × 2 cols, mounted slightly off wall.
  const x =
    side === 'left'
      ? LEFT_WALL_X + PAVILION.wallThickness / 2 + 0.02
      : RIGHT_WALL_X - PAVILION.wallThickness / 2 - 0.02;
  const rotation = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  const positions = [
    // Top-back, top-front, bottom-back, bottom-front
    [x, 4.0, -2.2],
    [x, 4.0, 0.4],
    [x, 2.4, -2.2],
    [x, 2.4, 0.4],
  ];
  return (
    <>
      {positions.map((pos, i) => (
        <Certificate
          key={`cert-${side}-${i}`}
          position={pos}
          rotation={rotation}
          entry={entries[i]}
          index={i}
        />
      ))}
    </>
  );
};

// ============================================================
// Center table + glass bowl + mascot placeholder
// ============================================================

const Table = () => (
  <group position={[0, 0, 1.0]}>
    {/* Tabletop */}
    <mesh position={[0, 1.05, 0]}>
      <boxGeometry args={[2.4, 0.1, 1.4]} />
      <meshStandardMaterial color={PALETTE.tableWood} roughness={0.7} />
    </mesh>
    {/* 4 legs */}
    {[
      [-1.05, 0.5, -0.55],
      [1.05, 0.5, -0.55],
      [-1.05, 0.5, 0.55],
      [1.05, 0.5, 0.55],
    ].map((pos, i) => (
      <mesh key={`leg-${i}`} position={pos}>
        <cylinderGeometry args={[0.06, 0.06, 1.0, 12]} />
        <meshStandardMaterial color={PALETTE.tableLeg} roughness={0.7} />
      </mesh>
    ))}
  </group>
);

const GlassBowl = () => {
  // Glass bowl di atas table — half-sphere dengan transmission material
  // biar kerasa kaca. Slightly off-center kiri biar mascot ada room kanan.
  return (
    <group position={[-0.3, 1.18, 1.0]}>
      <mesh>
        <sphereGeometry args={[0.32, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={PALETTE.bowlGlass}
          transmission={0.85}
          thickness={0.3}
          roughness={0.1}
          ior={1.3}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Bowl rim */}
      <mesh position={[0, 0.005, 0]}>
        <torusGeometry args={[0.32, 0.015, 8, 24]} />
        <meshStandardMaterial color="#c8d0d8" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
};

const PlaceholderMascot = () => {
  // Mascot placeholder — silhouette simple dengan topi+jas hitam approximation.
  // Posisi kanan dari bowl, mirror design source.
  const baseY = 1.1;
  return (
    <group position={[0.4, baseY, 1.0]}>
      {/* Body (vertical capsule approximation) */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.7, 12]} />
        <meshStandardMaterial color={PALETTE.mascotDark} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.15, 16, 12]} />
        <meshStandardMaterial color={PALETTE.mascotDark} roughness={0.6} />
      </mesh>
      {/* Top hat — cylinder + brim */}
      <mesh position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.16, 16]} />
        <meshStandardMaterial color={PALETTE.mascotDark} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        <meshStandardMaterial color={PALETTE.mascotDark} roughness={0.5} />
      </mesh>
      {/* Floating "TBD" label di atas mascot biar inget ini placeholder */}
      <Text
        position={[0, 1.45, 0]}
        fontSize={0.08}
        color="#88828a"
        anchorX="center"
        anchorY="middle"
      >
        mascot · TBD
      </Text>
    </group>
  );
};

// ============================================================
// Floral foreground — instanced bunga warna-warni di perimeter
// ============================================================

const FloralCluster = ({ position, color, scale = 1 }) => {
  // Per-cluster: pusat bunga + 5 kelopak around. Simple stylized look.
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.18}
          roughness={0.5}
        />
      </mesh>
      {/* Kelopak — 5 sphere flat di sekitar center */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 0.13;
        const z = Math.sin(angle) * 0.13;
        return (
          <mesh key={`petal-${i}`} position={[x, 0.15, z]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
      })}
      {/* Stem */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.1, 6]} />
        <meshStandardMaterial color="#5a8438" roughness={0.7} />
      </mesh>
    </group>
  );
};

const FloralBorder = ({ isMobile }) => {
  // Cluster di sepanjang perimeter dalam pavilion (di depan wall, di lantai).
  // Generate posisi deterministik biar konsisten. Mobile thin out count.
  const flowers = useMemo(() => {
    const arr = [];
    const targetCount = isMobile ? 18 : 36;
    // Sebar di sepanjang perimeter — back wall edge + side walls edges.
    // Hindari area tengah (table) supaya gak overlap.
    const padding = 0.5;
    for (let i = 0; i < targetCount; i++) {
      // Cycle through 3 zones: back, left, right.
      const zone = i % 3;
      const seed = ((i * 37) % 100) / 100;
      let x, z;
      if (zone === 0) {
        // Back wall area
        x = (seed - 0.5) * (PAVILION.width - padding * 2);
        z = BACK_WALL_Z + padding + seed * 0.6;
      } else if (zone === 1) {
        // Left wall area
        x = LEFT_WALL_X + padding + seed * 0.6;
        z = (seed - 0.5) * (PAVILION.depth - 2.5) - 0.5;
      } else {
        // Right wall area
        x = RIGHT_WALL_X - padding - seed * 0.6;
        z = (seed - 0.5) * (PAVILION.depth - 2.5) - 0.5;
      }
      // Avoid table footprint (within radius 2 from center [0,0,1])
      const distFromTable = Math.sqrt(x * x + (z - 1) * (z - 1));
      if (distFromTable < 2.0) continue;
      const colorIdx = i % FLORAL_COLORS.length;
      const scale = 0.7 + ((i * 13) % 50) / 100; // 0.7-1.2
      arr.push({
        pos: [x, 0, z],
        color: FLORAL_COLORS[colorIdx],
        scale,
        key: `floral-${i}`,
      });
    }
    return arr;
  }, [isMobile]);
  return (
    <>
      {flowers.map((f) => (
        <FloralCluster
          key={f.key}
          position={f.pos}
          color={f.color}
          scale={f.scale}
        />
      ))}
    </>
  );
};

// ============================================================
// Spotlights — 5 warm spots dari top back wall pointing down
// ============================================================

const Spotlights = () => {
  const positions = [-4, -2, 0, 2, 4].map((x) => [
    x,
    PAVILION.height - 0.5,
    BACK_WALL_Z + 0.5,
  ]);
  return (
    <>
      {positions.map((pos, i) => (
        <spotLight
          key={`spot-${i}`}
          position={pos}
          target-position={[pos[0], 0, pos[2] + 2]}
          intensity={1.4}
          color={PALETTE.spotlightWarm}
          angle={0.5}
          penumbra={0.5}
          distance={10}
          decay={1.5}
          castShadow={false}
        />
      ))}
    </>
  );
};

// ============================================================
// Scene composition
// ============================================================

const SceneLights = () => (
  <>
    {/* Soft ambient (low-key fill) */}
    <ambientLight intensity={0.45} color="#e8e0d8" />
    {/* Hemisphere — natural top-to-bottom shading */}
    <hemisphereLight
      color="#fff5e8"
      groundColor="#5a4838"
      intensity={0.35}
    />
    {/* Key directional fill from above-front (camera side) */}
    <directionalLight
      position={[3, 8, 6]}
      intensity={0.5}
      color="#fff0d8"
    />
  </>
);

const Scene = ({ isMobile }) => {
  // Pull 8 entries untuk certificate walls (4 left + 4 right).
  const certEntries = useMemo(() => KEBAIKAN_ENTRIES.slice(0, 8), []);
  return (
    <>
      <SceneLights />
      <Spotlights />
      <Floor />
      <BackWall />
      <SideWall side="left" />
      <SideWall side="right" />
      <HeadingText />
      <StickyNoteGrid />
      <CertificateWallSide side="left" entries={certEntries.slice(0, 4)} />
      <CertificateWallSide side="right" entries={certEntries.slice(4, 8)} />
      <Table />
      <GlassBowl />
      <PlaceholderMascot />
      <FloralBorder isMobile={isMobile} />
      <OrbitControls
        target={[0, 3, 0]}
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={isMobile ? 18 : 14}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        enableDamping
      />
    </>
  );
};

// ============================================================
// HTML overlays
// ============================================================

const Header = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-2 px-3 pt-20 md:px-6 md:pt-24 pb-4 md:pb-5">
    <div className="pointer-events-auto shrink-0">
      <Link
        to="/armeniacaTown/peta"
        className="text-white/55 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        ← Peta Kota
      </Link>
    </div>
    <div className="text-center min-w-0 flex-1">
      <div className="text-white/45 text-[8px] md:text-[9px] uppercase tracking-[0.35em] md:tracking-[0.45em] mb-0.5">
        ArmeniacaTown
      </div>
      <div
        className="text-white/85 text-[12px] md:text-sm tracking-wide truncate"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Aula
        <span className="hidden sm:inline"> — Virtual Companion FX Sudirman</span>
      </div>
    </div>
    <div className="w-10 sm:w-9 shrink-0" aria-hidden />
  </div>
);

const FooterHint = () => (
  <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[min(92vw,400px)]">
    <div className="px-4 py-2 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 shadow-lg">
      <p
        className="text-white/70 text-[10px] sm:text-[11px] italic text-center tracking-wide"
        style={{ fontFamily: '"Fraunces Variable", serif' }}
      >
        Replika venue offline · sticky notes hidup di event fisik
      </p>
    </div>
  </div>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#1f1a18] text-white/55 text-sm">
    Memuat aula...
  </div>
);

// ============================================================
// Page
// ============================================================

const TamanAulaPage = () => {
  const isMobile = useIsMobile();
  return (
    <>
      <Seo
        title="ArmeniacaTown — Aula (Virtual Companion FX Sudirman)"
        description="Replika virtual venue offline event seitansai Eli di FX Sudirman — pavilion sticky notes 'Kebaikan apa yang sudah kamu lakukan?' + arsip sertifikat donasi Harmoni Kebaikan."
        path="/armeniacaTown/r6"
      />
      <RotateRecommendation />
      <div className="relative w-full h-[100dvh] bg-[#1f1a18] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: [0, 4.5, 12] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ gl }) => {
              gl.toneMappingExposure = 1.25;
            }}
          >
            <Scene isMobile={isMobile} />
            {!isMobile && (
              <EffectComposer multisampling={0}>
                <Bloom
                  intensity={0.35}
                  luminanceThreshold={0.82}
                  luminanceSmoothing={0.4}
                  mipmapBlur
                />
                <Vignette eskil={false} offset={0.3} darkness={0.6} />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            )}
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>
        <Header />
        <FooterHint />
      </div>
    </>
  );
};

export default TamanAulaPage;
