/**
 * NewsPage — segment-based news hub.
 *
 * Two views driven by the `:slug` route param:
 *   /news            → listing (hero banner + preview cards)
 *   /news/:slug      → detail (full article with setlist, metadata, etc.)
 *
 * Articles live in src/data/newsArticles.js — newest first.
 */

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import Seo from '../components/Seo';
import NEWS_ARTICLES from '../data/newsArticles';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const formatDateShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const CATEGORY_ICON = {
  Event: 'ri-ticket-2-line',
  Theater: 'ri-mic-line',
  Birthday: 'ri-cake-2-line',
  Media: 'ri-film-line',
  Other: 'ri-megaphone-line',
};

/* ================================================================== */
/*  LISTING VIEW — /news                                              */
/* ================================================================== */

const PreviewCard = ({ article, index }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.08, triggerOnce: true });
  const eliSongCount = (article.setlist || []).filter((s) => s.eliHighlight).length;
  const donationCount = (article.donations || []).length;

  return (
    <Link
      to={`/news/${article.slug}`}
      ref={elementRef}
      className={`
        group block transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="bg-[color:var(--retro-cream)] rounded-2xl overflow-hidden shadow-retro border border-[color:var(--retro-border)]/30 hover:shadow-retro-lg hover:border-[color:var(--retro-burgundy)]/30 hover:-translate-y-1 transition-all duration-300">
        <div className="flex flex-col sm:flex-row">
          {/* Thumbnail */}
          {article.image && (
            <div className="relative sm:w-72 md:w-80 flex-shrink-0 aspect-[16/9] sm:aspect-auto overflow-hidden">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/50 via-black/10 to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[color:var(--retro-burgundy)]/90 backdrop-blur-sm text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-widest">
                <i className={`${CATEGORY_ICON[article.category] || 'ri-megaphone-line'} mr-1`} />
                {article.category}
              </span>
            </div>
          )}

          {/* Text content */}
          <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center gap-3">
            <h2 className="font-header text-lg sm:text-xl font-black text-[color:var(--retro-text-primary)] leading-snug group-hover:text-[color:var(--retro-burgundy)] transition-colors duration-300">
              {article.title}
            </h2>
            {article.subtitle && (
              <p className="text-sm text-[color:var(--retro-text-secondary)] line-clamp-2 leading-relaxed">
                {article.subtitle}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[color:var(--retro-text-light)] mt-1">
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-calendar-event-line text-[color:var(--retro-burgundy)]" />
                {formatDateShort(article.date)}
              </span>
              {article.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-map-pin-2-line text-[color:var(--retro-burgundy)]" />
                  {article.venue}
                </span>
              )}
              {eliSongCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color:var(--retro-gold)]/20 text-[color:var(--retro-brown-dark)] font-bold">
                  <i className="ri-star-fill text-[10px]" />
                  Eli in {eliSongCount} lagu
                </span>
              )}
              {donationCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] font-bold">
                  <i className="ri-hand-heart-line text-[10px]" />
                  {donationCount} donasi
                </span>
              )}
            </div>

            {/* Read more */}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--retro-burgundy)] mt-1 group-hover:gap-2.5 transition-all duration-300">
              Baca selengkapnya <i className="ri-arrow-right-line transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const NewsListing = () => {
  const { elementRef: heroRef, isVisible: heroVisible } = useScrollReveal({ threshold: 0.05, triggerOnce: true });

  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
      <Seo
        title="News"
        description="Kabar terbaru seputar Eli JKT48 — rekap event, pengumuman, dan highlight."
        path="/news"
      />

      {/* ── Hero banner with background image ── */}
      <header className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <picture>
            <source srcSet="/news-bg.webp" type="image/webp" />
            <img
              src="/news-bg.png"
              alt=""
              className="w-full h-full object-cover object-top"
              fetchPriority="high"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--retro-bg-dark)]/70 via-[color:var(--retro-bg-dark)]/50 to-[color:var(--retro-bg-primary)]" />
        </div>

        {/* Content */}
        <div
          ref={heroRef}
          className={`
            relative z-10 pt-32 sm:pt-36 md:pt-44 pb-16 sm:pb-20 md:pb-28 px-5 sm:px-8 md:px-12
            transition-all duration-1000 ease-out
            ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
          `}
        >
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-[color:var(--retro-gold-light)] mb-4">
              Armeniaca
            </p>
            <h1 className="font-header text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.1] drop-shadow-lg">
              News
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/70 max-w-md mx-auto leading-relaxed">
              Rekap event dan kabar terbaru seputar Eli JKT48 — dicatat oleh Armeniaca.
            </p>

            {/* Article count pill */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <i className="ri-article-line text-[color:var(--retro-gold-light)]" />
              <span className="text-xs font-bold text-white/80">
                {NEWS_ARTICLES.length} artikel
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Article cards ── */}
      <section className="px-5 sm:px-8 md:px-12 -mt-4 pb-16 md:pb-24 relative z-10">
        <div className="max-w-4xl mx-auto space-y-5">
          {NEWS_ARTICLES.map((article, i) => (
            <PreviewCard key={article.id} article={article} index={i} />
          ))}
        </div>
      </section>

      {/* Footer sig */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 md:px-12 pb-12">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)]">
          <div className="w-10 h-px bg-[color:var(--retro-gold)]/50" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">
            Armeniaca · News
          </span>
        </div>
      </div>
    </main>
  );
};

/* ================================================================== */
/*  DETAIL VIEW — /news/:slug                                        */
/* ================================================================== */

const SetlistRow = ({ item, isTop3 }) => {
  const isEli = item.eliHighlight;

  return (
    <div
      className={`
        flex items-start gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors
        ${isEli
          ? 'bg-[color:var(--retro-gold)]/15 border border-[color:var(--retro-gold)]/40'
          : isTop3
            ? 'bg-[color:var(--retro-burgundy)]/5'
            : 'hover:bg-[color:var(--retro-brown-dark)]/5'
        }
      `}
    >
      <span
        className={`
          flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center
          text-xs sm:text-sm font-black tabular-nums
          ${isTop3
            ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
            : 'bg-[color:var(--retro-brown-dark)]/10 text-[color:var(--retro-brown-dark)]'
          }
        `}
      >
        {item.rank}
      </span>

      <div className="flex-1 min-w-0">
        <p
          className={`
            text-sm sm:text-base leading-snug
            ${isTop3 ? 'font-black' : 'font-bold'}
            ${isEli ? 'text-[color:var(--retro-burgundy)]' : 'text-[color:var(--retro-text-primary)]'}
          `}
        >
          {item.title}
        </p>
        {item.performers && (
          <p className="text-xs sm:text-sm text-[color:var(--retro-text-light)] mt-0.5 truncate">
            {item.performers}
          </p>
        )}
      </div>

      {isEli && (
        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)] text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
          <i className="ri-star-fill text-xs" />
          {item.eliNote || 'Eli'}
        </span>
      )}
    </div>
  );
};

const ArticleDetail = ({ article }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.02, triggerOnce: true });
  const [showAll, setShowAll] = useState(false);

  const setlist = article.setlist || [];
  const INITIAL_SHOW = 20;
  const visibleSetlist = showAll ? setlist : setlist.slice(0, INITIAL_SHOW);
  const hasMore = setlist.length > INITIAL_SHOW && !showAll;

  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
      <Seo
        title={article.title}
        description={article.subtitle || article.title}
        path={`/news/${article.slug}`}
      />

      {/* Subtle bg texture */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <i className="absolute ri-newspaper-line text-[color:var(--retro-burgundy)]/[0.03] text-[240px] sm:text-[320px]"
           style={{ top: '5%', left: '-6%', transform: 'rotate(-15deg)' }} />
        <i className="absolute ri-ticket-2-line text-[color:var(--retro-gold)]/[0.05] text-[180px] sm:text-[240px]"
           style={{ top: '45%', right: '-5%', transform: 'rotate(12deg)' }} />
      </div>

      <div className="relative z-10">
        {/* Back link */}
        <div className="pt-24 sm:pt-28 px-5 sm:px-8 md:px-12">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--retro-burgundy)] hover:gap-2.5 hover:underline transition-all duration-200"
            >
              <i className="ri-arrow-left-line" />
              Semua News
            </Link>
          </div>
        </div>

        {/* Article */}
        <article
          ref={elementRef}
          className={`
            px-5 sm:px-8 md:px-12 pt-4 pb-16 md:pb-24
            transition-all duration-700 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-[color:var(--retro-cream)] rounded-2xl overflow-hidden shadow-retro-lg border border-[color:var(--retro-border)]/30">
              {/* Hero image */}
              {article.image && (
                <div className="relative aspect-[21/9] sm:aspect-[2.5/1] overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)]/90 backdrop-blur-sm text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-widest">
                    <i className={`${CATEGORY_ICON[article.category] || 'ri-megaphone-line'} mr-1`} />
                    {article.category}
                  </span>

                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                    <h1 className="font-header text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-lg">
                      {article.title}
                    </h1>
                    {article.subtitle && (
                      <p className="mt-1.5 text-sm sm:text-base text-white/80 font-medium drop-shadow leading-relaxed">
                        {article.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Meta strip */}
              <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-[color:var(--retro-border)]/20 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-[color:var(--retro-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-calendar-event-line text-[color:var(--retro-burgundy)]" />
                  {formatDate(article.date)}
                </span>
                {article.venue && (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ri-map-pin-2-line text-[color:var(--retro-burgundy)]" />
                    {article.venue}
                  </span>
                )}
              </div>

              {/* Show schedule */}
              {article.shows && article.shows.length > 0 && (
                <div className="px-5 sm:px-8 py-3 sm:py-4 border-b border-[color:var(--retro-border)]/20 flex flex-wrap gap-4 sm:gap-6">
                  {article.shows.map((show) => (
                    <div key={show.label} className="flex items-center gap-2 text-xs sm:text-sm">
                      <span className="px-2 py-0.5 rounded bg-[color:var(--retro-brown-dark)]/10 text-[color:var(--retro-brown-dark)] font-black text-[10px] uppercase tracking-wider">
                        {show.label}
                      </span>
                      <span className="text-[color:var(--retro-text-secondary)]">
                        {show.time}
                      </span>
                      <span className="text-[color:var(--retro-text-muted)]">
                        (Peringkat {show.ranks})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Body text */}
              {article.body && (
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-[color:var(--retro-border)]/20">
                  <p className="text-sm sm:text-base text-[color:var(--retro-text-secondary)] leading-relaxed">
                    {article.body}
                  </p>
                </div>
              )}

              {/* Detail rows (key-value) */}
              {article.details && article.details.length > 0 && (
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-[color:var(--retro-border)]/20">
                  <div className="flex items-baseline gap-3 mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                      Detail
                    </h3>
                    <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
                  </div>
                  <div className="space-y-1">
                    {article.details.map((d) => (
                      <div key={d.label} className="flex items-start gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 rounded-lg hover:bg-[color:var(--retro-brown-dark)]/5 transition-colors">
                        <span className="flex-shrink-0 w-24 sm:w-28 text-[11px] font-black uppercase tracking-wider text-[color:var(--retro-text-muted)] pt-0.5">
                          {d.label}
                        </span>
                        <span className="text-sm sm:text-base font-medium text-[color:var(--retro-text-primary)]">
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Donations list */}
              {article.donations && article.donations.length > 0 && (
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-[color:var(--retro-border)]/20">
                  <div className="flex items-baseline gap-3 mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                      Daftar Donasi
                    </h3>
                    <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                      {article.donations.length} kebaikan
                    </span>
                  </div>

                  {/* Total + source breakdown */}
                  {(() => {
                    const total = article.donations.reduce((s, d) => s + (d.amount || 0), 0);
                    const hasSources = article.donations.some((d) => d.source);
                    const bySource = hasSources
                      ? article.donations.reduce((acc, d) => {
                          const key = d.source || 'Lainnya';
                          acc[key] = (acc[key] || 0) + (d.amount || 0);
                          return acc;
                        }, {})
                      : null;
                    return total > 0 && (
                      <div className="mb-4 px-4 py-3 rounded-xl bg-[color:var(--retro-gold)]/10 border border-[color:var(--retro-gold)]/30 space-y-2">
                        <div className="flex items-center gap-3">
                          <i className="ri-hand-heart-line text-lg text-[color:var(--retro-burgundy)]" />
                          <p className="text-sm text-[color:var(--retro-text-secondary)]">
                            Total donasi:{' '}
                            <span className="font-black text-[color:var(--retro-burgundy)]">
                              Rp {total.toLocaleString('id-ID')}+
                            </span>
                          </p>
                        </div>
                        {bySource && Object.keys(bySource).length > 1 && (
                          <div className="flex flex-wrap gap-3 pl-8 text-xs text-[color:var(--retro-text-light)]">
                            {Object.entries(bySource).map(([src, amt]) => (
                              <span key={src} className="inline-flex items-center gap-1">
                                <span className="font-bold text-[color:var(--retro-text-secondary)]">{src}</span>
                                <span>Rp {amt.toLocaleString('id-ID')}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-3">
                    {article.donations.map((d) => {
                      const catIcon = d.category === 'Lingkungan' ? 'ri-leaf-line'
                        : d.category === 'Satwa' ? 'ri-bear-smile-line'
                        : 'ri-hand-heart-line';
                      const isHelismiley = d.source === 'Helismiley';
                      return (
                        <div
                          key={d.title}
                          className={`
                            rounded-xl border p-4 sm:p-5 transition-colors
                            ${isHelismiley
                              ? 'bg-[color:var(--retro-burgundy)]/5 border-[color:var(--retro-burgundy)]/25'
                              : 'bg-[color:var(--retro-bg-secondary)]/50 border-[color:var(--retro-border)]/20 hover:border-[color:var(--retro-border)]/40'
                            }
                          `}
                        >
                          {/* Top row: icon + title + source badge */}
                          <div className="flex items-start gap-3">
                            <span className={`
                              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                              ${isHelismiley
                                ? 'bg-[color:var(--retro-burgundy)]/15'
                                : 'bg-[color:var(--retro-burgundy)]/10'
                              }
                            `}>
                              <i className={`${catIcon} text-base text-[color:var(--retro-burgundy)]`} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm sm:text-base font-black text-[color:var(--retro-text-primary)] leading-snug">
                                  {d.title}
                                </p>
                                {d.source && (
                                  <span className={`
                                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider
                                    ${isHelismiley
                                      ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
                                      : 'bg-[color:var(--retro-brown-dark)]/10 text-[color:var(--retro-brown-dark)]'
                                    }
                                  `}>
                                    {d.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-[color:var(--retro-text-light)] mt-1">
                                {d.recipient}
                              </p>
                            </div>
                          </div>

                          {/* Bottom row: amount + category + date */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[color:var(--retro-border)]/15">
                            {d.amount ? (
                              <span className="text-base sm:text-lg font-black text-[color:var(--retro-burgundy)] tabular-nums">
                                Rp {d.amount.toLocaleString('id-ID')}
                              </span>
                            ) : (
                              <span className="text-xs text-[color:var(--retro-text-muted)] italic">Nominal tidak dipublikasi</span>
                            )}
                            <div className="flex items-center gap-3 text-[10px] sm:text-xs text-[color:var(--retro-text-muted)]">
                              <span className="inline-flex items-center gap-1">
                                <i className={`${catIcon} text-xs`} />
                                {d.category}
                              </span>
                              {d.date && (
                                <span className="inline-flex items-center gap-1">
                                  <i className="ri-calendar-line text-xs" />
                                  {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d.date))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Credit */}
              {article.credit && (
                <div className="px-5 sm:px-8 py-4 border-b border-[color:var(--retro-border)]/20 flex items-center gap-2 text-xs text-[color:var(--retro-text-muted)]">
                  <i className="ri-heart-3-line text-[color:var(--retro-burgundy)]" />
                  <span className="font-bold">{article.credit}</span>
                </div>
              )}

              {/* Setlist */}
              {setlist.length > 0 && (
                <div className="px-5 sm:px-8 py-5 sm:py-6">
                  <div className="flex items-baseline gap-3 mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                      Setlist
                    </h3>
                    <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                      {setlist.length} lagu
                    </span>
                  </div>

                  {setlist.some((s) => s.eliHighlight) && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-[color:var(--retro-gold)]/10 border border-[color:var(--retro-gold)]/30 flex items-center gap-3">
                      <i className="ri-star-smile-line text-lg text-[color:var(--retro-burgundy)]" />
                      <p className="text-sm text-[color:var(--retro-text-secondary)]">
                        <span className="font-black text-[color:var(--retro-burgundy)]">Eli</span> tampil di{' '}
                        <span className="font-black">{setlist.filter((s) => s.eliHighlight).length} lagu</span> pada event ini
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    {visibleSetlist.map((item) => (
                      <SetlistRow key={item.rank} item={item} isTop3={item.rank <= 3} />
                    ))}
                  </div>

                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-4 w-full py-3 rounded-xl border border-[color:var(--retro-border)]/40 text-sm font-bold text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/5 transition-colors"
                    >
                      Tampilkan semua {setlist.length} lagu
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Footer sig */}
        <div className="max-w-4xl mx-auto px-5 sm:px-8 md:px-12 pb-12">
          <div className="flex items-center gap-3 text-[color:var(--color-text-muted)]">
            <div className="w-10 h-px bg-[color:var(--retro-gold)]/50" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">
              Armeniaca · News
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

/* ================================================================== */
/*  Router switch                                                     */
/* ================================================================== */

const NewsPage = () => {
  const { slug } = useParams();

  if (!slug) return <NewsListing />;

  const article = NEWS_ARTICLES.find((a) => a.slug === slug);
  if (!article) return <NewsListing />;

  return <ArticleDetail article={article} />;
};

export default NewsPage;
