/**
 * SetlistGrid — every theater setlist Eli has performed in, derived
 * from the jkt48.com API (lifetime walk via scripts/count-eli-shows.py).
 *
 * Primary data source: /data/eli-setlists.json. Each entry is keyed by
 * the API's setlist code (`SL_X`) and includes the canonical
 * Indonesian title, total Eli appearances, per-team breakdown, and
 * first/last performance dates.
 *
 * "Active" indicator: lastDate within 60 days of today. Mirrors how
 * fans think about it — a setlist is "still being performed" if it
 * appeared in the last ~2 months.
 */

import React, { useEffect, useMemo, useState } from 'react';

const ACTIVE_WINDOW_DAYS = 60;

// Friendlier labels for the API's team codes. Anything not in the map
// falls through unchanged (TRAINEE, ACADEMY, etc. are fine as-is).
const TEAM_LABEL = {
  DREAM: 'Team Dream',
  LOVE: 'Team Love',
  PASSION: 'Team Passion',
  KIII: 'Team KIII',
  T: 'Team T',
  J: 'Team J',
  JKT48: 'JKT48',
  TRAINEE: 'Trainee',
  ACADEMY: 'Academy',
};

// Some show titles are touring venue names ("JKT48 Theater Sementara
// Yogyakarta") rather than the setlist's title song. When a setlist
// has both kinds of titles in its history, prefer the non-venue one
// for display. Returns the best canonical title for an entry.
const VENUE_TITLE_RE = /^JKT48 Theater Sementara/i;
const pickCanonicalTitle = (entry) => {
  const titles = entry.titles && entry.titles.length > 0 ? entry.titles : [];
  if (titles.length === 0) return entry.title || entry.code;
  const nonVenue = titles.filter((t) => !VENUE_TITLE_RE.test(t));
  if (nonVenue.length > 0) {
    // Pick the longest non-venue title (mirror Python script's
    // longest-pick heuristic — "Cara Meminum Ramune" beats "Ramune"
    // when both surface).
    return nonVenue.reduce((a, b) => (b.length > a.length ? b : a));
  }
  return entry.title || titles[0];
};

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
  const teams = Object.entries(entry.byTeam || {});
  const primaryTeam = teams[0]?.[0];
  const primaryTeamLabel = primaryTeam ? TEAM_LABEL[primaryTeam] || primaryTeam : null;
  const otherTeams = teams.slice(1);
  const canonicalTitle = pickCanonicalTitle(entry);

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
            Aktif
          </span>
        </div>
      )}
      <div>
        <h3
          className={`font-header text-xl md:text-2xl font-black leading-[1.1] tracking-tight ${
            isActive ? 'text-[color:var(--retro-cream)]' : 'text-[color:var(--retro-text-primary)]'
          }`}
        >
          {canonicalTitle}
        </h3>
        {primaryTeamLabel && (
          <p
            className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 ${
              isActive ? 'text-[color:var(--retro-cream)]/70' : 'text-[color:var(--color-text-muted)]'
            }`}
          >
            {primaryTeamLabel}
            {otherTeams.length > 0 && (
              <span className="opacity-60"> + {otherTeams.length} tim lain</span>
            )}
          </p>
        )}
      </div>

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
            {entry.lastDate && (
              <p className="inline-flex items-center gap-1 mt-1 justify-end">
                <i className="ri-time-line" />
                {formatDate(entry.lastDate)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Team breakdown — only render the chips when the setlist has
          actually been performed under multiple teams, otherwise the
          primary team line above is enough. */}
      {teams.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {teams.map(([team, count]) => (
            <span
              key={team}
              className={`text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded inline-flex items-center gap-1 tabular-nums ${
                isActive
                  ? 'bg-[color:var(--retro-cream)]/10 text-[color:var(--retro-cream)]/80'
                  : 'bg-[color:var(--retro-burgundy)]/8 text-[color:var(--retro-burgundy)]'
              }`}
            >
              {TEAM_LABEL[team] || team}
              <span className="opacity-60">·</span>
              {count}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};

const SetlistGrid = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-setlists.json', { cache: 'no-cache' })
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

  const totalStages = data?.totalShowsTallied ?? 0;
  const activeCount = useMemo(
    () => ordered.filter((s) => daysSince(s.lastDate) <= ACTIVE_WINDOW_DAYS).length,
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
              {activeCount > 0 && (
                <span className="text-[color:var(--color-text-muted)] text-base md:text-lg font-bold ml-3">
                  ({activeCount} aktif)
                </span>
              )}
            </h2>
          </div>
          {data?.asOfDate && (
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] inline-flex items-center gap-1.5">
              <i className="ri-refresh-line" />
              Snapshot {formatDate(data.asOfDate)}
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-800">
            <i className="ri-error-warning-line mr-1 align-[-2px]" />
            Gagal memuat data setlist ({error}).
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordered.map((entry) => (
            <SetlistCard key={entry.code} entry={entry} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SetlistGrid;
