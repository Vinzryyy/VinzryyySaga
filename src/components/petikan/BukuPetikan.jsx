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
import {
  POHON_APRIKOT_POOL,
  TIER_CONFIG,
  SEITANSAI_WINDOW,
} from '../../data/pohonAprikot';
import { PITY_THRESHOLD } from '../../lib/petikanStorage';
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

// Relative time formatter (Indonesian) — keep ringan, gak butuh date-fns
// dep. Cover umur petikan dari detik sampai > 1 minggu.
const formatRelative = (isoStr) => {
  if (!isoStr) return '';
  const at = new Date(isoStr);
  if (Number.isNaN(at.getTime())) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - at.getTime()) / 1000));
  if (diffSec < 60) return 'baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return at.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

// Recent Pulls row — last 10 petikan yang user dapet, chronological
// terbaru-pertama. Reference history mekanik dari MrcellSbst's
// Tierlist-JKT48. Tap thumbnail → open DetailModal.
const RecentPullsRow = ({ recent, onSelectCard }) => {
  if (!recent || recent.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--retro-burgundy)]/70 mb-2 text-center">
        <i className="ri-history-line mr-1 text-[11px]" />
        Petikan Terakhir
      </p>
      <div className="flex justify-center gap-1.5 sm:gap-2 overflow-x-auto px-2 pb-1 -mx-2">
        {recent.map((entry, idx) => {
          const card = POHON_APRIKOT_POOL.find((c) => c.id === entry.cardId);
          if (!card) return null;
          const cfg = TIER_CONFIG[card.tier] || TIER_CONFIG.muda;
          return (
            <button
              key={`${entry.cardId}-${entry.at}-${idx}`}
              type="button"
              onClick={() => onSelectCard(card.id)}
              className="relative shrink-0 w-12 h-16 sm:w-14 sm:h-[72px] rounded-md overflow-hidden border-2 hover:scale-110 hover:shadow-md transition-transform focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40"
              style={{
                borderColor: cfg.spineColor || 'var(--retro-burgundy)',
                backgroundColor: 'var(--retro-cream, #faf6ed)',
              }}
              aria-label={`${card.title} — ${formatRelative(entry.at)}`}
              title={`${card.title} · ${cfg.label} · ${formatRelative(entry.at)}`}
            >
              {card.image && (
                <img
                  src={card.image}
                  alt=""
                  loading="lazy"
                  className={`w-full h-full ${card.artStyle === 'chibi' ? 'object-contain' : 'object-cover'}`}
                  style={{ filter: 'sepia(0.18) saturate(0.92)' }}
                />
              )}
              {/* Tiny tier dot — pojok kanan atas */}
              <span
                className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                style={{
                  background: cfg.spineColor || 'var(--retro-burgundy)',
                  boxShadow: '0 0 0 1px rgba(250,246,237,0.9)',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Rates modal — disclose tier weights, no-dup rule, seitansai window
// gating. TCG-standard transparency: tell players what their odds are.
// Triggered via 'Tingkat keluar' link di header BukuPetikan.
const RatesModal = ({ onClose }) => {
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

  const tiers = ['legenda', 'langka', 'matang', 'muda'];
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8 bg-[color:var(--retro-brown-dark)]/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tingkat keluar kartu Petikan"
    >
      <div
        className="relative w-full max-w-md bg-[color:var(--retro-cream,#faf6ed)] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(140,100,60,0.025) 0 1px, transparent 1px 8px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[color:var(--retro-brown-dark)]/10">
          <p className="text-[9px] uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-1">
            Pohon Aprikot
          </p>
          <h3
            className="text-xl text-[color:var(--retro-brown-dark)] leading-tight"
            style={{ fontFamily: '"Fraunces Variable", serif', fontWeight: 600 }}
          >
            Tingkat Keluar
          </h3>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-[color:var(--retro-brown-dark)]/70 italic leading-relaxed">
            Setiap hari satu kartu jatuh dari pohon. Peluang per tier:
          </p>
          <ul className="space-y-2">
            {tiers.map((tierKey) => {
              const cfg = TIER_CONFIG[tierKey];
              return (
                <li
                  key={tierKey}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span
                    className="block w-1 h-6 rounded-full shrink-0"
                    style={{ background: cfg.spineColor, opacity: 0.9 }}
                  />
                  <span className="flex-1 text-sm text-[color:var(--retro-brown-dark)]">
                    {cfg.label}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums text-[color:var(--retro-burgundy)]"
                    style={{ fontFamily: '"Fraunces Variable", serif' }}
                  >
                    {cfg.weight}%
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="pt-3 mt-2 border-t border-[color:var(--retro-brown-dark)]/10 space-y-2">
            <p className="text-[11px] text-[color:var(--retro-brown-dark)]/65 leading-relaxed">
              <span className="font-semibold text-[color:var(--retro-burgundy)]">
                ·
              </span>{' '}
              Kartu Legenda tidak duplikat — sekali dapat, tidak diulang.
              Kalau pohon goyang ke Legenda tapi sudah lengkap, jatuh ke
              tier di bawah.
            </p>
            <p className="text-[11px] text-[color:var(--retro-brown-dark)]/65 leading-relaxed">
              <span className="font-semibold text-[color:var(--retro-burgundy)]">
                ·
              </span>{' '}
              <strong>Jaminan:</strong> setiap {PITY_THRESHOLD.langka} petik
              tanpa Langka+, pohon menjamin Langka di petik berikutnya.
              Setiap {PITY_THRESHOLD.legenda} petik tanpa Legenda, pohon
              menjamin Legenda.
            </p>
            <p className="text-[11px] text-[color:var(--retro-brown-dark)]/65 leading-relaxed">
              <span className="font-semibold text-[color:var(--retro-burgundy)]">
                ·
              </span>{' '}
              Aprikot Mei hanya jatuh dari {SEITANSAI_WINDOW.start.slice(5)}
              {' — '}
              {SEITANSAI_WINDOW.end.slice(5)} (musim seitansai Eli).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-[color:var(--retro-brown-dark)] hover:bg-[color:var(--retro-burgundy)] hover:text-white transition"
          aria-label="Tutup tingkat keluar"
        >
          <i className="ri-close-line text-xl" />
        </button>
      </div>
    </div>
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
  const [ratesOpen, setRatesOpen] = useState(false);

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
          className="text-2xl sm:text-3xl text-[color:var(--retro-text-primary)] mb-2 inline-flex items-center gap-2"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 600,
          }}
        >
          Koleksi {pulledTotal}/{poolTotal}
          {/* Master-set complete seal — only shown saat 100% owned.
              Gold wax-stamp feel: filled disc + checkmark, matches
              legenda gold accent. */}
          {pulledTotal === poolTotal && poolTotal > 0 && (
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white shadow-[0_2px_6px_rgba(218,175,92,0.5)]"
              style={{ background: 'linear-gradient(135deg, #daaf5c 0%, #b8893f 100%)' }}
              title="Master set lengkap"
              aria-label="Master set lengkap"
            >
              <i className="ri-check-line text-base" />
            </span>
          )}
        </h2>

        {/* Completion bar — ink-stroke style. Thin burgundy fill on
            cream track. Percentage label right-aligned. */}
        <div className="mx-auto max-w-[280px] mb-3">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(140,100,60,0.12)' }}
            role="progressbar"
            aria-valuenow={poolTotal > 0 ? Math.round((pulledTotal / poolTotal) * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres koleksi"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: poolTotal > 0 ? `${(pulledTotal / poolTotal) * 100}%` : '0%',
                background:
                  pulledTotal === poolTotal && poolTotal > 0
                    ? 'linear-gradient(90deg, #daaf5c 0%, #b8893f 100%)'
                    : 'var(--retro-burgundy)',
              }}
            />
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/55 text-right">
            {poolTotal > 0 ? Math.round((pulledTotal / poolTotal) * 100) : 0}% lengkap
          </p>
        </div>

        <p className="text-xs text-[color:var(--retro-brown-dark)]/60 italic">
          Setiap hari pohon menggugurkan satu — kembalilah pelan-pelan.
        </p>

        {/* Pity progress — gacha-jaminan dari MrcellSbst's Tierlist-JKT48
            UR pity mekanik. Tampilkan hitungan ke jaminan langka +
            legenda. Counter di state.pity, threshold di PITY_THRESHOLD.
            Hide kalau user fully exhausted legenda pool (gak meaningful). */}
        {state?.pity && (() => {
          const langkaLeft = Math.max(0, PITY_THRESHOLD.langka - state.pity.langka);
          const legendaLeft = Math.max(0, PITY_THRESHOLD.legenda - state.pity.legenda);
          const legendaTotal = POHON_APRIKOT_POOL.filter((c) => c.tier === 'legenda').length;
          const legendaOwned = state.legenda ? state.legenda.size : 0;
          const showLegendaPity = legendaTotal > 0 && legendaOwned < legendaTotal;
          if (!showLegendaPity && langkaLeft === PITY_THRESHOLD.langka) {
            // No progress to show
            return null;
          }
          return (
            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/55">
              <i className="ri-shield-star-line mr-1 text-[11px]" />
              Jaminan: langka {state.pity.langka}/{PITY_THRESHOLD.langka}
              {showLegendaPity && (
                <>
                  {' · '}legenda {state.pity.legenda}/{PITY_THRESHOLD.legenda}
                </>
              )}
            </p>
          );
        })()}

        {/* Rates link — TCG-standard pull-rate transparency. Subtle
            text-link, opens modal dengan tier weights + no-dup rule. */}
        <button
          type="button"
          onClick={() => setRatesOpen(true)}
          className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/70 hover:text-[color:var(--retro-burgundy)] underline decoration-dotted underline-offset-4 transition-colors"
          aria-label="Lihat tingkat keluar kartu"
        >
          <i className="ri-percent-line text-[12px]" />
          Tingkat keluar
        </button>
      </header>

      {/* Recent pulls — last 10 petikan, opens detail on tap */}
      <RecentPullsRow
        recent={state?.recent}
        onSelectCard={(id) => setSelectedCardId(id)}
      />

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
          // Tier mastery — small gold dot on filter tab kalau tier ini
          // udah 100% (excluding 'all' tab + tiers yang belum punya card).
          const isMastered =
            filter.id !== 'all' && total > 0 && count === total;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition ${
                isActive
                  ? 'bg-[color:var(--retro-burgundy)] text-white shadow-sm'
                  : 'bg-white/70 text-[color:var(--retro-brown-dark)]/70 hover:bg-[color:var(--retro-burgundy)]/10 border border-[color:var(--retro-brown-dark)]/10'
              }`}
            >
              <span>{filter.label}</span>
              <span className="opacity-75">
                {count}/{total}
              </span>
              {isMastered && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: '#daaf5c', boxShadow: '0 0 4px rgba(218,175,92,0.6)' }}
                  aria-label="Tier lengkap"
                  title="Tier lengkap"
                />
              )}
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

      {/* Rates modal — pull-rate disclosure */}
      {ratesOpen && <RatesModal onClose={() => setRatesOpen(false)} />}
    </section>
  );
};

export default BukuPetikan;
