/**
 * BukuPetikan — collection viewer untuk kartu-kartu yang udah dipetik
 * (dan yang belum). Mirror book-page aesthetic Petikan — grid kompak
 * dgn paper-archive feel, bukan trading-card showcase.
 *
 * Logic:
 *   - Pulled card (state.buku[id] set) → full color thumbnail + title
 *   - Unpulled → grayscale silhouette + "?" placeholder + tier color
 *     spine hint. Tetep showed biar user ada collection goal.
 *   - Click pulled → modal expand view dengan KartuIngatan full render
 *   - Click unpulled → no-op (silently encourage daily return)
 *   - Filter tabs per-tier dengan count "X/Y"
 *
 * State shared dari Petikan parent via `state` prop — re-render saat
 * pluck baru otomatis update collection.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { POHON_APRIKOT_POOL, TIER_CONFIG } from '../../data/pohonAprikot';
import KartuIngatan from './KartuIngatan';

const TIER_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'legenda', label: 'Legenda' },
  { id: 'langka', label: 'Langka' },
  { id: 'matang', label: 'Matang' },
  { id: 'muda', label: 'Muda' },
];

const BukuPetikanItem = ({ card, isPulled, onClick }) => {
  const cfg = TIER_CONFIG[card.tier] || TIER_CONFIG.muda;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isPulled}
      className={`relative aspect-[3/4] w-full rounded-md overflow-hidden transition-transform ${
        isPulled
          ? 'cursor-pointer hover:scale-[1.03] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40'
          : 'cursor-default'
      }`}
      style={{
        backgroundColor: 'var(--retro-cream, #faf6ed)',
        border: '1px solid rgba(61,52,43,0.12)',
      }}
      aria-label={
        isPulled
          ? `${card.title} — ${cfg.label}, sudah dipetik`
          : `Kartu ${cfg.label} belum dipetik`
      }
    >
      {/* Spine accent */}
      <span
        className="absolute left-0 top-0 bottom-0 z-10"
        style={{
          width: cfg.spineWidth || '3px',
          background: cfg.spineColor || 'var(--retro-burgundy)',
          opacity: isPulled ? 1 : 0.4,
        }}
      />

      {isPulled ? (
        <>
          {/* Image */}
          {card.image && (
            <img
              src={card.image}
              alt={card.title}
              loading="lazy"
              className="w-full h-full object-cover"
              style={{ filter: 'sepia(0.18) saturate(0.92)' }}
            />
          )}
          {/* Title overlay bottom */}
          <div
            className="absolute left-0 right-0 bottom-0 px-2 py-1.5 pl-3"
            style={{
              background:
                'linear-gradient(to top, rgba(61,52,43,0.85) 0%, rgba(61,52,43,0.65) 70%, transparent 100%)',
            }}
          >
            <p
              className="text-[10px] text-white leading-tight truncate"
              style={{ fontFamily: '"Fraunces Variable", serif' }}
            >
              {card.title}
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Silhouette state — center "?" + tier label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pl-2 gap-1">
            <i
              className="ri-question-mark text-2xl"
              style={{ color: cfg.spineColor || 'var(--retro-burgundy)', opacity: 0.3 }}
            />
            <p
              className="text-[8px] uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/40"
              style={{ marginLeft: cfg.spineWidth || '3px' }}
            >
              {cfg.label}
            </p>
          </div>
        </>
      )}
    </button>
  );
};

// Detail modal — render KartuIngatan full untuk pulled card yang di-click.
// Static (no flip), focus-trapped via Escape + click backdrop.
const DetailModal = ({ card, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!card) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8 bg-[color:var(--retro-brown-dark)]/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detail kartu ${card.title}`}
    >
      <div
        className="relative w-full max-w-xs"
        style={{ minHeight: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <KartuIngatan card={card} />
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-[color:var(--retro-brown-dark)] hover:bg-[color:var(--retro-burgundy)] hover:text-white transition"
          aria-label="Tutup detail kartu"
        >
          <i className="ri-close-line text-xl" />
        </button>
      </div>
    </div>
  );
};

const BukuPetikan = ({ state }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedCardId, setSelectedCardId] = useState(null);

  const isPulled = (id) => state?.buku && state.buku[id] != null;

  const tierCounts = useMemo(() => {
    const counts = { legenda: 0, langka: 0, matang: 0, muda: 0 };
    const totals = { legenda: 0, langka: 0, matang: 0, muda: 0 };
    POHON_APRIKOT_POOL.forEach((card) => {
      totals[card.tier] = (totals[card.tier] || 0) + 1;
      if (isPulled(card.id)) {
        counts[card.tier] = (counts[card.tier] || 0) + 1;
      }
    });
    return { counts, totals };
    // isPulled depends on state — recompute on each render is cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const filteredCards = useMemo(() => {
    if (activeFilter === 'all') return POHON_APRIKOT_POOL;
    return POHON_APRIKOT_POOL.filter((c) => c.tier === activeFilter);
  }, [activeFilter]);

  const pulledTotal = Object.keys(state?.buku || {}).length;
  const poolTotal = POHON_APRIKOT_POOL.length;
  const selectedCard = selectedCardId
    ? POHON_APRIKOT_POOL.find((c) => c.id === selectedCardId)
    : null;

  return (
    <section className="mt-16">
      {/* Spine divider */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
        <i className="ri-book-2-line text-[color:var(--retro-burgundy)] text-lg" />
        <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
      </div>

      <header className="text-center mb-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2">
          Buku Petikan
        </p>
        <h2
          className="text-2xl sm:text-3xl text-[color:var(--retro-text-primary)] mb-2"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 600,
          }}
        >
          Koleksi {pulledTotal}/{poolTotal}
        </h2>
        <p className="text-xs text-[color:var(--retro-brown-dark)]/60 italic">
          Setiap hari pohon menggugurkan satu — kembalilah pelan-pelan.
        </p>
      </header>

      {/* Filter tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {TIER_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          const count =
            filter.id === 'all'
              ? pulledTotal
              : tierCounts.counts[filter.id] || 0;
          const total =
            filter.id === 'all' ? poolTotal : tierCounts.totals[filter.id] || 0;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition ${
                isActive
                  ? 'bg-[color:var(--retro-burgundy)] text-white shadow-sm'
                  : 'bg-white/70 text-[color:var(--retro-brown-dark)]/70 hover:bg-[color:var(--retro-burgundy)]/10 border border-[color:var(--retro-brown-dark)]/10'
              }`}
            >
              {filter.label}
              <span className="ml-1.5 opacity-75">
                {count}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {filteredCards.map((card) => (
          <BukuPetikanItem
            key={card.id}
            card={card}
            isPulled={isPulled(card.id)}
            onClick={() => isPulled(card.id) && setSelectedCardId(card.id)}
          />
        ))}
      </div>

      {/* Empty filter result — rare edge case but graceful */}
      {filteredCards.length === 0 && (
        <p className="text-center text-sm text-[color:var(--retro-brown-dark)]/50 italic mt-6">
          Tidak ada kartu di tier ini.
        </p>
      )}

      {/* Detail modal */}
      {selectedCard && (
        <DetailModal
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </section>
  );
};

export default BukuPetikan;
