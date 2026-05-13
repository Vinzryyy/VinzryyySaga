/**
 * Gothic balai kota (TownHall) + TwinTowerComplex wrapper.
 *
 * TownHall — bangunan persegi di tengah dua menara. Pointed-arch
 * doorway sentral di front, rosette window di atas pintu (front+back),
 * lancet pair flanking doorway, parapet crenellation, small central
 * turret/lantern di atap. Palette match ClockTower limestone palette.
 *
 * TwinTowerComplex — composite scene root: 2× ClockTower (X offset)
 * + 1× TownHall (center) + 2× AnniversaryGlow (per-tower).
 */

import React from 'react';
import * as THREE from 'three';
import { TOWER, HALL } from './constants';
import { ClockTower, AnniversaryGlow } from './ClockTower';

// ============================================================================
// PointedArchDoorway — recessed rectangular opening + triangular cone
// di atas sebagai pointed-arch top. Dark recess (interior).
// ============================================================================
const PointedArchDoorway = ({ restored }) => {
  const recessColor = restored ? '#2a1808' : '#1a0f08';
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const W = HALL.doorwayWidth;
  const H = HALL.doorwayHeight;
  const archH = W * 0.55;
  const rectH = H - archH;

  return (
    <group>
      {/* Recessed rectangle bawah */}
      <mesh position={[0, rectH / 2, 0]}>
        <planeGeometry args={[W, rectH]} />
        <meshStandardMaterial
          color={recessColor}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Pointed-arch atas (triangle cone) */}
      <mesh position={[0, rectH + archH / 2, 0]}>
        <coneGeometry args={[W / 2, archH, 3]} />
        <meshStandardMaterial
          color={recessColor}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Trim frame — outline kanan/kiri/atas */}
      <mesh position={[-W / 2 - 0.015, rectH / 2, 0.01]}>
        <boxGeometry args={[0.03, rectH, 0.04]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      <mesh position={[W / 2 + 0.015, rectH / 2, 0.01]}>
        <boxGeometry args={[0.03, rectH, 0.04]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      {/* Arch trim — thin curved-ish lines simulated dgn 3 small bars */}
      <mesh position={[0, rectH + archH * 0.5, 0.01]}>
        <coneGeometry args={[W / 2 + 0.025, archH + 0.02, 3, 1, true]} />
        <meshStandardMaterial
          color={trimColor}
          roughness={0.85}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Threshold step */}
      <mesh position={[0, 0.04, 0.06]}>
        <boxGeometry args={[W + 0.1, 0.08, 0.12]} />
        <meshStandardMaterial color={trimColor} roughness={0.92} />
      </mesh>
    </group>
  );
};

// ============================================================================
// RosetteFacade — rosette window khusus utk facade balai (lebih besar
// dari rosette menara). Spoke pattern 12 jari (lebih ornate).
// ============================================================================
const RosetteFacade = ({ restored }) => {
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const stoneColor = restored ? '#d4b894' : '#8a7a68';
  const R = HALL.rosetteRadius;

  return (
    <group>
      {/* Outer stone frame */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R * 1.1, R * 1.1, 0.06, 28]} />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      {/* Center glass / recess */}
      <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R, R, 0.04, 28]} />
        <meshStandardMaterial
          color={restored ? '#f4a868' : '#2a1808'}
          emissive={restored ? '#e88040' : '#000000'}
          emissiveIntensity={restored ? 0.5 : 0}
          roughness={0.5}
          transparent={restored}
          opacity={restored ? 0.85 : 1}
          toneMapped={false}
        />
      </mesh>
      {/* 12 spokes — gothic rose window classic */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r = R * 0.5;
        return (
          <mesh
            key={`fspoke-${i}`}
            position={[Math.sin(angle) * r, Math.cos(angle) * r, 0.055]}
            rotation={[0, 0, -angle]}
          >
            <boxGeometry args={[0.02, R * 0.94, 0.022]} />
            <meshStandardMaterial color={trimColor} roughness={0.8} />
          </mesh>
        );
      })}
      {/* Inner ring */}
      <mesh position={[0, 0, 0.06]}>
        <torusGeometry args={[R * 0.55, 0.012, 6, 28]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
      {/* Center boss */}
      <mesh position={[0, 0, 0.07]}>
        <sphereGeometry args={[0.055, 12, 8]} />
        <meshStandardMaterial
          color={restored ? '#a87838' : '#4a3828'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.35 : 0}
          roughness={0.55}
          metalness={restored ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// FlankLancet — single tall pointed-arch window. Dipakai per pair di
// kiri/kanan doorway.
// ============================================================================
const FlankLancet = ({ restored, x }) => {
  const recessColor = restored ? '#2a1808' : '#1a0f08';
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const stoneColor = restored ? '#d4b894' : '#8a7a68';
  const W = HALL.flankLancetWidth;
  const H = HALL.flankLancetHeight;
  const archH = W * 0.7;
  const rectH = H - archH;

  return (
    <group position={[x, 0, 0]}>
      {/* Stone frame surround */}
      <mesh position={[0, H / 2, -0.01]}>
        <planeGeometry args={[W + 0.08, H + 0.16]} />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      {/* Recessed rect */}
      <mesh position={[0, rectH / 2, 0]}>
        <planeGeometry args={[W, rectH]} />
        <meshStandardMaterial
          color={recessColor}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Pointed arch top */}
      <mesh position={[0, rectH + archH / 2, 0]}>
        <coneGeometry args={[W / 2, archH, 3]} />
        <meshStandardMaterial
          color={recessColor}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Center mullion */}
      <mesh position={[0, rectH / 2, 0.005]}>
        <boxGeometry args={[0.012, rectH, 0.008]} />
        <meshStandardMaterial color={trimColor} roughness={0.75} />
      </mesh>
      {/* Transom */}
      <mesh position={[0, rectH * 0.5, 0.005]}>
        <boxGeometry args={[W, 0.012, 0.008]} />
        <meshStandardMaterial color={trimColor} roughness={0.75} />
      </mesh>
    </group>
  );
};

