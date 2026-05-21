/**
 * FallingLeaves — daun jatuh atmospheric, always-on environment detail.
 *
 * Sparse density (18 leaves desktop / 10 mobile), falls dari Y=6 → 0.2,
 * cycle 12-18s per leaf. Beda dari ApricotPetals (purified-only, pink
 * petals) — ini autumn leaves orange/yellow/brown, available kapan aja.
 *
 * Visual: planeGeometry double-side, leaf-shaped via aspect ratio 1.4:1,
 * tumble rotation Z + X axis untuk natural flutter. Horizontal drift sway
 * via sin offset. Color palette 5 autumn shades alternating per leaf.
 *
 * Performance: leaves are flat planes (2 tri each), low draw cost.
 * Deterministic seeded positions — stable per mount.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const LEAF_COLORS = ['#d4a878', '#c89868', '#b07848', '#e0b888', '#a86838'];
const LEAF_COUNT_DESKTOP = 18;
const LEAF_COUNT_MOBILE = 10;

const Leaf = ({ idx }) => {
  const meshRef = useRef();
  // Deterministic seed
  const sx = (((idx * 2654435761) % 1009) / 1009 - 0.5) * 16;
  const sz = (((idx * 1597463) % 991) / 991 - 0.5) * 16;
  const cycleLen = 12 + (idx % 7);
  const color = LEAF_COLORS[idx % LEAF_COLORS.length];
  const baseSize = 0.09 + (((idx * 3145927) % 19) / 19) * 0.05; // 0.09-0.14
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const cycleT = ((t + idx * 0.8) / cycleLen) % 1;
    // Y descends 6 → 0.2
    const y = 6 - cycleT * 5.8;
    // Horizontal sway — gentle drift (leaves don't fall straight)
    meshRef.current.position.x = sx + 0.8 * Math.sin(t * 0.4 + idx * 0.7);
    meshRef.current.position.y = y;
    meshRef.current.position.z = sz + 0.6 * Math.cos(t * 0.35 + idx * 0.5);
    // Tumble rotation — flutter as falling
    meshRef.current.rotation.z = t * 0.8 + idx;
    meshRef.current.rotation.x = Math.sin(t * 1.2 + idx) * 0.6;
    // Fade in/out — peak mid-cycle
    meshRef.current.material.opacity = Math.sin(cycleT * Math.PI) * 0.75;
  });
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[baseSize * 1.4, baseSize]} />
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        transparent
        opacity={0.75}
        roughness={0.9}
      />
    </mesh>
  );
};

const FallingLeaves = ({ loaded = false, isMobile = false }) => {
  if (!loaded) return null;
  const total = isMobile ? LEAF_COUNT_MOBILE : LEAF_COUNT_DESKTOP;
  return (
    <>
      {Array.from({ length: total }).map((_, i) => (
        <Leaf key={`fl-${i}`} idx={i} />
      ))}
    </>
  );
};

export default FallingLeaves;
