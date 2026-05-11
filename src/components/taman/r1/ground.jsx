/**
 * Ground layer untuk Konstelasi Perjalanan — path, terrain dressing,
 * pohon-pohon (perimeter SideTrees + GardenAnchorTrees hand-placed),
 * Bushes, Mushrooms, DistantForest, Footprints, PathEdgeStones,
 * SettledLeaves, Puddle.
 *
 * SideTrees + Lanterns punya endless wrap behavior di FPV (tile recycle
 * relative ke camera z). Garden anchor trees fixed di world position
 * sebagai landmark.
 */

import React, { useRef } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { PATH_START_Z, PATH_END_Z, getWind } from './utils';

// Dead branches set — 3 cabang gundul untuk gantian foliage sphere
// saat restorationLevel < 0.5 (ekosistem mati). size param ngeskalain
// ukuran branch sesuai pohon (SideTree kecil, GardenAnchor sedang).
const DeadBranches = ({ size = 1 }) => (
  <>
    <mesh position={[0.2 * size, 0.2 * size, 0]} rotation={[0, 0, -0.7]}>
      <cylinderGeometry args={[0.03 * size, 0.05 * size, 0.7 * size, 5]} />
      <meshStandardMaterial color="#2a1f15" roughness={1} />
    </mesh>
    <mesh
      position={[-0.22 * size, 0.05 * size, 0.05 * size]}
      rotation={[0, 0, 0.8]}
    >
      <cylinderGeometry args={[0.025 * size, 0.045 * size, 0.6 * size, 5]} />
      <meshStandardMaterial color="#2a1f15" roughness={1} />
    </mesh>
    <mesh
      position={[0.05 * size, 0.35 * size, -0.1 * size]}
      rotation={[0.2, 0, 0.2]}
    >
      <cylinderGeometry args={[0.02 * size, 0.035 * size, 0.45 * size, 4]} />
      <meshStandardMaterial color="#2a1f15" roughness={1} />
    </mesh>
  </>
);

// Path strip — di-extend ke z=-220..220 supaya endless walk gak nimbul
// gap. Fog far ~40 = user cuma lihat ~30 unit di depan, sisanya
// invisible. Floor sekitar juga di-extend.
export const Path = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[2.2, 440]} />
      <meshStandardMaterial color="#3a3022" roughness={1} />
    </mesh>
    {/* Floor sekitar path — palette twilight senja sedikit purple */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
      <planeGeometry args={[40, 460]} />
      <meshStandardMaterial color="#1f2335" roughness={1} />
    </mesh>
  </>
);

// Ground patches — tone variasi di floor supaya nggak flat.
const GROUND_PATCH_DEFS = [
  { pos: [-5.5, 0.001, -8], r: 1.6, color: '#2a2438' },
  { pos: [5.0, 0.001, -14], r: 1.8, color: '#2a2030' },
  { pos: [-6.0, 0.001, -22], r: 1.4, color: '#3a3020' },
  { pos: [4.5, 0.001, -28], r: 1.7, color: '#252840' },
  { pos: [-4.2, 0.001, -4], r: 1.3, color: '#2c2538' },
  { pos: [6.5, 0.001, -18], r: 1.5, color: '#3a2820' },
  { pos: [-7.0, 0.001, -26], r: 1.6, color: '#252840' },
  { pos: [5.5, 0.001, -3], r: 1.2, color: '#2a2438' },
];
export const GroundPatches = () => (
  <>
    {GROUND_PATCH_DEFS.map((p, i) => (
      <mesh
        key={`patch-${i}`}
        rotation={[-Math.PI / 2, 0, 0]}
        position={p.pos}
        receiveShadow
      >
        <circleGeometry args={[p.r, 16]} />
        <meshStandardMaterial color={p.color} roughness={1} />
      </mesh>
    ))}
  </>
);

