/**
 * Taman Kebaikan — Fase 2, Peta Taman.
 *
 * Hub navigasi setelah pengunjung lewat Padang Tandus (Taman.jsx, R0).
 * Layout: 6 petak kebun low-poly disusun heksagonal mengelilingi pohon
 * aprikot di tengah. Kamera isometrik (perspektif sudut tinggi) supaya
 * kerasa "memandang peta taman dari atas" — referensi visual: Monument
 * Valley, Florence.
 *
 * Sebelumnya bernama Denah Museum (6 ruangan). Di-rebrand ke Taman
 * supaya konsisten sama identitas Armeniaca (= Prunus armeniaca, pohon
 * aprikot) dan tone seitansai (= perayaan ulang tahun yang tumbuh).
 * Konsep visual: shape petak rounded cylinder hexagonal (gundukan
 * rumput, bukan box museum) + palette twilight evening + grass green.
 *
 * Fitur (carry-over dari Denah Museum):
 * - Kamera fly-in 2.5 detik dari posisi rendah ke isometrik saat
 *   halaman mount (kerasa "bangkit" dari Padang Tandus)
 * - OrbitControls limited (rotate horizontal terbatas, vertikal
 *   45°-72°, zoom 10-20, no pan) aktif setelah fly-in selesai
 * - Hover lift + emissive glow + label highlights
 * - Click → overlay info petak dengan blur backdrop
 * - Progress markers via localStorage: petak yang udah dibuka
 *   overlay-nya dapet checkmark ✓ + counter footer. Key 'taman-petak-
 *   previewed' (post-rebrand); key legacy 'museum-rooms-previewed'
 *   di-merge sekali waktu init supaya progress user nggak hilang.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';

// Hook deteksi mobile via matchMedia (sama pola dengan Museum.jsx —
// dijaga konsisten supaya keputusan downscale seragam antar halaman
// museum). Threshold 768px = batas Tailwind md breakpoint.
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

// localStorage key untuk track petak yang udah dibuka overlay-nya.
// Set of petak IDs (string[]) di-serialize ke JSON. Key legacy
// dari era 'Museum Kebaikan' di-merge sekali saat init supaya
// progress user yang udah jelajahin sebelum rebrand nggak hilang.
const PREVIEWED_KEY = 'taman-petak-previewed';
const LEGACY_PREVIEWED_KEY = 'museum-rooms-previewed';

const readPreviewed = () => {
  try {
    const raw = localStorage.getItem(PREVIEWED_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_PREVIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : [];
    return new Set([
      ...(Array.isArray(parsed) ? parsed : []),
      ...(Array.isArray(legacyParsed) ? legacyParsed : []),
    ]);
  } catch {
    return new Set();
  }
};

const writePreviewed = (set) => {
  try {
    localStorage.setItem(PREVIEWED_KEY, JSON.stringify([...set]));
  } catch {
    /* storage blocked — no-op */
  }
};

// Kamera akhir setelah fly-in. Posisi sama dengan camera default di
// Canvas, di-track terpisah biar OrbitControls tau target rotation
// pivot-nya di mana.
const CAMERA_FINAL = { x: 9, y: 11, z: 9 };
const CAMERA_START = { x: 0, y: 1, z: 0 };
const FLY_IN_DURATION = 2.5;
const ORBIT_TARGET = [0, 1, 0];

const HEX_RADIUS = 5;
// 6 petak taman, posisi heksagonal di sekeliling pohon aprikot.
// Setiap petak punya tema garden yang sesuai isinya. ID 'r1'-'r6'
// dipertahankan supaya progress lama di localStorage (key legacy
// 'museum-rooms-previewed') tetap kepake — ID konsisten, nama yang
// berubah. Field `route`: kalau ada, modal nampilin CTA langsung
// masuk; kalau null, fallback ke "akan dirilis di Fase 3".
// Narrative arc: 6 bab tour mengelilingi pohon, mulai dari r1 (langit
// perjalanan) → r2 (tangan membentuk) → r3 (air harapan) → r4 (aksi
// tumbuh) → r5 (warna tinggal) → r6 (pusat kembali). Tiap petak punya
// `chapter` 1-6, `nextId` pointer ke bab berikut (r6 loop ke r1).
const PETAK = [
  {
    id: 'r1',
    chapter: 1,
    name: 'Konstelasi Perjalanan',
    eyebrow: 'Bab 1 · Langit Perjalanan',
    desc: 'Tujuh konstelasi tertulis di langit',
    longDesc:
      'Setiap perjalanan dimulai dari satu titik. Berdiri di petak ini, langit malam menampakkan tujuh konstelasi — tiap bintang adalah milestone Eli sejak panggung pertama. Inilah bab pertama: tempat di mana cerita ditulis sebelum tangan-tangan datang membantu.',
    angle: 270,
    color: '#a8c0ff',
    route: '/taman/r1',
    nextId: 'r2',
  },
  {
    id: 'r2',
    chapter: 2,
    name: 'Petak Karya',
    eyebrow: 'Bab 2 · Tangan Membentuk',
    desc: 'Setelah langit, tangan mulai bergerak',
    longDesc:
      'Setelah cerita dituliskan, tangan-tangan datang membentuk. Video pertama, web pertama, poster pertama, lagu pertama yang di-cover — bukti bahwa di tempat ini, kebaikan tidak hanya disaksikan, tapi dikerjakan. Petak ini menyimpan apa yang telah dibuat penggemar atas namanya.',
    angle: 330,
    color: '#94b878',
    nextId: 'r3',
  },
  {
    id: 'r3',
    chapter: 3,
    name: 'Telaga Harapan',
    eyebrow: 'Bab 3 · Air Membawa Harapan',
    desc: 'Sebelum aksi, harapan dulu mengalir',
    longDesc:
      'Tangan butuh air. Telaga ini diisi tiap kali seseorang menuliskan harapan di /wishes — tiap bunga teratai yang mekar adalah satu doa. Sebelum kebaikan jadi tanaman, harapan dulu mengalir di sini, menyirami benih yang belum terlihat.',
    angle: 30,
    color: '#86a868',
    route: '/taman/r3',
    nextId: 'r4',
  },
  {
    id: 'r4',
    chapter: 4,
    name: 'Kebun Kebaikan',
    eyebrow: 'Bab 4 · Harapan Jadi Tunas',
    desc: 'Aksi yang tumbuh dari harapan',
    longDesc:
      'Di mana harapan disirami, kebaikan ikut tumbuh. Tiap donasi, tiap kunjungan, tiap aksi nyata — satu tunas baru di kebun ini. Galeri Kebaikan adalah katalog tunas-tunas itu. Bab ini bukti bahwa kemarau di luar gerbang tidak selalu menang.',
    angle: 90,
    color: '#a8b870',
    nextId: 'r5',
  },
  {
    id: 'r5',
    chapter: 5,
    name: 'Padang Lukis',
    eyebrow: 'Bab 5 · Warna yang Tinggal',
    desc: 'Bukan semua kebaikan jadi angka',
    longDesc:
      'Bukan semua kebaikan terlihat sebagai donasi. Beberapa muncul sebagai gambar, lukisan, ilustrasi, warna — bahasa lain dari cinta. Ladang ini menyimpan fanart, sketch, karya yang lahir dari rasa. Warna yang menolak ikut padang menguning.',
    angle: 150,
    color: '#94b878',
    nextId: 'r6',
  },
  {
    id: 'r6',
    chapter: 6,
    name: 'Padang Aprikot',
    eyebrow: 'Bab 6 · Pusat Kembali',
    desc: 'Akhir yang sekaligus permulaan',
    longDesc:
      'Setelah lima bab perjalanan, semua kembali ke sini: pohon aprikot di tengah, langit malam bertabur kontributor di atas. Inilah pusat — bukan akhir, melainkan tempat siklus mulai lagi. Di sinilah benih baru bisa ditanam, dan cerita berikutnya menunggu ditulis.',
    angle: 210,
    color: '#e8a87c',
    nextId: 'r1', // loop balik ke bab 1
  },
];

const polarToXZ = (angleDeg, radius) => {
  const rad = (angleDeg * Math.PI) / 180;
  return [Math.cos(rad) * radius, Math.sin(rad) * radius];
};

const lerp = (a, b, t) => a + (b - a) * t;

