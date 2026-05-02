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
  const isMG = entry.kind === 'EXCLUSIVE';
  if (filter === 'mg') return isMG;
  if (filter === 'show') return !isMG;
  return true;
};

const ScheduleEventCard = ({ entry, dimmed }) => {
  const date = new Date(entry.date);
  const isMG = entry.kind === 'EXCLUSIVE';
  const isVC = entry.is_video_call === true;
  const isGeneral = entry.kind === 'GENERAL';
  const isEvent = entry.kind === 'EVENT' && !isVC;

  let primaryBadge;
  let badgeIcon;
  if (isMG) {
    primaryBadge = MG_CATEGORY_LABEL[entry.category] || 'M&G';
    badgeIcon = 'ri-user-heart-line';
  } else if (isVC) {
    primaryBadge = 'Video Call';
    badgeIcon = 'ri-vidicon-line';
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

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block h-full p-4 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-md transition-all group ${
        dimmed ? 'opacity-70' : ''
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
    return {
      all: upcoming.length,
      show: upcoming.filter((e) => e.kind !== 'EXCLUSIVE').length,
      mg: upcoming.filter((e) => e.kind === 'EXCLUSIVE').length,
      past: events.length - upcoming.length,
    };
  }, [events]);

  // Filtered + sorted: upcoming filters are chronological; past flips
  // to reverse-chronological so the most recent past show leads.
  const filtered = useMemo(() => {
    const past = filter === 'past';
    const pool = events
      .filter((e) => (past ? !isUpcoming(e.date) : isUpcoming(e.date)))
      .filter((e) => eventKindMatches(e, filter));
    return [...pool].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return past ? db - da : da - db;
    });
  }, [events, filter]);

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
        description="Daftar lengkap show teater dan Personal Meet & Greet Eli JKT48 (Helisma Putri). Auto-refresh dari jkt48.com setiap 6 jam."
      />

      {/* Editorial header */}
      <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-5 text-[color:var(--retro-burgundy)]">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] inline-flex items-center gap-2">
              <i className="ri-calendar-event-line text-base" />
              Schedule · Live
            </span>
            <span className="flex-1 h-px bg-[color:var(--retro-burgundy)]/30 max-w-[120px]" />
            {subtitle && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
                {subtitle}
              </span>
            )}
          </div>
          <h1 className="font-header text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-4xl">
            Jadwal Eli, <br />
            <span className="text-[color:var(--retro-burgundy)]">satu kalender penuh.</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            Show teater Team Dream, all-team event, dan Personal Meet &amp; Greet — disaring dari{' '}
            <a
              href="https://jkt48.com/schedule"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--retro-burgundy)] underline-offset-4 hover:underline"
            >
              jkt48.com
            </a>{' '}
            dengan cast list resmi yang sudah terverifikasi (Eli ada di lineup).
            Auto-refresh tiap 6 jam.
          </p>
          <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy)]/40 via-[color:var(--retro-brown-dark)]/10 to-transparent" />
        </div>
      </header>

      {/* Live stats — theater shows (baseline + delta), M&G done/upcoming,
          special events done/upcoming. Uses careerStats baseline + the
          schedule JSON deltas. */}
      <LiveCounter events={events} careerStats={SITE_CONFIG.eli.careerStats} />

      {/* Filter chips */}
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-8 md:mb-10">
        <div
          className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
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
      </section>

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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-44 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 animate-pulse"
                />
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
                  : filter === 'show'
                  ? 'Belum ada show teater Eli yang dijadwalkan.'
                  : 'Belum ada show Eli yang dijadwalkan ke depan.'}
              </p>
              <p className="text-sm text-[color:var(--color-text-muted)] mt-2 max-w-md mx-auto">
                Sumber langsung dari jkt48.com — auto-refresh tiap 6 jam.
                Jadwal teater biasanya diumumkan 2–4 minggu sebelumnya.
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

          {/* Source credit footer */}
          {calendar && (
            <p className="mt-12 pt-6 border-t border-[color:var(--retro-brown-dark)]/10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2">
                <i className="ri-refresh-line" />
                Auto-refresh tiap 6 jam · sumber{' '}
                <a
                  href="https://jkt48.com/schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--retro-burgundy)] hover:underline"
                >
                  jkt48.com (official)
                </a>
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
