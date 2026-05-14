/**
 * Taman Kebaikan — Petak R5: Panggung Terbuka — Sorotan Kebaikan.
 *
 * 3D pameran sederhana — Three.js / R3F. Gallery U-shape (back wall +
 * 2 side walls) dgn poster donasi mounted di walls, bench viewing
 * tengah, pedestal welcome plaque. Click poster → DonationOverlay HTML
 * modal dgn detail + photo gallery + ProofLightbox.
 *
 * Konten arsip donasi pull dari data/galeriKebaikan.js. Tiap entry =
 * satu poster mounted di wall. Layout WALL_POSITIONS prioritize back-
 * center buat single entry, spread ke sides + back-left/right ke depan.
 *
 * State: prop `restored` dari TamanR5RouteChooser di App.jsx.
 *   locked   (count < 4500)         — chooser redirect ke peta
 *   drought  (4500 ≤ count < 6500)  — track lights dim, no sconces,
 *                                     poster muted, no rug, no mist
 *   restored (count ≥ 6500)         — track lights flicker warm, wall
 *                                     sconces lit, area rug visible,
 *                                     floor mist subtle, poster glow
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
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
import {
  KEBAIKAN_CATEGORIES,
  KEBAIKAN_ENTRIES,
  formatRupiah,
} from '../data/galeriKebaikan';

// ============================================================
// Constants & helpers
// ============================================================

const lerp = (a, b, t) => a + (b - a) * t;

// Gallery layout — U-shape opening toward +z (viewer side). Bigger
// environment: pameran khusus di left + right walls, back wall jadi
// pure panggung backdrop, audience kursi mengisi center floor.
const GALLERY_W = 14;
const GALLERY_D = 10;
const WALL_H = 5.5;
const BACK_WALL_Z = -5;
const SIDE_WALL_X = 7;
const TRACK_BEAM_Y = 5;

const ORBIT_TARGET = [0, 2.5, -1.5];
const CAMERA_START = [0, 14, 4];
const CAMERA_END = [0, 4, 10];
const FLY_IN_DURATION = 2.6;

// Posters mounted di SIDE walls only — back wall jadi panggung backdrop
// murni. 6 slot prioritas: left-back, left-mid, left-front, right-back,
// right-mid, right-front. Single entry → left-back (slot 0).
const WALL_POSITIONS = [
  { x: -SIDE_WALL_X + 0.13, y: 2.7, z: -2.5, ry: Math.PI / 2 },   // left-back
  { x: -SIDE_WALL_X + 0.13, y: 2.7, z: 0,    ry: Math.PI / 2 },   // left-mid
  { x: -SIDE_WALL_X + 0.13, y: 2.7, z: 2.5,  ry: Math.PI / 2 },   // left-front
  { x: SIDE_WALL_X - 0.13,  y: 2.7, z: -2.5, ry: -Math.PI / 2 },  // right-back
  { x: SIDE_WALL_X - 0.13,  y: 2.7, z: 0,    ry: -Math.PI / 2 },  // right-mid
  { x: SIDE_WALL_X - 0.13,  y: 2.7, z: 2.5,  ry: -Math.PI / 2 },  // right-front
];

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

const formatDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

// ============================================================
// 3D Components
// ============================================================

// NightSky — dome background dgn stars subtle (gallery semi-open,
// langit visible above walls). Plus exponential fog supaya floor
// edge ngeblend mulus ke sky color (gak ada visible cutoff).
const NightSky = ({ restored }) => (
  <>
    <fog
      attach="fog"
      args={[restored ? '#1f1208' : '#150f0a', 18, 55]}
    />
    <mesh>
      <sphereGeometry args={[60, 32, 16]} />
      <meshBasicMaterial color={restored ? '#1a0e08' : '#0a0608'} side={THREE.BackSide} />
    </mesh>
    {Array.from({ length: 60 }).map((_, i) => {
      const angle = (i / 60) * Math.PI * 2 + ((i * 17) % 11) * 0.04;
      const dist = 40 + ((i * 23) % 13) * 0.6;
      const y = 8 + ((i * 31) % 41) * 0.5;
      const size = ((i * 13) % 5) * 0.02 + 0.06;
      return (
        <mesh
          key={`star-${i}`}
          position={[Math.cos(angle) * dist, y, Math.sin(angle) * dist]}
        >
          <sphereGeometry args={[size, 4, 4]} />
          <meshBasicMaterial color="#f4e8c8" toneMapped={false} />
        </mesh>
      );
    })}
  </>
);

// ExhibitionFloor — rectangular gallery floor dgn plank lines + area
// rug viewing zone (restored).
const ExhibitionFloor = ({ restored }) => (
  <>
    {/* Outer terrain — large dark plane jauh ke luar, biar gallery
        gak keliatan melayang di angkasa. Tone gelap blend ke skybox. */}
    <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial
        color={restored ? '#3a2818' : '#2a1810'}
        roughness={1}
      />
    </mesh>
    {/* Plaza apron — medium-size warm floor surrounding gallery */}
    <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[28, 24]} />
      <meshStandardMaterial
        color={restored ? '#7a5430' : '#4a3020'}
        roughness={1}
      />
    </mesh>
    {/* Main gallery floor — wood */}
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 16]} />
      <meshStandardMaterial
        color={restored ? '#a87848' : '#7a5840'}
        roughness={0.85}
      />
    </mesh>
    {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((x, i) => (
      <mesh
        key={`plank-${i}`}
        position={[x, -0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.03, 16]} />
        <meshStandardMaterial
          color={restored ? '#5a3a20' : '#1a0a04'}
          roughness={1}
        />
      </mesh>
    ))}
    {restored && (
      <>
        {/* Center aisle runner — long red strip dari entry ke dais
            front, kasih clear path naratif. */}
        <mesh position={[0, -0.025, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 8]} />
          <meshStandardMaterial
            color="#8a2828"
            emissive="#5a1010"
            emissiveIntensity={0.18}
            roughness={0.9}
            transparent
            opacity={0.92}
          />
        </mesh>
        {/* Runner gold border lines — 2 thin parallel strips */}
        {[-0.42, 0.42].map((x, i) => (
          <mesh
            key={`runner-line-${i}`}
            position={[x, -0.02, -0.5]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.03, 8]} />
            <meshStandardMaterial
              color="#d4a848"
              emissive="#a87830"
              emissiveIntensity={0.3}
              roughness={0.5}
              metalness={0.4}
              toneMapped={false}
            />
          </mesh>
        ))}
      </>
    )}
  </>
);