// Fly-in kamera dari posisi rendah (deket lantai) ke posisi isometrik.
// Kerasa kayak "naik" dari R0 ke denah. Saat fly-in jalan, OrbitControls
// di-disable supaya user nggak bisa interrupt animasi. Setelah selesai,
// onComplete dipanggil sekali, dan parent enable OrbitControls.
const FlyInCamera = ({ onComplete, duration = FLY_IN_DURATION }) => {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    camera.position.set(CAMERA_START.x, CAMERA_START.y, CAMERA_START.z);
    camera.lookAt(0, 1, 0);
  }, [camera]);

  useFrame((_, delta) => {
    if (completedRef.current) return;
    elapsedRef.current = Math.min(elapsedRef.current + delta, duration);
    const t = elapsedRef.current / duration;
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.x = lerp(CAMERA_START.x, CAMERA_FINAL.x, eased);
    camera.position.y = lerp(CAMERA_START.y, CAMERA_FINAL.y, eased);
    camera.position.z = lerp(CAMERA_START.z, CAMERA_FINAL.z, eased);
    camera.lookAt(0, 1, 0);
    if (t >= 1) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  return null;
};

// Kelopak bunga jatuh pelan dari atas — dekoratif, kerasa kayak
// taman senja yang hidup. Pakai BufferGeometry untuk render banyak
// kelopak dalam 1 draw call. Posisi reset ke atas saat jatuh ke
// bawah (sirkulasi tak-terhingga). Color tone soft pink/white/peach
// supaya match palette twilight evening.
const FallingPetals = ({ count = 80 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 18; // distribusi tinggi awal
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, [count]);

  // Velocity per partikel (deterministik via Math.random saat init)
  // — bukan uniform fall supaya kelihatan natural.
  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 2); // [vy, drift_x]
    for (let i = 0; i < count; i++) {
      arr[i * 2] = -0.15 - Math.random() * 0.1; // jatuh: -0.15 to -0.25
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.05; // sway samping tipis
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 2 + 1] * delta * 60;
      arr[i * 3 + 1] += velocities[i * 2] * delta;
      // Reset ke atas + posisi X/Z baru saat jatuh ke bawah ground
      if (arr[i * 3 + 1] < -0.5) {
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 1] = 15 + Math.random() * 5;
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
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Bunga-bunga kecil tersebar di sekitar tiap petak — visual hint
// "kebun yang hidup" di sela-sela petak utama. Posisi & warna
// deterministik per petak ID supaya konsisten antar render. Disclaim:
// bukan child dari group PetakPlot supaya nggak ikut ke-lift saat
// petak hovered (kelopak tetap nempel di tanah, petak yang naik).
const FLOWER_COLORS = [
  '#f4a8c0', // pink
  '#f4c870', // yellow
  '#f0f0e8', // white
  '#a890c8', // lavender
  '#d68aa8', // pink-rose
  '#fae0a0', // soft yellow
];

const PetakFlowers = ({ petak, count = 7 }) => {
  const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
  const seedNum = parseInt(petak.id.replace('r', ''), 10) || 1;
  const flowers = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random pakai mix prime kecil — output
      // tetep sama tiap render tanpa bawa lib hash.
      const noise1 = ((seedNum * 17 + i * 23) % 360) * (Math.PI / 180);
      const noise2 = ((seedNum * 31 + i * 13) % 100) / 100;
      const radius = 1.7 + noise2 * 0.5; // 1.7–2.2 dari pusat petak
      const fx = px + Math.cos(noise1) * radius;
      const fz = pz + Math.sin(noise1) * radius;
      const colorIdx = (seedNum + i * 3) % FLOWER_COLORS.length;
      const size = 0.07 + ((seedNum + i) % 4) * 0.012; // 0.07–0.106
      arr.push({
        pos: [fx, size, fz],
        color: FLOWER_COLORS[colorIdx],
        size,
      });
    }
    return arr;
  }, [petak.id, px, pz, seedNum, count]);

  return (
    <>
      {flowers.map((f, i) => (
        <mesh key={`${petak.id}-flower-${i}`} position={f.pos}>
          <sphereGeometry args={[f.size, 8, 6]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.12}
            roughness={0.5}
          />
        </mesh>
      ))}
    </>
  );
};

