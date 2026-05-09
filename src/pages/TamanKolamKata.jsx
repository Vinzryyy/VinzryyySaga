/**
 * Taman Kebaikan — Petak R3: Telaga Harapan.
 *
 * Wish panel 3D — taman kota di tepi danau di siang hari. Tiap
 * teratai mekar di danau = 1 wish dari fans (sumber: SITE_CONFIG.
 * wishes.seeds + live Firebase via subscribeToWishes).
 *
 * Layout terinspirasi town park: danau tenang + bench kayu di tepi
 * untuk pengunjung duduk sambil melihat teratai, walking path
 * gravel sepanjang shore, dermaga kayu kecil yang menjulur ke air,
 * dan pohon-pohon di perimeter.
 *
 * Visual (daytime — referensi: foto town park user):
 *   - Sky: soft blue cerah (#bdd6ea) dengan light fog jauh
 *   - Danau lebar (14 wide × 28 long) bright water blue dengan
 *     reflection langit
 *   - Banks rumput hijau cerah keliling 4 sisi
 *   - Wooden bench di shore -x menghadap air (visitor seating)
 *   - Gravel walking path sepanjang shore -x parallel air
 *   - Wooden dock kecil menjulur dari shore +x ke air
 *   - Batu-batu di tepi danau (boundary stones)
 *   - Rumput tufts scatter di banks
 *   - 12 pohon di perimeter (BankTrees) — bright green foliage
 *   - 4 lentera di sepanjang shore — decoratif (no glow at daytime)
 *   - Dust motes putih drift halus = particle highlight di sun beam
 *   - 1-11 lily pad dengan teratai mekar pink/peach/cream/lavender
 *   - Pads gentle drift downstream + bobs idle
 *   - Bright sun directional dari atas warmer angle + ambient cerah
 *
 * Wish pertama (paling baru / featured) jadi teratai besar di tengah
 * danau; sisanya scatter di sekelilingnya dengan radius variasi.
 *
 * Click pad → modal full wish (nama Fraunces italic + handle +
 * message + tanggal). Layout modal sengaja lebih intim — text lebih
 * besar, ada quote-mark dekoratif, padding lega.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
import { SITE_CONFIG } from '../config/siteConfig';
import { subscribeToWishes } from '../lib/wishesDb';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
};

const lerp = (a, b, t) => a + (b - a) * t;

// Dimensi danau — dipake di banyak komponen (Banks, WalkPath, Bench,
// Dock, LANTERN_POSITIONS, dst). Deklarasi di sini supaya semua module-
// level constants yang reference ke nilai ini bisa baca tanpa TDZ.
const RIVER_WIDTH = 14;
const RIVER_LENGTH = 28;

// Truncate untuk preview label di pad — biar nggak ngerampokin scene.
const shortLabel = (text, maxWords = 4) => {
  const words = (text || '').trim().split(/\s+/);
  if (words.length <= maxWords) return text || '';
  return words.slice(0, maxWords).join(' ') + '…';
};

const formatDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Bunga teratai mekar — 6 outer petals (cone tilted outward) + 3 inner
// petals (cone tilted upright) + center stamen (sphere with strong
// emissive). Stylized & low-poly tapi recognizable. Posisi/rotasi
// petals di-precompute sekali untuk hindari useMemo per render.
const OUTER_PETALS = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2;
  return { angle };
});
const INNER_PETALS = Array.from({ length: 3 }, (_, i) => {
  const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
  return { angle };
});

const TerataiBloom = ({ color = '#f4c8d8', scale = 1 }) => (
  <group scale={scale}>
    {OUTER_PETALS.map((p, i) => (
      <mesh
        key={`outer-${i}`}
        position={[Math.cos(p.angle) * 0.085, 0.04, Math.sin(p.angle) * 0.085]}
        rotation={[Math.PI / 2.4, 0, -p.angle]}
      >
        <coneGeometry args={[0.085, 0.2, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.18}
          roughness={0.55}
        />
      </mesh>
    ))}
    {INNER_PETALS.map((p, i) => (
      <mesh
        key={`inner-${i}`}
        position={[Math.cos(p.angle) * 0.045, 0.13, Math.sin(p.angle) * 0.045]}
        rotation={[Math.PI / 3.2, 0, -p.angle]}
      >
        <coneGeometry args={[0.055, 0.16, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.55}
        />
      </mesh>
    ))}
    <mesh position={[0, 0.18, 0]}>
      <sphereGeometry args={[0.06, 10, 8]} />
      <meshStandardMaterial
        color="#f4e8a0"
        emissive="#f4e8a0"
        emissiveIntensity={0.6}
        roughness={0.4}
      />
    </mesh>
  </group>
);

// Lily pad + teratai bloom + label wish. Hover: lift Y + emissive
// glow di leaf disc + label brighter + ripple ring expanding di
// bawah pad. Plus subtle drift downstream — pad pelan-pelan bergerak
// ke +z, wrap saat lewat batas. Skala drift di-kecilin karena
// danau lebih lebar (lebih ada area untuk bergerak).
const FLOW_SPEED = 0.03; // unit per detik
const FLOW_END_Z = 12;
const FLOW_START_Z = -12;

const LilyWishPad = ({ pad, hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const matRef = useRef();
  const rippleRef = useRef();
  const rippleMatRef = useRef();
  // Track drift z separately dari posisi awal pad — pad punya base
  // origin di pad.pos, drift di-akumulasi di useFrame.
  const driftZRef = useRef(0);
  const hoverElapsedRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current || !matRef.current) return;
    // Drift downstream — pelan-pelan ke +z. Reset kalau lewat batas.
    driftZRef.current += FLOW_SPEED * delta;
    let zPos = pad.pos[2] + driftZRef.current;
    if (zPos > FLOW_END_Z) {
      // Wrap ke awal sungai
      driftZRef.current -= FLOW_END_Z - FLOW_START_Z;
      zPos = pad.pos[2] + driftZRef.current;
    }

    const idleY = Math.sin(state.clock.elapsedTime * 0.55 + pad.phase) * 0.05;
    const targetY = (hovered ? 0.2 : 0) + idleY;
    const targetEmissive = hovered ? 0.4 : 0.06;
    const factor = Math.min(delta * 7, 1);
    groupRef.current.position.y = lerp(
      groupRef.current.position.y,
      targetY,
      factor
    );
    groupRef.current.position.x = pad.pos[0];
    groupRef.current.position.z = zPos;
    matRef.current.emissiveIntensity = lerp(
      matRef.current.emissiveIntensity,
      targetEmissive,
      factor
    );

    // Ripple animation — saat hovered, ring di bawah pad melebar &
    // fade. Reset elapsed saat unhovered. Cycle 1.8 detik.
    if (hovered) {
      hoverElapsedRef.current += delta;
    } else {
      hoverElapsedRef.current = 0;
    }
    if (rippleRef.current && rippleMatRef.current) {
      const t = (hoverElapsedRef.current % 1.8) / 1.8;
      const scale = 0.6 + t * 1.8; // 0.6 → 2.4
      rippleRef.current.scale.set(scale, scale, scale);
      rippleMatRef.current.opacity = hovered ? (1 - t) * 0.5 : 0;
    }
  });

  const padRadius = pad.isCenter ? 0.95 : 0.62;
  const bloomScale = pad.isCenter ? 1.5 : 1.0;

  return (
    <group
      ref={groupRef}
      position={pad.pos}
      rotation={[0, pad.tilt, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(pad.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(pad.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pad);
      }}
    >
      {/* Ripple ring di bawah pad — torus tipis di permukaan air,
          melebar & fade saat pad hovered. Render before pad supaya
          ring kelihatan keluar dari bawah pad, bukan nutup pad. */}
      <mesh
        ref={rippleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
      >
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshBasicMaterial
          ref={rippleMatRef}
          color="#cfe0f0"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* Daun teratai (lily pad disc) — hex cylinder rendah dengan
          warna hijau gelap (malam). Side surface catch light. */}
      <mesh>
        <cylinderGeometry args={[padRadius, padRadius * 1.05, 0.06, 24]} />
        <meshStandardMaterial
          ref={matRef}
          color={pad.leafColor}
          emissive={pad.leafColor}
          emissiveIntensity={0.06}
          roughness={0.7}
        />
      </mesh>
      {/* Bunga teratai mekar di atas daun */}
      <group position={[0, 0.04, 0]}>
        <TerataiBloom color={pad.bloomColor} scale={bloomScale} />
      </group>
      <Html
        position={[0, pad.isCenter ? 0.65 : 0.5, 0]}
        center
        distanceFactor={11}
        occlude={false}
      >
        <div
          className={`text-center pointer-events-none select-none transition-all duration-300 ease-out ${
            hovered ? '-translate-y-1' : ''
          }`}
          style={{ minWidth: pad.isCenter ? '180px' : '140px' }}
        >
          {pad.isCenter && (
            <div className="text-pink-200/80 text-[8px] uppercase tracking-[0.25em] mb-1">
              Wish utama
            </div>
          )}
          <div
            className={`leading-snug transition-colors ${
              pad.isCenter ? 'text-[11px] font-medium' : 'text-[10px]'
            } ${hovered ? 'text-white' : 'text-white/75'}`}
          >
            — {pad.name}
          </div>
          <div
            className={`text-[9px] mt-0.5 transition-colors leading-snug ${
              hovered ? 'text-white/80' : 'text-white/55'
            }`}
          >
            {shortLabel(pad.message, pad.isCenter ? 6 : 4)}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Kelopak bunga jatuh — falling petal particles untuk daytime
