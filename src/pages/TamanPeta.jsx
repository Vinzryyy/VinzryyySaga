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
// 4000 = r1 restored + r3 unlocked drought, 5000 = r2 (Perpustakaan)
// unlocked drought, 6000 = r3 restored, 7000 = r2 restored (pulih
// penuh — milestone akhir).
const MAP_THRESHOLDS = {
  mapUnlock: 2000,
  r1Restore: 4000,
  r3Unlock: 4000,
  r2Unlock: 5000,
  r3Restore: 6000,
  r2Restore: 7000,
  fullRestore: 7000,
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
  purified = false,
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
            {/* === MEGAH RESTORED VARIANT === */}
            {/* 2-tiered stone steps — kasih landing feel, foundation
                naik dari ground. Wider lalu smaller (classical pediment). */}
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[2.05, 0.08, 1.75]} />
              <meshStandardMaterial color="#a89070" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[1.9, 0.08, 1.6]} />
              <meshStandardMaterial color="#b8a080" roughness={0.85} />
            </mesh>

            {/* Cream-stone foundation — warm marble tone, taller dari
                versi ruin (0.1 → 0.16) supaya bangunan kerasa "berdiri". */}
            <mesh position={[0, 0.24, 0]}>
              <boxGeometry args={[1.65, 0.16, 1.35]} />
              <meshStandardMaterial color="#c8b090" roughness={0.8} />
            </mesh>

            {/* Walls — cream-marble warm, taller (0.9 → 1.3), 3 sides
                solid + front wall split by doorway opening tengah. */}
            <mesh position={[0.62, 0.97, 0]}>
              <boxGeometry args={[0.14, 1.3, 1.3]} />
              <meshStandardMaterial color="#d8c4a0" roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.97, -0.62]}>
              <boxGeometry args={[1.4, 1.3, 0.14]} />
              <meshStandardMaterial color="#d8c4a0" roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.97, 0.62]}>
              <boxGeometry args={[1.4, 1.3, 0.14]} />
              <meshStandardMaterial color="#d8c4a0" roughness={0.75} />
            </mesh>
            {/* Front wall sections — flanking doorway (opening z=-0.25..0.25) */}
            <mesh position={[-0.62, 0.97, -0.45]}>
              <boxGeometry args={[0.14, 1.3, 0.34]} />
              <meshStandardMaterial color="#d8c4a0" roughness={0.75} />
            </mesh>
            <mesh position={[-0.62, 0.97, 0.45]}>
              <boxGeometry args={[0.14, 1.3, 0.34]} />
              <meshStandardMaterial color="#d8c4a0" roughness={0.75} />
            </mesh>
            {/* Lintel above doorway opening */}
            <mesh position={[-0.62, 1.5, 0]}>
              <boxGeometry args={[0.14, 0.22, 0.58]} />
              <meshStandardMaterial color="#c8b090" roughness={0.8} />
            </mesh>

            {/* 2 freestanding columns flanking doorway entrance, fluted
                cylinders w/ box capital. Classical portico vibe. */}
            {[-0.5, 0.5].map((z, i) => (
              <React.Fragment key={`col-${i}`}>
                {/* Column base plinth */}
                <mesh position={[-0.85, 0.35, z]}>
                  <boxGeometry args={[0.16, 0.08, 0.16]} />
                  <meshStandardMaterial color="#b8a080" roughness={0.85} />
                </mesh>
                {/* Column shaft */}
                <mesh position={[-0.85, 0.85, z]}>
                  <cylinderGeometry args={[0.07, 0.08, 0.95, 12]} />
                  <meshStandardMaterial color="#e8d8b8" roughness={0.7} />
                </mesh>
                {/* Column capital */}
                <mesh position={[-0.85, 1.34, z]}>
                  <boxGeometry args={[0.18, 0.07, 0.18]} />
                  <meshStandardMaterial color="#c8b090" roughness={0.8} />
                </mesh>
              </React.Fragment>
            ))}
            {/* Pediment/cornice spanning both columns + lintel */}
            <mesh position={[-0.85, 1.42, 0]}>
              <boxGeometry args={[0.22, 0.09, 1.3]} />
              <meshStandardMaterial color="#b8a080" roughness={0.8} />
            </mesh>
            {/* Triangular pediment top — flat box approximating apex */}
            <mesh position={[-0.85, 1.52, 0]}>
              <boxGeometry args={[0.2, 0.1, 0.6]} />
              <meshStandardMaterial color="#c8b090" roughness={0.8} />
            </mesh>

            {/* Hanging lanterns — 2 flanking the doorway, brass warm
                glow. Refs di-track utk flicker animation. */}
            {[-0.55, 0.55].map((z, i) => (
              <React.Fragment key={`lantern-${i}`}>
                {/* String holding lantern to portico cornice */}
                <mesh position={[-0.95, 1.27, z]}>
                  <boxGeometry args={[0.012, 0.18, 0.012]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.95} />
                </mesh>
                {/* Lantern body — brass cube */}
                <mesh position={[-0.95, 1.08, z]}>
                  <boxGeometry args={[0.09, 0.16, 0.09]} />
                  <meshStandardMaterial
                    ref={(el) => (lanternMatRefs.current[i] = el)}
                    color="#e8a460"
                    emissive="#d49060"
                    emissiveIntensity={0.7}
                    roughness={0.5}
                  />
                </mesh>
                {/* Lantern top cap */}
                <mesh position={[-0.95, 1.18, z]}>
                  <boxGeometry args={[0.11, 0.02, 0.11]} />
                  <meshStandardMaterial color="#7a5230" roughness={0.7} />
                </mesh>
              </React.Fragment>
            ))}

            {/* Sign plaque — brass tone, bigger di restored */}
            <mesh position={[-1.02, 1.0, 0]}>
              <boxGeometry args={[0.03, 0.18, 0.42]} />
              <meshStandardMaterial
                color="#b88848"
                emissive="#b88848"
                emissiveIntensity={0.12}
                roughness={0.6}
              />
            </mesh>

            {/* Tumpukan buku interior — vibrant warna restored (mirror
                vibrant palette inside scene), visible lewat doorway. */}
            <mesh position={[-0.35, 0.42, 0.18]} rotation={[0, 0.2, 0]}>
              <boxGeometry args={[0.18, 0.05, 0.13]} />
              <meshStandardMaterial color="#9a4548" roughness={0.85} />
            </mesh>
            <mesh position={[-0.34, 0.47, 0.2]} rotation={[0, -0.1, 0.05]}>
              <boxGeometry args={[0.17, 0.05, 0.12]} />
              <meshStandardMaterial color="#3a5a78" roughness={0.85} />
            </mesh>
            <mesh position={[-0.28, 0.54, 0.3]} rotation={[0, 0.6, 0.4]}>
              <boxGeometry args={[0.12, 0.18, 0.04]} />
              <meshStandardMaterial color="#9a7838" roughness={0.85} />
            </mesh>

            {/* Stained-glass window — east wall, tall + rich rose-amber
                glow w/ cross trim. Replaces drought's small dark slit. */}
            <mesh position={[0.7, 0.95, 0]}>
              <boxGeometry args={[0.04, 0.7, 0.7]} />
              <meshStandardMaterial
                ref={windowMatRef}
                color="#e84878"
                emissive="#e84878"
                emissiveIntensity={0.45}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>
            {/* Cross-shape trim — 2 thin bands forming + over window */}
            <mesh position={[0.72, 0.95, 0]}>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
              <meshStandardMaterial color="#5a4030" roughness={0.85} />
            </mesh>
            <mesh position={[0.72, 0.95, 0]}>
              <boxGeometry args={[0.05, 0.05, 0.7]} />
              <meshStandardMaterial color="#5a4030" roughness={0.85} />
            </mesh>

            {/* Roof — main flat slab cream marble */}
            <mesh position={[0, 1.7, 0]}>
              <boxGeometry args={[1.55, 0.1, 1.45]} />
              <meshStandardMaterial color="#a89070" roughness={0.85} />
            </mesh>
            {/* Roof cornice — slight overhang darker trim */}
            <mesh position={[0, 1.76, 0]}>
              <boxGeometry args={[1.7, 0.04, 1.55]} />
              <meshStandardMaterial color="#7a6850" roughness={0.85} />
            </mesh>

            {/* Dome — small hemisphere centered atas roof */}
            <mesh position={[0, 1.78, 0]}>
              <sphereGeometry args={[0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#d8c4a0" roughness={0.7} />
            </mesh>
            {/* Dome trim band at base */}
            <mesh position={[0, 1.78, 0]}>
              <torusGeometry args={[0.42, 0.025, 8, 24]} />
              <meshStandardMaterial color="#b88848" roughness={0.6} />
            </mesh>
            {/* Dome finial — brass spike on top */}
            <mesh position={[0, 2.22, 0]}>
              <coneGeometry args={[0.045, 0.16, 8]} />
              <meshStandardMaterial
                color="#d4a050"
                emissive="#b88848"
                emissiveIntensity={0.25}
                roughness={0.55}
              />
            </mesh>

            {/* Subtle scar — pojok atap NW slightly indented (notch).
                "Yang bertahan, bukan yang utuh dari awal" — luka kota
                tetep ditinggal walau megah. */}
            <mesh position={[-0.68, 1.7, -0.62]}>
              <boxGeometry args={[0.22, 0.06, 0.22]} />
              <meshStandardMaterial color="#5a4830" roughness={1} />
            </mesh>
          </>
        ) : (
          <>
            {/* === RUIN VARIANT (drought + locked) === */}
            {/* Foundation — segi-empat low di base. Dark warm tone match
                peta dusty palette (bukan cream cerah — bangunan harus
                kerasa "weathered ruin" bukan landmark utama). */}
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[1.6, 0.2, 1.3]} />
              <meshStandardMaterial
                color="#3a2820"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>

            {/* 3 dinding utuh (back + 2 sides) + 1 dinding sengaja dipotong.
                Tone selaras CityRuins/Telaga warm browns. */}
            <mesh position={[0.6, 0.65, 0]}>
              <boxGeometry args={[0.12, 0.9, 1.3]} />
              <meshStandardMaterial
                color="#4a3528"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            <mesh position={[0, 0.65, -0.6]}>
              <boxGeometry args={[1.32, 0.9, 0.12]} />
              <meshStandardMaterial
                color="#5a4030"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            <mesh position={[0, 0.65, 0.6]}>
              <boxGeometry args={[1.32, 0.9, 0.12]} />
              <meshStandardMaterial
                color="#5a4030"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            <mesh position={[-0.6, 0.4, -0.3]}>
              <boxGeometry args={[0.12, 0.4, 0.6]} />
              <meshStandardMaterial
                color="#4a3528"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>

            {/* Doorway frame + sign plaque + interior books — skip kalau
                locked. Building shape doang yang muncul (silhouette). */}
            {!isLocked && (
              <>
                <mesh position={[-0.66, 0.45, 0.55]}>
                  <boxGeometry args={[0.06, 0.5, 0.06]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.95} />
                </mesh>
                <mesh position={[-0.66, 0.45, 0.05]}>
                  <boxGeometry args={[0.06, 0.5, 0.06]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.95} />
                </mesh>
                <mesh position={[-0.66, 0.78, 0.3]}>
                  <boxGeometry args={[0.06, 0.08, 0.6]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.95} />
                </mesh>
                <mesh position={[-0.72, 0.93, 0.3]}>
                  <boxGeometry args={[0.03, 0.15, 0.32]} />
                  <meshStandardMaterial color="#4a3528" roughness={0.85} />
                </mesh>
                <mesh position={[-0.69, 0.86, 0.2]}>
                  <boxGeometry args={[0.012, 0.05, 0.012]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.95} />
                </mesh>
                <mesh position={[-0.69, 0.86, 0.4]}>
                  <boxGeometry args={[0.012, 0.05, 0.012]} />
                  <meshStandardMaterial color="#3a2418" roughness={0.95} />
                </mesh>
                <mesh position={[-0.35, 0.27, 0.3]} rotation={[0, 0.2, 0]}>
                  <boxGeometry args={[0.18, 0.05, 0.13]} />
                  <meshStandardMaterial color="#5a3025" roughness={0.9} />
                </mesh>
                <mesh position={[-0.34, 0.32, 0.32]} rotation={[0, -0.1, 0.05]}>
                  <boxGeometry args={[0.17, 0.05, 0.12]} />
                  <meshStandardMaterial color="#3a3858" roughness={0.9} />
                </mesh>
                <mesh position={[-0.28, 0.39, 0.42]} rotation={[0, 0.6, 0.4]}>
                  <boxGeometry args={[0.12, 0.18, 0.04]} />
                  <meshStandardMaterial color="#5a4830" roughness={0.9} />
                </mesh>
              </>
            )}

            {/* Lock cube di depan doorway — sinyal visual "belum bisa
                masuk", mirror Telaga locked treatment. */}
            {isLocked && (
              <mesh position={[-0.5, 0.45, 0.3]}>
                <boxGeometry args={[0.18, 0.18, 0.1]} />
                <meshStandardMaterial color="#5a5048" roughness={1} />
              </mesh>
            )}

            {/* Window — drought: gelap solid. Locked: solid + muted
                opacity. */}
            <mesh position={[0.54, 0.6, 0]}>
              <boxGeometry args={[0.04, 0.35, 0.5]} />
              <meshStandardMaterial
                color="#2a1812"
                roughness={0.6}
                transparent
                opacity={baseOpacity}
              />
            </mesh>

            {/* Atap — beam kayu paralel sumbu z. Pojok depan-atas sengaja
                tidak ditutup (atap jebol signature). */}
            <mesh position={[0.25, 1.15, 0]} rotation={[0, 0, -0.06]}>
              <boxGeometry args={[1.1, 0.08, 1.4]} />
              <meshStandardMaterial
                color="#3a2820"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            <mesh position={[-0.45, 1.0, 0.3]} rotation={[0.3, 0, -0.4]}>
              <boxGeometry args={[0.5, 0.06, 0.06]} />
              <meshStandardMaterial
                color="#3a2820"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
            <mesh position={[-0.55, 0.95, -0.1]} rotation={[0, 0.3, 0.5]}>
              <boxGeometry args={[0.06, 0.06, 0.4]} />
              <meshStandardMaterial
                color="#3a2820"
                roughness={0.95}
                transparent
                opacity={baseOpacity}
              />
            </mesh>
          </>
        )}
      </group>

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
    </group>
  );
};