// Petak kebun dengan hover lift + emissive glow + click handler.
// Shape: cylinder hexagonal pendek dengan top radius sedikit lebih
// kecil dari bottom — kerasa kayak gundukan rumput dengan pinggiran
// tanah, bukan box museum. Hover/click di-deteksi via R3F pointer
// events. Animasi hover di-lerp di useFrame (factor delta×8) untuk
// spring-feel ringan.
//
// previewed: petak udah pernah di-click & overlay-nya dibuka. Visual
// markernya: ✓ kecil di sebelah nama petak + label warna sedikit
// lebih cerah default (nggak perlu hover).
const PetakPlot = ({
  petak,
  hovered,
  previewed,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const matRef = useRef();
  const [x, z] = polarToXZ(petak.angle, HEX_RADIUS);

  useFrame((_, delta) => {
    if (!groupRef.current || !matRef.current) return;
    const targetY = hovered ? 0.55 : 0.25;
    const targetEmissive = hovered ? 0.45 : 0;
    const factor = Math.min(delta * 8, 1);
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

  return (
    <group
      ref={groupRef}
      position={[x, 0.25, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(petak.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(petak.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(petak);
      }}
    >
      <mesh>
        <cylinderGeometry args={[1.3, 1.45, 0.5, 6]} />
        <meshStandardMaterial
          ref={matRef}
          color={petak.color}
          emissive={petak.color}
          emissiveIntensity={0}
          roughness={0.85}
          metalness={0.0}
        />
      </mesh>
      <Html
        position={[0, 0.6, 0]}
        center
        distanceFactor={10}
        occlude={false}
      >
        <div
          className={`text-center pointer-events-none select-none whitespace-nowrap transition-all duration-300 ease-out ${
            hovered ? '-translate-y-1' : ''
          }`}
        >
          <div
            className={`text-[11px] font-medium tracking-wide transition-colors flex items-center justify-center gap-1 ${
              hovered
                ? 'text-white'
                : previewed
                  ? 'text-white/95'
                  : 'text-white/85'
            }`}
          >
            {previewed && (
              <span className="text-[9px] text-emerald-300/85">✓</span>
            )}
            {petak.name}
          </div>
          <div
            className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
              hovered ? 'text-white/85' : 'text-white/55'
            }`}
          >
            {petak.chapter && (
              <span className="text-amber-200/85 mr-1">Bab {petak.chapter}</span>
            )}
            · {petak.desc}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Pohon aprikot: trunk lebih ramping & tinggi, foliage 4 sphere
// dengan variasi warna hijau (sedikit shift hue per cluster supaya
// nggak flat), dan 6 fruit sphere oranye-aprikot sebagai tribut ke
// identitas Armeniaca (= aprikot dalam Latin). Fruit punya emissive
// tipis supaya kerasa "fresh", dan ke-pickup oleh Bloom di R0 nanti
// kalau tree dipake di Taman Akhir.
//
// Posisi fruit deterministik (di-memo) — bukan acak per render.
const FOLIAGE_CLUSTERS = [
  { pos: [0, 1.85, 0], radius: 0.85, color: '#7a9d5e' },
  { pos: [0.35, 2.15, 0.15], radius: 0.55, color: '#8eb070' },
  { pos: [-0.3, 2.05, -0.1], radius: 0.6, color: '#86a868' },
  { pos: [0.05, 2.4, -0.2], radius: 0.45, color: '#94b878' },
];
const FRUIT_POSITIONS = [
  { pos: [0.55, 1.95, 0.3], color: '#e89870' },
  { pos: [-0.45, 1.7, 0.25], color: '#e8a87c' },
  { pos: [0.1, 2.35, 0.5], color: '#ed9b6a' },
  { pos: [-0.55, 2.1, -0.3], color: '#e89870' },
  { pos: [0.4, 2.45, -0.4], color: '#e8a87c' },
  { pos: [0.0, 1.6, -0.55], color: '#ed9b6a' },
];

// CenterTree — pohon aprikot di pusat peta. Sekarang clickable: hover
// kasih emissive boost di semua foliage cluster, click → navigate ke
// /26 (Pohon Kebaikan existing). Pohon ini secara naratif **adalah**
// Pohon Kebaikan, jadi link langsung ke modul itu via center node.
const CenterTree = ({ hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const foliageMatRefs = useRef([]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.05;

    // Emissive boost saat hover — foliage glow hijau lembut
    const targetEm = hovered ? 0.35 : 0;
    const factor = Math.min(delta * 6, 1);
    foliageMatRefs.current.forEach((mat) => {
      if (!mat) return;
      mat.emissiveIntensity = lerp(
        mat.emissiveIntensity,
        targetEm,
        factor
      );
    });
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      scale={1.55}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver?.();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut?.();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* Stone pedestal di bawah trunk — kasih grandeur, kerasa
          tree didedikasikan / monumental. */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.08, 12]} />
        <meshStandardMaterial color="#5a5e6a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.06, 12]} />
        <meshStandardMaterial color="#7a7e8a" roughness={0.9} />
      </mesh>
      {/* Trunk — ramping, tinggi 1.4, taper sedikit */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1.4, 10]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Foliage clusters — material ref-tracked utk hover emissive +
          breathing scale animation (per-cluster phase offset supaya
          gak in-sync). */}
      {FOLIAGE_CLUSTERS.map((c, i) => (
        <BreathingFoliage
          key={`foliage-${i}`}
          position={c.pos}
          radius={c.radius}
          color={c.color}
          phase={i * 1.3}
          matRefCallback={(el) => {
            foliageMatRefs.current[i] = el;
          }}
        />
      ))}
      {/* Fruit aprikot — emissive subtle untuk kerasa hidup */}
      {FRUIT_POSITIONS.map((f, i) => (
        <mesh key={`fruit-${i}`} position={f.pos}>
          <sphereGeometry args={[0.11, 12, 10]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.15}
            roughness={0.55}
            metalness={0.05}
          />
        </mesh>
      ))}
      {/* Floating label saat hover — "Pohon Kebaikan" + hint klik */}
      {hovered && (
        <Html position={[0, 2.9, 0]} center distanceFactor={10}>
          <div className="text-center pointer-events-none select-none whitespace-nowrap">
            <div className="text-white text-[12px] font-medium tracking-wide">
              Pohon Kebaikan
            </div>
            <div className="text-emerald-300/80 text-[9px] mt-0.5 uppercase tracking-[0.15em]">
              Klik untuk siram →
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Lantai taman — plane besar tone twilight evening (bukan dark museum
// hall) dengan grid tipis untuk persepsi skala. Tone biru-warm yang
// muncul saat senja: matahari masih nyentuh sedikit di langit, tanah
// pelan-pelan teduh. Pas untuk setting "taman di waktu senja".
const TamanFloor = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#1c1f2a" roughness={1} />
    </mesh>
    <gridHelper
      args={[40, 40, '#2c3142', '#222632']}
      position={[0, 0.005, 0]}
    />
  </>
);

// Drought ring — visual hint "padang kering masih ada di luar peta".
// Ring tone warm brown (match R0 GROUND_COLOR) di radius 10-18,
// di luar petak hexagonal (radius ~5). Plus 8 small dry patches
// scattered di outer ring sebagai texture.
const DROUGHT_PATCH_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + ((i * 17) % 7) * 0.12;
    const r = 12 + ((i * 11) % 5);
    arr.push({
      pos: [Math.cos(angle) * r, 0.012, Math.sin(angle) * r],
      scale: 0.8 + ((i * 13) % 5) * 0.18,
      rot: ((i * 23) % 360) * (Math.PI / 180),
    });
  }
  return arr;
})();
const DroughtRing = () => (
  <>
    {/* Outer drought ring — warm brown plane below twilight grid */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <ringGeometry args={[9.5, 19, 64]} />
      <meshStandardMaterial color="#3a2a1a" roughness={1} />
    </mesh>
    {/* Slight gradient ring — lighter inner edge fade ke outer dark */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
      <ringGeometry args={[9.5, 11.5, 64]} />
      <meshStandardMaterial
        color="#4a3525"
        roughness={1}
        transparent
        opacity={0.7}
      />
    </mesh>
    {/* Scattered dry patches di outer ring untuk texture */}
    {DROUGHT_PATCH_DEFS.map((p, i) => (
      <mesh
        key={`dp-${i}`}
        rotation={[-Math.PI / 2, 0, p.rot]}
        position={p.pos}
        scale={p.scale}
      >
        <circleGeometry args={[0.5, 8]} />
        <meshStandardMaterial color="#5a3a25" roughness={1} />
      </mesh>
    ))}
  </>
);

// Narrative whispers — 4 floating Html text fragments di antara petak,
// pulsing fade in/out dengan phase offset per fragment. Kasih voice
// narrative di scene supaya kerasa "ada cerita" bukan cuma peta statis.
const NARRATIVE_WHISPERS = [
  { pos: [7.5, 1.6, 1.5], text: 'di luar, padang masih kering', phase: 0.0, period: 11 },
  { pos: [-7.0, 1.6, 3.5], text: 'di sini, kebaikan diingat', phase: 0.35, period: 12 },
  { pos: [3.0, 1.6, -7.5], text: 'tiap petak satu kenangan', phase: 0.6, period: 11 },
  { pos: [-3.5, 1.6, -7.0], text: 'yang masih bercahaya bertahan', phase: 0.2, period: 13 },
];
const NarrativeWhisper = ({ pos, text, phase = 0, period = 10 }) => {
  const divRef = useRef();
  useFrame((state) => {
    if (!divRef.current) return;
    const t = state.clock.elapsedTime;
    const u = ((t / period) + phase) % 1;
    // Pulse: fade in 0-15%, hold 15-45%, fade out 45-60%, off 60-100%
    let op = 0;
    if (u < 0.15) op = (u / 0.15) * 0.55;
    else if (u < 0.45) op = 0.55;
    else if (u < 0.6) op = 0.55 - ((u - 0.45) / 0.15) * 0.55;
    divRef.current.style.opacity = String(op);
  });
  return (
    <Html position={pos} center distanceFactor={11} occlude={false}>
      <div
        ref={divRef}
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontSize: '12px',
          color: 'rgba(255, 230, 200, 0.85)',
          letterSpacing: '0.04em',
          textShadow: '0 0 10px rgba(0,0,0,0.7), 0 0 22px rgba(200,170,140,0.18)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        {text}
      </div>
    </Html>
  );
};
// Chapter flow ring — thin torus on ground around hex perimeter,
// subtle emissive. Visualisasi "ada lingkaran cerita" yg connecting
// 6 bab.
const ChapterFlowRing = () => (
  <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <torusGeometry args={[HEX_RADIUS, 0.04, 6, 64]} />
    <meshStandardMaterial
      color="#7a9d5e"
      emissive="#a8e8d4"
      emissiveIntensity={0.3}
      roughness={0.7}
      toneMapped={false}
    />
  </mesh>
);

// Chapter flow bead — small bright sphere traveling clockwise di
// chapter ring, indikasi visual arah cerita (bab 1 → 2 → 3 → ...).
// Plus trail 5 buntut yg fade size+opacity.
const ChapterFlowBead = () => {
  const beadRef = useRef();
  const trailRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = 0.22; // rad/s — slow enough utk follow
    // Main bead at primary angle, clockwise (sin(-t))
    const mainAngle = -t * speed;
    if (beadRef.current) {
      beadRef.current.position.x = Math.cos(mainAngle) * HEX_RADIUS;
      beadRef.current.position.z = Math.sin(mainAngle) * HEX_RADIUS;
    }
    // Trail beads behind, each delayed phase
    trailRefs.current.forEach((trail, i) => {
      if (!trail) return;
      const lagAngle = mainAngle + (i + 1) * 0.12;
      trail.position.x = Math.cos(lagAngle) * HEX_RADIUS;
      trail.position.z = Math.sin(lagAngle) * HEX_RADIUS;
    });
  });
  return (
    <>
      <mesh ref={beadRef} position={[HEX_RADIUS, 0.08, 0]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshBasicMaterial color="#fff5c8" toneMapped={false} />
      </mesh>
      {/* Trail — 5 smaller fading beads */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`trail-${i}`}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          position={[HEX_RADIUS, 0.06, 0]}
        >
          <sphereGeometry args={[0.1 - i * 0.014, 8, 6]} />
          <meshBasicMaterial
            color="#fff5c8"
            transparent
            opacity={0.7 - i * 0.13}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
};

// Visited petak halo — ring marker around top of visited petak.
// Lebih visible drpd just ✓ di label. Mengindikasikan progress
// jelajahi cerita.
const VisitedHalo = ({ petak }) => {
  const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
  return (
    <mesh
      position={[px, 0.78, pz]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[1.35, 1.45, 24]} />
      <meshBasicMaterial
        color="#86d68a"
        transparent
        opacity={0.55}
        toneMapped={false}
        side={2}
      />
    </mesh>
  );
};

// Constellation lines — 3 cluster patterns di sky high, thin line
// segments connecting "stars". Cyan-mint color, kerasa magical &
// match theme r1 Konstelasi Perjalanan. Subtle opacity pulse.
const CONSTELLATION_LINES = new Float32Array([
  // Pattern 1 (top-left back): tree-like 5 lines
  -8, 14, -16, -7, 13, -15,
  -7, 13, -15, -6, 14, -14,
  -6, 14, -14, -5, 13, -15,
  -5, 13, -15, -6, 13.5, -15,
  -6, 13.5, -15, -6.5, 12.6, -15,
  // Pattern 2 (right back): "M" shape 4 lines
  8, 12, -10, 9, 11.5, -11,
  9, 11.5, -11, 10, 12.5, -10,
  10, 12.5, -10, 11, 11.4, -11,
  11, 11.4, -11, 11.5, 12, -10,
  // Pattern 3 (back center): diamond 4 lines
  -3, 14.5, -22, -1.5, 13.5, -22,
  -1.5, 13.5, -22, 0, 14.5, -22,
  0, 14.5, -22, -1.5, 15.5, -22,
  -1.5, 15.5, -22, -3, 14.5, -22,
]);
// Endpoints utk star markers (extracted dari lines pakai unique pairs).
const CONSTELLATION_STAR_POINTS = [
  [-8, 14, -16], [-7, 13, -15], [-6, 14, -14], [-5, 13, -15], [-6, 13.5, -15], [-6.5, 12.6, -15],
  [8, 12, -10], [9, 11.5, -11], [10, 12.5, -10], [11, 11.4, -11], [11.5, 12, -10],
  [-3, 14.5, -22], [-1.5, 13.5, -22], [0, 14.5, -22], [-1.5, 15.5, -22],
];
const Constellations = () => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.32 + Math.sin(t * 0.4) * 0.12;
  });
  return (
    <>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={CONSTELLATION_LINES}
            count={CONSTELLATION_LINES.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          ref={matRef}
          color="#a8e8d4"
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </lineSegments>
      {/* Star markers di tiap vertex — small bright points */}
      {CONSTELLATION_STAR_POINTS.map((p, i) => (
        <mesh key={`cstar-${i}`} position={p}>
          <sphereGeometry args={[0.08, 6, 4]} />
          <meshBasicMaterial color="#d4f8e8" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
};

// Halo sparkles — 14 small bright points di sekitar center tree halo,
// twinkle on/off dgn random phase. Kerasa fairytale/magical feel di
// area focal point.
const HALO_SPARKLE_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 14; i++) {
    const theta = (i / 14) * Math.PI * 2 + ((i * 13) % 7) * 0.1;
    const r = 2.2 + ((i * 7) % 6) * 0.2;
    const y = 1.0 + ((i * 11) % 9) * 0.22;
    arr.push({
      pos: [Math.cos(theta) * r, y, Math.sin(theta) * r],
      phase: (i * 0.45) % (Math.PI * 2),
      size: 0.045 + ((i * 17) % 3) * 0.015,
    });
  }
  return arr;
})();
const HaloSparkle = ({ pos, phase, size }) => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = Math.max(0, Math.sin(t * 1.6 + phase) * 0.85);
  });
  return (
    <mesh position={pos}>
      <sphereGeometry args={[size, 6, 4]} />
      <meshBasicMaterial
        ref={matRef}
        color="#fff5c8"
        transparent
        opacity={0}
        toneMapped={false}
      />
    </mesh>
  );
};
const HaloSparkles = () => (
  <>
    {HALO_SPARKLE_DEFS.map((s, i) => (
      <HaloSparkle key={`hs-${i}`} {...s} />
    ))}
  </>
);

// Aurora curtains — 3 elongated planes tilted di sky high, semi-
// transparent emissive utk magical atmosphere. Slow horizontal drift
// + opacity pulse. Behind mountains tapi visible dari camera angle.
const AURORA_DEFS = [
  { pos: [-2, 12, -18], rotX: -Math.PI / 3.2, w: 22, h: 3.5, color: '#7ad9b3', phase: 0 },
  { pos: [5, 11, -15], rotX: -Math.PI / 3.5, w: 18, h: 3, color: '#9abce0', phase: 1.5 },
  { pos: [-6, 13, -20], rotX: -Math.PI / 3, w: 26, h: 4, color: '#d9a8d8', phase: 3 },
];
const AuroraCurtain = ({ pos, rotX, w, h, color, phase }) => {
  const meshRef = useRef();
  const matRef = useRef();
  useFrame((state) => {
    if (!meshRef.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.14 + Math.sin(t * 0.35 + phase) * 0.08;
    meshRef.current.position.x = pos[0] + Math.sin(t * 0.12 + phase) * 1.8;
  });
  return (
    <mesh ref={meshRef} position={pos} rotation={[rotX, 0, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.18}
        toneMapped={false}
        side={2}
        depthWrite={false}
      />
    </mesh>
  );
};
const Aurora = () => (
  <>
    {AURORA_DEFS.map((a, i) => (
      <AuroraCurtain key={`aurora-${i}`} {...a} />
    ))}
  </>
);

// Hover ripple — ring expanding outward dari pusat petak yg lagi
// di-hover. Loop cycle 0.67s, color matching petak. Visual feedback
// kuat "you are looking at this".
const HoverRipple = ({ petak }) => {
  const meshRef = useRef();
  const matRef = useRef();
  const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
  useFrame((state) => {
    if (!meshRef.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    const cycle = (t * 1.5) % 1;
    const scale = 0.4 + cycle * 1.5;
    meshRef.current.scale.set(scale, scale, scale);
    matRef.current.opacity = (1 - cycle) * 0.6;
  });
  return (
    <mesh
      ref={meshRef}
      position={[px, 0.025, pz]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[1.35, 1.5, 32]} />
      <meshBasicMaterial
        ref={matRef}
        color={petak.color}
        transparent
        opacity={0.6}
        toneMapped={false}
        depthWrite={false}
        side={2}
      />
    </mesh>
  );
};

// Distant mountain silhouettes — 9 cones di luar drought ring (radius
// 22-30), berbagai height + color. Kasih atmospheric depth ke horizon,
// kerasa "ada dunia di luar taman". Tone dark blue-gray supaya recede.
const MOUNTAIN_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2 + ((i * 19) % 9) * 0.07;
    const r = 23 + ((i * 13) % 7);
    const h = 2.4 + ((i * 11) % 5) * 0.55;
    const radius = 1.6 + ((i * 17) % 4) * 0.3;
    // Layer color — closer mountains lighter, farther darker
    const colorIdx = (i * 7) % 3;
    const colors = ['#2a3548', '#1f2838', '#1a2030'];
    arr.push({
      pos: [Math.cos(angle) * r, h / 2 - 0.3, Math.sin(angle) * r],
      h,
      radius,
      color: colors[colorIdx],
    });
  }
  return arr;
})();
const Mountains = () => (
  <>
    {MOUNTAIN_DEFS.map((m, i) => (
      <mesh key={`mt-${i}`} position={m.pos}>
        <coneGeometry args={[m.radius, m.h, 6]} />
        <meshStandardMaterial color={m.color} roughness={1} />
      </mesh>
    ))}
  </>
);

// Stone path — 4 flat oval stones per spoke, dari center ke tiap
// petak position. 6 spokes total = 24 stones. Kasih visual koneksi
// "ini hub", path menjari ke 6 petak. Tiap stone punya emissive wave
// yg propagate dari center keluar — kerasa "path memandu, hidup".
const StonePath = ({ petakList }) => (
  <>
    {petakList.flatMap((petak) => {
      const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
      const stones = [];
      for (let i = 0; i < 4; i++) {
        const t = 0.25 + i * 0.18;
        const sx = px * t;
        const sz = pz * t;
        const jitter = ((Math.round(px * 7 + pz * 11) + i * 13) % 9 - 4) * 0.03;
        stones.push(
          <PathStone
            key={`stone-${petak.id}-${i}`}
            position={[sx + jitter, 0.012, sz - jitter]}
            rotation={[-Math.PI / 2, 0, (i * 0.4) % Math.PI]}
            radius={0.32 - i * 0.015}
            stoneIdx={i}
          />,
        );
      }
      return stones;
    })}
  </>
);

// Petak ground glow — soft radial circle di bawah tiap petak, color
// matching petak tone. Kerasa "pool of light" radiating dari petak
// ke ground, kerasa hidup vs flat floor.
const PetakGroundGlow = ({ petakList }) => (
  <>
    {petakList.map((petak) => {
      const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
      return (
        <mesh
          key={`glow-${petak.id}`}
          position={[px, 0.008, pz]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[2.4, 24]} />
          <meshBasicMaterial
            color={petak.color}
            transparent
            opacity={0.18}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      );
    })}
  </>
);

// Animated floating star — bob + rotation, untuk landmark torii r1.
const FloatingStar = ({ position = [0, 1.25, 0] }) => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 1.4) * 0.08;
    ref.current.rotation.y = t * 0.6;
    ref.current.rotation.x = Math.sin(t * 0.8) * 0.2;
  });
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.08, 0]} />
      <meshStandardMaterial
        color="#fff5c8"
        emissive="#fff5c8"
        emissiveIntensity={0.95}
        toneMapped={false}
      />
    </mesh>
  );
};

// Lily pond ripples — 3 concentric rings expanding dari pusat water
// disc r3, fade out di expansion. Stagger phase supaya kerasa continuous
// ripple wave (kayak air kena tetes).
const LilyPondRipples = () => {
  const refs = useRef([]);
  const matRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((ref, i) => {
      if (!ref || !matRefs.current[i]) return;
      const cycle = ((t * 0.4) + i * 0.33) % 1;
      const scale = 0.15 + cycle * 0.5;
      ref.scale.set(scale, scale, scale);
      matRefs.current[i].opacity = (1 - cycle) * 0.45;
    });
  });
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`pond-ripple-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.92, 1, 24]} />
          <meshBasicMaterial
            ref={(el) => {
              matRefs.current[i] = el;
            }}
            color="#cfeaf0"
            transparent
            opacity={0}
            toneMapped={false}
            side={2}
          />
        </mesh>
      ))}
    </>
  );
};

