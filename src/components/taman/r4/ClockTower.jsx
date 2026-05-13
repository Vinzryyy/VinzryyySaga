/**
 * 3D elements untuk r4 Menara Jam — Big Ben silhouette + Gothic Prague
 * ornament (mirip Old Town Hall / Astronomical Clock).
 *
 * Clock chamber TINGGI dengan 2 dial stacked di FRONT + BACK:
 *   - Upper dial: countdown ke STS (Seitansai). Hybrid target — default
 *     ulang tahun Eli 15 Juni, override jika ada event ≤14 hari.
 *   - Lower dial: Orloj-style 12-month calendar wheel. Marker dot emas
 *     di MM-DD penting (ulang tahun + ELI_TIMELINE). Jarum tunggal
 *     nunjuk ke hari ini.
 *
 * Sisi KIRI + KANAN: rosette gothic window + lancet pair (no dial —
 * ornament only).
 *
 * Public exports:
 *   - ClockTower       — base + shaft + cap + clock chamber w/ 2-dial
 *                        front+back, rosette side, + corner pinnacles +
 *                        spire + bell + pendulum
 *   - AnniversaryGlow  — halo emas di belakang CALENDAR dial saat hari
 *                        ini cocok birthday/milestone Eli
 *   - ShowtimeIndicator — DEPRECATED (no-op shim) — dial real-time hilang
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
// COUNTDOWN DIAL — big dial atas, jarum tunggal nunjuk progress menuju
// target. Skala 0..365 hari (1 putaran penuh). Saat target makin dekat,
// jarum mendekati posisi 12 (top). Pas hari-H jarum di 12 + glow.
// ============================================================================
const CountdownDial = ({ restored }) => {
  const { yearFraction, daysUntil } = useSeitansaiCountdown();
  const dialMatRef = useRef();
  const stainedGlassRef = useRef();
  const handRef = useRef();
  const centerGlowRef = useRef();

  // Hand angle: 0 hari = 0 rad (12 atas). Jauh dari target = sudut besar
  // (jarum berputar clockwise dari atas seiring waktu sebelum target).
  // Negative karena rotasi clockwise di sumbu Z when viewed from +Z.
  const handAngle = -yearFraction * Math.PI * 2;

  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    if (dialMatRef.current) {
      dialMatRef.current.emissiveIntensity = 0.32 + Math.sin(t * 0.6) * 0.08;
    }
    if (stainedGlassRef.current) {
      stainedGlassRef.current.emissiveIntensity =
        0.55 + Math.sin(t * 0.55) * 0.15;
    }
    // Center glow lebih kuat kalau target dekat (≤14 hari)
    if (centerGlowRef.current) {
      const proximity = Math.max(0, 1 - daysUntil / 30);
      centerGlowRef.current.emissiveIntensity =
        0.4 + proximity * 0.8 + Math.sin(t * 1.2) * 0.15 * proximity;
      centerGlowRef.current.opacity = 0.7 + proximity * 0.25;
    }
  });

  const R = TOWER.upperDialRadius;
  const dialColor = restored ? '#f4dab0' : '#5a4838';
  const dialEmissive = restored ? '#e8a868' : '#000000';
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const handColor = restored ? '#3a1808' : '#2a1408';

  return (
    <group>
      {/* Stained-glass backplate (restored only) */}
      {restored && (
        <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R * 1.18, R * 1.18, 0.04, 32]} />
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
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R, R, TOWER.dialThickness, 32]} />
        <meshStandardMaterial
          ref={dialMatRef}
          color={dialColor}
          emissive={dialEmissive}
          emissiveIntensity={restored ? 0.32 : 0}
          roughness={restored ? 0.5 : 1}
          transparent={!restored}
          opacity={restored ? 1 : 0.92}
        />
      </mesh>
      {/* Dial rim torus */}
      <mesh position={[0, 0, TOWER.dialThickness / 2]}>
        <torusGeometry args={[R, 0.05, 8, 32]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      {/* Outer decorative rim — gothic double-band */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.005]}>
        <torusGeometry args={[R * 1.08, 0.018, 6, 32]} />
        <meshStandardMaterial
          color={restored ? '#a87838' : '#4a3828'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.3 : 0}
          roughness={0.55}
          metalness={restored ? 0.4 : 0}
        />
      </mesh>
      {/* 12 hour-tick marks (jadi "month-tick" — 1 per bulan) */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const isCardinal = i % 3 === 0;
        const len = isCardinal ? 0.1 : 0.06;
        const r = R - len / 2 - 0.02;
        return (
          <mesh
            key={`utick-${i}`}
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
      {/* Sub-ticks: 4 quadrant markers (intensifikasi cardinal) */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const r = R - 0.16;
        return (
          <mesh
            key={`quad-${i}`}
            position={[
              Math.sin(angle) * r,
              Math.cos(angle) * r,
              TOWER.dialThickness / 2 + 0.006,
            ]}
          >
            <circleGeometry args={[0.025, 12]} />
            <meshStandardMaterial
              color={restored ? '#c89860' : '#4a3828'}
              emissive={restored ? '#e8a868' : '#000000'}
              emissiveIntensity={restored ? 0.4 : 0}
              roughness={0.55}
              metalness={restored ? 0.4 : 0}
            />
          </mesh>
        );
      })}
      {/* Countdown HAND — single, panjang, ujung lancip */}
      <group
        ref={handRef}
        position={[0, 0, TOWER.dialThickness / 2 + 0.025]}
        rotation={[0, 0, handAngle]}
      >
        {/* Main blade */}
        <mesh position={[0, R * 0.55, 0]}>
          <boxGeometry args={[0.038, R * 1.05, 0.018]} />
          <meshStandardMaterial
            color={handColor}
            emissive={restored ? '#3a1808' : '#000000'}
            emissiveIntensity={restored ? 0.15 : 0}
            roughness={0.6}
          />
        </mesh>
        {/* Counterweight (di belakang pivot) */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.045, 0.2, 0.018]} />
          <meshStandardMaterial color={handColor} roughness={0.6} />
        </mesh>
        {/* Tip arrow */}
        <mesh position={[0, R * 1.05 + 0.04, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <meshStandardMaterial color={handColor} roughness={0.6} />
        </mesh>
      </group>
      {/* Center pin + glow disc (proximity glow saat target dekat) */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.045]}>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} />
      </mesh>
      {restored && (
        <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.015]}>
          <circleGeometry args={[0.16, 24]} />
          <meshStandardMaterial
            ref={centerGlowRef}
            color="#f8c878"
            emissive="#f0a058"
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