// Footprints — bekas jejak kaki samar di tanah, kasih kesan "ada
// yang pernah jalan duluan". Posisi alternating kiri/kanan sepanjang
// path, pakai box flat tipis dengan tone gelap.
const FOOTPRINT_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 8; i++) {
    const z = -4 - i * 3.6;
    const x = (i % 2 === 0 ? -0.3 : 0.3) + (Math.random() - 0.5) * 0.2;
    arr.push({ pos: [x, 0.005, z], rot: (Math.random() - 0.5) * 0.4 });
  }
  return arr;
})();

export const Footprints = () => (
  <>
    {FOOTPRINT_DEFS.map((f, i) => (
      <mesh
        key={`step-${i}`}
        position={f.pos}
        rotation={[-Math.PI / 2, 0, f.rot]}
      >
        <planeGeometry args={[0.16, 0.28]} />
        <meshStandardMaterial
          color="#1a140e"
          transparent
          opacity={0.55}
          roughness={1}
        />
      </mesh>
    ))}
  </>
);

// Path edge stones — 2 baris (kiri dan kanan path) dengan jarak
// reguler. Random size dan rotation kasih kesan natural.
const PATH_EDGE_STONES = (() => {
  const arr = [];
  const stoneZ = [];
  for (let z = PATH_START_Z; z >= PATH_END_Z; z -= 1.6) stoneZ.push(z);
  stoneZ.forEach((z) => {
    arr.push({
      pos: [
        -1.25 + (Math.random() - 0.5) * 0.1,
        0.06,
        z + (Math.random() - 0.5) * 0.3,
      ],
      scale: [
        0.18 + Math.random() * 0.1,
        0.10 + Math.random() * 0.05,
        0.16 + Math.random() * 0.08,
      ],
      rot: Math.random() * Math.PI,
    });
    arr.push({
      pos: [
        1.25 + (Math.random() - 0.5) * 0.1,
        0.06,
        z + (Math.random() - 0.5) * 0.3,
      ],
      scale: [
        0.18 + Math.random() * 0.1,
        0.10 + Math.random() * 0.05,
        0.16 + Math.random() * 0.08,
      ],
      rot: Math.random() * Math.PI,
    });
  });
  return arr;
})();
export const PathEdgeStones = () => (
  <>
    {PATH_EDGE_STONES.map((s, i) => (
      <mesh
        key={`stone-${i}`}
        position={s.pos}
        scale={s.scale}
        rotation={[0, s.rot, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3a3128" roughness={0.95} metalness={0.05} />
      </mesh>
    ))}
  </>
);

// Daun gugur yang udah settle di tanah — accumulate di sekitar base
// pohon. Flat plane tipis tone autumn, scatter random per tree.
const SETTLED_LEAF_COLORS = ['#7a4828', '#8a5a30', '#5a3818', '#a06430'];
const SETTLED_LEAF_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 10; i++) {
    const z = -2 + (-30 / 9) * i;
    const side = i % 2 === 0 ? -1 : 1;
    const baseX = side * 2.6;
    const count = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < count; j++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 0.6;
      arr.push({
        pos: [baseX + Math.cos(angle) * r, 0.008, z + Math.sin(angle) * r],
        rot: Math.random() * Math.PI * 2,
        scale: 0.7 + Math.random() * 0.5,
        color:
          SETTLED_LEAF_COLORS[
            Math.floor(Math.random() * SETTLED_LEAF_COLORS.length)
          ],
      });
    }
  }
  return arr;
})();
export const SettledLeaves = () => (
  <>
    {SETTLED_LEAF_DEFS.map((l, i) => (
      <mesh
        key={`settled-${i}`}
        position={l.pos}
        rotation={[-Math.PI / 2, 0, l.rot]}
        scale={l.scale}
      >
        <planeGeometry args={[0.18, 0.12]} />
        <meshStandardMaterial
          color={l.color}
          transparent
          opacity={0.85}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>
    ))}
  </>
);

