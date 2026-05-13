/**
 * ArmeniacaTown — Petak R4: Menara Jam (page shell).
 *
 * Outdoor 3D scene dgn menara jam sebagai focal point. Big Ben
 * silhouette + Gothic Praha ornament (Orloj-inspired). Clock chamber
 * tinggi muat 2 dial stacked (front + back): countdown Seitansai di
 * atas, Orloj calendar wheel hari-hari penting Eli di bawah. Kiri/kanan
 * rosette window + lancet pair. Spec di memory note
 * project_armeniacaTown_r4_menarajam.md.
 *
 * Halaman ini sengaja tipis — orchestrator aja. Logic + 3D + HTML
 * overlays di-split ke src/components/taman/r4/:
 *
 *   - constants.js   — TOWER dimensi
 *   - utils.js       — hooks + helpers (WIB time, schedule fetch,
 *                      almanak derivation, bell audio, anniversary match)
 *   - ClockTower.jsx — 3D tower: base, shaft, gothic windows, clock
 *                      chamber w/ CountdownDial + OrlojCalendarDial
 *                      (front+back) + RosetteWindow + LancetPair
 *                      (kiri/kanan), pinnacles, spire, bell, pendulum.
 *                      + AnniversaryGlow.
 *   - Environment.jsx — SkyBackdrop, SceneLights, Plaza
 *   - Overlays.jsx   — Header (w/ BellToggle), TimePill, AlmanakCard,
 *                      CountdownChip
 *
 * State: prop `restored` dari TamanR4RouteChooser di App.jsx.
 *   locked (count < 3000) ditangani di chooser (redirect ke peta).
 *   drought (3000-4999) → hour-only hand, no bell, no almanak panel
 *   restored (≥ 5000)   → full clock + bell + almanak + easter eggs
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Seo from '../components/Seo';
import RotateRecommendation from '../components/ui/RotateRecommendation';
import { useIsMobile } from '../components/taman/r4/utils';
import {
  SkyBackdrop,
  SceneLights,
  Plaza,
} from '../components/taman/r4/Environment';
import {
  ClockTower,
  AnniversaryGlow,
} from '../components/taman/r4/ClockTower';
import {
  Header,
  TimePill,
  AlmanakCard,
  CountdownChip,
} from '../components/taman/r4/Overlays';

const Scene = ({ restored, isMobile }) => (
  <>
    <SkyBackdrop restored={restored} />
    <SceneLights restored={restored} />
    <Plaza restored={restored} />
    <ClockTower restored={restored} />
    <AnniversaryGlow restored={restored} />
    {/* Camera + controls — low angle lookup. Target Y di antara upper
        countdown dial (~7.5) dan lower calendar dial (~6.3) supaya
        kedua dial dalam frame. */}
    <OrbitControls
      target={[0, 6.8, 0]}
      enablePan={false}
      enableZoom
      minDistance={7}
      maxDistance={isMobile ? 20 : 16}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.05}
      enableDamping
    />
  </>
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
        description="Menara Jam ArmeniacaTown — Big Ben silhouette dgn ornamen gotik Praha. Countdown ke Seitansai Eli + kalender Orloj hari-hari penting."
        path="/armeniacaTown/r4"
      />
      <RotateRecommendation />
      <div className="relative w-full h-screen bg-[#1a1018] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 42, position: [5, 3.5, 10] }}
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
