/**
 * Schedule Page — full-page view of Eli's confirmed appearances.
 *
 * Source: same /data/eli-schedule.json that ScheduleCard reads on Home.
 * That file is auto-refreshed every 6h via the GitHub Actions workflow
 * (.github/workflows/refresh-eli-schedule.yml → scrape-eli-schedule.py).
 *
 * Filters: Semua / Show Teater / Meet & Greet / Riwayat. Within the
 * upcoming filters, events are grouped by month (chronological). The
 * Riwayat filter flips to reverse-chronological so the most recent
 * past show is at the top.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Seo from '../components/Seo';
import { useScrollReveal } from '../hooks/useScrollReveal';
import LiveCounter from '../components/schedule/LiveCounter';
import SetlistGrid from '../components/schedule/SetlistGrid';
import OnSaleStrip from '../components/schedule/OnSaleStrip';
import { SITE_CONFIG } from '../config/siteConfig';

const TEAM_LABEL = {
  DREAM: 'Team Dream',
  JKT48: 'All-Team',
  LOVE: 'Team Love',
  PASSION: 'Team Passion',
};

const MG_CATEGORY_LABEL = {
  TWO_SHOT: '2Shot',
  MEET_GREET: 'Meet & Greet',
};

const FILTERS = [
  { id: 'all', label: 'Semua', icon: 'ri-calendar-line' },
  { id: 'show', label: 'Show Teater', icon: 'ri-mic-line' },
  { id: 'mg', label: 'Meet & Greet', icon: 'ri-user-heart-line' },
  { id: 'vc', label: 'Video Call', icon: 'ri-vidicon-line' },
  { id: 'past', label: 'Riwayat', icon: 'ri-history-line' },
];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const isUpcoming = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startOfToday();
};

// Days from now until the event date (0 = today, 1 = tomorrow, etc.).
// Negative values mean the event is in the past. Returns Infinity for
// invalid inputs so callers can ignore those cases without branching.
const daysUntil = (iso) => {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Infinity;
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - startOfToday().getTime()) / 86400000);
};

// Returns null if the event isn't in the imminence window (within 7
// days of today). Otherwise returns { label, tone } where tone picks
// the badge color treatment (today = strong gold, this-week = soft).
const getImminenceBadge = (iso) => {
  const n = daysUntil(iso);
  if (n < 0 || n > 7) return null;
  if (n === 0) return { label: 'Hari ini', tone: 'today' };
  if (n === 1) return { label: 'Besok', tone: 'soon' };
  return { label: `${n} hari lagi`, tone: 'soon' };
};

const monthKey = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
};

const monthLabel = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const formatRefreshed = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const eventKindMatches = (entry, filter) => {
  if (filter === 'all' || filter === 'past') return true;
  const isExclusive = entry.kind === 'EXCLUSIVE';
  const isPhotobookVC = isExclusive && entry.category === 'DIGITAL_PHOTOBOOK';
  const isVC = entry.is_video_call === true || isPhotobookVC;
  const isMG = isExclusive && !isPhotobookVC;
  if (filter === 'vc') return isVC;
  if (filter === 'mg') return isMG;
  if (filter === 'show') return !isExclusive && !isVC;
  return true;
};

const ScheduleEventCard = ({ entry, dimmed }) => {
  const date = new Date(entry.date);
  // EXCLUSIVE = any per-fan paid session product. Photobook bonus VC
  // sessions are tagged kind=EXCLUSIVE + category=DIGITAL_PHOTOBOOK;
  // face-to-face M&G uses TWO_SHOT or PHOTOCARD. They share quota
  // structure (Jalur, sold_out, remaining_total) so the rendering
  // below treats them uniformly — only the primary badge differs.
  const isExclusive = entry.kind === 'EXCLUSIVE';
  const isPhotobookVC = isExclusive && entry.category === 'DIGITAL_PHOTOBOOK';
  const isFaceMG = isExclusive && !isPhotobookVC;
  const isVC = entry.is_video_call === true || isPhotobookVC;
  const isGeneral = entry.kind === 'GENERAL';
  const isEvent = entry.kind === 'EVENT' && !isVC;
  // Kept for the existing sold_out/remaining/jalur conditional blocks
  // below — true for any per-fan session, M&G or VC alike.
  const isMG = isExclusive;

  let primaryBadge;
  let badgeIcon;
  if (isVC) {
    primaryBadge = isPhotobookVC ? 'Video Call · Photobook' : 'Video Call';
    badgeIcon = 'ri-vidicon-line';
  } else if (isFaceMG) {
    primaryBadge = MG_CATEGORY_LABEL[entry.category] || 'M&G';
    badgeIcon = 'ri-user-heart-line';
  } else if (isGeneral) {
    primaryBadge = 'Off-site';
    badgeIcon = 'ri-map-pin-line';
  } else if (isEvent) {
    primaryBadge = 'Event';
    badgeIcon = 'ri-ticket-2-line';
  } else {
    primaryBadge = TEAM_LABEL[entry.team] || entry.team;
    badgeIcon = 'ri-mic-line';
  }
  const eliJalur = (entry.eli_jalur || []).join(', ');
  const imminence = dimmed ? null : getImminenceBadge(entry.date);

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`relative block h-full p-4 rounded-xl bg-white border transition-all group ${
        dimmed
          ? 'opacity-70 border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-md'
          : imminence?.tone === 'today'
          ? 'border-[color:var(--retro-gold)] shadow-[0_0_0_3px_rgba(232,180,80,0.15)] hover:-translate-y-0.5 hover:shadow-lg'
          : 'border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className="flex items-stretch gap-3">
        <div className="flex-shrink-0 w-14 text-center border-r border-[color:var(--retro-brown-dark)]/10 pr-3">
          <p className="font-header text-3xl font-black text-[color:var(--retro-burgundy)] leading-none tabular-nums">
            {String(date.getDate()).padStart(2, '0')}
          </p>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mt-1">
            {new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date)}
          </p>
          <p className="text-[9px] font-black tabular-nums text-[color:var(--color-text-muted)] mt-0.5">
            {date.getFullYear()}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {imminence && (
              <span
                className={`text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                  imminence.tone === 'today'
                    ? 'bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)]'
                    : 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
                }`}
              >
                {imminence.tone === 'today' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-brown-dark)] animate-pulse" />
                )}
                <i className={imminence.tone === 'today' ? 'ri-flashlight-fill' : 'ri-time-line'} />
                {imminence.label}
              </span>
            )}
            <span
              className={`text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                isVC
                  ? 'bg-blue-100 text-blue-700'
                  : isMG
                  ? 'bg-[color:var(--retro-gold-light)]/30 text-[color:var(--retro-burgundy)]'
                  : isGeneral || isEvent
                  ? 'bg-[color:var(--retro-brown-dark)]/10 text-[color:var(--retro-brown-dark)]'
                  : 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]'
              }`}
            >
              <i className={badgeIcon} />
              {primaryBadge}
            </span>
            {entry.is_birthday_show && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-[color:var(--retro-gold-light)]/30 text-[color:var(--retro-burgundy)]">
                <i className="ri-cake-2-line mr-0.5" />
                Birthday
              </span>
            )}
            {isMG && entry.sold_out && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-red-100 text-red-700 inline-flex items-center gap-1">
                <i className="ri-close-circle-line" />
                Sold Out
              </span>
            )}
            {isMG && !entry.sold_out && entry.remaining_total > 0 && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                <i className="ri-checkbox-circle-line" />
                {entry.remaining_total} tersisa
              </span>
            )}
          </div>
          <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight line-clamp-2">
            {entry.title}
          </p>
          {(entry.start_time || entry.end_time) && (
            <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-1 tabular-nums">
              <i className="ri-time-line mr-1 align-[-2px]" />
              {entry.start_time}
              {entry.end_time ? ` – ${entry.end_time}` : ''}
            </p>
          )}
          {entry.venue && (
            <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-1">
              <i className="ri-map-pin-line mr-1 align-[-2px]" />
              {entry.venue}
            </p>
          )}
          {isMG && eliJalur && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)] mt-2 inline-flex items-center gap-1.5">
              <i className="ri-arrow-right-circle-line" />
              Eli di {eliJalur}
            </p>
          )}
          {!isMG && entry.members && entry.members.length > 0 && (
            <p className="text-[10px] text-[color:var(--color-text-muted)] leading-snug mt-2 line-clamp-1 group-hover:text-[color:var(--retro-burgundy)] transition-colors">
              + {entry.members.length} member · cek detail tiket
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-[color:var(--retro-brown-dark)]/8">
            {dimmed ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                <i className="ri-archive-line" />
                Sudah berlalu · arsip
              </span>
            ) : isMG && entry.sold_out ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                <i className="ri-lock-line" />
                Tiket habis
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm group-hover:-translate-y-0.5 group-hover:shadow-md transition-transform">
                <i className="ri-ticket-2-line" />
                {isMG ? 'Beli Tiket' : 'Cek Tiket'}
                <i className="ri-arrow-right-line" />
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
};

const SchedulePage = () => {
  const [calendar, setCalendar] = useState(null);
  const [calendarError, setCalendarError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-schedule.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled) setCalendar(data);
      })
      .catch((err) => {
        if (!cancelled) setCalendarError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const events = useMemo(() => calendar?.events || [], [calendar]);

  // Counts feed the filter chip pills + the page subtitle.
  const counts = useMemo(() => {
    const upcoming = events.filter((e) => isUpcoming(e.date));
    const isPhotobookVC = (e) => e.kind === 'EXCLUSIVE' && e.category === 'DIGITAL_PHOTOBOOK';
    const isVC = (e) => e.is_video_call === true || isPhotobookVC(e);
    const isMG = (e) => e.kind === 'EXCLUSIVE' && !isPhotobookVC(e);
    return {
      all: upcoming.length,
      show: upcoming.filter((e) => e.kind !== 'EXCLUSIVE' && !isVC(e)).length,
      mg: upcoming.filter(isMG).length,
      vc: upcoming.filter(isVC).length,
      past: events.length - upcoming.length,
    };
  }, [events]);

  // Filtered + sorted: upcoming filters are chronological; past flips
  // to reverse-chronological so the most recent past show leads.
  const filtered = useMemo(() => {
    const past = filter === 'past';
    const q = query.trim().toLowerCase();
    const pool = events
      .filter((e) => (past ? !isUpcoming(e.date) : isUpcoming(e.date)))
      .filter((e) => eventKindMatches(e, filter))
      .filter((e) => {
        if (!q) return true;
        const haystack = `${e.title || ''} ${e.venue || ''}`.toLowerCase();
        return haystack.includes(q);
      });
    return [...pool].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return past ? db - da : da - db;
    });
  }, [events, filter, query]);

  // Group by month so the wall reads as a calendar (Mei 2026 / Juni 2026 / …).
  const monthGroups = useMemo(() => {
    const groups = new Map();
    filtered.forEach((entry) => {
      const key = monthKey(entry.date);
      if (!groups.has(key)) {
        groups.set(key, { key, label: monthLabel(entry.date), events: [] });
      }
      groups.get(key).events.push(entry);
    });
    return Array.from(groups.values());
  }, [filtered]);

  const { elementRef: gridRef, isVisible: gridVisible } = useScrollReveal({
    threshold: 0.05,
    rootMargin: '-40px',
  });

  const subtitle = useMemo(() => {
    if (!calendar) return null;
    if (counts.all === 0 && counts.past === 0) return null;
    const parts = [];
    if (counts.all > 0) parts.push(`${counts.all} mendatang`);
    if (counts.mg > 0) parts.push(`${counts.mg} M&G`);
    if (counts.past > 0) parts.push(`${counts.past} arsip`);
    return parts.join(' · ');
  }, [calendar, counts]);

  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen">
      <Seo
        path="/schedule"
        title="Jadwal Eli"
        description="Daftar lengkap show teater dan Personal Meet & Greet Eli JKT48 (Helisma Putri). Auto-refresh setiap 6 jam."
      />

      {/* Editorial header — stage photo full-bleed background with
          burgundy gradient overlay so the eyebrow / h1 / lead stay
          legible. Hidden mask edges fade to the page bg color so the
          header blends into the LiveCounter section below. */}
      <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
        {/* Background photo — Eli on stage. Object-position keeps her
            face roughly above the headline on most aspect ratios. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/archive/x/x-F8yMHNrbwAAunZu.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: '50% 25%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Tonal overlay — heavy on the bottom so the gradient blends
            into the page background, keeping the LiveCounter section
            below from snapping visually. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(61, 52, 43, 0.82) 0%, rgba(92, 74, 58, 0.65) 35%, rgba(252, 244, 230, 0.92) 90%, var(--retro-bg-primary) 100%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-5 text-[color:var(--retro-burgundy-light)]">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] inline-flex items-center gap-2">
              <i className="ri-calendar-event-line text-base" />
              Schedule · Live
            </span>
            <span className="flex-1 h-px bg-[color:var(--retro-burgundy-light)]/50 max-w-[120px]" />
            {subtitle && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                {subtitle}
              </span>
            )}
          </div>
          <h1 className="font-header text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white leading-[0.95] max-w-4xl drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
            Jadwal Eli, <br />
            <span className="text-white">satu kalender penuh.</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
            Show teater Team Dream, all-team event, dan Personal Meet &amp; Greet —
            cast list resmi yang sudah terverifikasi (Eli ada di lineup). Auto-refresh tiap 6 jam.
          </p>
          <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
        </div>
      </header>

      {/* Live stats — theater shows (baseline + delta), M&G done/upcoming,
          special events done/upcoming. Uses careerStats baseline + the
          schedule JSON deltas. */}
      <LiveCounter events={events} careerStats={SITE_CONFIG.eli.careerStats} />

      {/* On-sale strip — current Eli M&G + Photobook products with a
          live sale window. Auto-hides when no sales are active. */}
      <OnSaleStrip />

      {/* Setlist grid — every theater setlist Eli has performed in,
          merged from ELI_THEATER metadata + lifetime per-setlist counts
          from the API (eli-setlists.json snapshot). */}
      <SetlistGrid />

      {/* Toolbar — sticky search + filter chips. Sits just under the
          navbar so users can re-filter while scrolling through long
          event lists. backdrop-blur keeps it legible as content
          scrolls underneath. */}
      <div
        className="sticky top-[72px] z-30 mb-8 md:mb-10 bg-[color:var(--retro-bg-primary)]/85 backdrop-blur-md border-y border-[color:var(--retro-brown-dark)]/10"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 py-3 md:py-4 flex flex-col md:flex-row md:items-center gap-3">
          {/* Search input — live filter on title + venue substring */}
          <label className="relative flex-shrink-0 md:w-72">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul / venue…"
              className="w-full pl-9 pr-9 py-2 rounded-full bg-white border border-[color:var(--retro-brown-dark)]/15 focus:border-[color:var(--retro-burgundy)]/50 focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/15 focus:outline-none text-sm text-[color:var(--retro-text-primary)] placeholder-[color:var(--color-text-muted)] transition-colors"
              aria-label="Cari jadwal"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[color:var(--retro-brown-dark)]/8 hover:bg-[color:var(--retro-burgundy)]/15 hover:text-[color:var(--retro-burgundy)] flex items-center justify-center text-[color:var(--color-text-muted)] text-sm transition-colors"
              >
                <i className="ri-close-line" />
              </button>
            )}
          </label>

          {/* Filter chips — same as before, now in a sticky toolbar */}
          <div
            className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            role="tablist"
            aria-label="Filter jadwal"
          >
            {FILTERS.map((opt) => {
              const active = opt.id === filter;
              const count = counts[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(opt.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all border ${
                    active
                      ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)] shadow-md'
                      : 'bg-white text-[color:var(--retro-text-secondary)] border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)]'
                  }`}
                >
                  <i className={opt.icon} />
                  {opt.label}
                  {count > 0 && (
                    <span
                      className={`tabular-nums text-[9px] px-1.5 py-0.5 rounded-full ${
                        active
                          ? 'bg-[color:var(--retro-cream)]/20 text-[color:var(--retro-cream)]'
                          : 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <section ref={gridRef} className="px-5 sm:px-6 md:px-12 lg:px-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
          {calendarError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6 text-sm text-red-700">
              <i className="ri-error-warning-line mr-2 align-[-2px]" />
              Gagal memuat schedule: {calendarError}
            </div>
          )}

          {!calendar && !calendarError && (
            <div className="space-y-12 md:space-y-16">
              {Array.from({ length: 2 }).map((_, groupIdx) => (
                <div key={groupIdx}>
                  {/* Month header skeleton — mirrors the real header
                      so the layout doesn't jump when data lands */}
                  <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-[color:var(--retro-brown-dark)]/15">
                    <div className="h-8 w-32 md:h-9 md:w-44 rounded bg-[color:var(--retro-brown-dark)]/10 animate-pulse" />
                    <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
                    <div className="h-3 w-16 rounded bg-[color:var(--retro-brown-dark)]/10 animate-pulse" />
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: groupIdx === 0 ? 4 : 2 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-4 animate-pulse"
                      >
                        <div className="flex items-stretch gap-3">
                          {/* Date plate skeleton */}
                          <div className="flex-shrink-0 w-14 border-r border-[color:var(--retro-brown-dark)]/10 pr-3 space-y-1.5">
                            <div className="h-7 rounded bg-[color:var(--retro-brown-dark)]/15" />
                            <div className="h-2 rounded bg-[color:var(--retro-brown-dark)]/10 w-3/4 mx-auto" />
                            <div className="h-2 rounded bg-[color:var(--retro-brown-dark)]/10 w-2/3 mx-auto" />
                          </div>
                          {/* Content skeleton */}
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3 w-20 rounded bg-[color:var(--retro-burgundy)]/15" />
                            <div className="h-4 w-5/6 rounded bg-[color:var(--retro-brown-dark)]/15" />
                            <div className="h-3 w-2/3 rounded bg-[color:var(--retro-brown-dark)]/10" />
                            <div className="h-3 w-1/2 rounded bg-[color:var(--retro-brown-dark)]/10" />
                            <div className="pt-3 mt-2 border-t border-[color:var(--retro-brown-dark)]/8">
                              <div className="h-6 w-24 rounded-full bg-[color:var(--retro-burgundy)]/15" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {calendar && monthGroups.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-burgundy)]/[0.02] p-10 md:p-14 text-center">
              <i className="ri-calendar-todo-line text-5xl text-[color:var(--retro-burgundy)]/30 mb-4 inline-block" />
              <p className="font-bold text-[color:var(--retro-text-primary)] text-base md:text-lg">
                {filter === 'past'
                  ? 'Belum ada riwayat tercatat di sumber ini.'
                  : filter === 'mg'
                  ? 'Belum ada Meet & Greet Eli yang dijadwalkan.'
                  : filter === 'vc'
                  ? 'Belum ada Video Call Eli yang dijadwalkan.'
                  : filter === 'show'
                  ? 'Belum ada show teater Eli yang dijadwalkan.'
                  : 'Belum ada show Eli yang dijadwalkan ke depan.'}
              </p>
              <p className="text-sm text-[color:var(--color-text-muted)] mt-2 max-w-md mx-auto">
                Auto-refresh tiap 6 jam. Jadwal teater biasanya diumumkan 2–4 minggu sebelumnya.
              </p>
            </div>
          )}

          {calendar && monthGroups.length > 0 && (
            <div className="space-y-12 md:space-y-16">
              {monthGroups.map((group, groupIdx) => (
                <div key={group.key}>
                  <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-[color:var(--retro-brown-dark)]/15">
                    <span className="font-header text-3xl md:text-4xl font-black text-[color:var(--retro-burgundy)] tracking-tighter capitalize">
                      {group.label}
                    </span>
                    <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] tabular-nums">
                      {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>
                  <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.events.map((entry, idx) => (
                      <li
                        key={`${entry.code || entry.schedule_id}-${entry.date}-${entry.start_time || idx}`}
                        style={{ transitionDelay: `${(groupIdx * 40 + idx * 50) % 600}ms` }}
                        className={`transition-all duration-700 ease-out ${
                          gridVisible
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-6'
                        }`}
                      >
                        <ScheduleEventCard entry={entry} dimmed={filter === 'past'} />
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}

          {/* Refresh footer */}
          {calendar && (
            <p className="mt-12 pt-6 border-t border-[color:var(--retro-brown-dark)]/10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2">
                <i className="ri-refresh-line" />
                Auto-refresh tiap 6 jam
              </span>
              {calendar.fetchedAt && (
                <span className="text-[color:var(--color-text-muted)]/70 normal-case tracking-normal font-bold">
                  Update {formatRefreshed(calendar.fetchedAt)}
                </span>
              )}
            </p>
          )}
        </div>
      </section>
    </main>
  );
};

export default SchedulePage;
