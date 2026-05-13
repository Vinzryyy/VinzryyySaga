/**
 * 3D elements untuk r4 Menara Jam.
 *
 * Public exports:
 *   - ClockTower         — base + shaft + cap + dial (w/ ticks + hands)
 *                          + spire + bell (restored) + pendulum
 *   - AnniversaryGlow    — halo ring di belakang dial saat MM-DD match
 *                          birthday Eli atau milestone ELI_TIMELINE
 *   - ShowtimeIndicator  — easter egg glow di posisi-7 dial ±30 menit
 *                          window di sekitar 19:00 WIB (theater showtime)
 *
 * Internal helpers: ClockHands, Pendulum.
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
// menit hilang per spec).
//
// CATATAN orientasi: dial cylinder dengan axis Y dan height 0.12 dipake
// sebagai *thickness*, dan radius = face-radius di XZ. Dari +Z, sisi
// circle face kelihatan sebagai disc (low-poly tactic).
// Hands di-render sebagai box di XY plane (sejajar face dial). Hand box
// dengan length sepanjang local +Y, rotation around Z axis = clockwise
// rotation when viewed from +Z. 12 o'clock = +Y, 3 = +X, 6 = -Y, 9 = -X.
const ClockHands = ({ restored }) => {
  const time = useWibTime();
  // Hour hand: rotation negatif (clockwise viewed from +Z).
  // 12 → 0 rad, 3 → -π/2, 6 → -π, 9 → -3π/2.
  const hourAngle = -(time.hour12Frac / 12) * Math.PI * 2;
  const minuteAngle = -(time.minuteFrac / 60) * Math.PI * 2;

  return (
    <group position={[0, 0, TOWER.dialThickness / 2 + 0.02]}>
      {/* Hour hand — shorter & thicker */}
      <group rotation={[0, 0, hourAngle]}>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.06, 0.54, 0.02]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.65}
          />
        </mesh>
        {/* Tail (counter-balance) */}
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.02]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.65}
          />
        </mesh>
      </group>
      {/* Minute hand — longer & thinner. RESTORED ONLY — drought jarum
          menit hilang per spec. */}
      {restored && (
        <group rotation={[0, 0, minuteAngle]}>
          <mesh position={[0, 0.4, 0.005]}>
            <boxGeometry args={[0.04, 0.78, 0.018]} />
            <meshStandardMaterial color="#2a1808" roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.12, 0.005]}>
            <boxGeometry args={[0.04, 0.24, 0.018]} />
            <meshStandardMaterial color="#2a1808" roughness={0.65} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Pendulum — rod + bob swing dari pivot di bawah dial, hanging depan
