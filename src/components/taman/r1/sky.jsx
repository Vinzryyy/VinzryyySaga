/**
 * Celestial elements untuk Konstelasi Perjalanan.
 *
 * - SkyGroup: wrapper yang follow camera XZ di FPV mode (parallax-free
 *   sky), fixed di world origin di orbit mode.
 * - Stars (multi-layer): far/mid/bright background starfield. Mobile
 *   skip bright + halve far/mid counts. fog: false supaya stars stay
 *   bright tanpa di-fade.
 * - HighlightStars: 6 anchor sphere stars (4 di mobile) dgn pulse
 *   emissive + halo. Reaktif ke 'old' signature event (sync flash).
 * - Moon: dramatic 3-layer halo, bigger body, slow pulse outer haze.
 * - Nebula: 3 transparent emissive spheres mid-distance untuk color
 *   tints regional. Brightness lebih rendah dari moon (gak compete).
 * - ShootingStar: rare event tiap 25-50s, streak across sky 1.4s.
 */

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { lerp } from '../r3/utils';
import { SKY_CENTER } from './era';

// SkyGroup wrap semua celestial elements. Di FPV mode, group ikutin
// camera XZ supaya stars terasa "follow user" — parallax-free langit
// jauh, bintang stay relative terhadap user posisi (real night sky
// behavior). Di orbit mode, group fixed di SKY_CENTER.
//
// Lerp damping 0.08 untuk smooth follow saat user walk di FPV (gak
// snap kaku). Y axis stay 0 (sky stays at fixed altitude in world).
export const SkyGroup = ({ children, viewMode }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const cx = state.camera.position.x;
    const cz = state.camera.position.z;
    const targetX = viewMode === 'fpv' ? cx - SKY_CENTER[0] : 0;
    const targetZ = viewMode === 'fpv' ? cz - SKY_CENTER[2] : 0;
    groupRef.current.position.x = lerp(
      groupRef.current.position.x,
      targetX,
      0.08,
    );
    groupRef.current.position.z = lerp(
      groupRef.current.position.z,
      targetZ,
      0.08,
    );
  });
  return <group ref={groupRef}>{children}</group>;
};

// Multi-layer starfield — bikin "dunia penuh bintang" feeling.
// Tiga layer di radius berbeda, density tinggi, fog: false supaya
// stars stay bright regardless of distance.
const buildStarLayer = (count, rMin, rMax) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    // phi 0..0.62 = upper hemisphere lebih lebar (was 0.55), spread
    // stars lebih dekat ke horizon biar full sky coverage feel.
    const phi = Math.random() * Math.PI * 0.62;
    const r = rMin + Math.random() * (rMax - rMin);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) + 2;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    // All white, varying intensity (0.55..1.0) — beberapa terang
    // beberapa redup, kerasa real night sky tanpa color tinting.
    const intensity = 0.55 + Math.random() * 0.45;
    colors[i * 3] = intensity;
    colors[i * 3 + 1] = intensity;
    colors[i * 3 + 2] = intensity;
  }
  return { positions, colors };
};

const FAR_STAR = buildStarLayer(1100, 22, 38);
const MID_STAR = buildStarLayer(480, 13, 22);
const BRIGHT_STAR = buildStarLayer(110, 16, 30);
const FAR_STAR_MOBILE = buildStarLayer(650, 22, 38);
const MID_STAR_MOBILE = buildStarLayer(280, 13, 22);

