/**
 * Museum Kebaikan — Fase 1, R0 "World Without Kindness".
 *
 * Ruangan pintu masuk museum. Dunia di sini terasa kosong: fog tebal,
 * lighting redup, partikel debu drift pelan, dan satu gerbang gelap di
 * kejauhan. Kamera auto-dolly maju perlahan selama ~12 detik supaya
 * pengunjung "berjalan" mendekati gerbang tanpa kontrol manual — itu
 * menjaga ritme naratif (kalau dikasih OrbitControls, user akan ngerusak
 * mood dengan rotate-rotate).
 *
 * Postprocessing: HueSaturation di-set ke -1 (grayscale total) + vignette
 * gelap. Round 1B nanti tambahin click handler untuk tween saturation
 * -1 → 0 (transisi "kebaikan kembalikan warna ke dunia") dan exit ke
 * denah museum.
 *
 * Performance budget: target 60fps desktop, 30fps+ mobile. Kalau drop,
 * kandidat downgrade: kurangi DustParticles count, matiin antialias,
 * dpr cap ke 1 di mobile.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import {
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing';
import Seo from '../components/Seo';

// Gerbang taman di kejauhan — 2 pilar + balok atas. Sengaja minimalist
// supaya jadi siluet, bukan struktur detail. Detail muncul di R6 (taman
// akhir) saat warna kembali.
const Gate = () => (
  <group position={[0, 0, 0]}>
    <mesh position={[-2.2, 2, 0]} castShadow>
      <boxGeometry args={[0.4, 4, 0.4]} />
      <meshStandardMaterial color="#15151a" roughness={0.9} />
    </mesh>
    <mesh position={[2.2, 2, 0]} castShadow>
      <boxGeometry args={[0.4, 4, 0.4]} />
      <meshStandardMaterial color="#15151a" roughness={0.9} />
    </mesh>
    <mesh position={[0, 4.2, 0]} castShadow>
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
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
// melambat saat dekat gerbang. Tinggi kamera 1.6m (eye level).
const DollyCamera = ({ startZ = 18, endZ = 6, duration = 12 }) => {
  const { camera } = useThree();
  const elapsedRef = useRef(0);

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
  });

  return null;
};

// Grayscale + vignette = mood "dunia tanpa kebaikan". Round 1B akan
// expose saturation sebagai prop yang di-tween dari -1 ke 0 saat user
// click. Vignette tetap di-set tinggi untuk fokus kamera ke tengah.
const R0Effects = () => (
  <EffectComposer>
    <HueSaturation saturation={-1.0} />
    <Vignette eskil={false} offset={0.25} darkness={0.7} />
  </EffectComposer>
);

const R0Scene = () => (
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
    <DollyCamera />
  </>
);

// Teks pembuka fade-in setelah delay singkat. Dipisah dari Canvas (di
// HTML overlay) supaya sharp di semua DPR + pakai font Fraunces yang
// udah self-hosted.
const OpeningText = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-[3000ms] ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center max-w-md px-6 -mt-24">
        <p
          className="text-white/75 text-lg md:text-2xl leading-relaxed tracking-wide"
          style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
        >
          Sebelum kebaikan, dunia hanya bayangan.
        </p>
      </div>
    </div>
  );
};

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black text-white/50 text-sm">
    Memuat ruang museum...
  </div>
);

const MuseumPage = () => {
  return (
    <>
      <Seo
        title="Museum Kebaikan"
        description="Pengalaman museum digital — perjalanan kebaikan, kenangan, dan harapan."
        path="/museum"
      />
      <div className="relative w-full h-screen bg-black overflow-hidden">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 55, position: [0, 1.6, 18] }}
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            shadows={false}
          >
            <R0Scene />
            <R0Effects />
            <Stats />
          </Canvas>
        </Suspense>

        <OpeningText />

        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/35 text-[10px] uppercase tracking-[0.2em]">
          Fase 1 · R0 — World Without Kindness
        </div>
      </div>
    </>
  );
};

export default MuseumPage;
