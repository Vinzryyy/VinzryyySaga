/**
 * Taman Kebaikan — Petak R1: Lorong Pohon Tahun.
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
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
// Note: r3/utils.js berisi shared util taman (useIsMobile, lerp, dll).
// Saat petak ke-3+ butuh juga, consider pindahkan ke ../components/taman/utils.js
// (parent level) supaya nggak semantik "milik r3".
import { useIsMobile, lerp } from '../components/taman/r3/utils';
import { ELI_TIMELINE } from '../data/eliProfile';

// Layout konstan jalur. Pohon disusun alternating kiri/kanan di
// sepanjang jalur. Path z dari START_Z ke END_Z (ke arah negatif z).
const PATH_START_Z = -2;
const PATH_END_Z = -32;
const PATH_X_OFFSET = 2.6; // alternating ±2.6 dari sumbu jalur
const ORBIT_TARGET = [0, 0, -16]; // tengah jalur

// Bikin warna foliage progressive — pohon awal (debut) hijau muda
// (tunas), pohon akhir (sekarang) hijau matang & sedikit aprikot.
const foliageColorForIndex = (idx, total) => {
  const t = idx / Math.max(total - 1, 1);
  // green-young (#9bc474) → mature (#7a9d5e) → mature-warm (#a89d5e)
  if (t < 0.5) {
    const k = t / 0.5;
    return lerpHexColor('#9bc474', '#7a9d5e', k);
  }
  const k = (t - 0.5) / 0.5;
  return lerpHexColor('#7a9d5e', '#a89d5e', k);
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
        opacity={0.38}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

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

const LanternPost = ({ pos, phase, dead = false, signatureTime }) => {
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
    // Signature moment — sync flicker (semua lentera ramp peak bareng)
    if (signatureTime != null) {
      const dt = t - signatureTime;
      if (dt > 0 && dt < 3) {
        let boost = 0;
        if (dt < 0.5) boost = dt / 0.5; // ramp up 0→1
        else if (dt < 2.0) boost = 1; // hold
        else boost = (3 - dt) / 1; // fade 1→0
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

const Lanterns = ({ signatureTime }) => (
  <>
    {LANTERN_DEFS.map((l, i) => (
      <LanternPost
        key={`lantern-${i}`}
        pos={l.pos}
        phase={l.phase}
        dead={l.dead}
        signatureTime={signatureTime}
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
const Owl = ({ pos, headPhase = 0 }) => {
  const headRef = useRef();
  const eye1Ref = useRef();
  const eye2Ref = useRef();
  // Rare alert event — owl tiba-tiba snap kepala 90° ke samping, hold,
  // kembali normal. Trigger interval random 60-120s per owl (phase
  // beda jadi 2 owl nggak alert bareng).
  const alertRef = useRef({
    active: false,
    t0: 0,
    next: 60 + Math.random() * 60 + headPhase * 5,
  });
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
        // Snap → hold → snap back
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
    headRef.current.rotation.y = headAngle;
    // Mata kedip saat gust + dim juga saat alert
    const blink = Math.max(0, Math.abs(wind.gust) - 0.6) * 0.7;
    const alertBoost = alertRef.current.active ? 0.3 : 0; // sedikit lebih bright saat alert
    const eyeIntensity = 1.1 + alertBoost - blink;
    if (eye1Ref.current) eye1Ref.current.emissiveIntensity = eyeIntensity;
    if (eye2Ref.current) eye2Ref.current.emissiveIntensity = eyeIntensity;
  });
  return (
    <group position={pos}>
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
        {/* Mata — kuning emissive sebagai focal point malam */}
        <mesh position={[0.06, 0.03, 0.13]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            ref={eye1Ref}
            color="#fae650"
            emissive="#fae650"
            emissiveIntensity={1.1}
          />
        </mesh>
        <mesh position={[-0.06, 0.03, 0.13]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            ref={eye2Ref}
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

// 2 owls — 1 di pohon awal-tengah (debut era), 1 di pohon akhir-tengah
// (recent era). Posisi y=2.05 = di atas foliage cluster (foliage center
// y=1.5, radius 0.6, top y=2.1).
const Owls = () => (
  <>
    <Owl pos={[-2.6, 2.05, -8.67]} headPhase={0} />
    <Owl pos={[2.6, 2.05, -25.33]} headPhase={1.8} />
  </>
);

// Siluet figur di kejauhan ujung lorong — heavily fogged, barely
// visible. Open to interpretation: bisa Eli muda berdiri menatap ke
// arah camera (ke masa depan), atau just visitor lain. Subtle breathing
// sway supaya kerasa "alive" tanpa explicit movement.
const DistantFigure = ({ signatureTime }) => {
  const groupRef = useRef();
  const bodyMatRef = useRef();
  const headMatRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.9) * 0.012;
    // Signature moment glow — phase 2 (0.5..2.5s) figure menyala amber
    let glow = 0;
    if (signatureTime != null) {
      const dt = t - signatureTime;
      if (dt > 0.4 && dt < 2.6) {
        const u = (dt - 0.4) / 2.2;
        // Smooth ease-in/out: 0→1 in 0..0.2, hold 0.2..0.8, fade 0.8..1
        if (u < 0.2) glow = u / 0.2;
        else if (u < 0.8) glow = 1;
        else glow = (1 - u) / 0.2;
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
  { pos: [1.8, 0.8, -13], text: 'tangan kecil yang mengangkat', phase: 0.35, period: 13 },
  { pos: [-1.2, 0.7, -19], text: 'rumah panggung', phase: 0.6, period: 10 },
  { pos: [1.5, 0.8, -25], text: 'untuk yang menunggu', phase: 0.15, period: 12 },
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

const MemoryFragments = () => (
  <>
    {MEMORY_FRAGMENTS.map((f, i) => (
      <MemoryFragment key={`mem-${i}`} {...f} />
    ))}
  </>
);

// Shooting star — rare event langit, streak putih melintas dari
// upper-right ke lower-left tiap 90-180 detik. Plane elongated dengan
// emissive material. Lifecycle 1.4s: fade in → travel → fade out.
const ShootingStar = () => {
  const meshRef = useRef();
  const matRef = useRef();
  const stateRef = useRef({
    active: false,
    t0: 0,
    next: 30 + Math.random() * 60,
  });
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!stateRef.current.active && t > stateRef.current.next) {
      stateRef.current = { active: true, t0: t, next: 0 };
    }
    if (stateRef.current.active && meshRef.current && matRef.current) {
      const dt = t - stateRef.current.t0;
      if (dt < 1.4) {
        const u = dt / 1.4;
        meshRef.current.position.x = 15 - u * 30;
        meshRef.current.position.y = 14 - u * 8;
        meshRef.current.position.z = -12;
        meshRef.current.visible = true;
        const opacity = u < 0.15
          ? u / 0.15
          : u > 0.85
          ? (1 - u) / 0.15
          : 1;
        matRef.current.opacity = opacity;
      } else {
        stateRef.current = {
          active: false,
          t0: 0,
          next: t + 90 + Math.random() * 90,
        };
        meshRef.current.visible = false;
      }
    }
  });
  return (
    <mesh ref={meshRef} visible={false} rotation={[0, 0, -0.26]}>
      <planeGeometry args={[2.5, 0.05]} />
      <meshStandardMaterial
        ref={matRef}
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={2.2}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
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

// Pohon-tahun: trunk pendek + 1 foliage cluster + label year
// melayang. Hover lift + emissive glow, click → modal milestone.
const YearTree = ({ tree, hovered, onPointerOver, onPointerOut, onClick }) => {
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
      {/* Trunk — static (nggak sway, supaya pohon nggak kelihatan loyo) */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.08, 0.13, 1.2, 8]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.95} />
      </mesh>
      {/* Foliage assembly — pivot di trunk top (y=1.2) supaya rotasi
          jadi swing dari pangkal foliage, bukan rotate di tengah */}
      <group ref={foliageRef} position={[0, 1.2, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.6, 14, 10]} />
          <meshStandardMaterial
            ref={matRef}
            color={tree.color}
            emissive={tree.color}
            emissiveIntensity={0}
            roughness={0.75}
          />
        </mesh>
      </group>
      {/* Year label */}
      <Html position={[0, 2.3, 0]} center distanceFactor={10}>
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
            {tree.year}
          </div>
          <div
            className={`text-[9px] mt-0.5 uppercase tracking-[0.15em] transition-colors ${
              hovered ? 'text-white/80' : 'text-white/50'
            }`}
          >
            {tree.badge}
          </div>
        </div>
      </Html>
    </group>
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
    {/* Floor sekitar path — match palette /taman/peta */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, -16]}>
      <planeGeometry args={[40, 50]} />
      <meshStandardMaterial color="#1c1f2a" roughness={1} />
    </mesh>
  </>
);

const LorongScene = ({
  trees,
  hoveredTreeId,
  isMobile,
  signatureTime,
  onTreeHover,
  onTreeOut,
  onTreeClick,
}) => (
  <>
    <fog attach="fog" args={['#1c1f2a', 14, 45]} />
    <color attach="background" args={['#1c1f2a']} />
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
    <Footprints />
    <ShootingStar />
    <Lanterns signatureTime={signatureTime} />
    <YearPlaques trees={trees} />
    <Owls />
    <Rabbits />
    {!isMobile && <Bats />}
    <DistantFigure signatureTime={signatureTime} />
    <Fireflies count={isMobile ? 9 : 16} />
    <GroundMist count={isMobile ? 40 : 70} />
    <FallingLeaves count={isMobile ? 35 : 60} />
    <MemoryFragments />
    {trees.map((tree) => (
      <YearTree
        key={tree.id}
        tree={tree}
        hovered={hoveredTreeId === tree.id}
        onPointerOver={onTreeHover}
        onPointerOut={onTreeOut}
        onClick={onTreeClick}
      />
    ))}
    {/* OrbitControls limited — user bisa rotate horizontal sedikit
        + zoom in/out untuk eksplor jalur, tapi nggak bisa flip
        vertikal (anti-disorient). */}
    <OrbitControls
      target={ORBIT_TARGET}
      enableZoom
      minDistance={12}
      maxDistance={28}
      enablePan={false}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.4}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.4}
    />
  </>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#1c1f2a] text-white/50 text-sm">
    Memuat lorong pohon tahun...
  </div>
);