// Lantai taman — plane besar dengan grid tipis untuk persepsi skala.
//   drought  → dark warm sandy "desert dusk" (#2a2018)
//   purified → warm-moss green; grid color hampir merge sama floor
//              supaya gak kelihatan banding "lubang"
const TamanFloor = ({ purified = false }) => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial
        color={purified ? '#3e4a30' : '#2a2018'}
        roughness={1}
      />
    </mesh>
    <gridHelper
      args={[
        40,
        40,
        purified ? '#3e4a30' : '#3a2c22',
        purified ? '#3e4a30' : '#2a2018',
      ]}
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
// DroughtRing — outer ground surrounding the inner petak hex.
//   drought  → sand wasteland (deep amber-sand + bleached ring + dry
//              patches). Pemulihan visible via saplings yg tumbuh
//              DI ANTARA, gak ngubah desert itu sendiri.
//   purified → meadow (lush green carpet bridging dari petak hex ke
//              outer floor seamless, gak ada banding "lubang" gap).
//              Patches jadi flower beds.
const DroughtRing = ({ purified = false }) => (
  <>
    {/* Outer ring — sand amber (drought) atau warm-moss (purified).
        Purified pakai tone match floor base supaya boundary radius 19
        gak kerasa cliff color shift. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <ringGeometry args={[9.5, 19, 64]} />
      <meshStandardMaterial
        color={purified ? '#445230' : '#5a3520'}
        roughness={1}
      />
    </mesh>
    {/* Inner meadow carpet — purified: full disc (0-11.5) nutup pusat
        hex juga supaya gak ada dark moss "hole" di tengah scene yang
        keliatan kayak floor base color bocor. Drought tetep narrow
        band 9.5-11.5 (sun-bleached transition). Y=0.0015 di bawah
        petak pedestal (0.04+) + visited halo (0.025+), gak z-fight. */}
    {purified ? (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
        <circleGeometry args={[11.5, 64]} />
        <meshStandardMaterial
          color="#5a7038"
          roughness={1}
          transparent
          opacity={0.92}
        />
      </mesh>
    ) : (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
        <ringGeometry args={[9.5, 11.5, 64]} />
        <meshStandardMaterial
          color="#7a5535"
          roughness={1}
          transparent
          opacity={0.75}
        />
      </mesh>
    )}
    {/* Scattered patches — dry sand (drought) atau flower bed (purified).
        Purified: tone shift closer to meadow (#6a8848) supaya gak
        kerasa "spot" terang nge-pop kayak lubang/bercak. */}
    {DROUGHT_PATCH_DEFS.map((p, i) => (
      <mesh
        key={`dp-${i}`}
        rotation={[-Math.PI / 2, 0, p.rot]}
        position={p.pos}
        scale={p.scale}
      >
        <circleGeometry args={[0.5, 8]} />
        <meshStandardMaterial
          color={purified ? '#6a8848' : '#8a6535'}
          roughness={1}
        />
      </mesh>
    ))}
  </>
);

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
// (~-5.3, 1.5) ke PicnicSet (-2.5, 2.2). Bridge jadi connector, bukan
// dead-end. Slight tilt rotation per stone supaya organik.
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
    dropRef.current.material.opacity =
      0.5 + Math.sin(t * 2.5 + pos[0]) * 0.4;
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

