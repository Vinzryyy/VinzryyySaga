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
import { Link } from 'react-router-dom';
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

const Scene = ({ restored, isMobile }) => (
  <>
    <SkyBackdrop restored={restored} />
    <SceneLights restored={restored} />
    <Plaza restored={restored} />
    <ClockTower restored={restored} />
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
    <div className="w-[68px] md:w-[110px]" aria-hidden />
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
        <TimePill restored={restored} />
      </div>
    </>
  );
};

export default TamanMenaraJamPage;
