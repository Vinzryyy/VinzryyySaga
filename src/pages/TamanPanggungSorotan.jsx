/**
 * Taman Kebaikan — Petak R5: Panggung Terbuka — Sorotan Kebaikan.
 *
 * Full 3D anfiteater scene — Three.js / R3F. Audience semicircle 3 row +
 * stage kayu elevated + backdrop wall + tirai velvet + spotlight rig di
 * rafters overhead + volumetric beam cones + hanging banners (donasi)
 * di backdrop. Click banner → DonationOverlay HTML modal dgn detail
 * + photo gallery + ProofLightbox.
 *
 * Konten arsip donasi pull dari data/galeriKebaikan.js (shared dgn /26
 * KebaikanArchive + /galeri-kebaikan disabled). Tiap entry = satu papan
 * sorotan gantung di backdrop, spread across arc.
 *
 * State: prop `restored` dari TamanR5RouteChooser di App.jsx.
 *   locked   (count < 4500)         — chooser redirect ke peta
 *   drought  (4500 ≤ count < 6500)  — 1 spotlight dim, backdrop muted,
 *                                     audience tanpa cushion, banner
 *                                     opacity 0.7, no dust motes
 *   restored (count ≥ 6500)         — 4 spotlight full, dust motes
 *                                     volumetric, audience cushioned,
 *                                     banner full, stage marker glow
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

const STAGE_W = 8;
const STAGE_D = 3.2;
const STAGE_H = 0.5;
const BACKDROP_W = 10;
const BACKDROP_H = 6;
const BACKDROP_Z = -2.4;
const RAFTERS_Y = 5.3;
const AUDIENCE_ROW_GAP = 1.2;
const AUDIENCE_ROW_RISE = 0.35;
const ORBIT_TARGET = [0, 2.8, 0];
const CAMERA_START = [0, 12, 1];
const CAMERA_END = [0, 4.5, 11];
const FLY_IN_DURATION = 2.6;

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

// NightSky — dome background dgn stars sederhana
const NightSky = () => (
  <>
    <mesh>
      <sphereGeometry args={[60, 32, 16]} />
      <meshBasicMaterial color="#0a0608" side={THREE.BackSide} />
    </mesh>
    {/* Stars — random spread di hemisphere atas */}
    {Array.from({ length: 80 }).map((_, i) => {
      const angle = (i / 80) * Math.PI * 2 + ((i * 17) % 11) * 0.04;
      const dist = 40 + ((i * 23) % 13) * 0.6;
      const y = 5 + ((i * 31) % 41) * 0.6;
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

// AnfiteaterFloor — circular stone tile platform di base
const AnfiteaterFloor = ({ restored }) => (
  <>
    <mesh position={[0, -0.05, 1]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[14, 32]} />
      <meshStandardMaterial
        color={restored ? '#3a2820' : '#2a1c14'}
        roughness={1}
      />
    </mesh>
    {/* Concentric stone ring detail — radial tile divisions */}
    {[3.5, 6.5, 9.5, 12.5].map((r, i) => (
      <mesh key={`ring-${i}`} position={[0, 0.005, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.04, r, 48]} />
        <meshStandardMaterial
          color="#1a100a"
          roughness={1}
        />
      </mesh>
    ))}
  </>
);

// AudienceSeating — semicircle 3 rows, masing-masing rise lebih tinggi
// drpd depan. Drought: tanpa cushion + beberapa kursi miring. Restored:
// cushioned + rapih.
const AudienceSeating = ({ restored }) => {
  const rows = [
    { radius: 4.5, count: 7, y: 0 },
    { radius: 5.8, count: 9, y: AUDIENCE_ROW_RISE },
    { radius: 7.1, count: 11, y: AUDIENCE_ROW_RISE * 2 },
  ];
  return (
    <>
      {/* Tier platforms — stone steps yg jadi base kursi */}
      {rows.map((row, rowIdx) => (
        <mesh
          key={`tier-${rowIdx}`}
          position={[0, row.y + 0.05, 1]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[row.radius - 0.4, row.radius + 0.4, 32, 1, Math.PI, Math.PI]}
          />
          <meshStandardMaterial
            color={restored ? '#5a4838' : '#3a2c20'}
            roughness={1}
          />
        </mesh>
      ))}
      {/* Center aisle steps — stone slabs going from front (stage area)
          backward menuju back row, raising di setiap tier. */}
      {[
        { y: 0.06, z: 4.3, w: 0.7, d: 0.6 },
        { y: 0.06 + AUDIENCE_ROW_RISE, z: 5.6, w: 0.7, d: 0.6 },
        { y: 0.06 + AUDIENCE_ROW_RISE * 2, z: 6.9, w: 0.7, d: 0.6 },
      ].map((step, i) => (
        <mesh key={`aisle-${i}`} position={[0, step.y, step.z]}>
          <boxGeometry args={[step.w, 0.04, step.d]} />
          <meshStandardMaterial
            color={restored ? '#7a6048' : '#4a3a2c'}
            roughness={1}
          />
        </mesh>
      ))}
      {/* Kursi individu di tiap row — arc dibagi 2 half dgn aisle gap
          di center. Left half + right half each get half of kursi. */}
      {rows.flatMap((row, rowIdx) =>
        Array.from({ length: row.count }).map((_, i) => {
          const arcStart = Math.PI + 0.25;
          const arcSpan = Math.PI - 0.5;
          const aisleGap = 0.28;
          const halfSpan = (arcSpan - aisleGap) / 2;
          const halfCount = Math.ceil(row.count / 2);
          const isLeft = i < halfCount;
          const halfIdx = isLeft ? i : i - halfCount;
          const halfLen = isLeft ? halfCount : row.count - halfCount;
          const angle = isLeft
            ? arcStart + (halfIdx / Math.max(1, halfLen - 1)) * halfSpan
            : arcStart + halfSpan + aisleGap + (halfIdx / Math.max(1, halfLen - 1)) * halfSpan;
          const px = Math.cos(angle) * row.radius;
          const pz = Math.sin(angle) * row.radius + 1;
          const rotY = -angle - Math.PI / 2;
          const tiltZ = !restored && (i + rowIdx) % 5 === 0 ? 0.15 : 0;
          return (
            <group
              key={`seat-${rowIdx}-${i}`}
              position={[px, row.y + 0.2, pz]}
              rotation={[0, rotY, tiltZ]}
            >
              {/* Seat slab */}
              <mesh>
                <boxGeometry args={[0.46, 0.18, 0.42]} />
                <meshStandardMaterial
                  color={restored ? '#6a5848' : '#4a3a2c'}
                  roughness={1}
                />
              </mesh>
              {/* Back rest */}
              <mesh position={[0, 0.35, -0.18]}>
                <boxGeometry args={[0.46, 0.5, 0.06]} />
                <meshStandardMaterial
                  color={restored ? '#5a4838' : '#3a2c20'}
                  roughness={1}
                />
              </mesh>
              {/* Cushion restored only — small fabric pad di atas seat */}
              {restored && (
                <mesh position={[0, 0.12, 0]}>
                  <boxGeometry args={[0.4, 0.06, 0.34]} />
                  <meshStandardMaterial
                    color="#8a3838"
                    emissive="#3a1818"
                    emissiveIntensity={0.1}
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

// Proscenium — top valance + 2 side leg panels frame stage opening dari
// front. Velvet merah sama dgn backdrop tirai. Top valance ada scallop
// shape (bezier-ish via triangle strip approximation).
const Proscenium = ({ restored }) => {
  const valanceRefs = useRef([]);
  const legRefs = useRef([]);
  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < valanceRefs.current.length; i += 1) {
      const m = valanceRefs.current[i];
      if (m) m.rotation.x = Math.sin(t * 0.5 + i * 0.4) * 0.018;
    }
    for (let i = 0; i < legRefs.current.length; i += 1) {
      const m = legRefs.current[i];
      if (m) m.rotation.z = Math.sin(t * 0.4 + i * 0.6) * 0.012;
    }
  });
  const procZ = 0.7; // front of stage area
  const procY = 4.2;
  const procH = 1.2;
  return (
    <>
      {/* Top valance — 5 scallop drape panels */}
      {[-3.2, -1.6, 0, 1.6, 3.2].map((x, i) => (
        <mesh
          key={`valance-${i}`}
          ref={(m) => {
            valanceRefs.current[i] = m;
          }}
          position={[x, procY + 0.5, procZ]}
        >
          <planeGeometry args={[1.55, procH]} />
          <meshStandardMaterial
            color={restored ? '#7a1818' : '#3a1010'}
            emissive={restored ? '#3a0808' : '#000000'}
            emissiveIntensity={restored ? 0.15 : 0}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Valance rail — horizontal beam atas */}
      <mesh position={[0, procY + 1.1, procZ - 0.05]}>
        <boxGeometry args={[8.5, 0.12, 0.12]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Side legs — 2 vertical curtain panels framing stage */}
      {[-4.0, 4.0].map((x, i) => (
        <mesh
          key={`leg-${i}`}
          ref={(m) => {
            legRefs.current[i] = m;
          }}
          position={[x, procY / 2 + 0.5, procZ]}
        >
          <planeGeometry args={[1.4, procY + 0.5]} />
          <meshStandardMaterial
            color={restored ? '#6a1414' : '#2a0c0c'}
            emissive={restored ? '#2a0606' : '#000000'}
            emissiveIntensity={restored ? 0.12 : 0}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Leg ties — gold cord cinch di middle of each leg, restored only */}
      {restored &&
        [-4.0, 4.0].map((x, i) => (
          <group key={`legtie-${i}`} position={[x, procY / 2, procZ + 0.06]}>
            <mesh>
              <torusGeometry args={[0.22, 0.04, 6, 12]} />
              <meshStandardMaterial
                color="#d4a848"
                emissive="#a87828"
                emissiveIntensity={0.35}
                roughness={0.5}
                metalness={0.4}
              />
            </mesh>
          </group>
        ))}
    </>
  );
};

// Footlights — row di stage front edge, small emissive disks + point
// lights. Restored: 7 lit. Drought: 7 dim/off.
const Footlights = ({ restored }) => {
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
  const positions = [-3.0, -2.0, -1.0, 0, 1.0, 2.0, 3.0];
  const z = -0.5 + STAGE_D / 2 + 0.05;
  const y = STAGE_H + 0.08;
  return (
    <>
      {positions.map((x, i) => (
        <group key={`foot-${i}`} position={[x, y, z]}>
          {/* Housing — small dome */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.07, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#2a1810" roughness={0.95} />
          </mesh>
          {/* Bulb disk */}
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.05, 12]} />
            <meshStandardMaterial
              ref={(m) => {
                matRefs.current[i] = m;
              }}
              color={restored ? '#f4d8a0' : '#5a4838'}
              emissive={restored ? '#f4c478' : '#000000'}
              emissiveIntensity={restored ? 0.7 : 0}
              toneMapped={false}
            />
          </mesh>
          {/* Point light — restored only */}
          {restored && (
            <pointLight
              position={[0, 0.1, 0]}
              color="#f4d8a0"
              intensity={0.15}
              distance={1.6}
              decay={2}
            />
          )}
        </group>
      ))}
    </>
  );
};

// BackdropSconces — 2 mounted wall lamps di backdrop corners, restored
// only. Vertical sconce shape + globe.
const BackdropSconces = ({ restored }) => {
  if (!restored) return null;
  const positions = [-BACKDROP_W / 2 + 1.0, BACKDROP_W / 2 - 1.0];
  return (
    <>
      {positions.map((x, i) => (
        <group key={`sconce-${i}`} position={[x, BACKDROP_H - 1.2, BACKDROP_Z + 0.18]}>
          {/* Mount bracket */}
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.08, 0.4, 0.08]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>
          {/* Arm extending forward */}
          <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.18, 6]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>
          {/* Globe — emissive warm */}
          <mesh position={[0, 0.08, 0.26]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial
              color="#f4d8a0"
              emissive="#f4c478"
              emissiveIntensity={0.8}
              roughness={0.5}
              toneMapped={false}
            />
          </mesh>
          {/* Cup shade above globe */}
          <mesh position={[0, 0.2, 0.26]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.12, 0.1, 8]} />
            <meshStandardMaterial color="#3a2418" roughness={0.95} />
          </mesh>
          <pointLight
            position={[0, 0.08, 0.32]}
            color="#f4d8a0"
            intensity={0.5}
            distance={3}
            decay={2}
          />
        </group>
      ))}
    </>
  );
};

// MicStand — single mic stand di center stage, restored only. Narrative
// "panggung nungguin satu cerita yang berani dipentasin".
const MicStand = ({ restored }) => {
  if (!restored) return null;
  return (
    <group position={[0, STAGE_H, -0.5]}>
      {/* Base disk */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 12]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 1.2, 6]} />
        <meshStandardMaterial color="#2a2218" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Mic head */}
      <mesh position={[0, 1.3, 0.03]} rotation={[Math.PI / 8, 0, 0]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial
          color="#3a2818"
          emissive="#1a0c08"
          emissiveIntensity={0.15}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>
      {/* Mic shaft below head */}
      <mesh position={[0, 1.22, 0.015]} rotation={[Math.PI / 16, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.1, 6]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
};

// FloorMist — subtle additive layer at low y, kasih atmospheric depth.
// Slow rotation untuk visual interest. Tone down kalau drought.
const FloorMist = ({ restored }) => {
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.z = t * 0.04;
  });
  return (
    <mesh
      ref={meshRef}
      position={[0, 0.25, 1]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[1.5, 11, 48]} />
      <meshBasicMaterial
        color={restored ? '#d4a878' : '#6a5848'}
        transparent
        opacity={restored ? 0.06 : 0.04}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// Stage — wooden platform di tengah, slight elevated, facing audience
const Stage = ({ restored }) => {
  const markerMatRef = useRef();
  useFrame((state) => {
    if (markerMatRef.current && restored) {
      const t = state.clock.elapsedTime;
      markerMatRef.current.emissiveIntensity = 0.55 + Math.sin(t * 0.5) * 0.15;
    }
  });
  return (
    <>
      {/* Stage base */}
      <mesh position={[0, STAGE_H / 2, -0.5]}>
        <boxGeometry args={[STAGE_W, STAGE_H, STAGE_D]} />
        <meshStandardMaterial
          color={restored ? '#7a5838' : '#4a3424'}
          roughness={0.85}
        />
      </mesh>
      {/* Stage surface — slightly different shade kasih plank visual */}
      <mesh position={[0, STAGE_H + 0.005, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[STAGE_W - 0.1, STAGE_D - 0.1]} />
        <meshStandardMaterial
          color={restored ? '#8a6848' : '#5a4030'}
          roughness={0.8}
        />
      </mesh>
      {/* Plank divisions — 5 thin lines along stage width */}
      {[-2.5, -1.25, 0, 1.25, 2.5].map((x, i) => (
        <mesh
          key={`plank-${i}`}
          position={[x, STAGE_H + 0.012, -0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.04, STAGE_D - 0.1]} />
          <meshStandardMaterial color="#1a0e08" roughness={1} />
        </mesh>
      ))}
      {/* Stage edge front lip */}
      <mesh position={[0, STAGE_H / 2, -0.5 + STAGE_D / 2 + 0.04]}>
        <boxGeometry args={[STAGE_W + 0.1, STAGE_H + 0.08, 0.08]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Center stage marker — warm glow disc, restored only */}
      {restored && (
        <mesh position={[0, STAGE_H + 0.02, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.7, 24]} />
          <meshStandardMaterial
            ref={markerMatRef}
            color="#f4d8a0"
            emissive="#f4c478"
            emissiveIntensity={0.55}
            transparent
            opacity={0.65}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  );
};

// BackdropWall — tall stone wall behind stage + tirai velvet panels +
// arch detail. Locked/drought: tirai partial sobek. Restored: full.
const BackdropWall = ({ restored }) => {
  const tiraiRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < tiraiRefs.current.length; i += 1) {
      const m = tiraiRefs.current[i];
      if (m) m.rotation.z = Math.sin(t * 0.4 + i * 0.7) * 0.02;
    }
  });
  return (
    <>
      {/* Wall */}
      <mesh position={[0, BACKDROP_H / 2, BACKDROP_Z]}>
        <boxGeometry args={[BACKDROP_W, BACKDROP_H, 0.25]} />
        <meshStandardMaterial
          color={restored ? '#4a3828' : '#2a1f14'}
          roughness={1}
        />
      </mesh>
      {/* Stone block lines — horizontal divisions kasih masonry feel */}
      {[1, 2.5, 4].map((y, i) => (
        <mesh
          key={`stone-line-${i}`}
          position={[0, y, BACKDROP_Z + 0.13]}
        >
          <planeGeometry args={[BACKDROP_W, 0.03]} />
          <meshStandardMaterial color="#1a0c06" roughness={1} />
        </mesh>
      ))}
      {/* Arch notch decorative — restored only, di center upper */}
      {restored && (
        <mesh position={[0, BACKDROP_H * 0.65, BACKDROP_Z + 0.13]}>
          <boxGeometry args={[3, 1.8, 0.05]} />
          <meshStandardMaterial
            color="#6a4830"
            emissive="#3a2010"
            emissiveIntensity={0.2}
            roughness={0.85}
          />
        </mesh>
      )}
      {/* Tirai panels — 2 di sides, drop dari rafters ke floor. Sway
          via useFrame ref Z rotation. */}
      {[-BACKDROP_W / 2 + 0.8, BACKDROP_W / 2 - 0.8].map((x, i) => (
        <mesh
          key={`tirai-${i}`}
          ref={(m) => {
            tiraiRefs.current[i] = m;
          }}
          position={[x, BACKDROP_H / 2, BACKDROP_Z + 0.18]}
        >
          <planeGeometry args={[1.4, BACKDROP_H * (restored ? 0.95 : 0.7)]} />
          <meshStandardMaterial
            color={restored ? '#7a1818' : '#3a1010'}
            emissive={restored ? '#3a0808' : '#000000'}
            emissiveIntensity={restored ? 0.18 : 0}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Tirai ties — rope cinch di sisi atas */}
      {[-BACKDROP_W / 2 + 0.8, BACKDROP_W / 2 - 0.8].map((x, i) => (
        <mesh
          key={`tie-${i}`}
          position={[x, BACKDROP_H * 0.7, BACKDROP_Z + 0.2]}
        >
          <torusGeometry args={[0.18, 0.03, 6, 12]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
};

// Rafters — wooden beams overhead, mounted across stage area
const Rafters = () => (
  <>
    {/* 2 main horizontal beams */}
    <mesh position={[0, RAFTERS_Y, -1.2]}>
      <boxGeometry args={[BACKDROP_W + 1, 0.25, 0.25]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>
    <mesh position={[0, RAFTERS_Y, 0.3]}>
      <boxGeometry args={[BACKDROP_W + 1, 0.25, 0.25]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>
    {/* Cross supports — perpendicular */}
    {[-4, -2, 0, 2, 4].map((x, i) => (
      <mesh key={`cross-${i}`} position={[x, RAFTERS_Y, -0.45]}>
        <boxGeometry args={[0.18, 0.18, 1.7]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
    ))}
    {/* Vertical posts ke ground (sisi backdrop) */}
    {[-BACKDROP_W / 2 - 0.1, BACKDROP_W / 2 + 0.1].map((x, i) => (
      <mesh key={`post-${i}`} position={[x, RAFTERS_Y / 2, BACKDROP_Z + 0.2]}>
        <boxGeometry args={[0.22, RAFTERS_Y, 0.22]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
    ))}
  </>
);

// SpotlightRig — physical lamp fixtures mounted on rafters + actual
// point lights pointing toward stage. Drought: 1 dim center, Restored: 4
const SpotlightRig = ({ restored }) => {
  const positions = restored
    ? [-3, -1, 1, 3]
    : [0]; // drought = 1 dim center light
  const lampMatRefs = useRef([]);
  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < lampMatRefs.current.length; i += 1) {
      const mat = lampMatRefs.current[i];
      if (!mat) continue;
      mat.emissiveIntensity = 0.75 + Math.sin(t * 0.6 + i * 0.5) * 0.15;
    }
  });
  return (
    <>
      {positions.map((x, i) => (
        <group key={`spot-${i}`} position={[x, RAFTERS_Y - 0.2, -0.45]}>
          {/* Lamp mount bracket */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 0.2, 0.1]} />
            <meshStandardMaterial color="#2a1810" roughness={0.95} />
          </mesh>
          {/* Lamp body — barrel tilted toward stage */}
          <group rotation={[-0.55, 0, 0]} position={[0, -0.2, 0.1]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.2, 0.4, 10]} />
              <meshStandardMaterial color="#2a1810" roughness={0.85} />
            </mesh>
            {/* Lens — emissive disc di bawah */}
            <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.16, 16]} />
              <meshStandardMaterial
                ref={(m) => {
                  lampMatRefs.current[i] = m;
                }}
                color={restored ? '#f4d8a0' : '#5a4838'}
                emissive={restored ? '#f4c478' : '#000000'}
                emissiveIntensity={restored ? 0.75 : 0}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>
          </group>
          {/* Light source — point light pointing down toward stage */}
          {restored && (
            <pointLight
              position={[0, -0.5, 0]}
              color="#f4d8a0"
              intensity={0.9}
              distance={8}
              decay={2}
            />
          )}
        </group>
      ))}
      {/* Center dim light untuk drought — ada minimal lighting */}
      {!restored && (
        <pointLight
          position={[0, RAFTERS_Y - 0.5, -0.5]}
          color="#a89070"
          intensity={0.4}
          distance={6}
          decay={2}
        />
      )}
    </>
  );
};

// SpotlightBeam — volumetric cone yg "visible" via transparent cone mesh
// dgn gradient opacity. Hanya restored.
const SpotlightBeam = ({ x, opacity = 0.15 }) => (
  <mesh position={[x, RAFTERS_Y - 0.8, -0.45]} rotation={[0, 0, 0]}>
    <coneGeometry args={[1.2, 4.5, 16, 1, true]} />
    <meshBasicMaterial
      color="#f4d8a0"
      transparent
      opacity={opacity}
      side={THREE.DoubleSide}
      depthWrite={false}
      toneMapped={false}
      blending={THREE.AdditiveBlending}
    />
  </mesh>
);

// DustMotes — small floating particles in spotlight area, restored only
const DustMotes = ({ count = 24 }) => {
  const groupRef = useRef();
  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i += 1) {
      arr.push({
        x: ((i * 13) % 100) / 100 * 6 - 3,
        y: 1 + ((i * 17) % 100) / 100 * 3.5,
        z: -1.5 + ((i * 23) % 100) / 100 * 2.5,
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
        <mesh key={`dust-${i}`} position={[p.x, p.y, p.z]}>
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

// HangingBanner — wooden frame + photo texture + title panel below
// hanging dari rafters dgn rope. Loop dari KEBAIKAN_ENTRIES.
const BANNER_W = 1.6;
const BANNER_H = 2.2;
const PHOTO_H = 1.4;

const BannerTexture = ({ src }) => {
  const texture = useLoader(THREE.TextureLoader, src);
  return (
    <meshStandardMaterial
      map={texture}
      roughness={0.9}
      side={THREE.DoubleSide}
    />
  );
};

const BannerPlaceholder = () => (
  <meshStandardMaterial
    color="#3a2818"
    roughness={1}
    side={THREE.DoubleSide}
  />
);

const HangingBanner = ({ entry, index, total, restored, onClick, hovered, onHover, onUnhover }) => {
  const groupRef = useRef();
  const frameMatRef = useRef();
  // Spread arc — banners across backdrop width
  const x = total === 1 ? 0 : -3 + (index / (total - 1)) * 6;
  const z = BACKDROP_Z + 0.32;
  const y = BANNER_H / 2 + 1.6;
  const cat = KEBAIKAN_CATEGORIES.find((c) => c.id === entry.category);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const targetY = hovered ? y + 0.15 : y;
    // Idle sway slow + subtle (amplitude 0.008, freq 0.5),
    // hover sway lebih cepat + besar (0.015, 1.5).
    const swayPhase = index * 0.7;
    const swayAmp = hovered ? 0.015 : 0.008;
    const swayFreq = hovered ? 1.5 : 0.5;
    const targetRotZ = Math.sin(t * swayFreq + swayPhase) * swayAmp;
    const factor = Math.min(delta * 8, 1);
    groupRef.current.position.y = lerp(groupRef.current.position.y, targetY, factor);
    groupRef.current.rotation.z = lerp(groupRef.current.rotation.z, targetRotZ, factor);
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
    <group
      ref={groupRef}
      position={[x, y, z]}
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
      {/* Rope ke rafters atas */}
      <mesh position={[-BANNER_W / 2 + 0.1, BANNER_H / 2 + 0.6, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 5]} />
        <meshStandardMaterial color="#5a3a25" roughness={0.95} />
      </mesh>
      <mesh position={[BANNER_W / 2 - 0.1, BANNER_H / 2 + 0.6, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 5]} />
        <meshStandardMaterial color="#5a3a25" roughness={0.95} />
      </mesh>
      {/* Frame backing — slight larger than banner */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[BANNER_W + 0.1, BANNER_H + 0.1, 0.04]} />
        <meshStandardMaterial
          ref={frameMatRef}
          color="#5a3a25"
          emissive="#a87848"
          emissiveIntensity={restored ? 0.12 : 0}
          roughness={0.85}
        />
      </mesh>
      {/* Photo panel — atas, kotak vertical 4:3-ish */}
      <mesh position={[0, (BANNER_H - PHOTO_H) / 2, 0.01]}>
        <planeGeometry args={[BANNER_W - 0.15, PHOTO_H]} />
        {entry.proofUrl ? (
          <Suspense fallback={<BannerPlaceholder />}>
            <BannerTexture src={entry.proofUrl} />
          </Suspense>
        ) : (
          <BannerPlaceholder />
        )}
      </mesh>
      {/* Title strip — bawah, dark plate */}
      <mesh position={[0, -(BANNER_H - 0.6) / 2 - 0.05, 0.01]}>
        <planeGeometry args={[BANNER_W - 0.15, 0.6]} />
        <meshStandardMaterial
          color={restored ? '#3a2418' : '#2a1810'}
          emissive={restored ? '#1a0c08' : '#000000'}
          emissiveIntensity={restored ? 0.18 : 0}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* HTML label di title strip — title + category */}
      <Html
        position={[0, -(BANNER_H - 0.6) / 2 - 0.05, 0.02]}
        center
        distanceFactor={4}
        occlude={false}
      >
        <div
          className="pointer-events-none select-none text-center"
          style={{ width: '160px' }}
        >
          {cat && (
            <div
              className="text-[8px] uppercase tracking-[0.2em] mb-0.5"
              style={{ color: '#e8c878' }}
            >
              {cat.label}
            </div>
          )}
          <div
            className="text-[10px] text-white/90 leading-tight"
            style={{
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
  );
};

// SceneLights — ambient + key directional. Subtle warm tone.
const SceneLights = ({ restored }) => (
  <>
    <ambientLight intensity={restored ? 0.32 : 0.2} color="#3a2c20" />
    <directionalLight
      position={[8, 12, 6]}
      intensity={restored ? 0.35 : 0.18}
      color="#a89070"
    />
    {/* Fill light dari belakang biar backdrop wall gak hitam pekat */}
    <directionalLight
      position={[0, 6, -8]}
      intensity={0.12}
      color="#4a3828"
    />
  </>
);

// FlyInCamera — intro animation top-down spiral ke audience POV
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

// SceneFallback
const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat panggung...
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
      <AnfiteaterFloor restored={restored} />
      <FloorMist restored={restored} />
      <AudienceSeating restored={restored} />
      <Stage restored={restored} />
      <Footlights restored={restored} />
      <MicStand restored={restored} />
      <BackdropWall restored={restored} />
      <BackdropSconces restored={restored} />
      <Rafters />
      <Proscenium restored={restored} />
      <SpotlightRig restored={restored} />
      {/* Volumetric beams — restored only, additive blending */}
      {restored && (
        <>
          {[-3, -1, 1, 3].map((x, i) => (
            <SpotlightBeam key={`beam-${i}`} x={x} opacity={0.1} />
          ))}
          <DustMotes count={isMobile ? 14 : 28} />
        </>
      )}
      {/* Hanging banners — one per donation entry */}
      {entries.map((entry, i) => (
        <HangingBanner
          key={entry.id}
          entry={entry}
          index={i}
          total={entries.length}
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
        minDistance={6}
        maxDistance={isMobile ? 18 : 16}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.1}
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

// DonationOverlay — center-screen modal dgn detail entry + photo gallery
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
        {/* Close button */}
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
        {/* Hero image */}
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
        {/* Body */}
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
          {/* Mini gallery thumbnails — kalau >1 image */}
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

// Header — top bar dgn back button + audio + state eyebrow
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
        {restored ? 'Lampu nyala' : 'Panggung sepi'}
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

// Footer hint — small text bawah-tengah
const FooterHint = ({ entriesCount, restored }) => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[92vw] pointer-events-none">
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/55">
      <i className="ri-image-line text-amber-200/65" />
      <span>{entriesCount} sorotan</span>
      <span className="opacity-40">·</span>
      <span>Klik papan untuk detail</span>
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
        description="Anfiteater Panggung Terbuka — sorotan kebaikan dilakukan atas nama Helisma Putri (Eli JKT48). Arsip donasi & aksi nyata Helismiley × Armeniaca."
        path="/armeniacaTown/r5"
      />
      <RotateRecommendation />
      <div className="relative w-full h-screen bg-[#0a0608] overflow-hidden select-none">
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
                  intensity={0.6}
                  luminanceThreshold={0.72}
                  luminanceSmoothing={0.4}
                  mipmapBlur
                />
                <Vignette eskil={false} offset={0.28} darkness={0.82} />
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
