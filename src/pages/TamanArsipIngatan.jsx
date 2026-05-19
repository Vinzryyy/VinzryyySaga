/**
 * Taman Kebaikan — Petak R2: Arsip Ingatan.
 *
 * Indoor scene pertama di taman — bangunan perpustakaan kota yang
 * setengah runtuh. Ruangan 16 × 20 × 6 dengan atap jebol di pojok
 * barat-laut dan dinding barat sebagian ambruk (wall breach). User
 * masuk dari sisi selatan, melihat meja baca dengan satu buku terbuka
 * sebagai focal point.
 *
 * Konten = pull dari data existing (ELI_TIMELINE, ELI_DISCOGRAPHY,
 * ELI_FIGHT_2026, SITE_CONFIG.about, KEBAIKAN_ENTRIES) via registry
 * src/data/arsipBooks.js. Konstelasi tampilkan title bintang;
 * Perpustakaan buka body-nya sebagai halaman.
 *
 * State: prop `restored` dari RouteChooser di App.jsx (3-tier gating,
 * mirror Telaga). Page sendiri cuma render drought/restored — locked
 * tier ditangani di chooser (redirect ke /armeniacaTown/peta).
 *   locked   (count < 5000)         — chooser redirect ke peta
 *   drought  (5000 ≤ count < 7000)  — rak W tumbang, rak E miring,
 *                                     papers berserakan, 6 buku interactive
 *   restored (count ≥ 7000)         — rak tegak, papers settled,
 *                                     11 buku interactive
 *
 * Beda dari pattern r1/r3 (dua file gersang + restored): Arsip diff
 * antar state-nya kecil (rotasi rak + paper count + lighting + book
 * count), gak architectural. Single file dengan prop lebih sehat
 * dipelihara.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
import RotateRecommendation from '../components/ui/RotateRecommendation';
import { useIsMobile } from '../components/taman/r3/utils';
import {
  ARSIP_BOOKS,
  getInteractiveBooks,
  getReadBookIds,
  markBookRead,
  RAK_SLOTS,
  PEDESTAL_ANGLES,
  DECORATIVE_BOOKS,
} from '../data/arsipBooks';
import BookOverlay from '../components/taman/r2/BookOverlay';
import PerpustakaanMusic from '../components/taman/r2/PerpustakaanMusic';

// =====================================================================
// Layout konstanta
// =====================================================================

// Ruangan: 16 × 20 × 6 (X × Z × Y). Origin di tengah lantai.
const ROOM_W = 16;
const ROOM_D = 20;
const ROOM_H = 6;

// Rak slot positions — match data layer rakSlot field.
const RAK_LAYOUT = {
  meja: { pos: [0, 0.78, 0], type: 'meja' },
  nw: { pos: [-4.5, 1.5, 8.5], rot: [0, 0, 0], type: 'shelf-upright' },
  ne: { pos: [4.5, 1.5, 8.5], rot: [0, 0, 0], type: 'shelf-upright' },
  // W tumbang — bersandar ke dinding -X. Drought: rotated, restored: tegak.
  w: { pos: [-6.5, 1.5, 2], rotDrought: [0, 0, 0.6], rotRestored: [0, 0, 0], type: 'shelf-tilt-w' },
  // E miring sedikit — drought: miring, restored: tegak.
  e: { pos: [6.5, 1.5, -2], rotDrought: [0, 0, -0.18], rotRestored: [0, 0, 0], type: 'shelf-tilt-e' },
  s: { pos: [5, 1.2, -8.5], rot: [0, 0, 0], type: 'shelf-small' },
};

// Palette — match siteConfig.about.swatches (cream/sepia/gold/burgundy/brown-dark)
const COLORS = {
  floor: '#5a3a25',
  wallBrick: '#9a6e58',
  wallPlaster: '#d4b8a0',
  ceiling: '#4a3020',
  shelfWood: '#5a3a25',
  tableWood: '#6a4830',
  chairWood: '#7a5840',
  lenternaCeramic: '#d8c4a0',
  lenternaGlow: '#f4a060',
  fogDrought: '#3a2418',
  fogRestored: '#5a3a25',
  paper: '#e8d4a8',
  spineHover: '#f4d090',
};

// =====================================================================
// Helpers
// =====================================================================

// Deterministic pseudo-random 0..1 dari string seed — buat distribusi
// posisi paper drift / dust mote yang konsisten antar render.
const hashSeed = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
};

const lerp = (a, b, t) => a + (b - a) * t;

// =====================================================================
// Scene primitives
// =====================================================================

// Floor — papan kayu lebar. Single plane dengan slight darker grain di
// edge via overlay sub-plane. Plus rug di tengah bawah meja baca sebagai
// visual anchor focal point.
const Floor = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_W, ROOM_D]} />
      <meshStandardMaterial color="#5a3a25" roughness={0.95} />
    </mesh>
    {/* Plank seams — thin dark strips parallel z-axis tiap 1.5 unit */}
    {Array.from({ length: Math.floor(ROOM_W / 1.5) - 1 }, (_, i) => {
      const x = -ROOM_W / 2 + (i + 1) * 1.5;
      return (
        <mesh key={`plank-${i}`} position={[x, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, ROOM_D]} />
          <meshBasicMaterial color="#3a2418" transparent opacity={0.45} />
        </mesh>
      );
    })}
    {/* Rug kain pudar di bawah meja baca — kerasa "ada ruang baca yang
        dipersiapkan." Warna burgundy worn, fringe edge slightly darker. */}
    <mesh
      position={[0, 0.005, -0.3]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[3.6, 3.0]} />
      <meshStandardMaterial color="#5a3a3a" roughness={0.95} />
    </mesh>
    {/* Rug border ring — sedikit lebih gelap, kerasa motif tepi */}
    <mesh
      position={[0, 0.006, -0.3]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[1.65, 1.78, 32]} />
      <meshStandardMaterial color="#3a2228" roughness={0.95} />
    </mesh>
  </group>
);

// WallCracks — diagonal dark lines pada dinding plaster (east/west)
// sebagai hint "weathered ruin" lebih kuat. Sparse, 2-3 per dinding.
const WallCracks = () => {
  const cracks = [
    // East wall (x=+8) — cracks di plaster
    { pos: [ROOM_W / 2 - 0.11, 3.2, -4], rot: [0, Math.PI / 2, 0.3], size: [0.04, 2.6, 0.02] },
    { pos: [ROOM_W / 2 - 0.11, 4.0, 2], rot: [0, Math.PI / 2, -0.18], size: [0.03, 1.8, 0.02] },
    { pos: [ROOM_W / 2 - 0.11, 2.0, 6], rot: [0, Math.PI / 2, 0.5], size: [0.03, 1.2, 0.02] },
    // South wall, west of door (z=-10)
    { pos: [-4, 3.5, -ROOM_D / 2 + 0.11], rot: [0, 0, 0.4], size: [0.04, 2.0, 0.02] },
    // South wall, east of door
    { pos: [3.5, 4.2, -ROOM_D / 2 + 0.11], rot: [0, 0, -0.25], size: [0.03, 1.6, 0.02] },
    // West wall (x=-8) south segment
    { pos: [-ROOM_W / 2 + 0.11, 3.0, -5], rot: [0, Math.PI / 2, -0.3], size: [0.04, 2.2, 0.02] },
  ];
  return (
    <group>
      {cracks.map((c, i) => (
        <mesh key={`crack-${i}`} position={c.pos} rotation={c.rot}>
          <boxGeometry args={c.size} />
          <meshStandardMaterial color="#2a1812" roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

// Wall — bata pucat dengan plaster terkelupas. Brick wall paksa
// receiveShadow=false (semua light kita non-shadow).
//
// Untuk wall breach di -X, kita render dinding barat sebagai dua segment
// terpisah (z: -10..3 dan z: 6..10) supaya celah 3..6 terbuka.
const Walls = ({ restored }) => {
  const wallMat = (
    <meshStandardMaterial color={COLORS.wallBrick} roughness={0.92} />
  );
  const plasterMat = (
    <meshStandardMaterial color={COLORS.wallPlaster} roughness={0.85} />
  );

  return (
    <group>
      {/* South wall (entry, z=-10) — punya pintu opening di tengah */}
      {/* Left segment x:-8..-1.5 */}
      <mesh position={[-4.75, ROOM_H / 2, -ROOM_D / 2]}>
        <boxGeometry args={[6.5, ROOM_H, 0.2]} />
        {wallMat}
      </mesh>
      {/* Right segment x:1.5..8 */}
      <mesh position={[4.75, ROOM_H / 2, -ROOM_D / 2]}>
        <boxGeometry args={[6.5, ROOM_H, 0.2]} />
        {wallMat}
      </mesh>
      {/* Top transom above door — full height dari door top (y=4) ke
          ceiling (y=6). Sebelumnya cuma 1.5 tall (spans 4..5.5), ada
          gap 0.5 unit di atas — void terlihat lewat. Extend ke 2 tall
          biar nyambung ke ceiling. */}
      <mesh position={[0, ROOM_H - 1, -ROOM_D / 2]}>
        <boxGeometry args={[3, 2, 0.2]} />
        {wallMat}
      </mesh>

      {/* North wall (back, z=10) — solid */}
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]}>
        <boxGeometry args={[ROOM_W, ROOM_H, 0.2]} />
        {wallMat}
      </mesh>

      {/* East wall (x=8) — solid */}
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]}>
        <boxGeometry args={[0.2, ROOM_H, ROOM_D]} />
        {plasterMat}
      </mesh>

      {/* West wall (x=-8) — split jadi 2 segment dengan breach z:3..6 */}
      {/* South segment z:-10..3 (length 13) */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, -3.5]}>
        <boxGeometry args={[0.2, ROOM_H, 13]} />
        {plasterMat}
      </mesh>
      {/* North segment z:6..10 (length 4) */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 8]}>
        <boxGeometry args={[0.2, ROOM_H, 4]} />
        {plasterMat}
      </mesh>
      {/* Breach rubble — pile bata di base celah. Drought only —
          restored: rubble udah di-clean up. */}
      {!restored && (
        <>
          <mesh position={[-ROOM_W / 2 + 0.4, 0.3, 4.5]} rotation={[0, 0.3, 0.1]}>
            <boxGeometry args={[0.8, 0.6, 2.2]} />
            <meshStandardMaterial color="#7a5648" roughness={0.95} />
          </mesh>
          <mesh position={[-ROOM_W / 2 + 0.9, 0.18, 3.4]} rotation={[0, -0.4, 0]}>
            <boxGeometry args={[0.5, 0.35, 0.9]} />
            <meshStandardMaterial color="#8a6258" roughness={0.95} />
          </mesh>
        </>
      )}

      {/* Restored: wooden plank patches nutup wall breach (-X, z:3..6).
          4 vertical planks dari y=0 ke ceiling, kerasa "luka ditutup
          dengan papan kayu." Drought: breach tetap terbuka. */}
      {restored && (
        <group position={[-ROOM_W / 2 + 0.06, 0, 0]}>
          {[3.2, 3.9, 4.6, 5.3, 6.0].map((z, i) => (
            <mesh key={`bp-${i}`} position={[0, ROOM_H / 2, z]}>
              <boxGeometry args={[0.06, ROOM_H, 0.65]} />
              <meshStandardMaterial color="#5a4030" roughness={0.95} />
            </mesh>
          ))}
          {/* Cross-braces 2 horizontal planks */}
          <mesh position={[0, 2, 4.5]}>
            <boxGeometry args={[0.08, 0.12, 3.2]} />
            <meshStandardMaterial color="#4a3020" roughness={0.95} />
          </mesh>
          <mesh position={[0, 4.5, 4.5]}>
            <boxGeometry args={[0.08, 0.12, 3.2]} />
            <meshStandardMaterial color="#4a3020" roughness={0.95} />
          </mesh>
        </group>
      )}

      {/* Outside silhouette through breach — distant city ruin sketches.
          Renders di luar dinding sebagai backdrop, kerasa "ada kota di
          luar sana yang kering." */}
      <group position={[-ROOM_W / 2 - 4, 0, 4.5]}>
        {[0, 1.2, 2.6, 4.2].map((dx, i) => {
          const h = 1.8 + (i % 2) * 0.8;
          return (
            <mesh key={`ruin-${i}`} position={[-dx, h / 2, (i - 1.5) * 0.6]}>
              <boxGeometry args={[0.6, h, 0.6]} />
              <meshBasicMaterial
                color={restored ? '#3a2a22' : '#2a1a12'}
                fog
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

// Ceiling — kayu beam paralel sumbu X. Hole di pojok barat-laut
// (-4, 6, 6) approximately — render ceiling sebagai 4 segment dengan
// celah persegi panjang di tengah-pojok. Restored: patch wooden boards
// nutup hole supaya void gak terlihat dari interior.
const Ceiling = ({ restored = false }) => {
  // Hole bounds: x: -6..-2, z: 4..8
  const beamMat = (
    <meshStandardMaterial color={COLORS.ceiling} roughness={0.9} />
  );

  return (
    <group position={[0, ROOM_H, 0]}>
      {/* Segment NW kiri hole — x:-8..-6 (lebar 2) */}
      <mesh position={[-7, 0, 6]}>
        <boxGeometry args={[2, 0.2, 4]} />
        {beamMat}
      </mesh>
      {/* Segment NW kanan hole — x:-2..8 (lebar 10) di z:4..8 */}
      <mesh position={[3, 0, 6]}>
        <boxGeometry args={[10, 0.2, 4]} />
        {beamMat}
      </mesh>
      {/* Segment south z:-10..4 (length 14) full width */}
      <mesh position={[0, 0, -3]}>
        <boxGeometry args={[ROOM_W, 0.2, 14]} />
        {beamMat}
      </mesh>
      {/* Segment north z:8..10 (length 2) full width */}
      <mesh position={[0, 0, 9]}>
        <boxGeometry args={[ROOM_W, 0.2, 2]} />
        {beamMat}
      </mesh>

      {/* Beam patah menjuntai di edge hole — broken beam end yang
          gak runtuh tapi bengkok. Restored: beam-beam udah balik ke
          posisi tapi tetap visible buat narrative "patch work." */}
      <mesh position={[-3, -0.3, 5]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[1.2, 0.15, 0.15]} />
        {beamMat}
      </mesh>
      <mesh position={[-5, -0.5, 7]} rotation={[0.3, 0, 0.2]}>
        <boxGeometry args={[0.15, 0.15, 1.5]} />
        {beamMat}
      </mesh>

      {/* Restored: patch wooden boards nutup atap jebol (-4, 6, area
          x:-6..-2 z:4..8). Hole 4×4 di-cover by 3 planks paralel z. */}
      {restored && (
        <group position={[-4, -0.02, 6]}>
          {[-1.3, 0, 1.3].map((dz, i) => (
            <mesh key={`ptch-${i}`} position={[0, 0, dz]}>
              <boxGeometry args={[4.1, 0.06, 1.35]} />
              <meshStandardMaterial color="#5a4030" roughness={0.95} />
            </mesh>
          ))}
        </group>
      )}

      {/* Visible cross-beams — 4 balok kayu menggantung sedikit di bawah
          ceiling, paralel sumbu X. Kasih architectural depth saat user
          ngeliat ke atas (atau dari camera elevated). Posisi z: -7, -2,
          3, 8 (hindari hole z=4..8 di pojok NW, balok z=3 dan z=8 cuma
          render di sisi yang gak overlap dengan hole). */}
      {[
        { z: -7, fullSpan: true },
        { z: -2, fullSpan: true },
        { z: 3, fullSpan: true },
        // z=8 cuma render dari x:-2..8 (sisi timur, hindari hole) +
        // x:-8..-6 (segmen kecil di luar hole)
      ].map((b, i) => (
        <mesh key={`beam-full-${i}`} position={[0, -0.18, b.z]}>
          <boxGeometry args={[ROOM_W - 0.4, 0.18, 0.18]} />
          {beamMat}
        </mesh>
      ))}
      {/* Beam z=8 split: sisi timur (panjang) + sisi barat (pendek) */}
      <mesh position={[3, -0.18, 8]}>
        <boxGeometry args={[10, 0.18, 0.18]} />
        {beamMat}
      </mesh>
      <mesh position={[-7, -0.18, 8]}>
        <boxGeometry args={[2, 0.18, 0.18]} />
        {beamMat}
      </mesh>
    </group>
  );
};

// God ray cone — volumetric light cone dari atap jebol. Sphere stack
// pakai additive material yang membentuk shaft turun miring ke lantai.
// Bukan beneran volumetric (perlu shader), tapi tone-matched stack
// kerasa cukup believable.
const GodRayCone = ({ restored }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    // Subtle pulse — intensity breathing biar gak static
    const t = state.clock.elapsedTime;
    const breath = 0.92 + Math.sin(t * 0.3) * 0.08;
    groupRef.current.children.forEach((child) => {
      if (child.material) {
        child.material.opacity =
          (child.userData.baseOpacity || 0.15) * breath;
      }
    });
  });

  const segments = useMemo(() => {
    const arr = [];
    const startY = ROOM_H + 0.5;
    const endY = 0;
    const segCount = 12;
    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1);
      const y = lerp(startY, endY, t);
      // Cone tilts: tip near hole (-4, 6, 6), base spreads to (-2, 0, 3)
      const x = lerp(-4, -2, t);
      const z = lerp(6, 3, t);
      const radius = lerp(0.4, 2.2, t);
      const opacity = lerp(0.22, 0.04, t);
      arr.push({ x, y, z, radius, opacity });
    }
    return arr;
  }, []);

  return (
    <group ref={groupRef}>
      {segments.map((s, i) => (
        <mesh key={`gr-${i}`} position={[s.x, s.y, s.z]} userData={{ baseOpacity: s.opacity }}>
          <sphereGeometry args={[s.radius, 12, 8]} />
          <meshBasicMaterial
            color={restored ? '#fff0c8' : '#f4d090'}
            transparent
            opacity={s.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// Reading table + chair (slight tilt) + lantern + open book focal.
// Centered position (0, 0, 0).
const ReadingTable = ({ onClickOpenBook, hoveredOpenBook, onHoverOpenBook, onOutOpenBook }) => {
  const openBookRef = useRef();
  useFrame(() => {
    if (!openBookRef.current) return;
    // Subtle hover lift saat hovered
    const targetY = hoveredOpenBook ? 0.83 : 0.78;
    openBookRef.current.position.y = lerp(
      openBookRef.current.position.y,
      targetY,
      0.1,
    );
  });

  return (
    <group>
      {/* Table top */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2.4, 0.05, 1.2]} />
        <meshStandardMaterial color={COLORS.tableWood} roughness={0.7} />
      </mesh>
      {/* Table legs */}
      {[[1.1, 0.5], [-1.1, 0.5], [1.1, -0.5], [-1.1, -0.5]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, 0.375, z]}>
          <boxGeometry args={[0.08, 0.75, 0.08]} />
          <meshStandardMaterial color={COLORS.tableWood} roughness={0.8} />
        </mesh>
      ))}

      {/* Chair di sisi selatan meja, menghadap utara (toward table).
          User masuk dari -Z south, kursi ini posisi natural untuk duduk
          baca — backrest di selatan, seat menghadap meja. Slight tilt
          biar kerasa "baru ditinggal pergi". */}
      <group position={[0, 0, -1.6]}>
        <mesh position={[0, 0.4, 0]} rotation={[-0.04, 0, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.6]} />
          <meshStandardMaterial color={COLORS.chairWood} roughness={0.75} />
        </mesh>
        {/* Backrest — di selatan (negative z local) */}
        <mesh position={[0, 0.85, -0.27]} rotation={[-0.04, 0, 0]}>
          <boxGeometry args={[0.6, 0.9, 0.06]} />
          <meshStandardMaterial color={COLORS.chairWood} roughness={0.78} />
        </mesh>
        {/* Legs */}
        {[[0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]].map(([x, z], i) => (
          <mesh key={`chleg-${i}`} position={[x, 0.2, z]}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
            <meshStandardMaterial color={COLORS.chairWood} roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Lentern at table edge — keramik + glass shade + visible flame
          dengan flicker animation + halo glow billboard. Selalu nyala
          (drought atau restored) karena ini source cahaya utama meja
          baca. */}
      <group position={[-0.85, 0.8, 0.35]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.12, 0.12, 12]} />
          <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 12]} />
          <meshStandardMaterial color="#3a2418" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.11, 0.08, 0.16, 12, 1, true]} />
          <meshBasicMaterial
            color="#f4d090"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* Halo glow — large soft sphere additive, kerasa "cahaya
            mengembun di udara sekitar lentera." Toneless + low opacity. */}
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.55, 14, 10]} />
          <meshBasicMaterial
            color="#f4a060"
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <LenternaFlame />
      </group>

      {/* Open book on table — focal point. Click → meja book overlay
          ("Halaman Terakhir") */}
      <group
        ref={openBookRef}
        position={[0, 0.78, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverOpenBook?.();
        }}
        onPointerOut={() => onOutOpenBook?.()}
        onClick={(e) => {
          e.stopPropagation();
          onClickOpenBook?.();
        }}
      >
        {/* Left page */}
        <mesh position={[-0.18, 0, 0]} rotation={[-Math.PI / 2, 0, 0.04]}>
          <planeGeometry args={[0.32, 0.45]} />
          <meshStandardMaterial
            color="#f6e8c8"
            emissive={hoveredOpenBook ? '#f4d090' : '#000'}
            emissiveIntensity={hoveredOpenBook ? 0.2 : 0}
            roughness={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Right page */}
        <mesh position={[0.18, 0, 0]} rotation={[-Math.PI / 2, 0, -0.04]}>
          <planeGeometry args={[0.32, 0.45]} />
          <meshStandardMaterial
            color="#f6e8c8"
            emissive={hoveredOpenBook ? '#f4d090' : '#000'}
            emissiveIntensity={hoveredOpenBook ? 0.2 : 0}
            roughness={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Spine ridge between pages */}
        <mesh position={[0, -0.005, 0]}>
          <boxGeometry args={[0.02, 0.015, 0.45]} />
          <meshStandardMaterial color="#8B4040" roughness={0.7} />
        </mesh>
        {/* Indicator orb mengambang di atas open book — petunjuk
            visual sama kayak buku di rak. Sedikit lebih besar karena
            ini focal point. */}
        <mesh position={[0, 0.22, 0]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshBasicMaterial
            color="#f4d090"
            transparent
            opacity={hoveredOpenBook ? 1 : 0.9}
            toneMapped={false}
          />
        </mesh>
        {/* Floating hover label */}
        {hoveredOpenBook && (
          <Html
            position={[0, 0.3, 0]}
            center
            distanceFactor={6}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
                color: 'rgba(255,232,184,0.95)',
                fontSize: '14px',
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                textShadow:
                  '0 0 14px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)',
              }}
            >
              Tentang Ruangan Ini
            </div>
          </Html>
        )}
        {/* Bookmark ribbon — pita kain merah dangling dari edge bawah
            open book. Detail dekoratif kerasa "sedang dibaca, ada
            penanda halaman." Static. */}
        <mesh position={[0.08, -0.005, 0.28]} rotation={[0, 0, 0.03]}>
          <boxGeometry args={[0.015, 0.006, 0.18]} />
          <meshStandardMaterial color="#8B4040" roughness={0.85} />
        </mesh>
        <mesh position={[0.075, -0.01, 0.4]} rotation={[0.15, 0, 0.05]}>
          <boxGeometry args={[0.018, 0.005, 0.04]} />
          <meshStandardMaterial color="#8B4040" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
};