// shaft. Hook useNearestSchedule dipake di sini supaya swing condition
// drought reactive ke data (bandul "cari ritmenya" kalau ada event ≤30d).
const Pendulum = ({ restored }) => {
  const groupRef = useRef();
  const bobMatRef = useRef();
  const nearestEvent = useNearestSchedule();
  const hasNearbyEvent = Boolean(nearestEvent);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Amplitude per state:
    //   restored          → swing penuh
    //   drought + event   → swing kecil
    //   drought no event  → diam total (idle clock)
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

  const pivotY = TOWER.dialY - TOWER.dialRadius - 0.15;
  const rodLen = 1.8;
  const bobRadius = 0.22;

  return (
    <group
      ref={groupRef}
      position={[0, pivotY, TOWER.shaftRadiusTop * 0.85]}
    >
      {/* Pivot bracket */}
      <mesh position={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 8]} />
        <meshStandardMaterial color="#3a2818" roughness={0.85} />
      </mesh>
      {/* Rod */}
      <mesh position={[0, -rodLen / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, rodLen, 6]} />
        <meshStandardMaterial
          color={restored ? '#8a6838' : '#4a3828'}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      {/* Bob — bronze disc */}
      <mesh position={[0, -rodLen, 0]}>
        <cylinderGeometry args={[bobRadius, bobRadius, 0.1, 24]} />
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

// Tower geometry — bigger viewer-scale version of peta-level PetaMenara
// restored variant. Reused untuk both drought + restored, diff via
// colors/glow/hands.
export const ClockTower = ({ restored }) => {
  const dialMatRef = useRef();
  const bellMatRef = useRef();
  const stainedGlassRef = useRef();

  useFrame((state) => {
    if (restored) {
      const t = state.clock.elapsedTime;
      if (stainedGlassRef.current) {
        stainedGlassRef.current.emissiveIntensity =
          0.55 + Math.sin(t * 0.55) * 0.15;
      }
      if (bellMatRef.current) {
        bellMatRef.current.emissiveIntensity =
          0.4 + Math.sin(t * 1.3) * 0.12;
      }
    }
  });

  const stoneColor = restored ? '#a89478' : '#7a6858';
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const dialColor = restored ? '#f8e0b0' : '#5a4838';
  const dialEmissive = restored ? '#e8a868' : '#000000';

  return (
    <group>
      {/* === BASE === */}
      <mesh position={[0, TOWER.baseHeight / 2, 0]}>
        <cylinderGeometry
          args={[TOWER.baseRadius, TOWER.baseRadius * 1.05, TOWER.baseHeight, 12]}
        />
        <meshStandardMaterial color="#4a3828" roughness={0.95} />
      </mesh>
      {/* Stone bricks ring — subtle horizontal banding di base */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`base-brick-${i}`}
          position={[0, 0.08 + i * 0.075, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[TOWER.baseRadius * 0.98, TOWER.baseRadius * 1.02, 24]} />
          <meshStandardMaterial color="#3a2818" roughness={0.95} />
        </mesh>
      ))}

      {/* === SHAFT === main kolom */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight / 2, 0]}>
        <cylinderGeometry
          args={[
            TOWER.shaftRadiusTop,
            TOWER.shaftRadiusBottom,
            TOWER.shaftHeight,
            12,
          ]}
        />
        <meshStandardMaterial color={stoneColor} roughness={0.92} />
      </mesh>
      {/* Vertical brick lines (4 garis di sisi shaft) */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh
            key={`shaft-line-${i}`}
            position={[
              Math.cos(angle) * TOWER.shaftRadiusTop * 0.99,
              TOWER.baseHeight + TOWER.shaftHeight / 2,
              Math.sin(angle) * TOWER.shaftRadiusTop * 0.99,
            ]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.04, TOWER.shaftHeight * 0.95, 0.02]} />
            <meshStandardMaterial color="#5a4838" roughness={0.95} />
          </mesh>
        );
      })}

      {/* === CAP === ring tebal sebelum dial level */}
      <mesh
        position={[
          0,
          TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight / 2,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            TOWER.capRadius,
            TOWER.shaftRadiusTop * 1.05,
            TOWER.capHeight,
            12,
          ]}
        />
        <meshStandardMaterial
          color={restored ? '#7a6048' : '#5a4838'}
          roughness={0.9}
        />
      </mesh>

      {/* === DIAL FACE === menghadap +Z */}
      <group position={[0, TOWER.dialY, TOWER.shaftRadiusTop * 0.95]}>
        {/* Stained-glass backplate (restored only) */}
        {restored && (
          <mesh position={[0, 0, -0.08]}>
            <cylinderGeometry
              args={[TOWER.dialRadius * 1.12, TOWER.dialRadius * 1.12, 0.04, 32]}
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
        {/* Main dial disc */}
        <mesh>
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
        {/* Dial rim torus */}
        <mesh position={[0, 0, TOWER.dialThickness / 2]}>
          <torusGeometry args={[TOWER.dialRadius, 0.06, 8, 32]} />
          <meshStandardMaterial color={trimColor} roughness={0.85} />
        </mesh>
        {/* Hour markers — 12 tick (4 cardinal bigger) */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const isCardinal = i % 3 === 0;
          const len = isCardinal ? 0.14 : 0.08;
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
              <boxGeometry args={[isCardinal ? 0.04 : 0.025, len, 0.01]} />
              <meshStandardMaterial color={trimColor} roughness={0.7} />
            </mesh>
          );
        })}
        <ClockHands restored={restored} />
        {/* Center pin */}
        <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.03]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color={trimColor} roughness={0.5} />
        </mesh>
      </group>

      {/* === SPIRE === kerucut atas */}
      <mesh
        position={[
          0,
          TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight + TOWER.spireHeight / 2,
          0,
        ]}
      >
        <coneGeometry args={[0.6, TOWER.spireHeight, 8]} />
        <meshStandardMaterial
          color={restored ? '#6a4828' : '#4a3828'}
          roughness={0.9}
        />
      </mesh>
      {/* Spire ball — finial */}
      <mesh position={[0, TOWER.topY + 0.05, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial
          color={restored ? '#c89860' : '#5a4838'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.3 : 0}
          roughness={restored ? 0.5 : 0.9}
          metalness={restored ? 0.35 : 0}
        />
      </mesh>

      {/* === BELL === restored only, di sisi belakang spire base */}
      {restored && (
        <group position={[0, TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight + 0.35, -0.45]}>
          <mesh>
            <coneGeometry args={[0.22, 0.34, 12, 1, true]} />
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
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#a87838" roughness={0.6} metalness={0.5} />
          </mesh>
        </group>
      )}

      <Pendulum restored={restored} />
    </group>
  );
};

// AnniversaryGlow — warm halo ring di belakang dial saat hari ini cocok
// dengan birthday Eli atau salah satu milestone ELI_TIMELINE. Restored
// only — drought tone "jam masih sembuh" gak kawin sama perayaan.
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

  const dialZ = TOWER.shaftRadiusTop * 0.95 - 0.12;
  return (
    <group position={[0, TOWER.dialY, dialZ]}>
      <mesh>
        <ringGeometry args={[TOWER.dialRadius * 1.18, TOWER.dialRadius * 1.65, 48]} />
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

// ShowtimeIndicator — easter egg subtle di posisi-7 dial saat sekitar
// 19:00 WIB (showtime JKT48 Theater). Fade-in ±30 menit window, peak
// di tepat 19:00. Restored only.
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
  const dialFaceZ = TOWER.shaftRadiusTop * 0.95 + TOWER.dialThickness / 2 + 0.035;
  return (
    <group position={[0, TOWER.dialY, dialFaceZ]}>
      {/* Inner bright spot */}
      <mesh position={[x, y, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial
          color="#fff0c8"
          emissive="#f8c478"
          emissiveIntensity={1.1 * intensity}
          transparent
          opacity={0.85 * intensity}
          toneMapped={false}
        />
      </mesh>
      {/* Outer soft falloff */}
      <mesh position={[x, y, -0.01]}>
        <circleGeometry args={[0.22, 16]} />
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
