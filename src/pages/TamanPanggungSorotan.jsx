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

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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

// Gallery layout — U-shape opening toward +z (viewer side).
const GALLERY_W = 10;
const GALLERY_D = 6;
const WALL_H = 5;
const BACK_WALL_Z = -3;
const SIDE_WALL_X = 5;
const TRACK_BEAM_Y = 4.6;

const ORBIT_TARGET = [0, 2.4, -0.5];
const CAMERA_START = [0, 10, 2];
const CAMERA_END = [0, 3.2, 6];
const FLY_IN_DURATION = 2.4;

// Posters mounted di walls — 5 slot prioritas: center-back dulu, terus
// side walls, terakhir back-left/right. Single entry pakai slot 0.
const WALL_POSITIONS = [
  { x: 0, y: 2.6, z: BACK_WALL_Z + 0.13, ry: 0 },         // back-center
  { x: -SIDE_WALL_X + 0.13, y: 2.6, z: -0.5, ry: Math.PI / 2 },  // left-wall
  { x: SIDE_WALL_X - 0.13, y: 2.6, z: -0.5, ry: -Math.PI / 2 },  // right-wall
  { x: -2.8, y: 2.6, z: BACK_WALL_Z + 0.13, ry: 0 },      // back-left
  { x: 2.8, y: 2.6, z: BACK_WALL_Z + 0.13, ry: 0 },       // back-right
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
// langit visible above walls).
const NightSky = () => (
  <>
    <mesh>
      <sphereGeometry args={[60, 32, 16]} />
      <meshBasicMaterial color="#0a0608" side={THREE.BackSide} />
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
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[14, 12]} />
      <meshStandardMaterial
        color={restored ? '#a87848' : '#3a2820'}
        roughness={0.85}
      />
    </mesh>
    {[-5, -3, -1, 1, 3, 5].map((x, i) => (
      <mesh
        key={`plank-${i}`}
        position={[x, -0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.03, 12]} />
        <meshStandardMaterial
          color={restored ? '#5a3a20' : '#1a0e08'}
          roughness={1}
        />
      </mesh>
    ))}
    {restored && (
      <>
        {/* Area rug — vibrant deep red dgn warm emissive */}
        <mesh position={[0, -0.03, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.2, 3]} />
          <meshStandardMaterial
            color="#a82828"
            emissive="#7a1818"
            emissiveIntensity={0.22}
            roughness={0.9}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Rug border — gold trim */}
        <mesh position={[0, -0.025, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.95, 2.1, 24]} />
          <meshStandardMaterial
            color="#d4a848"
            emissive="#a87830"
            emissiveIntensity={0.3}
            roughness={0.5}
            metalness={0.4}
            toneMapped={false}
          />
        </mesh>
      </>
    )}
  </>
);

// GalleryWalls — 3 walls U-shape (back + 2 sides). Restored: cream
// warm plaster + gold crown + dark wood baseboard. Drought: dark muted.
const GalleryWalls = ({ restored }) => {
  const wallColor = restored ? '#e4cfa8' : '#3a2c20';
  const wallEmissive = restored ? '#a87848' : '#000000';
  const wallEmI = restored ? 0.06 : 0;
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

// ViewingBench — simple wooden bench, center viewing area facing back.
const ViewingBench = ({ restored }) => (
  <group position={[0, 0, 1.5]}>
    {/* Seat slab */}
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[2.2, 0.1, 0.5]} />
      <meshStandardMaterial
        color={restored ? '#6a4830' : '#3a2818'}
        roughness={0.9}
      />
    </mesh>
    {/* Legs */}
    {[-0.9, 0.9].map((x, i) => (
      <mesh key={`leg-${i}`} position={[x, 0.2, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.4]} />
        <meshStandardMaterial
          color={restored ? '#5a3a20' : '#2a1810'}
          roughness={0.95}
        />
      </mesh>
    ))}
    {/* Plank line on seat — visual detail */}
    <mesh position={[0, 0.456, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.2, 0.02]} />
      <meshStandardMaterial color="#1a0e08" roughness={1} />
    </mesh>
  </group>
);