// atmosphere. Soft pink/cream warna, drift turun pelan dengan sway
// horizontal tipis. Reset ke atas saat sampai air. Pakai
// BufferGeometry 1 draw call.
const FallingPetals = ({ count = 60 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, [count]);

  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      arr[i * 2] = -0.12 - Math.random() * 0.08;
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.04;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 2 + 1] * delta * 60;
      arr[i * 3 + 1] += velocities[i * 2] * delta;
      if (arr[i * 3 + 1] < 0.3) {
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 1] = 12 + Math.random() * 4;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
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
      </bufferGeometry>
      <pointsMaterial
        size={0.13}
        color="#f4c8d8"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Bukit jauh sebagai silhouette — 3 layer ridge di horizon untuk kasih
// atmospheric depth & sense of wider world. Pakai box geometry rendah
// dengan tone hijau-biru desaturated (atmospheric haze). Layer paling
// jauh = paling samar (lebih biru), paling depan = lebih hijau.
const DistantHills = () => (
  <>
    {/* Layer paling jauh */}
    <mesh position={[-20, 1.5, -55]}>
      <boxGeometry args={[60, 4, 1]} />
      <meshStandardMaterial color="#9aaab5" roughness={1} />
    </mesh>
    <mesh position={[15, 2.0, -52]}>
      <boxGeometry args={[40, 5, 1]} />
      <meshStandardMaterial color="#9aaab5" roughness={1} />
    </mesh>
    {/* Layer tengah */}
    <mesh position={[-5, 1.8, -45]}>
      <boxGeometry args={[35, 4.5, 1]} />
      <meshStandardMaterial color="#7d9583" roughness={1} />
    </mesh>
    <mesh position={[20, 1.5, -42]}>
      <boxGeometry args={[28, 4, 1]} />
      <meshStandardMaterial color="#7d9583" roughness={1} />
    </mesh>
    {/* Layer paling depan — lebih hijau, lebih kelihatan detail */}
    <mesh position={[-15, 1.2, -35]}>
      <boxGeometry args={[25, 3.5, 1]} />
      <meshStandardMaterial color="#5a7a55" roughness={1} />
    </mesh>
    <mesh position={[10, 1.0, -33]}>
      <boxGeometry args={[20, 3.0, 1]} />
      <meshStandardMaterial color="#5a7a55" roughness={1} />
    </mesh>
  </>
);

