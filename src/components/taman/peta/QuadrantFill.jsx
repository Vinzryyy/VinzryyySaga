/**
 * QuadrantFill — light decoration buat ngisi area kosong di NE + E
 * quadrant peta (antara CenterTree, Menara Jam, dan Arsip).
 *
 * 3 prop type, drought-compatible (sparse silhouette, dusty palette),
 * purified-aware (subtle revival pas state pulih):
 *
 *   DriedBush     — semak kering low silhouette + twig kecil.
 *                   Purified: subtle green tint + bloom petal kecil di top.
 *   RubblePile    — 3 batu di-pile, dusty grey.
 *                   Purified: lichen patch di puncak (kayak DeadTreeRevival).
 *   BurntStump    — tunggul pohon hangus blackened.
 *                   Purified: sapling sprout (stem + 2 leaf) keluar dari center.
 *
 * Positioning deterministic per-prop. Area: x: -1 to 5, z: -2 to -6.
 * Avoid landmark zone: Menara (0,-8) radius 2, Arsip (7,-1) radius 1.5,
 * CenterTree (0,0) radius 2.
 *
 * Match pattern existing DeadTreeRevival — semua prop terima `purified`
 * + `purifyProgress`, transform animate via progress, gak perlu state.
 */

import React from 'react';

// Drought tone palette
const COLORS = {
  bushDrought: '#8a7050',
  bushPurified: '#a89868',
  twig: '#5a4030',
  bloom: '#f4a8c0',
  rubbleA: '#6a5a4a',
  rubbleB: '#7a6a5a',
  rubbleC: '#5a4a3a',
  lichen: '#88a868',
  stumpBody: '#2a1c12',
  stumpChar: '#1a0c08',
  saplingStem: '#6a4a20',
  saplingLeafA: '#88c068',
  saplingLeafB: '#a8d878',
};

const DriedBush = ({ pos, scale = 1, purified = false, purifyProgress = 0 }) => {
  // Purified eased: 0 (drought) → 1 (full purify). Drives tint shift + bloom.
  const eased = purified ? 1 : purifyProgress;
  return (
    <group position={pos} scale={scale}>
      {/* Main foliage — rounded sphere, low poly */}
      <mesh position={[0, 0.25, 0]} castShadow={false}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial
          color={eased > 0.3 ? COLORS.bushPurified : COLORS.bushDrought}
          roughness={0.9}
        />
      </mesh>
      {/* Sparse twig sticking out — hint "ada cabang yg pernah hidup" */}
      <mesh position={[0.15, 0.5, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
        <meshStandardMaterial color={COLORS.twig} roughness={0.95} />
      </mesh>
      {/* Purified-only: bloom kecil di top, fade-in via scale */}
      {eased > 0.5 && (
        <mesh position={[0, 0.62, 0]} scale={Math.min(1, (eased - 0.5) * 2)}>
          <sphereGeometry args={[0.08, 6, 4]} />
          <meshStandardMaterial
            color={COLORS.bloom}
            emissive={COLORS.bloom}
            emissiveIntensity={0.1}
          />
        </mesh>
      )}
    </group>
  );
};

const RubblePile = ({
  pos,
  rot = 0,
  scale = 1,
  purified = false,
  purifyProgress = 0,
}) => {
  const eased = purified ? 1 : purifyProgress;
  return (
    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
      {/* 3 batu icosahedron, flat-shaded supaya kerasa stone block */}
      <mesh position={[0, 0.2, 0]}>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={COLORS.rubbleA} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.35, 0.15, 0.1]} rotation={[0.5, 0.3, 0]}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={COLORS.rubbleB} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-0.2, 0.1, -0.2]} rotation={[0, 0.8, 0]}>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={COLORS.rubbleC} roughness={0.95} flatShading />
      </mesh>
      {/* Purified-only: lichen patch di puncak batu utama */}
      {eased > 0.4 && (
        <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12 * eased, 8]} />
          <meshStandardMaterial
            color={COLORS.lichen}
            opacity={Math.min(1, eased * 1.5)}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

