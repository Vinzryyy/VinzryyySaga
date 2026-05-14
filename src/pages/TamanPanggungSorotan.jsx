/**
 * Taman Kebaikan — Petak R5: Panggung Terbuka — Sorotan Kebaikan.
 *
 * Hosts archive of donations/kebaikan acts dilakukan atas nama Eli,
 * pull dari data/galeriKebaikan.js (shared dgn /26 KebaikanArchive +
 * GaleriKebaikan page yang offline). Re-frame jadi "sorotan di
 * panggung" — tiap entry = satu spotlight di stage, kategori = bidang
 * pertunjukan.
 *
 * State: prop `restored` dari TamanR5RouteChooser di App.jsx (3-tier
 * gating mirror telaga/arsip/menara). Page sendiri cuma render drought
 * /restored — locked ditangani di chooser (redirect ke peta).
 *   locked   (count < 4500)         — chooser redirect
 *   drought  (4500 ≤ count < 6500)  — header copy "panggung sepi",
 *                                     spotlight unlit visual, arsip
 *                                     entries tetep tampil (sorotan
 *                                     diem aja kalau panggung sepi
 *                                     gak masuk akal — tetep ditampilin)
 *   restored (count ≥ 6500)         — header copy "lampu nyala",
 *                                     spotlight cone glow CSS active
 *
 * Design: dark warm taman aesthetic (#1a1410 bg, #f4d8a0 amber accent),
 * beda dari GaleriKebaikan page yg cream/burgundy bright editorial.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import {
  KEBAIKAN_CATEGORIES,
  KEBAIKAN_ENTRIES,
  formatRupiah,
  getKebaikanStats,
} from '../data/galeriKebaikan';

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

// Inline lightbox utk gallery foto donasi. Dark variant (dari
// KebaikanArchive yg bright). Keyboard nav + body scroll lock +
// pagination dots di bottom + fade-in entrance animation.
const SorotanLightbox = ({ images, index, entryTitle, onClose, onPrev, onNext, onSelect }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  if (!images || images.length === 0) return null;
  const total = images.length;
  const src = images[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm panggung-lightbox-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto bukti ${entryTitle}`}
    >
      <div
        className="relative max-w-[92vw] max-h-[80vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={src}
          src={src}
          alt={`Foto ${index + 1} dari ${total} — ${entryTitle}`}
          className="max-w-full max-h-[80vh] object-contain rounded-md shadow-2xl panggung-lightbox-img-in"
        />
      </div>
      <div className="fixed top-5 left-5 text-amber-200/55 text-[10px] uppercase tracking-[0.3em] pointer-events-none">
        Sorotan {index + 1} / {total}
      </div>
      <div
        className="fixed top-5 left-1/2 -translate-x-1/2 text-amber-100/85 text-sm italic pointer-events-none whitespace-nowrap max-w-[60vw] overflow-hidden text-ellipsis"
        style={{ fontFamily: '"Fraunces Variable", serif' }}
      >
        {entryTitle}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
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
          {/* Pagination dots — clickable, jump-to-image */}
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((_, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                onClick={() => onSelect?.(i)}
                aria-label={`Foto ${i + 1}`}
                aria-current={i === index}
                className={`transition-all rounded-full ${
                  i === index
                    ? 'w-6 h-1.5 bg-amber-200/90'
                    : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Status badge — dark variant
const STATUS_LABEL = {
  proposed: { label: 'Diusulkan', tone: 'bg-white/10 text-white/65 border-white/20' },
  approved: { label: 'Disetujui', tone: 'bg-amber-300/15 text-amber-200/85 border-amber-300/40' },
  executed: { label: 'Terlaksana', tone: 'bg-emerald-400/15 text-emerald-200/90 border-emerald-300/40' },
};

const TamanPanggungSorotan = ({ restored = false }) => {
  const [filter, setFilter] = useState('all');
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
  const selectLightbox = useCallback((i) => {
    setLightbox((prev) => (prev.entry ? { ...prev, index: i } : prev));
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

  const eyebrow = restored ? 'Lampu nyala' : 'Panggung sepi';
  const heroLine = restored
    ? 'Satu spotlight, satu sorotan.'
    : 'Kursi udah disusun. Lampu nungguin.';
  const heroBody = restored
    ? 'Audience-nya sengaja ditinggal kosong di belakang — biar tiap orang yang masuk ke sini bisa duduk di mana aja. Yang penting bukan siapa yang nonton; yang penting cerita-cerita kebaikan ini masih dipentasin.'
    : 'Panggung udah berdiri lagi, tirai udah dijahit setengah. Tapi lampu utama belum nyala — masih nungguin sorotan-sorotan ini cukup buat ngehidupin malem. Tiap kebaikan yang dicatat di sini = satu langkah ke arah cahaya.';

  return (
    <main className="relative min-h-screen bg-[#1a1410] text-white/85 overflow-x-hidden">
      <Seo
        title="Panggung Terbuka — Sorotan Kebaikan · ArmeniacaTown"
        description="Sorotan kebaikan yang dilakukan atas nama Helisma Putri (Eli JKT48). Arsip donasi & aksi nyata dari komunitas Helismiley × Armeniaca."
        path="/armeniacaTown/r5"
      />

      {/* Background gradient — warm dim spotlight pool dari top-center,
          opacity stronger kalau restored. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none"
        style={{
          background: restored
            ? 'radial-gradient(ellipse at 50% 0%, rgba(244, 216, 160, 0.18) 0%, rgba(244, 196, 120, 0.08) 30%, transparent 65%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(244, 216, 160, 0.06) 0%, transparent 50%)',
        }}
      />

      {/* Top nav strip */}
      <div className="relative z-10 pt-6 px-5 sm:px-8 md:px-12">
        <Link
          to="/armeniacaTown/peta"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/55 hover:text-white/85 transition"
        >
          <span aria-hidden="true">←</span> Balik ke peta
        </Link>
      </div>

      {/* Hero */}
      <header className="relative px-5 sm:px-8 md:px-12 lg:px-20 pt-12 md:pt-20 pb-10 md:pb-14">
        <div className="max-w-5xl mx-auto text-center">
          <div
            className="text-[10px] uppercase tracking-[0.4em] mb-4 inline-flex items-center gap-3"
            style={{ color: restored ? '#f4d8a0' : '#c8a060' }}
          >
            <span className="w-8 h-px bg-current opacity-60" aria-hidden="true" />
            Sorotan Kebaikan · {eyebrow}
            <span className="w-8 h-px bg-current opacity-60" aria-hidden="true" />
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 text-white"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            Panggung Terbuka.
          </h1>
          <p
            className="text-lg sm:text-xl md:text-2xl text-amber-100/80 leading-snug mb-5 italic"
            style={{ fontFamily: '"Fraunces Variable", serif' }}
          >
            {heroLine}
          </p>
          <p
            className="text-sm sm:text-base text-white/65 leading-relaxed max-w-2xl mx-auto"
            style={{ fontFamily: '"Fraunces Variable", serif' }}
          >
            {heroBody}
          </p>

          {/* Stage silhouette SVG — backdrop wall + spotlight cone +
              kursi 2 rows + dust motes. Restored = spotlight glow stronger,
              dust motes visible. */}
          <div className="mt-10 md:mt-14 max-w-xl mx-auto">
            <svg viewBox="0 0 240 130" className="w-full" aria-hidden="true">
              <defs>
                <linearGradient id="sporotbeam" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0%" stopColor="#f4d8a0" stopOpacity={restored ? 0.85 : 0.2} />
                  <stop offset="55%" stopColor="#f4c478" stopOpacity={restored ? 0.35 : 0.08} />
                  <stop offset="100%" stopColor="#f4d8a0" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="tiraiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5a2020" stopOpacity={restored ? 0.85 : 0.55} />
                  <stop offset="100%" stopColor="#3a1414" stopOpacity={restored ? 0.7 : 0.35} />
                </linearGradient>
              </defs>

              {/* Backdrop wall — slim rectangle behind stage */}
              <rect
                x="50"
                y="35"
                width="140"
                height="48"
                fill="#3a2a1c"
                opacity={restored ? 0.85 : 0.5}
              />
              {/* Tirai silhouette — 2 panels gantung dari atas backdrop */}
              <polygon
                points="50,35 50,76 78,72 78,35"
                fill="url(#tiraiGrad)"
              />
              <polygon
                points="190,35 190,76 162,72 162,35"
                fill="url(#tiraiGrad)"
              />

              {/* Spotlight bulb on pole — rise from top */}
              <line
                x1="120"
                y1="0"
                x2="120"
                y2="14"
                stroke="#3a2a1c"
                strokeWidth="1.5"
              />
              <circle
                cx="120"
                cy="16"
                r="4"
                fill={restored ? '#f4d8a0' : '#5a4838'}
                style={restored ? { filter: 'drop-shadow(0 0 4px #f4c478)' } : {}}
              />

              {/* Spotlight cone — long beam dari bulb ke stage */}
              <polygon points="120,18 158,84 82,84" fill="url(#sporotbeam)" />

              {/* Dust motes inside cone — restored only, 5 tiny dots
                  CSS-animated floating */}
              {restored && (
                <>
                  <circle cx="100" cy="48" r="0.9" fill="#f4e8a0" className="panggung-dust-1" />
                  <circle cx="118" cy="42" r="0.7" fill="#f4d8a0" className="panggung-dust-2" />
                  <circle cx="135" cy="55" r="0.8" fill="#f4e8a0" className="panggung-dust-3" />
                  <circle cx="108" cy="68" r="0.6" fill="#f4d8a0" className="panggung-dust-4" />
                  <circle cx="128" cy="72" r="0.7" fill="#f4e8a0" className="panggung-dust-5" />
                </>
              )}

              {/* Stage platform — parallelogram kasih depth */}
              <polygon
                points="55,84 185,84 195,90 45,90"
                fill="#6a4830"
                opacity={restored ? 0.9 : 0.65}
              />
              <line x1="45" y1="90" x2="195" y2="90" stroke="#a87858" strokeWidth="1.2" />

              {/* Center stage marker — restored only */}
              {restored && (
                <ellipse
                  cx="120"
                  cy="86"
                  rx="10"
                  ry="2"
                  fill="#f4d8a0"
                  opacity="0.55"
                />
              )}

              {/* Back row kursi — smaller silhouette, further back */}
              {[60, 85, 120, 155, 180].map((x, i) => (
                <rect
                  key={`back-${i}`}
                  x={x - 4}
                  y={100}
                  width="8"
                  height="6"
                  fill="#4a3828"
                  opacity={restored ? 0.7 : 0.5}
                />
              ))}

              {/* Front row kursi — bigger, closer */}
              {[45, 75, 120, 165, 195].map((x, i) => (
                <rect
                  key={`front-${i}`}
                  x={x - 6}
                  y={112}
                  width="12"
                  height="9"
                  fill="#5a4838"
                  opacity={restored ? 0.85 : 0.65}
                />
              ))}
            </svg>
          </div>

          {/* Scroll cue — small arrow encouraging scroll to archive */}
          <div className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/30">
            <span className="w-6 h-px bg-white/20" />
            Geser ke bawah
            <span className="w-6 h-px bg-white/20" />
          </div>
        </div>
      </header>

      {/* Pull quote — between hero and archive, frame the intent */}
      <section className="relative px-5 sm:px-8 md:px-12 lg:px-20 py-10 md:py-14">
        <div className="max-w-3xl mx-auto text-center">
          <span
            aria-hidden="true"
            className="inline-block text-4xl md:text-5xl text-amber-200/30 leading-none mb-1"
            style={{ fontFamily: '"Fraunces Variable", serif' }}
          >
            “
          </span>
          <p
            className="text-xl sm:text-2xl md:text-3xl text-white/85 leading-snug tracking-tight italic"
            style={{ fontFamily: '"Fraunces Variable", serif' }}
          >
            Panggung ini bukan buat dipamerin —
            <span className="text-amber-200/90"> buat dicontoh.</span>
          </p>
          <p className="mt-5 text-xs sm:text-sm text-white/45 uppercase tracking-[0.3em]">
            Tiap sorotan = satu kebaikan nyata
          </p>
        </div>
      </section>

      {/* Stats strip — dark variant */}
      <section className="relative px-5 sm:px-8 md:px-12 lg:px-20 pb-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="rounded-2xl bg-amber-100/5 border border-amber-200/15 p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/55 mb-1">
              Total Sorotan
            </p>
            <p
              className="text-3xl md:text-4xl text-white tabular-nums leading-none"
              style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
            >
              {stats.totalEntries}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">
              Total Dana
            </p>
            <p
              className="text-2xl md:text-3xl text-white/85 tabular-nums leading-none"
              style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
            >
              {stats.totalAmount > 0 ? formatRupiah(stats.totalAmount) : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 col-span-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
              Sebaran per Bidang
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {stats.byCategory.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 text-xs text-white/65"
                >
                  <i className={`${cat.icon} text-sm text-amber-200/65`} />
                  <span className="font-bold tabular-nums text-white/85">{cat.count}</span>
                  <span className="text-white/40">{cat.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Filter chips */}
      <section className="relative px-5 sm:px-8 md:px-12 lg:px-20 pb-6">
        <div className="max-w-6xl mx-auto">
          <div
            role="tablist"
            aria-label="Filter bidang kebaikan"
            className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide"
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
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.18em] transition-all border ${
                    active
                      ? 'bg-amber-200/90 text-[#1a1410] border-amber-200 shadow-[0_0_18px_rgba(244,216,160,0.25)]'
                      : 'bg-white/[0.04] text-white/65 border-white/10 hover:border-amber-200/40 hover:text-amber-100/90'
                  }`}
                >
                  <i className={opt.icon} />
                  {opt.label}
                  <span className={`tabular-nums text-[10px] ${active ? 'text-[#1a1410]/55' : 'text-white/40'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Entries grid or empty state */}
      <section className="relative px-5 sm:px-8 md:px-12 lg:px-20 pb-16">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200/20 bg-amber-200/[0.02] p-12 md:p-16 text-center relative overflow-hidden">
              {/* Subtle radial spotlight pool — empty stage feel */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 50% 60% at 50% 0%, rgba(244, 216, 160, 0.06) 0%, transparent 60%)',
                }}
              />
              {/* Stage line + empty kursi silhouette mini */}
              <svg
                viewBox="0 0 120 50"
                className="w-32 mx-auto opacity-60 relative"
                aria-hidden="true"
              >
                <circle cx="60" cy="6" r="2.2" fill="#5a4838" />
                <polygon
                  points="60,8 78,30 42,30"
                  fill="#f4d8a0"
                  opacity="0.12"
                />
                <line x1="20" y1="32" x2="100" y2="32" stroke="#5a4838" strokeWidth="1" />
                {[35, 60, 85].map((x, i) => (
                  <rect
                    key={i}
                    x={x - 4}
                    y={38}
                    width="8"
                    height="6"
                    fill="#3a2a1c"
                    opacity="0.55"
                  />
                ))}
              </svg>
              <p
                className="text-xl md:text-2xl text-white/85 mt-5 mb-3 relative"
                style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
              >
                Panggung masih sepi di bidang ini.
              </p>
              <p className="text-sm md:text-base text-white/55 max-w-lg mx-auto leading-relaxed relative">
                Setiap kebaikan yang tercatat di sini akan ditampilin sebagai sorotan.
                Yang pertama selalu paling berat — tapi paling jauh dampaknya.
              </p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="relative mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200/30 text-[11px] uppercase tracking-[0.2em] text-amber-200/75 hover:bg-amber-200/10 transition"
              >
                Lihat semua bidang
              </button>
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
                const heroImage = galleryImages[0];
                const photoCount = galleryImages.length;
                const seqNum = String(entryIdx + 1).padStart(2, '0');

                return (
                  <li
                    key={entry.id}
                    className="panggung-card group relative rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-all hover:border-amber-200/40 hover:-translate-y-1 hover:bg-white/[0.05] hover:shadow-[0_8px_32px_rgba(244,196,120,0.12)]"
                  >
                    {/* Hover spotlight glow — radial gradient yg muncul
                        di top-center saat hover, mirror metafor panggung. */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background:
                          'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(244, 216, 160, 0.22) 0%, rgba(244, 196, 120, 0.06) 40%, transparent 70%)',
                      }}
                    />

                    {/* Sequence number badge — top-right, pojok luar */}
                    <span
                      className="absolute top-3 right-3 z-10 text-[10px] uppercase tracking-[0.2em] text-amber-200/55 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-sm border border-amber-200/15"
                      style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
                    >
                      #{seqNum}
                    </span>

                    {/* Image / placeholder */}
                    {heroImage ? (
                      <button
                        type="button"
                        onClick={() => openLightbox(entry, 0)}
                        className="block w-full aspect-[16/10] overflow-hidden bg-black/40 relative"
                        aria-label={`Lihat foto sorotan: ${entry.title}`}
                      >
                        <img
                          src={heroImage}
                          alt={`Sorotan ${entry.title}`}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        {/* Vignette tipis biar image lebih punya frame */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            boxShadow: 'inset 0 0 36px rgba(0,0,0,0.45)',
                          }}
                        />
                        {photoCount > 1 && (
                          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] uppercase tracking-[0.2em] text-amber-100/85">
                            <i className="ri-image-line text-xs" />
                            {photoCount}
                          </span>
                        )}
                        {/* Top gradient — kasih kontras buat category chip */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 top-0 h-16 pointer-events-none"
                          style={{
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
                          }}
                        />
                        {cat && (
                          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-[10px] uppercase tracking-[0.2em] text-amber-100/90 border border-amber-200/25">
                            <i className={`${cat.icon} text-xs`} />
                            {cat.label}
                          </span>
                        )}
                        {/* Status badge — bottom-left overlay, lebih
                            visible drpd di body */}
                        <span className={`absolute bottom-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.18em] border backdrop-blur-sm ${status.tone}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                          {status.label}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full aspect-[16/10] bg-gradient-to-br from-amber-900/20 via-black/40 to-amber-900/10 flex items-center justify-center relative">
                        <i className="ri-spotlight-line text-5xl text-amber-200/30" />
                        {cat && (
                          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-[10px] uppercase tracking-[0.2em] text-amber-100/90 border border-amber-200/25">
                            <i className={`${cat.icon} text-xs`} />
                            {cat.label}
                          </span>
                        )}
                        <span className={`absolute bottom-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.18em] border backdrop-blur-sm ${status.tone}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                          {status.label}
                        </span>
                      </div>
                    )}

                    {/* Body */}
                    <div className="p-5 relative">
                      {dateLabel && (
                        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/55 mb-2">
                          {dateLabel}
                        </p>
                      )}
                      <h3
                        className="text-lg md:text-xl text-white leading-tight mb-2"
                        style={{ fontFamily: '"Fraunces Variable", serif', fontStyle: 'italic' }}
                      >
                        {entry.title}
                      </h3>
                      {entry.description && (
                        <p className="text-sm text-white/65 leading-relaxed mb-4 line-clamp-3">
                          {entry.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-white/50 pt-3 border-t border-white/10">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ri-user-heart-line text-amber-200/55" />
                          {entry.contributorCredit || 'Anonim'}
                        </span>
                        {amountLabel && (
                          <span className="tabular-nums text-amber-100/80">
                            {amountLabel}
                          </span>
                        )}
                      </div>
                      {entry.recipient && (
                        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
                          Penerima: <span className="text-white/55 normal-case tracking-normal">{entry.recipient}</span>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Footer note */}
      <footer className="relative px-5 sm:px-8 md:px-12 lg:px-20 pb-20 pt-6">
        <div className="max-w-6xl mx-auto pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
            A project by Helismiley × Armeniaca
          </p>
          <p className="mt-2 text-xs text-white/35">
            Diperbarui Armeniaca · Diusulkan Helismiley · Diteruskan bersama-sama.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-white/30">
            <Link to="/26" className="hover:text-amber-200/85 transition">
              Pohon Eli ↗
            </Link>
            <span className="mx-2 opacity-40">·</span>
            <Link to="/armeniacaTown/peta" className="hover:text-amber-200/85 transition">
              Peta Kota ↗
            </Link>
          </p>
        </div>
      </footer>

      {lightbox.entry && (
        <SorotanLightbox
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
          onSelect={selectLightbox}
        />
      )}

      {/* Ambient keyframes — dust motes floating + lightbox entrance.
          Pure CSS, no runtime cost selain GPU compositor. */}
      <style>{`
        @keyframes panggungDust1 { 0% { transform: translate(0, 0); opacity: 0.4; } 50% { transform: translate(2px, -3px); opacity: 0.9; } 100% { transform: translate(-1px, 2px); opacity: 0.4; } }
        @keyframes panggungDust2 { 0% { transform: translate(0, 0); opacity: 0.3; } 50% { transform: translate(-2px, 2px); opacity: 0.8; } 100% { transform: translate(1px, -3px); opacity: 0.3; } }
        @keyframes panggungDust3 { 0% { transform: translate(0, 0); opacity: 0.5; } 50% { transform: translate(1px, -2px); opacity: 0.85; } 100% { transform: translate(-2px, 1px); opacity: 0.5; } }
        @keyframes panggungDust4 { 0% { transform: translate(0, 0); opacity: 0.3; } 50% { transform: translate(3px, -1px); opacity: 0.7; } 100% { transform: translate(-1px, 2px); opacity: 0.3; } }
        @keyframes panggungDust5 { 0% { transform: translate(0, 0); opacity: 0.4; } 50% { transform: translate(-2px, -2px); opacity: 0.8; } 100% { transform: translate(2px, 1px); opacity: 0.4; } }
        .panggung-dust-1 { animation: panggungDust1 5.5s ease-in-out infinite; transform-origin: center; }
        .panggung-dust-2 { animation: panggungDust2 4.8s ease-in-out infinite; transform-origin: center; }
        .panggung-dust-3 { animation: panggungDust3 6.2s ease-in-out infinite; transform-origin: center; }
        .panggung-dust-4 { animation: panggungDust4 5.0s ease-in-out infinite; transform-origin: center; }
        .panggung-dust-5 { animation: panggungDust5 5.8s ease-in-out infinite; transform-origin: center; }

        @keyframes panggungLightboxIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes panggungLightboxImgIn { 0% { opacity: 0; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
        .panggung-lightbox-in { animation: panggungLightboxIn 280ms ease-out; }
        .panggung-lightbox-img-in { animation: panggungLightboxImgIn 360ms ease-out; }
      `}</style>
    </main>
  );
};

export default TamanPanggungSorotan;
