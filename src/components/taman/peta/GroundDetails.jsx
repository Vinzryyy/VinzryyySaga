/**
 * GroundDetails — bundle ground-level detail buat ngilangin "editor
 * grid" feel di peta ArmeniacaTown. 5 sub-component visual yang break
 * uniformity green ground tanpa tabrakan landmark hit-target.
 *
 * Tier A — biggest impact, structural:
 *   - DirtPaths: 6 curved dirt paths radial dari Pohon → setiap landmark
 *     (Gerbang, Telaga, Arsip, Menara, Panggung, Aula). Quadratic Bezier
 *     curve dengan slight perpendicular offset = natural winding look.
 *   - TrampledCircle: trampled dirt disc radius 2.4 di base Pohon.
 *     "Tempat orang banyak ngumpul" feel.
 *
 * Tier B — texture variation:
 *   - GrassVariationPatches: 36 flat discs random positions, alternating
 *     antara lush green (#5a8a4a) dan dry yellow-green (#a8a878).
 *     Pecah uniform green tanpa add vertical objects.
 *   - PebbleScatter: 20 small sphere pebbles di non-landmark areas.
 *
 * Tier C — atmospheric details:
 *   - LeafPiles: 8 small leaf clusters scattered (5 leaves each, fallen
 *     petal style), warna apricot+yellow autumn palette. Cluster di area
 *     dekat Pohon + 2 path approaches.
 *
 * Position safety: semua titik >=1.5 unit dari landmark mayor. Mobile
 * cap: kurangi count buat hemat draw calls.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Tier A — Dirt Paths ─────────────────────────────────────────────
// 6 curved paths radial dari trampled-circle Pohon edge (R=2.2) ke
// setiap landmark. Quadratic Bezier with alternating perpendicular
// curve offset bikin natural winding (gak straight ke titik).
const PATH_TARGETS = [
  { to: [0, 0, 8.2], curveSign: 1 },     // Gerbang (south)
  { to: [-7, 0, -1], curveSign: -1 },    // Telaga (west)
  { to: [7, 0, -1], curveSign: 1 },      // Arsip (east)
  { to: [0, 0, -8], curveSign: -1 },     // Menara (north)
  { to: [5, 0, 5], curveSign: 1 },       // Panggung (SE)
  { to: [5, 0, -5], curveSign: -1 },     // Aula (NE)
];

const computeBezierPath = (start, ctrl, end, segments = 12) => {
  const pieces = [];
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    const u1 = 1 - t1;
    const u2 = 1 - t2;
    const p1x = u1 * u1 * start[0] + 2 * u1 * t1 * ctrl[0] + t1 * t1 * end[0];
    const p1z = u1 * u1 * start[2] + 2 * u1 * t1 * ctrl[2] + t1 * t1 * end[2];
    const p2x = u2 * u2 * start[0] + 2 * u2 * t2 * ctrl[0] + t2 * t2 * end[0];
    const p2z = u2 * u2 * start[2] + 2 * u2 * t2 * ctrl[2] + t2 * t2 * end[2];
    const midX = (p1x + p2x) / 2;
    const midZ = (p1z + p2z) / 2;
    const segDx = p2x - p1x;
    const segDz = p2z - p1z;
    const len = Math.hypot(segDx, segDz);
    const angle = Math.atan2(segDz, segDx);
    pieces.push({ x: midX, z: midZ, len, angle });
  }
  return pieces;
};

// Compute single point along bezier — t in [0, 1]
const bezierPoint = (start, ctrl, end, t) => {
  const u = 1 - t;
  return [
    u * u * start[0] + 2 * u * t * ctrl[0] + t * t * end[0],
    0,
    u * u * start[2] + 2 * u * t * ctrl[2] + t * t * end[2],
  ];
};

// Stepping stones polish — variation 4 lapis:
//   1. Color variation: 4 stone shades (gray + tan mix)
//   2. Shape variation: 70% cylinder pavers (rounded), 30% box slabs
//      (rectangular). Random distribution per-idx.
//   3. Slight tilt: small rotation.x and rotation.z (~0.05 rad) supaya
//      stones look "settled into ground", bukan perfectly upright.
//   4. Sink + dirt halo: stones slightly sunk (Y=0.018) dengan small
//      dark dirt disc di bawahnya = kerasa set-in-ground.
//   5. Moss accent: 30% stones dapet small green moss patch di top.
//   6. Count up: 6 stones per path (sebelumnya 4) = 36 total across 6 paths.
const STONE_COLORS = ['#8a7868', '#9a8878', '#7a6a5a', '#6a5848'];
const STONE_TS = [0.12, 0.28, 0.44, 0.60, 0.76, 0.90];

const SteppingStone = ({ x, z, r, rot, tilt, colorIdx, isSlab, hasMoss, idx }) => {
  return (
    <group position={[x, 0.018, z]} rotation={[tilt.x, rot, tilt.z]}>
      {/* Subtle dirt halo below — disc dark di sekeliling stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <circleGeometry args={[r * 1.5, 12]} />
        <meshStandardMaterial
          color="#3a2818"
          roughness={1}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      {/* Stone body — cylinder pavers atau box slabs */}
      {isSlab ? (
        <mesh position={[0, 0.025, 0]}>
          <boxGeometry args={[r * 1.7, 0.05, r * 1.3]} />
          <meshStandardMaterial color={STONE_COLORS[colorIdx]} roughness={1} />
        </mesh>
      ) : (
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[r, r * 1.05, 0.05, 7]} />
          <meshStandardMaterial color={STONE_COLORS[colorIdx]} roughness={1} />
        </mesh>
      )}
      {/* Moss accent (30% stones) — small green patch di atas */}
      {hasMoss && (
        <mesh
          rotation={[-Math.PI / 2, 0, idx * 0.5]}
          position={[r * 0.25, 0.052, -r * 0.15]}
        >
          <circleGeometry args={[r * 0.5, 8]} />
          <meshStandardMaterial
            color="#5a8a5a"
            roughness={0.95}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  );
};

