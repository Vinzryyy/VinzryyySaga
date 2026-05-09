/**
 * Taman Kebaikan — Petak R3: Telaga Harapan.
 *
 * Wish panel 3D — taman di pinggir sungai kecil di malam hari. Tiap
 * teratai mekar di sungai = 1 wish dari fans (sumber: SITE_CONFIG.
 * wishes.seeds + live Firebase via subscribeToWishes). Setting taman
 * intim, bukan telaga lebar — lily pads disusun linear di sepanjang
 * aliran sungai dengan scatter horizontal kecil.
 *
 * Visual:
 *   - Sungai sempit memanjang (6 wide × 28 long) sepanjang z-axis,
 *     deep night blue dengan reflection
 *   - Banks rumput di kedua sisi sungai (warm-dark green)
 *   - Batu-batu kecil scatter di tepi sungai (river stones)
 *   - Rumput tufts scatter di taman (cone meshes pendek)
 *   - 1-11 lily pad dengan bunga teratai mekar (cone petals + stamen).
 *     Color teratai variasi pink/peach/cream untuk kerasa kayak ladang
 *   - Pads gentle drift downstream (subtle z motion) + bobs naik turun
 *   - Kunang-kunang warm-yellow drift di taman
 *   - Moonlight cool spotlight dari atas + warm fill dari fireflies
 *
 * Wish pertama (paling baru / featured) ditempatkan di center sungai
 * sebagai teratai besar; sisanya distribusi linear sepanjang sungai
 * dengan x-offset variasi.
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
// glow di leaf disc + label brighter. Plus subtle "drift downstream"
// — pad pelan-pelan bergerak ke +z, kalau lewat batas END_Z reset ke
// START_Z. Mensimulasikan air sungai yang mengalir.
const FLOW_SPEED = 0.05; // unit per detik
const FLOW_END_Z = 14;
const FLOW_START_Z = -14;

const LilyWishPad = ({ pad, hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const matRef = useRef();
  // Track drift z separately dari posisi awal pad — pad punya base
  // origin di pad.pos, drift di-akumulasi di useFrame.
  const driftZRef = useRef(0);

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

// Kunang-kunang — partikel kecil dengan emissive warm-yellow yang
// drift pelan di sekitar telaga. Posisi awal random, motion gentle
// up-down + horizontal sway (sin wave per partikel). Reset jarang
// karena range Y mereka cukup luas.
const Fireflies = ({ count = 30 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 6;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = 0.3 + Math.random() * 2.5;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }, [count]);

  // Phase offset per partikel — sin wave punya phase berbeda biar
  // gerakan-nya nggak kelihatan kayak grid.
  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = Math.random() * Math.PI * 2;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      // gentle sway: 1cm horizontal + 4cm vertical
      arr[i * 3] += Math.sin(t * 0.4 + phase) * 0.005;
      arr[i * 3 + 1] += Math.cos(t * 0.5 + phase * 1.3) * 0.012;
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
        size={0.09}
        color="#f4e8a0"
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Sungai kecil yang mengalir sepanjang z-axis — sempit (6 wide) tapi
// panjang (32). Deep night blue dengan metalness sedikit + roughness
// moderate untuk subtle reflection. Static (no shader wave) untuk
// performa — bisa di-upgrade nanti kalau perlu.
const RIVER_WIDTH = 5.5;
const RIVER_LENGTH = 32;
const River = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
    <planeGeometry args={[RIVER_WIDTH, RIVER_LENGTH]} />
    <meshStandardMaterial
      color="#0d1f3a"
      roughness={0.5}
      metalness={0.4}
    />
  </mesh>
);

// Banks (tepi sungai) + lapangan taman — 2 plane besar di kiri dan
// kanan sungai dengan grass-color malam. Warna sengaja warm-dark green
// (bukan pure black) supaya pinggir sungai kelihatan, bukan absorbed
// ke background.
const Banks = () => (
  <>
    {/* Lapangan utama — frame visual agar sungai nggak floating */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#1f2a1a" roughness={1} />
    </mesh>
    {/* Bank kiri — slightly lifted ke atas air supaya kerasa kayak
        tepi sungai yang sedikit ke atas, bukan flat */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[-(RIVER_WIDTH / 2 + 4), -0.045, 0]}
    >
      <planeGeometry args={[8, RIVER_LENGTH]} />
      <meshStandardMaterial color="#2a3525" roughness={1} />
    </mesh>
    {/* Bank kanan */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[RIVER_WIDTH / 2 + 4, -0.045, 0]}
    >
      <planeGeometry args={[8, RIVER_LENGTH]} />
      <meshStandardMaterial color="#2a3525" roughness={1} />
    </mesh>
  </>
);

