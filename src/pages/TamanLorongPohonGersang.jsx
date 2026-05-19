/**
 * Taman Kebaikan — Petak R1: Konstelasi Perjalanan (DROUGHT VARIANT).
 *
 * Versi gersang dari r1, dirender saat tree support count < 4000
 * (lihat router di App.jsx). Saat count hit 4000, world ini di-replace
 * dengan TamanLorongPohon.jsx (canonical restored). File ini sengaja
 * duplikat penuh dari canonical — bukan branching prop — supaya saat
 * canonical diiterasi nanti, drought file tetep frozen di tone
 * "ekosistem rusak" tanpa unintended drift.
 *
 * Perbedaan dari canonical:
 *   - SideTrees + GardenAnchorTrees: foliage → dead branches via prop
 *     restorationLevel={0}
 *   - BigTreeReturnPortal: TETAP HIDUP — narrative "Pohon Terakhir",
 *     lone survivor di ekosistem mati. Beacon glow + foliage hijau
 *     intact sebagai anchor of hope. Restorasi penuh numbuh dari sini.
 *   - Bushes, Mushrooms, Owls, Rabbits, Bats, Fireflies: di-skip
 *     (makhluk hidup absen saat ekosistem mati)
 *   - Ground: DroughtPath + DroughtGroundPatches (inline) — warm
 *     amber/sand tones ganti twilight purple canonical. Puddle skip.
 *   - Atmosphere: fog warm dusty brown #2a1d15 (match R0 Padang
 *     Tandus tone), ambientLight diturunin + di-warm shift, moon rim
 *     diturunin drastis. Horizon glow burnt-orange (Pohon Terakhir
 *     beacon).
 *   - Lanterns: allDead={true} — semua lentera mati di drought (posts
 *     berdiri tapi gak nyala — abandoned vibe).
 *   - Decay dressing: FallenDeadwood + DriedLeafPiles + FallenTree.
 *
 * Yang tetap utuh: starfield + konstelasi milestone (cerita Eli di
 * langit masih jalan — drought-nya cuma di ground), lanterns (untuk
 * sekarang masih hidup, phase 1B akan dimatiin), monument, bench,
 * swing, wind chime (artefak peninggalan, persist regardless of state).
 *
 * Konsep dasar (sama dengan canonical): user berdiri di taman senja
 * melihat ke atas — milestone karier Eli (dari ELI_TIMELINE di
 * src/data/eliProfile.js) di-render sebagai bintang di langit,
 * di-group ke 7 konstelasi per era (lihat ERA_DEFS):
 * Trainee → Theater → Senbatsu → New Era → Mature → Variety → JKT48
 * Fight. Bintang dalam satu era terhubung garis tipis = konstelasi.
 *
 * Ground level kept (bench, swing, wind chime, monument, lentera,
 * mist) sebagai dasar "berdiri di taman" — user gak floating di
 * space. Camera tilt up: orbit target di mid-air, polar diperluas ke
 * arah bawah supaya user bisa "menengadah".
 *
 * Layer langit:
 * - Background starfield (240 points) — bintang random distant
 * - HighlightStars (6) — bright anchor stars existing
 * - StarMilestone (21) — milestone career, era-grouped, clickable
 * - ConstellationLines — segments connecting milestones in same era
 * - ConstellationLabels — fade-in era name saat camera looking toward
 *
 * Pre-konstelasi rewrite: dulu r1 = "Pohon-Pohon yang Mengingat",
 * 21 pohon di-arrange alternating kiri/kanan di sepanjang lorong z.
 * Mulai cramped saat ELI_TIMELINE tumbuh > 14 entries. Pivot ke
 * konstelasi handle scaling ke 21+ stars naturally (langit besar).
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PointerLockControls, Stats } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
import RotateRecommendation from '../components/ui/RotateRecommendation';
import { useIsMobile } from '../components/taman/r3/utils';
import { ELI_TIMELINE } from '../data/eliProfile';

import { ORBIT_TARGET, playChimeTone } from '../components/taman/r1/utils';
import {
  ERA_LOOKUP,
  milestoneSkyPosition,
  starColorForMilestone,
} from '../components/taman/r1/era';
import {
  SkyGroup,
  Stars,
  HighlightStars,
  Moon,
  Nebula,
  ShootingStar,
} from '../components/taman/r1/sky';
import {
  StarMilestone,
  ConstellationLines,
  ConstellationLabels,
} from '../components/taman/r1/constellation';
import {
  Fireflies,
  FallingLeaves,
  FlyingLeavesGust,
  MemoryFragments,
} from '../components/taman/r1/atmosphere';
import {
  Footprints,
  PathEdgeStones,
  SettledLeaves,
  Puddle,
  Bushes,
  Mushrooms,
  DistantForest,
  SideTrees,
  GardenAnchorTrees,
} from '../components/taman/r1/ground';
import {
  Lanterns,
  Owls,
  DistantFigure,
  Bats,
  Rabbits,
  StoneMonument,
  OldBench,
  TreeSwing,
  WindChime,
  MonumentProximity,
  BigTreeReturnPortal,
} from '../components/taman/r1/landmarks';
import {
  CAMERA_TARGETS,
  CinematicIntro,
  CameraSync,
  FPVMovement,
  MobileFPVMovement,
} from '../components/taman/r1/camera';
import {
  SceneFallback,
  LorongHeader,
  IntroTitle,
  MobileFPVControls,
  EraGuide,
  LorongFooter,
  MilestoneOverlay,
  MonumentMomentOverlay,
  ClockSync,
  INTRO_STORAGE_KEY,
} from '../components/taman/r1/ui';
import {
  isPerfEnabled,
  PerfSampler,
  PerfHUD,
} from '../components/taman/r1/perf';

// Drought-only decay dressing — fallen branches, broken logs, dried
// leaf piles, dan satu tree yang roboh. Distribusi deterministik via
// seeded RNG supaya placement konsisten antar render (gak jumpy saat
// React re-render).
const seededRandom = (initial) => {
  let s = initial;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const FALLEN_BRANCH_DEFS = (() => {
  const rand = seededRandom(137);
  const arr = [];
  for (let i = 0; i < 34; i++) {
    const z = -2 - rand() * 34;
    const side = rand() > 0.5 ? 1 : -1;
    const x = side * (1.6 + rand() * 5.5);
    arr.push({
      pos: [x, 0.04, z],
      yaw: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.25,
      len: 0.45 + rand() * 0.75,
      thick: 0.028 + rand() * 0.028,
    });
  }
  return arr;
})();

const FALLEN_LOG_DEFS = [
  { pos: [-4.6, 0.12, -7.5], yaw: 1.3, len: 2.6, thick: 0.14 },
  { pos: [5.2, 0.10, -16.4], yaw: 0.6, len: 2.3, thick: 0.13 },
  { pos: [-3.9, 0.10, -24.2], yaw: 2.0, len: 1.9, thick: 0.12 },
  { pos: [4.4, 0.13, -31.0], yaw: 0.3, len: 2.5, thick: 0.13 },
];

const FallenDeadwood = ({ isMobile }) => {
  const branches = isMobile
    ? FALLEN_BRANCH_DEFS.slice(0, 18)
    : FALLEN_BRANCH_DEFS;
  return (
    <>
      {branches.map((b, i) => (
        <group key={`fb-${i}`} position={b.pos} rotation={[0, b.yaw, 0]}>
          <mesh rotation={[b.tilt, 0, Math.PI / 2]}>
            <cylinderGeometry args={[b.thick, b.thick * 1.3, b.len, 5]} />
            <meshStandardMaterial color="#2a1f15" roughness={1} />
          </mesh>
        </group>
      ))}
      {FALLEN_LOG_DEFS.map((l, i) => (
        <group key={`flog-${i}`} position={l.pos} rotation={[0, l.yaw, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[l.thick, l.thick * 1.15, l.len, 8]} />
            <meshStandardMaterial color="#3a2a1f" roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
};

const DRIED_LEAF_PILE_DEFS = (() => {
  const rand = seededRandom(271);
  const arr = [];
  for (let i = 0; i < 16; i++) {
    const z = -3 - rand() * 32;
    const side = rand() > 0.5 ? 1 : -1;
    const x = side * (1.8 + rand() * 5);
    arr.push({
      pos: [x, 0.011, z],
      r: 0.4 + rand() * 0.5,
      rot: rand() * Math.PI,
      color: rand() > 0.5 ? '#2a1d12' : '#3a2818',
    });
  }
  return arr;
})();

const DriedLeafPiles = () => (
  <>
    {DRIED_LEAF_PILE_DEFS.map((d, i) => (
      <mesh
        key={`dl-${i}`}
        position={d.pos}
        rotation={[-Math.PI / 2, 0, d.rot]}
      >
        <circleGeometry args={[d.r, 12]} />
        <meshStandardMaterial color={d.color} roughness={1} />
      </mesh>
    ))}
  </>
);

// Soft circle texture buat particles — bypass default square sprite
// dari THREE.PointsMaterial. Generate sekali via CanvasTexture (radial
// gradient white center → transparent edge), share across all polluted
// air particle systems.
const makeSoftParticleTexture = () => {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

// PollutedAir — pengganti GroundMist + MistPools di drought variant.
// Sebelumnya pakai pointsMaterial tanpa map = render kotak putih jelek.
// Sekarang soft round particles, warna dirty smog brown/yellow, drift
// gentle. Bikin kerasa "udara tercemar" bukan "kabut bersih".
const PollutedAir = ({ count = 120, isMobile = false }) => {
  const ref = useRef();
  const actualCount = isMobile ? Math.floor(count * 0.55) : count;
  const softTexture = useMemo(() => makeSoftParticleTexture(), []);

  const basePositions = useMemo(() => {
    const arr = new Float32Array(actualCount * 3);
    for (let i = 0; i < actualCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      // y 0.4..3.2 — distribute floor → mid-height
      arr[i * 3 + 1] = 0.4 + Math.random() * 2.8;
      // z spanning corridor (~ -2 to -38)
      arr[i * 3 + 2] = -2 - Math.random() * 36;
    }
    return arr;
  }, [actualCount]);

  const phases = useMemo(() => {
    const arr = new Float32Array(actualCount);
    for (let i = 0; i < actualCount; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [actualCount]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < actualCount; i++) {
      const phase = phases[i];
      arr[i * 3] =
        basePositions[i * 3] + Math.sin(t * 0.12 + phase) * 0.5;
      arr[i * 3 + 1] =
        basePositions[i * 3 + 1] +
        Math.cos(t * 0.14 + phase * 1.3) * 0.18;
      arr[i * 3 + 2] =
        basePositions[i * 3 + 2] + Math.cos(t * 0.1 + phase) * 0.45;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={basePositions.slice()}
          count={actualCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={softTexture}
        size={1.8}
        color="#7a6850"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
        alphaTest={0.01}
      />
    </points>
  );
};

// Drought ground — replace canonical Path + GroundPatches. Tone warm
// amber/sandy (bukan twilight purple) supaya konsisten sama dead trees.
const DroughtPath = () => (
  <>
    {/* Path strip — kering, lebih amber-brown */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[2.2, 440]} />
      <meshStandardMaterial color="#3a2d18" roughness={1} />
    </mesh>
    {/* Floor sekitar path — sand/cracked amber tone */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
      <planeGeometry args={[40, 460]} />
      <meshStandardMaterial color="#2c2018" roughness={1} />
    </mesh>
  </>
);