const PathSteppingStones = () => {
  const allStones = [];
  PATH_TARGETS.forEach((target, pIdx) => {
    const { to, curveSign } = target;
    const startR = 2.2;
    const angle = Math.atan2(to[2], to[0]);
    const start = [Math.cos(angle) * startR, 0, Math.sin(angle) * startR];
    const dx = to[0] - start[0];
    const dz = to[2] - start[2];
    const lenH = Math.hypot(dx, dz);
    const perpX = -dz / lenH;
    const perpZ = dx / lenH;
    const curveOffset = curveSign * 0.6;
    const ctrl = [
      (start[0] + to[0]) / 2 + perpX * curveOffset,
      0,
      (start[2] + to[2]) / 2 + perpZ * curveOffset,
    ];
    STONE_TS.forEach((t, sIdx) => {
      const [sx, , sz] = bezierPoint(start, ctrl, to, t);
      const globalIdx = pIdx * STONE_TS.length + sIdx;
      // Deterministic seeded jitter
      const s1 = ((globalIdx * 2654435761) % 1009) / 1009;
      const s2 = ((globalIdx * 1597463) % 991) / 991;
      const s3 = ((globalIdx * 8675309) % 1013) / 1013;
      const perpOffset = (sIdx % 2 === 0 ? 0.08 : -0.08) * (0.5 + s1 * 0.5);
      const r = 0.15 + s2 * 0.07; // 0.15-0.22
      const rot = s1 * Math.PI;
      const tilt = {
        x: (s2 - 0.5) * 0.1,  // -0.05 to 0.05 rad
        z: (s3 - 0.5) * 0.1,
      };
      const colorIdx = Math.floor(s1 * 4);
      const isSlab = s2 < 0.3; // 30% slabs
      const hasMoss = s3 < 0.3; // 30% mossy
      allStones.push({
        x: sx + perpX * perpOffset,
        z: sz + perpZ * perpOffset,
        r,
        rot,
        tilt,
        colorIdx,
        isSlab,
        hasMoss,
        idx: globalIdx,
      });
    });
  });
  return (
    <>
      {allStones.map((s, i) => (
        <SteppingStone key={`pss-${i}`} {...s} />
      ))}
    </>
  );
};

// PathEndGlow — single breathing glow di landmark approach. Opacity +
// scale pulse via useFrame, slow ~3.5s breath cycle, phase offset per
// landmark. Subtle "invitation pulse" — bukan flat static glow.
const PathEndGlow = ({ to, idx }) => {
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Breath cycle ~3.5s, slow inhale-exhale per landmark
    const breath = 0.5 + Math.sin(t * 1.8 + idx * 0.6) * 0.5;
    meshRef.current.material.opacity = 0.12 + breath * 0.14; // 0.12-0.26
    const scale = 0.95 + breath * 0.1; // 0.95-1.05
    meshRef.current.scale.setScalar(scale);
  });
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[to[0], 0.018, to[2]]}
    >
      <circleGeometry args={[0.9, 24]} />
      <meshBasicMaterial
        color="#f4c898"
        transparent
        opacity={0.18}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
};

const PathEndGlows = () => (
  <>
    {PATH_TARGETS.map((p, i) => (
      <PathEndGlow key={`peg-${i}`} to={p.to} idx={i} />
    ))}
  </>
);

