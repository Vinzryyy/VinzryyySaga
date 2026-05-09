/**
 * Taman Kebaikan — Petak R3: Telaga Harapan (sebelumnya Kolam Kata).
 *
 * Wish panel 3D — telaga malam dengan bunga teratai mengambang. Tiap
 * teratai = 1 wish dari fans (sumber: siteConfig.wishes.seeds + live
 * Firebase via subscribeToWishes). Visual:
 *   - Permukaan air deep night blue dengan reflection
 *   - 1-11 lily pad dengan bunga teratai mekar di atasnya (cone
 *     petals + center stamen). Color teratai variasi pink/peach/
 *     cream untuk kerasa kayak ladang teratai bukan stamping
 *   - Kunang-kunang melayang di sekitar telaga (warm yellow particles)
 *   - Moonlight cool spotlight dari atas + warm fill dari fireflies
 *   - Pad bobbing pelan dengan phase berbeda per lily
 *
 * Wish pertama (paling baru / featured) ditempatkan di center sebagai
 * teratai besar; sisanya scatter di sekelilingnya pada radius variasi.
 * Fallback: kalau cuma seed Armeniaca yang ada, dia jadi center, sisa
 * pad disembunyiin biar nggak kerasa kosong.
 *
 * Click pad → modal full wish (nama Fraunces italic + handle +
 * message + tanggal). Layout modal sengaja lebih intim dari Quote
 * overlay — text lebih besar, ada quote-mark dekoratif, padding lega.
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
// glow di leaf disc + label brighter.
const LilyWishPad = ({ pad, hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const matRef = useRef();

  useFrame((state, delta) => {
    if (!groupRef.current || !matRef.current) return;
    const idleY = Math.sin(state.clock.elapsedTime * 0.55 + pad.phase) * 0.05;
    const targetY = (hovered ? 0.2 : 0) + idleY;
    const targetEmissive = hovered ? 0.4 : 0.06;
    const factor = Math.min(delta * 7, 1);
    groupRef.current.position.y = lerp(
      groupRef.current.position.y,
      targetY,
      factor
    );
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

// Permukaan air telaga — deep night blue dengan metalness sedikit +
// roughness moderate untuk subtle reflection. Static (no shader wave)
// untuk performa — bisa di-upgrade nanti kalau perlu.
const Water = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
    <planeGeometry args={[28, 28]} />
    <meshStandardMaterial
      color="#0d1f3a"
      roughness={0.5}
      metalness={0.4}
    />
  </mesh>
);

// Tepi lapangan — frame visual agar telaga nggak floating in void
const Edge = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
    <planeGeometry args={[60, 60]} />
    <meshStandardMaterial color="#0a1320" roughness={1} />
  </mesh>
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
    <Edge />
    <Water />
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
      maxDistance={22}
      enablePan={false}
      minPolarAngle={Math.PI / 4.5}
      maxPolarAngle={Math.PI / 2.5}
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
    ? 'Klik teratai untuk baca lengkap'
    : `${totalPads} harapan mengambang · drag untuk berputar`;
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
          Kembali ke telaga
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

// Convert wish list → pad layout. 1 center + sisanya scatter heksagonal
// di radius variasi. Posisi/warna deterministik berdasar index.
const buildPads = (wishes) => {
  if (!wishes.length) return [];
  const items = [];
  // Center wish — teratai besar
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
  // Surrounding wishes — scatter heksagonal
  const others = wishes.slice(1);
  others.forEach((w, i) => {
    const angle = (i / Math.max(others.length, 6)) * Math.PI * 2 + 0.4;
    const radius = 4 + (i % 3) * 0.7;
    const tilt = ((i * 73) % 360) * (Math.PI / 180);
    items.push({
      id: `pad-${w.id || `seed-${i}`}-${i}`,
      name: w.name || 'Anonymous',
      handle: w.handle || '',
      message: w.message || '',
      date: w.date || '',
      isCenter: false,
      pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
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
            camera={{ fov: 40, position: [8, 9, 8] }}
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
