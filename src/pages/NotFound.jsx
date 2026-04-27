/**
 * NotFound (404) Page — shown when the hash router can't resolve to any
 * known route. On-brand fallback with Eli portrait + Indonesian message.
 */

import React from 'react';
import { SITE_CONFIG } from '../config/siteConfig';

const NotFoundPage = () => {
  const eli = SITE_CONFIG.eli;

  const navigate = (hash) => {
    window.location.hash = hash;
  };

  return (
    <main className="min-h-screen bg-[color:var(--retro-bg-primary)] flex items-center">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-32 pb-16 md:pb-24 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: editorial 404 */}
          <div className="order-2 lg:order-1">
            <div className="flex items-baseline gap-3 mb-5">
              <span className="font-header text-7xl md:text-9xl font-black text-[color:var(--retro-burgundy)]/15 tracking-tighter leading-none select-none">
                404
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
                Frame Tidak Ditemukan
              </span>
            </div>
            <h1 className="font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-6">
              Sepertinya frame ini <br />
              <span className="text-[color:var(--retro-burgundy)]">belum diarsipkan.</span>
            </h1>
            <p className="text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed mb-10 max-w-xl">
              Halaman yang kamu cari tidak ada di Armeniaca. Bisa jadi
              tautannya salah, sudah dipindah, atau memang belum dibuat. Dari
              sini kamu bisa balik ke beranda, jelajahi arsip lengkap, atau
              cek profil {eli.stageName}.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest shadow-lg shadow-[color:var(--retro-burgundy)]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <i className="ri-home-4-line" />
                Kembali ke Beranda
              </button>
              <button
                type="button"
                onClick={() => navigate('gallery')}
                className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-transparent border-2 border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)] font-bold text-sm uppercase tracking-widest hover:border-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy)] transition-all"
              >
                <i className="ri-gallery-line" />
                Buka Arsip
              </button>
              <button
                type="button"
                onClick={() => navigate('profile')}
                className="group inline-flex items-center gap-3 px-5 py-3 rounded-full text-[color:var(--color-text-muted)] hover:text-[color:var(--retro-burgundy)] font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Profil {eli.stageName}
                <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="mt-12 flex items-center gap-3 text-[color:var(--color-text-muted)]">
              <div className="w-10 h-px bg-[color:var(--retro-gold)]/50" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                Armeniaca · {eli.nickname}
              </span>
            </div>
          </div>

          {/* Right: portrait */}
          <div className="order-1 lg:order-2 relative">
            <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl">
              <img
                src={eli.portrait}
                alt="Eli JKT48"
                className="w-full h-full object-cover grayscale"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-[color:var(--retro-cream)]">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-1">
                  Catatan Arsip
                </p>
                <p className="font-header text-base md:text-lg italic leading-snug">
                  "Tidak semua momen sempat tertangkap kamera, dan tidak semua
                  tautan punya tujuan."
                </p>
              </div>
            </div>
            <div className="absolute -top-3 -left-3 px-4 py-2 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.35em] shadow-xl">
              Error 404
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;