// Puddle — small water reflection di path, refleksi langit/moon/stars
// kasih extra magic ke twilight scene. MeshReflectorMaterial mahal di
// GPU, fallback plain material di mobile.
export const Puddle = ({ isMobile }) => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0.4, 0.005, -12]}
    receiveShadow
  >
    <circleGeometry args={[0.75, 24]} />
    {isMobile ? (
      <meshStandardMaterial color="#1a1f2e" roughness={0.5} metalness={0.3} />
    ) : (
      <MeshReflectorMaterial
        blur={[400, 200]}
        resolution={256}
        mixBlur={1.5}
        mixStrength={6}
        roughness={0.65}
        depthScale={0.3}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.0}
        color="#0c1020"
        metalness={0.05}
        mirror={0.45}
      />
    )}
  </mesh>
);

// Bushes — small dark green clusters scattered di sides path. Static.
const BUSH_DEFS = [
  { pos: [-4.5, 0, -5], scale: 0.7 },
  { pos: [4.6, 0, -8], scale: 0.6 },
  { pos: [-5.5, 0, -12], scale: 0.8 },
  { pos: [5.3, 0, -16], scale: 0.7 },
  { pos: [-4.2, 0, -22], scale: 0.65 },
  { pos: [4.8, 0, -26], scale: 0.75 },
  { pos: [-5.0, 0, -30], scale: 0.7 },
];

const Bush = ({ pos, scale }) => (
  <group position={pos} scale={scale}>
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.4, 10, 8]} />
      <meshStandardMaterial color="#3a4828" roughness={1} />
    </mesh>
    <mesh position={[0.25, 0.25, 0.08]}>
      <sphereGeometry args={[0.3, 10, 8]} />
      <meshStandardMaterial color="#2e3a20" roughness={1} />
    </mesh>
    <mesh position={[-0.2, 0.27, 0.05]}>
      <sphereGeometry args={[0.32, 10, 8]} />
      <meshStandardMaterial color="#3a4828" roughness={1} />
    </mesh>
  </group>
);

export const Bushes = () => (
  <>
    {BUSH_DEFS.map((b, i) => (
      <Bush key={`bush-${i}`} pos={b.pos} scale={b.scale} />
    ))}
  </>
);

// Mushroom autumn forest — 3 cluster subtle dengan tone brown-amber
// (bukan red fairy tale supaya match contemplative twilight mood).
const MUSHROOM_CLUSTERS_R1 = [
  [-4.8, 0, -10],
  [5.5, 0, -20],
  [-5.2, 0, -28],
];

const MushroomCluster = ({ pos }) => (
  <group position={pos}>
    {[0, 1, 2].map((i) => {
      const angle = i * 2.1;
      const scale = 0.7 + i * 0.12;
      return (
        <group
          key={`m-${i}`}
          position={[Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18]}
          scale={scale}
        >
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.12, 6]} />
            <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <sphereGeometry
              args={[0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color="#7a4828" roughness={0.85} />
          </mesh>
        </group>
      );
    })}
  </group>
);

export const Mushrooms = () => (
  <>
    {MUSHROOM_CLUSTERS_R1.map((pos, i) => (
      <MushroomCluster key={`mush-${i}`} pos={pos} />
    ))}
  </>
);

