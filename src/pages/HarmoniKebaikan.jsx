/**
 * HarmoniKebaikan — recap page for the Harmoni Kebaikan event at CGV FX.
 *
 * Accessible only via CTA from /happy-helisma-day-26 (no navbar link).
 * Documents the physical Galeri Kebaikan display on 15 Juni 2026.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import FloatingPetals from '../components/countdown/FloatingPetals';
import KebaikanArchive from '../components/galeri/KebaikanArchive';

const HarmoniKebaikan = () => (
  <main className="relative min-h-screen bg-[color:var(--retro-bg-primary)] overflow-x-hidden">
    <Helmet>
      <title>Rekap Harmoni Kebaikan · Armeniaca</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>

    <FloatingPetals />

    {/* Header */}
    <header className="relative pt-24 sm:pt-28 pb-10 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(61,52,43,0.96) 0%, rgba(61,52,43,0.85) 50%, transparent 100%)',
        }}
      />
      <div className="relative max-w-4xl mx-auto">
        <Link
          to="/happy-helisma-day-26"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--retro-cream)]/55 hover:text-[color:var(--retro-gold-light)] transition-colors mb-6"
        >
          <i className="ri-arrow-left-line text-sm" />
          Kembali ke Rekap Seitansai
        </Link>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] inline-flex items-center gap-2">
            <i className="ri-hand-heart-line text-sm" />
            Harmoni Kebaikan
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-gold-light)]/30 max-w-[100px]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/45">
            Helismiley × Armeniaca
          </span>
        </div>

        <h1 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.95]">
          Rekap <span className="text-[color:var(--retro-gold-light)]">Event.</span>
        </h1>
        <p className="mt-3 text-sm text-[color:var(--retro-cream)]/65 leading-relaxed max-w-lg">
          Dokumentasi Galeri Kebaikan yang ditampilkan di CGV FX Sudirman F7
          pada hari seitansai ke-26 Helisma Putri — 15 Juni 2026.
        </p>
      </div>
    </header>

    <KebaikanArchive />

    <div className="pb-12 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
        Armeniaca · Helismiley × Armeniaca · 2026
      </p>
    </div>
  </main>
);

export default HarmoniKebaikan;
