/**
 * 3D elements untuk r4 Menara Jam — Big Ben (Elizabeth Tower) inspired.
 *
 * Square cross-section shaft, 4 clock faces, corner pinnacles, Gothic
 * pyramid spire. Limestone beige palette.
 *
 * Public exports:
 *   - ClockTower         — base + shaft + cap + clock chamber (w/ 4 dial
 *                          faces) + upper cornice + 4 corner pinnacles +
 *                          main spire + bell (restored) + pendulum
 *   - AnniversaryGlow    — halo ring di belakang FRONT dial saat MM-DD
 *                          match birthday Eli atau milestone ELI_TIMELINE
 *   - ShowtimeIndicator  — easter egg glow di posisi-7 FRONT dial ±30
 *                          menit window di sekitar 19:00 WIB
 *
 * Internal helpers: ClockFace (1 dari 4 sides), ClockHands, Pendulum.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TOWER } from './constants';
import {
  useAnniversaryMatch,
  useNearestSchedule,
  useWibTime,
} from './utils';

// ClockHands — reads useWibTime each second, rotates hands per WIB.
// Hour hand selalu, minute hand hanya jika restored (drought = jarum
// menit hilang per spec). 12 = +Y, 3 = +X, 6 = -Y, 9 = -X (clockwise
// when viewed from +Z, hands rotation around Z axis).
const ClockHands = ({ restored }) => {
  const time = useWibTime();
  const hourAngle = -(time.hour12Frac / 12) * Math.PI * 2;
  const minuteAngle = -(time.minuteFrac / 60) * Math.PI * 2;

  return (
    <group position={[0, 0, TOWER.dialThickness / 2 + 0.02]}>
      <group rotation={[0, 0, hourAngle]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.04, 0.32, 0.018]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.65}
          />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.04, 0.1, 0.018]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.65}
          />
        </mesh>
      </group>
      {restored && (
        <group rotation={[0, 0, minuteAngle]}>
          <mesh position={[0, 0.23, 0.005]}>
            <boxGeometry args={[0.028, 0.46, 0.014]} />
            <meshStandardMaterial color="#2a1808" roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.07, 0.005]}>
            <boxGeometry args={[0.028, 0.14, 0.014]} />
            <meshStandardMaterial color="#2a1808" roughness={0.65} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ClockFace — satu sisi dial (1 dari 4 di clock chamber). Wrapped di
// group dgn position + rotation supaya bisa di-instantiate di tiap
// sisi: front (+Z), right (+X), back (-Z), left (-X).
//
// Stained-glass backplate cuma di front face (toward main camera) —
// 4 backplates terlalu noisy + butuh light fixtures di samping juga.
const ClockFace = ({ restored, isFront = false }) => {
  const dialMatRef = useRef();
  const stainedGlassRef = useRef();

  useFrame((state) => {
    if (restored) {
      const t = state.clock.elapsedTime;
      if (dialMatRef.current) {
        dialMatRef.current.emissiveIntensity = 0.35 + Math.sin(t * 0.6) * 0.1;
      }
      if (stainedGlassRef.current) {
        stainedGlassRef.current.emissiveIntensity =
          0.55 + Math.sin(t * 0.55) * 0.15;
      }
    }
  });

  const dialColor = restored ? '#f4dab0' : '#5a4838';
  const dialEmissive = restored ? '#e8a868' : '#000000';
  const trimColor = restored ? '#5a3a18' : '#3a2818';

  return (
    <group>
      {/* Stained-glass backplate — front face only, di belakang dial.
          Cylinder axis Z (rotated 90° around X), face menghadap +Z. */}
      {restored && isFront && (
        <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[TOWER.dialRadius * 1.18, TOWER.dialRadius * 1.18, 0.04, 32]}
          />
          <meshStandardMaterial
            ref={stainedGlassRef}
            color="#f4a868"
            emissive="#e88040"
            emissiveIntensity={0.55}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* Main dial disc — axis Z (rotated cylinder), face +Z */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[TOWER.dialRadius, TOWER.dialRadius, TOWER.dialThickness, 32]}
        />
        <meshStandardMaterial
          ref={dialMatRef}
          color={dialColor}
          emissive={dialEmissive}
          emissiveIntensity={restored ? 0.35 : 0}
          roughness={restored ? 0.5 : 1}
          transparent={!restored}
          opacity={restored ? 1 : 0.92}
        />
      </mesh>
      {/* Dial rim — torus already in XY plane, axis Z */}
      <mesh position={[0, 0, TOWER.dialThickness / 2]}>
        <torusGeometry args={[TOWER.dialRadius, 0.05, 8, 32]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      {/* Hour ticks — 12, cardinal (12/3/6/9) bigger */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const isCardinal = i % 3 === 0;
        const len = isCardinal ? 0.1 : 0.06;
        const r = TOWER.dialRadius - len / 2 - 0.02;
        return (
          <mesh
            key={`tick-${i}`}
            position={[
              Math.sin(angle) * r,
              Math.cos(angle) * r,
              TOWER.dialThickness / 2 + 0.005,
            ]}
            rotation={[0, 0, -angle]}
          >
            <boxGeometry args={[isCardinal ? 0.035 : 0.022, len, 0.008]} />
            <meshStandardMaterial color={trimColor} roughness={0.7} />
          </mesh>
        );
      })}
      <ClockHands restored={restored} />
      {/* Center pin */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.025]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} />
      </mesh>
    </group>
  );
};

