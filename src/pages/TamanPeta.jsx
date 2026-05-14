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
import * as THREE from 'three';
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
// 3000 = r4 (Menara Jam) unlock drought, 4000 = r1 restored + r3 unlocked
// drought, 4500 = r5 (Panggung) unlock drought, 5000 = r2 (Perpustakaan)
// unlock drought + r4 restore, 6000 = r3 restored, 6500 = r5 restored,
// 7000 = r2 restored (pulih penuh — milestone akhir).
// airMancur* = micro-landmark di plaza tengah, continuous progression
// dari 2000 sampai epilog 10k (satu-satunya landmark yg tetep tumbuh
// post-fullRestore).
const MAP_THRESHOLDS = {
  mapUnlock: 2000,
  r4Unlock: 3000,
  r1Restore: 4000,
  r3Unlock: 4000,
  r5Unlock: 4500,
  r4Restore: 5000,
  r2Unlock: 5000,
  r3Restore: 6000,
  r5Restore: 6500,
  r2Restore: 7000,
  fullRestore: 7000,
  airMancurT1: 2000,
  airMancurT2: 3000,
  airMancurT3: 4500,
  airMancurT4: 6000,
  airMancurT5: 7500,
  airMancurT6: 10000,
};

const useArmeniacaProgress = () => {
  const [state, setState] = useState({ count: 0, loaded: false });
  useEffect(() => {
    // Dev override `?count=N` — bypass Firebase, paksa count tertentu
    // buat preview tier specific (Phase 2 milestone reveals). Gated
    // import.meta.env.DEV — production diabaikan.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const override = params.get('count');
      if (override !== null) {
        const n = parseInt(override, 10);
        if (!Number.isNaN(n)) {
          setState({ count: Math.max(0, n), loaded: true });
          return undefined;
        }
      }
    }
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
  purified = false,
  modalOpen = false,
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

    // Emissive baseline + hover boost. Purified naikin baseline 0 → 0.12
    // (pohon "bernafas" sendiri walau gak di-hover), hover state tetep
    // top di 0.35.
    const targetEm = hovered ? 0.35 : purified ? 0.12 : 0;
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
      {/* Fruit aprikot — emissive subtle untuk kerasa hidup. Purified
          bump intensity +0.15 (buah pulih kelihatan ranum, gak setengah
          mati). */}
      {FRUIT_POSITIONS.map((f, i) => (
        <mesh key={`fruit-${i}`} position={f.pos}>
          <sphereGeometry args={[0.11, 12, 10]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={purified ? 0.3 : 0.15}
            roughness={0.55}
            metalness={0.05}
          />
        </mesh>
      ))}
      {/* Purified bloom halo — 4 ring concentric translucent di base
          pohon (radius 0.7→2.0), peach-amber gradient. Kerasa "aura
          mekarnya pohon kebaikan", sinyal puncak restorasi. */}
      {purified && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[0.7, 0.95, 48]} />
            <meshBasicMaterial
              color="#f8c8a0"
              transparent
              opacity={0.32}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
            <ringGeometry args={[1.0, 1.35, 48]} />
            <meshBasicMaterial
              color="#f4b890"
              transparent
              opacity={0.22}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[1.4, 1.75, 48]} />
            <meshBasicMaterial
              color="#e8a888"
              transparent
              opacity={0.14}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
      {/* Floating label saat hover — "Pohon Terakhir" + hint klik.
          Pohon aprikot tunggal yg masih hidup di sisa kota gurun, link
          ke modul Pohon Kebaikan (/26). */}
      {hovered && !modalOpen && (
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
  modalOpen = false,
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
      {!modalOpen && (
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
      )}
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
  modalOpen = false,
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
      {!modalOpen && (
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
      )}
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
  modalOpen = false,
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

      {!modalOpen && (
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
      )}
    </group>
  );
};

// PetaArsip — petak r2 di sisi timur peta (x=+7), mirror Telaga di
// barat. 3 state berdasarkan tree support count:
//   locked   (count < 5000)  — bangunan ruin muted opacity + lock cube,
//                              interior buku & glow disembunyiin
//   drought  (5000-6999)     — bangunan ruin full opacity, atap jebol,
//                              doorway + buku interior keliatan tapi gelap
//   restored (>=7000)        — bangunan MEGAH baru: stone-cream taller
//                              walls + 2 column flanking doorway + dome
//                              di atas tengah + stained-glass window
//                              dgn cross trim + 2 hanging lantern warm
//                              glow. Mini-scar (notch pojok atap NW)
//                              sengaja disisain — "yang bertahan, bukan
//                              yang utuh dari awal".
const PetaArsip = ({
  hovered,
  visited = false,
  isMobile = false,
  petakState = 'locked',
  modalOpen = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const windowMatRef = useRef();
  const lanternMatRefs = useRef([]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetY = hovered && petakState !== 'locked' ? 0.25 : 0;
      const factor = Math.min(delta * 8, 1);
      groupRef.current.position.y = lerp(
        groupRef.current.position.y,
        targetY,
        factor,
      );
    }
    if (windowMatRef.current && petakState === 'restored') {
      const t = state.clock.elapsedTime;
      // Stained-glass slow shimmer — emissive pulse around 0.45 baseline.
      windowMatRef.current.emissiveIntensity =
        0.45 + Math.sin(t * 0.6) * 0.1;
    }
    // Lantern flicker — 2 phase-offset oscillations supaya gak in-sync,
    // kerasa kayak api beneran, bukan LED uniform.
    if (petakState === 'restored') {
      const t = state.clock.elapsedTime;
      lanternMatRefs.current.forEach((mat, i) => {
        if (!mat) return;
        mat.emissiveIntensity =
          0.65 + Math.sin(t * 2.3 + i * 1.7) * 0.18;
      });
    }
  });

  // Locked: building muted (translucent), interior decals hidden, lock cube
  // di depan doorway. Mirror PetaTelaga locked treatment.
  const baseOpacity = petakState === 'locked' ? 0.55 : 1;
  const isLocked = petakState === 'locked';
  const isRestored = petakState === 'restored';

  return (
    <group
      ref={groupRef}
      position={[7, 0, -1]}
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

      {/* Building meshes di-wrap di inner group dengan scale uniform.
          1.6x dipilih supaya footprint Arsip kerasa landmark setara
          Telaga (radius rim ~1.6) di sisi timur. */}
      <group scale={1.6}>
        {/* Visited halo — sepia ring di base saat udah dikunjungi.
            Skip kalau locked (consistent dgn Telaga locked behavior). */}
        {visited && !isLocked && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
            <ringGeometry args={[1.15, 1.32, 32]} />
            <meshStandardMaterial
              color={isRestored ? '#f4d4a0' : '#c8a060'}
              emissive={isRestored ? '#d49060' : '#a87060'}
              emissiveIntensity={0.45}
              transparent
              opacity={0.55}
              toneMapped={false}
            />
          </mesh>
        )}

        {isRestored ? (
          <>
            {/* === JAPANESE PAGODA LIBRARY VARIANT ===
                Dual-tier kawara roof + shoji wall + engawa veranda +
                stone toro lanterns + hanging chochin. Match surrounding
                Japanese-corner aesthetic (torii, jizo, tsukubai, bamboo)
                yang ada di scene purified. Entrance face -X (west). */}

            {/* === ISHIDAN STONE PLATFORM === */}
            {/* Tier 1 (lower stone step) — wider */}
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[2.2, 0.08, 1.9]} />
              <meshStandardMaterial color="#7a6858" roughness={0.92} />
            </mesh>
            {/* Tier 2 (upper stone step) */}
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[2.0, 0.08, 1.7]} />
              <meshStandardMaterial color="#8a7868" roughness={0.92} />
            </mesh>
            {/* === PEBBLE BORDER === karesansui pebble strip mengelilingi
                stone platform — kerasa "Japanese garden touch" yang
                ngerawat platform. Spheres kecil scatter di perimeter. */}
            {[
              [1.18, -0.85], [1.18, -0.55], [1.18, -0.25], [1.18, 0.05],
              [1.18, 0.35], [1.18, 0.65], [1.18, 0.95],
              [-1.18, -0.85], [-1.18, -0.55],
              [-1.18, 0.55], [-1.18, 0.85],
              [-0.75, -1.0], [-0.4, -1.0], [-0.05, -1.0],
              [0.3, -1.0], [0.65, -1.0], [1.0, -1.0],
              [-0.75, 1.0], [-0.4, 1.0], [-0.05, 1.0],
              [0.3, 1.0], [0.65, 1.0], [1.0, 1.0],
            ].map(([x, z], i) => (
              <mesh
                key={`pebble-${i}`}
                position={[x, 0.02, z]}
                scale={[0.045 + (i % 3) * 0.012, 0.022, 0.045 + (i % 3) * 0.012]}
              >
                <sphereGeometry args={[1, 6, 5]} />
                <meshStandardMaterial
                  color={i % 4 === 0 ? '#9a8878' : '#7a6858'}
                  roughness={0.95}
                />
              </mesh>
            ))}
            {/* === MOSS PATCHES === di stone platform corner-corner,
                kerasa weathered + nature reclaiming */}
            {[
              [-0.95, 0.08, -0.78], [0.92, 0.08, 0.82],
              [0.88, 0.08, -0.7], [-0.85, 0.08, 0.75],
            ].map(([x, y, z], i) => (
              <mesh key={`moss-${i}`} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.08 + (i % 2) * 0.02, 8]} />
                <meshStandardMaterial
                  color="#5a7838"
                  emissive="#3a5828"
                  emissiveIntensity={0.1}
                  roughness={0.95}
                />
              </mesh>
            ))}

            {/* === ENGAWA WOOD DECK === */}
            {/* Wooden veranda floor di atas stone platform */}
            <mesh position={[0, 0.21, 0]}>
              <boxGeometry args={[1.85, 0.04, 1.55]} />
              <meshStandardMaterial color="#5a3818" roughness={0.88} />
            </mesh>
            {/* === LIT THRESHOLD GLOW === Warm emissive strip di engawa
                tepat depan entrance (z=-0.25..0.25 di x=-0.75), kerasa
                "ada cahaya hangat mengalir keluar dari pintu." */}
            <mesh position={[-0.78, 0.235, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.55, 0.18]} />
              <meshStandardMaterial
                color="#f8d098"
                emissive="#e89858"
                emissiveIntensity={0.65}
                roughness={0.5}
                toneMapped={false}
                side={2}
              />
            </mesh>
            {/* Soft falloff outer glow */}
            <mesh position={[-0.9, 0.232, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.72, 0.32]} />
              <meshStandardMaterial
                color="#f4b878"
                emissive="#c87838"
                emissiveIntensity={0.28}
                roughness={0.5}
                transparent
                opacity={0.55}
                toneMapped={false}
                side={2}
              />
            </mesh>
            {/* Plank lines tipis di engawa (2 strips kayu) */}
            {[-0.5, 0, 0.5].map((z, i) => (
              <mesh key={`plank-${i}`} position={[0, 0.232, z]}>
                <boxGeometry args={[1.83, 0.004, 0.012]} />
                <meshStandardMaterial color="#3a2010" roughness={0.95} />
              </mesh>
            ))}
            {/* === FALLEN PETALS on engawa === Pink/peach soft disc tipis
                scattered di wood deck — kerasa "kelopak jatuh dari pohon
                terdekat," matching ApricotPetals di scene purified. */}
            {[
              [-0.7, -0.45, 0.08], [-0.42, -0.32, -0.05],
              [0.18, -0.4, 0.12], [0.55, -0.5, -0.18],
              [0.85, -0.2, 0.3], [-0.85, 0.25, 0.0],
              [0.45, 0.35, -0.08], [-0.3, 0.5, 0.18],
              [0.7, 0.55, 0.05], [0.15, 0.65, -0.12],
            ].map(([x, z, rot], i) => (
              <mesh
                key={`petal-${i}`}
                position={[x, 0.236, z]}
                rotation={[-Math.PI / 2, 0, rot]}
              >
                <circleGeometry args={[0.022 + (i % 3) * 0.005, 6]} />
                <meshStandardMaterial
                  color={i % 2 === 0 ? '#f4c8c8' : '#f8d4b8'}
                  roughness={0.85}
                  side={2}
                />
              </mesh>
            ))}

            {/* === BAMBOO BROOM === Leaning against engawa corner —
                kerasa "ada yang ngerawat tempat ini." */}
            {/* Handle bamboo pole */}
            <mesh
              position={[0.78, 0.5, 0.78]}
              rotation={[0.2, 0, 0.35]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
              <meshStandardMaterial color="#a08838" roughness={0.85} />
            </mesh>
            {/* Bristle bundle */}
            <mesh
              position={[0.92, 0.24, 0.85]}
              rotation={[0.2, 0, 0.35]}
            >
              <coneGeometry args={[0.05, 0.16, 8]} />
              <meshStandardMaterial color="#6a4828" roughness={0.95} />
            </mesh>
            {/* Bristle bind rope tipis */}
            <mesh
              position={[0.89, 0.3, 0.83]}
              rotation={[0.2, 0, 0.35]}
            >
              <torusGeometry args={[0.025, 0.005, 4, 8]} />
              <meshStandardMaterial color="#3a2010" roughness={0.9} />
            </mesh>

            {/* === STONE VASE IKEBANA === di corner engawa, vase batu
                tinggi dgn ranting bunga tipis (ikebana minimalist). */}
            <mesh position={[-0.82, 0.34, 0.7]}>
              <cylinderGeometry args={[0.05, 0.06, 0.18, 8]} />
              <meshStandardMaterial color="#6a5848" roughness={0.92} />
            </mesh>
            {/* Vase rim band */}
            <mesh position={[-0.82, 0.43, 0.7]}>
              <cylinderGeometry args={[0.055, 0.05, 0.018, 8]} />
              <meshStandardMaterial color="#4a3828" roughness={0.92} />
            </mesh>
            {/* 2 ranting kayu tinggi vertikal sedikit tilted */}
            <mesh
              position={[-0.81, 0.55, 0.7]}
              rotation={[0, 0, 0.12]}
            >
              <cylinderGeometry args={[0.005, 0.005, 0.22, 5]} />
              <meshStandardMaterial color="#3a2010" roughness={0.95} />
            </mesh>
            <mesh
              position={[-0.83, 0.56, 0.7]}
              rotation={[0, 0, -0.18]}
            >
              <cylinderGeometry args={[0.005, 0.005, 0.26, 5]} />
              <meshStandardMaterial color="#3a2010" roughness={0.95} />
            </mesh>
            {/* 3 small flower head di ujung ranting (sakura pink) */}
            <mesh position={[-0.79, 0.66, 0.7]}>
              <sphereGeometry args={[0.022, 6, 5]} />
              <meshStandardMaterial color="#f4a8c0" roughness={0.85} />
            </mesh>
            <mesh position={[-0.84, 0.69, 0.71]}>
              <sphereGeometry args={[0.02, 6, 5]} />
              <meshStandardMaterial color="#f4a8c0" roughness={0.85} />
            </mesh>
            <mesh position={[-0.82, 0.62, 0.69]}>
              <sphereGeometry args={[0.018, 6, 5]} />
              <meshStandardMaterial color="#f8c0d0" roughness={0.85} />
            </mesh>

            {/* === ENGAWA RAILING (kōran balustrade) ===
                Wooden rail mengelilingi engawa edge (kecuali front entrance
                x=-0.93 yang punya gap di z=±0.4 utk akses). Top rail +
                6 baluster vertikal per sisi. Kerasa "veranda beneran"
                bukan cuma deck terbuka. */}
            {/* Top rail back (x=+0.93, sisi +X) */}
            <mesh position={[0.93, 0.34, 0]}>
              <boxGeometry args={[0.035, 0.025, 1.56]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>
            {/* Top rail kanan (z=+0.78, sisi +Z) */}
            <mesh position={[0, 0.34, 0.78]}>
              <boxGeometry args={[1.86, 0.025, 0.035]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>
            {/* Top rail kiri (z=-0.78, sisi -Z) */}
            <mesh position={[0, 0.34, -0.78]}>
              <boxGeometry args={[1.86, 0.025, 0.035]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>
            {/* Front rail — outer segments only (gap di z=-0.4..0.4 utk
                entrance access). Slot kiri (z=-0.78..-0.4) & kanan
                (z=0.4..0.78). */}
            <mesh position={[-0.93, 0.34, -0.59]}>
              <boxGeometry args={[0.035, 0.025, 0.38]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>
            <mesh position={[-0.93, 0.34, 0.59]}>
              <boxGeometry args={[0.035, 0.025, 0.38]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>
            {/* Balusters belakang (x=+0.93) */}
            {[-0.65, -0.35, -0.05, 0.25, 0.55].map((z, i) => (
              <mesh key={`bal-b${i}`} position={[0.93, 0.29, z]}>
                <boxGeometry args={[0.018, 0.13, 0.018]} />
                <meshStandardMaterial color="#3a2010" roughness={0.92} />
              </mesh>
            ))}
            {/* Balusters sisi +Z (z=0.78) */}
            {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
              <mesh key={`bal-r${i}`} position={[x, 0.29, 0.78]}>
                <boxGeometry args={[0.018, 0.13, 0.018]} />
                <meshStandardMaterial color="#3a2010" roughness={0.92} />
              </mesh>
            ))}
            {/* Balusters sisi -Z (z=-0.78) */}
            {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
              <mesh key={`bal-l${i}`} position={[x, 0.29, -0.78]}>
                <boxGeometry args={[0.018, 0.13, 0.018]} />
                <meshStandardMaterial color="#3a2010" roughness={0.92} />
              </mesh>
            ))}
            {/* Balusters front-outer (di luar entrance gap) */}
            {[-0.7, -0.5].map((z, i) => (
              <mesh key={`bal-fl${i}`} position={[-0.93, 0.29, z]}>
                <boxGeometry args={[0.018, 0.13, 0.018]} />
                <meshStandardMaterial color="#3a2010" roughness={0.92} />
              </mesh>
            ))}
            {[0.5, 0.7].map((z, i) => (
              <mesh key={`bal-fr${i}`} position={[-0.93, 0.29, z]}>
                <boxGeometry args={[0.018, 0.13, 0.018]} />
                <meshStandardMaterial color="#3a2010" roughness={0.92} />
              </mesh>
            ))}

            {/* === LOWER TIER WALLS === */}
            {/* 4 corner hashira posts dark wood */}
            {[
              [-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6],
            ].map(([x, z], i) => (
              <React.Fragment key={`hashira-${i}`}>
                <mesh position={[x, 0.66, z]}>
                  <boxGeometry args={[0.09, 0.86, 0.09]} />
                  <meshStandardMaterial color="#2a1810" roughness={0.92} />
                </mesh>
                {/* Brass joint ring tengah hashira — kerasa "ikat besi
                    decorative" antar kayu sambungan */}
                <mesh position={[x, 0.66, z]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.052, 0.008, 4, 8]} />
                  <meshStandardMaterial
                    color="#8a6028"
                    emissive="#5a3018"
                    emissiveIntensity={0.18}
                    metalness={0.5}
                    roughness={0.55}
                  />
                </mesh>
                {/* Brass joint ring bawah (0.32y) */}
                <mesh position={[x, 0.32, z]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.052, 0.008, 4, 8]} />
                  <meshStandardMaterial
                    color="#8a6028"
                    emissive="#5a3018"
                    emissiveIntensity={0.18}
                    metalness={0.5}
                    roughness={0.55}
                  />
                </mesh>
                {/* Brass joint ring atas (1.0y) */}
                <mesh position={[x, 1.0, z]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.052, 0.008, 4, 8]} />
                  <meshStandardMaterial
                    color="#8a6028"
                    emissive="#5a3018"
                    emissiveIntensity={0.18}
                    metalness={0.5}
                    roughness={0.55}
                  />
                </mesh>
              </React.Fragment>
            ))}
            {/* 2 mid-front posts flanking entrance opening */}
            {[-0.25, 0.25].map((z, i) => (
              <mesh key={`mfp-${i}`} position={[-0.7, 0.66, z]}>
                <boxGeometry args={[0.08, 0.86, 0.08]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}

            {/* Top lintel (kabuki nukigi) — horizontal beam spanning front
                tepat di bawah eave */}
            <mesh position={[-0.7, 1.06, 0]}>
              <boxGeometry args={[0.07, 0.07, 1.32]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>
            {/* Side lintels (kanan, belakang) untuk frame yang sama */}
            <mesh position={[0.7, 1.06, 0]}>
              <boxGeometry args={[0.07, 0.07, 1.32]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>
            <mesh position={[0, 1.06, -0.6]}>
              <boxGeometry args={[1.34, 0.07, 0.07]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>
            <mesh position={[0, 1.06, 0.6]}>
              <boxGeometry args={[1.34, 0.07, 0.07]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>

            {/* === SHOJI PANELS === cream paper warm dgn subtle inner glow */}
            {/* Right side wall (x=0.7 face) */}
            <mesh position={[0.685, 0.66, 0]}>
              <boxGeometry args={[0.03, 0.82, 1.16]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.18}
                toneMapped={false}
              />
            </mesh>
            {/* Kumiko grid right — 3 vertical mullions */}
            {[-0.36, 0, 0.36].map((z, i) => (
              <mesh key={`kr-v${i}`} position={[0.7, 0.66, z]}>
                <boxGeometry args={[0.035, 0.82, 0.022]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}
            {/* Kumiko grid right — 2 horizontal */}
            {[0.4, 0.85].map((y, i) => (
              <mesh key={`kr-h${i}`} position={[0.7, y, 0]}>
                <boxGeometry args={[0.035, 0.022, 1.18]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}

            {/* Back wall shoji */}
            <mesh position={[0, 0.66, 0.585]}>
              <boxGeometry args={[1.36, 0.82, 0.03]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.16}
                toneMapped={false}
              />
            </mesh>
            {/* Kumiko grid back */}
            {[-0.45, 0, 0.45].map((x, i) => (
              <mesh key={`kb-v${i}`} position={[x, 0.66, 0.6]}>
                <boxGeometry args={[0.022, 0.82, 0.035]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}
            {[0.4, 0.85].map((y, i) => (
              <mesh key={`kb-h${i}`} position={[0, y, 0.6]}>
                <boxGeometry args={[1.38, 0.022, 0.035]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}

            {/* Back wall front side (z=-0.6) — same shoji + kumiko */}
            <mesh position={[0, 0.66, -0.585]}>
              <boxGeometry args={[1.36, 0.82, 0.03]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.16}
                toneMapped={false}
              />
            </mesh>
            {[-0.45, 0, 0.45].map((x, i) => (
              <mesh key={`kf-v${i}`} position={[x, 0.66, -0.6]}>
                <boxGeometry args={[0.022, 0.82, 0.035]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}
            {[0.4, 0.85].map((y, i) => (
              <mesh key={`kf-h${i}`} position={[0, y, -0.6]}>
                <boxGeometry args={[1.38, 0.022, 0.035]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}

            {/* Front face shoji panels flanking entrance opening */}
            {/* Panel z=-0.45 (kiri entrance) */}
            <mesh position={[-0.685, 0.66, -0.45]}>
              <boxGeometry args={[0.03, 0.82, 0.32]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.18}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[-0.7, 0.66, -0.45]}>
              <boxGeometry args={[0.025, 0.82, 0.025]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>
            <mesh position={[-0.7, 0.4, -0.45]}>
              <boxGeometry args={[0.035, 0.022, 0.34]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>
            {/* Panel z=0.45 (kanan entrance) */}
            <mesh position={[-0.685, 0.66, 0.45]}>
              <boxGeometry args={[0.03, 0.82, 0.32]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.18}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[-0.7, 0.66, 0.45]}>
              <boxGeometry args={[0.025, 0.82, 0.025]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>
            <mesh position={[-0.7, 0.4, 0.45]}>
              <boxGeometry args={[0.035, 0.022, 0.34]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} />
            </mesh>

            {/* Doma threshold step — wood gelap di entrance opening, kerasa
                "masuk ke tatami zone" */}
            <mesh position={[-0.68, 0.24, 0]}>
              <boxGeometry args={[0.16, 0.06, 0.5]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>

            {/* === GENKAN STONE STAIRS === 3 batu stone stair lebar
                turun dari engawa ke ground, di luar platform extending -X. */}
            {/* Step 1 (paling tinggi, dekat engawa) */}
            <mesh position={[-1.05, 0.16, 0]}>
              <boxGeometry args={[0.16, 0.08, 0.65]} />
              <meshStandardMaterial color="#8a7868" roughness={0.92} />
            </mesh>
            {/* Step 2 */}
            <mesh position={[-1.18, 0.1, 0]}>
              <boxGeometry args={[0.16, 0.08, 0.78]} />
              <meshStandardMaterial color="#7a6858" roughness={0.92} />
            </mesh>
            {/* Step 3 (paling bawah, lebar) */}
            <mesh position={[-1.32, 0.04, 0]}>
              <boxGeometry args={[0.16, 0.08, 0.92]} />
              <meshStandardMaterial color="#6a5848" roughness={0.92} />
            </mesh>
            {/* Side stone cheek walls flanking steps */}
            <mesh position={[-1.2, 0.16, -0.5]}>
              <boxGeometry args={[0.42, 0.16, 0.06]} />
              <meshStandardMaterial color="#6a5848" roughness={0.92} />
            </mesh>
            <mesh position={[-1.2, 0.16, 0.5]}>
              <boxGeometry args={[0.42, 0.16, 0.06]} />
              <meshStandardMaterial color="#6a5848" roughness={0.92} />
            </mesh>

            {/* === TOBI-ISHI STEPPING STONES === Stone path extending
                -X dari genkan stairs ke scene ground. 5 batu pijak
                irregularly spaced, kerasa "approach path" tradisional. */}
            {[
              { x: -1.55, z: -0.08, r: 0.09 },
              { x: -1.78, z: 0.06, r: 0.08 },
              { x: -2.0, z: -0.04, r: 0.085 },
              { x: -2.22, z: 0.08, r: 0.075 },
              { x: -2.42, z: -0.02, r: 0.09 },
            ].map((s, i) => (
              <mesh key={`tobi-${i}`} position={[s.x, 0.012, s.z]}>
                <cylinderGeometry args={[s.r, s.r, 0.025, 8]} />
                <meshStandardMaterial color="#6a5848" roughness={0.95} />
              </mesh>
            ))}
            {/* Moss patches around tobi-ishi stones */}
            {[
              [-1.66, -0.05], [-1.9, 0.15], [-2.1, -0.08], [-2.3, 0.04],
            ].map(([x, z], i) => (
              <mesh
                key={`tobi-moss-${i}`}
                position={[x, 0.015, z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <circleGeometry args={[0.06, 6]} />
                <meshStandardMaterial
                  color="#5a7838"
                  emissive="#3a5828"
                  emissiveIntensity={0.08}
                  roughness={0.95}
                />
              </mesh>
            ))}

            {/* === KOMA-INU GUARDIAN LIONS === Stone lion-dog pair flanking
                tobi-ishi path entry, sisi -X (luar genkan). Pose mirror:
                kiri "agyō" (mulut buka), kanan "ungyō" (mulut tutup) —
                tradisi shrine. Simplified silhouette via stacked boxes. */}
            {[-0.45, 0.45].map((z, i) => {
              const isAgyo = i === 0;
              return (
                <React.Fragment key={`komainu-${i}`}>
                  {/* Pedestal batu kotak */}
                  <mesh position={[-1.55, 0.06, z]}>
                    <boxGeometry args={[0.14, 0.12, 0.16]} />
                    <meshStandardMaterial color="#6a5848" roughness={0.95} />
                  </mesh>
                  {/* Pedestal top cap */}
                  <mesh position={[-1.55, 0.13, z]}>
                    <boxGeometry args={[0.16, 0.02, 0.18]} />
                    <meshStandardMaterial color="#5a4838" roughness={0.95} />
                  </mesh>
                  {/* Body block (sitting lion-dog) */}
                  <mesh position={[-1.55, 0.21, z]}>
                    <boxGeometry args={[0.085, 0.13, 0.1]} />
                    <meshStandardMaterial color="#8a7868" roughness={0.92} />
                  </mesh>
                  {/* Front legs (di depan -X) */}
                  <mesh position={[-1.59, 0.18, z - 0.04]}>
                    <boxGeometry args={[0.025, 0.08, 0.025]} />
                    <meshStandardMaterial color="#7a6858" roughness={0.92} />
                  </mesh>
                  <mesh position={[-1.59, 0.18, z + 0.04]}>
                    <boxGeometry args={[0.025, 0.08, 0.025]} />
                    <meshStandardMaterial color="#7a6858" roughness={0.92} />
                  </mesh>
                  {/* Head sphere */}
                  <mesh position={[-1.6, 0.3, z]}>
                    <sphereGeometry args={[0.05, 8, 6]} />
                    <meshStandardMaterial color="#8a7868" roughness={0.92} />
                  </mesh>
                  {/* Mane (rim ring around head) */}
                  <mesh position={[-1.575, 0.3, z]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.04, 0.012, 4, 10]} />
                    <meshStandardMaterial color="#6a5848" roughness={0.92} />
                  </mesh>
                  {/* Mulut detail — agyō dark open, ungyō light closed */}
                  <mesh position={[-1.65, 0.29, z]}>
                    <boxGeometry args={[0.005, 0.012, 0.025]} />
                    <meshStandardMaterial
                      color={isAgyo ? '#1a0808' : '#5a4838'}
                      roughness={0.9}
                    />
                  </mesh>
                  {/* Tail kecil curl belakang */}
                  <mesh
                    position={[-1.5, 0.25, z]}
                    rotation={[0, 0, 0.4]}
                  >
                    <coneGeometry args={[0.018, 0.08, 5]} />
                    <meshStandardMaterial color="#7a6858" roughness={0.92} />
                  </mesh>
                </React.Fragment>
              );
            })}

            {/* === KARESANSUI DRY GARDEN === Sand bed kecil di sisi +Z
                pelataran (luar engawa), 3 accent rock dgn raked sand
                pattern (concentric ring lines). Zen accent matching aula
                Japanese aesthetic. */}
            {/* Sand bed plane */}
            <mesh position={[0.3, 0.005, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.5, 0.55]} />
              <meshStandardMaterial color="#d8c8a8" roughness={0.95} />
            </mesh>
            {/* 3 accent rocks — irregular sphere/box */}
            <mesh position={[-0.05, 0.06, 1.32]} scale={[0.12, 0.08, 0.1]}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshStandardMaterial color="#5a4838" roughness={0.95} />
            </mesh>
            <mesh position={[0.35, 0.05, 1.42]} scale={[0.08, 0.06, 0.07]}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshStandardMaterial color="#6a5848" roughness={0.95} />
            </mesh>
            <mesh position={[0.7, 0.06, 1.25]} scale={[0.1, 0.07, 0.09]}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshStandardMaterial color="#5a4838" roughness={0.95} />
            </mesh>
            {/* Raked sand concentric ring around biggest rock — 3 rings */}
            {[0.18, 0.26, 0.34].map((r, i) => (
              <mesh
                key={`rake-${i}`}
                position={[-0.05, 0.011, 1.32]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[r, r + 0.012, 24]} />
                <meshStandardMaterial color="#b8a888" roughness={0.95} />
              </mesh>
            ))}
            {/* Straight rake lines extending dari kanan rock — 4 parallel */}
            {[1.16, 1.22, 1.28, 1.34].map((z, i) => (
              <mesh
                key={`rake-line-${i}`}
                position={[0.95, 0.011, z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[0.35, 0.012]} />
                <meshStandardMaterial color="#b8a888" roughness={0.95} />
              </mesh>
            ))}

            {/* === YUKIMI-DORO snow lantern === Mushroom-style stone
                lantern (squat tripod base) di corner -Z karesansui edge.
                Variant beda dari toro tinggi flanking entrance. */}
            <mesh position={[0.6, 0.04, 1.0]} rotation={[0, 0.3, 0]}>
              {/* 3-leg tripod base via box geometry tilt */}
              <cylinderGeometry args={[0.04, 0.05, 0.06, 3]} />
              <meshStandardMaterial color="#7a6858" roughness={0.95} />
            </mesh>
            {/* Mid pillar pendek */}
            <mesh position={[0.6, 0.13, 1.0]}>
              <cylinderGeometry args={[0.035, 0.04, 0.1, 6]} />
              <meshStandardMaterial color="#8a7868" roughness={0.92} />
            </mesh>
            {/* Light chamber hexagonal */}
            <mesh position={[0.6, 0.21, 1.0]}>
              <cylinderGeometry args={[0.08, 0.07, 0.08, 6]} />
              <meshStandardMaterial color="#8a7868" roughness={0.92} />
            </mesh>
            {/* Inner emissive glow */}
            <mesh position={[0.6, 0.21, 0.93]} rotation={[0, 0.3, 0]}>
              <planeGeometry args={[0.055, 0.055]} />
              <meshStandardMaterial
                color="#f4b478"
                emissive="#e89858"
                emissiveIntensity={0.7}
                toneMapped={false}
              />
            </mesh>
            {/* Mushroom cap roof — wide flat disc */}
            <mesh position={[0.6, 0.27, 1.0]}>
              <cylinderGeometry args={[0.12, 0.085, 0.03, 8]} />
              <meshStandardMaterial color="#6a5848" roughness={0.95} />
            </mesh>
            {/* Top knob */}
            <mesh position={[0.6, 0.3, 1.0]}>
              <sphereGeometry args={[0.018, 6, 5]} />
              <meshStandardMaterial color="#5a4838" roughness={0.92} />
            </mesh>

            {/* === BAMBOO GROVE BACKDROP === Cluster bambu tinggi di
                belakang building (z=+1.6+), kerasa "ada kebun bambu di
                belakang" matching BambooCluster di scene. */}
            {[
              { x: -0.3, z: 1.65, h: 1.8 },
              { x: -0.1, z: 1.75, h: 1.95 },
              { x: 0.15, z: 1.68, h: 2.1 },
              { x: 0.35, z: 1.78, h: 1.85 },
              { x: 0.55, z: 1.62, h: 2.0 },
              { x: 0.0, z: 1.85, h: 1.7 },
              { x: -0.45, z: 1.78, h: 1.9 },
            ].map((b, i) => (
              <React.Fragment key={`bamboo-${i}`}>
                {/* Stalk vertikal */}
                <mesh position={[b.x, b.h / 2, b.z]}>
                  <cylinderGeometry args={[0.035, 0.045, b.h, 6]} />
                  <meshStandardMaterial color="#7a9858" roughness={0.85} />
                </mesh>
                {/* Joint rings dark di stalk (4 ring evenly spaced) */}
                {[0.3, 0.6, 0.9, 1.2, 1.5].map((y, j) =>
                  y < b.h ? (
                    <mesh
                      key={`bamboo-r${j}`}
                      position={[b.x, y, b.z]}
                      rotation={[Math.PI / 2, 0, 0]}
                    >
                      <torusGeometry args={[0.045, 0.005, 4, 8]} />
                      <meshStandardMaterial color="#3a4828" roughness={0.9} />
                    </mesh>
                  ) : null,
                )}
                {/* Top leaf cluster */}
                <mesh position={[b.x, b.h, b.z]}>
                  <sphereGeometry args={[0.16, 6, 5]} />
                  <meshStandardMaterial color="#5a7838" roughness={0.85} />
                </mesh>
                <mesh position={[b.x + 0.08, b.h - 0.08, b.z]}>
                  <sphereGeometry args={[0.1, 5, 4]} />
                  <meshStandardMaterial color="#6a8848" roughness={0.85} />
                </mesh>
              </React.Fragment>
            ))}

            {/* === NOREN CURTAIN === Fabric panel hanging di entrance
                opening atas, di bawah shimenawa. 3 vertical strip dgn
                slight gap antar strip (kerasa kain noren split bawah). */}
            {[-0.18, 0, 0.18].map((z, i) => (
              <mesh key={`noren-${i}`} position={[-0.78, 0.78, z]}>
                <planeGeometry args={[0.16, 0.32]} />
                <meshStandardMaterial
                  color="#5a3038"
                  roughness={0.92}
                  side={2}
                />
              </mesh>
            ))}
            {/* Noren top horizontal rod tipis */}
            <mesh
              position={[-0.78, 0.93, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.01, 0.01, 0.5, 6]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>
            {/* Noren kanji-style mark — small light kanji-ish band di
                tengah panel tengah */}
            <mesh position={[-0.785, 0.78, 0]}>
              <planeGeometry args={[0.07, 0.07]} />
              <meshStandardMaterial
                color="#e8d8b0"
                roughness={0.9}
                side={2}
              />
            </mesh>

            {/* === SHIMENAWA ROPE === Sacred rope across entrance top
                dgn 3 shide paper streamers. Cylinder thick rope di atas
                lintel di z=-0.25 to 0.25 (entrance span). */}
            <mesh
              position={[-0.78, 1.0, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.025, 0.025, 0.52, 8]} />
              <meshStandardMaterial color="#d8c490" roughness={0.95} />
            </mesh>
            {/* Slight thicker bulge tengah (twisted rope center bulge) */}
            <mesh
              position={[-0.78, 1.0, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.032, 0.032, 0.18, 8]} />
              <meshStandardMaterial color="#c8b480" roughness={0.95} />
            </mesh>
            {/* 3 shide (paper streamer zigzag) hanging dari shimenawa */}
            {[-0.2, 0, 0.2].map((z, i) => (
              <React.Fragment key={`shide-${i}`}>
                <mesh position={[-0.79, 0.92, z]}>
                  <planeGeometry args={[0.06, 0.04]} />
                  <meshStandardMaterial
                    color="#f4ece0"
                    roughness={0.9}
                    side={2}
                  />
                </mesh>
                <mesh position={[-0.79, 0.87, z]}>
                  <planeGeometry args={[0.05, 0.04]} />
                  <meshStandardMaterial
                    color="#f4ece0"
                    roughness={0.9}
                    side={2}
                  />
                </mesh>
                <mesh position={[-0.79, 0.82, z]}>
                  <planeGeometry args={[0.04, 0.04]} />
                  <meshStandardMaterial
                    color="#f4ece0"
                    roughness={0.9}
                    side={2}
                  />
                </mesh>
              </React.Fragment>
            ))}

            {/* === LOWER TIER ROOF (ge-yane) === */}
            {/* Exposed taruki rafters under eave (4 sisi) — visible kayu
                beam ends pointing out, tradition di Japanese pagoda */}
            {[-0.45, -0.15, 0.15, 0.45].map((z, i) => (
              <React.Fragment key={`taruki-${i}`}>
                <mesh position={[-1.0, 1.16, z]}>
                  <boxGeometry args={[0.7, 0.04, 0.04]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.92} />
                </mesh>
                <mesh position={[1.0, 1.16, z]}>
                  <boxGeometry args={[0.7, 0.04, 0.04]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.92} />
                </mesh>
              </React.Fragment>
            ))}
            {[-0.55, -0.25, 0.05, 0.35].map((x, i) => (
              <React.Fragment key={`taruki-z-${i}`}>
                <mesh position={[x, 1.16, -0.9]}>
                  <boxGeometry args={[0.04, 0.04, 0.7]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.92} />
                </mesh>
                <mesh position={[x, 1.16, 0.9]}>
                  <boxGeometry args={[0.04, 0.04, 0.7]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.92} />
                </mesh>
              </React.Fragment>
            ))}

            {/* Main lower roof slab — dark gray-blue kawara, wide eave */}
            <mesh position={[0, 1.24, 0]}>
              <boxGeometry args={[1.95, 0.07, 1.75]} />
              <meshStandardMaterial color="#3a3540" roughness={0.88} />
            </mesh>
            {/* Kawara tile rows visible at top — 5 horizontal strips
                (membentuk look genteng) */}
            {[-0.66, -0.32, 0, 0.32, 0.66].map((z, i) => (
              <mesh key={`kawara-${i}`} position={[0, 1.285, z]}>
                <boxGeometry args={[1.92, 0.018, 0.1]} />
                <meshStandardMaterial color="#4a4550" roughness={0.88} />
              </mesh>
            ))}
            {/* === HAN-MARU EAVE TILE CAPS === Semicircular tile ends
                visible di bottom edge of roof — signature kawarabuki
                Japanese roof detail. Row di setiap sisi eave (4 sisi). */}
            {/* Front edge eave caps (x=-0.95) */}
            {[-0.85, -0.6, -0.35, -0.1, 0.15, 0.4, 0.65, 0.85].map((z, i) => (
              <mesh
                key={`hm-f${i}`}
                position={[-0.95, 1.205, z]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.024, 0.024, 0.05, 6, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#3a3540" roughness={0.85} />
              </mesh>
            ))}
            {/* Back edge eave caps (x=+0.95) */}
            {[-0.85, -0.6, -0.35, -0.1, 0.15, 0.4, 0.65, 0.85].map((z, i) => (
              <mesh
                key={`hm-b${i}`}
                position={[0.95, 1.205, z]}
                rotation={[0, 0, -Math.PI / 2]}
              >
                <cylinderGeometry args={[0.024, 0.024, 0.05, 6, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#3a3540" roughness={0.85} />
              </mesh>
            ))}
            {/* Side edge eave caps (z=-0.85) */}
            {[-0.85, -0.6, -0.35, -0.1, 0.15, 0.4, 0.65, 0.85].map((x, i) => (
              <mesh
                key={`hm-l${i}`}
                position={[x, 1.205, -0.85]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.024, 0.024, 0.05, 6, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#3a3540" roughness={0.85} />
              </mesh>
            ))}
            {/* Side edge eave caps (z=+0.85) */}
            {[-0.85, -0.6, -0.35, -0.1, 0.15, 0.4, 0.65, 0.85].map((x, i) => (
              <mesh
                key={`hm-r${i}`}
                position={[x, 1.205, 0.85]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.024, 0.024, 0.05, 6, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#3a3540" roughness={0.85} />
              </mesh>
            ))}
            {/* Roof ridge (mune) — beam tinggi tengah */}
            <mesh position={[0, 1.32, 0]}>
              <boxGeometry args={[1.95, 0.04, 0.12]} />
              <meshStandardMaterial color="#2a2530" roughness={0.85} />
            </mesh>
            {/* === SHACHIHOKO === Mythical fish-dolphin sculpture di ridge
                ends (replace plain onigawara). Body curl, tail naik,
                signature Japanese castle/temple roof ornament. Bronze
                accent emissive subtle. */}
            {[-0.95, 0.95].map((x, i) => {
              const dir = x > 0 ? 1 : -1;
              return (
                <React.Fragment key={`shachi-${i}`}>
                  {/* Body — curved hemisphere base (fish body) */}
                  <mesh position={[x, 1.36, 0]}>
                    <sphereGeometry args={[0.07, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial
                      color="#3a3540"
                      emissive="#5a4018"
                      emissiveIntensity={0.14}
                      metalness={0.35}
                      roughness={0.75}
                    />
                  </mesh>
                  {/* Tail naik vertikal — cone segitiga */}
                  <mesh
                    position={[x + dir * 0.05, 1.46, 0]}
                    rotation={[0, 0, dir * -0.35]}
                  >
                    <coneGeometry args={[0.04, 0.14, 4]} />
                    <meshStandardMaterial
                      color="#3a3540"
                      emissive="#5a4018"
                      emissiveIntensity={0.14}
                      metalness={0.35}
                      roughness={0.75}
                    />
                  </mesh>
                  {/* Mid-body ridge fin atas (small spike) */}
                  <mesh
                    position={[x - dir * 0.02, 1.43, 0]}
                    rotation={[0, 0, dir * 0.15]}
                  >
                    <coneGeometry args={[0.018, 0.06, 4]} />
                    <meshStandardMaterial
                      color="#2a2530"
                      roughness={0.85}
                    />
                  </mesh>
                  {/* Head bulge (mata fish facing outward) */}
                  <mesh position={[x - dir * 0.06, 1.34, 0]}>
                    <sphereGeometry args={[0.025, 6, 5]} />
                    <meshStandardMaterial
                      color="#2a2530"
                      roughness={0.8}
                    />
                  </mesh>
                  {/* Gold accent dot (eye / brass detail) */}
                  <mesh
                    position={[x - dir * 0.075, 1.34, 0.025]}
                  >
                    <sphereGeometry args={[0.008, 5, 4]} />
                    <meshStandardMaterial
                      color="#d4a050"
                      emissive="#a87838"
                      emissiveIntensity={0.4}
                      metalness={0.6}
                      roughness={0.5}
                    />
                  </mesh>
                </React.Fragment>
              );
            })}
            {/* Upturned eave corners (yokoya) — 4 corner wedge angled up,
                kerasa kayak roof corner "ngangkat" matching pagoda style */}
            {[
              { pos: [-0.97, 1.32, -0.87], rot: [0, 0, 0.35] },
              { pos: [-0.97, 1.32, 0.87], rot: [0, 0, 0.35] },
              { pos: [0.97, 1.32, -0.87], rot: [0, 0, -0.35] },
              { pos: [0.97, 1.32, 0.87], rot: [0, 0, -0.35] },
            ].map((c, i) => (
              <mesh key={`yokoya-${i}`} position={c.pos} rotation={c.rot}>
                <boxGeometry args={[0.22, 0.04, 0.18]} />
                <meshStandardMaterial color="#3a3540" roughness={0.88} />
              </mesh>
            ))}

            {/* === ROOF CURL CORNER EXTENSIONS === sweeping eave tips
                extending outward+upward dari yokoya corners. Box kecil
                rotated sehingga ujung ngacung ke arah outer atas — kerasa
                kayak corner curl Japanese roof beneran (mirip dengan
                ujung roof Buddhist temple). */}
            {[
              { pos: [-1.06, 1.36, -0.96], rot: [0.5, -0.4, 0.5] },
              { pos: [-1.06, 1.36, 0.96], rot: [-0.5, 0.4, 0.5] },
              { pos: [1.06, 1.36, -0.96], rot: [0.5, 0.4, -0.5] },
              { pos: [1.06, 1.36, 0.96], rot: [-0.5, -0.4, -0.5] },
            ].map((c, i) => (
              <mesh key={`curl-${i}`} position={c.pos} rotation={c.rot}>
                <coneGeometry args={[0.05, 0.22, 4]} />
                <meshStandardMaterial color="#2a2530" roughness={0.85} />
              </mesh>
            ))}

            {/* === VERMILLION RIDGE TOP STRIP === Subtle red accent
                sepanjang ridge mune (kerasa accent Japanese architecture,
                matching torii merah di scene). */}
            <mesh position={[0, 1.34, 0]}>
              <boxGeometry args={[1.94, 0.018, 0.03]} />
              <meshStandardMaterial
                color="#a83828"
                emissive="#5a1810"
                emissiveIntensity={0.2}
                roughness={0.7}
              />
            </mesh>
            {/* Onigawara vermillion underline strip kanan-kiri ridge */}
            {[-0.95, 0.95].map((x, i) => (
              <mesh key={`oni-red-${i}`} position={[x, 1.31, 0]}>
                <boxGeometry args={[0.082, 0.012, 0.165]} />
                <meshStandardMaterial
                  color="#a83828"
                  emissive="#5a1810"
                  emissiveIntensity={0.18}
                  roughness={0.7}
                />
              </mesh>
            ))}

            {/* === SOFFIT BOARDS UNDER EAVE === Cross beams perpendicular
                di bawah main roof slab — visible under eave dari sudut
                bawah. Kasih kesan "structure" bukan flat slab terbang. */}
            {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
              <mesh key={`soffit-x-${i}`} position={[x, 1.215, 0]}>
                <boxGeometry args={[0.025, 0.025, 1.74]} />
                <meshStandardMaterial color="#3a2418" roughness={0.92} />
              </mesh>
            ))}
            {[-0.6, -0.3, 0, 0.3, 0.6].map((z, i) => (
              <mesh key={`soffit-z-${i}`} position={[0, 1.215, z]}>
                <boxGeometry args={[1.94, 0.025, 0.025]} />
                <meshStandardMaterial color="#3a2418" roughness={0.92} />
              </mesh>
            ))}

            {/* === FURIN WIND BELLS === 2 small bronze bells hanging dari
                corner eave (front-left + back-right diagonal). Decorative
                Japanese touch — bell + ribbon strip + emissive subtle. */}
            {[
              { pos: [-0.95, 1.18, -0.85] },
              { pos: [0.95, 1.18, 0.85] },
            ].map((c, i) => (
              <React.Fragment key={`furin-${i}`}>
                {/* Cord pendek */}
                <mesh position={[c.pos[0], c.pos[1], c.pos[2]]}>
                  <boxGeometry args={[0.005, 0.06, 0.005]} />
                  <meshStandardMaterial color="#2a1810" roughness={0.95} />
                </mesh>
                {/* Bell body hemisphere (dome facing down) */}
                <mesh position={[c.pos[0], c.pos[1] - 0.06, c.pos[2]]}>
                  <sphereGeometry
                    args={[0.035, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
                  />
                  <meshStandardMaterial
                    color="#b88848"
                    emissive="#6a4018"
                    emissiveIntensity={0.2}
                    metalness={0.55}
                    roughness={0.5}
                  />
                </mesh>
                {/* Bell clapper drop */}
                <mesh position={[c.pos[0], c.pos[1] - 0.1, c.pos[2]]}>
                  <sphereGeometry args={[0.01, 6, 5]} />
                  <meshStandardMaterial color="#3a2010" roughness={0.9} />
                </mesh>
                {/* Ribbon strip (tanzaku) — strip kertas panjang vertikal */}
                <mesh position={[c.pos[0], c.pos[1] - 0.16, c.pos[2]]}>
                  <planeGeometry args={[0.025, 0.1]} />
                  <meshStandardMaterial
                    color="#f4ece0"
                    roughness={0.9}
                    side={2}
                  />
                </mesh>
              </React.Fragment>
            ))}

            {/* === UPPER TIER === (smaller, mirror konstruksi lower) */}
            {/* Upper walls — smaller cube body */}
            {/* Corner hashira atas */}
            {[
              [-0.35, -0.32], [0.35, -0.32], [-0.35, 0.32], [0.35, 0.32],
            ].map(([x, z], i) => (
              <mesh key={`uhash-${i}`} position={[x, 1.55, z]}>
                <boxGeometry args={[0.06, 0.5, 0.06]} />
                <meshStandardMaterial color="#2a1810" roughness={0.92} />
              </mesh>
            ))}
            {/* Upper shoji wall 4 sisi */}
            <mesh position={[0.345, 1.55, 0]}>
              <boxGeometry args={[0.025, 0.46, 0.62]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.2}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[-0.345, 1.55, 0]}>
              <boxGeometry args={[0.025, 0.46, 0.62]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.2}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, 1.55, 0.315]}>
              <boxGeometry args={[0.7, 0.46, 0.025]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.2}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, 1.55, -0.315]}>
              <boxGeometry args={[0.7, 0.46, 0.025]} />
              <meshStandardMaterial
                color="#f0e0c0"
                roughness={0.85}
                emissive="#e8c890"
                emissiveIntensity={0.2}
                toneMapped={false}
              />
            </mesh>
            {/* Kumiko upper — 1 vertikal + 1 horizontal di tiap shoji */}
            {[
              { pos: [0.355, 1.55, 0] },
              { pos: [-0.355, 1.55, 0] },
            ].map((c, i) => (
              <mesh key={`uk-v${i}`} position={c.pos}>
                <boxGeometry args={[0.028, 0.46, 0.02]} />
                <meshStandardMaterial color="#2a1810" />
              </mesh>
            ))}
            <mesh position={[0, 1.55, 0.328]}>
              <boxGeometry args={[0.7, 0.46, 0.02]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>
            <mesh position={[0, 1.55, -0.328]}>
              <boxGeometry args={[0.7, 0.46, 0.02]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>
            {/* Horizontal kumiko line tengah */}
            <mesh position={[0, 1.55, 0]}>
              <boxGeometry args={[0.74, 0.02, 0.68]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>

            {/* Upper roof slab — smaller, same dark kawara */}
            <mesh position={[0, 1.82, 0]}>
              <boxGeometry args={[1.0, 0.06, 0.94]} />
              <meshStandardMaterial color="#3a3540" roughness={0.88} />
            </mesh>
            {/* === HAFU BARGEBOARDS === Triangular gable trim di sisi
                upper tier (kanan-kiri sisi -X & +X), kerasa carved wood
                ornament Japanese hall. */}
            {[-0.5, 0.5].map((x, i) => (
              <React.Fragment key={`hafu-${i}`}>
                {/* Upper diagonal bargeboard kiri segitiga */}
                <mesh
                  position={[x, 1.85, -0.45]}
                  rotation={[Math.PI / 2, 0, x > 0 ? -0.4 : 0.4]}
                >
                  <planeGeometry args={[0.42, 0.16]} />
                  <meshStandardMaterial color="#3a2010" roughness={0.92} side={2} />
                </mesh>
                {/* Carved emblem (kamon) — small disc tengah hafu */}
                <mesh
                  position={[x * 1.08, 1.86, -0.45]}
                  rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
                >
                  <circleGeometry args={[0.05, 12]} />
                  <meshStandardMaterial
                    color="#b88840"
                    emissive="#6a4018"
                    emissiveIntensity={0.22}
                    metalness={0.5}
                    roughness={0.55}
                    toneMapped={false}
                  />
                </mesh>
                {/* Inner kamon ring detail */}
                <mesh
                  position={[x * 1.085, 1.86, -0.45]}
                  rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
                >
                  <ringGeometry args={[0.022, 0.028, 12]} />
                  <meshStandardMaterial
                    color="#5a3018"
                    roughness={0.7}
                  />
                </mesh>
              </React.Fragment>
            ))}

            {/* Upper kawara rows */}
            {[-0.32, 0, 0.32].map((z, i) => (
              <mesh key={`ukawara-${i}`} position={[0, 1.86, z]}>
                <boxGeometry args={[0.98, 0.015, 0.1]} />
                <meshStandardMaterial color="#4a4550" roughness={0.88} />
              </mesh>
            ))}
            {/* Upper han-maru eave tile caps — smaller row di edge atas */}
            {[-0.4, -0.2, 0, 0.2, 0.4].map((z, i) => (
              <React.Fragment key={`uhm-${i}`}>
                <mesh
                  position={[-0.49, 1.79, z]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.018, 0.018, 0.04, 5, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#3a3540" roughness={0.85} />
                </mesh>
                <mesh
                  position={[0.49, 1.79, z]}
                  rotation={[0, 0, -Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.018, 0.018, 0.04, 5, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#3a3540" roughness={0.85} />
                </mesh>
              </React.Fragment>
            ))}
            {[-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => (
              <React.Fragment key={`uhm-z${i}`}>
                <mesh
                  position={[x, 1.79, -0.46]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <cylinderGeometry args={[0.018, 0.018, 0.04, 5, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#3a3540" roughness={0.85} />
                </mesh>
                <mesh
                  position={[x, 1.79, 0.46]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <cylinderGeometry args={[0.018, 0.018, 0.04, 5, 1, false, 0, Math.PI]} />
                  <meshStandardMaterial color="#3a3540" roughness={0.85} />
                </mesh>
              </React.Fragment>
            ))}
            {/* Upper roof ridge */}
            <mesh position={[0, 1.89, 0]}>
              <boxGeometry args={[1.0, 0.035, 0.1]} />
              <meshStandardMaterial color="#2a2530" roughness={0.85} />
            </mesh>
            {/* Upper upturned corners */}
            {[
              { pos: [-0.5, 1.88, -0.46], rot: [0, 0, 0.35] },
              { pos: [-0.5, 1.88, 0.46], rot: [0, 0, 0.35] },
              { pos: [0.5, 1.88, -0.46], rot: [0, 0, -0.35] },
              { pos: [0.5, 1.88, 0.46], rot: [0, 0, -0.35] },
            ].map((c, i) => (
              <mesh key={`uyokoya-${i}`} position={c.pos} rotation={c.rot}>
                <boxGeometry args={[0.18, 0.035, 0.15]} />
                <meshStandardMaterial color="#3a3540" roughness={0.88} />
              </mesh>
            ))}

            {/* === FINIAL (sōrin) === bronze pinnacle on top, 5-part
                konstruksi tradisional: fukubachi lotus base, kurin rings,
                suiren parasol disc, ryūsha & hoju apex jewel. */}
            {/* Fukubachi — lotus base disc */}
            <mesh position={[0, 1.94, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 0.04, 12]} />
              <meshStandardMaterial color="#6a4828" roughness={0.7} />
            </mesh>
            {/* Inverted bowl cap atas lotus base */}
            <mesh position={[0, 1.98, 0]}>
              <cylinderGeometry args={[0.06, 0.075, 0.025, 12]} />
              <meshStandardMaterial color="#7a5038" roughness={0.7} />
            </mesh>
            {/* Vertical spire shaft */}
            <mesh position={[0, 2.14, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 0.38, 8]} />
              <meshStandardMaterial
                color="#8a6028"
                emissive="#5a3018"
                emissiveIntensity={0.18}
                metalness={0.5}
                roughness={0.55}
              />
            </mesh>
            {/* 4 horizontal ring (kurin) di shaft, spread merata */}
            {[2.02, 2.12, 2.22, 2.32].map((y, i) => (
              <mesh key={`kurin-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.05, 0.012, 6, 14]} />
                <meshStandardMaterial
                  color="#a87838"
                  emissive="#6a4018"
                  emissiveIntensity={0.22}
                  metalness={0.55}
                  roughness={0.5}
                />
              </mesh>
            ))}
            {/* Suiren parasol disc — thin flat ring lebih lebar di tengah
                shaft, kerasa "umbrella ornamental." */}
            <mesh position={[0, 2.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.075, 0.005, 4, 16]} />
              <meshStandardMaterial
                color="#b88840"
                emissive="#6a4018"
                emissiveIntensity={0.3}
                metalness={0.55}
                roughness={0.55}
              />
            </mesh>
            {/* Ryūsha — water flame ornament below jewel (small cone) */}
            <mesh position={[0, 2.39, 0]}>
              <coneGeometry args={[0.028, 0.06, 6]} />
              <meshStandardMaterial
                color="#c89040"
                emissive="#a87038"
                emissiveIntensity={0.4}
                metalness={0.55}
                roughness={0.5}
              />
            </mesh>
            {/* Apex hoju jewel — sphere dgn glow paling kuat */}
            <mesh position={[0, 2.44, 0]}>
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshStandardMaterial
                color="#f4c060"
                emissive="#e8a838"
                emissiveIntensity={0.6}
                metalness={0.55}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>
            {/* Small pointed tip on top of jewel */}
            <mesh position={[0, 2.49, 0]}>
              <coneGeometry args={[0.012, 0.04, 6]} />
              <meshStandardMaterial
                color="#c89040"
                emissive="#a87038"
                emissiveIntensity={0.4}
                metalness={0.55}
                roughness={0.45}
              />
            </mesh>

            {/* === HANGING CHOCHIN (paper lantern) at entrance === */}
            {/* Refs preserved untuk flicker animation — wire ke chochin */}
            {[-0.55, 0.55].map((z, i) => (
              <React.Fragment key={`chochin-${i}`}>
                {/* Cord dari lintel */}
                <mesh position={[-0.95, 1.0, z]}>
                  <boxGeometry args={[0.008, 0.16, 0.008]} />
                  <meshStandardMaterial color="#2a1810" roughness={0.95} />
                </mesh>
                {/* Top cap kayu */}
                <mesh position={[-0.95, 0.92, z]}>
                  <cylinderGeometry args={[0.065, 0.055, 0.025, 10]} />
                  <meshStandardMaterial color="#3a1810" roughness={0.85} />
                </mesh>
                {/* Body chochin — barrel paper (cylinder) warm glow */}
                <mesh position={[-0.95, 0.83, z]}>
                  <cylinderGeometry args={[0.085, 0.085, 0.16, 12]} />
                  <meshStandardMaterial
                    ref={(el) => (lanternMatRefs.current[i] = el)}
                    color="#f4b478"
                    emissive="#e89858"
                    emissiveIntensity={0.7}
                    roughness={0.5}
                    toneMapped={false}
                  />
                </mesh>
                {/* Bamboo ring strips horizontal (3 rings di body) */}
                {[0.78, 0.83, 0.88].map((y, j) => (
                  <mesh
                    key={`cring-${j}`}
                    position={[-0.95, y, z]}
                    rotation={[Math.PI / 2, 0, 0]}
                  >
                    <torusGeometry args={[0.086, 0.005, 4, 10]} />
                    <meshStandardMaterial color="#4a2818" roughness={0.9} />
                  </mesh>
                ))}
                {/* Kanji stripe — vertical dark band di tengah chochin
                    (kerasa "ada tulisan" tradisional) */}
                <mesh position={[-1.04, 0.83, z]}>
                  <planeGeometry args={[0.04, 0.13]} />
                  <meshStandardMaterial
                    color="#3a1810"
                    roughness={0.9}
                    side={2}
                  />
                </mesh>
                {/* Bottom cap kayu */}
                <mesh position={[-0.95, 0.74, z]}>
                  <cylinderGeometry args={[0.065, 0.055, 0.025, 10]} />
                  <meshStandardMaterial color="#3a1810" roughness={0.85} />
                </mesh>
                {/* Small tassel di bawah */}
                <mesh position={[-0.95, 0.69, z]}>
                  <boxGeometry args={[0.01, 0.06, 0.01]} />
                  <meshStandardMaterial color="#8a2030" roughness={0.95} />
                </mesh>
              </React.Fragment>
            ))}

            {/* === STONE TORO LANTERN flanking entrance steps === */}
            {[-0.9, 0.9].map((z, i) => (
              <React.Fragment key={`toro-${i}`}>
                {/* Base stone wide */}
                <mesh position={[-1.55, 0.2, z]}>
                  <boxGeometry args={[0.18, 0.08, 0.18]} />
                  <meshStandardMaterial color="#7a6858" roughness={0.92} />
                </mesh>
                {/* Pedestal pillar */}
                <mesh position={[-1.55, 0.35, z]}>
                  <cylinderGeometry args={[0.05, 0.06, 0.22, 6]} />
                  <meshStandardMaterial color="#8a7868" roughness={0.92} />
                </mesh>
                {/* Light chamber — kotak dgn emissive warm di dalam */}
                <mesh position={[-1.55, 0.51, z]}>
                  <boxGeometry args={[0.13, 0.13, 0.13]} />
                  <meshStandardMaterial color="#8a7868" roughness={0.92} />
                </mesh>
                {/* Inner glow plane (faces -X, terlihat dari arah kamera) */}
                <mesh position={[-1.625, 0.51, z]}>
                  <planeGeometry args={[0.085, 0.085]} />
                  <meshStandardMaterial
                    color="#f4b478"
                    emissive="#e89858"
                    emissiveIntensity={0.85}
                    toneMapped={false}
                  />
                </mesh>
                {/* Roof cap pyramid */}
                <mesh position={[-1.55, 0.61, z]}>
                  <coneGeometry args={[0.1, 0.07, 4]} />
                  <meshStandardMaterial color="#6a5848" roughness={0.92} />
                </mesh>
                {/* Top knob */}
                <mesh position={[-1.55, 0.66, z]}>
                  <sphereGeometry args={[0.018, 6, 6]} />
                  <meshStandardMaterial color="#5a4838" roughness={0.9} />
                </mesh>
              </React.Fragment>
            ))}

            {/* === BONSAI SHRUBS flanking inner entrance steps === Small
                potted pruned shrubs di kanan-kiri stairs depan toro,
                kerasa "ada yang ngerawat taman." */}
            {[-0.7, 0.7].map((z, i) => (
              <React.Fragment key={`bonsai-${i}`}>
                {/* Pot terakota kecil */}
                <mesh position={[-1.18, 0.1, z]}>
                  <cylinderGeometry args={[0.08, 0.065, 0.13, 10]} />
                  <meshStandardMaterial color="#a85838" roughness={0.9} />
                </mesh>
                {/* Pot rim */}
                <mesh position={[-1.18, 0.17, z]}>
                  <cylinderGeometry args={[0.085, 0.08, 0.018, 10]} />
                  <meshStandardMaterial color="#8a4030" roughness={0.9} />
                </mesh>
                {/* Trunk pendek bonsai */}
                <mesh position={[-1.18, 0.22, z]}>
                  <cylinderGeometry args={[0.018, 0.022, 0.08, 6]} />
                  <meshStandardMaterial color="#3a2010" roughness={0.95} />
                </mesh>
                {/* 3 leafy cluster spread (bonsai canopy) */}
                <mesh position={[-1.18, 0.3, z]}>
                  <sphereGeometry args={[0.07, 8, 6]} />
                  <meshStandardMaterial color="#5a7838" roughness={0.85} />
                </mesh>
                <mesh position={[-1.15, 0.32, z + 0.03]}>
                  <sphereGeometry args={[0.045, 6, 5]} />
                  <meshStandardMaterial color="#6a8848" roughness={0.85} />
                </mesh>
                <mesh position={[-1.21, 0.31, z - 0.02]}>
                  <sphereGeometry args={[0.04, 6, 5]} />
                  <meshStandardMaterial color="#5a7838" roughness={0.85} />
                </mesh>
              </React.Fragment>
            ))}

            {/* === WISTERIA VINE on back-right corner hashira === Trailing
                purple-pink vine creeping naik di kolom belakang kanan,
                kerasa "alam kembali" tanpa intrude bangunan. */}
            {[0.28, 0.42, 0.56, 0.7, 0.84, 0.98].map((y, i) => (
              <React.Fragment key={`wist-${i}`}>
                {/* Leafy cluster di sepanjang kolom */}
                <mesh position={[0.74 - i * 0.005, y, 0.64 + (i % 2) * 0.015]}>
                  <sphereGeometry args={[0.04 + (i % 3) * 0.008, 6, 5]} />
                  <meshStandardMaterial color="#5a7838" roughness={0.85} />
                </mesh>
                {/* Hanging flower cluster (wisteria racemes) */}
                {i % 2 === 0 && (
                  <mesh position={[0.78, y - 0.06, 0.66]}>
                    <coneGeometry args={[0.018, 0.08, 5]} />
                    <meshStandardMaterial
                      color="#b890c8"
                      emissive="#7a5898"
                      emissiveIntensity={0.18}
                      roughness={0.85}
                      toneMapped={false}
                    />
                  </mesh>
                )}
              </React.Fragment>
            ))}

            {/* === EMA VOTIVE PLAQUES === 4 wooden plaque kecil hanging
                dari rope strung antar 2 baluster di sisi kanan engawa.
                Pentagonal pentagonal shape (atas runcing) tradisional ema. */}
            {/* Rope spanning */}
            <mesh
              position={[0.95, 0.4, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.005, 0.005, 0.7, 4]} />
              <meshStandardMaterial color="#3a2010" roughness={0.95} />
            </mesh>
            {[-0.25, -0.08, 0.08, 0.25].map((z, i) => (
              <React.Fragment key={`ema-${i}`}>
                {/* Cord pendek */}
                <mesh position={[0.95, 0.35, z]}>
                  <boxGeometry args={[0.003, 0.05, 0.003]} />
                  <meshStandardMaterial color="#3a2010" roughness={0.95} />
                </mesh>
                {/* Plaque body — pentagonal approximation via box */}
                <mesh position={[0.95, 0.28, z]}>
                  <boxGeometry args={[0.005, 0.08, 0.07]} />
                  <meshStandardMaterial
                    color={i % 2 === 0 ? '#e8c890' : '#d8b078'}
                    roughness={0.88}
                  />
                </mesh>
                {/* Top peak segitiga (pentagon top) */}
                <mesh
                  position={[0.95, 0.33, z]}
                  rotation={[Math.PI / 4, 0, 0]}
                >
                  <boxGeometry args={[0.006, 0.025, 0.025]} />
                  <meshStandardMaterial
                    color={i % 2 === 0 ? '#e8c890' : '#d8b078'}
                    roughness={0.88}
                  />
                </mesh>
              </React.Fragment>
            ))}

            {/* === SAKURA OVERHANG BRANCH === Dari atas upper roof,
                ranting tipis dengan kelopak pink hanging mengarah ke
                bawah-depan. Kerasa "ada pohon sakura di belakang yang
                cabangnya kebawa ke atas pagoda." */}
            {/* Main branch arm tilted */}
            <mesh
              position={[-0.35, 1.78, 0.65]}
              rotation={[0, 0, -0.5]}
            >
              <cylinderGeometry args={[0.008, 0.014, 0.5, 5]} />
              <meshStandardMaterial color="#3a2010" roughness={0.95} />
            </mesh>
            {/* Secondary branch arm */}
            <mesh
              position={[-0.15, 1.7, 0.75]}
              rotation={[0.2, 0, -0.4]}
            >
              <cylinderGeometry args={[0.006, 0.01, 0.3, 5]} />
              <meshStandardMaterial color="#3a2010" roughness={0.95} />
            </mesh>
            {/* Sakura cluster spheres (5 cluster spread di branch) */}
            {[
              [-0.55, 1.68, 0.55], [-0.42, 1.58, 0.5],
              [-0.25, 1.62, 0.78], [-0.1, 1.55, 0.82],
              [-0.45, 1.65, 0.62],
            ].map(([x, y, z], i) => (
              <mesh key={`sakura-${i}`} position={[x, y, z]}>
                <sphereGeometry args={[0.06 + (i % 2) * 0.015, 6, 5]} />
                <meshStandardMaterial
                  color={i % 2 === 0 ? '#f4c8d0' : '#f8d4d8'}
                  emissive="#e8a8b8"
                  emissiveIntensity={0.12}
                  roughness={0.85}
                  toneMapped={false}
                />
              </mesh>
            ))}

            {/* === HENKAKU PLAQUE === Wooden sign above entrance dgn kanji vibe */}
            <mesh position={[-0.74, 1.16, 0]}>
              <boxGeometry args={[0.025, 0.18, 0.5]} />
              <meshStandardMaterial color="#3a2010" roughness={0.92} />
            </mesh>
            {/* Plaque inner light panel — kerasa "ada tulisan" via warm strip */}
            <mesh position={[-0.755, 1.16, 0]}>
              <planeGeometry args={[0.45, 0.13]} />
              <meshStandardMaterial
                color="#e8c890"
                emissive="#a87838"
                emissiveIntensity={0.18}
                roughness={0.5}
                toneMapped={false}
              />
            </mesh>

            {/* === SIDE GLOW WINDOW === (preserve windowMatRef untuk shimmer)
                Shoji panel di sisi kanan (east) yg glow lebih kuat — kerasa
                "ada cahaya tatami glow dari dalam." */}
            <mesh position={[0.715, 0.6, 0]}>
              <boxGeometry args={[0.025, 0.5, 0.5]} />
              <meshStandardMaterial
                ref={windowMatRef}
                color="#f4d098"
                emissive="#e8a868"
                emissiveIntensity={0.5}
                roughness={0.5}
                toneMapped={false}
              />
            </mesh>
            {/* Kumiko mullion grid 3x3 panel di window glow */}
            <mesh position={[0.725, 0.6, 0]}>
              <boxGeometry args={[0.022, 0.022, 0.5]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>
            <mesh position={[0.725, 0.78, 0]}>
              <boxGeometry args={[0.022, 0.022, 0.5]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>
            <mesh position={[0.725, 0.42, 0]}>
              <boxGeometry args={[0.022, 0.022, 0.5]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>
            <mesh position={[0.725, 0.6, -0.16]}>
              <boxGeometry args={[0.022, 0.5, 0.022]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>
            <mesh position={[0.725, 0.6, 0.16]}>
              <boxGeometry args={[0.022, 0.5, 0.022]} />
              <meshStandardMaterial color="#2a1810" />
            </mesh>

            {/* === INTERIOR LIT BACKDROP === Warm emissive plane di
                belakang books, visible lewat entrance opening. Kerasa
                "ada cahaya hangat di dalam aula" — silhouette books
                stand out terhadap glow tatami inside. */}
            <mesh position={[0.4, 0.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.0, 0.85]} />
              <meshStandardMaterial
                color="#f4c890"
                emissive="#e89858"
                emissiveIntensity={0.45}
                roughness={0.5}
                toneMapped={false}
                side={2}
              />
            </mesh>
            {/* === KAKEMONO HANGING SCROLL === Vertical scroll di back
                wall interior, visible lewat entrance. Long thin panel
                dgn calligraphy-like dark stripe + roller batang atas/bawah. */}
            {/* Scroll body */}
            <mesh position={[0.38, 0.55, -0.15]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[0.16, 0.45]} />
              <meshStandardMaterial
                color="#e8d8b0"
                emissive="#c8a878"
                emissiveIntensity={0.18}
                roughness={0.88}
                toneMapped={false}
                side={2}
              />
            </mesh>
            {/* Calligraphy stripe tengah */}
            <mesh
              position={[0.378, 0.55, -0.15]}
              rotation={[0, -Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.04, 0.32]} />
              <meshStandardMaterial color="#2a1810" roughness={0.92} side={2} />
            </mesh>
            {/* Roller batang atas */}
            <mesh
              position={[0.378, 0.78, -0.15]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.18, 6]} />
              <meshStandardMaterial color="#3a2010" roughness={0.9} />
            </mesh>
            {/* Roller batang bawah */}
            <mesh
              position={[0.378, 0.32, -0.15]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.18, 6]} />
              <meshStandardMaterial color="#3a2010" roughness={0.9} />
            </mesh>
            {/* Hanging cord top tipis */}
            <mesh position={[0.378, 0.88, -0.15]}>
              <boxGeometry args={[0.003, 0.2, 0.003]} />
              <meshStandardMaterial color="#5a3018" roughness={0.95} />
            </mesh>
            {/* Tassel knot kecil di ujung bawah scroll */}
            <mesh position={[0.378, 0.28, -0.15]}>
              <sphereGeometry args={[0.012, 6, 5]} />
              <meshStandardMaterial color="#8a4030" roughness={0.9} />
            </mesh>

            {/* === KAKEMONO #2 === Second scroll di sisi z=+0.15
                (paired display tradisional) */}
            <mesh position={[0.38, 0.55, 0.15]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[0.16, 0.45]} />
              <meshStandardMaterial
                color="#e8d8b0"
                emissive="#c8a878"
                emissiveIntensity={0.18}
                roughness={0.88}
                toneMapped={false}
                side={2}
              />
            </mesh>
            {/* Mini ink wash painting motif (3 horizontal lines tipis) */}
            {[0.62, 0.55, 0.48].map((y, i) => (
              <mesh
                key={`scroll2-line-${i}`}
                position={[0.378, y, 0.15]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[0.1, 0.012]} />
                <meshStandardMaterial color="#3a2818" roughness={0.92} side={2} />
              </mesh>
            ))}
            <mesh
              position={[0.378, 0.78, 0.15]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.18, 6]} />
              <meshStandardMaterial color="#3a2010" roughness={0.9} />
            </mesh>
            <mesh
              position={[0.378, 0.32, 0.15]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.18, 6]} />
              <meshStandardMaterial color="#3a2010" roughness={0.9} />
            </mesh>
            {/* Subtle tatami floor warm tone visible inside */}
            <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.2, 1.0]} />
              <meshStandardMaterial
                color="#c8a868"
                emissive="#8a6038"
                emissiveIntensity={0.18}
                roughness={0.85}
                toneMapped={false}
                side={2}
              />
            </mesh>
            {/* Tatami mat grid lines — 6 strip dark divider supaya
                kerasa tatami panels (typical 6-mat arrangement) */}
            {[-0.4, -0.13, 0.13, 0.4].map((z, i) => (
              <mesh key={`tatami-z-${i}`} position={[0, 0.285, z]}>
                <boxGeometry args={[1.18, 0.005, 0.012]} />
                <meshStandardMaterial color="#5a3018" roughness={0.92} />
              </mesh>
            ))}
            {[-0.4, 0, 0.4].map((x, i) => (
              <mesh key={`tatami-x-${i}`} position={[x, 0.285, 0]}>
                <boxGeometry args={[0.012, 0.005, 0.98]} />
                <meshStandardMaterial color="#5a3018" roughness={0.92} />
              </mesh>
            ))}

            {/* === INTERIOR BOOKS GLIMPSE === visible lewat entrance opening,
                silhouette books di depan lit backdrop */}
            <mesh position={[-0.35, 0.36, 0.18]} rotation={[0, 0.2, 0]}>
              <boxGeometry args={[0.18, 0.05, 0.13]} />
              <meshStandardMaterial color="#7a4838" roughness={0.85} />
            </mesh>
            <mesh position={[-0.34, 0.41, 0.2]} rotation={[0, -0.1, 0.05]}>
              <boxGeometry args={[0.17, 0.05, 0.12]} />
              <meshStandardMaterial color="#3a5868" roughness={0.85} />
            </mesh>
            <mesh position={[-0.28, 0.48, 0.3]} rotation={[0, 0.6, 0.4]}>
              <boxGeometry args={[0.12, 0.18, 0.04]} />
              <meshStandardMaterial color="#7a6028" roughness={0.85} />
            </mesh>
            {/* Tambah book stack di sisi kiri biar interior gak kosong */}
            <mesh position={[-0.3, 0.36, -0.18]} rotation={[0, -0.15, 0]}>
              <boxGeometry args={[0.16, 0.05, 0.12]} />
              <meshStandardMaterial color="#5a4838" roughness={0.85} />
            </mesh>
            <mesh position={[-0.31, 0.41, -0.2]} rotation={[0, 0.1, -0.04]}>
              <boxGeometry args={[0.15, 0.05, 0.11]} />
              <meshStandardMaterial color="#7a3838" roughness={0.85} />
            </mesh>

            {/* Subtle scar — pojok lower-roof NW slightly weathered.
                "Yang bertahan, bukan yang utuh dari awal" — luka kota
                tetep ditinggal walau udah berdiri lagi. */}
            <mesh position={[-0.85, 1.28, -0.78]}>
              <boxGeometry args={[0.16, 0.04, 0.16]} />
              <meshStandardMaterial color="#2a2020" roughness={1} />
            </mesh>
          </>
        ) : (
          <>
            {/* === RUIN VARIANT (drought + locked) ===
                Damaged Japanese pagoda — palette diperterang supaya
                visible di drought scene yg muram, plus heavy pollution
                markers (smoke wisp, oil stain, mud puddle, withered vine,
                crow silhouette, more scattered debris). */}

            {/* === CRACKED GROUND PATCHES around base ===
                Concentric outward dari platform — kerasa "tanah pecah
                karena impact runtuhan struktur," localized di vicinity
                Perpustakaan (bukan scene-wide). */}
            {[
              { pos: [-1.6, 0.012, -0.95], r: 0.22, rot: 0.4 },
              { pos: [1.45, 0.012, 1.1], r: 0.18, rot: -0.3 },
              { pos: [-1.8, 0.012, 0.85], r: 0.2, rot: 0.6 },
              { pos: [1.6, 0.012, -0.7], r: 0.16, rot: -0.5 },
              { pos: [0.3, 0.012, 1.55], r: 0.14, rot: 0.2 },
              { pos: [-0.6, 0.012, -1.25], r: 0.2, rot: -0.4 },
            ].map((c, i) => (
              <React.Fragment key={`crack-ground-${i}`}>
                <mesh position={c.pos} rotation={[-Math.PI / 2, 0, c.rot]}>
                  <circleGeometry args={[c.r, 8]} />
                  <meshStandardMaterial color="#2a1810" roughness={1} />
                </mesh>
                {/* Linear crack line radiating outward */}
                <mesh
                  position={[
                    c.pos[0] + Math.cos(c.rot) * 0.15,
                    c.pos[1] + 0.001,
                    c.pos[2] + Math.sin(c.rot) * 0.15,
                  ]}
                  rotation={[-Math.PI / 2, 0, c.rot]}
                >
                  <planeGeometry args={[0.4, 0.012]} />
                  <meshStandardMaterial color="#1a0e08" roughness={1} />
                </mesh>
              </React.Fragment>
            ))}

            {/* === ISHIDAN STONE PLATFORM (cracked) === */}
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[2.0, 0.08, 1.7]} />
              <meshStandardMaterial
                color="#7a6448"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            {/* Crack line tipis di stone platform (NW corner) */}
            <mesh position={[-0.6, 0.085, -0.5]} rotation={[-Math.PI / 2, 0, 0.6]}>
              <planeGeometry args={[0.5, 0.012]} />
              <meshStandardMaterial color="#3a2010" />
            </mesh>
            {/* Crack line ke-2 (SE corner) — kerasa weathering merata */}
            <mesh position={[0.55, 0.085, 0.45]} rotation={[-Math.PI / 2, 0, -0.4]}>
              <planeGeometry args={[0.6, 0.014]} />
              <meshStandardMaterial color="#3a2010" />
            </mesh>
            {/* Tier 2 partial (chunked broken di corner -X) */}
            <mesh position={[0.15, 0.12, 0]}>
              <boxGeometry args={[1.6, 0.08, 1.5]} />
              <meshStandardMaterial
                color="#8a7460"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            {/* Dirt smear streaks di tier 2 atas (run-off discoloration) */}
            {[
              [-0.4, 0.16, 0.7], [0.3, 0.16, 0.65], [-0.6, 0.16, -0.6],
            ].map(([x, y, z], i) => (
              <mesh
                key={`smear-${i}`}
                position={[x, y, z]}
                rotation={[-Math.PI / 2, 0, i * 0.3]}
              >
                <planeGeometry args={[0.18, 0.08]} />
                <meshStandardMaterial color="#4a3828" roughness={0.95} />
              </mesh>
            ))}
            {/* Chunks of broken stone fallen di -X edge */}
            {[
              [-1.0, 0.05, -0.4], [-1.05, 0.04, 0.2], [-0.9, 0.04, -0.6],
            ].map(([x, y, z], i) => (
              <mesh key={`chunk-${i}`} position={[x, y, z]} rotation={[0.2, i * 0.5, 0.1]}>
                <boxGeometry args={[0.16, 0.08, 0.14]} />
                <meshStandardMaterial color="#8a7460" roughness={0.95} />
              </mesh>
            ))}

            {/* === ENGAWA DECK (splintered, missing planks) === */}
            <mesh position={[0.1, 0.21, 0]}>
              <boxGeometry args={[1.5, 0.04, 1.5]} />
              <meshStandardMaterial
                color="#6a4828"
                roughness={0.92}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            {/* Missing plank gaps — dark voids visible */}
            {[
              { x: 0.5, z: -0.45, w: 0.4, d: 0.18 },
              { x: -0.2, z: 0.5, w: 0.3, d: 0.22 },
            ].map((g, i) => (
              <mesh key={`gap-${i}`} position={[g.x, 0.235, g.z]}>
                <boxGeometry args={[g.w, 0.005, g.d]} />
                <meshStandardMaterial color="#3a2010" />
              </mesh>
            ))}
            {/* Splinter shards (rebar tipis miring) */}
            <mesh position={[0.55, 0.27, -0.5]} rotation={[0, 0.4, 0.6]}>
              <boxGeometry args={[0.12, 0.018, 0.015]} />
              <meshStandardMaterial color="#5a3820" roughness={0.95} />
            </mesh>
            <mesh position={[-0.2, 0.26, 0.6]} rotation={[0, -0.3, -0.4]}>
              <boxGeometry args={[0.1, 0.015, 0.015]} />
              <meshStandardMaterial color="#5a3820" roughness={0.95} />
            </mesh>
            {/* Dust drift accumulation di sudut engawa (corner buildup) */}
            <mesh
              position={[0.65, 0.243, 0.65]}
              rotation={[-Math.PI / 2, 0, 0.5]}
            >
              <circleGeometry args={[0.12, 8]} />
              <meshStandardMaterial color="#b8a080" roughness={0.95} />
            </mesh>
            <mesh
              position={[-0.7, 0.243, -0.65]}
              rotation={[-Math.PI / 2, 0, -0.3]}
            >
              <circleGeometry args={[0.1, 8]} />
              <meshStandardMaterial color="#a8907a" roughness={0.95} />
            </mesh>

            {/* === HASHIRA POSTS (some leaning, some patah) === */}
            {/* 3 dari 4 corner hashira masih berdiri (weathered) */}
            {[
              { pos: [0.7, 0.66, -0.6], rot: 0 },
              { pos: [0.7, 0.66, 0.6], rot: 0 },
              { pos: [-0.7, 0.58, 0.6], rot: 0.18 },
            ].map((c, i) => (
              <mesh key={`hash-r${i}`} position={c.pos} rotation={[0, 0, c.rot]}>
                <boxGeometry args={[0.085, 0.86, 0.085]} />
                <meshStandardMaterial
                  color="#6a4828"
                  roughness={0.95}
                  transparent
                  opacity={baseOpacity}
                />
              </mesh>
            ))}
            {/* Corner -X-Z hashira patah pendek (stub) */}
            <mesh position={[-0.7, 0.32, -0.6]}>
              <boxGeometry args={[0.085, 0.4, 0.085]} />
              <meshStandardMaterial
                color="#5a3820"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            {/* Hashira fragmen yg patah rebahan di ground */}
            <mesh
              position={[-1.1, 0.06, -0.4]}
              rotation={[0, 0.5, Math.PI / 2]}
            >
              <boxGeometry args={[0.085, 0.5, 0.085]} />
              <meshStandardMaterial color="#6a4828" roughness={0.95} />
            </mesh>

            {/* === WITHERED VINE === dead brown vine drooping dari corner
                hashira yg leaning, kerasa "alam nyerah duluan." */}
            {[0.4, 0.55, 0.7, 0.82].map((y, i) => (
              <mesh
                key={`dead-vine-${i}`}
                position={[-0.66, y, 0.62 + (i % 2) * 0.02]}
              >
                <sphereGeometry args={[0.035 + (i % 2) * 0.008, 5, 4]} />
                <meshStandardMaterial color="#7a5828" roughness={0.95} />
              </mesh>
            ))}

            {/* === SHOJI WALLS (empty kumiko frames, paper hilang) === */}
            {/* Right side wall frame (x=0.7) — frame remaining, no paper */}
            {[-0.36, 0, 0.36].map((z, i) => (
              <mesh
                key={`fr-rv${i}`}
                position={[0.7, 0.66, z]}
              >
                <boxGeometry args={[0.04, 0.85, 0.025]} />
                <meshStandardMaterial
                  color="#5a3820"
                  roughness={0.95}
                  transparent
                  opacity={baseOpacity}
                />
              </mesh>
            ))}
            {[0.4, 0.85].map((y, i) => (
              <mesh
                key={`fr-rh${i}`}
                position={[0.7, y, 0]}
              >
                <boxGeometry args={[0.04, 0.025, 1.2]} />
                <meshStandardMaterial
                  color="#5a3820"
                  roughness={0.95}
                  transparent
                  opacity={baseOpacity}
                />
              </mesh>
            ))}
            {/* Back wall (z=+0.6) — partial intact, kanan robek */}
            {[-0.45, 0].map((x, i) => (
              <mesh
                key={`fr-bv${i}`}
                position={[x, 0.66, 0.6]}
              >
                <boxGeometry args={[0.025, 0.85, 0.04]} />
                <meshStandardMaterial
                  color="#5a3820"
                  roughness={0.95}
                  transparent
                  opacity={baseOpacity}
                />
              </mesh>
            ))}
            <mesh position={[-0.3, 0.4, 0.6]}>
              <boxGeometry args={[0.65, 0.025, 0.04]} />
              <meshStandardMaterial
                color="#5a3820"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            {/* Torn paper shred hanging dari frame (small plane) */}
            <mesh position={[0.45, 0.66, 0.62]} rotation={[0, 0, -0.3]}>
              <planeGeometry args={[0.12, 0.32]} />
              <meshStandardMaterial
                color="#c8b890"
                roughness={0.95}
                side={2}
                transparent
                opacity={baseOpacity * 0.7}
              />
            </mesh>
            {/* Tambahan torn paper shred ke-2 hanging dari side wall */}
            <mesh position={[0.71, 0.5, -0.2]} rotation={[0, Math.PI / 2, 0.4]}>
              <planeGeometry args={[0.1, 0.2]} />
              <meshStandardMaterial
                color="#b8a880"
                roughness={0.95}
                side={2}
                transparent
                opacity={baseOpacity * 0.6}
              />
            </mesh>

            {/* Doorway lintel patah (lintel tinggal stub) — skip kalau locked */}
            {!isLocked && (
              <>
                {/* Stub lintel piece */}
                <mesh position={[-0.7, 1.0, 0.25]} rotation={[0, 0, -0.15]}>
                  <boxGeometry args={[0.06, 0.06, 0.7]} />
                  <meshStandardMaterial color="#5a3820" roughness={0.95} />
                </mesh>
                {/* Plaque patah — fall ke ground depan */}
                <mesh
                  position={[-0.9, 0.04, -0.2]}
                  rotation={[Math.PI / 2, 0, 0.3]}
                >
                  <boxGeometry args={[0.18, 0.025, 0.42]} />
                  <meshStandardMaterial color="#6a4828" roughness={0.95} />
                </mesh>
                {/* Books scattered di doma threshold + ground */}
                <mesh position={[-0.5, 0.26, 0.18]} rotation={[0, 0.2, 0]}>
                  <boxGeometry args={[0.16, 0.04, 0.12]} />
                  <meshStandardMaterial color="#8a4838" roughness={0.92} />
                </mesh>
                <mesh
                  position={[-0.95, 0.04, 0.35]}
                  rotation={[0, 0.6, 0.05]}
                >
                  <boxGeometry args={[0.15, 0.035, 0.11]} />
                  <meshStandardMaterial color="#5a5878" roughness={0.92} />
                </mesh>
                <mesh
                  position={[-1.05, 0.04, -0.05]}
                  rotation={[0, -0.3, 0.1]}
                >
                  <boxGeometry args={[0.12, 0.18, 0.04]} />
                  <meshStandardMaterial color="#8a7048" roughness={0.92} />
                </mesh>
                {/* Ash scorch patch di tanah depan entrance */}
                <mesh position={[-1.0, 0.011, 0.0]} rotation={[-Math.PI / 2, 0, 0.3]}>
                  <circleGeometry args={[0.22, 10]} />
                  <meshStandardMaterial color="#3a2010" roughness={1} />
                </mesh>
                {/* Tambahan paper trash flying-ish (scrolls torn) */}
                <mesh
                  position={[-1.15, 0.025, -0.42]}
                  rotation={[-Math.PI / 2, 0, 0.4]}
                >
                  <planeGeometry args={[0.18, 0.05]} />
                  <meshStandardMaterial
                    color="#c8b890"
                    roughness={0.95}
                    side={2}
                  />
                </mesh>
                <mesh
                  position={[-0.85, 0.025, 0.7]}
                  rotation={[-Math.PI / 2, 0, -0.3]}
                >
                  <planeGeometry args={[0.14, 0.04]} />
                  <meshStandardMaterial
                    color="#b8a880"
                    roughness={0.95}
                    side={2}
                  />
                </mesh>
              </>
            )}

            {/* Lock cube depan doorway (kalau locked) */}
            {isLocked && (
              <mesh position={[-0.5, 0.45, 0]}>
                <boxGeometry args={[0.18, 0.18, 0.1]} />
                <meshStandardMaterial color="#8a8070" roughness={1} />
              </mesh>
            )}

            {/* Side window — dark/dead (gak ada glow tatami) */}
            <mesh position={[0.7, 0.6, 0]}>
              <boxGeometry args={[0.025, 0.42, 0.42]} />
              <meshStandardMaterial
                color="#4a2818"
                roughness={0.85}
                transparent
                opacity={baseOpacity}
              />
            </mesh>

            {/* === COLLAPSED LOWER ROOF === Setengah runtuh: sisi +Z masih
                ada tilted, sisi -Z runtuh hilang */}
            {/* Roof slab partial — miring jatuh ke kanan-belakang */}
            <mesh position={[0.3, 1.1, 0.2]} rotation={[-0.18, 0, -0.12]}>
              <boxGeometry args={[1.5, 0.07, 1.4]} />
              <meshStandardMaterial
                color="#6a6070"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            {/* Few kawara tile rows yg masih nempel */}
            {[-0.3, 0, 0.3].map((z, i) => (
              <mesh
                key={`tile-r${i}`}
                position={[0.3, 1.14, z + 0.2]}
                rotation={[-0.18, 0, -0.12]}
              >
                <boxGeometry args={[1.45, 0.018, 0.08]} />
                <meshStandardMaterial color="#7a7080" roughness={0.95} />
              </mesh>
            ))}
            {/* Exposed taruki rafters protruding (broken roof structure visible) */}
            {[-0.4, -0.1, 0.2, 0.5].map((z, i) => (
              <mesh
                key={`rafter-${i}`}
                position={[-0.55, 1.0, z]}
                rotation={[0.3 + i * 0.05, 0, -0.4]}
              >
                <boxGeometry args={[0.6, 0.045, 0.045]} />
                <meshStandardMaterial color="#5a3820" roughness={0.95} />
              </mesh>
            ))}
            {/* Scattered kawara tile shards di ground */}
            {[
              [-1.15, 0.04, 0.6], [-0.85, 0.03, 1.05],
              [0.5, 0.03, -1.1], [1.2, 0.04, 0.3],
              [-0.55, 0.03, 1.15], [1.0, 0.03, -0.95],
            ].map(([x, y, z], i) => (
              <mesh
                key={`shard-${i}`}
                position={[x, y, z]}
                rotation={[0.1, i * 0.5, 0.05]}
              >
                <boxGeometry args={[0.1, 0.025, 0.08]} />
                <meshStandardMaterial color="#7a7080" roughness={0.95} />
              </mesh>
            ))}

            {/* === SMOKE WISPS rising dari collapsed roof === Decorative
                tar smoke remaining post-disaster, kerasa "kebakaran udah
                lewat tapi belum hilang." */}
            <mesh position={[-0.4, 1.5, 0]}>
              <planeGeometry args={[0.5, 0.8]} />
              <meshBasicMaterial
                color="#5a4838"
                transparent
                opacity={0.35}
                depthWrite={false}
                side={2}
              />
            </mesh>
            <mesh position={[-0.3, 1.85, 0.1]}>
              <planeGeometry args={[0.42, 0.65]} />
              <meshBasicMaterial
                color="#6a5848"
                transparent
                opacity={0.25}
                depthWrite={false}
                side={2}
              />
            </mesh>
            <mesh position={[-0.15, 2.15, -0.05]}>
              <planeGeometry args={[0.36, 0.55]} />
              <meshBasicMaterial
                color="#7a6858"
                transparent
                opacity={0.18}
                depthWrite={false}
                side={2}
              />
            </mesh>

            {/* === FALLEN SŌRIN === Pinnacle patah jatuh terbaring */}
            <mesh
              position={[-1.2, 0.06, 0.6]}
              rotation={[0, 0.4, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.018, 0.022, 0.36, 6]} />
              <meshStandardMaterial color="#8a5828" roughness={0.85} />
            </mesh>
            {/* Hoju jewel tergeletak (no longer glowing emissive kuat) */}
            <mesh position={[-1.4, 0.04, 0.55]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color="#8a7038" roughness={0.85} />
            </mesh>
            {/* Lotus base fukubachi patah */}
            <mesh
              position={[-1.0, 0.05, 0.75]}
              rotation={[Math.PI / 2, 0, 0.3]}
            >
              <cylinderGeometry args={[0.075, 0.095, 0.04, 8]} />
              <meshStandardMaterial color="#6a4828" roughness={0.95} />
            </mesh>

            {/* === TOPPLED TORO LANTERN === Stone lantern jatuh terbaring */}
            <mesh position={[-1.55, 0.04, 0.85]} rotation={[Math.PI / 2, 0, 0.2]}>
              <cylinderGeometry args={[0.05, 0.06, 0.22, 6]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>
            <mesh position={[-1.75, 0.05, 0.92]}>
              <boxGeometry args={[0.13, 0.1, 0.13]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>
            {/* Other toro masih berdiri intact (mirror agyō/ungyō ada satu yg ditegakkan) */}
            <mesh position={[-1.55, 0.2, -0.9]}>
              <boxGeometry args={[0.18, 0.08, 0.18]} />
              <meshStandardMaterial color="#7a6448" roughness={0.95} />
            </mesh>
            <mesh position={[-1.55, 0.35, -0.9]}>
              <cylinderGeometry args={[0.05, 0.06, 0.22, 6]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>
            <mesh position={[-1.55, 0.51, -0.9]}>
              <boxGeometry args={[0.13, 0.13, 0.13]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>
            <mesh position={[-1.55, 0.61, -0.9]}>
              <coneGeometry args={[0.1, 0.07, 4]} />
              <meshStandardMaterial color="#7a6448" roughness={0.95} />
            </mesh>

            {/* === BROKEN KOMA-INU === 1 utuh, 1 kepala hilang */}
            {/* Lion kiri intact (sitting weathered) */}
            <mesh position={[-1.55, 0.06, -0.45]}>
              <boxGeometry args={[0.14, 0.12, 0.16]} />
              <meshStandardMaterial color="#7a6448" roughness={0.95} />
            </mesh>
            <mesh position={[-1.55, 0.21, -0.45]}>
              <boxGeometry args={[0.085, 0.13, 0.1]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>
            <mesh position={[-1.6, 0.3, -0.45]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>
            {/* Lion kanan — kepala lepas terbaring di samping */}
            <mesh position={[-1.55, 0.06, 0.45]}>
              <boxGeometry args={[0.14, 0.12, 0.16]} />
              <meshStandardMaterial color="#7a6448" roughness={0.95} />
            </mesh>
            <mesh position={[-1.55, 0.21, 0.45]}>
              <boxGeometry args={[0.085, 0.13, 0.1]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>
            {/* Detached head di ground sebelahnya */}
            <mesh position={[-1.7, 0.05, 0.6]} rotation={[0.3, 0.5, 0.2]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshStandardMaterial color="#8a7460" roughness={0.95} />
            </mesh>

            {/* === DISTURBED KARESANSUI === Sand patch tipis tanpa rake pattern */}
            <mesh position={[0.3, 0.005, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.3, 0.45]} />
              <meshStandardMaterial color="#b8a080" roughness={0.95} />
            </mesh>
            {/* Rocks displaced/scattered */}
            <mesh position={[-0.2, 0.05, 1.4]} rotation={[0.2, 0.4, 0.3]} scale={[0.1, 0.07, 0.09]}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshStandardMaterial color="#6a4838" roughness={0.95} />
            </mesh>
            <mesh position={[0.5, 0.04, 1.15]} rotation={[0.4, 0, 0.2]} scale={[0.08, 0.05, 0.07]}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshStandardMaterial color="#7a6448" roughness={0.95} />
            </mesh>

            {/* === WITHERED BAMBOO GROVE === Stalks broken/dry */}
            {[
              { x: -0.3, z: 1.65, h: 1.0, lean: 0.4 },
              { x: 0.05, z: 1.78, h: 0.6, lean: 0 },
              { x: 0.35, z: 1.7, h: 1.4, lean: -0.3 },
              { x: -0.1, z: 1.85, h: 0.4, lean: 0 },
              { x: 0.5, z: 1.6, h: 0.8, lean: 0.5 },
            ].map((b, i) => (
              <mesh
                key={`drybamboo-${i}`}
                position={[b.x, b.h / 2, b.z]}
                rotation={[0, 0, b.lean]}
              >
                <cylinderGeometry args={[0.03, 0.04, b.h, 5]} />
                <meshStandardMaterial color="#8a7038" roughness={0.95} />
              </mesh>
            ))}
            {/* Broken bamboo segments di ground (snapped pieces) */}
            <mesh
              position={[0.1, 0.05, 1.4]}
              rotation={[0, 0.3, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.03, 0.03, 0.5, 5]} />
              <meshStandardMaterial color="#7a5828" roughness={0.95} />
            </mesh>
            <mesh
              position={[-0.4, 0.05, 1.3]}
              rotation={[0, -0.4, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.025, 0.025, 0.4, 5]} />
              <meshStandardMaterial color="#7a5828" roughness={0.95} />
            </mesh>

            {/* === TATTERED NOREN === Single strip remaining torn hanging */}
            {!isLocked && (
              <mesh position={[-0.78, 0.78, 0.05]} rotation={[0, 0, -0.18]}>
                <planeGeometry args={[0.13, 0.28]} />
                <meshStandardMaterial
                  color="#6a4848"
                  roughness={0.95}
                  side={2}
                  transparent
                  opacity={baseOpacity * 0.7}
                />
              </mesh>
            )}

            {/* === ASH PATCHES === Scorch marks scattered di base perimeter */}
            {[
              [-0.6, 0.011, -1.0], [0.7, 0.011, 1.15],
              [1.2, 0.011, -0.4],
            ].map(([x, y, z], i) => (
              <mesh
                key={`ash-${i}`}
                position={[x, y, z]}
                rotation={[-Math.PI / 2, 0, i * 0.4]}
              >
                <circleGeometry args={[0.18, 8]} />
                <meshStandardMaterial color="#3a2010" roughness={1} />
              </mesh>
            ))}

            {/* === OIL/TAR STAIN PATCHES === Dark glossy patches scattered
                di engawa/platform — kerasa polusi lebih heavy dari
                ash kering biasa. */}
            {[
              { pos: [0.3, 0.243, -0.35], r: 0.16 },
              { pos: [-0.5, 0.243, 0.4], r: 0.13 },
              { pos: [0.2, 0.131, 0.5], r: 0.18 },
            ].map((s, i) => (
              <mesh
                key={`tar-${i}`}
                position={s.pos}
                rotation={[-Math.PI / 2, 0, i * 0.6]}
              >
                <circleGeometry args={[s.r, 10]} />
                <meshStandardMaterial
                  color="#1a1208"
                  roughness={0.6}
                  metalness={0.2}
                />
              </mesh>
            ))}

            {/* === MUD PUDDLE === di ground depan genkan stairs (dark
                glossy patch dari air drainage rusak) */}
            <mesh
              position={[-1.6, 0.012, 0.2]}
              rotation={[-Math.PI / 2, 0, 0.3]}
            >
              <circleGeometry args={[0.32, 12]} />
              <meshStandardMaterial
                color="#3a2818"
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>
            {/* Smaller secondary puddle */}
            <mesh
              position={[-2.05, 0.012, -0.15]}
              rotation={[-Math.PI / 2, 0, -0.2]}
            >
              <circleGeometry args={[0.2, 10]} />
              <meshStandardMaterial
                color="#3a2818"
                roughness={0.45}
                metalness={0.25}
              />
            </mesh>

            {/* === DEBRIS PILE === Tumpukan kayu/batu campur di pojok
                belakang kanan, kerasa "puing yang gak dibersihin." */}
            {[
              { pos: [1.3, 0.05, -0.95], scale: [0.18, 0.1, 0.14], rot: 0.3, c: '#6a4828' },
              { pos: [1.4, 0.04, -1.05], scale: [0.14, 0.08, 0.16], rot: -0.5, c: '#7a6448' },
              { pos: [1.25, 0.13, -1.0], scale: [0.12, 0.07, 0.1], rot: 0.6, c: '#5a3820' },
              { pos: [1.42, 0.15, -0.9], scale: [0.1, 0.06, 0.12], rot: 0.2, c: '#7a7080' },
            ].map((d, i) => (
              <mesh
                key={`debris-${i}`}
                position={d.pos}
                rotation={[0.1, d.rot, 0.15]}
                scale={d.scale}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={d.c} roughness={0.95} />
              </mesh>
            ))}

            {/* === CROW SILHOUETTE === Burung gelap nangkring di patah
                hashira stub corner (post-disaster scavenger vibe). */}
            <mesh position={[-0.7, 0.55, -0.6]}>
              <sphereGeometry args={[0.04, 6, 5]} />
              <meshBasicMaterial color="#0a0604" />
            </mesh>
            <mesh position={[-0.7, 0.6, -0.6]}>
              <sphereGeometry args={[0.025, 6, 5]} />
              <meshBasicMaterial color="#0a0604" />
            </mesh>
            <mesh position={[-0.69, 0.6, -0.575]}>
              <coneGeometry args={[0.008, 0.025, 4]} />
              <meshBasicMaterial color="#3a2818" />
            </mesh>

            {/* === DEAD WISTERIA === replace purified wisteria — dry brown
                droops di back-right corner hashira (mirror slot). */}
            {[0.32, 0.46, 0.6, 0.74, 0.88].map((y, i) => (
              <mesh
                key={`deadwist-${i}`}
                position={[0.74, y, 0.64 + (i % 2) * 0.015]}
              >
                <sphereGeometry args={[0.025 + (i % 2) * 0.008, 5, 4]} />
                <meshStandardMaterial color="#6a4828" roughness={0.95} />
              </mesh>
            ))}
          </>
        )}
      </group>

      {!modalOpen && (
        <Html position={[0, 2.3, 0]} center distanceFactor={10} occlude={false}>
          <div
            className={`text-center pointer-events-none select-none whitespace-nowrap transition-all duration-300 ease-out ${
              hovered && !isLocked ? '-translate-y-1' : ''
            }`}
          >
            <div
              className={`text-[11px] font-medium tracking-wide transition-colors ${
                isLocked
                  ? 'text-white/45'
                  : hovered
                  ? 'text-white'
                  : 'text-white/80'
              }`}
            >
              Perpustakaan
            </div>
            <div
              className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
                isLocked
                  ? 'text-white/30'
                  : hovered
                  ? 'text-amber-200/85'
                  : 'text-white/55'
              }`}
            >
              {petakState === 'restored'
                ? 'Rak berdiri lagi'
                : petakState === 'drought'
                ? 'Setengah runtuh'
                : 'Belum terbuka'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Lantai taman — plane besar dengan grid tipis untuk persepsi skala.
//   drought  → dark warm sandy "desert dusk" (#2a2018)
//   purified → warm-moss green; grid color hampir merge sama floor
//              supaya gak kelihatan banding "lubang"
const TamanFloor = ({ purified = false, purifyProgress = 0 }) => {
  // Continuous color lerp dari drought (warm dusty brown) ke purified
  // (warm-moss green). Per +100 count, tanah sedikit lebih hijau.
  const colors = useMemo(() => {
    const t = purified ? 1 : purifyProgress;
    const lerpHex = (a, b) =>
      new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
    return {
      floor: lerpHex('#2a2018', '#3e4a30'),
      gridMajor: lerpHex('#3a2c22', '#3e4a30'),
      gridMinor: lerpHex('#2a2018', '#3e4a30'),
    };
  }, [purified, purifyProgress]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={colors.floor} roughness={1} />
      </mesh>
      <gridHelper
        args={[40, 40, colors.gridMajor, colors.gridMinor]}
        position={[0, 0.005, 0]}
      />
    </>
  );
};

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
// DroughtRing — outer ground surrounding the inner petak hex.
//   drought  → sand wasteland (deep amber-sand + bleached ring + dry
//              patches). Pemulihan visible via saplings yg tumbuh
//              DI ANTARA, gak ngubah desert itu sendiri.
//   purified → meadow (lush green carpet bridging dari petak hex ke
//              outer floor seamless, gak ada banding "lubang" gap).
//              Patches jadi flower beds.
const DroughtRing = ({ purified = false, purifyProgress = 0 }) => {
  // Continuous lerp drought→purified per count. Outer ring, inner band,
  // dan patch colors smooth shift drought (amber sand) → meadow (green).
  // Geometry tetep discrete swap (band vs disc) di purified karena
  // beda topology, tapi color band ramps continuously.
  const colors = useMemo(() => {
    const t = purified ? 1 : purifyProgress;
    const lerpHex = (a, b) =>
      new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
    return {
      outerRing: lerpHex('#5a3520', '#445230'),
      innerBand: lerpHex('#7a5535', '#6a8838'),
      patch: lerpHex('#8a6535', '#6a8848'),
    };
  }, [purified, purifyProgress]);
  const innerBandOpacity = purified ? 0.9 : 0.75 + purifyProgress * 0.15;
  return (
    <>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[9.5, 19, 64]} />
        <meshStandardMaterial color={colors.outerRing} roughness={1} />
      </mesh>
      {/* Inner meadow carpet — geometry swap di purified (disc lebih
          luas nutup pusat hex). Drought: narrow band 9.5-11.5. */}
      {purified ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
          <circleGeometry args={[11.5, 64]} />
          <meshStandardMaterial
            color={colors.innerBand}
            roughness={1}
            transparent
            opacity={innerBandOpacity}
          />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
          <ringGeometry args={[9.5, 11.5, 64]} />
          <meshStandardMaterial
            color={colors.innerBand}
            roughness={1}
            transparent
            opacity={innerBandOpacity}
          />
        </mesh>
      )}
      {/* Scattered patches — color lerp drought→meadow continuous */}
      {DROUGHT_PATCH_DEFS.map((p, i) => (
        <mesh
          key={`dp-${i}`}
          rotation={[-Math.PI / 2, 0, p.rot]}
          position={p.pos}
          scale={p.scale}
        >
          <circleGeometry args={[0.5, 8]} />
          <meshStandardMaterial color={colors.patch} roughness={1} />
        </mesh>
      ))}
    </>
  );
};

// FlowerClusters — purified-only. ~24 small flower bouquet clusters
// scatter di outer ring + petak-adjacent area. Tiap cluster = 1 stem
// (thin green cylinder) + 3 petal spheres di top dgn warna acak dari
// palette (peach apricot, soft pink, cream white, warm amber).
// Deterministic seed via index supaya stable layout tiap render.
const FLOWER_PALETTE = [
  '#f4a8a0', // peach apricot
  '#f8c4a0', // soft peach
  '#fbd8d8', // soft pink
  '#fff0d8', // cream
  '#f4b890', // warm amber
  '#e88a98', // dusty rose
];
const FLOWER_CLUSTER_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 42; i++) {
    const angle =
      (i / 42) * Math.PI * 2 + ((i * 19) % 13) * 0.09;
    // Radius distribution mixed: inner near hex edge, outer in ring,
    // a few near the dome-perpustakaan / telaga / pohon path edges.
    const band = i % 7;
    let r;
    if (band < 2) r = 6 + ((i * 7) % 5) * 0.5; // inner edge
    else if (band < 5) r = 10.5 + ((i * 11) % 9) * 0.6; // outer ring
    else r = 8 + ((i * 13) % 5) * 0.4; // intermediate
    const tilt = ((i * 29) % 12) * 0.04 - 0.2;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      scale: 0.7 + ((i * 13) % 5) * 0.15,
      tilt,
      swayPhase: ((i * 41) % 100) * 0.063,
      colors: [
        FLOWER_PALETTE[i % FLOWER_PALETTE.length],
        FLOWER_PALETTE[(i + 2) % FLOWER_PALETTE.length],
        FLOWER_PALETTE[(i + 4) % FLOWER_PALETTE.length],
      ],
    });
  }
  return arr;
})();
// Subtle wind sway — rotation.z oscillates around base tilt dgn phase
// per cluster (deterministic seed) supaya gak in-sync, kerasa angin
// bertiup pelan natural.
const FlowerCluster = ({ pos, scale, tilt, swayPhase, colors }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = tilt + Math.sin(t * 0.8 + swayPhase) * 0.08;
  });
  return (
    <group ref={groupRef} position={pos} scale={scale} rotation={[0, 0, tilt]}>
      {/* Stem — thin tall green cylinder */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 0.36, 5]} />
        <meshStandardMaterial color="#4a6838" roughness={0.95} />
      </mesh>
      {/* 2 small leaves di mid-stem */}
      <mesh position={[0.05, 0.15, 0]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.08, 0.025, 0.015]} />
        <meshStandardMaterial color="#5a7a48" roughness={0.95} />
      </mesh>
      <mesh position={[-0.05, 0.2, 0.02]} rotation={[0, 0, 0.7]}>
        <boxGeometry args={[0.07, 0.022, 0.015]} />
        <meshStandardMaterial color="#5a7a48" roughness={0.95} />
      </mesh>
      {/* 3 petal blooms di top, sedikit offset utk volume */}
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial
          color={colors[0]}
          emissive={colors[0]}
          emissiveIntensity={0.18}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0.06, 0.36, 0.04]}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshStandardMaterial
          color={colors[1]}
          emissive={colors[1]}
          emissiveIntensity={0.15}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[-0.05, 0.36, -0.04]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial
          color={colors[2]}
          emissive={colors[2]}
          emissiveIntensity={0.15}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
};
const FlowerClusters = ({ isMobile = false }) => {
  const defs = isMobile
    ? FLOWER_CLUSTER_DEFS.slice(0, 22)
    : FLOWER_CLUSTER_DEFS;
  return (
    <>
      {defs.map((d, i) => (
        <FlowerCluster key={`flower-${i}`} {...d} />
      ))}
    </>
  );
};

// GrassBlades — purified-only. Thin vertical green plane sprites
// scattered di outer ring, kasih hint "rumput tumbuh segar lagi". Tinggi
// rendah (0.12-0.2y) supaya gak crowding peta — accent texture, bukan
// hero element. Deterministic seed. Subtle Z sway via parent useFrame +
// refs array, phase per blade supaya rumputnya kerasa ditiup angin.
const GRASS_BLADE_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 40; i++) {
    const angle =
      (i / 40) * Math.PI * 2 + ((i * 7) % 11) * 0.08;
    const r = 9.8 + ((i * 13) % 9) * 0.5;
    arr.push({
      pos: [Math.cos(angle) * r, 0.06, Math.sin(angle) * r],
      rot: ((i * 31) % 360) * (Math.PI / 180),
      height: 0.12 + ((i * 17) % 5) * 0.02,
      swayPhase: ((i * 53) % 100) * 0.063,
    });
  }
  return arr;
})();
const GrassBlades = ({ isMobile = false }) => {
  const defs = isMobile
    ? GRASS_BLADE_DEFS.slice(0, 20)
    : GRASS_BLADE_DEFS;
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.rotation.z = Math.sin(t * 1.1 + defs[i].swayPhase) * 0.12;
    });
  });
  return (
    <>
      {defs.map((d, i) => (
        <mesh
          key={`grass-${i}`}
          ref={(el) => (refs.current[i] = el)}
          position={d.pos}
          rotation={[0, d.rot, 0]}
        >
          <planeGeometry args={[0.05, d.height]} />
          <meshStandardMaterial
            color="#5a7848"
            roughness={1}
            side={2}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </>
  );
};

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

// DistantCityRuins — layer kedua di radius 40-50 (di belakang CityRuins
// 22-30). Mostly fog-absorbed silhouette (fog far=38), kerasa kota
// sprawl jauh, depth atmospheric. Simple box shapes, single dark color,
// no variation detail — pure silhouette role.
const DISTANT_RUIN_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + ((i * 23) % 11) * 0.05;
    const r = 40 + ((i * 17) % 10);
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      h: 0.8 + ((i * 7) % 18) * 0.1, // 0.8-2.6 range
      w: 0.6 + ((i * 11) % 7) * 0.15, // 0.6-1.5 range
      rot: ((i * 13) % 31) * 0.1,
    });
  }
  return arr;
})();
const DistantCityRuins = ({ isMobile = false }) => {
  // Mobile cull: 28 → 16
  const list = isMobile
    ? DISTANT_RUIN_DEFS.slice(0, 16)
    : DISTANT_RUIN_DEFS;
  return (
    <>
      {list.map((r, i) => (
        <mesh
          key={`distant-ruin-${i}`}
          position={[r.pos[0], r.h / 2, r.pos[2]]}
          rotation={[0, r.rot, 0]}
        >
          <boxGeometry args={[r.w, r.h, r.w]} />
          <meshStandardMaterial color="#3a1f24" roughness={1} />
        </mesh>
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

// WindStreaks — thin elongated lines drifting horizontally (-X → +X)
// di berbagai altitude, lebih dramatic vs dust particles round. Kasih
// sense "angin gersang ngalir konsisten" — visible wind currents.
// Plane flat di sumbu xz (rotation -π/2 sumbu x), elongated along x.
// Opacity rendah supaya subtle, beda intensitas per streak.
const WindStreaks = ({ count = 12 }) => {
  const refs = useRef([]);
  const defs = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        startX: -22 - Math.random() * 6,
        y: 0.5 + Math.random() * 5,
        z: -22 + Math.random() * 44,
        len: 2.5 + Math.random() * 2.5,
        speed: 1.5 + Math.random() * 1.0,
        opacity: 0.06 + Math.random() * 0.07,
      });
    }
    return arr;
  }, [count]);
  useFrame((_, delta) => {
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.position.x += defs[i].speed * delta;
      if (mesh.position.x > 24) {
        mesh.position.x = -24;
        mesh.position.z = -22 + Math.random() * 44;
      }
    });
  });
  return (
    <>
      {defs.map((d, i) => (
        <mesh
          key={`wind-${i}`}
          ref={(el) => (refs.current[i] = el)}
          position={[d.startX, d.y, d.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[d.len, 0.04]} />
          <meshBasicMaterial
            color="#d8a878"
            transparent
            opacity={d.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
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

// MossOverlay — purified-only. Scatter translucent moss/grass patches
// di luar hex inner area (radius 10-17) supaya outer ring drought tetep
// gak hilang teksturnya tapi kerasa "tanaman pertama merangkak balik".
// Deterministic seed via index — gak random tiap render (stable layout).
const MOSS_PATCH_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + ((i * 31) % 11) * 0.07;
    const r = 10.5 + ((i * 13) % 6);
    arr.push({
      pos: [Math.cos(angle) * r, 0.018, Math.sin(angle) * r],
      scale: 0.7 + ((i * 17) % 5) * 0.22,
      rot: ((i * 41) % 360) * (Math.PI / 180),
      tint: i % 3 === 0 ? '#6a8a58' : i % 3 === 1 ? '#7a9560' : '#8aa468',
    });
  }
  return arr;
})();
const MossOverlay = () => (
  <>
    {MOSS_PATCH_DEFS.map((p, i) => (
      <mesh
        key={`moss-${i}`}
        rotation={[-Math.PI / 2, 0, p.rot]}
        position={p.pos}
        scale={p.scale}
      >
        <circleGeometry args={[0.7, 10]} />
        <meshStandardMaterial
          color={p.tint}
          roughness={1}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
    ))}
  </>
);

// ApricotPetals — purified-only falling petals dari sky high (10-14y)
// turun perlahan ke 0.2y, kemudian respawn di atas. Drift X tipis +
// gentle rotation (handled via Y bob since particle is point, not mesh).
// Tone soft warm peach + emissive subtle — apricot petals tribute ke
// Armeniaca etymology (apricot = pohon yang nolak mati di pusat peta).
// Sparse intentionally — bukan snowstorm, lebih kerasa "ada yang
// melepaskan harapan dari langit".
const ApricotPetals = ({ count = 50 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 32;
      arr[i * 3 + 1] = Math.random() * 12 + 0.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }
    return arr;
  }, [count]);
  const drifts = useMemo(() => {
    const arr = new Float32Array(count * 2); // [vy, vx]
    for (let i = 0; i < count; i++) {
      arr[i * 2] = -0.018 - Math.random() * 0.012; // slow fall
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.018; // horizontal drift
    }
    return arr;
  }, [count]);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += drifts[i * 2] * delta * 60;
      // Petal wobble — sine on X based on Y level
      arr[i * 3] +=
        drifts[i * 2 + 1] * delta * 60 + Math.sin(t * 0.6 + i) * 0.002;
      if (arr[i * 3 + 1] < 0.2) {
        arr[i * 3 + 1] = 12 + Math.random() * 2;
        arr[i * 3] = (Math.random() - 0.5) * 32;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 32;
      }
      if (arr[i * 3] > 18) arr[i * 3] = -18;
      if (arr[i * 3] < -18) arr[i * 3] = 18;
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
        size={0.32}
        color="#f8b890"
        transparent
        opacity={0.62}
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
const DeadTree = ({ pos, rot, scale, lean, purified = false, reviving = false }) => (
  <group position={pos} rotation={[0, rot, lean]} scale={scale}>
    {/* Trunk — taper bottom-wide top-narrow, sedikit nyangkut tanah.
        Purified: tone slight warmer (kerasa bark hidup lagi tipis2). */}
    <mesh position={[0, 0.9, 0]}>
      <cylinderGeometry args={[0.06, 0.14, 1.8, 6]} />
      <meshStandardMaterial color={purified ? '#3a2418' : '#2a1810'} roughness={1} />
    </mesh>
    {/* Cabang utama kanan, miring 25° */}
    <mesh position={[0.28, 1.45, 0]} rotation={[0, 0, -0.45]}>
      <cylinderGeometry args={[0.025, 0.055, 0.85, 5]} />
      <meshStandardMaterial color={purified ? '#3a2418' : '#2a1810'} roughness={1} />
    </mesh>
    {/* Cabang kiri, sedikit lebih kecil */}
    <mesh position={[-0.22, 1.25, 0.08]} rotation={[0.15, 0, 0.5]}>
      <cylinderGeometry args={[0.02, 0.045, 0.7, 5]} />
      <meshStandardMaterial color={purified ? '#3a2418' : '#2a1810'} roughness={1} />
    </mesh>
    {/* Cabang atas patah */}
    <mesh position={[0.08, 1.7, -0.18]} rotation={[-0.3, 0, -0.18]}>
      <cylinderGeometry args={[0.015, 0.035, 0.55, 5]} />
      <meshStandardMaterial color={purified ? '#3a2418' : '#2a1810'} roughness={1} />
    </mesh>
    {/* Cabang kecil tambahan */}
    <mesh position={[0.4, 1.6, 0.1]} rotation={[0, 0.2, -0.7]}>
      <cylinderGeometry args={[0.012, 0.025, 0.4, 5]} />
      <meshStandardMaterial color={purified ? '#3a2418' : '#2a1810'} roughness={1} />
    </mesh>
    {/* Reviving — small foliage cluster di top + 2 apricot bloom di
        branches. Cuma di-render utk subset of trees (deterministic via
        reviving prop). Narrative: bahkan yang dianggap mati pun balik
        lagi, kadang. */}
    {reviving && (
      <>
        {/* Foliage cluster on top of trunk — soft warm-green sphere */}
        <mesh position={[0.08, 2.0, -0.1]}>
          <sphereGeometry args={[0.35, 10, 8]} />
          <meshStandardMaterial
            color="#6a8a48"
            emissive="#5a7838"
            emissiveIntensity={0.12}
            roughness={0.85}
          />
        </mesh>
        {/* 2 apricot blooms on right branch end */}
        <mesh position={[0.55, 1.7, 0]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial
            color="#f4a890"
            emissive="#f4a890"
            emissiveIntensity={0.25}
            roughness={0.6}
          />
        </mesh>
        <mesh position={[0.62, 1.62, 0.05]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial
            color="#f8c4a0"
            emissive="#f8c4a0"
            emissiveIntensity={0.22}
            roughness={0.6}
          />
        </mesh>
        {/* 1 small bloom on left branch */}
        <mesh position={[-0.44, 1.55, 0.18]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial
            color="#fbd8d8"
            emissive="#fbd8d8"
            emissiveIntensity={0.2}
            roughness={0.6}
          />
        </mesh>
      </>
    )}
  </group>
);
// Dead trees — ALWAYS visible (user suka aesthetic gurun rusak).
// Purified: trunk tone shift slight warmer + deterministic subset (~40%)
// dapat reviving foliage + apricot blooms. Bahkan yg paling tergores
// pun balik, tapi cuma sebagian — narasi "yang bertahan, bukan yang
// utuh dari awal".
const DeadTrees = ({ isMobile = false, purified = false }) => {
  const defs = isMobile ? DEAD_TREE_DEFS.slice(0, 5) : DEAD_TREE_DEFS;
  return defs.map((d, i) => (
    <DeadTree
      key={`dt-${i}`}
      {...d}
      purified={purified}
      reviving={purified && i % 5 < 2}
    />
  ));
};

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
// HopeEcho — counter-narrative tipis di peta level, echo dari gersang
// HopeSignals. 2 tier scaled ke peta thresholds:
//   T0 (always loaded): PetaSprout — 1 tunas hijau tunggal dekat
//     CenterTree, seed of hope diam2 di hub.
//   T1 (count >= 4000 / r1Restore): PetaBloom — 1 bunga colorful kecil
//     dekat lorong stones, "kehidupan mulai balik sejak r1 restored".
// Peta gak butuh 4 tier seperti gersang krn threshold meta-level
// beda — 6000+ peta sendiri transition state lewat telagaState.
const PetaSprout = ({ pos }) => (
  <group position={pos}>
    <mesh position={[0, 0.06, 0]}>
      <boxGeometry args={[0.018, 0.12, 0.018]} />
      <meshStandardMaterial color="#4a7a3a" roughness={0.85} />
    </mesh>
    <mesh position={[0.025, 0.085, 0]} rotation={[0, 0, -0.5]}>
      <boxGeometry args={[0.05, 0.012, 0.035]} />
      <meshStandardMaterial color="#5a8a3e" roughness={0.85} />
    </mesh>
    <mesh position={[-0.025, 0.11, 0]} rotation={[0, 0, 0.5]}>
      <boxGeometry args={[0.04, 0.012, 0.03]} />
      <meshStandardMaterial color="#5a8a3e" roughness={0.85} />
    </mesh>
  </group>
);
const PetaBloom = ({ pos }) => (
  <group position={pos}>
    <mesh position={[0, 0.1, 0]}>
      <boxGeometry args={[0.02, 0.2, 0.02]} />
      <meshStandardMaterial color="#5a7a3a" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.22, 0]}>
      <sphereGeometry args={[0.035, 8, 6]} />
      <meshStandardMaterial
        color="#d48028"
        roughness={0.7}
        emissive="#3a1804"
        emissiveIntensity={0.3}
      />
    </mesh>
    {[0, 1, 2, 3, 4].map((i) => {
      const angle = (i / 5) * Math.PI * 2;
      return (
        <mesh
          key={`peta-petal-${i}`}
          position={[Math.cos(angle) * 0.05, 0.22, Math.sin(angle) * 0.05]}
          rotation={[0, -angle, 0.15]}
        >
          <boxGeometry args={[0.05, 0.012, 0.035]} />
          <meshStandardMaterial color="#f4b048" roughness={0.7} />
        </mesh>
      );
    })}
  </group>
);
const HopeEcho = ({ count, loaded }) => {
  if (!loaded) return null;
  return (
    <>
      {/* T0 always: sprout dekat center tree base */}
      <PetaSprout pos={[0.4, 0, 0.6]} />
      {/* T1 >= 4000: bloom dekat lorong stones area (r1 restored,
          hint kehidupan balik) */}
      {count >= 4000 && <PetaBloom pos={[1.4, 0, 3.5]} />}
    </>
  );
};

// FootprintTrail — pair jejak alternate kiri-kanan dari start→end,
// opacity fade. Echo dari gersang storytelling — kerasa "ada
// perjalanan dari petak satu ke lainnya". Scale lebih kecil dari
// gersang krn peta overhead view, footprint kecil aja udah readable.
const PetaFootprintTrail = ({ start, end, count = 9 }) => {
  const [sx, , sz] = start;
  const [ex, , ez] = end;
  const dx = ex - sx;
  const dz = ez - sz;
  const angle = Math.atan2(dz, dx);
  const perpX = -Math.sin(angle);
  const perpZ = Math.cos(angle);
  const strideWidth = 0.07;
  const prints = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const cx = sx + dx * t;
    const cz = sz + dz * t;
    const opacity = 0.5 - t * 0.42;
    const sideSign = i % 2 === 0 ? 1 : -1;
    prints.push({
      x: cx + perpX * strideWidth * sideSign,
      z: cz + perpZ * strideWidth * sideSign,
      opacity,
    });
  }
  return (
    <>
      {prints.map((p, i) => (
        <mesh
          key={`peta-fp-${i}`}
          position={[p.x, 0.012, p.z]}
          rotation={[-Math.PI / 2, 0, -angle]}
        >
          <planeGeometry args={[0.16, 0.07]} />
          <meshStandardMaterial
            color="#150e08"
            roughness={1}
            transparent
            opacity={p.opacity}
          />
        </mesh>
      ))}
    </>
  );
};
// PrasastiQuote — 1 baris puisi pendek floating di lokasi tertentu,
// kerasa kayak prasasti weathered. Pakai Html drei dgn distanceFactor
// + occlude false. Subtle italic, warna faded supaya ngebaur ambient
// scene (bukan teriak attention). 3 spot scattered per worldbuilding
// fragmen — fans nemuin saat orbit kamera.
const PrasastiQuote = ({ pos, text }) => (
  <Html
    position={pos}
    center
    distanceFactor={11}
    occlude={false}
    style={{ pointerEvents: 'none' }}
  >
    <div
      className="text-white/40 text-[10px] sm:text-[11px] tracking-wide whitespace-nowrap select-none"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
      }}
    >
      — {text} —
    </div>
  </Html>
);
const PrasastiQuotes = () => (
  <>
    {/* Dekat gerbang (south, [0,0,8]) — di samping kiri jalan */}
    <PrasastiQuote
      pos={[3.5, 0.4, 9]}
      text="Apa yang dibangun dari cinta, gak hilang"
    />
    {/* Dekat center tree — di samping kanan, slightly elevated */}
    <PrasastiQuote
      pos={[2.2, 0.4, -1.8]}
      text="Yang setia, ditunggu kembalinya"
    />
    {/* Dekat telaga (west, [-7,0,-1]) — antara center dan telaga */}
    <PrasastiQuote
      pos={[-4.5, 0.4, 1.5]}
      text="Setiap teratai, satu doa yang gak dilupakan"
    />
  </>
);

// CompassTracker — inside-Canvas component yg baca camera azimuth tiap
// frame dan update DOM ref rotation imperatively (avoid React re-render
// per frame). Compass DOM widget di luar Canvas pakai ref ini.
const CompassTracker = ({ targetRef }) => {
  const { camera } = useThree();
  useFrame(() => {
    if (!targetRef.current) return;
    const theta = Math.atan2(camera.position.x, camera.position.z);
    targetRef.current.style.transform = `rotate(${-theta}rad)`;
  });
  return null;
};

// HoverHalo — expanding pulsing ring di ground saat petak di-hover.
// Generic component yg di-place per petak position, di-toggle via
// visible prop. Bukan modifying internal petak component — pure
// additive overlay. Pulse subtle (8% scale wave at 2 hz) + opacity
// fade smoothing supaya entrance/exit gak hard-cut.
const HoverHalo = ({ pos, visible, color = '#f4c478' }) => {
  const ringRef = useRef();
  const matRef = useRef();
  useFrame((state, delta) => {
    if (!ringRef.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    const factor = Math.min(delta * 6, 1);
    const targetScale = visible ? 1.0 + Math.sin(t * 2) * 0.08 : 0;
    ringRef.current.scale.x = lerp(ringRef.current.scale.x, targetScale, factor);
    ringRef.current.scale.z = lerp(ringRef.current.scale.z, targetScale, factor);
    const targetOpacity = visible ? 0.45 : 0;
    matRef.current.opacity = lerp(matRef.current.opacity, targetOpacity, factor);
  });
  return (
    <mesh
      ref={ringRef}
      position={pos}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[0, 1, 0]}
    >
      <ringGeometry args={[1.2, 1.5, 32]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

// PathWaymarkers — small subtle glowing disc markers di sepanjang path
// center → telaga (dan center → gerbang utara). Beda intent dari
// footprints (personal trace memudar): waymarkers = wayfinding
// infrastructure "ini path official". Pulse subtle untuk gentle
// guidance feel. Coexist dgn footprints — dua layer storytelling:
// jejak orang + jalur peta itself.
//
// Purified: ganti palette dari amber dusty (#a87850) ke peach-bloom
// (#f4b090) + opacity baseline naik + radius dikit lebih lebar. Path
// kerasa "ditandain bunga" bukan cuma jejak debu.
const PathWaymarker = ({ pos, phase = 0, purified = false }) => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const base = purified ? 0.42 : 0.25;
    const amp = purified ? 0.14 : 0.1;
    matRef.current.opacity =
      base + Math.sin(state.clock.elapsedTime * 1.2 + phase) * amp;
  });
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[purified ? 0.22 : 0.16, 14]} />
      <meshBasicMaterial
        ref={matRef}
        color={purified ? '#f4b090' : '#a87850'}
        transparent
        opacity={purified ? 0.45 : 0.3}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};
const PathWaymarkers = ({ purified = false }) => {
  // Center [0,0,0] → Telaga [-7,0,-1] di barat
  const toTelaga = [];
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    toTelaga.push({
      pos: [-7 * t, 0.015, -1 * t],
      phase: i * 0.7,
    });
  }
  // Center [0,0,0] → Arsip [+7,0,-1] di timur (mirror Telaga)
  const toArsip = [];
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    toArsip.push({
      pos: [7 * t, 0.015, -1 * t],
      phase: 0.3 + i * 0.6,
    });
  }
  return (
    <>
      {toTelaga.map((m, i) => (
        <PathWaymarker
          key={`wm-telaga-${i}`}
          pos={m.pos}
          phase={m.phase}
          purified={purified}
        />
      ))}
      {toArsip.map((m, i) => (
        <PathWaymarker
          key={`wm-arsip-${i}`}
          pos={m.pos}
          phase={m.phase}
          purified={purified}
        />
      ))}
    </>
  );
};

const PetaFootprintTrails = () => (
  <>
    {/* Center [0,0,0] → Telaga [-7,0,-1] — perjalanan dari hub ke r3.
        Belum ada stone path connection (PETAK=[]) jadi trail ini juga
        berfungsi sbg visual hint route. */}
    <PetaFootprintTrail start={[-0.4, 0, -0.4]} end={[-6.4, 0, -1]} count={9} />
    {/* Center [0,0,0] → Arsip [+7,0,-1] — mirror Telaga di timur. */}
    <PetaFootprintTrail start={[0.4, 0, -0.4]} end={[6.4, 0, -1]} count={9} />
    {/* Side branch — wandering off ke arah luar gerbang
        (storytelling: ada yg keluar dari peta, gak balik). */}
    <PetaFootprintTrail start={[1, 0, 7]} end={[5, 0, 12]} count={7} />
  </>
);

// CobblestonePath — purified-only stone slab pavers along center→petak
// paths. Replaces footprint trail visual narrative ("ada yg ngerawat
// taman ini") tanpa nge-hide footprint (footprint tetep kerasa
// "personal trace" mixed dgn "infrastruktur"). Slab rounded rect
// (boxGeometry) dgn stone tone abu-cream + tilt random per stone.
const cobbleStoneDefs = (start, end, count) => {
  const [sx, , sz] = start;
  const [ex, , ez] = end;
  const arr = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    arr.push({
      pos: [sx + (ex - sx) * t, 0.025, sz + (ez - sz) * t],
      rot: ((i * 37) % 360) * (Math.PI / 180),
      scale: 0.9 + ((i * 13) % 5) * 0.07,
    });
  }
  return arr;
};
const COBBLE_GROUPS = [
  cobbleStoneDefs([-0.5, 0, -0.5], [-6.5, 0, -1], 6),
  cobbleStoneDefs([0.5, 0, -0.5], [6.5, 0, -1], 6),
  cobbleStoneDefs([0, 0, 0.5], [0, 0, 7.5], 7),
];
const CobblestonePath = () => (
  <>
    {COBBLE_GROUPS.flat().map((s, i) => (
      <mesh
        key={`cobble-${i}`}
        position={s.pos}
        rotation={[-Math.PI / 2, 0, s.rot]}
        scale={s.scale}
      >
        <boxGeometry args={[0.42, 0.08, 0.32]} />
        <meshStandardMaterial color="#a89880" roughness={0.95} />
      </mesh>
    ))}
  </>
);

// StoneLantern — Japanese toro-style stone garden lantern. Pillar
// stone (cylinder shaft) + cap (box) + warm emissive globe glowing
// inside roof slabs. Kerasa "ada yg ngerawat" + zen taman vibe.
// Slow glow pulse via useFrame. 4 stand di sepanjang waymarker paths.
const StoneLantern = ({ pos, rot = 0 }) => {
  const lightMatRef = useRef();
  useFrame((state) => {
    if (!lightMatRef.current) return;
    const t = state.clock.elapsedTime;
    lightMatRef.current.emissiveIntensity =
      0.55 + Math.sin(t * 0.9 + pos[0] * 1.7) * 0.18;
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Foundation stone — wider base */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.08, 8]} />
        <meshStandardMaterial color="#8a7860" roughness={0.95} />
      </mesh>
      {/* Pillar shaft */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 8]} />
        <meshStandardMaterial color="#a89880" roughness={0.95} />
      </mesh>
      {/* Mid plate */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 8]} />
        <meshStandardMaterial color="#8a7860" roughness={0.95} />
      </mesh>
      {/* Lantern body — square box with hollow feel via emissive glow */}
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[0.2, 0.18, 0.2]} />
        <meshStandardMaterial color="#9a8870" roughness={0.85} />
      </mesh>
      {/* Inner light — emissive cube inside, warm peach glow */}
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[0.13, 0.13, 0.13]} />
        <meshStandardMaterial
          ref={lightMatRef}
          color="#f8c898"
          emissive="#f4a060"
          emissiveIntensity={0.6}
          roughness={0.6}
          toneMapped={false}
        />
      </mesh>
      {/* Roof cap — flat slab + small pyramid */}
      <mesh position={[0, 0.99, 0]}>
        <boxGeometry args={[0.28, 0.05, 0.28]} />
        <meshStandardMaterial color="#7a6850" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.07, 0]}>
        <coneGeometry args={[0.13, 0.12, 4]} />
        <meshStandardMaterial color="#6a5840" roughness={0.95} />
      </mesh>
      {/* Finial dot di puncak */}
      <mesh position={[0, 1.17, 0]}>
        <sphereGeometry args={[0.025, 6, 4]} />
        <meshStandardMaterial color="#5a4830" roughness={0.95} />
      </mesh>
    </group>
  );
};
const StoneLanterns = () => (
  <>
    {/* 4 lanterns along main waymarker path positions — tengah-jalan
        antara hub & petak. Slight tilt rotation per lantern supaya gak
        kerasa identical. */}
    <StoneLantern pos={[-3.5, 0, -0.6]} rot={0.18} />
    <StoneLantern pos={[3.5, 0, -0.6]} rot={-0.18} />
    <StoneLantern pos={[0.4, 0, 4]} rot={0.3} />
    <StoneLantern pos={[-0.4, 0, -3.8]} rot={-0.25} />
  </>
);

// LotusPads — flat lily pad discs di permukaan air Telaga + 1-2 lotus
// blooms scattered. Classic zen garden element matching StoneLantern
// toro + kasih softness di permukaan air.
const LOTUS_PAD_DEFS = [
  { pos: [-5.85, 0.34, -0.85], scale: 0.28, bloom: true },
  { pos: [-5.6, 0.34, -0.3], scale: 0.22, bloom: false },
  { pos: [-6.2, 0.34, -0.2], scale: 0.2, bloom: false },
  { pos: [-5.9, 0.34, 0.2], scale: 0.24, bloom: false },
  { pos: [-6.4, 0.34, -1.4], scale: 0.25, bloom: true },
  { pos: [-5.7, 0.34, -1.3], scale: 0.21, bloom: false },
  { pos: [-7.2, 0.34, -0.5], scale: 0.23, bloom: false },
];
const LotusPads = () => (
  <>
    {LOTUS_PAD_DEFS.map((p, i) => (
      <group key={`lotus-${i}`} position={p.pos}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[p.scale, 12]} />
          <meshStandardMaterial color="#5a8458" roughness={0.85} side={2} />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[p.scale * 0.7, 0.001, 0]}
        >
          <circleGeometry args={[p.scale * 0.25, 8]} />
          <meshStandardMaterial color="#3a5a3a" roughness={0.9} />
        </mesh>
        {p.bloom && (
          <>
            <mesh position={[0, 0.06, 0]}>
              <sphereGeometry args={[0.08, 8, 6]} />
              <meshStandardMaterial
                color="#f4c8d0"
                emissive="#e8a8b8"
                emissiveIntensity={0.2}
                roughness={0.6}
              />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <coneGeometry args={[0.06, 0.1, 6]} />
              <meshStandardMaterial color="#f8d8e0" roughness={0.5} />
            </mesh>
          </>
        )}
      </group>
    ))}
  </>
);

// Cattails — tall reed clusters di rim Telaga (north + east section).
// Vertical accent + naturalist water-edge marker. Each cluster = 3-4
// stalks dgn slight offset & tilt.
const CATTAIL_DEFS = [
  { pos: [-5.45, 0, -0.5], count: 3, seed: 1 },
  { pos: [-5.7, 0, 0.05], count: 4, seed: 2 },
  { pos: [-5.95, 0, 0.4], count: 3, seed: 3 },
  { pos: [-6.6, 0, 0.55], count: 4, seed: 4 },
  { pos: [-7.2, 0, 0.55], count: 3, seed: 5 },
  { pos: [-7.8, 0, 0.25], count: 3, seed: 6 },
];
const Cattails = () => (
  <>
    {CATTAIL_DEFS.map((c, ci) => (
      <group key={`cattails-${ci}`} position={c.pos}>
        {Array.from({ length: c.count }).map((_, j) => {
          const k = j + c.seed * 7;
          const offX = ((k * 37) % 5) * 0.04 - 0.08;
          const offZ = ((k * 53) % 5) * 0.04 - 0.08;
          const height = 0.45 + ((k * 13) % 4) * 0.08;
          const tilt = ((k * 17) % 5) * 0.03 - 0.06;
          return (
            <group
              key={j}
              position={[offX, 0, offZ]}
              rotation={[tilt, 0, tilt * 0.6]}
            >
              <mesh position={[0, height / 2, 0]}>
                <cylinderGeometry args={[0.012, 0.018, height, 5]} />
                <meshStandardMaterial color="#6a8048" roughness={0.95} />
              </mesh>
              <mesh position={[0, height + 0.06, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.12, 6]} />
                <meshStandardMaterial color="#7a5028" roughness={0.95} />
              </mesh>
              <mesh position={[0, height + 0.15, 0]}>
                <coneGeometry args={[0.012, 0.05, 5]} />
                <meshStandardMaterial color="#6a4528" roughness={0.95} />
              </mesh>
            </group>
          );
        })}
      </group>
    ))}
  </>
);

// SteppingStones — 4 flat slate stones connecting bridge north end
// (~-5.3, 1.5) menuju area SW dekat plaza. Bridge jadi connector,
// bukan dead-end. Slight tilt rotation per stone supaya organik.
const STEPPING_STONE_DEFS = [
  { pos: [-4.7, 0.04, 1.65], rot: 0.4, scale: 1.0 },
  { pos: [-4.05, 0.04, 1.78], rot: -0.2, scale: 0.95 },
  { pos: [-3.4, 0.04, 1.92], rot: 0.6, scale: 1.05 },
  { pos: [-2.8, 0.04, 2.08], rot: -0.3, scale: 0.95 },
];
const SteppingStones = () => (
  <>
    {STEPPING_STONE_DEFS.map((s, i) => (
      <mesh
        key={`step-${i}`}
        position={s.pos}
        rotation={[-Math.PI / 2, 0, s.rot]}
        scale={[s.scale * 0.55, 1, s.scale * 0.46]}
      >
        <boxGeometry args={[1, 0.07, 1]} />
        <meshStandardMaterial color="#9a8b78" roughness={0.95} />
      </mesh>
    ))}
  </>
);

// Tsukubai — Japanese stone water basin Jepang dgn bamboo spout drip
// (kakei). Mini ornament di sisi timur jembatan, matching toro
// lantern aesthetic — kerasa "ada yg ngerawat zen taman."
const Tsukubai = ({ pos = [-4.5, 0, 1.4], rot = 0.3 }) => {
  const dropRef = useRef();
  useFrame((state) => {
    if (!dropRef.current) return;
    const t = state.clock.elapsedTime;
    dropRef.current.opacity = 0.5 + Math.sin(t * 2.5 + pos[0]) * 0.4;
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Foundation stone */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.1, 10]} />
        <meshStandardMaterial color="#7a6a58" roughness={0.95} />
      </mesh>
      {/* Basin bowl */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.14, 12]} />
        <meshStandardMaterial color="#8a7a68" roughness={0.95} />
      </mesh>
      {/* Water surface inside bowl */}
      <mesh position={[0, 0.235, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 12]} />
        <meshStandardMaterial
          color="#3a5a68"
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Bamboo support post (vertical) */}
      <mesh position={[-0.35, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
        <meshStandardMaterial color="#8a7050" roughness={0.85} />
      </mesh>
      {/* Bamboo spout (angled, kakei) */}
      <mesh position={[-0.2, 0.42, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 6]} />
        <meshStandardMaterial color="#a89060" roughness={0.85} />
      </mesh>
      {/* Drip droplet (pulse opacity utk fake drip) */}
      <mesh position={[-0.06, 0.3, 0]}>
        <sphereGeometry args={[0.015, 6, 5]} />
        <meshStandardMaterial
          ref={dropRef}
          color="#aac8d8"
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
};

// BambooCluster — 4 thin tall bamboo stalks dgn horizontal joint rings.
// Vertical accent matching zen vibe, fill open space east of bridge.
const BAMBOO_STALK_DEFS = [
  { offset: [0, 0, 0], height: 1.8, tilt: 0.04 },
  { offset: [0.18, 0, 0.08], height: 1.6, tilt: -0.05 },
  { offset: [-0.12, 0, 0.15], height: 1.95, tilt: 0.03 },
  { offset: [0.06, 0, -0.14], height: 1.7, tilt: -0.03 },
];
const BambooCluster = ({ pos = [-3.8, 0, 0.5] }) => (
  <group position={pos}>
    {BAMBOO_STALK_DEFS.map((s, i) => (
      <group
        key={`bamboo-${i}`}
        position={s.offset}
        rotation={[s.tilt, 0, s.tilt * 0.7]}
      >
        <mesh position={[0, s.height / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.05, s.height, 6]} />
          <meshStandardMaterial color="#8aa860" roughness={0.85} />
        </mesh>
        {[0.25, 0.55, 0.85, 1.15, 1.45, 1.75].map(
          (y, j) =>
            y < s.height && (
              <mesh key={j} position={[0, y, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.04, 6]} />
                <meshStandardMaterial color="#6a8848" roughness={0.9} />
              </mesh>
            ),
        )}
        <mesh
          position={[0.08, s.height + 0.05, 0]}
          rotation={[0, 0, -0.5]}
        >
          <planeGeometry args={[0.04, 0.3]} />
          <meshStandardMaterial color="#7aa848" roughness={0.85} side={2} />
        </mesh>
        <mesh
          position={[-0.08, s.height + 0.05, 0]}
          rotation={[0, 0, 0.5]}
        >
          <planeGeometry args={[0.04, 0.3]} />
          <meshStandardMaterial color="#7aa848" roughness={0.85} side={2} />
        </mesh>
      </group>
    ))}
  </group>
);

// FloatingPaperLanterns — 4 paper lantern mengambang di permukaan air
// Telaga dgn warm emissive glow. Slow drift + vertical bob. Inspired
// shoryo nagashi (Japanese floating lantern ceremony). Reflection di
// air + cohesion sama toro lantern + StringLights.
const FLOATING_LANTERN_DEFS = [
  { basePos: [-6.5, 0.4, -1.0], hue: '#f4a060', driftSpeed: 0.08, phase: 0 },
  { basePos: [-7.2, 0.4, -0.4], hue: '#f8b070', driftSpeed: 0.06, phase: 1.2 },
  { basePos: [-7.5, 0.4, -1.5], hue: '#f0a058', driftSpeed: 0.05, phase: 2.4 },
  { basePos: [-6.8, 0.4, -1.8], hue: '#f4a868', driftSpeed: 0.07, phase: 3.6 },
];
const FloatingPaperLanterns = () => {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    FLOATING_LANTERN_DEFS.forEach((def, i) => {
      const ref = refs.current[i];
      if (!ref) return;
      ref.position.y = def.basePos[1] + Math.sin(t * 1.2 + def.phase) * 0.02;
      ref.position.x =
        def.basePos[0] + Math.sin(t * def.driftSpeed + def.phase) * 0.15;
      ref.position.z =
        def.basePos[2] + Math.cos(t * def.driftSpeed + def.phase) * 0.15;
      ref.rotation.y = t * def.driftSpeed * 0.5 + def.phase;
    });
  });
  return (
    <>
      {FLOATING_LANTERN_DEFS.map((def, i) => (
        <group
          key={`flantern-${i}`}
          ref={(r) => (refs.current[i] = r)}
          position={def.basePos}
        >
          {/* Wooden raft base */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.18]} />
            <meshStandardMaterial color="#6a4828" roughness={0.9} />
          </mesh>
          {/* Paper body — translucent emissive box */}
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[0.14, 0.18, 0.14]} />
            <meshStandardMaterial
              color="#f8e0c0"
              emissive={def.hue}
              emissiveIntensity={0.7}
              roughness={0.6}
              transparent
              opacity={0.85}
              toneMapped={false}
            />
          </mesh>
          {/* Top cap */}
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.16, 0.03, 0.16]} />
            <meshStandardMaterial color="#5a3818" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
};

// JizoStatue — small zen guardian statue (stone figure) dgn moss cap +
// red bib di rim Telaga east. Micro-narrative "ada figur penjaga".
const JizoStatue = ({ pos = [-5.55, 0, 0.4], rot = 0.3 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Foundation stone */}
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.12, 0.14, 0.08, 8]} />
      <meshStandardMaterial color="#6a5a48" roughness={0.95} />
    </mesh>
    {/* Body — rounded stone column */}
    <mesh position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.08, 0.1, 0.3, 10]} />
      <meshStandardMaterial color="#9a8a78" roughness={0.95} />
    </mesh>
    {/* Head — rounded sphere */}
    <mesh position={[0, 0.42, 0]}>
      <sphereGeometry args={[0.09, 12, 10]} />
      <meshStandardMaterial color="#9a8a78" roughness={0.95} />
    </mesh>
    {/* Red bib — small fabric strip */}
    <mesh position={[0, 0.32, 0.07]} rotation={[0.25, 0, 0]}>
      <planeGeometry args={[0.14, 0.1]} />
      <meshStandardMaterial color="#c43030" roughness={0.7} side={2} />
    </mesh>
    {/* Moss cap on head */}
    <mesh position={[0, 0.5, 0]}>
      <sphereGeometry
        args={[0.07, 8, 5, 0, Math.PI * 2, 0, Math.PI / 3]}
      />
      <meshStandardMaterial color="#5a8048" roughness={0.95} />
    </mesh>
    {/* Subtle face — two eye dots */}
    <mesh position={[-0.03, 0.43, 0.085]}>
      <sphereGeometry args={[0.008, 4, 3]} />
      <meshStandardMaterial color="#2a1810" />
    </mesh>
    <mesh position={[0.03, 0.43, 0.085]}>
      <sphereGeometry args={[0.008, 4, 3]} />
      <meshStandardMaterial color="#2a1810" />
    </mesh>
  </group>
);

// WoodenTorii — Japanese gate frame di approach timur ke WoodenBridge.
// Two vertical posts + kasagi (top beam) + shimaki (lower beam) +
// tablet plaque. Formalize entry, kerasa "ambang sakral."
const WoodenTorii = ({ pos = [-4.2, 0, 1.2], rot = -0.35 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Left post */}
    <mesh position={[-0.55, 0.6, 0]}>
      <cylinderGeometry args={[0.06, 0.07, 1.2, 8]} />
      <meshStandardMaterial color="#8a3828" roughness={0.85} />
    </mesh>
    {/* Right post */}
    <mesh position={[0.55, 0.6, 0]}>
      <cylinderGeometry args={[0.06, 0.07, 1.2, 8]} />
      <meshStandardMaterial color="#8a3828" roughness={0.85} />
    </mesh>
    {/* Lower beam (shimaki) — horizontal */}
    <mesh position={[0, 1.05, 0]}>
      <boxGeometry args={[1.28, 0.08, 0.12]} />
      <meshStandardMaterial color="#8a3828" roughness={0.85} />
    </mesh>
    {/* Tablet plaque between beams */}
    <mesh position={[0, 1.16, 0]}>
      <boxGeometry args={[0.2, 0.12, 0.04]} />
      <meshStandardMaterial color="#5a2818" roughness={0.9} />
    </mesh>
    {/* Top beam (kasagi) — wider */}
    <mesh position={[0, 1.3, 0]}>
      <boxGeometry args={[1.5, 0.1, 0.14]} />
      <meshStandardMaterial color="#7a2818" roughness={0.85} />
    </mesh>
    {/* Top beam end caps (upturn) */}
    <mesh position={[-0.78, 1.32, 0]} rotation={[0, 0, 0.18]}>
      <boxGeometry args={[0.14, 0.08, 0.14]} />
      <meshStandardMaterial color="#7a2818" roughness={0.85} />
    </mesh>
    <mesh position={[0.78, 1.32, 0]} rotation={[0, 0, -0.18]}>
      <boxGeometry args={[0.14, 0.08, 0.14]} />
      <meshStandardMaterial color="#7a2818" roughness={0.85} />
    </mesh>
  </group>
);

// KoiShadows — 3 koi (orange + cream) berenang slowly di permukaan
// air Telaga. Stretched ellipsoid, circular paths beda radius/speed.
// Sense of life returning to water.
const KOI_CENTER = [-7, 0.33, -1];
const KOI_DEFS = [
  {
    offset: [0, 0],
    radius: 1.0,
    speed: 0.18,
    phase: 0,
    color: '#d8602c',
    scale: [0.18, 0.04, 0.08],
  },
  {
    offset: [-0.3, 0.2],
    radius: 0.7,
    speed: -0.22,
    phase: 1.5,
    color: '#f4e8d0',
    scale: [0.16, 0.04, 0.075],
  },
  {
    offset: [0.4, -0.3],
    radius: 1.2,
    speed: 0.14,
    phase: 3.0,
    color: '#c84020',
    scale: [0.2, 0.04, 0.085],
  },
];
const KoiShadows = () => {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    KOI_DEFS.forEach((def, i) => {
      const ref = refs.current[i];
      if (!ref) return;
      const angle = t * def.speed + def.phase;
      ref.position.x =
        KOI_CENTER[0] + def.offset[0] + Math.cos(angle) * def.radius;
      ref.position.z =
        KOI_CENTER[2] + def.offset[1] + Math.sin(angle) * def.radius;
      ref.rotation.y = -angle + (def.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
    });
  });
  return (
    <>
      {KOI_DEFS.map((def, i) => (
        <mesh
          key={`koi-${i}`}
          ref={(r) => (refs.current[i] = r)}
          position={[KOI_CENTER[0], KOI_CENTER[1], KOI_CENTER[2]]}
          scale={def.scale}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial
            color={def.color}
            roughness={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </>
  );
};

// WaterRipples — 5 concentric ring animations di permukaan air Telaga,
// staggered phase per slot. Grow + fade per cycle. Sense of life
// beneath water tanpa nambah static mesh clutter.
const RIPPLE_SLOTS = [
  [-6.5, 0.34, -1.0],
  [-7.3, 0.34, -1.5],
  [-6.8, 0.34, -0.4],
  [-7.8, 0.34, -0.8],
  [-6.2, 0.34, -1.8],
];
const WaterRipples = () => {
  const ringRefs = useRef([]);
  const matRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    RIPPLE_SLOTS.forEach((_, i) => {
      const ring = ringRefs.current[i];
      const mat = matRefs.current[i];
      if (!ring || !mat) return;
      const cycle = 6.5;
      const phase = i * 1.3;
      const localT = (t + phase) % cycle;
      if (localT < 3.5) {
        const u = localT / 3.5;
        const scale = 0.2 + u * 1.0;
        ring.scale.set(scale, 1, scale);
        mat.opacity = (1 - u) * 0.5;
      } else {
        mat.opacity = 0;
      }
    });
  });
  return (
    <>
      {RIPPLE_SLOTS.map((pos, i) => (
        <mesh
          key={`ripple-${i}`}
          ref={(r) => (ringRefs.current[i] = r)}
          position={pos}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.25, 0.3, 24]} />
          <meshBasicMaterial
            ref={(m) => (matRefs.current[i] = m)}
            color="#cce8f0"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
};

// OmikujiStrips — 6 paper prayer strips terikat di bamboo crossbar
// (2 vertical posts + horizontal cross). Tradisi Jepang fortune notes;
// complete sacred shrine micro-set (torii + jizo + omikuji).
const OMIKUJI_DEFS = Array.from({ length: 6 }, (_, i) => ({
  offsetX: -0.36 + i * 0.144,
  length: 0.28 + ((i * 13) % 4) * 0.04,
  phase: i * 0.7,
}));
const OmikujiStrips = ({ pos = [-4.0, 0, 2.5], rot = -0.2 }) => {
  const stripRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    OMIKUJI_DEFS.forEach((def, i) => {
      const ref = stripRefs.current[i];
      if (!ref) return;
      ref.rotation.z = Math.sin(t * 0.8 + def.phase) * 0.12;
      ref.rotation.x = Math.cos(t * 0.6 + def.phase) * 0.06;
    });
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Left vertical post */}
      <mesh position={[-0.45, 0.65, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.3, 6]} />
        <meshStandardMaterial color="#8a7050" roughness={0.85} />
      </mesh>
      {/* Right vertical post */}
      <mesh position={[0.45, 0.65, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.3, 6]} />
        <meshStandardMaterial color="#8a7050" roughness={0.85} />
      </mesh>
      {/* Horizontal bamboo crossbar (where strips tied) */}
      <mesh position={[0, 1.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.95, 6]} />
        <meshStandardMaterial color="#a89060" roughness={0.85} />
      </mesh>
      {/* Strips hanging from crossbar */}
      {OMIKUJI_DEFS.map((def, i) => (
        <group
          key={`strip-${i}`}
          ref={(r) => (stripRefs.current[i] = r)}
          position={[def.offsetX, 1.22, 0]}
        >
          {/* Strip plane */}
          <mesh position={[0, -def.length / 2, 0]}>
            <planeGeometry args={[0.05, def.length]} />
            <meshStandardMaterial
              color="#f8f0e0"
              roughness={0.85}
              side={2}
            />
          </mesh>
          {/* Knot (red) at top */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.012, 5, 4]} />
            <meshStandardMaterial color="#c44040" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// WaterMist — thin haze planes low di permukaan air Telaga. Atmospheric
// dawn-mist effect, drift slow. Low opacity stacked planes kasih
// volumetric feel tanpa shader cost.
const MIST_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 + ((i * 23) % 9) * 0.1;
    const r = 0.4 + ((i * 11) % 7) * 0.18;
    arr.push({
      basePos: [
        -7 + Math.cos(angle) * r,
        0.45 + ((i * 7) % 4) * 0.05,
        -1 + Math.sin(angle) * r,
      ],
      scale: 0.35 + ((i * 13) % 5) * 0.1,
      driftSpeed: 0.04 + ((i * 5) % 7) * 0.01,
      phase: (i * 17) % 10,
      rotZ: ((i * 19) % 6) * 0.3,
    });
  }
  return arr;
})();
const WaterMist = () => {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    MIST_DEFS.forEach((def, i) => {
      const ref = refs.current[i];
      if (!ref) return;
      ref.position.x =
        def.basePos[0] + Math.sin(t * def.driftSpeed + def.phase) * 0.15;
      ref.position.z =
        def.basePos[2] + Math.cos(t * def.driftSpeed + def.phase) * 0.15;
      ref.position.y =
        def.basePos[1] + Math.sin(t * 0.3 + def.phase) * 0.03;
    });
  });
  return (
    <>
      {MIST_DEFS.map((def, i) => (
        <mesh
          key={`mist-${i}`}
          ref={(r) => (refs.current[i] = r)}
          position={def.basePos}
          rotation={[-Math.PI / 2, 0, def.rotZ]}
          scale={[def.scale, 1, def.scale]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#d8e8f0"
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
};

// MossyRimStones — 7 batu kecil moss-covered di pinggir rim Telaga.
// Cobble-size, low profile (BUKAN vertical kayak MossyBoulders outer).
// Natural transition antara grass dan water-edge.
const MOSSY_RIM_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.4;
    const r = 1.72 + ((i * 11) % 4) * 0.04;
    arr.push({
      pos: [-7 + Math.cos(angle) * r, 0.04, -1 + Math.sin(angle) * r],
      scale: [
        0.28 + ((i * 13) % 5) * 0.05,
        0.18 + ((i * 17) % 5) * 0.04,
        0.32 + ((i * 19) % 5) * 0.06,
      ],
      rot: ((i * 29) % 360) * (Math.PI / 180),
    });
  }
  return arr;
})();
const MossyRimStones = () => (
  <>
    {MOSSY_RIM_DEFS.map((s, i) => (
      <group
        key={`rimstone-${i}`}
        position={s.pos}
        rotation={[0, s.rot, 0]}
        scale={s.scale}
      >
        <mesh>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#8a7e6a" roughness={0.98} />
        </mesh>
        <mesh position={[0, 0.6, 0]} scale={[0.85, 0.3, 0.85]}>
          <sphereGeometry
            args={[1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2.5]}
          />
          <meshStandardMaterial color="#5a8048" roughness={0.95} />
        </mesh>
      </group>
    ))}
  </>
);

// WoodenSignpost (kanban) — papan kayu kecil di samping torii. Post +
// plaque + roof cap + 2 etched lines (faux text). Signpost vibe untuk
// Telaga Harapan, formalize area sacred.
const WoodenSignpost = ({ pos = [-3.4, 0, 1.0], rot = -0.3 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Post */}
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[0.06, 0.8, 0.06]} />
      <meshStandardMaterial color="#6a4828" roughness={0.9} />
    </mesh>
    {/* Plaque (kanban board) */}
    <mesh position={[0, 0.72, 0.05]}>
      <boxGeometry args={[0.32, 0.2, 0.025]} />
      <meshStandardMaterial color="#9a6840" roughness={0.85} />
    </mesh>
    {/* Top roof cap */}
    <mesh position={[0, 0.85, 0.05]}>
      <boxGeometry args={[0.36, 0.04, 0.09]} />
      <meshStandardMaterial color="#5a3818" roughness={0.9} />
    </mesh>
    {/* Etched lines (faux text rows) */}
    <mesh position={[0, 0.76, 0.064]}>
      <planeGeometry args={[0.22, 0.02]} />
      <meshStandardMaterial color="#3a2010" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.71, 0.064]}>
      <planeGeometry args={[0.16, 0.015]} />
      <meshStandardMaterial color="#3a2010" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.67, 0.064]}>
      <planeGeometry args={[0.18, 0.015]} />
      <meshStandardMaterial color="#3a2010" roughness={0.95} />
    </mesh>
  </group>
);

// MossyBoulders — 7 rounded boulders dgn moss patch on top, scatter di
// outer ring radius 12-16. Kasih grounded weight & texture variety —
// outer ring biar gak all-soft (flowers + grass terus). Deterministic
// seed for stable layout. Each boulder = sphere dgn non-uniform scale
// + small moss disc on top.
const MOSSY_BOULDER_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 7; i++) {
    const angle =
      (i / 7) * Math.PI * 2 + ((i * 23) % 9) * 0.1;
    const r = 12 + ((i * 11) % 5);
    arr.push({
      pos: [Math.cos(angle) * r, 0.25, Math.sin(angle) * r],
      scale: [
        0.45 + ((i * 13) % 5) * 0.08,
        0.32 + ((i * 17) % 5) * 0.06,
        0.45 + ((i * 19) % 5) * 0.08,
      ],
      rot: ((i * 29) % 360) * (Math.PI / 180),
    });
  }
  return arr;
})();
const MossyBoulder = ({ pos, scale, rot }) => (
  <group position={pos} rotation={[0, rot, 0]} scale={scale}>
    {/* Boulder body — rounded sphere */}
    <mesh>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color="#6a6052" roughness={1} />
    </mesh>
    {/* Moss patch on top — flat-ish dome dgn green tone */}
    <mesh position={[0, 0.55, 0]} scale={[0.95, 0.4, 0.95]}>
      <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial
        color="#5a7038"
        emissive="#4a5828"
        emissiveIntensity={0.08}
        roughness={1}
      />
    </mesh>
  </group>
);
const MossyBoulders = ({ isMobile = false }) => {
  const defs = isMobile
    ? MOSSY_BOULDER_DEFS.slice(0, 4)
    : MOSSY_BOULDER_DEFS;
  return (
    <>
      {defs.map((d, i) => (
        <MossyBoulder key={`mb-${i}`} {...d} />
      ))}
    </>
  );
};

// StoneBirdbath — fokal kecil dekat CenterTree (utara, jalan menuju
// gerbang). Cup-shape stone basin dgn water reflection inside (calm
// pool). Tempat berhenti, "ada burung yg minum di sini". Subtle water
// ripple via useFrame opacity pulse.
const StoneBirdbath = ({ pos = [-1.8, 0, 1.5] }) => {
  const waterMatRef = useRef();
  useFrame((state) => {
    if (!waterMatRef.current) return;
    const t = state.clock.elapsedTime;
    waterMatRef.current.emissiveIntensity =
      0.18 + Math.sin(t * 0.5) * 0.05;
  });
  return (
    <group position={pos}>
      {/* Pedestal base — wider bottom */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.12, 10]} />
        <meshStandardMaterial color="#7a6850" roughness={1} />
      </mesh>
      {/* Column shaft */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.32, 10]} />
        <meshStandardMaterial color="#8a7860" roughness={0.95} />
      </mesh>
      {/* Cup basin outer */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.32, 0.24, 0.12, 16]} />
        <meshStandardMaterial color="#9a8870" roughness={0.9} />
      </mesh>
      {/* Cup basin inner rim — slightly recessed */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 16]} />
        <meshStandardMaterial color="#7a6850" roughness={0.95} />
      </mesh>
      {/* Water inside — soft blue disc dgn emissive subtle (sky reflection
          feel) */}
      <mesh position={[0, 0.575, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.02, 16]} />
        <meshStandardMaterial
          ref={waterMatRef}
          color="#8ab8d0"
          emissive="#6a8aa0"
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.25}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
};

// VineDrape — hanging vines + small leaves attached ke target position.
// Cluster 3-4 vertical thin strands dgn leaf nodes scattered. Pakai di
// CityRuins + Perpustakaan corners — "kehidupan literally merangkak
// balik" via tanaman creep.
const VineDrape = ({ pos, length = 0.8, leafCount = 4 }) => {
  const leaves = useMemo(() => {
    const arr = [];
    for (let i = 0; i < leafCount; i++) {
      arr.push({
        y: -((i + 1) / (leafCount + 1)) * length,
        offsetX: ((i * 13) % 5) * 0.02 - 0.04,
        offsetZ: ((i * 17) % 5) * 0.02 - 0.04,
        rot: ((i * 41) % 360) * (Math.PI / 180),
      });
    }
    return arr;
  }, [leafCount, length]);
  return (
    <group position={pos}>
      {/* Main vine strand — thin vertical cylinder */}
      <mesh position={[0, -length / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, length, 5]} />
        <meshStandardMaterial color="#4a6028" roughness={0.95} />
      </mesh>
      {/* Side strand offset */}
      <mesh position={[0.04, -length / 2 - 0.05, 0.02]}>
        <cylinderGeometry args={[0.006, 0.006, length * 0.85, 5]} />
        <meshStandardMaterial color="#5a7038" roughness={0.95} />
      </mesh>
      {/* Leaves — small flat planes along the strand */}
      {leaves.map((l, i) => (
        <mesh
          key={`leaf-${i}`}
          position={[l.offsetX, l.y, l.offsetZ]}
          rotation={[0, l.rot, 0.3]}
        >
          <boxGeometry args={[0.06, 0.02, 0.04]} />
          <meshStandardMaterial
            color="#5a7838"
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
};
// VineCreeps — 6 vine drapes scattered di tepi CityRuins (yg ada di
// luar hex ring). Deterministic pos dari outer radius 14-18.
const VINE_CREEP_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + ((i * 19) % 7) * 0.13;
    const r = 13 + ((i * 11) % 5);
    arr.push({
      pos: [Math.cos(angle) * r, 1.6 + ((i * 13) % 4) * 0.3, Math.sin(angle) * r],
      length: 0.7 + ((i * 17) % 5) * 0.12,
      leafCount: 3 + (i % 3),
    });
  }
  return arr;
})();
const VineCreeps = () => (
  <>
    {VINE_CREEP_DEFS.map((v, i) => (
      <VineDrape key={`vine-${i}`} {...v} />
    ))}
  </>
);

// WildflowerBush — shrub-shape (rounded foliage sphere) dgn cluster
// petal blooms densely packed di atas. Beda dari FlowerCluster (single
// stem) — ini volume bush 0.4-0.6 radius. 4-6 di pinggir peta sebagai
// "patches of wild garden growth".
const WILDFLOWER_BUSH_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + ((i * 23) % 11) * 0.16;
    const r = 9 + ((i * 13) % 4);
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      scale: 0.85 + ((i * 11) % 5) * 0.1,
      bloomColor: FLOWER_PALETTE[i % FLOWER_PALETTE.length],
      accentColor: FLOWER_PALETTE[(i + 3) % FLOWER_PALETTE.length],
    });
  }
  return arr;
})();
const WildflowerBush = ({ pos, scale, bloomColor, accentColor }) => (
  <group position={pos} scale={scale}>
    {/* Foliage base — green rounded sphere (squashed) */}
    <mesh position={[0, 0.18, 0]} scale={[1, 0.7, 1]}>
      <sphereGeometry args={[0.36, 12, 8]} />
      <meshStandardMaterial color="#4a6028" roughness={0.95} />
    </mesh>
    <mesh position={[0.12, 0.22, 0.08]} scale={[0.85, 0.65, 0.85]}>
      <sphereGeometry args={[0.3, 10, 8]} />
      <meshStandardMaterial color="#5a7038" roughness={0.95} />
    </mesh>
    {/* Bloom cluster atas — multiple petal spheres densely packed */}
    {[
      [0, 0.36, 0],
      [0.14, 0.34, 0.08],
      [-0.14, 0.34, -0.08],
      [0.08, 0.38, -0.12],
      [-0.08, 0.32, 0.14],
    ].map((p, i) => (
      <mesh key={`bloom-${i}`} position={p}>
        <sphereGeometry args={[0.08 + (i % 2) * 0.02, 8, 6]} />
        <meshStandardMaterial
          color={i % 2 === 0 ? bloomColor : accentColor}
          emissive={i % 2 === 0 ? bloomColor : accentColor}
          emissiveIntensity={0.2}
          roughness={0.6}
        />
      </mesh>
    ))}
  </group>
);
const WildflowerBushes = ({ isMobile = false }) => {
  const defs = isMobile
    ? WILDFLOWER_BUSH_DEFS.slice(0, 3)
    : WILDFLOWER_BUSH_DEFS;
  return (
    <>
      {defs.map((b, i) => (
        <WildflowerBush key={`wfb-${i}`} {...b} />
      ))}
    </>
  );
};

// StringLights — strands of small warm bulbs hanging between DeadTrees
// & DroughtRing radius. Single horizontal strand line dgn 6-8 bulb
// points emissive warm peach. Slight bob + bulb flicker random.
const StringLightStrand = ({ start, end, bulbCount = 7 }) => {
  const bulbMatRefs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    bulbMatRefs.current.forEach((mat, i) => {
      if (!mat) return;
      // Slight per-bulb flicker, deterministic phase
      mat.emissiveIntensity = 0.7 + Math.sin(t * 1.6 + i * 0.7) * 0.18;
    });
  });
  const bulbs = useMemo(() => {
    const arr = [];
    const [sx, sy, sz] = start;
    const [ex, ey, ez] = end;
    for (let i = 0; i < bulbCount; i++) {
      const t = (i + 1) / (bulbCount + 1);
      // Sag curve — y dip in middle via sin t * pi
      const sag = Math.sin(t * Math.PI) * 0.15;
      arr.push({
        pos: [
          sx + (ex - sx) * t,
          sy + (ey - sy) * t - sag,
          sz + (ez - sz) * t,
        ],
      });
    }
    return arr;
  }, [start, end, bulbCount]);
  return (
    <>
      {bulbs.map((b, i) => (
        <mesh key={`bulb-${i}`} position={b.pos}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial
            ref={(el) => (bulbMatRefs.current[i] = el)}
            color="#fff0c8"
            emissive="#f8c898"
            emissiveIntensity={0.75}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
};
const StringLights = () => (
  <>
    {/* 3 strands antara berbagai outer-ring landmark positions */}
    <StringLightStrand start={[-9, 2.2, -6]} end={[-5, 2.1, -9]} bulbCount={6} />
    <StringLightStrand start={[6, 2.0, 6]} end={[10, 2.2, 3]} bulbCount={7} />
    <StringLightStrand start={[-2, 2.0, 9]} end={[4, 2.2, 9]} bulbCount={7} />
  </>
);

// MushroomCluster — purified-only fairy-tale touch di base DeadTrees.
// 3-4 small mushroom (stem + cap) per cluster, varied size + tilt.
// Tones orange/cream/warm peach, kerasa hutan fairy-tale subtle.
const Mushroom = ({ pos, scale = 1, tilt = 0, capColor = '#d48050' }) => (
  <group position={pos} scale={scale} rotation={[0, 0, tilt]}>
    {/* Stem — cream cylinder */}
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.03, 0.035, 0.12, 6]} />
      <meshStandardMaterial color="#f0e0c8" roughness={0.9} />
    </mesh>
    {/* Cap — half-sphere dome */}
    <mesh position={[0, 0.14, 0]}>
      <sphereGeometry args={[0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial
        color={capColor}
        emissive={capColor}
        emissiveIntensity={0.12}
        roughness={0.7}
      />
    </mesh>
  </group>
);
const MUSHROOM_CLUSTER_DEFS = (() => {
  const arr = [];
  // 5 clusters di pos dekat DeadTree positions (sample from DEAD_TREE_DEFS
  // tapi offset tipis ke samping supaya gak overlap trunk)
  const clusterPositions = [
    [-9, 0, -4.5],
    [4.5, 0, 8.5],
    [9.5, 0, 4],
    [-4, 0, -10],
    [-7, 0, 7],
  ];
  clusterPositions.forEach((basePos, ci) => {
    const colors = ['#d48050', '#e09060', '#c87045'];
    const cluster = [];
    const count = 3 + (ci % 2);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 0.18 + ((i * 11) % 3) * 0.05;
      cluster.push({
        pos: [
          basePos[0] + Math.cos(angle) * r,
          0,
          basePos[2] + Math.sin(angle) * r,
        ],
        scale: 0.7 + ((i * 13) % 4) * 0.15,
        tilt: ((i * 17) % 5) * 0.06 - 0.12,
        capColor: colors[i % colors.length],
      });
    }
    arr.push(cluster);
  });
  return arr;
})();
const MushroomClusters = () => (
  <>
    {MUSHROOM_CLUSTER_DEFS.flat().map((m, i) => (
      <Mushroom key={`mush-${i}`} {...m} />
    ))}
  </>
);

// WindChimes — gantung dari branch DeadTree yg revived. 1 string + 4-5
// thin rod cylinder, slight sway anim via useFrame. Sebagai poetry
// touch — angin yg dulu cuma debu sekarang bunyi pelan kayak music.
const WindChimes = ({ pos = [-6.5, 1.6, -3.5] }) => {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 1.3) * 0.12;
  });
  return (
    <group ref={groupRef} position={pos}>
      {/* String holder */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.01, 0.18, 0.01]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Top cross-piece (disc holding rods) */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.015, 8]} />
        <meshStandardMaterial color="#5a3e25" roughness={0.95} />
      </mesh>
      {/* 5 chime rods hanging different lengths */}
      {[
        { x: 0.05, z: 0, len: 0.22 },
        { x: -0.05, z: 0, len: 0.18 },
        { x: 0, z: 0.05, len: 0.24 },
        { x: 0, z: -0.05, len: 0.2 },
        { x: 0.03, z: 0.03, len: 0.16 },
      ].map((r, i) => (
        <mesh
          key={`chime-${i}`}
          position={[r.x, -0.12 - r.len / 2, r.z]}
        >
          <cylinderGeometry args={[0.008, 0.008, r.len, 6]} />
          <meshStandardMaterial
            color="#d4a868"
            emissive="#d4a868"
            emissiveIntensity={0.15}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
};

// Hammock — gantung antara 2 sapling/tree position. Curved plane (slight
// sag) + 2 attachment ropes ujung. Color cream-peach woven. Kerasa
// "ada yg istirahat di sini, taman jadi tempat".
const Hammock = ({ start = [-7, 1.4, 6], end = [-4, 1.4, 8] }) => {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2 - 0.35; // sag down 0.35y
  const midZ = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const rotY = Math.atan2(dx, dz);
  return (
    <group position={[midX, midY, midZ]} rotation={[0, rotY, 0]}>
      {/* Hammock bed — flat plane curved slightly via tilt */}
      <mesh rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.04, len * 0.85]} />
        <meshStandardMaterial color="#f0c898" roughness={0.95} />
      </mesh>
      {/* Edge ropes — kiri/kanan along length */}
      <mesh position={[-0.25, 0.025, 0]}>
        <boxGeometry args={[0.015, 0.015, len * 0.85]} />
        <meshStandardMaterial color="#8a6038" roughness={0.95} />
      </mesh>
      <mesh position={[0.25, 0.025, 0]}>
        <boxGeometry args={[0.015, 0.015, len * 0.85]} />
        <meshStandardMaterial color="#8a6038" roughness={0.95} />
      </mesh>
      {/* Attachment ropes — angled up to start/end pos. Group rotation
          udah orient sumbu Z = along hammock length, jadi ropes pakai
          rotation X tilt up. */}
      <mesh
        position={[0, 0.2, -len * 0.42]}
        rotation={[Math.atan2(0.4, 0.2), 0, 0]}
      >
        <boxGeometry args={[0.012, 0.5, 0.012]} />
        <meshStandardMaterial color="#5a3e25" roughness={0.95} />
      </mesh>
      <mesh
        position={[0, 0.2, len * 0.42]}
        rotation={[-Math.atan2(0.4, 0.2), 0, 0]}
      >
        <boxGeometry args={[0.012, 0.5, 0.012]} />
        <meshStandardMaterial color="#5a3e25" roughness={0.95} />
      </mesh>
    </group>
  );
};

// DistantCrow — 1 burung silhouette terbang lazy huge-radius circle
// di horizon jauh. Static-y altitude (~8y), radius lebar (28u),
// kerasa "1 burung kesepian di langit kota mati". Echo dari gersang
// CrowsFlock — peta level dapet 1 watcher minimal.
const DistantCrow = () => {
  const groupRef = useRef();
  const wingLRef = useRef();
  const wingRRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * 0.08;
    groupRef.current.position.x = Math.cos(t) * 28;
    groupRef.current.position.y = 8 + Math.sin(t * 0.7) * 0.6;
    groupRef.current.position.z = Math.sin(t) * 28;
    groupRef.current.rotation.y = -t + Math.PI / 2;
    if (wingLRef.current && wingRRef.current) {
      const flap = Math.sin(state.clock.elapsedTime * 1.8) * 0.4;
      wingLRef.current.rotation.z = 0.3 + flap;
      wingRRef.current.rotation.z = -0.3 - flap;
    }
  });
  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.5, 0.14, 0.18]} />
        <meshBasicMaterial color="#1a0f12" fog />
      </mesh>
      <mesh ref={wingLRef} position={[0, 0, 0.1]}>
        <boxGeometry args={[0.42, 0.025, 0.55]} />
        <meshBasicMaterial color="#1a0f12" fog />
      </mesh>
      <mesh ref={wingRRef} position={[0, 0, -0.1]}>
        <boxGeometry args={[0.42, 0.025, 0.55]} />
        <meshBasicMaterial color="#1a0f12" fog />
      </mesh>
    </group>
  );
};

// MoonShafts — light shaft volumetric dari moon position menembus
// dust haze ke ground. 4 cone-shaped beams angled berbeda, additive
// blend supaya glow tipis (bukan solid block). Open-ended cylinder
// (no caps), radius tipis di top (dekat moon) → lebar di bottom
// (menyebar di ground). Mood: dramatic moonlight through dusty air.
const MOON_POS = new THREE.Vector3(-13, 14, -12);
const MOON_SHAFT_TARGETS = [
  new THREE.Vector3(-6, 0, -3),
  new THREE.Vector3(-2, 0, -6),
  new THREE.Vector3(-8, 0, 1),
  new THREE.Vector3(3, 0, -2),
];
const MoonShafts = () => {
  const shafts = useMemo(() => {
    return MOON_SHAFT_TARGETS.map((target, i) => {
      const dir = new THREE.Vector3().subVectors(target, MOON_POS);
      const length = dir.length();
      const mid = new THREE.Vector3()
        .addVectors(MOON_POS, target)
        .multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize(),
      );
      const euler = new THREE.Euler().setFromQuaternion(quat);
      return {
        position: [mid.x, mid.y, mid.z],
        rotation: [euler.x, euler.y, euler.z],
        length,
        radiusTop: 0.05,
        radiusBottom: 0.4 + i * 0.05,
        opacity: 0.085 - i * 0.012,
      };
    });
  }, []);
  return (
    <>
      {shafts.map((s, i) => (
        <mesh key={`shaft-${i}`} position={s.position} rotation={s.rotation}>
          <cylinderGeometry
            args={[s.radiusTop, s.radiusBottom, s.length, 8, 1, true]}
          />
          <meshBasicMaterial
            color="#fff4d0"
            transparent
            opacity={s.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
};

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

// Butterflies — purified-only kupu-kupu fluttering scatter di scene.
// Tiap kupu: 2 box wings dengan flap animation (rotation Y sin freq
// 6-9Hz), low-mid altitude Lissajous orbit dgn larger amplitude dari
// firefly (8-14 radius). Palette warm peach/pink/cream/amber.
// Bigger dari firefly (size 0.12 vs 0.055) supaya keliatan dari peta
// scale. Deterministic seed for stable layout.
const BUTTERFLY_PALETTE = [
  '#f4a8a0', // peach
  '#fbd8d8', // soft pink
  '#fff0d8', // cream
  '#f4b890', // warm amber
  '#e88a98', // dusty rose
  '#f8c4a0', // soft peach
];
const Butterfly = ({ def }) => {
  const ref = useRef();
  const leftWingRef = useRef();
  const rightWingRef = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Lissajous body motion
    ref.current.position.x =
      def.cx + Math.sin(t * def.freqX + def.phaseX) * def.ampX;
    ref.current.position.y =
      def.cy + Math.sin(t * def.freqY + def.phaseY) * def.ampY;
    ref.current.position.z =
      def.cz + Math.cos(t * def.freqZ + def.phaseZ) * def.ampZ;
    // Body yaw — turn toward direction of travel (tangent to Lissajous)
    const vx = Math.cos(t * def.freqX + def.phaseX) * def.freqX * def.ampX;
    const vz = -Math.sin(t * def.freqZ + def.phaseZ) * def.freqZ * def.ampZ;
    ref.current.rotation.y = Math.atan2(vx, vz);
    // Wing flap — fast oscillation rotation around z
    const flap = Math.sin(t * def.flapFreq + def.flapPhase) * 0.7;
    if (leftWingRef.current) leftWingRef.current.rotation.y = flap;
    if (rightWingRef.current) rightWingRef.current.rotation.y = -flap;
  });
  return (
    <group ref={ref}>
      {/* Body — tiny dark line */}
      <mesh>
        <boxGeometry args={[0.012, 0.012, 0.06]} />
        <meshStandardMaterial color="#2a1810" roughness={0.9} />
      </mesh>
      {/* Left wing pivot */}
      <group ref={leftWingRef} position={[-0.005, 0, 0]}>
        <mesh position={[-0.06, 0, 0]}>
          <boxGeometry args={[0.12, 0.006, 0.08]} />
          <meshStandardMaterial
            color={def.color}
            emissive={def.color}
            emissiveIntensity={0.2}
            roughness={0.6}
            side={2}
          />
        </mesh>
      </group>
      {/* Right wing pivot */}
      <group ref={rightWingRef} position={[0.005, 0, 0]}>
        <mesh position={[0.06, 0, 0]}>
          <boxGeometry args={[0.12, 0.006, 0.08]} />
          <meshStandardMaterial
            color={def.color}
            emissive={def.color}
            emissiveIntensity={0.2}
            roughness={0.6}
            side={2}
          />
        </mesh>
      </group>
    </group>
  );
};
const Butterflies = ({ isMobile }) => {
  const count = isMobile ? 6 : 12;
  const defs = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      // Scatter wider than fireflies — kupu-kupu jelajahin seluruh peta
      const theta = (i / count) * Math.PI * 2 + ((i * 19) % 13) * 0.18;
      const r = 4 + ((i * 7) % 9);
      arr.push({
        cx: Math.cos(theta) * r,
        cy: 0.6 + ((i * 11) % 5) * 0.25,
        cz: Math.sin(theta) * r,
        ampX: 1.2 + ((i * 13) % 5) * 0.4,
        ampY: 0.3 + ((i * 17) % 4) * 0.15,
        ampZ: 1.2 + ((i * 23) % 5) * 0.4,
        freqX: 0.18 + ((i * 19) % 7) * 0.04,
        freqY: 0.35 + ((i * 29) % 7) * 0.05,
        freqZ: 0.2 + ((i * 31) % 7) * 0.04,
        phaseX: ((i * 37) % 100) * 0.063,
        phaseY: ((i * 41) % 100) * 0.063,
        phaseZ: ((i * 43) % 100) * 0.063,
        flapFreq: 7 + ((i * 11) % 4) * 0.5,
        flapPhase: ((i * 53) % 100) * 0.063,
        color: BUTTERFLY_PALETTE[i % BUTTERFLY_PALETTE.length],
      });
    }
    return arr;
  }, [count]);
  return defs.map((def, i) => <Butterfly key={`bf-${i}`} def={def} />);
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

// ──────────────────────────────────────────────────────────────────────
// Drought mirror set — elemen yang isi kekosongan koi-pond corner saat
// !purified. Mirror narasi: cekungan kering yang "dulunya kolam" →
// LotusPads/KoiShadows nanti, stone lantern roboh → StoneLanterns berdiri
// lagi, paper lantern sobek di tanah → FloatingPaperLanterns mengapung.
// Goal: user yang revisit setelah purify ngerasa "oh, ini dulu mati."
// ──────────────────────────────────────────────────────────────────────

// DriedPondBasin — cekungan tanah retak di posisi koi pond. Dua disc
// (outer rim + inner deeper) + 6 crack lines radial. Geometry flat —
// gak ngangkat permukaan, cuma overlay color/decal.
const DRIED_BASIN_CRACKS = (() => {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 * i) / 7 + ((i * 0.6) % 0.5);
    const len = 0.55 + ((i * 13) % 5) * 0.12;
    out.push({ angle, len });
  }
  return out;
})();
const DriedPondBasin = ({ pos = [-6.5, 0, -0.7] }) => (
  <group position={pos}>
    {/* Outer rim — area pond luar, warna lumpur kering */}
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.55, 14]} />
      <meshStandardMaterial color="#3e2e22" roughness={0.95} />
    </mesh>
    {/* Inner basin — lebih dalam, tanah lebih gelap */}
    <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.1, 12]} />
      <meshStandardMaterial color="#2a1d14" roughness={0.95} />
    </mesh>
    {/* Crack lines — radial dari pusat, thin planes */}
    {DRIED_BASIN_CRACKS.map((c, i) => (
      <mesh
        key={`crk-${i}`}
        position={[
          Math.cos(c.angle) * c.len * 0.5,
          0.011,
          Math.sin(c.angle) * c.len * 0.5,
        ]}
        rotation={[-Math.PI / 2, 0, -c.angle]}
      >
        <planeGeometry args={[c.len, 0.022]} />
        <meshStandardMaterial color="#150c08" roughness={1} />
      </mesh>
    ))}
    {/* Tanah pecah di tengah — patch hexagonal kasar */}
    <mesh position={[0.15, 0.012, -0.1]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <circleGeometry args={[0.18, 6]} />
      <meshStandardMaterial color="#1a100a" roughness={1} />
    </mesh>
    <mesh position={[-0.25, 0.012, 0.18]} rotation={[-Math.PI / 2, 0, -0.4]}>
      <circleGeometry args={[0.14, 6]} />
      <meshStandardMaterial color="#1a100a" roughness={1} />
    </mesh>
  </group>
);

// DriedLotusHusks — daun lotus mati di dasar basin. Mirror LotusPads
// purified posisinya & jumlahnya (7 husk vs 7 pad). Warna khaki coklat,
// tilt acak, beberapa dengan curl rim (cone ke samping).
const DRIED_HUSK_DEFS = [
  { pos: [-5.95, 0.012, -0.95], scale: 0.22, tilt: 0.5, curl: true },
  { pos: [-5.7, 0.012, -0.45], scale: 0.18, tilt: -0.4, curl: false },
  { pos: [-6.25, 0.012, -0.35], scale: 0.17, tilt: 0.6, curl: true },
  { pos: [-6.0, 0.012, 0.05], scale: 0.2, tilt: -0.5, curl: false },
  { pos: [-6.5, 0.012, -1.5], scale: 0.21, tilt: 0.3, curl: true },
  { pos: [-5.8, 0.012, -1.4], scale: 0.16, tilt: -0.6, curl: false },
  { pos: [-7.25, 0.012, -0.6], scale: 0.19, tilt: 0.45, curl: true },
];
const DriedLotusHusks = () => (
  <>
    {DRIED_HUSK_DEFS.map((d, i) => (
      <group key={`husk-${i}`} position={d.pos} rotation={[0, d.tilt, 0]}>
        <mesh rotation={[-Math.PI / 2 + d.tilt * 0.15, 0, d.tilt * 0.5]}>
          <circleGeometry args={[d.scale, 8]} />
          <meshStandardMaterial color="#5a4630" roughness={0.95} side={2} />
        </mesh>
        {d.curl && (
          <mesh
            position={[d.scale * 0.6, 0.012, 0]}
            rotation={[0, 0, d.tilt * 0.8]}
          >
            <coneGeometry args={[d.scale * 0.32, 0.05, 5]} />
            <meshStandardMaterial color="#4a3624" roughness={0.95} />
          </mesh>
        )}
      </group>
    ))}
  </>
);

// FallenStoneLantern — stone lantern roboh. Fondasi tetap berdiri,
// tapi pilar/body/atap rebah ke samping. Single instance — mirror
// salah satu StoneLanterns ([-3.5, 0, -0.6] purified). Warna sedikit
// lebih gelap (faded + dust-coated).
const FallenStoneLantern = ({ pos = [-3.7, 0, -0.4], rot = 0.6 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Foundation — masih berdiri */}
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.16, 0.18, 0.08, 8]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    {/* Pilar — rebah ke samping */}
    <mesh position={[0.32, 0.1, 0.04]} rotation={[0, 0, Math.PI / 2 + 0.08]}>
      <cylinderGeometry args={[0.08, 0.1, 0.6, 8]} />
      <meshStandardMaterial color="#6a5848" roughness={0.95} />
    </mesh>
    {/* Mid plate — terlepas di tanah */}
    <mesh position={[0.55, 0.02, -0.05]} rotation={[0.5, 0, 0.3]}>
      <cylinderGeometry args={[0.14, 0.14, 0.04, 8]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    {/* Body lantern — miring + lebih jauh */}
    <mesh position={[0.78, 0.11, 0.08]} rotation={[0.15, 0.3, 0.4]}>
      <boxGeometry args={[0.2, 0.18, 0.2]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    {/* Atap — pecah, half-buried */}
    <mesh position={[1.0, 0.04, 0.2]} rotation={[0.7, 0.4, 0.3]}>
      <boxGeometry args={[0.28, 0.05, 0.28]} />
      <meshStandardMaterial color="#4a3828" roughness={0.95} />
    </mesh>
    {/* Cone tip — terpisah lagi */}
    <mesh position={[1.18, 0.05, 0.35]} rotation={[0.8, 0.5, 0.2]}>
      <coneGeometry args={[0.13, 0.12, 4]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Finial — bola kecil lepas */}
    <mesh position={[1.32, 0.03, 0.48]}>
      <sphereGeometry args={[0.025, 6, 4]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
  </group>
);

// TornFallenLantern — paper lantern jatuh, sobek, pudar. 3 instances
// di rim pond + path. Mirror FloatingPaperLanterns (4 lentera mengapung
// di air purified) — di drought mereka udah jatuh & sobek.
const TORN_LANTERN_DEFS = [
  { pos: [-5.2, 0, 0.5], rot: -0.5 },
  { pos: [-3.9, 0, 1.5], rot: 0.8 },
  { pos: [-6.8, 0, 1.0], rot: -1.1 },
];
const TornFallenLantern = ({ pos, rot }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Wooden frame — rusak, tilted */}
    <mesh position={[0, 0.025, 0]} rotation={[0.4, 0, 0.2]}>
      <boxGeometry args={[0.18, 0.04, 0.18]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Paper body — kolaps, miring, opacity rendah (sobek translucent) */}
    <mesh position={[0.06, 0.07, 0.04]} rotation={[0.3, 0.4, 0.25]}>
      <boxGeometry args={[0.14, 0.11, 0.14]} />
      <meshStandardMaterial
        color="#7a6858"
        roughness={0.95}
        transparent
        opacity={0.55}
      />
    </mesh>
    {/* Robekan kertas — fragment lying flat di tanah */}
    <mesh position={[0.22, 0.005, 0.14]} rotation={[-Math.PI / 2, 0, 0.6]}>
      <planeGeometry args={[0.12, 0.06]} />
      <meshStandardMaterial
        color="#6a5848"
        roughness={0.95}
        side={2}
        transparent
        opacity={0.5}
      />
    </mesh>
    <mesh position={[-0.15, 0.005, 0.18]} rotation={[-Math.PI / 2, 0, -0.3]}>
      <planeGeometry args={[0.08, 0.05]} />
      <meshStandardMaterial
        color="#7a6858"
        roughness={0.95}
        side={2}
        transparent
        opacity={0.45}
      />
    </mesh>
  </group>
);
const TornFallenLanterns = () => (
  <>
    {TORN_LANTERN_DEFS.map((d, i) => (
      <TornFallenLantern key={`tfl-${i}`} pos={d.pos} rot={d.rot} />
    ))}
  </>
);

// ──────────────────────────────────────────────────────────────────────
// Storm wreckage set — escalate dari "kering yang sepi" jadi "babak
// belur dilanda badai." Debris menyebar lintas peta (gak cuma koi
// corner), banner sobek di tiang, gerobak roboh, retakan tabrakan,
// bekas hangus berasap. Goal visual: damage kerasa violent + recent,
// bukan ruin yang udah ratus tahun tenang.
// ──────────────────────────────────────────────────────────────────────

// ScatteredDebris — 24 keping debris kecil tersebar di peta (papan kayu,
// pecahan genteng, shard tembikar). Positions deliberate-acak supaya
// gak nge-block hover/click landmark petak. Tipe via index modulo 3.
const SCATTERED_DEBRIS_DEFS = [
  { pos: [1.8, 0.02, 5.4], rot: 0.4 },
  { pos: [-2.2, 0.02, 5.8], rot: -0.8 },
  { pos: [3.1, 0.02, 4.2], rot: 1.2 },
  { pos: [-3.5, 0.02, 3.8], rot: 0.3 },
  { pos: [4.6, 0.02, 1.2], rot: -0.6 },
  { pos: [-4.8, 0.02, 1.5], rot: 0.9 },
  { pos: [5.2, 0.02, -2.4], rot: -1.0 },
  { pos: [-5.6, 0.02, -2.8], rot: 0.7 },
  { pos: [3.8, 0.02, -3.6], rot: -0.4 },
  { pos: [-3.2, 0.02, -4.0], rot: 1.1 },
  { pos: [1.2, 0.02, -4.8], rot: 0.5 },
  { pos: [-1.4, 0.02, -4.5], rot: -0.7 },
  { pos: [2.5, 0.02, 2.0], rot: 0.2 },
  { pos: [-2.8, 0.02, 1.8], rot: -1.2 },
  { pos: [0.8, 0.02, 3.5], rot: 0.6 },
  { pos: [-0.9, 0.02, -3.2], rot: -0.5 },
  { pos: [4.0, 0.02, 3.4], rot: 0.85 },
  { pos: [-4.2, 0.02, 3.2], rot: -0.95 },
  { pos: [2.2, 0.02, -2.0], rot: 0.45 },
  { pos: [-2.0, 0.02, -2.5], rot: -0.65 },
  { pos: [6.0, 0.02, 0.5], rot: 1.05 },
  { pos: [-6.0, 0.02, 0.8], rot: -1.15 },
  { pos: [0.5, 0.02, 6.5], rot: 0.25 },
  { pos: [-0.5, 0.02, -6.0], rot: -0.35 },
];
const ScatteredDebris = () => (
  <>
    {SCATTERED_DEBRIS_DEFS.map((d, i) => {
      const type = i % 3;
      if (type === 0) {
        // Papan kayu — strip panjang tipis
        return (
          <mesh
            key={`dbr-${i}`}
            position={d.pos}
            rotation={[0.1, d.rot, 0.05]}
          >
            <boxGeometry args={[0.35, 0.04, 0.08]} />
            <meshStandardMaterial color="#4a3018" roughness={0.95} />
          </mesh>
        );
      }
      if (type === 1) {
        // Pecahan genteng — segitiga miring (cone 3-sided)
        return (
          <mesh
            key={`dbr-${i}`}
            position={d.pos}
            rotation={[Math.PI / 2 + 0.2, d.rot, 0]}
          >
            <coneGeometry args={[0.14, 0.05, 3]} />
            <meshStandardMaterial color="#5a3828" roughness={0.95} />
          </mesh>
        );
      }
      // Shard tembikar — chunk tipis (box flat)
      return (
        <mesh
          key={`dbr-${i}`}
          position={d.pos}
          rotation={[0.08, d.rot, -0.06]}
        >
          <boxGeometry args={[0.14, 0.03, 0.1]} />
          <meshStandardMaterial color="#6a4a30" roughness={0.95} />
        </mesh>
      );
    })}
  </>
);

// TippedCart — gerobak kayu roboh, satu roda lepas di tanah. Single
// instance dekat gerbang ([0, 0, 8] area) — narasi: cart yang lagi
// keluar kota saat badai datang, gak sempat lewat.
const TippedCart = ({ pos = [1.8, 0, 6.4], rot = 0.8 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Body cart — kotak besar miring ke samping (tipped 70°) */}
    <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2.5]}>
      <boxGeometry args={[0.42, 0.28, 0.55]} />
      <meshStandardMaterial color="#4a3018" roughness={0.95} />
    </mesh>
    {/* Roda 1 — masih nempel di cart, miring */}
    <mesh
      position={[0.25, 0.08, 0.22]}
      rotation={[0, 0, Math.PI / 2.5 + Math.PI / 2]}
    >
      <cylinderGeometry args={[0.18, 0.18, 0.05, 12]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>
    {/* Roda 2 — terlepas, di tanah agak jauh */}
    <mesh
      position={[0.65, 0.04, -0.15]}
      rotation={[Math.PI / 2, 0.3, 0]}
    >
      <cylinderGeometry args={[0.18, 0.18, 0.05, 12]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>
    {/* Spokes roda terlepas — 4 batang silang */}
    {[0, 1, 2, 3].map((k) => (
      <mesh
        key={`sp-${k}`}
        position={[0.65, 0.06, -0.15]}
        rotation={[Math.PI / 2, 0.3, (Math.PI / 4) * k]}
      >
        <boxGeometry args={[0.32, 0.015, 0.015]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.95} />
      </mesh>
    ))}
    {/* Shaft penarik — kayu panjang patah, miring ke atas */}
    <mesh
      position={[-0.35, 0.12, 0]}
      rotation={[0, 0, 0.6]}
    >
      <boxGeometry args={[0.5, 0.06, 0.06]} />
      <meshStandardMaterial color="#4a3018" roughness={0.95} />
    </mesh>
    {/* Plank patah terlepas dari cart */}
    <mesh
      position={[0.3, 0.03, 0.45]}
      rotation={[0.1, 0.4, 0.2]}
    >
      <boxGeometry args={[0.4, 0.04, 0.1]} />
      <meshStandardMaterial color="#4a3018" roughness={0.95} />
    </mesh>
    <mesh
      position={[-0.2, 0.03, -0.4]}
      rotation={[0.05, -0.5, 0.1]}
    >
      <boxGeometry args={[0.32, 0.04, 0.08]} />
      <meshStandardMaterial color="#3a2418" roughness={0.95} />
    </mesh>
  </group>
);

// TatteredBannerPole — tiang kayu condong dengan kain banner sobek di
// puncak. Cloth flap pelan via useFrame (wind sisa). Versi simple — 1
// strip vertical + 1 strip horizontal yg lepas, gak ngitung physics.
const TatteredBannerPole = ({ pos = [2.5, 0, -5.8], rot = 0, lean = 0.15 }) => {
  const clothRef = useRef();
  const stripRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (clothRef.current) {
      clothRef.current.rotation.z = lean + Math.sin(t * 1.5 + pos[0]) * 0.12;
    }
    if (stripRef.current) {
      stripRef.current.rotation.z = Math.sin(t * 1.8 + pos[2]) * 0.15;
      stripRef.current.rotation.x = Math.cos(t * 1.3 + pos[0]) * 0.08;
    }
  });
  return (
    <group position={pos} rotation={[0, rot, lean]}>
      {/* Pole — kayu vertical condong */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.4, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      {/* Cross-bar di atas — patah miring */}
      <mesh position={[0.18, 1.3, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 5]} />
        <meshStandardMaterial color="#3a2818" roughness={0.95} />
      </mesh>
      {/* Banner utama — strip vertical sobek (planeGeometry tall) */}
      <mesh ref={clothRef} position={[0.05, 0.85, 0.01]}>
        <planeGeometry args={[0.32, 0.5]} />
        <meshStandardMaterial
          color="#7a3828"
          roughness={0.95}
          side={2}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Strip kain terlepas — flap di angin tanggung */}
      <mesh ref={stripRef} position={[0.32, 1.0, 0.02]}>
        <planeGeometry args={[0.12, 0.35]} />
        <meshStandardMaterial
          color="#6a3020"
          roughness={0.95}
          side={2}
          transparent
          opacity={0.5}
        />
      </mesh>
      {/* Tali tambang putus — sliver pendek nyangkut di pole */}
      <mesh position={[-0.04, 0.95, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.008, 0.008, 0.25, 4]} />
        <meshStandardMaterial color="#5a4838" roughness={0.95} />
      </mesh>
    </group>
  );
};
const TatteredBannerPoles = () => (
  <>
    <TatteredBannerPole pos={[2.5, 0, -5.8]} rot={0.3} lean={0.18} />
    <TatteredBannerPole pos={[-3.8, 0, 5.2]} rot={-0.5} lean={-0.22} />
  </>
);

// CrackedGroundPatches — 7 patch retakan dalam (impact-crater feel),
// beda dari DroughtRing yg surface-level. Pattern: 1 ring gelap +
// 3-4 crack lines per patch. Pos di antara petak/rim — gak nge-cover
// landmark.
const CRACK_PATCH_DEFS = [
  { pos: [3.5, 0, 2.5], scale: 0.7, lines: 5 },
  { pos: [-3.0, 0, -1.8], scale: 0.85, lines: 6 },
  { pos: [2.0, 0, -4.0], scale: 0.6, lines: 4 },
  { pos: [-4.5, 0, -3.5], scale: 0.75, lines: 5 },
  { pos: [4.5, 0, 3.5], scale: 0.65, lines: 4 },
  { pos: [-1.5, 0, 4.5], scale: 0.55, lines: 4 },
  { pos: [1.0, 0, -2.5], scale: 0.7, lines: 5 },
];
const CrackedGroundPatch = ({ pos, scale, lines }) => (
  <group position={pos}>
    {/* Outer rim — disc gelap besar */}
    <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[scale, 10]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
    {/* Inner crater — lebih gelap, lebih kecil */}
    <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[scale * 0.5, 8]} />
      <meshStandardMaterial color="#150a06" roughness={1} />
    </mesh>
    {/* Crack lines radial — keluar dari pusat */}
    {Array.from({ length: lines }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / lines + (i % 2 ? 0.25 : -0.15);
      const len = scale * (0.7 + (i % 3) * 0.15);
      return (
        <mesh
          key={`pcrk-${i}`}
          position={[
            Math.cos(angle) * len * 0.5,
            0.011,
            Math.sin(angle) * len * 0.5,
          ]}
          rotation={[-Math.PI / 2, 0, -angle]}
        >
          <planeGeometry args={[len, 0.02]} />
          <meshStandardMaterial color="#0a0604" roughness={1} />
        </mesh>
      );
    })}
  </group>
);
const CrackedGroundPatches = () => (
  <>
    {CRACK_PATCH_DEFS.map((c, i) => (
      <CrackedGroundPatch key={`cgp-${i}`} {...c} />
    ))}
  </>
);

// ScorchedSpots — 4 bekas hangus + smoke wisp tipis melayang naik.
// Smoke = vertical plane dengan additive opacity pulse, gak heavy
// particle. Cocok di sela landmark, gak deket petak interactive.
const SCORCH_DEFS = [
  { pos: [3.2, 0, -0.5], scale: 0.55 },
  { pos: [-2.5, 0, 2.8], scale: 0.6 },
  { pos: [-0.5, 0, -3.5], scale: 0.5 },
  { pos: [4.2, 0, 0.5], scale: 0.45 },
];
const ScorchedSpot = ({ pos, scale }) => {
  const smokeRef = useRef();
  useFrame((state) => {
    if (!smokeRef.current) return;
    const t = state.clock.elapsedTime;
    smokeRef.current.material.opacity =
      0.18 + Math.sin(t * 0.6 + pos[0] * 1.2) * 0.08;
    smokeRef.current.position.y = 0.6 + Math.sin(t * 0.4 + pos[2]) * 0.05;
  });
  return (
    <group position={pos}>
      {/* Char patch — disc hitam */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[scale, 10]} />
        <meshStandardMaterial color="#0a0604" roughness={1} />
      </mesh>
      {/* Inner ash — center lebih abu-abu */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[scale * 0.55, 8]} />
        <meshStandardMaterial color="#2a1f1a" roughness={1} />
      </mesh>
      {/* Smoke wisp — vertical plane melayang */}
      <mesh ref={smokeRef} position={[0, 0.6, 0]}>
        <planeGeometry args={[scale * 0.8, scale * 1.8]} />
        <meshStandardMaterial
          color="#3a2f28"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={2}
        />
      </mesh>
    </group>
  );
};
const ScorchedSpots = () => (
  <>
    {SCORCH_DEFS.map((s, i) => (
      <ScorchedSpot key={`scrch-${i}`} pos={s.pos} scale={s.scale} />
    ))}
  </>
);

// CollapsedTorii — gerbang torii roboh, mirror WoodenTorii purified
// ([-4.2, 0, 1.2]). Dua pilar masih ngacung (lebih pendek, condong),
// crossbar atas rebah ke tanah miring. Cat merah pudar, kayu retak.
const CollapsedTorii = ({ pos = [-4.2, 0, 1.2], rot = -0.35 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Pilar kiri — masih berdiri tapi condong, lebih pendek (patah) */}
    <mesh position={[-0.35, 0.3, 0]} rotation={[0, 0, -0.18]}>
      <cylinderGeometry args={[0.06, 0.07, 0.6, 6]} />
      <meshStandardMaterial color="#6a2818" roughness={0.95} />
    </mesh>
    {/* Pilar kanan — patah lebih pendek lagi */}
    <mesh position={[0.32, 0.2, 0]} rotation={[0, 0, 0.22]}>
      <cylinderGeometry args={[0.06, 0.07, 0.4, 6]} />
      <meshStandardMaterial color="#5a2418" roughness={0.95} />
    </mesh>
    {/* Crossbar atas (kasagi) — rebah ke tanah miring */}
    <mesh position={[0.0, 0.06, 0.35]} rotation={[Math.PI / 2 - 0.2, 0, 0.4]}>
      <boxGeometry args={[1.0, 0.07, 0.08]} />
      <meshStandardMaterial color="#6a2818" roughness={0.95} />
    </mesh>
    {/* Lintel bawah (nuki) — pecah jadi 2 fragment di tanah */}
    <mesh position={[-0.5, 0.04, 0.25]} rotation={[0.1, 0.3, 0.2]}>
      <boxGeometry args={[0.4, 0.05, 0.06]} />
      <meshStandardMaterial color="#5a2418" roughness={0.95} />
    </mesh>
    <mesh position={[0.45, 0.04, -0.2]} rotation={[0.08, -0.4, 0.15]}>
      <boxGeometry args={[0.35, 0.05, 0.06]} />
      <meshStandardMaterial color="#4a1f14" roughness={0.95} />
    </mesh>
    {/* Cat merah pudar fragment — strip kecil di tanah (warna fade) */}
    <mesh position={[-0.15, 0.005, 0.5]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <planeGeometry args={[0.18, 0.04]} />
      <meshStandardMaterial
        color="#7a3020"
        roughness={0.95}
        side={2}
        transparent
        opacity={0.55}
      />
    </mesh>
  </group>
);

// ToppledJizo — patung jizo roboh, mirror JizoStatue purified
// ([-5.55, 0, 0.4]). Foundation stone masih ada, body figure tergeletak
// di sampingnya. Kepala lepas, bib merah pudar di tanah.
const ToppledJizo = ({ pos = [-5.55, 0, 0.4], rot = 0.3 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Foundation stone — tetap berdiri (mirror purified) */}
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.12, 0.14, 0.08, 8]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    {/* Body jizo — tergeletak miring di samping foundation */}
    <mesh position={[0.28, 0.08, 0.04]} rotation={[0, 0, Math.PI / 2 + 0.1]}>
      <cylinderGeometry args={[0.08, 0.1, 0.32, 8]} />
      <meshStandardMaterial color="#6a5848" roughness={0.95} />
    </mesh>
    {/* Kepala lepas — sphere lebih jauh */}
    <mesh position={[0.5, 0.08, 0.1]}>
      <sphereGeometry args={[0.08, 8, 6]} />
      <meshStandardMaterial color="#6a5848" roughness={0.95} />
    </mesh>
    {/* Bib merah pudar — strip kain di tanah */}
    <mesh position={[0.2, 0.005, -0.15]} rotation={[-Math.PI / 2, 0, 0.4]}>
      <planeGeometry args={[0.22, 0.12]} />
      <meshStandardMaterial
        color="#8a3a28"
        roughness={0.95}
        side={2}
        transparent
        opacity={0.5}
      />
    </mesh>
    {/* Sliver fragment patung patah */}
    <mesh position={[0.35, 0.03, -0.05]} rotation={[0.3, 0.4, 0.1]}>
      <boxGeometry args={[0.08, 0.06, 0.08]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
  </group>
);

// KnockedOverSignpost — papan penunjuk kayu roboh, mirror WoodenSignpost
// purified ([-3.4, 0, 1.0]). Tiang patah miring di tanah, papan teks
// terlepas lebih jauh dengan kayu retak.
const KnockedOverSignpost = ({ pos = [-3.4, 0, 1.0], rot = -0.3 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Stump pole — fondasi kayu masih nempel di tanah */}
    <mesh position={[0, 0.08, 0]}>
      <cylinderGeometry args={[0.035, 0.045, 0.16, 6]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Pole patah — rebah miring di tanah, splintered tip */}
    <mesh position={[0.32, 0.04, 0.04]} rotation={[0, 0, Math.PI / 2 + 0.15]}>
      <cylinderGeometry args={[0.035, 0.04, 0.6, 6]} />
      <meshStandardMaterial color="#4a3018" roughness={0.95} />
    </mesh>
    {/* Papan signpost — terlepas, datar di tanah jauh */}
    <mesh position={[0.65, 0.025, 0.12]} rotation={[0.1, 0.3, 0.05]}>
      <boxGeometry args={[0.32, 0.04, 0.2]} />
      <meshStandardMaterial color="#4a3018" roughness={0.95} />
    </mesh>
    {/* Splinters — 2 keping kayu kecil */}
    <mesh position={[0.5, 0.02, -0.08]} rotation={[0.05, 0.5, 0.1]}>
      <boxGeometry args={[0.12, 0.02, 0.03]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    <mesh position={[0.85, 0.02, 0.22]} rotation={[0.1, -0.3, 0.08]}>
      <boxGeometry args={[0.08, 0.02, 0.025]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
  </group>
);

// WitheredCattails — cattails kering di rim pond, mirror CATTAIL_DEFS
// purified. Reuse positions yang sama biar pas restore, mereka tumbuh
// di slot identik. Stalks coklat khaki + heads gugur sebagian.
const WITHERED_CATTAIL_DEFS = [
  { pos: [-5.45, 0, -0.5], count: 2, seed: 1 },
  { pos: [-5.7, 0, 0.05], count: 3, seed: 2 },
  { pos: [-5.95, 0, 0.4], count: 2, seed: 3 },
  { pos: [-6.6, 0, 0.55], count: 3, seed: 4 },
  { pos: [-7.2, 0, 0.55], count: 2, seed: 5 },
  { pos: [-7.8, 0, 0.25], count: 2, seed: 6 },
];
const WitheredCattails = () => (
  <>
    {WITHERED_CATTAIL_DEFS.map((c, ci) => (
      <group key={`wc-${ci}`} position={c.pos}>
        {Array.from({ length: c.count }).map((_, j) => {
          const k = j + c.seed * 7;
          const offX = ((k * 37) % 5) * 0.04 - 0.08;
          const offZ = ((k * 53) % 5) * 0.04 - 0.08;
          const height = 0.3 + ((k * 13) % 4) * 0.06;
          // Tilt lebih ekstrem dari purified — kering condong
          const tilt = 0.2 + ((k * 17) % 5) * 0.08;
          const hasHead = k % 3 !== 0;
          return (
            <group
              key={j}
              position={[offX, 0, offZ]}
              rotation={[tilt, 0, tilt * 0.9]}
            >
              {/* Stalk khaki kering */}
              <mesh position={[0, height / 2, 0]}>
                <cylinderGeometry args={[0.01, 0.015, height, 5]} />
                <meshStandardMaterial color="#7a6a48" roughness={0.95} />
              </mesh>
              {/* Head — sebagian gugur, jadi cuma sebagian ada */}
              {hasHead && (
                <mesh position={[0, height + 0.04, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.08, 5]} />
                  <meshStandardMaterial color="#5a3818" roughness={0.95} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    ))}
  </>
);

// DriedTsukubai — water basin retak tanpa air, mirror Tsukubai purified
// ([-4.5, 0, 1.4]). Bowl miring, water surface absent, bamboo spout
// patah jatuh di tanah. Mossy crusted dry look via color shift.
const DriedTsukubai = ({ pos = [-4.5, 0, 1.4], rot = 0.3 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Foundation — masih ada, sedikit miring */}
    <mesh position={[0, 0.05, 0]} rotation={[0.08, 0, 0.05]}>
      <cylinderGeometry args={[0.25, 0.3, 0.1, 10]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    {/* Bowl basin — retak, miring lebih jauh */}
    <mesh position={[0.04, 0.16, 0]} rotation={[0.18, 0, 0.12]}>
      <cylinderGeometry args={[0.2, 0.22, 0.14, 12]} />
      <meshStandardMaterial color="#6a5848" roughness={0.95} />
    </mesh>
    {/* Crack di bibir basin — strip gelap */}
    <mesh position={[0.18, 0.22, 0]} rotation={[0.2, 0, 1.2]}>
      <boxGeometry args={[0.16, 0.02, 0.01]} />
      <meshStandardMaterial color="#1a100a" roughness={1} />
    </mesh>
    {/* Bamboo support post — patah pendek, condong */}
    <mesh position={[-0.35, 0.18, 0]} rotation={[0, 0, -0.2]}>
      <cylinderGeometry args={[0.03, 0.03, 0.32, 6]} />
      <meshStandardMaterial color="#5a4830" roughness={0.95} />
    </mesh>
    {/* Bamboo spout (kakei) — terlepas di tanah */}
    <mesh position={[-0.15, 0.03, 0.1]} rotation={[0.5, 0.3, -0.5]}>
      <cylinderGeometry args={[0.022, 0.022, 0.35, 6]} />
      <meshStandardMaterial color="#7a6038" roughness={0.95} />
    </mesh>
    {/* Sliver fragment kayu pecah */}
    <mesh position={[0.1, 0.02, 0.18]} rotation={[0.1, 0.6, 0.05]}>
      <boxGeometry args={[0.06, 0.015, 0.015]} />
      <meshStandardMaterial color="#5a4830" roughness={0.95} />
    </mesh>
  </group>
);

// BrokenBambooCluster — bamboo stalks roboh + snapped tips. Mirror
// BambooCluster purified ([-3.8, 0, 0.5]). 4 stalk pendek (patah
// halfway), beberapa rebah di tanah. Daun lepas (small leaf planes)
// scattered around.
const BROKEN_BAMBOO_DEFS = [
  { offset: [0, 0, 0], height: 0.7, tilt: 0.05, snapped: true },
  { offset: [0.18, 0, 0.08], height: 0.45, tilt: -0.15, snapped: true },
  { offset: [-0.12, 0, 0.15], height: 0.85, tilt: 0.08, snapped: false },
  { offset: [0.06, 0, -0.14], height: 0.55, tilt: -0.1, snapped: true },
];
const BROKEN_BAMBOO_LEAVES = [
  { pos: [0.3, 0.01, 0.25], rot: 0.4 },
  { pos: [-0.25, 0.01, -0.1], rot: -0.8 },
  { pos: [0.15, 0.01, 0.4], rot: 1.0 },
  { pos: [-0.35, 0.01, 0.3], rot: -0.3 },
  { pos: [0.4, 0.01, -0.2], rot: 0.7 },
];
const BrokenBambooCluster = ({ pos = [-3.8, 0, 0.5] }) => (
  <group position={pos}>
    {BROKEN_BAMBOO_DEFS.map((s, i) => (
      <group
        key={`bbroken-${i}`}
        position={s.offset}
        rotation={[s.tilt, 0, s.tilt * 0.7]}
      >
        {/* Stalk patah pendek (lebih khaki / pudar dari purified) */}
        <mesh position={[0, s.height / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.05, s.height, 6]} />
          <meshStandardMaterial color="#6a7848" roughness={0.95} />
        </mesh>
        {/* Joint rings sepanjang stalk */}
        {[0.25, 0.5, 0.75].map(
          (y, j) =>
            y < s.height && (
              <mesh key={j} position={[0, y, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.015, 6]} />
                <meshStandardMaterial color="#5a6838" roughness={0.95} />
              </mesh>
            )
        )}
        {/* Snapped tip — splinter chunk kayu di ujung */}
        {s.snapped && (
          <mesh position={[0.02, s.height + 0.04, 0]} rotation={[0, 0, 0.4]}>
            <coneGeometry args={[0.035, 0.08, 4]} />
            <meshStandardMaterial color="#5a6838" roughness={0.95} />
          </mesh>
        )}
      </group>
    ))}
    {/* Stalk yang rebah penuh di tanah */}
    <mesh position={[0.35, 0.04, -0.25]} rotation={[0, 0.4, Math.PI / 2 + 0.1]}>
      <cylinderGeometry args={[0.04, 0.05, 0.95, 6]} />
      <meshStandardMaterial color="#5a6838" roughness={0.95} />
    </mesh>
    <mesh position={[-0.4, 0.04, 0.35]} rotation={[0, -0.3, Math.PI / 2 - 0.15]}>
      <cylinderGeometry args={[0.035, 0.045, 0.7, 6]} />
      <meshStandardMaterial color="#5a6838" roughness={0.95} />
    </mesh>
    {/* Fallen leaves — planes flat di tanah */}
    {BROKEN_BAMBOO_LEAVES.map((l, i) => (
      <mesh
        key={`bbleaf-${i}`}
        position={l.pos}
        rotation={[-Math.PI / 2, 0, l.rot]}
      >
        <planeGeometry args={[0.08, 0.025]} />
        <meshStandardMaterial
          color="#4a5828"
          roughness={0.95}
          side={2}
          transparent
          opacity={0.65}
        />
      </mesh>
    ))}
  </group>
);

// DisplacedSteppingStones — slate stones miring tenggelam / displaced
// dari grid lurus purified. Mirror SteppingStones (4 stones lurus dari
// bridge ke picnic set). Drought: stones tilted, sebagian sunken
// half-buried (lower y), warna lebih cokelat-lumpur.
const DISPLACED_STEPPING_DEFS = [
  { pos: [-4.65, 0.02, 1.62], rot: 0.6, scale: 1.0, sunken: false },
  { pos: [-4.1, 0.005, 1.85], rot: -0.4, scale: 0.95, sunken: true },
  { pos: [-3.35, 0.04, 1.88], rot: 0.9, scale: 1.05, sunken: false },
  { pos: [-2.85, 0.01, 2.15], rot: -0.6, scale: 0.95, sunken: true },
];
const DisplacedSteppingStones = () => (
  <>
    {DISPLACED_STEPPING_DEFS.map((s, i) => (
      <mesh
        key={`dstep-${i}`}
        position={s.pos}
        rotation={[-Math.PI / 2 + (s.sunken ? 0.12 : 0), 0, s.rot]}
        scale={[s.scale * 0.55, 1, s.scale * 0.46]}
      >
        <boxGeometry args={[1, 0.07, 1]} />
        <meshStandardMaterial color="#6a5848" roughness={0.95} />
      </mesh>
    ))}
    {/* 1 stone pecah jadi 2 fragment */}
    <mesh
      position={[-3.7, 0.025, 2.4]}
      rotation={[-Math.PI / 2, 0, 0.3]}
      scale={[0.3, 1, 0.28]}
    >
      <boxGeometry args={[1, 0.07, 1]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    <mesh
      position={[-3.45, 0.02, 2.55]}
      rotation={[-Math.PI / 2, 0, -0.5]}
      scale={[0.22, 1, 0.18]}
    >
      <boxGeometry args={[1, 0.07, 1]} />
      <meshStandardMaterial color="#4a3828" roughness={0.95} />
    </mesh>
  </>
);

// TornOmikujiStrips — paper fortune strips terlepas/sobek, posts patah.
// Mirror OmikujiStrips purified ([-4.0, 0, 2.5]). Drought: crossbar
// rebah, beberapa strip masih nyangkut pelan goyang, sisa scattered
// flat di tanah.
const TORN_OMIKUJI_FLOOR = [
  { pos: [-0.2, 0.005, 0.15], rot: 0.5, len: 0.2 },
  { pos: [0.1, 0.005, -0.18], rot: -0.7, len: 0.16 },
  { pos: [0.3, 0.005, 0.3], rot: 1.0, len: 0.18 },
  { pos: [-0.4, 0.005, -0.05], rot: -0.3, len: 0.22 },
];
// CrackedRimStones — drought twin MossyRimStones. Slot identik (7 batu
// ring di rim Telaga), tapi tanpa moss cap, sedikit lebih datar (sunken),
// dengan crack thin di atas. Color shift ke earth-brown faded.
const CRACKED_RIM_DEFS = (() => {
  const arr = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.4;
    const r = 1.72 + ((i * 11) % 4) * 0.04;
    arr.push({
      pos: [-7 + Math.cos(angle) * r, 0.03, -1 + Math.sin(angle) * r],
      scale: [
        0.28 + ((i * 13) % 5) * 0.05,
        0.13 + ((i * 17) % 5) * 0.03,
        0.32 + ((i * 19) % 5) * 0.06,
      ],
      rot: ((i * 29) % 360) * (Math.PI / 180),
      cracked: i % 2 === 0,
    });
  }
  return arr;
})();
const CrackedRimStones = () => (
  <>
    {CRACKED_RIM_DEFS.map((s, i) => (
      <group
        key={`crackrim-${i}`}
        position={s.pos}
        rotation={[0, s.rot, 0]}
        scale={s.scale}
      >
        <mesh>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#6a5a48" roughness={0.98} />
        </mesh>
        {/* Crack line di puncak — strip gelap thin */}
        {s.cracked && (
          <mesh position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <planeGeometry args={[0.7, 0.06]} />
            <meshStandardMaterial color="#1a100a" roughness={1} />
          </mesh>
        )}
      </group>
    ))}
  </>
);

// SnappedDeadTrees — 3 dead tree trunk yg patah violent (beda dari
// DeadTrees yg cuma mati berdiri). Stump pendek di bawah, trunk
// atas terlepas rebah di tanah. Splinter chunks tersebar.
const SNAPPED_TREE_DEFS = [
  { pos: [4.5, 0, 5.5], stumpH: 0.7, trunkH: 1.6, rot: 0.5 },
  { pos: [-4.0, 0, 6.2], stumpH: 0.5, trunkH: 1.8, rot: -0.8 },
  { pos: [5.5, 0, -3.5], stumpH: 0.9, trunkH: 1.4, rot: 1.1 },
];
const SnappedDeadTree = ({ pos, stumpH, trunkH, rot }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Stump — pendek, splintered tip via cone tipis */}
    <mesh position={[0, stumpH / 2, 0]}>
      <cylinderGeometry args={[0.15, 0.2, stumpH, 6]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Splinter spike di tip stump — kayak patah kasar */}
    <mesh position={[0.05, stumpH + 0.08, 0.02]} rotation={[0, 0, 0.3]}>
      <coneGeometry args={[0.08, 0.18, 4]} />
      <meshStandardMaterial color="#2a1810" roughness={0.95} />
    </mesh>
    <mesh position={[-0.04, stumpH + 0.06, -0.03]} rotation={[0, 0, -0.4]}>
      <coneGeometry args={[0.06, 0.14, 4]} />
      <meshStandardMaterial color="#2a1810" roughness={0.95} />
    </mesh>
    {/* Trunk atas rebah di tanah, miring jauh */}
    <mesh
      position={[trunkH * 0.4, 0.18, 0.05]}
      rotation={[0, 0, Math.PI / 2 + 0.08]}
    >
      <cylinderGeometry args={[0.12, 0.16, trunkH, 6]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Branch fragments — 2 keping ranting kecil */}
    <mesh
      position={[trunkH * 0.65, 0.08, 0.18]}
      rotation={[0.1, 0.4, 0.7]}
    >
      <cylinderGeometry args={[0.04, 0.05, 0.5, 5]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    <mesh
      position={[trunkH * 0.5, 0.06, -0.22]}
      rotation={[0.05, -0.5, 0.4]}
    >
      <cylinderGeometry args={[0.03, 0.04, 0.4, 5]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Bark splinters */}
    <mesh position={[0.25, 0.02, 0.15]} rotation={[0.1, 0.6, 0.05]}>
      <boxGeometry args={[0.08, 0.02, 0.025]} />
      <meshStandardMaterial color="#2a1810" roughness={0.95} />
    </mesh>
    <mesh position={[-0.15, 0.02, -0.2]} rotation={[0.05, -0.4, 0.08]}>
      <boxGeometry args={[0.06, 0.02, 0.025]} />
      <meshStandardMaterial color="#2a1810" roughness={0.95} />
    </mesh>
  </group>
);
const SnappedDeadTrees = () => (
  <>
    {SNAPPED_TREE_DEFS.map((d, i) => (
      <SnappedDeadTree key={`snaptr-${i}`} {...d} />
    ))}
  </>
);

// CollapsedWallFragments — 2 fragmen tembok batu runtuh (rectangular
// masonry). Posisi di luar ring petak, kasih kerasa "bangunan sekitar
// kota juga runtuh." Stones layered/stacked, beberapa lepas.
const CollapsedWallFragment = ({ pos, rot, len = 1.6 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Base wall row — masih agak utuh */}
    <mesh position={[0, 0.12, 0]}>
      <boxGeometry args={[len, 0.24, 0.18]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    {/* Mid row — terpotong, lebih pendek */}
    <mesh position={[-len * 0.15, 0.32, 0]}>
      <boxGeometry args={[len * 0.6, 0.16, 0.18]} />
      <meshStandardMaterial color="#5a4838" roughness={0.95} />
    </mesh>
    {/* Top row pecahan — 2 batu lepas miring */}
    <mesh position={[len * 0.35, 0.06, 0.15]} rotation={[0.3, 0.4, 0.2]}>
      <boxGeometry args={[0.3, 0.16, 0.18]} />
      <meshStandardMaterial color="#4a3828" roughness={0.95} />
    </mesh>
    <mesh position={[len * 0.55, 0.04, -0.1]} rotation={[0.1, -0.3, 0.1]}>
      <boxGeometry args={[0.22, 0.14, 0.16]} />
      <meshStandardMaterial color="#4a3828" roughness={0.95} />
    </mesh>
    {/* Pecahan kecil di tanah */}
    <mesh position={[-len * 0.5, 0.03, 0.22]} rotation={[0.1, 0.5, 0.05]}>
      <boxGeometry args={[0.12, 0.06, 0.1]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    <mesh position={[len * 0.7, 0.025, 0.05]} rotation={[0.05, -0.6, 0.08]}>
      <boxGeometry args={[0.1, 0.05, 0.08]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
  </group>
);
const CollapsedWallFragments = () => (
  <>
    <CollapsedWallFragment pos={[6.5, 0, 4.0]} rot={-0.4} len={1.6} />
    <CollapsedWallFragment pos={[-6.0, 0, -5.0]} rot={0.6} len={1.4} />
  </>
);

// RubbleHouses — cluster rumah-rumah hancur di east-side, dekat
// Perpustakaan (PetaArsip @ [7, 0, -1]). Mini-village ruin: 4 rumah
// dengan tipe kerusakan beda — collapsed roof, tilted leaning, wall
// stubs + chimney, doorframe ruin. Posisi di x=9-12 supaya cluster
// di antara petak Arsip dan outer-ring city ruins.
const RUBBLE_HOUSE_DEFS = [
  { pos: [9, 0, 0.8], rot: 0.3, variant: 0 },
  { pos: [10.5, 0, -1.2], rot: -0.5, variant: 1 },
  { pos: [11, 0, -2.8], rot: 0.7, variant: 2 },
  { pos: [9.2, 0, -3.2], rot: -0.2, variant: 3 },
];
const RubbleHouse = ({ pos, rot, variant }) => {
  if (variant === 0) {
    // Collapsed roof house — kiri tinggi, kanan rendah, atap sagged
    return (
      <group position={pos} rotation={[0, rot, 0]}>
        {/* Wall kiri — tinggi, intact */}
        <mesh position={[-0.4, 0.3, 0]}>
          <boxGeometry args={[0.05, 0.6, 0.7]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        {/* Wall kanan — pendek, runtuh */}
        <mesh position={[0.4, 0.18, 0]}>
          <boxGeometry args={[0.05, 0.36, 0.7]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
        {/* Wall belakang — intact */}
        <mesh position={[0, 0.3, -0.35]}>
          <boxGeometry args={[0.82, 0.6, 0.05]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        {/* Wall depan — partial, runtuh setengah */}
        <mesh position={[-0.22, 0.2, 0.35]}>
          <boxGeometry args={[0.38, 0.4, 0.05]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
        {/* Atap sagged miring ke kanan (sisi runtuh) */}
        <mesh position={[0.03, 0.55, 0]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.85, 0.04, 0.72]} />
          <meshStandardMaterial color="#2a1810" roughness={0.95} />
        </mesh>
        {/* Roof beams sticking out */}
        <mesh
          position={[0.22, 0.65, 0.22]}
          rotation={[0.4, 0.3, 0]}
        >
          <boxGeometry args={[0.04, 0.04, 0.3]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
        <mesh
          position={[-0.18, 0.6, -0.27]}
          rotation={[-0.3, -0.2, 0.5]}
        >
          <boxGeometry args={[0.04, 0.04, 0.25]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
        {/* Debris pile dekat sisi runtuh */}
        <mesh
          position={[0.55, 0.05, 0.25]}
          rotation={[0.1, 0.4, 0.1]}
        >
          <boxGeometry args={[0.16, 0.1, 0.12]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
        <mesh
          position={[0.5, 0.03, -0.15]}
          rotation={[0.05, -0.3, 0.08]}
        >
          <boxGeometry args={[0.1, 0.06, 0.08]} />
          <meshStandardMaterial color="#2a1810" roughness={0.95} />
        </mesh>
      </group>
    );
  }
  if (variant === 1) {
    // Tilted house — utuh tapi miring 0.18 rad ke samping
    return (
      <group position={pos} rotation={[0, rot, 0.18]}>
        {/* Body box */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.7, 0.6, 0.6]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        {/* Pitched roof — 2 slab angled */}
        <mesh
          position={[-0.16, 0.72, 0]}
          rotation={[0, 0, 0.5]}
        >
          <boxGeometry args={[0.42, 0.04, 0.62]} />
          <meshStandardMaterial color="#2a1810" roughness={0.95} />
        </mesh>
        <mesh
          position={[0.16, 0.72, 0]}
          rotation={[0, 0, -0.5]}
        >
          <boxGeometry args={[0.42, 0.04, 0.62]} />
          <meshStandardMaterial color="#2a1810" roughness={0.95} />
        </mesh>
        {/* Window — kotak hitam */}
        <mesh position={[0, 0.4, 0.31]}>
          <planeGeometry args={[0.16, 0.18]} />
          <meshStandardMaterial color="#0a0604" />
        </mesh>
        {/* Door — kotak dark */}
        <mesh position={[-0.18, 0.18, 0.31]}>
          <planeGeometry args={[0.13, 0.3]} />
          <meshStandardMaterial color="#1a1008" />
        </mesh>
        {/* Crack diagonal di wall depan */}
        <mesh
          position={[0.12, 0.32, 0.311]}
          rotation={[0, 0, 0.7]}
        >
          <planeGeometry args={[0.42, 0.02]} />
          <meshStandardMaterial color="#1a1008" />
        </mesh>
      </group>
    );
  }
  if (variant === 2) {
    // Wall stubs + chimney standing alone
    return (
      <group position={pos} rotation={[0, rot, 0]}>
        {/* Floor slab base */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.85, 0.04, 0.75]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
        {/* Stub front-left */}
        <mesh position={[-0.38, 0.14, 0.34]}>
          <boxGeometry args={[0.05, 0.24, 0.1]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        {/* Stub front-right */}
        <mesh position={[0.38, 0.18, 0.34]}>
          <boxGeometry args={[0.05, 0.32, 0.1]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        {/* Stub belakang — lebih panjang */}
        <mesh position={[0, 0.12, -0.34]}>
          <boxGeometry args={[0.78, 0.2, 0.05]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        {/* Chimney tinggi sendirian */}
        <mesh position={[0.28, 0.55, -0.22]}>
          <boxGeometry args={[0.11, 1.0, 0.11]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
        {/* Chimney cap */}
        <mesh position={[0.28, 1.07, -0.22]}>
          <boxGeometry args={[0.15, 0.04, 0.15]} />
          <meshStandardMaterial color="#2a1810" roughness={0.95} />
        </mesh>
        {/* Scattered bricks */}
        <mesh
          position={[-0.12, 0.04, 0.32]}
          rotation={[0.1, 0.5, 0]}
        >
          <boxGeometry args={[0.08, 0.04, 0.06]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        <mesh
          position={[0.18, 0.04, -0.12]}
          rotation={[0.05, -0.3, 0]}
        >
          <boxGeometry args={[0.07, 0.04, 0.05]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
        <mesh
          position={[0.05, 0.04, 0.18]}
          rotation={[0.08, 0.7, 0]}
        >
          <boxGeometry args={[0.06, 0.03, 0.05]} />
          <meshStandardMaterial color="#3a2418" roughness={0.95} />
        </mesh>
      </group>
    );
  }
  // variant 3: Doorframe ruin — pintu nyangkut tanpa rumah
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Left door post */}
      <mesh position={[-0.2, 0.32, 0]}>
        <boxGeometry args={[0.06, 0.65, 0.1]} />
        <meshStandardMaterial color="#4a3018" roughness={0.95} />
      </mesh>
      {/* Right door post */}
      <mesh position={[0.2, 0.32, 0]}>
        <boxGeometry args={[0.06, 0.65, 0.1]} />
        <meshStandardMaterial color="#4a3018" roughness={0.95} />
      </mesh>
      {/* Lintel */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.12]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Partial wall kanan */}
      <mesh position={[0.48, 0.22, 0]}>
        <boxGeometry args={[0.05, 0.44, 0.55]} />
        <meshStandardMaterial color="#4a3018" roughness={0.95} />
      </mesh>
      {/* Wall stub kiri — lebih rendah */}
      <mesh position={[-0.32, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.2, 0.4]} />
        <meshStandardMaterial color="#4a3018" roughness={0.95} />
      </mesh>
      {/* Debris pile depan pintu */}
      <mesh
        position={[0, 0.04, 0.28]}
        rotation={[0.05, 0.3, 0]}
      >
        <boxGeometry args={[0.42, 0.08, 0.14]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      {/* Scattered bits */}
      <mesh position={[-0.28, 0.03, 0.32]}>
        <boxGeometry args={[0.06, 0.04, 0.06]} />
        <meshStandardMaterial color="#3a2418" roughness={0.95} />
      </mesh>
      <mesh
        position={[0.3, 0.025, 0.25]}
        rotation={[0.05, -0.4, 0]}
      >
        <boxGeometry args={[0.08, 0.04, 0.07]} />
        <meshStandardMaterial color="#2a1810" roughness={0.95} />
      </mesh>
    </group>
  );
};
const RubbleHouses = () => (
  <>
    {RUBBLE_HOUSE_DEFS.map((d, i) => (
      <RubbleHouse key={`rh-${i}`} {...d} />
    ))}
  </>
);

// RestoredHouses — purified counterpart RubbleHouses. Slot persis sama
// (4 rumah di east-side dekat Perpustakaan), tapi udah berdiri lagi:
// dinding plester warm cream, atap terakota miring rapi, pintu kayu
// utuh, jendela bersinar dari dalam (warm interior glow). Tone: "rumah
// kembali dihuni" — masih sederhana, gak mewah, tapi hangat dan hidup.
const RESTORED_HOUSE_DEFS = [
  { pos: [9, 0, 0.8], rot: 0.3, variant: 0 },
  { pos: [10.5, 0, -1.2], rot: -0.5, variant: 1 },
  { pos: [11, 0, -2.8], rot: 0.7, variant: 2 },
  { pos: [9.2, 0, -3.2], rot: -0.2, variant: 3 },
];
const RestoredHouse = ({ pos, rot, variant }) => {
  // Palette restored — 4 gaya arsitektur beda, palette warm hangat:
  // plaster cream, kayu coklat, atap terakota/genteng, brick warm,
  // jendela bersinar warm (kerasa lampu nyala dalam rumah).
  const plasterA = '#e8d2a8';
  const plasterB = '#d8c098';
  const plasterLight = '#f0e0c0';
  const woodDark = '#3a2010';
  const woodMid = '#5a3820';
  const woodTrim = '#7a4828';
  const woodDoor = '#4a2c14';
  const roofTile = '#b85838';
  const roofTileDeep = '#963d20';
  const brickA = '#a8543c';
  const brickB = '#8a4030';
  const stoneFound = '#8a7558';
  const winGlow = '#f8d098';
  const winGlowDim = '#f4c080';
  const brass = '#d4a050';

  if (variant === 0) {
    // ====== TUDOR HALF-TIMBER COTTAGE ======
    // Plaster cream walls + dark wood timber X-brace, steep terracotta
    // roof dgn tile rows, brick chimney, gable front facing.
    return (
      <group position={pos} rotation={[0, rot, 0]}>
        {/* Stone foundation strip wider — kerasa landing solid */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1.0, 0.1, 0.82]} />
          <meshStandardMaterial color={stoneFound} roughness={0.9} />
        </mesh>
        {/* Body wall — plaster cream */}
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[0.86, 0.72, 0.72]} />
          <meshStandardMaterial color={plasterA} roughness={0.85} />
        </mesh>
        {/* Vertical corner timbers (4 sudut) */}
        {[[-0.42, 0.41], [0.42, 0.41], [-0.42, -0.41], [0.42, -0.41]].map(
          ([x, z], i) => (
            <mesh key={`vt-${i}`} position={[x, 0.46, z]}>
              <boxGeometry args={[0.06, 0.74, 0.06]} />
              <meshStandardMaterial color={woodDark} roughness={0.92} />
            </mesh>
          ),
        )}
        {/* Horizontal timber band tengah */}
        <mesh position={[0, 0.5, 0.365]}>
          <boxGeometry args={[0.85, 0.05, 0.025]} />
          <meshStandardMaterial color={woodDark} roughness={0.92} />
        </mesh>
        {/* Diagonal X-brace di front-facing wall (sisi kanan) */}
        <mesh position={[0.2, 0.62, 0.365]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.34, 0.04, 0.02]} />
          <meshStandardMaterial color={woodDark} roughness={0.92} />
        </mesh>
        <mesh position={[0.2, 0.62, 0.365]} rotation={[0, 0, -0.6]}>
          <boxGeometry args={[0.34, 0.04, 0.02]} />
          <meshStandardMaterial color={woodDark} roughness={0.92} />
        </mesh>
        {/* Pintu kayu — kiri front, dgn iron strap horizontal */}
        <mesh position={[-0.2, 0.26, 0.37]}>
          <boxGeometry args={[0.2, 0.42, 0.015]} />
          <meshStandardMaterial color={woodDoor} roughness={0.92} />
        </mesh>
        <mesh position={[-0.2, 0.36, 0.38]}>
          <boxGeometry args={[0.2, 0.022, 0.008]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        <mesh position={[-0.2, 0.18, 0.38]}>
          <boxGeometry args={[0.2, 0.022, 0.008]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        {/* Doorknob brass */}
        <mesh position={[-0.14, 0.28, 0.385]}>
          <sphereGeometry args={[0.013, 6, 6]} />
          <meshStandardMaterial color={brass} metalness={0.7} roughness={0.45} />
        </mesh>
        {/* Atap pitched 2-slab steep (rotation lebih curam ~0.65) */}
        <mesh position={[-0.23, 0.92, 0]} rotation={[0, 0, 0.62]}>
          <boxGeometry args={[0.58, 0.045, 0.84]} />
          <meshStandardMaterial color={roofTile} roughness={0.92} />
        </mesh>
        <mesh position={[0.23, 0.92, 0]} rotation={[0, 0, -0.62]}>
          <boxGeometry args={[0.58, 0.045, 0.84]} />
          <meshStandardMaterial color={roofTile} roughness={0.92} />
        </mesh>
        {/* Roof tile rows — 3 horizontal strips di tiap slope (slight
            offset bawah supaya kerasa overlap genteng) */}
        {[0, 1, 2].map((row) => (
          <React.Fragment key={`tile-${row}`}>
            <mesh
              position={[-0.23 + row * 0.13, 0.88 - row * 0.08, 0]}
              rotation={[0, 0, 0.62]}
            >
              <boxGeometry args={[0.12, 0.012, 0.86]} />
              <meshStandardMaterial color={roofTileDeep} roughness={0.92} />
            </mesh>
            <mesh
              position={[0.23 - row * 0.13, 0.88 - row * 0.08, 0]}
              rotation={[0, 0, -0.62]}
            >
              <boxGeometry args={[0.12, 0.012, 0.86]} />
              <meshStandardMaterial color={roofTileDeep} roughness={0.92} />
            </mesh>
          </React.Fragment>
        ))}
        {/* Ridge cap puncak atap */}
        <mesh position={[0, 1.16, 0]}>
          <boxGeometry args={[0.07, 0.045, 0.86]} />
          <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
        </mesh>
        {/* Gable triangle infill — segitiga front-facing atas wall */}
        <mesh position={[0, 1.0, 0.37]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.18, 0.18, 0.02]} />
          <meshStandardMaterial color={plasterLight} roughness={0.85} />
        </mesh>
        {/* Brick chimney di sisi belakang */}
        <mesh position={[0.3, 1.05, -0.28]}>
          <boxGeometry args={[0.13, 0.55, 0.13]} />
          <meshStandardMaterial color={brickA} roughness={0.92} />
        </mesh>
        {/* Brick texture row (offset boxes tipis di chimney) */}
        {[0, 1, 2].map((r) => (
          <mesh
            key={`bcr-${r}`}
            position={[0.3, 0.92 + r * 0.14, -0.28]}
          >
            <boxGeometry args={[0.135, 0.018, 0.135]} />
            <meshStandardMaterial color={brickB} roughness={0.92} />
          </mesh>
        ))}
        {/* Chimney cap */}
        <mesh position={[0.3, 1.35, -0.28]}>
          <boxGeometry args={[0.17, 0.04, 0.17]} />
          <meshStandardMaterial color={stoneFound} roughness={0.9} />
        </mesh>
        {/* Jendela mullion 4-pane bersinar — depan kanan */}
        <mesh position={[0.18, 0.52, 0.37]}>
          <boxGeometry args={[0.22, 0.22, 0.015]} />
          <meshStandardMaterial
            color={winGlow}
            emissive={winGlow}
            emissiveIntensity={0.62}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
        {/* Mullion cross 4-pane */}
        <mesh position={[0.18, 0.52, 0.378]}>
          <boxGeometry args={[0.012, 0.22, 0.005]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        <mesh position={[0.18, 0.52, 0.378]}>
          <boxGeometry args={[0.22, 0.012, 0.005]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        {/* Jendela samping kiri kecil */}
        <mesh position={[-0.43, 0.55, 0.05]}>
          <boxGeometry args={[0.015, 0.18, 0.16]} />
          <meshStandardMaterial
            color={winGlowDim}
            emissive={winGlowDim}
            emissiveIntensity={0.45}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
      </group>
    );
  }
  if (variant === 1) {
    // ====== COUNTRY HOUSE WITH COVERED PORCH ======
    // Plaster wall + porch awning supported by 2 wooden columns,
    // shuttered window dgn flower box, climbing vine corner.
    return (
      <group position={pos} rotation={[0, rot, 0]}>
        {/* Stone foundation strip */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.86, 0.1, 0.7]} />
          <meshStandardMaterial color={stoneFound} roughness={0.9} />
        </mesh>
        {/* Body box plaster */}
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[0.76, 0.72, 0.62]} />
          <meshStandardMaterial color={plasterA} roughness={0.85} />
        </mesh>
        {/* Pitched roof simetris dgn eaves overhang lebar */}
        <mesh position={[-0.22, 0.92, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.56, 0.04, 0.82]} />
          <meshStandardMaterial color={roofTile} roughness={0.9} />
        </mesh>
        <mesh position={[0.22, 0.92, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.56, 0.04, 0.82]} />
          <meshStandardMaterial color={roofTile} roughness={0.9} />
        </mesh>
        {/* Tile row mid-slope tiap slab (overlap detail) */}
        <mesh position={[-0.18, 0.84, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.14, 0.013, 0.82]} />
          <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
        </mesh>
        <mesh position={[0.18, 0.84, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.14, 0.013, 0.82]} />
          <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
        </mesh>
        {/* Ridge cap */}
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[0.06, 0.04, 0.84]} />
          <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
        </mesh>
        {/* === PORCH === */}
        {/* Porch floor — wood deck depan rumah */}
        <mesh position={[0, 0.12, 0.5]}>
          <boxGeometry args={[0.7, 0.06, 0.34]} />
          <meshStandardMaterial color={woodTrim} roughness={0.9} />
        </mesh>
        {/* 2 porch columns kayu */}
        {[-0.28, 0.28].map((x, i) => (
          <mesh key={`pc-${i}`} position={[x, 0.42, 0.65]}>
            <cylinderGeometry args={[0.035, 0.04, 0.6, 8]} />
            <meshStandardMaterial color={woodTrim} roughness={0.85} />
          </mesh>
        ))}
        {/* Porch awning — slab miring atap kecil di atas porch */}
        <mesh position={[0, 0.78, 0.55]} rotation={[-0.25, 0, 0]}>
          <boxGeometry args={[0.78, 0.04, 0.38]} />
          <meshStandardMaterial color={roofTile} roughness={0.9} />
        </mesh>
        {/* Pintu kayu di tengah belakang porch */}
        <mesh position={[0, 0.32, 0.32]}>
          <boxGeometry args={[0.2, 0.5, 0.015]} />
          <meshStandardMaterial color={woodDoor} roughness={0.92} />
        </mesh>
        {/* Door panel inset trim */}
        <mesh position={[0, 0.42, 0.328]}>
          <boxGeometry args={[0.14, 0.14, 0.005]} />
          <meshStandardMaterial color={woodMid} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.24, 0.328]}>
          <boxGeometry args={[0.14, 0.14, 0.005]} />
          <meshStandardMaterial color={woodMid} roughness={0.9} />
        </mesh>
        {/* Doorknob */}
        <mesh position={[0.07, 0.34, 0.335]}>
          <sphereGeometry args={[0.013, 6, 6]} />
          <meshStandardMaterial color={brass} metalness={0.7} roughness={0.45} />
        </mesh>
        {/* Jendela 4-pane bersinar — sisi samping kanan (luar porch) */}
        <mesh position={[0.385, 0.5, 0]}>
          <boxGeometry args={[0.015, 0.26, 0.28]} />
          <meshStandardMaterial
            color={winGlow}
            emissive={winGlow}
            emissiveIntensity={0.6}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
        {/* Mullion 4-pane di jendela samping */}
        <mesh position={[0.39, 0.5, 0]}>
          <boxGeometry args={[0.005, 0.26, 0.012]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        <mesh position={[0.39, 0.5, 0]}>
          <boxGeometry args={[0.005, 0.012, 0.28]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        {/* Shutter kayu flanking jendela */}
        <mesh position={[0.388, 0.5, -0.18]}>
          <boxGeometry args={[0.012, 0.26, 0.08]} />
          <meshStandardMaterial color={woodTrim} roughness={0.9} />
        </mesh>
        <mesh position={[0.388, 0.5, 0.18]}>
          <boxGeometry args={[0.012, 0.26, 0.08]} />
          <meshStandardMaterial color={woodTrim} roughness={0.9} />
        </mesh>
        {/* Flower box di bawah jendela samping */}
        <mesh position={[0.39, 0.34, 0]}>
          <boxGeometry args={[0.04, 0.05, 0.3]} />
          <meshStandardMaterial color={woodTrim} roughness={0.9} />
        </mesh>
        {/* Bunga merah/kuning kombinasi */}
        {[-0.1, -0.03, 0.04, 0.11].map((z, i) => (
          <mesh
            key={`fb-${i}`}
            position={[0.41, 0.39, z]}
          >
            <sphereGeometry args={[0.022, 6, 5]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#c84a40' : '#e8a838'}
              roughness={0.85}
            />
          </mesh>
        ))}
        {/* Climbing vine — 5 leafy clusters naik dari ground di pojok */}
        {[0.14, 0.32, 0.5, 0.66, 0.8].map((y, i) => (
          <mesh
            key={`vine-${i}`}
            position={[-0.38, y, 0.32 - i * 0.04]}
          >
            <sphereGeometry args={[0.05 + (i % 2) * 0.012, 6, 5]} />
            <meshStandardMaterial color="#5a7838" roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }
  if (variant === 2) {
    // ====== BRICK 2-STORY HOUSE WITH SMOKING CHIMNEY ======
    // Body taller (2-story), brick wall pattern (rows), tall brick chimney
    // dgn smoke wisp tipis static, gable roof, upper attic window kecil.
    return (
      <group position={pos} rotation={[0, rot, 0]}>
        {/* Stone foundation */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.95, 0.12, 0.8]} />
          <meshStandardMaterial color={stoneFound} roughness={0.9} />
        </mesh>
        {/* Body 2-story (taller ~1.2) brick base color */}
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[0.84, 1.18, 0.72]} />
          <meshStandardMaterial color={brickA} roughness={0.9} />
        </mesh>
        {/* Brick rows — 5 horizontal strips alternating shade (offset
            stripes biar kerasa brick pattern) */}
        {[0, 1, 2, 3, 4].map((r) => (
          <React.Fragment key={`br-${r}`}>
            <mesh position={[0, 0.25 + r * 0.22, 0.365]}>
              <boxGeometry args={[0.85, 0.04, 0.005]} />
              <meshStandardMaterial color={brickB} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.25 + r * 0.22, -0.365]}>
              <boxGeometry args={[0.85, 0.04, 0.005]} />
              <meshStandardMaterial color={brickB} roughness={0.9} />
            </mesh>
            <mesh position={[0.425, 0.25 + r * 0.22, 0]}>
              <boxGeometry args={[0.005, 0.04, 0.73]} />
              <meshStandardMaterial color={brickB} roughness={0.9} />
            </mesh>
          </React.Fragment>
        ))}
        {/* Atap pitched dgn gable end */}
        <mesh position={[-0.24, 1.42, 0]} rotation={[0, 0, 0.55]}>
          <boxGeometry args={[0.6, 0.05, 0.82]} />
          <meshStandardMaterial color={roofTile} roughness={0.9} />
        </mesh>
        <mesh position={[0.24, 1.42, 0]} rotation={[0, 0, -0.55]}>
          <boxGeometry args={[0.6, 0.05, 0.82]} />
          <meshStandardMaterial color={roofTile} roughness={0.9} />
        </mesh>
        {/* Tile row mid-slope */}
        <mesh position={[-0.2, 1.34, 0]} rotation={[0, 0, 0.55]}>
          <boxGeometry args={[0.16, 0.014, 0.82]} />
          <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
        </mesh>
        <mesh position={[0.2, 1.34, 0]} rotation={[0, 0, -0.55]}>
          <boxGeometry args={[0.16, 0.014, 0.82]} />
          <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
        </mesh>
        {/* Ridge cap */}
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[0.07, 0.04, 0.84]} />
          <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
        </mesh>
        {/* Gable triangle infill — brick di atas wall depan */}
        <mesh position={[0, 1.42, 0.365]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.22, 0.22, 0.015]} />
          <meshStandardMaterial color={brickA} roughness={0.9} />
        </mesh>
        {/* Tall brick chimney — slot variant 2 mirror */}
        <mesh position={[0.28, 1.55, -0.22]}>
          <boxGeometry args={[0.14, 0.65, 0.14]} />
          <meshStandardMaterial color={brickA} roughness={0.9} />
        </mesh>
        {/* Brick texture rows on chimney */}
        {[0, 1, 2, 3].map((r) => (
          <mesh
            key={`bcr-${r}`}
            position={[0.28, 1.32 + r * 0.16, -0.22]}
          >
            <boxGeometry args={[0.145, 0.02, 0.145]} />
            <meshStandardMaterial color={brickB} roughness={0.9} />
          </mesh>
        ))}
        {/* Chimney cap stone */}
        <mesh position={[0.28, 1.9, -0.22]}>
          <boxGeometry args={[0.18, 0.04, 0.18]} />
          <meshStandardMaterial color={stoneFound} roughness={0.9} />
        </mesh>
        {/* Smoke wisp static — tipis di atas chimney */}
        <mesh position={[0.28, 2.18, -0.22]}>
          <planeGeometry args={[0.4, 0.55]} />
          <meshBasicMaterial
            color="#5a4a40"
            transparent
            opacity={0.32}
            depthWrite={false}
            side={2}
          />
        </mesh>
        <mesh position={[0.32, 2.42, -0.22]}>
          <planeGeometry args={[0.32, 0.4]} />
          <meshBasicMaterial
            color="#5a4a40"
            transparent
            opacity={0.2}
            depthWrite={false}
            side={2}
          />
        </mesh>
        {/* Pintu kayu utuh dgn arched stone trim — lower floor */}
        <mesh position={[-0.22, 0.34, 0.37]}>
          <boxGeometry args={[0.22, 0.5, 0.015]} />
          <meshStandardMaterial color={woodDoor} roughness={0.92} />
        </mesh>
        {/* Stone arch lintel above door */}
        <mesh position={[-0.22, 0.62, 0.378]}>
          <boxGeometry args={[0.28, 0.06, 0.018]} />
          <meshStandardMaterial color={stoneFound} roughness={0.9} />
        </mesh>
        {/* Doorknob */}
        <mesh position={[-0.16, 0.34, 0.378]}>
          <sphereGeometry args={[0.013, 6, 6]} />
          <meshStandardMaterial color={brass} metalness={0.7} roughness={0.45} />
        </mesh>
        {/* Big window lower floor */}
        <mesh position={[0.18, 0.5, 0.37]}>
          <boxGeometry args={[0.26, 0.3, 0.015]} />
          <meshStandardMaterial
            color={winGlow}
            emissive={winGlow}
            emissiveIntensity={0.6}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
        {/* Mullion 4-pane */}
        <mesh position={[0.18, 0.5, 0.378]}>
          <boxGeometry args={[0.012, 0.3, 0.005]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        <mesh position={[0.18, 0.5, 0.378]}>
          <boxGeometry args={[0.26, 0.012, 0.005]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        {/* Shutters flanking lower window */}
        <mesh position={[0.05, 0.5, 0.378]}>
          <boxGeometry args={[0.08, 0.3, 0.008]} />
          <meshStandardMaterial color={woodTrim} roughness={0.9} />
        </mesh>
        <mesh position={[0.31, 0.5, 0.378]}>
          <boxGeometry args={[0.08, 0.3, 0.008]} />
          <meshStandardMaterial color={woodTrim} roughness={0.9} />
        </mesh>
        {/* Upper floor attic window kecil bersinar */}
        <mesh position={[0, 1.02, 0.37]}>
          <boxGeometry args={[0.2, 0.22, 0.015]} />
          <meshStandardMaterial
            color={winGlowDim}
            emissive={winGlowDim}
            emissiveIntensity={0.55}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
        {/* Attic mullion cross */}
        <mesh position={[0, 1.02, 0.378]}>
          <boxGeometry args={[0.012, 0.22, 0.005]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.02, 0.378]}>
          <boxGeometry args={[0.2, 0.012, 0.005]} />
          <meshStandardMaterial color={woodDark} roughness={0.9} />
        </mesh>
        {/* Sill bawah attic window */}
        <mesh position={[0, 0.9, 0.378]}>
          <boxGeometry args={[0.24, 0.025, 0.018]} />
          <meshStandardMaterial color={stoneFound} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  // ====== MEDITERRANEAN VILLA WITH ARCH ======
  // variant 3: Whitewash plaster walls, low-slope hip roof terakota,
  // arched doorway + arched window, terracotta pots flanking entrance,
  // cobblestone path leading to door.
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Foundation low platform */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.78, 0.08, 0.68]} />
        <meshStandardMaterial color={stoneFound} roughness={0.9} />
      </mesh>
      {/* Body box whitewash plaster (lighter) */}
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.68, 0.76, 0.58]} />
        <meshStandardMaterial color={plasterLight} roughness={0.88} />
      </mesh>
      {/* Hip roof — 4 triangular slopes via 4 thin slabs miring ke
          tengah (terakota tone). Slope shallow, mediterranean style. */}
      <mesh position={[0, 0.92, 0.2]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.74, 0.04, 0.34]} />
        <meshStandardMaterial color={roofTile} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.92, -0.2]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.74, 0.04, 0.34]} />
        <meshStandardMaterial color={roofTile} roughness={0.9} />
      </mesh>
      <mesh position={[0.24, 0.92, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.32, 0.04, 0.6]} />
        <meshStandardMaterial color={roofTile} roughness={0.9} />
      </mesh>
      <mesh position={[-0.24, 0.92, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.32, 0.04, 0.6]} />
        <meshStandardMaterial color={roofTile} roughness={0.9} />
      </mesh>
      {/* Hip ridge top — flat small box di puncak */}
      <mesh position={[0, 1.07, 0]}>
        <boxGeometry args={[0.16, 0.04, 0.14]} />
        <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
      </mesh>
      {/* Tile rows tipis di slope depan & atas (cuma 1 row biar
          gak terlalu busy di area kecil ini) */}
      <mesh position={[0, 0.86, 0.31]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.74, 0.014, 0.12]} />
        <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
      </mesh>
      {/* === ARCH DOORWAY === */}
      {/* Door rectangle dasar */}
      <mesh position={[0, 0.3, 0.3]}>
        <boxGeometry args={[0.24, 0.48, 0.015]} />
        <meshStandardMaterial color={woodDoor} roughness={0.92} />
      </mesh>
      {/* Arch top — half-circle disc di atas pintu */}
      <mesh
        position={[0, 0.54, 0.3]}
        rotation={[0, 0, 0]}
      >
        <circleGeometry args={[0.12, 14, 0, Math.PI]} />
        <meshStandardMaterial color={woodMid} roughness={0.9} />
      </mesh>
      {/* Stone arch trim mengelilingi pintu — 2 sisi vertikal + arch top */}
      <mesh position={[-0.13, 0.3, 0.308]}>
        <boxGeometry args={[0.03, 0.5, 0.012]} />
        <meshStandardMaterial color={stoneFound} roughness={0.9} />
      </mesh>
      <mesh position={[0.13, 0.3, 0.308]}>
        <boxGeometry args={[0.03, 0.5, 0.012]} />
        <meshStandardMaterial color={stoneFound} roughness={0.9} />
      </mesh>
      {/* Arch top trim (ring/torus segment) */}
      <mesh
        position={[0, 0.54, 0.308]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.13, 0.018, 6, 14, Math.PI]} />
        <meshStandardMaterial color={stoneFound} roughness={0.9} />
      </mesh>
      {/* Doorknob */}
      <mesh position={[0.08, 0.32, 0.31]}>
        <sphereGeometry args={[0.013, 6, 6]} />
        <meshStandardMaterial color={brass} metalness={0.7} roughness={0.45} />
      </mesh>
      {/* === ARCH WINDOW === di samping kanan body */}
      <mesh position={[0.345, 0.5, 0]}>
        <boxGeometry args={[0.015, 0.24, 0.18]} />
        <meshStandardMaterial
          color={winGlow}
          emissive={winGlow}
          emissiveIntensity={0.6}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* Arch top window */}
      <mesh
        position={[0.345, 0.62, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <circleGeometry args={[0.09, 12, 0, Math.PI]} />
        <meshStandardMaterial
          color={winGlow}
          emissive={winGlow}
          emissiveIntensity={0.55}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* Window stone trim (sides) */}
      <mesh position={[0.353, 0.5, -0.1]}>
        <boxGeometry args={[0.012, 0.24, 0.025]} />
        <meshStandardMaterial color={stoneFound} roughness={0.9} />
      </mesh>
      <mesh position={[0.353, 0.5, 0.1]}>
        <boxGeometry args={[0.012, 0.24, 0.025]} />
        <meshStandardMaterial color={stoneFound} roughness={0.9} />
      </mesh>
      {/* Arch top window trim */}
      <mesh
        position={[0.353, 0.62, 0]}
        rotation={[0, Math.PI / 2, Math.PI / 2]}
      >
        <torusGeometry args={[0.1, 0.014, 6, 12, Math.PI]} />
        <meshStandardMaterial color={stoneFound} roughness={0.9} />
      </mesh>
      {/* === PATH STONES === di depan pintu (3 batu cobblestone) */}
      {[0.4, 0.53, 0.66].map((z, i) => (
        <mesh key={`ps-${i}`} position={[(i - 1) * 0.04, 0.03, z]}>
          <cylinderGeometry args={[0.07, 0.07, 0.025, 8]} />
          <meshStandardMaterial color={stoneFound} roughness={0.95} />
        </mesh>
      ))}
      {/* === TERRACOTTA POTS flanking entrance === */}
      {[-0.18, 0.18].map((x, i) => (
        <React.Fragment key={`pot-${i}`}>
          {/* Pot body (cylinder taper) */}
          <mesh position={[x, 0.1, 0.42]}>
            <cylinderGeometry args={[0.06, 0.045, 0.13, 10]} />
            <meshStandardMaterial color={roofTile} roughness={0.9} />
          </mesh>
          {/* Pot rim */}
          <mesh position={[x, 0.17, 0.42]}>
            <cylinderGeometry args={[0.065, 0.06, 0.018, 10]} />
            <meshStandardMaterial color={roofTileDeep} roughness={0.9} />
          </mesh>
          {/* Plant cluster bunga */}
          <mesh position={[x, 0.23, 0.42]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color="#5a7838" roughness={0.85} />
          </mesh>
          {/* Bunga accent kecil di plant */}
          <mesh position={[x - 0.03, 0.27, 0.42]}>
            <sphereGeometry args={[0.022, 6, 5]} />
            <meshStandardMaterial color="#e85070" roughness={0.85} />
          </mesh>
          <mesh position={[x + 0.03, 0.26, 0.43]}>
            <sphereGeometry args={[0.022, 6, 5]} />
            <meshStandardMaterial color="#f4c060" roughness={0.85} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};
const RestoredHouses = () => (
  <>
    {RESTORED_HOUSE_DEFS.map((d, i) => (
      <RestoredHouse key={`rsh-${i}`} {...d} />
    ))}
  </>
);

// CirclingVultures — 3 burung gelap berputar pelan tinggi di sky.
// Atmospheric — kerasa "ada yg ngintai kota mati." Beda dari BirdsFlock
// purified (sweet swallows) — vultures bergerak lambat, soliter, di
// ketinggian lebih tinggi. Mirror narrative: kehidupan vs predator.
const VULTURE_DEFS = [
  { center: [-2, 8.5, -3], radius: 4.5, speed: 0.07, phase: 0, scale: 1.0 },
  { center: [3, 9.5, 2], radius: 5.0, speed: 0.05, phase: 2.1, scale: 0.9 },
  { center: [0, 10, -6], radius: 3.8, speed: 0.09, phase: 4.3, scale: 1.1 },
];
const Vulture = ({ def }) => {
  const ref = useRef();
  const wingLRef = useRef();
  const wingRRef = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const angle = t * def.speed + def.phase;
    ref.current.position.x = def.center[0] + Math.cos(angle) * def.radius;
    ref.current.position.z = def.center[2] + Math.sin(angle) * def.radius;
    ref.current.position.y = def.center[1] + Math.sin(t * 0.3 + def.phase) * 0.2;
    // Hadap arah terbang
    ref.current.rotation.y = -angle - Math.PI / 2;
    // Wing flap pelan
    const flap = Math.sin(t * 1.2 + def.phase) * 0.15;
    if (wingLRef.current) wingLRef.current.rotation.z = 0.3 + flap;
    if (wingRRef.current) wingRRef.current.rotation.z = -0.3 - flap;
  });
  return (
    <group ref={ref} scale={def.scale}>
      {/* Body — silhouette gelap (BasicMaterial supaya gak ke-fog mati) */}
      <mesh>
        <sphereGeometry args={[0.08, 6, 4]} />
        <meshBasicMaterial color="#0a0604" />
      </mesh>
      {/* Wing kiri */}
      <mesh ref={wingLRef} position={[0, 0, 0.05]}>
        <boxGeometry args={[0.02, 0.04, 0.42]} />
        <meshBasicMaterial color="#0a0604" />
      </mesh>
      {/* Wing kanan */}
      <mesh ref={wingRRef} position={[0, 0, -0.05]}>
        <boxGeometry args={[0.02, 0.04, 0.42]} />
        <meshBasicMaterial color="#0a0604" />
      </mesh>
      {/* Tail kecil */}
      <mesh position={[-0.12, 0, 0]}>
        <coneGeometry args={[0.04, 0.12, 4]} />
        <meshBasicMaterial color="#0a0604" />
      </mesh>
    </group>
  );
};
const CirclingVultures = () => (
  <>
    {VULTURE_DEFS.map((def, i) => (
      <Vulture key={`vlt-${i}`} def={def} />
    ))}
  </>
);

// DistantSmokeWisps — 4 kolom asap tipis naik dari arah CityRuins (luar
// hex ring, fog distance). Vertikal plane dengan opacity pulse + slight
// drift horizontal — "kebakaran sisa" di kota jauh, atmosfer post-storm.
const SMOKE_WISP_DEFS = [
  { pos: [12, 3, -10], height: 4, sway: 0.4 },
  { pos: [-13, 2.5, -8], height: 3.5, sway: 0.3 },
  { pos: [10, 3.2, 11], height: 4.2, sway: 0.5 },
  { pos: [-11, 2.8, 12], height: 3.8, sway: 0.35 },
];
const SmokeWisp = ({ pos, height, sway }) => {
  const matRef = useRef();
  const groupRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (matRef.current) {
      matRef.current.opacity = 0.18 + Math.sin(t * 0.4 + pos[0]) * 0.06;
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.3 + pos[2]) * sway * 0.1;
    }
  });
  return (
    <group ref={groupRef} position={pos}>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[2.2, height]} />
        <meshBasicMaterial
          ref={matRef}
          color="#3a2f28"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={2}
        />
      </mesh>
      {/* Lower hot core — sedikit emisi kuning */}
      <mesh position={[0, 0.15, 0.02]}>
        <planeGeometry args={[0.6, 0.35]} />
        <meshBasicMaterial
          color="#a85020"
          transparent
          opacity={0.25}
          depthWrite={false}
          side={2}
        />
      </mesh>
    </group>
  );
};
const DistantSmokeWisps = () => (
  <>
    {SMOKE_WISP_DEFS.map((s, i) => (
      <SmokeWisp key={`sw-${i}`} {...s} />
    ))}
  </>
);

// SandDrifts — gundukan pasir terakumulasi di pangkal objek berdiri
// (tertumpuk angin badai). Posisi anchored ke base objek existing —
// TippedCart, banner poles, dead trees, collapsed walls. Half-dome
// shape (sphere bottom-half) earth-brown.
const SAND_DRIFT_DEFS = [
  { pos: [1.5, 0, 6.4], scale: [0.55, 0.18, 0.42] },
  { pos: [2.6, 0, -5.5], scale: [0.4, 0.12, 0.3] },
  { pos: [-3.5, 0, 5.0], scale: [0.45, 0.14, 0.34] },
  { pos: [6.3, 0, 4.2], scale: [0.6, 0.16, 0.4] },
  { pos: [-5.8, 0, -4.8], scale: [0.5, 0.13, 0.35] },
  { pos: [4.6, 0, 5.2], scale: [0.32, 0.1, 0.25] },
  { pos: [-4.2, 0, 5.9], scale: [0.38, 0.12, 0.28] },
  { pos: [5.3, 0, -3.2], scale: [0.42, 0.13, 0.32] },
];
const SandDrifts = () => (
  <>
    {SAND_DRIFT_DEFS.map((d, i) => (
      <mesh
        key={`sd-${i}`}
        position={[d.pos[0], d.pos[1] + d.scale[1] / 2, d.pos[2]]}
        scale={d.scale}
        rotation={[0, (i * 0.7) % Math.PI, 0]}
      >
        <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#7a6048" roughness={0.98} />
      </mesh>
    ))}
  </>
);

const TornOmikujiStrips = ({ pos = [-4.0, 0, 2.5], rot = -0.2 }) => {
  const hangingRef = useRef();
  useFrame((state) => {
    if (!hangingRef.current) return;
    const t = state.clock.elapsedTime;
    hangingRef.current.rotation.z = Math.sin(t * 0.6) * 0.18;
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Left post — patah pendek, condong */}
      <mesh position={[-0.45, 0.3, 0]} rotation={[0, 0, -0.18]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
        <meshStandardMaterial color="#5a4830" roughness={0.95} />
      </mesh>
      {/* Right post — patah lebih pendek lagi */}
      <mesh position={[0.45, 0.2, 0]} rotation={[0, 0, 0.22]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
        <meshStandardMaterial color="#5a4830" roughness={0.95} />
      </mesh>
      {/* Crossbar — rebah di tanah miring */}
      <mesh
        position={[0, 0.04, 0.25]}
        rotation={[Math.PI / 2, 0, 0.18]}
      >
        <cylinderGeometry args={[0.022, 0.022, 0.95, 6]} />
        <meshStandardMaterial color="#7a6038" roughness={0.95} />
      </mesh>
      {/* 1 strip masih nyangkut di left post, goyang pelan */}
      <group ref={hangingRef} position={[-0.45, 0.58, 0]}>
        <mesh position={[0, -0.1, 0]}>
          <planeGeometry args={[0.05, 0.2]} />
          <meshStandardMaterial
            color="#dac8a8"
            roughness={0.95}
            side={2}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
      {/* Strip kertas scattered di tanah */}
      {TORN_OMIKUJI_FLOOR.map((s, i) => (
        <mesh
          key={`tomi-${i}`}
          position={s.pos}
          rotation={[-Math.PI / 2, 0, s.rot]}
        >
          <planeGeometry args={[0.05, s.len]} />
          <meshStandardMaterial
            color="#c8b698"
            roughness={0.95}
            side={2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
      {/* Knot merah pudar — sliver kecil di tanah */}
      <mesh position={[-0.05, 0.008, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[0.025, 0.025]} />
        <meshStandardMaterial
          color="#8a4030"
          roughness={0.95}
          side={2}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
};

// PetaMenara — petak r4 di utara peta (z=-8, lebih jauh dari hub
// dibanding Telaga/Arsip @ z=-1 supaya silhouette tower tinggi kebaca
// dari atas). Vertikal landmark — bukan flat disc/bangunan kayak r2/r3,
// tapi menara ramping yang nembus skyline. 3 state berdasarkan tree
// support count:
//   locked   (count < 3000)  — menara ambruk: base utuh, kolom miring
//                              tergeletak ke -X, dial pecah di tanah,
//                              opacity muted + lock cube di base.
//   drought  (3000-4999)     — menara berdiri lagi, dial cracked, satu
//                              jarum (menit) hilang, ada hint emissive
//                              dim di dial. Stub fase awal — full detail
//                              menyusul saat scene-nya dibangun.
//   restored (>=5000)        — dial bersih, 2 jarum, kaca patri glow
//                              warm di belakang dial, lonceng kecil di
//                              puncak. Stub fase awal.
//
// Position [0, 0, -8] (utara, lebih jauh dari hub). Tinggi total ~3.2
// units (vs petak lain yang ~0.8) — vertikal contrast biar kerasa
// landmark.
const PetaMenara = ({
  hovered,
  visited = false,
  isMobile = false,
  petakState = 'locked',
  modalOpen = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const dialMatRef = useRef();
  const bellMatRef = useRef();
  // Refs polish 2026-05-13: stainedGlass = backplate kaca patri di
  // belakang dial restored (match TamanMenaraJam scene). pendulum =
  // bandul rotation swing reactive ke state.
  const stainedGlassRef = useRef();
  const pendulumRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Hover lift dinaikin (0.25→0.4) sejak menara petak di-scale 1.7×
      // — kalau tetap 0.25 lift visualnya keciilan proporsional.
      const targetY = hovered && petakState !== 'locked' ? 0.4 : 0;
      const factor = Math.min(delta * 8, 1);
      groupRef.current.position.y = lerp(
        groupRef.current.position.y,
        targetY,
        factor,
      );
    }
    if (dialMatRef.current && petakState === 'restored') {
      const t = state.clock.elapsedTime;
      // Hover boost — restored dial emissive naik subtle saat user
      // hover, kerasa "responding to attention".
      const hoverBonus = hovered ? 0.25 : 0;
      dialMatRef.current.emissiveIntensity =
        0.5 + Math.sin(t * 0.6) * 0.12 + hoverBonus;
    }
    if (stainedGlassRef.current && petakState === 'restored') {
      const t = state.clock.elapsedTime;
      stainedGlassRef.current.emissiveIntensity =
        0.55 + Math.sin(t * 0.55) * 0.15;
    }
    if (bellMatRef.current && petakState === 'restored') {
      const t = state.clock.elapsedTime;
      bellMatRef.current.emissiveIntensity =
        0.35 + Math.sin(t * 1.4) * 0.1;
    }
    if (pendulumRef.current && petakState !== 'locked') {
      const t = state.clock.elapsedTime;
      // Drought subtle swing (0.06 rad), restored full (0.14 rad). Gak
      // pakai schedule data check di sini — wasteful buat 7 petak di map
      // view. Heuristic state-based aja.
      const amp = petakState === 'restored' ? 0.14 : 0.06;
      pendulumRef.current.rotation.z = Math.sin(t * (Math.PI / 1.2)) * amp;
    }
  });

  const isLocked = petakState === 'locked';
  const isRestored = petakState === 'restored';
  const baseOpacity = isLocked ? 0.55 : 1;

  // Color palette per state — locked grey-muted, drought stone-warm,
  // restored bronze + warm emissive. Japanese pivot: ishigaki stone +
  // shikkui plaster palette consistent dgn destination scene r4.
  const stoneColor = isRestored ? '#a89478' : isLocked ? '#5a5048' : '#7a6858';

  const sublabel = isLocked
    ? 'Belum terbuka'
    : isRestored
    ? 'Yagura pulih'
    : 'Yagura berlumut';

  return (
    <group
      ref={groupRef}
      position={[0, 0, -8]}
      scale={1.7}
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
      {/* Mobile tap-target — tall capsule covering tower height. Scale
          1.7 di outer group apply automatic ke geometry di bawah, jadi
          tap-target footprint juga ikut membesar proporsional. */}
      <mesh position={[0, 1.4, 0]} visible={false}>
        <cylinderGeometry args={[isMobile ? 1.6 : 1.1, isMobile ? 1.6 : 1.1, 3.4, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visited halo — bronze ring di base, mirror Perpustakaan tone */}
      {visited && !isLocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshStandardMaterial
            color={isRestored ? '#f4d4a0' : '#c8a060'}
            emissive={isRestored ? '#d49060' : '#a87060'}
            emissiveIntensity={0.45}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* === BASE PLATFORM === lebar lebih kecil dari Perpustakaan
          (footprint vertical landmark) */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.16, 12]} />
        <meshStandardMaterial
          color="#5a4838"
          roughness={0.95}
          transparent
          opacity={baseOpacity}
        />
      </mesh>

      {isLocked ? (
        <>
          {/* === LOCKED STATE: yagura ambruk (Japanese pivot) ===
              Stone base utuh + plaster shaft stub + 2 fallen wooden
              shaft segments tergeletak ke -X. Broken sōrin di tanah. */}
          {/* Stub base — ishigaki masonry stone */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <meshStandardMaterial
              color={stoneColor}
              roughness={0.95}
              transparent
              opacity={baseOpacity}
            />
          </mesh>
          {/* Plaster shaft stub (broken short) */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.34, 0.4, 0.34]} />
            <meshStandardMaterial
              color="#7a6858"
              roughness={0.95}
              transparent
              opacity={baseOpacity}
            />
          </mesh>
          {/* Fallen wooden shaft segment 1 — ke -X */}
          <mesh position={[-0.9, 0.2, 0.1]} rotation={[0, 0.15, Math.PI / 2.2]}>
            <boxGeometry args={[0.32, 0.85, 0.32]} />
            <meshStandardMaterial
              color="#7a6858"
              roughness={0.95}
              transparent
              opacity={baseOpacity}
            />
          </mesh>
          {/* Fallen wooden shaft segment 2 — lebih jauh */}
          <mesh position={[-1.65, 0.17, 0.18]} rotation={[0, -0.1, Math.PI / 2.3]}>
            <boxGeometry args={[0.28, 0.7, 0.28]} />
            <meshStandardMaterial
              color="#7a6858"
              roughness={0.95}
              transparent
              opacity={baseOpacity}
            />
          </mesh>
          {/* Fallen sōrin shaft + broken jewel */}
          <mesh position={[-2.15, 0.06, 0.22]} rotation={[Math.PI / 2, 0, 0.3]}>
            <cylinderGeometry args={[0.022, 0.022, 0.5, 6]} />
            <meshStandardMaterial
              color="#3a2818"
              roughness={0.95}
              transparent
              opacity={baseOpacity}
            />
          </mesh>
          <mesh position={[-2.4, 0.05, 0.25]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial
              color="#5a4838"
              roughness={0.95}
              transparent
              opacity={baseOpacity}
            />
          </mesh>
          {/* Lock cube floating */}
          <mesh position={[0, 1.0, 0.6]}>
            <boxGeometry args={[0.22, 0.2, 0.12]} />
            <meshStandardMaterial color="#5a5048" roughness={1} />
          </mesh>
          <mesh position={[0, 1.15, 0.6]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.06, 0.018, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#5a5048" roughness={1} />
          </mesh>
        </>
      ) : (
        <>
          {/* === DROUGHT/RESTORED STATE: twin yagura mini ===
              Japanese pivot — match destination scene `/armeniacaTown/r4`:
              twin yagura (X ±0.55) + mini honden di antara. Shoji dial
              di +Z face yagura kiri (pulse via dialMatRef + stainedGlassRef).
              Bonshō di yagura kiri (bellMatRef pulse). Sōrin spire utuh
              di restored, broken stub tilted di drought. */}
          {/* Engawa base ring band di tanah */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.85, 24]} />
            <meshStandardMaterial color="#3a2818" roughness={0.95} />
          </mesh>
          {/* === TWIN YAGURA === 2× mini yagura at X ±0.55. Tower kiri
              (isFront=true) dapet refs supaya dialMatRef/stainedGlassRef/
              bellMatRef pulse animations kebagian. Sōrin spire utuh
              kalau restored, broken stub tilted kalau drought. */}
          {[
            { x: -0.55, isFront: true },
            { x: 0.55, isFront: false },
          ].map(({ x, isFront }) => (
            <group key={`yagura-mini-${x}`} position={[x, 0, 0]}>
              {/* Ishigaki base */}
              <mesh position={[0, 0.18, 0]}>
                <boxGeometry args={[0.42, 0.36, 0.42]} />
                <meshStandardMaterial color={stoneColor} roughness={0.95} />
              </mesh>
              {/* Plaster shaft (shikkui) */}
              <mesh position={[0, 1.16, 0]}>
                <boxGeometry args={[0.32, 1.55, 0.32]} />
                <meshStandardMaterial
                  color={isRestored ? '#c8b898' : '#7a6858'}
                  roughness={0.9}
                />
              </mesh>
              {/* 4 corner wood beams */}
              {[
                [0.16, 0.16],
                [-0.16, 0.16],
                [0.16, -0.16],
                [-0.16, -0.16],
              ].map(([cx, cz], i) => (
                <mesh key={`beam-${i}`} position={[cx, 1.16, cz]}>
                  <boxGeometry args={[0.018, 1.55, 0.018]} />
                  <meshStandardMaterial
                    color={isRestored ? '#5a3a18' : '#3a2818'}
                    roughness={0.85}
                  />
                </mesh>
              ))}
              {/* Mid eaves irimoya (small overhang) */}
              <mesh position={[0, 1.98, 0]}>
                <boxGeometry args={[0.5, 0.1, 0.5]} />
                <meshStandardMaterial
                  color={isRestored ? '#3a3838' : '#2a2828'}
                  roughness={0.85}
                />
              </mesh>
              {/* Clock chamber */}
              <mesh position={[0, 2.45, 0]}>
                <boxGeometry args={[0.4, 0.7, 0.4]} />
                <meshStandardMaterial
                  color={isRestored ? '#c8b898' : '#7a6858'}
                  roughness={0.9}
                />
              </mesh>
              {/* Shoji outer glow halo (+Z face, behind dial) — wire
                  stainedGlassRef ke yagura kiri (isFront) */}
              <mesh position={[0, 2.5, 0.205]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.155, 0.155, 0.02, 18]} />
                <meshStandardMaterial
                  ref={isFront ? stainedGlassRef : null}
                  color={isRestored ? '#f4d8a8' : '#3a2818'}
                  emissive={isRestored ? '#e8b878' : '#000000'}
                  emissiveIntensity={isRestored ? 0.55 : 0}
                  roughness={0.6}
                  transparent
                  opacity={isRestored ? 0.85 : 0.7}
                  toneMapped={false}
                />
              </mesh>
              {/* Shoji dial face (smaller, inner) — dialMatRef yagura kiri */}
              <mesh position={[0, 2.5, 0.222]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.015, 16]} />
                <meshStandardMaterial
                  ref={isFront ? dialMatRef : null}
                  color={isRestored ? '#f8e0b0' : '#3a3530'}
                  emissive={isRestored ? '#e8a868' : '#000000'}
                  emissiveIntensity={isRestored ? 0.5 : 0}
                  roughness={isRestored ? 0.5 : 1}
                  transparent={!isRestored}
                  opacity={isRestored ? 1 : 0.85}
                />
              </mesh>
              {/* Wooden rim torus */}
              <mesh position={[0, 2.5, 0.232]}>
                <torusGeometry args={[0.13, 0.012, 6, 16]} />
                <meshStandardMaterial
                  color={isRestored ? '#6a4828' : '#3a2818'}
                  roughness={0.85}
                />
              </mesh>
              {/* 4 cardinal kōshi spokes */}
              {[0, 1, 2, 3].map((i) => {
                const angle = (i / 4) * Math.PI * 2;
                return (
                  <mesh
                    key={`spoke-${i}`}
                    position={[Math.sin(angle) * 0.065, 2.5 + Math.cos(angle) * 0.065, 0.238]}
                    rotation={[0, 0, -angle]}
                  >
                    <boxGeometry args={[0.012, 0.13, 0.005]} />
                    <meshStandardMaterial
                      color={isRestored ? '#6a4828' : '#3a2818'}
                      roughness={0.85}
                    />
                  </mesh>
                );
              })}
              {/* Dial center pin */}
              <mesh position={[0, 2.5, 0.244]}>
                <sphereGeometry args={[0.018, 6, 4]} />
                <meshStandardMaterial color="#3a2818" roughness={0.7} />
              </mesh>
              {/* Dial crack — drought only */}
              {!isRestored && (
                <mesh position={[-0.03, 2.46, 0.245]} rotation={[0, 0, -0.7]}>
                  <boxGeometry args={[0.005, 0.22, 0.003]} />
                  <meshStandardMaterial color="#1a0f08" roughness={1} />
                </mesh>
              )}
              {/* Top irimoya roof */}
              <mesh position={[0, 2.9, 0]}>
                <boxGeometry args={[0.58, 0.16, 0.58]} />
                <meshStandardMaterial
                  color={isRestored ? '#3a3838' : '#2a2828'}
                  roughness={0.85}
                />
              </mesh>
              {/* Roof ridge cap (restored only) */}
              {isRestored && (
                <mesh position={[0, 3.01, 0]}>
                  <boxGeometry args={[0.48, 0.06, 0.5]} />
                  <meshStandardMaterial color="#3a3838" roughness={0.85} />
                </mesh>
              )}
              {/* === SŌRIN === restored: full spire + jewel.
                  Drought: tilted broken stub. */}
              {isRestored ? (
                <>
                  {/* Sōrin shaft */}
                  <mesh position={[0, 3.25, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.4, 6]} />
                    <meshStandardMaterial
                      color="#c89860"
                      emissive="#e8a868"
                      emissiveIntensity={0.32}
                      roughness={0.5}
                      metalness={0.55}
                    />
                  </mesh>
                  {/* Kurin rings (3 mini) */}
                  {[3.15, 3.25, 3.35].map((y, i) => (
                    <mesh key={`kurin-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                      <torusGeometry args={[0.035, 0.005, 4, 10]} />
                      <meshStandardMaterial color="#c89860" roughness={0.5} metalness={0.55} />
                    </mesh>
                  ))}
                  {/* Hōju jewel */}
                  <mesh position={[0, 3.52, 0]}>
                    <sphereGeometry args={[0.045, 10, 8]} />
                    <meshStandardMaterial
                      color="#c89860"
                      emissive="#e8a868"
                      emissiveIntensity={0.4}
                      roughness={0.45}
                      metalness={0.6}
                    />
                  </mesh>
                </>
              ) : (
                // Drought — broken tilted sōrin stub
                <group rotation={[0.25, 0, isFront ? 0.18 : -0.15]}>
                  <mesh position={[0, 3.12, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
                    <meshStandardMaterial color="#3a2818" roughness={0.95} />
                  </mesh>
                  <mesh position={[0, 3.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.032, 0.005, 4, 10]} />
                    <meshStandardMaterial color="#3a2818" roughness={0.95} />
                  </mesh>
                </group>
              )}
              {/* Bonshō (bell) — restored only, di yagura kiri (isFront).
                  bellMatRef pulse di useFrame. */}
              {isRestored && isFront && (
                <group position={[0, 2.75, -0.22]}>
                  <mesh>
                    <cylinderGeometry args={[0.055, 0.07, 0.12, 10, 1, true]} />
                    <meshStandardMaterial
                      ref={bellMatRef}
                      color="#a87838"
                      emissive="#c89048"
                      emissiveIntensity={0.32}
                      roughness={0.55}
                      metalness={0.55}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  {/* Crown */}
                  <mesh position={[0, 0.07, 0]}>
                    <sphereGeometry args={[0.025, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#8a5828" roughness={0.6} metalness={0.55} />
                  </mesh>
                </group>
              )}
              {/* Moss patch on ishigaki base — drought only */}
              {!isRestored && (
                <mesh position={[0.15, 0.365, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]}>
                  <circleGeometry args={[0.13, 8]} />
                  <meshStandardMaterial
                    color="#3a4a28"
                    roughness={1}
                    transparent
                    opacity={0.7}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}
            </group>
          ))}

          {/* === MINI HONDEN === central shrine hall between twin yagura */}
          {/* Stone podium */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.85, 0.2, 0.55]} />
            <meshStandardMaterial color={stoneColor} roughness={0.92} />
          </mesh>
          {/* Wood body */}
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.75, 0.7, 0.45]} />
            <meshStandardMaterial
              color={isRestored ? '#c8b898' : '#7a6858'}
              roughness={0.9}
            />
          </mesh>
          {/* Doorway recess on +Z face */}
          <mesh position={[0, 0.43, 0.226]}>
            <planeGeometry args={[0.22, 0.46]} />
            <meshStandardMaterial
              color="#1a0808"
              roughness={0.95}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Doorway frame trim */}
          <mesh position={[0, 0.7, 0.232]}>
            <boxGeometry args={[0.26, 0.04, 0.012]} />
            <meshStandardMaterial
              color={isRestored ? '#6a4828' : '#3a2818'}
              roughness={0.85}
            />
          </mesh>
          {/* Curved irimoya roof */}
          <mesh position={[0, 1.0, 0]}>
            <boxGeometry args={[0.95, 0.18, 0.62]} />
            <meshStandardMaterial
              color={isRestored ? '#3a3838' : '#1a2018'}
              roughness={0.85}
            />
          </mesh>
          {/* Roof ridge cap */}
          <mesh position={[0, 1.12, 0]}>
            <boxGeometry args={[0.78, 0.06, 0.5]} />
            <meshStandardMaterial
              color={isRestored ? '#3a3838' : '#1a2018'}
              roughness={0.9}
            />
          </mesh>
          {/* Chigi forked finial — di gable depan */}
          <group position={[0, 1.18, 0.22]}>
            <mesh position={[-0.06, 0.08, 0]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.018, 0.18, 0.018]} />
              <meshStandardMaterial
                color={isRestored ? '#5a3a18' : '#3a2818'}
                roughness={0.85}
              />
            </mesh>
            {/* Right fork — broken/missing kalau drought */}
            {isRestored && (
              <mesh position={[0.06, 0.08, 0]} rotation={[0, 0, -0.3]}>
                <boxGeometry args={[0.018, 0.18, 0.018]} />
                <meshStandardMaterial color="#5a3a18" roughness={0.85} />
              </mesh>
            )}
          </group>
          {/* Katsuogi (cylindrical logs) — 2 logs di ridge */}
          {[[-0.1, 1.16], [0.1, 1.16]].map(([x2, y2], i) => (
            <mesh
              key={`katsuogi-${i}`}
              position={[x2, y2, 0]}
              rotation={[Math.PI / 2, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.022, 0.022, 0.35, 8]} />
              <meshStandardMaterial
                color={isRestored ? '#5a3a18' : '#3a2818'}
                roughness={0.85}
              />
            </mesh>
          ))}
          {/* Paper lantern hanging in front of honden (restored only) */}
          {isRestored && (
            <group position={[0, 0.92, 0.32]}>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.12, 4]} />
                <meshStandardMaterial color="#3a1808" roughness={0.95} />
              </mesh>
              <mesh position={[0, -0.04, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.12, 10]} />
                <meshStandardMaterial
                  color="#f4d488"
                  emissive="#e89860"
                  emissiveIntensity={0.55}
                  roughness={0.6}
                  transparent
                  opacity={0.88}
                  toneMapped={false}
                />
              </mesh>
            </group>
          )}

          {/* === SHUMOKU (bell striker) === swing rod hanging di samping
              bonshō (yagura kiri), ref=pendulumRef untuk useFrame swing.
              Replaces gothic pendulum — wooden striker untuk Japanese
              bonshō bell. Drought + restored sama-sama gerak (amplitude
              di useFrame), restored emissive head warmer. */}
          <group ref={pendulumRef} position={[-0.55, 2.05, 0.4]}>
            {/* Suspension peg */}
            <mesh position={[0, 0, -0.02]}>
              <cylinderGeometry args={[0.018, 0.018, 0.02, 6]} />
              <meshStandardMaterial color="#3a2818" roughness={0.85} />
            </mesh>
            {/* Striker rod */}
            <mesh position={[0, -0.3, 0]}>
              <cylinderGeometry args={[0.015, 0.018, 0.55, 8]} />
              <meshStandardMaterial
                color={isRestored ? '#7a4818' : '#4a2810'}
                roughness={0.8}
              />
            </mesh>
            {/* Striker head — rounded log end */}
            <mesh position={[0, -0.58, 0]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial
                color={isRestored ? '#8a5a28' : '#4a3018'}
                emissive={isRestored ? '#c87038' : '#2a1810'}
                emissiveIntensity={isRestored ? 0.28 : 0.05}
                roughness={isRestored ? 0.65 : 0.85}
              />
            </mesh>
          </group>
        </>
      )}

      {!modalOpen && (
        <Html position={[0, isLocked ? 1.4 : 3.55, 0]} center distanceFactor={10} occlude={false}>
          <div
            className={`text-center pointer-events-none select-none whitespace-nowrap transition-all duration-300 ease-out ${
              hovered && !isLocked ? '-translate-y-1' : ''
            }`}
          >
            <div
              className={`text-[11px] font-medium tracking-wide transition-colors ${
                isLocked
                  ? 'text-white/45'
                  : hovered
                  ? 'text-white'
                  : 'text-white/80'
              }`}
            >
              Menara Jam
            </div>
            <div
              className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
                isLocked
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
      )}
    </group>
  );
};

// PetaPanggung — petak r5 di SE ring (x=+5, z=+5), mirror Air Mancur
// tapi side ring scale (ring distance ≈√50, sebanding telaga/arsip).
// Anfiteater terbuka: kursi batu semicircle + panggung kayu + backdrop
// wall + spotlight pole + tirai. Stage face local +z (outward dari
// center), audience face local -z (toward center) — group rotated
// y=π/4 supaya audience nyamping ke pohon, stage di belakang.
// 3 state berdasarkan tree support count:
//   locked   (count < 4500) — reruntuhan: kursi tumpang tindih di tanah,
//                             panggung ambruk tilted, backdrop ambruk,
//                             spotlight pole tergeletak, opacity 0.55,
//                             lock cube indicator center.
//   drought  (4500-6499)    — kursi semicircle disusun balik (crack
//                             visible), panggung berdiri tapi miring
//                             tipis, backdrop berdiri, spotlight pole
//                             berdiri tapi cone unlit, tirai sobek
//                             setengah (geometri y=0.5).
//   restored (>=6500)       — kursi utuh, panggung clean, backdrop
//                             utuh, spotlight cone GLOW + point light
//                             ke center stage, tirai full + sway anim,
//                             3 audience ghost di front row (front row
//                             glow pulse), center stage marker.
const PetaPanggung = ({
  hovered,
  visited = false,
  isMobile = false,
  petakState = 'locked',
  modalOpen = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const spotlightMatRef = useRef();
  const tiraiRefs = useRef([]);
  const audienceMatRefs = useRef([]);
  const stageMarkerMatRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetY = hovered && petakState !== 'locked' ? 0.3 : 0;
      const factor = Math.min(delta * 8, 1);
      groupRef.current.position.y = lerp(
        groupRef.current.position.y,
        targetY,
        factor,
      );
    }
    const t = state.clock.elapsedTime;
    if (spotlightMatRef.current && petakState === 'restored') {
      spotlightMatRef.current.emissiveIntensity =
        0.7 + Math.sin(t * 0.5) * 0.15;
    }
    if (stageMarkerMatRef.current && petakState === 'restored') {
      stageMarkerMatRef.current.emissiveIntensity =
        0.55 + Math.sin(t * 0.45) * 0.15;
    }
    if (petakState !== 'locked' && tiraiRefs.current.length > 0) {
      for (let i = 0; i < tiraiRefs.current.length; i += 1) {
        const m = tiraiRefs.current[i];
        if (!m) continue;
        m.rotation.z = Math.sin(t * 0.55 + i * 0.6) * 0.06;
      }
    }
    if (petakState === 'restored' && audienceMatRefs.current.length > 0) {
      for (let i = 0; i < audienceMatRefs.current.length; i += 1) {
        const mat = audienceMatRefs.current[i];
        if (!mat) continue;
        mat.emissiveIntensity = 0.28 + Math.sin(t * 0.4 + i * 0.7) * 0.1;
      }
    }
  });

  const isLocked = petakState === 'locked';
  const isDrought = petakState === 'drought';
  const isRestored = petakState === 'restored';
  const baseOpacity = isLocked ? 0.55 : 1;

  const stoneColor = isRestored ? '#b89878' : isLocked ? '#5a5048' : '#8a7868';
  const woodColor = isRestored ? '#a87848' : isLocked ? '#3a2820' : '#6a4830';
  const tiraiColor = isRestored ? '#a83a3a' : isDrought ? '#6a3030' : '#3a2020';
  const tiraiEmissive = isRestored ? '#5a1818' : '#000000';
  const backdropColor = isRestored ? '#5a4838' : isLocked ? '#3a3028' : '#4a3a2a';

  const sublabel = isLocked
    ? 'Belum terbuka'
    : isDrought
    ? 'Panggung sepi'
    : 'Lampu nyala';

  // Tirai height — drought sobek setengah, restored full
  const tiraiHeight = isRestored ? 0.7 : 0.35;

  return (
    <group
      ref={groupRef}
      position={[5, 0, 5]}
      rotation={[0, Math.PI / 4, 0]}
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
      {/* Mobile-friendly tap target — cover anfiteater footprint */}
      <mesh position={[0, 1, 0.5]} visible={false}>
        <boxGeometry args={isMobile ? [4.5, 3, 4.5] : [3.8, 2.5, 3.8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visited halo — ring di base saat petak udah dikunjungi */}
      {visited && petakState !== 'locked' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0.4]}>
          <ringGeometry args={[1.85, 2.05, 32]} />
          <meshStandardMaterial
            color={isRestored ? '#f4d8a0' : '#d4a868'}
            emissive={isRestored ? '#d4a848' : '#a87848'}
            emissiveIntensity={0.45}
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Ground stage platform — disc batu di bawah seating arc, kasih
          footprint anfiteater. */}
      <mesh position={[0, 0.04, 0.2]}>
        <cylinderGeometry args={[1.95, 2.0, 0.08, 12]} />
        <meshStandardMaterial
          color={isRestored ? '#7a6850' : '#4a3e30'}
          roughness={1}
          transparent
          opacity={baseOpacity}
        />
      </mesh>

      {/* Audience semicircle — 5 kursi front row di arc dari -π/2 ke
          +π/2 (180°). Locked = tumpang tindih di tanah, drought+restored
          = arranged. */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = -Math.PI / 2 + (i / 4) * Math.PI;
        const r = 1.55;
        const px = Math.cos(angle) * r;
        const pz = -Math.sin(angle) * r; // -sin to put arc on -z side (audience facing -z)
        const lying = isLocked;
        const seatY = lying ? 0.05 : 0.2;
        const seatRotX = lying ? Math.PI / 2 - 0.3 + i * 0.1 : 0;
        const seatRotY = lying ? i * 0.7 : -angle - Math.PI / 2;
        return (
          <group
            key={`seat-${i}`}
            position={[px, seatY, pz]}
            rotation={[seatRotX, seatRotY, 0]}
          >
            <mesh>
              <boxGeometry args={[0.36, 0.16, 0.24]} />
              <meshStandardMaterial
                ref={(m) => {
                  if (isRestored && i === 2) audienceMatRefs.current[0] = m;
                  if (isRestored && i === 1) audienceMatRefs.current[1] = m;
                  if (isRestored && i === 3) audienceMatRefs.current[2] = m;
                }}
                color={stoneColor}
                emissive={isRestored ? '#5a3018' : '#000000'}
                emissiveIntensity={isRestored ? 0.28 : 0}
                roughness={1}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
          </group>
        );
      })}

      {/* Back row — 4 kursi di outer arc, drought+restored only.
          Locked: ke-skip biar kacau jadi front row jumble. */}
      {!isLocked &&
        [0, 1, 2, 3].map((i) => {
          const angle = -Math.PI / 2 + ((i + 0.5) / 4) * Math.PI;
          const r = 2.05;
          const px = Math.cos(angle) * r;
          const pz = -Math.sin(angle) * r;
          return (
            <mesh
              key={`seat-back-${i}`}
              position={[px, 0.22, pz]}
              rotation={[0, -angle - Math.PI / 2, 0]}
            >
              <boxGeometry args={[0.32, 0.18, 0.22]} />
              <meshStandardMaterial color={stoneColor} roughness={1} />
            </mesh>
          );
        })}

      {/* Stage platform — wooden rectangle di +z side (behind audience
          from center view). Locked: tilted ambruk. Drought: berdiri
          miring tipis. Restored: clean upright. */}
      <group
        position={[0, isLocked ? 0.08 : 0.2, 0.95]}
        rotation={[isLocked ? -0.6 : isDrought ? -0.08 : 0, 0, isLocked ? 0.2 : 0]}
      >
        <mesh>
          <boxGeometry args={[2.4, 0.18, 0.9]} />
          <meshStandardMaterial
            color={woodColor}
            roughness={0.9}
            transparent
            opacity={baseOpacity}
          />
        </mesh>
        {/* Stage center marker — restored only, single warm dot di
            pusat panggung tempat spotlight jatuh. */}
        {isRestored && (
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.01, 16]} />
            <meshStandardMaterial
              ref={stageMarkerMatRef}
              color="#f4d8a0"
              emissive="#f4c478"
              emissiveIntensity={0.55}
              transparent
              opacity={0.75}
              toneMapped={false}
            />
          </mesh>
        )}
        {/* Papan jebol drought — 2 plank dark line di stage surface */}
        {isDrought &&
          [-0.5, 0.6].map((x, i) => (
            <mesh key={`plank-${i}`} position={[x, 0.095, 0]}>
              <boxGeometry args={[0.04, 0.005, 0.85]} />
              <meshStandardMaterial color="#1a1008" roughness={1} />
            </mesh>
          ))}
      </group>

      {/* Backdrop wall — di +z far side, vertical wall behind stage.
          Locked: ambruk tilted. Drought+restored: berdiri. */}
      <group
        position={[0, isLocked ? 0.4 : 0.9, 1.55]}
        rotation={[0, 0, isLocked ? 0.35 : 0]}
      >
        <mesh>
          <boxGeometry args={[2.4, isLocked ? 1.0 : 1.4, 0.15]} />
          <meshStandardMaterial
            color={backdropColor}
            roughness={1}
            transparent
            opacity={baseOpacity}
          />
        </mesh>
        {/* Wall notch (decorative arch) restored only */}
        {isRestored && (
          <mesh position={[0, 0.2, 0.08]}>
            <boxGeometry args={[1.4, 0.5, 0.04]} />
            <meshStandardMaterial
              color="#7a5838"
              emissive="#4a2818"
              emissiveIntensity={0.25}
              roughness={0.85}
            />
          </mesh>
        )}
      </group>

      {/* Tirai — 2 cloth strips gantung dari backdrop top. Locked:
          gak render. Drought: sobek setengah. Restored: full + sway. */}
      {!isLocked &&
        [-0.8, 0.8].map((x, i) => (
          <mesh
            key={`tirai-${i}`}
            ref={(m) => {
              tiraiRefs.current[i] = m;
            }}
            position={[x, 1.5 - tiraiHeight / 2, 1.48]}
          >
            <planeGeometry args={[0.7, tiraiHeight]} />
            <meshStandardMaterial
              color={tiraiColor}
              emissive={tiraiEmissive}
              emissiveIntensity={isRestored ? 0.18 : 0}
              roughness={0.95}
              transparent
              opacity={isDrought ? 0.82 : 0.95}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

      {/* Spotlight pole — vertical pole + cone hanging. Locked: tergeletak
          horizontal. Drought+restored: berdiri. */}
      <group
        position={[0, isLocked ? 0.08 : 0, 0.95]}
        rotation={[0, 0, isLocked ? Math.PI / 2 - 0.15 : 0]}
      >
        {/* Pole */}
        <mesh position={[0, isLocked ? 0 : 1.4, isLocked ? 0.5 : 0]}>
          <cylinderGeometry args={[0.04, 0.05, 2.6, 6]} />
          <meshStandardMaterial
            color="#3a2a1c"
            roughness={0.95}
            transparent
            opacity={baseOpacity}
          />
        </mesh>
        {/* Cross arm — horizontal di top */}
        {!isLocked && (
          <mesh position={[0, 2.55, 0.25]}>
            <boxGeometry args={[0.6, 0.06, 0.06]} />
            <meshStandardMaterial color="#3a2a1c" roughness={0.95} />
          </mesh>
        )}
        {/* Cone — facing down, glowing kalau restored */}
        {!isLocked && (
          <mesh position={[0, 2.4, 0.5]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.18, 0.3, 8]} />
            <meshStandardMaterial
              ref={spotlightMatRef}
              color={isRestored ? '#f4d8a0' : '#5a4838'}
              emissive={isRestored ? '#f4c478' : '#000000'}
              emissiveIntensity={isRestored ? 0.7 : 0}
              roughness={0.5}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>

      {/* Spotlight beam point light — restored only. Warm cone ke stage
          center marker. */}
      {isRestored && (
        <pointLight
          position={[0, 2.2, 0.95]}
          color="#f4d8a0"
          intensity={0.5}
          distance={3.5}
          decay={2}
        />
      )}

      {/* Lock cube indicator — locked only, hover di pusat */}
      {isLocked && (
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.22, 0.2, 0.12]} />
          <meshStandardMaterial color="#5a5048" roughness={1} />
        </mesh>
      )}

      {!modalOpen && (
        <Html position={[0, 1.6, 0]} center distanceFactor={10} occlude={false}>
          <div
            className={`text-center pointer-events-none select-none whitespace-nowrap transition-all duration-300 ease-out ${
              hovered && petakState !== 'locked' ? '-translate-y-1' : ''
            }`}
          >
            <div
              className={`text-[11px] font-medium tracking-wide transition-colors ${
                isLocked
                  ? 'text-white/45'
                  : hovered
                  ? 'text-white'
                  : 'text-white/80'
              }`}
            >
              Panggung Terbuka
            </div>
            <div
              className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
                isLocked
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
      )}
    </group>
  );
};

// PetaAirMancur — micro-landmark plaza di antara pohon (center) dan
// gerbang (selatan), offset barat dari lorong path. Beda dari petak
// lain — bukan 3-state discrete tapi 7-tier continuous progression:
//   0 (count < 2000)   — hidden (air mancur belum "ada" di kota)
//   1 (2000-2999)      — reruntuhan: basin retak, lengan patung jatuh
//   2 (3000-4499)      — genangan: basin nempel balik (seam), lengan
//                        balik nempel (seam ring), air tipis di dasar
//   3 (4500-5999)      — trickle: tetesan tipis dari tangan ke basin
//   4 (6000-7499)      — setengah: fountain pendek + droplets, water
//                        emissive pulse
//   5 (7500-9999)      — full: multi-droplets, warm point light malam
//   6 (>=10000)        — epilog: 4 bunga aprikot di rim basin
// Continuous pacing kasih reward visual yang tetep jalan past r2 Restore
// (7000) — petak lain udah "selesai" di milestone akhir, air mancur
// terus tumbuh ke epilog 10k. Click → modal status (no nav).
const AIR_MANCUR_POS = [-3, 0, 3.5];

const PetaAirMancur = ({
  hovered,
  tier = 0,
  isMobile = false,
  modalOpen = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const waterMatRef = useRef();
  const streamMatRef = useRef();
  const splashRef = useRef();
  const dropletRefs = useRef([]);
  const blossomRefs = useRef([]);
  const lilyRefs = useRef([]);
  const lanternMatRefs = useRef([]);
  const petalRefs = useRef([]);
  const moteRefs = useRef([]);
  const fireflyRef = useRef();
  const rippleRefs = useRef([]);

  // Tier-derived visual flags. waterLevelY = absolute world-y untuk
  // surface plane water (di-stack di atas basin floor 0.18 + offset).
  // Basin selalu render kalau tier >= 1 (di-guard sama early return
  // tier===0 di bawah), jadi gak ada flag terpisah.
  const hasWater = tier >= 2;
  const waterLevelY =
    tier === 2 ? 0.21 :
    tier === 3 ? 0.26 :
    tier >= 4 ? 0.31 : 0;
  const hasTrickle = tier === 3;
  const hasFountain = tier >= 4;
  const dropletCount = tier >= 5 ? 6 : tier === 4 ? 4 : 0;
  const hasNightGlow = tier >= 5;
  const hasBlossoms = tier >= 6;
  const armsBroken = tier === 1;
  const armsSeam = tier === 2;
  // Decorative reveals — unlock per tier biar progression kerasa kaya:
  const hasCobbleRing = tier >= 1;
  const hasFoundation = tier >= 1;
  const hasBasinFloor = tier >= 1;
  const hasRimNotches = tier >= 2;
  const hasBenches = tier >= 3;
  const hasLanterns = tier >= 3;
  const lanternLit = tier >= 5;
  const hasSplash = tier >= 4;
  const hasLilyPads = tier >= 4;
  const hasPedestalMoss = tier >= 4;
  const hasPlazaFlowers = tier >= 5;
  const hasLanternMotes = tier >= 5;
  const hasFloatingPetals = tier >= 6;
  const hasPathStub = tier >= 1;
  const hasRobeDrape = tier >= 2;
  const hasInscription = tier >= 2;
  const hasTablet = tier >= 3;
  const hasRipples = tier >= 4;
  const hasCoins = tier >= 5;
  const hasTeaCup = tier >= 5;
  const hasFirefly = tier >= 5;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const targetY = hovered ? 0.15 : 0;
    const factor = Math.min(delta * 8, 1);
    groupRef.current.position.y = lerp(
      groupRef.current.position.y,
      targetY,
      factor
    );
    const t = state.clock.elapsedTime;
    // Water surface — emissive pulse cuma saat fountain aktif (T4+)
    if (waterMatRef.current && hasFountain) {
      waterMatRef.current.emissiveIntensity = 0.12 + Math.sin(t * 0.6) * 0.05;
    }
    // Fountain stream — slight vertical scale wobble biar gak static
    if (streamMatRef.current && hasFountain) {
      streamMatRef.current.emissiveIntensity = 0.28 + Math.sin(t * 1.4) * 0.08;
    }
    // Splash ring di base fountain — pulse scale + opacity sync stream
    if (splashRef.current && hasSplash) {
      const pulse = 0.85 + Math.sin(t * 2.2) * 0.15;
      splashRef.current.scale.set(pulse, 1, pulse);
    }
    // Droplets — fall cycle 0..1 looping, hide pas hit basin
    if (dropletCount > 0) {
      for (let i = 0; i < dropletRefs.current.length; i += 1) {
        const m = dropletRefs.current[i];
        if (!m) continue;
        const phase = i * 0.27;
        const cycle = ((t * 0.9 + phase) % 1.2) / 1.2;
        m.position.y = 1.35 - cycle * 1.05;
        const visScale = cycle < 0.92 ? 1 : 0;
        m.scale.setScalar(visScale);
      }
    }
    // Lily pads — gentle bob naik-turun + slow drift rotate. Stagger
    // phase per pad biar gak sync robotic.
    if (hasLilyPads) {
      for (let i = 0; i < lilyRefs.current.length; i += 1) {
        const m = lilyRefs.current[i];
        if (!m) continue;
        const phase = i * 1.3;
        m.position.y = waterLevelY + 0.012 + Math.sin(t * 0.8 + phase) * 0.008;
        m.rotation.y = t * 0.08 + phase;
      }
    }
    // Lantern globes — flicker emissive saat lit (T5+). Subtle, gak
    // distract dari fountain center.
    if (hasLanterns && lanternLit) {
      const flicker = 0.55 + Math.sin(t * 3.2) * 0.08 + Math.sin(t * 7.1) * 0.04;
      for (let i = 0; i < lanternMatRefs.current.length; i += 1) {
        const mat = lanternMatRefs.current[i];
        if (!mat) continue;
        mat.emissiveIntensity = flicker;
      }
    }
    // Blossoms — slow rotation gentle biar kerasa hidup
    if (hasBlossoms) {
      for (let i = 0; i < blossomRefs.current.length; i += 1) {
        const m = blossomRefs.current[i];
        if (!m) continue;
        m.rotation.y = t * 0.15 + i * 0.4;
      }
    }
    // Floating petals T6 — drift naik-turun lambat sekitar blossom
    // height, slight horizontal sway. Loop y wrap biar gak hilang.
    if (hasFloatingPetals) {
      for (let i = 0; i < petalRefs.current.length; i += 1) {
        const m = petalRefs.current[i];
        if (!m) continue;
        const phase = i * 1.7;
        m.position.y = 0.6 + ((t * 0.15 + phase) % 1.4) * 0.6;
        m.rotation.z = t * 0.4 + phase;
      }
    }
    // Ripples T4+ — concentric torus expand+fade looping di water surface
    if (hasRipples) {
      for (let i = 0; i < rippleRefs.current.length; i += 1) {
        const m = rippleRefs.current[i];
        if (!m) continue;
        const phase = i * 0.7;
        const cycle = ((t * 0.45 + phase) % 1) ;
        const scale = 0.25 + cycle * 1.4;
        m.scale.set(scale, 1, scale);
        if (m.material) m.material.opacity = 0.5 * (1 - cycle);
      }
    }
    // Firefly T5+ — orbit single mesh slow keliling fountain area,
    // varying altitude + radius biar gak monoton.
    if (hasFirefly && fireflyRef.current) {
      const fa = t * 0.35;
      const fr = 1.3 + Math.sin(t * 0.4) * 0.25;
      fireflyRef.current.position.x = Math.cos(fa) * fr;
      fireflyRef.current.position.z = Math.sin(fa) * fr;
      fireflyRef.current.position.y = 0.85 + Math.sin(t * 0.9) * 0.2;
    }
    // Lantern motes T5+ — orbit horizontal pelan keliling lantern globe
    // height + sedikit bob. 3 motes per lantern × 2 lanterns = 6 total.
    if (hasLanternMotes) {
      for (let i = 0; i < moteRefs.current.length; i += 1) {
        const m = moteRefs.current[i];
        if (!m) continue;
        const lanternIdx = Math.floor(i / 3);
        const moteIdx = i % 3;
        const lanternAngle = lanternIdx === 0 ? Math.PI * 0.25 : Math.PI * 1.25;
        const lr = 1.55;
        const lx = Math.cos(lanternAngle) * lr;
        const lz = Math.sin(lanternAngle) * lr;
        const orbitR = 0.18 + moteIdx * 0.04;
        const orbitA = t * 0.6 + moteIdx * 2.1;
        m.position.x = lx + Math.cos(orbitA) * orbitR;
        m.position.z = lz + Math.sin(orbitA) * orbitR;
        m.position.y = 0.92 + Math.sin(t * 1.5 + moteIdx) * 0.04;
      }
    }
  });

  if (tier === 0) return null;

  // Statue palette — body warm stone, seam state slightly darker to
  // signal "baru disambung". hasBasin guaranteed true at this point.
  const stoneColor = '#5a4a38';
  const stoneRimColor = '#6a5a44';
  const statueColor = armsSeam ? '#5a4a38' : '#6a5a48';
  const waterColor = hasFountain ? '#3a6485' : '#2a3540';
  const waterEmissive = hasFountain ? '#4a8aa8' : '#000000';

  return (
    <group
      ref={groupRef}
      position={AIR_MANCUR_POS}
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
      {/* Mobile-friendly tap target — cover full statue+basin volume */}
      <mesh position={[0, 0.8, 0]} visible={false}>
        <cylinderGeometry
          args={[isMobile ? 1.6 : 1.2, isMobile ? 1.6 : 1.2, 2, 8]}
        />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Foundation step — octagonal base lebih lebar di bawah basin,
          kasih kesan basin set-in plaza, bukan floating. */}
      {hasFoundation && (
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[1.35, 1.4, 0.05, 8]} />
          <meshStandardMaterial color="#4a3a2a" roughness={1} />
        </mesh>
      )}

      {/* Stone path stub — 4 cobbles dari plaza ke arah lorong path
          (eastward, +x), implies plaza connected to entry path. */}
      {hasPathStub &&
        [
          { x: 1.8, z: 0.2, r: 0.22 },
          { x: 2.3, z: 0.5, r: 0.2 },
          { x: 2.7, z: 0.1, r: 0.24 },
          { x: 3.2, z: 0.4, r: 0.2 },
        ].map((p, i) => (
          <mesh
            key={`path-${i}`}
            position={[p.x, 0.025, p.z]}
            rotation={[0, i * 0.5, 0]}
          >
            <cylinderGeometry args={[p.r, p.r * 1.05, 0.06, 6]} />
            <meshStandardMaterial color="#6a5848" roughness={1} />
          </mesh>
        ))}

      {/* Stone benches T3+ — 2 simple bench di sisi E+W plaza, low
          stone block dgn 2 leg. "Tempat orang duduk" — gathering vibe.
          Bench East (i===0) dapet tea cup T5+ — narrative "someone was
          just here". */}
      {hasBenches &&
        [
          { angle: 0, r: 1.85 },
          { angle: Math.PI, r: 1.85 },
        ].map((b, i) => {
          const bx = Math.cos(b.angle) * b.r;
          const bz = Math.sin(b.angle) * b.r;
          return (
            <group
              key={`bench-${i}`}
              position={[bx, 0, bz]}
              rotation={[0, b.angle + Math.PI / 2, 0]}
            >
              {/* Seat — slab horizontal */}
              <mesh position={[0, 0.18, 0]}>
                <boxGeometry args={[0.7, 0.08, 0.22]} />
                <meshStandardMaterial color="#5a4838" roughness={0.95} />
              </mesh>
              {/* Leg L */}
              <mesh position={[-0.25, 0.08, 0]}>
                <boxGeometry args={[0.08, 0.16, 0.18]} />
                <meshStandardMaterial color="#4a3828" roughness={1} />
              </mesh>
              {/* Leg R */}
              <mesh position={[0.25, 0.08, 0]}>
                <boxGeometry args={[0.08, 0.16, 0.18]} />
                <meshStandardMaterial color="#4a3828" roughness={1} />
              </mesh>
              {/* Tea cup T5+ — small ceramic cup + saucer di bench
                  pertama. Narrative beat. */}
              {hasTeaCup && i === 0 && (
                <>
                  <mesh position={[0.15, 0.235, 0.04]}>
                    <cylinderGeometry args={[0.045, 0.04, 0.005, 10]} />
                    <meshStandardMaterial color="#e8e0d4" roughness={0.7} />
                  </mesh>
                  <mesh position={[0.15, 0.26, 0.04]}>
                    <cylinderGeometry args={[0.035, 0.03, 0.05, 10]} />
                    <meshStandardMaterial color="#f4ece0" roughness={0.6} />
                  </mesh>
                  <mesh position={[0.15, 0.282, 0.04]}>
                    <cylinderGeometry args={[0.028, 0.028, 0.005, 10]} />
                    <meshStandardMaterial
                      color="#3a2818"
                      emissive="#1a0e08"
                      emissiveIntensity={0.2}
                      roughness={0.5}
                    />
                  </mesh>
                </>
              )}
            </group>
          );
        })}

      {/* Cobble ring — paving stones di sekeliling basin, mirror style
          lorong masuk. 8 batu di radius 1.45, slight angle offset biar
          gak terlalu rapi geometris. */}
      {hasCobbleRing &&
        Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2 + 0.15;
          const r = 1.45;
          const sizeJitter = i % 3 === 0 ? 0.28 : 0.24;
          return (
            <mesh
              key={`cobble-${i}`}
              position={[Math.cos(angle) * r, 0.02, Math.sin(angle) * r]}
              rotation={[0, angle + i * 0.4, 0]}
            >
              <cylinderGeometry args={[sizeJitter, sizeJitter * 1.05, 0.06, 6]} />
              <meshStandardMaterial color="#6a5848" roughness={1} />
            </mesh>
          );
        })}

      {/* Basin — octagonal stone (8 segments biar low-poly mood
          konsisten sama landmark lain). Top rim slightly larger biar
          ada lip yang catch light. */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[1.0, 1.05, 0.18, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={1} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <cylinderGeometry args={[1.02, 1.0, 0.04, 8]} />
        <meshStandardMaterial color={stoneRimColor} roughness={1} />
      </mesh>

      {/* Engraved torus di rim basin — decorative line tipis, kasih
          texture detail. T2+ baru muncul (waktu basin "dibenerin",
          relief pattern jadi visible lagi). */}
      {tier >= 2 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.21, 0]}>
          <torusGeometry args={[0.94, 0.012, 6, 32]} />
          <meshStandardMaterial color="#3a2a1c" roughness={1} />
        </mesh>
      )}

      {/* Decorative rim notches T2+ — 8 small box accents at octagon
          vertex points biar rim kerasa hand-carved, bukan plain disc. */}
      {hasRimNotches &&
        Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
          const r = 0.97;
          return (
            <mesh
              key={`notch-${i}`}
              position={[Math.cos(angle) * r, 0.22, Math.sin(angle) * r]}
              rotation={[0, angle, 0]}
            >
              <boxGeometry args={[0.06, 0.04, 0.1]} />
              <meshStandardMaterial color={stoneRimColor} roughness={1} />
            </mesh>
          );
        })}

      {/* Basin interior floor — disc lebih gelap di dasar basin, kasih
          kedalaman. Visible sebelum water naik (tier 1) atau lewat water
          transparency (tier 2+). */}
      {hasBasinFloor && (
        <mesh position={[0, 0.185, 0]}>
          <cylinderGeometry args={[0.88, 0.88, 0.012, 16]} />
          <meshStandardMaterial color="#2a1f18" roughness={1} />
        </mesh>
      )}

      {/* Carved inscription T2+ — small dark rectangle plane di basin
          exterior, kasih hint "ada cerita di sini". 1 di front-facing side. */}
      {hasInscription && (
        <mesh position={[0, 0.12, 1.04]}>
          <planeGeometry args={[0.35, 0.07]} />
          <meshStandardMaterial color="#2a1810" roughness={1} />
        </mesh>
      )}

      {/* Wishing coins T5+ — 4 small emissive specks di basin floor,
          narrative "tradition started here". Pakai sphere kecil. */}
      {hasCoins &&
        [
          { x: 0.15, z: 0.1 },
          { x: -0.2, z: 0.05 },
          { x: 0.05, z: -0.25 },
          { x: -0.1, z: -0.1 },
        ].map((c, i) => (
          <mesh key={`coin-${i}`} position={[c.x, 0.2, c.z]}>
            <cylinderGeometry args={[0.025, 0.025, 0.005, 8]} />
            <meshStandardMaterial
              color="#f4d878"
              emissive="#d4a848"
              emissiveIntensity={0.55}
              roughness={0.4}
              metalness={0.6}
              toneMapped={false}
            />
          </mesh>
        ))}

      {/* Submerged debris di basin floor — 2 pecahan kecil di dasar
          (T1-T2 only). Hilang dari T3+ karena air udah jernih + clear. */}
      {tier <= 2 && (
        <>
          <mesh
            position={[0.25, 0.195, -0.15]}
            rotation={[0.1, 0.4, 0.2]}
          >
            <boxGeometry args={[0.12, 0.04, 0.08]} />
            <meshStandardMaterial color="#3a2a20" roughness={1} />
          </mesh>
          <mesh
            position={[-0.3, 0.193, 0.2]}
            rotation={[0, -0.6, 0]}
          >
            <boxGeometry args={[0.1, 0.03, 0.07]} />
            <meshStandardMaterial color="#3a2a20" roughness={1} />
          </mesh>
        </>
      )}

      {/* Debris di T1 — pecahan batu di sekitar basin, signal "baru
          ditemuin, belum dibenerin" */}
      {tier === 1 &&
        [0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2 + 0.4;
          const r = 1.2;
          return (
            <mesh
              key={`debris-${i}`}
              position={[Math.cos(angle) * r, 0.06, Math.sin(angle) * r]}
              rotation={[0.2, i * 1.1, 0.3]}
            >
              <boxGeometry args={[0.24, 0.14, 0.18]} />
              <meshStandardMaterial color="#3a2a20" roughness={1} />
            </mesh>
          );
        })}

      {/* Water surface — disc di dalam basin, level naik per tier */}
      {hasWater && (
        <mesh position={[0, waterLevelY, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.02, 16]} />
          <meshStandardMaterial
            ref={waterMatRef}
            color={waterColor}
            emissive={waterEmissive}
            emissiveIntensity={hasFountain ? 0.12 : 0}
            roughness={0.4}
            metalness={0.2}
            transparent
            opacity={0.92}
          />
        </mesh>
      )}

      {/* Lily pads T4+ — 3 disc kecil floating di atas water surface,
          gentle bob via useFrame. Avoid center (pedestal area). */}
      {hasLilyPads &&
        [
          { angle: 0.4, r: 0.45 },
          { angle: 2.3, r: 0.55 },
          { angle: 4.1, r: 0.5 },
        ].map((p, i) => (
          <mesh
            key={`lily-${i}`}
            ref={(m) => {
              lilyRefs.current[i] = m;
            }}
            position={[
              Math.cos(p.angle) * p.r,
              waterLevelY + 0.012,
              Math.sin(p.angle) * p.r,
            ]}
          >
            <cylinderGeometry args={[0.13, 0.13, 0.01, 8]} />
            <meshStandardMaterial
              color="#4a7848"
              emissive="#2a5028"
              emissiveIntensity={0.18}
              roughness={0.7}
            />
          </mesh>
        ))}

      {/* Splash ring T4+ — torus di water surface tempat fountain
          jatuh, pulse scale via useFrame sync sama stream wobble. */}
      {hasSplash && (
        <mesh
          ref={splashRef}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, waterLevelY + 0.014, 0]}
        >
          <torusGeometry args={[0.16, 0.018, 6, 16]} />
          <meshStandardMaterial
            color="#c8e0f0"
            emissive="#8ab8d4"
            emissiveIntensity={0.55}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Concentric ripples T4+ — 2 torus rings expand+fade looping.
          Phase di-stagger biar gak sync. Animated via useFrame. */}
      {hasRipples &&
        [0, 1].map((i) => (
          <mesh
            key={`ripple-${i}`}
            ref={(m) => {
              rippleRefs.current[i] = m;
            }}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, waterLevelY + 0.011, 0]}
          >
            <torusGeometry args={[0.4, 0.008, 4, 24]} />
            <meshStandardMaterial
              color="#a8c8e0"
              emissive="#7aa8c0"
              emissiveIntensity={0.4}
              transparent
              opacity={0.5}
              toneMapped={false}
            />
          </mesh>
        ))}

      {/* Central pedestal — short pillar yg nopang patung */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={1} />
      </mesh>

      {/* Stone tablet T3+ — small memorial plaque di base depan pedestal.
          Box tipis + thin engraving line di atas. Suggests "this place
          remembers". */}
      {hasTablet && (
        <group position={[0, 0.04, 0.32]} rotation={[0, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.24, 0.08, 0.05]} />
            <meshStandardMaterial color="#4a3828" roughness={1} />
          </mesh>
          <mesh position={[0, 0.005, 0.026]}>
            <planeGeometry args={[0.16, 0.018]} />
            <meshStandardMaterial color="#2a1810" roughness={1} />
          </mesh>
        </group>
      )}

      {/* Pedestal moss/vines T4+ — green spheres clustered di base
          pedestal, signal life returning. Asymmetric biar gak rapi. */}
      {hasPedestalMoss &&
        [
          { x: 0.18, y: 0.27, z: 0.05, s: 0.08 },
          { x: 0.15, y: 0.35, z: 0.14, s: 0.06 },
          { x: -0.16, y: 0.3, z: 0.1, s: 0.07 },
          { x: -0.05, y: 0.27, z: -0.18, s: 0.07 },
          { x: 0.1, y: 0.42, z: 0.18, s: 0.05 },
        ].map((m, i) => (
          <mesh key={`moss-${i}`} position={[m.x, m.y, m.z]}>
            <sphereGeometry args={[m.s, 8, 6]} />
            <meshStandardMaterial
              color="#4a6838"
              emissive="#2a4020"
              emissiveIntensity={0.15}
              roughness={0.85}
            />
          </mesh>
        ))}

      {/* Lantern posts T3+ — 2 tiang dgn globe lampu di NE+SW corners
          plaza. Globe lit (emissive flicker via useFrame) di T5+ —
          sebelumnya unlit, signal "tiangnya udah berdiri tapi belum
          dinyalain". */}
      {hasLanterns &&
        [
          { angle: Math.PI * 0.25 },
          { angle: Math.PI * 1.25 },
        ].map((p, i) => {
          const r = 1.55;
          const px = Math.cos(p.angle) * r;
          const pz = Math.sin(p.angle) * r;
          return (
            <group key={`lantern-${i}`} position={[px, 0, pz]}>
              <mesh position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.04, 0.05, 0.8, 6]} />
                <meshStandardMaterial color="#3a2e22" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.83, 0]}>
                <boxGeometry args={[0.16, 0.04, 0.16]} />
                <meshStandardMaterial color="#2a2218" roughness={1} />
              </mesh>
              <mesh position={[0, 0.92, 0]}>
                <sphereGeometry args={[0.08, 10, 8]} />
                <meshStandardMaterial
                  ref={(m) => {
                    lanternMatRefs.current[i] = m;
                  }}
                  color={lanternLit ? '#f4d8a0' : '#5a4838'}
                  emissive={lanternLit ? '#f4c878' : '#000000'}
                  emissiveIntensity={lanternLit ? 0.55 : 0}
                  roughness={0.5}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[0, 0.99, 0]}>
                <coneGeometry args={[0.1, 0.08, 6]} />
                <meshStandardMaterial color="#3a2e22" roughness={0.9} />
              </mesh>
              {lanternLit && (
                <pointLight
                  position={[0, 0.92, 0]}
                  color="#f4d8a0"
                  intensity={0.25}
                  distance={1.6}
                  decay={2}
                />
              )}
            </group>
          );
        })}

      {/* Lantern motes T5+ — 3 tiny floating sparks per lit lantern,
          orbit horizontal via useFrame. Magic atmospheric touch malam. */}
      {hasLanternMotes &&
        Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={`mote-${i}`}
            ref={(m) => {
              moteRefs.current[i] = m;
            }}
            position={[0, 0.92, 0]}
          >
            <sphereGeometry args={[0.018, 6, 5]} />
            <meshStandardMaterial
              color="#f4d8a0"
              emissive="#f4c478"
              emissiveIntensity={0.85}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
        ))}

      {/* Statue body — sphere torso. Skipped detail (no head/legs) —
          stylized abstract figure, fokusnya di lengan & gesture. */}
      <mesh position={[0, 0.88, 0]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color={statueColor} roughness={1} />
      </mesh>

      {/* Robe drape lines T2+ — 3 thin vertical accents di torso, kasih
          kesan fabric folds tanpa face/head detail. Asymmetric. */}
      {hasRobeDrape &&
        [-0.08, 0.02, 0.09].map((x, i) => (
          <mesh
            key={`robe-${i}`}
            position={[x, 0.84, 0.16]}
            rotation={[0, 0, i * 0.08]}
          >
            <boxGeometry args={[0.012, 0.18, 0.008]} />
            <meshStandardMaterial color="#3a2a1c" roughness={1} />
          </mesh>
        ))}

      {/* Arms — kalau broken (T1), lying di rim basin. Kalau ada (T2+),
          raised dalam pose menampung air. Seam ring di joint kalau T2. */}
      {armsBroken ? (
        <>
          <mesh
            position={[0.55, 0.22, 0.15]}
            rotation={[0, 0.4, Math.PI / 2 - 0.3]}
          >
            <cylinderGeometry args={[0.05, 0.07, 0.35, 6]} />
            <meshStandardMaterial color={stoneColor} roughness={1} />
          </mesh>
          <mesh
            position={[-0.5, 0.22, -0.2]}
            rotation={[0, -0.3, -Math.PI / 2 + 0.4]}
          >
            <cylinderGeometry args={[0.05, 0.07, 0.35, 6]} />
            <meshStandardMaterial color={stoneColor} roughness={1} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[-0.16, 1.04, 0]} rotation={[0, 0, 0.55]}>
            <cylinderGeometry args={[0.045, 0.06, 0.36, 6]} />
            <meshStandardMaterial color={statueColor} roughness={1} />
          </mesh>
          <mesh position={[0.16, 1.04, 0]} rotation={[0, 0, -0.55]}>
            <cylinderGeometry args={[0.045, 0.06, 0.36, 6]} />
            <meshStandardMaterial color={statueColor} roughness={1} />
          </mesh>
          {armsSeam && (
            <>
              <mesh position={[-0.07, 0.93, 0]} rotation={[0, 0, 0.55]}>
                <torusGeometry args={[0.055, 0.011, 6, 12]} />
                <meshStandardMaterial color="#2a1a10" roughness={1} />
              </mesh>
              <mesh position={[0.07, 0.93, 0]} rotation={[0, 0, -0.55]}>
                <torusGeometry args={[0.055, 0.011, 6, 12]} />
                <meshStandardMaterial color="#2a1a10" roughness={1} />
              </mesh>
            </>
          )}
        </>
      )}

      {/* Trickle T3 — single thin stream dari tangan ke water surface */}
      {hasTrickle && (
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.55, 5]} />
          <meshStandardMaterial
            color="#7aa8c0"
            transparent
            opacity={0.7}
            emissive="#5a8aa8"
            emissiveIntensity={0.22}
          />
        </mesh>
      )}

      {/* Fountain stream T4+ — vertical column rising up dari tangan */}
      {hasFountain && (
        <mesh position={[0, 1.22, 0]}>
          <cylinderGeometry args={[0.035, 0.022, 0.45, 8]} />
          <meshStandardMaterial
            ref={streamMatRef}
            color="#a8c8e0"
            transparent
            opacity={0.62}
            emissive="#7aa8c0"
            emissiveIntensity={0.28}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Droplets — small spheres yang animated fall cycle. Ref array
          dipake useFrame buat update y position + visibility. */}
      {dropletCount > 0 &&
        Array.from({ length: dropletCount }).map((_, i) => {
          const angle = (i / dropletCount) * Math.PI * 2;
          const r = 0.45;
          return (
            <mesh
              key={`drop-${i}`}
              ref={(m) => {
                dropletRefs.current[i] = m;
              }}
              position={[Math.cos(angle) * r, 1.35, Math.sin(angle) * r]}
            >
              <sphereGeometry args={[0.024, 6, 5]} />
              <meshStandardMaterial
                color="#a8c8e0"
                emissive="#7aa8c0"
                emissiveIntensity={0.4}
                transparent
                opacity={0.88}
                toneMapped={false}
              />
            </mesh>
          );
        })}

      {/* Night warm point light T5+ — pas malam patung di-light tipis
          dari bawah, kasih kesan "air mancur hidup setelah gelap" */}
      {hasNightGlow && (
        <pointLight
          position={[0, 0.55, 0]}
          color="#f4d8a0"
          intensity={0.45}
          distance={3.2}
          decay={2}
        />
      )}

      {/* Plaza flowers T5+ — small bunga di tanah sekitar plaza, outside
          cobble ring. Cluster di 4 spot, warna mixed (pink, kuning,
          putih) — life returning ke sekitar fountain. */}
      {hasPlazaFlowers &&
        [
          { angle: 0.6, r: 1.95, color: '#f4c8d8', em: '#e09bb0' },
          { angle: 1.8, r: 2.1, color: '#f4d878', em: '#d4b048' },
          { angle: 3.2, r: 1.9, color: '#e8e0d4', em: '#b8a890' },
          { angle: 4.7, r: 2.0, color: '#f4c8d8', em: '#e09bb0' },
        ].flatMap((p, ci) => {
          const cx = Math.cos(p.angle) * p.r;
          const cz = Math.sin(p.angle) * p.r;
          return [0, 1, 2].map((j) => {
            const ja = j * 2.1;
            const jr = 0.13 + j * 0.04;
            return (
              <mesh
                key={`pf-${ci}-${j}`}
                position={[
                  cx + Math.cos(ja) * jr,
                  0.04,
                  cz + Math.sin(ja) * jr,
                ]}
              >
                <sphereGeometry args={[0.045, 6, 5]} />
                <meshStandardMaterial
                  color={p.color}
                  emissive={p.em}
                  emissiveIntensity={0.3}
                  roughness={0.7}
                  toneMapped={false}
                />
              </mesh>
            );
          });
        })}

      {/* Apricot blossoms T6 — 4 kuncup di rim basin sebagai epilog
          marker. Link visual ke Pohon Terakhir (aprikot motif). */}
      {hasBlossoms &&
        [0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2 + 0.25;
          const r = 0.95;
          return (
            <mesh
              key={`blossom-${i}`}
              ref={(m) => {
                blossomRefs.current[i] = m;
              }}
              position={[Math.cos(angle) * r, 0.26, Math.sin(angle) * r]}
            >
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshStandardMaterial
                color="#f4c8d8"
                emissive="#e09bb0"
                emissiveIntensity={0.5}
                roughness={0.6}
                toneMapped={false}
              />
            </mesh>
          );
        })}

      {/* Firefly T5+ — single mesh orbit slow keliling fountain area,
          altitude + radius variant via useFrame. Single life beat malam. */}
      {hasFirefly && (
        <mesh ref={fireflyRef} position={[1.3, 0.85, 0]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial
            color="#f4e8a0"
            emissive="#f4d878"
            emissiveIntensity={1.2}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Floating petals T6 — 3 specks pink drift naik-turun lambat
          sekitar height blossom. Loop y wrap via useFrame. Tiap petal
          tilted plane biar pipih kayak kelopak, bukan bulat. */}
      {hasFloatingPetals &&
        [0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2 + 0.8;
          const r = 0.7 + (i % 2) * 0.2;
          return (
            <mesh
              key={`petal-${i}`}
              ref={(m) => {
                petalRefs.current[i] = m;
              }}
              position={[Math.cos(angle) * r, 0.7, Math.sin(angle) * r]}
              rotation={[Math.PI / 2.2, 0, i * 0.7]}
            >
              <planeGeometry args={[0.07, 0.045]} />
              <meshStandardMaterial
                color="#f4c8d8"
                emissive="#e09bb0"
                emissiveIntensity={0.45}
                transparent
                opacity={0.85}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          );
        })}

      {!modalOpen && (
        <Html position={[0, 1.55, 0]} center distanceFactor={10} occlude={false}>
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
              Air Mancur Plaza
            </div>
            <div
              className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
                hovered ? 'text-amber-200/85' : 'text-white/55'
              }`}
            >
              {tier === 1
                ? 'Reruntuhan'
                : tier === 2
                ? 'Genangan tipis'
                : tier === 3
                ? 'Tetesan'
                : tier === 4
                ? 'Setengah pulih'
                : tier === 5
                ? 'Air mengalir'
                : 'Mekar lagi'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// TierReveal — wrapper component yg animate scale 0→1 saat unlocked
// become true. Easing cubic-out, default 1.5s duration. Tiap milestone
// elements grow into existence saat tier kebuka (entrance reveal
// effect). Mount-with-unlocked also animates (page reload past
// threshold = entrance animation tetep play).
const TierReveal = ({ unlocked, duration = 1.5, children }) => {
  const groupRef = useRef();
  const startRef = useRef(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    if (startRef.current === null) {
      startRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - startRef.current;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    groupRef.current.scale.setScalar(eased);
  });
  if (!unlocked) return null;
  return (
    <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>
      {children}
    </group>
  );
};

const TamanScene = ({
  hoveredPetakId,
  hoveredCenter,
  hoveredGerbang,
  hoveredLorong,
  hoveredTelaga,
  hoveredArsip,
  hoveredMenara,
  hoveredPanggung,
  hoveredAirMancur,
  previewedPetak,
  flyInActive,
  isMobile = false,
  restorationLevel = 0,
  modalOpen = false,
  telagaState = 'locked',
  arsipState = 'drought',
  menaraState = 'locked',
  panggungState = 'locked',
  airMancurTier = 0,
  armeniacaCount = 0,
  armeniacaLoaded = false,
  purified = false,
  purifyProgress = 0,
  compassRotateRef,
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
  onArsipHover,
  onArsipOut,
  onArsipClick,
  onMenaraHover,
  onMenaraOut,
  onMenaraClick,
  onPanggungHover,
  onPanggungOut,
  onPanggungClick,
  onAirMancurHover,
  onAirMancurOut,
  onAirMancurClick,
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
    hoveredTelaga ||
    hoveredArsip ||
    hoveredMenara ||
    hoveredPanggung ||
    hoveredAirMancur;

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

  // Purified = full city restoration (count >= fullRestore / 7000) atau
  // ?purified=1 dev override. Computed di page level + passed via prop —
  // override consistency antara scene visuals + AmbientAudio swell.
  // Trigger lighting/particle/landmark swap ke "kota hidup lagi" state.
  // Wounds (CityRuins, DeadTrees) tetap visible — luka kota gak dihapus,
  // tapi atmosfer + life-layer berubah (less dust, more fireflies +
  // petals, dawn palette).

  // Atmosphere palette interp — color + numeric values lerp dari
  // drought→purified pakai purifyProgress (0-1). Smooth gradual feel
  // bukan flip discrete. Hybrid Opsi C: atmosphere lerp continuous,
  // milestone-gated objects (CobblestonePath dst.) tetep discrete via
  // `purified` boolean.
  const atmosphere = useMemo(() => {
    const t = purifyProgress;
    const lerp01 = (a, b) => a + (b - a) * t;
    const lerpColor = (a, b) => {
      const ca = new THREE.Color(a);
      const cb = new THREE.Color(b);
      return ca.lerp(cb, t).getStyle();
    };
    return {
      fogColor: lerpColor('#5a3540', '#7a5868'),
      fogNear: lerp01(18, 22),
      fogFar: lerp01(52, 58),
      bgColor: lerpColor('#1a1018', '#2a1d28'),
      ambientColor: lerpColor('#c0a090', '#e0c0a8'),
      ambientIntensity: lerp01(0.28, 0.32),
      keyColor: lerpColor('#f4b078', '#f8c898'),
      keyIntensity: lerp01(1.5, 1.55),
      fillColor: lerpColor('#b8907a', '#c8a890'),
      fillIntensity: lerp01(0.45, 0.48),
    };
  }, [purifyProgress]);
  return (
    <>
      {/* Atmosphere — fog/bg/ambient/key/fill di-lerp continuous
          drought→purified via purifyProgress. */}
      <fog
        attach="fog"
        args={[atmosphere.fogColor, atmosphere.fogNear, atmosphere.fogFar]}
      />
      <color attach="background" args={[atmosphere.bgColor]} />
      <ambientLight
        intensity={atmosphere.ambientIntensity}
        color={atmosphere.ambientColor}
      />
      <directionalLight
        position={[8, 12, 6]}
        intensity={atmosphere.keyIntensity}
        color={atmosphere.keyColor}
      />
      <directionalLight
        position={[-6, 8, -4]}
        intensity={atmosphere.fillIntensity}
        color={atmosphere.fillColor}
      />
      <TamanFloor purified={purified} purifyProgress={purifyProgress} />
      <DroughtRing purified={purified} purifyProgress={purifyProgress} />
      {/* MossOverlay sengaja gak di-render — DroughtRing purified udah
          ngasih lush meadow carpet yg lebih lebar, MossOverlay patches
          jadi keliatan banding spot di atasnya. */}
      {/* === Milestone-gated reveals (Phase 2 hybrid) === */}
      {/* Tiap milestone "unlock" elemen baru sesuai narrative tier.
          Variabel mN dideklarasi inline: m3 = count >=3000 OR purified,
          m4 = >=4000, m5 = >=5000, m6 = >=6000, m65 = >=6500,
          m7 = >=7000 (purified). Drought=true purify shortcut ke max. */}
      {/* m3 — Menara Jam unlock; kota mulai inget waktu. Rumput tipis
              + lumut di reruntuhan = sinyal "kehidupan kecil mulai
              kembali". */}
      <TierReveal unlocked={purified || armeniacaCount >= MAP_THRESHOLDS.r4Unlock}>
        <GrassBlades isMobile={isMobile} />
        <MossyBoulders isMobile={isMobile} />
      </TierReveal>
      {/* m4 — Lorong restored + Telaga unlock; bunga liar + vines
              reclaiming ruins. */}
      <TierReveal unlocked={purified || armeniacaCount >= MAP_THRESHOLDS.r1Restore}>
        <WildflowerBushes isMobile={isMobile} />
        <VineCreeps />
        <MossyRimStones />
      </TierReveal>
      {/* m5 — Menara restored + Perpustakaan unlock; paths + light
              fixtures hadir. Kota udah bisa "dilewatin" properly. */}
      <TierReveal unlocked={purified || armeniacaCount >= MAP_THRESHOLDS.r4Restore}>
        <CobblestonePath />
        <SteppingStones />
        <StoneLanterns />
        {!isMobile && <StringLights />}
      </TierReveal>
      {/* m6 — Telaga pulih; air kembali (teratai, koi, ripples, mist,
              tsukubai japanese cuci tangan, birdbath). */}
      <TierReveal unlocked={purified || armeniacaCount >= MAP_THRESHOLDS.r3Restore}>
        <LotusPads />
        <Cattails />
        <KoiShadows />
        <WaterRipples />
        {!isMobile && <WaterMist />}
        <Tsukubai />
        <StoneBirdbath pos={[-1.8, 0, 1.5]} />
      </TierReveal>
      {/* m65 — Panggung restored; shrine elements + bamboo + signposts. */}
      <TierReveal unlocked={purified || armeniacaCount >= MAP_THRESHOLDS.r5Restore}>
        <WoodenTorii />
        <JizoStatue />
        <WoodenSignpost />
        {!isMobile && <BambooCluster />}
      </TierReveal>
      {/* m7 — Full pulih (purified); delicate touches: floating
              lanterns, festive flowers, fortunes, chimes, hammock. */}
      <TierReveal unlocked={purified}>
        <FlowerClusters isMobile={isMobile} />
        <FloatingPaperLanterns />
        <MushroomClusters />
        <OmikujiStrips />
        {!isMobile && <WindChimes pos={[-6.5, 1.6, -3.5]} />}
        {!isMobile && <Hammock start={[-7, 1.4, 6]} end={[-4, 1.4, 8]} />}
      </TierReveal>
      <PetaFootprintTrails />
      <PathWaymarkers purified={purified} />
      <HopeEcho count={armeniacaCount} loaded={armeniacaLoaded} />
      {/* Hover halo overlays — expanding ring saat petak hovered.
          Generic additive layer, gak ngubah internal petak component. */}
      <HoverHalo pos={[0, 0.02, 0]} visible={hoveredCenter} color="#a8d088" />
      <HoverHalo pos={[0, 0.02, 8]} visible={hoveredGerbang} color="#f4c478" />
      <HoverHalo pos={[0, 0.02, 4]} visible={hoveredLorong} color="#e8b878" />
      <HoverHalo pos={[-7, 0.02, -1]} visible={hoveredTelaga} color="#8ac8e0" />
      <HoverHalo pos={[7, 0.02, -1]} visible={hoveredArsip} color="#c8a060" />
      <HoverHalo pos={[0, 0.02, -8]} visible={hoveredMenara} color="#e8a868" />
      <CompassTracker targetRef={compassRotateRef} />
      {/* Prasasti quotes — 3 fragmen worldbuilding scattered di scene.
          Hidden saat modal open biar gak overlap text dengan card. */}
      {!modalOpen && <PrasastiQuotes />}
      {/* Dead-town environment — CityRuins di luar hex ring (siluet kota
          runtuh) + DeadTrees scattered (sisa hutan mati) ALWAYS visible
          baik drought maupun purified (luka kota gak dihapus, narasi
          "yang bertahan, bukan yang utuh dari awal"). Dust-layer
          (SandDust, WindStreaks, HighDustShimmer) cuma drought — purified
          ganti dengan Fireflies + ApricotPetals (life returning). */}
      <CityRuins isMobile={isMobile} />
      <DistantCityRuins isMobile={isMobile} />
      <DeadTrees isMobile={isMobile} purified={purified} />
      {!purified && <SandDust count={isMobile ? 50 : 100} />}
      {!purified && !isMobile && <WindStreaks count={12} />}
      {!purified && !isMobile && <HighDustShimmer count={40} />}
      {/* Drought mirror set — isi koi-pond corner saat !purified.
          Definisi & komentar di blok "Drought mirror set" di atas. */}
      {!purified && <DriedPondBasin />}
      {!purified && <DriedLotusHusks />}
      {!purified && <FallenStoneLantern />}
      {!purified && <TornFallenLanterns />}
      {/* Storm wreckage set — kota babak belur, debris menyebar lintas
          peta, banner sobek, gerobak roboh, retakan tabrakan, bekas
          hangus berasap. Lihat blok "Storm wreckage set" di atas. */}
      {!purified && <ScatteredDebris />}
      {!purified && <TippedCart />}
      {!purified && <TatteredBannerPoles />}
      {!purified && <CrackedGroundPatches />}
      {!purified && <ScorchedSpots />}
      {/* Japanese-corner mirror polish — drought twin untuk torii, jizo,
          signpost, cattails, tsukubai, bamboo, stepping stones, omikuji.
          Slot persis identik dengan purified versi. */}
      {!purified && <CollapsedTorii />}
      {!purified && <ToppledJizo />}
      {!purified && <KnockedOverSignpost />}
      {!purified && <WitheredCattails />}
      {!purified && <DriedTsukubai />}
      {!purified && !isMobile && <BrokenBambooCluster />}
      {!purified && <DisplacedSteppingStones />}
      {!purified && <TornOmikujiStrips />}
      {!purified && <CrackedRimStones />}
      {!purified && <SnappedDeadTrees />}
      {!purified && <CollapsedWallFragments />}
      {!purified && <RubbleHouses />}
      {purified && <RestoredHouses />}
      {/* Atmospheric drought polish — sky/distance motion biar sky gak
          kerasa kosong dan kota jauh punya "life" sisa post-storm. */}
      {!purified && <CirclingVultures />}
      {!purified && <DistantSmokeWisps />}
      {/* Depth polish — sand drifts. */}
      {!purified && <SandDrifts />}
      {purified && <Fireflies isMobile={isMobile} />}
      {purified && <Butterflies isMobile={isMobile} />}
      {purified && <BirdsFlock />}
      {purified && <ApricotPetals count={isMobile ? 30 : 50} />}
      <Stars count={isMobile ? 50 : 90} />
      <Moon />
      {!purified && <DistantCrow />}
      <CenterTree
        hovered={hoveredCenter}
        visited={previewedPetak.has('pohon')}
        isMobile={isMobile}
        purified={purified}
        modalOpen={modalOpen}
        onPointerOver={onCenterHover}
        onPointerOut={onCenterOut}
        onClick={onCenterClick}
      />
      <PetaGerbang
        hovered={hoveredGerbang}
        visited={previewedPetak.has('gerbang')}
        isMobile={isMobile}
        modalOpen={modalOpen}
        onPointerOver={onGerbangHover}
        onPointerOut={onGerbangOut}
        onClick={onGerbangClick}
      />
      <PetaLorongMasuk
        hovered={hoveredLorong}
        visited={previewedPetak.has('lorong')}
        isMobile={isMobile}
        modalOpen={modalOpen}
        onPointerOver={onLorongHover}
        onPointerOut={onLorongOut}
        onClick={onLorongClick}
      />
      <PetaTelaga
        hovered={hoveredTelaga}
        visited={previewedPetak.has('telaga')}
        isMobile={isMobile}
        petakState={telagaState}
        modalOpen={modalOpen}
        onPointerOver={onTelagaHover}
        onPointerOut={onTelagaOut}
        onClick={onTelagaClick}
      />
      <PetaArsip
        hovered={hoveredArsip}
        visited={previewedPetak.has('arsip')}
        isMobile={isMobile}
        petakState={arsipState}
        modalOpen={modalOpen}
        onPointerOver={onArsipHover}
        onPointerOut={onArsipOut}
        onClick={onArsipClick}
      />
      <PetaMenara
        hovered={hoveredMenara}
        visited={previewedPetak.has('menara')}
        isMobile={isMobile}
        petakState={menaraState}
        modalOpen={modalOpen}
        onPointerOver={onMenaraHover}
        onPointerOut={onMenaraOut}
        onClick={onMenaraClick}
      />
      <PetaPanggung
        hovered={hoveredPanggung}
        visited={previewedPetak.has('panggung')}
        isMobile={isMobile}
        petakState={panggungState}
        modalOpen={modalOpen}
        onPointerOver={onPanggungHover}
        onPointerOut={onPanggungOut}
        onClick={onPanggungClick}
      />
      <PetaAirMancur
        hovered={hoveredAirMancur}
        tier={airMancurTier}
        isMobile={isMobile}
        modalOpen={modalOpen}
        onPointerOver={onAirMancurHover}
        onPointerOut={onAirMancurOut}
        onClick={onAirMancurClick}
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
      'Gerbang di tepi padang. Dulu, setiap orang yang lewat sini bawa cerita masuk ke kota. Sekarang, cuma angin yang lewat — bawa debu, bawa sisa lagu yang gak selesai dinyanyiin.',
    cta: 'Lewati gerbang',
    route: '/armeniacaTown',
    accent: '#f4a060',
  },
  lorong: {
    id: 'lorong',
    name: 'Konstelasi Perjalanan',
    eyebrow: 'Lorong Masuk',
    longDesc:
      'Jalan setapak ke pusat kota. Di tanahnya, batu-batu yang dulu rame diinjak. Di langitnya, konstelasi yang gak pernah padam — perjalanan satu jiwa, dipatri jadi bintang.',
    cta: 'Masuki lorong',
    route: '/armeniacaTown/r1',
    accent: '#fff5c8',
  },
  pohon: {
    id: 'pohon',
    name: 'Pohon Terakhir',
    eyebrow: 'Pohon Kebaikan',
    longDesc:
      'Di tengah kota, satu pohon aprikot yang menolak mati. Akarnya nahan tanah, dahannya nahan langit. Setiap orang yang nyiramnya, ikut nahan dunia ini dari hilang.',
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
      'Telaga di barat ini belum bisa diakses. Pintunya nungguin 4.000 kebaikan terkumpul di Pohon. Sampai saat itu — kita semua sama-sama nungguin.',
    cta: 'Siram di /26',
    route: '/26',
    accent: '#9aa0a8',
  },
  telagaDrought: {
    id: 'telaga',
    name: 'Telaga Harapan',
    eyebrow: 'Telaga kering',
    longDesc:
      'Telaga ini dulu penuh teratai — setiap bunga, satu harapan. Sekarang dasarnya retak, banknya kering. Tapi harapan-harapan itu belum hilang. Mereka cuma nungguin air kembali.',
    cta: 'Lewati telaga',
    route: '/armeniacaTown/r3',
    accent: '#e0c098',
  },
  telagaRestored: {
    id: 'telaga',
    name: 'Telaga Harapan',
    eyebrow: 'Telaga pulih',
    longDesc:
      'Air kembali. Teratai mekar lagi, satu per satu, seperti yang dulu. Setiap kuncup yang buka — satu harapan yang akhirnya disampaikan. Dunia ini hidup lagi, karena kalian.',
    cta: 'Masuki telaga',
    route: '/armeniacaTown/r3',
    accent: '#a8c8e0',
  },
  // Perpustakaan punya 3 varian copy karena 3 state — pilih varian di
  // handler berdasarkan arsipState computed dari count.
  arsipLocked: {
    id: 'arsip',
    name: 'Perpustakaan',
    eyebrow: 'Belum terbuka',
    longDesc:
      'Perpustakaan kota di timur ini masih terkunci. Pintunya nungguin 5.000 kebaikan terkumpul di Pohon. Sampai saat itu — halaman-halamannya tertidur dulu.',
    cta: 'Siram di /26',
    route: '/26',
    accent: '#9aa0a8',
  },
  arsipDrought: {
    id: 'arsip',
    name: 'Perpustakaan',
    eyebrow: 'Setengah runtuh',
    longDesc:
      'Perpustakaan kota — sebagian rak masih berdiri, sebagian halaman masih bisa dibaca. Atapnya jebol di pojok, dindingnya ambruk di satu sisi. Tapi seseorang menyelamatkan apa yang tersisa. Yang tertinggal, menunggu siapa saja yang mau membaca.',
    cta: 'Masuki perpustakaan',
    route: '/armeniacaTown/r2',
    accent: '#c8a060',
  },
  arsipRestored: {
    id: 'arsip',
    name: 'Perpustakaan',
    eyebrow: 'Rak berdiri lagi',
    longDesc:
      'Rak berdiri lagi. Kertas balik ke tempat. Atap tetap jebol — luka itu sengaja ditinggal, biar yang baca di sini ingat: ini bukan ruangan yang utuh dari awal. Ini ruangan yang bertahan.',
    cta: 'Masuki perpustakaan',
    route: '/armeniacaTown/r2',
    accent: '#e8d4a8',
  },
  // Menara Jam (r4) — 3 varian copy mirror Telaga/Perpustakaan. State
  // dipilih di handler berdasarkan menaraState computed dari count.
  menaraLocked: {
    id: 'menara',
    name: 'Menara Jam',
    eyebrow: 'Belum terbuka',
    longDesc:
      'Menara jam di utara kota ini masih ambruk. Kolomnya tergeletak, dialnya pecah di tanah. Pintunya nungguin 3.000 kebaikan terkumpul di Pohon — sebelum ada yang mau benerin, kota belum bisa inget jam berapa sekarang.',
    cta: 'Siram di /26',
    route: '/26',
    accent: '#9aa0a8',
  },
  menaraDrought: {
    id: 'menara',
    name: 'Menara Jam',
    eyebrow: 'Jam separuh jalan',
    longDesc:
      'Menara jam udah ngadeg lagi — tapi jarum menitnya masih hilang, bel-nya masih bisu. Cuma jarum hour yang gerak akurat. Bandul di bawah dial nungguin event Eli terdekat. Kota mulai inget jam berapa sekarang, walau setengah-setengah.',
    cta: 'Masuki menara',
    route: '/armeniacaTown/r4',
    accent: '#c8a060',
  },
  menaraRestored: {
    id: 'menara',
    name: 'Menara Jam',
    eyebrow: 'Jam pulih',
    longDesc:
      'Dua jarum lengkap, dial bersih, kaca patri di belakangnya nyala lembut. Bel hourly chime berdentang halus tiap jam. Almanak Kota di base menara — daftar tanggal-tanggal milestone perjalanan Eli — bisa dibaca lagi. Kota inget waktu, dan ingatannya jalan tiap detik.',
    cta: 'Masuki menara',
    route: '/armeniacaTown/r4',
    accent: '#e8d4a8',
  },
  // Panggung Terbuka (r5) — 3 varian copy mirror Telaga/Arsip/Menara.
  // State dipilih di handler berdasarkan panggungState computed dari count.
  panggungLocked: {
    id: 'panggung',
    name: 'Panggung Terbuka',
    eyebrow: 'Belum terbuka',
    longDesc:
      'Anfiteater di sisi tenggara kota ini masih reruntuhan. Kursi-kursinya tumpang tindih, panggungnya ambruk, spotlight-nya tergeletak di tanah. Pintunya nungguin 4.500 kebaikan terkumpul di Pohon — sebelum ada yang mau nyusun kursinya balik, panggung ini belum bisa cerita lagi.',
    cta: 'Siram di /26',
    route: '/26',
    accent: '#9aa0a8',
  },
  panggungDrought: {
    id: 'panggung',
    name: 'Panggung Terbuka',
    eyebrow: 'Panggung sepi',
    longDesc:
      'Kursi udah disusun balik di semicircle — tapi panggungnya masih sepi. Spotlight tergantung di pole, tapi belum nyala. Tirai sobek setengah, masih bisa goyang pelan kalau angin lewat. Kerasa kayak nungguin: ada yang berani naik panggung dulu, atau ada penonton yang berani duduk di depan.',
    cta: 'Masuki panggung',
    route: '/armeniacaTown/r5',
    accent: '#c8a060',
  },
  panggungRestored: {
    id: 'panggung',
    name: 'Panggung Terbuka',
    eyebrow: 'Lampu nyala',
    longDesc:
      'Satu spotlight, satu panggung. Audience-nya sengaja ditinggal kosong di belakang — biar tiap orang yang masuk ke sini bisa duduk di mana aja. Tirai utuh, papan stage di-polish. Yang penting bukan siapa yang nonton; yang penting cerita-cerita itu masih dipentasin.',
    cta: 'Masuki panggung',
    route: '/armeniacaTown/r5',
    accent: '#e8d4a8',
  },
};

// PetakPreviewModal — info panel yg muncul saat user click petak.
// Show name + description + CTA "Lanjut" yang trigger navigate. Modal
// dismiss via tap luar, button Batal, atau Escape. Kalau petak.statusOnly
// true, CTA disembunyiin (status info aja, no nav — buat air mancur).
const PetakPreviewModal = ({ petak, onClose, onConfirm }) => {
  if (!petak) return null;
  const statusOnly = Boolean(petak.statusOnly);
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center px-4 pb-4"
      style={{ paddingTop: '6rem' }}
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
          className="text-white/75 text-[12px] sm:text-sm leading-relaxed mb-6 whitespace-pre-line"
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
            {statusOnly ? 'Tutup' : 'Batal'}
          </button>
          {!statusOnly && (
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-black text-xs sm:text-sm font-medium hover:bg-white/90 transition"
            >
              {petak.cta} →
            </button>
          )}
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
  // Tiered milestone narrative — kasih konteks naratif per tahap progress
  // restorasi, bukan cuma "X dari Y". Tone match intro/petak (cerita-
  // rakyat omniscient, simple casual Indonesian).
  const nextLabel = (() => {
    if (count >= fullRestore)
      return 'Rak perpustakaan berdiri lagi. Kota pulih sepenuhnya.';
    if (count >= MAP_THRESHOLDS.r3Restore)
      return 'Telaga terisi air, teratai mekar. Lanjut ke 7.000 untuk perpustakaan pulih.';
    if (count >= MAP_THRESHOLDS.r2Unlock)
      return 'Menara jam pulih, perpustakaan terbuka. Lanjut ke 6.000 untuk telaga pulih.';
    if (count >= MAP_THRESHOLDS.r3Unlock)
      return 'Lorong terisi cahaya, telaga terbuka. Lanjut ke 5.000 untuk perpustakaan buka & menara pulih.';
    if (count >= MAP_THRESHOLDS.r4Unlock)
      return 'Jam kota mulai jalan — separuh. Lanjut ke 4.000 untuk lorong & telaga buka.';
    if (count >= MAP_THRESHOLDS.mapUnlock)
      return 'Peta terbuka — kota mulai inget bentuknya. Lanjut ke 3.000 untuk menara jam buka.';
    return `Pulih sepenuhnya di ${fullRestore.toLocaleString('id-ID')}`;
  })();
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
          Dulu, di sini, ada kota yang dibangun dari cinta.
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
          Sekarang sunyi — pohon-pohon mati,
          <br className="hidden sm:inline" />
          {' '}telaga mengering, jejak hilang ditelan pasir.
          <br className="hidden sm:inline" />
          {' '}Tapi kota ini gak bener-bener mati.
          <br className="hidden sm:inline" />
          {' '}Dia cuma nungguin kebaikan kembali datang.
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
  const [hoveredArsip, setHoveredArsip] = useState(false);
  const [hoveredMenara, setHoveredMenara] = useState(false);
  const [hoveredPanggung, setHoveredPanggung] = useState(false);
  const [hoveredAirMancur, setHoveredAirMancur] = useState(false);
  const [selectedPetak, setSelectedPetak] = useState(null);
  const [petakPreview, setPetakPreview] = useState(null);
  const [flyInActive, setFlyInActive] = useState(true);
  const compassRotateRef = useRef(null);

  // Purified — full city restoration (count >= 7000). Diteruskan ke
  // AmbientAudio (swell + shimmer) di samping dipakai di scene.
  // Dev override `?purified=1` paksa state purified utk preview tanpa
  // nunggu count naik. Gated import.meta.env.DEV — production diabaikan.
  const purifiedOverride =
    import.meta.env.DEV && searchParams.get('purified') === '1';
  const purified =
    purifiedOverride ||
    (armeniacaLoaded && armeniacaCount >= MAP_THRESHOLDS.fullRestore);
  // Continuous purify progress 0-1 — drives gradual atmosphere lerp
  // (fog, background, lights) yg smooth dari drought ke restored,
  // bukan flip discrete di milestone tunggal. Milestone-gated elements
  // (CobblestonePath, JizoStatue, dll.) tetap discrete via `purified`.
  // Mulai dari mapUnlock (2000) — sebelum peta buka, progress 0.
  // Hit fullRestore (7000) → progress 1. Linear interp di antaranya.
  // Dev override `?purifyProgress=N` (0-1) buat preview tier custom.
  const purifyProgress = useMemo(() => {
    if (import.meta.env.DEV) {
      const override = searchParams.get('purifyProgress');
      if (override !== null) {
        const n = parseFloat(override);
        if (!Number.isNaN(n)) return Math.max(0, Math.min(1, n));
      }
    }
    if (purified) return 1;
    if (!armeniacaLoaded) return 0;
    const min = MAP_THRESHOLDS.mapUnlock;
    const max = MAP_THRESHOLDS.fullRestore;
    if (armeniacaCount <= min) return 0;
    return Math.max(0, Math.min(1, (armeniacaCount - min) / (max - min)));
  }, [armeniacaCount, armeniacaLoaded, purified, searchParams]);
  // Compute telaga visual state dari live count:
  //   <4000 = locked, 4000-5999 = drought, >=6000 = restored
  // Purified override: paksa 'restored' supaya petak konsisten sama
  // ambient state (kalau full purified, semua petak emang udah restored
  // by count anyway — override cuma matter di dev preview).
  const telagaState = useMemo(() => {
    if (purified) return 'restored';
    if (!armeniacaLoaded) return 'locked';
    if (armeniacaCount >= MAP_THRESHOLDS.r3Restore) return 'restored';
    if (armeniacaCount >= MAP_THRESHOLDS.r3Unlock) return 'drought';
    return 'locked';
  }, [armeniacaCount, armeniacaLoaded, purified]);
  // Arsip visual state (mirror Telaga 3-tier):
  //   <5000 = locked, 5000-6999 = drought, >=7000 = restored
  const arsipState = useMemo(() => {
    if (purified) return 'restored';
    if (!armeniacaLoaded) return 'locked';
    if (armeniacaCount >= MAP_THRESHOLDS.r2Restore) return 'restored';
    if (armeniacaCount >= MAP_THRESHOLDS.r2Unlock) return 'drought';
    return 'locked';
  }, [armeniacaCount, armeniacaLoaded, purified]);
  // Menara Jam visual state (early-game tier — pertama unlocked):
  //   <3000 = locked, 3000-4999 = drought, >=5000 = restored
  const menaraState = useMemo(() => {
    if (purified) return 'restored';
    if (!armeniacaLoaded) return 'locked';
    if (armeniacaCount >= MAP_THRESHOLDS.r4Restore) return 'restored';
    if (armeniacaCount >= MAP_THRESHOLDS.r4Unlock) return 'drought';
    return 'locked';
  }, [armeniacaCount, armeniacaLoaded, purified]);
  // Panggung Terbuka visual state (mid-game, di SE ring):
  //   <4500 = locked, 4500-6499 = drought, >=6500 = restored
  const panggungState = useMemo(() => {
    if (purified) return 'restored';
    if (!armeniacaLoaded) return 'locked';
    if (armeniacaCount >= MAP_THRESHOLDS.r5Restore) return 'restored';
    if (armeniacaCount >= MAP_THRESHOLDS.r5Unlock) return 'drought';
    return 'locked';
  }, [armeniacaCount, armeniacaLoaded, purified]);
  // Air Mancur tier — 7 step continuous progression (0=hidden, 6=epilog
  // dengan bunga aprikot). Beda dari petak lain — tetep tumbuh past 7k
  // fullRestore sampai 10k. Dev override `?airmancur=N` (0-6) buat
  // preview tier tanpa nunggu count naik. Purified state (count >=7k
  // atau ?purified=1) langsung force ke T6 — preview hasil akhir, sync
  // sama treatment landmark lain yg di-treat 'restored' di purified.
  const airMancurTier = useMemo(() => {
    if (import.meta.env.DEV) {
      const override = searchParams.get('airmancur');
      if (override !== null) {
        const n = parseInt(override, 10);
        if (!Number.isNaN(n)) return Math.max(0, Math.min(6, n));
      }
    }
    if (purified) return 6;
    if (!armeniacaLoaded) return 0;
    if (armeniacaCount >= MAP_THRESHOLDS.airMancurT6) return 6;
    if (armeniacaCount >= MAP_THRESHOLDS.airMancurT5) return 5;
    if (armeniacaCount >= MAP_THRESHOLDS.airMancurT4) return 4;
    if (armeniacaCount >= MAP_THRESHOLDS.airMancurT3) return 3;
    if (armeniacaCount >= MAP_THRESHOLDS.airMancurT2) return 2;
    if (armeniacaCount >= MAP_THRESHOLDS.airMancurT1) return 1;
    return 0;
  }, [armeniacaCount, armeniacaLoaded, searchParams, purified]);
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
        hoveredTelaga ||
        hoveredArsip ||
        hoveredMenara ||
        hoveredPanggung ||
        hoveredAirMancur);
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
    hoveredArsip,
    hoveredMenara,
    hoveredPanggung,
    hoveredAirMancur,
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

  // Arsip handlers — perpustakaan di timur (mirror Telaga). Preview info
  // dipilih dari 3 varian (locked/drought/restored) berdasarkan computed arsipState.
  const handleArsipHover = () => {
    if (flyInActive) return;
    setHoveredArsip(true);
  };
  const handleArsipOut = () => setHoveredArsip(false);
  const handleArsipClick = () => {
    if (flyInActive) return;
    const info =
      arsipState === 'restored'
        ? PETA_PETAK_INFO.arsipRestored
        : arsipState === 'drought'
        ? PETA_PETAK_INFO.arsipDrought
        : PETA_PETAK_INFO.arsipLocked;
    setPetakPreview(info);
  };

  // Menara handlers — clock tower di utara (z=-8, lebih jauh dari hub).
  // Preview info dipilih dari 3 varian berdasarkan computed menaraState.
  const handleMenaraHover = () => {
    if (flyInActive) return;
    setHoveredMenara(true);
  };
  const handleMenaraOut = () => setHoveredMenara(false);
  const handleMenaraClick = () => {
    if (flyInActive) return;
    const info =
      menaraState === 'restored'
        ? PETA_PETAK_INFO.menaraRestored
        : menaraState === 'drought'
        ? PETA_PETAK_INFO.menaraDrought
        : PETA_PETAK_INFO.menaraLocked;
    setPetakPreview(info);
  };

  // Panggung handlers — anfiteater di SE ring [5, 0, 5]. Preview info
  // dipilih dari 3 varian berdasarkan computed panggungState.
  const handlePanggungHover = () => {
    if (flyInActive) return;
    setHoveredPanggung(true);
  };
  const handlePanggungOut = () => setHoveredPanggung(false);
  const handlePanggungClick = () => {
    if (flyInActive) return;
    const info =
      panggungState === 'restored'
        ? PETA_PETAK_INFO.panggungRestored
        : panggungState === 'drought'
        ? PETA_PETAK_INFO.panggungDrought
        : PETA_PETAK_INFO.panggungLocked;
    setPetakPreview(info);
  };

  // Air Mancur handlers — micro-landmark di plaza tengah. Click buka
  // modal status (no nav) yg show live count + tier percent. longDesc
  // dikomposisi dinamis per tier biar nyambung sama visual state.
  const handleAirMancurHover = () => {
    if (flyInActive) return;
    setHoveredAirMancur(true);
  };
  const handleAirMancurOut = () => setHoveredAirMancur(false);
  const handleAirMancurClick = () => {
    if (flyInActive) return;
    const tier = airMancurTier;
    const countLabel = armeniacaCount.toLocaleString('id-ID');
    const ceiling = MAP_THRESHOLDS.airMancurT6;
    const pct = Math.min(100, Math.round((armeniacaCount / ceiling) * 100));
    const tierMeta = {
      0: {
        eyebrow: 'Belum muncul',
        desc:
          'Plaza tengah kota masih kosong — cuma tanah retak. Air mancur baru bakal muncul setelah 2.000 siraman terkumpul di Pohon. Sampai saat itu, plaza ini nungguin.',
        accent: '#9aa0a8',
      },
      1: {
        eyebrow: 'Reruntuhan',
        desc:
          'Basin air mancur ditemuin lagi — retak, lengan patung di pusatnya tergeletak di sekitar. Belum ada air. Tapi setidaknya, plaza-nya udah keinget bentuknya.',
        accent: '#8a7868',
      },
      2: {
        eyebrow: 'Genangan tipis',
        desc:
          'Lengan patung balik nempel — sambungannya masih keliatan. Di dasar basin, genangan tipis pertama. Refleksi langit pulang, walau cuma sebentar tiap angin lewat.',
        accent: '#a89878',
      },
      3: {
        eyebrow: 'Tetesan',
        desc:
          'Tetesan tipis turun dari tangan patung ke basin. Belum mancur — tapi udah gak diem. Air mulai inget jalan pulangnya.',
        accent: '#a8b8c8',
      },
      4: {
        eyebrow: 'Setengah pulih',
        desc:
          'Air mancur jalan setengah tinggi. Droplets jatuh teratur, riak ripple di permukaan. Plaza ini mulai kerasa kayak tempat orang berhenti sejenak — bukan cuma lewat.',
        accent: '#8ab0c8',
      },
      5: {
        eyebrow: 'Air mengalir',
        desc:
          'Air mancur penuh, droplets banyak. Pas malem, ada glow hangat tipis dari bawah patung — kayak ada yang ngingetin: tempat ini hidup, walau sepi.',
        accent: '#c8e0f0',
      },
      6: {
        eyebrow: 'Mekar lagi',
        desc:
          'Air mancur full, dan di rim basin — empat kuncup aprikot kecil tumbuh. Akarnya dari air yang lo bantu balikin. Plaza ini gak cuma pulih; dia jadi tempat hidup baru tumbuh.',
        accent: '#f4c8d8',
      },
    };
    const meta = tierMeta[tier];
    const longDesc =
      tier === 0
        ? meta.desc
        : `${meta.desc}\n\n${countLabel} kebaikan terkumpul · air mancur ${pct}% menuju mekar penuh.`;
    setPetakPreview({
      id: 'airmancur',
      name: 'Air Mancur Plaza',
      eyebrow: meta.eyebrow,
      longDesc,
      accent: meta.accent,
      statusOnly: true,
    });
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
            onCreated={({ camera, gl }) => {
              camera.lookAt(0, 0, 0);
              // Bump tone mapping exposure (default 1.0) — push highlight
              // pop + perceived contrast. Bekerja barengan ToneMapping
              // ACES_FILMIC postprocess (renderer scales linear input
              // sebelum tonemap, dapet brighter highlight tanpa clipping).
              gl.toneMappingExposure = 1.5;
            }}
          >
            <TamanScene
              hoveredPetakId={hoveredPetakId}
              hoveredCenter={hoveredCenter}
              hoveredGerbang={hoveredGerbang}
              hoveredLorong={hoveredLorong}
              hoveredTelaga={hoveredTelaga}
              hoveredArsip={hoveredArsip}
              hoveredMenara={hoveredMenara}
              hoveredPanggung={hoveredPanggung}
              hoveredAirMancur={hoveredAirMancur}
              previewedPetak={previewedPetak}
              flyInActive={flyInActive}
              isMobile={isMobile}
              restorationLevel={restorationLevel}
              modalOpen={Boolean(selectedPetak) || Boolean(petakPreview)}
              telagaState={telagaState}
              arsipState={arsipState}
              menaraState={menaraState}
              panggungState={panggungState}
              airMancurTier={airMancurTier}
              armeniacaCount={armeniacaCount}
              armeniacaLoaded={armeniacaLoaded}
              purified={purified}
              purifyProgress={purifyProgress}
              compassRotateRef={compassRotateRef}
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
              onArsipHover={handleArsipHover}
              onArsipOut={handleArsipOut}
              onArsipClick={handleArsipClick}
              onMenaraHover={handleMenaraHover}
              onMenaraOut={handleMenaraOut}
              onMenaraClick={handleMenaraClick}
              onPanggungHover={handlePanggungHover}
              onPanggungOut={handlePanggungOut}
              onPanggungClick={handlePanggungClick}
              onAirMancurHover={handleAirMancurHover}
              onAirMancurOut={handleAirMancurOut}
              onAirMancurClick={handleAirMancurClick}
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
                <Vignette eskil={false} offset={0.28} darkness={0.78} />
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
        {/* Intro narasi first-visit — auto-fade in setelah FlyInCamera
            selesai, persisted via localStorage. */}
        {!petakPreview && <TamanPetaIntroTitle />}
        <AmbientAudio position="top-right" />
        <RotateRecommendation />
        {/* Compass widget — N selalu tunjuk world -Z direction. Rotates
            via CompassTracker (useFrame ref-mutation, no React re-render). */}
        <div className="pointer-events-none absolute bottom-6 right-4 md:bottom-8 md:right-6 z-10 w-12 h-12 md:w-14 md:h-14">
          <div className="relative w-full h-full rounded-full bg-black/35 backdrop-blur-sm ring-1 ring-white/15 flex items-center justify-center">
            <div
              ref={compassRotateRef}
              className="absolute inset-1"
              style={{ willChange: 'transform' }}
            >
              <span className="absolute top-0 left-1/2 -translate-x-1/2 text-white/85 text-[9px] md:text-[10px] font-bold leading-none">
                N
              </span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white/45 text-[8px] md:text-[9px] leading-none">
                S
              </span>
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-white/45 text-[8px] md:text-[9px] leading-none">
                W
              </span>
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-white/45 text-[8px] md:text-[9px] leading-none">
                E
              </span>
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/50" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TamanPetaPage;
