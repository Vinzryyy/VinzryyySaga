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
 * State: prop `restored` dari RouteChooser di App.jsx.
 *   drought  (2000 ≤ count < 5000) — rak W tumbang, rak E miring,
 *                                    papers berserakan, 6 buku interactive
 *   restored (count ≥ 5000)        — rak tegak, papers settled,
 *                                    11 buku interactive
 *
 * Tidak ada locked tier — Arsip selaras dengan Konstelasi (pasangan
 * langit-halaman). Jika langit accessible, halaman juga accessible.
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
} from '../data/arsipBooks';
import BookOverlay from '../components/taman/r2/BookOverlay';

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
// edge via overlay sub-plane.
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
  </group>
);

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
      {/* Top transom above door */}
      <mesh position={[0, ROOM_H - 1.25, -ROOM_D / 2]}>
        <boxGeometry args={[3, 1.5, 0.2]} />
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
      {/* Breach rubble — pile bata di base celah */}
      <mesh position={[-ROOM_W / 2 + 0.4, 0.3, 4.5]} rotation={[0, 0.3, 0.1]}>
        <boxGeometry args={[0.8, 0.6, 2.2]} />
        <meshStandardMaterial color="#7a5648" roughness={0.95} />
      </mesh>
      <mesh position={[-ROOM_W / 2 + 0.9, 0.18, 3.4]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[0.5, 0.35, 0.9]} />
        <meshStandardMaterial color="#8a6258" roughness={0.95} />
      </mesh>

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
// celah persegi panjang di tengah-pojok.
const Ceiling = () => {
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
          gak runtuh tapi bengkok */}
      <mesh position={[-3, -0.3, 5]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[1.2, 0.15, 0.15]} />
        {beamMat}
      </mesh>
      <mesh position={[-5, -0.5, 7]} rotation={[0.3, 0, 0.2]}>
        <boxGeometry args={[0.15, 0.15, 1.5]} />
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

      {/* Chair behind table (south side) — slight tilt */}
      <group position={[0, 0, 1.6]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0.4, 0]} rotation={[0.04, 0, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.6]} />
          <meshStandardMaterial color={COLORS.chairWood} roughness={0.75} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.85, 0.27]} rotation={[0.04, 0, 0]}>
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

      {/* Lentern at table edge — keramik + glass shade */}
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
        <pointLight
          position={[0, 0.18, 0]}
          color="#f4a060"
          intensity={0.9}
          distance={4.5}
          decay={2}
        />
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
                color: 'rgba(255,228,178,0.95)',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                textShadow: '0 0 8px rgba(0,0,0,0.8)',
              }}
            >
              Halaman Terakhir
            </div>
          </Html>
        )}
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
}) => {
  const w = 3 * scaleH;
  const h = 3 * scaleH;
  const d = 0.6;

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

      {/* Books on shelves */}
      {slots.map((slot, i) => {
        const book = books[i];
        if (!book) return null;
        const hovered = hoveredId === book.id;
        const read = readIds.has(book.id);
        return (
          <group
            key={book.id}
            position={[slot.x, slot.y + (hovered ? 0.03 : 0), slot.z]}
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
              <boxGeometry args={[0.14, 0.5, 0.36]} />
              <meshStandardMaterial
                color={book.spineColor}
                emissive={hovered ? COLORS.spineHover : '#000'}
                emissiveIntensity={hovered ? 0.4 : read ? 0.1 : 0}
                roughness={0.7}
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
                    fontFamily: '"Fraunces Variable", serif',
                    fontStyle: 'italic',
                    color: 'rgba(255,228,178,0.95)',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 8px rgba(0,0,0,0.9)',
                  }}
                >
                  {book.title}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Decorative non-interactive books — fill empty slots dengan
          spine warna acak buat estetika rak yang "penuh" */}
      {slots.length < 10 &&
        Array.from({ length: 10 - slots.length }, (_, i) => {
          const idx = slots.length + i;
          const row = Math.floor(idx / 5);
          const col = idx % 5;
          const x = -w / 2 + (col + 0.5) * (w / 5);
          const y = -h / 2 + 0.3 + row * (h / 2);
          const z = -d / 2 + 0.2;
          const seed = hashSeed(`deco-${position[0]}-${idx}`);
          const colors = ['#7a5840', '#5a4030', '#a08068', '#6a4830', '#3a4858'];
          return (
            <mesh
              key={`deco-${i}`}
              position={[x, y + seed * 0.04, z]}
              rotation={[0, 0, (seed - 0.5) * 0.06]}
            >
              <boxGeometry args={[0.13, 0.48 - seed * 0.1, 0.32]} />
              <meshStandardMaterial
                color={colors[Math.floor(seed * colors.length)]}
                roughness={0.85}
              />
            </mesh>
          );
        })}
    </group>
  );
};