// GalleryWalls — 3 walls U-shape (back + 2 sides). Restored: cream
// warm plaster + gold crown + dark wood baseboard. Drought: dark muted.
const GalleryWalls = ({ restored }) => {
  const wallColor = restored ? '#e4cfa8' : '#8a6850';
  const wallEmissive = restored ? '#a87848' : '#3a2418';
  const wallEmI = restored ? 0.06 : 0.05;
  const trimColor = restored ? '#3a2418' : '#2a1810';
  const crownColor = restored ? '#d4a848' : '#3a2418';
  const accentStripColor = restored ? '#8a1818' : null;
  return (
    <>
      {/* Back wall */}
      <mesh position={[0, WALL_H / 2, BACK_WALL_Z]}>
        <boxGeometry args={[GALLERY_W, WALL_H, 0.25]} />
        <meshStandardMaterial
          color={wallColor}
          emissive={wallEmissive}
          emissiveIntensity={wallEmI}
          roughness={0.95}
        />
      </mesh>
      {/* Left wall */}
      <mesh position={[-SIDE_WALL_X, WALL_H / 2, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[GALLERY_D - 1, WALL_H, 0.25]} />
        <meshStandardMaterial
          color={wallColor}
          emissive={wallEmissive}
          emissiveIntensity={wallEmI}
          roughness={0.95}
        />
      </mesh>
      {/* Right wall */}
      <mesh position={[SIDE_WALL_X, WALL_H / 2, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[GALLERY_D - 1, WALL_H, 0.25]} />
        <meshStandardMaterial
          color={wallColor}
          emissive={wallEmissive}
          emissiveIntensity={wallEmI}
          roughness={0.95}
        />
      </mesh>
      {/* Wainscoting accent strip — horizontal deep red stripe di mid-low
          wall, mirror Victorian gallery aesthetic. Restored only. */}
      {restored && accentStripColor && (
        <>
          <mesh position={[0, 0.7, BACK_WALL_Z + 0.13]}>
            <boxGeometry args={[GALLERY_W, 0.08, 0.04]} />
            <meshStandardMaterial
              color={accentStripColor}
              emissive="#3a0c0c"
              emissiveIntensity={0.15}
              roughness={0.85}
            />
          </mesh>
          <mesh
            position={[-SIDE_WALL_X + 0.13, 0.7, -0.5]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <boxGeometry args={[GALLERY_D - 1, 0.08, 0.04]} />
            <meshStandardMaterial
              color={accentStripColor}
              emissive="#3a0c0c"
              emissiveIntensity={0.15}
              roughness={0.85}
            />
          </mesh>
          <mesh
            position={[SIDE_WALL_X - 0.13, 0.7, -0.5]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <boxGeometry args={[GALLERY_D - 1, 0.08, 0.04]} />
            <meshStandardMaterial
              color={accentStripColor}
              emissive="#3a0c0c"
              emissiveIntensity={0.15}
              roughness={0.85}
            />
          </mesh>
        </>
      )}
      {/* Baseboard trim */}
      {restored && (
        <>
          <mesh position={[0, 0.12, BACK_WALL_Z + 0.13]}>
            <boxGeometry args={[GALLERY_W, 0.22, 0.04]} />
            <meshStandardMaterial color={trimColor} roughness={0.9} />
          </mesh>
          <mesh
            position={[-SIDE_WALL_X + 0.13, 0.12, -0.5]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <boxGeometry args={[GALLERY_D - 1, 0.22, 0.04]} />
            <meshStandardMaterial color={trimColor} roughness={0.9} />
          </mesh>
          <mesh
            position={[SIDE_WALL_X - 0.13, 0.12, -0.5]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <boxGeometry args={[GALLERY_D - 1, 0.22, 0.04]} />
            <meshStandardMaterial color={trimColor} roughness={0.9} />
          </mesh>
        </>
      )}
      {/* Crown molding — gold strip di top of walls, restored only */}
      {restored && (
        <>
          <mesh position={[0, WALL_H - 0.15, BACK_WALL_Z + 0.13]}>
            <boxGeometry args={[GALLERY_W, 0.18, 0.05]} />
            <meshStandardMaterial
              color={crownColor}
              emissive="#7a5818"
              emissiveIntensity={0.3}
              roughness={0.5}
              metalness={0.5}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[-SIDE_WALL_X + 0.13, WALL_H - 0.15, -0.5]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <boxGeometry args={[GALLERY_D - 1, 0.18, 0.05]} />
            <meshStandardMaterial
              color={crownColor}
              emissive="#7a5818"
              emissiveIntensity={0.3}
              roughness={0.5}
              metalness={0.5}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[SIDE_WALL_X - 0.13, WALL_H - 0.15, -0.5]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <boxGeometry args={[GALLERY_D - 1, 0.18, 0.05]} />
            <meshStandardMaterial
              color={crownColor}
              emissive="#7a5818"
              emissiveIntensity={0.3}
              roughness={0.5}
              metalness={0.5}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
    </>
  );
};

// AudienceKursi — 2 rows × 5 kursi facing panggung, mengisi tempat
// kosong di tengah floor antara dais dan back of audience. Restored:
// cushion velvet merah. Drought: tanpa cushion.
const AudienceKursi = ({ restored }) => {
  // Row positions di z (closer to stage di z lebih negatif). 6 kursi
  // per row split 3+3 dgn center aisle gap 0.6 (mirror real theater).
  const rows = [
    { z: -1.5, spread: 3.6 },
    { z: -0.2, spread: 3.9 },
    { z: 1.1, spread: 4.2 },
  ];
  const SEATS_PER_ROW = 6;
  const AISLE_GAP = 0.6;
  return (
    <>
      {rows.flatMap((row, rowIdx) =>
        Array.from({ length: SEATS_PER_ROW }).map((_, i) => {
          const halfCount = SEATS_PER_ROW / 2;
          const isLeft = i < halfCount;
          const halfIdx = isLeft ? i : i - halfCount;
          const halfWidth = row.spread - AISLE_GAP / 2;
          const halfStep = halfWidth / (halfCount - 1);
          // Left: x = -spread to -aisleGap/2
          // Right: x = +aisleGap/2 to +spread
          const x = isLeft
            ? -row.spread + halfIdx * halfStep
            : AISLE_GAP / 2 + halfIdx * halfStep;
          // Drought: ~30% kursi knocked over (rebah/miring). Pattern
          // deterministic via (i + rowIdx) modulo.
          const seedKey = i + rowIdx * 6;
          const knockedOver =
            !restored && (seedKey % 5 === 0 || seedKey % 7 === 0);
          const heavilyTilted = !restored && seedKey % 9 === 0;
          const tiltX = knockedOver ? Math.PI / 2 - 0.3 : 0;
          const tiltZ = knockedOver
            ? (seedKey % 2 === 0 ? 0.3 : -0.4)
            : heavilyTilted
            ? 0.35
            : !restored && seedKey % 4 === 0
            ? 0.1
            : 0;
          const kursiY = knockedOver ? 0.08 : 0.2;
          return (
            <group
              key={`kursi-${rowIdx}-${i}`}
              position={[x, kursiY, row.z]}
              rotation={[tiltX, 0, tiltZ]}
            >
              {/* Seat slab */}
              <mesh>
                <boxGeometry args={[0.48, 0.16, 0.46]} />
                <meshStandardMaterial
                  color={restored ? '#6a5040' : '#4a3a2c'}
                  roughness={1}
                />
              </mesh>
              {/* Back rest — di +z (sisi viewer) supaya kursi menghadap
                  panggung di -z. Sebelumnya kebalik. */}
              <mesh position={[0, 0.38, 0.2]}>
                <boxGeometry args={[0.48, 0.55, 0.06]} />
                <meshStandardMaterial
                  color={restored ? '#5a4030' : '#3a2c20'}
                  roughness={1}
                />
              </mesh>
              {/* Cushion restored only — small fabric pad */}
              {restored && (
                <mesh position={[0, 0.11, 0]}>
                  <boxGeometry args={[0.42, 0.06, 0.38]} />
                  <meshStandardMaterial
                    color="#9a3838"
                    emissive="#3a1818"
                    emissiveIntensity={0.12}
                    roughness={0.85}
                  />
                </mesh>
              )}
            </group>
          );
        }),
      )}
    </>
  );
};

// ViewingBench — long bench di back of audience area, untuk viewer
// yang mau duduk sambil overview panggung + posters. Position param
// supaya bisa di-instance multiple kali di row beda.
const ViewingBench = ({ restored, z = 2.8, showBooks = true }) => (
  <group position={[0, 0, z]}>
    {/* Seat slab — lebih panjang biar fit bigger env */}
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[3, 0.12, 0.55]} />
      <meshStandardMaterial
        color={restored ? '#6a4830' : '#3a2818'}
        roughness={0.9}
      />
    </mesh>
    {/* Legs */}
    {[-1.3, 0, 1.3].map((x, i) => (
      <mesh key={`leg-${i}`} position={[x, 0.2, 0]}>
        <boxGeometry args={[0.18, 0.4, 0.45]} />
        <meshStandardMaterial
          color={restored ? '#5a3a20' : '#2a1810'}
          roughness={0.95}
        />
      </mesh>
    ))}
    {/* Plank line on seat — visual detail */}
    <mesh position={[0, 0.466, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3, 0.02]} />
      <meshStandardMaterial color="#1a0e08" roughness={1} />
    </mesh>
    {/* Programmes — stack of small books left on bench, restored only.
        Narrative "ada pengunjung yang baru aja keluar". showBooks
        prop biar bench kedua gak ikut nampilin books. */}
    {restored && showBooks && (
      <group position={[-1.1, 0.46, 0]}>
        {/* Book 1 — bottom */}
        <mesh position={[0, 0.025, 0]} rotation={[0, 0.15, 0]}>
          <boxGeometry args={[0.22, 0.05, 0.18]} />
          <meshStandardMaterial color="#a83838" roughness={0.85} />
        </mesh>
        {/* Book 2 — middle */}
        <mesh position={[0.02, 0.075, 0.01]} rotation={[0, -0.1, 0]}>
          <boxGeometry args={[0.22, 0.05, 0.18]} />
          <meshStandardMaterial color="#3a2818" roughness={0.85} />
        </mesh>
        {/* Book 3 — top, slightly askew */}
        <mesh position={[-0.03, 0.125, -0.02]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.18]} />
          <meshStandardMaterial
            color="#d4a848"
            emissive="#7a5818"
            emissiveIntensity={0.15}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      </group>
    )}
  </group>
);

// CeilingTrackLights — horizontal beam dgn 4 small downlights pointing
// ke posters di back wall. Restored: warm flicker + point lights.
// Drought: dim center light only.
const CeilingTrackLights = ({ restored }) => {
  const matRefs = useRef([]);
  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < matRefs.current.length; i += 1) {
      const mat = matRefs.current[i];
      if (!mat) continue;
      mat.emissiveIntensity = 0.65 + Math.sin(t * 0.5 + i * 0.4) * 0.1;
    }
  });
  const positions = restored ? [-2.4, -0.8, 0.8, 2.4] : [0];
  const trackZ = BACK_WALL_Z + 2.2; // overhead di front of dais
  return (
    <>
      {/* Track beam — horizontal di atas panggung dais area */}
      <mesh position={[0, TRACK_BEAM_Y, trackZ]}>
        <boxGeometry args={[GALLERY_W - 2, 0.1, 0.12]} />
        <meshStandardMaterial color="#2a1810" roughness={0.9} />
      </mesh>
      {/* Track mounts (2 brackets ke ceiling) */}
      {[-5, 5].map((x, i) => (
        <mesh
          key={`bracket-${i}`}
          position={[x, TRACK_BEAM_Y + 0.18, trackZ]}
        >
          <boxGeometry args={[0.08, 0.36, 0.08]} />
          <meshStandardMaterial color="#2a1810" roughness={0.95} />
        </mesh>
      ))}
      {/* Downlights mounted on track, angled toward dais */}
      {positions.map((x, i) => (
        <group
          key={`light-${i}`}
          position={[x, TRACK_BEAM_Y - 0.06, trackZ]}
        >
          {/* Stem ke track */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.1, 6]} />
            <meshStandardMaterial color="#2a1810" roughness={0.95} />
          </mesh>
          {/* Lamp barrel — angled toward poster di back wall */}
          <group rotation={[-0.85, 0, 0]} position={[0, -0.12, 0]}>
            <mesh>
              <cylinderGeometry args={[0.1, 0.13, 0.22, 8]} />
              <meshStandardMaterial color="#2a1810" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.1, 12]} />
              <meshStandardMaterial
                ref={(m) => {
                  matRefs.current[i] = m;
                }}
                color={restored ? '#f4d8a0' : '#5a4838'}
                emissive={restored ? '#f4c478' : '#000000'}
                emissiveIntensity={restored ? 0.65 : 0}
                toneMapped={false}
              />
            </mesh>
          </group>
          {restored && (
            <pointLight
              position={[0, -0.3, -0.4]}
              color="#f4d8a0"
              intensity={0.6}
              distance={5}
              decay={2}
            />
          )}
        </group>
      ))}
      {/* Drought center dim ambient — gak ada track light aktif */}
      {!restored && (
        <pointLight
          position={[0, TRACK_BEAM_Y - 0.4, trackZ]}
          color="#a89070"
          intensity={0.35}
          distance={6}
          decay={2}
        />
      )}
    </>
  );
};

