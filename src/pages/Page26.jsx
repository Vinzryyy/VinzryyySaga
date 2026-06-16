/**
 * Page26 — "#26" / Pohon Kebaikan landing page.
 *
 * Centerpiece of the birthday community-driven project: visitors
 * collectively water "Pohon untuk Eli" (one support per device per
 * day). Once 100 supports accumulate the tree advances a stage,
 * topping out at fruiting after 600+. Live counter via RTDB.
 *
 * Page-only feature for now (not embedded on Home) so the gimmick
 * has its own dedicated context — visitors arrive intentionally.
 */

import React, { useState } from 'react';
import Seo from '../components/Seo';
import EliTree from '../components/home/EliTree';
import FloatingPetals from '../components/countdown/FloatingPetals';
import FilosofiModal from '../components/page26/FilosofiModal';

const Page26 = () => {
  const [filosofiOpen, setFilosofiOpen] = useState(false);

  return (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
    <Seo
      path="/26"
      title="#26 — Pohon Kebaikan"
      description="Project ulang tahun ke-26 Eli JKT48. Tekan tombol untuk memberi 1 dukungan; setiap 100 dukungan, pohon untuk Eli tumbuh ke tahap berikutnya."
    />

    {/* Soft drift petals — reuse the same component as Wishes/Countdown
        so the gimmick reads as a celebration page. Honors
        prefers-reduced-motion. */}
    <FloatingPetals />

    {/* Editorial header — full-bleed photo + brown-dark gradient
        overlay, matching the treatment on /schedule, /profile,
        /about, and /wishes. */}
    <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/archive/img-211.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: '50% 25%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(61, 52, 43, 0.92) 0%, rgba(61, 52, 43, 0.85) 40%, rgba(252, 244, 230, 0.95) 75%, var(--retro-bg-primary) 100%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-5 text-[color:var(--retro-burgundy-light)] flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] inline-flex items-center gap-2">
            <i className="ri-plant-line text-base" />
            Harmoni Kebaikan · Pohon Kebaikan
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-burgundy-light)]/50 max-w-[120px]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/65">
            Ulang Tahun ke-26 · 15 Juni 2026
          </span>
        </div>
        <h1 className="font-header text-[2.4rem] sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.9] max-w-4xl drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
          <span className="text-[color:var(--retro-burgundy-light)]">#</span>
          26
        </h1>
        <p className="mt-5 sm:mt-6 font-header italic text-base sm:text-lg md:text-xl text-[color:var(--retro-cream)]/85 leading-relaxed max-w-2xl">
          Pohon ini tidak akan tumbuh sendirian.
        </p>
        <p className="mt-4 text-sm sm:text-base md:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
          Setiap satu dukungan adalah satu siraman; setiap 100 siraman, pohon
          untuk Eli naik ke tahap berikutnya — dari bibit, tunas, pohon muda,
          dewasa, berbunga, hingga berbuah aprikot. Mari kumpulkan tangan-tangan
          Helismiley sebanyak mungkin — pohon ini tetap tumbuh meski harinya sudah berlalu.
        </p>
        <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
      </div>
    </header>

    {/* The gimmick itself — tree art + counter + support button. */}
    <EliTree />

    {/* Closing note — frames Pohon Kebaikan as Harmoni Kebaikan's first
        module. */}
    <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-20 md:pb-28">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
          Tentang Pohon Kebaikan
        </p>
        <p className="font-header italic text-lg md:text-xl text-[color:var(--retro-text-primary)] leading-relaxed mb-4">
          Armeniaca berarti aprikot — pohon yang mekar pelan, lalu sekaligus.
        </p>
        <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed">
          Pohon di atas adalah modul pertama dari Harmoni Kebaikan untuk
          ulang tahun ke-26 Eli. Modul-modul lain kini sudah hadir — dan
          pohon ini tetap bisa disirami kapan saja.
        </p>

        {/* Peta Filosofi CTA — opens FilosofiModal which embeds the
            standalone parchment poster (public/filosofi-pohon-kebaikan.html)
            via iframe so the HTML stays the single source of truth and
            the modal experience keeps the user inside /26 (no tab
            switch, no context loss). */}
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setFilosofiOpen(true)}
            className="group inline-flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 border-2 border-[color:var(--retro-burgundy)] bg-[color:var(--retro-cream)]/30 text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] transition-all duration-300"
          >
            <i className="ri-map-2-line text-lg sm:text-xl" aria-hidden="true" />
            <span className="font-header text-[11px] sm:text-xs font-black uppercase tracking-[0.32em]">
              Buka Peta Filosofi
            </span>
            <i className="ri-arrow-right-up-line text-sm sm:text-base opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 text-[11px] text-[color:var(--color-text-secondary)]/70 italic">
          Sepuluh singgah dari Bibit menjadi Ekosistem
        </p>
      </div>
    </section>

    <FilosofiModal isOpen={filosofiOpen} onClose={() => setFilosofiOpen(false)} />
  </main>
  );
};

export default Page26;