const StarLayer = ({ data, size, baseOpacity, twinkleSpeed, twinkleAmp }) => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity =
      baseOpacity + Math.sin(t * twinkleSpeed) * twinkleAmp;
  });
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={data.positions}
          count={data.positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={data.colors}
          count={data.colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={size}
        vertexColors
        transparent
        opacity={baseOpacity}
        sizeAttenuation={false}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
};

export const Stars = ({ isMobile }) => (
  <>
    {/* Far backdrop — deep space dim layer */}
    <StarLayer
      data={isMobile ? FAR_STAR_MOBILE : FAR_STAR}
      size={1.2}
      baseOpacity={0.72}
      twinkleSpeed={0.7}
      twinkleAmp={0.12}
    />
    {/* Mid layer — closer + slight movement, lebih kerasa "ada di
        antara stars". Twinkle phase beda supaya gak sync sama far. */}
    <StarLayer
      data={isMobile ? MID_STAR_MOBILE : MID_STAR}
      size={1.6}
      baseOpacity={0.82}
      twinkleSpeed={0.45}
      twinkleAmp={0.18}
    />
    {/* Bright stars — bigger, sparser, more contrast. Slow pulse.
        Skip di mobile — fillrate cost tinggi. */}
    {!isMobile && (
      <StarLayer
        data={BRIGHT_STAR}
        size={2.6}
        baseOpacity={0.95}
        twinkleSpeed={0.3}
        twinkleAmp={0.10}
      />
    )}
  </>
);

// Highlight stars — 6 bright sphere stars di posisi tetap, kasih
// "anchor" visual di langit (focal points). Emissive intensity pulse
// per star dengan phase beda supaya twinkle natural.
const HIGHLIGHT_STAR_DEFS = [
  { pos: [-22, 22, -28], scale: 0.28, color: '#fff8d8', phase: 0 },
  { pos: [16, 24, -22], scale: 0.34, color: '#fffae8', phase: 1.4 },
  { pos: [-8, 28, -32], scale: 0.30, color: '#e8f0ff', phase: 2.7 },
  { pos: [22, 19, -10], scale: 0.26, color: '#fff8d8', phase: 0.8 },
  { pos: [-28, 18, 5], scale: 0.30, color: '#fffae8', phase: 2.0 },
  { pos: [4, 30, -18], scale: 0.36, color: '#fff4c8', phase: 3.2 },
];

const HighlightStar = ({ pos, scale, color, phase, signatureEvent }) => {
  const matRef = useRef();
  const haloMatRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    const fast = 0.5 + 0.5 * Math.sin(t * 6 + phase);
    const slow = 0.5 + 0.5 * Math.sin(t * 0.6 + phase * 1.4);
    let baseIntensity = 1.4 + fast * 0.6 + slow * 0.4;
    let haloOpacity = 0.18 + slow * 0.15;
    // Signature 'old' — semua highlight stars sync flash bareng
    if (signatureEvent && signatureEvent.type === 'old') {
      const dt = t - signatureEvent.time;
      if (dt > 0 && dt < 3.5) {
        let boost = 0;
        if (dt < 0.4) boost = dt / 0.4;
        else if (dt < 2.5) boost = 1;
        else boost = (3.5 - dt) / 1;
        baseIntensity += boost * 2.0;
        haloOpacity += boost * 0.5;
      }
    }
    matRef.current.emissiveIntensity = baseIntensity;
    if (haloMatRef.current) {
      haloMatRef.current.opacity = haloOpacity;
    }
  });
  return (
    <group position={pos} scale={scale}>
      <mesh>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          roughness={0.85}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.2, 12, 8]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={color}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Mobile cull: 6 → 4 highlight stars.
export const HighlightStars = ({ signatureEvent, isMobile }) => {
  const list = isMobile ? HIGHLIGHT_STAR_DEFS.slice(0, 4) : HIGHLIGHT_STAR_DEFS;
  return (
    <>
      {list.map((s, i) => (
        <HighlightStar
          key={`hl-star-${i}`}
          {...s}
          signatureEvent={signatureEvent}
        />
      ))}
    </>
  );
};

