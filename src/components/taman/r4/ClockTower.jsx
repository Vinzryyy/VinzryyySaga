/**
 * 3D yagura (Japanese castle watchtower) — sebelumnya Big Ben/Praha
 * gothic, sekarang pivot ke Japanese aesthetic supaya match `/taman/peta`
 * yang penuh Japanese garden elements (tsukubai, torii, jizo, koi).
 *
 * Stack Y bottom→top:
 *   ishigaki sloped masonry base → tier-1 shaft (wood frame + white
 *   plaster shikkui) → mid eaves roof (irimoya curved hip-and-gable) →
 *   clock chamber dgn 2 shoji dial stacked (front+back) + kōshi lattice
 *   window (sisi) → top irimoya roof → sōrin finial (9 rings + hōju).
 *
 * Dial logic (hands, markers, anniversary glow, today indicator) tetap
 * — cuma visual frame yang reskin: gothic rim torus → wooden kōshi
 * frame; stained glass orange → shoji paper ivory glow.
 *
 * Public exports:
 *   - ClockTower       — full yagura
 *   - AnniversaryGlow  — paper-lantern halo di belakang lower (calendar)
 *                        shoji dial saat anniversary match
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TOWER } from './constants';
import {
  useAnniversaryMatch,
  useImportantDatesMMDD,
  useNearestSchedule,
  useSeitansaiCountdown,
  useTodayMMDDFraction,
  dayOfYearFromMMDD,
} from './utils';

// ============================================================================
// IrimoyaRoof — hip-and-gable Japanese roof. Drought variant: partial
// collapse — main slab narrower (chunks missing), no ridge cap, 2 dari
// 4 corner upturn hilang, dark moss streak overlay.
// ============================================================================
const IrimoyaRoof = ({
  restored,
  width,
  depth,
  height,
  upturn,
  y,
}) => {
  const roofColor = restored ? '#3a3838' : '#1a2018';
  const roofTrim = restored ? '#5a3a18' : '#2a1808';
  const D = depth || width;

  if (!restored) {
    // RUINED — broken roof: 2 partial slabs dgn gap di tengah, simulating
    // collapsed central tiles. Side chunks remain. Moss streak overlay.
    const chunkW = width * 0.32;
    const chunkD = D * 0.85;
    return (
      <group position={[0, y, 0]}>
        {/* Left chunk */}
        <mesh
          position={[-(width / 2) + chunkW / 2 + 0.04, height * 0.4, 0]}
          rotation={[0, 0, -0.06]}
        >
          <boxGeometry args={[chunkW, height * 0.6, chunkD]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
        {/* Right chunk — slightly lower (sagging) */}
        <mesh
          position={[width / 2 - chunkW / 2 - 0.04, height * 0.35, 0]}
          rotation={[0, 0, 0.05]}
        >
          <boxGeometry args={[chunkW, height * 0.55, chunkD]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
        {/* Exposed beam through gap (revealed when central collapse) */}
        <mesh position={[0, height * 0.18, 0]}>
          <boxGeometry args={[width * 0.85, 0.04, 0.06]} />
          <meshStandardMaterial color={roofTrim} roughness={0.95} />
        </mesh>
        {/* Moss patch overlay di left chunk top — green tint, low opacity */}
        <mesh
          position={[-(width / 2) + chunkW / 2, height * 0.7, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[chunkW * 0.7, chunkD * 0.5]} />
          <meshStandardMaterial
            color="#4a5838"
            roughness={1}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Only 2 corner upturn left (broken) */}
        <mesh position={[-(width / 2), height * 0.5 + upturn / 2, D / 2]}>
          <coneGeometry args={[0.16, upturn, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
        <mesh
          position={[width / 2, height * 0.5 + upturn / 2, -D / 2]}
          rotation={[0.15, 0, 0]}
        >
          <coneGeometry args={[0.14, upturn * 0.85, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
      </group>
    );
  }

  // RESTORED — full clean roof
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height * 0.7, D]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, height * 0.85, 0]}>
        <boxGeometry args={[width * 0.85, height * 0.3, D * 0.85]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[width + 0.04, 0.05, D + 0.04]} />
        <meshStandardMaterial color={roofTrim} roughness={0.85} />
      </mesh>
      {[
        [width / 2, D / 2],
        [-width / 2, D / 2],
        [width / 2, -D / 2],
        [-width / 2, -D / 2],
      ].map(([x, z], i) => (
        <mesh
          key={`upturn-${i}`}
          position={[x, height * 0.5 + upturn / 2, z]}
        >
          <coneGeometry args={[0.16, upturn, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// SHOJI DIAL components — replace gothic rim/rosette dgn wooden kōshi
// frame (radial spokes + concentric rings = traditional wood lattice
// window). Shoji paper backplate ivory-warm.
// ============================================================================

// CountdownDial — upper big shoji window dgn jarum countdown.
const CountdownDial = ({ restored }) => {
  const { yearFraction, daysUntil } = useSeitansaiCountdown();
  const shojiRef = useRef();
  const centerGlowRef = useRef();

  const handAngle = -yearFraction * Math.PI * 2;

  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    if (shojiRef.current) {
      shojiRef.current.emissiveIntensity = 0.5 + Math.sin(t * 0.55) * 0.15;
    }
    if (centerGlowRef.current) {
      const proximity = Math.max(0, 1 - daysUntil / 30);
      centerGlowRef.current.emissiveIntensity =
        0.4 + proximity * 0.8 + Math.sin(t * 1.2) * 0.15 * proximity;
      centerGlowRef.current.opacity = 0.7 + proximity * 0.25;
    }
  });

  const R = TOWER.upperDialRadius;
  const woodColor = restored ? '#6a4828' : '#3a2818';
  const woodLight = restored ? '#8a6038' : '#4a3828';
  const handColor = restored ? '#3a1808' : '#2a1408';

  return (
    <group>
      {/* Shoji paper backplate — warm ivory glow saat restored, dim
          drought. Cylinder rotated to face +Z. */}
      <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R * 1.05, R * 1.05, 0.04, 28]} />
        <meshStandardMaterial
          ref={shojiRef}
          color={restored ? '#f4d8a8' : '#5a4838'}
          emissive={restored ? '#e8c878' : '#000000'}
          emissiveIntensity={restored ? 0.5 : 0}
          roughness={0.6}
          transparent
          opacity={restored ? 0.9 : 0.7}
          toneMapped={false}
        />
      </mesh>
      {/* Wooden outer ring frame */}
      <mesh position={[0, 0, TOWER.dialThickness / 2]}>
        <torusGeometry args={[R, 0.06, 8, 28]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      {/* Inner ring — divides month band */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.003]}>
        <torusGeometry args={[R * 0.72, 0.015, 6, 28]} />
        <meshStandardMaterial color={woodLight} roughness={0.75} />
      </mesh>
      {/* 12 RADIAL SPOKES — kōshi-style wooden grid (radial wood beams) */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const isCardinal = i % 3 === 0;
        const r1 = R * 0.04;
        const r2 = R * 0.96;
        const rMid = (r1 + r2) / 2;
        const len = r2 - r1;
        return (
          <mesh
            key={`uspoke-${i}`}
            position={[
              Math.sin(angle) * rMid,
              Math.cos(angle) * rMid,
              TOWER.dialThickness / 2 + 0.004,
            ]}
            rotation={[0, 0, -angle]}
          >
            <boxGeometry
              args={[isCardinal ? 0.024 : 0.014, len, 0.012]}
            />
            <meshStandardMaterial color={woodColor} roughness={0.8} />
          </mesh>
        );
      })}
      {/* 4 cardinal markers — small wooden squares (kazaridome accents) */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const r = R - 0.14;
        return (
          <mesh
            key={`quad-${i}`}
            position={[
              Math.sin(angle) * r,
              Math.cos(angle) * r,
              TOWER.dialThickness / 2 + 0.008,
            ]}
            rotation={[0, 0, -angle]}
          >
            <boxGeometry args={[0.05, 0.05, 0.012]} />
            <meshStandardMaterial
              color={restored ? '#a87838' : '#4a3828'}
              emissive={restored ? '#e8a868' : '#000000'}
              emissiveIntensity={restored ? 0.35 : 0}
              roughness={0.55}
              metalness={restored ? 0.4 : 0}
            />
          </mesh>
        );
      })}
      {/* Countdown HAND — wooden blade */}
      <group
        position={[0, 0, TOWER.dialThickness / 2 + 0.025]}
        rotation={[0, 0, handAngle]}
      >
        <mesh position={[0, R * 0.55, 0]}>
          <boxGeometry args={[0.038, R * 1.05, 0.018]} />
          <meshStandardMaterial color={handColor} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.045, 0.2, 0.018]} />
          <meshStandardMaterial color={handColor} roughness={0.65} />
        </mesh>
        <mesh position={[0, R * 1.05 + 0.04, 0]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <meshStandardMaterial color={handColor} roughness={0.65} />
        </mesh>
      </group>
      {/* Center pin + proximity glow disc */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.045]}>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial color={woodColor} roughness={0.6} />
      </mesh>
      {restored && (
        <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.015]}>
          <circleGeometry args={[0.16, 24]} />
          <meshStandardMaterial
            ref={centerGlowRef}
            color="#f8e0a8"
            emissive="#f0c068"
            emissiveIntensity={0.4}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};

