/**
 * Museum Kebaikan — Fase 0 baseline.
 *
 * Tujuan halaman ini sekarang: validasi stack Three.js + R3F jalan di
 * desktop & mobile dengan FPS stabil sebelum kita bangun ruangan-ruangan
 * museum. Belum ada konten naratif — cuma 1 cube test, lighting dasar,
 * OrbitControls untuk verifikasi interaksi, dan Stats overlay (drei)
 * untuk monitor FPS real-time.
 *
 * Yang harus divalidasi sebelum lanjut Fase 1 (R0 World Without Kindness):
 *  - Canvas render 60fps stabil di desktop
 *  - Mobile (Android & iOS) bisa tampilkan cube tanpa crash
 *  - OrbitControls smooth (drag rotate, scroll zoom)
 *  - Bundle museum chunk wajar (<300KB gzipped untuk fase ini)
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import Seo from '../components/Seo';

const TestCube = () => (
  <mesh rotation={[0.4, 0.2, 0]}>
    <boxGeometry args={[1.5, 1.5, 1.5]} />
    <meshStandardMaterial color="#e8a87c" roughness={0.5} metalness={0.1} />
  </mesh>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-black/80 text-white/60 text-sm">
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
      <div className="relative w-full h-screen bg-[#0b0a0d] overflow-hidden">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ position: [3, 2, 4], fov: 50 }}
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={1.0} />
            <TestCube />
            <gridHelper args={[10, 10, '#444', '#222']} />
            <OrbitControls enableDamping dampingFactor={0.08} />
            <Stats />
          </Canvas>
        </Suspense>

        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-wide uppercase">
          Fase 0 — Foundation Test · Drag untuk rotate · Scroll untuk zoom
        </div>
      </div>
    </>
  );
};

export default MuseumPage;
