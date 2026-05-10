/**
 * Taman Kebaikan — Petak R1: Konstelasi Perjalanan.
 *
 * Petak pertama di /taman/peta yang punya isi konkret. Konsep: user
 * berdiri di taman senja melihat ke atas — milestone karier Eli (dari
 * ELI_TIMELINE di src/data/eliProfile.js) di-render sebagai bintang
 * di langit, di-group ke 7 konstelasi per era (lihat ERA_DEFS):
 * Trainee → Theater → Senbatsu → New Era → Mature → Variety → JKT48
 * Fight. Bintang dalam satu era terhubung garis tipis = konstelasi.
 *
 * Ground level kept (bench, swing, wind chime, monument, lentera,
 * mist) sebagai dasar "berdiri di taman" — user gak floating di
 * space. Camera tilt up: orbit target di mid-air, polar diperluas ke
 * arah bawah supaya user bisa "menengadah".
 *
 * Layer langit:
 * - Background starfield (240 points) — bintang random distant
 * - HighlightStars (6) — bright anchor stars existing
 * - StarMilestone (21) — milestone career, era-grouped, clickable
 * - ConstellationLines — segments connecting milestones in same era
 * - ConstellationLabels — fade-in era name saat camera looking toward
 *
 * Pre-konstelasi rewrite: dulu r1 = "Pohon-Pohon yang Mengingat",
 * 21 pohon di-arrange alternating kiri/kanan di sepanjang lorong z.
 * Mulai cramped saat ELI_TIMELINE tumbuh > 14 entries. Pivot ke
 * konstelasi handle scaling ke 21+ stars naturally (langit besar).
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

import {
  PATH_START_Z,
  PATH_END_Z,
  PATH_X_OFFSET,
  ORBIT_TARGET,
  CORRIDOR_X_HALF,
  CORRIDOR_Z_MIN,
  CORRIDOR_Z_MAX,
  CORRIDOR_Z_LEN,
  WIND_GUST_PERIOD,
  FIREFLY_BLACKOUT_PERIOD,
  hashSeed,
  lerpHexColor,
  getWind,
  getFireflyBlackout,
  playChimeTone,
} from '../components/taman/r1/utils';
import {
  SKY_RADIUS,
  SKY_CENTER,
  ERA_DEFS,
  ERA_LOOKUP,
  skyPosition,
  milestoneSkyPosition,
  starColorForMilestone,
} from '../components/taman/r1/era';
import {
  SkyGroup,
  Stars,
  HighlightStars,
  Moon,
  Nebula,
  ShootingStar,
} from '../components/taman/r1/sky';
import {
  StarMilestone,
  ConstellationLines,
  ConstellationLabels,
} from '../components/taman/r1/constellation';
import {
  Fireflies,
  GroundMist,
  MistPools,
  FallingLeaves,
  FlyingLeavesGust,
  MemoryFragments,
} from '../components/taman/r1/atmosphere';
import {
  Path,
  GroundPatches,
  Footprints,
  PathEdgeStones,
  SettledLeaves,
  Puddle,
  Bushes,
  Mushrooms,
  DistantForest,
  SideTrees,
  GardenAnchorTrees,
} from '../components/taman/r1/ground';
import {
  Lanterns,
  Owls,
  DistantFigure,
  Bats,
  Rabbits,
  StoneMonument,
  OldBench,
  TreeSwing,
  WindChime,
  MonumentProximity,
} from '../components/taman/r1/landmarks';


// Sync camera saat user toggle viewMode. Smooth lerp transition over
// ~1.2s sambil controls (Orbit/PointerLock) di-disable di luar — flag
// `transitioning` di parent. Setelah transition selesai, controls
// diambil alih.
const CAMERA_TARGETS = {
  // Orbit: camera dekat target [0,5,-10]. Position y=4 (sedikit
  // di bawah target y=5) supaya initial polar ~1.68 within
  // maxPolar 1.75 limit (gak ada snap saat first render).
  orbit: { pos: new THREE.Vector3(4, 4, -2), look: new THREE.Vector3(0, 5, -10) },
  // FPV "tatap langit": user di tengah path, eye level, look default
  // ke atas-depan tapi bisa pan bebas via mouse/touch.
  fpv: { pos: new THREE.Vector3(0, 1.7, -8), look: new THREE.Vector3(0, 7, -14) },
};

// Cinematic intro — camera arc dari overhead high-angle ke default
// orbit position selama ~3.5s saat first visit. Bikin entrance terasa
// "dunia perlahan terbuka" — start lihat ke bawah dari atas, lerp ke
// eye-level orbit. Cubic ease-out: cepat awal, slow di akhir untuk
// settle smooth.
const INTRO_DURATION = 3.5;
const INTRO_START_POS = new THREE.Vector3(0, 13, 4);
const INTRO_END_POS = CAMERA_TARGETS.orbit.pos.clone();
const INTRO_LOOK = CAMERA_TARGETS.orbit.look.clone();

const CinematicIntro = ({ active, onComplete }) => {
  const { camera } = useThree();
  const startTimeRef = useRef(-1);
  const completedRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    // Pre-position camera ke start sebelum first frame supaya gak
    // ada jump dari default Canvas position ke INTRO_START.
    camera.position.copy(INTRO_START_POS);
    camera.lookAt(INTRO_LOOK);
    startTimeRef.current = -1;
    completedRef.current = false;
  }, [active, camera]);
  useFrame((state) => {
    if (!active || completedRef.current) return;
    const t = state.clock.elapsedTime;
    if (startTimeRef.current < 0) startTimeRef.current = t;
    const elapsed = t - startTimeRef.current;
    const progress = Math.min(1, elapsed / INTRO_DURATION);
    // Ease out cubic — fast start, settle slow di end
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(INTRO_START_POS, INTRO_END_POS, eased);
    camera.lookAt(INTRO_LOOK);
    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });
  return null;
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
    // Endless walk: x clamp tetap (gak kabur ke sisi taman),
    // z bebas — entities akan wrap di sekitar user lewat
    // EndlessSideTrees & EndlessLanterns. Monument tetap landmark
    // di z=-32, user bisa lewatin atau balik.
    camera.position.x = Math.max(-5.5, Math.min(5.5, camera.position.x));
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
    // Endless walk: x clamp tetap (gak kabur ke sisi taman),
    // z bebas — entities akan wrap di sekitar user lewat
    // EndlessSideTrees & EndlessLanterns. Monument tetap landmark
    // di z=-32, user bisa lewatin atau balik.
    camera.position.x = Math.max(-5.5, Math.min(5.5, camera.position.x));
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
  spotlightEra,
  isMobile,
  signatureEvent,
  viewMode,
  transitioning,
  introActive,
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
  onIntroComplete,
}) => (
  <>
    {/* Twilight purple-blue, lebih senja vibe daripada solid blue-gray */}
    <fog attach="fog" args={['#1f2335', 13, 42]} />
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
    {/* Pohon-pohon dikembalikan sebagai garden filler — gak lagi
        per-milestone (milestones udah pindah ke langit), tapi sebagai
        tatanan taman di mana user berdiri. SideTrees scattered di
        perimeter, GardenAnchorTrees di posisi spesifik dekat bench/
        swing/monument untuk komposisi. YearPlaques + Owls tetep
        dropped (tied ke per-milestone tree). */}
    <SideTrees isMobile={isMobile} viewMode={viewMode} />
    <GardenAnchorTrees isMobile={isMobile} />
    <Bushes />
    <Mushrooms />
    {/* SkyGroup — wrap semua celestial elements (background stars,
        highlight stars, moon, milestone konstelasi). Di FPV, group
        follow camera XZ → stars terasa "ikut user" (real sky parallax-
        free). Di orbit, fixed di SKY_CENTER. */}
    <SkyGroup viewMode={viewMode}>
      <Stars isMobile={isMobile} />
      {!isMobile && <Nebula />}
      <HighlightStars signatureEvent={signatureEvent} isMobile={isMobile} />
      <Moon />
      {!isMobile && <ShootingStar />}
      {/* Konstelasi milestone — bintang di langit, era-grouped */}
      <ConstellationLines stars={trees} />
      <ConstellationLabels />
      {trees.map((star) => (
        <StarMilestone
          key={star.id}
          star={star}
          hovered={hoveredTreeId === star.id}
          selected={selectedTreeId === star.id}
          spotlit={spotlightEra === star.eraId}
          modalOpen={selectedTreeId !== null}
          signatureEvent={signatureEvent}
          onPointerOver={onTreeHover}
          onPointerOut={onTreeOut}
          onClick={onTreeClick}
        />
      ))}
    </SkyGroup>
    {/* FlyingLeavesGust di-bring-back — daun terbang di ground+mid air,
        gak ngeganggu sky atas (gust drift y=0.5..6, langit mulai y=10+). */}
    <FlyingLeavesGust isMobile={isMobile} />
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
    <Lanterns signatureEvent={signatureEvent} viewMode={viewMode} />
    <Owls signatureEvent={signatureEvent} />
    <Rabbits />
    {!isMobile && <Bats />}
    <DistantFigure signatureEvent={signatureEvent} />
    <Fireflies count={isMobile ? 9 : 16} />
    <GroundMist count={isMobile ? 22 : 38} />
    {!isMobile && <MistPools />}
    <FallingLeaves count={isMobile ? 22 : 38} />
    <MemoryFragments isMobile={isMobile} />
    {/* Konstelasi + milestone stars dipindah ke <SkyGroup> di atas
        supaya FPV walk = stars follow user (parallax-free). */}
    <CameraSync viewMode={viewMode} transitioning={transitioning} />
    <CinematicIntro active={introActive} onComplete={onIntroComplete} />
    {/* Controls cuma render setelah transition selesai supaya nggak
        fight dgn lerp. Saat transitioning=true, no control aktif. */}
    {!transitioning && !introActive && viewMode === 'orbit' && (
      <OrbitControls
        target={ORBIT_TARGET}
        enableZoom
        minDistance={5}
        maxDistance={14}
        enablePan={false}
        // Polar range — clamp ke maxPolar 1.75 (~100°) supaya camera
        // gak tembus ke bawah ground saat orbit dipping. ORBIT_TARGET
        // y=5, distance 5-14 → polar 1.75 keeps camera y >= ~2 di
        // worst case (maxDistance + max tilt). User masih bisa look
        // down ~10° dari horizontal untuk lihat ground sekitar.
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={1.75}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.4}
        autoRotate
        autoRotateSpeed={0.10}
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
        Menyusun konstelasi...
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
    title: 'Konstelasi Perjalanan',
    text: `${ELI_TIMELINE.length} perjalanan Eli, dirajut sebagai konstelasi di langit taman senja.`,
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
      Konstelasi Perjalanan
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
const INTRO_STORAGE_KEY = 'taman-r1-intro-seen';
const IntroTitle = ({ isMobile = false }) => {
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    // Skip kalau user udah lihat di visit sebelumnya — gak ngulang
    // intro tiap kali masuk r1
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_STORAGE_KEY) === '1';
    } catch {
      /* storage blocked */
    }
    if (seen) {
      setRemoved(true);
      return undefined;
    }
    const t1 = setTimeout(() => setVisible(true), 350); // start fade in
    const t2 = setTimeout(() => setVisible(false), 5500); // start fade out
    const t3 = setTimeout(() => {
      setRemoved(true);
      try {
        localStorage.setItem(INTRO_STORAGE_KEY, '1');
      } catch {
        /* storage blocked */
      }
    }, 7800);
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
            Konstelasi Perjalanan
          </h1>
          {/* Inner separator line antara title & subtitle */}
          <div className="mx-auto mb-5 w-12 h-px bg-white/30" />
          <div
            className="text-white/70 text-[13px] mb-6"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              letterSpacing: '0.02em',
            }}
          >
            {ELI_TIMELINE.length} perjalanan, dirajut menjadi konstelasi di atas taman senja.
          </div>
          {/* Inline tip — replace separate TutorialHint surface */}
          <div className="text-white/35 text-[9px] uppercase tracking-[0.3em]">
            {isMobile
              ? 'Ketuk bintang · Tatap langit untuk jalan di taman'
              : 'Klik bintang · Drag untuk berputar · Tatap langit untuk jalan'}
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
        Drag stick · Swipe kanan untuk menengadah
      </div>
    </>
  );
};

