/**
 * OnSaleStrip — everything currently on sale for Eli, in one strip.
 *
 * Sources, same row:
 * 1. /data/eli-sales.jkt48connect.json — M&G, 2-Shot and Video Call
 *    products from the JKT48Connect API (scripts/fetch-jkt48connect-
 *    schedule.mjs), with sold-out status per Eli session. Wins over:
 *    /data/eli-sales.json — the older jkt48.com scrape (blocked since
 *    Sep 2026, kept as a fallback). Same code → JKT48Connect copy.
 *    Expired sales and sales whose Eli sessions have all passed hide
 *    themselves.
 * 2. SITE_CONFIG.sedangDijual.products — manual merch list (t-shirts,
 *    physical items, anything not exposed by the API). Maintained by
 *    hand since Tokopedia/external stores don't publish a feed.
 *
 * Both are rendered with the same card chrome (SaleCard / MerchCard
 * share width + badge layout) so the strip reads as one row.
 */

import React, { useEffect, useState } from 'react';
import { SITE_CONFIG } from '../../config/siteConfig';

// Hand-picked archive frames for the on-sale cards. Cycled in order
// across whatever sale entries are visible — first card gets the
// first frame, second card the second, and so on. Wraps if there
// are more sales than frames.
const SALE_FRAMES = ['/archive/img-303.webp', '/archive/img-206.webp'];

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

// JKT48Connect sessions carry `soldOut`; the old scrape only had
// remainingQuota (0 = sold out).
const sessionSoldOut = (e) => (typeof e.soldOut === 'boolean' ? e.soldOut : (e.remainingQuota || 0) === 0);

const shortDay = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtDay = (ymd) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? ymd : shortDay.format(d);
};
const fmtChecked = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(d);
};

