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
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
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
import { subscribeToTreeSupports } from '../lib/treeDb';

// Threshold restorasi — sinkron dgn App.jsx & Taman.jsx (idealnya
// di-extract ke shared config nanti). 2000 = gerbang/peta buka,
// 4000 = r1 restored + r3 unlocked drought, 6000 = r3 restored
// (ekosistem pulih penuh).
const MAP_THRESHOLDS = {
  mapUnlock: 2000,
  r1Restore: 4000,
  r3Unlock: 4000,
  fullRestore: 6000,
};

const useArmeniacaProgress = () => {
  const [state, setState] = useState({ count: 0, loaded: false });
  useEffect(() => {
    const unsubscribe = subscribeToTreeSupports((count) => {
      setState({ count, loaded: true });
    });
    return unsubscribe;
  }, []);
  return state;
};

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
// Petak DIKOSONGKAN — user lagi redesign navigation model dari awal.
// Wilayah baru bernama "Kota" (gerbang masuknya = R0 / /armeniacaTown). Peta
// ini sementara cuma punya pohon di tengah + environment desert dusk
// + city ruins di horizon. Path stones, hex ring, chapter petak,
// restoration indicator, dan modal info semua di-disable di render
// sambil nunggu konsep baru. State + handlers tetap utuh supaya gak
// invasive — gampang re-wire saat redesign masuk.
const PETAK = [];

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
  hideLabel = false,
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
      {!hideLabel && (
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
      )}
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