// Ground mist particles — soft drifting points di low altitude (0.2-0.8y),
// pelan drift horizontal, wrap around viewport. Atmospheric haze yg
// kasih depth + dreamy feel ke ground level. ~50 particles desktop.
const MistParticles = ({ count = 50 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = 0.2 + Math.random() * 0.65;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, [count]);
  const drifts = useMemo(() => {
    const arr = new Float32Array(count * 2); // [vx, vz]
    for (let i = 0; i < count; i++) {
      arr[i * 2] = 0.04 + Math.random() * 0.03;
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.015;
    }
    return arr;
  }, [count]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += drifts[i * 2] * delta * 60;
      arr[i * 3 + 2] += drifts[i * 2 + 1] * delta * 60;
      // Wrap around supaya kontinyu
      if (arr[i * 3] > 13) arr[i * 3] = -13;
      if (arr[i * 3 + 2] > 13) arr[i * 3 + 2] = -13;
      if (arr[i * 3 + 2] < -13) arr[i * 3 + 2] = 13;
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
        size={0.42}
        color="#b8c4d0"
        transparent
        opacity={0.18}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Next-chapter direction arrow — cone tegak melayang di atas hovered
// petak, ujung mengarah ke next chapter petak. Visual cue arah baca
// cerita.
const NextChapterArrow = ({ fromPetak, toPetak }) => {
  const ref = useRef();
  const [fx, fz] = polarToXZ(fromPetak.angle, HEX_RADIUS);
  const [tx, tz] = polarToXZ(toPetak.angle, HEX_RADIUS);
  // Direction vector & rotation around Y
  const dx = tx - fx;
  const dz = tz - fz;
  const angle = Math.atan2(dx, dz);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Subtle vertical bob
    ref.current.position.y = 1.8 + Math.sin(t * 2.2) * 0.08;
  });
  return (
    <group position={[fx, 1.8, fz]} rotation={[0, angle, 0]}>
      {/* Arrow group — tilt forward 90° supaya cone point in z+ direction */}
      <group ref={ref} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <coneGeometry args={[0.18, 0.42, 4]} />
          <meshBasicMaterial
            color="#fff5c8"
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </mesh>
        {/* Glow halo behind arrow */}
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.25, 12, 8]} />
          <meshBasicMaterial
            color="#fff5c8"
            transparent
            opacity={0.18}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>
      {/* Chapter number floating label */}
      <Html position={[0, 0.5, 0]} center distanceFactor={10}>
        <div
          className="text-white/85 text-[10px] tracking-[0.3em] uppercase font-bold pointer-events-none select-none whitespace-nowrap"
          style={{
            textShadow: '0 0 8px rgba(0,0,0,0.7)',
          }}
        >
          Bab {toPetak.chapter} →
        </div>
      </Html>
    </group>
  );
};