const DROUGHT_PATCH_DEFS = [
  { pos: [-5.5, 0.001, -8], r: 1.6, color: '#3a2818' },
  { pos: [5.0, 0.001, -14], r: 1.8, color: '#3a2a18' },
  { pos: [-6.0, 0.001, -22], r: 1.4, color: '#4a3520' },
  { pos: [4.5, 0.001, -28], r: 1.7, color: '#2a1f15' },
  { pos: [-4.2, 0.001, -4], r: 1.3, color: '#3a2820' },
  { pos: [6.5, 0.001, -18], r: 1.5, color: '#4a3520' },
  { pos: [-7.0, 0.001, -26], r: 1.6, color: '#2c2018' },
  { pos: [5.5, 0.001, -3], r: 1.2, color: '#3a2818' },
];
const DroughtGroundPatches = () => (
  <>
    {DROUGHT_PATCH_DEFS.map((p, i) => (
      <mesh
        key={`drought-patch-${i}`}
        rotation={[-Math.PI / 2, 0, 0]}
        position={p.pos}
      >
        <circleGeometry args={[p.r, 16]} />
        <meshStandardMaterial color={p.color} roughness={1} />
      </mesh>
    ))}
  </>
);

// Pilar batu pecah — sisa colonnade yang dulu nge-frame jalan ini.
// Tinggi acak (sebagian patah pendek, sebagian masih berdiri), tilt
// sedikit supaya kerasa udah lama nggak ke-maintain. Bahan stone gray
// warm — kontras sama wood deadwood.
const PILLAR_RUIN_DEFS = [
  { pos: [-4.5, 0, -4], h: 1.6, tilt: -0.08 },
  { pos: [4.5, 0, -8], h: 0.5, tilt: 0.12 },
  { pos: [-5.0, 0, -13], h: 1.3, tilt: -0.06 },
  { pos: [4.8, 0, -17], h: 0.4, tilt: 0.18 },
  { pos: [-4.5, 0, -22], h: 1.5, tilt: 0.1 },
  { pos: [5.0, 0, -27], h: 0.9, tilt: -0.08 },
  { pos: [-4.8, 0, -32], h: 0.65, tilt: 0.15 },
];
const PillarRuin = ({ pos, h, tilt }) => (
  <group position={pos} rotation={[0, 0, tilt]}>
    {/* Base block — square footing */}
    <mesh position={[0, 0.1, 0]}>
      <boxGeometry args={[0.5, 0.2, 0.5]} />
      <meshStandardMaterial color="#5a4e3e" roughness={1} />
    </mesh>
    {/* Pilar shaft */}
    <mesh position={[0, 0.2 + h / 2, 0]}>
      <cylinderGeometry args={[0.16, 0.19, h, 8]} />
      <meshStandardMaterial color="#7a6e5e" roughness={1} />
    </mesh>
    {/* Patah cap di atas — irregular flat */}
    <mesh position={[0, 0.22 + h, 0]} rotation={[0.05, 0, 0.08]}>
      <cylinderGeometry args={[0.13, 0.17, 0.08, 8]} />
      <meshStandardMaterial color="#4a3e2e" roughness={1} />
    </mesh>
  </group>
);
const PillarRuins = () => (
  <>
    {PILLAR_RUIN_DEFS.map((p, i) => (
      <PillarRuin key={`pillar-${i}`} {...p} />
    ))}
  </>
);

