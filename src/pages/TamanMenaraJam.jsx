/**
 * ArmeniacaTown — Petak R4: Menara Jam.
 *
 * Stage B1 — outdoor scene asli (sebelumnya placeholder "sedang dibangun").
 * Plaza dgn menara jam sebagai focal point, kamera low-angle nengokin
 * dial. Real-time WIB clock — jarum jam berdetak per detik via
 * Intl.DateTimeFormat('Asia/Jakarta'), independen dari timezone client.
 *
 * Spec inti (per memory project_armeniacaTown_r4_menarajam.md):
 *   drought   (count 3000-4999)  — WIB hour-only (jarum menit hilang),
 *                                  dial cracked, bel bisu, bandul diam.
 *   restored  (count ≥ 5000)     — WIB 2-jarum lengkap, kaca patri glow,
 *                                  bel kecil di puncak.
 *
 * State: prop `restored` dari TamanR4RouteChooser di App.jsx.
 *   locked (count < 3000) ditangani di chooser (redirect ke peta).
 *
 * Belum dibangun di Stage B1 (menyusul Stage B2+):
 *   - Almanak Kota panel (ELI_TIMELINE milestone dates + countdown event
 *     terdekat di bandul drought)
 *   - Hourly bell chime audio (restored, default mute toggle)
 *   - Anniversary auto-trigger (seitansai, debut anniv → bell + glow pulse)
 *   - 19:00 WIB easter egg (subtle glow di posisi jarum 7)
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import Seo from '../components/Seo';
import RotateRecommendation from '../components/ui/RotateRecommendation';
import { ELI_TIMELINE } from '../data/eliProfile';
import { SITE_CONFIG } from '../config/siteConfig';

// =====================================================================
// Hooks
// =====================================================================

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

// WIB time via Intl.DateTimeFormat('Asia/Jakarta') — independen dari
// user's local timezone. Update setiap 1s — cukup buat jarum jam/menit
// (jarum detik gak ditampilkan Stage B1).
const computeWibTime = () => {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const get = (type) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hours = get('hour');
  const minutes = get('minute');
  const seconds = get('second');
  return {
    hours,
    minutes,
    seconds,
    // Fractional positions buat smooth hand rotation
    hour12Frac: (hours % 12) + minutes / 60,
    minuteFrac: minutes + seconds / 60,
  };
};

const useWibTime = () => {
  const [time, setTime] = useState(() => computeWibTime());
  useEffect(() => {
    const tick = () => setTime(computeWibTime());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

// Today di kalender WIB sebagai YYYY-MM-DD — anchor buat "hari ini"
// calculations independen dari local TZ user. Updates daily-ish (cache
// pakai key cuma berubah saat tanggal WIB berubah; di sini kita re-derive
// per render — murah karena Intl format).
const wibTodayIso = () => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()); // YYYY-MM-DD
};

// Jarak hari kalender (signed integer) dari `isoDateStr` (YYYY-MM-DD) ke
// hari ini di WIB. Positif = di masa depan, negatif = di masa lalu.
// Return null jika tanggal invalid/null. Komputasi pakai WIB midnight di
// kedua sisi supaya gak ada off-by-one karena timezone shift.
const daysFromWibToday = (isoDateStr) => {
  if (!isoDateStr) return null;
  const target = new Date(`${isoDateStr}T00:00:00+07:00`);
  if (Number.isNaN(target.getTime())) return null;
  const todayIso = wibTodayIso();
  const todayWibStart = new Date(`${todayIso}T00:00:00+07:00`);
  const diffMs = target - todayWibStart;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

// Format tanggal WIB hari ini sebagai "Rabu, 13 Mei 2026" — display di
// header Almanak.
const wibTodayLong = () => {
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return fmt.format(new Date());
};

// Format ISO YYYY-MM-DD ke "13 Mei 2026"
const formatShortIdDate = (isoDateStr) => {
  if (!isoDateStr) return '—';
  const d = new Date(`${isoDateStr.substring(0, 10)}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

// useNearestSchedule — fetch /data/eli-schedule.json sekali saat mount,
// filter event Eli yang upcoming (date >= today) dan dalam ≤30 hari.
// Return entry pertama (nearest), atau null. Failure modes (404, parse
// error) silently return null — Stage B2 jangan crash karena data file
// belum ke-update.
const useNearestSchedule = () => {
  const [nearest, setNearest] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/data/eli-schedule.json', { cache: 'no-cache' });
        if (!r.ok) return;
        const data = await r.json();
        const events = data?.events || [];
        const now = Date.now();
        const cap = now + 30 * 24 * 60 * 60 * 1000;
        const upcoming = events
          .map((ev) => ({ ...ev, _ts: new Date(ev.date).getTime() }))
          .filter((ev) => !Number.isNaN(ev._ts) && ev._ts >= now && ev._ts <= cap)
          .sort((a, b) => a._ts - b._ts);
        if (!cancelled) setNearest(upcoming[0] || null);
      } catch {
        // Fail-quiet — Almanak akan render fallback "bandul nungguin"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return nearest;
};

// useAlmanak — derive data buat panel: hari ini, days-since-debut,
// milestone terakhir lewat, milestone berikutnya, event Eli terdekat.
// ELI_TIMELINE entries sudah sorted ascending by date; entries dengan
// date=null (upcoming, mis. show-400) di-skip dari past/future calc tapi
// dipakai buat "menuju" placeholder.
const useAlmanak = () => {
  const nearestEvent = useNearestSchedule();
  return useMemo(() => {
    const today = wibTodayIso();
    const todayMs = new Date(`${today}T00:00:00+07:00`).getTime();
    const debutEntry = ELI_TIMELINE.find((e) => e.id === 'theater-debut');
    const daysSinceDebut = debutEntry
      ? -daysFromWibToday(debutEntry.date)
      : null;
    // Past = milestone yang udah lewat (date < today). Sorted descending,
    // most recent first. Skip upcoming (date=null).
    const past = ELI_TIMELINE.filter(
      (e) => e.date && new Date(`${e.date}T00:00:00+07:00`).getTime() < todayMs,
    ).sort((a, b) => (a.date < b.date ? 1 : -1));
    const lastMilestone = past[0] || null;
    // Future = milestone dengan date di masa depan. Upcoming (date=null)
    // ditambah sebagai trailing entry.
    const future = ELI_TIMELINE.filter(
      (e) => e.date && new Date(`${e.date}T00:00:00+07:00`).getTime() >= todayMs,
    ).sort((a, b) => (a.date < b.date ? -1 : 1));
    const upcomingTagged = ELI_TIMELINE.filter((e) => e.upcoming);
    const nextMilestone = future[0] || upcomingTagged[0] || null;
    return {
      today,
      todayLong: wibTodayLong(),
      daysSinceDebut,
      debutEntry,
      lastMilestone,
      nextMilestone,
      nearestEvent,
    };
  }, [nearestEvent]);
};

// === BELL CHIME AUDIO ===
// Synth bell strike via Web Audio API — 4-harmonic additive synth dgn
// exponential decay envelope. No audio asset needed, ~80B code path.
// Frekuensi A4 fundamental + harmonics ganjil-ish bikin timbre bel
// "tower clock" yang lembut, bukan service-desk ding.
const playBellStrike = (ctx, peakGain = 0.45) => {
  const now = ctx.currentTime;
  const harmonics = [
    { freq: 440, gain: peakGain, decay: 2.4 },
    { freq: 880, gain: peakGain * 0.5, decay: 1.5 },
    { freq: 1320, gain: peakGain * 0.28, decay: 0.85 },
    { freq: 1760, gain: peakGain * 0.16, decay: 0.55 },
  ];
  harmonics.forEach((h) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = h.freq;
    gain.gain.setValueAtTime(h.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + h.decay);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + h.decay + 0.1);
  });
};

const BELL_STORAGE_KEY = 'menara-bell-on';

// useHourlyBell — saat enabled, ring bell tiap kali jam WIB berubah
// (deteksi via lastHourRef). Browser butuh user gesture buat unlock
// AudioContext, jadi context di-init lazy setelah toggle ON pertama
// kali. Avoid catching up missed hours: cuma trigger kalau menit==0 &
// seconds<30 (artinya beneran lewat top-of-hour, bukan loading lambat).
const useHourlyBell = (enabled) => {
  const lastHourRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (!ctxRef.current) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return undefined;
        ctxRef.current = new Ctx();
      } catch {
        return undefined;
      }
    }
    // Initialize tracker ke jam sekarang supaya gak langsung bunyi pas
    // toggle on di tengah jam.
    const init = computeWibTime();
    lastHourRef.current = init.hours;

    const tick = () => {
      const t = computeWibTime();
      if (t.hours !== lastHourRef.current) {
        lastHourRef.current = t.hours;
        if (t.minutes === 0 && t.seconds < 30) {
          playBellStrike(ctxRef.current);
        }
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled]);
};

// === ANNIVERSARY DETECTION ===
// useAnniversaryMatch — return list dari ELI_TIMELINE entries + birthday
// yang MM-DD-nya cocok dengan hari ini di WIB. Empty array = bukan
// anniversary day. Dev override `?day=MM-DD` buat preview.
const useAnniversaryMatch = () => {
  const [searchParams] = useSearchParams();
  return useMemo(() => {
    const override = import.meta.env.DEV ? searchParams.get('day') : null;
    let todayMM, todayYear;
    if (override && /^\d{2}-\d{2}$/.test(override)) {
      todayMM = override;
      todayYear = new Date().getFullYear();
    } else {
      const todayIso = wibTodayIso();
      todayMM = todayIso.substring(5);
      todayYear = parseInt(todayIso.substring(0, 4), 10);
    }
    const matches = [];
    // Birthday — derive dari SITE_CONFIG.eli.birthdateIso, fallback ke
    // 2000-06-15 kalau config gak ada.
    const birthIso =
      (SITE_CONFIG?.eli?.birthdateIso || '2000-06-15T00:00:00+07:00').substring(0, 10);
    if (birthIso.substring(5) === todayMM) {
      const year = parseInt(birthIso.substring(0, 4), 10);
      const age = Math.max(0, todayYear - year);
      matches.push({
        type: 'birthday',
        title: 'Ulang Tahun Eli',
        period: age > 0 ? `${age} tahun hari ini` : 'Hari ini',
        rank: 0, // birthday di-prioritize di top
      });
    }
    // ELI_TIMELINE milestones — match by MM-DD, hitung yearsAgo.
    ELI_TIMELINE.forEach((e) => {
      if (!e.date) return;
      if (e.date.substring(5) !== todayMM) return;
      const year = parseInt(e.date.substring(0, 4), 10);
      const yearsAgo = todayYear - year;
      if (yearsAgo <= 0) return; // skip "tahun ini" event
      matches.push({
        type: 'milestone',
        id: e.id,
        title: e.title,
        period: `${yearsAgo} tahun lalu hari ini`,
        rank: yearsAgo,
      });
    });
    matches.sort((a, b) => a.rank - b.rank);
    return matches;
  }, [searchParams]);
};

// =====================================================================
// Constants
// =====================================================================

// Tower dims — basis ground-level visibility. Total height ~8.5 units,
// dial di ~6.2 (eye-level lookup dari kamera @ y=2).
const TOWER = {
  baseRadius: 1.6,
  baseHeight: 0.4,
  shaftRadiusBottom: 1.1,
  shaftRadiusTop: 0.85,
  shaftHeight: 5.4,
  capRadius: 1.25,
  capHeight: 0.35,
  dialRadius: 0.95,
  dialThickness: 0.12,
  spireHeight: 1.2,
  // Dial center world Y = base + shaft + cap/2 = 0.4 + 5.4 + 0.175 = ~5.97
  dialY: 0.4 + 5.4 + 0.175 + 0.3,
  topY: 0.4 + 5.4 + 0.35 + 1.2,
};

// =====================================================================
// Components
// =====================================================================

const SkyBackdrop = ({ restored }) => (
  <>
    <fog
      attach="fog"
      args={restored ? ['#7a5868', 28, 60] : ['#5a3540', 22, 52]}
    />
    <color attach="background" args={[restored ? '#2a1d28' : '#1a1018']} />
  </>
);

const SceneLights = ({ restored }) => (
  <>
    <ambientLight
      intensity={restored ? 0.34 : 0.28}
      color={restored ? '#e0c0a8' : '#c0a090'}
    />
    {/* Key — angled spotlight high di belakang kamera, ngenain dial */}
    <directionalLight
      position={[6, 12, 8]}
      intensity={restored ? 1.5 : 1.4}
      color={restored ? '#f8c898' : '#f4b078'}
    />
    {/* Fill — sisi opposite, warm dusty */}
    <directionalLight
      position={[-5, 7, -3]}
      intensity={0.45}
      color={restored ? '#c8a890' : '#b8907a'}
    />
  </>
);