// Paper drift — sheet kertas berserakan di lantai (drought heavier,
// restored sparse). Tiap sheet plane tipis dengan deterministic position.
const PaperDrift = ({ count, isMobile }) => {
  const actualCount = isMobile ? Math.floor(count * 0.4) : count;
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
  const actualCount = isMobile ? Math.floor(count * 0.4) : count;
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

// Fly-in camera — 2.5s dolly dari dekat pintu ke posisi default.
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
    const endPos = [0, 1.7, 4];
    camera.position.set(
      lerp(startPos[0], endPos[0], eased),
      lerp(startPos[1], endPos[1], eased),
      lerp(startPos[2], endPos[2], eased),
    );
    camera.lookAt(0, 0.8, 0);
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
  const booksByRak = useMemo(() => {
    const grouped = {};
    Object.values(RAK_SLOTS).forEach((slot) => {
      grouped[slot] = books.filter((b) => b.rakSlot === slot);
    });
    return grouped;
  }, [books]);

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
      <Walls restored={restored} />
      <Ceiling />
      <GodRayCone restored={restored} />
      <DustMotes count={200} isMobile={isMobile} />
      <PaperDrift count={restored ? 4 : 14} isMobile={isMobile} />
      {restored && <WallSconces />}

      <ReadingTable
        hoveredOpenBook={hoveredOpenBook}
        onHoverOpenBook={onOpenBookHover}
        onOutOpenBook={onOpenBookOut}
        onClickOpenBook={onOpenBookClick}
      />

      {/* Rak NW (utuh) */}
      {booksByRak.nw.length > 0 && (
        <Bookshelf
          position={RAK_LAYOUT.nw.pos}
          rotation={RAK_LAYOUT.nw.rot}
          books={booksByRak.nw}
          hoveredId={hoveredId}
          readIds={readIds}
          onHover={onBookHover}
          onOut={onBookOut}
          onClick={onBookClick}
        />
      )}

      {/* Rak NE (utuh) */}
      {booksByRak.ne.length > 0 && (
        <Bookshelf
          position={RAK_LAYOUT.ne.pos}
          rotation={RAK_LAYOUT.ne.rot}
          books={booksByRak.ne}
          hoveredId={hoveredId}
          readIds={readIds}
          onHover={onBookHover}
          onOut={onBookOut}
          onClick={onBookClick}
        />
      )}

      {/* Rak W — drought: tumbang miring, restored: tegak */}
      {(booksByRak.w.length > 0 || !restored) && (
        <Bookshelf
          position={RAK_LAYOUT.w.pos}
          rotation={
            restored ? RAK_LAYOUT.w.rotRestored : RAK_LAYOUT.w.rotDrought
          }
          books={booksByRak.w}
          hoveredId={hoveredId}
          readIds={readIds}
          onHover={onBookHover}
          onOut={onBookOut}
          onClick={onBookClick}
        />
      )}

      {/* Rak E — drought: miring sedikit, restored: tegak */}
      {(booksByRak.e.length > 0 || !restored) && (
        <Bookshelf
          position={RAK_LAYOUT.e.pos}
          rotation={
            restored ? RAK_LAYOUT.e.rotRestored : RAK_LAYOUT.e.rotDrought
          }
          books={booksByRak.e}
          hoveredId={hoveredId}
          readIds={readIds}
          onHover={onBookHover}
          onOut={onBookOut}
          onClick={onBookClick}
        />
      )}

      {/* Rak S kecil — selalu utuh */}
      {booksByRak.s.length > 0 && (
        <Bookshelf
          position={RAK_LAYOUT.s.pos}
          rotation={RAK_LAYOUT.s.rot}
          books={booksByRak.s}
          hoveredId={hoveredId}
          readIds={readIds}
          onHover={onBookHover}
          onOut={onBookOut}
          onClick={onBookClick}
          scaleH={0.75}
        />
      )}

      <OrbitControls
        enabled={flyInComplete}
        target={[0, 0.8, 0]}
        minDistance={3.5}
        maxDistance={9}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minAzimuthAngle={(-Math.PI * 140) / 180}
        maxAzimuthAngle={(Math.PI * 140) / 180}
        enablePan={false}
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
      Petak R2 · Arsip Ingatan
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

const ArsipFooter = ({ hoveredId, books, isMobile }) => {
  const hovered = books.find((b) => b.id === hoveredId);
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
        <div className="opacity-70">
          Klik buku di rak atau di meja untuk membuka halamannya.
        </div>
      )}
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
    // Meja open book = "halaman-terakhir"
    setSelectedBookId('halaman-terakhir');
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
        title="Arsip Ingatan"
        description="Perpustakaan kota yang setengah runtuh — rak yang masih berdiri menyimpan halaman-halaman tentang perjalanan Eli dan Armeniaca."
        path="/armeniacaTown/r2"
      />
      <div className="relative w-full h-screen bg-[#1a0e08] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 50, position: [0, 1.7, 4] }}
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
          isMobile={isMobile}
        />

        <BookOverlay
          book={selectedBook}
          restored={restored}
          onClose={handleCloseModal}
          onNavigate={handleNavToBook}
          onMarkRead={handleMarkRead}
        />

        <AmbientAudio profile="taman" position="bottom-right" />
        <RotateRecommendation />
      </div>
    </>
  );
};

export default TamanArsipIngatanPage;