// CenterTree — pohon aprikot di pusat peta. Naratif baru: "Pohon
// Terakhir" — satu-satunya pohon yg masih hidup di sisa kota gurun
// yang runtuh (city ruins di horizon). Secara modul tetep link ke
// /26 (Pohon Kebaikan existing). Hover kasih emissive boost di semua
// foliage cluster, click → navigate.
const CenterTree = ({
  hovered,
  visited = false,
  isMobile = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
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
      {/* Tap-target hitbox mobile — invisible larger box, thumb-friendly */}
      {isMobile && (
        <mesh position={[0, 1.2, 0]} visible={false}>
          <cylinderGeometry args={[1.3, 1.3, 3, 8]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      {/* Visited halo — green glow ring di base, beda warna dari Gerbang
          (amber) + Lorong (warm yellow) supaya gampang dibedain. */}
      {visited && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshStandardMaterial
            color="#a8d8b0"
            emissive="#7aa858"
            emissiveIntensity={0.5}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        </mesh>
      )}
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
      {/* Floating label saat hover — "Pohon Terakhir" + hint klik.
          Pohon aprikot tunggal yg masih hidup di sisa kota gurun, link
          ke modul Pohon Kebaikan (/26). */}
      {hovered && (
        <Html position={[0, 2.9, 0]} center distanceFactor={10}>
          <div className="text-center pointer-events-none select-none whitespace-nowrap">
            <div className="text-white text-[12px] font-medium tracking-wide">
              Pohon Terakhir
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

// Gerbang petak di peta — versi mini dari Gate (Taman.jsx R0), berdiri
// di selatan pohon supaya kerasa "pintu kembali" ke Padang Tandus.
// Click → navigate('/armeniacaTown'). Hover lift + emissive warm + label di
// atas. Tirai swing tipis biar gak terasa statis dari isometric view.
//
// Scale 0.4 = pas duduk di petak ring (asli ~5.6 wide × 4.8 tall jadi
// ~2.24 × 1.92). Posisi z=8 — di luar petak hex (radius 5), nempel
// ujung dalam DroughtRing (radius 9.5) supaya kerasa "di tepi taman"
// bukan crowding pohon. Camera (9,11,9) tetap nge-frame natural saat
// fly-in landing.
const PetaGerbang = ({
  hovered,
  visited = false,
  isMobile = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const tiraiLRef = useRef();
  const tiraiRRef = useRef();
  const matRefs = useRef([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (tiraiLRef.current) {
      tiraiLRef.current.rotation.x = Math.sin(t * 0.7) * 0.08;
    }
    if (tiraiRRef.current) {
      tiraiRRef.current.rotation.x = Math.sin(t * 0.7 + 0.4) * 0.08;
    }
    if (groupRef.current) {
      const targetY = hovered ? 0.3 : 0;
      const factor = Math.min(delta * 8, 1);
      groupRef.current.position.y = lerp(
        groupRef.current.position.y,
        targetY,
        factor
      );
    }
    // Base 0.1 emissive (subtle warm glow biar pilar gak hitam mati di
    // ambient peta 0.42), hover boost ke 0.5
    const targetEm = hovered ? 0.5 : 0.1;
    const factor = Math.min(delta * 8, 1);
    matRefs.current.forEach((mat) => {
      if (!mat) return;
      mat.emissiveIntensity = lerp(mat.emissiveIntensity, targetEm, factor);
    });
  });

  const regMat = (i) => (mat) => {
    matRefs.current[i] = mat;
  };

  return (
    <group
      ref={groupRef}
      position={[0, 0, 8]}
      scale={0.4}
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
      {/* Invisible tap-target hitbox — diperbesar di mobile biar
          thumb-friendly. Cover entire gate footprint + margin. */}
      <mesh position={[0, 2.5, 0]} visible={false}>
        <boxGeometry args={isMobile ? [7, 6, 2.5] : [5.6, 5.2, 1.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Visited halo — ring di base saat petak udah pernah dikunjungi.
          Subtle warm glow, gak ganggu visual hierarchy. */}
      {visited && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[2.7, 3.0, 32]} />
          <meshStandardMaterial
            color="#f4c478"
            emissive="#f4a060"
            emissiveIntensity={0.55}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* Stone bases — warna dinaikin dari #3a2e22 → #6a5440 supaya
          gak hitam mati di ambient peta yg turun ke 0.42 */}
      <mesh position={[-2.2, 0.2, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.7]} />
        <meshStandardMaterial color="#6a5440" roughness={1} />
      </mesh>
      <mesh position={[2.2, 0.2, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.7]} />
        <meshStandardMaterial color="#6a5440" roughness={1} />
      </mesh>
      {/* Pilar kayu — warna dinaikin dari #1f1814 → #4a3825 (lebih
          coklat, masih dark warm tapi gak black). Emissive base warm
          subtle (0.1) supaya kerasa "berdiri di sun" — hover tetap
          boost ke 0.45 */}
      <mesh position={[-2.2, 2.2, 0]}>
        <boxGeometry args={[0.4, 4, 0.4]} />
        <meshStandardMaterial
          ref={regMat(0)}
          color="#4a3825"
          emissive="#f4a060"
          emissiveIntensity={0.1}
          roughness={0.95}
        />
      </mesh>
      <mesh position={[2.2, 2.2, 0]}>
        <boxGeometry args={[0.4, 4, 0.4]} />
        <meshStandardMaterial
          ref={regMat(1)}
          color="#4a3825"
          emissive="#f4a060"
          emissiveIntensity={0.1}
          roughness={0.95}
        />
      </mesh>
      {/* Cross-beam atas */}
      <mesh position={[0, 4.4, 0]}>
        <boxGeometry args={[5.2, 0.45, 0.45]} />
        <meshStandardMaterial
          ref={regMat(2)}
          color="#4a3825"
          emissive="#f4a060"
          emissiveIntensity={0.1}
          roughness={0.95}
        />
      </mesh>
      {/* Cross-beam top (kasagi) */}
      <mesh position={[0, 4.8, 0]}>
        <boxGeometry args={[5.6, 0.18, 0.55]} />
        <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
      </mesh>
      {/* Cross-beam tengah */}
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[4.8, 0.18, 0.35]} />
        <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
      </mesh>
      {/* Tirai kain weathered dengan gentle sway */}
      <group ref={tiraiLRef} position={[-1.3, 3.4, 0.2]}>
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[0.4, 1.4, 0.02]} />
          <meshStandardMaterial color="#4a3022" roughness={0.95} />
        </mesh>
      </group>
      <group ref={tiraiRRef} position={[1.3, 3.4, 0.2]}>
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[0.4, 1.4, 0.02]} />
          <meshStandardMaterial color="#4a3022" roughness={0.95} />
        </mesh>
      </group>
      <Html
        position={[0, 5.8, 0]}
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
            className={`text-[11px] font-medium tracking-wide transition-colors ${
              hovered ? 'text-white' : 'text-white/85'
            }`}
          >
            Gerbang
          </div>
          <div
            className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
              hovered ? 'text-amber-200/85' : 'text-white/55'
            }`}
          >
            Pintu Masuk Kota
          </div>
        </div>
      </Html>
    </group>
  );
};

// Lorong Masuk — stepping stones path antara Gerbang (z=8) dan Pohon
// Terakhir (z=0). Click → /armeniacaTown/r1 (Konstelasi Perjalanan). Stones
// di-arrange alternating kiri-kanan supaya kerasa setapak natural.
// Hover: warm emissive glow di semua stones + label lift. Narrative:
// inilah "jalan masuk" — lewat sini, perjalanan ke langit dimulai.
const LORONG_STONE_DEFS = [
  { pos: [-0.3, 0.06, 6.8], r: 0.32, rot: 0.4 },
  { pos: [0.28, 0.06, 5.6], r: 0.34, rot: 1.1 },
  { pos: [-0.22, 0.06, 4.4], r: 0.3, rot: 0.2 },
  { pos: [0.3, 0.06, 3.2], r: 0.34, rot: 0.9 },
  { pos: [-0.25, 0.06, 2.0], r: 0.3, rot: 1.4 },
  { pos: [0.18, 0.06, 1.0], r: 0.28, rot: 0.6 },
];
const PetaLorongMasuk = ({
  hovered,
  visited = false,
  isMobile = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const stoneMatRefs = useRef([]);

  useFrame((_, delta) => {
    const target = hovered ? 0.55 : 0.08;
    const factor = Math.min(delta * 8, 1);
    stoneMatRefs.current.forEach((mat) => {
      if (!mat) return;
      mat.emissiveIntensity = lerp(mat.emissiveIntensity, target, factor);
    });
  });

  return (
    <group
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
      {LORONG_STONE_DEFS.map((s, i) => (
        <mesh
          key={`lm-${i}`}
          position={s.pos}
          rotation={[0, s.rot, 0]}
        >
          <cylinderGeometry args={[s.r, s.r * 1.05, 0.12, 8]} />
          <meshStandardMaterial
            ref={(m) => {
              stoneMatRefs.current[i] = m;
            }}
            color="#7a6a52"
            emissive="#f4c478"
            emissiveIntensity={0.08}
            roughness={0.9}
          />
        </mesh>
      ))}
      {/* Hit-area volume — invisible box ngecover seluruh path. Mobile
          dimensions dilebarin biar thumb-friendly (1.2 → 2.0 wide). */}
      <mesh position={[0, 0.4, 4]} visible={false}>
        <boxGeometry args={isMobile ? [2.2, 1.5, 7.5] : [1.2, 0.8, 7]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Visited halo — flat ring sepanjang path saat udah dikunjungi.
          Ngasih hint "kamu udah masuk ke sini sebelumnya". */}
      {visited && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 4]}>
          <ringGeometry args={[1.3, 1.5, 32]} />
          <meshStandardMaterial
            color="#fff5c8"
            emissive="#f4d870"
            emissiveIntensity={0.45}
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>
      )}
      <Html
        position={[0, 0.7, 4]}
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
            className={`text-[11px] font-medium tracking-wide transition-colors ${
              hovered ? 'text-white' : 'text-white/80'
            }`}
          >
            Konstelasi Perjalanan
          </div>
          <div
            className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
              hovered ? 'text-amber-200/85' : 'text-white/55'
            }`}
          >
            Lorong Masuk
          </div>
        </div>
      </Html>
    </group>
  );
};

// PetaTelaga — petak r3 di sisi barat peta (x=-7). Visual disc/pond
// (kolam bulat dengan rim stone-like). Punya 3 state berdasarkan tree
// support count:
//   locked   (count < 4000) — muted gray surface + lock cube center
//   drought  (4000-5999)    — cracked dirt bed + 4 retak radial
//   restored (>=6000)       — water blue + lotus mound + emissive pulse
const PetaTelaga = ({
  hovered,
  visited = false,
  isMobile = false,
  petakState = 'locked',
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const surfaceMatRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetY = hovered && petakState !== 'locked' ? 0.25 : 0;
      const factor = Math.min(delta * 8, 1);
      groupRef.current.position.y = lerp(
        groupRef.current.position.y,
        targetY,
        factor
      );
    }
    if (surfaceMatRef.current && petakState === 'restored') {
      const t = state.clock.elapsedTime;
      surfaceMatRef.current.emissiveIntensity = 0.18 + Math.sin(t * 0.5) * 0.08;
    }
  });

  const surfaceColor =
    petakState === 'restored'
      ? '#3a6485'
      : petakState === 'drought'
      ? '#4a3525'
      : '#3a3530';
  const surfaceEmissive = petakState === 'restored' ? '#4a8aa8' : '#000000';
  const baseOpacity = petakState === 'locked' ? 0.55 : 1;

  const sublabel =
    petakState === 'locked'
      ? 'Belum terbuka'
      : petakState === 'drought'
      ? 'Telaga kering'
      : 'Telaga pulih';

  return (
    <group
      ref={groupRef}
      position={[-7, 0, -1]}
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
      {/* Mobile tap-target — larger invisible cylinder */}
      <mesh position={[0, 0.5, 0]} visible={false}>
        <cylinderGeometry args={[isMobile ? 2.3 : 1.7, isMobile ? 2.3 : 1.7, 1.5, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visited halo — ring di base saat petak udah dikunjungi */}
      {visited && petakState !== 'locked' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[1.8, 2.05, 32]} />
          <meshStandardMaterial
            color={petakState === 'restored' ? '#a8c8e0' : '#e0c098'}
            emissive={petakState === 'restored' ? '#5a8aa8' : '#a87060'}
            emissiveIntensity={0.45}
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Disc rim — stone border around telaga */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.6, 1.7, 0.3, 32]} />
        <meshStandardMaterial
          color="#5a4a38"
          roughness={1}
          transparent
          opacity={baseOpacity}
        />
      </mesh>
      {/* Inner surface — water (restored) / cracked bed (drought) / muted (locked) */}
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.02, 32]} />
        <meshStandardMaterial
          ref={surfaceMatRef}
          color={surfaceColor}
          emissive={surfaceEmissive}
          emissiveIntensity={petakState === 'restored' ? 0.2 : 0}
          roughness={petakState === 'restored' ? 0.4 : 1}
          metalness={petakState === 'restored' ? 0.2 : 0}
          transparent
          opacity={baseOpacity}
        />
      </mesh>

      {/* Center detail per state */}
      {petakState === 'restored' && (
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial
            color="#f4c8d8"
            emissive="#e09bb0"
            emissiveIntensity={0.35}
            roughness={0.6}
          />
        </mesh>
      )}
      {petakState === 'drought' &&
        [0, 1, 2, 3].map((i) => (
          <mesh
            key={`crack-${i}`}
            position={[
              Math.cos((i * Math.PI) / 2) * 0.55,
              0.325,
              Math.sin((i * Math.PI) / 2) * 0.55,
            ]}
            rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2 + 0.3]}
          >
            <planeGeometry args={[0.7, 0.04]} />
            <meshStandardMaterial color="#2a1a10" roughness={1} />
          </mesh>
        ))}
      {petakState === 'locked' && (
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.2, 0.18, 0.1]} />
          <meshStandardMaterial color="#5a5048" roughness={1} />
        </mesh>
      )}

      <Html position={[0, 0.95, 0]} center distanceFactor={10} occlude={false}>
        <div
          className={`text-center pointer-events-none select-none whitespace-nowrap transition-all duration-300 ease-out ${
            hovered && petakState !== 'locked' ? '-translate-y-1' : ''
          }`}
        >
          <div
            className={`text-[11px] font-medium tracking-wide transition-colors ${
              petakState === 'locked'
                ? 'text-white/45'
                : hovered
                ? 'text-white'
                : 'text-white/80'
            }`}
          >
            Telaga Harapan
          </div>
          <div
            className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
              petakState === 'locked'
                ? 'text-white/30'
                : hovered
                ? 'text-amber-200/85'
                : 'text-white/55'
            }`}
          >
            {sublabel}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Lantai taman — plane besar tone twilight evening (bukan dark museum
// hall) dengan grid tipis untuk persepsi skala. Tone biru-warm yang
// muncul saat senja: matahari masih nyentuh sedikit di langit, tanah
// pelan-pelan teduh. Pas untuk setting "taman di waktu senja".
const TamanFloor = () => (
  <>
    {/* Dark warm sandy floor — bukan blue museum, base buat desert dusk */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#2a2018" roughness={1} />
    </mesh>
    <gridHelper
      args={[40, 40, '#3a2c22', '#2a2018']}
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
// DroughtRing — sand wasteland surrounding the oasis. Desert dusk
// palette: outer ring deep amber-sand, inner ring sun-bleached
// lighter, patches dry-amber. Pemulihan muncul lewat saplings +
// wildflowers yg tumbuh DI ANTARA, bukan ngubah desert itu sendiri.
const DroughtRing = () => (
  <>
    {/* Outer drought ring — sandy amber, deep tone supaya kerasa
        wasteland tapi warm (bukan earth-cool brown) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <ringGeometry args={[9.5, 19, 64]} />
      <meshStandardMaterial color="#5a3520" roughness={1} />
    </mesh>
    {/* Inner gradient ring — sun-bleached lighter sand */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
      <ringGeometry args={[9.5, 11.5, 64]} />
      <meshStandardMaterial
        color="#7a5535"
        roughness={1}
        transparent
        opacity={0.75}
      />
    </mesh>
    {/* Scattered dry patches — bleached sand spots in outer ring */}
    {DROUGHT_PATCH_DEFS.map((p, i) => (
      <mesh
        key={`dp-${i}`}
        rotation={[-Math.PI / 2, 0, p.rot]}
        position={p.pos}
        scale={p.scale}
      >
        <circleGeometry args={[0.5, 8]} />
        <meshStandardMaterial color="#8a6535" roughness={1} />
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

// TreeLightCone — vertical light cone dari sky pointing down ke pohon
// kebaikan, kerasa kayak "sacred light" / overhead spotlight di focal
// point. Subtle opacity pulse.
const TreeLightCone = () => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.07 + Math.sin(t * 0.45) * 0.025;
  });
  return (
    <mesh position={[0, 7, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[2.8, 12, 18, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color="#fff5c8"
        transparent
        opacity={0.07}
        side={2}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

// Dust haze sheets di langit (previously "aurora") — 3 elongated planes
// tilted di sky high, warm desert dust tones (amber, coral, rose).
// Slow horizontal drift + opacity pulse, kerasa kayak hazy heat
// shimmer + sand dust di horizon. Di belakang silhouette ruins.
const AURORA_DEFS = [
  { pos: [-2, 12, -18], rotX: -Math.PI / 3.2, w: 22, h: 3.5, color: '#e8b07a', phase: 0 },
  { pos: [5, 11, -15], rotX: -Math.PI / 3.5, w: 18, h: 3, color: '#d97a6a', phase: 1.5 },
  { pos: [-6, 13, -20], rotX: -Math.PI / 3, w: 26, h: 4, color: '#c87a8a', phase: 3 },
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

// HoverTrail — 5 traveling dots dari center tree ke petak yg di-hover,
// staggered phase supaya kerasa kontinyu flow. Match petak color.
// "Path of attention" — visual cue arah pandang user.
const HoverTrail = ({ petak }) => {
  const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
  const dotRefs = useRef([]);
  const dotMatRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    dotRefs.current.forEach((ref, i) => {
      if (!ref || !dotMatRefs.current[i]) return;
      const cycle = ((t * 0.55) + i * 0.18) % 1;
      ref.position.x = px * cycle;
      ref.position.z = pz * cycle;
      // Bell-curve opacity — full di tengah, fade di edges
      dotMatRefs.current[i].opacity = Math.sin(cycle * Math.PI) * 0.9;
    });
  });
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`htrail-${i}`}
          ref={(el) => {
            dotRefs.current[i] = el;
          }}
          position={[0, 0.18, 0]}
        >
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshBasicMaterial
            ref={(el) => {
              dotMatRefs.current[i] = el;
            }}
            color={petak.color}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
};

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

// Ruined-city silhouettes di horizon — pillar, broken column, arch,
// tower, wall, distributed di luar drought ring (radius 22-30). Kasih
// sense "dunia luar = sisa peradaban yg runtuh, taman ini oasis di
// tengahnya". Tone deep dusky rose/plum supaya recede ke fog. Mixed
// shapes biar gak monotone — 14 ruins, 5 type variant deterministic.
const RUIN_TYPES = ['pillar', 'broken_column', 'arch', 'tower', 'wall'];
const RUIN_COLORS = ['#3a2535', '#2e2030', '#4a3540'];
const RUIN_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + ((i * 19) % 9) * 0.07;
    const r = 22 + ((i * 13) % 8);
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      type: RUIN_TYPES[i % RUIN_TYPES.length],
      height: 2.2 + ((i * 11) % 6) * 0.55,
      width: 0.45 + ((i * 7) % 4) * 0.18,
      color: RUIN_COLORS[(i * 5) % RUIN_COLORS.length],
      rot: ((i * 23) % 360) * (Math.PI / 180),
    });
  }
  return arr;
})();

const Ruin = ({ pos, type, height, width, color, rot }) => {
  let body = null;
  switch (type) {
    case 'pillar': {
      body = (
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[width * 0.55, width * 0.7, height, 8]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      );
      break;
    }
    case 'broken_column': {
      const colH = height * 0.7;
      body = (
        <>
          <mesh position={[0, colH / 2, 0]}>
            <cylinderGeometry args={[width * 0.55, width * 0.7, colH, 8]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          {/* Jagged broken top — tilted slab */}
          <mesh position={[0, colH + 0.12, 0]} rotation={[0.3, 0, 0.22]}>
            <boxGeometry args={[width * 1.4, 0.28, width * 1.4]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </>
      );
      break;
    }
    case 'arch': {
      const span = width * 3;
      const pH = height * 0.8;
      const pR = width * 0.42;
      body = (
        <>
          <mesh position={[-span / 2, pH / 2, 0]}>
            <cylinderGeometry args={[pR, pR * 1.1, pH, 8]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[span / 2, pH / 2, 0]}>
            <cylinderGeometry args={[pR, pR * 1.1, pH, 8]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          {/* Lintel — bridging top */}
          <mesh position={[0, pH + 0.22, 0]}>
            <boxGeometry args={[span + pR * 2.2, 0.42, pR * 1.6]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </>
      );
      break;
    }
    case 'tower': {
      const tw = width * 1.5;
      const tH = height * 0.9;
      body = (
        <>
          <mesh position={[0, tH / 2, 0]}>
            <boxGeometry args={[tw, tH, tw]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          {/* Crown — smaller stacked box, eroded look */}
          <mesh position={[0, tH + 0.32, 0]}>
            <boxGeometry args={[tw * 0.72, 0.6, tw * 0.72]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </>
      );
      break;
    }
    case 'wall': {
      const wW = width * 4;
      const wH = height * 0.55;
      body = (
        <>
          <mesh position={[0, wH / 2, 0]}>
            <boxGeometry args={[wW, wH, width * 0.5]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          {/* Broken higher segment di salah satu sisi */}
          <mesh position={[-wW / 3, wH + 0.28, 0]}>
            <boxGeometry args={[wW * 0.32, 0.55, width * 0.5]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </>
      );
      break;
    }
    default:
      return null;
  }
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {body}
    </group>
  );
};

const CityRuins = ({ isMobile = false }) => {
  // Mobile cull: 14 → 8 ruins (entries paling kerasa di silhouette)
  const list = isMobile ? RUIN_DEFS.slice(0, 8) : RUIN_DEFS;
  return (
    <>
      {list.map((r, i) => (
        <Ruin key={`ruin-${i}`} {...r} />
      ))}
    </>
  );
};

// Stone path — 4 flat oval stones per spoke, dari center ke tiap
// petak position. 6 spokes total = 24 stones. Kasih visual koneksi
// "ini hub", path menjari ke 6 petak. Tiap stone punya emissive wave
// yg propagate dari center keluar — kerasa "path memandu, hidup".
const StonePath = ({ petakList, visitedSet }) => (
  <>
    {petakList.flatMap((petak) => {
      const [px, pz] = polarToXZ(petak.angle, HEX_RADIUS);
      const visited = visitedSet?.has(petak.id) ?? false;
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
            visited={visited}
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

// Wooden bench — rest spot di taman, kasih kerasa "safe place" /
// sanctuary. Sederhana 4 element: seat plank + back rest + 3 slats +
// 2 legs. Wood brown tones.
const WoodenBench = ({ position = [3.5, 0, -1.8], rotation = [0, -Math.PI / 2.5, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Seat plank */}
    <mesh position={[0, 0.32, 0]}>
      <boxGeometry args={[1.3, 0.07, 0.3]} />
      <meshStandardMaterial color="#7a5530" roughness={0.95} />
    </mesh>
    {/* Back rest panel — tilt slightly */}
    <mesh position={[0, 0.58, -0.13]} rotation={[-0.12, 0, 0]}>
      <boxGeometry args={[1.3, 0.42, 0.04]} />
      <meshStandardMaterial color="#6a4a2d" roughness={0.95} />
    </mesh>
    {/* Back rest vertical slats — 3 spaced */}
    {[-0.42, 0, 0.42].map((dx, i) => (
      <mesh key={`slat-${i}`} position={[dx, 0.55, -0.13]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.05, 0.36, 0.04]} />
        <meshStandardMaterial color="#5a3e25" roughness={0.95} />
      </mesh>
    ))}
    {/* Left + right legs */}
    {[-0.55, 0.55].map((dx, i) => (
      <mesh key={`leg-${i}`} position={[dx, 0.16, 0]}>
        <boxGeometry args={[0.07, 0.32, 0.28]} />
        <meshStandardMaterial color="#5a3e25" roughness={0.95} />
      </mesh>
    ))}
    {/* Subtle drop shadow */}
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.5, 0.6]} />
      <meshBasicMaterial color="#0a0d14" transparent opacity={0.32} depthWrite={false} />
    </mesh>
  </group>
);

// Path lantern — wooden post dgn lampu kaca + flame glow flicker.
// Scattered di 3 spot antara petak utk warm atmosphere.
const PathLantern = ({ position }) => {
  const flameRef = useRef();
  const haloRef = useRef();
  useFrame((state) => {
    if (!flameRef.current || !haloRef.current) return;
    const t = state.clock.elapsedTime;
    // Flicker via phase shift dari posisi
    const seed = position[0] * 3 + position[2] * 5;
    flameRef.current.emissiveIntensity = 1.4 + Math.sin(t * 4 + seed) * 0.45;
    haloRef.current.material.opacity = 0.16 + Math.sin(t * 4 + seed) * 0.05;
  });
  return (
    <group position={position}>
      {/* Post */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.1, 6]} />
        <meshStandardMaterial color="#3a2415" roughness={1} />
      </mesh>
      {/* Lantern body frame — dark cube */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.2, 0.26, 0.2]} />
        <meshStandardMaterial color="#1a0e08" roughness={1} />
      </mesh>
      {/* Glass center + flame */}
      <mesh ref={flameRef} position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.085, 10, 8]} />
        <meshStandardMaterial
          color="#fff2c8"
          emissive="#f9c66a"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      {/* Glow halo */}
      <mesh ref={haloRef} position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.42, 14, 10]} />
        <meshBasicMaterial
          color="#f9c66a"
          transparent
          opacity={0.16}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 1.37, 0]}>
        <boxGeometry args={[0.24, 0.04, 0.24]} />
        <meshStandardMaterial color="#3a2415" roughness={1} />
      </mesh>
      {/* Top pointed roof */}
      <mesh position={[0, 1.46, 0]}>
        <coneGeometry args={[0.14, 0.13, 4]} />
        <meshStandardMaterial color="#2a1810" roughness={1} />
      </mesh>
    </group>
  );
};

const LANTERN_POSITIONS = (() => {
  const arr = [];
  // 3 lanterns at midpoints antara petak — angles 60/180/300
  [60, 180, 300].forEach((deg) => {
    const rad = (deg * Math.PI) / 180;
    arr.push([Math.cos(rad) * 4.5, 0, Math.sin(rad) * 4.5]);
  });
  return arr;
})();
const PathLanterns = () => (
  <>
    {LANTERN_POSITIONS.map((p, i) => (
      <PathLantern key={`lantern-${i}`} position={p} />
    ))}
  </>
);

// Ground mist particles — soft drifting points di low altitude (0.2-0.8y)
// di sekitar oasis (radius 13). Warm cream tone supaya nyambung sama
// desert dusk palette (bukan cool blue mist). Sebagian besar "mist"-nya
// dari water/wishes di petak r3 (Telaga Harapan), jadi tetap masuk akal
// punya mist tipis di taman tengah.
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
        color="#d8c8b0"
        transparent
        opacity={0.18}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Sand dust particles — desert wind blowing across the wider scene.
// Lebih luas (radius spread ~22) + lebih banyak (~80 desktop) dari mist,
// drift uni-directional (simulasi wind dari satu arah), low altitude
// (0.1-1.3y) supaya kerasa sand drifting ground-level. Tone warm tan,
// medium opacity supaya kerasa hazy haze tapi belum jadi sandstorm
// (kalau mau intens, naikin opacity & count nanti).
const SandDust = ({ count = 80 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 44;
      arr[i * 3 + 1] = 0.1 + Math.random() * 1.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    return arr;
  }, [count]);
  // Drift uni-directional (wind from -X toward +X) + tiny Z jitter +
  // tiny Y bob supaya gak kerasa flat scrolling.
  const drifts = useMemo(() => {
    const arr = new Float32Array(count * 3); // [vx, vy, vz]
    for (let i = 0; i < count; i++) {
      arr[i * 3] = 0.12 + Math.random() * 0.08; // strong horizontal wind
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    return arr;
  }, [count]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += drifts[i * 3] * delta * 60;
      arr[i * 3 + 1] += drifts[i * 3 + 1] * delta * 60;
      arr[i * 3 + 2] += drifts[i * 3 + 2] * delta * 60;
      // Wrap horizontal — kalau lewat batas kanan, lompat ke kiri
      if (arr[i * 3] > 22) arr[i * 3] = -22;
      if (arr[i * 3 + 2] > 22) arr[i * 3 + 2] = -22;
      if (arr[i * 3 + 2] < -22) arr[i * 3 + 2] = 22;
      // Clamp altitude supaya tetap di low layer
      if (arr[i * 3 + 1] < 0.05) arr[i * 3 + 1] = 1.3;
      if (arr[i * 3 + 1] > 1.4) arr[i * 3 + 1] = 0.1;
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
        size={0.55}
        color="#c89568"
        transparent
        opacity={0.22}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// High dust shimmer — sky-level (3-7y altitude) warm rose particles,
// drift lebih pelan, lebih sparse. Kasih sense of "air berdebu di
// atmosfer", melengkapi sand dust ground-level. Reinforces depth.
const HighDustShimmer = ({ count = 40 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = 3 + Math.random() * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, [count]);
  const drifts = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      arr[i * 2] = 0.04 + Math.random() * 0.03;
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.01;
    }
    return arr;
  }, [count]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += drifts[i * 2] * delta * 60;
      arr[i * 3 + 2] += drifts[i * 2 + 1] * delta * 60;
      if (arr[i * 3] > 20) arr[i * 3] = -20;
      if (arr[i * 3 + 2] > 20) arr[i * 3 + 2] = -20;
      if (arr[i * 3 + 2] < -20) arr[i * 3 + 2] = 20;
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
        size={0.7}
        color="#d8a890"
        transparent
        opacity={0.14}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
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
// Visited petak path stones dapat emissive baseline lebih kuat
// (kerasa "path udah dijalani / lit up").
const PathStone = ({ position, rotation, radius, stoneIdx, visited = false }) => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    const phase = stoneIdx * 0.7;
    const pulse = Math.max(0, Math.sin(t * 1.1 - phase) * 0.5 + 0.5);
    // Visited: 2× boost intensity + base offset, kerasa terang konstan
    const base = visited ? 0.25 : 0;
    const peak = visited ? 1.1 : 0.55;
    matRef.current.emissiveIntensity = base + pulse * peak;
  });
  return (
    <mesh position={position} rotation={rotation}>
      <circleGeometry args={[radius, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color={visited ? '#8a8e9a' : '#6a6e7a'}
        emissive={visited ? '#f4d088' : '#c9a961'}
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
// Dead trees — ALWAYS visible (user suka aesthetic gurun rusak).
const DeadTrees = ({ isMobile = false }) => (isMobile ? DEAD_TREE_DEFS.slice(0, 5) : DEAD_TREE_DEFS).map((d, i) => (
  <DeadTree key={`dt-${i}`} {...d} />
));

// Recovering saplings — tumbuh di posisi BARU di drought ring (offset
// dari dead trees, gak replacing them). N visible tergantung restoration
// level. Each sapling = small new tree dgn foliage hijau.
// Growth animation: scale 0 → target dgn overshoot bounce (1.2s) saat
// first mount. Kerasa "baru tumbuh" momentum.
const RecoveringSapling = ({ pos, rot, scale }) => {
  const groupRef = useRef();
  const startTimeRef = useRef(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const duration = 1.2;
    let s;
    if (elapsed < duration) {
      const t = elapsed / duration;
      const eased = 1 - Math.pow(1 - t, 3);
      // Overshoot bounce — peak ~1.15× di tengah
      const bounce = 1 + Math.sin(t * Math.PI) * 0.18;
      s = scale * eased * bounce;
    } else {
      // Subtle idle sway after grown
      const idle = (state.clock.elapsedTime - startTimeRef.current - duration) * 1.2;
      s = scale * (1 + Math.sin(idle) * 0.015);
    }
    groupRef.current.scale.setScalar(s);
  });
  return (
    <group ref={groupRef} position={pos} rotation={[0, rot, 0]} scale={0}>
      {/* Small trunk */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.65, 6]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Main foliage cluster */}
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.38, 12, 8]} />
        <meshStandardMaterial color="#86a868" roughness={0.7} />
      </mesh>
      {/* Side leaves utk variation */}
      <mesh position={[0.16, 0.88, 0.08]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color="#94b878" roughness={0.7} />
      </mesh>
      <mesh position={[-0.14, 0.68, -0.08]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#7a9d5e" roughness={0.75} />
      </mesh>
    </group>
  );
};
const SAPLING_SLOT_DEFS = (() => {
  const arr = [];
  // 6 sapling slots — angles offset 20° dari dead tree angles
  // supaya gak nimpa. Radius 12-15 (dalam drought ring).
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.35; // 20° offset
    const r = 12.5 + ((i * 13) % 5);
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      rot: ((i * 31) % 360) * (Math.PI / 180),
      scale: 0.55 + ((i * 17) % 5) * 0.1,
    });
  }
  return arr;
})();
const RecoveringSaplings = ({ restorationLevel = 0 }) => {
  // Show floor(restorationLevel * total) saplings, in order
  const visibleCount = Math.floor(restorationLevel * SAPLING_SLOT_DEFS.length);
  return (
    <>
      {SAPLING_SLOT_DEFS.slice(0, visibleCount).map((s, i) => (
        <RecoveringSapling key={`sap-${i}`} {...s} />
      ))}
    </>
  );
};

// RestorationCelebration — visual burst saat user mencapai 100%
// pemulihan (semua 6 bab dijelajahi). 24 particles meletup radial dari
// pusat tree, fade out, plus halo glow expand.
const CELEBRATION_PARTICLE_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 24; i++) {
    const theta = (i / 24) * Math.PI * 2;
    const phi = ((i * 13) % 7) * 0.1 + 0.4; // vertical spread
    const distance = 7 + ((i * 11) % 5);
    arr.push({
      dirX: Math.cos(theta) * Math.cos(phi) * distance,
      dirY: Math.sin(phi) * distance * 0.5,
      dirZ: Math.sin(theta) * Math.cos(phi) * distance,
      colorIdx: i % 4,
    });
  }
  return arr;
})();
const CELEBRATION_COLORS = ['#fff5c8', '#f4a8c0', '#86d68a', '#a8c0ff'];
const RestorationCelebration = () => {
  const groupRef = useRef();
  const haloRef = useRef();
  const startRef = useRef(null);
  const particleRefs = useRef([]);
  const particleMatRefs = useRef([]);
  useFrame((state) => {
    if (startRef.current === null) {
      startRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - startRef.current;
    // Particle burst phase (0-3s), then idle loop fade in/out
    if (haloRef.current && haloRef.current.material) {
      const t = state.clock.elapsedTime;
      haloRef.current.material.opacity = 0.18 + Math.sin(t * 0.6) * 0.08;
    }
    particleRefs.current.forEach((ref, i) => {
      if (!ref || !particleMatRefs.current[i]) return;
      const def = CELEBRATION_PARTICLE_DEFS[i];
      const phase = (elapsed + i * 0.08) % 5;
      const t = Math.min(1, phase / 3);
      ref.position.x = def.dirX * t;
      ref.position.y = 1.5 + def.dirY * t - t * t * 1.5; // gravity arc
      ref.position.z = def.dirZ * t;
      particleMatRefs.current[i].opacity = Math.max(0, 1 - t);
    });
  });
  return (
    <group ref={groupRef}>
      {/* Wide glow halo at center */}
      <mesh ref={haloRef} position={[0, 1.5, 0]}>
        <sphereGeometry args={[5, 24, 16]} />
        <meshBasicMaterial
          color="#fff5c8"
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Looping particle bursts */}
      {CELEBRATION_PARTICLE_DEFS.map((def, i) => (
        <mesh
          key={`celp-${i}`}
          ref={(el) => {
            particleRefs.current[i] = el;
          }}
          position={[0, 1.5, 0]}
        >
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshBasicMaterial
            ref={(el) => {
              particleMatRefs.current[i] = el;
            }}
            color={CELEBRATION_COLORS[def.colorIdx]}
            transparent
            opacity={1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// Wildflower patches — small color dot clusters yg bloom di drought
// ring saat restoration grows. 6 patches, 1 per restoration step.
const WILDFLOWER_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.85;
    const r = 13 + ((i * 11) % 4);
    const baseX = Math.cos(angle) * r;
    const baseZ = Math.sin(angle) * r;
    const colors = ['#f4a8c0', '#fae0a0', '#a890c8', '#f4c870', '#d68aa8', '#fff0e0'];
    arr.push({
      pos: [baseX, 0.014, baseZ],
      color: colors[i % colors.length],
    });
  }
  return arr;
})();
const BloomingFlower = ({ position, color, delay }) => {
  const ref = useRef();
  const startRef = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    if (startRef.current === null) {
      startRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - startRef.current - delay;
    if (elapsed < 0) {
      ref.current.scale.setScalar(0);
      return;
    }
    const duration = 0.9;
    if (elapsed < duration) {
      const t = elapsed / duration;
      // cubic ease-out + overshoot bounce
      const eased = 1 - Math.pow(1 - t, 3);
      const bounce = 1 + Math.sin(t * Math.PI) * 0.22;
      ref.current.scale.setScalar(eased * bounce);
    } else {
      // Subtle sway after bloom
      const idle = elapsed - duration;
      ref.current.scale.setScalar(1 + Math.sin(idle * 1.5) * 0.04);
    }
  });
  return (
    <mesh ref={ref} position={position} scale={0}>
      <sphereGeometry args={[0.085, 8, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.18}
        roughness={0.55}
      />
    </mesh>
  );
};
const Wildflowers = ({ restorationLevel = 0 }) => {
  const visibleCount = Math.floor(restorationLevel * WILDFLOWER_DEFS.length);
  const FLOWER_OFFSETS = [
    [0, 0.05, 0],
    [0.25, 0.04, 0.1],
    [-0.2, 0.04, 0.18],
    [0.1, 0.05, -0.22],
    [-0.18, 0.04, -0.1],
  ];
  return (
    <>
      {WILDFLOWER_DEFS.slice(0, visibleCount).map((w, i) => (
        <group key={`wf-${i}`} position={w.pos}>
          {FLOWER_OFFSETS.map((offset, j) => (
            <BloomingFlower
              key={`wf-${i}-${j}`}
              position={offset}
              color={w.color}
              delay={j * 0.13}
            />
          ))}
        </group>
      ))}
    </>
  );
};

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

// Shooting star — hero moment yg streaks across sky periodically.
// Idle 12-37s antar shoot, active ~1.8s saat lewat. Trail dibentuk
// dari 8 sphere yg stack di local -X, opacity & scale decay ke tail.
// Group rotated around Y supaya trail align sama motion direction.
// Bloom postprocessing nge-amplify cahayanya jadi "sinematik magis".
const SHOOTING_STAR_SEGMENTS = 8;
const SHOOTING_STAR_DURATION = 1.8;
const ShootingStar = () => {
  const groupRef = useRef();
  const stateRef = useRef({
    active: false,
    t0: 0,
    // First shoot fires ~5-8s after fly-in begins
    nextAt: 5 + Math.random() * 3,
    start: [0, 0, 0],
    end: [0, 0, 0],
    angle: 0,
  });

  useFrame((state) => {
    const s = stateRef.current;
    const t = state.clock.elapsedTime;
    if (!s.active) {
      if (t >= s.nextAt) {
        // Plan a new path across sky perimeter
        const startAngle = Math.random() * Math.PI * 2;
        const endAngle = startAngle + Math.PI + (Math.random() - 0.5) * 1.2;
        const startR = 22 + Math.random() * 6;
        const endR = 22 + Math.random() * 6;
        const startY = 11 + Math.random() * 5;
        const endY = startY - 2 - Math.random() * 3;
        s.start = [
          Math.cos(startAngle) * startR,
          startY,
          Math.sin(startAngle) * startR,
        ];
        s.end = [
          Math.cos(endAngle) * endR,
          endY,
          Math.sin(endAngle) * endR,
        ];
        const dx = s.end[0] - s.start[0];
        const dz = s.end[2] - s.start[2];
        s.angle = Math.atan2(dz, dx);
        s.t0 = t;
        s.active = true;
        if (groupRef.current) groupRef.current.visible = true;
      }
      return;
    }
    const u = (t - s.t0) / SHOOTING_STAR_DURATION;
    if (u >= 1) {
      s.active = false;
      s.nextAt = t + 12 + Math.random() * 25;
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (!groupRef.current) return;
    groupRef.current.position.set(
      lerp(s.start[0], s.end[0], u),
      lerp(s.start[1], s.end[1], u),
      lerp(s.start[2], s.end[2], u),
    );
    groupRef.current.rotation.y = -s.angle;
  });

  const segments = useMemo(() => {
    const arr = [];
    for (let i = 0; i < SHOOTING_STAR_SEGMENTS; i++) {
      const tnorm = i / (SHOOTING_STAR_SEGMENTS - 1);
      arr.push({
        idx: i,
        offset: -i * 0.28,
        scale: 1 - tnorm * 0.82,
        opacity: 1 - tnorm * 0.95,
      });
    }
    return arr;
  }, []);

  return (
    <group ref={groupRef} visible={false}>
      {segments.map((seg) => (
        <mesh
          key={`ss-${seg.idx}`}
          position={[seg.offset, 0, 0]}
          scale={seg.scale}
        >
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshBasicMaterial
            color="#fff8e8"
            transparent
            opacity={seg.opacity}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
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
  hoveredGerbang,
  hoveredLorong,
  hoveredTelaga,
  previewedPetak,
  flyInActive,
  isMobile = false,
  restorationLevel = 0,
  modalOpen = false,
  telagaState = 'locked',
  onFlyInComplete,
  onPetakHover,
  onPetakOut,
  onPetakClick,
  onCenterHover,
  onCenterOut,
  onCenterClick,
  onGerbangHover,
  onGerbangOut,
  onGerbangClick,
  onLorongHover,
  onLorongOut,
  onLorongClick,
  onTelagaHover,
  onTelagaOut,
  onTelagaClick,
}) => {
  const controlsRef = useRef();
  const idleTimerRef = useRef();
  const [autoRotate, setAutoRotate] = useState(false);
  // Pause auto-rotate kalau user lagi hover petak — kerasa weird kalau
  // kamera bergerak sambil user fokus baca label.
  const userIsHovering =
    Boolean(hoveredPetakId) ||
    hoveredCenter ||
    hoveredGerbang ||
    hoveredLorong ||
    hoveredTelaga;

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
      {/* Desert dusk palette — warm dusty rose horizon fading into deep
          plum zenith. Sun udah baru tenggelam, langit masih simpen sisa
          warmth. */}
      <fog attach="fog" args={['#5a3540', 14, 38]} />
      <color attach="background" args={['#2a1f25']} />
      {/* Ambient — turunin sedikit + tone shift ke warm-gray (bukan rosy).
          Drought peta = "siang berdebu di kota mati", bukan twilight ramah. */}
      <ambientLight intensity={0.42} color="#c0a090" />
      {/* Key light — sun lebih lemah dikit, warna geser ke amber pucat
          biar kerasa "matahari nembus debu", bukan golden hour cozy. */}
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.2}
        color="#f4b078"
      />
      {/* Fill — warm dusty, intensity dikit naik biar shadow side
          object (ruins, dead trees) tetep keliatan, gak hitam mati. */}
      <directionalLight
        position={[-6, 8, -4]}
        intensity={0.6}
        color="#b8907a"
      />
      <TamanFloor />
      <DroughtRing />
      {/* Dead-town environment re-enabled — CityRuins di luar hex ring
          (siluet kota runtuh), DeadTrees scattered (sisa hutan mati),
          SandDust + HighDustShimmer (debu beterbangan = kerasa angin
          gersang), Stars + Moon (langit malam atas kota mati). Aurora
          + Fireflies + BirdsFlock + LilyPond sengaja di-skip — terlalu
          alive untuk vibe "tempat tidak layak huni". */}
      <CityRuins isMobile={isMobile} />
      <DeadTrees isMobile={isMobile} />
      <SandDust count={isMobile ? 50 : 100} />
      {!isMobile && <HighDustShimmer count={40} />}
      <Stars count={isMobile ? 50 : 90} />
      <Moon />
      <CenterTree
        hovered={hoveredCenter}
        visited={previewedPetak.has('pohon')}
        isMobile={isMobile}
        onPointerOver={onCenterHover}
        onPointerOut={onCenterOut}
        onClick={onCenterClick}
      />
      <PetaGerbang
        hovered={hoveredGerbang}
        visited={previewedPetak.has('gerbang')}
        isMobile={isMobile}
        onPointerOver={onGerbangHover}
        onPointerOut={onGerbangOut}
        onClick={onGerbangClick}
      />
      <PetaLorongMasuk
        hovered={hoveredLorong}
        visited={previewedPetak.has('lorong')}
        isMobile={isMobile}
        onPointerOver={onLorongHover}
        onPointerOut={onLorongOut}
        onClick={onLorongClick}
      />
      <PetaTelaga
        hovered={hoveredTelaga}
        visited={previewedPetak.has('telaga')}
        isMobile={isMobile}
        petakState={telagaState}
        onPointerOver={onTelagaHover}
        onPointerOut={onTelagaOut}
        onClick={onTelagaClick}
      />
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

// Petak metadata buat preview modal — click petak → modal show first,
// "Lanjut" button → actual navigate. Menghindari accidental navigation
// + kasih konteks dulu sebelum user pindah halaman.
const PETA_PETAK_INFO = {
  gerbang: {
    id: 'gerbang',
    name: 'Gerbang',
    eyebrow: 'Pintu Masuk Kota',
    longDesc:
      'Gerbang kayu yang berdiri di tepi Padang Tandus. Lewat sini, peradaban masuk dan keluar dari kota. Sekarang tinggal sisa — pilar kering, kain weathered, dan angin yang membawa debu.',
    cta: 'Lewati gerbang',
    route: '/armeniacaTown',
    accent: '#f4a060',
  },
  lorong: {
    id: 'lorong',
    name: 'Konstelasi Perjalanan',
    eyebrow: 'Lorong Masuk',
    longDesc:
      'Lorong batu yang dulu jadi jalan utama. Di langit malamnya, milestone perjalanan karier Eli berdiri sebagai konstelasi bintang per era. Walau tanah di bawah rusak, cerita di atas tetap utuh.',
    cta: 'Masuki lorong',
    route: '/armeniacaTown/r1',
    accent: '#fff5c8',
  },
  pohon: {
    id: 'pohon',
    name: 'Pohon Terakhir',
    eyebrow: 'Pohon Kebaikan',
    longDesc:
      'Satu pohon aprikot yang masih hidup di pusat kota — penjaga harapan terakhir. Setiap siraman komunitas di sini ikut membangkitkan dunia di sekitarnya, sedikit demi sedikit.',
    cta: 'Siram pohon ini',
    route: '/26',
    accent: '#7aa858',
  },
  // Telaga punya 3 varian copy karena 3 state — pilih varian di handler
  // berdasarkan telagaState computed dari count.
  telagaLocked: {
    id: 'telaga',
    name: 'Telaga Harapan',
    eyebrow: 'Belum terbuka',
    longDesc:
      'Telaga di barat kota ini masih sunyi. Pintu ke sini baru terbuka setelah 4.000 siraman terkumpul di Pohon Kebaikan. Sekarang, kita semua menunggu bersama.',
    cta: 'Siram di /26',
    route: '/26',
    accent: '#9aa0a8',
  },
  telagaDrought: {
    id: 'telaga',
    name: 'Telaga Harapan',
    eyebrow: 'Telaga kering',
    longDesc:
      'Telaga ini dulu penuh teratai, dengan air yang memantulkan langit. Sekarang dasarnya retak, banknya kering, dan teratai-teratai harapan menunggu untuk mekar kembali. Lewat sini untuk melihat sisa peradabannya.',
    cta: 'Lewati telaga',
    route: '/armeniacaTown/r3',
    accent: '#e0c098',
  },
  telagaRestored: {
    id: 'telaga',
    name: 'Telaga Harapan',
    eyebrow: 'Telaga pulih',
    longDesc:
      'Air kembali mengisi telaga, teratai-teratai mekar di permukaan. Tiap teratai = satu harapan dari komunitas. Kebaikan komunal akhirnya menumbuhkan dunia ini sepenuhnya.',
    cta: 'Masuki telaga',
    route: '/armeniacaTown/r3',
    accent: '#a8c8e0',
  },
};

// PetakPreviewModal — info panel yg muncul saat user click petak.
// Show name + description + CTA "Lanjut" yang trigger navigate. Modal
// dismiss via tap luar, button Batal, atau Escape.
const PetakPreviewModal = ({ petak, onClose, onConfirm }) => {
  if (!petak) return null;
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center px-4 py-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="petak-preview-title"
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md max-h-full overflow-y-auto rounded-2xl border border-white/15 bg-[#1c1614]/92 px-5 py-6 sm:px-7 sm:py-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="text-[9px] uppercase tracking-[0.4em] mb-2"
          style={{ color: petak.accent + 'cc' }}
        >
          {petak.eyebrow}
        </div>
        <h3
          id="petak-preview-title"
          className="text-white text-2xl sm:text-3xl mb-4 leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {petak.name}
        </h3>
        <p
          className="text-white/75 text-[12px] sm:text-sm leading-relaxed mb-6"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          {petak.longDesc}
        </p>
        <div className="flex flex-row gap-2 sm:gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/20 text-white/70 text-xs sm:text-sm hover:bg-white/10 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-black text-xs sm:text-sm font-medium hover:bg-white/90 transition"
          >
            {petak.cta} →
          </button>
        </div>
      </div>
    </div>
  );
};

// PetaRestorationIndicator — bottom-center pill yg live-update dari
// RTDB tree_support. Show count, threshold next, percent pulih. Bikin
// user yang udah masuk peta tetep aware sama progress restorasi.
const PetaRestorationIndicator = ({ count, loaded, modalOpen = false }) => {
  if (modalOpen || !loaded) return null;
  const fullRestore = MAP_THRESHOLDS.fullRestore;
  const pct = Math.min(100, (count / fullRestore) * 100);
  const restored = count >= fullRestore;
  const nextLabel = restored
    ? 'Ekosistem pulih sepenuhnya'
    : `Pulih sepenuhnya di ${fullRestore.toLocaleString('id-ID')}`;
  return (
    <div className="pointer-events-none absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[92vw]">
      <div className="flex flex-col items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 shadow-lg">
        <div className="flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] tracking-wider">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            className="text-emerald-300/85 flex-shrink-0"
          >
            <path
              d="M12 3C9 6 7 9 7 13a5 5 0 0010 0c0-4-2-7-5-10z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-white/85">
            {count.toLocaleString('id-ID')}
            <span className="text-white/45"> / {fullRestore.toLocaleString('id-ID')} siraman</span>
          </span>
          <span className="text-amber-200/80 font-medium hidden sm:inline">
            · {Math.round(pct)}% pulih
          </span>
        </div>
        <div className="w-40 sm:w-56 h-px bg-white/15 overflow-hidden rounded-full">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              restored ? 'bg-emerald-300/75' : 'bg-amber-200/65'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-white/45 text-[9px] sm:text-[10px] tracking-wide italic">
          {nextLabel}
        </p>
      </div>
    </div>
  );
};

const TamanHeader = ({ modalOpen = false }) => {
  if (modalOpen) return null;
  return (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-20 md:px-6 md:pt-24 pb-4 md:pb-5">
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
        ArmeniacaTown
      </div>
      <div
        className="text-white/85 text-[13px] md:text-sm tracking-wide"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Peta Kota
      </div>
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/armeniacaTown"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        <span className="md:hidden">Gerbang →</span>
        <span className="hidden md:inline">Ulangi gerbang →</span>
      </Link>
    </div>
  </div>
  );
};

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
      <div className="text-center max-w-md mx-4 sm:mx-6 max-h-full overflow-y-auto px-5 py-5 sm:px-8 sm:py-9 sm:-translate-y-10 rounded-md border border-white/12 bg-[#1c1f2a]/85 backdrop-blur-md shadow-2xl">
        <div className="text-white/55 text-[9px] uppercase tracking-[0.5em] mb-3 sm:mb-4">
          ArmeniacaTown
        </div>
        <p
          className="text-white text-base sm:text-lg md:text-xl leading-relaxed mb-3"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}
        >
          Bencana datang. Padang di luar pun kering.
        </p>
        <div className="mx-auto mb-3 w-10 h-px bg-white/25" />
        <p
          className="text-white/65 text-[11px] sm:text-[12px] md:text-[13px] leading-relaxed"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}
        >
          Tapi di sini — pohon ini menolak gugur,
          <br className="hidden sm:inline" />
          {' '}enam bab kenangan masih bercahaya di sekelilingnya.
          <br className="hidden sm:inline" />
          {' '}Tiap bab yang kau baca menumbuhkan satu pohon
          <br className="hidden sm:inline" />
          {' '}di padang yang rusak. Mulai dari bab pertama.
        </p>
      </div>
    </div>
  );
};

// Count-up hook — tween dari nilai sebelumnya ke target dgn ease-out
// cubic. Cancel pas unmount.
const useCountUp = (target, duration = 700) => {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) {
      setDisplay(to);
      return undefined;
    }
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setDisplay(v);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
};

// RestorationIndicator — UI overlay top-left showing chapter-based
// pemulihan progress. Bar + chapter checklist dots + narrative copy.
// Hidden during fly-in.
const RestorationIndicator = ({ level, chaptersExplored, totalChapters, visitedSet, flyInActive, modalOpen = false }) => {
  // Hooks harus dipanggil sebelum any early return.
  const pctTarget = Math.round(level * 100);
  const animatedPct = useCountUp(pctTarget, 900);
  if (flyInActive || modalOpen) return null;
  const isRecovered = level >= 1;
  return (
    <div className="pointer-events-none absolute top-20 md:top-24 left-4 md:left-6 z-10 max-w-[280px]">
      <div className="bg-[#1c1f2a]/80 backdrop-blur-sm rounded-md border border-white/10 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/65">
            Pemulihan Taman
          </span>
        </div>
        {/* Progress bar — width driven by animated count-up (smooth tween) */}
        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-2.5">
          <div
            className="h-full bg-gradient-to-r from-amber-300 via-emerald-400 to-emerald-300 rounded-full"
            style={{ width: `${Math.max(2, animatedPct)}%` }}
          />
        </div>
        {/* Chapter checklist — 6 dots, filled per visited */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {PETAK.map((petak) => {
            const visited = visitedSet?.has(petak.id);
            return (
              <span
                key={`dot-${petak.id}`}
                className={`relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${
                  visited
                    ? 'bg-emerald-400/20 ring-1 ring-emerald-400/60'
                    : 'bg-white/5 ring-1 ring-white/10'
                }`}
                title={`Bab ${petak.chapter} · ${petak.name}`}
              >
                <span
                  className={`text-[9px] font-black tabular-nums ${
                    visited ? 'text-emerald-300' : 'text-white/35'
                  }`}
                >
                  {petak.chapter}
                </span>
              </span>
            );
          })}
        </div>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-white/85 text-sm font-bold tabular-nums">
            {Math.round(animatedPct)}%
          </span>
          <span className="text-white/45 text-[10px] tracking-wide tabular-nums">
            {chaptersExplored} / {totalChapters} bab
          </span>
        </div>
        <p
          className="text-white/55 text-[11px] leading-relaxed"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {isRecovered
            ? 'Semua bab dijelajahi. Taman pulih.'
            : 'Tiap bab yang kau baca menumbuhkan satu pohon.'}
        </p>
      </div>
    </div>
  );
};

const TamanFooter = ({ hoveredPetakId, flyInActive, previewedCount, modalOpen = false }) => {
  if (modalOpen) return null;
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
  const [searchParams] = useSearchParams();
  const { count: armeniacaCount, loaded: armeniacaLoaded } =
    useArmeniacaProgress();
  const [hoveredPetakId, setHoveredPetakId] = useState(null);
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const [hoveredGerbang, setHoveredGerbang] = useState(false);
  const [hoveredLorong, setHoveredLorong] = useState(false);
  const [hoveredTelaga, setHoveredTelaga] = useState(false);
  const [selectedPetak, setSelectedPetak] = useState(null);
  const [petakPreview, setPetakPreview] = useState(null);
  const [flyInActive, setFlyInActive] = useState(true);

  // Compute telaga visual state dari live count:
  //   <4000 = locked, 4000-5999 = drought, >=6000 = restored
  const telagaState = useMemo(() => {
    if (!armeniacaLoaded) return 'locked';
    if (armeniacaCount >= MAP_THRESHOLDS.fullRestore) return 'restored';
    if (armeniacaCount >= MAP_THRESHOLDS.r3Unlock) return 'drought';
    return 'locked';
  }, [armeniacaCount, armeniacaLoaded]);
  // Set of petak IDs yang udah dibuka overlay-nya. Init dari
  // localStorage (merge new + legacy keys).
  const [previewedPetak, setPreviewedPetak] = useState(() => readPreviewed());

  // Restoration level dari chapter exploration progress — bukan live
  // counter. User dapat baca tiap bab = satu kebaikan ditanam.
  // Override via ?restoration=0.5 utk dev test.
  const restorationLevel = useMemo(() => {
    const override = searchParams.get('restoration');
    if (override !== null) {
      const n = parseFloat(override);
      if (!Number.isNaN(n)) return Math.max(0, Math.min(1, n));
    }
    if (PETAK.length === 0) return 0;
    return Math.min(1, previewedPetak.size / PETAK.length);
  }, [searchParams, previewedPetak]);

  useEffect(() => {
    const showPointer =
      !flyInActive &&
      (hoveredPetakId ||
        hoveredCenter ||
        hoveredGerbang ||
        hoveredLorong ||
        hoveredTelaga);
    document.body.style.cursor = showPointer ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [
    hoveredPetakId,
    hoveredCenter,
    hoveredGerbang,
    hoveredLorong,
    hoveredTelaga,
    flyInActive,
  ]);

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

  // Center tree handlers — pohon aprikot di pusat = "Pohon Terakhir"
  // (naratif peta), tetap link ke modul /26 Pohon Kebaikan.
  const handleCenterHover = () => {
    if (flyInActive) return;
    setHoveredCenter(true);
  };
  const handleCenterOut = () => setHoveredCenter(false);
  const handleCenterClick = () => {
    if (flyInActive) return;
    setPetakPreview(PETA_PETAK_INFO.pohon);
  };

  // Gerbang handlers — petak mini "Gerbang" di selatan pohon, link
  // balik ke /armeniacaTown (Padang Tandus / Pintu Masuk Kota).
  const handleGerbangHover = () => {
    if (flyInActive) return;
    setHoveredGerbang(true);
  };
  const handleGerbangOut = () => setHoveredGerbang(false);
  const handleGerbangClick = () => {
    if (flyInActive) return;
    setPetakPreview(PETA_PETAK_INFO.gerbang);
  };

  // Lorong Masuk handlers — stepping stones antara gerbang dan pohon,
  // link ke /armeniacaTown/r1 (Konstelasi Perjalanan).
  const handleLorongHover = () => {
    if (flyInActive) return;
    setHoveredLorong(true);
  };
  const handleLorongOut = () => setHoveredLorong(false);
  const handleLorongClick = () => {
    if (flyInActive) return;
    setPetakPreview(PETA_PETAK_INFO.lorong);
  };

  // Telaga handlers — sungai di barat. Preview info dipilih dari 3
  // varian PETA_PETAK_INFO berdasarkan computed telagaState.
  const handleTelagaHover = () => {
    if (flyInActive) return;
    setHoveredTelaga(true);
  };
  const handleTelagaOut = () => setHoveredTelaga(false);
  const handleTelagaClick = () => {
    if (flyInActive) return;
    const info =
      telagaState === 'restored'
        ? PETA_PETAK_INFO.telagaRestored
        : telagaState === 'drought'
        ? PETA_PETAK_INFO.telagaDrought
        : PETA_PETAK_INFO.telagaLocked;
    setPetakPreview(info);
  };

  // Modal preview handlers — close (dismiss tanpa navigate) atau
  // confirm (close modal lalu navigate ke petak route).
  const handlePetakPreviewClose = () => setPetakPreview(null);
  const handlePetakPreviewConfirm = () => {
    if (!petakPreview) return;
    const { route, id } = petakPreview;
    setPetakPreview(null);
    // Mark visited — halo ring akan muncul saat user balik ke peta.
    setPreviewedPetak((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      writePreviewed(next);
      return next;
    });
    navigate(route);
  };

  return (
    <>
      <Seo
        title="ArmeniacaTown — Peta Kota"
        description="Peta ArmeniacaTown — kota yang tumbuh dari siraman komunitas Helismiley."
        path="/armeniacaTown/peta"
      />
      <div className="relative w-full h-screen bg-[#2a1f30] overflow-hidden select-none">
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
              hoveredGerbang={hoveredGerbang}
              hoveredLorong={hoveredLorong}
              hoveredTelaga={hoveredTelaga}
              previewedPetak={previewedPetak}
              flyInActive={flyInActive}
              isMobile={isMobile}
              restorationLevel={restorationLevel}
              modalOpen={Boolean(selectedPetak) || Boolean(petakPreview)}
              telagaState={telagaState}
              onFlyInComplete={handleFlyInComplete}
              onPetakHover={handlePetakHover}
              onPetakOut={handlePetakOut}
              onPetakClick={handlePetakClick}
              onCenterHover={handleCenterHover}
              onCenterOut={handleCenterOut}
              onCenterClick={handleCenterClick}
              onGerbangHover={handleGerbangHover}
              onGerbangOut={handleGerbangOut}
              onGerbangClick={handleGerbangClick}
              onLorongHover={handleLorongHover}
              onLorongOut={handleLorongOut}
              onLorongClick={handleLorongClick}
              onTelagaHover={handleTelagaHover}
              onTelagaOut={handleTelagaOut}
              onTelagaClick={handleTelagaClick}
            />
            {!isMobile && (
              <EffectComposer multisampling={0}>
                {/* Bloom — threshold tinggi 0.78 supaya cuma highlight
                    emissive (tree fruits, moon, stars, lanterns, fireflies,
                    path stones visited, light cone) yang glow. Mipmap blur
                    biar soft & sinematik. */}
                <Bloom
                  intensity={0.55}
                  luminanceThreshold={0.78}
                  luminanceSmoothing={0.4}
                  mipmapBlur
                />
                {/* Vignette darken edges — frame fokus ke pohon di tengah,
                    juga ngebantu hide harsh ground edge di tepi screen. */}
                <Vignette eskil={false} offset={0.3} darkness={0.55} />
                {/* ACES filmic tonemapping — pal warm-cool twilight jadi
                    lebih dramatik & film-grade, bukan flat sRGB. */}
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            )}
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <TamanHeader modalOpen={Boolean(petakPreview)} />
        <PetaRestorationIndicator
          count={armeniacaCount}
          loaded={armeniacaLoaded}
          modalOpen={Boolean(petakPreview)}
        />
        <PetakPreviewModal
          petak={petakPreview}
          onClose={handlePetakPreviewClose}
          onConfirm={handlePetakPreviewConfirm}
        />
        {/* Intro title, restoration indicator, footer hint, dan petak
            detail modal sengaja di-disable selama blank-slate mode.
            Re-enable kalau redesign udah jelas mau pakai komponen mana. */}
        <AmbientAudio profile="taman" position="top-right" />
        <RotateRecommendation />
      </div>
    </>
  );
};

export default TamanPetaPage;