// Distant ruins — siluet city roboh di belakang BigTree (z<-42), spread
// di sisi kiri-kanan supaya gak ngeblock Pohon Terakhir di center.
// Bahan dark warm gray (lebih gelap dari pillar foreground supaya
// kerasa "jauh + di balik kabut").
const RUIN_BUILDING_DEFS = [
  { pos: [-15, 0, -50], w: 3.2, h: 5.0, broken: true },
  { pos: [-9, 0, -54], w: 2.4, h: 6.0, broken: false },
  { pos: [9, 0, -53], w: 2.8, h: 5.5, broken: true },
  { pos: [15, 0, -50], w: 3.5, h: 4.8, broken: false },
  { pos: [-20, 0, -56], w: 4.0, h: 4.2, broken: true },
  { pos: [19, 0, -57], w: 3.8, h: 5.8, broken: true },
];
const RuinBuilding = ({ pos, w, h, broken }) => (
  <group position={pos}>
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, w * 0.8]} />
      <meshStandardMaterial color="#3a3028" roughness={1} fog />
    </mesh>
    {broken && (
      <mesh
        position={[w * 0.25, h - 0.35, 0]}
        rotation={[0, 0, 0.22]}
      >
        <boxGeometry args={[w * 0.55, 0.55, w * 0.82]} />
        <meshStandardMaterial color="#2a2018" roughness={1} fog />
      </mesh>
    )}
  </group>
);
const DistantRuins = () => (
  <>
    {RUIN_BUILDING_DEFS.map((b, i) => (
      <RuinBuilding key={`ruin-${i}`} {...b} />
    ))}
  </>
);