// GallerySconces — 2 wall-mounted lamps di side walls (mid-height),
// restored only. Kasih ambient fill di samping.
const GallerySconces = ({ restored }) => {
  if (!restored) return null;
  // 4 sconces: 2 per wall (1 back + 1 front di tiap wall) covers
  // sepanjang side wall yang sekarang lebih panjang (10 deep).
  const sconces = [
    { x: -SIDE_WALL_X + 0.16, z: -2.5, ry: Math.PI / 2 },   // left-back
    { x: -SIDE_WALL_X + 0.16, z: 2,    ry: Math.PI / 2 },   // left-front
    { x: SIDE_WALL_X - 0.16,  z: -2.5, ry: -Math.PI / 2 },  // right-back
    { x: SIDE_WALL_X - 0.16,  z: 2,    ry: -Math.PI / 2 },  // right-front
  ];
  return (
    <>
      {sconces.map((s, i) => (
        <group
          key={`sconce-${i}`}
          position={[s.x, 2.8, s.z]}
          rotation={[0, s.ry, 0]}
        >
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.06, 0.2]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial
              color="#f4d8a0"
              emissive="#f4c478"
              emissiveIntensity={0.7}
              roughness={0.5}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.18, 0.2]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.12, 0.1, 8]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>
          <pointLight
            position={[0, 0.06, 0.28]}
            color="#f4d8a0"
            intensity={0.4}
            distance={3}
            decay={2}
          />
        </group>
      ))}
    </>
  );
};