// Birds flock — 5 small bird silhouettes flying across sky di V-formation.
// Loop traversal dari kiri ke kanan tiap 40 detik. Tiap bird = 2 small
// boxes angled sebagai V wings (silhouette far-away).
const BIRD_FORMATION = [
  { dx: 0, dz: 0 },
  { dx: -0.5, dz: 0.4 },
  { dx: 0.5, dz: 0.4 },
  { dx: -1, dz: 0.8 },
  { dx: 1, dz: 0.8 },
];
const Bird = ({ position }) => (
  <group position={position}>
    <mesh position={[-0.06, 0, 0]} rotation={[0, 0, -0.4]}>
      <boxGeometry args={[0.13, 0.018, 0.018]} />
      <meshBasicMaterial color="#0a0d14" />
    </mesh>
    <mesh position={[0.06, 0, 0]} rotation={[0, 0, 0.4]}>
      <boxGeometry args={[0.13, 0.018, 0.018]} />
      <meshBasicMaterial color="#0a0d14" />
    </mesh>
  </group>
);
const BirdsFlock = () => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const cycleDur = 38;
    const cycleProgress = (t % cycleDur) / cycleDur;
    // Fly across diagonal: far-left far-back → far-right closer
    const startX = -22, endX = 22;
    const startZ = -16, endZ = -8;
    const baseY = 9.5;
    groupRef.current.position.x = startX + (endX - startX) * cycleProgress;
    groupRef.current.position.z = startZ + (endZ - startZ) * cycleProgress;
    groupRef.current.position.y = baseY + Math.sin(t * 0.6) * 0.3;
  });
  return (
    <group ref={groupRef}>
      {BIRD_FORMATION.map((b, i) => (
        <Bird key={`bird-${i}`} position={[b.dx, 0, b.dz]} />
      ))}
    </group>
  );
};

// Pulsing lotus — emissive scale ke up/down rhythm, untuk landmark
// telaga r3.
const PulsingLotus = ({ position = [-0.05, 0.08, -0.25] }) => {
  const ref = useRef();
  const matRef = useRef();
  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.1) * 0.08;
    ref.current.scale.set(pulse, pulse, pulse);
    matRef.current.emissiveIntensity = 0.35 + Math.sin(t * 1.1) * 0.18;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.07, 10, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color="#f4a8c0"
        emissive="#f4a8c0"
        emissiveIntensity={0.4}
        roughness={0.6}
      />
    </mesh>
  );
};

// Mini-fruit pulse glow — animasi subtle emissive di buah aprikot
// kecil, untuk landmark mini-tree r6.
const PulsingMiniFruit = ({ position }) => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    // Phase shift via position hash supaya fruit gak in-sync
    const phase = (position[0] * 7 + position[2] * 13) % (Math.PI * 2);
    matRef.current.emissiveIntensity = 0.2 + Math.sin(t * 1.3 + phase) * 0.12;
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.06, 8, 6]} />
      <meshStandardMaterial
        ref={matRef}
        color="#e8a87c"
        emissive="#e8a87c"
        emissiveIntensity={0.2}
        roughness={0.55}
      />
    </mesh>
  );
};

// Wobbling canvas (r2 easel) — gentle tilt rhythm pada canvas saja
// (easel legs static, canvas + paint accents goyang).
const WobblingCanvas = () => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = Math.sin(t * 0.9) * 0.06;
    ref.current.position.x = Math.sin(t * 0.6) * 0.015;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.4, 0.01]}>
        <boxGeometry args={[0.4, 0.32, 0.04]} />
        <meshStandardMaterial color="#f4e8d0" roughness={0.85} />
      </mesh>
      <mesh position={[-0.08, 0.42, 0.04]}>
        <boxGeometry args={[0.08, 0.06, 0.01]} />
        <meshStandardMaterial color="#c94a4a" roughness={0.7} />
      </mesh>
      <mesh position={[0.06, 0.36, 0.04]}>
        <boxGeometry args={[0.1, 0.04, 0.01]} />
        <meshStandardMaterial color="#5aa67a" roughness={0.7} />
      </mesh>
    </group>
  );
};

// Bobbing apricot — for r4 basket, tiny vertical bob per fruit dgn
// phase shift.
const BobbingApricot = ({ position }) => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const phase = (position[0] * 11 + position[2] * 17) % 6.28;
    ref.current.position.y = position[1] + Math.sin(t * 0.9 + phase) * 0.018;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 10, 8]} />
      <meshStandardMaterial
        color="#e8a87c"
        emissive="#e8a87c"
        emissiveIntensity={0.2}
        roughness={0.6}
      />
    </mesh>
  );
};

// Swaying brush (r5 padang lukis) — handle + ferrule + bristles sway
// sebagai 1 unit around basis. Origin di bottom (y=0) supaya rotasi
// natural.
const SwayingBrush = () => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = Math.sin(t * 1.2) * 0.1;
    ref.current.rotation.x = Math.cos(t * 0.8) * 0.04;
  });
  return (
    <group ref={ref} position={[0, 0, 0]}>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
        <meshStandardMaterial color="#8b6f47" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.07, 8]} />
        <meshStandardMaterial color="#9a9da3" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.05, 0.18, 8]} />
        <meshStandardMaterial color="#c94a4a" roughness={0.65} />
      </mesh>
    </group>
  );
};

// Breathing foliage — center tree foliage clusters subtle scale pulse,
// kerasa "pohon bernapas" idle. matRefCallback prop di-forward ke
// material supaya parent (CenterTree) tetap bisa boost emissive on
// hover.
const BreathingFoliage = ({ position, radius, color, phase = 0, matRefCallback }) => {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const scale = 1 + Math.sin(t * 0.7 + phase) * 0.03;
    ref.current.scale.set(scale, scale, scale);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial
        ref={matRefCallback}
        color={color}
        emissive={color}
        emissiveIntensity={0}
        roughness={0.75}
      />
    </mesh>
  );
};

