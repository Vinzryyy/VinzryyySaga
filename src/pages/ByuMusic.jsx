/**
 * ByuMusic — page dedicated utk lagu "By-U" oleh Putri Helisma (Eli).
 *
 * Standalone page (bukan section di /26, bukan sub-tab). Diakses via
 * /byu-music dan via dropdown navbar Harmoni Kebaikan. Pre-release
 * fase: kumpulkan dukungan dgn tombol "Saya menunggu" — counter
 * Firebase realtime. Rilis di 15 Juni 2026 00:00 WIB → auto-reveal
 * player <audio>.
 *
 * Editorial framing match pattern /26 dan /galeri-kebaikan: full-bleed
 * photo header dgn gradient brown-dark overlay, lalu content section
 * (ByuTitipan component) dgn card backdrop. Closing dgn tombol kembali
 * ke beranda.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import FloatingPetals from '../components/countdown/FloatingPetals';
import ByuTitipan from '../components/titipan/ByuTitipan';

const ByuMusic = () => (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
    <Seo
      path="/byu-music"
      title="By-U Music"
      description="Lagu By-U untuk Putri Helisma — dirilis 15 Juni 2026 sebagai bagian dari Harmoni Kebaikan. Dengarkan sekarang."
    />

    <FloatingPetals />

    <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/archive/img-090.webp)',
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
            <i className="ri-music-2-line text-base" aria-hidden="true" />
            Harmoni Kebaikan · By-U Music
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-burgundy-light)]/50 max-w-[120px]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/65">
            Rilis · 15 Juni 2026
          </span>
        </div>
        <h1 className="font-header text-[2.4rem] sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.9] max-w-4xl drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
          <span className="italic font-normal">By-U</span>
          <span className="text-[color:var(--retro-burgundy-light)]"> Music.</span>
        </h1>
        <p className="mt-5 sm:mt-6 font-header italic text-base sm:text-lg md:text-xl text-[color:var(--retro-cream)]/85 leading-relaxed max-w-2xl">
          Sebuah lagu yang telah terbuka.
        </p>
        <p className="mt-4 text-sm sm:text-base md:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
          Dirilis pada{' '}
          <span className="font-bold text-[color:var(--retro-burgundy)]">15 Juni 2026</span>{' '}
          — bertepatan dengan ulang tahun ke-26 Eli. Lagu ini adalah hadiah kolektif
          dari komunitas yang menunggu bersama hingga hari itu tiba.
        </p>
        <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
      </div>
    </header>

    <ByuTitipan />

    <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-20 md:pb-28">
      <div className="max-w-3xl mx-auto text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 border-2 border-[color:var(--retro-burgundy)] bg-transparent text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] transition-all duration-300 group"
        >
          <i className="ri-arrow-left-line text-base group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          <span className="font-header text-[11px] sm:text-xs font-black uppercase tracking-[0.32em]">
            Kembali ke beranda
          </span>
        </Link>

        <div className="mt-10 pt-6 border-t border-[color:var(--retro-brown-dark)]/10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
            A project by Armeniaca × BY-U Music
          </p>
        </div>
      </div>
    </section>
  </main>
);

export default ByuMusic;