// DroughtDebris — scattered rubble pieces di floor saat hancur lebur.
// Kayu pecah, batu, fabric scrap. Spread across viewing area + stage.
// Drought only.
const DroughtDebris = ({ restored }) => {
  if (restored) return null;
  // Deterministic positions via seed for visual consistency.
  const debris = [
    { x: -3, y: 0.04, z: 2.3, sx: 0.4, sy: 0.08, sz: 0.3, rot: 0.4, color: '#3a2818' },
    { x: 2.5, y: 0.03, z: 1.8, sx: 0.25, sy: 0.06, sz: 0.4, rot: -0.7, color: '#2a1810' },
    { x: -1.5, y: 0.05, z: -0.3, sx: 0.35, sy: 0.1, sz: 0.25, rot: 0.9, color: '#3a2418' },
    { x: 1.2, y: 0.04, z: -1.8, sx: 0.3, sy: 0.07, sz: 0.35, rot: -0.3, color: '#2a1810' },
    { x: -2.2, y: 0.03, z: -2.5, sx: 0.22, sy: 0.05, sz: 0.18, rot: 1.1, color: '#3a2818' },
    { x: 3.5, y: 0.04, z: 0.5, sx: 0.4, sy: 0.08, sz: 0.22, rot: 0.2, color: '#2a1810' },
    { x: -4.2, y: 0.03, z: -1, sx: 0.18, sy: 0.06, sz: 0.3, rot: -0.5, color: '#3a2418' },
    { x: 4, y: 0.04, z: -2.8, sx: 0.28, sy: 0.09, sz: 0.2, rot: 0.7, color: '#2a1810' },
    { x: 0.5, y: 0.03, z: 3.4, sx: 0.32, sy: 0.05, sz: 0.4, rot: -1, color: '#3a2818' },
    { x: -0.8, y: 0.04, z: 0.8, sx: 0.2, sy: 0.06, sz: 0.22, rot: 0.5, color: '#2a1810' },
  ];
  return (
    <>
      {debris.map((d, i) => (
        <mesh key={`debris-${i}`} position={[d.x, d.y, d.z]} rotation={[0.1, d.rot, 0.15]}>
          <boxGeometry args={[d.sx, d.sy, d.sz]} />
          <meshStandardMaterial color={d.color} roughness={1} />
        </mesh>
      ))}
      {/* Fabric scraps — dark cloth strips on floor near tirai location */}
      {[
        { x: -DAIS_W / 2 - 0.5, z: BACK_WALL_Z + 1.8, rot: 0.6 },
        { x: DAIS_W / 2 + 0.5, z: BACK_WALL_Z + 1.6, rot: -0.4 },
        { x: -1.5, z: BACK_WALL_Z + 0.8, rot: 1.2 },
      ].map((s, i) => (
        <mesh
          key={`scrap-${i}`}
          position={[s.x, 0.01, s.z]}
          rotation={[-Math.PI / 2, 0, s.rot]}
        >
          <planeGeometry args={[0.5, 0.7]} />
          <meshStandardMaterial color="#2a0c0c" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Dust mounds — dark patches di floor */}
      {[
        { x: -2, z: 1.5, r: 0.5 },
        { x: 1.8, z: -0.5, r: 0.4 },
        { x: 3, z: 2, r: 0.45 },
        { x: -3.5, z: -2, r: 0.4 },
      ].map((d, i) => (
        <mesh
          key={`dust-${i}`}
          position={[d.x, 0.005, d.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[d.r, 12]} />
          <meshStandardMaterial
            color="#1a0e08"
            roughness={1}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </>
  );
};

// WallCracks — dark crack lines di walls saat drought. Visible
// damage texture. Drought only.
const WallCracks = ({ restored }) => {
  if (restored) return null;
  return (
    <>
      {/* Back wall cracks — 3 diagonal lines */}
      {[
        { x: -3, y: 3, rot: 0.4, w: 0.04, h: 2.2 },
        { x: 2.5, y: 2.5, rot: -0.5, w: 0.05, h: 2.6 },
        { x: 0.5, y: 1.5, rot: 0.7, w: 0.04, h: 1.8 },
      ].map((c, i) => (
        <mesh
          key={`crack-back-${i}`}
          position={[c.x, c.y, BACK_WALL_Z + 0.14]}
          rotation={[0, 0, c.rot]}
        >
          <planeGeometry args={[c.w, c.h]} />
          <meshStandardMaterial color="#1a0a04" roughness={1} />
        </mesh>
      ))}
      {/* Left wall cracks */}
      {[
        { z: -1, y: 3.2, rot: -0.6, w: 0.04, h: 2.4 },
        { z: 1.5, y: 2.8, rot: 0.3, w: 0.05, h: 2 },
      ].map((c, i) => (
        <mesh
          key={`crack-left-${i}`}
          position={[-SIDE_WALL_X + 0.14, c.y, c.z]}
          rotation={[0, Math.PI / 2, c.rot]}
        >
          <planeGeometry args={[c.w, c.h]} />
          <meshStandardMaterial color="#1a0a04" roughness={1} />
        </mesh>
      ))}
      {/* Right wall cracks */}
      {[
        { z: -2, y: 2.5, rot: 0.5, w: 0.04, h: 2.2 },
        { z: 0.8, y: 3.5, rot: -0.4, w: 0.05, h: 1.8 },
      ].map((c, i) => (
        <mesh
          key={`crack-right-${i}`}
          position={[SIDE_WALL_X - 0.14, c.y, c.z]}
          rotation={[0, -Math.PI / 2, c.rot]}
        >
          <planeGeometry args={[c.w, c.h]} />
          <meshStandardMaterial color="#1a0a04" roughness={1} />
        </mesh>
      ))}
    </>
  );
};

// Chandelier — central hanging fixture di ceiling above audience.
// Gold ring frame + 6 small bulbs + chain ke ceiling. Drought: dim.
const Chandelier = ({ restored }) => {
  const bulbMatRefs = useRef([]);
  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < bulbMatRefs.current.length; i += 1) {
      const mat = bulbMatRefs.current[i];
      if (!mat) continue;
      mat.emissiveIntensity = 0.75 + Math.sin(t * 0.8 + i * 0.6) * 0.12;
    }
  });
  const chandY = restored ? 4.2 : 3.7;
  const chandZ = 0;
  const ringR = 0.6;
  // Drought: chandelier tilted (rotation Z) + dropped lower + half
  // bulbs missing — kayak rusak gantung miring.
  return (
    <group
      position={[0, chandY, chandZ]}
      rotation={[0, 0, restored ? 0 : 0.35]}
    >
      {/* Chain ke ceiling — drought: shorter + offset (one side broken) */}
      <mesh position={[restored ? 0 : -0.15, restored ? 0.8 : 0.6, 0]}>
        <cylinderGeometry args={[0.012, 0.012, restored ? 1.6 : 1.0, 5]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.08, 0.05, 0.08, 8]} />
        <meshStandardMaterial
          color={restored ? '#d4a848' : '#3a2418'}
          emissive={restored ? '#a87830' : '#000000'}
          emissiveIntensity={restored ? 0.3 : 0}
          roughness={0.5}
          metalness={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* Ring frame — gold metallic */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringR, 0.04, 8, 24]} />
        <meshStandardMaterial
          color={restored ? '#d4a848' : '#3a2418'}
          emissive={restored ? '#a87830' : '#000000'}
          emissiveIntensity={restored ? 0.35 : 0}
          roughness={0.5}
          metalness={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* 6 bulbs spread along ring — drought: 3 of 6 missing (gone) */}
      {Array.from({ length: 6 }).map((_, i) => {
        // Drought: bulbs 1, 3, 5 missing (rusak/jatuh)
        if (!restored && i % 2 === 1) return null;
        const angle = (i / 6) * Math.PI * 2;
        const bx = Math.cos(angle) * ringR;
        const bz = Math.sin(angle) * ringR;
        return (
          <group key={`bulb-${i}`} position={[bx, -0.1, bz]}>
            {/* Bulb holder — drought: tilted (rusak) */}
            <mesh
              position={[0, 0.04, 0]}
              rotation={[0, 0, restored ? 0 : 0.4]}
            >
              <cylinderGeometry args={[0.025, 0.03, 0.06, 6]} />
              <meshStandardMaterial color="#3a2418" roughness={0.9} />
            </mesh>
            {/* Bulb — emissive */}
            <mesh position={[0, -0.04, 0]}>
              <sphereGeometry args={[0.06, 10, 8]} />
              <meshStandardMaterial
                ref={(m) => {
                  bulbMatRefs.current[i] = m;
                }}
                color={restored ? '#f4d8a0' : '#3a2818'}
                emissive={restored ? '#f4c478' : '#000000'}
                emissiveIntensity={restored ? 0.75 : 0}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
      {/* Center point light */}
      {restored && (
        <pointLight
          position={[0, -0.1, 0]}
          color="#f4d8a0"
          intensity={0.6}
          distance={5}
          decay={2}
        />
      )}
    </group>
  );
};

// CofferedCeilingBeams — wooden grid pattern di ceiling above audience.
// 3 cross beams (X-dir) + 4 perpendicular (Z-dir) kasih architectural
// depth tanpa solid ceiling (gallery tetep "terbuka").
const CofferedCeilingBeams = ({ restored }) => {
  const beamColor = restored ? '#5a3a20' : '#3a2418';
  const beamY = 5.1;
  return (
    <>
      {/* Cross beams X direction — span full GALLERY_W di z positions */}
      {[-2.5, 0, 2.5].map((z, i) => (
        <mesh key={`beam-x-${i}`} position={[0, beamY, z]}>
          <boxGeometry args={[GALLERY_W - 1, 0.18, 0.16]} />
          <meshStandardMaterial color={beamColor} roughness={0.95} />
        </mesh>
      ))}
      {/* Perpendicular Z direction — short spans di x positions */}
      {[-5, -1.5, 1.5, 5].map((x, i) => (
        <mesh key={`beam-z-${i}`} position={[x, beamY, 0]}>
          <boxGeometry args={[0.16, 0.18, 5.5]} />
          <meshStandardMaterial color={beamColor} roughness={0.95} />
        </mesh>
      ))}
    </>
  );
};

// AisleFloorLights — embedded small emissive dots along center aisle,
// kasih warm "stage runway" guide light. Restored only.
const AisleFloorLights = ({ restored }) => {
  const matRefs = useRef([]);
  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < matRefs.current.length; i += 1) {
      const mat = matRefs.current[i];
      if (!mat) continue;
      mat.emissiveIntensity = 0.7 + Math.sin(t * 0.6 + i * 0.3) * 0.12;
    }
  });
  if (!restored) return null;
  const positions = [-3.5, -2.5, -1.5, 0, 1.5, 2.5, 3.5];
  return (
    <>
      {positions.map((z, i) => (
        <mesh
          key={`aisle-light-${i}`}
          position={[0, 0.005, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.06, 12]} />
          <meshStandardMaterial
            ref={(m) => {
              matRefs.current[i] = m;
            }}
            color="#f4d8a0"
            emissive="#f4c478"
            emissiveIntensity={0.7}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
};

// WallMedallions — small decorative ornaments mounted di side walls
// between poster slots. Restored only.
const WallMedallions = ({ restored }) => {
  if (!restored) return null;
  // Position between poster slots on each wall — di z between WALL_POSITIONS
  // slot 0 dan slot 1 (z=-1.25), dan slot 1 dan slot 2 (z=+1.25).
  const positions = [
    { x: -SIDE_WALL_X + 0.16, z: -1.25, ry: Math.PI / 2 },
    { x: -SIDE_WALL_X + 0.16, z: 1.25, ry: Math.PI / 2 },
    { x: SIDE_WALL_X - 0.16, z: -1.25, ry: -Math.PI / 2 },
    { x: SIDE_WALL_X - 0.16, z: 1.25, ry: -Math.PI / 2 },
  ];
  return (
    <>
      {positions.map((p, i) => (
        <group
          key={`medallion-${i}`}
          position={[p.x, 2.7, p.z]}
          rotation={[0, p.ry, 0]}
        >
          {/* Outer ring — gold */}
          <mesh>
            <torusGeometry args={[0.18, 0.025, 8, 16]} />
            <meshStandardMaterial
              color="#d4a848"
              emissive="#a87830"
              emissiveIntensity={0.32}
              roughness={0.5}
              metalness={0.5}
              toneMapped={false}
            />
          </mesh>
          {/* Inner medallion plate */}
          <mesh position={[0, 0, 0.01]}>
            <circleGeometry args={[0.15, 16]} />
            <meshStandardMaterial
              color="#7a3030"
              emissive="#3a1010"
              emissiveIntensity={0.18}
              roughness={0.85}
            />
          </mesh>
          {/* Center bead — gold */}
          <mesh position={[0, 0, 0.04]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial
              color="#d4a848"
              emissive="#a87830"
              emissiveIntensity={0.35}
              roughness={0.45}
              metalness={0.55}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

// PanggungDais — low raised stage platform di base back wall. Center
// featured poster sit "on stage" backdrop. 4 wide × 1.5 deep × 0.3
// high. Restored: brighter wood + edge lip. Drought: muted.
const DAIS_W = 6;
const DAIS_D = 2;
const DAIS_H = 0.4;
const DAIS_Z = BACK_WALL_Z + 0.13 + DAIS_D / 2;

const PanggungDais = ({ restored }) => (
  <>
    {/* Dais base — darker color biar contrast dari floor (lantai
        warm brown, dais base coklat tua kebumian — gak blend) */}
    <mesh position={[0, DAIS_H / 2, DAIS_Z]}>
      <boxGeometry args={[DAIS_W, DAIS_H, DAIS_D]} />
      <meshStandardMaterial
        color={restored ? '#6a3818' : '#3a2010'}
        roughness={0.85}
      />
    </mesh>
    {/* Dais surface — slightly polished top */}
    <mesh position={[0, DAIS_H + 0.005, DAIS_Z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[DAIS_W - 0.08, DAIS_D - 0.08]} />
      <meshStandardMaterial
        color={restored ? '#c88848' : '#6a4828'}
        roughness={0.7}
      />
    </mesh>
    {/* Front lip edge — dark trim */}
    <mesh position={[0, DAIS_H / 2, DAIS_Z + DAIS_D / 2 + 0.025]}>
      <boxGeometry args={[DAIS_W + 0.04, DAIS_H + 0.04, 0.05]} />
      <meshStandardMaterial color="#3a2010" roughness={0.95} />
    </mesh>
    {/* Plank lines on dais — 3 thin strips for wood texture */}
    {[-1.2, 0, 1.2].map((x, i) => (
      <mesh
        key={`dais-plank-${i}`}
        position={[x, DAIS_H + 0.012, DAIS_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.03, DAIS_D - 0.1]} />
        <meshStandardMaterial color="#1a0e08" roughness={1} />
      </mesh>
    ))}
    {/* Side steps — 2 step rises di kanan-kiri dais, kasih akses naik */}
    {[-DAIS_W / 2 - 0.3, DAIS_W / 2 + 0.3].map((x, i) => (
      <mesh
        key={`step-${i}`}
        position={[x, DAIS_H / 4, DAIS_Z]}
      >
        <boxGeometry args={[0.5, DAIS_H / 2, DAIS_D - 0.1]} />
        <meshStandardMaterial
          color={restored ? '#7a5028' : '#3a2818'}
          roughness={0.95}
        />
      </mesh>
    ))}
    {/* Drought cracks — dark zigzag lines across dais surface */}
    {!restored && (
      <>
        {[
          { x: -1.2, z: 0, rot: 0.3, w: 0.04, h: 1.6 },
          { x: 0.8, z: 0.1, rot: -0.5, w: 0.05, h: 1.4 },
          { x: 2, z: -0.2, rot: 0.8, w: 0.04, h: 1.2 },
          { x: -2.3, z: 0.2, rot: -0.3, w: 0.04, h: 1 },
        ].map((c, i) => (
          <mesh
            key={`dais-crack-${i}`}
            position={[c.x, DAIS_H + 0.015, DAIS_Z + c.z]}
            rotation={[-Math.PI / 2, 0, c.rot]}
          >
            <planeGeometry args={[c.w, c.h]} />
            <meshStandardMaterial color="#1a0a04" roughness={1} />
          </mesh>
        ))}
        {/* Missing corner chunk — dark box di pojok kiri-depan dais
            (simulasi chunk lepas) */}
        <mesh
          position={[
            -DAIS_W / 2 + 0.18,
            DAIS_H / 2,
            DAIS_Z + DAIS_D / 2 - 0.18,
          ]}
        >
          <boxGeometry args={[0.4, DAIS_H + 0.02, 0.4]} />
          <meshStandardMaterial color="#1a0a04" roughness={1} />
        </mesh>
        {/* Fallen chunk debris di lantai depan dais — pieces yang lepas */}
        <mesh
          position={[-DAIS_W / 2 + 0.4, 0.05, DAIS_Z + DAIS_D / 2 + 0.4]}
          rotation={[0.3, 0.6, 0.2]}
        >
          <boxGeometry args={[0.3, 0.1, 0.25]} />
          <meshStandardMaterial color="#3a2818" roughness={1} />
        </mesh>
        <mesh
          position={[-DAIS_W / 2 + 0.1, 0.03, DAIS_Z + DAIS_D / 2 + 0.7]}
          rotation={[0.1, 1.1, 0.4]}
        >
          <boxGeometry args={[0.18, 0.06, 0.2]} />
          <meshStandardMaterial color="#2a1810" roughness={1} />
        </mesh>
      </>
    )}
  </>
);

// StageCurtainSwag — fabric drape di top back wall (di bawah crown
// molding) + 2 side curtain legs framing back wall. Restored: deep red
// velvet w/ gold tassels. Drought: muted.
const StageCurtainSwag = ({ restored }) => {
  const swagRefs = useRef([]);
  const legRefs = useRef([]);
  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < swagRefs.current.length; i += 1) {
      const m = swagRefs.current[i];
      if (m) m.rotation.x = Math.sin(t * 0.45 + i * 0.4) * 0.015;
    }
    for (let i = 0; i < legRefs.current.length; i += 1) {
      const m = legRefs.current[i];
      if (m) m.rotation.z = Math.sin(t * 0.35 + i * 0.6) * 0.012;
    }
  });
  const swagY = WALL_H - 0.65;
  const swagZ = BACK_WALL_Z + 0.15;
  const railColor = restored ? '#5a3a20' : '#3a2418';
  const railEm = restored ? '#a87830' : '#000000';
  const fabricColor = restored ? '#7a1818' : '#3a1010';
  const fabricEm = restored ? '#3a0808' : '#000000';
  return (
    <>
      {/* Curtain rail — horizontal bar mounted di back wall, swag
          panels gantung dari sini supaya gak keliatan melayang. */}
      <mesh
        position={[0, swagY + 0.55, swagZ - 0.02]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.06, 0.06, GALLERY_W - 0.5, 8]} />
        <meshStandardMaterial
          color={railColor}
          emissive={railEm}
          emissiveIntensity={restored ? 0.2 : 0}
          roughness={0.5}
          metalness={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* Rail mounts — 2 brackets di sisi yang anchor rail ke wall */}
      {[-GALLERY_W / 2 + 0.4, GALLERY_W / 2 - 0.4].map((x, i) => (
        <mesh
          key={`rail-mount-${i}`}
          position={[x, swagY + 0.55, swagZ + 0.04]}
        >
          <boxGeometry args={[0.1, 0.18, 0.12]} />
          <meshStandardMaterial color="#3a2418" roughness={0.9} />
        </mesh>
      ))}
      {/* Top swag — 6 scallop drape panels across back wall width
          (wall sekarang 14 wide, sebelumnya 10) */}
      {[-5, -3, -1, 1, 3, 5].map((x, i) => (
        <mesh
          key={`swag-${i}`}
          ref={(m) => {
            swagRefs.current[i] = m;
          }}
          position={[x, swagY, swagZ]}
        >
          <planeGeometry args={[2.1, 1]} />
          <meshStandardMaterial
            color={fabricColor}
            emissive={fabricEm}
            emissiveIntensity={restored ? 0.18 : 0}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Tassels — gold beads di tiap swag join, restored only */}
      {restored &&
        [-4, -2, 0, 2, 4].map((x, i) => (
          <mesh key={`tassel-${i}`} position={[x, swagY - 0.5, swagZ + 0.02]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial
              color="#d4a848"
              emissive="#a87830"
              emissiveIntensity={0.4}
              roughness={0.5}
              metalness={0.5}
              toneMapped={false}
            />
          </mesh>
        ))}
      {/* Side legs — vertical curtain panels framing back wall, dari
          swag turun ke dais level */}
      {[-DAIS_W / 2 - 0.5, DAIS_W / 2 + 0.5].map((x, i) => (
        <mesh
          key={`leg-${i}`}
          ref={(m) => {
            legRefs.current[i] = m;
          }}
          position={[x, (swagY + DAIS_H) / 2, swagZ]}
        >
          <planeGeometry args={[0.8, swagY - DAIS_H]} />
          <meshStandardMaterial
            color={restored ? '#6a1414' : '#2a0c0c'}
            emissive={restored ? '#2a0606' : '#000000'}
            emissiveIntensity={restored ? 0.12 : 0}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Leg tie-back — gold cord cinch di mid-height legs, restored */}
      {restored &&
        [-DAIS_W / 2 - 0.5, DAIS_W / 2 + 0.5].map((x, i) => (
          <mesh
            key={`legtie-${i}`}
            position={[x, (swagY + DAIS_H) / 2 - 0.2, swagZ + 0.06]}
          >
            <torusGeometry args={[0.18, 0.03, 6, 12]} />
            <meshStandardMaterial
              color="#d4a848"
              emissive="#a87830"
              emissiveIntensity={0.35}
              roughness={0.5}
              metalness={0.4}
            />
          </mesh>
        ))}
      {/* Backdrop banner — italic serif text di tengah back wall di
          atas curtain swag. HTML transform-positioned, restored only. */}
      {restored && (
        <Html
          position={[0, swagY + 0.7, swagZ + 0.02]}
          center
          distanceFactor={5}
          occlude={false}
          transform
        >
          <div
            className="pointer-events-none select-none text-center"
            style={{ width: 320 }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.4em] mb-1"
              style={{ color: '#d4a848' }}
            >
              ✦ ✦ ✦
            </div>
            <div
              className="text-[20px] leading-tight"
              style={{
                color: '#f4d8a0',
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
            >
              Sorotan Kebaikan
            </div>
          </div>
        </Html>
      )}
    </>
  );
};

// StageLectern — small wooden podium di center dais. Symbolic panggung
// prop "panggung nungguin satu cerita yang berani dipentasin". Restored
// dapet gold trim + lamp baca; drought wood polos.
const StageLectern = ({ restored }) => {
  const lampMatRef = useRef();
  useFrame((state) => {
    if (lampMatRef.current && restored) {
      const t = state.clock.elapsedTime;
      lampMatRef.current.emissiveIntensity = 0.65 + Math.sin(t * 0.7) * 0.1;
    }
  });
  // Drought: lectern tipped over di lantai depan dais (rebah ke
  // samping). Restored: berdiri tegak di center dais.
  const lecternPosition = restored
    ? [0, DAIS_H, DAIS_Z]
    : [0.8, 0.4, DAIS_Z + DAIS_D / 2 + 0.4];
  const lecternRotation = restored ? [0, 0, 0] : [0, 0.3, Math.PI / 2 - 0.2];
  return (
    <group position={lecternPosition} rotation={lecternRotation}>
      {/* Lectern base — wider bottom */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.55, 0.8, 0.5]} />
        <meshStandardMaterial
          color={restored ? '#7a5028' : '#3a2818'}
          roughness={0.85}
        />
      </mesh>
      {/* Lectern top — angled writing surface */}
      <mesh position={[0, 0.86, 0]} rotation={[-Math.PI / 8, 0, 0]}>
        <boxGeometry args={[0.55, 0.05, 0.4]} />
        <meshStandardMaterial
          color={restored ? '#9a6838' : '#4a3820'}
          roughness={0.75}
        />
      </mesh>
      {/* Gold band trim — restored */}
      {restored && (
        <mesh position={[0, 0.05, 0.26]}>
          <boxGeometry args={[0.56, 0.04, 0.02]} />
          <meshStandardMaterial
            color="#d4a848"
            emissive="#a87830"
            emissiveIntensity={0.3}
            roughness={0.5}
            metalness={0.5}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* Reading lamp — small bulb di top, restored only */}
      {restored && (
        <>
          <mesh position={[0.18, 0.95, 0.05]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 6]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>
          <mesh position={[0.18, 1.05, 0.08]} rotation={[Math.PI / 4, 0, 0]}>
            <coneGeometry args={[0.06, 0.08, 8]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>
          <mesh position={[0.18, 1.04, 0.13]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial
              ref={lampMatRef}
              color="#f4d8a0"
              emissive="#f4c478"
              emissiveIntensity={0.65}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={[0.18, 1.02, 0.15]}
            color="#f4d8a0"
            intensity={0.3}
            distance={1.5}
            decay={2}
          />
        </>
      )}
    </group>
  );
};

// VolumetricBeams — visible light cones dari track lights ke dais.
// Additive blending, transparent. Restored only.
const VolumetricBeams = ({ restored }) => {
  if (!restored) return null;
  const positions = [-2.4, -0.8, 0.8, 2.4];
  const trackZ = BACK_WALL_Z + 2.2;
  return (
    <>
      {positions.map((x, i) => {
        // Beam angled dari track posisi turun ke dais center
        const beamLength = 4.5;
        return (
          <mesh
            key={`vbeam-${i}`}
            position={[x, TRACK_BEAM_Y - 1.1, trackZ - 0.7]}
            rotation={[0.3, 0, 0]}
          >
            <coneGeometry args={[0.7, beamLength, 12, 1, true]} />
            <meshBasicMaterial
              color="#f4d8a0"
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </>
  );
};

// StageDustMotes — small particles floating di stage area, kasih
// atmospheric depth. Restored only.
const StageDustMotes = ({ count = 20 }) => {
  const groupRef = useRef();
  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i += 1) {
      arr.push({
        x: ((i * 13) % 100) / 100 * 6 - 3,
        y: 0.8 + ((i * 17) % 100) / 100 * 3,
        z: DAIS_Z + ((i * 23) % 100) / 100 * 1.5 - 0.5,
        phase: ((i * 31) % 100) / 100 * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < groupRef.current.children.length; i += 1) {
      const m = groupRef.current.children[i];
      const p = positions[i];
      if (!m || !p) continue;
      m.position.y = p.y + Math.sin(t * 0.3 + p.phase) * 0.2;
      m.position.x = p.x + Math.cos(t * 0.2 + p.phase) * 0.15;
    }
  });
  return (
    <group ref={groupRef}>
      {positions.map((p, i) => (
        <mesh key={`stage-dust-${i}`} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.025, 4, 3]} />
          <meshBasicMaterial
            color="#f4e8a0"
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// DaisStepLight — emissive strip under dais front lip, kasih warm
// glow di edge dais. Restored only.
const DaisStepLight = ({ restored }) => {
  const matRef = useRef();
  useFrame((state) => {
    if (matRef.current && restored) {
      const t = state.clock.elapsedTime;
      matRef.current.emissiveIntensity = 0.55 + Math.sin(t * 0.4) * 0.08;
    }
  });
  if (!restored) return null;
  return (
    <mesh position={[0, 0.04, DAIS_Z + DAIS_D / 2 + 0.04]}>
      <boxGeometry args={[DAIS_W - 0.2, 0.02, 0.02]} />
      <meshStandardMaterial
        ref={matRef}
        color="#f4d8a0"
        emissive="#f4c478"
        emissiveIntensity={0.55}
        toneMapped={false}
      />
    </mesh>
  );
};

// DaisFootlights — 5 small emissive disks di front edge of dais,
// pointing up + warm point lights. Restored only.
const DaisFootlights = ({ restored }) => {
  const matRefs = useRef([]);
  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < matRefs.current.length; i += 1) {
      const mat = matRefs.current[i];
      if (!mat) continue;
      mat.emissiveIntensity = 0.7 + Math.sin(t * 1.2 + i * 0.5) * 0.12;
    }
  });
  if (!restored) return null;
  const positions = [-1.6, -0.8, 0, 0.8, 1.6];
  const y = DAIS_H + 0.05;
  const z = DAIS_Z + DAIS_D / 2 - 0.08;
  return (
    <>
      {positions.map((x, i) => (
        <group key={`foot-${i}`} position={[x, y, z]}>
          {/* Housing — small dome */}
          <mesh>
            <sphereGeometry args={[0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#2a1810" roughness={0.95} />
          </mesh>
          {/* Bulb disk */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.04, 12]} />
            <meshStandardMaterial
              ref={(m) => {
                matRefs.current[i] = m;
              }}
              color="#f4d8a0"
              emissive="#f4c478"
              emissiveIntensity={0.7}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={[0, 0.1, 0]}
            color="#f4d8a0"
            intensity={0.18}
            distance={1.5}
            decay={2}
          />
        </group>
      ))}
    </>
  );
};

// PottedPlants — small leafy plants di 2 corners (back-left + back-right
// di depan wall), kasih green accent + life. Restored only.
const PottedPlants = ({ restored }) => {
  // Drought: pots empty + 1 tipped, no leaves. Restored: full leaves.
  const corners = [
    { x: -SIDE_WALL_X + 0.8, z: BACK_WALL_Z + 0.8, tipped: false },
    { x: SIDE_WALL_X - 0.8, z: BACK_WALL_Z + 0.8, tipped: true },
  ];
  return (
    <>
      {corners.map((c, i) => {
        // Drought tipped: rotate pot lying on side + offset position
        const isTipped = !restored && c.tipped;
        const potRotation = isTipped ? [Math.PI / 2 - 0.3, 0, 0.4] : [0, 0, 0];
        const potOffset = isTipped ? [0.3, 0, 0.4] : [0, 0, 0];
        const potColor = restored ? '#a85838' : '#5a3018';
        const potEmI = restored ? 0.08 : 0;
        return (
          <group
            key={`plant-${i}`}
            position={[c.x + potOffset[0], potOffset[1], c.z + potOffset[2]]}
            rotation={potRotation}
          >
            {/* Pot — terracotta tapered */}
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.28, 0.22, 0.5, 12]} />
              <meshStandardMaterial
                color={potColor}
                emissive="#5a2818"
                emissiveIntensity={potEmI}
                roughness={0.9}
              />
            </mesh>
            {/* Pot rim — slightly darker */}
            <mesh position={[0, 0.52, 0]}>
              <cylinderGeometry args={[0.3, 0.28, 0.06, 12]} />
              <meshStandardMaterial
                color={restored ? '#7a3818' : '#3a1808'}
                roughness={0.95}
              />
            </mesh>
            {/* Soil — only kalau pot upright */}
            {!isTipped && (
              <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.26, 0.26, 0.04, 12]} />
                <meshStandardMaterial color="#3a2010" roughness={1} />
              </mesh>
            )}
            {/* Leaf cluster — restored only (green vibrant) */}
            {restored &&
              [
                { x: 0, y: 0.75, z: 0, s: 0.25 },
                { x: 0.18, y: 0.7, z: 0.05, s: 0.18 },
                { x: -0.16, y: 0.72, z: -0.06, s: 0.2 },
                { x: 0.04, y: 0.95, z: 0.1, s: 0.22 },
                { x: -0.1, y: 0.88, z: 0.12, s: 0.16 },
                { x: 0.12, y: 0.85, z: -0.14, s: 0.18 },
              ].map((leaf, j) => (
                <mesh
                  key={`leaf-${i}-${j}`}
                  position={[leaf.x, leaf.y, leaf.z]}
                >
                  <sphereGeometry args={[leaf.s, 8, 6]} />
                  <meshStandardMaterial
                    color="#4a8038"
                    emissive="#2a5020"
                    emissiveIntensity={0.18}
                    roughness={0.85}
                  />
                </mesh>
              ))}
            {/* Dead twig sticking out — drought upright pot only */}
            {!restored && !isTipped && (
              <mesh
                position={[0.06, 0.7, 0]}
                rotation={[0, 0, 0.2]}
              >
                <cylinderGeometry args={[0.02, 0.015, 0.4, 5]} />
                <meshStandardMaterial color="#2a1810" roughness={1} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
};

// FloorMist — subtle additive layer di low y, slow rotation, atmospheric
// depth. Restored more visible drpd drought.
const FloorMist = ({ restored }) => {
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.z = state.clock.elapsedTime * 0.04;
  });
  return (
    <mesh ref={meshRef} position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.5, 7, 48]} />
      <meshBasicMaterial
        color={restored ? '#d4a878' : '#6a5848'}
        transparent
        opacity={restored ? 0.05 : 0.03}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// PosterFrame — wall-mounted poster (no rope, mounted on wall surface).
// Frame + photo + title strip. Replace HangingBanner.
const POSTER_W = 1.7;
const POSTER_H = 2.4;
const POSTER_PHOTO_H = 1.6;

const PosterTexture = ({ src }) => {
  const texture = useLoader(THREE.TextureLoader, src);
  return (
    <meshStandardMaterial
      map={texture}
      roughness={0.9}
      side={THREE.DoubleSide}
    />
  );
};

const PosterPlaceholder = () => (
  <meshStandardMaterial
    color="#3a2818"
    roughness={1}
    side={THREE.DoubleSide}
  />
);

const PosterFrame = ({ entry, index, restored, hovered, onClick, onHover, onUnhover }) => {
  const innerRef = useRef();
  const frameMatRef = useRef();
  const pos = WALL_POSITIONS[index % WALL_POSITIONS.length];
  const cat = KEBAIKAN_CATEGORIES.find((c) => c.id === entry.category);

  useFrame((_, delta) => {
    if (!innerRef.current) return;
    const factor = Math.min(delta * 8, 1);
    // Subtle "lift" forward (positive local z) saat hover — kerasa
    // mendekat ke viewer tanpa fly off wall.
    const targetZ = hovered ? 0.06 : 0;
    innerRef.current.position.z = lerp(innerRef.current.position.z, targetZ, factor);
    if (frameMatRef.current) {
      const targetEm = hovered && restored ? 0.4 : restored ? 0.12 : 0;
      frameMatRef.current.emissiveIntensity = lerp(
        frameMatRef.current.emissiveIntensity,
        targetEm,
        factor,
      );
    }
  });

  return (
    <group position={[pos.x, pos.y, pos.z]} rotation={[0, pos.ry, 0]}>
      <group
        ref={innerRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover?.();
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {/* Frame backing — wood plate slightly larger than poster */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[POSTER_W + 0.18, POSTER_H + 0.18, 0.05]} />
          <meshStandardMaterial
            ref={frameMatRef}
            color="#5a3a20"
            emissive="#a87848"
            emissiveIntensity={restored ? 0.12 : 0}
            roughness={0.9}
          />
        </mesh>
        {/* Inner mat — light cream behind photo, restored only */}
        {restored && (
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[POSTER_W, POSTER_H]} />
            <meshStandardMaterial
              color="#d4c8a0"
              roughness={0.95}
            />
          </mesh>
        )}
        {/* Photo panel — atas */}
        <mesh position={[0, (POSTER_H - POSTER_PHOTO_H) / 2 - 0.05, 0.05]}>
          <planeGeometry args={[POSTER_W - 0.2, POSTER_PHOTO_H]} />
          {entry.proofUrl ? (
            <Suspense fallback={<PosterPlaceholder />}>
              <PosterTexture src={entry.proofUrl} />
            </Suspense>
          ) : (
            <PosterPlaceholder />
          )}
        </mesh>
        {/* Title strip — bawah, lighter background di restored */}
        <mesh position={[0, -(POSTER_H - 0.7) / 2 + 0.05, 0.05]}>
          <planeGeometry args={[POSTER_W - 0.2, 0.65]} />
          <meshStandardMaterial
            color={restored ? '#e8dcb0' : '#5a4838'}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* HTML label di title strip */}
        <Html
          position={[0, -(POSTER_H - 0.7) / 2 + 0.05, 0.07]}
          center
          distanceFactor={4}
          occlude={false}
        >
          <div
            className="pointer-events-none select-none text-center"
            style={{ width: '170px' }}
          >
            {cat && (
              <div
                className="text-[8px] uppercase tracking-[0.2em] mb-0.5"
                style={{ color: restored ? '#7a4820' : '#a87848' }}
              >
                {cat.label}
              </div>
            )}
            <div
              className="text-[10px] leading-tight"
              style={{
                color: restored ? '#2a1810' : '#d4c8a0',
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {entry.title}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};

// PlaceholderFrame — empty slot di walls untuk donasi yg belum ada.
// Muncul di slot WALL_POSITIONS yg gak ke-fill sama KEBAIKAN_ENTRIES.
// Restored only (drought walls terlalu gelap untuk visible). Signal
// "ruang ini disediain untuk sorotan baru".
const PlaceholderFrame = ({ slotIdx, restored }) => {
  const pos = WALL_POSITIONS[slotIdx];
  if (!pos) return null;
  return (
    <group position={[pos.x, pos.y, pos.z]} rotation={[0, pos.ry, 0]}>
      {/* Frame backing — muted wood, transparent */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[POSTER_W + 0.18, POSTER_H + 0.18, 0.04]} />
        <meshStandardMaterial
          color={restored ? '#5a3a20' : '#3a2818'}
          roughness={0.9}
          transparent
          opacity={restored ? 0.55 : 0.7}
        />
      </mesh>
      {/* Inner panel — muted, dashed-style hint */}
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[POSTER_W - 0.05, POSTER_H - 0.05]} />
        <meshStandardMaterial
          color={restored ? '#b8a888' : '#5a4838'}
          emissive={restored ? '#3a2818' : '#1a1008'}
          emissiveIntensity={restored ? 0.08 : 0.18}
          roughness={0.95}
          transparent
          opacity={restored ? 0.6 : 0.7}
        />
      </mesh>
      {/* HTML label — placeholder text */}
      <Html
        position={[0, 0, 0.05]}
        center
        distanceFactor={4}
        occlude={false}
      >
        <div
          className="pointer-events-none select-none text-center"
          style={{ width: 140 }}
        >
          <div
            className="text-[8px] uppercase tracking-[0.3em] mb-1"
            style={{
              color: restored ? '#7a4820' : '#c8a878',
              opacity: 0.7,
            }}
          >
            Slot kosong
          </div>
          <div
            className="text-[10px] leading-tight"
            style={{
              color: restored ? '#3a2818' : '#e8d4a8',
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              opacity: 0.8,
            }}
          >
            Sorotan berikutnya
          </div>
          <div
            className="text-[7px] mt-1.5 tracking-wider"
            style={{
              color: restored ? '#7a4820' : '#a87848',
              opacity: 0.55,
            }}
          >
            ··· nungguin diisi
          </div>
        </div>
      </Html>
    </group>
  );
};

// SceneLights — ambient + key directional. Restored: warm cream tone
// brighter overall. Drought: dim warm brown but cukup visible untuk
// pengunjung baca konten + lihat layout.
const SceneLights = ({ restored }) => (
  <>
    <ambientLight
      intensity={restored ? 0.7 : 0.7}
      color={restored ? '#f4d8a8' : '#a07058'}
    />
    <directionalLight
      position={[6, 10, 6]}
      intensity={restored ? 0.65 : 0.65}
      color={restored ? '#f4e0b8' : '#d8a888'}
    />
    {/* Fill light dari depan biar wall + posters kebaca */}
    <directionalLight
      position={[0, 5, 8]}
      intensity={restored ? 0.4 : 0.5}
      color={restored ? '#e8d4a8' : '#a87858'}
    />
    {/* Hemispheric ambient — kasih warm sky tint dari atas + dark floor
        bouncenya ke bawah */}
    <hemisphereLight
      skyColor={restored ? '#f4d8a0' : '#c89070'}
      groundColor={restored ? '#a87848' : '#4a3020'}
      intensity={restored ? 0.4 : 0.45}
    />
  </>
);

// FlyInCamera — intro animation top-down ke front viewing position
const FlyInCamera = ({ onComplete }) => {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);
  useFrame((_, delta) => {
    if (doneRef.current) return;
    elapsedRef.current = Math.min(elapsedRef.current + delta, FLY_IN_DURATION);
    const t = elapsedRef.current / FLY_IN_DURATION;
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.x = lerp(CAMERA_START[0], CAMERA_END[0], eased);
    camera.position.y = lerp(CAMERA_START[1], CAMERA_END[1], eased);
    camera.position.z = lerp(CAMERA_START[2], CAMERA_END[2], eased);
    camera.lookAt(ORBIT_TARGET[0], ORBIT_TARGET[1], ORBIT_TARGET[2]);
    if (t >= 1 && !doneRef.current) {
      doneRef.current = true;
      onComplete?.();
    }
  });
  return null;
};

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat pameran...
  </div>
);

// ============================================================
// Main scene composition
// ============================================================

const Scene = ({
  restored,
  isMobile,
  flyInActive,
  hoveredBannerId,
  onBannerHover,
  onBannerClick,
  onFlyInComplete,
}) => {
  const entries = KEBAIKAN_ENTRIES;
  const controlsRef = useRef();
  const idleTimerRef = useRef();
  const [autoRotate, setAutoRotate] = useState(false);

  // Idle auto-rotate: setelah 6 detik user gak interact, kamera pelan
  // berputar. Resume manual control begitu user drag/zoom/touch.
  useEffect(() => {
    if (flyInActive) return undefined;
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const armIdle = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setAutoRotate(true), 6000);
    };
    const onStart = () => {
      setAutoRotate(false);
      clearTimeout(idleTimerRef.current);
    };
    const onEnd = () => {
      armIdle();
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    armIdle();
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      clearTimeout(idleTimerRef.current);
    };
  }, [flyInActive]);

  // Pause auto-rotate saat user hover banner (kerasa weird kalau kamera
  // muter sambil user fokus baca poster).
  useEffect(() => {
    if (hoveredBannerId && autoRotate) setAutoRotate(false);
  }, [hoveredBannerId, autoRotate]);

  return (
    <>
      <NightSky restored={restored} />
      <SceneLights restored={restored} />
      <ExhibitionFloor restored={restored} />
      <FloorMist restored={restored} />
      <GalleryWalls restored={restored} />
      <WallCracks restored={restored} />
      <GallerySconces restored={restored} />
      <WallMedallions restored={restored} />
      <CofferedCeilingBeams restored={restored} />
      <Chandelier restored={restored} />
      <CeilingTrackLights restored={restored} />
      <AisleFloorLights restored={restored} />
      <DroughtDebris restored={restored} />
      <PanggungDais restored={restored} />
      <StageCurtainSwag restored={restored} />
      <DaisFootlights restored={restored} />
      <DaisStepLight restored={restored} />
      <StageLectern restored={restored} />
      <VolumetricBeams restored={restored} />
      {restored && <StageDustMotes count={isMobile ? 12 : 24} />}
      <PottedPlants restored={restored} />
      <AudienceKursi restored={restored} />
      <ViewingBench restored={restored} z={2.8} showBooks={true} />
      <ViewingBench restored={restored} z={4.2} showBooks={false} />
      {entries.map((entry, i) => (
        <PosterFrame
          key={entry.id}
          entry={entry}
          index={i}
          restored={restored}
          hovered={hoveredBannerId === entry.id}
          onHover={() => onBannerHover(entry.id)}
          onUnhover={() => onBannerHover(null)}
          onClick={() => onBannerClick(entry)}
        />
      ))}
      {/* Placeholder frames untuk slot WALL_POSITIONS yg belum kepake.
          Signal "ruang ini disediain untuk sorotan baru". */}
      {Array.from({
        length: Math.max(0, WALL_POSITIONS.length - entries.length),
      }).map((_, i) => (
        <PlaceholderFrame
          key={`placeholder-${i}`}
          slotIdx={entries.length + i}
          restored={restored}
        />
      ))}
      {flyInActive && <FlyInCamera onComplete={onFlyInComplete} />}
      <OrbitControls
        ref={controlsRef}
        target={ORBIT_TARGET}
        enabled={!flyInActive}
        enablePan={false}
        enableZoom
        minDistance={5}
        maxDistance={isMobile ? 24 : 22}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.9}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        autoRotate={autoRotate && !flyInActive}
        autoRotateSpeed={0.3}
      />
    </>
  );
};

// ============================================================
// HTML overlays
// ============================================================

const ProofLightbox = ({ images, index, entryTitle, onClose, onPrev, onNext, onSelect }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  if (!images || images.length === 0) return null;
  const total = images.length;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-sm panggung-lightbox-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <img
        key={images[index]}
        src={images[index]}
        alt={`Foto ${index + 1} dari ${total} — ${entryTitle}`}
        className="max-w-[92vw] max-h-[80vh] object-contain rounded-md shadow-2xl panggung-lightbox-img-in"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="fixed top-5 left-5 text-amber-200/55 text-[10px] uppercase tracking-[0.3em] pointer-events-none">
        Foto {index + 1} / {total}
      </div>
      <div
        className="fixed top-5 left-1/2 -translate-x-1/2 text-amber-100/85 text-sm italic pointer-events-none whitespace-nowrap max-w-[60vw] overflow-hidden text-ellipsis"
        style={{ fontFamily: '"Fraunces Variable", serif' }}
      >
        {entryTitle}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="Sebelumnya"
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="Berikutnya"
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((_, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                onClick={() => onSelect?.(i)}
                aria-label={`Foto ${i + 1}`}
                className={`transition-all rounded-full ${
                  i === index ? 'w-6 h-1.5 bg-amber-200/90' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const STATUS_LABEL = {
  proposed: { label: 'Diusulkan', tone: 'bg-white/10 text-white/65 border-white/20' },
  approved: { label: 'Disetujui', tone: 'bg-amber-300/15 text-amber-200/85 border-amber-300/40' },
  executed: { label: 'Terlaksana', tone: 'bg-emerald-400/15 text-emerald-200/90 border-emerald-300/40' },
};

const DonationOverlay = ({ entry, onClose, onOpenLightbox }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!entry) return null;
  const cat = KEBAIKAN_CATEGORIES.find((c) => c.id === entry.category);
  const status = STATUS_LABEL[entry.status] || STATUS_LABEL.proposed;
  const amountLabel = formatRupiah(entry.amount);
  const dateLabel = formatDate(entry.executedAt || entry.proposedAt);
  const images = Array.isArray(entry.gallery) && entry.gallery.length > 0
    ? entry.gallery
    : entry.proofUrl
      ? [entry.proofUrl]
      : [];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4 pb-6 pt-20 panggung-lightbox-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-overlay-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl border border-amber-200/15 bg-[#1a1410]/95 shadow-2xl panggung-lightbox-img-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/55 hover:bg-white/15 text-white/85 flex items-center justify-center transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => onOpenLightbox(0)}
            className="block w-full aspect-[16/9] overflow-hidden bg-black/40 relative"
            aria-label="Lihat foto bukti"
          >
            <img
              src={images[0]}
              alt={`Sorotan ${entry.title}`}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-sm text-[10px] uppercase tracking-[0.2em] text-amber-100/85">
                <i className="ri-image-line text-xs" />
                {images.length} foto
              </span>
            )}
            <span
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 56px rgba(0,0,0,0.6)' }}
            />
            {cat && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-[10px] uppercase tracking-[0.2em] text-amber-100/90 border border-amber-200/25">
                <i className={`${cat.icon} text-xs`} />
                {cat.label}
              </span>
            )}
          </button>
        )}
        <div className="px-6 py-6 md:px-8 md:py-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.18em] border ${status.tone}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
              {status.label}
            </span>
            {dateLabel && (
              <span className="text-[10px] uppercase tracking-[0.25em] text-amber-200/55">
                {dateLabel}
              </span>
            )}
          </div>
          <h2
            id="donation-overlay-title"
            className="text-2xl sm:text-3xl text-white mb-4 leading-tight"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
            }}
          >
            {entry.title}
          </h2>
          {entry.description && (
            <p
              className="text-sm sm:text-base text-white/75 leading-relaxed mb-5"
              style={{ fontFamily: '"Fraunces Variable", serif' }}
            >
              {entry.description}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 mb-5 pt-5 border-t border-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
                Kontributor
              </p>
              <p className="text-sm text-white/85 inline-flex items-center gap-1.5">
                <i className="ri-user-heart-line text-amber-200/65" />
                {entry.contributorCredit || 'Anonim'}
              </p>
            </div>
            {entry.recipient && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
                  Penerima
                </p>
                <p className="text-sm text-white/85">{entry.recipient}</p>
              </div>
            )}
            {amountLabel && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
                  Nilai
                </p>
                <p className="text-sm text-amber-100/90 tabular-nums">
                  {amountLabel}
                </p>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="pt-5 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">
                Foto bukti ({images.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <button
                    key={`thumb-${i}`}
                    type="button"
                    onClick={() => onOpenLightbox(i)}
                    className="aspect-square overflow-hidden rounded-md bg-black/40 hover:ring-2 hover:ring-amber-200/50 transition-all"
                    aria-label={`Foto ${i + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover transition-transform hover:scale-110"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Header = ({ restored }) => (
  <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between pointer-events-none">
    <Link
      to="/armeniacaTown/peta"
      className="pointer-events-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/55 hover:text-white/85 transition px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10"
    >
      <span aria-hidden="true">←</span> Balik ke peta
    </Link>
    <div className="text-right pointer-events-none">
      <div
        className="text-[10px] uppercase tracking-[0.4em]"
        style={{ color: restored ? '#f4d8a0' : '#c8a060' }}
      >
        {restored ? 'Lampu nyala' : 'Hancur lebur'}
      </div>
      <div
        className="text-base sm:text-lg text-white mt-0.5"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Panggung Terbuka
      </div>
    </div>
  </div>
);

const FooterHint = ({ entriesCount, restored }) => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[92vw] pointer-events-none">
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/55">
      <i className="ri-image-line text-amber-200/65" />
      <span>{entriesCount} sorotan</span>
      <span className="opacity-40">·</span>
      <span>Klik poster untuk detail</span>
      {!restored && (
        <>
          <span className="opacity-40">·</span>
          <span className="text-amber-200/70">Drought</span>
        </>
      )}
    </div>
  </div>
);

// ============================================================
// Page
// ============================================================

const TamanPanggungSorotan = ({ restored = false }) => {
  const isMobile = useIsMobile();
  const [flyInActive, setFlyInActive] = useState(true);
  const [hoveredBannerId, setHoveredBannerId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [lightbox, setLightbox] = useState({ images: null, index: 0, title: '' });

  const handleFlyInComplete = useCallback(() => setFlyInActive(false), []);

  const handleBannerHover = useCallback((id) => {
    setHoveredBannerId(id);
  }, []);

  const handleBannerClick = useCallback((entry) => {
    if (flyInActive) return;
    setSelectedEntry(entry);
  }, [flyInActive]);

  const handleOverlayClose = useCallback(() => setSelectedEntry(null), []);

  const handleOpenLightbox = useCallback((startIdx) => {
    if (!selectedEntry) return;
    const imgs = Array.isArray(selectedEntry.gallery) && selectedEntry.gallery.length > 0
      ? selectedEntry.gallery
      : selectedEntry.proofUrl
        ? [selectedEntry.proofUrl]
        : [];
    setLightbox({ images: imgs, index: startIdx, title: selectedEntry.title });
  }, [selectedEntry]);

  const handleLightboxClose = useCallback(() => {
    setLightbox({ images: null, index: 0, title: '' });
  }, []);
  const handleLightboxNext = useCallback(() => {
    setLightbox((prev) => {
      if (!prev.images || prev.images.length <= 1) return prev;
      return { ...prev, index: (prev.index + 1) % prev.images.length };
    });
  }, []);
  const handleLightboxPrev = useCallback(() => {
    setLightbox((prev) => {
      if (!prev.images || prev.images.length <= 1) return prev;
      return { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length };
    });
  }, []);
  const handleLightboxSelect = useCallback((i) => {
    setLightbox((prev) => (prev.images ? { ...prev, index: i } : prev));
  }, []);

  return (
    <>
      <Seo
        title={`Panggung Terbuka${restored ? ' (Pulih)' : ''} · ArmeniacaTown`}
        description="Pameran sederhana Panggung Terbuka — sorotan kebaikan dilakukan atas nama Helisma Putri (Eli JKT48). Arsip donasi & aksi nyata Helismiley × Armeniaca."
        path="/armeniacaTown/r5"
      />
      <RotateRecommendation />
      <div
        className="relative w-full h-screen overflow-hidden select-none"
        style={{ background: restored ? '#1f1208' : '#150f0a' }}
      >
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: CAMERA_START, near: 0.1, far: 200 }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera, gl }) => {
              camera.lookAt(ORBIT_TARGET[0], ORBIT_TARGET[1], ORBIT_TARGET[2]);
              gl.toneMappingExposure = 1.4;
            }}
          >
            <Scene
              restored={restored}
              isMobile={isMobile}
              flyInActive={flyInActive}
              hoveredBannerId={hoveredBannerId}
              onBannerHover={handleBannerHover}
              onBannerClick={handleBannerClick}
              onFlyInComplete={handleFlyInComplete}
            />
            {!isMobile && (
              <EffectComposer multisampling={0}>
                <Bloom
                  intensity={0.55}
                  luminanceThreshold={0.74}
                  luminanceSmoothing={0.4}
                  mipmapBlur
                />
                <Vignette eskil={false} offset={0.3} darkness={0.8} />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            )}
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>
        <Header restored={restored} />
        <FooterHint entriesCount={KEBAIKAN_ENTRIES.length} restored={restored} />
        <AmbientAudio position="top-right" />
        <DonationOverlay
          entry={selectedEntry}
          onClose={handleOverlayClose}
          onOpenLightbox={handleOpenLightbox}
        />
        {lightbox.images && (
          <ProofLightbox
            images={lightbox.images}
            index={lightbox.index}
            entryTitle={lightbox.title}
            onClose={handleLightboxClose}
            onPrev={handleLightboxPrev}
            onNext={handleLightboxNext}
            onSelect={handleLightboxSelect}
          />
        )}
        <style>{`
          @keyframes panggungLightboxIn { 0% { opacity: 0; } 100% { opacity: 1; } }
          @keyframes panggungLightboxImgIn { 0% { opacity: 0; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
          .panggung-lightbox-in { animation: panggungLightboxIn 280ms ease-out; }
          .panggung-lightbox-img-in { animation: panggungLightboxImgIn 360ms ease-out; }
        `}</style>
      </div>
    </>
  );
};

export default TamanPanggungSorotan;