// OrlojCalendarDial — lower smaller shoji window, 12-month wheel +
// important date markers + today hand.
const OrlojCalendarDial = ({ restored }) => {
  const importantDates = useImportantDatesMMDD();
  const todayFrac = useTodayMMDDFraction();
  const shojiRef = useRef();
  const markerRefs = useRef([]);

  const handAngle = -todayFrac * Math.PI * 2;

  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    if (shojiRef.current) {
      shojiRef.current.emissiveIntensity = 0.45 + Math.sin(t * 0.5) * 0.12;
    }
    markerRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      ref.emissiveIntensity = 0.55 + Math.sin(t * 0.7 + idx * 0.6) * 0.18;
    });
  });

  const R = TOWER.lowerDialRadius;
  const woodColor = restored ? '#6a4828' : '#3a2818';
  const woodLight = restored ? '#8a6038' : '#4a3828';
  const markerColor = restored ? '#f8c878' : '#5a4838';
  const markerEmissive = restored ? '#f0a058' : '#000000';

  return (
    <group>
      {/* Shoji paper backplate */}
      <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R * 1.06, R * 1.06, 0.04, 24]} />
        <meshStandardMaterial
          ref={shojiRef}
          color={restored ? '#f4d8a8' : '#5a4838'}
          emissive={restored ? '#e8b878' : '#000000'}
          emissiveIntensity={restored ? 0.45 : 0}
          roughness={0.6}
          transparent
          opacity={restored ? 0.88 : 0.7}
          toneMapped={false}
        />
      </mesh>
      {/* Outer wooden frame */}
      <mesh position={[0, 0, TOWER.dialThickness / 2]}>
        <torusGeometry args={[R, 0.05, 8, 24]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      {/* Inner ring */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.003]}>
        <torusGeometry args={[R * 0.72, 0.012, 6, 24]} />
        <meshStandardMaterial color={woodLight} roughness={0.75} />
      </mesh>
      {/* 12 wood-spoke month dividers */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r1 = R * 0.72;
        const r2 = R - 0.02;
        const rMid = (r1 + r2) / 2;
        const len = r2 - r1;
        return (
          <mesh
            key={`mseg-${i}`}
            position={[
              Math.sin(angle) * rMid,
              Math.cos(angle) * rMid,
              TOWER.dialThickness / 2 + 0.004,
            ]}
            rotation={[0, 0, -angle]}
          >
            <boxGeometry args={[0.014, len, 0.006]} />
            <meshStandardMaterial color={woodColor} roughness={0.75} />
          </mesh>
        );
      })}
      {/* 12 month medallion dots */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = ((i + 0.5) / 12) * Math.PI * 2;
        const r = R * 0.86;
        return (
          <mesh
            key={`mmed-${i}`}
            position={[
              Math.sin(angle) * r,
              Math.cos(angle) * r,
              TOWER.dialThickness / 2 + 0.006,
            ]}
          >
            <circleGeometry args={[0.022, 10]} />
            <meshStandardMaterial color={woodLight} roughness={0.65} />
          </mesh>
        );
      })}
      {/* Important date markers — golden dots di MM-DD penting Eli */}
      {restored &&
        importantDates.map((mmdd, idx) => {
          const frac = dayOfYearFromMMDD(mmdd);
          const angle = frac * Math.PI * 2;
          const r = R * 0.93;
          return (
            <mesh
              key={`imp-${mmdd}-${idx}`}
              position={[
                Math.sin(angle) * r,
                Math.cos(angle) * r,
                TOWER.dialThickness / 2 + 0.012,
              ]}
            >
              <sphereGeometry args={[0.028, 10, 8]} />
              <meshStandardMaterial
                ref={(el) => {
                  markerRefs.current[idx] = el;
                }}
                color={markerColor}
                emissive={markerEmissive}
                emissiveIntensity={0.55}
                roughness={0.4}
                metalness={0.45}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      {/* Today HAND — single wooden blade */}
      <group
        position={[0, 0, TOWER.dialThickness / 2 + 0.022]}
        rotation={[0, 0, handAngle]}
      >
        <mesh position={[0, R * 0.48, 0]}>
          <boxGeometry args={[0.03, R * 0.92, 0.014]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.6}
          />
        </mesh>
        <mesh position={[0, R * 0.92 + 0.035, 0]}>
          <coneGeometry args={[0.04, 0.08, 4]} />
          <meshStandardMaterial
            color={restored ? '#a87838' : '#3a2818'}
            emissive={restored ? '#e8a868' : '#000000'}
            emissiveIntensity={restored ? 0.4 : 0}
            roughness={0.55}
            metalness={restored ? 0.4 : 0}
          />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.035, 0.16, 0.014]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.6}
          />
        </mesh>
      </group>
      {/* Center pin */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.04]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial
          color={restored ? '#a87838' : '#3a2818'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.35 : 0}
          roughness={0.5}
          metalness={restored ? 0.5 : 0}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// KōshiMado — wood-lattice window square for clock chamber side walls.
// Replace gothic rosette dgn traditional Japanese square wood-grid window.
// ============================================================================
const KoshiMado = ({ restored }) => {
  const size = TOWER.koshiSize;
  const div = TOWER.koshiGridDivisions;
  const woodColor = restored ? '#6a4828' : '#3a2818';
  const woodLight = restored ? '#8a6038' : '#4a3828';
  const paperRef = useRef();

  useFrame((state) => {
    if (!restored || !paperRef.current) return;
    const t = state.clock.elapsedTime;
    paperRef.current.emissiveIntensity = 0.4 + Math.sin(t * 0.6) * 0.12;
  });

  // Lattice bar dimensions
  const barThickness = 0.014;
  const halfSize = size / 2;
  const step = size / div;

  return (
    <group>
      {/* Outer frame border (thicker wood) */}
      <mesh position={[0, halfSize + 0.025, 0]}>
        <boxGeometry args={[size + 0.06, 0.05, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, -halfSize - 0.025, 0]}>
        <boxGeometry args={[size + 0.06, 0.05, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      <mesh position={[halfSize + 0.025, 0, 0]}>
        <boxGeometry args={[0.05, size, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      <mesh position={[-halfSize - 0.025, 0, 0]}>
        <boxGeometry args={[0.05, size, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      {/* Paper backplate */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          ref={paperRef}
          color={restored ? '#f4d8a8' : '#3a2818'}
          emissive={restored ? '#e8b878' : '#000000'}
          emissiveIntensity={restored ? 0.4 : 0}
          roughness={0.6}
          transparent
          opacity={restored ? 0.78 : 0.85}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Vertical lattice bars */}
      {Array.from({ length: div + 1 }, (_, i) => {
        if (i === 0 || i === div) return null; // edges covered by frame
        const x = -halfSize + i * step;
        return (
          <mesh key={`vbar-${i}`} position={[x, 0, 0.012]}>
            <boxGeometry args={[barThickness, size, 0.014]} />
            <meshStandardMaterial color={woodLight} roughness={0.78} />
          </mesh>
        );
      })}
      {/* Horizontal lattice bars */}
      {Array.from({ length: div + 1 }, (_, i) => {
        if (i === 0 || i === div) return null;
        const y = -halfSize + i * step;
        return (
          <mesh key={`hbar-${i}`} position={[0, y, 0.012]}>
            <boxGeometry args={[size, barThickness, 0.014]} />
            <meshStandardMaterial color={woodLight} roughness={0.78} />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================================
// SHUMOKU — wooden bell-striker rod hung horizontally next to bonshō,
// suspended on rope. Pivots like a pendulum (subtle swing).
// Replaces gothic pendulum.
// ============================================================================
const Shumoku = ({ restored }) => {
  const groupRef = useRef();
  const bobMatRef = useRef();
  const nearestEvent = useNearestSchedule();
  const hasNearbyEvent = Boolean(nearestEvent);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    let amplitude = 0;
    if (restored) amplitude = 0.22;
    else if (hasNearbyEvent) amplitude = 0.1;
    groupRef.current.rotation.z = Math.sin(t * (Math.PI / 1.3)) * amplitude;
    if (bobMatRef.current) {
      if (restored) {
        bobMatRef.current.emissiveIntensity = 0.28 + Math.sin(t * 1.1) * 0.08;
      } else if (hasNearbyEvent) {
        bobMatRef.current.emissiveIntensity = 0.14 + Math.sin(t * 0.8) * 0.05;
      } else {
        bobMatRef.current.emissiveIntensity = 0.04;
      }
    }
  });

  const pivotY = TOWER.lowerDialY - TOWER.lowerDialRadius - 0.2;
  const rodLen = 1.4;

  return (
    <group ref={groupRef} position={[0, pivotY, TOWER.clockHalf + 0.02]}>
      {/* Rope/cord ujung atas (suspension) */}
      <mesh position={[0, 0, -0.03]}>
        <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
        <meshStandardMaterial color="#5a3818" roughness={0.95} />
      </mesh>
      {/* Wooden striker rod */}
      <mesh position={[0, -rodLen / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.05, rodLen, 8]} />
        <meshStandardMaterial
          color={restored ? '#7a4818' : '#4a2810'}
          roughness={0.8}
        />
      </mesh>
      {/* Striker head (rounded log end) */}
      <mesh position={[0, -rodLen, 0]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial
          ref={bobMatRef}
          color={restored ? '#8a5a28' : '#4a3018'}
          emissive={restored ? '#c87038' : '#2a1810'}
          emissiveIntensity={restored ? 0.28 : 0.04}
          roughness={restored ? 0.65 : 0.85}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// SŌRIN FINIAL — pagoda metal spire dgn 9 rings (kurin) + hōju jewel.
// Drought variant: broken — only base disc + tilted shaft stub + 2 ring
// remnants, NO jewel/suien, rust patina.
// ============================================================================
const Sorin = ({ restored }) => {
  const metalColor = restored ? '#c89860' : '#3a2818';
  const metalEmissive = restored ? '#e8a868' : '#000000';

  if (!restored) {
    // RUINED sōrin — tilted stub, 2 rings, no jewel
    return (
      <group position={[0, TOWER.topRoofTopY, 0]}>
        {/* Roban (base) — partly broken, cracked */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[TOWER.sorinRingRadius * 1.2, TOWER.sorinRingRadius * 1.2, 0.08, 8]} />
          <meshStandardMaterial color={metalColor} roughness={0.95} />
        </mesh>
        {/* Tilted shaft stub — only ~40% original height, leaning */}
        <group position={[0, 0.08, 0]} rotation={[0.18, 0, 0.12]}>
          <mesh position={[0, TOWER.sorinShaftHeight * 0.4 / 2, 0]}>
            <cylinderGeometry
              args={[TOWER.sorinShaftRadius, TOWER.sorinShaftRadius, TOWER.sorinShaftHeight * 0.4, 8]}
            />
            <meshStandardMaterial color={metalColor} roughness={0.95} />
          </mesh>
          {/* Only 2 ring remnants on tilted stub */}
          {[0.3, 0.7].map((frac, i) => (
            <mesh
              key={`kurin-r-${i}`}
              position={[0, TOWER.sorinShaftHeight * 0.4 * frac, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry
                args={[TOWER.sorinRingRadius * 0.85, TOWER.sorinRingThickness, 6, 12]}
              />
              <meshStandardMaterial color={metalColor} roughness={0.95} />
            </mesh>
          ))}
        </group>
        {/* Moss patch on roban — green overlay */}
        <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[TOWER.sorinRingRadius * 0.9, 12]} />
          <meshStandardMaterial
            color="#4a5838"
            roughness={1}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    );
  }

  // RESTORED full sōrin
  return (
    <group position={[0, TOWER.topRoofTopY, 0]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[TOWER.sorinRingRadius * 1.2, TOWER.sorinRingRadius * 1.2, 0.08, 8]} />
        <meshStandardMaterial color={metalColor} roughness={0.55} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.08 + TOWER.sorinShaftHeight / 2, 0]}>
        <cylinderGeometry
          args={[TOWER.sorinShaftRadius, TOWER.sorinShaftRadius, TOWER.sorinShaftHeight, 8]}
        />
        <meshStandardMaterial color={metalColor} roughness={0.55} metalness={0.5} />
      </mesh>
      {Array.from({ length: TOWER.sorinRingCount }, (_, i) => {
        const ringFrac = (i + 1) / (TOWER.sorinRingCount + 1);
        const y = 0.08 + TOWER.sorinShaftHeight * ringFrac;
        return (
          <mesh key={`kurin-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[TOWER.sorinRingRadius, TOWER.sorinRingThickness, 6, 12]} />
            <meshStandardMaterial
              color={metalColor}
              emissive={metalEmissive}
              emissiveIntensity={0.28}
              roughness={0.5}
              metalness={0.55}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0.08 + TOWER.sorinShaftHeight + 0.06, 0]}>
        <coneGeometry args={[TOWER.sorinRingRadius * 0.7, 0.16, 6]} />
        <meshStandardMaterial color={metalColor} roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.08 + TOWER.sorinShaftHeight + 0.18 + TOWER.sorinJewelRadius, 0]}>
        <sphereGeometry args={[TOWER.sorinJewelRadius, 14, 12]} />
        <meshStandardMaterial
          color={metalColor}
          emissive={metalEmissive}
          emissiveIntensity={0.4}
          roughness={0.45}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// BONSHŌ — Japanese temple bell. Cylindrical body w/ tsuki-za (lotus
// strike point) detail, suspended from horizontal beam. Restored only.
// Replaces gothic campanile bell.
// ============================================================================
const Bonsho = ({ matRef }) => (
  <group position={[0, TOWER.clockTopY + 0.55, -0.55]}>
    {/* Horizontal suspension beam (small visible portion) */}
    {/* Rotation belongs on the mesh — geometry tags don't accept it,
        so cylinder rotates from default vertical to horizontal here. */}
    <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
      <meshStandardMaterial color="#3a2010" roughness={0.85} />
    </mesh>
    {/* Suspension cord (short) */}
    <mesh position={[0, 0.23, 0]}>
      <cylinderGeometry args={[0.01, 0.01, 0.1, 6]} />
      <meshStandardMaterial color="#3a2010" roughness={0.95} />
    </mesh>
    {/* Bonshō body — cylindrical w/ slight flare at bottom */}
    <mesh>
      <cylinderGeometry args={[0.16, 0.2, 0.34, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color="#a87838"
        emissive="#c89048"
        emissiveIntensity={0.32}
        roughness={0.55}
        metalness={0.55}
      />
    </mesh>
    {/* Top crown — ryūzu (dragon-shaped handle, simplified as small dome) */}
    <mesh position={[0, 0.18, 0]}>
      <sphereGeometry args={[0.06, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#8a5828" roughness={0.6} metalness={0.55} />
    </mesh>
    {/* Tsuki-za — lotus strike point on side */}
    <mesh position={[0, -0.06, 0.18]}>
      <circleGeometry args={[0.04, 8]} />
      <meshStandardMaterial color="#6a3a18" roughness={0.7} metalness={0.4} />
    </mesh>
  </group>
);

// ============================================================================
// YaguraRuin — drought-only overlay: moss patches, crack streaks pada
// plaster/stone, rubble debris around base, fallen bonshō piece di tanah.
// Deterministic random (seeded by index) supaya stable per render.
// ============================================================================
const YaguraRuin = () => {
  const mossColor = '#3a4a28';
  const mossLight = '#5a6838';
  const stoneRubble = '#5a4838';
  const stoneRubbleDark = '#3a2818';
  const crackColor = '#1a0f08';

  return (
    <group>
      {/* === MOSS PATCHES on ishigaki base === */}
      {[
        [0.6, TOWER.baseHeight + 0.04, 0.9],
        [-0.8, TOWER.baseHeight + 0.04, 0.5],
        [1.0, TOWER.baseHeight + 0.04, -0.6],
        [-0.5, TOWER.baseHeight + 0.04, -1.0],
        [0.3, TOWER.baseHeight + 0.04, 1.1],
      ].map(([x, y, z], i) => (
        <mesh
          key={`base-moss-${i}`}
          position={[x, y, z]}
          rotation={[-Math.PI / 2, 0, i * 0.7]}
        >
          <circleGeometry args={[0.18 + (i % 2) * 0.06, 8]} />
          <meshStandardMaterial
            color={i % 2 ? mossColor : mossLight}
            roughness={1}
            transparent
            opacity={0.78}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* === MOSS STREAKS on plaster shaft (vertical green water-streaks) === */}
      {[-0.5, -0.1, 0.4].map((xOff, i) => (
        <mesh
          key={`shaft-streak-${i}`}
          position={[
            xOff,
            TOWER.baseHeight + TOWER.shaftHeight * 0.55,
            TOWER.shaftWidth / 2 + 0.005,
          ]}
        >
          <planeGeometry args={[0.14, TOWER.shaftHeight * 0.7]} />
          <meshStandardMaterial
            color={mossColor}
            roughness={1}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Same on back face */}
      {[-0.4, 0.5].map((xOff, i) => (
        <mesh
          key={`shaft-streak-back-${i}`}
          position={[
            xOff,
            TOWER.baseHeight + TOWER.shaftHeight * 0.5,
            -TOWER.shaftWidth / 2 - 0.005,
          ]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[0.16, TOWER.shaftHeight * 0.65]} />
          <meshStandardMaterial
            color={mossLight}
            roughness={1}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* === CRACK LINES on shaft plaster (diagonal dark lines) === */}
      {[
        { x: 0.3, y: TOWER.baseHeight + 1.5, rot: 0.5, len: 1.6 },
        { x: -0.4, y: TOWER.baseHeight + 2.2, rot: -0.6, len: 1.4 },
        { x: 0.5, y: TOWER.baseHeight + 0.8, rot: 0.8, len: 1.0 },
      ].map((c, i) => (
        <mesh
          key={`crack-front-${i}`}
          position={[c.x, c.y, TOWER.shaftWidth / 2 + 0.006]}
          rotation={[0, 0, c.rot]}
        >
          <boxGeometry args={[0.018, c.len, 0.005]} />
          <meshStandardMaterial color={crackColor} roughness={0.95} />
        </mesh>
      ))}
      {/* Cracks on chamber walls (front face) */}
      {[
        { x: 0.5, y: TOWER.chamberCenterY + 0.3, rot: 0.4, len: 0.7 },
        { x: -0.6, y: TOWER.chamberCenterY - 0.5, rot: -0.5, len: 0.6 },
      ].map((c, i) => (
        <mesh
          key={`chamber-crack-${i}`}
          position={[c.x, c.y, TOWER.clockHalf + 0.006]}
          rotation={[0, 0, c.rot]}
        >
          <boxGeometry args={[0.015, c.len, 0.005]} />
          <meshStandardMaterial color={crackColor} roughness={0.95} />
        </mesh>
      ))}

      {/* === RUBBLE DEBRIS around base === */}
      {[
        { x: 1.6, z: 0.5, scale: 0.18, rot: 0.3 },
        { x: -1.4, z: 0.8, scale: 0.22, rot: 1.1 },
        { x: 1.3, z: -0.9, scale: 0.16, rot: 2.4 },
        { x: -1.7, z: -0.4, scale: 0.2, rot: 0.7 },
        { x: 0.9, z: 1.4, scale: 0.14, rot: 1.9 },
        { x: -1.1, z: 1.2, scale: 0.18, rot: 0.5 },
      ].map((r, i) => (
        <mesh
          key={`rubble-${i}`}
          position={[r.x, r.scale / 2, r.z]}
          rotation={[r.rot * 0.3, r.rot, r.rot * 0.2]}
        >
          <boxGeometry args={[r.scale, r.scale, r.scale * 0.85]} />
          <meshStandardMaterial
            color={i % 2 ? stoneRubble : stoneRubbleDark}
            roughness={0.98}
          />
        </mesh>
      ))}

      {/* === FALLEN BONSHŌ === bell jatuh di samping tower, tipped sideways */}
      <group position={[1.6, 0.18, 1.2]} rotation={[Math.PI / 2.2, 0.3, 0.1]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.2, 0.34, 14, 1, true]} />
          <meshStandardMaterial
            color="#5a4828"
            roughness={0.95}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Moss patch on fallen bell */}
        <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 10]} />
          <meshStandardMaterial
            color={mossColor}
            roughness={1}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* === FALLEN TILE FRAGMENTS === near tower base, dari runtuhan top roof */}
      {[
        { x: 1.2, z: 1.5, rot: 0.4 },
        { x: -1.0, z: 1.6, rot: -0.6 },
        { x: 1.5, z: -1.3, rot: 1.2 },
      ].map((t, i) => (
        <mesh
          key={`tile-${i}`}
          position={[t.x, 0.04, t.z]}
          rotation={[-Math.PI / 2 + 0.1, 0, t.rot]}
        >
          <boxGeometry args={[0.25, 0.03, 0.18]} />
          <meshStandardMaterial
            color="#1a2018"
            roughness={0.98}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// ClockTower — full yagura composition (single instance; twin-X done in
// Buildings.jsx TwinTowerComplex).
// ============================================================================
export const ClockTower = ({ restored }) => {
  const bellMatRef = useRef();

  useFrame((state) => {
    if (restored && bellMatRef.current) {
      const t = state.clock.elapsedTime;
      bellMatRef.current.emissiveIntensity = 0.32 + Math.sin(t * 1.3) * 0.1;
    }
  });

  // Palette (Japanese tone)
  const stoneIshigaki = restored ? '#8a8278' : '#5a5048'; // ishigaki masonry
  const stoneDark = restored ? '#6a6258' : '#4a4238';
  const plasterColor = restored ? '#d8c8a8' : '#8a7868'; // shikkui white plaster
  const woodColor = restored ? '#6a4828' : '#3a2818'; // dark cedar wood
  const woodLight = restored ? '#8a6038' : '#4a3828';

  // Anchor heights
  const shaftTopY = TOWER.baseHeight + TOWER.shaftHeight;
  const upperOffsetY = TOWER.upperDialY - TOWER.chamberCenterY;
  const lowerOffsetY = TOWER.lowerDialY - TOWER.chamberCenterY;
  const koshiOffsetY = TOWER.koshiY - TOWER.chamberCenterY;

  return (
    <group>
      {/* === ISHIGAKI BASE === sloped stone masonry (wider bottom).
          Simulate slope: stack 2 boxes — bottom wide + top narrower. */}
      <mesh position={[0, TOWER.baseHeight * 0.3, 0]}>
        <boxGeometry args={[TOWER.baseWidth, TOWER.baseHeight * 0.6, TOWER.baseWidth]} />
        <meshStandardMaterial color={stoneIshigaki} roughness={0.95} />
      </mesh>
      <mesh position={[0, TOWER.baseHeight * 0.8, 0]}>
        <boxGeometry
          args={[
            (TOWER.baseWidth + TOWER.baseTopWidth) / 2,
            TOWER.baseHeight * 0.4,
            (TOWER.baseWidth + TOWER.baseTopWidth) / 2,
          ]}
        />
        <meshStandardMaterial color={stoneIshigaki} roughness={0.95} />
      </mesh>
      {/* Stone trim cap di top of base */}
      <mesh position={[0, TOWER.baseHeight + 0.025, 0]}>
        <boxGeometry args={[TOWER.baseTopWidth + 0.05, 0.05, TOWER.baseTopWidth + 0.05]} />
        <meshStandardMaterial color={stoneDark} roughness={0.92} />
      </mesh>

      {/* === TIER-1 SHAFT === white plaster shikkui dgn wood beam framing */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight / 2, 0]}>
        <boxGeometry args={[TOWER.shaftWidth, TOWER.shaftHeight, TOWER.shaftWidth]} />
        <meshStandardMaterial color={plasterColor} roughness={0.92} />
      </mesh>
      {/* Corner vertical beams — 4 corners, full height */}
      {[
        [TOWER.shaftWidth / 2, TOWER.shaftWidth / 2],
        [-TOWER.shaftWidth / 2, TOWER.shaftWidth / 2],
        [TOWER.shaftWidth / 2, -TOWER.shaftWidth / 2],
        [-TOWER.shaftWidth / 2, -TOWER.shaftWidth / 2],
      ].map(([x, z], i) => (
        <mesh
          key={`corner-beam-${i}`}
          position={[x, TOWER.baseHeight + TOWER.shaftHeight / 2, z]}
        >
          <boxGeometry args={[TOWER.beamThickness, TOWER.shaftHeight, TOWER.beamThickness]} />
          <meshStandardMaterial color={woodColor} roughness={0.85} />
        </mesh>
      ))}
      {/* Mid horizontal nuki bands — 2 levels (1/3 + 2/3 height) */}
      {[0.33, 0.66].map((frac, i) => (
        <mesh
          key={`nuki-${i}`}
          position={[0, TOWER.baseHeight + TOWER.shaftHeight * frac, 0]}
        >
          <boxGeometry
            args={[
              TOWER.shaftWidth + 0.02,
              TOWER.nukiThickness,
              TOWER.shaftWidth + 0.02,
            ]}
          />
          <meshStandardMaterial color={woodLight} roughness={0.82} />
        </mesh>
      ))}
      {/* Narrow vertical window slits (yagura-mado) — 1 per face mid-shaft */}
      {[
        [0, TOWER.shaftWidth / 2 + 0.001, 0],
        [TOWER.shaftWidth / 2 + 0.001, 0, Math.PI / 2],
        [0, -TOWER.shaftWidth / 2 - 0.001, Math.PI],
        [-TOWER.shaftWidth / 2 - 0.001, 0, -Math.PI / 2],
      ].map(([x, z, rotY], i) => (
        <mesh
          key={`yagura-mado-${i}`}
          position={[x, TOWER.baseHeight + TOWER.shaftHeight * 0.5, z]}
          rotation={[0, rotY, 0]}
        >
          <planeGeometry args={[0.18, 0.8]} />
          <meshStandardMaterial
            color="#2a1808"
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* === MID EAVES ROOF === irimoya wrap di top of shaft */}
      <IrimoyaRoof
        restored={restored}
        width={TOWER.midEavesWidth}
        depth={TOWER.midEavesWidth}
        height={TOWER.midEavesHeight}
        upturn={TOWER.midEavesUpturn}
        y={shaftTopY}
      />

      {/* === CLOCK CHAMBER === wood + plaster, smaller than shaft */}
      <mesh position={[0, TOWER.chamberCenterY, 0]}>
        <boxGeometry
          args={[TOWER.clockChamberWidth, TOWER.clockChamberHeight, TOWER.clockChamberWidth]}
        />
        <meshStandardMaterial color={plasterColor} roughness={0.9} />
      </mesh>
      {/* Corner beams chamber */}
      {[
        [TOWER.clockChamberWidth / 2, TOWER.clockChamberWidth / 2],
        [-TOWER.clockChamberWidth / 2, TOWER.clockChamberWidth / 2],
        [TOWER.clockChamberWidth / 2, -TOWER.clockChamberWidth / 2],
        [-TOWER.clockChamberWidth / 2, -TOWER.clockChamberWidth / 2],
      ].map(([x, z], i) => (
        <mesh key={`chamber-beam-${i}`} position={[x, TOWER.chamberCenterY, z]}>
          <boxGeometry
            args={[TOWER.beamThickness, TOWER.clockChamberHeight, TOWER.beamThickness]}
          />
          <meshStandardMaterial color={woodColor} roughness={0.85} />
        </mesh>
      ))}
      {/* Mid horizontal trim band on chamber (separates dial visually) */}
      <mesh position={[0, TOWER.chamberCenterY, 0]}>
        <boxGeometry
          args={[
            TOWER.clockChamberWidth + 0.04,
            TOWER.nukiThickness,
            TOWER.clockChamberWidth + 0.04,
          ]}
        />
        <meshStandardMaterial color={woodLight} roughness={0.82} />
      </mesh>

      {/* === FRONT FACE (+Z) — 2 shoji dial stacked === */}
      <group position={[0, TOWER.chamberCenterY, TOWER.clockHalf]}>
        <group position={[0, upperOffsetY, 0]}>
          <CountdownDial restored={restored} />
        </group>
        <group position={[0, lowerOffsetY, 0]}>
          <OrlojCalendarDial restored={restored} />
        </group>
      </group>

      {/* === BACK FACE (-Z) — mirror === */}
      <group
        position={[0, TOWER.chamberCenterY, -TOWER.clockHalf]}
        rotation={[0, Math.PI, 0]}
      >
        <group position={[0, upperOffsetY, 0]}>
          <CountdownDial restored={restored} />
        </group>
        <group position={[0, lowerOffsetY, 0]}>
          <OrlojCalendarDial restored={restored} />
        </group>
      </group>

      {/* === RIGHT FACE (+X) — kōshi-mado lattice window === */}
      <group
        position={[TOWER.clockHalf, TOWER.chamberCenterY, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <group position={[0, koshiOffsetY, 0]}>
          <KoshiMado restored={restored} />
        </group>
      </group>

      {/* === LEFT FACE (-X) === */}
      <group
        position={[-TOWER.clockHalf, TOWER.chamberCenterY, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <group position={[0, koshiOffsetY, 0]}>
          <KoshiMado restored={restored} />
        </group>
      </group>

      {/* === TOP ROOF === main irimoya */}
      <IrimoyaRoof
        restored={restored}
        width={TOWER.topRoofWidth}
        depth={TOWER.topRoofWidth}
        height={TOWER.topRoofHeight}
        upturn={TOWER.topRoofUpturn}
        y={TOWER.clockTopY}
      />

      {/* === SŌRIN FINIAL === */}
      <Sorin restored={restored} />

      {/* === BONSHŌ === restored only, suspended di under roof eaves */}
      {restored && <Bonsho matRef={bellMatRef} />}

      {/* === SHUMOKU === bell striker rod (pendulum) di front */}
      <Shumoku restored={restored} />

      {/* === RUIN OVERLAY === drought-only moss + cracks + rubble + fallen bell */}
      {!restored && <YaguraRuin />}
    </group>
  );
};

// ============================================================================
// AnniversaryGlow — paper-lantern halo di belakang lower (calendar) shoji
// dial saat hari ini cocok birthday Eli / milestone ELI_TIMELINE.
// Restored only. Warmer color (paper-lantern orange) to match Japanese
// aesthetic.
// ============================================================================
export const AnniversaryGlow = ({ restored }) => {
  const anniversaries = useAnniversaryMatch();
  const matRef = useRef();
  const active = restored && anniversaries.length > 0;

  useFrame((state) => {
    if (!matRef.current) return;
    if (!active) {
      matRef.current.opacity = 0;
      matRef.current.emissiveIntensity = 0;
      return;
    }
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.42 + Math.sin(t * 0.7) * 0.12;
    matRef.current.emissiveIntensity = 0.7 + Math.sin(t * 0.7) * 0.2;
  });

  if (!active) return null;

  return (
    <group position={[0, TOWER.lowerDialY, TOWER.clockHalf - 0.08]}>
      <mesh>
        <ringGeometry
          args={[TOWER.lowerDialRadius * 1.22, TOWER.lowerDialRadius * 1.85, 48]}
        />
        <meshStandardMaterial
          ref={matRef}
          color="#f8d098"
          emissive="#f0a058"
          emissiveIntensity={0.7}
          transparent
          opacity={0.4}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

