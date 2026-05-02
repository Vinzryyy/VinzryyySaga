/**
 * SetlistGrid — every theater setlist Eli has performed in.
 *
 * Source: /data/eli-show-log.json (manual #JumlahShowJKT48 recap by
 * @jehaes_, parsed by scripts/parse-show-log.py). The previous
 * version pulled from /data/eli-setlists.json (jkt48.com API) which
 * had gaps for pre-2021 shows + opaque "SL_X" titles. Manual data
 * has clean Indonesian setlist names + per-setlist unit-song
 * breakdown + center counts that the API doesn't expose.
 *
 * "Active" indicator: lastDate within 60 days of today. Mirrors how
 * fans think about it — a setlist is "still being performed" if it
 * appeared in the last ~2 months.
 */

import React, { useEffect, useMemo, useState } from 'react';

const ACTIVE_WINDOW_DAYS = 60;

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

const daysSince = (iso) => {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
};

const SetlistCard = ({ entry }) => {
  const isActive = daysSince(entry.lastDate) <= ACTIVE_WINDOW_DAYS;
  const topUnit = entry.units?.[0];
  const totalUnitShows = (entry.units || []).reduce((s, u) => s + (u.count || 0), 0);

  return (
    <article
      className={`relative rounded-2xl p-5 md:p-6 border transition-all flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-md ${
        isActive
          ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)]'
          : 'bg-white text-[color:var(--retro-text-primary)] border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40'
      }`}
    >
      {isActive && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] px-2 py-0.5 rounded bg-emerald-500 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Aktif sekarang
          </span>
        </div>
      )}

      <h3
        className={`font-header text-xl md:text-2xl font-black leading-[1.1] tracking-tight ${
          isActive ? 'text-[color:var(--retro-cream)]' : 'text-[color:var(--retro-text-primary)]'
        }`}
      >
        {entry.setlist}
      </h3>

      <div
        className={`flex items-end justify-between gap-3 pt-3 mt-auto border-t ${
          isActive ? 'border-[color:var(--retro-cream)]/15' : 'border-[color:var(--retro-brown-dark)]/10'
        }`}
      >
        <div>
          <p
            className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${
              isActive ? 'text-[color:var(--retro-cream)]/50' : 'text-[color:var(--color-text-muted)]'
            }`}
          >
            Stages Eli
          </p>
          <p
            className={`font-header text-3xl md:text-4xl font-black tabular-nums leading-none ${
              isActive ? 'text-[color:var(--retro-gold-light)]' : 'text-[color:var(--retro-burgundy)]'
            }`}
          >
            {entry.count}
          </p>
          {entry.centerCount > 0 && (
            <p
              className={`mt-1.5 text-[9px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-1 ${
                isActive ? 'text-[color:var(--retro-gold-light)]/80' : 'text-[color:var(--retro-burgundy)]/70'
              }`}
            >
              <i className="ri-star-fill" />
              {entry.centerCount} sebagai Center
            </p>
          )}
        </div>
        {(entry.firstDate || entry.lastDate) && (
          <div
            className={`text-right text-[9px] font-black uppercase tracking-[0.25em] ${
              isActive ? 'text-[color:var(--retro-cream)]/55' : 'text-[color:var(--color-text-muted)]'
            }`}
          >
            {entry.firstDate && (
              <p className="inline-flex items-center gap-1 justify-end">
                <i className="ri-flag-line" />
                {formatDate(entry.firstDate)}
              </p>
            )}
            {entry.lastDate && entry.lastDate !== entry.firstDate && (
              <p className="inline-flex items-center gap-1 mt-1 justify-end">
                <i className="ri-time-line" />
                {formatDate(entry.lastDate)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Unit-song breakdown — top 3 most-performed units, hidden when
          there's no data (Theater no Megami era doesn't list units). */}
      {entry.units && entry.units.length > 0 && (
        <div
          className={`text-[9px] font-black uppercase tracking-[0.2em] flex flex-wrap gap-1.5 pt-2 border-t ${
            isActive
              ? 'border-[color:var(--retro-cream)]/10 text-[color:var(--retro-cream)]/70'
              : 'border-[color:var(--retro-brown-dark)]/8 text-[color:var(--color-text-muted)]'
          }`}
        >
          <span
            className={`${
              isActive ? 'text-[color:var(--retro-cream)]/40' : 'text-[color:var(--color-text-muted)]/60'
            }`}
          >
            Unit:
          </span>
          {entry.units.slice(0, 3).map((u) => (
            <span key={u.name} className="inline-flex items-center gap-1">
              {u.name}
              <span
                className={`tabular-nums ${
                  isActive ? 'text-[color:var(--retro-gold-light)]' : 'text-[color:var(--retro-burgundy)]'
                }`}
              >
                {u.count}
              </span>
            </span>
          ))}
          {entry.units.length > 3 && (
            <span
              className={`${
                isActive ? 'text-[color:var(--retro-cream)]/40' : 'text-[color:var(--color-text-muted)]/60'
              }`}
            >
              + {entry.units.length - 3}
            </span>
          )}
          {topUnit && totalUnitShows < entry.count && (
            <span
              className={`ml-auto ${
                isActive ? 'text-[color:var(--retro-cream)]/40' : 'text-[color:var(--color-text-muted)]/60'
              }`}
            >
              {entry.count - totalUnitShows} tanpa unit
            </span>
          )}
        </div>
      )}
    </article>
  );
};

const SetlistGrid = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showRetired, setShowRetired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-show-log.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sort: currently-active setlists first (by lastDate desc), then
  // retired setlists by count desc.
  const ordered = useMemo(() => {
    const setlists = data?.setlists || [];
    return [...setlists].sort((a, b) => {
      const aActive = daysSince(a.lastDate) <= ACTIVE_WINDOW_DAYS ? 1 : 0;
      const bActive = daysSince(b.lastDate) <= ACTIVE_WINDOW_DAYS ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      if (aActive) {
        return new Date(b.lastDate || 0) - new Date(a.lastDate || 0);
      }
      return (b.count || 0) - (a.count || 0);
    });
  }, [data]);

  const totalStages = data?.totalShows ?? 0;
  const activeSetlists = useMemo(
    () => ordered.filter((s) => daysSince(s.lastDate) <= ACTIVE_WINDOW_DAYS),
    [ordered],
  );
  const retiredSetlists = useMemo(
    () => ordered.filter((s) => daysSince(s.lastDate) > ACTIVE_WINDOW_DAYS),
    [ordered],
  );

  if (!data && !error) {
    return null; // skeleton skipped — section appears once data arrives
  }

  return (
    <section
      aria-label="Setlist Eli"
      className="px-5 sm:px-6 md:px-12 lg:px-20 mb-10 md:mb-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2 mb-1">
              <i className="ri-music-2-line text-base" />
              Setlist Eli
            </p>
            <h2 className="font-header text-2xl md:text-3xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-tight">
              {ordered.length} setlist
              <span className="text-[color:var(--retro-burgundy)]"> · {totalStages} stage</span>
              {activeSetlists.length > 0 && (
                <span className="text-[color:var(--color-text-muted)] text-base md:text-lg font-bold ml-3">
                  ({activeSetlists.length} aktif)
                </span>
              )}
            </h2>
          </div>
          {data?.asOfDate && (
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] inline-flex items-center gap-1.5">
              <i className="ri-refresh-line" />
              Update {formatDate(data.asOfDate)}
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-800">
            <i className="ri-error-warning-line mr-1 align-[-2px]" />
            Gagal memuat data setlist ({error}).
          </div>
        )}

        {/* Active setlists — always visible, lead the section */}
        {activeSetlists.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] px-2 py-0.5 rounded bg-emerald-500 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Aktif sekarang
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] tabular-nums">
                {activeSetlists.length}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSetlists.map((entry) => (
                <SetlistCard key={entry.setlist} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Retired setlists — collapsed behind a toggle. Setlists not
            performed in the last 60 days; click the toggle to expand. */}
        {retiredSetlists.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowRetired((v) => !v)}
              aria-expanded={showRetired}
              className="w-full inline-flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:bg-[color:var(--retro-burgundy)]/[0.02] transition-all group"
            >
              <span className="inline-flex items-center gap-3">
                <i className="ri-archive-line text-[color:var(--retro-burgundy)] text-base" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                  Setlist arsip
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] tabular-nums">
                  {retiredSetlists.length} · {retiredSetlists.reduce((s, e) => s + e.count, 0)} stage
                </span>
              </span>
              <i
                className={`ri-arrow-down-s-line text-xl text-[color:var(--retro-burgundy)] transition-transform ${
                  showRetired ? 'rotate-180' : ''
                } group-hover:translate-y-0.5`}
              />
            </button>
            {showRetired && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-[fadeIn_0.3s_ease-out]">
                {retiredSetlists.map((entry) => (
                  <SetlistCard key={entry.setlist} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default SetlistGrid;
