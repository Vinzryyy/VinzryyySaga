/**
 * HarmoniKebaikan — recap page for the Harmoni Kebaikan event at CGV FX.
 *
 * Accessible only via CTA from /happy-helisma-day-26 (no navbar link).
 * Documents the physical Galeri Kebaikan display on 15 Juni 2026.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import FloatingPetals from '../components/countdown/FloatingPetals';
import KebaikanArchive from '../components/galeri/KebaikanArchive';
import HarmoniFlipbook from '../components/harmoni/HarmoniFlipbook';

const HarmoniKebaikan = () => (
  <main className="relative min-h-screen bg-[color:var(--retro-bg-primary)] overflow-x-hidden">
    <Helmet>
      <title>Rekap Harmoni Kebaikan · Armeniaca</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>

    <FloatingPetals />

    <div className="pt-24 sm:pt-28">
      <KebaikanArchive />
    </div>

    <div className="px-4 pb-8">
      <HarmoniFlipbook />
    </div>

    <div className="pb-12 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
        Armeniaca · Helismiley × Armeniaca · 2026
      </p>
    </div>
  </main>
);

export default HarmoniKebaikan;
