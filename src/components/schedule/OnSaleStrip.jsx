/**
 * OnSaleStrip — currently on-sale Eli M&G + Photobook products.
 *
 * Reads /data/eli-sales.json (refreshed every 6h with the schedule
 * scrape). Filters to entries where at least one salesPeriod end_date
 * is still in the future, so expired sales (e.g. EXBE10 photobook
 * after 2026-04-20) are auto-hidden. Renders a horizontal strip of
 * product cards with thumbnail, category badge, title, soonest
 * session date, sales countdown, and a buy CTA linking to
 * jkt48.com/exclusive/{code}.
 */

import React, { useEffect, useState } from 'react';

// Hand-picked archive frames for the on-sale cards. Cycled in order
// across whatever sale entries are visible — first card gets the
// first frame, second card the second, and so on. Wraps if there
// are more sales than frames.
const SALE_FRAMES = ['/archive/x/x-F8spTPXboAAWWiF.jpg', '/archive/x/x-F9muG2kacAAHGsL.jpg'];

const CATEGORY_LABEL = {
  TWO_SHOT: '2Shot',
  PHOTOCARD: 'Meet & Greet',
  MEET_GREET: 'Meet & Greet',
  DIGITAL_PHOTOBOOK: 'Photobook + VC',
};

const CATEGORY_ICON = {
  TWO_SHOT: 'ri-user-heart-line',
  PHOTOCARD: 'ri-user-heart-line',
  MEET_GREET: 'ri-user-heart-line',
  DIGITAL_PHOTOBOOK: 'ri-vidicon-line',
};

const formatPrice = (n) => {
  if (n == null) return null;
  const num = Number(n);
  if (Number.isNaN(num)) return null;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatSessionDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

// Returns the latest end_date across all sale windows for this product,
// so we can compute "berakhir X hari lagi" against the most generous
// window (General is usually slightly later than OFC).
const latestSaleEnd = (salesPeriod) => {
  if (!salesPeriod?.length) return null;
  let max = null;
  salesPeriod.forEach((sp) => {
    const t = new Date(sp.end_date).getTime();
    if (!Number.isNaN(t) && (max == null || t > max)) max = t;
  });
  return max;
};

const formatCountdown = (endMs) => {
  if (endMs == null) return null;
  const ms = endMs - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / 86400000);
  if (days <= 1) return 'Berakhir hari ini';
  if (days <= 7) return `${days - 1} hari lagi`;
  return `${days} hari lagi`;
};

const SaleCard = ({ sale, frameSrc }) => {
  const label = CATEGORY_LABEL[sale.category] || sale.category;
  const icon = CATEGORY_ICON[sale.category] || 'ri-shopping-bag-3-line';
  const price = formatPrice(sale.defaultPrice);
  const remainingTotal = (sale.eliSessions || []).reduce(
    (s, e) => s + (e.remainingQuota || 0),
    0,
  );
  const allSoldOut = remainingTotal === 0 && (sale.eliSessions || []).length > 0;
  const saleEndMs = latestSaleEnd(sale.salesPeriod);
  const countdown = formatCountdown(saleEndMs);

  return (
    <a
      href={sale.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0 w-[280px] sm:w-[320px] rounded-2xl overflow-hidden bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-lg transition-all"
    >
      {/* Thumbnail with category badge overlaid. Source is a random
          archive frame chosen at component mount (reshuffles per
          visit) rather than the API thumbnail, which is a generic
          product banner. */}
      <div className="relative aspect-[16/9] overflow-hidden bg-[color:var(--retro-bg-secondary)]">
        {frameSrc && (
          <img
            src={frameSrc}
            alt={sale.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {/* Subtle bottom-fade so badges read on lighter photos */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 p-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]">
            <i className={icon} />
            {label}
          </span>
          {countdown && !allSoldOut && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)]">
              <i className="ri-time-line" />
              {countdown}
            </span>
          )}
          {allSoldOut && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-red-600 text-white">
              <i className="ri-close-circle-line" />
              Sold Out
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2">
        <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight line-clamp-2">
          {sale.title}
        </p>
        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
          <span className="text-[color:var(--color-text-muted)] inline-flex items-center gap-1">
            <i className="ri-calendar-event-line text-base" />
            {formatSessionDate(sale.soonestSessionDate)}
          </span>
          {sale.eliSessions?.length > 0 && (
            <span className="text-[color:var(--retro-burgundy)] tabular-nums">
              {sale.eliSessions.length} sesi
            </span>
          )}
        </div>
        {price && (
          <div className="pt-3 mt-1 border-t border-[color:var(--retro-brown-dark)]/8 flex items-center justify-between gap-2">
            <span className="font-header text-lg font-black text-[color:var(--retro-burgundy)] tabular-nums">
              {price}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] group-hover:translate-x-0.5 transition-transform">
              {allSoldOut ? 'Lihat detail' : 'Beli tiket'}
              <i className="ri-arrow-right-up-line text-base" />
            </span>
          </div>
        )}
      </div>
    </a>
  );
};

const OnSaleStrip = () => {
  // Store already-filtered + sorted active sales so the render body
  // stays pure (the React Compiler's purity rule blocks Date.now()
  // in render). Refilter every minute so newly-expired sales drop
  // off without requiring a page reload.
  const [activeSales, setActiveSales] = useState([]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer = null;

    const refilter = (sales) => {
      const now = Date.now();
      return [...sales]
        .filter((s) => {
          const end = latestSaleEnd(s.salesPeriod);
          return end != null && end > now;
        })
        .sort((a, b) => {
          const ae = latestSaleEnd(a.salesPeriod) || 0;
          const be = latestSaleEnd(b.salesPeriod) || 0;
          return ae - be;
        });
    };

    fetch('/data/eli-sales.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.sales) return;
        setActiveSales(refilter(d.sales));
        // Re-filter every minute — cheap, drops expired sales when
        // their countdown crosses zero on a long-open page.
        refreshTimer = setInterval(() => {
          setActiveSales(refilter(d.sales));
        }, 60000);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  if (activeSales.length === 0) return null;

  return (
    <section
      aria-label="Sedang dijual"
      className="px-5 sm:px-6 md:px-12 lg:px-20 mb-10 md:mb-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sedang Dijual
            <span className="text-[color:var(--color-text-muted)] tabular-nums">
              · {activeSales.length}
            </span>
          </p>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:inline-flex items-center gap-1.5">
            <i className="ri-shopping-bag-3-line" />
            Sesi M&G &amp; Photobook
          </p>
        </div>
        <div
          className="-mx-1 px-1 flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-proximity"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {activeSales.map((sale, idx) => (
            <div key={sale.code} className="snap-start">
              <SaleCard sale={sale} frameSrc={SALE_FRAMES[idx % SALE_FRAMES.length]} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OnSaleStrip;