// Ground cracks — line tipis gelap di tanah, kasih texture "tanah pecah
// karena kekeringan panjang". Distribusi deterministik via seeded RNG.
const GROUND_CRACK_DEFS = (() => {
  const rand = seededRandom(389);
  const arr = [];
  for (let i = 0; i < 14; i++) {
    const z = -3 - rand() * 32;
    const x = (rand() - 0.5) * 12;
    arr.push({
      pos: [x, 0.005, z],
      len: 0.8 + rand() * 1.6,
      rot: rand() * Math.PI,
    });
  }
  return arr;
})();
const GroundCracks = () => (
  <>
    {GROUND_CRACK_DEFS.map((c, i) => (
      <mesh
        key={`crack-${i}`}
        position={c.pos}
        rotation={[-Math.PI / 2, 0, c.rot]}
      >
        <planeGeometry args={[c.len, 0.04]} />
        <meshStandardMaterial color="#1a120a" roughness={1} />
      </mesh>
    ))}
  </>
);

// Satu pohon roboh besar — dramatic centerpiece dari "ekosistem rusak".
// Trunk panjang lying horizontal + broken stub + 2 dead branch shrapnel.
const FallenTree = () => (
  <group position={[-5.6, 0.3, -19]} rotation={[0, 0.4, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.15, 0.22, 3.2, 8]} />
      <meshStandardMaterial color="#3a2a1f" roughness={1} />
    </mesh>
    <mesh position={[1.7, -0.05, 0]} rotation={[0, 0, Math.PI / 2 - 0.5]}>
      <cylinderGeometry args={[0.1, 0.15, 0.6, 6]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    <mesh
      position={[-1.4, 0.05, 0.35]}
      rotation={[0.3, 0.4, Math.PI / 2 + 0.6]}
    >
      <cylinderGeometry args={[0.04, 0.06, 0.8, 5]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
    <mesh
      position={[0.6, 0.02, -0.4]}
      rotation={[0.2, -0.5, Math.PI / 2 + 0.45]}
    >
      <cylinderGeometry args={[0.035, 0.055, 0.7, 5]} />
      <meshStandardMaterial color="#2a1d12" roughness={1} />
    </mesh>
  </group>
);

const LorongScene = ({
  trees,
  hoveredTreeId,
  selectedTreeId,
  spotlightEra,
  hoveredEra,
  isMobile,
  signatureEvent,
  viewMode,
  transitioning,
  introActive,
  joystickRef,
  lookRef,
  swingActiveRef,
  chimeActiveRef,
  benchActive,
  onTreeHover,
  onTreeOut,
  onTreeClick,
  onBenchClick,
  onSwingClick,
  onChimeClick,
  onMonumentTrigger,
  onIntroComplete,
  onReturnTrigger,
}) => (
  <>
    {/* DROUGHT atmosphere — warm dusty brown tone tapi cukup terang
        biar visual decay (ranting jatuh, pohon mati, lentera mati)
        keliatan jelas. Iterasi sebelumnya kegelapan (#1f1410 bg +
        ambient 0.32) bikin scene baca sebagai "malam total" bukan
        "siang/sore gersang". */}
    <fog attach="fog" args={['#4a3525', 14, 46]} />
    <color attach="background" args={['#3a2818']} />
    {/* Ambient naikin signifikan (0.32 → 0.7) + tone amber lebih
        bright. Pengen kerasa "siang gersang berkabut debu" bukan
        malam mati. */}
    <ambientLight intensity={0.7} color="#e8c098" />
    {/* Key light — drought sun, intensity dinaikin balik biar visible.
        Warna amber kering — kaya cahaya yang nembus debu padang. */}
    <directionalLight
      position={[6, 12, 4]}
      intensity={1.35}
      color="#f4c890"
    />
    {/* Side fill light — warna warm gray, ngasih balance ke sisi
        gelap supaya silhouette pohon mati keliatan jelas. */}
    <directionalLight
      position={[-8, 14, -25]}
      intensity={0.5}
      color="#b8a090"
    />
    {/* Horizon glow di ujung path — Pohon Terakhir beacon. Intensity
        dinaikin biar kerasa kontras lawan ambient siang. */}
    <pointLight
      position={[0, 2.5, -33]}
      intensity={2.2}
      color="#f0a060"
      distance={14}
      decay={2}
    />
    {/* Ground = drought versions (defined di atas, replace Path +
        GroundPatches). Puddle di-skip — air gak ada di drought. */}
    <DroughtPath />
    <DroughtGroundPatches />
    <Footprints />
    <PathEdgeStones />
    <SettledLeaves />
    <DistantForest isMobile={isMobile} />
    {/* Pohon-pohon dikembalikan sebagai garden filler — gak lagi
        per-milestone (milestones udah pindah ke langit), tapi sebagai
        tatanan taman di mana user berdiri. SideTrees scattered di
        perimeter, GardenAnchorTrees di posisi spesifik dekat bench/
        swing/monument untuk komposisi. YearPlaques + Owls tetep
        dropped (tied ke per-milestone tree). */}
    {/* Drought variant: pohon mati (foliage → dead branches via prop).
        Bushes + Mushrooms di-skip — gak ada tumbuhan kecil di ekosistem
        rusak. */}
    <SideTrees isMobile={isMobile} viewMode={viewMode} restorationLevel={0} />
    <GardenAnchorTrees isMobile={isMobile} restorationLevel={0} />
    {/* Decay dressing — ranting jatuh, kayu rebah, daun kering, pohon
        roboh. Ngebangun tone "ekosistem rusak" yang lebih kerasa. */}
    <FallenDeadwood isMobile={isMobile} />
    <DriedLeafPiles />
    <FallenTree />
    {/* Dead-town polish — colonnade ruin pilar pecah di sisi path,
        distant city ruins siluet di horizon belakang BigTree, ground
        cracks. Kerasa peradaban yg pernah ada, sekarang sisa puing. */}
    <PillarRuins />
    <DistantRuins />
    <GroundCracks />
    {/* SkyGroup — wrap semua celestial elements (background stars,
        highlight stars, moon, milestone konstelasi). Di FPV, group
        follow camera XZ → stars terasa "ikut user" (real sky parallax-
        free). Di orbit, fixed di SKY_CENTER. */}
    <SkyGroup viewMode={viewMode}>
      <Stars isMobile={isMobile} />
      {!isMobile && <Nebula />}
      <HighlightStars signatureEvent={signatureEvent} isMobile={isMobile} />
      <Moon />
      {!isMobile && <ShootingStar />}
      {/* Konstelasi milestone — bintang di langit, era-grouped */}
      <ConstellationLines stars={trees} />
      <ConstellationLabels />
      {trees.map((star) => (
        <StarMilestone
          key={star.id}
          star={star}
          hovered={hoveredTreeId === star.id}
          selected={selectedTreeId === star.id}
          spotlit={spotlightEra === star.eraId}
          previewLit={hoveredEra === star.eraId && spotlightEra !== star.eraId}
          modalOpen={selectedTreeId !== null}
          signatureEvent={signatureEvent}
          onPointerOver={onTreeHover}
          onPointerOut={onTreeOut}
          onClick={onTreeClick}
        />
      ))}
    </SkyGroup>
    {/* FlyingLeavesGust di-bring-back — daun terbang di ground+mid air,
        gak ngeganggu sky atas (gust drift y=0.5..6, langit mulai y=10+). */}
    <FlyingLeavesGust isMobile={isMobile} />
    <OldBench onClick={onBenchClick} />
    <TreeSwing activeRef={swingActiveRef} onClick={onSwingClick} />
    <WindChime activeRef={chimeActiveRef} onClick={onChimeClick} />
    <MonumentProximity viewMode={viewMode} onTrigger={onMonumentTrigger} />
    {/* Bench whisper — floating poetic line di atas bangku saat di-click.
        distanceFactor=8 supaya readable di orbit jarak default. */}
    {benchActive && (
      <Html
        position={[3.0, 1.45, -15]}
        center
        distanceFactor={8}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="whitespace-nowrap text-center"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            color: 'rgba(255,228,178,0.9)',
            fontSize: '14px',
            letterSpacing: '0.01em',
            textShadow: '0 0 10px rgba(0,0,0,0.7), 0 0 24px rgba(255,170,80,0.18)',
            animation: 'lorongBenchFade 5500ms ease-out forwards',
          }}
        >
          Bangku kosong, masih menunggu.
        </div>
        <style>{`
          @keyframes lorongBenchFade {
            0%   { opacity: 0; transform: translateY(6px); }
            12%  { opacity: 1; transform: translateY(0); }
            85%  { opacity: 1; transform: translateY(-2px); }
            100% { opacity: 0; transform: translateY(-8px); }
          }
        `}</style>
      </Html>
    )}
    <StoneMonument onClick={onMonumentTrigger} />
    {/* Lanterns SEMUA dead di drought (allDead flag bypass per-entry
        dead config di LANTERN_DEFS). Posts tetap berdiri tapi gak
        nyala — abandoned vibe. */}
    <Lanterns
      signatureEvent={signatureEvent}
      viewMode={viewMode}
      allDead
    />
    {/* Drought variant: Owls/Rabbits/Bats/Fireflies absen — gak ada
        makhluk hidup saat ekosistem mati. */}
    <DistantFigure signatureEvent={signatureEvent} />
    {/* BigTreeReturnPortal sengaja DI-LEPAS dari drought — pohon di
        ujung lorong = "Pohon Terakhir", lone survivor di ekosistem
        mati. Foliage hijau + beacon glow tetap aktif (narrative anchor
        of hope). Restorasi penuh ekosistem akan numbuh dari sini. */}
    <BigTreeReturnPortal viewMode={viewMode} onTrigger={onReturnTrigger} />
    {/* Drought: GroundMist + MistPools (kabut bersih warna biru-abu)
        diganti PollutedAir — soft round particles warna dirty smog
        brown, kerasa "udara tercemar" bukan kabut. */}
    <PollutedAir count={120} isMobile={isMobile} />
    <FallingLeaves count={isMobile ? 22 : 38} />
    <MemoryFragments isMobile={isMobile} />
    {/* Konstelasi + milestone stars dipindah ke <SkyGroup> di atas
        supaya FPV walk = stars follow user (parallax-free). */}
    <CameraSync viewMode={viewMode} transitioning={transitioning} />
    <CinematicIntro active={introActive} onComplete={onIntroComplete} />
    {/* Controls cuma render setelah transition selesai supaya nggak
        fight dgn lerp. Saat transitioning=true, no control aktif. */}
    {!transitioning && !introActive && viewMode === 'orbit' && (
      <OrbitControls
        target={ORBIT_TARGET}
        enableZoom
        minDistance={5}
        maxDistance={14}
        enablePan={false}
        // Polar range — clamp ke maxPolar 1.75 (~100°) supaya camera
        // gak tembus ke bawah ground saat orbit dipping. ORBIT_TARGET
        // y=5, distance 5-14 → polar 1.75 keeps camera y >= ~2 di
        // worst case (maxDistance + max tilt). User masih bisa look
        // down ~10° dari horizontal untuk lihat ground sekitar.
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={1.75}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.4}
        autoRotate
        autoRotateSpeed={0.10}
      />
    )}
    {!transitioning && viewMode === 'fpv' && !isMobile && (
      <>
        <PointerLockControls />
        <FPVMovement enabled />
      </>
    )}
    {!transitioning && viewMode === 'fpv' && isMobile && (
      <MobileFPVMovement joystickRef={joystickRef} lookRef={lookRef} />
    )}
  </>
);


const TamanLorongPohonGersangPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Perf profiling — enable via ?perf=1 URL param. Stats panel +
  // FPS HUD + console warning saat sustained slow. Eval sekali on
  // mount, gak react ke URL change.
  const perfEnabled = useMemo(() => isPerfEnabled(), []);
  const perfFpsRef = useRef(0);
  const [hoveredTreeId, setHoveredTreeId] = useState(null);
  const [selectedTree, setSelectedTree] = useState(null);
  // Signature events:
  //   - 'recent' = click tree[0] (era recent) → lentera sync flicker +
  //     distant figure glow amber (past acknowledges present)
  //   - 'old' = click tree[last] (era debut) → highlight stars sync
  //     pulse + owls eye blink + distant figure halo (present
  //     acknowledges past)
  const [signatureEvent, setSignatureEvent] = useState(null);
  const clockRef = useRef(0);
  // View mode: 'orbit' = elevated 3/4 default, 'fpv' = first-person walk.
  // Mobile sembunyi-in toggle (PointerLockControls nggak support touch).
  const [viewMode, setViewMode] = useState('orbit');
  // Transitioning flag — set true saat toggle, controls dihapus, camera
  // lerp via CameraSync, set false setelah ~1.2s (transition done).
  const [transitioning, setTransitioning] = useState(false);
  // Mobile FPV refs — joystick (left thumb movement) + look (right
  // swipe rotation). Updated dari MobileFPVControls (DOM), read di
  // MobileFPVMovement (Canvas). Reset saat exit FPV.
  const joystickRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ yaw: 0, pitch: 0 });
  // Interaction state untuk prop ke bench/swing/chime:
  //   - benchActive (state) — show Html overlay 5s saat bench clicked
  //   - swingActiveRef / chimeActiveRef — clock time of last click,
  //     dibaca by useFrame untuk decay-based animation boost. Pakai
  //     ref biar gak trigger rerender setiap click.
  const [benchActive, setBenchActive] = useState(false);
  const swingActiveRef = useRef(-Infinity);
  const chimeActiveRef = useRef(-Infinity);
  const handleBenchClick = () => {
    setBenchActive(true);
    setTimeout(() => setBenchActive(false), 5500);
  };
  const handleSwingClick = () => {
    swingActiveRef.current = clockRef.current;
  };
  const handleChimeClick = () => {
    chimeActiveRef.current = clockRef.current;
    // Tinkle 2–3 notes pentatonic, slight stagger.
    // A5, B5, C6, D6, E6 — gentle bell range.
    const notes = [880, 988, 1047, 1175, 1319];
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const f = notes[Math.floor(Math.random() * notes.length)];
      setTimeout(() => playChimeTone(f, 0.14), i * 90 + Math.random() * 60);
    }
  };
  // Cinematic intro: camera lerp dari overhead ke default selama
  // ~3.5s di first visit. Skip kalau user udah lihat (localStorage
  // 'taman-r1-intro-seen' di-set saat IntroTitle removal).
  const [introActive, setIntroActive] = useState(() => {
    try {
      return localStorage.getItem(INTRO_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const handleIntroComplete = () => setIntroActive(false);

  // Big Tree Return Portal — player FPV jalan ke ujung lorong (z=-37),
  // hit pohon besar → balik ke /armeniacaTown/peta. Guarded oleh triggeredRef
  // di komponen-nya supaya fire sekali aja.
  const handleReturnTrigger = () => {
    navigate('/armeniacaTown/peta');
  };

  // Era spotlight: user click chip di EraGuide → bintang era itu
  // pulse 4 detik supaya gampang identifikasi di langit. Skip kalau
  // era yang sama lagi spotlight.
  const [spotlightEra, setSpotlightEra] = useState(null);
  // Hover preview — chip hover di EraGuide → softer pulse di stars
  // (lebih gentle dari click spotlight). Cleared on mouse leave.
  const [hoveredEra, setHoveredEra] = useState(null);
  const spotlightTimerRef = useRef(null);
  const handleEraSpotlight = (eraId) => {
    if (spotlightEra === eraId) return; // toggle-off behavior
    setSpotlightEra(eraId);
    if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
    spotlightTimerRef.current = setTimeout(() => {
      setSpotlightEra(null);
      spotlightTimerRef.current = null;
    }, 4000);
  };
  useEffect(() => {
    return () => {
      if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
    };
  }, []);

  // Monument moment: triggered via click di orbit OR proximity di FPV.
  // Skip kalau monument moment udah aktif (jangan re-trigger overlap).
  const handleMonumentTrigger = () => {
    if (signatureEvent?.type === 'monument') return;
    setSignatureEvent({ type: 'monument', time: clockRef.current });
    setTimeout(() => setSignatureEvent(null), 5500);
    // Deep slow bell — A4 (lebih rendah dari chime tube notes A5-E6).
    // Bawa tone "earned" ending, bukan playful tinkle.
    playChimeTone(440, 0.22);
    setTimeout(() => playChimeTone(659, 0.16), 380); // E5 layered, harmonic 5th
  };
  const toggleViewMode = () => {
    setTransitioning(true);
    setViewMode((m) => {
      const next = m === 'orbit' ? 'fpv' : 'orbit';
      // Reset mobile inputs saat masuk fpv
      if (next === 'fpv') {
        joystickRef.current.x = 0;
        joystickRef.current.y = 0;
        lookRef.current.yaw = 0;
        lookRef.current.pitch = 0;
      }
      return next;
    });
    setTimeout(() => setTransitioning(false), 1200);
  };

  // Map ELI_TIMELINE → star positions di sky dome. Tiap milestone
  // diposisi pakai era-grouped sky coordinates (lihat ERA_DEFS +
  // milestoneSkyPosition). Variabel masih namanya `trees` supaya gak
  // butuh rename luas — semantically "milestone display objects",
  // implementation now stars.
  const trees = useMemo(() => {
    const total = ELI_TIMELINE.length;
    return ELI_TIMELINE.map((entry, idx) => {
      const [x, y, z] = milestoneSkyPosition(entry.id);
      const year = entry.date ? entry.date.slice(0, 4) : entry.period;
      const color = starColorForMilestone(entry.id);
      const eraInfo = ERA_LOOKUP.get(entry.id);
      const eraId = eraInfo?.eraDef.id ?? null;
      // Anchor flags untuk signature events (recent/old) — first &
      // last star in array trigger cross-scene effects via
      // signatureEvent state.
      const isRecentAnchor = idx === 0;
      const isOldAnchor = idx === total - 1;
      return {
        ...entry,
        x,
        y,
        z,
        year,
        color,
        eraId,
        isRecentAnchor,
        isOldAnchor,
      };
    });
  }, []);

  useEffect(() => {
    document.body.style.cursor = hoveredTreeId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredTreeId]);

  const handleTreeHover = (id) => setHoveredTreeId(id);
  const handleTreeOut = (id) =>
    setHoveredTreeId((c) => (c === id ? null : c));
  const handleTreeClick = (tree) => {
    setSelectedTree(tree);
    setHoveredTreeId(null);
    if (trees.length === 0) return;
    if (tree.id === trees[0].id) {
      // Recent era: lentera sync + figure glow
      setSignatureEvent({ type: 'recent', time: clockRef.current });
      setTimeout(() => setSignatureEvent(null), 3500);
    } else if (tree.id === trees[trees.length - 1].id) {
      // Oldest era: stars sync + owl blink + figure halo
      setSignatureEvent({ type: 'old', time: clockRef.current });
      setTimeout(() => setSignatureEvent(null), 4000);
    }
  };
  const handleClose = () => setSelectedTree(null);
  // Prev/next/jump pagination dari modal — gak trigger signature event
  // (signature event tied to tree click di scene, bukan modal nav).
  const handlePrev = (jumpIdx) => {
    if (!selectedTree) return;
    const i = trees.findIndex((t) => t.id === selectedTree.id);
    const target = typeof jumpIdx === 'number' ? jumpIdx : i - 1;
    if (target < 0 || target >= trees.length) return;
    setSelectedTree(trees[target]);
  };
  const handleNext = (jumpIdx) => {
    if (!selectedTree) return;
    const i = trees.findIndex((t) => t.id === selectedTree.id);
    const target = typeof jumpIdx === 'number' ? jumpIdx : i + 1;
    if (target < 0 || target >= trees.length) return;
    setSelectedTree(trees[target]);
  };

  return (
    <>
      <Seo
        title="Konstelasi Perjalanan"
        description="Perjalanan karier Eli dari Generasi 7 ke Team Dream — milestone-milestone yang dirajut menjadi konstelasi di langit taman senja."
        path="/armeniacaTown/r1"
      />
      <div className="relative w-full h-[100dvh] bg-[#1c1f2a] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 55, position: [4, 4, -2] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 5, -10);
            }}
          >
            <ClockSync clockRef={clockRef} />
            {perfEnabled && <PerfSampler statsRef={perfFpsRef} />}
            <LorongScene
              trees={trees}
              hoveredTreeId={hoveredTreeId}
              selectedTreeId={selectedTree?.id ?? null}
              spotlightEra={spotlightEra}
              hoveredEra={hoveredEra}
              isMobile={isMobile}
              signatureEvent={signatureEvent}
              viewMode={viewMode}
              transitioning={transitioning}
              joystickRef={joystickRef}
              lookRef={lookRef}
              swingActiveRef={swingActiveRef}
              chimeActiveRef={chimeActiveRef}
              benchActive={benchActive}
              onTreeHover={handleTreeHover}
              onTreeOut={handleTreeOut}
              onTreeClick={handleTreeClick}
              onBenchClick={handleBenchClick}
              onSwingClick={handleSwingClick}
              onChimeClick={handleChimeClick}
              onMonumentTrigger={handleMonumentTrigger}
              introActive={introActive}
              onIntroComplete={handleIntroComplete}
              onReturnTrigger={handleReturnTrigger}
            />
            {!isMobile && (
              <EffectComposer>
                {/* Bloom subtle — threshold tinggi 0.85 supaya cuma
                    highlight ekstrem (lentera, mata owl, moon, star
                    highlights) yang glow. Intensity 0.4 biar nggak
                    mendominasi. */}
                <Bloom
                  intensity={0.4}
                  luminanceThreshold={0.85}
                  luminanceSmoothing={0.35}
                  mipmapBlur
                />
                {/* Vignette darken edges untuk cinematic feel */}
                <Vignette eskil={false} offset={0.35} darkness={0.5} />
                {/* ACES tonemapping — film-grade color response */}
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            )}
            {(import.meta.env.DEV || perfEnabled) && <Stats />}
          </Canvas>
        </Suspense>

        <IntroTitle isMobile={isMobile} />
        {/* TutorialHint dropped — tip di-merge ke IntroTitle card bottom
            supaya onboarding cuma 1 surface di first visit, bukan 2 */}
        <EraGuide
          trees={trees}
          isMobile={isMobile}
          onSpotlight={handleEraSpotlight}
          spotlightEra={spotlightEra}
          onHoverEra={setHoveredEra}
          hoveredEra={hoveredEra}
        />
        <LorongHeader />
        <LorongFooter hoveredTreeId={hoveredTreeId} isMobile={isMobile} />
        {/* FPV toggle — desktop AND mobile. Position bottom-right.
            Safe-area inset bottom buat iPhone home indicator. */}
        <button
          type="button"
          onClick={toggleViewMode}
          disabled={transitioning || introActive}
          className="pointer-events-auto absolute right-4 sm:right-6 z-30 px-3 py-2 sm:px-4 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm text-white/85 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        >
          {viewMode === 'orbit' ? 'Tatap langit' : 'Keluar tatap langit'}
        </button>
        {/* Desktop FPV hint */}
        {viewMode === 'fpv' && !isMobile && !transitioning && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60 text-[11px] uppercase tracking-[0.25em] text-center">
            <div className="mb-1">Klik layar untuk mulai menengadah</div>
            <div className="text-white/40">
              WASD untuk jalan di taman · Esc untuk lepas kursor
            </div>
          </div>
        )}
        {/* Mobile FPV joystick overlay */}
        {viewMode === 'fpv' && isMobile && !transitioning && (
          <MobileFPVControls joystickRef={joystickRef} lookRef={lookRef} />
        )}
        <MilestoneOverlay
          tree={selectedTree}
          trees={trees}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
        <MonumentMomentOverlay
          active={signatureEvent?.type === 'monument'}
        />
        <AmbientAudio position="top-right" />
        <RotateRecommendation />
        {perfEnabled && <PerfHUD statsRef={perfFpsRef} />}
      </div>
    </>
  );
};

export default TamanLorongPohonGersangPage;
