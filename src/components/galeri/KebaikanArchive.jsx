/**
 * KebaikanArchive — Galeri Kebaikan archive section embedded on /26.
 *
 * Reads entries from src/data/galeriKebaikan.js (admin-curated, git-versioned)
 * and renders: stats strip + category filters + entry grid + empty state.
 * One entry = one kebaikan act. Mirrors the physical display planned for
 * CGV FX Sudirman F7 on 15 Juni 2026, persists as permanent archive after.
 */

import React, { useMemo, useState } from 'react';
import {
  KEBAIKAN_CATEGORIES,
  KEBAIKAN_ENTRIES,
  formatRupiah,
  getKebaikanStats,
} from '../../data/galeriKebaikan';

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
            {filtered.map((entry) => {
              const cat = KEBAIKAN_CATEGORIES.find((c) => c.id === entry.category);
              const status = STATUS_LABEL[entry.status] || STATUS_LABEL.proposed;
              const amountLabel = formatRupiah(entry.amount);
              const dateLabel = formatDate(entry.executedAt || entry.proposedAt);
              return (
                <li
                  key={entry.id}
                  className="group rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {entry.proofUrl && (
                    <div className="relative aspect-[16/10] bg-[color:var(--retro-bg-primary)] overflow-hidden">
                      <img
                        src={entry.proofUrl}
                        alt={`Dokumentasi ${entry.title}`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
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
                      {entry.proofUrl && (
                        <a
                          href={entry.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy-light)]"
                        >
                          Bukti
                          <i className="ri-external-link-line" />
                        </a>
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
    </section>
  );
};

export default KebaikanArchive;
