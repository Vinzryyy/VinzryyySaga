/**
 * ChekichaStrip — Eli's Chekicha (ckc.utaten.com) session activity.
 *
 * Source: /data/chekicha-eli.json — refreshed every 6h via the same
 * GitHub Actions workflow that updates eli-schedule.json (scrape step
 * `scrape-chekicha-eli.py`).
 *
 * Two display modes:
 *   1. Active — upcoming.length > 0 → strip leads with upcoming session
 *      cards. Each card links to the Chekicha profile so JP-app users
 *      can book.
 *   2. Recap — upcoming empty (current case) → compact card summarizing
 *      historical activity (years active, total sessions, last session
 *      date). Surfaces Eli's Chekicha presence even between Birthday
 *      Chekicha announcements so fans know the platform exists.
 *
 * Auto-hides only when BOTH upcoming AND history are empty (would mean
 * the scrape returned nothing — only happens if Chekicha pulls her
 * profile, which is unlikely).
 *
 * Why a separate strip (not merged with OnSaleStrip): Chekicha is a
 * JP-only app and not a "sale" — it's video meet-and-greet activity.
 * Different action surface (download JP app vs buy ticket on JKT48OFC).
 */

import React, { useEffect, useState } from 'react';

const formatHistoryDate = (slash) => {
  if (!slash) return '';
  const [y, m, d] = slash.split('/');
  if (!y || !m || !d) return slash;
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return slash;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const ChekichaStrip = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/chekicha-eli.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  const upcoming = data.upcoming || [];
  const history = data.history || [];
  if (upcoming.length === 0 && history.length === 0) return null;

  const profileUrl = data.talent?.profileUrl;
  const livefeedUrl = data.talent?.livefeedUrl;

  // Recap stats — only computed in recap mode. Year span pulled from
  // first + last history entry (dates are yyyy/mm/dd strings, lex sort
  // works) so we don't hardcode "2021-2025".
  const sortedHistoryDates = history
    .map((h) => h.date)
    .filter(Boolean)
    .sort();
  const firstYear = sortedHistoryDates[0]?.slice(0, 4);
  const lastYear = sortedHistoryDates[sortedHistoryDates.length - 1]?.slice(0, 4);
  const birthdayCount = history.filter((h) =>
    (h.title || '').toLowerCase().includes('birthday'),
  ).length;
  const latest = [...history].sort((a, b) => {
    const da = `${a.date || ''} ${a.time || ''}`;
    const db = `${b.date || ''} ${b.time || ''}`;
    return db.localeCompare(da);
  })[0];

  return (
    <section
      aria-label="Aktivitas Chekicha Eli"
      className="px-5 sm:px-6 md:px-12 lg:px-20 mb-10 md:mb-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                upcoming.length > 0
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-[color:var(--retro-gold)]'
              }`}
            />
            Chekicha
            <span className="text-[color:var(--color-text-muted)] tabular-nums">
              · {upcoming.length > 0 ? `${upcoming.length} mendatang` : `${history.length} arsip`}
            </span>
          </p>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:inline-flex items-center gap-1.5">
            <i className="ri-vidicon-line" />
            Video Meet &amp; Greet · App JP
          </p>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
            {upcoming.map((item, idx) => (
              <a
                key={`${item.date}-${item.time}-${idx}`}
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  {data.talent?.avatar && (
                    <img
                      src={data.talent.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight line-clamp-2">
                      {item.title || 'Chekicha Session'}
                    </p>
                    <p className="text-xs text-[color:var(--color-text-muted)] mt-1 tabular-nums">
                      <i className="ri-calendar-line mr-1 align-[-2px]" />
                      {formatHistoryDate(item.date)}
                      {item.time && (
                        <>
                          {' · '}
                          <i className="ri-time-line mr-1 align-[-2px]" />
                          {item.time} WIB
                        </>
                      )}
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                      <i className="ri-download-cloud-2-line" />
                      Lihat di Chekicha
                      <i className="ri-arrow-right-line" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <a
            href={livefeedUrl || profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-5 md:p-6 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4 md:gap-5">
              {data.talent?.avatar && (
                <img
                  src={data.talent.avatar}
                  alt=""
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm md:text-base text-[color:var(--retro-text-primary)] leading-tight">
                  {firstYear && lastYear && firstYear !== lastYear
                    ? `Eli di Chekicha sejak ${firstYear}`
                    : 'Eli di Chekicha'}
                </p>
                <p className="text-xs md:text-sm text-[color:var(--color-text-muted)] mt-1.5 leading-relaxed">
                  {history.length} sesi tercatat
                  {birthdayCount > 0 && ` · ${birthdayCount}× Birthday Chekicha`}
                  {latest?.date && ` · terakhir ${formatHistoryDate(latest.date)}`}
                </p>
                <p className="text-[10px] text-[color:var(--color-text-muted)]/80 mt-2 leading-snug">
                  Belum ada sesi mendatang. Birthday Chekicha biasanya
                  diumumkan beberapa minggu sebelum 15 Juni.
                </p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm group-hover:-translate-y-0.5 group-hover:shadow-md transition-transform">
                    <i className="ri-archive-line" />
                    Lihat arsip Chekicha
                    <i className="ri-external-link-line" />
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]/70 inline-flex items-center gap-1">
                    <i className="ri-information-line" />
                    Butuh app JP
                  </span>
                </div>
              </div>
            </div>
          </a>
        )}
      </div>
    </section>
  );
};

export default ChekichaStrip;
