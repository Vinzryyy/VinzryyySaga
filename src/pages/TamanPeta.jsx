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
const PETAK = [
  {
    id: 'r1',
    name: 'Konstelasi Perjalanan',
    eyebrow: 'Lorong Antara Waktu',
    desc: 'Lorong dgn konstelasi perjalanan',
    longDesc:
      'Lorong yang menghubungkan gerbang ini ke kenangan lain. Berdiri di taman senja, menengadah ke langit — tiap bintang adalah milestone perjalanan Eli, terajut jadi tujuh konstelasi per era. Kebaikan yang masih bercahaya, walau dunia di luar sudah lupa.',
    angle: 270,
    color: '#a8c0ff',
    route: '/taman/r1',
  },
  {
    id: 'r2',
    name: 'Petak Karya',
    eyebrow: 'Kenangan Tangan',
    desc: 'Kebun karya penggemar',
    longDesc:
      'Plot kebun dari kontribusi penggemar — video, web, poster, dan lainnya tumbuh seperti tanaman di pekarangan. Bukti bahwa di tempat ini, tangan-tangan masih membentuk sesuatu.',
    angle: 330,
    color: '#94b878',
  },
  {
    id: 'r3',
    name: 'Telaga Harapan',
    eyebrow: 'Kenangan Air',
    desc: 'Telaga sebelum padang kering',
    longDesc:
      'Sebelum padang di luar gerbang menguning, di sini ada air. Telaga teratai senja — tiap bunga mekar adalah satu harapan dari fans untuk Eli. Live dari wish wall, bertambah tiap submission baru di /wishes.',
    angle: 30,
    color: '#86a868',
    route: '/taman/r3',
  },
  {
    id: 'r4',
    name: 'Kebun Kebaikan',
    eyebrow: 'Kenangan Aksi',
    desc: 'Aksi nyata yang tumbuh',
    longDesc:
      'Padang yang dipenuhi tanaman dari setiap aksi kebaikan nyata — Galeri Kebaikan, program donasi, kunjungan komunitas. Tiap kebaikan menumbuhkan satu tunas. Bukti bahwa kemarau di luar tidak selalu menang.',
    angle: 90,
    color: '#a8b870',
  },
  {
    id: 'r5',
    name: 'Padang Lukis',
    eyebrow: 'Kenangan Warna',
    desc: 'Ladang fanart',
    longDesc:
      'Ladang dgn lukisan berdiri seperti bunga — fanart, ilustrasi, karya seni dari komunitas. Warna yang tertinggal sebelum padang menguning.',
    angle: 150,
    color: '#94b878',
  },
  {
    id: 'r6',
    name: 'Padang Aprikot',
    eyebrow: 'Pusat Kenangan',
    desc: 'Pohon + Langit Kontributor',
    longDesc:
      'Pusat taman: pohon aprikot besar di tengah orchard, langit malam bertabur bintang — tiap bintang adalah kontributor kebaikan. Di sinilah semua kenangan bertemu, dan benih baru bisa ditanam.',
    angle: 210,
    color: '#e8a87c',
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
            {petak.desc}
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
      {/* Trunk — ramping, tinggi 1.4, taper sedikit */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1.4, 10]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Foliage clusters — material ref-tracked untuk hover emissive */}
      {FOLIAGE_CLUSTERS.map((c, i) => (
        <mesh key={`foliage-${i}`} position={c.pos}>
          <sphereGeometry args={[c.radius, 16, 12]} />
          <meshStandardMaterial
            ref={(el) => {
              foliageMatRefs.current[i] = el;
            }}
            color={c.color}
            emissive={c.color}
            emissiveIntensity={0}
            roughness={0.75}
          />
        </mesh>
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
      <DeadTrees />
      <Stars count={isMobile ? 45 : 90} />
      <Moon />
      <Fireflies isMobile={isMobile} />
      <NarrativeWhispers isMobile={isMobile} />
      <CenterTree
        hovered={hoveredCenter}
        onPointerOver={onCenterHover}
        onPointerOut={onCenterOut}
        onClick={onCenterClick}
      />
      <TreeHalo />
      <FallingPetals count={isMobile ? 50 : 80} />
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
          Tapi tiap petak ini adalah kenangan kebaikan
          <br />
          yang masih hidup. Pilih satu untuk diingat kembali.
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
const PetakDetailOverlay = ({ petak, onClose }) => {
  useEffect(() => {
    if (!petak) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [petak]);

  if (!petak) return null;
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
        <div className="mb-2 text-white/50 text-[10px] uppercase tracking-[0.25em]">
          {petak.id.toUpperCase()}
          {petak.eyebrow && (
            <span className="text-white/35"> · {petak.eyebrow}</span>
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
            <button
              type="button"
              onClick={onClose}
              className="w-full px-5 py-2 rounded-full border border-white/20 text-white/65 text-xs hover:bg-white/10 transition"
            >
              Kembali ke peta taman
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 mb-6">
              <p className="text-white/55 text-xs leading-relaxed">
                Petak ini sedang dalam pertumbuhan.
                <br />
                Akan dirilis di{' '}
                <span className="text-white/85">Fase 3</span> —
                kami tanam petak satu per satu.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
            >
              Kembali ke peta taman
            </button>
          </>
        )}
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
        />
        <AmbientAudio profile="taman" position="top-right" />
      </div>
    </>
  );
};

export default TamanPetaPage;
