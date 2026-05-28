/**
 * NewsStrip — recent JKT48 news from /api/v1/news.
 *
 * Reads /data/eli-news.json (refreshed every 6h alongside the schedule
 * scrape). Each article carries a `mentionsEli` flag set by the Python
 * filter when title/body matches \bHelisma\b. Eli-mentioning articles
 * are pinned to the front of the strip and get a gold "Eli ditandai"
 * badge so fans can spot her appearances at a glance, while the rest
 * of the strip stays populated with general JKT48 announcements.
 *
 * Auto-hides if the JSON is missing or empty.
 */

import React, { useEffect, useState } from 'react';

const CATEGORY_TONE = {
  Event: 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]',
  Theater: 'bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)]',
  Birthday: 'bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)]',
  Goods: 'bg-[color:var(--retro-sepia)] text-[color:var(--retro-cream)]',
  Media: 'bg-[color:var(--retro-brown)] text-[color:var(--retro-cream)]',
  Trainee: 'bg-[color:var(--retro-brown)]/80 text-[color:var(--retro-cream)]',
  'Graduation 2-Shot': 'bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)]',
  Other: 'bg-[color:var(--retro-brown)]/15 text-[color:var(--retro-brown-dark)]',
};

const CATEGORY_ICON = {
  Event: 'ri-ticket-2-line',
  Theater: 'ri-mic-line',
  Birthday: 'ri-cake-2-line',
  Goods: 'ri-shopping-bag-line',
  Media: 'ri-film-line',
  Trainee: 'ri-user-star-line',
  'Graduation 2-Shot': 'ri-graduation-cap-line',
  Other: 'ri-megaphone-line',
};

const STRIP_LIMIT = 15;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const NewsCard = ({ item }) => {
  const tone = CATEGORY_TONE[item.category] || CATEGORY_TONE.Other;
  const icon = CATEGORY_ICON[item.category] || CATEGORY_ICON.Other;
  const isEli = !!item.mentionsEli;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex-shrink-0 w-[300px] sm:w-[360px] rounded-2xl overflow-hidden bg-white border transition-all snap-start hover:-translate-y-0.5 hover:shadow-lg ${
        isEli
          ? 'border-[color:var(--retro-gold)]/70 ring-1 ring-[color:var(--retro-gold)]/30 hover:border-[color:var(--retro-gold)] hover:ring-[color:var(--retro-gold)]/50 shadow-[0_4px_22px_rgba(201,169,97,0.18)]'
          : 'border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40'
      }`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[color:var(--retro-bg-secondary)]">
        {item.image && (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full ${tone}`}
          >
            <i className={icon} />
            {item.category || 'News'}
          </span>
          {isEli && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)] shadow-md">
              <i className="ri-sparkling-2-fill" />
              Eli ditandai
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
      <div className="p-4 flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] inline-flex items-center gap-1">
          <i className="ri-calendar-line text-base" />
          {formatDate(item.publishedAt)}
        </p>
        <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-snug line-clamp-2 min-h-[2.4em]">
          {item.title}
        </p>
        {item.snippet && (
          <p className="text-[11px] text-[color:var(--color-text-secondary)] leading-relaxed line-clamp-2 min-h-[2.6em]">
            {item.snippet}
          </p>
        )}
        <span
          className={`mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] group-hover:translate-x-0.5 transition-transform ${
            isEli ? 'text-[color:var(--retro-brown-dark)]' : 'text-[color:var(--retro-burgundy)]'
          }`}
        >
          Baca selengkapnya
          <i className="ri-arrow-right-up-line text-base" />
        </span>
      </div>
    </a>
  );
};

const NewsStrip = () => {
  const [items, setItems] = useState([]);
  const [eliCount, setEliCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-news.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.items) return;
        // Pin Eli-mentioning articles to the front so they're visible
        // without scrolling. Within each bucket, preserve API order
        // (most-recent-first from jkt48.com).
        const sorted = [...d.items].sort((a, b) => {
          if (!!a.mentionsEli !== !!b.mentionsEli) return a.mentionsEli ? -1 : 1;
          return 0;
        });
        setItems(sorted.slice(0, STRIP_LIMIT));
        setEliCount(
          typeof d.eliMentionCount === 'number'
            ? d.eliMentionCount
            : d.items.filter((x) => x.mentionsEli).length
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Berita JKT48 terbaru, dengan tanda saat menyebut Eli"
      className="px-5 sm:px-6 md:px-12 lg:px-20 py-12 md:py-16 bg-[color:var(--retro-bg-primary)]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-6 md:mb-8 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              JKT48 Resmi
            </p>
            <h2 className="font-header text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-tight">
              Berita JKT48
              <span className="text-[color:var(--retro-burgundy)]"> terbaru.</span>
            </h2>
            {eliCount > 0 ? (
              <p className="mt-2 text-xs text-[color:var(--color-text-secondary)] inline-flex items-center gap-1.5">
                <i className="ri-sparkling-2-fill text-[color:var(--retro-gold)]" />
                {eliCount} artikel menyebut Eli — ditandai di depan
              </p>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
                Belum ada penyebutan langsung di rilis terbaru — kartu akan
                ditandai saat namanya muncul.
              </p>
            )}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] inline-flex items-center gap-1.5">
            <i className="ri-arrow-left-right-line text-base" />
            Geser
          </p>
        </div>
        <div
          className="-mx-1 px-1 flex gap-3 md:gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-proximity"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {items.map((item) => (
            <NewsCard key={item.id || item.slug} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsStrip;