// Pendulum — single, behind front dial. Big Ben sebenarnya gak punya
// visible pendulum (di dalam shaft), tapi kita keep sbg silhouette
// element + narrative cue (drought "cari ritmenya").
const Pendulum = ({ restored }) => {
  const groupRef = useRef();
  const bobMatRef = useRef();
  const nearestEvent = useNearestSchedule();
  const hasNearbyEvent = Boolean(nearestEvent);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    let amplitude = 0;
    if (restored) amplitude = 0.28;
    else if (hasNearbyEvent) amplitude = 0.12;
    else amplitude = 0;
    groupRef.current.rotation.z = Math.sin(t * (Math.PI / 1.2)) * amplitude;
    if (bobMatRef.current) {
      if (restored) {
        bobMatRef.current.emissiveIntensity = 0.35 + Math.sin(t * 1.1) * 0.1;
      } else if (hasNearbyEvent) {
        bobMatRef.current.emissiveIntensity = 0.18 + Math.sin(t * 0.8) * 0.06;
      } else {
        bobMatRef.current.emissiveIntensity = 0.05;
      }
    }
  });

  // Pivot di bawah front face center, slight in front of clock chamber.
  const pivotY = TOWER.dialY - TOWER.dialRadius - 0.15;
  const rodLen = 1.5;
  const bobRadius = 0.18;

  return (
    <group
      ref={groupRef}
      position={[0, pivotY, TOWER.clockHalf + 0.02]}
    >
      <mesh position={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 8]} />
        <meshStandardMaterial color="#3a2818" roughness={0.85} />
      </mesh>
      <mesh position={[0, -rodLen / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, rodLen, 6]} />
        <meshStandardMaterial
          color={restored ? '#8a6838' : '#4a3828'}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, -rodLen, 0]}>
        <cylinderGeometry args={[bobRadius, bobRadius, 0.08, 24]} />
        <meshStandardMaterial
          ref={bobMatRef}
          color={restored ? '#c89860' : '#6a5238'}
          emissive={restored ? '#e8a868' : '#3a2810'}
          emissiveIntensity={restored ? 0.35 : 0.05}
          roughness={restored ? 0.5 : 0.85}
          metalness={restored ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
};