// Cattails (rumput air / typha) — tanaman ikonik tepi danau. Stem
// tinggi tipis hijau + cattail head silinder coklat di atas. 4
// cluster di water edge dengan 5 cattails per cluster.
const CattailCluster = ({ pos }) => {
  const stems = useMemo(() => {
    const arr = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const offset = (i - 2) * 0.15;
      const sideOffset = ((i * 17) % 100) / 100 - 0.5;
      const height = 1.2 + ((i * 13) % 100) / 200;
      arr.push({
        x: offset,
        z: sideOffset * 0.3,
        height,
      });
    }
    return arr;
  }, []);

  return (
    <group position={pos}>
      {stems.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          {/* Stem */}
          <mesh position={[0, s.height / 2, 0]}>
            <cylinderGeometry args={[0.018, 0.022, s.height, 5]} />
            <meshStandardMaterial color="#5a8045" roughness={1} />
          </mesh>
          {/* Cattail head */}
          <mesh position={[0, s.height - 0.05, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.28, 6]} />
            <meshStandardMaterial color="#6a3e1f" roughness={0.95} />
          </mesh>
          {/* Tip stem above head */}
          <mesh position={[0, s.height + 0.18, 0]}>
            <cylinderGeometry args={[0.012, 0.018, 0.14, 5]} />
            <meshStandardMaterial color="#5a8045" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const CATTAIL_POSITIONS = [
  // Tepi kiri danau (skip area bench/dock/path)
  [-7.0, 0, -12],
  [-7.0, 0, 11],
  // Tepi kanan
  [7.0, 0, -10],
  [7.0, 0, -1],
  // Tepi atas/bawah
  [-2, 0, -13.5],
  [3, 0, 13.5],
];

const Cattails = () => (
  <>
    {CATTAIL_POSITIONS.map((pos, i) => (
      <CattailCluster key={`cattail-${i}`} pos={pos} />
    ))}
  </>
);

// Wildflowers — bunga liar kecil scatter di grass area. Sphere kecil
// dengan warna variasi (yellow daisy, white, pink, blue, purple) +
// sedikit emissive untuk pop. Pakai Points untuk efisiensi visual,
// tapi karena warna variasi per bunga harus pakai vertex colors —
// untuk simplicity pakai mesh kecil (~50 mesh, manageable).
const WILDFLOWER_COLORS = [
  '#f4d870', // dandelion yellow
  '#ffffff', // white daisy
  '#e89bb8', // pink wildflower
  '#9bb8e8', // blue wildflower
  '#c89be8', // purple wildflower
  '#f4a570', // soft orange
];

const WILDFLOWER_POSITIONS = (() => {
  const items = [];
  // Scatter di banks (avoid path -x dan dock area +x z=4)
  // Bank kiri (di luar path)
  for (let i = 0; i < 14; i++) {
    const x = -10 - ((i * 17) % 50) / 50 * 6;
    const z = -12 + (i * 2.0);
    items.push({ pos: [x, 0.04, z], colorIdx: (i * 3) % WILDFLOWER_COLORS.length });
  }
  // Bank kanan (di luar dock)
  for (let i = 0; i < 14; i++) {
    const x = 10 + ((i * 23) % 50) / 50 * 6;
    const z = -12 + (i * 2.0);
    items.push({ pos: [x, 0.04, z], colorIdx: (i * 5 + 1) % WILDFLOWER_COLORS.length });
  }
  // Bank atas (-z)
  for (let i = 0; i < 8; i++) {
    const x = -8 + (i * 2.2);
    const z = -16 - ((i * 13) % 30) / 30 * 3;
    items.push({ pos: [x, 0.04, z], colorIdx: (i * 7 + 2) % WILDFLOWER_COLORS.length });
  }
  // Bank bawah (+z)
  for (let i = 0; i < 8; i++) {
    const x = -8 + (i * 2.2);
    const z = 16 + ((i * 11) % 30) / 30 * 3;
    items.push({ pos: [x, 0.04, z], colorIdx: (i * 5 + 3) % WILDFLOWER_COLORS.length });
  }
  return items;
})();

const Wildflowers = () => (
  <>
    {WILDFLOWER_POSITIONS.map((f, i) => (
      <mesh key={`flower-${i}`} position={f.pos}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial
          color={WILDFLOWER_COLORS[f.colorIdx]}
          emissive={WILDFLOWER_COLORS[f.colorIdx]}
          emissiveIntensity={0.15}
          roughness={0.6}
        />
      </mesh>
    ))}
  </>
);

// Wooden bridge — jembatan kayu kecil melintasi salah satu ujung
// danau (di z = -12.5, dekat ujung utara). Span x dari -7 ke 7 (lebar
// danau + sedikit overlap ke banks). Floor plank + 2 railing kiri/
// kanan + railing posts (4 di tiap side).
const BRIDGE_Z = -12.5;
const BRIDGE_SPAN = 16;

const Bridge = () => {
  const posts = [];
  // 5 posts kiri-kanan masing-masing
  for (let i = 0; i < 5; i++) {
    const x = -BRIDGE_SPAN / 2 + 0.5 + (BRIDGE_SPAN - 1) * (i / 4);
    posts.push({ x, side: -1 }); // kiri railing
    posts.push({ x, side: 1 }); // kanan railing
  }
  return (
    <group position={[0, 0, BRIDGE_Z]}>
      {/* Floor (plank) */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[BRIDGE_SPAN, 0.1, 1.6]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.9} />
      </mesh>
      {/* Plank lines on top — dekoratif horizontal */}
      <mesh position={[0, 0.21, -0.5]}>
        <boxGeometry args={[BRIDGE_SPAN - 0.2, 0.005, 0.05]} />
        <meshStandardMaterial color="#3a2616" roughness={1} />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[BRIDGE_SPAN - 0.2, 0.005, 0.05]} />
        <meshStandardMaterial color="#3a2616" roughness={1} />
      </mesh>
      <mesh position={[0, 0.21, 0.5]}>
        <boxGeometry args={[BRIDGE_SPAN - 0.2, 0.005, 0.05]} />
        <meshStandardMaterial color="#3a2616" roughness={1} />
      </mesh>
      {/* Railing kiri & kanan — 2 horizontal rail */}
      <mesh position={[0, 0.7, -0.75]}>
        <boxGeometry args={[BRIDGE_SPAN, 0.06, 0.06]} />
        <meshStandardMaterial color="#4a3826" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 0.75]}>
        <boxGeometry args={[BRIDGE_SPAN, 0.06, 0.06]} />
        <meshStandardMaterial color="#4a3826" roughness={0.9} />
      </mesh>
      {/* Vertical posts */}
      {posts.map((p, i) => (
        <mesh
          key={`post-${i}`}
          position={[p.x, 0.45, p.side * 0.75]}
        >
          <boxGeometry args={[0.08, 0.6, 0.08]} />
          <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

// Burung-burung di langit — simple silhouette (V-shape via 2 cone)
// drifting horizontal. 3 burung dengan posisi & speed berbeda. Animasi
// sederhana di useFrame: x position drift + sedikit y oscillation.
const BIRD_DEFS = [
  { startX: -25, y: 14, z: -20, speed: 1.2, phase: 0 },
  { startX: -30, y: 12, z: -25, speed: 0.9, phase: 1.5 },
  { startX: -20, y: 16, z: -18, speed: 1.5, phase: 0.8 },
];

const Bird = ({ def }) => {
  const groupRef = useRef();
  const xRef = useRef(def.startX);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    xRef.current += def.speed * delta;
    if (xRef.current > 30) xRef.current = -30;
    const yBob = Math.sin(state.clock.elapsedTime * 0.8 + def.phase) * 0.3;
    groupRef.current.position.x = xRef.current;
    groupRef.current.position.y = def.y + yBob;
    groupRef.current.position.z = def.z;
  });

  return (
    <group ref={groupRef}>
      {/* Wing kiri */}
      <mesh rotation={[0, 0, 0.6]}>
        <coneGeometry args={[0.25, 0.5, 4]} />
        <meshStandardMaterial color="#2a1f15" roughness={1} />
      </mesh>
      {/* Wing kanan */}
      <mesh rotation={[0, 0, -0.6]}>
        <coneGeometry args={[0.25, 0.5, 4]} />
        <meshStandardMaterial color="#2a1f15" roughness={1} />
      </mesh>
    </group>
  );
};

const Birds = () => (
  <>
    {BIRD_DEFS.map((def, i) => (
      <Bird key={`bird-${i}`} def={def} />
    ))}
  </>
);

// Awan-awan kecil di langit — 5 cloud puff sebagai sphere putih
// dengan slight emissive warmth. Posisi tinggi (y=15..22) dan jauh
// (z=-25..15). Rotasi per cloud untuk variasi shape, scale 1-2x.
// Kasih sense of "langit ada isi", bukan flat color.
const CLOUD_POSITIONS = [
  { pos: [-10, 18, -22], scale: [2.2, 1.0, 1.5] },
  { pos: [12, 20, -18], scale: [2.0, 0.9, 1.6] },
  { pos: [-2, 22, -28], scale: [2.5, 1.1, 1.8] },
  { pos: [18, 17, 0], scale: [1.8, 0.9, 1.4] },
  { pos: [-18, 19, 5], scale: [2.0, 1.0, 1.5] },
];
const Cloud = ({ pos, scale }) => (
  <group position={pos} scale={scale}>
    <mesh>
      <sphereGeometry args={[1.5, 12, 10]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </mesh>
    <mesh position={[1.0, 0.1, 0.2]}>
      <sphereGeometry args={[1.1, 12, 10]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </mesh>
    <mesh position={[-0.9, -0.1, 0.1]}>
      <sphereGeometry args={[1.0, 12, 10]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </mesh>
  </group>
);
const Clouds = () => (
  <>
    {CLOUD_POSITIONS.map((c, i) => (
      <Cloud key={`cloud-${i}`} pos={c.pos} scale={c.scale} />
    ))}
  </>
);

// Lentera kayu kecil di tepi sungai — tiang vertikal + body lentera
// box + atap. Daytime mode: nggak ada glow + nggak ada pointlight
// (lampu kan mati siang hari). Tetap berdiri sebagai dekorasi taman.
const Lantern = ({ pos }) => (
  <group position={pos}>
    {/* Tiang */}
    <mesh position={[0, 0.8, 0]}>
      <cylinderGeometry args={[0.04, 0.06, 1.6, 6]} />
      <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
    </mesh>
    {/* Body lentera */}
    <mesh position={[0, 1.65, 0]}>
      <boxGeometry args={[0.28, 0.32, 0.28]} />
      <meshStandardMaterial color="#2a1d14" roughness={0.9} />
    </mesh>
    {/* Atap lentera (piramida tipis) */}
    <mesh position={[0, 1.86, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.22, 0.12, 4]} />
      <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
    </mesh>
  </group>
);

const LANTERN_POSITIONS = [
  // 2 di sepanjang path kiri (parallel walkway)
  [-(RIVER_WIDTH / 2 + 0.5), 0, -10],
  [-(RIVER_WIDTH / 2 + 0.5), 0, 8],
  // 2 di shore kanan flank dock
  [RIVER_WIDTH / 2 + 0.5, 0, -8],
  [RIVER_WIDTH / 2 + 0.5, 0, 11],
];

const Lanterns = () => (
  <>
    {LANTERN_POSITIONS.map((pos, i) => (
      <Lantern key={`lantern-${i}`} pos={pos} />
    ))}
  </>
);

// Pohon kecil di banks — versi simpel dari CenterTree, ramping &
// dark night green. Frame visual untuk scene + dimensionality. Posisi
// scatter di kedua tepi, jauh dari sungai supaya nggak nutupin lily
// pads.
const BankTree = ({ pos, scale = 1 }) => (
  <group position={pos} scale={scale}>
    <mesh position={[0, 0.8, 0]}>
      <cylinderGeometry args={[0.08, 0.13, 1.6, 8]} />
      <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
    </mesh>
    {/* Foliage 2 cluster bright green untuk daytime */}
    <mesh position={[0, 1.85, 0]}>
      <sphereGeometry args={[0.55, 12, 10]} />
      <meshStandardMaterial color="#5a8045" roughness={0.8} />
    </mesh>
    <mesh position={[0.18, 2.05, 0.05]}>
      <sphereGeometry args={[0.4, 12, 10]} />
      <meshStandardMaterial color="#6e9358" roughness={0.8} />
    </mesh>
  </group>
);

// Pohon di perimeter danau — 4 sisi. Posisi nge-frame scene tanpa
// nutupin lily pads atau bench/dock area.
const BANK_TREE_POSITIONS = [
  // Kiri (jauh dari path biar nggak nutupin bench)
  { pos: [-12.0, 0, -10], scale: 1.1 },
  { pos: [-11.5, 0, -1], scale: 0.95 },
  { pos: [-12.5, 0, 8], scale: 1.05 },
  // Kanan (jauh dari dock)
  { pos: [12.0, 0, -11], scale: 1.0 },
  { pos: [12.5, 0, -2], scale: 1.1 },
  { pos: [11.8, 0, 10], scale: 0.9 },
  // Atas (-z)
  { pos: [-6, 0, -17], scale: 1.0 },
  { pos: [3, 0, -18], scale: 1.1 },
  { pos: [8, 0, -16.5], scale: 0.95 },
  // Bawah (+z)
  { pos: [-7, 0, 17], scale: 1.05 },
  { pos: [2, 0, 18], scale: 1.0 },
  { pos: [9, 0, 17.5], scale: 0.9 },
];

const BankTrees = () => (
  <>
    {BANK_TREE_POSITIONS.map((t, i) => (
      <BankTree key={`bank-tree-${i}`} pos={t.pos} scale={t.scale} />
    ))}
  </>
);

// Danau lebar di tengah taman — RIVER_WIDTH × RIVER_LENGTH (deklarasi
// di top file untuk hindari TDZ). Deep night blue dengan metalness
// moderate + roughness sedang untuk reflection halus dari moonlight
// + lentera. Static (no shader wave) untuk performa.
const River = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
    <planeGeometry args={[RIVER_WIDTH, RIVER_LENGTH]} />
    <meshStandardMaterial
      color="#5a8aaf"
      roughness={0.4}
      metalness={0.3}
    />
  </mesh>
);

// Banks rumput keliling 4 sisi danau + lapangan taman luar. Warna
// warm-dark green supaya tepi terlihat dari background. Banks agak
// lebih elevated dari air = kerasa kayak shoreline yang sedikit
// di atas water level.
const Banks = () => (
  <>
    {/* Lapangan utama — frame visual luar, bright grass green */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]}>
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial color="#5a8045" roughness={1} />
    </mesh>
    {/* Bank kiri (-x) — lebih lebar karena di sini ada bench + path */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[-(RIVER_WIDTH / 2 + 5), -0.04, 0]}
    >
      <planeGeometry args={[10, RIVER_LENGTH + 2]} />
      <meshStandardMaterial color="#6a9050" roughness={1} />
    </mesh>
    {/* Bank kanan (+x) — sini ada dock */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[RIVER_WIDTH / 2 + 5, -0.04, 0]}
    >
      <planeGeometry args={[10, RIVER_LENGTH + 2]} />
      <meshStandardMaterial color="#6a9050" roughness={1} />
    </mesh>
    {/* Bank atas (-z) */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.04, -(RIVER_LENGTH / 2 + 4)]}
    >
      <planeGeometry args={[RIVER_WIDTH + 20, 8]} />
      <meshStandardMaterial color="#6a9050" roughness={1} />
    </mesh>
    {/* Bank bawah (+z) */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.04, RIVER_LENGTH / 2 + 4]}
    >
      <planeGeometry args={[RIVER_WIDTH + 20, 8]} />
      <meshStandardMaterial color="#6a9050" roughness={1} />
    </mesh>
  </>
);

// Walking path — gravel-toned strip di sepanjang bank kiri (-x),
// parallel sama danau. Tone warm-gray (#5a4f42) supaya kelihatan
// distinct dari grass banks. Lebar 1.4, panjang sesuai danau.
const WalkPath = () => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[-(RIVER_WIDTH / 2 + 1.5), -0.03, 0]}
  >
    <planeGeometry args={[1.4, RIVER_LENGTH + 1]} />
    <meshStandardMaterial color="#5a4f42" roughness={1} />
  </mesh>
);