// Moon — dramatic, lebih besar + 3-layer halo untuk presence kuat di
// sky. Inner body + tight halo + soft outer haze. Slow pulse halo
// untuk subtle "breathing" feel.
export const Moon = () => {
  const outerHaloRef = useRef();
  useFrame((state) => {
    if (!outerHaloRef.current) return;
    const t = state.clock.elapsedTime;
    outerHaloRef.current.material.opacity = 0.07 + Math.sin(t * 0.3) * 0.025;
  });
  return (
    <group position={[-9, 14, -18]}>
      <mesh>
        <sphereGeometry args={[2.0, 28, 20]} />
        <meshStandardMaterial
          color="#fff8d8"
          emissive="#ffe8a8"
          emissiveIntensity={1.4}
          roughness={0.85}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.7, 22, 16]} />
        <meshBasicMaterial
          color="#ffe8a8"
          transparent
          opacity={0.18}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh ref={outerHaloRef}>
        <sphereGeometry args={[4.5, 20, 14]} />
        <meshBasicMaterial
          color="#ffd8a0"
          transparent
          opacity={0.07}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
};

// Nebula glow zones — sangat tipis color hints di mid-distance.
// Brightness dijaga lebih rendah dari moon halo. 3 nebulas, opacity
// 0.03-0.045, radii 5-6.
const NEBULA_DEFS = [
  { pos: [-13, 10, -6], radius: 6, color: '#9070d0', opacity: 0.045 },
  { pos: [11, 12, -16], radius: 6, color: '#d06090', opacity: 0.04 },
  { pos: [2, 14, 8], radius: 5, color: '#60c0b0', opacity: 0.035 },
];
export const Nebula = () => {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    NEBULA_DEFS.forEach((n, i) => {
      const m = refs.current[i];
      if (!m || !m.material) return;
      const phase = i * 1.7;
      m.material.opacity =
        n.opacity + Math.sin(t * 0.18 + phase) * n.opacity * 0.25;
    });
  });
  return (
    <>
      {NEBULA_DEFS.map((n, i) => (
        <mesh
          key={`neb-${i}`}
          position={n.pos}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <sphereGeometry args={[n.radius, 16, 12]} />
          <meshBasicMaterial
            color={n.color}
            transparent
            opacity={n.opacity}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </>
  );
};

// Shooting star — rare event tiap ~25-50 detik random. Spawn di random
// sky position, streak across via direction vector, fade in/out
// lifecycle 1.4 detik.
export const ShootingStar = () => {
  const meshRef = useRef();
  const stateRef = useRef({
    active: false,
    next: 8 + Math.random() * 20,
    t0: 0,
    start: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  });
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!stateRef.current.active && t > stateRef.current.next) {
      const startTheta = Math.random() * Math.PI * 2;
      const startPhi = 0.15 + Math.random() * 0.45;
      const r = 16 + Math.random() * 6;
      const sx = r * Math.sin(startPhi) * Math.cos(startTheta);
      const sy = r * Math.cos(startPhi) + 4;
      const sz = r * Math.sin(startPhi) * Math.sin(startTheta);
      stateRef.current.start.set(sx, sy, sz);
      const dirAngle = startTheta + Math.PI + (Math.random() - 0.5) * 0.8;
      stateRef.current.direction
        .set(
          Math.cos(dirAngle),
          -0.15 - Math.random() * 0.2,
          Math.sin(dirAngle),
        )
        .normalize()
        .multiplyScalar(18 + Math.random() * 8);
      stateRef.current.active = true;
      stateRef.current.t0 = t;
    }
    if (!stateRef.current.active || !meshRef.current) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    const dt = t - stateRef.current.t0;
    const lifecycle = 1.4;
    if (dt > lifecycle) {
      meshRef.current.visible = false;
      stateRef.current.active = false;
      stateRef.current.next = t + 25 + Math.random() * 25;
      return;
    }
    const u = dt / lifecycle;
    const offset = stateRef.current.direction.clone().multiplyScalar(u);
    meshRef.current.position.copy(stateRef.current.start).add(offset);
    meshRef.current.visible = true;
    if (meshRef.current.material) {
      const opacity = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1;
      meshRef.current.material.opacity = opacity;
    }
  });
  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[0.18, 10, 8]} />
      <meshBasicMaterial
        color="#fffae8"
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
};