// IntroPlaque — pedestal dgn welcome card di tengah area, facing back
// wall (sebagai "selamat datang" untuk pengunjung).
const IntroPlaque = ({ restored }) => (
  <group position={[0, 0, 3]}>
    {/* Pedestal column */}
    <mesh position={[0, 0.55, 0]}>
      <boxGeometry args={[0.7, 1.1, 0.4]} />
      <meshStandardMaterial
        color={restored ? '#5a4030' : '#3a2820'}
        roughness={0.95}
      />
    </mesh>
    {/* Top plate */}
    <mesh position={[0, 1.13, 0]}>
      <boxGeometry args={[0.78, 0.05, 0.48]} />
      <meshStandardMaterial color="#3a2418" roughness={0.9} />
    </mesh>
    {/* Plaque card — tilted facing back */}
    <mesh position={[0, 1.18, 0.07]} rotation={[-Math.PI / 6, Math.PI, 0]}>
      <planeGeometry args={[0.6, 0.4]} />
      <meshStandardMaterial
        color={restored ? '#d4c8a0' : '#6a5848'}
        emissive={restored ? '#5a4828' : '#000000'}
        emissiveIntensity={restored ? 0.18 : 0}
        roughness={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
    <Html
      position={[0, 1.22, 0.12]}
      rotation={[-Math.PI / 6, Math.PI, 0]}
      center
      distanceFactor={4}
      occlude={false}
      transform
    >
      <div className="pointer-events-none select-none text-center" style={{ width: 120 }}>
        <div className="text-[7px] uppercase tracking-[0.3em] text-[#5a3818] mb-0.5">
          Selamat datang
        </div>
        <div
          className="text-[9px] text-[#2a1810] leading-tight"
          style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
        >
          Pameran Sorotan Kebaikan
        </div>
        <div className="text-[6px] text-[#5a3818] mt-1 leading-snug">
          Tiap papan = satu cerita. Klik untuk baca.
        </div>
      </div>
    </Html>
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
  const positions = restored ? [-3, -1, 1, 3] : [0];
  return (
    <>
      {/* Track beam — horizontal di atas back wall area */}
      <mesh position={[0, TRACK_BEAM_Y, BACK_WALL_Z + 1.2]}>
        <boxGeometry args={[GALLERY_W - 1, 0.1, 0.12]} />
        <meshStandardMaterial color="#2a1810" roughness={0.9} />
      </mesh>
      {/* Track mounts (2 brackets ke ceiling) */}
      {[-3.5, 3.5].map((x, i) => (
        <mesh
          key={`bracket-${i}`}
          position={[x, TRACK_BEAM_Y + 0.18, BACK_WALL_Z + 1.2]}
        >
          <boxGeometry args={[0.08, 0.36, 0.08]} />
          <meshStandardMaterial color="#2a1810" roughness={0.95} />
        </mesh>
      ))}
      {/* Downlights mounted on track, angled toward back wall */}
      {positions.map((x, i) => (
        <group
          key={`light-${i}`}
          position={[x, TRACK_BEAM_Y - 0.06, BACK_WALL_Z + 1.2]}
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
          position={[0, TRACK_BEAM_Y - 0.4, BACK_WALL_Z + 1.2]}
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
  return (
    <>
      {/* Left wall sconce — facing right (inward) */}
      <group
        position={[-SIDE_WALL_X + 0.16, 2.8, -0.5]}
        rotation={[0, Math.PI / 2, 0]}
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
          intensity={0.45}
          distance={3}
          decay={2}
        />
      </group>
      {/* Right wall sconce — facing left (inward) */}
      <group
        position={[SIDE_WALL_X - 0.16, 2.8, -0.5]}
        rotation={[0, -Math.PI / 2, 0]}
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
          intensity={0.45}
          distance={3}
          decay={2}
        />
      </group>
    </>
  );
};

// PottedPlants — small leafy plants di 2 corners (back-left + back-right
// di depan wall), kasih green accent + life. Restored only.
const PottedPlants = ({ restored }) => {
  if (!restored) return null;
  const corners = [
    { x: -SIDE_WALL_X + 0.8, z: BACK_WALL_Z + 0.8 },
    { x: SIDE_WALL_X - 0.8, z: BACK_WALL_Z + 0.8 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <group key={`plant-${i}`} position={[c.x, 0, c.z]}>
          {/* Pot — terracotta tapered */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.28, 0.22, 0.5, 12]} />
            <meshStandardMaterial
              color="#a85838"
              emissive="#5a2818"
              emissiveIntensity={0.08}
              roughness={0.9}
            />
          </mesh>
          {/* Pot rim — slightly darker */}
          <mesh position={[0, 0.52, 0]}>
            <cylinderGeometry args={[0.3, 0.28, 0.06, 12]} />
            <meshStandardMaterial color="#7a3818" roughness={0.95} />
          </mesh>
          {/* Soil */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 12]} />
            <meshStandardMaterial color="#3a2010" roughness={1} />
          </mesh>
          {/* Leaf cluster — 5-6 sphere green */}
          {[
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
        </group>
      ))}
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

// SceneLights — ambient + key directional. Restored: warm cream tone
// brighter overall. Drought: dim cool brown.
const SceneLights = ({ restored }) => (
  <>
    <ambientLight
      intensity={restored ? 0.7 : 0.2}
      color={restored ? '#f4d8a8' : '#3a2c20'}
    />
    <directionalLight
      position={[6, 10, 6]}
      intensity={restored ? 0.65 : 0.18}
      color={restored ? '#f4e0b8' : '#a89070'}
    />
    {/* Fill light dari depan biar wall + posters kebaca */}
    <directionalLight
      position={[0, 5, 8]}
      intensity={restored ? 0.4 : 0.15}
      color={restored ? '#e8d4a8' : '#4a3828'}
    />
    {/* Hemispheric ambient — kasih warm sky tint dari atas + dark floor
        bouncenya ke bawah, restored only */}
    {restored && (
      <hemisphereLight
        skyColor="#f4d8a0"
        groundColor="#a87848"
        intensity={0.4}
      />
    )}
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
  return (
    <>
      <NightSky />
      <SceneLights restored={restored} />
      <ExhibitionFloor restored={restored} />
      <FloorMist restored={restored} />
      <GalleryWalls restored={restored} />
      <GallerySconces restored={restored} />
      <CeilingTrackLights restored={restored} />
      <PottedPlants restored={restored} />
      <ViewingBench restored={restored} />
      <IntroPlaque restored={restored} />
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
      {flyInActive && <FlyInCamera onComplete={onFlyInComplete} />}
      <OrbitControls
        target={ORBIT_TARGET}
        enabled={!flyInActive}
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={isMobile ? 14 : 12}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
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
        {restored ? 'Lampu nyala' : 'Lampu redup'}
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
        style={{ background: restored ? '#1f1208' : '#0a0608' }}
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
