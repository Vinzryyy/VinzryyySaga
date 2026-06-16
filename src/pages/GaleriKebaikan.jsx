/**
 * GaleriKebaikan — dedicated page for the Harmoni Kebaikan archive.
 *
 * Hosts the editorial framing (bilingual concept copy, focus areas)
 * plus the curated KebaikanArchive component. The /26 page stays as
 * the interactive Pohon Eli hub and links here for the full archive.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import KebaikanArchive from '../components/galeri/KebaikanArchive';
import FloatingPetals from '../components/countdown/FloatingPetals';
import MotifBackdrop from '../components/about/MotifBackdrop';
import { KEBAIKAN_CATEGORIES } from '../data/galeriKebaikan';

const GaleriKebaikan = () => (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
    <Seo
      path="/galeri-kebaikan"
      title="Galeri Kebaikan — Harmoni Kebaikan"
      description="Arsip aksi kebaikan yang dilakukan atas nama Helisma Putri (Eli JKT48) untuk seitansai ke-26 pada 15 Juni 2026. Project Helismiley × Armeniaca."
    />

    <MotifBackdrop count={40} seed="galeri-kebaikan-2026" />
    <FloatingPetals />

    {/* Editorial header — full-bleed photo + brown-dark gradient,
        consistent with /wishes, /profile, /schedule, /about, /26. */}
    <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/archive/img-156.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: '50% 30%',
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
            <i className="ri-hand-heart-line text-base" />
            Harmoni Kebaikan
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-burgundy-light)]/50 max-w-[120px]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/65">
            Helismiley × Armeniaca · 15 Juni 2026
          </span>
        </div>
        <h1 className="font-header text-[2.2rem] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.95] max-w-4xl drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
          Galeri <br />
          <span className="text-[color:var(--retro-burgundy-light)]">Kebaikan.</span>
        </h1>
        <p className="mt-5 sm:mt-6 font-header italic text-base sm:text-lg md:text-xl text-[color:var(--retro-cream)]/85 leading-relaxed max-w-2xl">
          A gallery of kindness, in her name.
        </p>
        <p className="mt-4 text-sm sm:text-base md:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
          Ruang yang merefleksikan nilai kebaikan Helisma — menampilkan kontribusi nyata yang
          dilakukan atas namanya untuk ulang tahun ke-26. Tanpa disadari, kebaikan kecil yang
          ia bawa setiap hari menjadikannya pahlawan sehari-hari.
        </p>
        <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
      </div>
    </header>

    {/* Concept — bilingual ID + EN side-by-side. Mirrors the project
        document Helismiley shared. Pull quote breaks them up. */}
    <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-14 md:mb-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
              <i className="ri-flag-2-line text-base" /> Konsep · ID
            </p>
            <p className="text-sm md:text-base text-[color:var(--retro-text-primary)] leading-relaxed">
              Project ini terinspirasi dari Helisma yang secara konsisten selalu memilih untuk
              berbuat baik dalam kesehariannya, melalui hal-hal yang mungkin sederhana namun
              meninggalkan dampak yang berarti. Dalam banyak kesempatan, ia selalu mendorong kami
              fansnya untuk lebih peduli dan membantu sesama, baik melalui donasi maupun aksi
              nyata. Di tahun ini, alih-alih dirayakan seperti biasanya, ia menyampaikan
              keinginannya agar perayaan ulang tahunnya dapat dialihkan menjadi sesuatu yang
              lebih bermakna.
            </p>
            <p className="mt-4 text-sm md:text-base text-[color:var(--retro-text-primary)] leading-relaxed">
              Melalui konsep <span className="font-bold text-[color:var(--retro-burgundy)]">Galeri Kebaikan</span>,
              kami menghadirkan sebuah ruang yang merefleksikan nilai tersebut, dengan menampilkan
              berbagai kontribusi kebaikan yang dilakukan atas namanya. Melalui project ini, kami
              berharap setiap orang yang berkontribusi dapat menjadi bagian dari kebaikan tersebut,
              dan meneruskannya bersama.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
              <i className="ri-flag-line text-base" /> Concept · EN
            </p>
            <p className="text-sm md:text-base text-[color:var(--retro-text-secondary)] leading-relaxed italic">
              This project is inspired by how Helisma consistently chooses to do good in her daily
              life, through simple yet meaningful ways. She has always encouraged us to care more
              and help others, whether through donations or small acts that matter. This year,
              instead of a usual celebration, she wished for something more meaningful.
            </p>
            <p className="mt-4 text-sm md:text-base text-[color:var(--retro-text-secondary)] leading-relaxed italic">
              Through <span className="font-bold text-[color:var(--retro-burgundy)] not-italic">Gallery of Kindness</span>,
              we bring that intention to life by showcasing contributions made in her name.
              Reflecting the way she embodies an everyday hero, this project also invites everyone
              who takes part to be part of that same kindness and carry it forward together.
            </p>
          </div>
        </div>

        {/* Pull quote */}
        <blockquote className="mt-12 md:mt-16 max-w-4xl mx-auto text-center px-4">
          <i className="ri-double-quotes-l text-3xl text-[color:var(--retro-burgundy)]/30 inline-block mb-3" />
          <p className="font-header italic text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[color:var(--retro-text-primary)] leading-snug tracking-tight">
            Tanpa disadari, kebaikan yang ia lakukan selama ini menjadikannya{' '}
            <span className="text-[color:var(--retro-burgundy)]">sosok pahlawan sehari-hari.</span>
          </p>
        </blockquote>
      </div>
    </section>

    {/* 5 Fokus Area cards — visual breakdown of the donation focuses */}
    <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-14 md:mb-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
            <i className="ri-target-line text-base" /> Lima Fokus Donasi
          </p>
          <h2 className="font-header text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-3xl">
            Disalurkan ke <span className="text-[color:var(--retro-burgundy)]">lima area</span> yang
            mencerminkan nilai Eli.
          </h2>
        </div>
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {KEBAIKAN_CATEGORIES.map((cat) => (
            <li
              key={cat.id}
              className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-5 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 transition-all"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] mb-3">
                <i className={`${cat.icon} text-xl`} />
              </span>
              <h3 className="font-header text-base font-black tracking-tight text-[color:var(--retro-text-primary)] leading-tight mb-1">
                {cat.label}
              </h3>
              <p className="text-xs text-[color:var(--color-text-secondary)] leading-relaxed">
                {cat.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* The archive itself — reused from /26's earlier embed */}
    <KebaikanArchive />

    {/* Hari-H section — display fisik di CGV FX + CTA back to Pohon Eli */}
    <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-20 md:pb-28">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Display fisik */}
          <div className="rounded-[2rem] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-8 md:p-10 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-[280px] h-[280px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-3 inline-flex items-center gap-2">
                <i className="ri-map-pin-line text-base" /> Display Fisik · Rekap
              </p>
              <h3 className="font-header text-2xl md:text-3xl font-black tracking-tighter leading-tight mb-3">
                Galeri Kebaikan tampil di <br />
                <span className="text-[color:var(--retro-gold-light)]">CGV FX Sudirman F7.</span>
              </h3>
              <p className="text-sm text-[color:var(--retro-cream)]/80 leading-relaxed">
                Pada hari perayaan seitansai Helisma, akumulasi kontribusi yang tercatat di sini
                ditampilkan langsung sebagai display sederhana di lokasi.
              </p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/50">
                15 Juni 2026 · Jakarta
              </p>
            </div>
          </div>

          {/* CTA balik ke Pohon Eli */}
          <Link
            to="/26"
            className="group rounded-[2rem] bg-white border border-[color:var(--retro-brown-dark)]/10 p-8 md:p-10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-1 transition-all flex flex-col"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
              <i className="ri-plant-line text-base" /> Modul Pertama
            </p>
            <h3 className="font-header text-2xl md:text-3xl font-black tracking-tighter leading-tight text-[color:var(--retro-text-primary)] mb-3">
              Pohon untuk Eli <br />
              <span className="text-[color:var(--retro-burgundy)]">tumbuh dari dukungan.</span>
            </h3>
            <p className="text-sm text-[color:var(--retro-text-secondary)] leading-relaxed flex-1">
              Sebelum arsip kebaikan dimulai, ada satu pohon yang menanti disirami. Setiap dukungan
              menumbuhkannya satu langkah lebih dekat ke buah aprikot.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] group-hover:gap-3 transition-all">
              Buka Pohon Eli <i className="ri-arrow-right-line text-base" />
            </span>
          </Link>
        </div>

        {/* Project credit footer */}
        <div className="mt-10 pt-6 border-t border-[color:var(--retro-brown-dark)]/10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
            A project by Helismiley × Armeniaca
          </p>
          <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
            Diperbarui oleh Armeniaca · Diusulkan oleh Helismiley · Diteruskan bersama-sama.
          </p>
        </div>
      </div>
    </section>
  </main>
);

export default GaleriKebaikan;