// Distant forest silhouette — ring of dark trees di perimeter scene
// (radius 16-21). Color desaturated cool-purple supaya fade ke fog.
const DISTANT_FOREST_DEFS = (() => {
  const arr = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const r = 16 + Math.random() * 5;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      scale: 1.5 + Math.random() * 1.0,
      hue: Math.random() > 0.5 ? '#1e2238' : '#2a2238',
    });
  }
  return arr;
})();
// Mobile cull: 14 → 9. Static trees tetep cost draw call per mesh.
export const DistantForest = ({ isMobile }) => {
  const list = isMobile
    ? DISTANT_FOREST_DEFS.slice(0, 9)
    : DISTANT_FOREST_DEFS;
  return (
    <>
      {list.map((t, i) => (
        <group key={`distant-${i}`} position={t.pos} scale={t.scale}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.1, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#15182a" roughness={1} />
          </mesh>
          <mesh position={[0, 1.85, 0]}>
            <sphereGeometry args={[0.7, 10, 8]} />
            <meshStandardMaterial color={t.hue} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
};

// Side trees — filler trees di sides path. Single useFrame iterate
// semua refs untuk sway. Endless wrap: di FPV mode, posisi tree z
// di-wrap relatif terhadap camera z (tree behind ke-recycle ke front).
const SIDE_TREE_COLORS = ['#3a4828', '#4a5a30', '#2c3a20', '#3e4a2c'];
const SIDE_TREE_DEFS = (() => {
  const arr = [];
  const seedAt = (i, m) => ((i * 17 + m * 7) % 100) / 100;
  for (let i = 0; i < 8; i++) {
    const baseZ = -3 - i * 3.7;
    arr.push({
      pos: [
        -5 - seedAt(i, 0) * 4,
        0,
        baseZ + (seedAt(i, 1) - 0.5) * 1.8,
      ],
      scale: 0.8 + seedAt(i, 2) * 0.6,
      hueIdx: i % 4,
    });
    arr.push({
      pos: [
        5 + seedAt(i, 3) * 4,
        0,
        baseZ + (seedAt(i, 4) - 0.5) * 1.8 + 1.0,
      ],
      scale: 0.8 + seedAt(i, 5) * 0.6,
      hueIdx: (i + 1) % 4,
    });
  }
  return arr;
})();

const TILE_SIZE_TREES = 50; // wrap range di z direction
export const SideTrees = ({ isMobile, viewMode, restorationLevel = 1 }) => {
  const restored = restorationLevel >= 0.5;
  const list = isMobile ? SIDE_TREE_DEFS.slice(0, 8) : SIDE_TREE_DEFS;
  const foliageRefs = useRef([]);
  const groupRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const camZ = state.camera.position.z;
    const wrap = viewMode === 'fpv';
    list.forEach((tree, i) => {
      const fol = foliageRefs.current[i];
      const grp = groupRefs.current[i];
      if (!fol || !grp) return;
      const baseZ = tree.pos[2];
      let displayZ = baseZ;
      if (wrap) {
        const center = camZ;
        let relZ = baseZ - center;
        relZ =
          ((relZ + TILE_SIZE_TREES / 2) % TILE_SIZE_TREES + TILE_SIZE_TREES) %
            TILE_SIZE_TREES -
          TILE_SIZE_TREES / 2;
        displayZ = center + relZ;
      }
      grp.position.z = displayZ;
      const wind = getWind(t, tree.pos[0] * 0.27 + displayZ * 0.13);
      fol.rotation.z = wind.total * 0.04;
      fol.rotation.x = wind.total * 0.02;
    });
  });
  return (
    <>
      {list.map((tree, i) => (
        <group
          key={`side-${i}`}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          position={tree.pos}
          scale={tree.scale}
        >
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.07, 0.12, 1.7, 6]} />
            <meshStandardMaterial
              color={restored ? '#3a2818' : '#4a3e2e'}
              roughness={1}
            />
          </mesh>
          <group
            ref={(el) => {
              foliageRefs.current[i] = el;
            }}
            position={[0, 1.7, 0]}
          >
            {restored ? (
              <mesh position={[0, 0.45, 0]}>
                <sphereGeometry args={[0.7, 12, 8]} />
                <meshStandardMaterial
                  color={SIDE_TREE_COLORS[tree.hueIdx]}
                  roughness={1}
                />
              </mesh>
            ) : (
              <DeadBranches size={0.9} />
            )}
          </group>
        </group>
      ))}
    </>
  );
};