// Plaza ground — stone disc dengan pebble ring di tepi.
const Plaza = ({ restored }) => (
  <group>
    {/* Main plaza disc */}
    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[8, 48]} />
      <meshStandardMaterial
        color={restored ? '#4a3828' : '#3a2a20'}
        roughness={0.95}
      />
    </mesh>
    {/* Center pad — slightly raised tile di sekitar base menara */}
    <mesh position={[0, 0.01, 0]}>
      <cylinderGeometry args={[3.2, 3.4, 0.04, 24]} />
      <meshStandardMaterial
        color={restored ? '#6a4830' : '#4a3828'}
        roughness={0.92}
      />
    </mesh>
    {/* Concentric rim ring */}
    <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.15, 3.4, 48]} />
      <meshStandardMaterial
        color={restored ? '#8a6038' : '#5a3a20'}
        roughness={0.9}
      />
    </mesh>
  </group>
);

// Tower geometry — bigger viewer-scale version of PetaMenara restored
// variant. Reused untuk both drought + restored, diff via colors/glow/hands.
const ClockTower = ({ restored }) => {
  const dialMatRef = useRef();
  const bellMatRef = useRef();
  const stainedGlassRef = useRef();

  useFrame((state) => {
    if (restored) {
      const t = state.clock.elapsedTime;
      if (stainedGlassRef.current) {
        stainedGlassRef.current.emissiveIntensity =
          0.55 + Math.sin(t * 0.55) * 0.15;
      }
      if (bellMatRef.current) {
        bellMatRef.current.emissiveIntensity =
          0.4 + Math.sin(t * 1.3) * 0.12;
      }
    }
  });

  const stoneColor = restored ? '#a89478' : '#7a6858';
  const trimColor = restored ? '#5a3a18' : '#3a2818';
  const dialColor = restored ? '#f8e0b0' : '#5a4838';
  const dialEmissive = restored ? '#e8a868' : '#000000';

  return (
    <group>
      {/* === BASE === */}
      <mesh position={[0, TOWER.baseHeight / 2, 0]}>
        <cylinderGeometry
          args={[TOWER.baseRadius, TOWER.baseRadius * 1.05, TOWER.baseHeight, 12]}
        />
        <meshStandardMaterial color="#4a3828" roughness={0.95} />
      </mesh>
      {/* Stone bricks ring — subtle horizontal banding di base */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`base-brick-${i}`}
          position={[0, 0.08 + i * 0.075, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[TOWER.baseRadius * 0.98, TOWER.baseRadius * 1.02, 24]} />
          <meshStandardMaterial color="#3a2818" roughness={0.95} />
        </mesh>
      ))}

      {/* === SHAFT === main kolom */}
      <mesh position={[0, TOWER.baseHeight + TOWER.shaftHeight / 2, 0]}>
        <cylinderGeometry
          args={[
            TOWER.shaftRadiusTop,
            TOWER.shaftRadiusBottom,
            TOWER.shaftHeight,
            12,
          ]}
        />
        <meshStandardMaterial color={stoneColor} roughness={0.92} />
      </mesh>
      {/* Vertical brick lines (subtle) — 4 garis vertikal di sisi shaft */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh
            key={`shaft-line-${i}`}
            position={[
              Math.cos(angle) * TOWER.shaftRadiusTop * 0.99,
              TOWER.baseHeight + TOWER.shaftHeight / 2,
              Math.sin(angle) * TOWER.shaftRadiusTop * 0.99,
            ]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.04, TOWER.shaftHeight * 0.95, 0.02]} />
            <meshStandardMaterial color="#5a4838" roughness={0.95} />
          </mesh>
        );
      })}

      {/* === CAP === ring tebal sebelum dial level */}
      <mesh
        position={[
          0,
          TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight / 2,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            TOWER.capRadius,
            TOWER.shaftRadiusTop * 1.05,
            TOWER.capHeight,
            12,
          ]}
        />
        <meshStandardMaterial
          color={restored ? '#7a6048' : '#5a4838'}
          roughness={0.9}
        />
      </mesh>

      {/* === DIAL FACE === menghadap +Z (kamera default ada di +Z). */}
      <group position={[0, TOWER.dialY, TOWER.shaftRadiusTop * 0.95]}>
        {/* Stained-glass backplate (restored only) — visible di belakang dial,
            slightly larger, warm emissive glow. Drought: omitted. */}
        {restored && (
          <mesh position={[0, 0, -0.08]}>
            <cylinderGeometry
              args={[TOWER.dialRadius * 1.12, TOWER.dialRadius * 1.12, 0.04, 32]}
            />
            <meshStandardMaterial
              ref={stainedGlassRef}
              color="#f4a868"
              emissive="#e88040"
              emissiveIntensity={0.55}
              roughness={0.5}
              toneMapped={false}
            />
          </mesh>
        )}
        {/* Main dial disc */}
        <mesh>
          <cylinderGeometry
            args={[TOWER.dialRadius, TOWER.dialRadius, TOWER.dialThickness, 32]}
          />
          <meshStandardMaterial
            ref={dialMatRef}
            color={dialColor}
            emissive={dialEmissive}
            emissiveIntensity={restored ? 0.35 : 0}
            roughness={restored ? 0.5 : 1}
            transparent={!restored}
            opacity={restored ? 1 : 0.92}
          />
        </mesh>
        {/* Dial rim torus */}
        <mesh position={[0, 0, TOWER.dialThickness / 2]}>
          <torusGeometry args={[TOWER.dialRadius, 0.06, 8, 32]} />
          <meshStandardMaterial color={trimColor} roughness={0.85} />
        </mesh>
        {/* Hour markers — 12 tick marks di rim */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const isCardinal = i % 3 === 0; // 12, 3, 6, 9 bigger
          const len = isCardinal ? 0.14 : 0.08;
          const r = TOWER.dialRadius - len / 2 - 0.02;
          return (
            <mesh
              key={`tick-${i}`}
              position={[
                Math.sin(angle) * r,
                Math.cos(angle) * r,
                TOWER.dialThickness / 2 + 0.005,
              ]}
              rotation={[0, 0, -angle]}
            >
              <boxGeometry args={[isCardinal ? 0.04 : 0.025, len, 0.01]} />
              <meshStandardMaterial color={trimColor} roughness={0.7} />
            </mesh>
          );
        })}
        {/* Clock hands — separate component reads useWibTime + rotates per
            second. Mounted slightly in front of dial face. */}
        <ClockHands restored={restored} />
        {/* Center pin */}
        <mesh position={[0, 0, TOWER.dialThickness / 2 + 0.03]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color={trimColor} roughness={0.5} />
        </mesh>
      </group>

      {/* === SPIRE === kerucut atas */}
      <mesh
        position={[
          0,
          TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight + TOWER.spireHeight / 2,
          0,
        ]}
      >
        <coneGeometry args={[0.6, TOWER.spireHeight, 8]} />
        <meshStandardMaterial
          color={restored ? '#6a4828' : '#4a3828'}
          roughness={0.9}
        />
      </mesh>
      {/* Spire ball — finial di puncak */}
      <mesh position={[0, TOWER.topY + 0.05, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial
          color={restored ? '#c89860' : '#5a4838'}
          emissive={restored ? '#e8a868' : '#000000'}
          emissiveIntensity={restored ? 0.3 : 0}
          roughness={restored ? 0.5 : 0.9}
          metalness={restored ? 0.35 : 0}
        />
      </mesh>

      {/* === BELL === restored only, di sisi belakang spire base */}
      {restored && (
        <group position={[0, TOWER.baseHeight + TOWER.shaftHeight + TOWER.capHeight + 0.35, -0.45]}>
          {/* Bell body */}
          <mesh>
            <coneGeometry args={[0.22, 0.34, 12, 1, true]} />
            <meshStandardMaterial
              ref={bellMatRef}
              color="#c89860"
              emissive="#e8a868"
              emissiveIntensity={0.4}
              roughness={0.55}
              metalness={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Bell crown — small hemisphere on top */}
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#a87838" roughness={0.6} metalness={0.5} />
          </mesh>
        </group>
      )}

      {/* === PENDULUM === menggantung di depan shaft, di bawah dial.
          Pivot di atas, bob di bawah. Swing:
            restored          → smooth amplitude penuh, periode ~2.4s
            drought + event   → swing kecil + bob warm tint
            drought no event  → still (idle), bob muted
          Visible di kedua state — silhouette pendulum kasih "tower
          mechanism" feel. */}
      <Pendulum restored={restored} />
    </group>
  );
};

// Pendulum — rod + bob swing dari pivot di bawah dial, hanging depan
// shaft. Hook useNearestSchedule dipake di sini supaya swing condition
// drought reactive ke data (bandul "cari ritmenya" kalau ada event ≤30d).
const Pendulum = ({ restored }) => {
  const groupRef = useRef();
  const bobMatRef = useRef();
  const nearestEvent = useNearestSchedule();
  const hasNearbyEvent = Boolean(nearestEvent);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Amplitude per state — restored gerak penuh, drought subtle, drought
    // tanpa event = diam total (idle clock).
    let amplitude = 0;
    if (restored) amplitude = 0.28;
    else if (hasNearbyEvent) amplitude = 0.12;
    else amplitude = 0;
    groupRef.current.rotation.z = Math.sin(t * (Math.PI / 1.2)) * amplitude;
    // Bob tint pulse — restored = always warm, drought + event = subtle
    // warm pulse, drought no event = dim (no animation).
    if (bobMatRef.current) {
      if (restored) {
        bobMatRef.current.emissiveIntensity = 0.35 + Math.sin(t * 1.1) * 0.1;
      } else if (hasNearbyEvent) {
        bobMatRef.current.emissiveIntensity = 0.18 + Math.sin(t * 0.8) * 0.06;
      } else {
        bobMatRef.current.emissiveIntensity = 0.05;
      }
    }
  });

  // Pivot world position: dipasang di bawah dial-rim, di shaft front face.
  const pivotY = TOWER.dialY - TOWER.dialRadius - 0.15;
  const rodLen = 1.8;
  const bobRadius = 0.22;

  return (
    <group
      ref={groupRef}
      position={[0, pivotY, TOWER.shaftRadiusTop * 0.85]}
    >
      {/* Pivot bracket — small disc di pivot point */}
      <mesh position={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 8]} />
        <meshStandardMaterial color="#3a2818" roughness={0.85} />
      </mesh>
      {/* Rod */}
      <mesh position={[0, -rodLen / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, rodLen, 6]} />
        <meshStandardMaterial
          color={restored ? '#8a6838' : '#4a3828'}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      {/* Bob — bronze disc */}
      <mesh position={[0, -rodLen, 0]}>
        <cylinderGeometry args={[bobRadius, bobRadius, 0.1, 24]} />
        <meshStandardMaterial
          ref={bobMatRef}
          color={restored ? '#c89860' : '#6a5238'}
          emissive={restored ? '#e8a868' : '#3a2810'}
          emissiveIntensity={restored ? 0.35 : 0.05}
          roughness={restored ? 0.5 : 0.85}
          metalness={restored ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
};

