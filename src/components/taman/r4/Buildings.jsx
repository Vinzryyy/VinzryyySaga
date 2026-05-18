/**
 * Honden (shrine main hall) + TwinTowerComplex wrapper.
 *
 * Honden — bangunan kayu raised di tengah dua yagura. Stone base
 * (kasarakeyaku platform) → wooden body dgn pillar (hashira) + kōshi
 * lattice wall panels → kara-hafu cusped gable doorway sentral → curved
 * irimoya roof dgn deep overhanging eaves + chigi forked finials +
 * katsuogi cylindrical logs along ridge.
 *
 * TwinTowerComplex — composite: 2× ClockTower (X offset) + Honden
 * (center) + 2× AnniversaryGlow (per-tower).
 */

import React from 'react';
import * as THREE from 'three';
import { TOWER, HALL } from './constants';
import { ClockTower, AnniversaryGlow } from './ClockTower';

// ============================================================================
// KaraHafuDoorway — cusped/ogee curved gable above doorway. Iconic
// Japanese architectural feature. Simulate dgn 3 stacked elements:
// rectangular doorway recess + 2 ogee curve segments di atas.
// ============================================================================
const KaraHafuDoorway = ({ restored }) => {
  const recessColor = restored ? '#2a1808' : '#1a0f08';
  const woodColor = restored ? '#6a4828' : '#3a2818';
  const W = HALL.doorwayWidth;
  const H = HALL.doorwayHeight;
  const archH = HALL.karahafuHeight;

  return (
    <group>
      {/* Recessed doorway opening */}
      <mesh position={[0, H / 2, 0]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial
          color={recessColor}
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Door frame — wood lintel + jambs */}
      <mesh position={[-W / 2 - 0.04, H / 2, 0.015]}>
        <boxGeometry args={[0.08, H + 0.05, 0.05]} />
        <meshStandardMaterial color={woodColor} roughness={0.82} />
      </mesh>
      <mesh position={[W / 2 + 0.04, H / 2, 0.015]}>
        <boxGeometry args={[0.08, H + 0.05, 0.05]} />
        <meshStandardMaterial color={woodColor} roughness={0.82} />
      </mesh>
      <mesh position={[0, H + 0.04, 0.015]}>
        <boxGeometry args={[W + 0.16, 0.08, 0.05]} />
        <meshStandardMaterial color={woodColor} roughness={0.82} />
      </mesh>
      {/* Kara-hafu cusped gable — 2 curved segments meeting at peak.
          Simplified dgn 3 narrow boxes forming ogee silhouette. */}
      {/* Left curve segment (going up + in) */}
      <mesh
        position={[-W * 0.25, H + 0.08 + archH * 0.3, 0.02]}
        rotation={[0, 0, 0.35]}
      >
        <boxGeometry args={[W * 0.6, 0.08, 0.05]} />
        <meshStandardMaterial color={woodColor} roughness={0.82} />
      </mesh>
      {/* Right curve segment */}
      <mesh
        position={[W * 0.25, H + 0.08 + archH * 0.3, 0.02]}
        rotation={[0, 0, -0.35]}
      >
        <boxGeometry args={[W * 0.6, 0.08, 0.05]} />
        <meshStandardMaterial color={woodColor} roughness={0.82} />
      </mesh>
      {/* Top peak (small horizontal cap) */}
      <mesh position={[0, H + archH * 0.85, 0.02]}>
        <boxGeometry args={[W * 0.25, 0.06, 0.05]} />
        <meshStandardMaterial color={woodColor} roughness={0.82} />
      </mesh>
      {/* Triangular gable fill above doorway (under cusped curves) —
          dark plaster panel */}
      <mesh position={[0, H + archH * 0.45, 0]}>
        <planeGeometry args={[W * 0.85, archH * 0.7]} />
        <meshStandardMaterial
          color={restored ? '#a89878' : '#5a4838'}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Threshold step (stone) */}
      <mesh position={[0, 0.04, 0.08]}>
        <boxGeometry args={[W + 0.2, 0.08, 0.16]} />
        <meshStandardMaterial
          color={restored ? '#8a8278' : '#5a5048'}
          roughness={0.92}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// KoshiPanel — wood lattice wall panel (rectangular). Used between
// pillars on facade.
// ============================================================================
const KoshiPanel = ({ restored, width, height }) => {
  const woodColor = restored ? '#6a4828' : '#3a2818';
  const woodLight = restored ? '#8a6038' : '#4a3828';
  const div = HALL.koshiPanelDivisions;
  const barT = 0.012;
  const halfW = width / 2;
  const halfH = height / 2;
  const stepX = width / div;
  const stepY = height / div;

  return (
    <group>
      {/* Outer frame */}
      <mesh position={[0, halfH + 0.02, 0]}>
        <boxGeometry args={[width + 0.05, 0.04, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, -halfH - 0.02, 0]}>
        <boxGeometry args={[width + 0.05, 0.04, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      <mesh position={[halfW + 0.02, 0, 0]}>
        <boxGeometry args={[0.04, height, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      <mesh position={[-halfW - 0.02, 0, 0]}>
        <boxGeometry args={[0.04, height, 0.04]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      {/* Paper backplate */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={restored ? '#e8c898' : '#3a2818'}
          emissive={restored ? '#c89868' : '#000000'}
          emissiveIntensity={restored ? 0.2 : 0}
          roughness={0.6}
          transparent
          opacity={restored ? 0.7 : 0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Vertical bars */}
      {Array.from({ length: div + 1 }, (_, i) => {
        if (i === 0 || i === div) return null;
        const x = -halfW + i * stepX;
        return (
          <mesh key={`vp-${i}`} position={[x, 0, 0.01]}>
            <boxGeometry args={[barT, height, 0.014]} />
            <meshStandardMaterial color={woodLight} roughness={0.78} />
          </mesh>
        );
      })}
      {/* Horizontal bars */}
      {Array.from({ length: div + 1 }, (_, i) => {
        if (i === 0 || i === div) return null;
        const y = -halfH + i * stepY;
        return (
          <mesh key={`hp-${i}`} position={[0, y, 0.01]}>
            <boxGeometry args={[width, barT, 0.014]} />
            <meshStandardMaterial color={woodLight} roughness={0.78} />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================================
// IrimoyaCurvedRoof — large hip-and-gable roof utk honden. Lebih dalam
// eaves, lebih besar dari yagura roof.
// ============================================================================
const IrimoyaCurvedRoof = ({ restored }) => {
  const roofColor = restored ? '#3a3838' : '#1a2018';
  const roofTrim = restored ? '#5a3a18' : '#2a1808';
  const W = HALL.roofWidth;
  const D = HALL.roofDepth;
  const H = HALL.roofHeight;

  if (!restored) {
    // RUINED — main roof intact tapi banyak tile hilang (gap di tengah),
    // ridge cap sebagian hilang, 2 corner upturns hilang, moss patches
    const chunkW = W * 0.35;
    return (
      <group position={[0, HALL.roofBaseY, 0]}>
        {/* Left main chunk */}
        <mesh
          position={[-W / 2 + chunkW / 2 + 0.05, H * 0.4, 0]}
          rotation={[0, 0, -0.04]}
        >
          <boxGeometry args={[chunkW, H * 0.65, D]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
        {/* Right main chunk — sagging */}
        <mesh
          position={[W / 2 - chunkW / 2 - 0.05, H * 0.35, 0]}
          rotation={[0, 0, 0.05]}
        >
          <boxGeometry args={[chunkW, H * 0.58, D]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
        {/* Exposed central beam through gap */}
        <mesh position={[0, H * 0.18, 0]}>
          <boxGeometry args={[W * 0.6, 0.06, 0.08]} />
          <meshStandardMaterial color={roofTrim} roughness={0.95} />
        </mesh>
        {/* Eaves trim — only on edges (full band still visible) */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[W + 0.05, 0.06, D + 0.05]} />
          <meshStandardMaterial color={roofTrim} roughness={0.95} />
        </mesh>
        {/* Moss patches scattered on roof chunks */}
        {[
          [-W / 2 + 0.3, H * 0.7, D * 0.2],
          [W / 2 - 0.4, H * 0.65, -D * 0.2],
          [-W / 2 + 0.8, H * 0.7, -D * 0.25],
        ].map(([x, y, z], i) => (
          <mesh
            key={`hroof-moss-${i}`}
            position={[x, y, z]}
            rotation={[-Math.PI / 2, 0, i * 0.5]}
          >
            <circleGeometry args={[0.28 + (i % 2) * 0.06, 8]} />
            <meshStandardMaterial
              color={i % 2 ? '#4a5838' : '#3a4a28'}
              roughness={1}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
        {/* Only 2 of 4 corner upturns remain */}
        <mesh position={[-W / 2, H * 0.5 + HALL.roofUpturn / 2, D / 2]}>
          <coneGeometry args={[0.18, HALL.roofUpturn, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
        <mesh
          position={[W / 2, H * 0.5 + HALL.roofUpturn / 2, -D / 2]}
          rotation={[0.15, 0, 0]}
        >
          <coneGeometry args={[0.15, HALL.roofUpturn * 0.85, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.95} />
        </mesh>
      </group>
    );
  }

  // RESTORED — full clean roof
  return (
    <group position={[0, HALL.roofBaseY, 0]}>
      <mesh position={[0, H * 0.4, 0]}>
        <boxGeometry args={[W, H * 0.65, D]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, H * 0.85, 0]}>
        <boxGeometry args={[W * 0.85, H * 0.35, D * 0.7]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[W + 0.05, 0.06, D + 0.05]} />
        <meshStandardMaterial color={roofTrim} roughness={0.85} />
      </mesh>
      {[
        [W / 2, D / 2],
        [-W / 2, D / 2],
        [W / 2, -D / 2],
        [-W / 2, -D / 2],
      ].map(([x, z], i) => (
        <mesh
          key={`hupturn-${i}`}
          position={[x, H * 0.5 + HALL.roofUpturn / 2, z]}
        >
          <coneGeometry args={[0.18, HALL.roofUpturn, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// ChigiKatsuogi — chigi (X-shaped forked finials di gable ends) +
// katsuogi (cylindrical logs along roof ridge). Drought variant: 1 chigi
// fork broken/missing, fewer katsuogi, moss overlays.
// ============================================================================
const ChigiKatsuogi = ({ restored }) => {
  const woodColor = restored ? '#6a4828' : '#3a2818';
  const trimColor = restored ? '#a87838' : '#4a3828';
  const goldColor = restored ? '#c89860' : '#5a4838';

  const chigiZ = HALL.roofDepth / 2 - 0.05;
  const chigiSpread = 0.15;

  return (
    <group position={[0, HALL.roofTopY, 0]}>
      {/* === CHIGI === Front chigi intact (or broken if drought),
          back chigi: missing 1 fork di drought */}
      {[chigiZ, -chigiZ].map((z, i) => {
        const isBackChigi = i === 1;
        const breakRightFork = !restored && isBackChigi;
        const tiltLeftFork = !restored;
        return (
          <group key={`chigi-${i}`} position={[0, HALL.chigiHeight * 0.5, z]}>
            {/* Left fork — tilted di drought (broken hinge) */}
            <mesh
              position={[-chigiSpread, tiltLeftFork ? -0.05 : 0, 0]}
              rotation={[0, 0, tiltLeftFork ? 0.55 : 0.25]}
            >
              <boxGeometry
                args={[HALL.chigiThickness, HALL.chigiHeight, HALL.chigiThickness]}
              />
              <meshStandardMaterial color={woodColor} roughness={0.95} />
            </mesh>
            {/* Right fork — hilang kalau drought + isBackChigi */}
            {!breakRightFork && (
              <mesh position={[chigiSpread, 0, 0]} rotation={[0, 0, -0.25]}>
                <boxGeometry
                  args={[HALL.chigiThickness, HALL.chigiHeight, HALL.chigiThickness]}
                />
                <meshStandardMaterial color={woodColor} roughness={restored ? 0.85 : 0.95} />
              </mesh>
            )}
            {/* Stub remnant kalau broken */}
            {breakRightFork && (
              <mesh
                position={[chigiSpread, -HALL.chigiHeight * 0.3, 0]}
                rotation={[0, 0, -0.25]}
              >
                <boxGeometry
                  args={[HALL.chigiThickness, HALL.chigiHeight * 0.35, HALL.chigiThickness]}
                />
                <meshStandardMaterial color={woodColor} roughness={0.95} />
              </mesh>
            )}
            {/* Cross brace */}
            <mesh position={[0, -HALL.chigiHeight * 0.15, 0]}>
              <boxGeometry args={[chigiSpread * 2.5, 0.02, HALL.chigiThickness]} />
              <meshStandardMaterial color={trimColor} roughness={0.82} />
            </mesh>
            {/* Finial caps — only render if not broken */}
            {!tiltLeftFork && (
              <mesh
                position={[
                  -chigiSpread - Math.sin(0.25) * HALL.chigiHeight * 0.5,
                  HALL.chigiHeight * 0.5,
                  0,
                ]}
              >
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshStandardMaterial
                  color={goldColor}
                  emissive={restored ? '#e8a868' : '#000000'}
                  emissiveIntensity={restored ? 0.3 : 0}
                  roughness={0.5}
                  metalness={restored ? 0.4 : 0}
                />
              </mesh>
            )}
            {!breakRightFork && (
              <mesh
                position={[
                  chigiSpread + Math.sin(0.25) * HALL.chigiHeight * 0.5,
                  HALL.chigiHeight * 0.5,
                  0,
                ]}
              >
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshStandardMaterial
                  color={goldColor}
                  emissive={restored ? '#e8a868' : '#000000'}
                  emissiveIntensity={restored ? 0.3 : 0}
                  roughness={0.5}
                  metalness={restored ? 0.4 : 0}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* === KATSUOGI === cylindrical logs along roof ridge.
          Drought: drop middle log, tilt outer ones */}
      {Array.from({ length: HALL.katsuogiCount }, (_, i) => {
        // Skip middle log di drought (broken)
        if (!restored && i === Math.floor(HALL.katsuogiCount / 2)) return null;
        const totalLen = (HALL.roofDepth - 0.3) * 0.7;
        const step = totalLen / (HALL.katsuogiCount - 1);
        const zPos = -totalLen / 2 + i * step;
        const tiltZ = !restored ? (i === 0 ? 0.15 : i === HALL.katsuogiCount - 1 ? -0.15 : 0) : 0;
        return (
          <group
            key={`katsuogi-${i}`}
            position={[0, 0.04, zPos]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <mesh rotation={[0, 0, Math.PI / 2 + tiltZ]}>
              <cylinderGeometry
                args={[HALL.katsuogiRadius, HALL.katsuogiRadius, HALL.katsuogiLength, 10]}
              />
              <meshStandardMaterial
                color={woodColor}
                roughness={restored ? 0.85 : 0.95}
              />
            </mesh>
            <mesh
              position={[HALL.katsuogiLength / 2, 0, 0]}
              rotation={[0, 0, Math.PI / 2 + tiltZ]}
            >
              <circleGeometry args={[HALL.katsuogiRadius, 10]} />
              <meshStandardMaterial color={trimColor} roughness={0.78} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ============================================================================
// HondenRuin — drought-only overlay utk Honden: moss patches, broken
// pillar, rubble debris, cracked engawa.
// ============================================================================
const HondenRuin = () => {
  const mossColor = '#3a4a28';
  const mossLight = '#5a6838';
  const stoneRubble = '#5a4838';
  const crackColor = '#1a0f08';

  return (
    <group>
      {/* === MOSS PATCHES on stone base === scattered top + sides */}
      {[
        [1.5, HALL.baseHeight + 0.025, 0.8],
        [-1.6, HALL.baseHeight + 0.025, -0.4],
        [0.8, HALL.baseHeight + 0.025, -0.9],
        [-0.5, HALL.baseHeight + 0.025, 0.9],
        [2.0, HALL.baseHeight + 0.025, -0.6],
      ].map(([x, y, z], i) => (
        <mesh
          key={`hbase-moss-${i}`}
          position={[x, y, z]}
          rotation={[-Math.PI / 2, 0, i * 0.6]}
        >
          <circleGeometry args={[0.22 + (i % 2) * 0.08, 8]} />
          <meshStandardMaterial
            color={i % 2 ? mossColor : mossLight}
            roughness={1}
            transparent
            opacity={0.78}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Moss on engawa */}
      {[
        [1.2, HALL.baseHeight + HALL.engawaHeight + 0.001, HALL.depth / 2 + HALL.engawaDepth / 2],
        [-1.5, HALL.baseHeight + HALL.engawaHeight + 0.001, HALL.depth / 2 + HALL.engawaDepth / 2],
      ].map(([x, y, z], i) => (
        <mesh
          key={`engawa-moss-${i}`}
          position={[x, y, z]}
          rotation={[-Math.PI / 2, 0, i * 0.4]}
        >
          <planeGeometry args={[0.4, HALL.engawaDepth * 0.85]} />
          <meshStandardMaterial
            color={mossColor}
            roughness={1}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* === MOSS STREAKS on plaster body (vertical) === */}
      {[-1.4, 0.3, 1.6].map((xOff, i) => (
        <mesh
          key={`body-streak-${i}`}
          position={[
            xOff,
            HALL.baseHeight + HALL.bodyHeight * 0.45,
            HALL.depth / 2 + 0.008,
          ]}
        >
          <planeGeometry args={[0.18, HALL.bodyHeight * 0.7]} />
          <meshStandardMaterial
            color={mossColor}
            roughness={1}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* === CRACK LINES on plaster body === */}
      {[
        { x: -1.0, y: HALL.baseHeight + 1.5, rot: 0.4, len: 1.0 },
        { x: 1.7, y: HALL.baseHeight + 1.0, rot: -0.5, len: 0.9 },
      ].map((c, i) => (
        <mesh
          key={`honden-crack-${i}`}
          position={[c.x, c.y, HALL.depth / 2 + 0.009]}
          rotation={[0, 0, c.rot]}
        >
          <boxGeometry args={[0.014, c.len, 0.005]} />
          <meshStandardMaterial color={crackColor} roughness={0.95} />
        </mesh>
      ))}

      {/* === BROKEN PILLAR === salah satu hashira ke-2 di front patah,
          tergeletak diagonal ke ground */}
      <group position={[-HALL.width / 2 + (HALL.width / (HALL.pillarCount - 1)) * 1, 0.4, HALL.depth / 2 + 0.5]}>
        <mesh rotation={[Math.PI / 2.4, 0, 0.3]}>
          <cylinderGeometry
            args={[HALL.pillarRadius, HALL.pillarRadius * 1.1, HALL.bodyHeight * 0.7, 8]}
          />
          <meshStandardMaterial color="#3a2818" roughness={0.95} />
        </mesh>
      </group>

      {/* === RUBBLE DEBRIS === stones scattered di sekitar engawa */}
      {[
        { x: 1.8, z: HALL.depth / 2 + 0.5, scale: 0.18, rot: 0.4 },
        { x: -1.9, z: HALL.depth / 2 + 0.3, scale: 0.22, rot: 1.2 },
        { x: 0.7, z: -HALL.depth / 2 - 0.3, scale: 0.16, rot: 2.0 },
        { x: -0.5, z: -HALL.depth / 2 - 0.5, scale: 0.2, rot: 0.6 },
      ].map((r, i) => (
        <mesh
          key={`honden-rubble-${i}`}
          position={[r.x, r.scale / 2, r.z]}
          rotation={[r.rot * 0.3, r.rot, r.rot * 0.2]}
        >
          <boxGeometry args={[r.scale, r.scale, r.scale * 0.85]} />
          <meshStandardMaterial color={stoneRubble} roughness={0.98} />
        </mesh>
      ))}

      {/* === FALLEN TILES === dari roof, scattered di samping balai */}
      {[
        { x: 2.4, z: 0.8, rot: 0.5 },
        { x: -2.3, z: -0.4, rot: -0.8 },
        { x: 1.6, z: -1.5, rot: 1.1 },
      ].map((t, i) => (
        <mesh
          key={`htile-${i}`}
          position={[t.x, 0.04, t.z]}
          rotation={[-Math.PI / 2 + 0.15, 0, t.rot]}
        >
          <boxGeometry args={[0.3, 0.04, 0.22]} />
          <meshStandardMaterial color="#1a2018" roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// Honden — main shrine body composition.
// ============================================================================
export const Honden = ({ restored }) => {
  const stoneColor = restored ? '#8a8278' : '#5a5048';
  const stoneDark = restored ? '#6a6258' : '#4a4238';
  const plasterColor = restored ? '#d8c8a8' : '#8a7868';
  const woodColor = restored ? '#6a4828' : '#3a2818';

  const halfW = HALL.width / 2;
  const halfD = HALL.depth / 2;
  const baseY = HALL.baseHeight;

  // Pillar positions along front face (+Z facing)
  const pillarStep = HALL.width / (HALL.pillarCount - 1);
  const pillarXs = Array.from({ length: HALL.pillarCount }, (_, i) =>
    -halfW + i * pillarStep,
  );

  // Doorway centered — skip the panel slot just left of center (door fills
  // the gap between middlePillarIdxL and middlePillarIdxL+1).
  const middlePillarIdxL = Math.floor(HALL.pillarCount / 2) - 1;

  return (
    <group>
      {/* === STONE BASE (raised podium) === */}
      <mesh position={[0, baseY / 2, 0]}>
        <boxGeometry
          args={[
            HALL.width + HALL.baseOverhang * 2,
            baseY,
            HALL.depth + HALL.baseOverhang * 2,
          ]}
        />
        <meshStandardMaterial color={stoneColor} roughness={0.92} />
      </mesh>
      {/* Stone base top trim */}
      <mesh position={[0, baseY + 0.02, 0]}>
        <boxGeometry
          args={[
            HALL.width + HALL.baseOverhang * 2 + 0.04,
            0.04,
            HALL.depth + HALL.baseOverhang * 2 + 0.04,
          ]}
        />
        <meshStandardMaterial color={stoneDark} roughness={0.9} />
      </mesh>

      {/* === BODY === plaster walls (4 faces). Replace cuboid with 4
          plane walls supaya doorway recess + lattice bisa di overlay
          tanpa Z-fighting. Keep simple: single body box for backing,
          ornament di-overlay. */}
      <mesh position={[0, baseY + HALL.bodyHeight / 2, 0]}>
        <boxGeometry args={[HALL.width, HALL.bodyHeight, HALL.depth]} />
        <meshStandardMaterial color={plasterColor} roughness={0.9} />
      </mesh>

      {/* === ENGAWA (front veranda) === narrow wood platform protruding
          beyond front face, all along width */}
      <mesh position={[0, baseY + HALL.engawaHeight / 2, halfD + HALL.engawaDepth / 2]}>
        <boxGeometry
          args={[HALL.width + HALL.baseOverhang, HALL.engawaHeight, HALL.engawaDepth]}
        />
        <meshStandardMaterial color={woodColor} roughness={0.82} />
      </mesh>

      {/* === PILLARS (hashira) === wooden columns di front, supporting roof eaves.
          Run full height from base top to body top. */}
      {pillarXs.map((x, i) => (
        <mesh
          key={`hashira-${i}`}
          position={[x, baseY + HALL.bodyHeight / 2, halfD + 0.04]}
        >
          <cylinderGeometry
            args={[HALL.pillarRadius, HALL.pillarRadius, HALL.bodyHeight, 8]}
          />
          <meshStandardMaterial color={woodColor} roughness={0.85} />
        </mesh>
      ))}

      {/* === FRONT FACADE ornaments === doorway center + lattice panels
          on either side */}
      <group position={[0, baseY, halfD + 0.003]}>
        {/* Kara-hafu doorway, centered */}
        <KaraHafuDoorway restored={restored} />
        {/* Kōshi panels between pillars (excluding middle 2 around door) */}
        {pillarXs.slice(0, -1).map((x, i) => {
          if (i === middlePillarIdxL) return null; // door slot
          const panelW = pillarStep - HALL.pillarRadius * 2 - 0.04;
          const xCenter = x + pillarStep / 2;
          const yCenter = HALL.koshiPanelYStart + HALL.koshiPanelHeight / 2;
          return (
            <group
              key={`koshi-${i}`}
              position={[xCenter, yCenter, 0.02]}
            >
              <KoshiPanel
                restored={restored}
                width={panelW}
                height={HALL.koshiPanelHeight}
              />
            </group>
          );
        })}
      </group>

      {/* === BACK FACADE === pilars + lattice all the way (no door) */}
      {pillarXs.map((x, i) => (
        <mesh
          key={`hashira-back-${i}`}
          position={[x, baseY + HALL.bodyHeight / 2, -halfD - 0.04]}
        >
          <cylinderGeometry
            args={[HALL.pillarRadius, HALL.pillarRadius, HALL.bodyHeight, 8]}
          />
          <meshStandardMaterial color={woodColor} roughness={0.85} />
        </mesh>
      ))}
      <group
        position={[0, baseY, -halfD - 0.003]}
        rotation={[0, Math.PI, 0]}
      >
        {pillarXs.slice(0, -1).map((x, i) => {
          const panelW = pillarStep - HALL.pillarRadius * 2 - 0.04;
          const xCenter = x + pillarStep / 2;
          const yCenter = HALL.koshiPanelYStart + HALL.koshiPanelHeight / 2;
          return (
            <group
              key={`koshi-back-${i}`}
              position={[xCenter, yCenter, 0.02]}
            >
              <KoshiPanel
                restored={restored}
                width={panelW}
                height={HALL.koshiPanelHeight}
              />
            </group>
          );
        })}
      </group>

      {/* === SIDE WALLS — single kōshi panel each (mostly hidden by towers) */}
      <group
        position={[halfW + 0.003, baseY, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <group
          position={[0, HALL.koshiPanelYStart + HALL.koshiPanelHeight / 2, 0.02]}
        >
          <KoshiPanel
            restored={restored}
            width={HALL.depth * 0.7}
            height={HALL.koshiPanelHeight}
          />
        </group>
      </group>
      <group
        position={[-halfW - 0.003, baseY, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <group
          position={[0, HALL.koshiPanelYStart + HALL.koshiPanelHeight / 2, 0.02]}
        >
          <KoshiPanel
            restored={restored}
            width={HALL.depth * 0.7}
            height={HALL.koshiPanelHeight}
          />
        </group>
      </group>

      {/* === MAIN ROOF === irimoya curved hip-and-gable */}
      <IrimoyaCurvedRoof restored={restored} />

      {/* === CHIGI + KATSUOGI === roof ridge ornaments */}
      <ChigiKatsuogi restored={restored} />

      {/* === RUIN OVERLAY === drought-only moss + cracks + rubble +
          broken pillar */}
      {!restored && <HondenRuin />}
    </group>
  );
};

// ============================================================================
// TwinTowerComplex — root composite: 2× ClockTower (yagura) + Honden
// di tengah + AnniversaryGlow per-tower.
// ============================================================================
export const TwinTowerComplex = ({ restored }) => {
  const xOff = TOWER.twinXOffset;

  return (
    <group>
      {/* Honden di tengah — render dulu supaya yagura overlap di edge */}
      <Honden restored={restored} />

      {/* Yagura kiri */}
      <group position={[-xOff, 0, 0]}>
        <ClockTower restored={restored} />
        <AnniversaryGlow restored={restored} />
      </group>

      {/* Yagura kanan */}
      <group position={[+xOff, 0, 0]}>
        <ClockTower restored={restored} />
        <AnniversaryGlow restored={restored} />
      </group>
    </group>
  );
};