// ── Tier A — Trampled Circle ─────────────────────────────────────────
// Trampled dirt disc di base Pohon, kerasa "tempat orang ngumpul lama".
// Sedikit darker dari path color. Slight noise via 8 footprint smudges
// di rim circle (small ellipse-ish boxes).
// Trampled grass tuft — single blade poking through trampled dirt.
// Cone geometry tipis, sway gentle via useFrame. Phase offset per-idx.
const TrampledGrassTuft = ({ pos, idx }) => {
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Wind gust sync (same formula as festival sway elements)
    const gustMul = 1 + Math.max(0, Math.sin((t / 9) * Math.PI * 2)) * 1.2;
    meshRef.current.rotation.z = 0.18 * gustMul * Math.sin(t * 1.4 + idx * 0.9);
  });
  return (
    <mesh ref={meshRef} position={pos}>
      <coneGeometry args={[0.025, 0.16, 4]} />
      <meshStandardMaterial color="#6a8a4a" roughness={0.9} />
    </mesh>
  );
};

const TrampledCircle = () => (
  <group>
    {/* Main disc */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
      <circleGeometry args={[2.4, 32]} />
      <meshStandardMaterial
        color="#5a4030"
        roughness={1}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </mesh>
    {/* 8 footprint smudge di rim — kerasa walked-on */}
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2 + 0.3;
      const r = 1.9 + (i % 2) * 0.25;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      return (
        <mesh
          key={`smudge-${i}`}
          rotation={[-Math.PI / 2, 0, -angle]}
          position={[x, 0.011, z]}
        >
          <planeGeometry args={[0.18, 0.1]} />
          <meshStandardMaterial
            color="#3a2818"
            roughness={1}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      );
    })}
    {/* Trampled grass tufts — 6 blades sparse di rim, kerasa "life
        returning" (sedikit hijau muncul dari dirt). Phase-offset sway
        animation via useFrame. */}
    {Array.from({ length: 6 }).map((_, i) => {
      const angle = (i / 6) * Math.PI * 2 + 0.7;
      const r = 1.6 + (i % 3) * 0.35;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      return <TrampledGrassTuft key={`tuft-${i}`} pos={[x, 0.08, z]} idx={i} />;
    })}
  </group>
);

// ── Tier B — Grass Variation Patches ─────────────────────────────────
// 36 flat discs di random positions, alternating lush green vs dry
// yellow-green. Pecah uniform green tanpa add vertical clutter.
// Deterministic seeded positions — stable across reload.
const GRASS_PATCH_COUNT = 36;
const GRASS_PATCHES = (() => {
  const patches = [];
  for (let i = 0; i < GRASS_PATCH_COUNT; i++) {
    // Seeded pseudo-random
    const s1 = ((i * 2654435761) % 1009) / 1009;
    const s2 = ((i * 1597463) % 991) / 991;
    const s3 = ((i * 8675309) % 1013) / 1013;
    // Polar distribution dengan jitter — sebar 1.5-9.5 radius dari center
    const angle = (i / GRASS_PATCH_COUNT) * Math.PI * 2 + s1 * 0.8;
    const radius = 1.5 + s2 * 8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const size = 0.5 + s3 * 0.7; // patch size 0.5-1.2
    const isLush = i % 3 !== 0; // 2/3 lush, 1/3 dry — bias lush
    patches.push({ x, z, size, isLush });
  }
  return patches;
})();