const BurntStump = ({
  pos,
  rot = 0,
  scale = 1,
  purified = false,
  purifyProgress = 0,
}) => {
  const eased = purified ? 1 : purifyProgress;
  return (
    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
      {/* Stump body — tapered cylinder, blackened */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.4, 8]} />
        <meshStandardMaterial color={COLORS.stumpBody} roughness={0.9} />
      </mesh>
      {/* Top charred lip — darker disc */}
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.27, 0.25, 0.03, 8]} />
        <meshStandardMaterial color={COLORS.stumpChar} roughness={0.95} />
      </mesh>
      {/* Purified-only: sapling sprout keluar dari center stump */}
      {eased > 0.5 && (
        <group
          position={[0, 0.42, 0]}
          scale={Math.min(1, (eased - 0.5) * 2)}
        >
          {/* Stem kecil */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.015, 0.02, 0.3, 6]} />
            <meshStandardMaterial color={COLORS.saplingStem} roughness={0.8} />
          </mesh>
          {/* 2 leaf bola kecil simetris di atas stem */}
          <mesh position={[0.06, 0.25, 0]} rotation={[0, 0, -0.6]}>
            <sphereGeometry args={[0.04, 6, 4]} />
            <meshStandardMaterial
              color={COLORS.saplingLeafA}
              emissive={COLORS.saplingLeafA}
              emissiveIntensity={0.05}
            />
          </mesh>
          <mesh position={[-0.06, 0.28, 0]} rotation={[0, 0, 0.5]}>
            <sphereGeometry args={[0.04, 6, 4]} />
            <meshStandardMaterial
              color={COLORS.saplingLeafB}
              emissive={COLORS.saplingLeafB}
              emissiveIntensity={0.05}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Deterministic position list — NE + E quadrant. Avoid landmark zones:
// Menara (0, -8) r=2, Arsip (7, -1) r=1.5, CenterTree (0, 0) r=2.
// Total: 5 bush + 3 rubble + 2 stump = 10 props.
const PROPS = [
  // DriedBush (5) — scattered, mid-density
  { type: 'bush', pos: [-1, 0, -3.5], scale: 0.9 },
  { type: 'bush', pos: [2, 0, -4], scale: 1.1 },
  { type: 'bush', pos: [4, 0, -3], scale: 0.85 },
  { type: 'bush', pos: [5, 0, -4.5], scale: 1.0 },
  { type: 'bush', pos: [3.5, 0, -2.5], scale: 0.95 },
  // RubblePile (3) — punctuate ground broken
  { type: 'rubble', pos: [1, 0, -5], rot: 0.3, scale: 1.0 },
  { type: 'rubble', pos: [4.5, 0, -5.5], rot: 1.2, scale: 0.9 },
  { type: 'rubble', pos: [-0.5, 0, -2.5], rot: 0.8, scale: 0.85 },
  // BurntStump (2) — hint forest yg pernah ada
  { type: 'stump', pos: [3, 0, -5], rot: 0.4, scale: 1.0 },
  { type: 'stump', pos: [0.5, 0, -4], rot: 1.5, scale: 0.9 },
];

const QuadrantFill = ({ purified = false, purifyProgress = 0 }) => (
  <>
    {PROPS.map((d, i) => {
      const key = `qfill-${d.type}-${i}`;
      const shared = {
        pos: d.pos,
        scale: d.scale,
        purified,
        purifyProgress,
      };
      if (d.type === 'bush') return <DriedBush key={key} {...shared} />;
      if (d.type === 'rubble')
        return <RubblePile key={key} {...shared} rot={d.rot} />;
      if (d.type === 'stump')
        return <BurntStump key={key} {...shared} rot={d.rot} />;
      return null;
    })}
  </>
);

export default QuadrantFill;