const LorongHeader = () => (
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
      Lorong Pohon Tahun
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        Keluar →
      </Link>
    </div>
  </div>
);

const LorongFooter = ({ hoveredTreeId }) => {
  const hint = hoveredTreeId
    ? 'Klik untuk baca milestone'
    : `Pilih pohon dari ${ELI_TIMELINE.length} tahun perjalanan · drag untuk berputar`;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.2em] text-center">
      {hint}
    </div>
  );
};

const MilestoneOverlay = ({ tree, onClose }) => {
  useEffect(() => {
    if (!tree) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [tree]);

  if (!tree) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#1c1f2a]/95 border border-white/15 rounded-2xl px-8 py-9 max-w-lg mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-emerald-300/80 text-[10px] uppercase tracking-[0.25em]">
            {tree.badge}
          </span>
          <span className="text-white/55 text-[10px] tracking-wide">
            {tree.period}
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
        <p className="text-white/75 text-sm leading-relaxed mb-7">
          {tree.body}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full px-5 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
        >
          Kembali ke lorong
        </button>
      </div>
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
  // Signature moment: trigger saat user click tree[0] (era recent / closest
  // ke camera). Lentera sync flicker 0.5..2s, distant figure glow 0.4..2.6s.
  const [signatureTime, setSignatureTime] = useState(null);
  const clockRef = useRef(0);

  // Map ELI_TIMELINE → tree positions di scene. Alternating kiri/kanan,
  // gap z = (PATH_END - PATH_START) / (count-1). Year color progressive.
  const trees = useMemo(() => {
    const total = ELI_TIMELINE.length;
    const gapZ = (PATH_END_Z - PATH_START_Z) / Math.max(total - 1, 1);
    return ELI_TIMELINE.map((entry, idx) => {
      const side = idx % 2 === 0 ? -1 : 1;
      const x = PATH_X_OFFSET * side;
      const z = PATH_START_Z + gapZ * idx;
      const year = entry.date ? entry.date.slice(0, 4) : entry.period;
      return {
        ...entry,
        x,
        z,
        year,
        color: foliageColorForIndex(idx, total),
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
    // Trigger signature moment kalau user click pohon era recent (idx 0)
    if (trees.length > 0 && tree.id === trees[0].id) {
      setSignatureTime(clockRef.current);
      // Clear setelah 3.5s biar nggak jadi state stale
      setTimeout(() => setSignatureTime(null), 3500);
    }
  };
  const handleClose = () => setSelectedTree(null);

  return (
    <>
      <Seo
        title="Lorong Pohon Tahun"
        description="Tahun demi tahun perjalanan Eli — milestone karier dari debut sampai sekarang, dalam bentuk pohon-pohon di sebuah lorong."
        path="/taman/r1"
      />
      <div className="relative w-full h-screen bg-[#1c1f2a] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: [7, 9, 4] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 0, -16);
            }}
          >
            <ClockSync clockRef={clockRef} />
            <LorongScene
              trees={trees}
              hoveredTreeId={hoveredTreeId}
              isMobile={isMobile}
              signatureTime={signatureTime}
              onTreeHover={handleTreeHover}
              onTreeOut={handleTreeOut}
              onTreeClick={handleTreeClick}
            />
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <LorongHeader />
        <LorongFooter hoveredTreeId={hoveredTreeId} />
        <MilestoneOverlay tree={selectedTree} onClose={handleClose} />
        <AmbientAudio profile="taman" position="top-right" />
      </div>
    </>
  );
};

export default TamanLorongPohonPage;
