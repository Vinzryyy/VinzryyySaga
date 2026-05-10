/**
 * Taman Kebaikan — Petak R1: Pohon-Pohon yang Mengingat.
 *
 * Petak pertama di /taman/peta yang punya isi konkret. Konsep:
 * jalur dengan pohon-pohon yang tumbuh seiring tahun, tiap pohon =
 * milestone karier Eli dari ELI_TIMELINE di src/data/eliProfile.js.
 *
 * View: top-down 3/4 isometric (sama palette dengan /taman/peta —
 * twilight evening). 10 pohon disusun alternating kiri-kanan di
 * sepanjang jalur dari z=-2 ke z=-32 (gap 3.3 unit per node). Tiap
 * pohon clickable: hover lift + glow, click buka modal info milestone.
 *
 * Vertical slice ini jadi template untuk 5 petak lain. Pattern yang
 * di-establish di sini (route /taman/rN, scene low-poly, hover/click
 * modal, header/footer minimal, palette match Peta Taman) bakal
 * di-replikasi untuk Petak Karya, Kolam Kata, dst.
 *
 * Performance: 10 pohon × ~6 mesh/pohon = 60 mesh total. Plus floor,
 * lighting, fog. Worst case 30+ fps di mobile dengan downscale.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Html,
  MeshReflectorMaterial,
  OrbitControls,
  PointerLockControls,
  Stats,
} from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
// Note: r3/utils.js berisi shared util taman (useIsMobile, lerp, dll).
// Saat petak ke-3+ butuh juga, consider pindahkan ke ../components/taman/utils.js
// (parent level) supaya nggak semantik "milik r3".
import { useIsMobile, lerp } from '../components/taman/r3/utils';
import { ELI_TIMELINE } from '../data/eliProfile';

// Layout konstan jalur. PATH_* tetap referensi ground (bench, swing,
// monument tied to z=-15..-32) — user "berdiri di taman" tetep di
// koridor ini. Bedanya: trees milestone udah pindah ke langit (lihat
// ERA_DEFS + skyPosition di bawah).
const PATH_START_Z = -2;
const PATH_END_Z = -32;
const PATH_X_OFFSET = 2.6; // alternating ±2.6 dari sumbu jalur (legacy)
// Orbit target naik ke mid-air supaya camera arc mendominan langit,
// bukan ground. User tetep liat tanah di edge view, tapi langit
// dominant.
const ORBIT_TARGET = [0, 6, -12];

// Era definitions — 7 era career Eli, masing-masing jadi 1 konstelasi
// di langit. azimuth = sudut horizontal dari -z (forward of garden),
// counterclockwise viewed from above. altitude 0..1 = horizon..zenith.
// Color = palette dominant per era; bintang individual mendapat
// gradient seputar warna ini. spread = scatter radius bintang dari
// center konstelasi (radian). Order matters — milestoneIds urutannya
// kronologis, line connections membentuk line dari oldest ke newest.
const SKY_RADIUS = 22;
const ERA_DEFS = [
  {
    id: 'trainee',
    name: 'Trainee',
    color: '#a8c0ff', // soft blue
    azimuth: 0.95, // upper-right of forward view
    altitude: 0.32,
    spread: 0.16,
    milestoneIds: ['audition', 'sousenkyo-2018', 'class-a'],
  },
  {
    id: 'theater',
    name: 'Theater',
    color: '#ffcc88', // warm amber
    azimuth: 0.55,
    altitude: 0.5,
    spread: 0.13,
    milestoneIds: ['theater-debut', 'team-kiii'],
  },
  {
    id: 'senbatsu',
    name: 'Senbatsu',
    color: '#ff9ec0', // pink
    azimuth: 0.18,
    altitude: 0.62,
    spread: 0.13,
    milestoneIds: ['show-100', 'first-senbatsu'],
  },
  {
    id: 'new-era',
    name: 'New Era',
    color: '#a4e8d0', // mint
    azimuth: -0.22,
    altitude: 0.7,
    spread: 0.18,
    milestoneIds: ['new-formation-2021', 'darashinai-aishikata', 'show-200'],
  },
  {
    id: 'mature',
    name: 'Mature',
    color: '#d8a8ff', // lavender
    azimuth: -0.62,
    altitude: 0.6,
    spread: 0.22,
    milestoneIds: [
      'sayonara-crawl',
      'spv-langit-biru-2024',
      'show-300',
      'undergirl-bibir-2024',
    ],
  },
  {
    id: 'variety',
    name: 'Variety',
    color: '#ffe6a0', // soft yellow
    azimuth: -0.95,
    altitude: 0.45,
    spread: 0.14,
    milestoneIds: ['belajar-konseling', 'pertaruhan-cinta-shonichi'],
  },
  {
    id: 'fight',
    name: 'JKT48 Fight',
    color: '#ff9080', // warm coral
    azimuth: -1.32,
    altitude: 0.3,
    spread: 0.26,
    milestoneIds: [
      'three-team-announce',
      'fight-tagline',
      'team-dream',
      'dream-bakudan-shonichi',
      'show-400',
    ],
  },
];

// Build flat lookup: milestoneId → { eraIdx, posInEra, eraDef }.
// Dipake saat compute star position deterministic per milestone.
const ERA_LOOKUP = (() => {
  const map = new Map();
  ERA_DEFS.forEach((era, eraIdx) => {
    era.milestoneIds.forEach((mid, posInEra) => {
      map.set(mid, { eraIdx, posInEra, eraDef: era });
    });
  });
  return map;
})();

// Hash sederhana → 0..1, deterministic per string. Dipake untuk
// per-milestone jitter posisi dalam konstelasi.
const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
};

// Convert (azimuth, altitude) → world XYZ on sky dome of SKY_RADIUS.
// User faces -z di scene → azimuth 0 = directly forward (-z).
// Azimuth positive = swing east (+x), negative = west (-x).
const skyPosition = (azimuth, altitude) => {
  const pitch = altitude * (Math.PI / 2); // 0=horizon, π/2=zenith
  const horizR = SKY_RADIUS * Math.cos(pitch);
  const y = SKY_RADIUS * Math.sin(pitch);
  const x = horizR * Math.sin(azimuth);
  const z = -horizR * Math.cos(azimuth);
  return [x, y, z];
};

// Position untuk milestone tertentu di konstelasi era-nya. Center era
// + jitter deterministic dari hashSeed per-milestone. posInEra dipake
// untuk arc pattern (bintang konstelasi gak pure random, tapi sedikit
// terstruktur supaya line connections form readable shape).
const milestoneSkyPosition = (milestoneId) => {
  const info = ERA_LOOKUP.get(milestoneId);
  if (!info) return [0, SKY_RADIUS * 0.6, -SKY_RADIUS * 0.5];
  const { eraDef, posInEra } = info;
  const total = eraDef.milestoneIds.length;
  // Arc spread within constellation — milestones distributed along an
  // arc centered at era.azimuth/altitude. Half-spread di kedua axis.
  const t = total === 1 ? 0 : posInEra / (total - 1) - 0.5;
  // Jitter from hash supaya gak terlalu uniform — pure arc kaku.
  const seedA = hashSeed(`${milestoneId}-a`) - 0.5;
  const seedB = hashSeed(`${milestoneId}-b`) - 0.5;
  const az = eraDef.azimuth + t * eraDef.spread * 1.6 + seedA * eraDef.spread * 0.4;
  const alt = Math.max(
    0.15,
    Math.min(0.92, eraDef.altitude + seedB * eraDef.spread * 0.7),
  );
  return skyPosition(az, alt);
};

// Bikin warna bintang per milestone — base era color, slight
// brightness shift berdasarkan posisi dalam era (oldest = sedikit
// dimmer, newest = sedikit brighter). Returns hex string.
const starColorForMilestone = (milestoneId) => {
  const info = ERA_LOOKUP.get(milestoneId);
  if (!info) return '#ffffff';
  const { eraDef, posInEra } = info;
  const total = eraDef.milestoneIds.length;
  const t = total === 1 ? 0.5 : posInEra / (total - 1);
  // Lerp dari slightly dimmer era color → era color → slightly brighter
  const dim = lerpHexColor('#000000', eraDef.color, 0.78);
  const bright = lerpHexColor(eraDef.color, '#ffffff', 0.22);
  if (t < 0.5) return lerpHexColor(dim, eraDef.color, t / 0.5);
  return lerpHexColor(eraDef.color, bright, (t - 0.5) / 0.5);
};

const lerpHexColor = (a, b, t) => {
  const av = parseInt(a.slice(1), 16);
  const bv = parseInt(b.slice(1), 16);
  const ar = (av >> 16) & 0xff;
  const ag = (av >> 8) & 0xff;
  const ab = av & 0xff;
  const br = (bv >> 16) & 0xff;
  const bg = (bv >> 8) & 0xff;
  const bb = bv & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
};

// Path corridor bounds untuk distribute particle/firefly. Sedikit lebih
// lebar dari path itu sendiri supaya particle "wrap" tepi pohon, nggak
// cuma straight di tengah path.
const CORRIDOR_X_HALF = 5;
const CORRIDOR_Z_MIN = PATH_END_Z - 2;
const CORRIDOR_Z_MAX = PATH_START_Z + 2;
const CORRIDOR_Z_LEN = CORRIDOR_Z_MAX - CORRIDOR_Z_MIN;

// Sistem angin global — semua component subscribe untuk dapat sway/drift
// yang sinkron antar elemen scene. getWind(t) return:
//   - sway: oscillation continuous halus (Math.sin combo)
//   - gust: spike periodic tiap WIND_GUST_PERIOD detik, active 30%
//     dari period (parabolic shape supaya smooth peak)
//   - total: sway + gust untuk konsumsi default
//
// Component bisa baca total untuk basic sway, atau gust khusus untuk
// rare effect (e.g., owl mata kedip cuma saat gust, leaves jatuh lebih
// banyak saat gust).
const WIND_GUST_PERIOD = 16; // detik antar gust event
const getWind = (t, phaseOffset = 0) => {
  const tt = t + phaseOffset;
  const sway = Math.sin(tt * 0.3) * 0.6 + Math.sin(tt * 0.7) * 0.3;
  const gustPhase = ((tt % WIND_GUST_PERIOD) + WIND_GUST_PERIOD) % WIND_GUST_PERIOD;
  const gustU = gustPhase / WIND_GUST_PERIOD;
  const gust = gustU > 0.4 && gustU < 0.7
    ? Math.sin((gustU - 0.4) / 0.3 * Math.PI) * 1.5
    : 0;
  return { sway, gust, total: sway + gust };
};

// Firefly blackout — semua kunang-kunang dim bareng tiap ~75 detik.
// Active window 1.5% dari period (~1.1s), parabolic dim. Atmospheric
// blip — kayak "scene tahan napas sejenak".
// SFX singleton — lazy AudioContext untuk one-shot tones (wind chime
// click, dst). Dibuat saat first user gesture, di-respect localStorage
// 'taman-audio-enabled' supaya selaras dgn AmbientAudio toggle.
let _sfxCtx = null;
const getSfxCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!_sfxCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      _sfxCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (_sfxCtx.state === 'suspended') {
    _sfxCtx.resume().catch(() => {});
  }
  return _sfxCtx;
};
const isAudioEnabled = () => {
  try {
    return localStorage.getItem('taman-audio-enabled') === '1';
  } catch {
    return false;
  }
};
// Bell tone — base sine + 2 harmonics dgn quick attack + slow exp decay.
// Sounds metallic/chime-like. freq base ~880 default (A5), bisa di-vary
// untuk banyak tube notes.
const playChimeTone = (frequency = 880, masterAmp = 0.18) => {
  if (!isAudioEnabled()) return;
  const ctx = getSfxCtx();
  if (!ctx) return;
  const partial = (freq, amp, decay) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(amp, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + decay);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + decay + 0.05);
  };
  partial(frequency, masterAmp, 1.6);
  partial(frequency * 2, masterAmp * 0.4, 1.0);
  partial(frequency * 3.01, masterAmp * 0.22, 0.7);
};

const FIREFLY_BLACKOUT_PERIOD = 75;
const getFireflyBlackout = (t) => {
  const u = ((t % FIREFLY_BLACKOUT_PERIOD) + FIREFLY_BLACKOUT_PERIOD) % FIREFLY_BLACKOUT_PERIOD / FIREFLY_BLACKOUT_PERIOD;
  if (u > 0.985 && u < 1.0) {
    const dim = (u - 0.985) / 0.015;
    return Math.sin(dim * Math.PI);
  }
  return 0;
};

// Kunang-kunang — bola kecil emissive kuning-oranye dengan flicker
// pulse + drift orbital di sekitar home position. Twilight = perfect
// fit — bloom-less scene jadi emissive intensity bisa lebih kuat tanpa
// over-blow.
const Firefly = ({ def }) => {
  const ref = useRef();
  const matRef = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    // Reactive retreat — push pelan menjauh dari camera saat dekat
    const cam = state.camera.position;
    const dxc = def.home[0] - cam.x;
    const dyc = def.home[1] - cam.y;
    const dzc = def.home[2] - cam.z;
    const distC = Math.sqrt(dxc * dxc + dyc * dyc + dzc * dzc);
    const retreat = Math.max(0, Math.min(1, (14 - distC) / 5));
    const rx = (dxc / Math.max(distC, 0.01)) * retreat * 0.6;
    const rz = (dzc / Math.max(distC, 0.01)) * retreat * 0.6;
    ref.current.position.x =
      def.home[0] + Math.sin(t * 0.4 + def.phase) * 0.6 + wind.total * 0.25 + rx;
    ref.current.position.y = def.home[1] + Math.cos(t * 0.5 + def.phase) * 0.25;
    ref.current.position.z =
      def.home[2] + Math.cos(t * 0.35 + def.phase * 1.3) * 0.6 + rz;
    if (matRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(t * def.flicker + def.phase * 2);
      const gustDim = Math.max(0, Math.abs(wind.gust) - 0.5) * 0.5;
      const blackout = getFireflyBlackout(t);
      matRef.current.emissiveIntensity = (0.6 + pulse * 1.8) * (1 - gustDim) * (1 - blackout * 0.95);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.045, 6, 6]} />
      <meshStandardMaterial
        ref={matRef}
        color="#fff4a8"
        emissive="#ffc858"
        emissiveIntensity={1.4}
        roughness={1}
      />
    </mesh>
  );
};

// Spread kunang-kunang di sepanjang lorong — strip distribution (bukan
// ring kayak di r3 yang circular). Y di range mid-path supaya floating
// di antar pohon, kelihatan kayak bintik magic di lorong.
const FIREFLY_DEFS = Array.from({ length: 16 }, () => ({
  home: [
    (Math.random() - 0.5) * CORRIDOR_X_HALF * 2,
    0.6 + Math.random() * 1.8,
    CORRIDOR_Z_MIN + Math.random() * CORRIDOR_Z_LEN,
  ],
  phase: Math.random() * Math.PI * 2,
  flicker: 2.5 + Math.random() * 2.5,
}));

const Fireflies = ({ count }) => {
  const defs = count ? FIREFLY_DEFS.slice(0, count) : FIREFLY_DEFS;
  return (
    <>
      {defs.map((def, i) => (
        <Firefly key={`firefly-${i}`} def={def} />
      ))}
    </>
  );
};

// Kabut tanah — partikel wisp halus di base path, oscillation absolute
// (nggak cumulative drift) supaya bounded & nggak tembus ke bawah
// ground over time.
const GroundMist = ({ count = 70 }) => {
  const ref = useRef();
  const basePositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (CORRIDOR_X_HALF * 2 + 6);
      // y 0.9..2.6 — sprite size 1.4 (bottom y - 0.7) tetap di atas ground
      arr[i * 3 + 1] = 0.9 + Math.random() * 1.7;
      arr[i * 3 + 2] = CORRIDOR_Z_MIN - 3 + Math.random() * (CORRIDOR_Z_LEN + 6);
    }
    return arr;
  }, [count]);

  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      arr[i * 3] = basePositions[i * 3] + Math.sin(t * 0.15 + phase) * 0.4 + wind.total * 0.5;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.cos(t * 0.18 + phase * 1.3) * 0.12;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(t * 0.13 + phase) * 0.4;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={basePositions.slice()}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.4}
        color="#9aa5b8"
        transparent
        opacity={0.24}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Mist pool — concentrated mist patches di kiri-kanan path (di sides),
// bukan tengah. Kasih kesan "ada ruang" di sekitar lorong, bukan flat
// world. Distribusi alternating side sepanjang path z.
const MIST_POOL_DEFS = [
  { pos: [-7, 0, -7], radius: 3.5, count: 14 },
  { pos: [7, 0, -13], radius: 4.0, count: 16 },
  { pos: [-8, 0, -20], radius: 3.8, count: 15 },
  { pos: [7.5, 0, -27], radius: 3.6, count: 14 },
];

const MistPool = ({ pos, radius, count }) => {
  const ref = useRef();
  const basePositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      arr[i * 3] = pos[0] + Math.cos(angle) * r;
      // Multi-Y layer distribution untuk volumetric feel:
      // 50% low (0.2-0.8), 35% mid (0.8-1.6), 15% high (1.6-2.4)
      const layerR = Math.random();
      if (layerR < 0.5) arr[i * 3 + 1] = 0.2 + Math.random() * 0.6;
      else if (layerR < 0.85) arr[i * 3 + 1] = 0.8 + Math.random() * 0.8;
      else arr[i * 3 + 1] = 1.6 + Math.random() * 0.8;
      arr[i * 3 + 2] = pos[2] + Math.sin(angle) * r;
    }
    return arr;
  }, [pos, radius, count]);
  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [count]);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const phase = phases[i];
      // Slower drifting — amplitude lebih kecil, frequency lebih rendah
      arr[i * 3] = basePositions[i * 3] + Math.sin(t * 0.12 + phase) * 0.35 + wind.total * 0.32;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.cos(t * 0.14 + phase * 1.3) * 0.08;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(t * 0.10 + phase) * 0.35;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={basePositions.slice()}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      {/* Particles lebih besar + softer (size 2.6 was 1.8) untuk
          volumetric feel. Color slightly bluish-purple #adb6cc match
          twilight palette */}
      <pointsMaterial
        size={2.6}
        color="#adb6cc"
        transparent
        opacity={0.22}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

