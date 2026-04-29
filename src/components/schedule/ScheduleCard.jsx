/**
 * ScheduleCard — JKT48 general events calendar.
 *
 * Auto-scraped from beritajkt48 every 6h via GitHub Actions
 * (.github/workflows/refresh-calendar.yml writes to
 * public/data/jkt48-calendar.json). Frontend reads the static JSON,
 * filters to upcoming events, and renders a tidy timeline.
 *
 * NOTE: source data is general JKT48 events (not Eli-specific) — cast
 * lists are not in the source. Any "Eli appears in X" tagging would
 * need either the JKT48Connect API (free key required) or owner-side
 * manual curation; this iteration intentionally skips both for a
 * zero-maintenance, fully-automatic widget.
 */

import React, { useEffect, useMemo, useState } from 'react';

const isUpcoming = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  // Treat anything from "today midnight" onward as upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
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

const ScheduleCard = () => {
  const [calendar, setCalendar] = useState(null); // { events, fetchedAt, source } or null
  const [calendarError, setCalendarError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/jkt48-calendar.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (!cancelled) setCalendar(data); })
      .catch((err) => { if (!cancelled) setCalendarError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const upcoming = useMemo(
    () => (calendar?.events || []).filter((e) => isUpcoming(e.date)),
    [calendar],
  );

  return (
    <div className="rounded-2xl bg-[color:var(--retro-bg-primary)] border border-[color:var(--retro-brown-dark)]/15 p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[color:var(--retro-brown-dark)]/10">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
          <i className="ri-calendar-event-line text-base" />
          Event JKT48 Mendatang
        </p>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
          {upcoming.length} upcoming
        </span>
      </div>

      {calendarError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 mb-3 text-xs text-red-700">
          Gagal memuat kalender: {calendarError}
        </div>
      )}

      {!calendar && !calendarError && (
        <p className="text-sm text-[color:var(--color-text-muted)]">Memuat kalender…</p>
      )}

      {calendar && upcoming.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 p-8 text-center">
          <i className="ri-calendar-todo-line text-4xl text-[color:var(--retro-burgundy)]/30 mb-3 inline-block" />
          <p className="font-bold text-[color:var(--retro-text-primary)]">
            Belum ada event JKT48 yang dijadwalkan ke depan.
          </p>
          <p className="text-sm text-[color:var(--color-text-muted)] mt-1">
            Sumber akan auto-refresh tiap 6 jam — cek lagi nanti.
          </p>
        </div>
      )}

      {calendar && upcoming.length > 0 && (
        <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcoming.map((entry, idx) => (
            <li
              key={`${entry.date}-${entry.title}-${idx}`}
              className="flex items-stretch gap-3 p-4 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex-shrink-0 w-14 text-center border-r border-[color:var(--retro-brown-dark)]/10 pr-3">
                <p className="font-header text-3xl font-black text-[color:var(--retro-burgundy)] leading-none tabular-nums">
                  {String(new Date(entry.date).getDate()).padStart(2, '0')}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mt-1">
                  {new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(entry.date))}
                </p>
                <p className="text-[9px] font-black tabular-nums text-[color:var(--color-text-muted)] mt-0.5">
                  {new Date(entry.date).getFullYear()}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight">
                  {entry.title}
                </p>
                <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-1">
                  {entry.location}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-[color:var(--retro-burgundy)]/8 text-[color:var(--retro-burgundy)]/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {calendar && (
        <p className="mt-5 pt-4 border-t border-[color:var(--retro-brown-dark)]/10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2">
            <i className="ri-refresh-line" />
            Auto-refresh tiap 6 jam · sumber{' '}
            <a
              href="https://github.com/beritajkt48/event"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--retro-burgundy)] hover:underline"
            >
              beritajkt48
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
  );
};

export default ScheduleCard;