// CornerPinnacle — Gothic narrow pyramid di sudut atas clock chamber.
// 4 instances, 1 di tiap corner. Restored = warmer + bronze finial,
// drought = muted stone.
const CornerPinnacle = ({ restored, x, z }) => {
  const stoneColor = restored ? '#c8a878' : '#8a7a68';
  const finialColor = restored ? '#c89860' : '#5a4838';

  return (
    <group position={[x, TOWER.clockTopY + TOWER.upperCorniceHeight, z]}>
      {/* Square base block */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[TOWER.pinnacleWidth, 0.16, TOWER.pinnacleWidth]} />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      {/* Pyramidal tapering — 4-sided cone */}
      <mesh position={[0, 0.16 + (TOWER.pinnacleHeight - 0.16) / 2, 0]}>
        <coneGeometry
          args={[TOWER.pinnacleWidth * 0.6, TOWER.pinnacleHeight - 0.16, 4]}
        />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      {/* Finial ball */}
      <mesh position={[0, TOWER.pinnacleHeight + 0.04, 0]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial
          color={finialColor}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.3 : 0}
          roughness={restored ? 0.5 : 0.9}
          metalness={restored ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
};

// ClockTower — full Big Ben-inspired tower.
export const ClockTower = ({ restored }) => {
  const bellMatRef = useRef();

  useFrame((state) => {
    if (restored && bellMatRef.current) {
      const t = state.clock.elapsedTime;
      bellMatRef.current.emissiveIntensity = 0.4 + Math.sin(t * 1.3) * 0.12;
    }
  });

  const stoneLight = restored ? '#d4b894' : '#9a8a72'; // limestone restored / weathered
  const stoneDark = restored ? '#a08868' : '#6a5a48'; // shadow / lower courses
  const trimColor = restored ? '#5a3a18' : '#3a2818';

  // Pinnacle corner positions (4 sudut clock chamber top)
  const pinXZ = (TOWER.clockChamberWidth - TOWER.pinnacleWidth) / 2;

  return (
    <group>
      {/* === BASE === square footing dgn slight inward taper. */}
      <mesh position={[0, TOWER.baseHeight / 2, 0]}>
        <boxGeometry args={[TOWER.baseWidth, TOWER.baseHeight, TOWER.baseWidth]} />
        <meshStandardMaterial color={stoneDark} roughness={0.95} />
      </mesh>
      {/* Base step — slight ledge di atas base. */}
      <mesh position={[0, TOWER.baseHeight + 0.04, 0]}>
        <boxGeometry args={[TOWER.baseTopWidth, 0.08, TOWER.baseTopWidth]} />
        <meshStandardMaterial color={stoneLight} roughness={0.92} />
      </mesh>

      {/* === SHAFT === square plain stone, Gothic window slits di tiap sisi. */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight / 2, 0]}>
        <boxGeometry args={[TOWER.shaftWidth, TOWER.shaftHeight, TOWER.shaftWidth]} />
        <meshStandardMaterial color={stoneLight} roughness={0.9} />
      </mesh>
      {/* Vertical Gothic window slits — 1 di tiap sisi shaft, lancet shape
          via thin tall box. Dark recessed look. */}
      {[
        [0, TOWER.shaftWidth / 2 + 0.001, 0, 0],   // +Z face
        [TOWER.shaftWidth / 2 + 0.001, 0, Math.PI / 2, 0], // +X face
        [0, -TOWER.shaftWidth / 2 - 0.001, Math.PI, 0],  // -Z face
        [-TOWER.shaftWidth / 2 - 0.001, 0, -Math.PI / 2, 0], // -X face
      ].map(([x, z, rotY], i) => (
        <group
          key={`window-${i}`}
          position={[
            i === 0 ? 0 : i === 2 ? 0 : (i === 1 ? TOWER.shaftWidth / 2 + 0.001 : -TOWER.shaftWidth / 2 - 0.001),
            TOWER.baseHeight + TOWER.shaftHeight * 0.55,
            i === 0 ? TOWER.shaftWidth / 2 + 0.001 : i === 2 ? -TOWER.shaftWidth / 2 - 0.001 : 0,
          ]}
          rotation={[0, rotY, 0]}
        >
          {/* Recessed window slit — narrow tall dark plane */}
          <mesh>
            <planeGeometry args={[0.22, 1.8]} />
            <meshStandardMaterial
              color="#2a1808"
              roughness={0.95}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Pointed arch top — small triangle above slit */}
          <mesh position={[0, 1.0, 0]}>
            <coneGeometry args={[0.13, 0.18, 3]} />
            <meshStandardMaterial
              color={trimColor}
              roughness={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* === LOWER CORNICE === overhang di top of shaft, sebelum clock. */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight / 2, 0]}>
        <boxGeometry args={[TOWER.capWidth, TOWER.capHeight, TOWER.capWidth]} />
        <meshStandardMaterial color={stoneDark} roughness={0.9} />
      </mesh>
      {/* Cornice trim — thin band on top */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight + 0.04, 0]}>
        <boxGeometry args={[TOWER.capWidth + 0.05, 0.05, TOWER.capWidth + 0.05]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>

      {/* === CLOCK CHAMBER === wider square section yang nampung 4 dial face. */}
      <mesh
        position={[
          0,
          TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight + TOWER.clockChamberHeight / 2 + 0.08,
          0,
        ]}
      >
        <boxGeometry
          args={[TOWER.clockChamberWidth, TOWER.clockChamberHeight, TOWER.clockChamberWidth]}
        />
        <meshStandardMaterial color={stoneLight} roughness={0.85} />
      </mesh>

      {/* === 4 CLOCK FACES === di tiap sisi clock chamber. */}
      {/* Front (+Z) — main camera-facing, dapet stained-glass + extras */}
      <group position={[0, TOWER.dialY + 0.08, TOWER.clockHalf]}>
        <ClockFace restored={restored} isFront />
      </group>
      {/* Right (+X) */}
      <group position={[TOWER.clockHalf, TOWER.dialY + 0.08, 0]} rotation={[0, Math.PI / 2, 0]}>
        <ClockFace restored={restored} />
      </group>
      {/* Back (-Z) */}
      <group position={[0, TOWER.dialY + 0.08, -TOWER.clockHalf]} rotation={[0, Math.PI, 0]}>
        <ClockFace restored={restored} />
      </group>
      {/* Left (-X) */}
      <group position={[-TOWER.clockHalf, TOWER.dialY + 0.08, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <ClockFace restored={restored} />
      </group>

      {/* === UPPER CORNICE === di atas clock chamber, base buat pinnacles + spire */}
      <mesh
        position={[
          0,
          TOWER.clockTopY + TOWER.upperCorniceHeight / 2 + 0.08,
          0,
        ]}
      >
        <boxGeometry
          args={[TOWER.upperCorniceWidth, TOWER.upperCorniceHeight, TOWER.upperCorniceWidth]}
        />
        <meshStandardMaterial color={stoneDark} roughness={0.9} />
      </mesh>

      {/* === 4 CORNER PINNACLES === Gothic narrow pyramids di tiap sudut. */}
      <CornerPinnacle restored={restored} x={pinXZ} z={pinXZ} />
      <CornerPinnacle restored={restored} x={-pinXZ} z={pinXZ} />
      <CornerPinnacle restored={restored} x={pinXZ} z={-pinXZ} />
      <CornerPinnacle restored={restored} x={-pinXZ} z={-pinXZ} />

      {/* === MAIN SPIRE === tall 4-sided pyramid di center, di atas
          upper cornice. Big Ben spire is cast-iron pyramidal w/
          decorative tip. */}
      <mesh
        position={[
          0,
          TOWER.clockTopY + TOWER.upperCorniceHeight + TOWER.spireHeight / 2 + 0.08,
          0,
        ]}
      >
        <coneGeometry args={[TOWER.spireBaseWidth / 2, TOWER.spireHeight, 4]} />
        <meshStandardMaterial
          color={restored ? '#6a4828' : '#3a2818'}
          roughness={0.88}
        />
      </mesh>
      {/* Spire finial ball — bronze emissive on restored */}
      <mesh position={[0, TOWER.topY + 0.08, 0]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial
          color={restored ? '#c89860' : '#5a4838'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.35 : 0}
          roughness={restored ? 0.5 : 0.9}
          metalness={restored ? 0.4 : 0}
        />
      </mesh>

      {/* === BELL === Big Ben's namesake — di belfry section di atas clock,
          restored only. Slightly offset to back so not blocking spire. */}
      {restored && (
        <group position={[0, TOWER.clockTopY + 0.5, -0.5]}>
          <mesh>
            <coneGeometry args={[0.18, 0.3, 12, 1, true]} />
            <meshStandardMaterial
              ref={bellMatRef}
              color="#c89860"
              emissive="#e8a868"
              emissiveIntensity={0.4}
              roughness={0.55}
              metalness={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Crown hemisphere on top */}
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.07, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#a87838" roughness={0.6} metalness={0.5} />
          </mesh>
        </group>
      )}

      <Pendulum restored={restored} />
    </group>
  );
};

// AnniversaryGlow — warm halo ring di belakang FRONT dial saat hari ini
// cocok dengan birthday Eli atau salah satu milestone ELI_TIMELINE.
// Restored only. Positioned di front clock chamber face (+Z side).
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

  // Behind front dial (slight -Z offset from clock chamber +Z face)
  return (
    <group position={[0, TOWER.dialY + 0.08, TOWER.clockHalf - 0.08]}>
      <mesh>
        <ringGeometry args={[TOWER.dialRadius * 1.22, TOWER.dialRadius * 1.75, 48]} />
        <meshStandardMaterial
          ref={matRef}
          color="#f8c878"
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

// ShowtimeIndicator — easter egg subtle di posisi-7 FRONT dial saat
// sekitar 19:00 WIB (showtime JKT48 Theater). Fade-in ±30 menit window,
// peak di tepat 19:00. Restored only.
export const ShowtimeIndicator = ({ restored }) => {
  const time = useWibTime();
  if (!restored) return null;
  const totalMin = time.hours * 60 + time.minutes;
  const dist = Math.abs(totalMin - 19 * 60);
  if (dist > 30) return null;
  const intensity = 1 - dist / 30;
  // Position-7 di dial: angle 7π/6 dari +Y clockwise.
  const angle = (7 / 12) * Math.PI * 2;
  const r = TOWER.dialRadius * 0.62;
  const x = Math.sin(angle) * r;
  const y = Math.cos(angle) * r;
  // Front face of clock chamber + dial thickness offset toward camera
  const faceZ = TOWER.clockHalf + TOWER.dialThickness / 2 + 0.035;
  return (
    <group position={[0, TOWER.dialY + 0.08, faceZ]}>
      <mesh position={[x, y, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial
          color="#fff0c8"
          emissive="#f8c478"
          emissiveIntensity={1.1 * intensity}
          transparent
          opacity={0.85 * intensity}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[x, y, -0.01]}>
        <circleGeometry args={[0.18, 16]} />
        <meshStandardMaterial
          color="#f4a868"
          emissive="#e88040"
          emissiveIntensity={0.55 * intensity}
          transparent
          opacity={0.4 * intensity}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
