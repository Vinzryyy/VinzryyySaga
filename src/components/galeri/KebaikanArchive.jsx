/**
 * KebaikanArchive — Galeri Kebaikan archive section embedded on /26.
 *
 * Reads entries from src/data/galeriKebaikan.js (admin-curated, git-versioned)
 * and renders: stats strip + category filters + entry grid + empty state.
 * One entry = one kebaikan act. Mirrors the physical display planned for
 * CGV FX Sudirman F7 on 15 Juni 2026, persists as permanent archive after.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import {
  KEBAIKAN_CATEGORIES,
  KEBAIKAN_ENTRIES,
  formatRupiah,
  getKebaikanStats,
} from '../../data/galeriKebaikan';

// Inline lightbox utk gallery foto donasi. Self-contained — gak depend
// pada LightboxContext yg dipake gallery utama (struktur image-nya beda
// & scope ini kecil, jadi duplication kerasa wajar).
const KebaikanLightbox = ({ images, index, entryTitle, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext]);

  if (!images || images.length === 0) return null;
  const total = images.length;
  const src = images[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      style={{ animation: 'kbLightboxIn 280ms ease-out' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Galeri foto ${entryTitle}`}
    >
      {/* Image */}
      <div
        className="relative max-w-[92vw] max-h-[88vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={src}
          src={src}
          alt={`Foto ${index + 1} dari ${total} — ${entryTitle}`}
          className="max-w-full max-h-[88vh] object-contain rounded-md shadow-2xl"
          style={{ animation: 'kbLightboxImgIn 320ms ease-out' }}
        />
      </div>

      {/* Counter top-left */}
      <div className="fixed top-5 left-5 text-white/85 text-[11px] font-black uppercase tracking-[0.3em] pointer-events-none">
        {index + 1} / {total}
      </div>

      {/* Caption top-center */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 text-white/80 text-[11px] tracking-wide font-header italic pointer-events-none">
        {entryTitle}
      </div>

      {/* Close X */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup lightbox"
        className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>

      {/* Prev / Next nav */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="Foto sebelumnya"
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="Foto berikutnya"
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      <style>{`
        @keyframes kbLightboxIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes kbLightboxImgIn {
          0%   { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const KebaikanArchive = () => {
  const [filter, setFilter] = useState('all');
  // Lightbox state — entry + image index. Null entry = closed.
  const [lightbox, setLightbox] = useState({ entry: null, index: 0 });

  const openLightbox = useCallback((entry, idx) => {
    setLightbox({ entry, index: idx });
  }, []);
  const closeLightbox = useCallback(() => {
    setLightbox({ entry: null, index: 0 });
  }, []);
  const nextLightbox = useCallback(() => {
    setLightbox((prev) => {
      if (!prev.entry) return prev;
      const imgs = prev.entry.gallery || [prev.entry.proofUrl].filter(Boolean);
      if (imgs.length <= 1) return prev;
      return { ...prev, index: (prev.index + 1) % imgs.length };
    });
  }, []);
  const prevLightbox = useCallback(() => {
    setLightbox((prev) => {
      if (!prev.entry) return prev;
      const imgs = prev.entry.gallery || [prev.entry.proofUrl].filter(Boolean);
      if (imgs.length <= 1) return prev;
      return { ...prev, index: (prev.index - 1 + imgs.length) % imgs.length };
    });
  }, []);

  const stats = useMemo(() => getKebaikanStats(KEBAIKAN_ENTRIES), []);

  // Only kategori dgn minimal 1 entry yg ditampilkan sebagai tab.
  // Klik tab kategori kosong selalu landing ke empty state — bingung
  // visitor + clutter. "Semua" tetap selalu visible sebagai default.
  const visibleCategoryTabs = useMemo(
    () => stats.byCategory.filter((c) => c.count > 0),
    [stats.byCategory],
  );

  // Auto-recover kalau filter aktif merujuk kategori yang udah kosong
  // (mis. semua entry satwa dihapus / belum ada). Tanpa ini, view
  // stuck di empty state padahal tab-nya udah ilang dari UI.
  useEffect(() => {
    if (filter === 'all') return;
    if (!visibleCategoryTabs.some((c) => c.id === filter)) {
      setFilter('all');
    }
  }, [filter, visibleCategoryTabs]);

  const filtered = useMemo(() => {
    const list = filter === 'all'
      ? KEBAIKAN_ENTRIES
      : KEBAIKAN_ENTRIES.filter((e) => e.category === filter);
    return [...list].sort((a, b) =>
      (b.executedAt || b.proposedAt || '').localeCompare(a.executedAt || a.proposedAt || ''),
    );
  }, [filter]);

  // Showcase = flat list of every gallery item across filtered entries.
  // 1 slide = 1 piece of bukti. Slides dari entry multi-bukti (mis. Pohon
  // Kebaikan, 7 sertifikat) tampil "X / Y" badge supaya jelas mereka bagian
  // dari satu aksi. Single-bukti entries tetap tanpa badge. Slide click
  // buka lightbox di index yg tepat.
  const showcaseSlides = useMemo(() => {
    const slides = [];
    filtered.forEach((entry) => {
      const imgs = Array.isArray(entry.gallery) && entry.gallery.length > 0
        ? entry.gallery
        : entry.proofUrl
          ? [entry.proofUrl]
          : [];
      const total = imgs.length;
      imgs.forEach((url, idx) => {
        slides.push({ url, entry, idx, total });
      });
    });
    return slides;
  }, [filtered]);

  return (
    <section
      id="archive-kebaikan"
      aria-label="Galeri Kebaikan — arsip aksi"
      className="px-5 sm:px-6 md:px-12 lg:px-20 pb-20 md:pb-28"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-8 md:mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
            <i className="ri-archive-line text-base" />
            Modul Kedua · Arsip Kebaikan
          </p>
          <h2 className="font-header text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-3xl">
            Setiap aksi kebaikan, <span className="text-[color:var(--retro-burgundy)]">tercatat di sini.</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            Armeniaca mendokumentasikan kebaikan-kebaikan yang dilakukan atas nama Ceu Eli sebagai
            bagian dari Harmoni Kebaikan. Yang ditampilkan di sini akan mirror display fisik di
            <span className="font-bold text-[color:var(--retro-text-primary)]"> CGV FX Sudirman F7</span> pada
            hari-H seitansai, dan tetap menjadi arsip permanen setelahnya.
          </p>
        </div>

        {/* Stats strip — total entries, total dana, per kategori */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <div className="rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70 mb-1">
              Total Aksi
            </p>
            <p className="font-header text-3xl md:text-4xl font-black tabular-nums leading-none">
              {stats.totalEntries}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-1">
              Total Dana
            </p>
            <p className="font-header text-2xl md:text-3xl font-black tabular-nums leading-none text-[color:var(--retro-text-primary)]">
              {stats.totalAmount > 0 ? formatRupiah(stats.totalAmount) : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-5 col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-2">
              Sebaran per Kategori
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {stats.byCategory.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 text-xs text-[color:var(--retro-text-secondary)]"
                >
                  <i className={`${cat.icon} text-sm text-[color:var(--retro-burgundy)]/80`} />
                  <span className="font-bold tabular-nums">{cat.count}</span>
                  <span className="text-[color:var(--color-text-muted)]">{cat.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Source breakdown — Armeniaca vs Helismiley */}
        {stats.bySource && Object.keys(stats.bySource).length > 1 && (
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
            {Object.entries(stats.bySource).map(([src, data]) => (
              <div
                key={src}
                className={`rounded-2xl p-5 ${
                  src === 'Helismiley'
                    ? 'bg-[color:var(--retro-burgundy)]/8 border border-[color:var(--retro-burgundy)]/20'
                    : 'bg-[color:var(--retro-gold)]/8 border border-[color:var(--retro-gold)]/20'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)] mb-1">
                  {src}
                </p>
                <p className="font-header text-xl md:text-2xl font-black tabular-nums leading-none text-[color:var(--retro-text-primary)]">
                  {formatRupiah(data.amount)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filter chips */}
        <div
          role="tablist"
          aria-label="Filter kategori kebaikan"
          className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide"
        >
          {[
            { id: 'all', label: 'Semua', icon: 'ri-grid-line', count: stats.totalEntries },
            ...visibleCategoryTabs,
          ].map((opt) => {
            const active = filter === opt.id;
            const count = opt.count;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(opt.id)}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all border ${
                  active
                    ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)] shadow-md'
                    : 'bg-white text-[color:var(--retro-text-secondary)] border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)]'
                }`}
              >
                <i className={opt.icon} />
                {opt.label}
                <span className={`tabular-nums text-[10px] ${active ? 'text-[color:var(--retro-cream)]/70' : 'text-[color:var(--color-text-muted)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Entries grid OR empty state */}
        {showcaseSlides.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-burgundy)]/[0.02] p-10 md:p-14 text-center">
            <i className="ri-seedling-line text-5xl text-[color:var(--retro-burgundy)]/40 mb-3 inline-block" />
            <p className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-text-primary)] tracking-tight mb-2">
              Arsip masih menunggu untuk diisi.
            </p>
            <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed">
              Kebaikan-kebaikan yang dikumpulkan untuk Galeri Kebaikan akan didokumentasikan di sini
              menjelang 15 Juni 2026. Dimulai dari satu langkah kecil — sama seperti pohon di atas.
            </p>
          </div>
        ) : (
          // Coverflow showcase — pola "darkroom" di hillaryours.id/Diskografi:
          // square cover + bottom gradient + small caption + bold title.
          // loop hanya aktif kalau slide cukup banyak (>= 3) supaya nggak
          // duplikat slide tunggal terlihat aneh saat archive masih kecil.
          <div className="relative rounded-[2rem] overflow-hidden bg-[color:var(--retro-burgundy)] shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
            <div className="relative py-10 md:py-14">
              <Swiper
                effect="coverflow"
                grabCursor
                centeredSlides
                loop={showcaseSlides.length >= 3}
                slidesPerView={1.5}
                modules={[EffectCoverflow]}
                coverflowEffect={{
                  rotate: 50,
                  stretch: 0,
                  depth: 100,
                  modifier: 1,
                  slideShadows: true,
                }}
                breakpoints={{
                  640: { slidesPerView: 1.5 },
                  768: { slidesPerView: 2.2 },
                  1024: { slidesPerView: 3.5 },
                }}
                className="!py-5"
              >
                {showcaseSlides.map((s) => {
                  const cat = KEBAIKAN_CATEGORIES.find((c) => c.id === s.entry.category);
                  const subtitle = s.entry.recipient || cat?.label || '';
                  const showCount = s.total > 1;
                  return (
                    <SwiperSlide key={`${s.entry.id}-${s.idx}`} className="!h-auto">
                      <button
                        type="button"
                        onClick={() => openLightbox(s.entry, s.idx)}
                        className="relative block w-full pb-[100%] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-gold)] rounded-lg overflow-hidden"
                        aria-label={`Buka bukti ${s.idx + 1}${showCount ? ` dari ${s.total}` : ''} — ${s.entry.title}`}
                      >
                        <div className="absolute inset-0">
                          <img
                            src={s.url}
                            alt={`${s.entry.title} — bukti ${s.idx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          {showCount && (
                            <span
                              className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--retro-cream)] pointer-events-none tabular-nums"
                              aria-hidden="true"
                            >
                              <i className="ri-stack-line text-xs" />
                              {s.idx + 1} / {s.total}
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/15 to-transparent px-4 pb-4">
                            {subtitle && (
                              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/90 line-clamp-1">
                                {subtitle}
                              </p>
                            )}
                            <p className="font-header text-lg md:text-xl font-black text-white leading-tight line-clamp-2">
                              {s.entry.title}
                            </p>
                          </div>
                        </div>
                      </button>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>
            <p className="relative pb-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
              Geser untuk lihat semua bukti
            </p>
          </div>
        )}

        {/* Footer note — sets expectation that this list grows over time */}
        <p className="mt-8 text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] text-center">
          Diperbarui oleh Armeniaca · Helismiley × Armeniaca
        </p>
      </div>

      {/* Lightbox modal — render kalau ada entry aktif */}
      {lightbox.entry && (
        <KebaikanLightbox
          images={
            lightbox.entry.gallery && lightbox.entry.gallery.length > 0
              ? lightbox.entry.gallery
              : [lightbox.entry.proofUrl].filter(Boolean)
          }
          index={lightbox.index}
          entryTitle={lightbox.entry.title}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
        />
      )}

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [class*="kbLightboxIn"], [class*="kbLightboxImgIn"] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default KebaikanArchive;
