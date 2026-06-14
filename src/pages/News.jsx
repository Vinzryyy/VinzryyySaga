/**
 * NewsPage — segment-based news hub.
 *
 * Two views driven by the `:slug` route param:
 *   /news            → listing (preview cards for each article)
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

/* ------------------------------------------------------------------ */
/*  Decorative background (shared)                                    */
/* ------------------------------------------------------------------ */

const DecorativeBg = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
    <i className="absolute ri-newspaper-line text-[color:var(--retro-burgundy)]/[0.04] text-[200px] sm:text-[280px]"
       style={{ top: '6%', left: '-5%', transform: 'rotate(-12deg)' }} />
    <i className="absolute ri-ticket-2-line text-[color:var(--retro-gold)]/[0.06] text-[160px] sm:text-[220px]"
       style={{ top: '40%', right: '-4%', transform: 'rotate(15deg)' }} />
    <i className="absolute ri-mic-line text-[color:var(--retro-burgundy)]/[0.04] text-[140px] sm:text-[200px]"
       style={{ top: '70%', left: '-3%', transform: 'rotate(8deg)' }} />
  </div>
);

/* ================================================================== */
/*  LISTING VIEW — /news                                              */
/* ================================================================== */

const PreviewCard = ({ article, index }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.08, triggerOnce: true });
  const eliSongCount = (article.setlist || []).filter((s) => s.eliHighlight).length;

  return (
    <Link
      to={`/news/${article.slug}`}
      ref={elementRef}
      className={`
        group block transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="bg-[color:var(--retro-cream)] rounded-2xl overflow-hidden shadow-retro border border-[color:var(--retro-border)]/30 hover:shadow-retro-lg hover:border-[color:var(--retro-burgundy)]/30 transition-all duration-300">
        <div className="flex flex-col sm:flex-row">
          {/* Thumbnail */}
          {article.image && (
            <div className="relative sm:w-72 md:w-80 flex-shrink-0 aspect-[16/9] sm:aspect-auto overflow-hidden">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/40 via-transparent to-transparent" />
              {/* Category pill */}
              <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-widest">
                <i className={`${CATEGORY_ICON[article.category] || 'ri-megaphone-line'} mr-1`} />
                {article.category}
              </span>
            </div>
          )}

          {/* Text content */}
          <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center gap-2.5">
            <h2 className="font-header text-lg sm:text-xl font-black text-[color:var(--retro-text-primary)] leading-snug group-hover:text-[color:var(--retro-burgundy)] transition-colors">
              {article.title}
            </h2>
            {article.subtitle && (
              <p className="text-sm text-[color:var(--retro-text-secondary)] line-clamp-2">
                {article.subtitle}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--retro-text-light)]">
              <span className="inline-flex items-center gap-1">
                <i className="ri-calendar-event-line" />
                {formatDateShort(article.date)}
              </span>
              {article.venue && (
                <span className="inline-flex items-center gap-1">
                  <i className="ri-map-pin-2-line" />
                  {article.venue}
                </span>
              )}
              {eliSongCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color:var(--retro-gold)]/20 text-[color:var(--retro-brown-dark)] font-bold">
                  <i className="ri-star-fill text-[10px]" />
                  Eli in {eliSongCount} lagu
                </span>
              )}
            </div>

            {/* Read more hint */}
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--retro-burgundy)] opacity-0 group-hover:opacity-100 transition-opacity">
              Baca selengkapnya <i className="ri-arrow-right-line" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const NewsListing = () => (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
    <Seo
      title="News"
      description="Kabar terbaru seputar Eli JKT48 — rekap event, pengumuman, dan highlight."
      path="/news"
    />
    <DecorativeBg />

    <div className="relative z-10">
      {/* Page header */}
      <header className="pt-28 sm:pt-32 md:pt-36 pb-8 sm:pb-10 px-5 sm:px-8 md:px-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[color:var(--retro-burgundy)] mb-3">
            Armeniaca
          </p>
          <h1 className="font-header text-3xl sm:text-4xl md:text-5xl font-black text-[color:var(--retro-text-primary)] leading-[1.1]">
            News
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[color:var(--retro-text-secondary)] max-w-xl">
            Rekap event dan kabar terbaru seputar Eli JKT48 — dicatat oleh Armeniaca.
          </p>
        </div>
      </header>

      {/* Article cards */}
      <section className="px-5 sm:px-8 md:px-12 pb-16 md:pb-24">
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
    </div>
  </main>
);

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
      <DecorativeBg />

      <div className="relative z-10">
        {/* Back link */}
        <div className="pt-24 sm:pt-28 px-5 sm:px-8 md:px-12">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--retro-burgundy)] hover:underline"
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
            <div className="bg-[color:var(--retro-cream)] rounded-2xl overflow-hidden shadow-retro border border-[color:var(--retro-border)]/30">
              {/* Hero image */}
              {article.image && (
                <div className="relative aspect-[21/9] sm:aspect-[2.5/1] overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-widest">
                    <i className={`${CATEGORY_ICON[article.category] || 'ri-megaphone-line'} mr-1`} />
                    {article.category}
                  </span>

                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                    <h1 className="font-header text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-lg">
                      {article.title}
                    </h1>
                    {article.subtitle && (
                      <p className="mt-1 text-sm sm:text-base text-white/80 font-medium drop-shadow">
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
