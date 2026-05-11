/**
 * Page26 — Harmoni Kebaikan hub utk ulang tahun ke-26 Eli.
 *
 * Single page dgn tab switcher: Pohon Kebaikan | By-U Music. Tiap
 * tab adalah modul partisipatif yg berbeda — Pohon = community
 * watering counter (1 dukungan/device/hari, tumbuh per 100 siraman),
 * By-U Music = pre-release support utk lagu By-U Putri Helisma yg
 * dibuka 15 Juni 2026.
 *
 * Tab state synced ke URL hash (#pohon / #byu) supaya direct link
 * & back/forward navigation jalan. Default ke pohon kalau hash kosong
 * atau invalid.
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Seo from '../components/Seo';
import EliTree from '../components/home/EliTree';
import FloatingPetals from '../components/countdown/FloatingPetals';
import FilosofiModal from '../components/page26/FilosofiModal';
import ByuTitipan from '../components/titipan/ByuTitipan';

const TABS = [
  { id: 'pohon', label: 'Pohon Kebaikan', icon: 'ri-plant-line' },
  { id: 'byu', label: 'By-U Music', icon: 'ri-music-2-line' },
];

const isValidTab = (id) => TABS.some((t) => t.id === id);

const TabNav = ({ active, onSelect }) => (
  <nav className="relative px-5 sm:px-6 md:px-12 lg:px-20 mb-10 md:mb-14">
    <div className="max-w-3xl mx-auto">
      <div className="flex items-stretch justify-center gap-2 sm:gap-3 border-b border-[color:var(--retro-brown-dark)]/15">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={isActive}
              className={`relative -mb-px inline-flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 transition-all
                ${
                  isActive
                    ? 'text-[color:var(--retro-burgundy)] border-b-2 border-[color:var(--retro-burgundy)]'
                    : 'text-[color:var(--color-text-secondary)] border-b-2 border-transparent hover:text-[color:var(--retro-burgundy)]/70'
                }
              `}
            >
              <i className={`${t.icon} text-base`} aria-hidden="true" />
              <span className="font-header text-[10px] sm:text-xs font-black uppercase tracking-[0.28em]">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  </nav>
);

const PohonTab = ({ onOpenFilosofi }) => (
  <>
    <div className="px-5 sm:px-6 md:px-12 lg:px-20 mb-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
        <i className="ri-plant-line text-base" aria-hidden="true" />
        Modul · Pohon Kebaikan
      </p>
      <p className="font-header italic text-base sm:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl mx-auto">
        Pohon ini tidak akan tumbuh sendirian.
      </p>
      <p className="mt-3 text-sm sm:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto">
        Setiap satu dukungan adalah satu siraman; setiap 100 siraman, pohon
        untuk Eli naik ke tahap berikutnya — dari bibit hingga berbuah aprikot.
      </p>
    </div>

    <EliTree />

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
          ulang tahun ke-26 Eli. Modul-modul lain hadir di tab lain di atas.
        </p>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onOpenFilosofi}
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
  </>
);

const ByuMusicTab = () => (
  <>
    <div className="px-5 sm:px-6 md:px-12 lg:px-20 mb-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
        <i className="ri-music-2-line text-base" aria-hidden="true" />
        Modul · By-U Music
      </p>
      <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-2">
        <span className="italic font-normal">By-U</span>
        <span className="text-[color:var(--retro-burgundy)]">.</span>
      </h2>
      <p className="font-header italic text-sm sm:text-base text-[color:var(--color-text-secondary)] mb-4">
        Putri Helisma
      </p>
      <p className="text-sm sm:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto">
        Lagu yg masih tersegel. Akan dirilis{' '}
        <span className="font-bold text-[color:var(--retro-burgundy)]">15 Juni 2026</span>{' '}
        — sampai saat itu, kita yang menjaganya.
      </p>
    </div>

    <ByuTitipan />
  </>
);

const Page26 = () => {
  const location = useLocation();
  const [tab, setTab] = useState(() => {
    const h = location.hash.replace('#', '');
    return isValidTab(h) ? h : 'pohon';
  });
  const [filosofiOpen, setFilosofiOpen] = useState(false);

  // Sync URL hash → state untuk back/forward & direct link.
  useEffect(() => {
    const h = location.hash.replace('#', '');
    if (isValidTab(h)) setTab(h);
    else if (location.hash === '') setTab('pohon');
  }, [location.hash]);

  // Switch tab + update hash tanpa scroll jump (replaceState bypass
  // ScrollManager yg listen ke pathname/hash change). Pohon = default,
  // jadi hash dikosongkan supaya URL bersih.
  const switchTab = (newTab) => {
    if (newTab === tab) return;
    setTab(newTab);
    const target = newTab === 'pohon' ? '/26' : `/26#${newTab}`;
    window.history.replaceState(null, '', target);
  };

  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
      <Seo
        path="/26"
        title="#26 — Harmoni Kebaikan"
        description="Hub perayaan ulang tahun ke-26 Eli JKT48: Pohon Kebaikan dgn dukungan harian, dan Titipan Lagu By-U yg dibuka 15 Juni 2026. Project Helismiley × Armeniaca."
      />

      <FloatingPetals />

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
              <i className="ri-hand-heart-line text-base" />
              Harmoni Kebaikan
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
            Sebuah perayaan yg ditumbuhkan bersama.
          </p>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
            Dua modul partisipatif menjelang 15 Juni 2026: pohon yg disirami
            bersama, dan By-U Music yg masih tersegel. Pilih tab di bawah.
          </p>
          <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
        </div>
      </header>

      <TabNav active={tab} onSelect={switchTab} />

      {tab === 'pohon' ? (
        <PohonTab onOpenFilosofi={() => setFilosofiOpen(true)} />
      ) : (
        <ByuMusicTab />
      )}

      <FilosofiModal isOpen={filosofiOpen} onClose={() => setFilosofiOpen(false)} />
    </main>
  );
};

export default Page26;
