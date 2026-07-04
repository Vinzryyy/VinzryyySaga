/**
 * ArmeniacaTown — Petak R4: Menara Jam (page shell).
 *
 * Outdoor 3D scene dgn TWIN yagura (Japanese castle watchtower) + Honden
 * (shrine main hall) di tengah. Tema match peta yang Japanese garden
 * (tsukubai, jizo, torii, koi, omikuji, bamboo). Tiap yagura: ishigaki
 * sloped masonry base → wood+plaster shikkui shaft → mid eaves irimoya
 * roof → clock chamber (2 shoji dial stacked front+back: Countdown
 * Seitansai atas, Orloj calendar wheel bawah) + kōshi-mado lattice
 * window (sisi) → top irimoya roof → sōrin finial (9 rings + hōju jewel).
 * Honden: wooden raised hall di stone base, kara-hafu cusped gable
 * doorway, kōshi lattice walls, curved irimoya roof + chigi forked
 * finials + katsuogi cylindrical ridge logs. Bonshō bell, shumoku
 * striker rod (replaces gothic bell + pendulum). Spec di memory note
 * project_armeniacaTown_r4_menarajam.md.
 *
 * Halaman ini sengaja tipis — orchestrator aja. Logic + 3D + HTML
 * overlays di-split ke src/components/taman/r4/:
 *
 *   - constants.js   — TOWER (yagura) + HALL (honden) dimensi
 *   - utils.js       — hooks + helpers (WIB time, schedule fetch,
 *                      almanak derivation, bell audio, anniversary match)
 *   - ClockTower.jsx — yagura: ishigaki base, shaft, mid eaves, clock
 *                      chamber w/ CountdownDial + OrlojCalendarDial
 *                      (front+back) + KoshiMado lattice (sisi), top
 *                      irimoya roof, sōrin finial, bonshō bell, shumoku.
 *                      + AnniversaryGlow.
 *   - Buildings.jsx  — Honden (shrine hall) + TwinTowerComplex composite
 *   - Environment.jsx — SkyBackdrop, SceneLights, Plaza karesansui
 *   - Overlays.jsx   — Header (w/ BellToggle), TimePill, AlmanakCard,
 *                      CountdownChip
 *
 * State: prop `restored` dari TamanR4RouteChooser di App.jsx.
 *   locked (count < 3000) ditangani di chooser (redirect ke peta).
 *   drought (3000-4999) → muted dial palette, no bell, no almanak panel
 *   restored (≥ 5000)   → full glow + bell + almanak + anniversary glow
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
import TownPageFade from '../components/taman/TownPageFade';
import PetakQuickNav from '../components/taman/PetakQuickNav';
import MenaraJamMusic from '../components/taman/r4/MenaraJamMusic';
import { useIsMobile } from '../components/taman/r4/utils';
import {
  SkyBackdrop,
  SceneLights,
  Plaza,
} from '../components/taman/r4/Environment';
import { TwinTowerComplex } from '../components/taman/r4/Buildings';
import { R4LifeElements } from '../components/taman/r4/LifeElements';
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
    <TwinTowerComplex restored={restored} />
    <R4LifeElements restored={restored} isMobile={isMobile} />
    {/* Camera + controls — twin tower + balai composition lebih lebar
        di X. Target Y di mid-dial menara (~6.8). minDistance dinaikin
        biar full composition kebingkai, bukan cuma satu menara. */}
    <OrbitControls
      target={[0, 6.0, 0]}
      enablePan={false}
      enableZoom
      minDistance={9}
      maxDistance={isMobile ? 24 : 20}
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
        description="Menara Jam ArmeniacaTown — twin yagura (Japanese castle watchtower) + Honden shrine hall. Countdown Seitansai Eli + kalender hari-hari penting di shoji dial."
        path="/armeniacaTown/r4"
      />
      <RotateRecommendation />
      <TownPageFade />
      <MenaraJamMusic />
      <div className="relative w-full h-[100dvh] bg-[#1a1018] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 44, position: [7, 4.5, 13] }}
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
        <PetakQuickNav currentId="r4" />
      </div>
    </>
  );
};

export default TamanMenaraJamPage;