// Hand-placed pohon anchor — pasangan kiri+kanan setiap landmark
// supaya komposisi simetris. Order: entrance → monument → bench →
// swing → wind chime → mid gap (mobile slice ke depan ngambil yg
// paling penting dulu).
const GARDEN_ANCHOR_TREES = [
  // Entrance (z=-1.5 / -2.5)
  { pos: [-3.8, 0, -1.5], scale: 1.05, hueIdx: 1 },
  { pos: [3.6, 0, -2.5], scale: 1.1, hueIdx: 3 },
  // Monument frame (z=-28.8 / -29.5)
  { pos: [-4.8, 0, -29.5], scale: 1.25, hueIdx: 2 },
  { pos: [4.2, 0, -28.8], scale: 0.95, hueIdx: 1 },
  // Bench area (z=-14.6 / -16.8) — frame kedua sisi
  { pos: [5.4, 0, -14.6], scale: 1.2, hueIdx: 1 },
  { pos: [-5.4, 0, -14.6], scale: 1.15, hueIdx: 3 },
  { pos: [4.6, 0, -16.8], scale: 0.95, hueIdx: 2 },
  { pos: [-4.6, 0, -16.8], scale: 1.0, hueIdx: 0 },
  // Swing companion (z=-19.5)
  { pos: [3.2, 0, -19.5], scale: 1.35, hueIdx: 3 },
  { pos: [-3.5, 0, -19.5], scale: 1.2, hueIdx: 1 },
  // Wind chime area (z=-7.8 / -10.2)
  { pos: [-3.4, 0, -7.8], scale: 1.15, hueIdx: 0 },
  { pos: [3.4, 0, -7.8], scale: 1.0, hueIdx: 2 },
  { pos: [-4.2, 0, -10.2], scale: 0.9, hueIdx: 2 },
  { pos: [4.2, 0, -10.2], scale: 0.95, hueIdx: 0 },
  // Mid gap (z=-22.5)
  { pos: [-3.4, 0, -22.5], scale: 1.0, hueIdx: 0 },
  { pos: [3.5, 0, -22.5], scale: 1.05, hueIdx: 2 },
];

export const GardenAnchorTrees = ({ isMobile, restorationLevel = 1 }) => {
  const restored = restorationLevel >= 0.5;
  // Mobile cull: 16 → 8 (entrance + monument + bench frame).
  const list = isMobile
    ? GARDEN_ANCHOR_TREES.slice(0, 8)
    : GARDEN_ANCHOR_TREES;
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    list.forEach((tree, i) => {
      const r = refs.current[i];
      if (!r) return;
      const wind = getWind(t, tree.pos[0] * 0.31 + tree.pos[2] * 0.17);
      r.rotation.z = wind.total * 0.05;
      r.rotation.x = wind.total * 0.025;
    });
  });
  return (
    <>
      {list.map((tree, i) => (
        <group key={`anchor-${i}`} position={tree.pos} scale={tree.scale}>
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.09, 0.14, 1.9, 6]} />
            <meshStandardMaterial
              color={restored ? '#3a2818' : '#4a3e2e'}
              roughness={1}
            />
          </mesh>
          <group
            ref={(el) => {
              refs.current[i] = el;
            }}
            position={[0, 1.9, 0]}
          >
            {restored ? (
              <>
                <mesh position={[0, 0.55, 0]}>
                  <sphereGeometry args={[0.85, 14, 10]} />
                  <meshStandardMaterial
                    color={SIDE_TREE_COLORS[tree.hueIdx]}
                    roughness={1}
                  />
                </mesh>
                <mesh position={[0.3, 0.25, 0.1]}>
                  <sphereGeometry args={[0.45, 10, 8]} />
                  <meshStandardMaterial
                    color={SIDE_TREE_COLORS[(tree.hueIdx + 2) % 4]}
                    roughness={1}
                  />
                </mesh>
              </>
            ) : (
              <DeadBranches size={1.15} />
            )}
          </group>
        </group>
      ))}
    </>
  );
};
