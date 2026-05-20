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

import React from 'react';
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

const DirtPath = ({ to, curveSign, idx }) => {
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
  const pieces = computeBezierPath(start, ctrl, to, 12);

  return (
    <>
      {pieces.map((p, i) => {
        // Width tapers di ujung path — lebih lebar di tengah, kurusan
        // di start/end. Bikin kerasa natural, gak straight band.
        const t = (i + 0.5) / pieces.length;
        const widthMul = 0.7 + Math.sin(t * Math.PI) * 0.35;
        return (
          <mesh
            key={`path-${idx}-${i}`}
            position={[p.x, 0.012, p.z]}
            rotation={[-Math.PI / 2, -p.angle, 0]}
          >
            <planeGeometry args={[p.len * 1.15, 0.42 * widthMul]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#7a5840' : '#6a5240'}
              roughness={0.95}
              transparent
              opacity={0.92}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
};

const DirtPaths = () => (
  <>
    {PATH_TARGETS.map((p, i) => (
      <DirtPath key={`dp-${i}`} {...p} idx={i} />
    ))}
  </>
);

// ── Tier A — Trampled Circle ─────────────────────────────────────────
// Trampled dirt disc di base Pohon, kerasa "tempat orang ngumpul lama".
// Sedikit darker dari path color. Slight noise via 8 footprint smudges
// di rim circle (small ellipse-ish boxes).
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
        <mesh
          key={`leaf-${idx}-${i}`}
          rotation={[-Math.PI / 2, 0, l.rot]}
          position={[l.x, 0.013, l.z]}
        >
          <planeGeometry args={[l.size * 1.6, l.size]} />
          <meshStandardMaterial
            color={l.color}
            side={THREE.DoubleSide}
            roughness={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
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
      <DirtPaths />
      <TrampledCircle />
      <GrassVariationPatches isMobile={isMobile} />
      <PebbleScatter isMobile={isMobile} />
      <LeafPiles isMobile={isMobile} />
    </>
  );
};

export default GroundDetails;