// Path stone dgn emissive wave — pulse propagate dari center keluar.
// Tiap stone dapat phase berdasar idx-nya di spoke (0 paling dekat
// center, 3 paling jauh). Wave traveling outward kerasa "path memandu".
const PathStone = ({ position, rotation, radius, stoneIdx }) => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    const phase = stoneIdx * 0.7;
    // Wave dari center keluar — phase advance positive = wave outward.
    const pulse = Math.max(0, Math.sin(t * 1.1 - phase) * 0.5 + 0.5);
    matRef.current.emissiveIntensity = pulse * 0.55;
  });
  return (
    <mesh position={position} rotation={rotation}>
      <circleGeometry args={[radius, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color="#6a6e7a"
        emissive="#c9a961"
        emissiveIntensity={0}
        roughness={1}
      />
    </mesh>
  );
};

// Per-petak landmark — distinctive 3D element on top of each petak
// sesuai tema-nya. Dipanggil per-petak di scene render. Posisi
// relatif ke petak top (y ≈ 0.55).
const PetakLandmark = ({ petak }) => {
  const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
  const baseY = 0.55;
  const wrap = (children) => (
    <group position={[px, baseY, pz]}>{children}</group>
  );
  switch (petak.id) {
    case 'r1':
      // Konstelasi Perjalanan — torii gate kecil + bintang melayang.
      return wrap(
        <>
          <mesh position={[-0.35, 0.4, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.8, 6]} />
            <meshStandardMaterial color="#7a5840" roughness={0.9} />
          </mesh>
          <mesh position={[0.35, 0.4, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.8, 6]} />
            <meshStandardMaterial color="#7a5840" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <boxGeometry args={[0.95, 0.08, 0.16]} />
            <meshStandardMaterial color="#9b6f4a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.75, 0.05, 0.1]} />
            <meshStandardMaterial color="#7a5840" roughness={0.85} />
          </mesh>
          {/* Floating star — bob + rotate animated */}
          <FloatingStar position={[0, 1.25, 0]} />
        </>,
      );
    case 'r2':
      // Petak Karya — easel A-frame static + canvas wobbling.
      return wrap(
        <>
          <mesh position={[-0.15, 0.32, 0]} rotation={[0, 0, 0.18]}>
            <cylinderGeometry args={[0.025, 0.025, 0.7, 5]} />
            <meshStandardMaterial color="#6a4a2d" roughness={0.95} />
          </mesh>
          <mesh position={[0.15, 0.32, 0]} rotation={[0, 0, -0.18]}>
            <cylinderGeometry args={[0.025, 0.025, 0.7, 5]} />
            <meshStandardMaterial color="#6a4a2d" roughness={0.95} />
          </mesh>
          {/* Canvas + paint accents wobble together */}
          <WobblingCanvas />
        </>,
      );
    case 'r3':
      // Telaga Harapan — lily pad di atas water disc.
      return wrap(
        <>
          {/* Water disc */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 24]} />
            <meshStandardMaterial
              color="#5a8fb0"
              emissive="#4a7090"
              emissiveIntensity={0.25}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
          {/* Water ripples — 3 concentric rings expanding dari center */}
          <LilyPondRipples />
          {/* Lily pad — 3 pads di permukaan */}
          {[
            [0.25, 0.1],
            [-0.2, 0.18],
            [-0.05, -0.25],
          ].map(([lx, lz], i) => (
            <mesh
              key={`lp-${i}`}
              position={[lx, 0.04, lz]}
              rotation={[-Math.PI / 2, 0, i * 0.7]}
            >
              <circleGeometry args={[0.13, 12]} />
              <meshStandardMaterial color="#4a8458" roughness={0.85} />
            </mesh>
          ))}
          {/* Lotus center — pulsing scale + emissive */}
          <PulsingLotus position={[-0.05, 0.08, -0.25]} />
        </>,
      );
    case 'r4':
      // Kebun Kebaikan — basket of apricots.
      return wrap(
        <>
          {/* Basket body */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.32, 0.24, 0.32, 10]} />
            <meshStandardMaterial color="#9a7045" roughness={0.95} />
          </mesh>
          {/* Basket rim */}
          <mesh position={[0, 0.41, 0]}>
            <torusGeometry args={[0.32, 0.04, 6, 16]} />
            <meshStandardMaterial color="#7a5530" roughness={0.95} />
          </mesh>
          {/* Apricots inside (3 visible) — gentle bob */}
          {[
            [0, 0.45, 0.1],
            [0.15, 0.46, -0.06],
            [-0.13, 0.47, -0.08],
          ].map((p, i) => (
            <BobbingApricot key={`apk-${i}`} position={p} />
          ))}
        </>,
      );
    case 'r5':
      // Padang Lukis — paint brush sway + paint dabs static di petak.
      return wrap(
        <>
          <SwayingBrush />
          {/* Paint dabs on petak — static */}
          <mesh position={[0.2, 0.04, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.1, 10]} />
            <meshStandardMaterial color="#f4a8c0" roughness={0.7} />
          </mesh>
          <mesh position={[-0.18, 0.04, -0.16]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.08, 10]} />
            <meshStandardMaterial color="#a890c8" roughness={0.7} />
          </mesh>
        </>,
      );
    case 'r6':
      // Padang Aprikot — mini apricot tree (mirror center tree).
      return wrap(
        <>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.5, 8]} />
            <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.32, 14, 10]} />
            <meshStandardMaterial color="#86a868" roughness={0.75} />
          </mesh>
          {/* Tiny fruits — pulsing emissive dgn phase shift per posisi */}
          {[
            [0.2, 0.62, 0.1],
            [-0.18, 0.55, 0.12],
            [0.05, 0.78, -0.12],
            [-0.08, 0.7, 0.18],
          ].map((p, i) => (
            <PulsingMiniFruit key={`mf-${i}`} position={p} />
          ))}
        </>,
      );
    default:
      return null;
  }
};