// Wooden bench di shore kiri menghadap air — sandaran + tempat duduk
// + 2 kaki. Pengunjung "virtual" duduk di sini, lihat teratai. Posisi
// di z=-2 supaya kelihatan dari camera default angle yang nempel ke
// sisi kanan.
const Bench = () => (
  <group position={[-(RIVER_WIDTH / 2 + 2.5), 0, -2]} rotation={[0, Math.PI / 2, 0]}>
    {/* Tempat duduk (seat plank) */}
    <mesh position={[0, 0.45, 0]}>
      <boxGeometry args={[1.6, 0.06, 0.4]} />
      <meshStandardMaterial color="#4a3a26" roughness={0.85} />
    </mesh>
    {/* Sandaran (back rest) */}
    <mesh position={[0, 0.75, -0.18]}>
      <boxGeometry args={[1.6, 0.5, 0.06]} />
      <meshStandardMaterial color="#4a3a26" roughness={0.85} />
    </mesh>
    {/* Kaki kiri */}
    <mesh position={[-0.65, 0.22, 0]}>
      <boxGeometry args={[0.08, 0.45, 0.32]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
    {/* Kaki kanan */}
    <mesh position={[0.65, 0.22, 0]}>
      <boxGeometry args={[0.08, 0.45, 0.32]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
    {/* Sandaran tangan kiri */}
    <mesh position={[-0.78, 0.55, 0]}>
      <boxGeometry args={[0.08, 0.25, 0.4]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
    {/* Sandaran tangan kanan */}
    <mesh position={[0.78, 0.55, 0]}>
      <boxGeometry args={[0.08, 0.25, 0.4]} />
      <meshStandardMaterial color="#3a2c1c" roughness={0.9} />
    </mesh>
  </group>
);

// Wooden dock (dermaga kecil) yang menjulur dari shore +x ke air.
// 4 plank kayu sejajar + 4 pilar pendukung di air. Posisi z=4 supaya
// nggak overlap dengan bench area yang di z=-2.
const Dock = () => {
  const PLANK_LENGTH = 3.6;
  const PLANK_WIDTH = 1.6;
  const baseX = RIVER_WIDTH / 2 + 0.2;
  return (
    <group position={[0, 0, 4]}>
      {/* Platform kayu — 1 plane datar */}
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.04, 0]}>
        <boxGeometry args={[PLANK_LENGTH, 0.08, PLANK_WIDTH]} />
        <meshStandardMaterial color="#4a3826" roughness={0.85} />
      </mesh>
      {/* Plank lines on top — dekoratif, kasih kesan plank-plank */}
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.085, -0.4]}>
        <boxGeometry args={[PLANK_LENGTH - 0.1, 0.005, 0.04]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.085, 0]}>
        <boxGeometry args={[PLANK_LENGTH - 0.1, 0.005, 0.04]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH / 2, 0.085, 0.4]}>
        <boxGeometry args={[PLANK_LENGTH - 0.1, 0.005, 0.04]} />
        <meshStandardMaterial color="#2a1d12" roughness={1} />
      </mesh>
      {/* 4 pilar pendukung di air — 1 di tiap sudut */}
      <mesh position={[baseX - 0.3, -0.3, -0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
      <mesh position={[baseX - 0.3, -0.3, 0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH + 0.3, -0.3, -0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
      <mesh position={[baseX - PLANK_LENGTH + 0.3, -0.3, 0.65]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
    </group>
  );
};

// Batu-batu kecil di tepi sungai — irregular box meshes dengan tone
// warm-gray, scatter di kedua tepi sungai sepanjang aliran. Posisi
// deterministik via index supaya konsisten antar render.
// Boundary stones di tepi danau — keliling kiri-kanan-atas-bawah
// supaya kerasa kayak shoreline beneran.
const STONE_POSITIONS = [
  // Kiri (-x), spread sepanjang z (skip area bench z=-2..-3)
  { pos: [-7.2, 0.0, -11], scale: [0.45, 0.28, 0.4], rot: 0.3 },
  { pos: [-7.0, 0.0, -6], scale: [0.5, 0.3, 0.45], rot: 0.7 },
  { pos: [-7.4, 0.0, 1], scale: [0.35, 0.22, 0.3], rot: 1.1 },
  { pos: [-7.1, 0.0, 7], scale: [0.45, 0.28, 0.4], rot: 0.4 },
  { pos: [-7.3, 0.0, 12], scale: [0.3, 0.2, 0.28], rot: 0.9 },
  // Kanan (+x), skip area dock z=4
  { pos: [7.2, 0.0, -12], scale: [0.4, 0.26, 0.38], rot: 0.5 },
  { pos: [7.0, 0.0, -6], scale: [0.5, 0.3, 0.42], rot: 1.0 },
  { pos: [7.3, 0.0, -1], scale: [0.35, 0.23, 0.32], rot: 0.6 },
  { pos: [7.1, 0.0, 9], scale: [0.42, 0.27, 0.38], rot: 1.2 },
  { pos: [7.4, 0.0, 13], scale: [0.38, 0.25, 0.35], rot: 0.3 },
  // Atas (-z) & bawah (+z) — beberapa di tepi panjang danau
  { pos: [-3, 0.0, -14.3], scale: [0.4, 0.25, 0.35], rot: 0.5 },
  { pos: [3, 0.0, -14.3], scale: [0.45, 0.28, 0.4], rot: 0.8 },
  { pos: [-3, 0.0, 14.3], scale: [0.4, 0.25, 0.35], rot: 0.3 },
  { pos: [3, 0.0, 14.3], scale: [0.42, 0.27, 0.38], rot: 0.9 },
];
const RiverStones = () => (
  <>
    {STONE_POSITIONS.map((s, i) => (
      <mesh
        key={`stone-${i}`}
        position={s.pos}
        rotation={[0, s.rot, 0]}
        scale={s.scale}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#4a4540"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
    ))}
  </>
);

// Rumput tufts scatter di taman — small cone groups (3 cone per tuft)
// dengan tone hijau lebih cerah dari banks, supaya catch light dan
// kasih texture ke lapangan. Posisi deterministik per index.
const TUFT_POSITIONS = [
  // Bank kiri — skip area path (x=-8.5..-7.7) dan bench (-9, z=-2)
  { pos: [-9.5, 0, -11], color: '#5a8045' },
  { pos: [-10.5, 0, -6], color: '#6e9358' },
  { pos: [-9.8, 0, 3], color: '#5a8045' },
  { pos: [-10.2, 0, 9], color: '#6e9358' },
  { pos: [-9.0, 0, 13], color: '#4f7438' },
  // Bank kanan — skip dock area (z=4)
  { pos: [9.5, 0, -13], color: '#6e9358' },
  { pos: [10.0, 0, -8], color: '#5a8045' },
  { pos: [9.8, 0, -2], color: '#4f7438' },
  { pos: [10.5, 0, 9], color: '#5a8045' },
  { pos: [9.0, 0, 14], color: '#6e9358' },
  // Bank atas (-z)
  { pos: [-2, 0, -16], color: '#5a8045' },
  { pos: [4, 0, -17], color: '#6e9358' },
  // Bank bawah (+z)
  { pos: [-3, 0, 16.5], color: '#4f7438' },
  { pos: [2, 0, 17], color: '#5a8045' },
];

const GrassTuft = ({ pos, color }) => (
  <group position={pos}>
    <mesh position={[0, 0.12, 0]}>
      <coneGeometry args={[0.06, 0.24, 4]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh position={[0.08, 0.1, 0.04]} rotation={[0.1, 0.5, 0.1]}>
      <coneGeometry args={[0.05, 0.2, 4]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh position={[-0.07, 0.08, 0.05]} rotation={[-0.05, -0.4, -0.15]}>
      <coneGeometry args={[0.045, 0.18, 4]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  </group>
);

const GrassTufts = () => (
  <>
    {TUFT_POSITIONS.map((t, i) => (
      <GrassTuft key={`tuft-${i}`} pos={t.pos} color={t.color} />
    ))}
  </>
);

const TelagaScene = ({
  pads,
  hoveredPadId,
  onPadHover,
  onPadOut,
  onPadClick,
}) => (
  <>
    {/* Light fog jauh — kerasa kayak haze siang hari di kejauhan,
        bukan dense night fog */}
    <fog attach="fog" args={['#bdd6ea', 25, 65]} />
    <color attach="background" args={['#bdd6ea']} />
    {/* Bright daytime ambient */}
    <ambientLight intensity={0.85} color="#ffffff" />
    {/* Sun directional dari high angle warm white */}
    <directionalLight
      position={[10, 18, 6]}
      intensity={1.4}
      color="#fff4dc"
    />
    {/* Sky bounce fill — soft cool light dari arah berlawanan */}
    <directionalLight
      position={[-6, 8, -4]}
      intensity={0.45}
      color="#cfe0f0"
    />
    <DistantHills />
    <Clouds />
    <Birds />
    <Banks />
    <WalkPath />
    <River />
    <RiverStones />
    <GrassTufts />
    <Bench />
    <Dock />
    <Bridge />
    <Cattails />
    <Wildflowers />
    <Lanterns />
    <BankTrees />
    <FallingPetals count={60} />
    {pads.map((pad) => (
      <LilyWishPad
        key={pad.id}
        pad={pad}
        hovered={hoveredPadId === pad.id}
        onPointerOver={onPadHover}
        onPointerOut={onPadOut}
        onClick={onPadClick}
      />
    ))}
    <OrbitControls
      target={[0, 0, 0]}
      enableZoom
      minDistance={12}
      maxDistance={32}
      enablePan={false}
      minPolarAngle={Math.PI / 4.5}
      maxPolarAngle={Math.PI / 2.4}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.4}
    />
  </>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#0a1320] text-white/50 text-sm">
    Memuat telaga harapan...
  </div>
);

const TelagaHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5">
    <div className="pointer-events-auto">
      <Link
        to="/taman/peta"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        ← Peta Taman
      </Link>
    </div>
    <div
      className="text-white/85 text-sm tracking-wide"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      Telaga Harapan
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/wishes"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        Tinggalkan wish →
      </Link>
    </div>
  </div>
);

const TelagaFooter = ({ hoveredPadId, totalPads }) => {
  const hint = hoveredPadId
    ? 'Klik teratai untuk baca harapan'
    : `${totalPads} teratai mengalir di sungai · drag untuk berputar`;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.2em] text-center">
      {hint}
    </div>
  );
};

const WishOverlay = ({ pad, onClose }) => {
  useEffect(() => {
    if (!pad) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [pad]);

  if (!pad) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#0d1f3a]/95 border border-white/15 rounded-2xl px-8 py-10 max-w-lg mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-pink-200/70 text-3xl leading-none mb-2">“</div>
        <p
          className="text-white text-lg md:text-xl leading-relaxed mb-7"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {pad.message}
        </p>
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="text-white/85 text-base font-medium">
              {pad.name}
            </div>
            {pad.handle && (
              <div className="text-white/45 text-xs mt-0.5">
                {pad.handle}
              </div>
            )}
          </div>
          {pad.date && (
            <div className="text-white/40 text-[10px] uppercase tracking-[0.2em]">
              {formatDate(pad.date)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full px-5 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
        >
          Kembali ke sungai
        </button>
      </div>
    </div>
  );
};

// Palet teratai bloom — variasi pink/peach/cream/lavender supaya
// telaga kerasa kayak ladang teratai mekar, bukan stamping.
const BLOOM_COLORS = [
  '#f4a8c0', // pink
  '#f4c890', // peach
  '#f5e0c0', // warm cream
  '#d4a8e0', // lavender
  '#f48ba0', // dusty rose
  '#f4d870', // sunny yellow
];
// Daun teratai — variasi hijau cerah (siang) untuk match daytime mood
const LEAF_COLORS = ['#5a8045', '#6e9358', '#4f7438', '#65884d'];

// Ambil daftar wishes — merge seeds + Firebase (kalau ada). Sort
// newest-first by date, take top N supaya pad nggak crowded. Satu
// fungsi murni: input deps → output array of wish-shaped objects.
const buildWishList = (firebaseWishes, seeds, limit = 11) => {
  const merged = [...firebaseWishes, ...seeds];
  // Dedupe by name+message combo (seeds bisa duplicate dengan
  // submission live yang udah masuk Firebase)
  const seen = new Set();
  const unique = merged.filter((w) => {
    const key = `${(w.name || '').toLowerCase()}|${(w.message || '').slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });
  return unique.slice(0, limit);
};

// Convert wish list → pad layout di danau lebar. 1 center pad di
// (0,0,0) jadi teratai besar. Sisanya scatter di sekelilingnya
// pakai golden-angle spiral untuk distribusi natural (nggak ring/
// grid). Posisi deterministik per index.
//
// Margin dari shoreline: x dijaga di range ±(RIVER_WIDTH/2 - 1.6),
// z di range ±(RIVER_LENGTH/2 - 2). Jaga jarak juga dari dock (z=4,
// x>5) supaya pad nggak overlap dengan dermaga.
const buildPads = (wishes) => {
  if (!wishes.length) return [];
  const items = [];
  const xMax = RIVER_WIDTH / 2 - 1.6;
  const zMax = RIVER_LENGTH / 2 - 2;

  // Center wish — teratai besar di z=0
  const center = wishes[0];
  items.push({
    id: `pad-${center.id || 'seed-0'}-c`,
    name: center.name || 'Anonymous',
    handle: center.handle || '',
    message: center.message || '',
    date: center.date || '',
    isCenter: true,
    pos: [0, 0, 0],
    leafColor: LEAF_COLORS[0],
    bloomColor: BLOOM_COLORS[0],
    tilt: 0,
    phase: 0,
  });

  // Surrounding wishes — golden-angle spiral. Tiap step naik radius
  // dan rotasi 137.5° untuk distribusi yang nggak grid-like.
  const others = wishes.slice(1);
  if (others.length === 0) return items;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
  others.forEach((w, i) => {
    // r naik bertahap, di-clamp supaya nggak nempel ke shore
    const r = 2.5 + Math.sqrt(i) * 1.6;
    const angle = i * goldenAngle + 0.5;
    let x = Math.cos(angle) * r;
    let z = Math.sin(angle) * r;
    // Avoid dock area (kanan z=4, x sekitar 5..7)
    const dockBlock = x > 4.5 && z > 2.5 && z < 5.5;
    if (dockBlock) {
      x = -Math.abs(x); // mirror ke kiri
    }
    // Clamp ke water bounds
    x = Math.max(-xMax, Math.min(xMax, x));
    z = Math.max(-zMax, Math.min(zMax, z));
    const tilt = ((i * 73) % 360) * (Math.PI / 180);
    items.push({
      id: `pad-${w.id || `seed-${i}`}-${i}`,
      name: w.name || 'Anonymous',
      handle: w.handle || '',
      message: w.message || '',
      date: w.date || '',
      isCenter: false,
      pos: [x, 0, z],
      leafColor: LEAF_COLORS[(i + 1) % LEAF_COLORS.length],
      bloomColor: BLOOM_COLORS[(i + 1) % BLOOM_COLORS.length],
      tilt,
      phase: i * 0.7,
    });
  });
  return items;
};

const TamanKolamKataPage = () => {
  const isMobile = useIsMobile();
  const [hoveredPadId, setHoveredPadId] = useState(null);
  const [selectedPad, setSelectedPad] = useState(null);
  const [firebaseWishes, setFirebaseWishes] = useState([]);

  const seeds = SITE_CONFIG.wishes?.seeds || [];

  // Subscribe ke Firebase realtime feed. Kalau Firebase belum
  // ke-config, callback dipanggil dengan [] dan kita pakai seeds aja.
  useEffect(() => {
    const unsub = subscribeToWishes((live) => {
      setFirebaseWishes(live);
    });
    return unsub;
  }, []);

  const pads = useMemo(() => {
    const wishes = buildWishList(firebaseWishes, seeds, 11);
    return buildPads(wishes);
  }, [firebaseWishes, seeds]);

  useEffect(() => {
    document.body.style.cursor = hoveredPadId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredPadId]);

  const handlePadHover = (id) => setHoveredPadId(id);
  const handlePadOut = (id) =>
    setHoveredPadId((c) => (c === id ? null : c));
  const handlePadClick = (pad) => {
    setSelectedPad(pad);
    setHoveredPadId(null);
  };
  const handleClose = () => setSelectedPad(null);

  return (
    <>
      <Seo
        title="Telaga Harapan"
        description="Telaga teratai dengan harapan-harapan dari fans untuk Eli — wish wall dalam bentuk taman 3D."
        path="/taman/r3"
      />
      <div className="relative w-full h-screen bg-[#0a1320] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: [13, 9, 12] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 0, 0);
            }}
          >
            <TelagaScene
              pads={pads}
              hoveredPadId={hoveredPadId}
              onPadHover={handlePadHover}
              onPadOut={handlePadOut}
              onPadClick={handlePadClick}
            />
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <TelagaHeader />
        <TelagaFooter hoveredPadId={hoveredPadId} totalPads={pads.length} />
        <WishOverlay pad={selectedPad} onClose={handleClose} />
        <AmbientAudio profile="taman" position="top-right" />
      </div>
    </>
  );
};

export default TamanKolamKataPage;