// ClockHands — reads useWibTime each second, rotates hands per WIB.
// Hour hand selalu, minute hand hanya jika restored (drought = jarum
// menit hilang per spec).
const ClockHands = ({ restored }) => {
  const time = useWibTime();
  // Dial geometry adalah cylinder dengan axis sepanjang Y (3D). Setelah
  // ditempatkan di group dengan no rotation, "face"-nya menghadap +Y.
  // Tapi kita render dial sebagai disc menghadap +Z secara visual karena
  // cylinder dengan height 0.12 menghasilkan circle face di +Y dan -Y;
  // dengan tampilan dari +Z, kita lihat sisi sebenarnya rim, BUKAN face.
  //
  // Solusi: kita bisa rotate dial 90° around X agar face menghadap +Z,
  // tapi itu rusakin hierarchy. Alternatif yg lebih bersih: dial cylinder
  // tetap di axis Y dan kita render hands sebagai box di XZ-plane.
  //
  // CATATAN: Di kode ClockTower di atas, dial cylinder height 0.12
  // dipakai sebagai *thickness depth*, dan radius adalah face-radius
  // (which is XZ extent). Karena cylinder axis = Y, the "face" yang
  // kelihatan dari +Z adalah elliptical projection (looks like circle if
  // viewer is far + perpendicular). Ini common low-poly tactic — visual
  // dari front kerasa flat disc, depth = thickness.
  //
  // Untuk hands, kita render di plane menghadap +Z (XY plane). Hand box
  // dengan length sepanjang local +Y, rotation around Z axis = clockwise
  // rotation when viewed from +Z. 12 o'clock = +Y, 3 = +X, 6 = -Y, 9 = -X.

  // Hour hand: rotation negatif (clockwise viewed from +Z).
  // 12 → 0 rad, 3 → -π/2, 6 → -π, 9 → -3π/2 (or +π/2).
  const hourAngle = -(time.hour12Frac / 12) * Math.PI * 2;
  const minuteAngle = -(time.minuteFrac / 60) * Math.PI * 2;

  return (
    <group position={[0, 0, TOWER.dialThickness / 2 + 0.02]}>
      {/* Hour hand — shorter & thicker. Pivot di center, length extends
          along +Y. */}
      <group rotation={[0, 0, hourAngle]}>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.06, 0.54, 0.02]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.65}
          />
        </mesh>
        {/* Tail (small counter-balance behind pivot) */}
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.02]} />
          <meshStandardMaterial
            color={restored ? '#2a1808' : '#1a0f08'}
            roughness={0.65}
          />
        </mesh>
      </group>
      {/* Minute hand — longer & thinner. ONLY restored — drought jarum
          menit hilang per spec. */}
      {restored && (
        <group rotation={[0, 0, minuteAngle]}>
          <mesh position={[0, 0.4, 0.005]}>
            <boxGeometry args={[0.04, 0.78, 0.018]} />
            <meshStandardMaterial color="#2a1808" roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.12, 0.005]}>
            <boxGeometry args={[0.04, 0.24, 0.018]} />
            <meshStandardMaterial color="#2a1808" roughness={0.65} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// AnniversaryGlow — warm halo ring di belakang dial saat hari ini cocok
