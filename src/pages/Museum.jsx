/**
 * Museum Kebaikan — Fase 1, R0 "World Without Kindness".
 *
 * State machine ruangan ini ada 4 stage:
 *   idle         — kamera dolly maju, teks pembuka fade-in, dunia
 *                  grayscale total, belum bisa di-click
 *   active       — dolly selesai; "tap untuk masuk" muncul; click di
 *                  mana saja akan mulai transisi
 *   transitioning — tween 3 detik: saturation -1 → 0, vignette 0.7 →
 *                  0.3, fog far 28 → 60. Teks pembuka fade-out.
 *   done         — overlay "warna telah kembali" + tombol lanjut. Karena
 *                  denah museum (Fase 2) belum dibangun, tombolnya untuk
 *                  sekarang restart R0 atau kembali ke /. Setelah Fase
 *                  2 jadi, ganti jadi navigate ke /museum/denah.
 *
 * Catatan teknis: postprocessing pakai controlled props (saturation,
 * darkness sebagai prop biasa), BUKAN ref-based mutation. @react-three/
 * postprocessing v3 forward ref ke Effect instance yang punya circular
 * reference ke EffectComposer parent — ngakibatin crash circular JSON
 * saat Vite HMR / DevTools coba serialize. Tween-nya dijalanin di
 * parent component pakai requestAnimationFrame + setState. Overhead
 * 60 re-render/detik selama 3 detik = bounded, nggak bermasalah.
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
//
// resetTrigger: saat parent set ulang ke nilai baru, useEffect reset
// elapsed counter — supaya restart dari "Ulangi R0" mulai dolly dari
// awal lagi tanpa harus remount Canvas.
const DollyCamera = ({
  startZ = 18,
  endZ = 6,
  duration = DOLLY_DURATION,
  resetTrigger = 0,
  onDollyComplete,
}) => {
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    elapsedRef.current = 0;
    completedRef.current = false;
    camera.position.set(0, 1.6, startZ);
    camera.lookAt(0, 2, 0);
  }, [resetTrigger, camera, startZ]);

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

// Mutasi langsung scene.fog.far berdasarkan target nilai dari parent.
// Pakai useFrame supaya konsisten dengan render loop, dan nggak perlu
// recreate fog instance setiap perubahan (yang akan terjadi kalau
// kita pakai args reactive di <fog attach="fog" args={[...]} />).
const FogTuner = ({ targetFar }) => {
  const { scene } = useThree();
  useFrame(() => {
    if (scene.fog) scene.fog.far = targetFar;
  });
  return null;
};

const R0Scene = ({ fogFar, resetTrigger, onDollyComplete }) => (
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
    />
    <Ground />
    <Gate />
    <DustParticles />
    <DollyCamera
      resetTrigger={resetTrigger}
      onDollyComplete={onDollyComplete}
    />
    <FogTuner targetFar={fogFar} />
  </>
);

// Teks pembuka fade-in setelah delay singkat, lalu fade-out saat user
// trigger transisi (stage='transitioning' atau 'done'). Dipisah dari
// Canvas (di HTML overlay) supaya sharp di semua DPR + pakai font
// Fraunces yang udah self-hosted.
const OpeningText = ({ stage, resetTrigger }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [resetTrigger]);
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
    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[1500ms] ${
      visible
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none'
    }`}
  >
    <div className="text-center max-w-md px-6 backdrop-blur-sm bg-black/30 rounded-2xl py-10 border border-white/10">
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
        Pintu masuk Museum Kebaikan telah terbuka.
        <br />
        Pilih ruangan untuk dijelajahi.
      </p>
      <div className="flex flex-col gap-3 justify-center px-6">
        <Link
          to="/museum/denah"
          className="px-5 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition"
        >
          Masuk Denah Museum →
        </Link>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onRestart}
            className="px-4 py-2 rounded-full border border-white/30 text-white/70 text-xs hover:bg-white/10 transition"
          >
            Ulangi R0
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-full border border-white/30 text-white/70 text-xs hover:bg-white/10 transition"
          >
            Kembali ke beranda
          </Link>
        </div>
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
  // Counter yang naik tiap restart — komponen anak yang perlu reset
  // local state-nya (DollyCamera, OpeningText) listen ke ini.
  const [resetTrigger, setResetTrigger] = useState(0);

  // Postprocessing values driven dari state — di-tween via rAF di
  // useEffect saat stage='transitioning'. Bukan ref mutation karena
  // postprocessing v3 ref-forward bikin circular JSON crash di HMR.
  const [saturation, setSaturation] = useState(-1);
  const [vignette, setVignette] = useState(0.7);
  const [fogFar, setFogFar] = useState(28);

  // Tween postprocessing values berdasar stage. Reset instan untuk idle/
  // active, animate selama TRANSITION_DURATION untuk transitioning,
  // hold di nilai akhir untuk done.
  useEffect(() => {
    if (stage === 'idle' || stage === 'active') {
      setSaturation(-1);
      setVignette(0.7);
      setFogFar(28);
      return undefined;
    }
    if (stage === 'done') {
      setSaturation(0);
      setVignette(0.3);
      setFogFar(60);
      return undefined;
    }
    if (stage !== 'transitioning') return undefined;

    let raf;
    let start;
    const tick = (now) => {
      if (start === undefined) start = now;
      const elapsed = (now - start) / 1000;
      const t = Math.min(elapsed / TRANSITION_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setSaturation(-1 + eased);
      setVignette(0.7 - eased * 0.4);
      setFogFar(28 + eased * 32);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setStage('done');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const handleDollyComplete = () => {
    setStage((s) => (s === 'idle' ? 'active' : s));
  };

  const handleClick = () => {
    if (stage === 'active') setStage('transitioning');
  };

  const handleRestart = () => {
    setStage('idle');
    setResetTrigger((c) => c + 1);
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
            camera={{ fov: 55, position: [0, 1.6, 18] }}
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            shadows={false}
          >
            <R0Scene
              fogFar={fogFar}
              resetTrigger={resetTrigger}
              onDollyComplete={handleDollyComplete}
            />
            <EffectComposer>
              <HueSaturation saturation={saturation} />
              <Vignette eskil={false} offset={0.25} darkness={vignette} />
            </EffectComposer>
            <Stats />
          </Canvas>
        </Suspense>

        <OpeningText stage={stage} resetTrigger={resetTrigger} />
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