const SaleCard = ({ sale, frameSrc, checkedAt }) => {
  const label = CATEGORY_LABEL[sale.category] || sale.category;
  const icon = CATEGORY_ICON[sale.category] || 'ri-shopping-bag-3-line';
  const price = formatPrice(sale.defaultPrice);
  const sessions = sale.eliSessions || [];
  const allSoldOut = sessions.length > 0 && sessions.every(sessionSoldOut);
  const checked = fmtChecked(checkedAt);
  const saleEndMs = latestSaleEnd(sale.salesPeriod);
  const countdown = formatCountdown(saleEndMs);

  return (
    <a
      href={sale.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-full rounded-2xl overflow-hidden bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-lg transition-all"
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
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]">
            <i className={icon} />
            {label}
          </span>
          {countdown && !allSoldOut && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)]">
              <i className="ri-time-line" />
              {countdown}
            </span>
          )}
          {allSoldOut && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-red-600 text-white">
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
          <span className="text-[color:var(--retro-text-muted)] inline-flex items-center gap-1">
            <i className="ri-calendar-event-line text-base" />
            {formatSessionDate(sale.soonestSessionDate)}
          </span>
          {sessions.length > 0 && (
            <span className="text-[color:var(--retro-burgundy)] tabular-nums">
              {sessions.length} sesi
            </span>
          )}
        </div>
        {/* Eli's sessions with their own status (JKT48Connect data has a
            per-lane sold-out flag). */}
        {sessions.some((e) => e.sessionLabel) && (
          <ul className="flex flex-col gap-1">
            {sessions.map((e) => {
              const out = sessionSoldOut(e);
              return (
                <li key={`${e.sessionDate}-${e.sessionLabel}-${e.jalur}`} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-[color:var(--retro-text-secondary)]">
                    {fmtDay(e.sessionDate)} · {e.sessionLabel}{e.startTime && !/\d{2}:\d{2}/.test(e.sessionLabel) ? ` (${e.startTime}${e.zone && e.zone !== 'WIB' ? ` ${e.zone}` : ''})` : ''} · {e.jalur}
                  </span>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] ${out ? 'bg-red-600/10 text-red-700' : 'bg-emerald-600/10 text-emerald-700'}`}>
                    {out ? 'Sold out' : 'Tersedia'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {checked && (
          <p className="text-[10px] text-[color:var(--retro-text-muted)]">
            Status per {checked} WIB · cek ulang di jkt48.com sebelum membeli
          </p>
        )}
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

// Mirrors SaleCard's chrome (width, thumb aspect, badge layout, footer)
// so a manual merch entry slots into the strip without breaking rhythm.
// link=null renders a disabled "Link Menyusul" pill in place of the
// buy CTA, kept as a `span` so it doesn't pretend to be interactive.
const MerchCard = ({ product }) => {
  const { link } = product;
  const Tag = link ? 'a' : 'div';
  const tagProps = link
    ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Tag
      {...tagProps}
      className={`group w-full md:max-w-[300px] md:justify-self-start rounded-2xl overflow-hidden bg-white border border-[color:var(--retro-brown-dark)]/10 transition-all ${
        link
          ? 'hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-lg'
          : 'cursor-default'
      }`}
    >
      {/* Promo image is a designed flyer (1080×1350, 4:5) with sizes,
          PO date, and bonus burned in. Render at native aspect with
          no overlays so the burned-in info reads cleanly — no need to
          duplicate badges. self-start on the wrapper keeps the strip
          aligned to the top so this taller card doesn't stretch the
          shorter SaleCards next to it. */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--retro-bg-secondary)]">
        <img
          src={product.image}
          alt={product.imageAlt || product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-4 flex flex-col gap-2">
        <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight line-clamp-2">
          {product.name}
        </p>
        {product.store && (
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)] inline-flex items-center gap-1.5 truncate">
            <i className="ri-store-2-line text-base flex-shrink-0" />
            <span className="truncate">{product.store}</span>
          </p>
        )}
        <div className="pt-3 mt-1 border-t border-[color:var(--retro-brown-dark)]/8 flex items-center justify-between gap-2">
          <span className="font-header text-lg font-black text-[color:var(--retro-burgundy)] tabular-nums">
            {product.price}
          </span>
          {link ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] group-hover:translate-x-0.5 transition-transform">
              Beli sekarang
              <i className="ri-arrow-right-up-line text-base" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)]">
              <i className="ri-link-unlink-m" />
              {product.linkPendingLabel || 'Link Menyusul'}
            </span>
          )}
        </div>
      </div>
    </Tag>
  );
};

const OnSaleStrip = () => {
  // Store already-filtered + sorted active sales so the render body
  // stays pure (the React Compiler's purity rule blocks Date.now()
  // in render). Refilter every minute so newly-expired sales drop
  // off without requiring a page reload.
  const [activeSales, setActiveSales] = useState([]);
  const [checkedAt, setCheckedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer = null;

    const todayWIB = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const refilter = (sales) => {
      const now = Date.now();
      const today = todayWIB();
      return [...sales]
        .filter((s) => {
          const end = latestSaleEnd(s.salesPeriod);
          if (end == null || end <= now) return false;
          // Hide once every Eli session has passed (nothing left to buy for her).
          const days = (s.eliSessions || []).map((e) => e.sessionDate).filter(Boolean);
          return !days.length || days.some((d) => d >= today);
        })
        .sort((a, b) => {
          const ae = latestSaleEnd(a.salesPeriod) || 0;
          const be = latestSaleEnd(b.salesPeriod) || 0;
          return ae - be;
        });
    };

    const load = (url) =>
      fetch(url, { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    Promise.all([load('/data/eli-sales.jkt48connect.json'), load('/data/eli-sales.json')]).then(([connect, scraped]) => {
      if (cancelled) return;
      const byCode = new Map();
      (scraped?.sales || []).forEach((s) => byCode.set(s.code, s));
      (connect?.sales || []).forEach((s) => byCode.set(s.code, s));
      const sales = [...byCode.values()];
      if (!sales.length) return;
      setCheckedAt(connect?.fetchedAt || null);
      setActiveSales(refilter(sales));
      // Re-filter every minute — cheap, drops expired sales when
      // their countdown crosses zero on a long-open page.
      refreshTimer = setInterval(() => {
        setActiveSales(refilter(sales));
      }, 60000);
    });

    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  // Manual merch list lives in siteConfig — append after the API
  // sales so live time-sensitive M&G sessions lead the strip and
  // physical merch (longer windows) follows.
  const merchProducts = SITE_CONFIG.sedangDijual?.products || [];
  const totalCount = activeSales.length + merchProducts.length;

  if (totalCount === 0) return null;

  return (
    <section
      aria-label="Sedang dijual"
      className="px-5 sm:px-6 md:px-12 lg:px-20 mb-10 md:mb-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sedang Dijual
            <span className="text-[color:var(--retro-text-muted)] tabular-nums">
              · {totalCount}
            </span>
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)] hidden sm:inline-flex items-center gap-1.5">
            <i className="ri-shopping-bag-3-line" />
            Sesi M&G, Photobook &amp; Merchandise
          </p>
        </div>
        {/* Grid layout — single column on mobile, max two columns on
            md+. Items beyond the second wrap to the next row in the
            same two-column rhythm; an odd item naturally takes a
            single column on the trailing row. items-start so cards
            with different thumb aspects (16:9 sale vs 4:5 merch)
            don't stretch each other vertically. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
          {activeSales.map((sale, idx) => (
            <SaleCard
              key={sale.code}
              sale={sale}
              frameSrc={SALE_FRAMES[idx % SALE_FRAMES.length]}
              checkedAt={sale.lastChangedAt !== undefined ? checkedAt : null}
            />
          ))}
          {merchProducts.map((product, idx) => (
            <MerchCard key={`merch-${product.name}-${idx}`} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default OnSaleStrip;