// PicnicSet — kasur jalin (blanket) plus basket plus item kecil di rumput
// dekat WoodenBridge. Naratif: domestic life balik, ada yg sempetin
// piknik di taman.
const PicnicSet = ({ pos = [-2.5, 0, 2.2], rot = 0.4 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    {/* Blanket — checkered cream/peach square */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <planeGeometry args={[1.2, 1.0]} />
      <meshStandardMaterial color="#f4d8b0" roughness={0.95} />
    </mesh>
    {/* Checkered overlay — 4 lighter squares */}
    {[
      [-0.3, 0.014, -0.25],
      [0.3, 0.014, -0.25],
      [-0.3, 0.014, 0.25],
      [0.3, 0.014, 0.25],
    ].map((p, i) => (
      <mesh
        key={`check-${i}`}
        rotation={[-Math.PI / 2, 0, 0]}
        position={p}
      >
        <planeGeometry args={[0.5, 0.4]} />
        <meshStandardMaterial color="#f8e8c8" roughness={0.95} />
      </mesh>
    ))}
    {/* Basket — woven brown cube + handle arch */}
    <group position={[-0.35, 0.1, -0.15]}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.18]} />
        <meshStandardMaterial color="#8a6038" roughness={0.95} />
      </mesh>
      {/* Handle — torus arch */}
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.012, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#5a3e25" roughness={0.95} />
      </mesh>
    </group>
    {/* Apple — small red sphere on blanket */}
    <mesh position={[0.2, 0.05, 0.1]}>
      <sphereGeometry args={[0.05, 8, 6]} />
      <meshStandardMaterial color="#d44848" roughness={0.7} />
    </mesh>
    {/* Bread loaf — small oblong */}
    <mesh position={[0.05, 0.04, -0.2]} rotation={[0, 0.3, 0]}>
      <boxGeometry args={[0.18, 0.08, 0.1]} />
      <meshStandardMaterial color="#d8a868" roughness={0.85} />
    </mesh>
    {/* Mug — small cylinder */}
    <mesh position={[0.3, 0.05, -0.05]}>
      <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
      <meshStandardMaterial color="#e8e8e0" roughness={0.7} />
    </mesh>
  </group>
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

const TamanScene = ({
  hoveredPetakId,
  hoveredCenter,
  hoveredGerbang,
  hoveredLorong,
  hoveredTelaga,
  hoveredArsip,
  previewedPetak,
  flyInActive,
  isMobile = false,
  restorationLevel = 0,
  modalOpen = false,
  telagaState = 'locked',
  arsipState = 'drought',
  armeniacaCount = 0,
  armeniacaLoaded = false,
  purified = false,
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
    hoveredArsip;

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

  return (
    <>
      {/* Palette — dua mode:
          drought  → desert dusk warm dusty rose horizon, dark plum zenith.
                     Sun baru tenggelam, langit simpan sisa warmth.
          purified → soft dawn rose + lighter background, fog mundur sedikit
                     (visibility lebih jauh — kota udah gak ngumpet di debu). */}
      <fog
        attach="fog"
        args={purified ? ['#7a5868', 18, 44] : ['#5a3540', 14, 38]}
      />
      <color attach="background" args={[purified ? '#3a2a35' : '#2a1f25']} />
      {/* Ambient — drought: warm-gray tone ("siang berdebu di kota mati").
          Purified: shift ke rose warmer + intensity naik (twilight ramah). */}
      <ambientLight
        intensity={purified ? 0.55 : 0.5}
        color={purified ? '#e0c0a8' : '#c0a090'}
      />
      {/* Key light — drought: amber pucat ("matahari nembus debu").
          Purified: golden hour cozy (peach-amber, intensity naik). */}
      <directionalLight
        position={[8, 12, 6]}
        intensity={purified ? 1.35 : 1.32}
        color={purified ? '#f8c898' : '#f4b078'}
      />
      {/* Fill — drought: warm dusty, shadow side ruins tetep keliatan.
          Purified: rose-amber warmer untuk wash atmosfer pulih. */}
      <directionalLight
        position={[-6, 8, -4]}
        intensity={purified ? 0.72 : 0.7}
        color={purified ? '#c8a890' : '#b8907a'}
      />
      <TamanFloor purified={purified} />
      <DroughtRing purified={purified} />
      {/* MossOverlay sengaja gak di-render — DroughtRing purified udah
          ngasih lush meadow carpet yg lebih lebar, MossOverlay patches
          jadi keliatan banding spot di atasnya. */}
      {purified && <CobblestonePath />}
      {purified && <StoneLanterns />}
      {purified && <LotusPads />}
      {purified && <Cattails />}
      {purified && <SteppingStones />}
      {purified && <Tsukubai />}
      {purified && !isMobile && <BambooCluster />}
      {purified && <FloatingPaperLanterns />}
      {purified && <JizoStatue />}
      {purified && <WoodenTorii />}
      {purified && <KoiShadows />}
      {purified && <WaterRipples />}
      {purified && <OmikujiStrips />}
      {purified && !isMobile && <WaterMist />}
      {purified && <MossyRimStones />}
      {purified && <WoodenSignpost />}
      {purified && <MossyBoulders isMobile={isMobile} />}
      {purified && <StoneBirdbath pos={[-1.8, 0, 1.5]} />}
      {purified && <VineCreeps />}
      {purified && <WildflowerBushes isMobile={isMobile} />}
      {purified && !isMobile && <StringLights />}
      {purified && <MushroomClusters />}
      {purified && <PicnicSet pos={[-2.5, 0, 2.2]} rot={0.4} />}
      {purified && !isMobile && <WindChimes pos={[-6.5, 1.6, -3.5]} />}
      {purified && !isMobile && <Hammock start={[-7, 1.4, 6]} end={[-4, 1.4, 8]} />}
      {purified && <FlowerClusters isMobile={isMobile} />}
      {purified && <GrassBlades isMobile={isMobile} />}
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
      <CompassTracker targetRef={compassRotateRef} />
      {/* Prasasti quotes — 3 fragmen worldbuilding scattered di scene */}
      <PrasastiQuotes />
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
      <PetaArsip
        hovered={hoveredArsip}
        visited={previewedPetak.has('arsip')}
        isMobile={isMobile}
        petakState={arsipState}
        onPointerOver={onArsipHover}
        onPointerOut={onArsipOut}
        onClick={onArsipClick}
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
};

// PetakPreviewModal — info panel yg muncul saat user click petak.
// Show name + description + CTA "Lanjut" yang trigger navigate. Modal
// dismiss via tap luar, button Batal, atau Escape.
const PetakPreviewModal = ({ petak, onClose, onConfirm }) => {
  if (!petak) return null;
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
  // Tiered milestone narrative — kasih konteks naratif per tahap progress
  // restorasi, bukan cuma "X dari Y". Tone match intro/petak (cerita-
  // rakyat omniscient, simple casual Indonesian).
  const nextLabel = (() => {
    if (count >= fullRestore)
      return 'Rak perpustakaan berdiri lagi. Kota pulih sepenuhnya.';
    if (count >= MAP_THRESHOLDS.r3Restore)
      return 'Telaga terisi air, teratai mekar. Lanjut ke 7.000 untuk perpustakaan pulih.';
    if (count >= MAP_THRESHOLDS.r2Unlock)
      return 'Perpustakaan terbuka — rak masih runtuh. Lanjut ke 6.000 untuk telaga pulih.';
    if (count >= MAP_THRESHOLDS.r3Unlock)
      return 'Lorong terisi cahaya, telaga terbuka. Lanjut ke 5.000 untuk perpustakaan buka.';
    if (count >= MAP_THRESHOLDS.mapUnlock)
      return 'Peta terbuka — kota mulai inget bentuknya. Lanjut ke 4.000 untuk lorong & telaga.';
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
        hoveredArsip);
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
              hoveredArsip={hoveredArsip}
              previewedPetak={previewedPetak}
              flyInActive={flyInActive}
              isMobile={isMobile}
              restorationLevel={restorationLevel}
              modalOpen={Boolean(selectedPetak) || Boolean(petakPreview)}
              telagaState={telagaState}
              arsipState={arsipState}
              armeniacaCount={armeniacaCount}
              armeniacaLoaded={armeniacaLoaded}
              purified={purified}
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