// ============================================================================
// ORLOJ CALENDAR DIAL — 12-month wheel di bawah. Marker emas di MM-DD
// penting (ulang tahun + ELI_TIMELINE). Jarum tunggal nunjuk hari ini.
// Lebih kecil dari upper dial, lebih ornate.
// ============================================================================
const OrlojCalendarDial = ({ restored }) => {
  const importantDates = useImportantDatesMMDD();
  const todayFrac = useTodayMMDDFraction();
  const dialMatRef = useRef();
  const handRef = useRef();
  const markerRefs = useRef([]);

  // Jarum nunjuk fraction-of-year (todayFrac 0..1) clockwise dari 12 atas.
  const handAngle = -todayFrac * Math.PI * 2;

  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    if (dialMatRef.current) {
      dialMatRef.current.emissiveIntensity = 0.28 + Math.sin(t * 0.5) * 0.08;
    }
    // Marker dots subtle pulse (offset per index biar gak sync)
    markerRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      ref.emissiveIntensity = 0.55 + Math.sin(t * 0.7 + idx * 0.6) * 0.18;
    });
  });

  const R = TOWER.lowerDialRadius;
  const dialColor = restored ? '#e8c89a' : '#4a3828';
  const dialEmissive = restored ? '#d88858' : '#000000';
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const monthSegmentColor = restored ? '#d4a878' : '#3a2818';
  const markerColor = restored ? '#f8c878' : '#5a4838';
  const markerEmissive = restored ? '#f0a058' : '#000000';

  return (
    <group>
      {/* Main dial disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R, R, TOWER.dialThickness, 28]} />
        <meshStandardMaterial
          ref={dialMatRef}
          color={dialColor}
          emissive={dialEmissive}
          emissiveIntensity={restored ? 0.28 : 0}
          roughness={restored ? 0.55 : 1}
          transparent={!restored}
          opacity={restored ? 1 : 0.92}
        />
      </mesh>
      {/* Outer rim torus */}
      <mesh position={[0, 0, TOWER.dialThickness / 2]}>
        <torusGeometry args={[R, 0.045, 8, 28]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      {/* Inner ring — divides outer "month band" from inner zodiac area */}
      <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.003]}>
        <torusGeometry args={[R * 0.72, 0.012, 6, 28]} />
        <meshStandardMaterial
          color={restored ? '#a87838' : '#4a3828'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.3 : 0}
          roughness={0.55}
          metalness={restored ? 0.4 : 0}
        />
      </mesh>
      {/* 12 MONTH SEGMENT dividers — spoke lines dari inner ring ke rim */}
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
            <meshStandardMaterial color={monthSegmentColor} roughness={0.75} />
          </mesh>
        );
      })}
      {/* 12 MONTH MEDALLIONS — small dots di tengah tiap segmen, sebagai
          "month medallion" stand-in (Orloj asli punya engraved zodiac
          per medallion; di sini just decorative dot). */}
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
            <meshStandardMaterial
              color={restored ? '#a87838' : '#4a3828'}
              roughness={0.65}
              metalness={restored ? 0.3 : 0}
            />
          </mesh>
        );
      })}
      {/* IMPORTANT-DATE MARKERS — golden dot di MM-DD penting Eli.
          Posisi sudut = dayOfYearFromMMDD(mmdd). Lebih dekat ke rim
          drpd medallion supaya gak ketabrakan visually. */}
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
      {/* TODAY HAND — single, nunjuk ke fraction-of-year today */}
      <group
        ref={handRef}
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
// ROSETTE WINDOW — gothic circular window untuk side faces. Spoke
// pattern (6 atau 8 jari-jari) dgn stained glass center saat restored.
// Plus lancet pair di bawahnya (twin pointed-arch windows).
// ============================================================================
const RosetteWindow = ({ restored }) => {
  const glassRef = useRef();

  useFrame((state) => {
    if (!restored || !glassRef.current) return;
    const t = state.clock.elapsedTime;
    glassRef.current.emissiveIntensity = 0.45 + Math.sin(t * 0.7) * 0.15;
  });

  const R = TOWER.rosetteRadius;
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const stoneColor = restored ? '#d4b894' : '#8a7a68';

  return (
    <group>
      {/* Outer stone ring (frame) */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R * 1.08, R * 1.08, 0.06, 24]} />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      {/* Stained-glass center disc (only restored) */}
      {restored && (
        <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R, R, 0.04, 24]} />
          <meshStandardMaterial
            ref={glassRef}
            color="#f4a868"
            emissive="#e88040"
            emissiveIntensity={0.45}
            roughness={0.5}
            toneMapped={false}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
      {/* Dark void disc (drought — no light, recessed) */}
      {!restored && (
        <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R, R, 0.02, 24]} />
          <meshStandardMaterial color="#2a1808" roughness={0.95} />
        </mesh>
      )}
      {/* 8 SPOKES — bar radiating dari center ke rim. Gothic rosette
          biasanya 6/8/12; pick 8 untuk balance ornament vs ribet. */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = R * 0.5;
        return (
          <mesh
            key={`spoke-${i}`}
            position={[Math.sin(angle) * r, Math.cos(angle) * r, 0.055]}
            rotation={[0, 0, -angle]}
          >
            <boxGeometry args={[0.022, R * 0.94, 0.025]} />
            <meshStandardMaterial color={trimColor} roughness={0.8} />
          </mesh>
        );
      })}
      {/* Center boss */}
      <mesh position={[0, 0, 0.065]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial
          color={restored ? '#a87838' : '#4a3828'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.35 : 0}
          roughness={0.55}
          metalness={restored ? 0.4 : 0}
        />
      </mesh>
      {/* Inner ring (decorative) */}
      <mesh position={[0, 0, 0.06]}>
        <torusGeometry args={[R * 0.55, 0.012, 6, 24]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
    </group>
  );
};