const GrassVariationPatches = ({ isMobile = false }) => {
  // Mobile cap — render 60% buat hemat draw calls
  const items = isMobile ? GRASS_PATCHES.slice(0, 22) : GRASS_PATCHES;
  return (
    <>
      {items.map((p, i) => (
        <mesh
          key={`grass-p-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[p.x, 0.009, p.z]}
        >
          <circleGeometry args={[p.size, 12]} />
          <meshStandardMaterial
            color={p.isLush ? '#5a8a4a' : '#a8a878'}
            roughness={0.95}
            transparent
            opacity={p.isLush ? 0.4 : 0.32}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
};

// ── Tier B — Pebble Scatter ─────────────────────────────────────────
// 20 small spheres scattered di non-landmark areas. Pebbles low-poly
// (sphere args 6,5) hemat tris. Position safe via deterministic seed
// dengan exclusion radius dari landmark center.
const PEBBLE_DEFS = (() => {
  const defs = [];
  const safe = [
    [0, 0], // Pohon
    [0, 8], // Gerbang
    [-7, -1], // Telaga
    [7, -1], // Arsip
    [0, -8], // Menara
    [5, 5], // Panggung
    [5, -5], // Aula
    [-3, 3.5], // Air Mancur
  ];
  for (let i = 0; i < 20; i++) {
    let x, z, tries = 0;
    do {
      const s1 = (((i + tries) * 2654435761) % 1009) / 1009;
      const s2 = (((i + tries) * 1597463) % 991) / 991;
      const angle = s1 * Math.PI * 2;
      const r = 2.8 + s2 * 6.5;
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      tries++;
      if (tries > 10) break;
    } while (safe.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.5));
    const s3 = ((i * 8675309) % 1013) / 1013;
    defs.push({
      x,
      z,
      size: 0.05 + s3 * 0.08, // 0.05-0.13
      rot: s3 * Math.PI,
      colorIdx: i % 3,
    });
  }
  return defs;
})();
const PEBBLE_COLORS = ['#6a6258', '#7a7268', '#5a5248'];

const PebbleScatter = ({ isMobile = false }) => {
  const items = isMobile ? PEBBLE_DEFS.slice(0, 12) : PEBBLE_DEFS;
  return (
    <>
      {items.map((p, i) => (
        <mesh
          key={`peb-${i}`}
          position={[p.x, p.size * 0.4, p.z]}
          rotation={[0, p.rot, 0]}
        >
          <sphereGeometry args={[p.size, 6, 5]} />
          <meshStandardMaterial color={PEBBLE_COLORS[p.colorIdx]} roughness={0.92} />
        </mesh>
      ))}
    </>
  );
};

// ── Tier C — Leaf Piles ─────────────────────────────────────────────
// 8 cluster of fallen leaves di area dekat Pohon + path approaches.
// Each cluster: 5 flat plane leaves tersebar dlm radius kecil (~0.4).
// Color: apricot+yellow autumn palette (#d4a878, #c89868, #b07848).
const LEAF_PILE_CENTERS = [
  // Around Pohon trampled edge
  [2.5, 0, 0.5],
  [-2.3, 0, -0.8],
  [0.3, 0, 2.6],
  [-1.8, 0, 1.6],
  // Mid-path approaches
  [3.5, 0, 3.5], // toward Panggung path
  [-3.5, 0, 2.8], // toward Telaga path
  [2.8, 0, -3.0], // toward Aula path
  [-1.5, 0, -4.5], // toward Menara path
];
const LEAF_COLORS = ['#d4a878', '#c89868', '#b07848', '#e0b888', '#a86838'];

// Single leaf — flat plane with gentle sway animation. Lying flat on
// ground (rotation.x = -PI/2), gentle rotation around Y axis (own
// normal) — kerasa kayak angin gerakin leaf di tanah.
const Leaf = ({ pos, rot, size, color, idx }) => {
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Wind gust sync — daun jatuh juga kena angin. Amplitude scales
    // dengan gust (calm = subtle, windy = stronger sway)
    const gustMul = 1 + Math.max(0, Math.sin((t / 9) * Math.PI * 2)) * 1.2;
    meshRef.current.rotation.z = rot + 0.25 * gustMul * Math.sin(t * 0.7 + idx * 1.3);
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, rot]} position={pos}>
      <planeGeometry args={[size * 1.6, size]} />
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.9}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
};

const LeafPile = ({ center, idx }) => {
  // 5 leaves per pile, sebar deterministic
  const leaves = [];
  for (let i = 0; i < 5; i++) {
    const s1 = ((idx * 5 + i) * 2654435761) % 1009 / 1009;
    const s2 = ((idx * 5 + i) * 1597463) % 991 / 991;
    const s3 = ((idx * 5 + i) * 8675309) % 1013 / 1013;
    const angle = s1 * Math.PI * 2;
    const r = s2 * 0.4;
    const x = center[0] + Math.cos(angle) * r;
    const z = center[2] + Math.sin(angle) * r;
    leaves.push({
      x,
      z,
      rot: s3 * Math.PI,
      size: 0.08 + s2 * 0.05,
      color: LEAF_COLORS[(idx + i) % LEAF_COLORS.length],
    });
  }
  return (
    <>
      {leaves.map((l, i) => (
        <Leaf
          key={`leaf-${idx}-${i}`}
          pos={[l.x, 0.013, l.z]}
          rot={l.rot}
          size={l.size}
          color={l.color}
          idx={idx * 5 + i}
        />
      ))}
    </>
  );
};

const LeafPiles = ({ isMobile = false }) => {
  const items = isMobile ? LEAF_PILE_CENTERS.slice(0, 5) : LEAF_PILE_CENTERS;
  return (
    <>
      {items.map((c, i) => (
        <LeafPile key={`pile-${i}`} center={c} idx={i} />
      ))}
    </>
  );
};

// ── Main Export ──────────────────────────────────────────────────────
const GroundDetails = ({ loaded = false, isMobile = false }) => {
  if (!loaded) return null;
  return (
    <>
      {/* DirtPaths dihapus per user — zen garden style stepping stones
          tanpa dirt band underneath. Stones jadi standalone navigasi
          visual across grass. */}
      <PathSteppingStones />
      <PathEndGlows />
      <TrampledCircle />
      <GrassVariationPatches isMobile={isMobile} />
      <PebbleScatter isMobile={isMobile} />
      <LeafPiles isMobile={isMobile} />
    </>
  );
};

export default GroundDetails;
