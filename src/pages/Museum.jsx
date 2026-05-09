/**
 * Museum Kebaikan — Fase 1, R0 "World Without Kindness".
 *
 * State machine ruangan ini ada 4 stage:
 *   idle         — kamera dolly maju, teks pembuka fade-in, dunia
 *                  grayscale total, belum bisa di-click
 *   active       — dolly selesai; "tap untuk masuk" muncul; click di
 *                  mana saja akan mulai transisi
 *   transitioning — tween 3 detik: saturation -1 → 0, vignette 0.7 →
 *                  0.3, fog far 28 → 60 (dunia "membuka"). Light
 *                  intensity naik tipis. Teks pembuka fade-out.
 *   done         — overlay "warna telah kembali" + tombol lanjut. Karena
 *                  denah museum (Fase 2) belum dibangun, tombolnya untuk
 *                  sekarang restart R0 atau kembali ke /. Setelah Fase
 *                  2 jadi, ganti jadi navigate ke /museum/denah.
 *
 * Postprocessing pakai ref-based mutation, bukan controlled prop —
 * supaya tween-nya di-update di useFrame langsung tanpa trigger React
 * re-render setiap frame (60 re-render/detik = wasteful).
 *
 * Performance budget: target 60fps desktop, 30fps+ mobile. Kalau drop,
 * kandidat downgrade: kurangi DustParticles count, matiin antialias,
 * dpr cap ke 1 di mobile.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import {
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing';
import Seo from '../components/Seo';

const TRANSITION_DURATION = 3.0; // detik
const DOLLY_DURATION = 12.0;

// Gerbang taman di kejauhan — 2 pilar + balok atas. Sengaja minimalist
// supaya jadi siluet, bukan struktur detail. Detail muncul di R6 (taman
// akhir) saat warna kembali.
const Gate = () => (
  <group position={[0, 0, 0]}>
    <mesh position={[-2.2, 2, 0]}>
      <boxGeometry args={[0.4, 4, 0.4]} />
      <meshStandardMaterial color="#15151a" roughness={0.9} />
    </mesh>
    <mesh position={[2.2, 2, 0]}>
      <boxGeometry args={[0.4, 4, 0.4]} />
      <meshStandardMaterial color="#15151a" roughness={0.9} />
    </mesh>
    <mesh position={[0, 4.2, 0]}>
      <boxGeometry args={[4.8, 0.4, 0.4]} />
      <meshStandardMaterial color="#15151a" roughness={0.9} />
    </mesh>
  </group>
);

// Lantai dasar + grid tipis untuk persepsi skala. Grid sengaja warnanya
// dekat sama background — kelihatan cuma dari sudut tertentu, biar
// nggak mendominasi mood "kosong".
const Ground = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#0c0c10" roughness={1} />
    </mesh>
    <gridHelper
      args={[80, 80, '#1c1c22', '#15151a']}
      position={[0, 0.005, 0]}
    />
  </>
);

// Partikel debu drift pelan ke atas. Pakai BufferGeometry langsung
// supaya 300 partikel bisa render 1 draw call. Reset ke y=0 saat
// keluar atas — sirkulasi tak terhingga.
const DustParticles = ({ count = 300 }) => {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 9;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.06;
      if (arr[i * 3 + 1] > 9) arr[i * 3 + 1] = 0;
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
        size={0.06}
        color="#aaaaaa"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Auto-dolly: camera mulai jauh, jalan pelan ke depan selama DURATION.
// Ease-out cubic supaya gerakannya kerasa "berjalan" — cepat di awal,
// melambat saat dekat gerbang. Saat dolly selesai, panggil
// onDollyComplete supaya parent bisa pindah stage idle → active.
const DollyCamera = ({
  startZ = 18,
  endZ = 6,
  duration = DOLLY_DURATION,
  onDollyComplete,
}) => {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    camera.position.set(0, 1.6, startZ);
    camera.lookAt(0, 2, 0);
  }, [camera, startZ]);

  useFrame((_, delta) => {
    elapsedRef.current = Math.min(elapsedRef.current + delta, duration);
    const t = elapsedRef.current / duration;
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.z = startZ + (endZ - startZ) * eased;
    camera.position.y = 1.6;
    camera.lookAt(0, 2, 0);

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true;
      onDollyComplete?.();
    }
  });

  return null;
};

// Mutasi langsung uniform fog scene berdasarkan stage. Kalau pakai
// <fog attach=...> dengan args reactive, Three.js bikin instance baru
// tiap perubahan — boros. Mutasi `.far` di useFrame jauh lebih murah.
const FogTuner = ({ stage }) => {
  const { scene } = useThree();
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (stage !== 'transitioning') elapsedRef.current = 0;
  }, [stage]);

  useFrame((_, delta) => {
    if (!scene.fog) return;
    if (stage === 'transitioning') {
      elapsedRef.current += delta;
      const t = Math.min(elapsedRef.current / TRANSITION_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      scene.fog.far = 28 + eased * 32; // 28 → 60
    } else if (stage === 'idle' || stage === 'active') {
      scene.fog.far = 28;
    } else if (stage === 'done') {
      scene.fog.far = 60;
    }
  });

  return null;
};

// Tween postprocessing uniforms di useFrame langsung — tanpa re-render
// React. Saat stage='transitioning', interpolate saturation -1→0 dan
// vignette 0.7→0.3 dengan ease-out cubic. Panggil onComplete sekali
// saat tween selesai.
const TransitionEffects = ({ stage, onTransitionComplete }) => {
  const hueSatRef = useRef();
  const vignetteRef = useRef();
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (stage !== 'transitioning') {
      elapsedRef.current = 0;
      completedRef.current = false;
    }
  }, [stage]);

  useFrame((_, delta) => {
    if (!hueSatRef.current) return;

    if (stage === 'idle' || stage === 'active') {
      // Locked grayscale + vignette gelap
      hueSatRef.current.saturation = -1;
      if (vignetteRef.current) vignetteRef.current.darkness = 0.7;
    } else if (stage === 'transitioning') {
      elapsedRef.current += delta;
      const t = Math.min(elapsedRef.current / TRANSITION_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      hueSatRef.current.saturation = -1 + eased; // -1 → 0
      if (vignetteRef.current) {
        vignetteRef.current.darkness = 0.7 - eased * 0.4; // 0.7 → 0.3
      }
      if (t >= 1 && !completedRef.current) {
        completedRef.current = true;
        onTransitionComplete?.();
      }
    } else if (stage === 'done') {
      hueSatRef.current.saturation = 0;
      if (vignetteRef.current) vignetteRef.current.darkness = 0.3;
    }
  });

  return (
    <EffectComposer>
      <HueSaturation ref={hueSatRef} saturation={-1} />
      <Vignette
        ref={vignetteRef}
        eskil={false}
        offset={0.25}
        darkness={0.7}
      />
    </EffectComposer>
  );
};

const R0Scene = ({ stage, onDollyComplete }) => (
  <>
    <fog attach="fog" args={['#0a0a0c', 8, 28]} />
    <color attach="background" args={['#0a0a0c']} />
    <ambientLight intensity={0.18} />
    <spotLight
      position={[0, 12, 4]}
      intensity={1.4}
      angle={0.65}
      penumbra={0.6}
      distance={25}
      target-position={[0, 0, 0]}
    />
    <Ground />
    <Gate />
    <DustParticles />
    <DollyCamera onDollyComplete={onDollyComplete} />
    <FogTuner stage={stage} />
  </>
);

// Teks pembuka fade-in setelah delay singkat, lalu fade-out saat user
// trigger transisi (stage='transitioning' atau 'done'). Dipisah dari
// Canvas (di HTML overlay) supaya sharp di semua DPR + pakai font
// Fraunces yang udah self-hosted.
const OpeningText = ({ stage }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const shouldShow =
    visible && (stage === 'idle' || stage === 'active');
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-[2000ms] ease-out ${
        shouldShow ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center max-w-md px-6 -mt-24">
        <p
          className="text-white/75 text-lg md:text-2xl leading-relaxed tracking-wide"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          Sebelum kebaikan, dunia hanya bayangan.
        </p>
      </div>
    </div>
  );
};

// Hint "tap untuk masuk" dengan pulse subtle. Muncul setelah dolly
// selesai, hilang saat user click.
const TapHint = ({ visible }) => (
  <div
    className={`pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 transition-opacity duration-1000 ${
      visible ? 'opacity-80' : 'opacity-0'
    }`}
  >
    <div className="flex flex-col items-center gap-3 animate-pulse">
      <div className="text-white/70 text-sm tracking-[0.3em] uppercase">
        Tap untuk melangkah masuk
      </div>
      <div className="w-px h-8 bg-white/40" />
    </div>
  </div>
);

// Overlay akhir setelah transisi selesai. Untuk Fase 1 (denah belum
// dibangun), opsi yang ditampilkan: ulangi R0, atau kembali ke beranda.
// Setelah Fase 2 jadi, ganti jadi auto-navigate ke /museum/denah.
const ExitOverlay = ({ visible, onRestart }) => (
  <div
    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1500 ${
      visible
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none'
    }`}
  >
    <div className="text-center max-w-md px-6 backdrop-blur-sm bg-black/30 rounded-2xl py-10 px-8 border border-white/10">
      <p
        className="text-white text-xl md:text-2xl leading-relaxed mb-2"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Warna telah kembali.
      </p>
      <p className="text-white/60 text-sm leading-relaxed mb-8">
        Kamu telah melewati pintu masuk Museum Kebaikan.
        <br />
        Ruangan-ruangan berikutnya sedang dibangun.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onRestart}
          className="px-5 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
        >
          Ulangi R0
        </button>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-full bg-white text-black text-sm hover:bg-white/90 transition"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  </div>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat ruang museum...
  </div>
);

const MuseumPage = () => {
  // Stage state machine — drives transition + UI overlays. Lihat header
  // file untuk semantik tiap stage.
  const [stage, setStage] = useState('idle');
  // Force re-mount Canvas saat restart supaya dolly elapsed reset bersih
  const [resetKey, setResetKey] = useState(0);

  const handleDollyComplete = () => {
    setStage((s) => (s === 'idle' ? 'active' : s));
  };

  const handleClick = () => {
    if (stage === 'active') setStage('transitioning');
  };

  const handleTransitionComplete = () => {
    setStage((s) => (s === 'transitioning' ? 'done' : s));
  };

  const handleRestart = () => {
    setStage('idle');
    setResetKey((k) => k + 1);
  };

  return (
    <>
      <Seo
        title="Museum Kebaikan"
        description="Pengalaman museum digital — perjalanan kebaikan, kenangan, dan harapan."
        path="/museum"
      />
      <div
        className="relative w-full h-screen bg-black overflow-hidden cursor-pointer select-none"
        onClick={handleClick}
        role="button"
        tabIndex={0}
      >
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            key={resetKey}
            camera={{ fov: 55, position: [0, 1.6, 18] }}
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            shadows={false}
          >
            <R0Scene stage={stage} onDollyComplete={handleDollyComplete} />
            <TransitionEffects
              stage={stage}
              onTransitionComplete={handleTransitionComplete}
            />
            <Stats />
          </Canvas>
        </Suspense>

        <OpeningText stage={stage} />
        <TapHint visible={stage === 'active'} />
        <ExitOverlay visible={stage === 'done'} onRestart={handleRestart} />

        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-[10px] uppercase tracking-[0.2em]">
          Fase 1 · R0 — World Without Kindness · stage: {stage}
        </div>
      </div>
    </>
  );
};

export default MuseumPage;