// ============================================================================
// Parapet — crenellated top edge. Continuous band + alternating merlons
// (raised blocks) along the front/back/sides.
// ============================================================================
const Parapet = ({ restored }) => {
  const stoneColor = restored ? '#a08868' : '#6a5a48';
  const trimColor = restored ? '#5a3a18' : '#3a2818';

  // Continuous band sebelum merlon
  return (
    <group position={[0, HALL.height, 0]}>
      {/* Band */}
      <mesh position={[0, HALL.parapetHeight / 2, 0]}>
        <boxGeometry args={[HALL.width + 0.08, HALL.parapetHeight, HALL.depth + 0.08]} />
        <meshStandardMaterial color={stoneColor} roughness={0.9} />
      </mesh>
      {/* Trim line bawah band */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[HALL.width + 0.1, 0.024, HALL.depth + 0.1]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      {/* Merlons — alternating blocks di sepanjang front + back */}
      {Array.from({ length: HALL.merlonCount }, (_, i) => {
        if (i % 2 !== 0) return null; // raised every other
        const xStep = HALL.width / (HALL.merlonCount - 1);
        const x = -HALL.width / 2 + i * xStep;
        return (
          <React.Fragment key={`merlon-${i}`}>
            <mesh
              position={[
                x,
                HALL.parapetHeight + HALL.merlonHeight / 2,
                HALL.depth / 2,
              ]}
            >
              <boxGeometry args={[HALL.merlonWidth, HALL.merlonHeight, 0.12]} />
              <meshStandardMaterial color={stoneColor} roughness={0.9} />
            </mesh>
            <mesh
              position={[
                x,
                HALL.parapetHeight + HALL.merlonHeight / 2,
                -HALL.depth / 2,
              ]}
            >
              <boxGeometry args={[HALL.merlonWidth, HALL.merlonHeight, 0.12]} />
              <meshStandardMaterial color={stoneColor} roughness={0.9} />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
};

// ============================================================================
// CentralTurret — small octagonal lantern + spire di tengah atap balai.
// Match palette + scale tower spire (smaller).
// ============================================================================
const CentralTurret = ({ restored }) => {
  const stoneColor = restored ? '#c8a878' : '#8a7a68';
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const finialColor = restored ? '#c89860' : '#5a4838';

  return (
    <group position={[0, HALL.turretBaseY, 0]}>
      {/* Lantern shaft — octagonal cylinder */}
      <mesh position={[0, HALL.turretShaftHeight / 2, 0]}>
        <cylinderGeometry
          args={[HALL.turretBaseRadius, HALL.turretBaseRadius, HALL.turretShaftHeight, 8]}
        />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      {/* 4 small lancet-window cutout suggestions di lantern */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const r = HALL.turretBaseRadius + 0.001;
        return (
          <mesh
            key={`tlant-${i}`}
            position={[
              Math.sin(angle) * r,
              HALL.turretShaftHeight / 2,
              Math.cos(angle) * r,
            ]}
            rotation={[0, angle, 0]}
          >
            <planeGeometry args={[0.1, HALL.turretShaftHeight * 0.55]} />
            <meshStandardMaterial
              color={restored ? '#2a1808' : '#1a0f08'}
              roughness={0.95}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      {/* Trim ring di top lantern */}
      <mesh position={[0, HALL.turretShaftHeight + 0.02, 0]}>
        <cylinderGeometry
          args={[HALL.turretBaseRadius + 0.04, HALL.turretBaseRadius + 0.04, 0.04, 8]}
        />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>
      {/* Spire — octagonal cone */}
      <mesh position={[0, HALL.turretShaftHeight + HALL.turretSpireHeight / 2 + 0.04, 0]}>
        <coneGeometry args={[HALL.turretBaseRadius * 0.9, HALL.turretSpireHeight, 8]} />
        <meshStandardMaterial
          color={restored ? '#6a4828' : '#3a2818'}
          roughness={0.88}
        />
      </mesh>
      {/* Finial */}
      <mesh position={[0, HALL.turretShaftHeight + HALL.turretSpireHeight + 0.08, 0]}>
        <sphereGeometry args={[HALL.turretFinialRadius, 10, 8]} />
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
// TownHall — main balai body + facade ornament + parapet + turret.
// ============================================================================
export const TownHall = ({ restored }) => {
  const stoneLight = restored ? '#d4b894' : '#9a8a72';
  const stoneDark = restored ? '#a08868' : '#6a5a48';
  const trimColor = restored ? '#5a3a18' : '#3a2818';

  const halfW = HALL.width / 2;
  const halfD = HALL.depth / 2;
  const midY = HALL.height * HALL.midBandYFrac;
  const rosetteY = HALL.height * HALL.rosetteYFrac;
  const flankY = HALL.height * HALL.flankLancetYFrac;

  return (
    <group>
      {/* === MAIN BODY === */}
      <mesh position={[0, HALL.height / 2, 0]}>
        <boxGeometry args={[HALL.width, HALL.height, HALL.depth]} />
        <meshStandardMaterial color={stoneLight} roughness={0.88} />
      </mesh>
      {/* Plinth — base trim band */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[HALL.width + 0.1, 0.24, HALL.depth + 0.1]} />
        <meshStandardMaterial color={stoneDark} roughness={0.92} />
      </mesh>
      {/* Mid horizontal trim band */}
      <mesh position={[0, midY, 0]}>
        <boxGeometry args={[HALL.width + 0.04, HALL.midBandHeight, HALL.depth + 0.04]} />
        <meshStandardMaterial color={trimColor} roughness={0.85} />
      </mesh>

      {/* === FRONT FACADE (+Z) === doorway + rosette + lancet pair */}
      <group position={[0, 0, halfD + 0.001]}>
        <PointedArchDoorway restored={restored} />
        <group position={[0, rosetteY, 0]}>
          <RosetteFacade restored={restored} />
        </group>
        <group position={[0, flankY, 0]}>
          <FlankLancet restored={restored} x={-HALL.flankLancetXOffset} />
          <FlankLancet restored={restored} x={+HALL.flankLancetXOffset} />
        </group>
      </group>

      {/* === BACK FACADE (-Z) === mirror, no doorway — just rosette + lancet */}
      <group position={[0, 0, -halfD - 0.001]} rotation={[0, Math.PI, 0]}>
        <group position={[0, rosetteY, 0]}>
          <RosetteFacade restored={restored} />
        </group>
        <group position={[0, flankY, 0]}>
          <FlankLancet restored={restored} x={-HALL.flankLancetXOffset} />
          <FlankLancet restored={restored} x={+HALL.flankLancetXOffset} />
        </group>
      </group>

      {/* === SIDE WALLS (kiri/kanan) === sebagian besar ketutupan menara,
          tapi expose-able tip atas (above tower base). Cuma 1 lancet
          window simple di setiap sisi sebagai breakup texture. */}
      <group position={[halfW + 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <group position={[0, flankY + 0.3, 0]}>
          <FlankLancet restored={restored} x={0} />
        </group>
      </group>
      <group position={[-halfW - 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <group position={[0, flankY + 0.3, 0]}>
          <FlankLancet restored={restored} x={0} />
        </group>
      </group>

      {/* === PARAPET + TURRET === */}
      <Parapet restored={restored} />
      <CentralTurret restored={restored} />
    </group>
  );
};

// ============================================================================
// TwinTowerComplex — root composite scene element: 2× ClockTower
// (X offset) + 1× TownHall (center) + 2× AnniversaryGlow (per tower).
// ============================================================================
export const TwinTowerComplex = ({ restored }) => {
  const xOff = TOWER.twinXOffset;

  return (
    <group>
      {/* Balai kota di tengah — render dulu supaya tower overlap di edge
          (towers anchor di sudut depan balai, mirror Notre Dame facade). */}
      <TownHall restored={restored} />

      {/* Tower kiri */}
      <group position={[-xOff, 0, 0]}>
        <ClockTower restored={restored} />
        <AnniversaryGlow restored={restored} />
      </group>

      {/* Tower kanan */}
      <group position={[+xOff, 0, 0]}>
        <ClockTower restored={restored} />
        <AnniversaryGlow restored={restored} />
      </group>
    </group>
  );
};