// Batu-batu kecil di tepi sungai — irregular box meshes dengan tone
// warm-gray, scatter di kedua tepi sungai sepanjang aliran. Posisi
// deterministik via index supaya konsisten antar render.
const STONE_POSITIONS = [
  // Kiri sungai
  { pos: [-3.0, 0.0, -10], scale: [0.4, 0.25, 0.35], rot: 0.3 },
  { pos: [-3.2, 0.0, -4], scale: [0.5, 0.3, 0.45], rot: 0.7 },
  { pos: [-2.95, 0.0, 2], scale: [0.35, 0.22, 0.3], rot: 1.1 },
  { pos: [-3.1, 0.0, 8], scale: [0.45, 0.28, 0.4], rot: 0.4 },
  { pos: [-2.9, 0.0, 13], scale: [0.3, 0.2, 0.28], rot: 0.9 },
  // Kanan sungai
  { pos: [3.0, 0.0, -12], scale: [0.4, 0.26, 0.38], rot: 0.5 },
  { pos: [3.15, 0.0, -6], scale: [0.5, 0.3, 0.42], rot: 1.0 },
  { pos: [2.95, 0.0, 0], scale: [0.35, 0.23, 0.32], rot: 0.6 },
  { pos: [3.1, 0.0, 5], scale: [0.42, 0.27, 0.38], rot: 1.2 },
  { pos: [3.0, 0.0, 11], scale: [0.38, 0.25, 0.35], rot: 0.3 },
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
  // Kiri (x negative)
  { pos: [-5.5, 0, -11], color: '#3a4d2a' },
  { pos: [-7.0, 0, -7], color: '#445537' },
  { pos: [-6.2, 0, -2], color: '#3a4d2a' },
  { pos: [-7.5, 0, 4], color: '#445537' },
  { pos: [-5.8, 0, 9], color: '#384a28' },
  { pos: [-6.8, 0, 13], color: '#3a4d2a' },
  // Kanan (x positive)
  { pos: [5.6, 0, -13], color: '#445537' },
  { pos: [7.0, 0, -8], color: '#3a4d2a' },
  { pos: [6.2, 0, -3], color: '#384a28' },
  { pos: [7.5, 0, 3], color: '#3a4d2a' },
  { pos: [5.5, 0, 8], color: '#445537' },
  { pos: [6.9, 0, 14], color: '#3a4d2a' },
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
    <fog attach="fog" args={['#0a1320', 14, 38]} />
    <color attach="background" args={['#0a1320']} />
    <ambientLight intensity={0.32} color="#a8c5e0" />
    {/* Moonlight — cool spotlight dari atas + sedikit miring,
        sumber utama "cahaya" telaga. */}
    <spotLight
      position={[2, 16, 2]}
      target-position={[0, 0, 0]}
      intensity={1.2}
      angle={0.7}
      penumbra={0.7}
      color="#cfe0f0"
      distance={30}
    />
    {/* Warm fill dari low angle — tribute untuk fireflies */}
    <directionalLight
      position={[-4, 2, -3]}
      intensity={0.25}
      color="#f4d8a0"
    />
    <Banks />
    <River />
    <RiverStones />
    <GrassTufts />
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
    <Fireflies count={30} />
    <OrbitControls
      target={[0, 0, 0]}
      enableZoom
      minDistance={10}
      maxDistance={26}
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
  '#f4c8d8', // soft pink
  '#f4d8c0', // peach cream
  '#f0e0d4', // warm cream
  '#e8c8e0', // lavender pink
  '#f4b8c4', // dusty rose
  '#e8d8c0', // sand cream
];
// Daun teratai — variasi hijau gelap (malam) dengan slight tonal shift
const LEAF_COLORS = ['#3a4d2a', '#2d3f1f', '#445537', '#384a28'];

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

// Convert wish list → pad layout. Posisi linear sepanjang sungai
// dengan x-offset variasi alternating. 1 center pad di z=0 (teratai
// besar). Sisanya distribusi merata di range FLOW_START_Z..FLOW_END_Z
// dengan x dalam range RIVER_WIDTH/3 supaya lily nggak nempel ke tepi.
//
// Posisi z di-spread merata sehingga drift downstream nggak bikin pad
// menumpuk di satu titik (gap stabil antar pad seiring waktu).
const buildPads = (wishes) => {
  if (!wishes.length) return [];
  const items = [];
  const xRange = RIVER_WIDTH / 3.5; // ±xRange jadi range x lily

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

  // Surrounding wishes — distribusi linear sepanjang sungai. Z range
  // FLOW_START_Z..FLOW_END_Z dibagi rata dikurangin slot center.
  const others = wishes.slice(1);
  if (others.length === 0) return items;
  const totalRange = FLOW_END_Z - FLOW_START_Z;
  const slotSize = totalRange / (others.length + 1);
  others.forEach((w, i) => {
    // Posisi z dari FLOW_START_Z + slotSize*(i+1), tapi skip slot
    // yang dekat z=0 (jangan tabrakan dengan center pad).
    let z = FLOW_START_Z + slotSize * (i + 0.5);
    if (Math.abs(z) < 1.5) z += z >= 0 ? 1.5 : -1.5; // dorong jauhin center
    // X-offset alternating dengan variasi kecil — natural scatter
    const xSide = i % 2 === 0 ? -1 : 1;
    const xVar = ((i * 17) % 100) / 100; // 0..1 deterministik
    const x = xSide * xRange * (0.4 + xVar * 0.6);
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
            camera={{ fov: 42, position: [11, 8, 5] }}
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