// Era guide HUD — panel kecil dengan 7 era list + color chip + count.
// Click chip → trigger spotlight: bintang dalam era pulse 4 detik
// supaya user gampang identifikasi mana yang mana di langit. Active
// era (lagi spotlight) di-highlight visual.
const ERA_GUIDE_STORAGE_KEY = 'taman-r1-guide-collapsed';
const EraGuide = ({ trees, isMobile, onSpotlight, spotlightEra }) => {
  // Persistence: user bisa collapse panel kalau merasa intrusive.
  // Default collapsed di mobile (less screen real estate), expanded
  // di desktop. User can toggle either way, persisted.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(ERA_GUIDE_STORAGE_KEY);
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch {
      /* storage blocked */
    }
    // Initial default: collapsed di mobile, expanded di desktop
    return isMobile;
  });
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(ERA_GUIDE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage blocked */
      }
      return next;
    });
  };
  const grouped = useMemo(
    () =>
      ERA_DEFS.map((era) => ({
        ...era,
        stars: trees.filter(
          (t) => ERA_LOOKUP.get(t.id)?.eraDef.id === era.id,
        ),
      })),
    [trees],
  );
  return (
    <div
      className={`pointer-events-none absolute z-20 ${
        isMobile
          ? 'bottom-20 left-3 right-3 flex justify-center'
          : 'top-20 left-4'
      }`}
    >
      <div className="pointer-events-auto rounded-md border border-white/10 bg-[#0a0d18]/75 backdrop-blur-md shadow-xl">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-white/5 transition"
          aria-label={collapsed ? 'Buka panduan era' : 'Tutup panduan era'}
        >
          <span className="text-white/55 text-[8px] uppercase tracking-[0.3em]">
            Era
          </span>
          <span
            className="text-white/40 text-[10px] ml-auto"
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            ▾
          </span>
        </button>
        {!collapsed && (
          <div
            className={`px-2 pb-2 ${
              isMobile ? 'flex flex-wrap justify-center gap-1' : 'flex flex-col gap-0.5'
            }`}
          >
            {grouped.map((era) => {
              const isActive = spotlightEra === era.id;
              return (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => onSpotlight(era.id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-sm transition ${
                    isActive ? 'bg-white/12' : 'hover:bg-white/8'
                  }`}
                  aria-label={`Spotlight ${era.name} (${era.stars.length} bintang)`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: era.color,
                      boxShadow: isActive
                        ? `0 0 10px ${era.color}, 0 0 4px ${era.color}`
                        : `0 0 4px ${era.color}55`,
                    }}
                  />
                  <span
                    className="text-[10px] uppercase tracking-[0.16em] whitespace-nowrap"
                    style={{
                      color: isActive
                        ? era.color
                        : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {era.name}
                  </span>
                  <span className="text-[9px] text-white/35 tabular-nums ml-1">
                    {era.stars.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const LorongFooter = ({ hoveredTreeId, isMobile }) => {
  const hint = hoveredTreeId
    ? 'Klik untuk baca milestone'
    : isMobile
      ? `Ketuk salah satu bintang · ${ELI_TIMELINE.length} perjalanan di langit`
      : `Pilih bintang dari ${ELI_TIMELINE.length} perjalanan · drag untuk berputar langit`;
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
  const eraDef = ERA_LOOKUP.get(tree.id)?.eraDef;
  const eraColor = eraDef?.color ?? '#ffffff';

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="relative bg-[#0e1018]/96 border border-white/10 rounded-2xl max-w-lg mx-6 w-[calc(100%-3rem)] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          // Era color tint subtle di background — 4% gradient dari atas
          background: `linear-gradient(180deg, ${eraColor}0c 0%, transparent 35%), #0e1018f5`,
        }}
      >
        {/* Top accent stripe — era color soft glow line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${eraColor}cc 50%, transparent 100%)`,
            boxShadow: `0 0 12px ${eraColor}99`,
          }}
        />

        <div className="px-7 sm:px-9 py-7 sm:py-8">
          {/* Header — era badge + date */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: eraColor,
                  boxShadow: `0 0 8px ${eraColor}`,
                }}
                aria-hidden="true"
              />
              <span
                className="text-[9px] uppercase tracking-[0.3em] font-medium"
                style={{ color: eraColor }}
              >
                {eraDef?.name ?? 'Era'}
              </span>
              <span className="text-white/25 text-[10px]">·</span>
              <span className="text-white/55 text-[9px] uppercase tracking-[0.25em]">
                {tree.badge}
              </span>
            </div>
            <span className="text-white/45 text-[10px] tabular-nums shrink-0 pt-0.5">
              {fullDate ?? tree.period}
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-white text-[26px] sm:text-[30px] leading-[1.15] mb-4"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              fontWeight: 400,
              letterSpacing: '0.005em',
            }}
          >
            {tree.title}
          </h2>

          {/* Subtle separator under title */}
          <div
            className="w-10 h-px mb-5"
            style={{ background: `${eraColor}66` }}
          />

          {/* Body */}
          <p className="text-white/72 text-[14px] leading-[1.6] mb-7">
            {tree.body}
          </p>

          {/* Counter */}
          {idx >= 0 && (
            <div className="text-center text-white/35 text-[9px] uppercase tracking-[0.3em] mb-4">
              Bintang ke-{idx + 1} dari {total}
            </div>
          )}

          {/* Progress dots grouped by era — 7 cluster, color per era.
              Active dot pakai era color + ring untuk emphasis. */}
          {total > 0 && (
            <div className="flex items-center justify-center gap-2 mb-7 flex-wrap">
              {ERA_DEFS.map((era, eraIdx) => {
                const eraStars = trees.filter((t) => t.eraId === era.id);
                if (eraStars.length === 0) return null;
                return (
                  <React.Fragment key={era.id}>
                    {eraIdx > 0 && (
                      <span
                        className="w-px h-2 bg-white/12"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center gap-1">
                      {eraStars.map((t) => {
                        const i = trees.findIndex((x) => x.id === t.id);
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
                                active ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'
                              }`}
                              style={{
                                background: active
                                  ? era.color
                                  : 'rgba(255,255,255,0.20)',
                                boxShadow: active
                                  ? `0 0 10px ${era.color}, 0 0 0 2px ${era.color}33`
                                  : 'none',
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Nav buttons — prev | close | next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => hasPrev && onPrev?.()}
              disabled={!hasPrev}
              className="w-11 h-11 rounded-full border border-white/15 text-white/65 text-base hover:bg-white/8 hover:border-white/35 hover:text-white/95 transition disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              aria-label="Bintang sebelumnya"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-white/25 text-white/85 text-[13px] hover:bg-white/8 hover:border-white/45 transition tracking-wide"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
              }}
            >
              Kembali ke konstelasi
            </button>
            <button
              type="button"
              onClick={() => hasNext && onNext?.()}
              disabled={!hasNext}
              className="w-11 h-11 rounded-full border border-white/15 text-white/65 text-base hover:bg-white/8 hover:border-white/35 hover:text-white/95 transition disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              aria-label="Bintang selanjutnya"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  // Cinematic intro: camera lerp dari overhead ke default selama
  // ~3.5s di first visit. Skip kalau user udah lihat (localStorage
  // 'taman-r1-intro-seen' di-set saat IntroTitle removal).
  const [introActive, setIntroActive] = useState(() => {
    try {
      return localStorage.getItem(INTRO_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const handleIntroComplete = () => setIntroActive(false);

  // Era spotlight: user click chip di EraGuide → bintang era itu
  // pulse 4 detik supaya gampang identifikasi di langit. Skip kalau
  // era yang sama lagi spotlight.
  const [spotlightEra, setSpotlightEra] = useState(null);
  const spotlightTimerRef = useRef(null);
  const handleEraSpotlight = (eraId) => {
    if (spotlightEra === eraId) return; // toggle-off behavior
    setSpotlightEra(eraId);
    if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
    spotlightTimerRef.current = setTimeout(() => {
      setSpotlightEra(null);
      spotlightTimerRef.current = null;
    }, 4000);
  };
  useEffect(() => {
    return () => {
      if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
    };
  }, []);

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
      const eraInfo = ERA_LOOKUP.get(entry.id);
      const eraId = eraInfo?.eraDef.id ?? null;
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
        eraId,
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
        title="Konstelasi Perjalanan"
        description="Perjalanan karier Eli dari Generasi 7 ke Team Dream — milestone-milestone yang dirajut menjadi konstelasi di langit taman senja."
        path="/taman/r1"
      />
      <div className="relative w-full h-screen bg-[#1c1f2a] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 55, position: [4, 4, -2] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 5, -10);
            }}
          >
            <ClockSync clockRef={clockRef} />
            <LorongScene
              trees={trees}
              hoveredTreeId={hoveredTreeId}
              selectedTreeId={selectedTree?.id ?? null}
              spotlightEra={spotlightEra}
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
              introActive={introActive}
              onIntroComplete={handleIntroComplete}
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

        <IntroTitle isMobile={isMobile} />
        {/* TutorialHint dropped — tip di-merge ke IntroTitle card bottom
            supaya onboarding cuma 1 surface di first visit, bukan 2 */}
        <EraGuide
          trees={trees}
          isMobile={isMobile}
          onSpotlight={handleEraSpotlight}
          spotlightEra={spotlightEra}
        />
        <LorongHeader />
        <LorongFooter hoveredTreeId={hoveredTreeId} isMobile={isMobile} />
        {/* FPV toggle — desktop AND mobile. Position bottom-right.
            Safe-area inset bottom buat iPhone home indicator. */}
        <button
          type="button"
          onClick={toggleViewMode}
          disabled={transitioning || introActive}
          className="pointer-events-auto absolute right-4 sm:right-6 z-30 px-3 py-2 sm:px-4 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm text-white/85 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        >
          {viewMode === 'orbit' ? 'Tatap langit' : 'Keluar tatap langit'}
        </button>
        {/* Desktop FPV hint */}
        {viewMode === 'fpv' && !isMobile && !transitioning && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60 text-[11px] uppercase tracking-[0.25em] text-center">
            <div className="mb-1">Klik layar untuk mulai menengadah</div>
            <div className="text-white/40">
              WASD untuk jalan di taman · Esc untuk lepas kursor
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