const MistPools = () => (
  <>
    {MIST_POOL_DEFS.map((p, i) => (
      <MistPool key={`mistpool-${i}`} {...p} />
    ))}
  </>
);

// Daun gugur — tone autumn (orange/amber/rust/gold) drift turun pelan
// dari atas pohon. Cycle: fall sampai z ground, reset ke atas. Memory
// metaphor: waktu lewat, daun lepas dari pohon-tahun.
const AUTUMN_LEAF_COLORS = [
  '#c47a3a', // orange burnt
  '#d99a4a', // amber
  '#a85a30', // rust
  '#e0b760', // gold
  '#8a4a28', // deep brown
];

const FallingLeaves = ({ count = 60 }) => {
  const ref = useRef();
  const colorRef = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (CORRIDOR_X_HALF * 2 + 4);
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = CORRIDOR_Z_MIN + Math.random() * CORRIDOR_Z_LEN;
    }
    return arr;
  }, [count]);

  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const hex = AUTUMN_LEAF_COLORS[Math.floor(Math.random() * AUTUMN_LEAF_COLORS.length)];
      const v = parseInt(hex.slice(1), 16);
      arr[i * 3] = ((v >> 16) & 0xff) / 255;
      arr[i * 3 + 1] = ((v >> 8) & 0xff) / 255;
      arr[i * 3 + 2] = (v & 0xff) / 255;
    }
    return arr;
  }, [count]);

  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      arr[i * 2] = -0.05 - Math.random() * 0.04; // fall speed
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.025; // sway speed
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t);
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      // Wind push horizontal (dominan dari gust event)
      arr[i * 3] += velocities[i * 2 + 1] * delta * 60 + wind.total * 0.045;
      arr[i * 3 + 1] += velocities[i * 2] * delta;
      if (arr[i * 3 + 1] < 0.2) {
        arr[i * 3] = (Math.random() - 0.5) * (CORRIDOR_X_HALF * 2 + 4);
        arr[i * 3 + 1] = 5 + Math.random() * 3;
        arr[i * 3 + 2] = CORRIDOR_Z_MIN + Math.random() * CORRIDOR_Z_LEN;
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
        <bufferAttribute
          ref={colorRef}
          attach="attributes-color"
          array={colors}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Lentera kayu di sepanjang lorong — way-finding + memory metaphor
// (cahaya sebagai penanda waktu yang lewat). Flicker via combo slow
// sin (breath) + fast sin (jitter) → simulate flame instability tanpa
// random noise yang bikin reactive.
//
// Position: 5 lantern di antara tree pairs, alternating side (kiri/
// kanan) supaya cahaya distribute even sepanjang lorong. x=±3.5 (di
// luar PATH_X_OFFSET=2.6 supaya nggak overlap pohon).
// Lentera #3 (z=-17, tengah path) sengaja `dead: true` — path
// storytelling: ada satu yang udah mati, kasih hint waktu lewat.
const LANTERN_DEFS = [
  { pos: [-3.5, 0, -5], phase: 0 },
  { pos: [3.5, 0, -11], phase: 1.3 },
  { pos: [-3.5, 0, -17], phase: 2.5, dead: true },
  { pos: [3.5, 0, -23], phase: 0.7 },
  { pos: [-3.5, 0, -29], phase: 1.8 },
];

const LanternPost = ({ pos, phase, dead = false, signatureEvent }) => {
  const lightRef = useRef();
  const matRef = useRef();
  const groupRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const wind = getWind(t, phase * 1.7);
    // Pole sway tetap berlaku walau lentera mati
    if (groupRef.current) {
      groupRef.current.rotation.z = wind.total * 0.012;
    }
    if (dead) {
      // Lentera mati — no light, no glow
      if (lightRef.current) lightRef.current.intensity = 0;
      if (matRef.current) matRef.current.emissiveIntensity = 0;
      return;
    }
    const slow = Math.sin(t * 0.7 + phase * 1.4) * 0.18;
    const fast = Math.sin(t * 8 + phase) * 0.05;
    const gustDip = Math.max(0, Math.abs(wind.gust) - 0.4) * 0.35;
    let factor = (1 + slow + fast) * (1 - gustDip);
    // Signature 'recent' — sync flicker (semua lentera ramp peak bareng)
    if (signatureEvent && signatureEvent.type === 'recent') {
      const dt = t - signatureEvent.time;
      if (dt > 0 && dt < 3) {
        let boost = 0;
        if (dt < 0.5) boost = dt / 0.5;
        else if (dt < 2.0) boost = 1;
        else boost = (3 - dt) / 1;
        factor *= 1 + boost * 1.4;
      }
    }
    if (lightRef.current) lightRef.current.intensity = 1.6 * factor;
    if (matRef.current) matRef.current.emissiveIntensity = 1.2 * factor;
  });
  return (
    <group ref={groupRef} position={pos}>
      {/* Tiang kayu */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.8, 6]} />
        <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
      </mesh>
      {/* Lamp body — panel emissive warna api */}
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
        <meshStandardMaterial
          ref={matRef}
          color="#a8784a"
          emissive="#ffaa44"
          emissiveIntensity={1.2}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      {/* Frame edges (kayu gelap) di 4 sudut */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`f-${sx}-${sz}`} position={[sx * 0.13, 1.95, sz * 0.13]}>
            <boxGeometry args={[0.04, 0.34, 0.04]} />
            <meshStandardMaterial color="#1a0d08" roughness={0.95} />
          </mesh>
        ))
      )}
      {/* Atap pyramid */}
      <mesh position={[0, 2.18, 0]}>
        <coneGeometry args={[0.22, 0.16, 4]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.9} />
      </mesh>
      {/* Point light flickering */}
      <pointLight
        ref={lightRef}
        position={[0, 1.95, 0]}
        intensity={1.6}
        color="#ffaa44"
        distance={6}
        decay={2}
      />
    </group>
  );
};

const Lanterns = ({ signatureEvent }) => (
  <>
    {LANTERN_DEFS.map((l, i) => (
      <LanternPost
        key={`lantern-${i}`}
        pos={l.pos}
        phase={l.phase}
        dead={l.dead}
        signatureEvent={signatureEvent}
      />
    ))}
  </>
);

// Year plaque kayu — penanda fisik di base tiap pohon dengan tahun
// terukir, kerasa kayak memorial marker / milestone post. Plaque
// di-tilt menghadap path supaya bisa dibaca dari camera.
const YearPlaque = ({ tree, cracked = false }) => {
  const side = Math.sign(tree.x); // -1 kiri, +1 kanan
  return (
    <group
      position={[tree.x - side * 0.55, 0, tree.z + 0.25]}
      rotation={[0, -side * Math.PI / 4, 0]}
    >
      {/* Mini post */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.36, 6]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.95} />
      </mesh>
      {/* Mini plank — kalau cracked, sedikit miring ke samping */}
      <mesh position={[0, 0.32, 0]} rotation={[0, 0, cracked ? -0.12 : 0]}>
        <boxGeometry args={[0.4, 0.14, 0.03]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.85} />
      </mesh>
      {/* Tepi plank atas-bawah (frame kayu lebih gelap) */}
      <mesh position={[0, 0.395, 0.018]} rotation={[0, 0, cracked ? -0.12 : 0]}>
        <boxGeometry args={[0.42, 0.025, 0.02]} />
        <meshStandardMaterial color="#3a2616" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.245, 0.018]} rotation={[0, 0, cracked ? -0.12 : 0]}>
        <boxGeometry args={[0.42, 0.025, 0.02]} />
        <meshStandardMaterial color="#3a2616" roughness={0.95} />
      </mesh>
      {/* Crack line — diagonal dark line nyilang plank */}
      {cracked && (
        <mesh position={[0.05, 0.31, 0.02]} rotation={[0, 0, 0.7]}>
          <boxGeometry args={[0.005, 0.13, 0.005]} />
          <meshStandardMaterial color="#1a0d05" roughness={1} />
        </mesh>
      )}
      {/* Tahun terukir */}
      <Html position={[0, 0.32, 0.025]} center distanceFactor={6} occlude={false}>
        <div style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontSize: '9px',
          color: '#1a0d05',
          whiteSpace: 'nowrap',
          fontWeight: '600',
          letterSpacing: '0.5px',
          pointerEvents: 'none',
          transform: cracked ? 'rotate(-7deg)' : undefined,
        }}>{tree.year}</div>
      </Html>
    </group>
  );
};

// Plaque ke-4 sengaja cracked — path storytelling subtle
const YearPlaques = ({ trees }) => (
  <>
    {trees.map((tree, i) => (
      <YearPlaque key={`plaque-${tree.id}`} tree={tree} cracked={i === 3} />
    ))}
  </>
);