// LancetPair — twin pointed-arch windows di bawah rosette. Dark recessed
// look matching shaft windows.
const LancetPair = ({ restored }) => {
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const recessColor = restored ? '#2a1808' : '#1a0f08';
  const W = TOWER.lancetWidth;
  const H = TOWER.lancetHeight;
  const halfGap = TOWER.lancetGap / 2 + W / 2;

  const Lancet = ({ xOffset }) => (
    <group position={[xOffset, 0, 0]}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial
          color={recessColor}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Pointed arch top — small cone (triangle) */}
      <mesh position={[0, H / 2 + 0.08, 0]}>
        <coneGeometry args={[W * 0.6, 0.16, 3]} />
        <meshStandardMaterial
          color={trimColor}
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Vertical center mullion */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[0.012, H, 0.008]} />
        <meshStandardMaterial color={trimColor} roughness={0.75} />
      </mesh>
      {/* Horizontal transom */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[W, 0.012, 0.008]} />
        <meshStandardMaterial color={trimColor} roughness={0.75} />
      </mesh>
    </group>
  );

  return (
    <group>
      <Lancet xOffset={-halfGap} />
      <Lancet xOffset={+halfGap} />
    </group>
  );
};

// ============================================================================
// PENDULUM — di belakang front face, restored / nearby-event aktif.
// ============================================================================
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

  // Pivot di bawah lower (calendar) dial — closer to ground biar gak
  // overlap dgn dial.
  const pivotY = TOWER.lowerDialY - TOWER.lowerDialRadius - 0.18;
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

