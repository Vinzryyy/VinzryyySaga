/**
 * Titipan — page khusus utk lagu "By-U" oleh Putri Helisma (Eli).
 *
 * Bagian dari umbrella Harmoni Kebaikan, tapi page sendiri (bukan
 * section di /26). Pre-release fase: kumpulkan dukungan dgn tombol
 * "Saya menunggu" — counter Firebase realtime. Rilis di 15 Juni 2026
 * 00:00 WIB → auto-reveal player <audio>.
 *
 * Editorial framing match pattern /galeri-kebaikan dan /26: full-bleed
 * photo header dgn gradient brown-dark overlay, lalu content section
 * (ByuTitipan component) dgn card backdrop.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import FloatingPetals from '../components/countdown/FloatingPetals';
import ByuTitipan from '../components/titipan/ByuTitipan';

const Titipan = () => (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
    <Seo
      path="/titipan"
      title="Titipan — By-U · Putri Helisma"
      description="Titipan lagu By-U oleh Putri Helisma. Lagu ini masih tersegel — akan dibuka 15 Juni 2026. Sampai saat itu, kita yang menjaganya. Bagian dari Harmoni Kebaikan."
    />

    <FloatingPetals />

    {/* Editorial header — full-bleed photo + brown-dark gradient
        overlay, consistent dgn /galeri-kebaikan, /26, /wishes, /profile,
        /schedule, /about. */}
    <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/archive/img-090.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: '50% 35%',
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
            <i className="ri-mail-line text-base" aria-hidden="true" />
            Harmoni Kebaikan · Titipan Lagu
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-burgundy-light)]/50 max-w-[120px]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/65">
            Rilis · 15 Juni 2026
          </span>
        </div>
        <h1 className="font-header text-[2.4rem] sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.9] max-w-4xl drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
          <span className="italic font-normal">By-U</span>
          <span className="text-[color:var(--retro-burgundy-light)]">.</span>
        </h1>
        <p className="mt-5 sm:mt-6 font-header italic text-base sm:text-lg md:text-xl text-[color:var(--retro-cream)]/85 leading-relaxed max-w-2xl">
          Putri Helisma — lagu titipan yang menunggu dibuka.
        </p>
        <p className="mt-4 text-sm sm:text-base md:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
          Lagu ini masih tersegel. Akan dibuka pada{' '}
          <span className="font-bold text-[color:var(--retro-burgundy)]">15 Juni 2026</span>{' '}
          — bertepatan dgn ulang tahun ke-26 Eli. Sampai saat itu, kita yang
          menjaganya: tiap klik "Saya menunggu" jadi satu doa untuk hari rilis.
        </p>
        <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
      </div>
    </header>

    {/* The titipan itself — card dgn state machine pre-release / released. */}
    <ByuTitipan />

    {/* Closing — back to /26 hub */}
    <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-20 md:pb-28">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/26"
          className="group block rounded-[2rem] bg-white border border-[color:var(--retro-brown-dark)]/10 p-8 md:p-10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-1 transition-all"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
            <i className="ri-plant-line text-base" aria-hidden="true" />
            Kembali ke Harmoni Kebaikan
          </p>
          <h3 className="font-header text-2xl md:text-3xl font-black tracking-tighter leading-tight text-[color:var(--retro-text-primary)] mb-3">
            Pohon untuk Eli <br />
            <span className="text-[color:var(--retro-burgundy)]">tumbuh dari dukungan.</span>
          </h3>
          <p className="text-sm md:text-base text-[color:var(--retro-text-secondary)] leading-relaxed">
            Modul pertama dari Harmoni Kebaikan — kumpulkan tangan-tangan
            menjelang 15 Juni 2026.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] group-hover:gap-3 transition-all">
            Buka Pohon Eli <i className="ri-arrow-right-line text-base" aria-hidden="true" />
          </span>
        </Link>

        <div className="mt-10 pt-6 border-t border-[color:var(--retro-brown-dark)]/10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
            A project by Helismiley × Armeniaca
          </p>
        </div>
      </div>
    </section>
  </main>
);

export default Titipan;