// Burung hantu nemplok di pohon — quiet life signal di lorong malam.
// Body static, cuma kepala rotate slow (left-right) supaya kerasa
// alert tapi tetep tenang. Mata kuning emissive jadi focal point —
// sepasang titik kuning yang gerak pelan di antara pohon-pohon.
const Owl = ({ pos, headPhase = 0, signatureEvent }) => {
  const headRef = useRef();
  const eye1Ref = useRef(); // mesh ref — pakai .material untuk emissive
  const eye2Ref = useRef();
  // Rare alert event — owl tiba-tiba snap kepala 90° ke samping, hold,
  // kembali normal. Trigger interval random 60-120s per owl (phase
  // beda jadi 2 owl nggak alert bareng).
  const alertRef = useRef({
    active: false,
    t0: 0,
    next: 60 + Math.random() * 60 + headPhase * 5,
  });
  // Click "noticed" — saat user click owl, head turn ke camera + eyes
  // boost 1.8s. triggered flag di-set di click handler, useFrame
  // pickup di tick berikutnya untuk activate dgn t0 valid.
  const noticedRef = useRef({ triggered: false, active: false, t0: 0 });
  const handleClick = (e) => {
    e.stopPropagation();
    noticedRef.current.triggered = true;
  };
  useFrame((state) => {
    if (!headRef.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t, headPhase);
    // Default head sway
    let headAngle = Math.sin(t * 0.4 + headPhase) * 0.55;
    // Alert event override
    if (!alertRef.current.active && t > alertRef.current.next) {
      alertRef.current = { active: true, t0: t, next: 0 };
    }
    if (alertRef.current.active) {
      const dt = t - alertRef.current.t0;
      if (dt < 2.4) {
        if (dt < 0.25) headAngle = (dt / 0.25) * 1.4;
        else if (dt < 1.8) headAngle = 1.4;
        else headAngle = 1.4 - ((dt - 1.8) / 0.6) * 1.4;
      } else {
        alertRef.current = {
          active: false,
          t0: 0,
          next: t + 60 + Math.random() * 60,
        };
      }
    }
    // Pickup noticed trigger — set t0 di tick berikutnya
    if (noticedRef.current.triggered && !noticedRef.current.active) {
      noticedRef.current = { triggered: false, active: true, t0: t };
    }
    // Compute camera angle untuk head turn (used by both tracking and noticed)
    const camWorld = state.camera.position;
    const dxw = camWorld.x - pos[0];
    const dzw = camWorld.z - pos[2];
    const camAngleWorld = Math.atan2(dxw, dzw);
    if (noticedRef.current.active) {
      const dt = t - noticedRef.current.t0;
      if (dt < 1.8) {
        // Lerp head dari current ke camera angle, hold, return
        let blend = 0;
        if (dt < 0.3) blend = dt / 0.3;
        else if (dt < 1.4) blend = 1;
        else blend = (1.8 - dt) / 0.4;
        // Clamp camera angle ke range [-1.2, 1.2] supaya nggak rotate full
        const clampedAngle = Math.max(-1.2, Math.min(1.2, camAngleWorld));
        headAngle = headAngle * (1 - blend) + clampedAngle * blend;
      } else {
        noticedRef.current.active = false;
      }
    }
    headRef.current.rotation.y = headAngle;
    // Eye tracking — saat camera dekat, eyes shift toward camera.
    // Force tracking=1 saat noticed active (force eyes lock on user)
    const cam = state.camera.position;
    const dx = cam.x - pos[0];
    const dy = cam.y - pos[1];
    const dz = cam.z - pos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let tracking = Math.max(0, Math.min(1, (8 - dist) / 4));
    if (noticedRef.current.active) tracking = 1;
    let eyeBaseX = 0;
    let eyeBaseZ = 0.13;
    let eyeBaseY = 0.03;
    if (tracking > 0) {
      // Camera direction projected ke head local frame (XZ plane only).
      // Head Y rotation = headAngle. Inverse rotate camera direction ke
      // local space.
      const camAngleWorld = Math.atan2(dx, dz); // angle dari +z di world XZ
      const localCamAngle = camAngleWorld - headAngle;
      const shift = tracking * 0.013;
      eyeBaseX = Math.sin(localCamAngle) * shift;
      eyeBaseZ = 0.13 + Math.cos(localCamAngle) * shift * 0.4;
      eyeBaseY = 0.03 + Math.max(-0.5, Math.min(0.5, dy / Math.max(dist, 0.01))) * shift * 0.6;
    }
    if (eye1Ref.current) {
      eye1Ref.current.position.x = 0.06 + eyeBaseX;
      eye1Ref.current.position.y = eyeBaseY;
      eye1Ref.current.position.z = eyeBaseZ;
    }
    if (eye2Ref.current) {
      eye2Ref.current.position.x = -0.06 + eyeBaseX;
      eye2Ref.current.position.y = eyeBaseY;
      eye2Ref.current.position.z = eyeBaseZ;
    }
    // Mata kedip saat gust + dim juga saat alert
    const blink = Math.max(0, Math.abs(wind.gust) - 0.6) * 0.7;
    const alertBoost = alertRef.current.active ? 0.3 : 0;
    const trackBoost = tracking * 0.2;
    // Signature 'old' — owl mata blink (dim → bright cycle, "noticing")
    let sigDim = 0;
    if (signatureEvent && signatureEvent.type === 'old') {
      const dt = t - signatureEvent.time;
      if (dt > 0.2 && dt < 2.4) {
        // 2 blinks: dim sharp → bright sharp → dim → back
        const u = (dt - 0.2) / 2.2;
        const blinkCycle = Math.cos(u * Math.PI * 4);
        sigDim = blinkCycle * 0.5; // -0.5..0.5 oscillation
      }
    }
    // Noticed boost — eyes max bright saat owl aware of user
    const noticedBoost = noticedRef.current.active ? 0.8 : 0;
    const eyeIntensity = 1.1 + alertBoost + trackBoost - blink + sigDim + noticedBoost;
    if (eye1Ref.current) eye1Ref.current.material.emissiveIntensity = eyeIntensity;
    if (eye2Ref.current) eye2Ref.current.material.emissiveIntensity = eyeIntensity;
  });
  return (
    <group
      position={pos}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Body — ellipsoid coklat gelap */}
      <mesh scale={[0.18, 0.22, 0.16]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#3a2818" roughness={0.85} />
      </mesh>
      {/* Head group — rotate slow */}
      <group ref={headRef} position={[0, 0.22, 0]}>
        <mesh>
          <sphereGeometry args={[0.16, 14, 12]} />
          <meshStandardMaterial color="#4a3220" roughness={0.85} />
        </mesh>
        {/* Mata — kuning emissive sebagai focal point malam. Ref di
            mesh (bukan material) supaya bisa shift posisi ke camera */}
        <mesh ref={eye1Ref} position={[0.06, 0.03, 0.13]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#fae650"
            emissive="#fae650"
            emissiveIntensity={1.1}
          />
        </mesh>
        <mesh ref={eye2Ref} position={[-0.06, 0.03, 0.13]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#fae650"
            emissive="#fae650"
            emissiveIntensity={1.1}
          />
        </mesh>
        {/* Pupil hitam */}
        <mesh position={[0.06, 0.03, 0.16]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        <mesh position={[-0.06, 0.03, 0.16]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        {/* Paruh */}
        <mesh position={[0, -0.03, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.06, 4]} />
          <meshStandardMaterial color="#2a1810" roughness={0.85} />
        </mesh>
      </group>
      {/* Sayap kiri — tucked di sisi body */}
      <mesh position={[-0.15, 0, 0]} rotation={[0, 0, 0.2]} scale={[0.5, 0.8, 0.4]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#2a1e10" roughness={0.85} />
      </mesh>
      {/* Sayap kanan */}
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, -0.2]} scale={[0.5, 0.8, 0.4]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#2a1e10" roughness={0.85} />
      </mesh>
      {/* Tail kecil di belakang */}
      <mesh position={[0, -0.10, -0.14]} rotation={[Math.PI / 4, 0, 0]}>
        <coneGeometry args={[0.06, 0.14, 4]} />
        <meshStandardMaterial color="#3a2818" roughness={0.85} />
      </mesh>
    </group>
  );
};

// 2 owls perched di canopy edge — y=4.0 (foliage top 3.65, owl body
// extends 0.22 down → bottom y=3.78, jelas di atas foliage). X
// offset toward path supaya owl perched di tepi foliage menghadap
// lorong, nggak ketutupan dari camera angle. 1 di pohon era debut,
// 1 di pohon era recent.
const Owls = ({ signatureEvent }) => (
  <>
    <Owl pos={[-2.2, 4.0, -8.67]} headPhase={0} signatureEvent={signatureEvent} />
    <Owl pos={[2.2, 4.0, -25.33]} headPhase={1.8} signatureEvent={signatureEvent} />
  </>
);

// Siluet figur di kejauhan ujung lorong — heavily fogged, barely
// visible. Open to interpretation: bisa Eli muda berdiri menatap ke
// arah camera (ke masa depan), atau just visitor lain. Subtle breathing
// sway supaya kerasa "alive" tanpa explicit movement.
const DistantFigure = ({ signatureEvent }) => {
  const groupRef = useRef();
  const bodyMatRef = useRef();
  const headMatRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.9) * 0.012;
    let glow = 0;
    let emissiveColor = '#ffaa50';
    if (signatureEvent) {
      const dt = t - signatureEvent.time;
      if (signatureEvent.type === 'recent' && dt > 0.4 && dt < 2.6) {
        // Recent signature: amber glow strong
        const u = (dt - 0.4) / 2.2;
        if (u < 0.2) glow = u / 0.2;
        else if (u < 0.8) glow = 1;
        else glow = (1 - u) / 0.2;
      } else if (signatureEvent.type === 'old' && dt > 0.6 && dt < 3.2) {
        // Old signature: cool blue halo subtle (figure "menjawab" present)
        const u = (dt - 0.6) / 2.6;
        if (u < 0.25) glow = u / 0.25 * 0.6;
        else if (u < 0.75) glow = 0.6;
        else glow = (1 - u) / 0.25 * 0.6;
      } else if (signatureEvent.type === 'monument' && dt > 0.3 && dt < 5.0) {
        // Monument signature: amber halo SUSTAIN — figure "diakui" oleh
        // user yang sampe ujung lorong. Lebih lama + intens dari recent.
        const u = (dt - 0.3) / 4.7;
        if (u < 0.15) glow = u / 0.15 * 1.2;
        else if (u < 0.85) glow = 1.2;
        else glow = (1 - u) / 0.15 * 1.2;
      }
    }
    if (bodyMatRef.current) {
      bodyMatRef.current.opacity = 0.75 + glow * 0.25;
      bodyMatRef.current.emissiveIntensity = glow * 1.4;
    }
    if (headMatRef.current) {
      headMatRef.current.opacity = 0.75 + glow * 0.25;
      headMatRef.current.emissiveIntensity = glow * 1.4;
    }
  });
  return (
    <group ref={groupRef} position={[0, 0, -34]}>
      {/* Body — capsule tinggi sebagai siluet */}
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.16, 0.7, 4, 8]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#0a0d18"
          emissive="#ffaa50"
          emissiveIntensity={0}
          roughness={1}
          transparent
          opacity={0.75}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial
          ref={headMatRef}
          color="#0a0d18"
          emissive="#ffaa50"
          emissiveIntensity={0}
          roughness={1}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
};

// Bat silhouette — V-shape gelap drifting di langit malam. 3 bat
// dengan x drift speed beda, wrap saat lewat batas. Wing flap via
// rotation.z oscillation pada wings group (visual rocking dari V).
const Bat = ({ def }) => {
  const groupRef = useRef();
  const wingsRef = useRef();
  const xRef = useRef(def.startX);
  useFrame((state, delta) => {
    if (!groupRef.current || !wingsRef.current) return;
    xRef.current += def.speed * delta;
    if (xRef.current > 25) xRef.current = -25;
    const t = state.clock.elapsedTime;
    groupRef.current.position.x = xRef.current;
    groupRef.current.position.y = def.y + Math.sin(t * 1.2 + def.phase) * 0.4;
    groupRef.current.position.z = def.z;
    wingsRef.current.rotation.z = Math.sin(t * 7 + def.phase) * 0.28;
  });
  return (
    <group ref={groupRef}>
      <group ref={wingsRef}>
        {/* Sayap kiri — sharper angle dari Bird */}
        <mesh rotation={[0, 0, 0.85]}>
          <coneGeometry args={[0.16, 0.42, 3]} />
          <meshStandardMaterial color="#0a0a12" roughness={1} />
        </mesh>
        {/* Sayap kanan */}
        <mesh rotation={[0, 0, -0.85]}>
          <coneGeometry args={[0.16, 0.42, 3]} />
          <meshStandardMaterial color="#0a0a12" roughness={1} />
        </mesh>
        {/* Body kecil di tengah */}
        <mesh>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color="#0a0a12" roughness={1} />
        </mesh>
      </group>
    </group>
  );
};

const BAT_DEFS = [
  { startX: -22, y: 11, z: -15, speed: 1.4, phase: 0 },
  { startX: -28, y: 13, z: -22, speed: 1.0, phase: 1.5 },
  { startX: -18, y: 9, z: -8, speed: 1.7, phase: 0.8 },
];

const Bats = () => (
  <>
    {BAT_DEFS.map((def, i) => (
      <Bat key={`bat-${i}`} def={def} />
    ))}
  </>
);

// Kelinci di tepi lorong — ground-level cute moment. Body putih-cream
// stationary, head rotate slow alert (mirroring Owl pattern). Posisi
// di antara owl positions supaya nggak crowd.
const Rabbit = ({ pos }) => {
  const headRef = useRef();
  useFrame((state) => {
    if (!headRef.current) return;
    const t = state.clock.elapsedTime;
    // Reactive freeze — saat camera dekat, head stop bergerak (alert/freeze).
    // Threshold 10 unit, smooth ramp dari 10..6 unit.
    const cam = state.camera.position;
    const dx = cam.x - pos[0];
    const dy = cam.y - pos[1];
    const dz = cam.z - pos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const alertness = Math.max(0, Math.min(1, (10 - dist) / 4));
    // Normal head amplitude 0.4, alert reduces ke 0.06 (almost frozen)
    const amp = 0.4 * (1 - alertness * 0.85);
    headRef.current.rotation.y = Math.sin(t * 0.8) * amp;
  });
  return (
    <group position={pos}>
      {/* Body — ellipsoid bawah */}
      <mesh position={[0, 0.07, 0]} scale={[0.10, 0.07, 0.13]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
      </mesh>
      {/* Head group — rotate alert */}
      <group ref={headRef} position={[0.05, 0.13, 0]}>
        <mesh>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshStandardMaterial color="#e0d0b8" roughness={0.85} />
        </mesh>
        {/* Telinga kiri */}
        <mesh
          position={[0.005, 0.10, 0.03]}
          rotation={[0, 0, -0.2]}
          scale={[0.4, 1.5, 0.4]}
        >
          <capsuleGeometry args={[0.025, 0.06, 4, 6]} />
          <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
        </mesh>
        {/* Telinga kanan */}
        <mesh
          position={[0.005, 0.10, -0.03]}
          rotation={[0, 0, -0.2]}
          scale={[0.4, 1.5, 0.4]}
        >
          <capsuleGeometry args={[0.025, 0.06, 4, 6]} />
          <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
        </mesh>
        {/* Mata kiri & kanan */}
        <mesh position={[0.06, 0.01, 0.04]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#1a0e08" />
        </mesh>
        <mesh position={[0.06, 0.01, -0.04]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#1a0e08" />
        </mesh>
        {/* Hidung */}
        <mesh position={[0.085, -0.005, 0]}>
          <sphereGeometry args={[0.010, 6, 6]} />
          <meshStandardMaterial color="#3a1a14" />
        </mesh>
      </group>
      {/* Ekor putih bulat */}
      <mesh position={[-0.10, 0.08, 0]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color="#fff8ea" roughness={0.85} />
      </mesh>
    </group>
  );
};

// 1 rabbit di tepi path antar owl — z=-14 (between owl#1 z=-8.67 dan
// owl#2 z=-25.33). x=-3.2 di kiri path, menghadap +x (default — head
// di +x default). Jadi rabbit "watches" path.
const Rabbits = () => (
  <>
    <Rabbit pos={[-3.2, 0, -14]} />
  </>
);

// Memory fragments — frasa puitis yang muncul samar dan fade
// independent tiap N detik. Plus zoom proximity factor: lebih
// kelihatan saat user zoom dekat ke scene. "Memory yang drift in
// dan out" — hint poetic, jangan terlalu readable.
const MEMORY_FRAGMENTS = [
  { pos: [-1.5, 0.7, -7], text: 'panggung pertama', phase: 0.0, period: 11 },
  { pos: [2.0, 0.8, -10], text: 'sorot lampu', phase: 0.45, period: 13 },
  { pos: [1.8, 0.8, -13], text: 'tangan kecil yang mengangkat', phase: 0.35, period: 13 },
  { pos: [-2.0, 0.7, -16], text: 'mata yang basah', phase: 0.7, period: 12 },
  { pos: [-1.2, 0.7, -19], text: 'rumah panggung', phase: 0.6, period: 10 },
  { pos: [2.2, 0.8, -22], text: 'lagu yang kau hapal', phase: 0.2, period: 14 },
  { pos: [1.5, 0.8, -25], text: 'untuk yang menunggu', phase: 0.15, period: 12 },
  { pos: [-1.8, 0.8, -28], text: 'apa kabar di sana', phase: 0.55, period: 11 },
  { pos: [-1.8, 0.7, -30], text: 'tahun yang panjang', phase: 0.8, period: 14 },
];

const ORBIT_TARGET_ARR = ORBIT_TARGET; // alias supaya useFrame closure jelas

const MemoryFragment = ({ pos, text, phase = 0, period = 10 }) => {
  const divRef = useRef();
  useFrame((state) => {
    if (!divRef.current) return;
    const t = state.clock.elapsedTime;
    // Pulse cycle — visible cuma 20% dari period, smooth fade in/out
    const u = ((t / period) + phase) % 1;
    let pulseOpacity = 0;
    if (u < 0.1) pulseOpacity = (u / 0.1) * 0.5;
    else if (u < 0.3) pulseOpacity = 0.5 - (u - 0.1) / 0.2 * 0.5;
    // Zoom proximity — lebih dekat camera ke target = lebih visible
    const cam = state.camera.position;
    const dx = cam.x - ORBIT_TARGET_ARR[0];
    const dy = cam.y - ORBIT_TARGET_ARR[1];
    const dz = cam.z - ORBIT_TARGET_ARR[2];
    const camDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const normDist = Math.min(1, Math.max(0, (camDist - 12) / 16));
    const zoomFactor = 0.4 + (1 - normDist) * 0.6;
    divRef.current.style.opacity = String(pulseOpacity * zoomFactor);
  });
  return (
    <Html position={pos} center distanceFactor={9} occlude={false}>
      <div
        ref={divRef}
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontSize: '11px',
          color: '#fff8ea',
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
          textShadow: '0 0 8px rgba(255, 200, 100, 0.5)',
          letterSpacing: '0.5px',
        }}
      >
        {text}
      </div>
    </Html>
  );
};

// Mobile cull: drei <Html> mounting react portals per frame mahal di
// device kelas bawah — drop ke 5 fragment paling kunci, skip 4 sisanya.
const MemoryFragments = ({ isMobile }) => {
  const list = isMobile ? MEMORY_FRAGMENTS.slice(0, 5) : MEMORY_FRAGMENTS;
  return (
    <>
      {list.map((f, i) => (
        <MemoryFragment key={`mem-${i}`} {...f} />
      ))}
    </>
  );
};

// Flying leaves gust — gerombolan daun gugur terbang lintasi scene
// tiap 90-180 detik. Cocok untuk autumn senja theme. 12 leaves
// dengan delay staggered, tumbling rotation, fade in/out per-leaf.
// Replace shooting star yang kelihatan kayak kotak putih dari
// beberapa angle.
// Flying leaves dengan motion realistis — bukan straight trajectory.
// Tiap leaf punya:
// - Swirl orbit: motion circular kecil di sekitar drift path (kayak
//   daun ketiup angin, miring2 ke samping)
// - Fall speed variation: per-leaf speedFactor (heavy leaves fall
//   faster) — leaves nggak tiba di tujuan bareng
// - Per-leaf rotation 3 axis (X, Y, Z) bukan cuma 2
// - Trajectory horizontal X drift bervariasi (subtle curve)
const FLYING_LEAF_COUNT = 14;
const FLYING_LEAF_DEFS = Array.from({ length: FLYING_LEAF_COUNT }, () => ({
  offsetX: (Math.random() - 0.5) * 2.0,
  offsetY: (Math.random() - 0.5) * 1.8,
  offsetZ: (Math.random() - 0.5) * 2.2,
  rotSpeedX: 1.5 + Math.random() * 2.8,
  rotSpeedY: 0.6 + Math.random() * 1.4,
  rotSpeedZ: 1.0 + Math.random() * 2.2,
  rotPhase: Math.random() * Math.PI * 2,
  delay: Math.random() * 0.7,
  colorIdx: Math.floor(Math.random() * AUTUMN_LEAF_COLORS.length),
  scale: 0.6 + Math.random() * 0.8,
  // Swirl: orbit kecil di sekitar drift path (radius 0.2-0.6 unit)
  swirlRadius: 0.18 + Math.random() * 0.42,
  swirlFreq: 1.5 + Math.random() * 1.5,
  swirlPhase: Math.random() * Math.PI * 2,
  // Fall speed factor: 0.85-1.2 — beberapa leaves fall lebih cepat
  speedFactor: 0.85 + Math.random() * 0.4,
  // Curve bias di X drift untuk natural variation
  curveBias: (Math.random() - 0.5) * 0.6,
}));

// Mobile cull: 14 → 8 leaves. Per-leaf 3-axis rotation + swirl orbit
// per frame is the heaviest math here, halving cuts useFrame loop cost.
const FlyingLeavesGust = ({ isMobile }) => {
  const list = isMobile ? FLYING_LEAF_DEFS.slice(0, 8) : FLYING_LEAF_DEFS;
  const refs = useRef([]);
  const stateRef = useRef({
    active: false,
    t0: 0,
    next: 25 + Math.random() * 60,
  });
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!stateRef.current.active && t > stateRef.current.next) {
      stateRef.current = { active: true, t0: t, next: 0 };
    }
    if (!stateRef.current.active) return;
    const totalDt = t - stateRef.current.t0;
    const BASE_LIFECYCLE = 2.8;
    const MAX_DELAY = 0.7;
    let activeAny = false;
    list.forEach((leaf, i) => {
      const m = refs.current[i];
      if (!m) return;
      const dt = (totalDt - leaf.delay) * leaf.speedFactor;
      const lifecycleEnd = BASE_LIFECYCLE * leaf.speedFactor;
      if (dt < 0) {
        m.visible = false;
        activeAny = true;
        return;
      }
      if (dt > BASE_LIFECYCLE) {
        m.visible = false;
        return;
      }
      activeAny = true;
      const u = dt / BASE_LIFECYCLE;
      // Base trajectory enter (12, 6, -10) → exit (-12, 0.5, -25)
      const baseX = 12 - u * 24;
      const baseY = 6 - u * 5.5 + Math.sin(u * Math.PI) * 0.9;
      const baseZ = -10 - u * 15;
      // Curve bias di X (subtle horizontal curve)
      const curveX = leaf.curveBias * Math.sin(u * Math.PI);
      // Swirl orbit di sekitar drift path
      const swirlT = t * leaf.swirlFreq + leaf.swirlPhase;
      const swirlX = Math.sin(swirlT) * leaf.swirlRadius;
      const swirlY = Math.cos(swirlT * 0.8) * leaf.swirlRadius * 0.5;
      const swirlZ = Math.cos(swirlT) * leaf.swirlRadius * 0.7;
      m.position.x = baseX + leaf.offsetX + curveX + swirlX;
      m.position.y = baseY + leaf.offsetY + swirlY;
      m.position.z = baseZ + leaf.offsetZ + swirlZ;
      // Tumble 3 axis — bikin leaf flip bener-bener kayak ditiup angin
      m.rotation.x = t * leaf.rotSpeedX + leaf.rotPhase;
      m.rotation.y = t * leaf.rotSpeedY + leaf.rotPhase;
      m.rotation.z = t * leaf.rotSpeedZ + leaf.rotPhase;
      m.visible = true;
      // Fade in/out (curve longer hold)
      if (m.material) {
        const opacity =
          u < 0.10 ? u / 0.10 : u > 0.88 ? (1 - u) / 0.12 : 1;
        m.material.opacity = opacity * 0.92;
      }
    });
    if (!activeAny || totalDt > BASE_LIFECYCLE + MAX_DELAY + 0.3) {
      stateRef.current = {
        active: false,
        t0: 0,
        next: t + 90 + Math.random() * 90,
      };
      list.forEach((_, i) => {
        if (refs.current[i]) refs.current[i].visible = false;
      });
    }
  });
  return (
    <>
      {list.map((leaf, i) => (
        <mesh
          key={`fly-leaf-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
          scale={leaf.scale}
        >
          {/* Plane lebih elongated 0.24x0.10 (was 0.18x0.13) — lebih
              kayak shape daun real, bukan kotak */}
          <planeGeometry args={[0.24, 0.10]} />
          <meshStandardMaterial
            color={AUTUMN_LEAF_COLORS[leaf.colorIdx]}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
};

// Footprints — bekas jejak kaki samar di tanah, kasih kesan "ada
// yang pernah jalan duluan". Posisi alternating kiri/kanan sepanjang
// path, pakai box flat tipis dengan tone gelap.
const FOOTPRINT_DEFS = (() => {
  const arr = [];
  // 8 jejak, alternating side, dari z=-4 ke z=-30
  for (let i = 0; i < 8; i++) {
    const z = -4 - i * 3.6;
    const x = (i % 2 === 0 ? -0.3 : 0.3) + (Math.random() - 0.5) * 0.2;
    arr.push({ pos: [x, 0.005, z], rot: (Math.random() - 0.5) * 0.4 });
  }
  return arr;
})();

const Footprints = () => (
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

// Side trees — filler trees di sides path supaya scene lebih ramai &
// kerasa kayak hutan beneran. Single useFrame iterate semua refs untuk
// sway (efisien — 1 callback vs N). Tone foliage match palette gelap
// twilight, scale variasi 0.7-1.4.
const SIDE_TREE_COLORS = ['#3a4828', '#4a5a30', '#2c3a20', '#3e4a2c'];
const SIDE_TREE_DEFS = (() => {
  const arr = [];
  // Both sides path, generate procedural deterministic via seeded variations
  const seedAt = (i, m) => ((i * 17 + m * 7) % 100) / 100;
  for (let i = 0; i < 8; i++) {
    const baseZ = -3 - i * 3.7;
    // Left side
    arr.push({
      pos: [
        -5 - seedAt(i, 0) * 4,
        0,
        baseZ + (seedAt(i, 1) - 0.5) * 1.8,
      ],
      scale: 0.8 + seedAt(i, 2) * 0.6,
      hueIdx: i % 4,
    });
    // Right side
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

// Mobile cull: 16 → 8 (slice setengah). Tetep ada filler density tapi
// halve trunk+foliage geometry & sway calc per frame.
const SideTrees = ({ isMobile }) => {
  const list = isMobile ? SIDE_TREE_DEFS.slice(0, 8) : SIDE_TREE_DEFS;
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    list.forEach((tree, i) => {
      const r = refs.current[i];
      if (!r) return;
      const wind = getWind(t, tree.pos[0] * 0.27 + tree.pos[2] * 0.13);
      r.rotation.z = wind.total * 0.04;
      r.rotation.x = wind.total * 0.02;
    });
  });
  return (
    <>
      {list.map((tree, i) => (
        <group key={`side-${i}`} position={tree.pos} scale={tree.scale}>
          {/* Trunk */}
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.07, 0.12, 1.7, 6]} />
            <meshStandardMaterial color="#3a2818" roughness={1} />
          </mesh>
          {/* Foliage — 1 sphere dengan sway via parent group ref */}
          <group
            ref={(el) => {
              refs.current[i] = el;
            }}
            position={[0, 1.7, 0]}
          >
            <mesh position={[0, 0.45, 0]}>
              <sphereGeometry args={[0.7, 12, 8]} />
              <meshStandardMaterial
                color={SIDE_TREE_COLORS[tree.hueIdx]}
                roughness={1}
              />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
};

// Bushes — small dark green clusters scattered di sides path. Tone
// match twilight forest (gelap, sedikit kebiruan). Static.
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

const Bushes = () => (
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
          {/* Stem */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.12, 6]} />
            <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
          </mesh>
          {/* Cap dome — brown-amber tone (autumn forest) */}
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

const Mushrooms = () => (
  <>
    {MUSHROOM_CLUSTERS_R1.map((pos, i) => (
      <MushroomCluster key={`mush-${i}`} pos={pos} />
    ))}
  </>
);

// Stone monument di end-of-path z=-32 — tujuan emosional saat user
// jalan sampai ujung lorong di FPV. Engraving puitis. DistantFigure
// (z=-34) berdiri SETELAH monument — viewer baca monument dulu, lalu
// liat siluet figure beyond it.
const StoneMonument = ({ onClick }) => (
  <group
    position={[0, 0, -32]}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    onPointerOver={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    }}
    onPointerOut={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'auto';
    }}
  >
    {/* Base block — wider stone foundation */}
    <mesh position={[0, 0.2, 0]} castShadow>
      <boxGeometry args={[1.5, 0.4, 0.6]} />
      <meshStandardMaterial color="#3a3530" roughness={0.95} />
    </mesh>
    {/* Vertical slab (main body) */}
    <mesh position={[0, 1.2, 0]} castShadow>
      <boxGeometry args={[1.0, 1.6, 0.18]} />
      <meshStandardMaterial color="#4a4540" roughness={0.92} />
    </mesh>
    {/* Curved arch top — half cylinder */}
    <mesh position={[0, 2.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.5, 0.5, 0.18, 16, 1, false, 0, Math.PI]} />
      <meshStandardMaterial color="#4a4540" roughness={0.92} />
    </mesh>
    {/* Engraving Html — text terukir di slab */}
    <Html
      position={[0, 1.4, 0.10]}
      center
      distanceFactor={5.5}
      occlude={false}
      transform
      rotation={[0, 0, 0]}
    >
      <div
        className="text-center pointer-events-none select-none whitespace-nowrap"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontSize: '11px',
          color: '#1a0d05',
          fontWeight: 500,
          lineHeight: '1.4',
          letterSpacing: '0.04em',
          textShadow: '0 0 1px rgba(180, 150, 100, 0.3)',
        }}
      >
        Untuk yang menunggu
        <br />
        di ujung lorong
      </div>
    </Html>
    {/* Subtle moss growth at base — small dark green patches */}
    <mesh position={[-0.5, 0.42, 0.28]} rotation={[-Math.PI / 2, 0, 0.4]}>
      <planeGeometry args={[0.18, 0.12]} />
      <meshStandardMaterial color="#2a3a20" roughness={1} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0.45, 0.42, 0.28]} rotation={[-Math.PI / 2, 0, -0.5]}>
      <planeGeometry args={[0.16, 0.10]} />
      <meshStandardMaterial color="#2a3a20" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// Tree-specific decorations — bikin tiap pohon-tahun distinct, bukan
// copy-paste. 5 types didistribusi ke 10 trees by index. Position
// relative ke tree group, side = sign(tree.x) untuk path-facing.
const TREE_DECORATION_TYPES = [
  'blossom', // tree[0] — era recent celebration
  'lampion', // tree[1]
  'ribbon', // tree[2]
  'nest', // tree[3]
  'plate', // tree[4]
  'lampion', // tree[5]
  'ribbon', // tree[6]
  'blossom', // tree[7]
  'nest', // tree[8]
  'plate', // tree[9] — debut era marker
];

const TreeDecoration = ({ type, side }) => {
  switch (type) {
    case 'blossom':
      return (
        <group position={[-side * 0.55, 2.7, 0.55]}>
          <mesh>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial
              color="#f4b8c8"
              emissive="#f4b8c8"
              emissiveIntensity={0.35}
              roughness={0.6}
            />
          </mesh>
          {/* Bigger halo di sekitar blossom — glow soft */}
          <mesh>
            <sphereGeometry args={[0.24, 10, 8]} />
            <meshBasicMaterial
              color="#f4b8c8"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    case 'lampion':
      return (
        <group position={[-side * 0.5, 2.0, 0.45]}>
          {/* String menggantung dari foliage */}
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.7, 4]} />
            <meshStandardMaterial color="#5a4530" />
          </mesh>
          {/* Lampion body — sphere oranye glowing */}
          <mesh>
            <sphereGeometry args={[0.10, 12, 10]} />
            <meshStandardMaterial
              color="#d8745a"
              emissive="#ff8848"
              emissiveIntensity={0.55}
              roughness={0.7}
            />
          </mesh>
          {/* Rope tail di bawah */}
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.08, 4]} />
            <meshStandardMaterial color="#5a4530" />
          </mesh>
        </group>
      );
    case 'ribbon':
      return (
        <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.025, 6, 16]} />
          <meshStandardMaterial color="#c44a3e" roughness={0.85} />
        </mesh>
      );
    case 'nest':
      return (
        <group position={[-side * 0.45, 3.45, 0.2]}>
          {/* Nest dome */}
          <mesh>
            <sphereGeometry args={[0.10, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#5a4530" roughness={0.95} />
          </mesh>
          {/* Inner rim */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.075, 0.012, 5, 12]} />
            <meshStandardMaterial color="#3a2c1c" roughness={1} />
          </mesh>
        </group>
      );
    case 'plate':
      return (
        <group position={[0, 1.4, 0.18]}>
          {/* Plank wood vertical attached to trunk */}
          <mesh>
            <boxGeometry args={[0.32, 0.20, 0.025]} />
            <meshStandardMaterial color="#5a3e2b" roughness={0.85} />
          </mesh>
          {/* Border darker */}
          <mesh position={[0, 0.115, 0.014]}>
            <boxGeometry args={[0.34, 0.018, 0.018]} />
            <meshStandardMaterial color="#3a2616" roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.115, 0.014]}>
            <boxGeometry args={[0.34, 0.018, 0.018]} />
            <meshStandardMaterial color="#3a2616" roughness={0.95} />
          </mesh>
          {/* Small nail dots */}
          <mesh position={[-0.13, 0.07, 0.018]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color="#2a2018" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.13, 0.07, 0.018]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color="#2a2018" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
};

// Bangku kayu tua — weathered, di-side path antara owl dan rabbit
// (z=-15 right side, opposite rabbit di kiri). Dengan 2 daun gugur
// settle di seat — kasih kesan "udah lama nggak diduduki".
const OldBench = ({ onClick }) => (
  <group
    position={[3.0, 0, -15]}
    rotation={[0, -Math.PI / 2.4, 0]}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    onPointerOver={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    }}
    onPointerOut={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'auto';
    }}
  >
    {/* Seat plank */}
    <mesh position={[0, 0.4, 0]} castShadow>
      <boxGeometry args={[1.4, 0.05, 0.36]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Backrest */}
    <mesh position={[0, 0.66, -0.16]} castShadow>
      <boxGeometry args={[1.4, 0.45, 0.05]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Legs kiri-kanan */}
    <mesh position={[-0.55, 0.2, 0]}>
      <boxGeometry args={[0.07, 0.4, 0.28]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    <mesh position={[0.55, 0.2, 0]}>
      <boxGeometry args={[0.07, 0.4, 0.28]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    {/* Sandaran tangan */}
    <mesh position={[-0.68, 0.5, 0]}>
      <boxGeometry args={[0.07, 0.22, 0.36]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    <mesh position={[0.68, 0.5, 0]}>
      <boxGeometry args={[0.07, 0.22, 0.36]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    {/* Daun gugur di seat — kerasa "udah lama nggak diduduki" */}
    <mesh position={[-0.3, 0.43, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <planeGeometry args={[0.14, 0.10]} />
      <meshStandardMaterial
        color="#7a4828"
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
    <mesh position={[0.4, 0.43, -0.08]} rotation={[-Math.PI / 2, 0, -0.5]}>
      <planeGeometry args={[0.16, 0.12]} />
      <meshStandardMaterial
        color="#a06430"
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  </group>
);

// Ayunan pohon — branch horizontal dari foliage tree[5] (z≈-18.67,
// x=2.6) cantilever toward path. Swing assembly hanging dari branch
// tip dengan 2 rope + plank seat. Pendulum motion sync dengan wind
// (rotation.x dari wind.total).
const TreeSwing = ({ activeRef, onClick }) => {
  const swingRef = useRef();
  const windPhase = -18.67 * 0.13 + 1.0;
  useFrame((state) => {
    if (!swingRef.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t, windPhase);
    // Decay 0→1→0 over 3s setelah click. Boost amplitudo + frequency
    // supaya kerasa "didorong" — physics fakery.
    const dt = t - (activeRef?.current ?? -Infinity);
    let boost = 0;
    let pushFreq = 0;
    if (dt >= 0 && dt < 3) {
      const u = dt / 3;
      // Initial spike yang decay exponential
      boost = (1 - u) * Math.exp(-u * 1.2);
      // Sinusoidal push at ~0.7 Hz (natural pendulum cadence)
      pushFreq = Math.sin(dt * 4.4) * boost * 0.6;
    }
    // Pendulum forward-back (rotation X) + idle drift + push
    swingRef.current.rotation.x =
      wind.total * 0.12 + Math.sin(t * 0.6) * 0.04 + pushFreq;
  });
  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.();
  };
  const handleOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handleOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  };
  return (
    <>
      {/* Branch horizontal di foliage tree[5] (y=2.7 = foliage center) */}
      <mesh position={[1.95, 2.7, -18.67]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.07, 1.3, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={1} />
      </mesh>
      {/* Swing pivot di tip cabang (1.3, 2.7, -18.67), rope 2.1 ke plank */}
      <group position={[1.3, 2.7, -18.67]}>
        <group
          ref={swingRef}
          onClick={handleClick}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          {/* 2 rope hanging — 2.1 panjang */}
          <mesh position={[-0.16, -1.05, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 2.1, 6]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
          <mesh position={[0.16, -1.05, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 2.1, 6]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
          {/* Plank seat — di y=0.6 world (rest level) */}
          <mesh position={[0, -2.12, 0]} castShadow>
            <boxGeometry args={[0.42, 0.04, 0.15]} />
            <meshStandardMaterial color="#4a3220" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </>
  );
};

// Wind chime — branch dari tree[2] (z≈-8.67, x=-2.6) cantilever
// toward path. Chime assembly: top wood disc + 5 metal tubes hang dari
// strings + center clapper sphere. Group sway via rotation Z+X dari
// wind, kasih kesan "tubes tinkling kena angin".
const CHIME_TUBE_LENGTHS = [0.30, 0.25, 0.32, 0.27, 0.28];
const CHIME_TUBE_X = [-0.06, -0.03, 0, 0.03, 0.06];

const WindChime = ({ activeRef, onClick }) => {
  const groupRef = useRef();
  const windPhase = -8.67 * 0.13 + 2.0;
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t, windPhase);
    // Click boost — quick wobble decay over ~2s
    const dt = t - (activeRef?.current ?? -Infinity);
    let boostZ = 0;
    let boostX = 0;
    if (dt >= 0 && dt < 2) {
      const u = dt / 2;
      const env = Math.exp(-u * 2.2);
      boostZ = Math.sin(dt * 8.0) * env * 0.18;
      boostX = Math.sin(dt * 11.5) * env * 0.10;
    }
    // Sway 2 axis — chime swings sideways (Z) lebih dominant, slight forward (X)
    groupRef.current.rotation.z = wind.total * 0.08 + boostZ;
    groupRef.current.rotation.x = wind.sway * 0.04 + boostX;
  });
  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.();
  };
  const handleOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handleOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  };
  return (
    <>
      {/* Branch horizontal di foliage tree[2] (y=2.85 sedikit upper foliage) */}
      <mesh position={[-1.95, 2.85, -8.67]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.06, 1.0, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={1} />
      </mesh>
      {/* Chime pivot di tip cabang (-1.45, 2.85, -8.67) */}
      <group position={[-1.45, 2.85, -8.67]}>
        <group
          ref={groupRef}
          onClick={handleClick}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          {/* String dari branch ke top disc */}
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.3, 4]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
          {/* Top wooden disc */}
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.10, 0.10, 0.025, 12]} />
            <meshStandardMaterial color="#3a2818" roughness={0.9} />
          </mesh>
          {/* 5 chime tubes — metal silver sedikit emissive */}
          {CHIME_TUBE_X.map((dx, i) => {
            const len = CHIME_TUBE_LENGTHS[i];
            return (
              <group key={`tube-${i}`}>
                {/* String tube ke disc */}
                <mesh position={[dx, -0.45, 0]}>
                  <cylinderGeometry args={[0.003, 0.003, 0.15, 4]} />
                  <meshStandardMaterial color="#5a4530" roughness={1} />
                </mesh>
                {/* Metal tube */}
                <mesh position={[dx, -0.55 - len / 2, 0]}>
                  <cylinderGeometry args={[0.013, 0.013, len, 8]} />
                  <meshStandardMaterial
                    color="#bcbcad"
                    roughness={0.35}
                    metalness={0.7}
                    emissive="#bcbcad"
                    emissiveIntensity={0.08}
                  />
                </mesh>
              </group>
            );
          })}
          {/* Center clapper — kecil bulat di antara tubes */}
          <mesh position={[0, -0.78, 0.04]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color="#5a4530" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </>
  );
};

// Puddle — small water reflection di path, refleksi langit/moon/stars
// kasih extra magic ke twilight scene. MeshReflectorMaterial mahal di
// GPU, fallback plain material di mobile.
const Puddle = ({ isMobile }) => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0.4, 0.005, -12]}
    receiveShadow
  >
    <circleGeometry args={[0.75, 24]} />
    {isMobile ? (
      <meshStandardMaterial
        color="#1a1f2e"
        roughness={0.5}
        metalness={0.3}
      />
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

// Pohon-tahun: trunk pendek + 1 foliage cluster + label year
// melayang. Hover lift + emissive glow, click → modal milestone.
const YearTree = ({ tree, idx, hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const foliageRef = useRef();
  const matRef = useRef();
  // Per-tree wind phase deterministik dari posisi — supaya pohon-pohon
  // nggak sway in sync (tiap tree gerak dengan offset beda)
  const windPhase = tree.x * 0.27 + tree.z * 0.13;

  useFrame((state, delta) => {
    if (!groupRef.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    const targetY = hovered ? 0.25 : 0;
    const targetEmissive = hovered ? 0.4 : 0;
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
    // Foliage sway — pivot di trunk top (group origin di y=1.2),
    // rotation Z bikin foliage swing kiri-kanan match wind direction
    if (foliageRef.current) {
      const wind = getWind(t, windPhase);
      foliageRef.current.rotation.z = wind.total * 0.045;
      foliageRef.current.rotation.x = wind.total * 0.025;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[tree.x, 0, tree.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(tree.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(tree.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(tree);
      }}
    >
      {/* Trunk — static (nggak sway). Lebih tinggi dan tebal: 2.2 unit
          height (was 1.2), radius 0.10/0.15 (was 0.08/0.13) supaya
          proporsi tetap match */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.10, 0.15, 2.2, 8]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Foliage assembly — pivot di trunk top (y=2.2). Foliage radius
          0.95 (was 0.6), inner offset y=0.5 → center y world 2.7,
          top y 3.65. Canopy feel di FPV (eye level 1.6 lewat di bawah) */}
      <group ref={foliageRef} position={[0, 2.2, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.95, 14, 10]} />
          <meshStandardMaterial
            ref={matRef}
            color={tree.color}
            emissive={tree.color}
            emissiveIntensity={0}
            roughness={0.75}
          />
        </mesh>
      </group>
      {/* Tree-specific decoration — different per tree by idx */}
      <TreeDecoration
        type={TREE_DECORATION_TYPES[idx % TREE_DECORATION_TYPES.length]}
        side={Math.sign(tree.x)}
      />
      {/* Year label — Fraunces italic memorial style + separator line.
          Naik ke 4.0 supaya tetap di atas foliage 3.65 */}
      <Html position={[0, 4.0, 0]} center distanceFactor={10}>
        <div
          className={`text-center pointer-events-none select-none whitespace-nowrap transition-all duration-300 ease-out ${
            hovered ? '-translate-y-1' : ''
          }`}
        >
          <div
            className={`transition-colors leading-none ${
              hovered ? 'text-white' : 'text-white/90'
            }`}
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: '22px',
              letterSpacing: '0.02em',
              textShadow: hovered
                ? '0 0 16px rgba(255, 220, 160, 0.5)'
                : '0 0 8px rgba(0, 0, 0, 0.4)',
            }}
          >
            {tree.year}
          </div>
          {/* Separator line subtle */}
          <div
            className={`mx-auto my-1.5 h-px transition-all ${
              hovered ? 'w-6 bg-white/55' : 'w-4 bg-white/30'
            }`}
          />
          <div
            className={`text-[9px] uppercase tracking-[0.28em] transition-colors ${
              hovered ? 'text-white/85' : 'text-white/55'
            }`}
          >
            {tree.badge}
          </div>
        </div>
      </Html>
    </group>
  );
};

// =============================================================
// KONSTELASI MILESTONE — bintang per milestone di langit
// =============================================================
//
// Replace YearTree (di-path) dengan StarMilestone (di-langit). Tiap
// bintang di-position pakai milestoneSkyPosition(id) → era-grouped
// position di sky dome. Click handler tetap sama (parent passes
// onClick(starData), modal pagination intact).
//
// Visual: emissive sphere body + halo 2x larger transparent,
// emissiveIntensity di-pulse via useFrame (twinkle subtle), boost
// glow + scale saat hover, sustained pulse saat star di-select
// (selectedId match) untuk continuity di MilestoneOverlay.
const StarMilestone = ({
  star,
  hovered,
  selected,
  signatureEvent,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const matRef = useRef();
  const haloMatRef = useRef();
  // Twinkle phase deterministic per id supaya bintang-bintang gak
  // pulse synchronously (busy + unrealistic).
  const twinklePhase = useMemo(() => hashSeed(`${star.id}-tw`) * Math.PI * 2, [star.id]);
  // Upcoming (date null) dim outline only — dapet treatment beda.
  const isUpcoming = star.upcoming === true;
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Base twinkle — sine modulation 0.6 Hz, range emissive 0.8..1.4.
    const twinkle = 1.1 + Math.sin(t * 0.6 + twinklePhase) * 0.3;
    let glow = isUpcoming ? 0.4 : 1.0;
    let scaleMul = 1.0;
    // Hover lift
    if (hovered) {
      glow += 0.8;
      scaleMul = 1.15;
    }
    // Selected pulse (modal open) — sustained glow + slow breath
    if (selected) {
      glow += 0.4 + Math.sin(t * 1.4) * 0.2;
      scaleMul *= 1.08;
    }
    // Signature event — first/last star clicked → cross-scene effect
    // already triggered in parent. Here we don't re-amplify (avoid
    // double-pulsing the clicked star). Era-anchor stars (eraIdx 0
    // or last) bisa subtle pulse saat 'old'/'recent' event aktif.
    if (signatureEvent) {
      const dt = t - signatureEvent.time;
      if (dt > 0 && dt < 3.0) {
        const u = dt / 3.0;
        const env = Math.sin(u * Math.PI);
        if (signatureEvent.type === 'recent' && star.isRecentAnchor) {
          glow += env * 0.6;
        } else if (signatureEvent.type === 'old' && star.isOldAnchor) {
          glow += env * 0.6;
        }
      }
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = glow * twinkle;
    }
    if (haloMatRef.current) {
      const haloOp = Math.max(
        0.06,
        (isUpcoming ? 0.10 : 0.20) + (hovered ? 0.18 : 0) + (selected ? 0.12 : 0),
      );
      haloMatRef.current.opacity = haloOp;
    }
    groupRef.current.scale.setScalar(scaleMul);
  });
  const baseSize = 0.32;
  return (
    <group
      ref={groupRef}
      position={[star.x, star.y, star.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(star);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver?.(star.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut?.(star.id);
      }}
    >
      {/* Body — emissive sphere */}
      <mesh>
        <sphereGeometry args={[baseSize, 16, 12]} />
        {isUpcoming ? (
          // Upcoming: wireframe-ish via low opacity standard, no emissive
          <meshStandardMaterial
            ref={matRef}
            color={star.color}
            emissive={star.color}
            emissiveIntensity={0.4}
            roughness={0.9}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            ref={matRef}
            color={star.color}
            emissive={star.color}
            emissiveIntensity={1.0}
            roughness={0.85}
            toneMapped={false}
          />
        )}
      </mesh>
      {/* Halo — soft glow 2.4x */}
      <mesh>
        <sphereGeometry args={[baseSize * 2.4, 12, 8]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={star.color}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Garis konstelasi — connect bintang dalam satu era. Pakai vanilla
// THREE.LineSegments dgn BufferGeometry: list of (start, end) points
// untuk setiap pair adjacent dalam milestoneIds order. Color subtle
// per era. Fade in saat scene mount via material.opacity ramp.
const ConstellationLines = ({ stars }) => {
  const geometryRef = useRef();
  const matRef = useRef();
  const startTimeRef = useRef(-1);

  // Build line segments: untuk tiap era, connect bintang adjacent
  // pakai gl.LINES (2 points = 1 segment). Plus per-era warna via
  // vertex colors.
  const { positions, colors } = useMemo(() => {
    const pos = [];
    const col = [];
    const byId = new Map(stars.map((s) => [s.id, s]));
    ERA_DEFS.forEach((era) => {
      const ids = era.milestoneIds;
      // Parse era color hex → rgb 0..1
      const hex = era.color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      for (let i = 0; i < ids.length - 1; i++) {
        const a = byId.get(ids[i]);
        const c = byId.get(ids[i + 1]);
        if (!a || !c) continue;
        pos.push(a.x, a.y, a.z, c.x, c.y, c.z);
        col.push(r, g, b, r, g, b);
      }
    });
    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
    };
  }, [stars]);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    if (startTimeRef.current < 0) startTimeRef.current = t;
    const dt = t - startTimeRef.current;
    // Fade in over 4s saat scene mount (kasih waktu user fokus ke
    // bintang dulu sebelum lines reveal)
    const fadeIn = Math.min(1, Math.max(0, (dt - 1.5) / 4));
    // Subtle breathing 0.85..1.0 supaya gak pure static
    const breath = 0.92 + Math.sin(t * 0.3) * 0.08;
    matRef.current.opacity = 0.22 * fadeIn * breath;
  });

  if (positions.length === 0) return null;
  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
      />
    </lineSegments>
  );
};

// Era label — Html floating di atas konstelasi center, fade in saat
// camera pointing dekat ke arah era itu. Subtle, gak persistent —
// kasih hint nama era tanpa clutter scene.
const ConstellationLabels = () => {
  const groupRefs = useRef([]);
  useFrame((state) => {
    const camDir = new THREE.Vector3();
    state.camera.getWorldDirection(camDir);
    ERA_DEFS.forEach((era, i) => {
      const ref = groupRefs.current[i];
      if (!ref) return;
      const eraCenter = skyPosition(era.azimuth, era.altitude);
      const toCenter = new THREE.Vector3(
        eraCenter[0],
        eraCenter[1],
        eraCenter[2],
      ).sub(state.camera.position).normalize();
      const dot = camDir.dot(toCenter);
      // Visible saat camera melihat ke arah era (dot > 0.85), fade
      // di tepi — soft, contextual.
      const op = Math.max(0, (dot - 0.82) / 0.18);
      ref.style.opacity = String(op * 0.7);
    });
  });
  return (
    <>
      {ERA_DEFS.map((era, i) => {
        const center = skyPosition(era.azimuth, era.altitude);
        // Label posisi sedikit di atas center konstelasi
        const labelPos = [center[0], center[1] + 1.8, center[2]];
        return (
          <Html
            key={era.id}
            position={labelPos}
            center
            distanceFactor={14}
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div
              ref={(el) => {
                groupRefs.current[i] = el;
              }}
              className="whitespace-nowrap text-center"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
                fontSize: '13px',
                color: era.color,
                opacity: 0,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                textShadow: '0 0 8px rgba(0,0,0,0.7)',
                transition: 'opacity 400ms ease-out',
              }}
            >
              {era.name}
            </div>
          </Html>
        );
      })}
    </>
  );
};

// Jalur tanah membentang dari awal ke akhir lorong. Lebih sempit dari
// floor utama supaya kerasa kayak path/garden walk, bukan field.
const Path = () => (
  <>
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, (PATH_START_Z + PATH_END_Z) / 2]}
    >
      <planeGeometry args={[2.2, Math.abs(PATH_END_Z - PATH_START_Z) + 6]} />
      <meshStandardMaterial color="#3a3022" roughness={1} />
    </mesh>
    {/* Floor sekitar path — palette twilight senja sedikit purple */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, -16]}>
      <planeGeometry args={[40, 50]} />
      <meshStandardMaterial color="#1f2335" roughness={1} />
    </mesh>
  </>
);

// Ground patches — tone variasi di floor supaya nggak flat. Beberapa
// patch lebih warm (kecoklatan), beberapa lebih cool (gelap kebiruan).
// Match palette twilight + autumn vibe.
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
const GroundPatches = () => (
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

// Bintang-bintang di langit — Points geometry distribute di upper
// hemisphere radius 35-55. Per-star vertex colors variasi (warm
// kuning / cool kebiruan / white) supaya kerasa kayak field bintang
// real. Pulse opacity material untuk twinkle subtle.
const STAR_COUNT = 240;
const { STAR_POSITIONS, STAR_COLORS } = (() => {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.48;
    const r = 35 + Math.random() * 20;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) + 4;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    // Color variation: 60% white, 25% warm yellow, 15% cool blue
    const tier = Math.random();
    if (tier < 0.6) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    } else if (tier < 0.85) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.92;
      colors[i * 3 + 2] = 0.78;
    } else {
      colors[i * 3] = 0.85;
      colors[i * 3 + 1] = 0.92;
      colors[i * 3 + 2] = 1;
    }
  }
  return { STAR_POSITIONS: positions, STAR_COLORS: colors };
})();

const Stars = () => {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.75 + Math.sin(t * 0.7) * 0.15;
  });
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={STAR_POSITIONS}
          count={STAR_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={STAR_COLORS}
          count={STAR_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={1.8}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
};

// Highlight stars — 6 bright sphere stars di posisi tetap, kasih
// "anchor" visual di langit (focal points). Emissive intensity pulse
// per star dengan phase beda supaya twinkle natural.
const HIGHLIGHT_STAR_DEFS = [
  { pos: [-22, 22, -28], scale: 0.28, color: '#fff8d8', phase: 0 },
  { pos: [16, 24, -22], scale: 0.34, color: '#fffae8', phase: 1.4 },
  { pos: [-8, 28, -32], scale: 0.30, color: '#e8f0ff', phase: 2.7 },
  { pos: [22, 19, -10], scale: 0.26, color: '#fff8d8', phase: 0.8 },
  { pos: [-28, 18, 5], scale: 0.30, color: '#fffae8', phase: 2.0 },
  { pos: [4, 30, -18], scale: 0.36, color: '#fff4c8', phase: 3.2 }, // brightest, near zenith
];

const HighlightStar = ({ pos, scale, color, phase, signatureEvent }) => {
  const matRef = useRef();
  const haloMatRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    // Twinkle base
    const fast = 0.5 + 0.5 * Math.sin(t * 6 + phase);
    const slow = 0.5 + 0.5 * Math.sin(t * 0.6 + phase * 1.4);
    let baseIntensity = 1.4 + fast * 0.6 + slow * 0.4;
    let haloOpacity = 0.18 + slow * 0.15;
    // Signature 'old' — semua highlight stars sync flash bareng
    if (signatureEvent && signatureEvent.type === 'old') {
      const dt = t - signatureEvent.time;
      if (dt > 0 && dt < 3.5) {
        let boost = 0;
        if (dt < 0.4) boost = dt / 0.4;
        else if (dt < 2.5) boost = 1;
        else boost = (3.5 - dt) / 1;
        baseIntensity += boost * 2.0;
        haloOpacity += boost * 0.5;
      }
    }
    matRef.current.emissiveIntensity = baseIntensity;
    if (haloMatRef.current) {
      haloMatRef.current.opacity = haloOpacity;
    }
  });
  return (
    <group position={pos} scale={scale}>
      {/* Body sphere emissive */}
      <mesh>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          roughness={0.85}
          toneMapped={false}
        />
      </mesh>
      {/* Halo soft glow — sphere lebih besar transparent */}
      <mesh>
        <sphereGeometry args={[2.2, 12, 8]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={color}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Mobile cull: 6 → 4 highlight stars. Tiap star punya useFrame dgn
// pulsing emissive — turunin counts kasih nafas ke main thread.
const HighlightStars = ({ signatureEvent, isMobile }) => {
  const list = isMobile ? HIGHLIGHT_STAR_DEFS.slice(0, 4) : HIGHLIGHT_STAR_DEFS;
  return (
    <>
      {list.map((s, i) => (
        <HighlightStar
          key={`hl-star-${i}`}
          {...s}
          signatureEvent={signatureEvent}
        />
      ))}
    </>
  );
};

// Bulan — sphere emissive cream-yellow di upper-back-left. Visible dari
// camera default angle (camera looking at z=-16 from upper-right). Moon
// di posisi (-12, 18, -28) supaya kelihatan tinggi & belakang.
const Moon = () => (
  <group position={[-12, 18, -28]}>
    {/* Moon body */}
    <mesh>
      <sphereGeometry args={[1.4, 24, 18]} />
      <meshStandardMaterial
        color="#fff8d8"
        emissive="#ffe8a8"
        emissiveIntensity={1.2}
        roughness={0.85}
      />
    </mesh>
    {/* Moon halo — slightly larger transparent sphere */}
    <mesh>
      <sphereGeometry args={[1.9, 20, 16]} />
      <meshBasicMaterial
        color="#ffe8a8"
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </mesh>
  </group>
);

// Distant forest silhouette — ring of dark trees di perimeter scene
// (radius 22-30). Color desaturated cool-purple supaya fade ke fog.
// Cuma trunk + foliage sphere besar, no animation, no detail.
const DISTANT_FOREST_DEFS = (() => {
  const arr = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const r = 22 + Math.random() * 8;
    arr.push({
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      scale: 1.5 + Math.random() * 1.0,
      hue: Math.random() > 0.5 ? '#1e2238' : '#2a2238',
    });
  }
  return arr;
})();
// Mobile cull: 14 → 9. Static trees (no animation) cuma kena pas init,
// tapi tiap mesh tambah draw call. Mengurangi sini help fillrate juga.
const DistantForest = ({ isMobile }) => {
  const list = isMobile ? DISTANT_FOREST_DEFS.slice(0, 9) : DISTANT_FOREST_DEFS;
  return (
    <>
      {list.map((t, i) => (
        <group key={`distant-${i}`} position={t.pos} scale={t.scale}>
          {/* Trunk pendek */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.1, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#15182a" roughness={1} />
          </mesh>
          {/* Foliage besar dengan tone desaturated */}
          <mesh position={[0, 1.85, 0]}>
            <sphereGeometry args={[0.7, 10, 8]} />
            <meshStandardMaterial color={t.hue} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
};

// Daun gugur yang udah settle di tanah — accumulate di sekitar base
// pohon. Flat plane tipis tone autumn, scatter random per tree.
const SETTLED_LEAF_COLORS = ['#7a4828', '#8a5a30', '#5a3818', '#a06430'];
const SETTLED_LEAF_DEFS = (() => {
  // Generate berdasarkan tree positions — tapi karena tree z dynamic
  // dari ELI_TIMELINE.length, hardcode sebaran along path
  const arr = [];
  for (let i = 0; i < 10; i++) {
    const z = -2 + (-30 / 9) * i;
    const side = i % 2 === 0 ? -1 : 1;
    const baseX = side * 2.6;
    // 3-5 leaves around tree base
    const count = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < count; j++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 0.6;
      arr.push({
        pos: [baseX + Math.cos(angle) * r, 0.008, z + Math.sin(angle) * r],
        rot: Math.random() * Math.PI * 2,
        scale: 0.7 + Math.random() * 0.5,
        color: SETTLED_LEAF_COLORS[Math.floor(Math.random() * SETTLED_LEAF_COLORS.length)],
      });
    }
  }
  return arr;
})();
const SettledLeaves = () => (
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

// Batu-batu border path — 2 baris (kiri dan kanan path) dengan jarak
// reguler. Random size dan rotation kasih kesan natural.
const PATH_EDGE_STONES = (() => {
  const arr = [];
  const stoneZ = [];
  for (let z = PATH_START_Z; z >= PATH_END_Z; z -= 1.6) stoneZ.push(z);
  stoneZ.forEach((z, i) => {
    arr.push({
      pos: [-1.25 + (Math.random() - 0.5) * 0.1, 0.06, z + (Math.random() - 0.5) * 0.3],
      scale: [0.18 + Math.random() * 0.1, 0.10 + Math.random() * 0.05, 0.16 + Math.random() * 0.08],
      rot: Math.random() * Math.PI,
    });
    arr.push({
      pos: [1.25 + (Math.random() - 0.5) * 0.1, 0.06, z + (Math.random() - 0.5) * 0.3],
      scale: [0.18 + Math.random() * 0.1, 0.10 + Math.random() * 0.05, 0.16 + Math.random() * 0.08],
      rot: Math.random() * Math.PI,
    });
  });
  return arr;
})();
const PathEdgeStones = () => (
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

// Sync camera saat user toggle viewMode. Smooth lerp transition over
// ~1.2s sambil controls (Orbit/PointerLock) di-disable di luar — flag
// `transitioning` di parent. Setelah transition selesai, controls
// diambil alih.
const CAMERA_TARGETS = {
  // Orbit: camera lebih rendah + lookAt mid-air supaya langit dominan,
  // tanah cuma terlihat di tepi bawah view.
  orbit: { pos: new THREE.Vector3(5, 4, 8), look: new THREE.Vector3(0, 6, -12) },
  // FPV "tatap langit": user di tengah path, eye level, look ke sky
  // mid-front (atas + sedikit ke depan).
  fpv: { pos: new THREE.Vector3(0, 1.7, -8), look: new THREE.Vector3(0, 9, -16) },
};

const CameraSync = ({ viewMode, transitioning }) => {
  const { camera } = useThree();
  useFrame((_, delta) => {
    if (!transitioning) return;
    const target = CAMERA_TARGETS[viewMode] || CAMERA_TARGETS.orbit;
    const factor = Math.min(delta * 4.5, 1);
    camera.position.lerp(target.pos, factor);
    camera.lookAt(target.look);
  });
  return null;
};

// FPV movement controller — listen WASD/arrow keys (desktop), update
// camera.position per frame. Y di-lock di 1.6 (eye level), x/z clamp.
const FPV_FORWARD = new THREE.Vector3();
const FPV_RIGHT = new THREE.Vector3();

// Mobile FPV — gerakan via joystickRef (left thumb), look via lookRef
// (right swipe). Camera rotation order YXZ supaya pitch+yaw composition
// behave like proper FPS camera.
const MobileFPVMovement = ({ joystickRef, lookRef }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.rotation.order = 'YXZ';
  }, [camera]);
  useFrame((state, delta) => {
    // Apply look (yaw + pitch) dari lookRef
    camera.rotation.y = lookRef.current.yaw;
    camera.rotation.x = lookRef.current.pitch;
    camera.rotation.z = 0;
    // Movement dari joystickRef
    const speed = 3.0 * delta;
    camera.getWorldDirection(FPV_FORWARD);
    FPV_FORWARD.y = 0;
    FPV_FORWARD.normalize();
    FPV_RIGHT.crossVectors(FPV_FORWARD, camera.up).normalize();
    const jx = joystickRef.current.x;
    const jy = joystickRef.current.y;
    if (jy !== 0) camera.position.addScaledVector(FPV_FORWARD, jy * speed);
    if (jx !== 0) camera.position.addScaledVector(FPV_RIGHT, jx * speed);
    // Boundary + Y breathing
    camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
    camera.position.z = Math.max(-32, Math.min(0, camera.position.z));
    const moving = jx !== 0 || jy !== 0;
    const t = state.clock.elapsedTime;
    const bobAmp = moving ? 0.025 : 0.012;
    const bobFreq = moving ? 2.4 : 1.2;
    camera.position.y = 1.6 + Math.sin(t * bobFreq) * bobAmp;
  });
  return null;
};

const FPVMovement = ({ enabled }) => {
  const { camera } = useThree();
  const keysRef = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    if (!enabled) return undefined;
    const setKey = (e, value) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keysRef.current.w = value;
      else if (k === 's' || k === 'arrowdown') keysRef.current.s = value;
      else if (k === 'a' || k === 'arrowleft') keysRef.current.a = value;
      else if (k === 'd' || k === 'arrowright') keysRef.current.d = value;
    };
    const onDown = (e) => setKey(e, true);
    const onUp = (e) => setKey(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      keysRef.current = { w: false, a: false, s: false, d: false };
    };
  }, [enabled]);

  useFrame((state, delta) => {
    if (!enabled) return;
    const speed = 3.5 * delta;
    camera.getWorldDirection(FPV_FORWARD);
    FPV_FORWARD.y = 0;
    FPV_FORWARD.normalize();
    FPV_RIGHT.crossVectors(FPV_FORWARD, camera.up).normalize();
    const moving =
      keysRef.current.w ||
      keysRef.current.s ||
      keysRef.current.a ||
      keysRef.current.d;
    if (keysRef.current.w) camera.position.addScaledVector(FPV_FORWARD, speed);
    if (keysRef.current.s) camera.position.addScaledVector(FPV_FORWARD, -speed);
    if (keysRef.current.a) camera.position.addScaledVector(FPV_RIGHT, -speed);
    if (keysRef.current.d) camera.position.addScaledVector(FPV_RIGHT, speed);
    // Boundary — keep dalam corridor + sedikit outside, di luar path end
    camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
    camera.position.z = Math.max(-32, Math.min(0, camera.position.z));
    // Camera Y breathing: idle = subtle 1.6 ± 0.012, walking = sedikit
    // lebih besar (head bob ritmis ngikut langkah). Frequency walking
    // 2.4 (lebih cepat) vs idle 1.2 (lebih tenang).
    const t = state.clock.elapsedTime;
    const bobAmp = moving ? 0.025 : 0.012;
    const bobFreq = moving ? 2.4 : 1.2;
    camera.position.y = 1.6 + Math.sin(t * bobFreq) * bobAmp;
  });
  return null;
};

const LorongScene = ({
  trees,
  hoveredTreeId,
  selectedTreeId,
  isMobile,
  signatureEvent,
  viewMode,
  transitioning,
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
}) => (
  <>
    {/* Twilight purple-blue, lebih senja vibe daripada solid blue-gray */}
    <fog attach="fog" args={['#1f2335', 14, 48]} />
    <color attach="background" args={['#1f2335']} />
    <ambientLight intensity={0.5} />
    {/* Sunset key light — warm dari upper-front */}
    <directionalLight
      position={[6, 12, 4]}
      intensity={1.2}
      color="#ffd9a8"
    />
    {/* Moon rim light — cool blue dari upper-back-left, kasih rim
        lighting di edge objek + silhouette pop. Posisi z=-25 supaya
        cahaya datang dari ujung lorong (backlight terhadap camera). */}
    <directionalLight
      position={[-8, 14, -25]}
      intensity={0.75}
      color="#8aa8d8"
    />
    {/* Horizon glow di ujung path — point light warm amber yang
        scatter di fog, kasih kesan "ada sesuatu di ujung" yang nge-pull
        user untuk lihat lebih jauh. DistantFigure jadi silhouetted
        terhadap glow ini. */}
    <pointLight
      position={[0, 2.5, -33]}
      intensity={2.0}
      color="#ffaa50"
      distance={12}
      decay={2}
    />
    <Path />
    <GroundPatches />
    <Footprints />
    <PathEdgeStones />
    <SettledLeaves />
    <Puddle isMobile={isMobile} />
    <DistantForest isMobile={isMobile} />
    {/* SideTrees + YearPlaques + FlyingLeavesGust + Owls dropped — tied
        to tree metaphor / block sky view di tema konstelasi. Owls
        perched di foliage tree gak relevan saat trees pindah ke langit. */}
    <Bushes />
    <Mushrooms />
    <Stars />
    <HighlightStars signatureEvent={signatureEvent} isMobile={isMobile} />
    <Moon />
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
    <Lanterns signatureEvent={signatureEvent} />
    <Rabbits />
    {!isMobile && <Bats />}
    <DistantFigure signatureEvent={signatureEvent} />
    <Fireflies count={isMobile ? 9 : 16} />
    <GroundMist count={isMobile ? 22 : 38} />
    {!isMobile && <MistPools />}
    <FallingLeaves count={isMobile ? 22 : 38} />
    <MemoryFragments isMobile={isMobile} />
    {/* Konstelasi milestone — bintang di langit, era-grouped */}
    <ConstellationLines stars={trees} />
    <ConstellationLabels />
    {trees.map((star) => (
      <StarMilestone
        key={star.id}
        star={star}
        hovered={hoveredTreeId === star.id}
        selected={selectedTreeId === star.id}
        signatureEvent={signatureEvent}
        onPointerOver={onTreeHover}
        onPointerOut={onTreeOut}
        onClick={onTreeClick}
      />
    ))}
    <CameraSync viewMode={viewMode} transitioning={transitioning} />
    {/* Controls cuma render setelah transition selesai supaya nggak
        fight dgn lerp. Saat transitioning=true, no control aktif. */}
    {!transitioning && viewMode === 'orbit' && (
      <OrbitControls
        target={ORBIT_TARGET}
        enableZoom
        minDistance={9}
        maxDistance={26}
        enablePan={false}
        // Polar range diperluas ke arah bawah (camera below target =
        // looking up) supaya user bisa "menengadah" ke konstelasi.
        // ORBIT_TARGET.y=6, eye level y=1.6 → polar ~110° dari +Y axis.
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={2.05}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.4}
        autoRotate
        autoRotateSpeed={0.12}
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

// Themed loading fallback — gradient senja palette dengan subtle
// shimmer line yang slide. Lebih tematik dari plain text.
const SceneFallback = () => (
  <div
    className="absolute inset-0 grid place-items-center overflow-hidden"
    style={{
      background:
        'linear-gradient(180deg, #0a0d18 0%, #1f2335 40%, #2a1f2a 70%, #3a2820 100%)',
    }}
  >
    {/* Shimmer line — gradient horizontal yang slide via CSS animation */}
    <div
      className="absolute inset-x-0 h-px top-1/2 opacity-60"
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(255,200,140,0.5), transparent)',
        animation: 'lorongShimmer 2.4s ease-in-out infinite',
      }}
    />
    <style>{`
      @keyframes lorongShimmer {
        0%, 100% { transform: translateX(-30%); opacity: 0.3; }
        50% { transform: translateX(30%); opacity: 0.7; }
      }
    `}</style>
    <div className="relative text-center -translate-y-2">
      <div className="text-white/55 text-[9px] uppercase tracking-[0.55em] mb-3">
        R1 · Petak Pertama
      </div>
      <div
        className="text-white/85 text-2xl"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontWeight: 300,
          letterSpacing: '0.01em',
        }}
      >
        Menyusuri lorong...
      </div>
    </div>
  </div>
);

// Web Share fallback — kalau Web Share gak ada (desktop browsers
// terutama), copy URL ke clipboard + flash subtle confirmation. Pakai
// link absolute supaya share dari mobile bawa user ke r1, bukan root.
const handleShare = async () => {
  const url = `${window.location.origin}/taman/r1`;
  const data = {
    title: 'Pohon-Pohon yang Mengingat',
    text: `${ELI_TIMELINE.length} perjalanan Eli, dalam bentuk pohon-pohon di sebuah lorong.`,
    url,
  };
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(data)) {
      await navigator.share(data);
      return;
    }
  } catch {
    /* user cancel / share denied — fallback ke clipboard */
  }
  try {
    await navigator.clipboard.writeText(url);
    // Subtle visual feedback via document title flash
    const orig = document.title;
    document.title = 'Link disalin ✓';
    setTimeout(() => { document.title = orig; }, 1400);
  } catch {
    /* clipboard blocked — give up gracefully */
  }
};

const LorongHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 gap-2">
    <div className="pointer-events-auto">
      <Link
        to="/taman/peta"
        className="text-white/50 hover:text-white/85 text-[10px] sm:text-xs tracking-[0.2em] uppercase transition"
      >
        ← Peta Taman
      </Link>
    </div>
    {/* Hide center title on narrow screens — kompetisi dgn side links
        di < 480px bikin overflow + tampak crowded. Layar gede tetep
        keep judul di header. */}
    <div
      className="hidden sm:block text-white/85 text-sm tracking-wide"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      Pohon-Pohon yang Mengingat
    </div>
    <div className="pointer-events-auto flex items-center gap-3">
      <button
        type="button"
        onClick={handleShare}
        aria-label="Bagikan halaman ini"
        title="Bagikan"
        className="text-white/50 hover:text-white/85 transition flex items-center justify-center w-7 h-7"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>
      <Link
        to="/"
        className="text-white/50 hover:text-white/85 text-[10px] sm:text-xs tracking-[0.2em] uppercase transition"
      >
        Keluar →
      </Link>
    </div>
  </div>
);

// Cinematic intro title card — fade in saat first load, hold, fade
// out. Eyebrow + title Fraunces italic + poetic subtitle. Once done,
// removed dari DOM. User refresh untuk replay.
const IntroTitle = () => {
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 350); // start fade in
    const t2 = setTimeout(() => setVisible(false), 5500); // start fade out
    const t3 = setTimeout(() => setRemoved(true), 7800); // remove dari DOM
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  if (removed) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-[2200ms] ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Vignette gradient full-screen — darken edges supaya fokus
          ke center card */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d18]/45 via-transparent to-[#0a0d18]/45" />
      {/* Title card — solid bordered box dengan backdrop blur. Padding
          + text size responsive: di mobile sempit, text-5xl + px-14
          bikin overflow, dipotong jadi text-3xl + px-8. */}
      <div className="relative mx-6 px-8 py-9 sm:px-14 sm:py-12 -translate-y-6 rounded-md border border-white/15 bg-[#0a0d18]/85 backdrop-blur-md shadow-2xl">
        {/* Content */}
        <div className="relative text-center">
          <div className="text-white/60 text-[9px] sm:text-[10px] uppercase tracking-[0.45em] sm:tracking-[0.55em] mb-5 sm:mb-6">
            R1 · Petak Pertama
          </div>
          <h1
            className="text-white text-3xl sm:text-5xl mb-5 sm:mb-6 leading-[1.1]"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              fontWeight: 400,
              letterSpacing: '0.01em',
              textShadow: '0 0 40px rgba(255, 220, 160, 0.18)',
            }}
          >
            Pohon-Pohon yang Mengingat
          </h1>
          {/* Inner separator line antara title & subtitle */}
          <div className="mx-auto mb-5 w-12 h-px bg-white/30" />
          <div
            className="text-white/70 text-[13px]"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              letterSpacing: '0.02em',
            }}
          >
            {ELI_TIMELINE.length} perjalanan, satu lorong, satu senja yang panjang.
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile FPV controls overlay — joystick visual bottom-left + invisible
// touch zone full-screen. Touch left half = joystick movement, touch
// right half = swipe-look. Multi-touch via touch.identifier tracking.
const MobileFPVControls = ({ joystickRef, lookRef }) => {
  const baseRef = useRef();
  const stickRef = useRef();
  const joyTouchId = useRef(null);
  const lookTouchId = useRef(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const baseRect = useRef({ cx: 0, cy: 0, r: 36 });

  useEffect(() => {
    const updateBaseRect = () => {
      if (baseRef.current) {
        const rect = baseRef.current.getBoundingClientRect();
        baseRect.current = {
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
          r: rect.width / 2 - 8,
        };
      }
    };
    updateBaseRect();
    window.addEventListener('resize', updateBaseRect);
    window.addEventListener('orientationchange', updateBaseRect);
    return () => {
      window.removeEventListener('resize', updateBaseRect);
      window.removeEventListener('orientationchange', updateBaseRect);
    };
  }, []);

  const handleTouchStart = (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const x = touch.clientX;
      const w = window.innerWidth;
      // Left 45% screen = joystick zone, right 55% = look swipe
      if (x < w * 0.45 && joyTouchId.current === null) {
        joyTouchId.current = touch.identifier;
      } else if (lookTouchId.current === null) {
        lookTouchId.current = touch.identifier;
        lookLast.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId.current) {
        const { cx, cy, r } = baseRect.current;
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > r) {
          dx = (dx / dist) * r;
          dy = (dy / dist) * r;
        }
        joystickRef.current.x = dx / r;
        joystickRef.current.y = -dy / r; // drag up = forward
        if (stickRef.current) {
          stickRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
      } else if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lookLast.current.x;
        const dy = touch.clientY - lookLast.current.y;
        lookRef.current.yaw -= dx * 0.005;
        lookRef.current.pitch -= dy * 0.005;
        lookRef.current.pitch = Math.max(-1.3, Math.min(1.3, lookRef.current.pitch));
        lookLast.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId.current) {
        joyTouchId.current = null;
        joystickRef.current.x = 0;
        joystickRef.current.y = 0;
        if (stickRef.current) {
          stickRef.current.style.transform = `translate(-50%, -50%)`;
        }
      } else if (touch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
      }
    }
  };

  return (
    <>
      {/* Full-screen invisible touch zone */}
      <div
        className="absolute inset-0 z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />
      {/* Joystick visual */}
      <div
        ref={baseRef}
        className="absolute bottom-8 left-8 w-20 h-20 rounded-full border-2 border-white/35 bg-black/30 backdrop-blur-sm pointer-events-none z-20"
      >
        <div
          ref={stickRef}
          className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full bg-white/45"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      </div>
      {/* Hint */}
      <div className="absolute bottom-32 left-8 text-white/40 text-[8px] uppercase tracking-[0.25em] pointer-events-none z-20 max-w-[140px]">
        Drag stick · Swipe kanan untuk lihat
      </div>
    </>
  );
};

// Tutorial hint — muncul setelah intro fade out, kasih tahu user
// soal mode berjalan. Auto-fade after ~6s. Mobile dapat copy yg
// reflect joystick controls (chunk 4D added mobile FPV).
const TutorialHint = ({ isMobile }) => {
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    // Tunggu intro selesai (~7.8s), lalu show 6s
    const t1 = setTimeout(() => setVisible(true), 8200);
    const t2 = setTimeout(() => setVisible(false), 14500);
    const t3 = setTimeout(() => setRemoved(true), 16500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  if (removed) return null;
  // Position: di mobile geser ke top biar gak konflik dgn joystick
  // (bottom-left) atau FPV button (bottom-right). Desktop tetap kanan
  // bawah seperti sebelumnya.
  return (
    <div
      className={`pointer-events-none absolute z-20 max-w-[260px] transition-opacity duration-1000 ease-out ${
        isMobile
          ? 'top-16 right-4 max-w-[200px]'
          : 'bottom-24 right-6'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="rounded-md border border-white/15 bg-[#0a0d18]/80 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3 shadow-xl">
        <div className="text-white/55 text-[8px] uppercase tracking-[0.4em] mb-1.5">
          Tip
        </div>
        <div
          className="text-white/85 text-[11px] sm:text-[12px] leading-relaxed"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {isMobile
            ? 'Coba mode berjalan — joystick kiri jalan, swipe kanan untuk lihat sekitar.'
            : 'Coba "mode berjalan" untuk pengalaman immersive — jalan di antara pohon-pohon dengan WASD.'}
        </div>
      </div>
    </div>
  );
};

const LorongFooter = ({ hoveredTreeId, isMobile }) => {
  const hint = hoveredTreeId
    ? 'Klik untuk baca milestone'
    : isMobile
      ? `Ketuk salah satu pohon · ${ELI_TIMELINE.length} perjalanan`
      : `Pilih pohon dari ${ELI_TIMELINE.length} perjalanan · drag untuk berputar`;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-center px-4 max-w-[90vw]">
      {hint}
    </div>
  );
};

// Format ISO date "YYYY-MM-DD" → "29 September 2018" untuk display.
// ELI_TIMELINE.period kadang full kalimat ("Single Rapsodi") jadi
// kita pakai date kalau ada, fallback ke period.
const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const formatFullDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${ID_MONTHS[m - 1]} ${y}`;
};

const MilestoneOverlay = ({ tree, trees, onClose, onPrev, onNext }) => {
  useEffect(() => {
    if (!tree) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [tree]);

  // Keyboard nav — arrow left/right paginate, Esc close.
  useEffect(() => {
    if (!tree) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key === 'ArrowRight') onNext?.();
      else if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tree, onPrev, onNext, onClose]);

  if (!tree) return null;
  const total = trees?.length ?? 0;
  const idx = trees?.findIndex((t) => t.id === tree.id) ?? -1;
  const fullDate = formatFullDate(tree.date);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < total - 1;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#1c1f2a]/95 border border-white/15 rounded-2xl px-7 sm:px-8 py-8 max-w-lg mx-6 w-[calc(100%-3rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-emerald-300/80 text-[10px] uppercase tracking-[0.25em]">
            {tree.badge}
          </span>
          <span className="text-white/55 text-[10px] tracking-wide">
            {fullDate ?? tree.period}
          </span>
        </div>
        <h2
          className="text-white text-2xl mb-4 leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          {tree.title}
        </h2>
        <p className="text-white/75 text-sm leading-relaxed mb-6">
          {tree.body}
        </p>

        {/* Progress dots — 1 dot per pohon, current = besar amber.
            Click dot untuk loncat ke milestone itu. */}
        {total > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {trees.map((t, i) => {
              const active = t.id === tree.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (active) return;
                    if (i < idx) onPrev?.(i);
                    else onNext?.(i);
                  }}
                  aria-label={`${t.year} — ${t.title}`}
                  className="group p-1 -m-1"
                >
                  <span
                    className={`block rounded-full transition-all ${
                      active
                        ? 'w-2 h-2 bg-amber-300/85'
                        : 'w-1.5 h-1.5 bg-white/25 group-hover:bg-white/55'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
        {idx >= 0 && (
          <div className="text-center text-white/40 text-[10px] uppercase tracking-[0.3em] mb-5">
            Pohon ke-{idx + 1} dari {total}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => hasPrev && onPrev?.()}
            disabled={!hasPrev}
            className="px-3 py-2.5 rounded-full border border-white/20 text-white/70 text-xs hover:bg-white/10 hover:border-white/40 transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Pohon sebelumnya"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
          >
            Kembali ke lorong
          </button>
          <button
            type="button"
            onClick={() => hasNext && onNext?.()}
            disabled={!hasNext}
            className="px-3 py-2.5 rounded-full border border-white/20 text-white/70 text-xs hover:bg-white/10 hover:border-white/40 transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Pohon selanjutnya"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

// Detect saat user FPV mendekati monument (z < -27.5). Auto-trigger
// monument signature event sekali per session — supaya "perjalanan"
// dapat ending moment yang earned, bukan harus klik manual. triggered
// ref-only (no rerender) supaya gak loop.
const MonumentProximity = ({ viewMode, onTrigger }) => {
  const triggered = useRef(false);
  useFrame((state) => {
    if (viewMode !== 'fpv') return;
    if (triggered.current) return;
    if (state.camera.position.z < -27.5) {
      triggered.current = true;
      onTrigger?.();
    }
  });
  // Reset triggered flag saat user balik ke orbit (biar kalau masuk
  // FPV lagi & dekati monument lagi, dapat moment-nya lagi)
  useEffect(() => {
    if (viewMode === 'orbit') triggered.current = false;
  }, [viewMode]);
  return null;
};

// 2D HUD overlay yang fade in saat monument signatureEvent active.
// Radial vignette darken edges + warm tint kasih kesan "moment" focus.
// Plus poetic confirmation text tampil ~3.5s di tengah bawah.
const MonumentMomentOverlay = ({ active }) => {
  const [removed, setRemoved] = useState(true);
  useEffect(() => {
    if (active) {
      setRemoved(false);
      return undefined;
    }
    // Fade out → remove dari DOM after transition done
    const t = setTimeout(() => setRemoved(true), 1300);
    return () => clearTimeout(t);
  }, [active]);
  if (removed) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-25 transition-opacity duration-[1200ms] ease-out"
      style={{ opacity: active ? 1 : 0 }}
    >
      {/* Vignette tighten — radial gradient gelap di edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(20,12,5,0.45) 75%, rgba(20,12,5,0.78) 100%)',
        }}
      />
      {/* Warm amber tint subtle — kerasa kayak golden hour membungkus */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,170,80,0.04), rgba(255,140,60,0.07))',
          mixBlendMode: 'overlay',
        }}
      />
      {/* Poetic text di bottom-center — fade in setelah vignette settle */}
      <div
        className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center px-6"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          color: 'rgba(255,228,178,0.92)',
          fontSize: '15px',
          letterSpacing: '0.02em',
          textShadow: '0 0 10px rgba(0,0,0,0.7), 0 0 28px rgba(255,170,80,0.25)',
          animation: active ? 'monumentTextFade 5500ms ease-out forwards' : 'none',
          opacity: 0,
        }}
      >
        Kau sampai ke ujung.
      </div>
      <style>{`
        @keyframes monumentTextFade {
          0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
          18%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(-2px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

// Sync R3F state.clock.elapsedTime ke ref di parent component supaya
// click handler (yg di luar Canvas) bisa baca elapsed time saat trigger
// signature event. Tanpa ini, signatureTime jadi di domain Date.now()
// sementara useFrame di domain state.clock — campur 2 clock = ugly.
const ClockSync = ({ clockRef }) => {
  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime;
  });
  return null;
};

const TamanLorongPohonPage = () => {
  const isMobile = useIsMobile();
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
        title="Pohon-Pohon yang Mengingat"
        description="Tahun demi tahun perjalanan Eli — milestone karier dari debut sampai sekarang, dalam bentuk pohon-pohon di sebuah lorong."
        path="/taman/r1"
      />
      <div className="relative w-full h-screen bg-[#1c1f2a] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 50, position: [5, 4, 8] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 6, -12);
            }}
          >
            <ClockSync clockRef={clockRef} />
            <LorongScene
              trees={trees}
              hoveredTreeId={hoveredTreeId}
              selectedTreeId={selectedTree?.id ?? null}
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
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <IntroTitle />
        <TutorialHint isMobile={isMobile} />
        <LorongHeader />
        <LorongFooter hoveredTreeId={hoveredTreeId} isMobile={isMobile} />
        {/* FPV toggle — desktop AND mobile. Position bottom-right.
            Safe-area inset bottom buat iPhone home indicator. */}
        <button
          type="button"
          onClick={toggleViewMode}
          disabled={transitioning}
          className="pointer-events-auto absolute right-4 sm:right-6 z-30 px-3 py-2 sm:px-4 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm text-white/85 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        >
          {viewMode === 'orbit' ? 'Masuk berjalan' : 'Keluar berjalan'}
        </button>
        {/* Desktop FPV hint */}
        {viewMode === 'fpv' && !isMobile && !transitioning && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60 text-[11px] uppercase tracking-[0.25em] text-center">
            <div className="mb-1">Klik layar untuk lock kursor</div>
            <div className="text-white/40">
              WASD untuk jalan · Esc untuk lepas kursor
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
        <AmbientAudio profile="taman-r1" position="top-right" />
      </div>
    </>
  );
};

export default TamanLorongPohonPage;
