/**
 * Taman Kebaikan — Petak R1: Konstelasi Perjalanan.
 *
 * Petak pertama di /armeniacaTown/peta yang punya isi konkret. Konsep: user
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
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, PointerLockControls, Stats } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
import TownPageFade from '../components/taman/TownPageFade';
import PetakQuickNav from '../components/taman/PetakQuickNav';
import RotateRecommendation from '../components/ui/RotateRecommendation';
import { useIsMobile } from '../components/taman/r3/utils';
import { ELI_TIMELINE } from '../data/eliProfile';

import { ORBIT_TARGET, playChimeTone } from '../components/taman/r1/utils';
import {
  ERA_LOOKUP,
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
  BigTreeReturnPortal,
} from '../components/taman/r1/landmarks';
import {
  CAMERA_TARGETS,
  CinematicIntro,
  CameraSync,
  FPVMovement,
  MobileFPVMovement,
} from '../components/taman/r1/camera';
import {
  SceneFallback,
  LorongHeader,
  IntroTitle,
  MobileFPVControls,
  EraGuide,
  LorongFooter,
  MilestoneOverlay,
  MonumentMomentOverlay,
  ClockSync,
  INTRO_STORAGE_KEY,
} from '../components/taman/r1/ui';
import {
  isPerfEnabled,
  PerfSampler,
  PerfHUD,
} from '../components/taman/r1/perf';

const LorongScene = ({
  trees,
  hoveredTreeId,
  selectedTreeId,
  spotlightEra,
  hoveredEra,
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
  onReturnTrigger,
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
          previewLit={hoveredEra === star.eraId && spotlightEra !== star.eraId}
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
    <BigTreeReturnPortal viewMode={viewMode} onTrigger={onReturnTrigger} />
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


const TamanLorongPohonPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Perf profiling — enable via ?perf=1 URL param. Stats panel +
  // FPS HUD + console warning saat sustained slow. Eval sekali on
  // mount, gak react ke URL change.
  const perfEnabled = useMemo(() => isPerfEnabled(), []);
  const perfFpsRef = useRef(0);
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

  // Big Tree Return Portal — player FPV jalan ke ujung lorong (z=-37),
  // hit pohon besar → balik ke /armeniacaTown/peta. Guarded oleh triggeredRef
  // di komponen-nya supaya fire sekali aja.
  const handleReturnTrigger = () => {
    navigate('/armeniacaTown/peta');
  };

  // Era spotlight: user click chip di EraGuide → bintang era itu
  // pulse 4 detik supaya gampang identifikasi di langit. Skip kalau
  // era yang sama lagi spotlight.
  const [spotlightEra, setSpotlightEra] = useState(null);
  // Hover preview — chip hover di EraGuide → softer pulse di stars
  // (lebih gentle dari click spotlight). Cleared on mouse leave.
  const [hoveredEra, setHoveredEra] = useState(null);
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
        path="/armeniacaTown/r1"
      />
      <div className="relative w-full h-[100dvh] bg-[#1c1f2a] overflow-hidden select-none">
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
            {perfEnabled && <PerfSampler statsRef={perfFpsRef} />}
            <LorongScene
              trees={trees}
              hoveredTreeId={hoveredTreeId}
              selectedTreeId={selectedTree?.id ?? null}
              spotlightEra={spotlightEra}
              hoveredEra={hoveredEra}
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
              onReturnTrigger={handleReturnTrigger}
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
            {(import.meta.env.DEV || perfEnabled) && <Stats />}
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
          onHoverEra={setHoveredEra}
          hoveredEra={hoveredEra}
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
        <AmbientAudio position="top-right" />
        <RotateRecommendation />
        <TownPageFade />
        <PetakQuickNav currentId="r1" />
        {perfEnabled && <PerfHUD statsRef={perfFpsRef} />}
      </div>
    </>
  );
};

export default TamanLorongPohonPage;
