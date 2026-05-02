/**
 * Page26 — "#26" / Galeri Kebaikan landing page.
 *
 * Centerpiece of the birthday community-driven project: visitors
 * collectively water "Pohon untuk Eli" (one support per device per
 * day). Once 100 supports accumulate the tree advances a stage,
 * topping out at fruiting after 600+. Live counter via RTDB.
 *
 * Page-only feature for now (not embedded on Home) so the gimmick
 * has its own dedicated context — visitors arrive intentionally.
 */

import React from 'react';
import Seo from '../components/Seo';
import EliTree from '../components/home/EliTree';
import FloatingPetals from '../components/countdown/FloatingPetals';

const Page26 = () => (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
    <Seo
      path="/26"
      title="#26 — Galeri Kebaikan"
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
          backgroundImage: 'url(/archive/x/x-F82qnMPaoAAZTip.jpg)',
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
            Harmoni Kebaikan · Galeri Kebaikan
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
          Helismiley sebanyak mungkin sebelum 15 Juni 2026 tiba.
        </p>
        <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
      </div>
    </header>

    {/* The gimmick itself — tree art + counter + support button. */}
    <EliTree />

    {/* Footer mini — frames Galeri Kebaikan as the first module of
        the wider Harmoni Kebaikan hub. More modules land here as
        15 Juni 2026 approaches. */}
    <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-20 md:pb-28">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
          Tentang Galeri Kebaikan
        </p>
        <p className="font-header italic text-lg md:text-xl text-[color:var(--retro-text-primary)] leading-relaxed mb-4">
          Armeniaca berarti aprikot — pohon yang mekar pelan, lalu sekaligus.
        </p>
        <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed">
          Galeri Kebaikan adalah ruang kecil tempat Helismiley merayakan Ceu Eli
          dengan cara serupa: aksi-aksi sederhana yang dikumpulkan jadi satu
          panggung kolektif. Pohon di atas adalah modul pertama dari Harmoni
          Kebaikan — modul lain akan menyusul satu per satu menjelang 15 Juni
          2026.
        </p>
      </div>
    </section>
  </main>
);

export default Page26;
