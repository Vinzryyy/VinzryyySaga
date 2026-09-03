/**
 * HarmoniKebaikan — recap page for the Harmoni Kebaikan event at CGV FX.
 *
 * Accessible only via CTA from /happy-helisma-day-26 (no navbar link).
 * Documents the physical Galeri Kebaikan display on 15 Juni 2026.
 *
 * On first visit per session, plays HarmoniKebaikanIntro (cinematic
 * 4-phase GSAP sequence). sessionStorage key prevents replay on
 * back-navigation within the same session.
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import FloatingPetals from '../components/countdown/FloatingPetals';
import KebaikanArchive from '../components/galeri/KebaikanArchive';
import HarmoniKebaikanIntro from '../components/harmoni/HarmoniKebaikanIntro';

const SESSION_KEY = 'harmoni-kebaikan-intro-seen';

const HarmoniKebaikan = () => {
  const [introPlayed, setIntroPlayed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  );

  const handleIntroComplete = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setIntroPlayed(true);
  };

  return (
    <main className="relative min-h-screen bg-[color:var(--retro-bg-primary)] overflow-x-hidden">
      <Helmet>
        <title>Rekap Harmoni Kebaikan · Armeniaca</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {!introPlayed && (
        <HarmoniKebaikanIntro onComplete={handleIntroComplete} />
      )}

      <FloatingPetals />

      <div className="pt-24 sm:pt-28">
        <KebaikanArchive />
      </div>

      <div className="pb-12 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-text-muted)]">
          Armeniaca · Helismiley × Armeniaca · 2026
        </p>
      </div>
    </main>
  );
};

export default HarmoniKebaikan;