// ============================================================================
// CORNER PINNACLE — gothic narrow pyramid di sudut atas clock chamber.
// ============================================================================
const CornerPinnacle = ({ restored, x, z }) => {
  const stoneColor = restored ? '#c8a878' : '#8a7a68';
  const finialColor = restored ? '#c89860' : '#5a4838';

  return (
    <group position={[x, TOWER.clockTopY + TOWER.upperCorniceHeight, z]}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[TOWER.pinnacleWidth, 0.16, TOWER.pinnacleWidth]} />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.16 + (TOWER.pinnacleHeight - 0.16) / 2, 0]}>
        <coneGeometry
          args={[TOWER.pinnacleWidth * 0.6, TOWER.pinnacleHeight - 0.16, 4]}
        />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
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

// ============================================================================
// ClockTower — full composition.
// ============================================================================
export const ClockTower = ({ restored }) => {
  const bellMatRef = useRef();

  useFrame((state) => {
    if (restored && bellMatRef.current) {
      const t = state.clock.elapsedTime;
      bellMatRef.current.emissiveIntensity = 0.4 + Math.sin(t * 1.3) * 0.12;
    }
  });

  const stoneLight = restored ? '#d4b894' : '#9a8a72';
  const stoneDark = restored ? '#a08868' : '#6a5a48';
  const trimColor = restored ? '#5a3a18' : '#3a2818';

  const pinXZ = (TOWER.clockChamberWidth - TOWER.pinnacleWidth) / 2;

  // Dial positions relative to chamber face (in chamber-local frame Y).
  // We want upper/lower dial center Y in world space; chamber group is
  // positioned at chamberCenterY so dial offsets are relative to that.
  const upperOffsetY = TOWER.upperDialY - TOWER.chamberCenterY;
  const lowerOffsetY = TOWER.lowerDialY - TOWER.chamberCenterY;
  const rosetteOffsetY = TOWER.rosetteY - TOWER.chamberCenterY;
  const lancetOffsetY = TOWER.lancetY - TOWER.chamberCenterY;

  return (
    <group>
      {/* === BASE === */}
      <mesh position={[0, TOWER.baseHeight / 2, 0]}>
        <boxGeometry args={[TOWER.baseWidth, TOWER.baseHeight, TOWER.baseWidth]} />
        <meshStandardMaterial color={stoneDark} roughness={0.95} />
      </mesh>
      <mesh position={[0, TOWER.baseHeight + 0.04, 0]}>
        <boxGeometry args={[TOWER.baseTopWidth, 0.08, TOWER.baseTopWidth]} />
        <meshStandardMaterial color={stoneLight} roughness={0.92} />
      </mesh>

      {/* === SHAFT === */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight / 2, 0]}>
        <boxGeometry args={[TOWER.shaftWidth, TOWER.shaftHeight, TOWER.shaftWidth]} />
        <meshStandardMaterial color={stoneLight} roughness={0.9} />
      </mesh>
      {/* Shaft Gothic window slits — 1 di tiap sisi */}
      {[
        [0, TOWER.shaftWidth / 2 + 0.001, 0],
        [TOWER.shaftWidth / 2 + 0.001, 0, Math.PI / 2],
        [0, -TOWER.shaftWidth / 2 - 0.001, Math.PI],
        [-TOWER.shaftWidth / 2 - 0.001, 0, -Math.PI / 2],
      ].map(([x, z, rotY], i) => (
        <group
          key={`window-${i}`}
          position={[x, TOWER.baseHeight + TOWER.shaftHeight * 0.55, z]}
          rotation={[0, rotY, 0]}
        >
          <mesh>
            <planeGeometry args={[0.22, 1.8]} />
            <meshStandardMaterial
              color="#2a1808"
              roughness={0.95}
              side={THREE.DoubleSide}
            />
          </mesh>
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

      {/* === LOWER CORNICE === */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight / 2, 0]}>
        <boxGeometry args={[TOWER.capWidth, TOWER.capHeight, TOWER.capWidth]} />
        <meshStandardMaterial color={stoneDark} roughness={0.9} />
      </mesh>
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight + 0.04, 0]}>
        <boxGeometry args={[TOWER.capWidth + 0.05, 0.05, TOWER.capWidth + 0.05]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>

      {/* === CLOCK CHAMBER === lebih tinggi, fit 2 dial stacked */}
      <mesh position={[0, TOWER.chamberCenterY, 0]}>
        <boxGeometry
          args={[TOWER.clockChamberWidth, TOWER.clockChamberHeight, TOWER.clockChamberWidth]}
        />
        <meshStandardMaterial color={stoneLight} roughness={0.85} />
      </mesh>
      {/* Chamber horizontal trim bands — dekoratif Praha-style, di mid
          (memisahkan area upper/lower dial visually) */}
      <mesh position={[0, TOWER.chamberCenterY, 0]}>
        <boxGeometry
          args={[TOWER.clockChamberWidth + 0.04, 0.04, TOWER.clockChamberWidth + 0.04]}
        />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>

      {/* === FRONT FACE (+Z) — 2 dial stacked === */}
      <group position={[0, TOWER.chamberCenterY, TOWER.clockHalf]}>
        <group position={[0, upperOffsetY, 0]}>
          <CountdownDial restored={restored} />
        </group>
        <group position={[0, lowerOffsetY, 0]}>
          <OrlojCalendarDial restored={restored} />
        </group>
      </group>

      {/* === BACK FACE (-Z) — mirror: 2 dial stacked === */}
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

      {/* === RIGHT FACE (+X) — rosette + lancet pair === */}
      <group
        position={[TOWER.clockHalf, TOWER.chamberCenterY, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <group position={[0, rosetteOffsetY, 0]}>
          <RosetteWindow restored={restored} />
        </group>
        <group position={[0, lancetOffsetY, 0]}>
          <LancetPair restored={restored} />
        </group>
      </group>

      {/* === LEFT FACE (-X) — rosette + lancet pair === */}
      <group
        position={[-TOWER.clockHalf, TOWER.chamberCenterY, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <group position={[0, rosetteOffsetY, 0]}>
          <RosetteWindow restored={restored} />
        </group>
        <group position={[0, lancetOffsetY, 0]}>
          <LancetPair restored={restored} />
        </group>
      </group>

      {/* === UPPER CORNICE === */}
      <mesh
        position={[
          0,
          TOWER.clockTopY + TOWER.upperCorniceHeight / 2,
          0,
        ]}
      >
        <boxGeometry
          args={[TOWER.upperCorniceWidth, TOWER.upperCorniceHeight, TOWER.upperCorniceWidth]}
        />
        <meshStandardMaterial color={stoneDark} roughness={0.9} />
      </mesh>

      {/* === 4 CORNER PINNACLES === */}
      <CornerPinnacle restored={restored} x={pinXZ} z={pinXZ} />
      <CornerPinnacle restored={restored} x={-pinXZ} z={pinXZ} />
      <CornerPinnacle restored={restored} x={pinXZ} z={-pinXZ} />
      <CornerPinnacle restored={restored} x={-pinXZ} z={-pinXZ} />

      {/* === MAIN SPIRE === */}
      <mesh
        position={[
          0,
          TOWER.clockTopY + TOWER.upperCorniceHeight + TOWER.spireHeight / 2,
          0,
        ]}
      >
        <coneGeometry args={[TOWER.spireBaseWidth / 2, TOWER.spireHeight, 4]} />
        <meshStandardMaterial
          color={restored ? '#6a4828' : '#3a2818'}
          roughness={0.88}
        />
      </mesh>
      <mesh position={[0, TOWER.topY, 0]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial
          color={restored ? '#c89860' : '#5a4838'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.35 : 0}
          roughness={restored ? 0.5 : 0.9}
          metalness={restored ? 0.4 : 0}
        />
      </mesh>

      {/* === BELL === restored only, di belfry slot upper chamber.
          Offset to back, gak nutupin spire. */}
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

// AnniversaryGlow — halo emas di belakang FRONT CALENDAR dial (lower)
// saat hari ini cocok birthday Eli / milestone ELI_TIMELINE. Restored only.
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

// ShowtimeIndicator — DEPRECATED. Old design had a 19:00 marker pointing
// to position-7 of real-time WIB dial. Real-time dial removed in new
// design — kept as no-op stub so existing page imports don't break.
export const ShowtimeIndicator = () => null;