// dengan birthday Eli atau salah satu milestone ELI_TIMELINE. Restored
// only — drought tone "jam masih sembuh" gak kawin sama perayaan.
const AnniversaryGlow = ({ restored }) => {
  const anniversaries = useAnniversaryMatch();
  const matRef = useRef();
  const active = restored && anniversaries.length > 0;

  useFrame((state) => {
    if (!matRef.current) return;
    if (!active) {
      matRef.current.opacity = 0;
      matRef.current.emissiveIntensity = 0;
      return;
    }
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.42 + Math.sin(t * 0.7) * 0.12;
    matRef.current.emissiveIntensity = 0.7 + Math.sin(t * 0.7) * 0.2;
  });

  if (!active) return null;

  // Halo di belakang dial face — slightly larger radius supaya rim
  // glow keluar dari sisi dial. Z slightly behind kaca patri backplate.
  const dialZ = TOWER.shaftRadiusTop * 0.95 - 0.12;
  return (
    <group position={[0, TOWER.dialY, dialZ]}>
      <mesh>
        <ringGeometry args={[TOWER.dialRadius * 1.18, TOWER.dialRadius * 1.65, 48]} />
        <meshStandardMaterial
          ref={matRef}
          color="#f8c878"
          emissive="#f0a058"
          emissiveIntensity={0.7}
          transparent
          opacity={0.4}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// ShowtimeIndicator — easter egg subtle di posisi-7 dial saat sekitar
// 19:00 WIB (showtime JKT48 Theater). Fade-in ±30 menit window, peak
// di tepat 19:00. Restored only.
const ShowtimeIndicator = ({ restored }) => {
  const time = useWibTime();
  if (!restored) return null;
  const totalMin = time.hours * 60 + time.minutes;
  const dist = Math.abs(totalMin - 19 * 60);
  if (dist > 30) return null;
  const intensity = 1 - dist / 30;
  // Position-7 di dial: angle 7π/6 dari +Y clockwise.
  const angle = (7 / 12) * Math.PI * 2;
  const r = TOWER.dialRadius * 0.62;
  const x = Math.sin(angle) * r;
  const y = Math.cos(angle) * r;
  const dialFaceZ = TOWER.shaftRadiusTop * 0.95 + TOWER.dialThickness / 2 + 0.035;
  return (
    <group position={[0, TOWER.dialY, dialFaceZ]}>
      {/* Inner bright spot */}
      <mesh position={[x, y, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial
          color="#fff0c8"
          emissive="#f8c478"
          emissiveIntensity={1.1 * intensity}
          transparent
          opacity={0.85 * intensity}
          toneMapped={false}
        />
      </mesh>
      {/* Outer soft falloff */}
      <mesh position={[x, y, -0.01]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial
          color="#f4a868"
          emissive="#e88040"
          emissiveIntensity={0.55 * intensity}
          transparent
          opacity={0.4 * intensity}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const Scene = ({ restored, isMobile }) => (
  <>
    <SkyBackdrop restored={restored} />
    <SceneLights restored={restored} />
    <Plaza restored={restored} />
    <ClockTower restored={restored} />
    <AnniversaryGlow restored={restored} />
    <ShowtimeIndicator restored={restored} />
    {/* Camera + controls — low angle lookup. Target Y di mid-dial
        (~5.5) supaya orbit center di tower mid-section, bukan di tanah. */}
    <OrbitControls
      target={[0, 4.5, 0]}
      enablePan={false}
      enableZoom
      minDistance={6}
      maxDistance={isMobile ? 18 : 14}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.05}
      enableDamping
    />
  </>
);

// Bottom-center info pill — confirms clock is "alive" dgn real-time
// WIB tick. Drought: copy "jam separuh jalan". Restored: copy "jam pulih".
const TimePill = ({ restored }) => {
  const time = useWibTime();
  const hh = String(time.hours).padStart(2, '0');
  const mm = String(time.minutes).padStart(2, '0');
  const ss = String(time.seconds).padStart(2, '0');
  const subline = restored
    ? 'Menara jam pulih — kota inget waktu tiap detik'
    : 'Jam separuh jalan — jarum menit masih hilang';
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[92vw]">
      <div className="flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 shadow-lg">
        <div className="flex items-baseline gap-2 tabular-nums">
          <span className="text-white/95 text-base sm:text-lg font-medium tracking-wide">
            {hh}:{mm}
          </span>
          <span className="text-white/45 text-[10px]">:{ss}</span>
          <span className="text-amber-200/75 text-[10px] uppercase tracking-[0.2em] ml-1">
            WIB
          </span>
        </div>
        <p className="text-white/55 text-[10px] sm:text-[11px] tracking-wide italic"
           style={{ fontFamily: '"Fraunces Variable", serif' }}>
          {subline}
        </p>
      </div>
    </div>
  );
};

// AlmanakCard — restored only, panel bottom-left dgn derived data dari
// ELI_TIMELINE + eli-schedule.json. Drought variant gak render card ini —
// drought hanya dapet CountdownChip (lebih ringkas).
const AlmanakCard = () => {
  const a = useAlmanak();
  const anniversaries = useAnniversaryMatch();
  const eventDays =
    a.nearestEvent && a.nearestEvent.date
      ? Math.max(0, daysFromWibToday(a.nearestEvent.date.substring(0, 10)))
      : null;
  const eventDate = a.nearestEvent ? formatShortIdDate(a.nearestEvent.date) : null;
  const lastDays =
    a.lastMilestone && a.lastMilestone.date
      ? -daysFromWibToday(a.lastMilestone.date)
      : null;

  return (
    <div className="pointer-events-auto absolute bottom-24 sm:bottom-6 left-3 sm:left-6 z-10 w-[calc(100vw-1.5rem)] sm:w-[320px]">
      <div
        className="rounded-2xl border border-white/12 bg-[#1c1612]/85 backdrop-blur-md shadow-2xl px-4 py-3.5 sm:px-5 sm:py-4"
        style={{ fontFamily: '"Fraunces Variable", serif' }}
      >
        {/* Anniversary chip — golden header strip muncul HANYA saat hari
            ini cocok dgn birthday Eli atau MM-DD milestone. Self-refreshing
            tiap tahun karena driven by today's MM-DD. */}
        {anniversaries.length > 0 && (
          <div className="mb-3 -mx-1 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-500/10 border border-amber-300/25">
            <div className="text-amber-200/85 text-[9px] uppercase tracking-[0.3em] mb-0.5">
              Hari ini · {anniversaries[0].period}
            </div>
            <div className="text-amber-50/90 text-[12px] sm:text-[13px] italic leading-snug">
              {anniversaries[0].title}
            </div>
            {anniversaries.length > 1 && (
              <div className="text-amber-100/55 text-[10px] mt-1 italic">
                +{anniversaries.length - 1} milestone lain hari ini
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-amber-200/75 text-[9px] uppercase tracking-[0.3em]">
            Almanak Kota
          </div>
          <div className="text-white/35 text-[9px] tabular-nums">
            {a.todayLong}
          </div>
        </div>

        {/* Days since debut counter — anchor "tower remembers time" */}
        {a.daysSinceDebut !== null && (
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-amber-100/90 text-2xl sm:text-3xl font-medium tabular-nums">
              {a.daysSinceDebut.toLocaleString('id-ID')}
            </span>
            <span className="text-white/55 text-[11px] sm:text-xs italic">
              hari sejak Debut Theater
            </span>
          </div>
        )}

        {/* Last milestone */}
        {a.lastMilestone && (
          <div className="mb-2.5 pb-2.5 border-b border-white/8">
            <div className="text-white/40 text-[9px] uppercase tracking-[0.2em] mb-1">
              Milestone terakhir{lastDays !== null && ` · ${lastDays} hari lalu`}
            </div>
            <div className="text-white/85 text-[13px] leading-snug italic">
              {a.lastMilestone.title}
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">
              {a.lastMilestone.period}
            </div>
          </div>
        )}

        {/* Next event (≤30 days) — if available */}
        {a.nearestEvent ? (
          <div>
            <div className="text-white/40 text-[9px] uppercase tracking-[0.2em] mb-1">
              Eli tampil · {eventDays === 0 ? 'hari ini' : `${eventDays} hari lagi`}
            </div>
            <div className="text-white/85 text-[13px] leading-snug italic">
              {a.nearestEvent.title}
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">
              {eventDate}
              {a.nearestEvent.venue ? ` · ${a.nearestEvent.venue}` : ''}
            </div>
          </div>
        ) : a.nextMilestone ? (
          <div>
            <div className="text-white/40 text-[9px] uppercase tracking-[0.2em] mb-1">
              {a.nextMilestone.date ? 'Milestone berikutnya' : 'Menuju'}
            </div>
            <div className="text-white/85 text-[13px] leading-snug italic">
              {a.nextMilestone.title}
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">
              {a.nextMilestone.period}
            </div>
          </div>
        ) : (
          <div className="text-white/50 text-[11px] italic">
            Bandul nungguin event berikutnya.
          </div>
        )}
      </div>
    </div>
  );
};

// CountdownChip — drought variant pakai ini (kompak), restored gak pakai
// karena info udah ada di AlmanakCard. Bandul fallback "cari ritmenya"
// kalau gak ada event terdekat.
const CountdownChip = () => {
  const nearest = useNearestSchedule();
  const eventDays =
    nearest && nearest.date
      ? Math.max(0, daysFromWibToday(nearest.date.substring(0, 10)))
      : null;
  const copy = nearest
    ? `${eventDays === 0 ? 'Hari ini' : `${eventDays} hari lagi`} · ${nearest.title}`
    : 'Bandul masih cari ritmenya — belum ada event terdekat';
  return (
    <div className="pointer-events-none absolute bottom-24 sm:bottom-24 left-1/2 -translate-x-1/2 z-10 max-w-[88vw]">
      <div className="px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 shadow-lg">
        <p
          className="text-white/65 text-[10px] sm:text-[11px] italic text-center tracking-wide whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          {copy}
        </p>
      </div>
    </div>
  );
};

// BellToggle — restored only. Toggles hourly bell chime + persists ke
// localStorage. Default OFF supaya user yg buka page gak kaget sama
// audio (juga policy "no autoplay sound" yang umum). User gesture
// pertama saat toggle ON unlock AudioContext.
const BellToggle = () => {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(BELL_STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  });
  useHourlyBell(enabled);

  const handleClick = () => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BELL_STORAGE_KEY, next ? 'on' : 'off');
      } catch {
        /* storage disabled — fail silently */
      }
      // Saat toggle ON, ring sekali sebagai konfirmasi audio working.
      if (next) {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            const ctx = new Ctx();
            // Lower peak buat preview strike (jangan kaget user).
            playBellStrike(ctx, 0.25);
          }
        } catch {
          /* audio unavailable */
        }
      }
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={enabled}
      aria-label={enabled ? 'Matikan bel jam' : 'Nyalakan bel jam'}
      title={enabled ? 'Bel: tiap jam (klik buat mute)' : 'Bel: mute (klik buat aktifkan)'}
      className={`pointer-events-auto rounded-full border w-9 h-9 grid place-items-center transition ${
        enabled
          ? 'border-amber-300/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
          : 'border-white/15 bg-black/30 text-white/55 hover:bg-white/10 hover:text-white/80'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* Bell silhouette */}
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
        {/* Slash when muted */}
        {!enabled && <line x1="4" y1="4" x2="20" y2="20" />}
      </svg>
    </button>
  );
};

const Header = ({ restored }) => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-20 md:px-6 md:pt-24 pb-4 md:pb-5">
    <div className="pointer-events-auto">
      <Link
        to="/armeniacaTown/peta"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        ← Peta Kota
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
        Menara Jam{restored ? '' : ' — Separuh Jalan'}
      </div>
    </div>
    {/* Right-side slot — BellToggle hanya muncul di restored (drought
        belum boleh bunyi per spec "bel masih bisu"). Drought spacer biar
        layout balance. */}
    {restored ? (
      <BellToggle />
    ) : (
      <div className="w-9" aria-hidden />
    )}
  </div>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat menara jam...
  </div>
);

const TamanMenaraJamPage = ({ restored = false }) => {
  const isMobile = useIsMobile();
  return (
    <>
      <Seo
        title={`ArmeniacaTown — Menara Jam${restored ? ' (Pulih)' : ''}`}
        description="Menara Jam ArmeniacaTown — kota yang mulai inget waktu. Real-time WIB clock + Almanak Kota."
        path="/armeniacaTown/r4"
      />
      <RotateRecommendation />
      <div className="relative w-full h-screen bg-[#1a1018] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: [4, 2.2, 8] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ gl }) => {
              gl.toneMappingExposure = 1.4;
            }}
          >
            <Scene restored={restored} isMobile={isMobile} />
            {!isMobile && (
              <EffectComposer multisampling={0}>
                <Bloom
                  intensity={0.5}
                  luminanceThreshold={0.78}
                  luminanceSmoothing={0.4}
                  mipmapBlur
                />
                <Vignette eskil={false} offset={0.3} darkness={0.75} />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            )}
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>
        <Header restored={restored} />
        {restored ? <AlmanakCard /> : <CountdownChip />}
        <TimePill restored={restored} />
      </div>
    </>
  );
};

export default TamanMenaraJamPage;
