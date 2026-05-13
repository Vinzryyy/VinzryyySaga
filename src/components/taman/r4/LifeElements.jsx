/**
 * Environment life elements untuk r4 — bawa elemen Japanese garden dari
 * `/taman/peta` (torii, ishi-doro, bamboo, tsukubai, jizo, paper lanterns,
 * fireflies, sakura petals) supaya scene gak kerasa kosong.
 *
 * Layout di plaza (radius ~9):
 *   - Torii gate di +Z 5.5 (entrance, framing kamera view)
 *   - Ishi-doro pair flanking tobi-ishi path (~ (±1.5, 0, +3))
 *   - Bamboo clusters di 4 corner area (~ ±5, 0, ±5)
 *   - Mossy boulders scattered
 *   - Tsukubai di kiri-depan
 *   - Jizo statue di kanan-belakang
 *   - PaperLanterns + WindChime + Fireflies + SakuraPetals (restored only)
 *   - WitheredTufts + DeadLeaves (drought only — udah ada minimal di Plaza,
 *     ini extra layer biar feel "abandoned")
 *
 * Mobile: skip fireflies + sakura petals + bamboo dense detail.
 *
 * Public export: <R4LifeElements restored isMobile />
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// TORII GATE — iconic Japanese shrine entrance. 2 columns + horizontal
// crossbeam (kasagi) + lintel (nuki). Vermillion red restored, weathered
// drought.
// ============================================================================
const ToriiGate = ({ restored }) => {
  const pillarColor = restored ? '#a83830' : '#5a3028';
  const pillarEmissive = restored ? '#5a1818' : '#000000';
  const beamColor = restored ? '#3a1808' : '#1a0f08';

  const w = 2.4; // span between pillars
  const h = 2.6; // pillar height
  const pR = 0.12; // pillar radius

  return (
    <group position={[0, 0, 5.5]}>
      {/* Left pillar */}
      <mesh position={[-w / 2, h / 2, 0]}>
        <cylinderGeometry args={[pR, pR * 1.15, h, 10]} />
        <meshStandardMaterial
          color={pillarColor}
          emissive={pillarEmissive}
          emissiveIntensity={restored ? 0.18 : 0}
          roughness={0.85}
        />
      </mesh>
      {/* Right pillar */}
      <mesh position={[w / 2, h / 2, 0]}>
        <cylinderGeometry args={[pR, pR * 1.15, h, 10]} />
        <meshStandardMaterial
          color={pillarColor}
          emissive={pillarEmissive}
          emissiveIntensity={restored ? 0.18 : 0}
          roughness={0.85}
        />
      </mesh>
      {/* Lintel (nuki) — horizontal beam below kasagi */}
      <mesh position={[0, h * 0.84, 0]}>
        <boxGeometry args={[w * 1.05, 0.12, 0.18]} />
        <meshStandardMaterial color={pillarColor} roughness={0.85} />
      </mesh>
      {/* Kasagi (top crossbeam) — curves up at ends, simulate w/ tapered box */}
      <mesh
        position={[0, h, 0]}
        rotation={!restored ? [0, 0, -0.05] : [0, 0, 0]}
      >
        <boxGeometry args={[w * 1.25, 0.16, 0.22]} />
        <meshStandardMaterial color={beamColor} roughness={0.85} />
      </mesh>
      {/* Kasagi end caps — flare up */}
      <mesh
        position={[-w * 1.25 / 2 - 0.04, h + 0.06, 0]}
        rotation={[0, 0, 0.25]}
      >
        <boxGeometry args={[0.18, 0.1, 0.22]} />
        <meshStandardMaterial color={beamColor} roughness={0.85} />
      </mesh>
      <mesh
        position={[w * 1.25 / 2 + 0.04, h + 0.06, 0]}
        rotation={[0, 0, -0.25]}
      >
        <boxGeometry args={[0.18, 0.1, 0.22]} />
        <meshStandardMaterial color={beamColor} roughness={0.85} />
      </mesh>
      {/* Drought — vertical crack on left pillar */}
      {!restored && (
        <mesh position={[-w / 2 + pR + 0.005, h * 0.5, 0]}>
          <boxGeometry args={[0.012, h * 0.7, 0.005]} />
          <meshStandardMaterial color="#1a0808" roughness={0.95} />
        </mesh>
      )}
      {/* Moss patch at base — drought */}
      {!restored && (
        <>
          <mesh position={[-w / 2 + 0.1, 0.02, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <circleGeometry args={[0.2, 8]} />
            <meshStandardMaterial
              color="#3a4a28"
              roughness={1}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[w / 2 - 0.1, 0.02, -0.05]} rotation={[-Math.PI / 2, 0, 0.6]}>
            <circleGeometry args={[0.18, 8]} />
            <meshStandardMaterial
              color="#4a5838"
              roughness={1}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

// ============================================================================
// ISHI-DORO — Japanese stone lantern. Square multi-tier: pedestal base,
// shaft, light chamber (hi-bukuro), capstone (kasa), finial. Pair
// flanking entrance path.
// ============================================================================
const IshiDoro = ({ restored, x, z, broken = false }) => {
  const stoneColor = restored ? '#8a8278' : '#5a5048';
  const lightRef = useRef();

  useFrame((state) => {
    if (!restored || !lightRef.current) return;
    const t = state.clock.elapsedTime;
    lightRef.current.emissiveIntensity = 0.7 + Math.sin(t * 0.8) * 0.2;
  });

  return (
    <group position={[x, 0, z]}>
      {/* Base pedestal — square stone block */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.3, 0.16, 0.3]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      {/* Shaft — narrower cylinder */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.4, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      {/* Hi-bukuro (light chamber) — box with cutout suggesting window */}
      {!broken && (
        <>
          <mesh position={[0, 0.66, 0]}>
            <boxGeometry args={[0.22, 0.2, 0.22]} />
            <meshStandardMaterial color={stoneColor} roughness={0.95} />
          </mesh>
          {/* Window glow (restored) */}
          {restored && (
            <mesh position={[0, 0.66, 0.112]}>
              <planeGeometry args={[0.12, 0.12]} />
              <meshStandardMaterial
                ref={lightRef}
                color="#f8d488"
                emissive="#f0a060"
                emissiveIntensity={0.7}
                transparent
                opacity={0.9}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          {restored && (
            <mesh position={[0, 0.66, -0.112]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.12, 0.12]} />
              <meshStandardMaterial
                color="#f8d488"
                emissive="#f0a060"
                emissiveIntensity={0.65}
                transparent
                opacity={0.85}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          {/* Kasa (capstone) — pyramidal cap */}
          <mesh position={[0, 0.85, 0]}>
            <coneGeometry args={[0.18, 0.16, 4]} />
            <meshStandardMaterial color={stoneColor} roughness={0.95} />
          </mesh>
          {/* Finial — small sphere */}
          <mesh position={[0, 0.96, 0]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={stoneColor} roughness={0.95} />
          </mesh>
        </>
      )}
      {/* Broken variant — capstone missing, lying nearby */}
      {broken && (
        <>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.22, 0.12, 0.22]} />
            <meshStandardMaterial color={stoneColor} roughness={0.98} />
          </mesh>
          {/* Fallen kasa di samping */}
          <mesh position={[0.35, 0.08, 0.1]} rotation={[Math.PI / 3, 0.4, 0]}>
            <coneGeometry args={[0.18, 0.16, 4]} />
            <meshStandardMaterial color={stoneColor} roughness={0.98} />
          </mesh>
        </>
      )}
      {/* Moss on base (drought) */}
      {!restored && (
        <mesh position={[0.1, 0.005, 0.08]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <circleGeometry args={[0.13, 8]} />
          <meshStandardMaterial
            color="#4a5838"
            roughness={1}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

// ============================================================================
// BAMBOO CLUSTER — small bamboo grove. Multiple stalks dgn slight Y
// variation. Green-yellow restored, dry-brown drought.
// ============================================================================
const BambooCluster = ({ restored, x, z, count = 6 }) => {
  const stalkColor = restored ? '#7a8a4a' : '#5a5028';
  const nodeColor = restored ? '#3a4818' : '#2a2410';

  // Deterministic positions
  const stalks = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (x + z) * 0.3;
      const r = 0.25 + (i % 3) * 0.15;
      return {
        x: Math.sin(angle) * r,
        z: Math.cos(angle) * r,
        h: 2.2 + (i % 4) * 0.4,
        rot: i * 0.3,
      };
    });
  }, [count, x, z]);

  return (
    <group position={[x, 0, z]}>
      {stalks.map((s, i) => (
        <group key={`bamboo-${i}`} position={[s.x, 0, s.z]} rotation={[0, s.rot, (i % 2 ? 0.04 : -0.04)]}>
          {/* Main stalk */}
          <mesh position={[0, s.h / 2, 0]}>
            <cylinderGeometry args={[0.035, 0.045, s.h, 8]} />
            <meshStandardMaterial color={stalkColor} roughness={0.85} />
          </mesh>
          {/* Bamboo nodes — 3-4 horizontal rings */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <mesh
              key={`node-${i}-${frac}`}
              position={[0, s.h * frac, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.04, 0.005, 4, 8]} />
              <meshStandardMaterial color={nodeColor} roughness={0.9} />
            </mesh>
          ))}
          {/* Top leaves cluster (restored only — drought is dry bare) */}
          {restored && (
            <mesh position={[0, s.h + 0.1, 0]}>
              <coneGeometry args={[0.18, 0.35, 5]} />
              <meshStandardMaterial
                color="#5a7028"
                roughness={0.85}
                transparent
                opacity={0.85}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

// ============================================================================
// MOSSY BOULDER — irregular stone w/ moss patch on top. Few scattered.
// ============================================================================
const MossyBoulder = ({ restored, x, z, scale = 0.4 }) => {
  const stoneColor = restored ? '#7a6850' : '#4a3828';
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, scale / 2, 0]} rotation={[0.1, x * 0.5, 0.05]}>
        <sphereGeometry args={[scale, 8, 6]} />
        <meshStandardMaterial color={stoneColor} roughness={0.98} />
      </mesh>
      {/* Moss cap on top */}
      <mesh position={[0, scale * 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[scale * 0.7, 10]} />
        <meshStandardMaterial
          color={restored ? '#5a7038' : '#3a4a28'}
          roughness={1}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// TSUKUBAI — Japanese ritual stone water basin. Squat cylindrical stone
// dgn cavity di top (water bowl). Bamboo spout sederhana di samping.
// ============================================================================
const Tsukubai = ({ restored, x, z }) => {
  const stoneColor = restored ? '#5a5048' : '#3a3028';
  const waterColor = restored ? '#3878a0' : '#1a2828';

  return (
    <group position={[x, 0, z]}>
      {/* Main basin body */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.36, 12]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      {/* Water surface — dark blue restored, dried/dirty drought */}
      <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial
          color={waterColor}
          roughness={restored ? 0.3 : 0.95}
          metalness={restored ? 0.6 : 0}
          emissive={restored ? '#1a2840' : '#000000'}
          emissiveIntensity={restored ? 0.15 : 0}
        />
      </mesh>
      {/* Bamboo spout (kakei) — slanted cylinder pouring water */}
      <mesh
        position={[-0.35, 0.45, 0]}
        rotation={[0, 0, Math.PI / 2 - 0.35]}
      >
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial
          color={restored ? '#8a6038' : '#4a3018'}
          roughness={0.85}
        />
      </mesh>
      {/* Vertical support pole for kakei */}
      <mesh position={[-0.45, 0.32, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.64, 8]} />
        <meshStandardMaterial
          color={restored ? '#8a6038' : '#4a3018'}
          roughness={0.85}
        />
      </mesh>
      {/* Drought: dried algae stains on basin */}
      {!restored && (
        <mesh position={[0.15, 0.36, 0.1]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <circleGeometry args={[0.08, 8]} />
          <meshStandardMaterial
            color="#3a4828"
            roughness={1}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

// ============================================================================
// JIZO STATUE — small Buddhist guardian statue, squat figure w/ rounded
// head + simple body. Sometimes wears red bib (restored = ada, drought = pudar).
// ============================================================================
const JizoStatue = ({ restored, x, z }) => {
  const stoneColor = restored ? '#9a9088' : '#5a5048';
  const bibColor = restored ? '#a83830' : '#5a3028';

  return (
    <group position={[x, 0, z]}>
      {/* Base */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.12, 10]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      {/* Body — cylindrical robe */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.36, 10]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      {/* Head — rounded sphere */}
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      {/* Bib (red cloth) */}
      <mesh position={[0, 0.49, 0.115]}>
        <planeGeometry args={[0.22, 0.16]} />
        <meshStandardMaterial
          color={bibColor}
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Closed eyes — 2 dark lines on head */}
      <mesh position={[-0.04, 0.65, 0.118]}>
        <boxGeometry args={[0.03, 0.005, 0.005]} />
        <meshStandardMaterial color="#1a0808" roughness={0.95} />
      </mesh>
      <mesh position={[0.04, 0.65, 0.118]}>
        <boxGeometry args={[0.03, 0.005, 0.005]} />
        <meshStandardMaterial color="#1a0808" roughness={0.95} />
      </mesh>
      {/* Moss base drought */}
      {!restored && (
        <mesh position={[0.05, 0.005, 0.1]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <circleGeometry args={[0.12, 8]} />
          <meshStandardMaterial
            color="#3a4a28"
            roughness={1}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

// ============================================================================
// PAPER LANTERN (chōchin) — hanging paper lantern. Cylindrical w/
// horizontal ribs. Warm glow restored. Single instance.
// ============================================================================
const PaperLantern = ({ restored, x, y, z, scale = 1 }) => {
  const lightRef = useRef();
  const groupRef = useRef();

  useFrame((state) => {
    if (!restored) return;
    const t = state.clock.elapsedTime;
    if (lightRef.current) {
      lightRef.current.emissiveIntensity = 0.65 + Math.sin(t * 0.9 + x * 1.3) * 0.18;
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.4 + x * 0.7) * 0.04;
    }
  });

  if (!restored) return null;

  return (
    <group ref={groupRef} position={[x, y, z]} scale={scale}>
      {/* Hanging cord */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.36, 4]} />
        <meshStandardMaterial color="#3a1808" roughness={0.95} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.085, 0.04, 10]} />
        <meshStandardMaterial color="#3a1808" roughness={0.85} />
      </mesh>
      {/* Lantern body — flared cylinder (paper) */}
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.24, 12]} />
        <meshStandardMaterial
          ref={lightRef}
          color="#f4d488"
          emissive="#e89860"
          emissiveIntensity={0.65}
          roughness={0.6}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      {/* Bamboo ribs — 3 horizontal rings */}
      {[-0.08, -0.14, -0.2].map((y2, i) => (
        <mesh
          key={`rib-${i}`}
          position={[0, y2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.087, 0.005, 4, 12]} />
          <meshStandardMaterial color="#3a1808" roughness={0.85} />
        </mesh>
      ))}
      {/* Bottom cap */}
      <mesh position={[0, -0.27, 0]}>
        <cylinderGeometry args={[0.075, 0.065, 0.03, 10]} />
        <meshStandardMaterial color="#3a1808" roughness={0.85} />
      </mesh>
    </group>
  );
};

// ============================================================================
// WIND CHIME (fūrin) — small glass bell w/ paper strip hanging from
// cord. Restored only, subtle sway.
// ============================================================================
const WindChime = ({ restored, x, y, z }) => {
  const groupRef = useRef();

  useFrame((state) => {
    if (!restored || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 1.2 + x) * 0.08;
  });

  if (!restored) return null;

  return (
    <group ref={groupRef} position={[x, y, z]}>
      {/* Hang cord */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.3, 4]} />
        <meshStandardMaterial color="#3a1808" roughness={0.95} />
      </mesh>
      {/* Glass bell — hemispherical */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#a8c8d8"
          emissive="#5878a0"
          emissiveIntensity={0.25}
          roughness={0.2}
          metalness={0.3}
          transparent
          opacity={0.7}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Clapper hanging inside */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 4]} />
        <meshStandardMaterial color="#3a1808" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.012, 6, 4]} />
        <meshStandardMaterial color="#8a6038" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Paper strip (tanzaku) below */}
      <mesh position={[0, -0.2, 0]}>
        <planeGeometry args={[0.04, 0.16]} />
        <meshStandardMaterial
          color="#f4e8c8"
          roughness={0.85}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// FIREFLIES — animated emissive points yang drift slow. Restored + non-mobile.
// ============================================================================
const Fireflies = ({ count = 14 }) => {
  const groupRef = useRef();
  const lights = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Spread across plaza in 3D — height 0.8-3.5 to feel alive at building level
      const angle = (i / count) * Math.PI * 2;
      const r = 2 + (i % 5) * 0.7;
      return {
        baseX: Math.sin(angle) * r + (i % 3 - 1) * 0.5,
        baseZ: Math.cos(angle) * r + (i % 4 - 1.5) * 0.4,
        baseY: 0.8 + (i % 6) * 0.45,
        phase: i * 0.7,
        speed: 0.4 + (i % 3) * 0.15,
      };
    });
  }, [count]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const l = lights[i];
      if (!l) return;
      child.position.x = l.baseX + Math.sin(t * l.speed + l.phase) * 0.6;
      child.position.y = l.baseY + Math.cos(t * l.speed * 0.7 + l.phase) * 0.35;
      child.position.z = l.baseZ + Math.sin(t * l.speed * 0.9 + l.phase * 1.5) * 0.5;
      const pulse = 0.6 + Math.sin(t * 1.8 + l.phase * 2) * 0.4;
      if (child.material) {
        child.material.emissiveIntensity = pulse;
        child.material.opacity = 0.7 + pulse * 0.3;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {lights.map((l, i) => (
        <mesh key={`firefly-${i}`} position={[l.baseX, l.baseY, l.baseZ]}>
          <sphereGeometry args={[0.025, 6, 4]} />
          <meshStandardMaterial
            color="#fff4a8"
            emissive="#f8c860"
            emissiveIntensity={0.8}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// SAKURA PETALS — falling pink petals. Restored + non-mobile.
// ============================================================================
const SakuraPetals = ({ count = 22 }) => {
  const groupRef = useRef();
  const petals = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      return {
        baseX: (i % 7 - 3) * 1.6 + Math.sin(i) * 0.5,
        baseZ: (i % 5 - 2) * 1.4 + Math.cos(i) * 0.5,
        startY: 6 + (i % 5) * 1.5,
        fallSpeed: 0.25 + (i % 4) * 0.08,
        swayAmp: 0.3 + (i % 3) * 0.15,
        phase: i * 0.5,
        rotSpeed: 0.4 + (i % 5) * 0.2,
      };
    });
  }, [count]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const p = petals[i];
      if (!p) return;
      // Fall + wrap-around cycle (8 unit fall range)
      const cycleY = ((t * p.fallSpeed + p.phase) % 8);
      child.position.y = p.startY - cycleY;
      child.position.x = p.baseX + Math.sin(t * 0.6 + p.phase) * p.swayAmp;
      child.position.z = p.baseZ + Math.cos(t * 0.5 + p.phase) * p.swayAmp * 0.7;
      child.rotation.x = t * p.rotSpeed;
      child.rotation.z = t * p.rotSpeed * 0.7;
    });
  });

  return (
    <group ref={groupRef}>
      {petals.map((p, i) => (
        <mesh key={`petal-${i}`} position={[p.baseX, p.startY, p.baseZ]}>
          <planeGeometry args={[0.08, 0.06]} />
          <meshStandardMaterial
            color="#f8c8d4"
            emissive="#e8a8b8"
            emissiveIntensity={0.15}
            roughness={0.8}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// SAKURA TREE — single decorative tree di belakang honden (background
// silhouette). Simple trunk + pink canopy cluster.
// ============================================================================
const SakuraTree = ({ restored, x, z }) => {
  const trunkColor = restored ? '#5a3818' : '#3a2010';

  return (
    <group position={[x, 0, z]}>
      {/* Trunk */}
      <mesh position={[0, 1.2, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.12, 0.18, 2.4, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.92} />
      </mesh>
      {/* Branches — 2 angled cylinders */}
      <mesh position={[-0.35, 2.0, 0.2]} rotation={[0.2, 0.4, 0.5]}>
        <cylinderGeometry args={[0.05, 0.08, 0.9, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.92} />
      </mesh>
      <mesh position={[0.4, 2.1, -0.15]} rotation={[-0.15, -0.3, -0.5]}>
        <cylinderGeometry args={[0.05, 0.07, 0.85, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.92} />
      </mesh>
      {/* Canopy — pink cloud cluster (3 overlapping spheres) restored */}
      {restored && (
        <>
          <mesh position={[0, 2.7, 0]}>
            <sphereGeometry args={[0.85, 12, 10]} />
            <meshStandardMaterial
              color="#f4b8c8"
              emissive="#e88098"
              emissiveIntensity={0.12}
              roughness={0.85}
              transparent
              opacity={0.92}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[-0.55, 2.55, 0.3]}>
            <sphereGeometry args={[0.6, 10, 8]} />
            <meshStandardMaterial
              color="#f8c4d0"
              emissive="#e88098"
              emissiveIntensity={0.1}
              roughness={0.85}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.5, 2.6, -0.2]}>
            <sphereGeometry args={[0.55, 10, 8]} />
            <meshStandardMaterial
              color="#f4b8c8"
              emissive="#e88098"
              emissiveIntensity={0.1}
              roughness={0.85}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
      {/* Drought — bare branches, no canopy. Add a few dead leaf clusters */}
      {!restored && (
        <>
          <mesh position={[0, 2.7, 0]}>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshStandardMaterial
              color="#3a2810"
              roughness={0.95}
              transparent
              opacity={0.55}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

// ============================================================================
// WILDFLOWER BUSH — small cluster of flowers (restored only).
// ============================================================================
const WildflowerBush = ({ x, z }) => {
  const flowerColors = ['#f0d088', '#e89098', '#d8a8c8', '#a8c890'];
  const flowers = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      x: (i % 3 - 1) * 0.12 + Math.sin(i * 1.3) * 0.06,
      z: (Math.floor(i / 3) - 1) * 0.1 + Math.cos(i * 1.7) * 0.06,
      y: 0.08 + (i % 3) * 0.06,
      color: flowerColors[i % flowerColors.length],
      scale: 0.08 + (i % 3) * 0.02,
    }));
  }, []);

  return (
    <group position={[x, 0, z]}>
      {/* Foliage base */}
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshStandardMaterial color="#4a6028" roughness={0.92} />
      </mesh>
      {/* Flower dots */}
      {flowers.map((f, i) => (
        <mesh key={`flower-${i}`} position={[f.x, f.y, f.z]}>
          <sphereGeometry args={[f.scale, 6, 4]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.15}
            roughness={0.85}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// WITHERED TUFTS — drought dead grass clumps. Small spiky brown clusters.
// ============================================================================
const WitheredTuft = ({ x, z, scale = 1 }) => {
  return (
    <group position={[x, 0, z]} scale={scale}>
      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const r = 0.05;
        return (
          <mesh
            key={`blade-${i}`}
            position={[Math.sin(angle) * r, 0.08, Math.cos(angle) * r]}
            rotation={[i * 0.15, angle, (i % 2 ? 0.2 : -0.2)]}
          >
            <coneGeometry args={[0.012, 0.18, 3]} />
            <meshStandardMaterial color="#3a3018" roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================================
// DEAD LEAF SCATTER — small flat leaf shapes on plaza floor (drought)
// ============================================================================
const DeadLeafScatter = ({ count = 16 }) => {
  const leaves = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.sin(i * 1.7) * 4.5),
      z: (Math.cos(i * 2.3) * 4.5),
      rot: i * 0.4,
      scale: 0.08 + (i % 3) * 0.02,
      color: i % 2 ? '#5a3818' : '#3a2810',
    }));
  }, [count]);

  return (
    <group>
      {leaves.map((l, i) => (
        <mesh
          key={`leaf-${i}`}
          position={[l.x, 0.03, l.z]}
          rotation={[-Math.PI / 2 + 0.05, 0, l.rot]}
        >
          <planeGeometry args={[l.scale * 2.2, l.scale * 1.3]} />
          <meshStandardMaterial
            color={l.color}
            roughness={0.95}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// R4LifeElements — composite root export.
// ============================================================================
export const R4LifeElements = ({ restored, isMobile }) => {
  return (
    <group>
      {/* === ALWAYS-ON === */}
      <ToriiGate restored={restored} />

      {/* Ishi-doro pair flanking entrance path (tobi-ishi). Drought: one broken */}
      <IshiDoro restored={restored} x={-1.4} z={3.2} />
      <IshiDoro restored={restored} x={1.4} z={3.2} broken={!restored} />

      {/* Bamboo clusters at 4 corners */}
      {!isMobile && (
        <>
          <BambooCluster restored={restored} x={-5.5} z={-4.5} count={6} />
          <BambooCluster restored={restored} x={5.5} z={-4.5} count={5} />
          <BambooCluster restored={restored} x={-5.5} z={4.0} count={5} />
          <BambooCluster restored={restored} x={5.5} z={4.0} count={4} />
        </>
      )}
      {/* Mobile fallback: 2 clusters only */}
      {isMobile && (
        <>
          <BambooCluster restored={restored} x={-5.0} z={-4.0} count={4} />
          <BambooCluster restored={restored} x={5.0} z={-4.0} count={4} />
        </>
      )}

      {/* Mossy boulders scattered */}
      <MossyBoulder restored={restored} x={-3.2} z={2.5} scale={0.32} />
      <MossyBoulder restored={restored} x={3.4} z={2.0} scale={0.38} />
      <MossyBoulder restored={restored} x={-4.0} z={-2.5} scale={0.42} />
      <MossyBoulder restored={restored} x={3.8} z={-3.0} scale={0.3} />

      {/* Tsukubai near left tower base */}
      <Tsukubai restored={restored} x={-4.0} z={1.0} />

      {/* Jizo statue near right tower */}
      <JizoStatue restored={restored} x={3.8} z={-1.5} />

      {/* Sakura tree behind honden (-Z direction) */}
      <SakuraTree restored={restored} x={-1.8} z={-4.5} />
      <SakuraTree restored={restored} x={1.8} z={-4.5} />

      {/* === RESTORED ONLY === */}
      {restored && (
        <>
          {/* Paper lanterns hanging under honden roof eaves (front) */}
          <PaperLantern restored x={-1.4} y={2.6} z={1.6} scale={1.05} />
          <PaperLantern restored x={-0.5} y={2.5} z={1.7} />
          <PaperLantern restored x={0.5} y={2.5} z={1.7} />
          <PaperLantern restored x={1.4} y={2.6} z={1.6} scale={1.05} />

          {/* Wind chime hanging from right yagura corner */}
          {!isMobile && (
            <WindChime restored x={3.4} y={6.5} z={1.0} />
          )}

          {/* Wildflower bushes */}
          <WildflowerBush x={-3.5} z={3.0} />
          <WildflowerBush x={3.5} z={3.0} />
          <WildflowerBush x={-2.8} z={-3.5} />
          <WildflowerBush x={2.8} z={-3.5} />

          {/* Fireflies — non-mobile only (perf) */}
          {!isMobile && <Fireflies count={14} />}
          {/* Sakura petals falling — non-mobile only */}
          {!isMobile && <SakuraPetals count={22} />}
        </>
      )}

      {/* === DROUGHT ONLY === */}
      {!restored && (
        <>
          {/* Withered tufts scattered */}
          <WitheredTuft x={-2.4} z={2.8} scale={1.2} />
          <WitheredTuft x={2.6} z={2.6} scale={1.0} />
          <WitheredTuft x={-3.0} z={-2.2} />
          <WitheredTuft x={3.2} z={-2.8} scale={1.1} />
          <WitheredTuft x={-1.8} z={3.8} />
          <WitheredTuft x={1.9} z={3.7} scale={0.9} />
          {/* Dead leaves scatter on plaza */}
          <DeadLeafScatter count={isMobile ? 10 : 18} />
        </>
      )}
    </group>
  );
};
