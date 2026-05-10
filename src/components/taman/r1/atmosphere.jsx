/**
 * Particle systems + memory fragments untuk Konstelasi Perjalanan.
 *
 * - Fireflies: 16 emissive bola kuning-oranye drift orbital di
 *   corridor. Reactive retreat (mundur saat camera dekat) + flicker
 *   pulse + global blackout cycle.
 * - GroundMist: 70 wisp absolute oscillation (no cumulative drift).
 * - MistPools: 4 concentrated mist patches multi-Y layer di sides.
 * - FallingLeaves: 60 daun gugur autumn drift + reset cycle.
 * - FlyingLeavesGust: 14 daun gerombolan terbang lintasi scene tiap
 *   90-180 detik, swirl orbit + 3-axis tumble.
 * - MemoryFragments: 9 frasa puitis Html fade in/out per period,
 *   plus zoom proximity factor.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  CORRIDOR_X_HALF,
  CORRIDOR_Z_MIN,
  CORRIDOR_Z_LEN,
  ORBIT_TARGET,
  getWind,
  getFireflyBlackout,
} from './utils';

// Kunang-kunang — bola kecil emissive kuning-oranye dengan flicker
// pulse + drift orbital di sekitar home position. Twilight = perfect
// fit — bloom-less scene jadi emissive intensity bisa lebih kuat tanpa
// over-blow.
const Firefly = ({ def }) => {
  const ref = useRef();
  const matRef = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    // Reactive retreat — push pelan menjauh dari camera saat dekat
    const cam = state.camera.position;
    const dxc = def.home[0] - cam.x;
    const dyc = def.home[1] - cam.y;
    const dzc = def.home[2] - cam.z;
    const distC = Math.sqrt(dxc * dxc + dyc * dyc + dzc * dzc);
    const retreat = Math.max(0, Math.min(1, (14 - distC) / 5));
    const rx = (dxc / Math.max(distC, 0.01)) * retreat * 0.6;
    const rz = (dzc / Math.max(distC, 0.01)) * retreat * 0.6;
    ref.current.position.x =
      def.home[0] +
      Math.sin(t * 0.4 + def.phase) * 0.6 +
      wind.total * 0.25 +
      rx;
    ref.current.position.y =
      def.home[1] + Math.cos(t * 0.5 + def.phase) * 0.25;
    ref.current.position.z =
      def.home[2] + Math.cos(t * 0.35 + def.phase * 1.3) * 0.6 + rz;
    if (matRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(t * def.flicker + def.phase * 2);
      const gustDim = Math.max(0, Math.abs(wind.gust) - 0.5) * 0.5;
      const blackout = getFireflyBlackout(t);
      matRef.current.emissiveIntensity =
        (0.6 + pulse * 1.8) * (1 - gustDim) * (1 - blackout * 0.95);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.045, 6, 6]} />
      <meshStandardMaterial
        ref={matRef}
        color="#fff4a8"
        emissive="#ffc858"
        emissiveIntensity={1.4}
        roughness={1}
      />
    </mesh>
  );
};

const FIREFLY_DEFS = Array.from({ length: 16 }, () => ({
  home: [
    (Math.random() - 0.5) * CORRIDOR_X_HALF * 2,
    0.6 + Math.random() * 1.8,
    CORRIDOR_Z_MIN + Math.random() * CORRIDOR_Z_LEN,
  ],
  phase: Math.random() * Math.PI * 2,
  flicker: 2.5 + Math.random() * 2.5,
}));

export const Fireflies = ({ count }) => {
  const defs = count ? FIREFLY_DEFS.slice(0, count) : FIREFLY_DEFS;
  return (
    <>
      {defs.map((def, i) => (
        <Firefly key={`firefly-${i}`} def={def} />
      ))}
    </>
  );
};

// Kabut tanah — partikel wisp halus di base path, oscillation absolute
// (nggak cumulative drift) supaya bounded & nggak tembus ke bawah
// ground over time.
export const GroundMist = ({ count = 70 }) => {
  const ref = useRef();
  const basePositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (CORRIDOR_X_HALF * 2 + 6);
      // y 0.9..2.6 — sprite size 1.4 (bottom y - 0.7) tetap di atas ground
      arr[i * 3 + 1] = 0.9 + Math.random() * 1.7;
      arr[i * 3 + 2] =
        CORRIDOR_Z_MIN - 3 + Math.random() * (CORRIDOR_Z_LEN + 6);
    }
    return arr;
  }, [count]);

  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      arr[i * 3] =
        basePositions[i * 3] +
        Math.sin(t * 0.15 + phase) * 0.4 +
        wind.total * 0.5;
      arr[i * 3 + 1] =
        basePositions[i * 3 + 1] +
        Math.cos(t * 0.18 + phase * 1.3) * 0.12;
      arr[i * 3 + 2] =
        basePositions[i * 3 + 2] + Math.cos(t * 0.13 + phase) * 0.4;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={basePositions.slice()}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.4}
        color="#9aa5b8"
        transparent
        opacity={0.24}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Mist pool — concentrated mist patches di kiri-kanan path (di sides).
const MIST_POOL_DEFS = [
  { pos: [-7, 0, -7], radius: 3.5, count: 14 },
  { pos: [7, 0, -13], radius: 4.0, count: 16 },
  { pos: [-8, 0, -20], radius: 3.8, count: 15 },
  { pos: [7.5, 0, -27], radius: 3.6, count: 14 },
];

const MistPool = ({ pos, radius, count }) => {
  const ref = useRef();
  const basePositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      arr[i * 3] = pos[0] + Math.cos(angle) * r;
      // Multi-Y layer distribution untuk volumetric feel:
      // 50% low (0.2-0.8), 35% mid (0.8-1.6), 15% high (1.6-2.4)
      const layerR = Math.random();
      if (layerR < 0.5) arr[i * 3 + 1] = 0.2 + Math.random() * 0.6;
      else if (layerR < 0.85) arr[i * 3 + 1] = 0.8 + Math.random() * 0.8;
      else arr[i * 3 + 1] = 1.6 + Math.random() * 0.8;
      arr[i * 3 + 2] = pos[2] + Math.sin(angle) * r;
    }
    return arr;
  }, [pos, radius, count]);
  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [count]);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      arr[i * 3] =
        basePositions[i * 3] +
        Math.sin(t * 0.12 + phase) * 0.35 +
        wind.total * 0.32;
      arr[i * 3 + 1] =
        basePositions[i * 3 + 1] +
        Math.cos(t * 0.14 + phase * 1.3) * 0.08;
      arr[i * 3 + 2] =
        basePositions[i * 3 + 2] + Math.cos(t * 0.10 + phase) * 0.35;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={basePositions.slice()}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2.6}
        color="#adb6cc"
        transparent
        opacity={0.22}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

export const MistPools = () => (
  <>
    {MIST_POOL_DEFS.map((p, i) => (
      <MistPool key={`mistpool-${i}`} {...p} />
    ))}
  </>
);

// Daun gugur — tone autumn drift turun pelan dari atas pohon.
const AUTUMN_LEAF_COLORS = [
  '#c47a3a', // orange burnt
  '#d99a4a', // amber
  '#a85a30', // rust
  '#e0b760', // gold
  '#8a4a28', // deep brown
];

export const FallingLeaves = ({ count = 60 }) => {
  const ref = useRef();
  const colorRef = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (CORRIDOR_X_HALF * 2 + 4);
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = CORRIDOR_Z_MIN + Math.random() * CORRIDOR_Z_LEN;
    }
    return arr;
  }, [count]);

  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const hex =
        AUTUMN_LEAF_COLORS[
          Math.floor(Math.random() * AUTUMN_LEAF_COLORS.length)
        ];
      const v = parseInt(hex.slice(1), 16);
      arr[i * 3] = ((v >> 16) & 0xff) / 255;
      arr[i * 3 + 1] = ((v >> 8) & 0xff) / 255;
      arr[i * 3 + 2] = (v & 0xff) / 255;
    }
    return arr;
  }, [count]);

  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      arr[i * 2] = -0.05 - Math.random() * 0.04;
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.025;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 2 + 1] * delta * 60 + wind.total * 0.045;
      arr[i * 3 + 1] += velocities[i * 2] * delta;
      if (arr[i * 3 + 1] < 0.2) {
        arr[i * 3] = (Math.random() - 0.5) * (CORRIDOR_X_HALF * 2 + 4);
        arr[i * 3 + 1] = 5 + Math.random() * 3;
        arr[i * 3 + 2] = CORRIDOR_Z_MIN + Math.random() * CORRIDOR_Z_LEN;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          ref={colorRef}
          attach="attributes-color"
          array={colors}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Memory fragments — frasa puitis yang muncul samar dan fade
// independent tiap N detik. Plus zoom proximity factor: lebih
// kelihatan saat user zoom dekat ke scene.
const MEMORY_FRAGMENTS = [
  { pos: [-1.5, 0.7, -7], text: 'panggung pertama', phase: 0.0, period: 11 },
  { pos: [2.0, 0.8, -10], text: 'sorot lampu', phase: 0.45, period: 13 },
  {
    pos: [1.8, 0.8, -13],
    text: 'tangan kecil yang mengangkat',
    phase: 0.35,
    period: 13,
  },
  { pos: [-2.0, 0.7, -16], text: 'mata yang basah', phase: 0.7, period: 12 },
  { pos: [-1.2, 0.7, -19], text: 'rumah panggung', phase: 0.6, period: 10 },
  { pos: [2.2, 0.8, -22], text: 'lagu yang kau hapal', phase: 0.2, period: 14 },
  { pos: [1.5, 0.8, -25], text: 'untuk yang menunggu', phase: 0.15, period: 12 },
  { pos: [-1.8, 0.8, -28], text: 'apa kabar di sana', phase: 0.55, period: 11 },
  { pos: [-1.8, 0.7, -30], text: 'tahun yang panjang', phase: 0.8, period: 14 },
];

const MemoryFragment = ({ pos, text, phase = 0, period = 10 }) => {
  const divRef = useRef();
  useFrame((state) => {
    if (!divRef.current) return;
    const t = state.clock.elapsedTime;
    const u = ((t / period) + phase) % 1;
    let pulseOpacity = 0;
    if (u < 0.1) pulseOpacity = (u / 0.1) * 0.5;
    else if (u < 0.3) pulseOpacity = 0.5 - ((u - 0.1) / 0.2) * 0.5;
    const cam = state.camera.position;
    const dx = cam.x - ORBIT_TARGET[0];
    const dy = cam.y - ORBIT_TARGET[1];
    const dz = cam.z - ORBIT_TARGET[2];
    const camDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const normDist = Math.min(1, Math.max(0, (camDist - 12) / 16));
    const zoomFactor = 0.4 + (1 - normDist) * 0.6;
    divRef.current.style.opacity = String(pulseOpacity * zoomFactor);
  });
  return (
    <Html position={pos} center distanceFactor={9} occlude={false}>
      <div
        ref={divRef}
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontSize: '11px',
          color: '#fff8ea',
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
          textShadow: '0 0 8px rgba(255, 200, 100, 0.5)',
          letterSpacing: '0.5px',
        }}
      >
        {text}
      </div>
    </Html>
  );
};

// Mobile cull: drei <Html> mounting react portals per frame mahal di
// device kelas bawah — drop ke 5 fragment paling kunci, skip 4 sisanya.
export const MemoryFragments = ({ isMobile }) => {
  const list = isMobile ? MEMORY_FRAGMENTS.slice(0, 5) : MEMORY_FRAGMENTS;
  return (
    <>
      {list.map((f, i) => (
        <MemoryFragment key={`mem-${i}`} {...f} />
      ))}
    </>
  );
};

// Flying leaves gust — gerombolan daun gugur terbang lintasi scene
// tiap 90-180 detik. Per-leaf 3-axis tumble + swirl orbit + curve
// bias di X drift.
const FLYING_LEAF_COUNT = 14;
const FLYING_LEAF_DEFS = Array.from({ length: FLYING_LEAF_COUNT }, () => ({
  offsetX: (Math.random() - 0.5) * 2.0,
  offsetY: (Math.random() - 0.5) * 1.8,
  offsetZ: (Math.random() - 0.5) * 2.2,
  rotSpeedX: 1.5 + Math.random() * 2.8,
  rotSpeedY: 0.6 + Math.random() * 1.4,
  rotSpeedZ: 1.0 + Math.random() * 2.2,
  rotPhase: Math.random() * Math.PI * 2,
  delay: Math.random() * 0.7,
  colorIdx: Math.floor(Math.random() * AUTUMN_LEAF_COLORS.length),
  scale: 0.6 + Math.random() * 0.8,
  swirlRadius: 0.18 + Math.random() * 0.42,
  swirlFreq: 1.5 + Math.random() * 1.5,
  swirlPhase: Math.random() * Math.PI * 2,
  speedFactor: 0.85 + Math.random() * 0.4,
  curveBias: (Math.random() - 0.5) * 0.6,
}));

// Mobile cull: 14 → 8 leaves. Per-leaf 3-axis rotation + swirl orbit
// per frame is the heaviest math here, halving cuts useFrame loop cost.
export const FlyingLeavesGust = ({ isMobile }) => {
  const list = isMobile ? FLYING_LEAF_DEFS.slice(0, 8) : FLYING_LEAF_DEFS;
  const refs = useRef([]);
  const stateRef = useRef({
    active: false,
    t0: 0,
    next: 25 + Math.random() * 60,
  });
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!stateRef.current.active && t > stateRef.current.next) {
      stateRef.current = { active: true, t0: t, next: 0 };
    }
    if (!stateRef.current.active) return;
    const totalDt = t - stateRef.current.t0;
    const BASE_LIFECYCLE = 2.8;
    const MAX_DELAY = 0.7;
    let activeAny = false;
    list.forEach((leaf, i) => {
      const m = refs.current[i];
      if (!m) return;
      const dt = (totalDt - leaf.delay) * leaf.speedFactor;
      if (dt < 0) {
        m.visible = false;
        activeAny = true;
        return;
      }
      if (dt > BASE_LIFECYCLE) {
        m.visible = false;
        return;
      }
      activeAny = true;
      const u = dt / BASE_LIFECYCLE;
      const baseX = 12 - u * 24;
      const baseY = 6 - u * 5.5 + Math.sin(u * Math.PI) * 0.9;
      const baseZ = -10 - u * 15;
      const curveX = leaf.curveBias * Math.sin(u * Math.PI);
      const swirlT = t * leaf.swirlFreq + leaf.swirlPhase;
      const swirlX = Math.sin(swirlT) * leaf.swirlRadius;
      const swirlY = Math.cos(swirlT * 0.8) * leaf.swirlRadius * 0.5;
      const swirlZ = Math.cos(swirlT) * leaf.swirlRadius * 0.7;
      m.position.x = baseX + leaf.offsetX + curveX + swirlX;
      m.position.y = baseY + leaf.offsetY + swirlY;
      m.position.z = baseZ + leaf.offsetZ + swirlZ;
      m.rotation.x = t * leaf.rotSpeedX + leaf.rotPhase;
      m.rotation.y = t * leaf.rotSpeedY + leaf.rotPhase;
      m.rotation.z = t * leaf.rotSpeedZ + leaf.rotPhase;
      m.visible = true;
      if (m.material) {
        const opacity = u < 0.10 ? u / 0.10 : u > 0.88 ? (1 - u) / 0.12 : 1;
        m.material.opacity = opacity * 0.92;
      }
    });
    if (!activeAny || totalDt > BASE_LIFECYCLE + MAX_DELAY + 0.3) {
      stateRef.current = {
        active: false,
        t0: 0,
        next: t + 90 + Math.random() * 90,
      };
      list.forEach((_, i) => {
        if (refs.current[i]) refs.current[i].visible = false;
      });
    }
  });
  return (
    <>
      {list.map((leaf, i) => (
        <mesh
          key={`fly-leaf-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
          scale={leaf.scale}
        >
          <planeGeometry args={[0.24, 0.10]} />
          <meshStandardMaterial
            color={AUTUMN_LEAF_COLORS[leaf.colorIdx]}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
};