// Dead tree silhouettes — pohon-pohon mati di drought ring. Cuma
// trunk + 2-3 cabang patah, color dark brown-grey, gak bercabang
// foliage. Visual narrative: pohon aprikot di tengah satu-satunya
// yg masih hidup. Spread di radius 11-17 (luar petak hexagonal,
// dalam drought ring 9.5-19), posisi deterministic via seeded index.
const DEAD_TREE_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + ((i * 17) % 13) * 0.05;
    const r = 11.5 + ((i * 11) % 6);
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      rot: ((i * 23) % 360) * (Math.PI / 180),
      scale: 0.65 + ((i * 13) % 5) * 0.16,
      lean: ((i * 19) % 7) * 0.04, // lean kiri/kanan dikit, kerasa rapuh
    });
  }
  return arr;
})();
const DeadTree = ({ pos, rot, scale, lean }) => (
  <group position={pos} rotation={[0, rot, lean]} scale={scale}>
    {/* Trunk — taper bottom-wide top-narrow, sedikit nyangkut tanah */}
    <mesh position={[0, 0.9, 0]}>
      <cylinderGeometry args={[0.06, 0.14, 1.8, 6]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
    {/* Cabang utama kanan, miring 25° */}
    <mesh position={[0.28, 1.45, 0]} rotation={[0, 0, -0.45]}>
      <cylinderGeometry args={[0.025, 0.055, 0.85, 5]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
    {/* Cabang kiri, sedikit lebih kecil */}
    <mesh position={[-0.22, 1.25, 0.08]} rotation={[0.15, 0, 0.5]}>
      <cylinderGeometry args={[0.02, 0.045, 0.7, 5]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
    {/* Cabang atas patah */}
    <mesh position={[0.08, 1.7, -0.18]} rotation={[-0.3, 0, -0.18]}>
      <cylinderGeometry args={[0.015, 0.035, 0.55, 5]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
    {/* Cabang kecil tambahan */}
    <mesh position={[0.4, 1.6, 0.1]} rotation={[0, 0.2, -0.7]}>
      <cylinderGeometry args={[0.012, 0.025, 0.4, 5]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
  </group>
);
const DeadTrees = () => DEAD_TREE_DEFS.map((d, i) => (
  <DeadTree key={`dt-${i}`} {...d} />
));

// Tree halo — soft glow sphere + point light di sekitar pohon aprikot
// pusat. Visual hint: pohon ini beacon, "yg masih hidup" di dunia
// kering. Light beneran emit warm illumination ke petak terdekat.
const TreeHalo = () => (
  <group position={[0, 1.6, 0]}>
    {/* Soft glow halo — semi-transparent sphere, baking the warmth */}
    <mesh>
      <sphereGeometry args={[2.4, 28, 20]} />
      <meshBasicMaterial
        color="#ffd9a0"
        transparent
        opacity={0.07}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
    {/* Outer warm aura */}
    <mesh>
      <sphereGeometry args={[3.8, 28, 20]} />
      <meshBasicMaterial
        color="#ffc878"
        transparent
        opacity={0.04}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
    {/* Actual point light — warm warm, soft, decay sesuai jarak.
        Distance 6 = batas iluminasi sebelum drop ke 0. */}
    <pointLight intensity={0.55} color="#ffd6a0" distance={6} decay={2} />
  </group>
);

// Twinkling stars di langit malam — taman senja makin malam, bintang
// muncul di atas. Single Points mesh dgn material opacity oscillation
// sebagai twinkle global (per-vertex twinkle butuh shader, overkill
// utk scope ini). Posisi semi-hemispherical di atas peta.
const Stars = ({ count = 80 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spread di hemisphere atas — radius 18-26, y 6-18.
      const theta = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 8;
      arr[i * 3] = Math.cos(theta) * r;
      arr[i * 3 + 1] = 6 + Math.random() * 12;
      arr[i * 3 + 2] = Math.sin(theta) * r;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current || !ref.current.material) return;
    const t = state.clock.elapsedTime;
    ref.current.material.opacity = 0.55 + Math.sin(t * 0.55) * 0.18;
  });

  return (
    <points ref={ref} frustumCulled={false}>
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
        color="#fff8e0"
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Moon — disc kecil glow lembut di sudut atas peta. Bukan light source
// asli (cuma visual), light asli udah dari directionalLight existing.
const Moon = () => (
  <group position={[-13, 14, -12]}>
    {/* Core moon */}
    <mesh>
      <sphereGeometry args={[1.1, 24, 16]} />
      <meshBasicMaterial color="#fff4d0" toneMapped={false} />
    </mesh>
    {/* Inner halo */}
    <mesh>
      <sphereGeometry args={[1.7, 24, 16]} />
      <meshBasicMaterial
        color="#fff4d0"
        transparent
        opacity={0.18}
        toneMapped={false}
      />
    </mesh>
    {/* Outer halo */}
    <mesh>
      <sphereGeometry args={[2.6, 24, 16]} />
      <meshBasicMaterial
        color="#ffe5a0"
        transparent
        opacity={0.08}
        toneMapped={false}
      />
    </mesh>
  </group>
);

// Fireflies — sphere kecil emissive yg drift Lissajous di sekitar
// scene. Pulse intensity per partikel dgn phase random. Kerasa taman
// hidup, bukan diorama statis. Density terbatas (12 desktop / 6 mobile)
// supaya gak overload performance.
const FIREFLY_COUNT_DESKTOP = 12;
const FIREFLY_COUNT_MOBILE = 6;
const Firefly = ({ def }) => {
  const ref = useRef();
  const matRef = useRef();
  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.x =
      def.cx + Math.sin(t * def.freqX + def.phaseX) * def.ampX;
    ref.current.position.y =
      def.cy + Math.sin(t * def.freqY + def.phaseY) * def.ampY;
    ref.current.position.z =
      def.cz + Math.cos(t * def.freqZ + def.phaseZ) * def.ampZ;
    const pulse = 0.55 + Math.sin(t * def.pulseFreq + def.pulsePhase) * 0.4;
    matRef.current.emissiveIntensity = pulse;
    matRef.current.opacity = 0.65 + Math.sin(t * def.pulseFreq + def.pulsePhase) * 0.3;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 8, 6]} />
      <meshStandardMaterial
        ref={matRef}
        color="#fff0a0"
        emissive="#ffd060"
        emissiveIntensity={0.9}
        transparent
        opacity={0.85}
        toneMapped={false}
      />
    </mesh>
  );
};
const Fireflies = ({ isMobile }) => {
  const count = isMobile ? FIREFLY_COUNT_MOBILE : FIREFLY_COUNT_DESKTOP;
  const defs = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      // Cluster lebih dekat ke pohon tengah (radius 1.8-4.5) — kerasa
      // mereka shelter di sekitar satu-satunya yg masih hidup.
      const theta = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const r = 1.8 + Math.random() * 2.7;
      arr.push({
        cx: Math.cos(theta) * r,
        cy: 1.0 + Math.random() * 1.8,
        cz: Math.sin(theta) * r,
        ampX: 0.7 + Math.random() * 1.1,
        ampY: 0.25 + Math.random() * 0.45,
        ampZ: 0.7 + Math.random() * 1.1,
        freqX: 0.25 + Math.random() * 0.35,
        freqY: 0.55 + Math.random() * 0.45,
        freqZ: 0.3 + Math.random() * 0.35,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        pulseFreq: 0.7 + Math.random() * 0.7,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);
  return defs.map((def, i) => <Firefly key={`ff-${i}`} def={def} />);
};

const NarrativeWhispers = ({ isMobile }) => {
  const list = isMobile ? NARRATIVE_WHISPERS.slice(0, 2) : NARRATIVE_WHISPERS;
  return (
    <>
      {list.map((w, i) => (
        <NarrativeWhisper key={`nw-${i}`} {...w} />
      ))}
    </>
  );
};

const TamanScene = ({
  hoveredPetakId,
  hoveredCenter,
  previewedPetak,
  flyInActive,
  isMobile = false,
  onFlyInComplete,
  onPetakHover,
  onPetakOut,
  onPetakClick,
  onCenterHover,
  onCenterOut,
  onCenterClick,
}) => {
  const controlsRef = useRef();
  const idleTimerRef = useRef();
  const [autoRotate, setAutoRotate] = useState(false);
  // Pause auto-rotate kalau user lagi hover petak — kerasa weird kalau
  // kamera bergerak sambil user fokus baca label.
  const userIsHovering = Boolean(hoveredPetakId) || hoveredCenter;

  // Idle auto-rotate: setelah 6 detik user gak interact, kamera pelan
  // berputar. Resume manual control begitu user drag/zoom/touch atau
  // hover petak.
  useEffect(() => {
    if (flyInActive) return undefined;
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const armIdle = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setAutoRotate(true), 6000);
    };
    const onStart = () => {
      setAutoRotate(false);
      clearTimeout(idleTimerRef.current);
    };
    const onEnd = () => {
      armIdle();
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    armIdle();
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      clearTimeout(idleTimerRef.current);
    };
  }, [flyInActive]);

  // Saat user mulai hover petak/center, matikan auto-rotate immediate.
  useEffect(() => {
    if (userIsHovering && autoRotate) setAutoRotate(false);
  }, [userIsHovering, autoRotate]);

  return (
    <>
      <fog attach="fog" args={['#1c1f2a', 12, 35]} />
      <color attach="background" args={['#1c1f2a']} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.3}
        color="#ffd9a8"
      />
      <directionalLight
        position={[-6, 8, -4]}
        intensity={0.5}
        color="#a8c5e0"
      />
      <TamanFloor />
      <DroughtRing />
      <Mountains />
      <Aurora />
      <Constellations />
      <DeadTrees />
      <Stars count={isMobile ? 45 : 90} />
      <Moon />
      <BirdsFlock />
      <StonePath petakList={PETAK} />
      <PetakGroundGlow petakList={PETAK} />
      <ChapterFlowRing />
      <ChapterFlowBead />
      {/* Visited halo per petak — emerald ring di atas petak yg udah
          dibuka overlay-nya. Progress indicator visual. */}
      {PETAK.filter((p) => previewedPetak.has(p.id)).map((petak) => (
        <VisitedHalo key={`vh-${petak.id}`} petak={petak} />
      ))}
      {hoveredPetakId && (
        <HoverRipple petak={PETAK.find((p) => p.id === hoveredPetakId)} />
      )}
      <Fireflies isMobile={isMobile} />
      <NarrativeWhispers isMobile={isMobile} />
      <CenterTree
        hovered={hoveredCenter}
        onPointerOver={onCenterHover}
        onPointerOut={onCenterOut}
        onClick={onCenterClick}
      />
      <TreeHalo />
      <HaloSparkles />
      <MistParticles count={isMobile ? 30 : 55} />
      <FallingPetals count={isMobile ? 50 : 80} />
      {/* Direction arrow saat hover — tunjukkan next chapter
          petak dari yg di-hover. */}
      {hoveredPetakId &&
        (() => {
          const fromPetak = PETAK.find((p) => p.id === hoveredPetakId);
          const toPetak = fromPetak?.nextId
            ? PETAK.find((p) => p.id === fromPetak.nextId)
            : null;
          if (!fromPetak || !toPetak) return null;
          return <NextChapterArrow fromPetak={fromPetak} toPetak={toPetak} />;
        })()}
      {PETAK.map((petak) => (
        <PetakPlot
          key={petak.id}
          petak={petak}
          hovered={hoveredPetakId === petak.id}
          previewed={previewedPetak.has(petak.id)}
          onPointerOver={onPetakHover}
          onPointerOut={onPetakOut}
          onClick={onPetakClick}
        />
      ))}
      {/* Per-petak landmark — distinctive 3D element on top of each
          petak yg signal tema-nya (torii, easel, lily pad, basket,
          paint brush, mini tree). */}
      {PETAK.map((petak) => (
        <PetakLandmark key={`${petak.id}-landmark`} petak={petak} />
      ))}
      {/* Bunga-bunga kecil di sekitar tiap petak. Render terpisah dari
          PetakPlot supaya posisinya tetap di tanah saat petak lift
          karena hover. */}
      {PETAK.map((petak) => (
        <PetakFlowers key={`${petak.id}-flowers`} petak={petak} />
      ))}
      {flyInActive && <FlyInCamera onComplete={onFlyInComplete} />}
      {/*
        OrbitControls dirender selalu, tapi enabled=false saat fly-in.
        Constraint: rotate horizontal bebas, vertical dikunci di range
        atas (45°–72° dari atas), zoom limited 8–18 unit, no pan.
        Tujuan: user bisa muter denah untuk lihat sisi belakang
        ruangan, tapi nggak bisa ngerusak isometrik mood.
      */}
      <OrbitControls
        ref={controlsRef}
        enabled={!flyInActive}
        target={ORBIT_TARGET}
        enableZoom
        minDistance={10}
        maxDistance={20}
        enablePan={false}
        minPolarAngle={Math.PI / 4.5}
        maxPolarAngle={Math.PI / 2.5}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        autoRotate={autoRotate && !flyInActive && !userIsHovering}
        autoRotateSpeed={0.35}
      />
    </>
  );
};

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat peta taman...
  </div>
);

const TamanHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 md:px-6 md:py-5">
    <div className="pointer-events-auto">
      <Link
        to="/"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        ← Keluar
      </Link>
    </div>
    <div className="text-center">
      <div className="text-white/45 text-[8px] md:text-[9px] uppercase tracking-[0.35em] md:tracking-[0.45em] mb-0.5">
        Peta Kenangan
      </div>
      <div
        className="text-white/85 text-[13px] md:text-sm tracking-wide"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Taman Kebaikan
      </div>
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/taman"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        <span className="md:hidden">Gerbang →</span>
        <span className="hidden md:inline">Ulangi gerbang →</span>
      </Link>
    </div>
  </div>
);

// First-visit intro overlay — connective tissue narasi: setelah user
// lewat gerbang R0, peta ini reveals kenangan2 kebaikan yg bisa
// dikunjungi. Tampil ~2.6s setelah FlyInCamera selesai. Skip kalau
// udah pernah seen via localStorage 'taman-peta-intro-seen'.
const PETA_INTRO_STORAGE_KEY = 'taman-peta-intro-seen';
const TamanPetaIntroTitle = () => {
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(PETA_INTRO_STORAGE_KEY) === '1';
    } catch {
      /* storage blocked */
    }
    if (seen) {
      setRemoved(true);
      return undefined;
    }
    // Sync ke FlyInCamera selesai (~2.5s) + small breath, lalu auto
    // fade out 5s kemudian.
    const t1 = setTimeout(() => setVisible(true), 2600);
    const t2 = setTimeout(() => setVisible(false), 8400);
    const t3 = setTimeout(() => {
      setRemoved(true);
      try {
        localStorage.setItem(PETA_INTRO_STORAGE_KEY, '1');
      } catch {
        /* storage blocked */
      }
    }, 10600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  if (removed) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-[2000ms] ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center max-w-md mx-6 px-8 py-9 -translate-y-10 rounded-md border border-white/12 bg-[#1c1f2a]/85 backdrop-blur-md shadow-2xl">
        <div className="text-white/55 text-[9px] uppercase tracking-[0.5em] mb-4">
          Peta Kenangan
        </div>
        <p
          className="text-white text-lg md:text-xl leading-relaxed mb-3"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}
        >
          Di luar gerbang, padang masih kering.
        </p>
        <div className="mx-auto mb-3 w-10 h-px bg-white/25" />
        <p
          className="text-white/65 text-[12px] md:text-[13px] leading-relaxed"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}
        >
          Tapi di dalam, enam bab kenangan masih bercahaya
          <br />
          mengelilingi pohon yang menolak gugur.
          <br />
          Pilih satu — atau mulai dari bab pertama.
        </p>
      </div>
    </div>
  );
};

const TamanFooter = ({ hoveredPetakId, flyInActive, previewedCount }) => {
  let hint;
  if (flyInActive) hint = 'Memasuki taman...';
  else if (hoveredPetakId) hint = 'Klik untuk lihat detail petak';
  else hint = 'Klik & seret untuk berputar · Scroll untuk zoom';
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
      <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] transition-opacity">
        {hint}
      </div>
      <div className="text-white/30 text-[10px] mt-1.5 tracking-wide">
        {previewedCount} dari {PETAK.length} petak dijelajahi
      </div>
    </div>
  );
};

// Modal info petak saat di-click. Karena petak sebenarnya belum
// dibangun (Fase 3), overlay ini sementara nampilin deskripsi + CTA
// "Akan dirilis di Fase 3". Setelah petak jadi, ganti CTA jadi
// "Masuk petak →" yang navigate ke route petak.
const PetakDetailOverlay = ({ petak, onClose, onJumpToPetak }) => {
  useEffect(() => {
    if (!petak) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [petak]);

  if (!petak) return null;
  // Lookup next chapter petak via nextId pointer.
  const nextPetak = petak.nextId
    ? PETAK.find((p) => p.id === petak.nextId)
    : null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#1c1f2a]/95 border border-white/15 rounded-2xl px-8 py-9 max-w-md mx-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chapter indicator + eyebrow */}
        <div className="mb-2 text-white/50 text-[10px] uppercase tracking-[0.25em] flex items-center justify-center gap-1.5 flex-wrap">
          {petak.chapter && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 text-white/85 text-[9px] font-black tabular-nums">
              {petak.chapter}
            </span>
          )}
          <span>{petak.id.toUpperCase()}</span>
          {petak.eyebrow && (
            <span className="text-white/35">· {petak.eyebrow.replace(/^Bab \d+ · /, '')}</span>
          )}
        </div>
        <h2
          className="text-white text-2xl mb-3 leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {petak.name}
        </h2>
        <p className="text-white/70 text-sm leading-relaxed mb-6">
          {petak.longDesc}
        </p>
        {petak.route ? (
          <div className="flex flex-col gap-2.5">
            <Link
              to={petak.route}
              className="w-full px-5 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition text-center"
            >
              Masuk {petak.name} →
            </Link>
          </div>
        ) : (
          <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 mb-4">
            <p className="text-white/55 text-xs leading-relaxed">
              Petak ini sedang dalam pertumbuhan.
              <br />
              Akan dirilis di{' '}
              <span className="text-white/85">Fase 3</span>.
            </p>
          </div>
        )}

        {/* Next chapter pointer — story flow */}
        {nextPetak && onJumpToPetak && (
          <button
            type="button"
            onClick={() => onJumpToPetak(nextPetak)}
            className="w-full mt-3 px-5 py-2.5 rounded-full border border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition text-left flex items-center gap-3"
          >
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/45 shrink-0">
              Bab {nextPetak.chapter} →
            </span>
            <span
              className="flex-1 text-white/85 text-[13px] truncate"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
              }}
            >
              {nextPetak.name}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 px-5 py-2 rounded-full border border-white/20 text-white/55 text-[11px] hover:bg-white/10 transition"
        >
          Kembali ke peta taman
        </button>
      </div>
    </div>
  );
};

const TamanPetaPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [hoveredPetakId, setHoveredPetakId] = useState(null);
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const [selectedPetak, setSelectedPetak] = useState(null);
  const [flyInActive, setFlyInActive] = useState(true);
  // Set of petak IDs yang udah dibuka overlay-nya. Init dari
  // localStorage (merge new + legacy keys).
  const [previewedPetak, setPreviewedPetak] = useState(() => readPreviewed());

  useEffect(() => {
    const showPointer =
      !flyInActive && (hoveredPetakId || hoveredCenter);
    document.body.style.cursor = showPointer ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredPetakId, hoveredCenter, flyInActive]);

  const handleFlyInComplete = () => setFlyInActive(false);

  const handlePetakHover = (petakId) => {
    if (flyInActive) return;
    setHoveredPetakId(petakId);
  };
  const handlePetakOut = (petakId) => {
    setHoveredPetakId((current) => (current === petakId ? null : current));
  };
  const handlePetakClick = (petak) => {
    if (flyInActive) return;
    setSelectedPetak(petak);
    setHoveredPetakId(null);
    setPreviewedPetak((prev) => {
      if (prev.has(petak.id)) return prev;
      const next = new Set(prev);
      next.add(petak.id);
      writePreviewed(next);
      return next;
    });
  };
  const handleCloseOverlay = () => setSelectedPetak(null);

  // Center tree handlers — pohon aprikot di pusat = Pohon Kebaikan
  // (modul existing di /26). Click navigate ke sana.
  const handleCenterHover = () => {
    if (flyInActive) return;
    setHoveredCenter(true);
  };
  const handleCenterOut = () => setHoveredCenter(false);
  const handleCenterClick = () => {
    if (flyInActive) return;
    navigate('/26');
  };

  return (
    <>
      <Seo
        title="Peta Taman"
        description="Peta Taman Kebaikan — pilih petak untuk dijelajahi."
        path="/taman/peta"
      />
      <div className="relative w-full h-screen bg-[#1c1f2a] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 38, position: [9, 11, 9] }}
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
            <TamanScene
              hoveredPetakId={hoveredPetakId}
              hoveredCenter={hoveredCenter}
              previewedPetak={previewedPetak}
              flyInActive={flyInActive}
              isMobile={isMobile}
              onFlyInComplete={handleFlyInComplete}
              onPetakHover={handlePetakHover}
              onPetakOut={handlePetakOut}
              onPetakClick={handlePetakClick}
              onCenterHover={handleCenterHover}
              onCenterOut={handleCenterOut}
              onCenterClick={handleCenterClick}
            />
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <TamanHeader />
        <TamanPetaIntroTitle />
        <TamanFooter
          hoveredPetakId={hoveredPetakId}
          flyInActive={flyInActive}
          previewedCount={previewedPetak.size}
        />
        <PetakDetailOverlay
          petak={selectedPetak}
          onClose={handleCloseOverlay}
          onJumpToPetak={(nextPetak) => {
            // Bab → bab navigation: ganti selected petak ke next.
            setSelectedPetak(nextPetak);
            setPreviewedPetak((prev) => {
              if (prev.has(nextPetak.id)) return prev;
              const next = new Set(prev);
              next.add(nextPetak.id);
              writePreviewed(next);
              return next;
            });
          }}
        />
        <AmbientAudio profile="taman" position="top-right" />
      </div>
    </>
  );
};

export default TamanPetaPage;