// Bookshelf — parametric (upright or tilted). Books arranged in 2 rows.
// Books rendered as thin box (spine) clickable.
const Bookshelf = ({
  position,
  rotation = [0, 0, 0],
  books,
  hoveredId,
  readIds,
  onHover,
  onOut,
  onClick,
  scaleH = 1, // S small kept ~0.8
  restored = false,
}) => {
  const w = 3 * scaleH;
  const h = 3 * scaleH;
  const d = 0.6;
  // Material refs untuk indicator orb pulse animation. Pakai callback
  // ref biar ke-fill saat mount, dan useFrame walk-through tiap frame.
  // Lebih efficient daripada satu useFrame per buku.
  const indicatorRefs = useRef([]);
  useFrame((state) => {
    if (!indicatorRefs.current.length) return;
    const t = state.clock.elapsedTime;
    indicatorRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const phase = idx * 0.65;
      // Pulse opacity 0.55-0.95, frequency ~1.3Hz, phase-staggered
      ref.opacity = 0.75 + Math.sin(t * 1.3 + phase) * 0.2;
    });
  });

  // Up to 5 books per row × 2 rows. Position spine along x within shelf.
  const slots = useMemo(() => {
    const arr = [];
    const maxBooks = Math.min(books.length, 10);
    const cols = Math.min(5, maxBooks);
    for (let i = 0; i < maxBooks; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = -w / 2 + (col + 0.5) * (w / cols);
      const y = -h / 2 + 0.3 + row * (h / 2);
      const z = -d / 2 + 0.2;
      arr.push({ x, y, z });
    }
    return arr;
  }, [books.length, w, h, d]);

  return (
    <group position={position} rotation={rotation}>
      {/* Shelf frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
      </mesh>
      {/* Shelf inset (slightly recessed front face) — kasih kesan ada
          books di dalamnya */}
      <mesh position={[0, 0, d / 2 - 0.05]}>
        <boxGeometry args={[w - 0.1, h - 0.1, 0.02]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Mid divider shelf */}
      <mesh position={[0, 0, d / 2 - 0.1]}>
        <boxGeometry args={[w - 0.05, 0.04, 0.4]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
      </mesh>

      {/* Books on shelves — spine height & width sedikit di-variate per
          book (deterministic per id) supaya rak gak kerasa robotic uniform.
          Per-book offset: height 0.42-0.52, width 0.12-0.16.
          Tiap interactive book punya indicator orb mengambang di atas
          spine sebagai petunjuk "ini bisa diklik," plus subtle always-on
          emissive di spine biar gak melebur sama deco books. */}
      {slots.map((slot, i) => {
        const book = books[i];
        if (!book) return null;
        const hovered = hoveredId === book.id;
        const read = readIds.has(book.id);
        const variant = hashSeed(book.id);
        const spineH = 0.42 + variant * 0.1;
        const spineW = 0.12 + hashSeed(`${book.id}-w`) * 0.04;
        // Anchor base ke posisi shelf, biar buku pendek/tinggi dasarnya
        // sama-rata di rak (gak ngambang).
        const yAdjust = (spineH - 0.5) / 2;
        return (
          <group
            key={book.id}
            position={[slot.x, slot.y + yAdjust + (hovered ? 0.03 : 0), slot.z]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(book.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              onOut?.(book.id);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(book);
            }}
          >
            <mesh>
              <boxGeometry args={[spineW, spineH, 0.36]} />
              <meshStandardMaterial
                color={book.spineColor}
                emissive={hovered ? COLORS.spineHover : book.spineColor}
                emissiveIntensity={hovered ? 0.5 : read ? 0.25 : 0.18}
                roughness={0.7}
              />
            </mesh>
            {/* Indicator orb di atas buku — petunjuk visual "klik aku".
                Unread: gold warm pulsing, "look at me." Read: muted
                blue-grey lebih kecil, "udah dibuka tapi tetep ada di
                rak." Material ref di-track buat pulse animation di
                parent useFrame. */}
            <mesh position={[0, spineH / 2 + 0.16, 0.1]}>
              <sphereGeometry
                args={[read ? 0.022 : 0.035, 10, 8]}
              />
              <meshBasicMaterial
                ref={(el) => {
                  indicatorRefs.current[i] = el;
                }}
                color={read ? '#88a8c0' : '#f4d090'}
                transparent
                opacity={hovered ? 1 : read ? 0.6 : 0.85}
                toneMapped={false}
              />
            </mesh>
            {/* Subtle read marker — small dot near top of spine */}
            {read && !hovered && (
              <mesh position={[0, 0.2, 0.181]}>
                <sphereGeometry args={[0.015, 6, 6]} />
                <meshBasicMaterial color="#f4d090" toneMapped={false} />
              </mesh>
            )}
            {hovered && (
              <Html
                position={[0, 0.4, 0]}
                center
                distanceFactor={6}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(20, 14, 8, 0.65)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    border: '1px solid rgba(244, 208, 144, 0.2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      fontFamily: '"Fraunces Variable", serif',
                      fontStyle: 'italic',
                      color: 'rgba(255,228,178,0.95)',
                      fontSize: '13px',
                    }}
                  >
                    {book.title}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Decorative non-interactive books — fill empty slots dengan
          spine warna acak buat estetika rak yang "penuh". Restored:
          tightly-packed dgn cols=7 supaya rak kerasa fully stocked
          (~14 per shelf) + vibrant warna-warni palette (burgundy,
          emerald, ochre, navy, rose, cream — kerasa perpustakaan
          hidup). Drought: cols=5 (sparser) + muted palette (faded,
          dust-covered, kerasa "ada buku yang udah lama gak diurus"). */}
      {(() => {
        const fillCols = restored ? 7 : 5;
        const fillCap = fillCols * 2;
        if (slots.length >= fillCap) return null;
        // Vibrant warna-warni palette untuk restored — aged leather
        // bindings di berbagai warna klasik library.
        const restoredColors = [
          '#8a2030', // deep cranberry
          '#a83040', // burgundy
          '#3a6048', // forest green
          '#2a5a4a', // emerald dark
          '#3a4878', // navy
          '#2a3a68', // indigo deep
          '#c8a060', // mustard ochre
          '#a87030', // saffron
          '#7a3858', // vintage rose
          '#5a3858', // dark mauve
          '#4a7858', // sage
          '#a85040', // terracotta
          '#d4b890', // cream/ivory
          '#3a6878', // teal slate
          '#6a4830', // brown leather
          '#7a5840', // light brown
        ];
        // Muted/faded palette untuk drought — same hues tapi heavily
        // desaturated, kerasa dust-covered.
        const droughtColors = ['#7a5840', '#5a4030', '#a08068', '#6a4830', '#3a4858'];
        const palette = restored ? restoredColors : droughtColors;
        return Array.from({ length: fillCap - slots.length }, (_, i) => {
          const idx = slots.length + i;
          const row = Math.floor(idx / fillCols);
          const col = idx % fillCols;
          const x = -w / 2 + (col + 0.5) * (w / fillCols);
          const y = -h / 2 + 0.3 + row * (h / 2);
          const z = -d / 2 + 0.2;
          const seed = hashSeed(`deco-${position[0]}-${idx}`);
          const seed2 = hashSeed(`deco-${position[0]}-${idx}-band`);
          const bookW = restored ? 0.1 + seed * 0.03 : 0.13;
          const bookH = 0.48 - seed * 0.1;
          const spineColor = palette[Math.floor(seed * palette.length)];
          // ~30% buku restored punya gold/silver title band di tengah
          // spine — kerasa "leather-bound classics."
          const hasTitleBand = restored && seed2 > 0.7;
          const bandColor = seed2 > 0.85 ? '#d4b060' : '#b8a890';
          return (
            <group
              key={`deco-${i}`}
              position={[x, y + seed * 0.04, z]}
              rotation={[0, 0, (seed - 0.5) * 0.06]}
            >
              <mesh>
                <boxGeometry args={[bookW, bookH, 0.32]} />
                <meshStandardMaterial
                  color={spineColor}
                  roughness={0.85}
                />
              </mesh>
              {hasTitleBand && (
                <mesh position={[0, bookH * 0.15, 0.161]}>
                  <boxGeometry args={[bookW * 0.85, 0.05, 0.002]} />
                  <meshStandardMaterial
                    color={bandColor}
                    metalness={0.3}
                    roughness={0.5}
                    emissive={bandColor}
                    emissiveIntensity={0.08}
                  />
                </mesh>
              )}
            </group>
          );
        });
      })()}

      {/* Restored only: extra leaning books + stacks horizontal di
          edges supaya rak gak cuma rigid grid — kerasa lived-in.
          1 horizontal stack di pojok bawah, 2 leaning books di top
          shelf. Deterministic via hashSeed(position). Pakai palette
          warna-warni vibrant juga. */}
      {restored && (() => {
        const baseSeed = hashSeed(`extra-${position[0]}-${position[2]}`);
        // Vibrant palette buat horizontal stack & leaning books
        const horizColors = ['#8a2030', '#3a6048', '#c8a060', '#3a4878', '#a85040', '#2a5a4a'];
        const leanColor1 = ['#8a2030', '#a83040', '#7a3858'][Math.floor(baseSeed * 3)];
        const leanColor2 = ['#3a4878', '#3a6048', '#c8a060'][Math.floor(hashSeed(`lean2-${position[0]}`) * 3)];
        return (
          <>
            {/* Horizontal book stack di bottom shelf */}
            {Array.from({ length: 3 }).map((_, i) => (
              <mesh
                key={`hstack-${i}`}
                position={[
                  w / 2 - 0.35 - i * 0.005,
                  -h / 2 + 0.06 + i * 0.07,
                  -d / 2 + 0.18,
                ]}
                rotation={[0, 0, (baseSeed - 0.5) * 0.04]}
              >
                <boxGeometry args={[0.3, 0.06, 0.34]} />
                <meshStandardMaterial
                  color={horizColors[(i + Math.floor(baseSeed * horizColors.length)) % horizColors.length]}
                  roughness={0.88}
                />
              </mesh>
            ))}
            {/* Leaning book di top shelf edge */}
            <mesh
              position={[
                -w / 2 + 0.18,
                h / 2 - 0.25,
                -d / 2 + 0.2,
              ]}
              rotation={[0, 0, 0.25]}
            >
              <boxGeometry args={[0.12, 0.44, 0.32]} />
              <meshStandardMaterial color={leanColor1} roughness={0.85} />
            </mesh>
            <mesh
              position={[
                -w / 2 + 0.32,
                h / 2 - 0.27,
                -d / 2 + 0.2,
              ]}
              rotation={[0, 0, 0.18]}
            >
              <boxGeometry args={[0.11, 0.42, 0.32]} />
              <meshStandardMaterial color={leanColor2} roughness={0.85} />
            </mesh>
          </>
        );
      })()}
    </group>
  );
};

// Paper drift — sheet kertas berserakan di lantai (drought heavier,
// restored sparse). Tiap sheet plane tipis dengan deterministic position.
const PaperDrift = ({ count, isMobile }) => {
  const actualCount = isMobile ? Math.floor(count * 0.3) : count;
  const papers = useMemo(() => {
    const arr = [];
    for (let i = 0; i < actualCount; i++) {
      const seed = hashSeed(`paper-${i}`);
      const seed2 = hashSeed(`paper-rot-${i}`);
      // Avoid table area (radius 1.5 from origin)
      let x, z;
      do {
        x = (seed * 2 - 1) * (ROOM_W / 2 - 1.5);
        z = (hashSeed(`paper-z-${i}`) * 2 - 1) * (ROOM_D / 2 - 1.5);
      } while (Math.abs(x) < 1.5 && Math.abs(z) < 1);
      arr.push({
        x,
        z,
        rotY: seed2 * Math.PI * 2,
        rotX: (seed - 0.5) * 0.1,
        scale: 0.7 + seed * 0.3,
      });
    }
    return arr;
  }, [actualCount]);

  return (
    <group>
      {papers.map((p, i) => (
        <mesh
          key={`paper-${i}`}
          position={[p.x, 0.005, p.z]}
          rotation={[-Math.PI / 2 + p.rotX, p.rotY, 0]}
          scale={p.scale}
        >
          <planeGeometry args={[0.18, 0.24]} />
          <meshStandardMaterial
            color={COLORS.paper}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// Dust motes — sphere kecil di sinar cone, additive blending biar
// kerasa "debu di sinar matahari."
const DustMotes = ({ count, isMobile }) => {
  const actualCount = isMobile ? Math.floor(count * 0.25) : count;
  const motesRef = useRef();
  const motes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < actualCount; i++) {
      const seed = hashSeed(`mote-${i}`);
      const seed2 = hashSeed(`mote-y-${i}`);
      const seed3 = hashSeed(`mote-z-${i}`);
      // Cluster di god ray cone area (x:-6..0, y:0.5..6, z:2..7)
      arr.push({
        x: -6 + seed * 6,
        y: 0.5 + seed2 * 5,
        z: 2 + seed3 * 5,
        speed: 0.05 + seed * 0.04,
        phase: seed * Math.PI * 2,
      });
    }
    return arr;
  }, [actualCount]);

  useFrame((state) => {
    if (!motesRef.current) return;
    const t = state.clock.elapsedTime;
    motesRef.current.children.forEach((child, i) => {
      const m = motes[i];
      if (!m) return;
      // Slow vertical drift + subtle horizontal sway
      child.position.y =
        m.y + Math.sin(t * m.speed + m.phase) * 0.3;
      child.position.x =
        m.x + Math.sin(t * m.speed * 0.7 + m.phase) * 0.15;
    });
  });

  return (
    <group ref={motesRef}>
      {motes.map((m, i) => (
        <mesh key={`mote-${i}`} position={[m.x, m.y, m.z]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshBasicMaterial
            color="#f4e4c8"
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// Cobwebs — drought only. Banyak triangular plane translucent off-white
// di lokasi yang masuk akal sarang laba-laba. Sway animation cuma jalan
// di desktop (mobile: static). Mobile juga cuma render subset webs (8
// dari 22) buat reduce transparent mesh count.
const Cobwebs = ({ isMobile = false }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current || isMobile) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((c, i) => {
      const phase = i * 0.55;
      const sway = Math.sin(t * 0.4 + phase) * 0.04;
      // Tambah sway ke baseRotZ yang disimpan di userData saat mount
      c.rotation.z = (c.userData.baseRotZ || 0) + sway;
    });
  });
  const webs = [
    // 4 upper room corners — biggest webs
    { pos: [-ROOM_W / 2 + 0.4, ROOM_H - 0.4, ROOM_D / 2 - 0.4], rot: [0, Math.PI / 4, 0], size: 0.95 },
    { pos: [ROOM_W / 2 - 0.4, ROOM_H - 0.4, ROOM_D / 2 - 0.4], rot: [0, -Math.PI / 4, 0], size: 0.95 },
    { pos: [-ROOM_W / 2 + 0.4, ROOM_H - 0.4, -ROOM_D / 2 + 0.4], rot: [0, -Math.PI / 4, 0], size: 0.85 },
    { pos: [ROOM_W / 2 - 0.4, ROOM_H - 0.4, -ROOM_D / 2 + 0.4], rot: [0, Math.PI / 4, 0], size: 0.85 },
    // Along ceiling beam edges — between beams and walls
    { pos: [-7, 5.5, -7], rot: [0, Math.PI / 4, Math.PI / 3], size: 0.55 },
    { pos: [7, 5.5, -2], rot: [0, -Math.PI / 4, Math.PI / 3], size: 0.5 },
    { pos: [-4, 5.5, 3.5], rot: [0, 0, Math.PI / 2.5], size: 0.6 },
    { pos: [3, 5.5, 7], rot: [0, Math.PI / 3, Math.PI / 2.5], size: 0.55 },
    { pos: [-6, 5.5, 0], rot: [0, Math.PI / 6, Math.PI / 2.5], size: 0.5 },
    // Between rak NW dan dinding utara — sudut pojok rak
    { pos: [-6.3, 2.8, 9.5], rot: [0, Math.PI / 4, 0.3], size: 0.55 },
    { pos: [-3, 2.6, 9.5], rot: [0, -Math.PI / 6, -0.2], size: 0.4 },
    // Between rak NE dan dinding utara
    { pos: [6.3, 2.8, 9.5], rot: [0, -Math.PI / 4, -0.3], size: 0.55 },
    { pos: [3, 2.6, 9.5], rot: [0, Math.PI / 6, 0.2], size: 0.4 },
    // Near wall breach (-X, z=4-6) — sarang besar karena lama gak diganggu
    { pos: [-7.6, 4.2, 5], rot: [0, Math.PI / 2, 0], size: 0.8 },
    { pos: [-7.6, 2.2, 5.5], rot: [0, Math.PI / 2, 0.3], size: 0.55 },
    { pos: [-7.6, 3.5, 3.5], rot: [0, Math.PI / 2, -0.4], size: 0.5 },
    // Hanging cobweb dari ceiling beam — drape ke bawah (di area god ray)
    { pos: [-3, 4.7, 5.5], rot: [0.2, 0.5, 0.3], size: 0.45 },
    { pos: [2, 4.5, -3], rot: [-0.2, 0, 0.3], size: 0.4 },
    { pos: [5, 4.6, 4], rot: [0.3, -0.4, 0.2], size: 0.42 },
    // Between rak E miring dan dinding timur
    { pos: [7.5, 3.5, -3.5], rot: [0, -Math.PI / 2, 0.4], size: 0.5 },
    // Sekitar rak W tumbang
    { pos: [-7.5, 2.0, 0.5], rot: [0, Math.PI / 2, -0.3], size: 0.55 },
    // Above reading table (faint, sky-net feel)
    { pos: [0.5, 4.6, 0.5], rot: [Math.PI / 2.5, 0.3, 0], size: 0.5 },
  ];
  // Mobile: subset 8 webs (corner + breach area only) — skip ceiling
  // beam edges + drape (less impact, more cost karena transparency).
  const visibleWebs = isMobile ? webs.slice(0, 8) : webs;
  return (
    <group ref={groupRef}>
      {visibleWebs.map((c, i) => (
        <mesh
          key={`cob-${i}`}
          position={c.pos}
          rotation={c.rot}
          userData={{ baseRotZ: c.rot[2] }}
        >
          <planeGeometry args={[c.size, c.size]} />
          <meshBasicMaterial
            color="#c8b8a0"
            transparent
            opacity={0.18 + hashSeed(`cob-${i}`) * 0.06}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// TwigDebris — drought only. Ranting-ranting kayu kering yang tertiup
// masuk lewat wall breach + ceiling jebol. Dibuat dari thin cylinder
// (atau elongated box) dengan tilt + rotation random. Cluster utama
// dekat wall breach + sisa scattered di lantai.
const TwigDebris = ({ isMobile }) => {
  const count = isMobile ? 12 : 22;
  const twigs = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const seed = hashSeed(`tw-${i}`);
      const seedR = hashSeed(`tw-r-${i}`);
      const seedA = hashSeed(`tw-a-${i}`);
      // 50% dekat wall breach pile, 30% dekat ceiling hole area,
      // 20% scattered di ruangan
      let cx, cz, range;
      if (seed < 0.5) {
        cx = -6.5;
        cz = 4.5;
        range = 2.0;
      } else if (seed < 0.8) {
        cx = -3;
        cz = 5;
        range = 2.2;
      } else {
        cx = (hashSeed(`tw-cx-${i}`) - 0.5) * 12;
        cz = (hashSeed(`tw-cz-${i}`) - 0.5) * 16;
        range = 0.3;
      }
      const r = hashSeed(`tw-rr-${i}`) * range;
      const a = seedA * Math.PI * 2;
      const length = 0.25 + seedR * 0.4;
      const thick = 0.018 + seed * 0.015;
      arr.push({
        x: cx + Math.cos(a) * r,
        z: cz + Math.sin(a) * r,
        rotY: seedA * Math.PI * 2,
        tilt: (seed - 0.5) * 0.4,
        length,
        thick,
        color: seed > 0.5 ? '#4a3020' : '#3a2418',
      });
    }
    return arr;
  }, [count]);

  return (
    <group>
      {twigs.map((t, i) => (
        <mesh
          key={`tw-${i}`}
          position={[t.x, t.thick / 2 + 0.003, t.z]}
          rotation={[t.tilt * 0.2, t.rotY, t.tilt * 0.6]}
        >
          <boxGeometry args={[t.length, t.thick, t.thick * 0.9]} />
          <meshStandardMaterial color={t.color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// DamagedBooks — drought only. Buku-buku yang rusak parah: cover lepas
// dari spine, halaman terbuka & robek, atau crumpled. Beda dari
// BookScatter (utuh tapi jatuh) — ini buku yang udah hancur.
const DamagedBooks = ({ isMobile }) => {
  const count = isMobile ? 5 : 9;
  const books = useMemo(() => {
    const arr = [];
    const colors = ['#7a3030', '#5a4030', '#3a4858', '#c8a060', '#5a3025', '#7a5840'];
    for (let i = 0; i < count; i++) {
      const seed = hashSeed(`db-${i}`);
      const seedA = hashSeed(`db-a-${i}`);
      const seedR = hashSeed(`db-r-${i}`);
      // Scattered di area "high damage": dekat rak W (40%), rak E (25%),
      // breach (20%), tengah-tengah (15%)
      let cx, cz, range;
      if (seed < 0.4) {
        cx = -6.5;
        cz = 2;
        range = 1.8;
      } else if (seed < 0.65) {
        cx = 6.5;
        cz = -2;
        range = 1.6;
      } else if (seed < 0.85) {
        cx = -5.5;
        cz = 5;
        range = 1.5;
      } else {
        cx = (hashSeed(`db-cx-${i}`) - 0.5) * 6;
        cz = (hashSeed(`db-cz-${i}`) - 0.5) * 8;
        range = 0.4;
      }
      const r = seedR * range;
      const a = seedA * Math.PI * 2;
      arr.push({
        x: cx + Math.cos(a) * r,
        z: cz + Math.sin(a) * r,
        rotY: seedA * Math.PI * 2,
        tilt: (seed - 0.5) * 0.4,
        color: colors[Math.floor(seed * colors.length)],
        type: i % 3, // 3 jenis kerusakan
      });
    }
    return arr;
  }, [count]);

  return (
    <group>
      {books.map((b, i) => {
        if (b.type === 0) {
          // Type 0: cover lepas dari spine — 2 mesh terpisah, cover
          // di samping spine
          return (
            <group key={`db-${i}`} position={[b.x, 0, b.z]} rotation={[0, b.rotY, 0]}>
              {/* Spine bare (no cover) — kertas terlihat */}
              <mesh position={[0, 0.04, 0]} rotation={[0, 0, b.tilt]}>
                <boxGeometry args={[0.22, 0.06, 0.16]} />
                <meshStandardMaterial color="#e8d4a8" roughness={0.95} />
              </mesh>
              {/* Cover yang terlepas, posisi samping */}
              <mesh
                position={[0.25, 0.02, 0.05]}
                rotation={[0, b.rotY * 0.5, b.tilt * 2]}
              >
                <boxGeometry args={[0.16, 0.025, 0.22]} />
                <meshStandardMaterial color={b.color} roughness={0.9} />
              </mesh>
            </group>
          );
        }
        if (b.type === 1) {
          // Type 1: open book — 2 page planes membentuk V terbuka
          return (
            <group key={`db-${i}`} position={[b.x, 0.04, b.z]} rotation={[0, b.rotY, 0]}>
              {/* Left page */}
              <mesh position={[-0.08, 0.02, 0]} rotation={[-Math.PI / 2 + 0.15, 0, b.tilt]}>
                <planeGeometry args={[0.18, 0.24]} />
                <meshStandardMaterial
                  color="#e8d4a8"
                  roughness={0.95}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Right page */}
              <mesh position={[0.08, 0.02, 0]} rotation={[-Math.PI / 2 - 0.15, 0, b.tilt]}>
                <planeGeometry args={[0.18, 0.24]} />
                <meshStandardMaterial
                  color="#e8d4a8"
                  roughness={0.95}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Spine ridge */}
              <mesh position={[0, 0.025, 0]} rotation={[0, 0, b.tilt]}>
                <boxGeometry args={[0.018, 0.012, 0.24]} />
                <meshStandardMaterial color={b.color} roughness={0.85} />
              </mesh>
            </group>
          );
        }
        // Type 2: crumpled / squashed — flat box tipis dengan tilt agresif
        return (
          <mesh
            key={`db-${i}`}
            position={[b.x, 0.025, b.z]}
            rotation={[b.tilt * 0.5, b.rotY, b.tilt * 1.5]}
          >
            <boxGeometry args={[0.24, 0.04, 0.18]} />
            <meshStandardMaterial color={b.color} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
};

// TornPaperPieces — drought only. Plane kecil ireguler-ish dari kertas
// yang robek (smaller than PaperDrift sheets, lebih banyak). Scattered
// di seluruh ruangan, mostly cluster ke arah breach (tertiup angin).
const TornPaperPieces = ({ isMobile }) => {
  const count = isMobile ? 12 : 36;
  const pieces = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const seed = hashSeed(`tp-${i}`);
      const seedX = hashSeed(`tp-x-${i}`);
      const seedZ = hashSeed(`tp-z-${i}`);
      // 40% dekat breach area, 60% scattered
      let x, z;
      if (seed < 0.4) {
        const r = hashSeed(`tp-r-${i}`) * 2.8;
        const a = hashSeed(`tp-a-${i}`) * Math.PI * 2;
        x = -5 + Math.cos(a) * r;
        z = 4 + Math.sin(a) * r;
      } else {
        x = (seedX * 2 - 1) * (ROOM_W / 2 - 1);
        z = (seedZ * 2 - 1) * (ROOM_D / 2 - 1);
      }
      // Skip dekat reading table
      if (Math.hypot(x, z) < 1.5) {
        x = x * 2;
        z = z * 2;
      }
      arr.push({
        x,
        z,
        rotY: seed * Math.PI * 2,
        size: 0.06 + seed * 0.07,
        opacity: 0.7 + seed * 0.3,
      });
    }
    return arr;
  }, [count]);

  return (
    <group>
      {pieces.map((p, i) => (
        <mesh
          key={`tp-${i}`}
          position={[p.x, 0.004, p.z]}
          rotation={[-Math.PI / 2 + (hashSeed(`tp-rx-${i}`) - 0.5) * 0.2, p.rotY, 0]}
        >
          <planeGeometry args={[p.size, p.size * (0.7 + hashSeed(`tp-ar-${i}`) * 0.5)]} />
          <meshStandardMaterial
            color="#e8d4a8"
            roughness={0.95}
            side={THREE.DoubleSide}
            transparent
            opacity={p.opacity}
          />
        </mesh>
      ))}
    </group>
  );
};

// WindStreamlines — drought only. 6 horizontal streaks tipis dari wall
// breach (-X di z=4-6) drift ke kanan + fade out. Kerasa "angin lewat
// dari celah dinding." Lebih kerasa abandoned + open-to-elements.
const WindStreamlines = ({ isMobile }) => {
  const count = isMobile ? 4 : 8;
  const groupRef = useRef();
  const streaks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const seed = hashSeed(`ws-${i}`);
      arr.push({
        baseY: 1.0 + seed * 2.5,
        baseZ: 4 + hashSeed(`ws-z-${i}`) * 2,
        phase: seed * Math.PI * 2,
        speed: 0.5 + seed * 0.4,
        length: 0.6 + hashSeed(`ws-l-${i}`) * 0.8,
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const s = streaks[i];
      if (!s) return;
      // Cycle: dari x=-7 ke x=+3, total 10 units, ~speed s.speed per sec
      const cycle = 6;
      const localT = ((t * s.speed + s.phase) % cycle) / cycle;
      child.position.x = -7 + localT * 10;
      child.position.y = s.baseY + Math.sin(t * 0.7 + s.phase) * 0.05;
      // Fade in di awal, fade out di akhir
      const opacity =
        localT < 0.15
          ? (localT / 0.15) * 0.25
          : localT > 0.7
            ? ((1 - localT) / 0.3) * 0.25
            : 0.25;
      if (child.material) child.material.opacity = opacity;
    });
  });

  return (
    <group ref={groupRef}>
      {streaks.map((s, i) => (
        <mesh
          key={`ws-${i}`}
          position={[-7, s.baseY, s.baseZ]}
          rotation={[0, 0, 0]}
        >
          <boxGeometry args={[s.length, 0.008, 0.008]} />
          <meshBasicMaterial
            color="#f4d090"
            transparent
            opacity={0.2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// DustFootprints — drought only. Trail jejak debu dari south door
// (z=-9, x=0) ke meja baca (z=0). Sparse circles deterministic-
// distributed, subtle. Hint "ada yang lewat sini sebelum kota mati."
const DustFootprints = () => {
  const prints = useMemo(() => {
    const arr = [];
    const step = 0.8;
    for (let z = -8.5; z < -1; z += step) {
      const i = (z + 8.5) / step;
      const side = i % 2 === 0 ? 0.18 : -0.18; // alternate kiri-kanan
      const jitterX = (hashSeed(`fp-x-${i}`) - 0.5) * 0.3;
      const jitterZ = (hashSeed(`fp-z-${i}`) - 0.5) * 0.2;
      arr.push({
        x: side + jitterX,
        z: z + jitterZ,
        size: 0.12 + hashSeed(`fp-s-${i}`) * 0.06,
        opacity: 0.15 + hashSeed(`fp-o-${i}`) * 0.1,
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {prints.map((p, i) => (
        <mesh
          key={`fp-${i}`}
          position={[p.x, 0.008, p.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[p.size, 10]} />
          <meshBasicMaterial
            color="#d4b8a0"
            transparent
            opacity={p.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// FallenBookPile — drought-only narrative detail. Tumpukan buku yang
// jatuh dari rak W tumbang, berhamburan di lantai sekitar rak. Bukan
// interactive — purely visual storytelling "buku-buku tumpah pas rak
// runtuh." Restored state: papan-papan disusun balik, pile ilang.
const FallenBookPile = ({ isMobile = false }) => {
  const count = isMobile ? 5 : 10;
  const books = useMemo(() => {
    const arr = [];
    const seedColors = ['#7a3030', '#5a4030', '#3a4858', '#c8a060', '#5a3025', '#7a5840'];
    // Cluster di sekitar rak W (x:-6.5, z:2). N buku scattered dalam
    // radius ~1.5 unit, mixed orientation (some flat, some leaning).
    for (let i = 0; i < count; i++) {
      const seed = hashSeed(`fbp-${i}`);
      const seedR = hashSeed(`fbp-r-${i}`);
      const seedA = hashSeed(`fbp-a-${i}`);
      const r = 0.6 + seedR * 1.2;
      const a = seedA * Math.PI * 2;
      arr.push({
        x: -6.5 + Math.cos(a) * r,
        z: 2 + Math.sin(a) * r,
        rotY: seed * Math.PI * 2,
        rotZ: (seed - 0.5) * 0.3,
        color: seedColors[Math.floor(seed * seedColors.length)],
        flat: seed > 0.4,
      });
    }
    return arr;
  }, [count]);

  return (
    <group>
      {books.map((b, i) =>
        b.flat ? (
          // Flat (terbuka, tersungkur ke lantai)
          <mesh
            key={`fb-${i}`}
            position={[b.x, 0.04, b.z]}
            rotation={[0, b.rotY, b.rotZ]}
          >
            <boxGeometry args={[0.28, 0.06, 0.2]} />
            <meshStandardMaterial color={b.color} roughness={0.9} />
          </mesh>
        ) : (
          // Standing / leaning (slight tilt)
          <mesh
            key={`fb-${i}`}
            position={[b.x, 0.12, b.z]}
            rotation={[(b.rotZ || 0) * 0.5, b.rotY, b.rotZ * 1.5]}
          >
            <boxGeometry args={[0.1, 0.24, 0.16]} />
            <meshStandardMaterial color={b.color} roughness={0.9} />
          </mesh>
        ),
      )}
    </group>
  );
};

// BookScatter — drought only. ~14 buku tersebar di seluruh ruangan
// (bukan cluster di rak W aja). Random positions menghindari meja
// baca (radius 2 dari origin) + footprint trail di selatan. Mix
// orientation: 70% flat, 30% standing/leaning.
const BookScatter = ({ isMobile }) => {
  const count = isMobile ? 8 : 16;
  const books = useMemo(() => {
    const arr = [];
    const colors = [
      '#7a3030', '#5a4030', '#3a4858', '#c8a060', '#5a3025',
      '#7a5840', '#3a3858', '#a07868', '#6a4830', '#7a3a3a',
    ];
    let i = 0;
    let attempts = 0;
    while (i < count && attempts < count * 20) {
      attempts += 1;
      const seedX = hashSeed(`bs-x-${i}-${attempts}`);
      const seedZ = hashSeed(`bs-z-${i}-${attempts}`);
      const x = (seedX * 2 - 1) * (ROOM_W / 2 - 1);
      const z = (seedZ * 2 - 1) * (ROOM_D / 2 - 1);
      // Avoid reading table area + footprint trail spine + Fallen pile cluster
      if (Math.hypot(x, z) < 2) continue;
      if (Math.abs(x) < 0.5 && z < -1) continue; // footprint spine
      if (Math.hypot(x + 6.5, z - 2) < 1.5) continue; // W pile
      const seed = hashSeed(`bs-${i}`);
      arr.push({
        x,
        z,
        rotY: seed * Math.PI * 2,
        tilt: (seed - 0.5) * 0.2,
        color: colors[Math.floor(seed * colors.length)],
        flat: seed > 0.3,
      });
      i += 1;
    }
    return arr;
  }, [count]);

  return (
    <group>
      {books.map((b, i) =>
        b.flat ? (
          <mesh
            key={`bs-${i}`}
            position={[b.x, 0.04, b.z]}
            rotation={[0, b.rotY, b.tilt]}
          >
            <boxGeometry args={[0.22, 0.05, 0.16]} />
            <meshStandardMaterial color={b.color} roughness={0.9} />
          </mesh>
        ) : (
          <mesh
            key={`bs-${i}`}
            position={[b.x, 0.1, b.z]}
            rotation={[b.tilt * 0.6, b.rotY, b.tilt * 1.6]}
          >
            <boxGeometry args={[0.09, 0.2, 0.13]} />
            <meshStandardMaterial color={b.color} roughness={0.9} />
          </mesh>
        ),
      )}
    </group>
  );
};

// PlasterChunks — drought only. ~16 chunk plaster/bata yang lepas dari
// dinding, scattered dekat wall breach (-X) dan di sepanjang dinding
// yang punya cracks. Warna campur antara plaster cream pucat + bata
// merah-coklat. Kerasa "dinding rontok ke lantai."
const PlasterChunks = ({ isMobile }) => {
  const count = isMobile ? 10 : 18;
  const chunks = useMemo(() => {
    const arr = [];
    // Spawn zones: near breach (-X, z=4-6), near east wall, near south wall
    const zones = [
      { cx: -6.5, cz: 4.5, range: 1.5, density: 0.45 }, // breach pile area
      { cx: 6.5, cz: 0, range: 2.5, density: 0.25 }, // east wall scatter
      { cx: 0, cz: -8, range: 3, density: 0.3 }, // south wall scatter
    ];
    for (let i = 0; i < count; i++) {
      const seedZ = hashSeed(`pc-zone-${i}`);
      let cum = 0;
      let zone = zones[0];
      for (const z of zones) {
        cum += z.density;
        if (seedZ < cum) {
          zone = z;
          break;
        }
      }
      const seed = hashSeed(`pc-${i}`);
      const seed2 = hashSeed(`pc-a-${i}`);
      const r = hashSeed(`pc-r-${i}`) * zone.range;
      const a = seed2 * Math.PI * 2;
      const isPlaster = seed > 0.45;
      arr.push({
        x: zone.cx + Math.cos(a) * r,
        z: zone.cz + Math.sin(a) * r,
        size: 0.1 + seed * 0.12,
        rotY: seed2 * Math.PI * 2,
        tilt: (seed - 0.5) * 0.3,
        color: isPlaster ? '#c8a890' : '#8a6258',
      });
    }
    return arr;
  }, [count]);
  return (
    <group>
      {chunks.map((c, i) => (
        <mesh
          key={`pc-${i}`}
          position={[c.x, c.size / 2, c.z]}
          rotation={[c.tilt, c.rotY, c.tilt]}
        >
          <boxGeometry args={[c.size, c.size * 0.6, c.size * 0.9]} />
          <meshStandardMaterial color={c.color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// WoodDebris — drought only. 10 potongan kayu kecil dari beam atau
// shelf yang patah, scattered di sekitar rak W tumbang & E miring
// + sedikit di tengah ruangan. Match COLORS.shelfWood / ceiling tone.
const WoodDebris = ({ isMobile }) => {
  const count = isMobile ? 7 : 12;
  const pieces = useMemo(() => {
    const arr = [];
    // 60% near W rak (tumbang area), 40% near E rak (miring area)
    for (let i = 0; i < count; i++) {
      const seed = hashSeed(`wd-${i}`);
      const seedR = hashSeed(`wd-r-${i}`);
      const seedA = hashSeed(`wd-a-${i}`);
      const nearW = seed > 0.4;
      const cx = nearW ? -6 : 6;
      const cz = nearW ? 2 : -2;
      const r = 0.8 + seedR * 1.4;
      const a = seedA * Math.PI * 2;
      const long = hashSeed(`wd-l-${i}`) > 0.5;
      arr.push({
        x: cx + Math.cos(a) * r,
        z: cz + Math.sin(a) * r,
        rotY: seedA * Math.PI * 2,
        tilt: (seed - 0.5) * 0.5,
        size: long ? [0.35 + seed * 0.2, 0.05, 0.05] : [0.2, 0.06, 0.06],
      });
    }
    return arr;
  }, [count]);
  return (
    <group>
      {pieces.map((p, i) => (
        <mesh
          key={`wd-${i}`}
          position={[p.x, p.size[1] / 2 + 0.005, p.z]}
          rotation={[p.tilt * 0.3, p.rotY, p.tilt]}
        >
          <boxGeometry args={p.size} />
          <meshStandardMaterial color={COLORS.shelfWood} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// TippedChair — drought only. Satu kursi tambahan (selain reading
// chair) yang terjungkal di sekitar rak E miring. Match chair material.
// Restored: ilang (kursi ditegakkan kembali).
const TippedChair = () => (
  <group position={[5, 0.15, -3]} rotation={[Math.PI / 2.3, 0.3, 0.4]}>
    {/* Seat */}
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[0.55, 0.08, 0.55]} />
      <meshStandardMaterial color={COLORS.chairWood} roughness={0.78} />
    </mesh>
    {/* Backrest */}
    <mesh position={[0, 0.85, -0.25]}>
      <boxGeometry args={[0.55, 0.85, 0.06]} />
      <meshStandardMaterial color={COLORS.chairWood} roughness={0.8} />
    </mesh>
    {/* Legs */}
    {[[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]].map(
      ([x, z], i) => (
        <mesh key={`tcleg-${i}`} position={[x, 0.2, z]}>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color={COLORS.chairWood} roughness={0.85} />
        </mesh>
      ),
    )}
  </group>
);

// ReadingLectern — podium kayu vertikal di pojok timur-utara antara
// rak NE dan dinding timur. Drought: buku tertutup berdebu. Restored:
// buku terbuka, kerasa "scholar moment frozen mid-reading."
const ReadingLectern = ({ restored }) => (
  <group position={[5.5, 0, 5]} rotation={[0, -0.4, 0]}>
    {/* Base wide untuk stability */}
    <mesh position={[0, 0.04, 0]}>
      <boxGeometry args={[0.5, 0.08, 0.5]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
    {/* Vertical post */}
    <mesh position={[0, 0.7, 0]}>
      <boxGeometry args={[0.1, 1.3, 0.1]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
    {/* Angled top — book holder */}
    <mesh position={[0, 1.36, 0]} rotation={[-0.3, 0, 0]}>
      <boxGeometry args={[0.45, 0.04, 0.5]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
    {/* Book di atas — restored: terbuka, drought: tertutup */}
    {restored ? (
      <group position={[0, 1.43, 0.05]} rotation={[-0.3, 0, 0]}>
        <mesh position={[-0.1, 0, 0]} rotation={[-Math.PI / 2, 0, 0.03]}>
          <planeGeometry args={[0.18, 0.32]} />
          <meshStandardMaterial color="#f6e8c8" side={THREE.DoubleSide} roughness={0.95} />
        </mesh>
        <mesh position={[0.1, 0, 0]} rotation={[-Math.PI / 2, 0, -0.03]}>
          <planeGeometry args={[0.18, 0.32]} />
          <meshStandardMaterial color="#f6e8c8" side={THREE.DoubleSide} roughness={0.95} />
        </mesh>
        {/* Spine ridge */}
        <mesh position={[0, -0.005, 0]}>
          <boxGeometry args={[0.02, 0.012, 0.32]} />
          <meshStandardMaterial color="#5a3025" roughness={0.8} />
        </mesh>
      </group>
    ) : (
      <mesh position={[0, 1.43, 0]} rotation={[-0.3, 0, 0.05]}>
        <boxGeometry args={[0.3, 0.04, 0.4]} />
        <meshStandardMaterial color="#5a3025" roughness={0.95} />
      </mesh>
    )}
  </group>
);

// LibraryLadder — tangga kayu klasik. Drought: tergeletak roboh di
// lantai dekat rak W tumbang. Restored: berdiri bersandar ke rak NW
// (kerasa "scholar pakai untuk capai shelf atas").
const LibraryLadder = ({ restored }) => {
  const rungs = [0.3, 0.7, 1.1, 1.5, 1.85];
  if (restored) {
    return (
      <group position={[-3, 0, 7.4]} rotation={[0, 0.4, -0.18]}>
        {/* 2 vertical rails */}
        <mesh position={[-0.18, 1, 0]}>
          <boxGeometry args={[0.06, 2, 0.06]} />
          <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
        </mesh>
        <mesh position={[0.18, 1, 0]}>
          <boxGeometry args={[0.06, 2, 0.06]} />
          <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
        </mesh>
        {rungs.map((y, i) => (
          <mesh key={`rng-${i}`} position={[0, y, 0]}>
            <boxGeometry args={[0.36, 0.04, 0.04]} />
            <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }
  // Drought: tergeletak roboh di lantai
  return (
    <group position={[-4, 0, 4]} rotation={[Math.PI / 2 - 0.1, 0.5, 0.2]}>
      <mesh position={[-0.18, 1, 0]}>
        <boxGeometry args={[0.06, 2, 0.06]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.95} />
      </mesh>
      <mesh position={[0.18, 1, 0]}>
        <boxGeometry args={[0.06, 2, 0.06]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.95} />
      </mesh>
      {rungs.map((y, i) => (
        <mesh key={`rng-${i}`} position={[0, y, 0]}>
          <boxGeometry args={[0.36, 0.04, 0.04]} />
          <meshStandardMaterial color={COLORS.shelfWood} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// ScrollHolder — wooden bucket berisi gulungan kertas/papyrus, dekat
// reading table sisi timur. Drought: 2 scroll fallen di luar bucket
// (kerasa "ada yang nge-rummage"). Restored: semua rapi di dalam.
const ScrollHolder = ({ restored }) => (
  <group position={[1.7, 0, -0.7]}>
    {/* Wooden bucket */}
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.18, 0.16, 0.4, 14]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Wooden rim ring */}
    <mesh position={[0, 0.41, 0]}>
      <cylinderGeometry args={[0.19, 0.19, 0.03, 14]} />
      <meshStandardMaterial color="#3a2418" roughness={0.85} />
    </mesh>
    {/* Scrolls poking up — 4 vertical cylinders dengan height variation */}
    {[
      { x: -0.08, z: 0.04, h: 0.55, c: '#e8d4a8', tilt: 0.1 },
      { x: 0.05, z: -0.06, h: 0.6, c: '#d4b890', tilt: -0.08 },
      { x: 0.08, z: 0.08, h: 0.5, c: '#c8a874', tilt: 0.12 },
      { x: -0.05, z: -0.08, h: 0.45, c: '#e8d4a8', tilt: -0.1 },
    ].map((s, i) => (
      <mesh
        key={`scr-${i}`}
        position={[s.x, 0.2 + s.h / 2, s.z]}
        rotation={[s.tilt * 0.5, 0, s.tilt]}
      >
        <cylinderGeometry args={[0.028, 0.028, s.h, 8]} />
        <meshStandardMaterial color={s.c} roughness={0.95} />
      </mesh>
    ))}
    {/* Drought: 2 scrolls fallen on floor sekitar bucket */}
    {!restored && (
      <>
        <mesh position={[0.42, 0.03, 0.18]} rotation={[0, 0.5, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#c8a874" roughness={0.95} />
        </mesh>
        <mesh position={[-0.28, 0.03, -0.3]} rotation={[0, -0.3, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
          <meshStandardMaterial color="#d4b890" roughness={0.95} />
        </mesh>
      </>
    )}
  </group>
);

// VaseDecoration — vas keramik antik dengan ranting kering (drought)
// atau bunga aprikot mekar (restored). Tie-in ke Armeniaca etymology:
// "setelah musim dingin, yang mekar." Posisi antara meja & rak W.
const VaseDecoration = ({ restored }) => (
  <group position={[-2, 0, -2.5]}>
    {/* Vase body — wider middle, narrower top */}
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[0.08, 0.12, 0.3, 16]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.7} />
    </mesh>
    {/* Vase neck */}
    <mesh position={[0, 0.32, 0]}>
      <cylinderGeometry args={[0.07, 0.08, 0.04, 16]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.7} />
    </mesh>
    {/* Branches/twigs poking out — 4 cabang dengan rotation varied */}
    {[
      { rot: [0.4, 0, 0.2], length: 0.5 },
      { rot: [-0.3, 0, -0.4], length: 0.45 },
      { rot: [0.1, 0.5, 0.5], length: 0.55 },
      { rot: [-0.2, -0.5, -0.3], length: 0.4 },
    ].map((b, i) => (
      <group key={`br-${i}`} position={[0, 0.36, 0]} rotation={b.rot}>
        <mesh position={[0, b.length / 2, 0]}>
          <cylinderGeometry args={[0.012, 0.018, b.length, 6]} />
          <meshStandardMaterial color="#4a3020" roughness={0.95} />
        </mesh>
        {/* Restored: small pink apricot blooms di tip & dekat tip */}
        {restored && (
          <>
            <mesh position={[0, b.length - 0.05, 0]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial
                color="#f4c8d8"
                emissive="#e09bb0"
                emissiveIntensity={0.15}
                roughness={0.7}
              />
            </mesh>
            <mesh position={[0.04, b.length - 0.13, 0.02]}>
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshStandardMaterial
                color="#f4c8d8"
                emissive="#e09bb0"
                emissiveIntensity={0.15}
                roughness={0.7}
              />
            </mesh>
          </>
        )}
      </group>
    ))}
  </group>
);

// TeaSteam — 4 small sphere rising & fading dari cup top. Restored only.
// Single useFrame walking children for performance.
const TeaSteam = () => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((p, i) => {
      const phase = i * 0.7;
      const cycle = (((t * 0.4 + phase) % 1) + 1) % 1;
      p.position.y = cycle * 0.22;
      p.position.x = Math.sin(t * 0.8 + phase) * 0.015;
      if (p.material) p.material.opacity = (1 - cycle) * 0.32;
    });
  });
  return (
    <group ref={groupRef} position={[0, 0.08, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`ts-${i}`}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial
            color="#f4e8d4"
            transparent
            opacity={0.25}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// Butterfly — kupu-kupu kecil fluttering dekat vase saat restored.
// Tie-in ke Armeniaca etymology motif: "kupu-kupu = Eli akan terbang
// jauh seperti kupu-kupu." Dua wing planes yang flap via rotation
// useFrame, plus subtle orbit-like drift.
const Butterfly = () => {
  const groupRef = useRef();
  const wingLRef = useRef();
  const wingRRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      // Orbit drift di sekitar position [-2, 1.0, -2.5] (atas vase)
      groupRef.current.position.x = Math.cos(t * 0.6) * 0.35;
      groupRef.current.position.y = 0.45 + Math.sin(t * 0.9) * 0.12;
      groupRef.current.position.z = Math.sin(t * 0.5) * 0.3;
      // Face direction
      groupRef.current.rotation.y = t * 0.6 + Math.PI / 2;
    }
    // Wing flap — fast frequency, opposing rotation
    const flap = Math.sin(t * 18) * 0.7;
    if (wingLRef.current) wingLRef.current.rotation.y = flap;
    if (wingRRef.current) wingRRef.current.rotation.y = -flap;
  });
  return (
    <group position={[-2, 0.45, -2.5]}>
      <group ref={groupRef}>
        {/* Body */}
        <mesh>
          <boxGeometry args={[0.015, 0.015, 0.05]} />
          <meshStandardMaterial color="#3a2418" roughness={0.85} />
        </mesh>
        {/* Left wing */}
        <mesh ref={wingLRef} position={[-0.025, 0, 0]}>
          <planeGeometry args={[0.05, 0.04]} />
          <meshStandardMaterial
            color="#f4c8d8"
            emissive="#e09bb0"
            emissiveIntensity={0.1}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Right wing */}
        <mesh ref={wingRRef} position={[0.025, 0, 0]}>
          <planeGeometry args={[0.05, 0.04]} />
          <meshStandardMaterial
            color="#f4c8d8"
            emissive="#e09bb0"
            emissiveIntensity={0.1}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};

// ForgottenTeacup — cangkir keramik kecil + tatakan di tepi meja baca,
// sisi berlawanan dari lentera. Hint "ada yang ngebaca di sini, lalu
// pergi." Drought: residu tinta-coklat tea kering. Restored: tea hangat
// + steam rising.
const ForgottenTeacup = ({ restored }) => (
  <group position={[0.85, 0.78, -0.4]}>
    {/* Saucer */}
    <mesh position={[0, 0.005, 0]}>
      <cylinderGeometry args={[0.08, 0.075, 0.01, 16]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.75} />
    </mesh>
    {/* Cup body */}
    <mesh position={[0, 0.045, 0]}>
      <cylinderGeometry args={[0.045, 0.038, 0.06, 16]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.6} />
    </mesh>
    {/* Cup rim — slight lip */}
    <mesh position={[0, 0.078, 0]}>
      <cylinderGeometry args={[0.046, 0.045, 0.005, 16]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.6} />
    </mesh>
    {/* Handle (simplified torus) */}
    <mesh position={[0.052, 0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.022, 0.008, 6, 12]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.6} />
    </mesh>
    {/* Tea inside */}
    <mesh position={[0, 0.071, 0]}>
      <cylinderGeometry args={[0.043, 0.043, 0.005, 12]} />
      <meshStandardMaterial
        color={restored ? '#7a4525' : '#3a2418'}
        roughness={restored ? 0.4 : 0.95}
      />
    </mesh>
    {/* Steam rising — restored only, hint tea masih hangat */}
    {restored && <TeaSteam />}
  </group>
);

// ================== Library landmarks (batch 2) =====================
// Set kedua 16 objek — bersama 5 di atas + 5 di scene asli, total 26
// interior detail. Posisi di-spread strategis biar gak overlap dengan
// rak/meja/lectern existing.

// 3. Globe — bola dunia di stand kayu, posisi southwest area
const Globe = ({ restored }) => (
  <group position={[-5.5, 0, -3]}>
    <mesh position={[0, 0.05, 0]}>
      <cylinderGeometry args={[0.18, 0.22, 0.1, 12]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[0.05, 0.6, 0.05]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.85, 0]} rotation={[0.4, 0.3, 0]}>
      <sphereGeometry args={[0.22, 16, 12]} />
      <meshStandardMaterial color={restored ? '#5a7888' : '#3a4858'} roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.85, 0]} rotation={[0, 0, 0.3]}>
      <torusGeometry args={[0.24, 0.012, 6, 24]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
  </group>
);

// 4. CardCatalog — cabinet 12 drawer untuk index buku, southwest
const CardCatalog = ({ restored = false }) => {
  // Drawers to pull out in restored state — 2 drawers slightly open,
  // 1 more pulled further. Cards visible inside via stack of thin
  // beige planes.
  const openDrawerMap = restored
    ? { 4: 0.14, 7: 0.08, 10: 0.22 } // drawer index → pullOut distance
    : {};
  return (
    <group position={[-5.5, 0, -6]} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.1, 1.2, 0.6]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
      </mesh>
      {/* Interior darkness behind drawers — biar kalo ada drawer
          pulled out, di dalemnya keliatan dark hollow bukan flat
          face. Restored only. */}
      {restored && (
        <mesh position={[0, 0.6, 0.05]}>
          <boxGeometry args={[1.0, 1.1, 0.5]} />
          <meshStandardMaterial color="#1a0e08" roughness={0.95} />
        </mesh>
      )}
      {Array.from({ length: 12 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = -0.36 + col * 0.36;
        const y = 0.15 + row * 0.3;
        const pullOut = openDrawerMap[i] ?? 0;
        return (
          <group key={`dr-${i}`} position={[x, y, 0.32 + pullOut]}>
            <mesh>
              <boxGeometry args={[0.32, 0.26, 0.04]} />
              <meshStandardMaterial color="#3a2418" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <boxGeometry args={[0.06, 0.02, 0.01]} />
              <meshStandardMaterial color="#a87850" metalness={0.4} roughness={0.6} />
            </mesh>
            {/* Label slot — small beige rectangle near top of drawer face */}
            {restored && (
              <mesh position={[0, 0.08, 0.025]}>
                <boxGeometry args={[0.16, 0.05, 0.005]} />
                <meshStandardMaterial color="#e8d8b0" roughness={0.9} />
              </mesh>
            )}
            {/* Drawer interior + index cards — visible only when
                drawer is pulled out enough (pullOut > 0). */}
            {pullOut > 0.05 && (
              <>
                {/* Drawer side walls (extending back into the body) */}
                <mesh position={[-0.15, 0, -pullOut / 2]}>
                  <boxGeometry args={[0.02, 0.24, pullOut]} />
                  <meshStandardMaterial color="#2a1810" roughness={0.95} />
                </mesh>
                <mesh position={[0.15, 0, -pullOut / 2]}>
                  <boxGeometry args={[0.02, 0.24, pullOut]} />
                  <meshStandardMaterial color="#2a1810" roughness={0.95} />
                </mesh>
                <mesh position={[0, -0.12, -pullOut / 2]}>
                  <boxGeometry args={[0.32, 0.02, pullOut]} />
                  <meshStandardMaterial color="#2a1810" roughness={0.95} />
                </mesh>
                {/* Index cards stacked inside — packed thin planes
                    angled slightly so they look like a stack of
                    cards. */}
                {Array.from({ length: Math.floor(pullOut * 40) }).map(
                  (_, ci) => {
                    const seed = hashSeed(`card-${i}-${ci}`);
                    return (
                      <mesh
                        key={`card-${i}-${ci}`}
                        position={[
                          0,
                          -0.04 + ci * 0.005,
                          -pullOut / 2 + (seed - 0.5) * 0.01,
                        ]}
                        rotation={[
                          -0.04 + seed * 0.06,
                          (seed - 0.5) * 0.04,
                          0,
                        ]}
                      >
                        <boxGeometry args={[0.26, 0.005, pullOut * 0.75]} />
                        <meshStandardMaterial
                          color={ci % 7 === 0 ? '#d4b890' : '#e8d8b0'}
                          roughness={0.95}
                        />
                      </mesh>
                    );
                  },
                )}
                {/* Top card with subtle scribble — small dark strip
                    suggesting handwriting */}
                <mesh position={[0, 0.005, -pullOut / 2]}>
                  <boxGeometry args={[0.22, 0.002, pullOut * 0.6]} />
                  <meshStandardMaterial color="#f0e0c0" roughness={0.95} />
                </mesh>
                <mesh position={[-0.04, 0.008, -pullOut / 2]}>
                  <boxGeometry args={[0.12, 0.001, 0.008]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.95} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
      <mesh position={[0, 1.21, 0]}>
        <boxGeometry args={[1.15, 0.03, 0.65]} />
        <meshStandardMaterial color={COLORS.tableWood} roughness={0.8} />
      </mesh>
    </group>
  );
};

// FloorCushion — bantal lantai dekat wing chair, kerasa reading nook
// lengkap. Restored only.
const FloorCushion = () => (
  <group position={[5.6, 0, -3.7]} rotation={[0, 0.6, 0]}>
    {/* Main cushion */}
    <mesh position={[0, 0.08, 0]} rotation={[0, 0, 0.03]}>
      <boxGeometry args={[0.45, 0.16, 0.4]} />
      <meshStandardMaterial color="#7a3a3a" roughness={0.95} />
    </mesh>
    {/* Smaller pillow on top */}
    <mesh position={[0.05, 0.2, -0.05]} rotation={[0.08, 0.3, -0.05]}>
      <boxGeometry args={[0.28, 0.1, 0.24]} />
      <meshStandardMaterial color="#c8a060" roughness={0.95} />
    </mesh>
  </group>
);

// LetterStack — tumpukan 4 surat tipis di edge timur meja utama,
// kerasa "kiriman yang belum dibuka." Restored only.
const LetterStack = () => (
  <group position={[1.0, 0.78, -0.35]} rotation={[0, 0.4, 0]}>
    {[
      { c: '#f0e4cc', tilt: 0 },
      { c: '#e8d4a8', tilt: 0.04 },
      { c: '#f4ddc0', tilt: -0.06 },
      { c: '#dfc89c', tilt: 0.03 },
    ].map((l, i) => (
      <mesh
        key={`ls-${i}`}
        position={[0, 0.003 + i * 0.006, 0]}
        rotation={[0, l.tilt, 0]}
      >
        <boxGeometry args={[0.18, 0.005, 0.13]} />
        <meshStandardMaterial color={l.c} roughness={0.95} />
      </mesh>
    ))}
    {/* Wax seal merah burgundy di top letter */}
    <mesh position={[0.05, 0.03, 0.02]}>
      <cylinderGeometry args={[0.012, 0.012, 0.005, 8]} />
      <meshStandardMaterial
        color="#8B4040"
        emissive="#8B4040"
        emissiveIntensity={0.1}
        roughness={0.5}
      />
    </mesh>
  </group>
);

// FloorLamp — standing lamp di samping wing chair. Restored: nyala
// hangat. Drought: gelap (no light). Bikin pojok wing chair gak
// terlalu gelap, kerasa "ada reading nook proper."
const FloorLamp = ({ restored }) => (
  <group position={[5.7, 0, -4.3]}>
    {/* Base */}
    <mesh position={[0, 0.03, 0]}>
      <cylinderGeometry args={[0.18, 0.22, 0.06, 12]} />
      <meshStandardMaterial color="#3a2418" roughness={0.85} />
    </mesh>
    {/* Pole */}
    <mesh position={[0, 0.85, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 1.7, 8]} />
      <meshStandardMaterial color="#3a2418" roughness={0.7} metalness={0.2} />
    </mesh>
    {/* Lampshade — cone shape */}
    <mesh position={[0, 1.78, 0]}>
      <cylinderGeometry args={[0.18, 0.26, 0.2, 14, 1, true]} />
      <meshStandardMaterial
        color={restored ? '#d4b890' : '#5a4030'}
        roughness={0.85}
        side={THREE.DoubleSide}
        emissive={restored ? '#a87850' : '#000'}
        emissiveIntensity={restored ? 0.25 : 0}
      />
    </mesh>
    {/* Bulb inside shade — restored only */}
    {restored && (
      <>
        <mesh position={[0, 1.78, 0]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshBasicMaterial color="#f4d090" toneMapped={false} />
        </mesh>
        <pointLight
          position={[0, 1.78, 0]}
          color="#f4c080"
          intensity={0.6}
          distance={3.5}
          decay={2}
        />
      </>
    )}
  </group>
);

// ===== Library Feel Additions (restored only) =====

// 1. GreenBankerLamp — iconic library detail di main meja. Brass base
// + emerald glass shade + flame inside. Pasangan untuk lentera meja.
const GreenBankerLamp = () => {
  const flameRef = useRef();
  useFrame((state) => {
    if (!flameRef.current) return;
    const t = state.clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 14) * 0.06 + Math.sin(t * 5.7) * 0.08;
    flameRef.current.scale.set(flicker, flicker, flicker);
  });
  return (
    <group position={[0.85, 0.78, 0.3]}>
      {/* Brass base disc */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.025, 12]} />
        <meshStandardMaterial color="#a87850" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Brass stem */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.012, 0.015, 0.18, 8]} />
        <meshStandardMaterial color="#a87850" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Stem joint elbow */}
      <mesh position={[0, 0.19, 0.03]}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshStandardMaterial color="#a87850" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Emerald glass shade — angled forward */}
      <mesh position={[0, 0.21, 0.1]} rotation={[-Math.PI / 8, 0, 0]}>
        <boxGeometry args={[0.22, 0.06, 0.14]} />
        <meshStandardMaterial
          color="#2a5a3a"
          emissive="#3a7a4a"
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Flame/bulb sphere inside shade */}
      <mesh ref={flameRef} position={[0, 0.19, 0.12]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshBasicMaterial color="#f4e090" toneMapped={false} />
      </mesh>
      <pointLight
        position={[0, 0.19, 0.12]}
        color="#a8e0a0"
        intensity={0.7}
        distance={2.5}
        decay={2}
      />
      {/* Pull chain */}
      <mesh position={[0.06, 0.16, 0.1]}>
        <boxGeometry args={[0.003, 0.05, 0.003]} />
        <meshStandardMaterial color="#a87850" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
};

// 2. WheeledLadder — tangga geser klasik di sepanjang rel rak NE.
const WheeledLadder = () => (
  <group position={[3.5, 0, 7.5]} rotation={[0, 0, -0.05]}>
    {/* Rail di atas rak (horizontal) */}
    <mesh position={[0, 2.6, 0.6]} rotation={[0, 0, 0]}>
      <boxGeometry args={[3.5, 0.04, 0.05]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Ladder rails */}
    <mesh position={[-0.18, 1.05, 0]}>
      <boxGeometry args={[0.06, 2.1, 0.06]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    <mesh position={[0.18, 1.05, 0]}>
      <boxGeometry args={[0.06, 2.1, 0.06]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Rungs */}
    {[0.3, 0.7, 1.1, 1.5, 1.9].map((y, i) => (
      <mesh key={`wlr-${i}`} position={[0, y, 0]}>
        <boxGeometry args={[0.36, 0.04, 0.04]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
      </mesh>
    ))}
    {/* Top brackets connecting to rail */}
    <mesh position={[-0.18, 2.1, 0.3]}>
      <boxGeometry args={[0.04, 0.04, 0.6]} />
      <meshStandardMaterial color="#a87850" metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[0.18, 2.1, 0.3]}>
      <boxGeometry args={[0.04, 0.04, 0.6]} />
      <meshStandardMaterial color="#a87850" metalness={0.4} roughness={0.5} />
    </mesh>
    {/* Brass wheels on rail */}
    <mesh position={[-0.18, 2.6, 0.6]}>
      <cylinderGeometry args={[0.04, 0.04, 0.02, 10]} />
      <meshStandardMaterial color="#a87850" metalness={0.5} roughness={0.4} />
    </mesh>
    <mesh position={[0.18, 2.6, 0.6]}>
      <cylinderGeometry args={[0.04, 0.04, 0.02, 10]} />
      <meshStandardMaterial color="#a87850" metalness={0.5} roughness={0.4} />
    </mesh>
    {/* Floor wheels */}
    {[-0.18, 0.18].map((x, i) => (
      <mesh key={`fw-${i}`} position={[x, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
        <meshStandardMaterial color="#3a2418" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

// 3. ReadingDaybed — sofa rendah panjang di pojok NW dengan cushion + pillow.
const ReadingDaybed = () => (
  <group position={[-5.5, 0, 6.5]} rotation={[0, 0.4, 0]}>
    {/* Frame base */}
    <mesh position={[0, 0.1, 0]}>
      <boxGeometry args={[1.8, 0.2, 0.7]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Cushion top */}
    <mesh position={[0, 0.27, 0]}>
      <boxGeometry args={[1.75, 0.14, 0.65]} />
      <meshStandardMaterial color="#7a4848" roughness={0.95} />
    </mesh>
    {/* Backrest along one side */}
    <mesh position={[0, 0.55, -0.32]}>
      <boxGeometry args={[1.75, 0.4, 0.1]} />
      <meshStandardMaterial color="#5a3838" roughness={0.95} />
    </mesh>
    {/* End arm rest */}
    <mesh position={[-0.85, 0.5, 0]}>
      <boxGeometry args={[0.1, 0.55, 0.65]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    <mesh position={[0.85, 0.5, 0]}>
      <boxGeometry args={[0.1, 0.4, 0.65]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* 2 pillows */}
    <mesh position={[-0.55, 0.42, 0.1]} rotation={[0.1, 0.1, -0.05]}>
      <boxGeometry args={[0.4, 0.15, 0.35]} />
      <meshStandardMaterial color="#c8a060" roughness={0.95} />
    </mesh>
    <mesh position={[0.55, 0.42, 0.05]} rotation={[0.05, -0.15, 0.06]}>
      <boxGeometry args={[0.4, 0.15, 0.35]} />
      <meshStandardMaterial color="#a07868" roughness={0.95} />
    </mesh>
    {/* Throw blanket folded across one end */}
    <mesh position={[0.5, 0.36, -0.05]} rotation={[0, 0.2, 0.04]}>
      <boxGeometry args={[0.6, 0.05, 0.45]} />
      <meshStandardMaterial color="#5a4030" roughness={0.95} />
    </mesh>
    {/* Wooden legs */}
    {[[0.8, 0.3], [-0.8, 0.3], [0.8, -0.3], [-0.8, -0.3]].map(([x, z], i) => (
      <mesh key={`dbleg-${i}`} position={[x, 0.05, z]}>
        <boxGeometry args={[0.08, 0.1, 0.08]} />
        <meshStandardMaterial color={COLORS.chairWood} roughness={0.85} />
      </mesh>
    ))}
  </group>
);

// 4. LibraryStepsStool — 3-step bangku kayu kecil di samping rak NE.
const LibraryStepsStool = () => (
  <group position={[3, 0, 6.5]} rotation={[0, 0.3, 0]}>
    {/* Bottom step */}
    <mesh position={[0, 0.06, 0]}>
      <boxGeometry args={[0.5, 0.12, 0.4]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Middle step */}
    <mesh position={[0, 0.18, -0.08]}>
      <boxGeometry args={[0.5, 0.12, 0.24]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Top step */}
    <mesh position={[0, 0.3, -0.16]}>
      <boxGeometry args={[0.5, 0.12, 0.08]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
  </group>
);

// 5. TwoMoreFloorLamps — tambah 2 standing lamps di pojok lain.
const ExtraFloorLamp = ({ pos }) => {
  const lightRef = useRef();
  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime;
    lightRef.current.intensity = 0.5 + Math.sin(t * 4.3) * 0.06;
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.06, 12]} />
        <meshStandardMaterial color="#3a2418" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 1.7, 8]} />
        <meshStandardMaterial color="#3a2418" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.18, 14, 1, true]} />
        <meshStandardMaterial
          color="#d4b890"
          roughness={0.85}
          side={THREE.DoubleSide}
          emissive="#a87850"
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color="#f4d090" toneMapped={false} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 1.78, 0]}
        color="#f4c080"
        intensity={0.5}
        distance={3.2}
        decay={2}
      />
    </group>
  );
};

// 6. AntiqueTypewriter — di card catalog top (-5.5, 1.21, -6).
const AntiqueTypewriter = () => (
  <group position={[-5.5, 1.23, -6]} rotation={[0, 0.5, 0]}>
    {/* Main body */}
    <mesh position={[0, 0.1, 0]}>
      <boxGeometry args={[0.45, 0.2, 0.4]} />
      <meshStandardMaterial color="#1a0e08" metalness={0.4} roughness={0.5} />
    </mesh>
    {/* Carriage roller */}
    <mesh position={[0, 0.24, -0.08]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.04, 0.04, 0.4, 10]} />
      <meshStandardMaterial color="#3a2418" roughness={0.6} />
    </mesh>
    {/* Paper sticking up from roller */}
    <mesh position={[0.05, 0.4, -0.05]} rotation={[0, 0, -0.05]}>
      <planeGeometry args={[0.22, 0.32]} />
      <meshStandardMaterial
        color="#f6e8c8"
        roughness={0.95}
        side={THREE.DoubleSide}
      />
    </mesh>
    {/* Keys grid — 4 rows × 7 keys */}
    {Array.from({ length: 4 }).flatMap((_, row) =>
      Array.from({ length: 7 }).map((_, col) => (
        <mesh
          key={`tk-${row}-${col}`}
          position={[
            -0.18 + col * 0.06 + (row % 2) * 0.015,
            0.21,
            0.04 + row * 0.045,
          ]}
        >
          <cylinderGeometry args={[0.018, 0.018, 0.015, 8]} />
          <meshStandardMaterial color="#d4c4a0" roughness={0.5} />
        </mesh>
      )),
    )}
    {/* Side bell */}
    <mesh position={[0.2, 0.16, 0.05]}>
      <sphereGeometry args={[0.025, 8, 6]} />
      <meshStandardMaterial color="#a87850" metalness={0.6} roughness={0.4} />
    </mesh>
  </group>
);

// 7. TeaCart — cart beroda dengan 2 levels di antara meja & rak W.
const TeaCart = () => (
  <group position={[-3.5, 0, -1]} rotation={[0, -0.3, 0]}>
    {/* 4 wheels */}
    {[[0.3, 0.25], [-0.3, 0.25], [0.3, -0.25], [-0.3, -0.25]].map(
      ([x, z], i) => (
        <mesh
          key={`tcw-${i}`}
          position={[x, 0.05, z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.025, 10]} />
          <meshStandardMaterial color="#1a0e08" roughness={0.6} metalness={0.2} />
        </mesh>
      ),
    )}
    {/* Lower shelf */}
    <mesh position={[0, 0.2, 0]}>
      <boxGeometry args={[0.7, 0.04, 0.55]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Vertical posts */}
    {[[0.3, 0.22], [-0.3, 0.22], [0.3, -0.22], [-0.3, -0.22]].map(
      ([x, z], i) => (
        <mesh key={`tcp-${i}`} position={[x, 0.5, z]}>
          <cylinderGeometry args={[0.018, 0.018, 0.6, 8]} />
          <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
        </mesh>
      ),
    )}
    {/* Top shelf */}
    <mesh position={[0, 0.8, 0]}>
      <boxGeometry args={[0.7, 0.04, 0.55]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Handle */}
    <mesh position={[0, 0.95, 0.27]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Books on top shelf — warna warni vibrant */}
    {[
      { c: '#8a2030', dx: -0.2 }, // cranberry
      { c: '#3a6048', dx: -0.08 }, // forest green
      { c: '#c8a060', dx: 0.06 }, // ochre
      { c: '#3a4878', dx: 0.2 }, // navy
    ].map((b, i) => (
      <mesh key={`tcb-${i}`} position={[b.dx, 0.86, 0]}>
        <boxGeometry args={[0.08, 0.16, 0.2]} />
        <meshStandardMaterial color={b.c} roughness={0.9} />
      </mesh>
    ))}
    {/* Tea cup on top shelf */}
    <mesh position={[0.2, 0.83, 0.15]}>
      <cylinderGeometry args={[0.04, 0.035, 0.05, 12]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.6} />
    </mesh>
    {/* Books on lower shelf — warna warni */}
    {[
      { c: '#7a3858', dx: -0.15, dz: -0.1 }, // vintage rose
      { c: '#2a5a4a', dx: 0.1, dz: 0.05 }, // emerald
    ].map((b, i) => (
      <mesh key={`tcbl-${i}`} position={[b.dx, 0.26, b.dz]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.14]} />
        <meshStandardMaterial color={b.c} roughness={0.9} />
      </mesh>
    ))}
  </group>
);

// 8. StainedGlassWindow — colored glass panes di patched breach (-X wall).
const StainedGlassWindow = () => {
  const panes = [
    { color: '#7a3858', dx: 0, dy: 0.4 },
    { color: '#3a4878', dx: 0.18, dy: 0.4 },
    { color: '#4a7858', dx: -0.18, dy: 0.4 },
    { color: '#a85840', dx: 0, dy: 0.7 },
    { color: '#3a6878', dx: 0.18, dy: 0.7 },
    { color: '#7a5040', dx: -0.18, dy: 0.7 },
    { color: '#5a3858', dx: 0, dy: 0.1 },
    { color: '#a87858', dx: 0.18, dy: 0.1 },
    { color: '#3a5a48', dx: -0.18, dy: 0.1 },
  ];
  return (
    <group position={[-ROOM_W / 2 + 0.08, 2.5, 4.5]} rotation={[0, Math.PI / 2, 0]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[0.65, 1.0, 0.04]} />
        <meshStandardMaterial color="#3a2418" roughness={0.85} />
      </mesh>
      {/* Glass panes — emissive supaya kerasa cahaya tembus */}
      {panes.map((p, i) => (
        <mesh
          key={`sgp-${i}`}
          position={[p.dx, p.dy - 0.4, 0.025]}
        >
          <planeGeometry args={[0.16, 0.26]} />
          <meshStandardMaterial
            color={p.color}
            emissive={p.color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Lead frame divisions */}
      {[0.13, -0.13].map((dx, i) => (
        <mesh key={`sgld-${i}`} position={[dx, 0, 0.03]}>
          <boxGeometry args={[0.015, 0.9, 0.01]} />
          <meshStandardMaterial color="#1a0e08" roughness={0.95} />
        </mesh>
      ))}
      {[0.2, -0.2].map((dy, i) => (
        <mesh key={`sglh-${i}`} position={[0, dy, 0.03]}>
          <boxGeometry args={[0.55, 0.015, 0.01]} />
          <meshStandardMaterial color="#1a0e08" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// 5. WingChair — kursi reading nook di pojok southeast. Posisi lebih
// jauh ke pojok (x=6, z=-6.5) dan scale 0.78 supaya gak nge-blok view
// utama dari camera entry. Tone lebih warm (cream-peach mauve) bukan
// dark monolithic supaya kerasa cozy reading nook.
const WingChair = ({ restored }) => (
  <group position={[6, 0, -6.5]} rotation={[0, -0.7, 0]} scale={0.78}>
    <mesh position={[0, 0.45, 0]}>
      <boxGeometry args={[0.7, 0.15, 0.6]} />
      <meshStandardMaterial color="#9a6868" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.95, -0.28]}>
      <boxGeometry args={[0.7, 1.05, 0.1]} />
      <meshStandardMaterial color="#9a6868" roughness={0.95} />
    </mesh>
    <mesh position={[-0.36, 0.95, 0]}>
      <boxGeometry args={[0.1, 0.95, 0.5]} />
      <meshStandardMaterial color="#9a6868" roughness={0.95} />
    </mesh>
    <mesh position={[0.36, 0.95, 0]}>
      <boxGeometry args={[0.1, 0.95, 0.5]} />
      <meshStandardMaterial color="#9a6868" roughness={0.95} />
    </mesh>
    {[[0.28, 0.25], [-0.28, 0.25], [0.28, -0.25], [-0.28, -0.25]].map(([x, z], i) => (
      <mesh key={`wcleg-${i}`} position={[x, 0.18, z]}>
        <boxGeometry args={[0.06, 0.36, 0.06]} />
        <meshStandardMaterial color={COLORS.chairWood} roughness={0.85} />
      </mesh>
    ))}
    {/* Throw blanket draped across seat & arm */}
    <mesh position={[0.18, 0.55, 0.08]} rotation={[0, 0.4, 0.25]}>
      <boxGeometry args={[0.5, 0.06, 0.4]} />
      <meshStandardMaterial color={restored ? '#e4b890' : '#7a5840'} roughness={0.95} />
    </mesh>
  </group>
);

// 7. Hourglass — di top rak S. Restored: sand stream falling visualisasi.
const Hourglass = ({ restored }) => (
  <group position={[5, 2.6, -8.5]}>
    <mesh position={[0, 0.1, 0]}>
      <sphereGeometry args={[0.07, 12, 8]} />
      <meshStandardMaterial color={restored ? '#f4e4c8' : '#3a2418'} transparent opacity={0.4} roughness={0.3} />
    </mesh>
    <mesh position={[0, -0.1, 0]}>
      <sphereGeometry args={[0.07, 12, 8]} />
      <meshStandardMaterial color={restored ? '#f4e4c8' : '#3a2418'} transparent opacity={0.4} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.18, 0]}>
      <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
    <mesh position={[0, -0.18, 0]}>
      <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
    </mesh>
    <mesh position={[0, -0.13, 0]}>
      <sphereGeometry args={[0.05, 8, 6]} />
      <meshStandardMaterial color="#d4a060" roughness={0.95} />
    </mesh>
    {/* Restored: subtle sand stream falling antara dua bulb */}
    {restored && <HourglassSandStream />}
  </group>
);

// HourglassSandStream — thin column of sand falling antara top & bottom
// bulb. Animation: subtle vertical drift (sand particles "ngalir"),
// reset cycle ~0.6s.
const HourglassSandStream = () => {
  const streamRef = useRef();
  useFrame((state) => {
    if (!streamRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle scale-y oscillation kerasa "sand jatuh"
    const flow = 0.95 + Math.sin(t * 12) * 0.05;
    streamRef.current.scale.y = flow;
  });
  return (
    <mesh ref={streamRef} position={[0, -0.02, 0]}>
      <cylinderGeometry args={[0.004, 0.006, 0.12, 6]} />
      <meshStandardMaterial color="#d4a060" emissive="#a87850" emissiveIntensity={0.1} roughness={0.95} />
    </mesh>
  );
};

// 8. QuillInkwell — di meja baca, sisi back-right
const QuillInkwell = ({ restored }) => (
  <group position={[0.6, 0.78, 0.32]}>
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.04, 0.045, 0.06, 12]} />
      <meshStandardMaterial color="#3a2418" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.075, 0]}>
      <cylinderGeometry args={[0.038, 0.038, 0.005, 12]} />
      <meshStandardMaterial
        color={restored ? '#1a0808' : '#2a1808'}
        roughness={restored ? 0.3 : 0.95}
        metalness={restored ? 0.2 : 0}
      />
    </mesh>
    <mesh position={[0.04, 0.18, 0]} rotation={[0, 0, -0.4]}>
      <cylinderGeometry args={[0.005, 0.003, 0.3, 6]} />
      <meshStandardMaterial color="#d4b890" roughness={0.95} />
    </mesh>
    <mesh position={[0.1, 0.27, 0]} rotation={[0, 0, -0.4]}>
      <planeGeometry args={[0.06, 0.14]} />
      <meshStandardMaterial color="#d4b890" roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// 9. MagnifyingGlass — di atas open book di meja
const MagnifyingGlass = () => (
  <group position={[0.18, 0.84, 0.18]} rotation={[Math.PI / 3, 0, 0.4]}>
    <mesh>
      <torusGeometry args={[0.06, 0.008, 8, 16]} />
      <meshStandardMaterial color="#a87850" metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh>
      <circleGeometry args={[0.058, 16]} />
      <meshBasicMaterial color="#a8c0d4" transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -0.11, 0]}>
      <cylinderGeometry args={[0.008, 0.008, 0.14, 8]} />
      <meshStandardMaterial color={COLORS.tableWood} roughness={0.7} />
    </mesh>
  </group>
);

// 10. WallMap — peta kuno di dinding timur
const WallMap = ({ restored }) => (
  <group position={[ROOM_W / 2 - 0.12, 3.2, -4]} rotation={[0, -Math.PI / 2, 0]}>
    <mesh>
      <boxGeometry args={[1.6, 1.2, 0.04]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0, 0.025]}>
      <planeGeometry args={[1.4, 1.0]} />
      <meshStandardMaterial color={restored ? '#d4b890' : '#7a5840'} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
    {!restored && (
      <mesh position={[0.55, 0.4, 0.026]} rotation={[0, 0, 0.5]}>
        <planeGeometry args={[0.4, 0.3]} />
        <meshStandardMaterial color="#3a2418" roughness={1} side={THREE.DoubleSide} />
      </mesh>
    )}
  </group>
);

// 12. ReadingGlasses — di meja baca, left-front
const ReadingGlasses = () => (
  <group position={[-0.35, 0.785, -0.32]} rotation={[0, 0.3, 0]}>
    <mesh position={[-0.045, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.025, 0.005, 6, 12]} />
      <meshStandardMaterial color="#3a2418" roughness={0.5} />
    </mesh>
    <mesh position={[0.045, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.025, 0.005, 6, 12]} />
      <meshStandardMaterial color="#3a2418" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[0.04, 0.005, 0.005]} />
      <meshStandardMaterial color="#3a2418" roughness={0.5} />
    </mesh>
  </group>
);

// 13. OpenNotebook — buku jurnal di meja, left-back
const OpenNotebook = () => (
  <group position={[-0.5, 0.78, 0.28]} rotation={[0, 0.4, 0]}>
    <mesh position={[-0.08, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0.02]}>
      <planeGeometry args={[0.14, 0.2]} />
      <meshStandardMaterial color="#f6e8c8" side={THREE.DoubleSide} roughness={0.95} />
    </mesh>
    <mesh position={[0.08, 0.005, 0]} rotation={[-Math.PI / 2, 0, -0.02]}>
      <planeGeometry args={[0.14, 0.2]} />
      <meshStandardMaterial color="#f6e8c8" side={THREE.DoubleSide} roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.008, 0]}>
      <boxGeometry args={[0.015, 0.01, 0.2]} />
      <meshStandardMaterial color="#7a3030" roughness={0.7} />
    </mesh>
    {/* Handwritten lines hint */}
    {[-0.08, 0.08].map((px, j) =>
      [0, 1, 2].map((row) => (
        <mesh
          key={`nl-${j}-${row}`}
          position={[px, 0.011, -0.07 + row * 0.04]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.1, 0.004]} />
          <meshBasicMaterial color="#3a2418" transparent opacity={0.45} />
        </mesh>
      )),
    )}
  </group>
);

// 14. WaxCandle — di tepi meja baca, right-front
const WaxCandle = ({ restored }) => (
  <group position={[0.65, 0.78, -0.15]}>
    <mesh position={[0, 0.01, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.02, 12]} />
      <meshStandardMaterial color="#a87850" metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.025, 0]}>
      <cylinderGeometry args={[0.05, 0.06, 0.015, 12]} />
      <meshStandardMaterial color="#d4b890" roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.08, 0]}>
      <cylinderGeometry args={[0.022, 0.024, 0.12, 12]} />
      <meshStandardMaterial color="#e8d4a8" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.143, 0]}>
      <cylinderGeometry args={[0.002, 0.002, 0.015, 6]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>
    {restored && <CandleFlame />}
  </group>
);

// LenternaFlame — visible flame inside lentera meja shade dengan
// flicker animation + flickering point light + rising spark motes.
// Always-on (selalu nyala, drought maupun restored — ini lentera utama
// meja baca).
const LenternaFlame = () => {
  const flameRef = useRef();
  const lightRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker =
      1 + Math.sin(t * 16) * 0.07 + Math.sin(t * 6.7 + 0.8) * 0.09;
    if (flameRef.current) {
      flameRef.current.scale.set(flicker, flicker * 1.1, flicker);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 0.9 + Math.sin(t * 11) * 0.12;
    }
  });
  return (
    <>
      <mesh ref={flameRef} position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <meshBasicMaterial color="#f4a060" toneMapped={false} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.18, 0]}
        color="#f4a060"
        intensity={0.9}
        distance={4.5}
        decay={2}
      />
      <LenternaSparks />
    </>
  );
};

// LenternaSparks — 5 micro motes rising dari flame, fade per cycle.
// Tiap mote independent phase, recycle saat sampai atas. Halus, lebih
// kerasa "flame breathing" daripada literal sparks.
const LenternaSparks = () => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((p, i) => {
      const phase = i * 0.42;
      const cycle = (((t * 0.7 + phase) % 1) + 1) % 1;
      p.position.y = 0.22 + cycle * 0.35;
      p.position.x = Math.sin(t * 1.8 + phase) * 0.025;
      p.position.z = Math.cos(t * 1.4 + phase * 0.7) * 0.025;
      if (p.material) p.material.opacity = (1 - cycle) * 0.5;
    });
  });
  return (
    <group ref={groupRef}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={`spark-${i}`}>
          <sphereGeometry args={[0.007, 6, 4]} />
          <meshBasicMaterial
            color="#f4c890"
            transparent
            opacity={0.4}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// DoorFrame — kayu trim di sekitar opening pintu south + door panel
// terbuka miring + welcome mat di lantai. Sekarang area entrance gak
// bare (cuma wall opening), kerasa "ada pintu masuk beneran."
const DoorFrame = ({ restored }) => (
  <group>
    {/* Frame trim atas (di bawah transom) */}
    <mesh position={[0, 4.5, -ROOM_D / 2 + 0.15]}>
      <boxGeometry args={[3.4, 0.18, 0.18]} />
      <meshStandardMaterial color="#3a2418" roughness={0.85} />
    </mesh>
    {/* Frame trim kiri */}
    <mesh position={[-1.6, 2.3, -ROOM_D / 2 + 0.15]}>
      <boxGeometry args={[0.18, 4.6, 0.18]} />
      <meshStandardMaterial color="#3a2418" roughness={0.85} />
    </mesh>
    {/* Frame trim kanan */}
    <mesh position={[1.6, 2.3, -ROOM_D / 2 + 0.15]}>
      <boxGeometry args={[0.18, 4.6, 0.18]} />
      <meshStandardMaterial color="#3a2418" roughness={0.85} />
    </mesh>
    {/* Door panel kayu — half-open swing inward kiri.
        Hinge di kiri (x=-1.5), swing 25° ke dalam (-z). */}
    <group
      position={[-1.5, 2.2, -ROOM_D / 2 + 0.2]}
      rotation={[0, restored ? Math.PI / 6 : Math.PI / 4, 0]}
    >
      <mesh position={[1.4, 0, 0]}>
        <boxGeometry args={[2.8, 4.3, 0.08]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.9} />
      </mesh>
      {/* Door panel vertical seams (3 panels) */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`dp-${i}`}
          position={[0.55 + i * 0.85, 0, 0.045]}
        >
          <boxGeometry args={[0.04, 4.0, 0.02]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
      ))}
      {/* Door handle */}
      <mesh position={[2.6, -0.3, 0.06]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color="#a87850" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
    {/* Welcome mat — flat rectangle di lantai inside door */}
    <mesh
      position={[0, 0.008, -ROOM_D / 2 + 1.2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[2.4, 1.4]} />
      <meshStandardMaterial
        color={restored ? '#5a4030' : '#3a2820'}
        roughness={0.98}
      />
    </mesh>
    {/* Mat fringe edge — slightly darker border */}
    <mesh
      position={[0, 0.009, -ROOM_D / 2 + 1.2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[1.3, 1.36, 4, 1, 0, Math.PI * 2]} />
      <meshStandardMaterial color="#2a1812" roughness={1} />
    </mesh>
  </group>
);

// FloorShadows — fake ambient occlusion via dark soft circle plane di
// lantai bawah objek yang punya weight (table, chair, wing-chair,
// catalog, lectern, globe, dst). Karena shadows={false} di Canvas
// (perf budget), AO real gak ada. Disc subtle ini grounding visual:
// objek kerasa "duduk di lantai," bukan mengambang.
const FloorShadows = ({ isMobile = false }) => {
  // [x, z, radius] — match posisi objek di scene
  const allShadows = [
    [0, 0, 1.45],          // reading table
    [0, -1.6, 0.4],         // reading chair
    [5, -5, 0.55],          // wing chair (with skirt area)
    [-5.5, -3, 0.28],       // globe stand
    [-5.5, -6, 0.7],        // card catalog
    [-2, -2.5, 0.22],       // vase
    [5.5, 5, 0.36],         // reading lectern
    [1.7, -0.7, 0.25],      // scroll holder
    [3.5, 4, 0.22],         // plant pot
    [5, -8.5, 0.4],         // rak S
    [-4.5, 8.5, 0.9],       // rak NW (big)
    [4.5, 8.5, 0.9],        // rak NE (big)
    [-6.5, 2, 0.85],        // rak W (tumbang area)
    [6.5, -2, 0.85],        // rak E
  ];
  // Mobile: skip small object shadows (vase, globe, plant), keep
  // major ones (rak + table + chair + card catalog + wing chair)
  const shadows = isMobile
    ? allShadows.filter((s) => s[2] >= 0.4)
    : allShadows;
  return (
    <group>
      {shadows.map(([x, z, r], i) => (
        <mesh
          key={`fs-${i}`}
          position={[x, 0.004, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[r, 18]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.28}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// BookPedestalsNearMeja — interactive books di-host di pedestal kayu
// melingkar di sekitar meja baca (radius ~2.2). Setiap pedestal punya
// buku di atas + indicator orb glow. Layout angle per book via
// PEDESTAL_ANGLES di arsipBooks.js.
//
// Sebelumnya interactive books di-host di rak2 jauh (8.5 unit dari
// meja) — user sulit nemu indicator-nya karena kecil + scene cluttered.
// Pedestal di sekitar meja bikin semua hint visible dari pose camera
// awal. Far racks tetap render dengan deco books (visual library).
const BookPedestalsNearMeja = ({
  books,
  restored,
  hoveredId,
  readIds,
  onHover,
  onOut,
  onClick,
}) => {
  const indicatorRefs = useRef([]);
  useFrame((state) => {
    if (!indicatorRefs.current.length) return;
    const t = state.clock.elapsedTime;
    indicatorRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const phase = idx * 0.65;
      ref.opacity = 0.75 + Math.sin(t * 1.3 + phase) * 0.2;
    });
  });

  // Halaman Pembuka gak di-host di pedestal — dia di meja sebagai
  // focal open book (meta-intro tentang ruangan ini).
  const visibleBooks = books.filter((b) => b.id !== 'halaman-pembuka');

  return (
    <group>
      {/* Decoratif books — drought only, no click handler, no indicator.
          Model visual aja biar lantai gak terlalu kosong setelah cleanup
          21 → 13 interactive books. */}
      {!restored &&
        DECORATIVE_BOOKS.map((book) => {
          const rad = (book.angle * Math.PI) / 180;
          const r = 3.0;
          const x = Math.cos(rad) * r;
          const z = Math.sin(rad) * r;
          const seed = hashSeed(`deco-${book.id}`);
          const seedZ = hashSeed(`deco-z-${book.id}`);
          const seedRot = hashSeed(`deco-rot-${book.id}`);
          // Slight jitter biar gak perfectly aligned dengan ring radius 3.0
          const jx = (seed - 0.5) * 0.4;
          const jz = (seedZ - 0.5) * 0.4;
          const tilt = (seedRot - 0.5) * 0.3;
          const flat = seed > 0.4;
          return flat ? (
            <mesh
              key={book.id}
              position={[x + jx, 0.04, z + jz]}
              rotation={[0, seedRot * Math.PI * 2, tilt]}
            >
              <boxGeometry args={[0.26, 0.06, 0.2]} />
              <meshStandardMaterial color={book.spineColor} roughness={0.9} />
            </mesh>
          ) : (
            <mesh
              key={book.id}
              position={[x + jx, 0.12, z + jz]}
              rotation={[tilt * 0.5, seedRot * Math.PI * 2, tilt * 1.5]}
            >
              <boxGeometry args={[0.1, 0.24, 0.16]} />
              <meshStandardMaterial color={book.spineColor} roughness={0.9} />
            </mesh>
          );
        })}
      {visibleBooks.map((book, i) => {
        const angle = PEDESTAL_ANGLES[book.id];
        if (angle == null) return null;
        const rad = (angle * Math.PI) / 180;
        // Radius push 2.4 → 3.0 supaya floor books drought gak overlap
        // visual dengan meja utama (edge max x=1.2). Restored pakai
        // radius sama supaya layout consistent — pedestals juga jauh
        // dari meja.
        const r = 3.0;
        const x = Math.cos(rad) * r;
        const z = Math.sin(rad) * r;
        const hovered = hoveredId === book.id;
        const read = readIds.has(book.id);
        // Drought-specific jitter: posisi book + rotation random per id
        // biar kerasa "tersebar" alih-alih melingkar perfect. Deterministic
        // via hashSeed.
        const seedX = (hashSeed(`bp-x-${book.id}`) - 0.5) * 0.6;
        const seedZ = (hashSeed(`bp-z-${book.id}`) - 0.5) * 0.6;
        const seedRotY = (hashSeed(`bp-ry-${book.id}`) - 0.5) * 1.0;
        const seedTilt = (hashSeed(`bp-t-${book.id}`) - 0.5) * 0.3;

        // Position offset utk drought (books di lantai scattered) vs
        // restored (di pedestal yang tinggi)
        const bookY = restored ? 0.66 : 0.04;
        const indicatorY = restored ? 0.85 : 0.18;
        const labelY = restored ? 1.1 : 0.5;

        return (
          <group
            key={book.id}
            position={[
              x + (restored ? 0 : seedX),
              0,
              z + (restored ? 0 : seedZ),
            ]}
            rotation={[
              0,
              -rad + Math.PI / 2 + (restored ? 0 : seedRotY),
              0,
            ]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(book.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              onOut?.(book.id);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(book);
            }}
          >
            {/* Invisible hitbox — book mesh sangat kecil (0.26 wide
                × 0.06 tall), sulit di-click langsung terutama drought
                state (di lantai). Cylinder hitbox lebih lebar bikin
                click area generous. opacity 0 + transparent biar
                invisible tapi tetep nge-catch pointer events. */}
            <mesh position={[0, restored ? 0.5 : 0.18, 0]}>
              <cylinderGeometry
                args={[0.3, 0.3, restored ? 1.0 : 0.4, 8]}
              />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Pedestal — restored only. Drought: pedestal udah roboh,
                buku jatuh ke lantai. Kasih sisa pedestal kecil pecah
                buat narrative "dulu ada pedestal di sini." */}
            {restored ? (
              <>
                {/* Pedestal post — wooden stand */}
                <mesh position={[0, 0.3, 0]}>
                  <cylinderGeometry args={[0.13, 0.16, 0.6, 10]} />
                  <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
                </mesh>
                {/* Pedestal top platform */}
                <mesh position={[0, 0.62, 0]}>
                  <cylinderGeometry args={[0.18, 0.18, 0.04, 10]} />
                  <meshStandardMaterial color={COLORS.tableWood} roughness={0.8} />
                </mesh>
              </>
            ) : (
              // Drought: 1 pecahan kayu pedestal di lantai dekat buku
              // — sisa visual dari pedestal yang udah roboh.
              <mesh
                position={[0.15, 0.04, -0.1]}
                rotation={[0, seedRotY * 0.5, seedTilt * 2]}
              >
                <boxGeometry args={[0.16, 0.05, 0.16]} />
                <meshStandardMaterial color={COLORS.tableWood} roughness={0.95} />
              </mesh>
            )}
            {/* Book — drought: tilted on floor. Restored: flat on
                pedestal top. */}
            <mesh
              position={[0, bookY + (hovered ? 0.03 : 0), 0]}
              rotation={
                restored
                  ? [0, 0, 0]
                  : [seedTilt * 0.5, 0, seedTilt * 1.2]
              }
            >
              <boxGeometry args={[0.26, 0.06, 0.2]} />
              <meshStandardMaterial
                color={book.spineColor}
                emissive={hovered ? COLORS.spineHover : book.spineColor}
                emissiveIntensity={hovered ? 0.5 : read ? 0.25 : 0.18}
                roughness={restored ? 0.7 : 0.9}
              />
            </mesh>
            {/* Spine ridge — di samping book menghadap meja (restored)
                atau ngikut book rotation (drought) */}
            <mesh
              position={[0, bookY + 0.005, -0.08]}
              rotation={
                restored
                  ? [0, 0, 0]
                  : [seedTilt * 0.5, 0, seedTilt * 1.2]
              }
            >
              <boxGeometry args={[0.26, 0.066, 0.018]} />
              <meshStandardMaterial color="#3a2418" roughness={0.85} />
            </mesh>
            {/* Read marker — small dot saat udah dibaca */}
            {read && !hovered && (
              <mesh position={[0.08, bookY + 0.04, 0.06]}>
                <sphereGeometry args={[0.015, 6, 6]} />
                <meshBasicMaterial color="#88a8c0" toneMapped={false} />
              </mesh>
            )}
            {/* Indicator orb mengambang. Drought: lebih dekat ke lantai. */}
            <mesh position={[0, indicatorY, 0]}>
              <sphereGeometry args={[read ? 0.024 : 0.038, 10, 8]} />
              <meshBasicMaterial
                ref={(el) => {
                  indicatorRefs.current[i] = el;
                }}
                color={read ? '#88a8c0' : '#f4d090'}
                transparent
                opacity={hovered ? 1 : read ? 0.65 : 0.9}
                toneMapped={false}
              />
            </mesh>
            {/* Hover label card */}
            {hovered && (
              <Html
                position={[0, labelY, 0]}
                center
                distanceFactor={6}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    fontFamily: '"Fraunces Variable", serif',
                    fontStyle: 'italic',
                    color: 'rgba(255,232,184,0.95)',
                    fontSize: '14px',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    textShadow:
                      '0 0 14px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)',
                  }}
                >
                  {book.title}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

// Restored-only book placement: subset interactive books pindah ke
// posisi prominent dekat meja biar user gampang akses tanpa harus
// orbit ke far racks. Sisanya tetep di far racks (variety location).
// Restored state placement — 8 buku unique funfact:
// - Meja: kosong (Halaman Terakhir dihapus, open book = dekoratif)
// - Stack: 2 buku (sebelum-panggung, suara-memanggil)
// - Side table: 6 buku (sisanya)
const MEJA_INTERACTIVE_IDS = [];
const STACK_INTERACTIVE_IDS = ['sebelum-panggung', 'jaipong-akar'];
// 11 buku interactive di side table (sisa setelah 2 buku di stack
// dan halaman-terakhir dihapus).
const SIDE_TABLE_INTERACTIVE_IDS = [
  'anak-pohon',
  'bukan-kolonial',
  'culture-shock',
  'panggung-kecil',
  'asal-nama',
  'tas-tiga-kilo',
  'pengangguran-dananya',
  'vocal-bertanya',
  'fangirl-dewasa',
  'stay-in-place',
  'revenge-2023',
];

// MejaInteractiveBooks — 2 buku interactive di atas meja kiri & kanan
// dari open book "Halaman Terakhir." Posisi mirror lentera & teacup.
// Restored only. Click → modal.
const MejaInteractiveBooks = ({
  books,
  hoveredId,
  readIds,
  onHover,
  onOut,
  onClick,
}) => {
  const mejaBooks = books.filter((b) => MEJA_INTERACTIVE_IDS.includes(b.id));
  const indicatorRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    indicatorRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const phase = idx * 0.65 + 2.0;
      ref.opacity = 0.75 + Math.sin(t * 1.3 + phase) * 0.2;
    });
  });
  // 2 positions di meja, di sisi yang gak ke-tumpuk sama existing items
  // (lentera kiri-back, teacup kanan-back, quill kanan-back, glasses
  // kiri-front, notebook kiri-back, candle kanan-front).
  // Spots aman: kiri-front-edge & far-back-center
  const positions = [
    [-0.65, 0.78, 0.0],   // kiri-mid (etimologi)
    [0.4, 0.78, 0.0],     // kanan-mid (filosofi)
  ];
  return (
    <group>
      {mejaBooks.map((book, i) => {
        const pos = positions[i] || positions[0];
        const hovered = hoveredId === book.id;
        const read = readIds.has(book.id);
        return (
          <group
            key={book.id}
            position={pos}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(book.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              onOut?.(book.id);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(book);
            }}
          >
            {/* Click hitbox */}
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[0.22, 0.16, 0.18]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Book closed standing slight angle */}
            <mesh
              position={[0, 0.05 + (hovered ? 0.025 : 0), 0]}
              rotation={[0, i === 0 ? 0.15 : -0.15, 0]}
            >
              <boxGeometry args={[0.16, 0.05, 0.22]} />
              <meshStandardMaterial
                color={book.spineColor}
                emissive={hovered ? COLORS.spineHover : book.spineColor}
                emissiveIntensity={hovered ? 0.5 : read ? 0.25 : 0.2}
                roughness={0.75}
              />
            </mesh>
            {/* Spine darker */}
            <mesh
              position={[i === 0 ? -0.075 : 0.075, 0.05, 0]}
              rotation={[0, i === 0 ? 0.15 : -0.15, 0]}
            >
              <boxGeometry args={[0.012, 0.055, 0.22]} />
              <meshStandardMaterial color="#3a2418" roughness={0.85} />
            </mesh>
            {/* Indicator orb */}
            <mesh position={[0, 0.18, 0]}>
              <sphereGeometry args={[read ? 0.022 : 0.032, 10, 8]} />
              <meshBasicMaterial
                ref={(el) => {
                  indicatorRefs.current[i] = el;
                }}
                color={read ? '#88a8c0' : '#f4d090'}
                transparent
                opacity={hovered ? 1 : read ? 0.65 : 0.9}
                toneMapped={false}
              />
            </mesh>
            {hovered && (
              <Html
                position={[0, 0.35, 0]}
                center
                distanceFactor={6}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    fontFamily: '"Fraunces Variable", serif',
                    fontStyle: 'italic',
                    color: 'rgba(255,232,184,0.95)',
                    fontSize: '13px',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    textShadow:
                      '0 0 14px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85)',
                  }}
                >
                  {book.title}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

// StackedBooksNearMeja — 3 tumpukan buku di lantai dekat meja. Top
// book tiap stack adalah interactive (linimasa-trainee, linimasa-
// theater), sisanya deco filler. Restored only — drought version
// punya scattered floor books via BookPedestalsNearMeja.
const StackedBooksNearMeja = ({
  books,
  hoveredId,
  readIds,
  onHover,
  onOut,
  onClick,
}) => {
  const stackBooks = books.filter((b) =>
    STACK_INTERACTIVE_IDS.includes(b.id),
  );
  const indicatorRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    indicatorRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const phase = idx * 0.65 + 4.0;
      ref.opacity = 0.75 + Math.sin(t * 1.3 + phase) * 0.2;
    });
  });
  // 2 stack positions — di utara meja utama. Stack 1 (linimasa-trainee)
  // sebelumnya di [-1.6, 0.7] tapi clash dengan side table footprint
  // (-2.4..-1.2 x, -1..1 z) di restored state. Pindah ke (-0.5, 1.6)
  // di antara meja & rak NW — outside side table & main meja.
  const stackPositions = [
    { pos: [-0.5, 0, 1.6], rotY: 0.2, decoColors: ['#5a3030', '#6a4830'] },
    { pos: [1.6, 0, 0.7], rotY: -0.3, decoColors: ['#3a3858', '#7a5840'] },
  ];
  return (
    <group>
      {stackBooks.map((book, si) => {
        const stack = stackPositions[si] || stackPositions[0];
        const hovered = hoveredId === book.id;
        const read = readIds.has(book.id);
        return (
          <group
            key={book.id}
            position={stack.pos}
            rotation={[0, stack.rotY, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(book.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              onOut?.(book.id);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(book);
            }}
          >
            {/* Click hitbox */}
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.28, 0.28, 0.35, 8]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* 2 deco books di base */}
            {stack.decoColors.map((c, di) => (
              <mesh
                key={`deco-${di}`}
                position={[0, 0.04 + di * 0.06, 0]}
                rotation={[0, (di - 0.5) * 0.1, (di - 0.5) * 0.04]}
              >
                <boxGeometry args={[0.3, 0.055, 0.2]} />
                <meshStandardMaterial color={c} roughness={0.9} />
              </mesh>
            ))}
            {/* Top book — interactive, sedikit terangkat saat hover */}
            <mesh
              position={[0, 0.18 + (hovered ? 0.025 : 0), 0]}
              rotation={[0, 0.05, 0.02]}
            >
              <boxGeometry args={[0.28, 0.06, 0.2]} />
              <meshStandardMaterial
                color={book.spineColor}
                emissive={hovered ? COLORS.spineHover : book.spineColor}
                emissiveIntensity={hovered ? 0.5 : read ? 0.25 : 0.2}
                roughness={0.75}
              />
            </mesh>
            {/* Indicator orb */}
            <mesh position={[0, 0.34, 0]}>
              <sphereGeometry args={[read ? 0.024 : 0.036, 10, 8]} />
              <meshBasicMaterial
                ref={(el) => {
                  indicatorRefs.current[si] = el;
                }}
                color={read ? '#88a8c0' : '#f4d090'}
                transparent
                opacity={hovered ? 1 : read ? 0.65 : 0.9}
                toneMapped={false}
              />
            </mesh>
            {hovered && (
              <Html
                position={[0, 0.5, 0]}
                center
                distanceFactor={6}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    fontFamily: '"Fraunces Variable", serif',
                    fontStyle: 'italic',
                    color: 'rgba(255,232,184,0.95)',
                    fontSize: '13px',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    textShadow:
                      '0 0 14px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85)',
                  }}
                >
                  {book.title}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

// SideTableBooks — 1 meja tambahan di sebelah kiri meja utama (NYAMBUNG
// dengan main meja di edge x=-1.2). Isi 7 buku sisanya yang belum ada di
// meja/stack. Restored only. Side table dimensi 2.0 × 1.2 (depth sama
// dengan main meja biar visual nyambung perfect).
// Side table edge at x=-1.2 (sama dengan main meja edge kiri), tables
// touching tanpa gap. Position x = -1.8 setelah rotation 90° → table
// width 1.2 di world X, spans -2.4..-1.2.
const SIDE_TABLE_POS = [-1.8, 0, 0];
// Side table 2.0 × 1.2 — pas untuk 11 buku interactive di grid 4-3-4.
const SIDE_TABLE_W = 2.0;
const SIDE_TABLE_D = 1.2;
const SIDE_TABLE_TOP_Y = 0.75;
// Layout 11 books: 4-3-4 grid pada side table 2.0 × 1.2.
const SIDE_TABLE_BOOK_SLOTS = [
  // Row belakang (+z 0.4) — 4 books
  { dx: -0.75, dz: 0.4 },
  { dx: -0.25, dz: 0.4 },
  { dx: 0.25, dz: 0.4 },
  { dx: 0.75, dz: 0.4 },
  // Row tengah (z 0) — 3 books
  { dx: -0.55, dz: 0 },
  { dx: 0, dz: 0 },
  { dx: 0.55, dz: 0 },
  // Row depan (-z -0.4) — 4 books
  { dx: -0.75, dz: -0.4 },
  { dx: -0.25, dz: -0.4 },
  { dx: 0.25, dz: -0.4 },
  { dx: 0.75, dz: -0.4 },
];

const SideTableBooks = ({
  books,
  hoveredId,
  readIds,
  onHover,
  onOut,
  onClick,
}) => {
  // Filter books yang assigned ke side table, preserve order yang
  // di SIDE_TABLE_INTERACTIVE_IDS biar layout consistent.
  const sideBooks = SIDE_TABLE_INTERACTIVE_IDS.map((id) =>
    books.find((b) => b.id === id),
  ).filter(Boolean);
  const indicatorRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    indicatorRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const phase = idx * 0.55 + 6.0;
      ref.opacity = 0.75 + Math.sin(t * 1.3 + phase) * 0.2;
    });
  });
  return (
    <group position={SIDE_TABLE_POS} rotation={[0, Math.PI / 2, 0]}>
      {/* Side table top */}
      <mesh position={[0, SIDE_TABLE_TOP_Y, 0]}>
        <boxGeometry args={[SIDE_TABLE_W, 0.04, SIDE_TABLE_D]} />
        <meshStandardMaterial color={COLORS.tableWood} roughness={0.75} />
      </mesh>
      {/* 4 legs — di-position relative to table dimensions */}
      {[
        [SIDE_TABLE_W / 2 - 0.08, SIDE_TABLE_D / 2 - 0.08],
        [-(SIDE_TABLE_W / 2) + 0.08, SIDE_TABLE_D / 2 - 0.08],
        [SIDE_TABLE_W / 2 - 0.08, -(SIDE_TABLE_D / 2) + 0.08],
        [-(SIDE_TABLE_W / 2) + 0.08, -(SIDE_TABLE_D / 2) + 0.08],
      ].map(([x, z], i) => (
        <mesh key={`stleg-${i}`} position={[x, 0.375, z]}>
          <boxGeometry args={[0.08, 0.75, 0.08]} />
          <meshStandardMaterial color={COLORS.tableWood} roughness={0.8} />
        </mesh>
      ))}
      {/* Lower shelf — sedikit di bawah top, kasih structure */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[SIDE_TABLE_W - 0.1, 0.02, SIDE_TABLE_D - 0.1]} />
        <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
      </mesh>
      {/* Small apricot flower vase — tie-in Armeniaca motif. Vas keramik
          mini + 3 bunga pink mekar di edge barat side table. */}
      <group position={[-0.85, 0.78, -0.35]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.1, 12]} />
          <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.105, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.02, 12]} />
          <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.6} />
        </mesh>
        {/* 3 stalks + flowers */}
        {[
          { rot: [0.1, 0, 0.15], h: 0.16 },
          { rot: [-0.15, 0.3, 0.05], h: 0.14 },
          { rot: [0.2, -0.4, -0.1], h: 0.18 },
        ].map((stem, i) => (
          <group key={`apf-${i}`} position={[0, 0.115, 0]} rotation={stem.rot}>
            <mesh position={[0, stem.h / 2, 0]}>
              <cylinderGeometry args={[0.005, 0.007, stem.h, 6]} />
              <meshStandardMaterial color="#4a7a3a" roughness={0.85} />
            </mesh>
            <mesh position={[0, stem.h, 0]}>
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshStandardMaterial
                color="#f4c8d8"
                emissive="#e09bb0"
                emissiveIntensity={0.15}
                roughness={0.7}
              />
            </mesh>
          </group>
        ))}
      </group>
      {/* Small lentera di edge timur side table — kasih warm light
          ke books, kerasa "ada yang baca di sini." */}
      <group position={[0.9, 0.79, 0.4]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.08, 0.08, 10]} />
          <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.04, 10]} />
          <meshStandardMaterial color="#3a2418" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.07, 0.05, 0.1, 10, 1, true]} />
          <meshBasicMaterial
            color="#f4d090"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <sphereGeometry args={[0.016, 8, 6]} />
          <meshBasicMaterial color="#f4a060" toneMapped={false} />
        </mesh>
        <pointLight
          position={[0, 0.13, 0]}
          color="#f4a060"
          intensity={0.55}
          distance={3.0}
          decay={2}
        />
      </group>

      {/* 7 books arranged di top */}
      {sideBooks.map((book, i) => {
        const slot = SIDE_TABLE_BOOK_SLOTS[i];
        if (!slot) return null;
        const hovered = hoveredId === book.id;
        const read = readIds.has(book.id);
        const seedR = hashSeed(`st-${book.id}`);
        const tilt = (seedR - 0.5) * 0.1;
        return (
          <group
            key={book.id}
            position={[slot.dx, SIDE_TABLE_TOP_Y + 0.04, slot.dz]}
            rotation={[0, tilt, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(book.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              onOut?.(book.id);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(book);
            }}
          >
            {/* Hitbox generous */}
            <mesh position={[0, 0.07, 0]}>
              <boxGeometry args={[0.28, 0.18, 0.24]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Book lying flat */}
            <mesh position={[0, 0.03 + (hovered ? 0.025 : 0), 0]}>
              <boxGeometry args={[0.22, 0.05, 0.18]} />
              <meshStandardMaterial
                color={book.spineColor}
                emissive={hovered ? COLORS.spineHover : book.spineColor}
                emissiveIntensity={hovered ? 0.5 : read ? 0.25 : 0.2}
                roughness={0.75}
              />
            </mesh>
            {/* Spine ridge — di sisi facing south (toward main meja) */}
            <mesh position={[0, 0.033, -0.085]}>
              <boxGeometry args={[0.22, 0.055, 0.015]} />
              <meshStandardMaterial color="#3a2418" roughness={0.85} />
            </mesh>
            {/* Indicator orb */}
            <mesh position={[0, 0.18, 0]}>
              <sphereGeometry args={[read ? 0.022 : 0.034, 10, 8]} />
              <meshBasicMaterial
                ref={(el) => {
                  indicatorRefs.current[i] = el;
                }}
                color={read ? '#88a8c0' : '#f4d090'}
                transparent
                opacity={hovered ? 1 : read ? 0.65 : 0.9}
                toneMapped={false}
              />
            </mesh>
            {hovered && (
              <Html
                position={[0, 0.35, 0]}
                center
                distanceFactor={6}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    fontFamily: '"Fraunces Variable", serif',
                    fontStyle: 'italic',
                    color: 'rgba(255,232,184,0.95)',
                    fontSize: '13px',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    textShadow:
                      '0 0 14px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85)',
                  }}
                >
                  {book.title}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

// BookStacksNearTable — 3 tumpukan buku decoratif di lantai dekat meja
// baca, kerasa "ada yang lagi nge-review banyak referensi sekaligus."
// Static, no interactive — purely visual narrative detail.
const BookStacksNearTable = ({ restored }) => {
  // 3 cluster positions di sekitar meja, jauh dari kursi (z=-1.6) +
  // dari path camera-to-table.
  const stacks = [
    // Stack 1 — sisi barat meja, dekat lantai
    {
      pos: [-1.5, 0, 0.6],
      rotY: 0.3,
      books: [
        { color: '#7a3030', h: 0.06, w: 0.32, d: 0.22, tilt: 0 },
        { color: '#5a4030', h: 0.06, w: 0.3, d: 0.2, tilt: 0.06 },
        { color: '#c8a060', h: 0.05, w: 0.28, d: 0.21, tilt: -0.04 },
        { color: '#3a4858', h: 0.06, w: 0.3, d: 0.2, tilt: 0.03 },
      ],
    },
    // Stack 2 — sisi timur meja, lebih kecil
    {
      pos: [1.4, 0, 0.8],
      rotY: -0.2,
      books: [
        { color: '#5a3025', h: 0.06, w: 0.3, d: 0.21, tilt: 0.02 },
        { color: '#7a5840', h: 0.05, w: 0.28, d: 0.2, tilt: -0.05 },
        { color: '#3a3858', h: 0.06, w: 0.29, d: 0.2, tilt: 0.04 },
      ],
    },
    // Stack 3 — kursi-side, behind reading chair
    {
      pos: [-0.6, 0, -2.3],
      rotY: 0.5,
      books: [
        { color: '#a07868', h: 0.05, w: 0.26, d: 0.2, tilt: 0 },
        { color: '#6a4830', h: 0.06, w: 0.28, d: 0.2, tilt: 0.05 },
      ],
    },
  ];

  return (
    <group>
      {stacks.map((stack, si) => (
        <group key={`stack-${si}`} position={stack.pos} rotation={[0, stack.rotY, 0]}>
          {stack.books.map((book, bi) => {
            // Compute cumulative y position based on previous book heights
            let y = 0;
            for (let i = 0; i < bi; i++) y += stack.books[i].h;
            y += book.h / 2; // center of current book
            return (
              <mesh
                key={`stb-${si}-${bi}`}
                position={[0, y, 0]}
                rotation={[0, book.tilt, 0]}
              >
                <boxGeometry args={[book.w, book.h, book.d]} />
                <meshStandardMaterial
                  color={book.color}
                  roughness={restored ? 0.85 : 0.95}
                />
              </mesh>
            );
          })}
          {/* Top book — bookmark ribbon untuk stack pertama (most prominent) */}
          {si === 0 && (
            <mesh
              position={[0.08, stack.books.reduce((s, b) => s + b.h, 0) - 0.02, 0]}
              rotation={[0, 0, 0]}
            >
              <boxGeometry args={[0.012, 0.005, 0.14]} />
              <meshStandardMaterial color="#8B4040" roughness={0.85} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

// LightPoolFloor — soft radial gradient circle di lantai bawah lentera
// & wax candle (saat restored), simulate "pool of light" yang real lights
// kasih (postprocessing Bloom + point light kerasa ke radial decal).
const LightPoolFloor = ({ restored }) => (
  <>
    {/* Pool dari lentera meja — always-on, posisi mirror lentera xz */}
    <mesh
      position={[-0.85, 0.012, 0.35]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[1.3, 28]} />
      <meshBasicMaterial
        color="#f4a060"
        transparent
        opacity={0.07}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
    {/* Pool dari wax candle — restored only, posisi mirror candle xz */}
    {restored && (
      <mesh
        position={[0.65, 0.012, -0.15]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.5, 20]} />
        <meshBasicMaterial
          color="#f4a060"
          transparent
          opacity={0.06}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    )}
  </>
);

// DistantBird — drought only. 1 bird silhouette lewat di luar wall
// breach setiap ~22 detik (slow rare event, kerasa "kota mati tapi
// ada makhluk lewat sesekali"). Pas lewat sebentar (3.3s), abis itu
// hidden. Pakai 2 plane wing yang flap via rotation.
const DistantBird = () => {
  const groupRef = useRef();
  const wingLRef = useRef();
  const wingRRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const cycleSec = 22;
    const cycleT = (t % cycleSec) / cycleSec;
    if (cycleT < 0.15) {
      const localT = cycleT / 0.15;
      // Move right to left di luar breach (-X side, z=4-6)
      // Bird visible from inside ruangan lewat breach gap
      groupRef.current.position.set(
        -ROOM_W / 2 - 6 + localT * 14,
        4.5 + Math.sin(localT * 6) * 0.4,
        4.5,
      );
      groupRef.current.visible = true;
      // Wing flap fast
      const flap = Math.sin(t * 14) * 0.5;
      if (wingLRef.current) wingLRef.current.rotation.z = Math.PI / 8 + flap;
      if (wingRRef.current) wingRRef.current.rotation.z = -Math.PI / 8 - flap;
    } else {
      groupRef.current.visible = false;
    }
  });
  return (
    <group ref={groupRef} visible={false}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.08, 0.025, 0.04]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.95} />
      </mesh>
      {/* Left wing */}
      <mesh ref={wingLRef} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.24, 0.05]} />
        <meshStandardMaterial
          color="#1a0e08"
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Right wing — mirrored */}
      <mesh ref={wingRRef} position={[0, 0.01, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.24, 0.05]} />
        <meshStandardMaterial
          color="#1a0e08"
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// WaterDripFromCeiling — drought only. Droplet jatuh dari atap jebol
// ke lantai di interval random. Hint "atap bocor, hujan udah pernah
// masuk." Desktop: 3 droplet stagger phase. Mobile: 1 droplet (perf).
const WaterDripFromCeiling = ({ isMobile = false }) => {
  const dropRefs = useRef([]);
  const splashRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    dropRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const cycleSec = 4.5 + i * 1.3;
      const phase = i * 2.1;
      const cycleT = ((t + phase) % cycleSec) / cycleSec;
      // Drop falls in first 30% of cycle (0..0.3), rest is invisible
      if (cycleT < 0.3) {
        const fallT = cycleT / 0.3;
        ref.position.y = 6 - fallT * 5.8; // 6 → 0.2
        if (ref.material) ref.material.opacity = 0.55;
      } else {
        if (ref.material) ref.material.opacity = 0;
      }
    });
    splashRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const cycleSec = 4.5 + i * 1.3;
      const phase = i * 2.1;
      const cycleT = ((t + phase) % cycleSec) / cycleSec;
      // Splash visible briefly at moment of impact (0.28-0.36)
      if (cycleT > 0.28 && cycleT < 0.5) {
        const splashT = (cycleT - 0.28) / 0.22;
        const scale = splashT * 0.4;
        ref.scale.set(scale, 1, scale);
        if (ref.material)
          ref.material.opacity = (1 - splashT) * 0.45;
      } else {
        ref.scale.set(0, 1, 0);
      }
    });
  });
  const allDrops = [
    { x: -3.2, z: 5.8 },
    { x: -2.4, z: 6.4 },
    { x: -3.8, z: 5.2 },
  ];
  const drops = isMobile ? allDrops.slice(0, 1) : allDrops;
  return (
    <group>
      {drops.map((d, i) => (
        <React.Fragment key={`drip-${i}`}>
          <mesh
            ref={(el) => {
              dropRefs.current[i] = el;
            }}
            position={[d.x, 6, d.z]}
          >
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshStandardMaterial
              color="#7a8a98"
              transparent
              opacity={0}
              roughness={0.2}
              metalness={0.4}
            />
          </mesh>
          {/* Splash ring at impact point */}
          <mesh
            ref={(el) => {
              splashRefs.current[i] = el;
            }}
            position={[d.x, 0.01, d.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.06, 0.1, 12]} />
            <meshBasicMaterial
              color="#7a8a98"
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

// Spiders — drought only. 3 titik kecil hitam di sudut atas ruangan
// dekat cobweb cluster, kerasa "yang bikin sarang masih ada di sini."
// Statis (gak gerak — laba-laba diam menunggu).
const Spiders = () => {
  const positions = [
    // Sudut NE upper (dekat cobweb pojok NE)
    [ROOM_W / 2 - 0.6, ROOM_H - 0.7, ROOM_D / 2 - 0.6],
    // Dekat breach (sarang besar di -X area)
    [-ROOM_W / 2 + 0.5, 4.0, 4.8],
    // Hanging area ceiling near reading table
    [0.7, 4.55, 0.6],
  ];
  return (
    <group>
      {positions.map((pos, i) => (
        <group key={`sp-${i}`} position={pos}>
          {/* Body */}
          <mesh>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshStandardMaterial color="#1a0e08" roughness={0.95} />
          </mesh>
          {/* Head (smaller) */}
          <mesh position={[0, 0, 0.018]}>
            <sphereGeometry args={[0.011, 6, 4]} />
            <meshStandardMaterial color="#1a0e08" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// CandleFlame — flame sphere dengan flicker animation (scale + opacity)
// Pakai 2 sin freq berbeda biar kerasa naturalistic candle wobble.
const CandleFlame = () => {
  const flameRef = useRef();
  const lightRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker =
      1 + Math.sin(t * 18) * 0.08 + Math.sin(t * 7.3 + 1.2) * 0.1;
    if (flameRef.current) {
      flameRef.current.scale.set(flicker, flicker * 1.15, flicker);
    }
    if (lightRef.current) {
      // Subtle intensity flicker
      lightRef.current.intensity = 0.25 + Math.sin(t * 9.5) * 0.05;
    }
  });
  return (
    <>
      <mesh ref={flameRef} position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.014, 8, 6]} />
        <meshBasicMaterial color="#f4a060" toneMapped={false} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.18, 0]}
        color="#f4a060"
        intensity={0.25}
        distance={1.6}
        decay={2}
      />
    </>
  );
};

// 16. Tapestry — wall hanging di dinding utara dengan subtle sway
const Tapestry = ({ restored }) => {
  const fabricRef = useRef();
  useFrame((state) => {
    if (!fabricRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle sway via rotation Z + scale Y (kerasa angin tipis)
    fabricRef.current.rotation.z = Math.sin(t * 0.45) * 0.012;
  });
  return (
  <group position={[-2, 4.2, ROOM_D / 2 - 0.12]}>
    {/* Top rod */}
    <mesh position={[0, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.025, 0.025, 1.3, 8]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Fabric — ref untuk sway animation */}
    <mesh ref={fabricRef}>
      <planeGeometry args={[1.2, 1.4]} />
      <meshStandardMaterial
        color={restored ? '#7a3030' : '#5a3025'}
        roughness={0.95}
        side={THREE.DoubleSide}
      />
    </mesh>
    {/* Apricot motif (restored) */}
    {restored && (
      <>
        <mesh position={[0, 0.2, 0.01]}>
          <circleGeometry args={[0.18, 12]} />
          <meshStandardMaterial color="#f4c8d8" emissive="#e09bb0" emissiveIntensity={0.12} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.2, 0.01]}>
          <circleGeometry args={[0.15, 12]} />
          <meshStandardMaterial color="#f4c8d8" emissive="#e09bb0" emissiveIntensity={0.12} roughness={0.7} />
        </mesh>
      </>
    )}
    {/* Drought: torn bottom edge */}
    {!restored && (
      <mesh position={[0.35, -0.75, 0.01]} rotation={[0, 0, 0.3]}>
        <planeGeometry args={[0.5, 0.18]} />
        <meshStandardMaterial color={COLORS.fogDrought} roughness={1} side={THREE.DoubleSide} />
      </mesh>
    )}
  </group>
  );
};

// 17. PlantPot — pot kecil di lantai, antara meja & rak NE.
// Restored: tunas hijau dengan 3 daun yang sway pelan via useFrame.
const PlantPot = ({ restored }) => (
  <group position={[3.5, 0, 4]}>
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[0.16, 0.12, 0.3, 12]} />
      <meshStandardMaterial color="#7a4030" roughness={0.85} />
    </mesh>
    {restored ? <PlantLeaves /> : (
      <mesh position={[0.04, 0.42, 0]} rotation={[0, 0, 0.7]}>
        <cylinderGeometry args={[0.012, 0.018, 0.25, 6]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
    )}
  </group>
);

// PlantLeaves — extracted dari PlantPot supaya bisa add useFrame sway
// animation. Tiap daun rotate sedikit pakai sin offset per leaf id.
const PlantLeaves = () => {
  const leafRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    leafRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const phase = i * 1.3;
      const sway = Math.sin(t * 0.8 + phase) * 0.08;
      ref.rotation.z = leafRefs.current[i].userData.baseRotZ + sway;
    });
  });
  const leaves = [
    { x: 0.06, y: 0.15, baseRotZ: -0.6, rotY: 0 },
    { x: -0.06, y: 0.1, baseRotZ: 0.65, rotY: 0 },
    { x: 0.04, y: 0.21, baseRotZ: -0.3, rotY: 0.5 },
  ];
  return (
    <group position={[0, 0.32, 0]}>
      {/* Main stem */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.22, 6]} />
        <meshStandardMaterial color="#4a7a3a" roughness={0.85} />
      </mesh>
      {leaves.map((leaf, i) => (
        <mesh
          key={`lf-${i}`}
          ref={(el) => {
            if (el) {
              el.userData.baseRotZ = leaf.baseRotZ;
              leafRefs.current[i] = el;
            }
          }}
          position={[leaf.x, leaf.y, 0]}
          rotation={[0, leaf.rotY, leaf.baseRotZ]}
        >
          <planeGeometry args={[0.1, 0.05]} />
          <meshStandardMaterial color="#5a8a4a" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

// 18. BreachCurtain — kain tergantung dari edge atas wall breach
const BreachCurtain = ({ restored }) => (
  <group position={[-ROOM_W / 2 + 0.1, 4.5, 4.5]}>
    {/* Rod above breach */}
    <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 2.5, 8]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    {/* Curtain fabric */}
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[2.2, 2.4]} />
      <meshStandardMaterial
        color={restored ? '#7a5840' : '#5a4030'}
        roughness={0.95}
        side={THREE.DoubleSide}
        transparent
        opacity={restored ? 0.9 : 0.72}
      />
    </mesh>
    {/* Drought: torn jagged extra at bottom */}
    {!restored && (
      <mesh position={[0.5, -1.3, 0]} rotation={[0, Math.PI / 2, 0.3]}>
        <planeGeometry args={[0.8, 0.35]} />
        <meshStandardMaterial color={COLORS.fogDrought} roughness={1} side={THREE.DoubleSide} />
      </mesh>
    )}
  </group>
);

// 19. WallArtFrame — frame portrait pudar di dinding timur (selain map)
const WallArtFrame = () => (
  <group position={[ROOM_W / 2 - 0.12, 2.5, 2]} rotation={[0, -Math.PI / 2, 0]}>
    <mesh>
      <boxGeometry args={[0.7, 0.9, 0.04]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0, 0.025]}>
      <planeGeometry args={[0.55, 0.75]} />
      <meshStandardMaterial color="#7a5840" roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
    {/* Faded face suggestion */}
    <mesh position={[0, 0.1, 0.026]}>
      <circleGeometry args={[0.12, 12]} />
      <meshStandardMaterial color="#3a2418" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// 20. HangingTelescope — di pojok dekat breach (-X)
const HangingTelescope = () => (
  <group position={[-5.5, 1.0, 3]} rotation={[0, 0.5, -0.3]}>
    {/* Telescope tube */}
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.04, 0.05, 0.5, 12]} />
      <meshStandardMaterial color={COLORS.shelfWood} roughness={0.6} metalness={0.2} />
    </mesh>
    {/* Tripod 3 legs */}
    {[0, 1, 2].map((i) => {
      const angle = (i * Math.PI * 2) / 3;
      return (
        <mesh
          key={`tl-${i}`}
          position={[Math.cos(angle) * 0.18, -0.55, Math.sin(angle) * 0.18]}
          rotation={[Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3]}
        >
          <cylinderGeometry args={[0.012, 0.014, 1.1, 6]} />
          <meshStandardMaterial color={COLORS.tableWood} roughness={0.85} />
        </mesh>
      );
    })}
    {/* Eyepiece */}
    <mesh position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.025, 0.03, 0.08, 8]} />
      <meshStandardMaterial color="#3a2418" roughness={0.7} />
    </mesh>
  </group>
);

// 21. WallPlate — keramik antik di dinding selatan (samping pintu)
const WallPlate = () => (
  <group position={[3, 3.5, -ROOM_D / 2 + 0.12]} rotation={[Math.PI / 2, 0, 0]}>
    <mesh>
      <cylinderGeometry args={[0.25, 0.25, 0.03, 16]} />
      <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.02, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.005, 12]} />
      <meshStandardMaterial color="#8B4040" roughness={0.7} />
    </mesh>
    {/* Outer ring decoration */}
    <mesh position={[0, 0.015, 0]}>
      <torusGeometry args={[0.2, 0.008, 6, 24]} />
      <meshStandardMaterial color="#8B4040" roughness={0.7} />
    </mesh>
  </group>
);

// Wall sconces — only restored. 4 lentera dinding nyala redup.
const WallSconces = () => {
  const sconces = [
    { pos: [-7.85, 3.5, -5] },
    { pos: [-7.85, 3.5, 0] },
    { pos: [7.85, 3.5, -5] },
    { pos: [7.85, 3.5, 5] },
  ];
  return (
    <group>
      {sconces.map((s, i) => (
        <group key={`sc-${i}`} position={s.pos}>
          <mesh>
            <boxGeometry args={[0.12, 0.2, 0.12]} />
            <meshStandardMaterial color={COLORS.lenternaCeramic} roughness={0.7} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshBasicMaterial color="#f4a060" toneMapped={false} />
          </mesh>
          <pointLight
            color="#f4a060"
            intensity={0.4}
            distance={4}
            decay={2}
          />
        </group>
      ))}
    </group>
  );
};

// Fly-in camera — 2.5s dolly dari dekat pintu (south wall) ke posisi
// final di south side meja menatap utara. Pose final ini bikin user
// langsung lihat: kursi + meja + open book + rak NW/NE di belakangnya.
// Beda dari versi awal yang berakhir di utara meja (user nge-stare ke
// pintu, harus rotate 180° buat liat buku-buku).
const CameraFlyIn = ({ onComplete }) => {
  const { camera } = useThree();
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const t0Ref = useRef(0);

  useFrame((state) => {
    if (completedRef.current) return;
    if (!startedRef.current) {
      t0Ref.current = state.clock.elapsedTime;
      startedRef.current = true;
      camera.position.set(0, 1.2, -9);
      camera.lookAt(0, 0.8, 0);
    }
    const elapsed = state.clock.elapsedTime - t0Ref.current;
    const duration = 2.5;
    const u = Math.min(1, elapsed / duration);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - u, 3);
    const startPos = [0, 1.2, -9];
    const endPos = [0, 1.9, -4];
    camera.position.set(
      lerp(startPos[0], endPos[0], eased),
      lerp(startPos[1], endPos[1], eased),
      lerp(startPos[2], endPos[2], eased),
    );
    camera.lookAt(0, 0.9, 0);
    if (u >= 1) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  return null;
};

// =====================================================================
// Scene wrapper
// =====================================================================

const ArsipScene = ({
  restored,
  books,
  hoveredId,
  readIds,
  onBookHover,
  onBookOut,
  onBookClick,
  hoveredOpenBook,
  onOpenBookHover,
  onOpenBookOut,
  onOpenBookClick,
  flyInComplete,
  onFlyInComplete,
  isMobile,
}) => {
  const fogColor = restored ? COLORS.fogRestored : COLORS.fogDrought;
  const fogNear = restored ? 8 : 4;
  const fogFar = restored ? 30 : 18;

  // Books grouped by rak slot — derived from current `books` prop.
  // Restored state: exclude books yang udah di-placed di meja & stack
  // (MEJA_INTERACTIVE_IDS + STACK_INTERACTIVE_IDS) supaya gak render
  // duplicate di far racks.
  const booksByRak = useMemo(() => {
    const grouped = {};
    const placedIds = restored
      ? new Set([
          ...MEJA_INTERACTIVE_IDS,
          ...STACK_INTERACTIVE_IDS,
          ...SIDE_TABLE_INTERACTIVE_IDS,
        ])
      : new Set();
    Object.values(RAK_SLOTS).forEach((slot) => {
      grouped[slot] = books.filter(
        (b) => b.rakSlot === slot && !placedIds.has(b.id),
      );
    });
    return grouped;
  }, [books, restored]);

  return (
    <>
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      <color attach="background" args={[fogColor]} />

      {/* Ambient — warm sepia, low */}
      <ambientLight intensity={restored ? 0.35 : 0.22} color="#5a3a25" />

      {/* God ray — main light dari atap jebol, miring */}
      <directionalLight
        position={[-4, 8, 6]}
        intensity={restored ? 1.1 : 0.85}
        color={restored ? '#fff0c8' : '#f4d090'}
      />

      {/* Soft fill dari wall breach (-X) */}
      <directionalLight
        position={[-12, 3, 4.5]}
        intensity={0.4}
        color={restored ? '#d4b8a0' : '#a07868'}
      />

      <CameraFlyIn onComplete={onFlyInComplete} />

      <Floor />
      <FloorShadows isMobile={isMobile} />
      <LightPoolFloor restored={restored} />
      <Walls restored={restored} />
      <DoorFrame restored={restored} />
      <Ceiling restored={restored} />
      <WallCracks />
      {/* GodRayCone di-disable — terlalu dominan di scene, lewat Bloom
          jadi gold pillar yang nutup view meja & rak. Directional light
          dari arah atap jebol tetep aktif untuk pencahayaan natural,
          tapi shaft volumetric visualnya dilepas. */}
      <DustMotes count={200} isMobile={isMobile} />
      <PaperDrift count={restored ? 4 : 26} isMobile={isMobile} />
      {/* Drought-only atmospheric storytelling layer */}
      {!restored && (
        <>
          <Cobwebs isMobile={isMobile} />
          <Spiders />
          <WaterDripFromCeiling isMobile={isMobile} />
          {/* DistantBird gak essential, skip mobile */}
          {!isMobile && <DistantBird />}
          <WindStreamlines isMobile={isMobile} />
          <DustFootprints />
          <FallenBookPile isMobile={isMobile} />
          <BookScatter isMobile={isMobile} />
          <PlasterChunks isMobile={isMobile} />
          <WoodDebris isMobile={isMobile} />
          <TwigDebris isMobile={isMobile} />
          <DamagedBooks isMobile={isMobile} />
          <TornPaperPieces isMobile={isMobile} />
          <TippedChair />
        </>
      )}
      {restored && <WallSconces />}
      {/* Butterfly fluttering dekat vase — restored only, desktop only.
          Tie-in ke Armeniaca motif. Skip mobile (1 extra animation +
          gak essential). */}
      {restored && !isMobile && <Butterfly />}

      <ReadingTable
        hoveredOpenBook={hoveredOpenBook}
        onHoverOpenBook={onOpenBookHover}
        onOutOpenBook={onOpenBookOut}
        onClickOpenBook={onOpenBookClick}
      />
      {/* Drought only: interactive books scattered di lantai sekitar
          meja. Restored: books split antara meja (2), stack near meja
          (2), dan far racks (sisanya). */}
      {!restored && (
        <BookPedestalsNearMeja
          books={books}
          restored={false}
          hoveredId={hoveredId}
          readIds={readIds}
          onHover={onBookHover}
          onOut={onBookOut}
          onClick={onBookClick}
        />
      )}
      {restored && (
        <>
          <MejaInteractiveBooks
            books={books}
            hoveredId={hoveredId}
            readIds={readIds}
            onHover={onBookHover}
            onOut={onBookOut}
            onClick={onBookClick}
          />
          <StackedBooksNearMeja
            books={books}
            hoveredId={hoveredId}
            readIds={readIds}
            onHover={onBookHover}
            onOut={onBookOut}
            onClick={onBookClick}
          />
          <SideTableBooks
            books={books}
            hoveredId={hoveredId}
            readIds={readIds}
            onHover={onBookHover}
            onOut={onBookOut}
            onClick={onBookClick}
          />
        </>
      )}

      {/* Library landmark objects — 5 detail pengisi ruangan supaya
          kerasa "perpustakaan beneran" bukan ruangan kosong dgn rak.
          Semua state-aware: visual berubah drought ↔ restored. */}
      <ReadingLectern restored={restored} />
      <LibraryLadder restored={restored} />
      <ScrollHolder restored={restored} />
      <VaseDecoration restored={restored} />
      <ForgottenTeacup restored={restored} />

      {/* Desk items batch — 5 detail kecil di meja baca yang kerasa
          "scholar moment frozen mid-reading." Personal narrative subtle:
          ada yang baru aja berhenti baca. */}
      <QuillInkwell restored={restored} />
      <MagnifyingGlass />
      <ReadingGlasses />
      <OpenNotebook />
      <WaxCandle restored={restored} />

      {/* Furniture & landmark batch — 5 piece besar yang ngisi pojok2
          ruangan, kasih variety silhouette + memperkuat "ini perpustakaan
          beneran, bukan box kosong." */}
      <Globe restored={restored} />
      <CardCatalog restored={restored} />
      <WingChair restored={restored} />
      <FloorLamp restored={restored} />
      {restored && <FloorCushion />}
      {restored && <LetterStack />}
      <Hourglass restored={restored} />
      <PlantPot restored={restored} />

      {/* Library-feel additions — restored only. 10 pieces yang
          memperkuat kerasa "perpustakaan beneran": banker lamp di meja,
          tangga geser, daybed nook, step stool, 2 floor lamps tambahan,
          typewriter di card catalog, tea cart, stained glass window.
          (Densified rak books + open card catalog drawers handled di
          props ke Bookshelf & CardCatalog di atas.) */}
      {restored && (
        <>
          <GreenBankerLamp />
          <WheeledLadder />
          <ReadingDaybed />
          <LibraryStepsStool />
          <ExtraFloorLamp pos={[-3.2, 0, 4.8]} />
          <ExtraFloorLamp pos={[3.2, 0, -3.0]} />
          <AntiqueTypewriter />
          <TeaCart />
          <StainedGlassWindow />
        </>
      )}

      {/* Extra wall-filler bookshelves — restored only. Drought tetap 5
          rak (sisanya runtuh / hilang). Restored: 4 rak baru ngisi
          stretch dinding kosong supaya kerasa perpustakaan beneran
          dengan rak menggelilingi ruangan. Plus 1 island rak ditengah
          sebagai aisle divider. Semua pakai books={[]} (deco-only)
          karena 13 buku interactive udah punya home di
          meja/stack/sideTable/rak utama. */}
      {restored && (
        <>
          {/* back-center: ngisi gap antara NW (-4.5) dan NE (+4.5) di
              back wall */}
          <Bookshelf
            position={[0, 1.5, 8.7]}
            rotation={[0, 0, 0]}
            books={[]}
            hoveredId={hoveredId}
            readIds={readIds}
            restored
          />
          {/* east-north: dinding +X di pertengahan-back, z=6.
              Clear dari ReadingLectern [5.5, 0, 5] dgn gap ~0.5. */}
          <Bookshelf
            position={[6.5, 1.5, 6]}
            rotation={[0, -Math.PI / 2, 0]}
            books={[]}
            hoveredId={hoveredId}
            readIds={readIds}
            restored
          />
          {/* east-south-small: dinding +X dekat pojok depan-kanan,
              scaleH 0.75 supaya gak crowd wing chair (x=5,z=-5) area.
              z=-7 clear dari WingChair & S rak (z=-8.5). */}
          <Bookshelf
            position={[6.5, 1.2, -7]}
            rotation={[0, -Math.PI / 2, 0]}
            books={[]}
            hoveredId={hoveredId}
            readIds={readIds}
            scaleH={0.75}
            restored
          />
          {/* west-south: dinding -X antara W rak (z=2) dan card catalog
              (z=-6), positioned z=-3 dgn clear gap ke Globe (z=-3
              tapi di x=-5.5, far enough). */}
          <Bookshelf
            position={[-6.5, 1.5, -3]}
            rotation={[0, Math.PI / 2, 0]}
            books={[]}
            hoveredId={hoveredId}
            readIds={readIds}
            restored
          />
          {/* island-rak: free-standing perpendicular di tengah ruangan
              bagian back. Books menghadap ke barat (-X, ke arah
              center) bikin "aisle" feeling klasik perpustakaan.
              Position [3, 1.2, 4.5] scaleH 0.85 supaya gak terlalu
              dominan & masih ada path lewat meja ke rak back.
              Back side ada plain wood panel (pasti gak weird karena
              Bookshelf inset cover area sudah dark). */}
          <Bookshelf
            position={[3, 1.2, 4.5]}
            rotation={[0, -Math.PI / 2, 0]}
            books={[]}
            hoveredId={hoveredId}
            readIds={readIds}
            scaleH={0.85}
            restored
          />
        </>
      )}

      {/* Wall & hanging batch — 6 dekorasi vertikal yang ngisi dinding
          kosong. Sebagian state-aware (map, tapestry, curtain berubah
          drought↔restored). */}
      <WallMap restored={restored} />
      <Tapestry restored={restored} />
      <WallArtFrame />
      <WallPlate />
      <BreachCurtain restored={restored} />
      <HangingTelescope />

      {/* Far racks. Restored: books interactive di rak (versi shelf
          beneran, sesuai rakSlot data). Drought: deco-only — books
          udah scattered di lantai via BookPedestalsNearMeja. */}
      <Bookshelf
        position={RAK_LAYOUT.nw.pos}
        rotation={RAK_LAYOUT.nw.rot}
        books={restored ? booksByRak.nw : []}
        hoveredId={hoveredId}
        readIds={readIds}
        onHover={onBookHover}
        onOut={onBookOut}
        onClick={onBookClick}
        restored={restored}
      />
      <Bookshelf
        position={RAK_LAYOUT.ne.pos}
        rotation={RAK_LAYOUT.ne.rot}
        books={restored ? booksByRak.ne : []}
        hoveredId={hoveredId}
        readIds={readIds}
        onHover={onBookHover}
        onOut={onBookOut}
        onClick={onBookClick}
        restored={restored}
      />
      <Bookshelf
        position={RAK_LAYOUT.w.pos}
        rotation={
          restored ? RAK_LAYOUT.w.rotRestored : RAK_LAYOUT.w.rotDrought
        }
        books={restored ? booksByRak.w : []}
        hoveredId={hoveredId}
        readIds={readIds}
        onHover={onBookHover}
        onOut={onBookOut}
        onClick={onBookClick}
        restored={restored}
      />
      <Bookshelf
        position={RAK_LAYOUT.e.pos}
        rotation={
          restored ? RAK_LAYOUT.e.rotRestored : RAK_LAYOUT.e.rotDrought
        }
        books={restored ? booksByRak.e : []}
        hoveredId={hoveredId}
        readIds={readIds}
        onHover={onBookHover}
        onOut={onBookOut}
        onClick={onBookClick}
        restored={restored}
      />
      <Bookshelf
        position={RAK_LAYOUT.s.pos}
        rotation={RAK_LAYOUT.s.rot}
        books={restored ? booksByRak.s : []}
        hoveredId={hoveredId}
        readIds={readIds}
        onHover={onBookHover}
        onOut={onBookOut}
        onClick={onBookClick}
        scaleH={0.75}
        restored={restored}
      />

      {/* OrbitControls — constraints calibrated supaya camera stay inside
          room (16w × 20d × 6h) di semua kombinasi distance+polar+azimuth.
          maxDistance 6.5 (was 9): di max polar/azimuth ekstrem camera
            tetep dalam x=±8 / z=±10 bounds.
          minPolarAngle ~58° (was 30°): di max distance camera y ≤ 4.2,
            jauh di bawah ceiling y=6.
          Azimuth: gak dibatasi (full 360°) supaya user bisa rotate
            kemanapun — termasuk lihat ke arah pintu masuk / side table /
            wing chair nook. */}
      <OrbitControls
        enabled={flyInComplete}
        target={[0, 0.9, 0]}
        minDistance={3}
        maxDistance={6.5}
        minPolarAngle={(Math.PI * 58) / 180}
        maxPolarAngle={(Math.PI * 86) / 180}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.12}
      />
    </>
  );
};

// =====================================================================
// Fallback + UI overlays
// =====================================================================

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#1a0e08] text-white/50 text-sm">
    Memuat perpustakaan...
  </div>
);

const ArsipHeader = ({ restored }) => (
  <div className="pointer-events-none absolute top-5 left-5 z-20 text-white/85 max-w-[280px]">
    <div className="text-[9px] uppercase tracking-[0.4em] text-amber-200/70 mb-1">
      Petak R2 · Perpustakaan
    </div>
    <div
      className="text-base sm:text-lg leading-tight"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      {restored
        ? 'Perpustakaan pulih. Rak berdiri lagi, halaman bisa dibuka.'
        : 'Perpustakaan setengah runtuh. Yang tersisa, masih bisa dibaca.'}
    </div>
  </div>
);

const ArsipFooter = ({ hoveredId, books, readIds, isMobile }) => {
  const hovered = books.find((b) => b.id === hoveredId);
  const readCount = books.filter((b) => readIds.has(b.id)).length;
  return (
    <div
      className="pointer-events-none absolute z-20 text-white/70 text-[11px] sm:text-xs"
      style={{
        left: isMobile ? '1rem' : '1.5rem',
        bottom: `max(1rem, env(safe-area-inset-bottom, 1rem))`,
        maxWidth: isMobile ? '70%' : '50%',
      }}
    >
      {hovered ? (
        <div
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
          className="text-amber-200/85"
        >
          “{hovered.preview}”
        </div>
      ) : (
        <div className="space-y-1">
          <div className="opacity-70">
            Cari titik cahaya di rak — klik buku yang bersinar untuk
            membaca halamannya.
          </div>
          <div
            className="text-white/45 text-[10px] sm:text-[11px]"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
            }}
          >
            {readCount} dari {books.length} buku dibaca.
          </div>
        </div>
      )}
    </div>
  );
};

// ArsipIntroTitle — first-visit narrative card fade-in. Same pattern
// dengan TamanPetaIntroTitle: muncul ~2.6s setelah mount, auto-fade
// out ~5.5s setelah visible, persist via localStorage 'taman-r2-intro-
// seen'. Connective tissue narasi pas user pertama masuk Arsip.
const ARSIP_INTRO_STORAGE_KEY = 'taman-r2-intro-seen';
const ArsipIntroTitle = () => {
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(ARSIP_INTRO_STORAGE_KEY) === '1';
    } catch {
      /* storage blocked */
    }
    if (seen) {
      setRemoved(true);
      return undefined;
    }
    const t1 = setTimeout(() => setVisible(true), 2600);
    const t2 = setTimeout(() => setVisible(false), 8400);
    const t3 = setTimeout(() => {
      setRemoved(true);
      try {
        localStorage.setItem(ARSIP_INTRO_STORAGE_KEY, '1');
      } catch {
        /* storage blocked */
      }
    }, 10600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  if (removed) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-[2000ms] ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center max-w-md mx-4 sm:mx-6 max-h-full overflow-y-auto px-5 py-5 sm:px-8 sm:py-9 sm:-translate-y-10 rounded-md border border-white/12 bg-[#1c1614]/85 backdrop-blur-md shadow-2xl">
        <div className="text-amber-200/55 text-[9px] uppercase tracking-[0.5em] mb-3 sm:mb-4">
          Perpustakaan
        </div>
        <p
          className="text-white text-base sm:text-lg md:text-xl leading-relaxed mb-3"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}
        >
          Sebagian rak masih berdiri.
        </p>
        <div className="mx-auto mb-3 w-10 h-px bg-white/25" />
        <p
          className="text-white/65 text-[11px] sm:text-[12px] md:text-[13px] leading-relaxed"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}
        >
          Sebagian halaman masih bisa dibaca.
          <br className="hidden sm:inline" />
          {' '}Cari titik cahaya di rak —
          <br className="hidden sm:inline" />
          {' '}buku yang bersinar boleh dibuka.
        </p>
      </div>
    </div>
  );
};

const BackToPeta = () => (
  <Link
    to="/armeniacaTown/peta"
    className="pointer-events-auto absolute top-5 right-5 z-20 px-3 py-2 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm text-white/85 text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/40 transition"
  >
    ← Peta Taman
  </Link>
);

// =====================================================================
// Main page
// =====================================================================

const TamanArsipIngatanPage = ({ restored = true }) => {
  const isMobile = useIsMobile();
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredOpenBook, setHoveredOpenBook] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [readIds, setReadIds] = useState(() => new Set(getReadBookIds()));
  const [flyInComplete, setFlyInComplete] = useState(false);

  // Books available di tier ini (drought = 6, restored = 11)
  const interactiveBooks = useMemo(
    () => getInteractiveBooks(restored),
    [restored],
  );

  // Cursor hint saat hover buku
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  const handleBookClick = (book) => {
    setSelectedBookId(book.id);
    setHoveredId(null);
  };

  const handleOpenBookClick = () => {
    // Open book di meja = "Tentang Ruangan Ini" — meta intro tentang
    // Arsip Ingatan sebagai konsep.
    setSelectedBookId('halaman-pembuka');
  };

  const handleCloseModal = () => {
    setSelectedBookId(null);
  };

  const handleMarkRead = (id) => {
    markBookRead(id);
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleNavToBook = (id) => {
    if (!id) return;
    setSelectedBookId(id);
  };

  const selectedBook = selectedBookId
    ? ARSIP_BOOKS.find((b) => b.id === selectedBookId)
    : null;

  return (
    <>
      <Seo
        title="Perpustakaan"
        description="Perpustakaan kota yang setengah runtuh — rak yang masih berdiri menyimpan halaman-halaman tentang perjalanan Eli dan Armeniaca."
        path="/armeniacaTown/r2"
      />
      <div className="relative w-full h-[100dvh] bg-[#1a0e08] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 50, position: [0, 1.2, -9] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
          >
            <ArsipScene
              restored={restored}
              books={interactiveBooks}
              hoveredId={hoveredId}
              readIds={readIds}
              onBookHover={setHoveredId}
              onBookOut={(id) =>
                setHoveredId((c) => (c === id ? null : c))
              }
              onBookClick={handleBookClick}
              hoveredOpenBook={hoveredOpenBook}
              onOpenBookHover={() => setHoveredOpenBook(true)}
              onOpenBookOut={() => setHoveredOpenBook(false)}
              onOpenBookClick={handleOpenBookClick}
              flyInComplete={flyInComplete}
              onFlyInComplete={() => setFlyInComplete(true)}
              isMobile={isMobile}
            />
            {!isMobile && (
              <EffectComposer>
                <Bloom
                  intensity={0.4}
                  luminanceThreshold={0.78}
                  luminanceSmoothing={0.3}
                  mipmapBlur
                />
                <Vignette eskil={false} offset={0.32} darkness={0.6} />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            )}
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <ArsipHeader restored={restored} />
        <BackToPeta />
        <ArsipFooter
          hoveredId={hoveredId}
          books={interactiveBooks}
          readIds={readIds}
          isMobile={isMobile}
        />

        <BookOverlay
          book={selectedBook}
          restored={restored}
          onClose={handleCloseModal}
          onNavigate={handleNavToBook}
          onMarkRead={handleMarkRead}
        />

        <ArsipIntroTitle />
        <AmbientAudio position="bottom-right" />
        <PerpustakaanMusic />
        <RotateRecommendation />
      </div>
    </>
  );
};

export default TamanArsipIngatanPage;
