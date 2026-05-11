/**
 * KebaikanArchive — Galeri Kebaikan archive section embedded on /26.
 *
 * Reads entries from src/data/galeriKebaikan.js (admin-curated, git-versioned)
 * and renders: stats strip + category filters + entry grid + empty state.
 * One entry = one kebaikan act. Mirrors the physical display planned for
 * CGV FX Sudirman F7 on 15 Juni 2026, persists as permanent archive after.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const STATUS_LABEL = {
  proposed: { label: 'Diusulkan', tone: 'bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)]/30' },
  approved: { label: 'Disetujui', tone: 'bg-[color:var(--retro-gold)]/15 text-[color:var(--retro-burgundy)] border-[color:var(--retro-gold)]/40' },
  executed: { label: 'Terlaksana', tone: 'bg-emerald-50 text-emerald-700 border-emerald-300/60' },
};

const formatDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
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
  const filtered = useMemo(() => {
    const list = filter === 'all'
      ? KEBAIKAN_ENTRIES
      : KEBAIKAN_ENTRIES.filter((e) => e.category === filter);
    return [...list].sort((a, b) =>
      (b.executedAt || b.proposedAt || '').localeCompare(a.executedAt || a.proposedAt || ''),
    );
  }, [filter]);

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

        {/* Filter chips */}
        <div
          role="tablist"
          aria-label="Filter kategori kebaikan"
          className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide"
        >
          {[{ id: 'all', label: 'Semua', icon: 'ri-grid-line' }, ...KEBAIKAN_CATEGORIES].map((opt) => {
            const active = filter === opt.id;
            const count = opt.id === 'all'
              ? stats.totalEntries
              : stats.byCategory.find((c) => c.id === opt.id)?.count ?? 0;
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
        {filtered.length === 0 ? (
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
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filtered.map((entry, entryIdx) => {
              const cat = KEBAIKAN_CATEGORIES.find((c) => c.id === entry.category);
              const status = STATUS_LABEL[entry.status] || STATUS_LABEL.proposed;
              const amountLabel = formatRupiah(entry.amount);
              const dateLabel = formatDate(entry.executedAt || entry.proposedAt);
              const galleryImages = Array.isArray(entry.gallery) && entry.gallery.length > 0
                ? entry.gallery
                : entry.proofUrl
                  ? [entry.proofUrl]
                  : [];
              const hasGallery = galleryImages.length > 1;
              return (
                <li
                  key={entry.id}
                  className="group rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  style={{
                    animation: `kbEntryIn 600ms ease-out ${entryIdx * 80}ms both`,
                  }}
                >
                  {entry.proofUrl && (
                    <button
                      type="button"
                      onClick={() => openLightbox(entry, 0)}
                      className="relative aspect-[16/10] bg-[color:var(--retro-bg-primary)] overflow-hidden block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)]"
                      aria-label={`Buka galeri ${entry.title}`}
                    >
                      <img
                        src={entry.proofUrl}
                        alt={`Dokumentasi ${entry.title}`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Zoom hint on hover — small magnify icon */}
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/85 text-[color:var(--retro-burgundy)] shadow-lg">
                          <i className="ri-zoom-in-line text-lg" />
                        </span>
                      </span>
                      {hasGallery && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-sm">
                          <i className="ri-image-line" />
                          {galleryImages.length}
                        </span>
                      )}
                    </button>
                  )}
                  {hasGallery && (
                    <div className="flex gap-1.5 px-5 pt-3">
                      {galleryImages.slice(0, 4).map((url, gi) => (
                        <button
                          key={`${entry.id}-thumb-${gi}`}
                          type="button"
                          onClick={() => openLightbox(entry, gi)}
                          className="block w-12 h-12 rounded-md overflow-hidden border border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)]"
                          aria-label={`Buka foto ${gi + 1} dari ${entry.title}`}
                        >
                          <img
                            src={url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {cat && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] text-[10px] font-black uppercase tracking-[0.2em]">
                          <i className={cat.icon} />
                          {cat.label}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-[0.25em] ${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-header text-lg md:text-xl font-black tracking-tight text-[color:var(--retro-text-primary)] leading-tight mb-2">
                      {entry.title}
                    </h3>
                    {entry.description && (
                      <p className="text-sm text-[color:var(--retro-text-secondary)] leading-relaxed mb-4 flex-1">
                        {entry.description}
                      </p>
                    )}
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      {entry.recipient && (
                        <div className="col-span-2">
                          <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-0.5">
                            Penerima
                          </dt>
                          <dd className="text-[color:var(--retro-text-primary)] font-bold">{entry.recipient}</dd>
                        </div>
                      )}
                      {amountLabel && (
                        <div>
                          <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-0.5">
                            Nominal
                          </dt>
                          <dd className="text-[color:var(--retro-burgundy)] font-black tabular-nums">{amountLabel}</dd>
                        </div>
                      )}
                      {dateLabel && (
                        <div>
                          <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-0.5">
                            Tanggal
                          </dt>
                          <dd className="text-[color:var(--retro-text-primary)] tabular-nums">{dateLabel}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-4 pt-3 border-t border-[color:var(--retro-brown-dark)]/10 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] truncate">
                        {entry.contributorCredit || 'Helismiley Fans'}
                      </span>
                      {galleryImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openLightbox(entry, 0)}
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)] rounded"
                        >
                          Bukti
                          <i className="ri-image-line" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
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
        @keyframes kbEntryIn {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="kbEntryIn"], [class*="kbLightboxIn"], [class*="kbLightboxImgIn"] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default KebaikanArchive;
