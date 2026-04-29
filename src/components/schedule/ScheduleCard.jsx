/**
 * ScheduleCard — Eli-specific schedule from jkt48.com (official API).
 *
 * Auto-scraped every 6h via GitHub Actions:
 *   .github/workflows/refresh-eli-schedule.yml runs scripts/scrape-
 *   eli-schedule.py against jkt48.com using a session cookie kept in
 *   repo secrets, and commits the result to public/data/eli-schedule.json.
 *
 * Each event lists Eli's confirmed appearance with the full Team Dream
 * (or all-team) cast, set list code, time, and a deep-link to the
 * official jkt48.com show page for ticket info.
 */

import React, { useEffect, useMemo, useState } from 'react';

const isUpcoming = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  // "Upcoming" = today midnight or later
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

const ScheduleCard = () => {
  const [calendar, setCalendar] = useState(null);
  const [calendarError, setCalendarError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-schedule.json', { cache: 'no-cache' })
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
          Show Eli Mendatang
        </p>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
          {upcoming.length} upcoming
        </span>
      </div>

      {calendarError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 mb-3 text-xs text-red-700">
          Gagal memuat schedule: {calendarError}
        </div>
      )}

      {!calendar && !calendarError && (
        <p className="text-sm text-[color:var(--color-text-muted)]">Memuat schedule…</p>
      )}

      {calendar && upcoming.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 p-8 text-center">
          <i className="ri-calendar-todo-line text-4xl text-[color:var(--retro-burgundy)]/30 mb-3 inline-block" />
          <p className="font-bold text-[color:var(--retro-text-primary)]">
            Belum ada show Eli yang dijadwalkan ke depan.
          </p>
          <p className="text-sm text-[color:var(--color-text-muted)] mt-1">
            Sumber langsung dari jkt48.com — auto-refresh tiap 6 jam.
            Cek lagi nanti, jadwal teater biasanya diumumkan 2–4 minggu sebelumnya.
          </p>
        </div>
      )}

      {calendar && upcoming.length > 0 && (
        <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcoming.map((entry, idx) => {
            const date = new Date(entry.date);
            const isMG = entry.kind === 'EXCLUSIVE';
            const primaryBadge = isMG
              ? (MG_CATEGORY_LABEL[entry.category] || 'M&G')
              : (TEAM_LABEL[entry.team] || entry.team);
            const eliJalur = (entry.eli_jalur || []).join(', ');
            return (
              <li key={`${entry.code || entry.schedule_id}-${entry.date}-${entry.start_time || idx}`}>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full p-4 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-md transition-all group"
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
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                          isMG
                            ? 'bg-[color:var(--retro-gold-light)]/30 text-[color:var(--retro-burgundy)]'
                            : 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]'
                        }`}>
                          <i className={isMG ? 'ri-user-heart-line' : 'ri-mic-line'} />
                          {primaryBadge}
                        </span>
                        {entry.is_birthday_show && (
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-[color:var(--retro-gold-light)]/30 text-[color:var(--retro-burgundy)]">
                            <i className="ri-cake-2-line mr-0.5" />Birthday
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight line-clamp-2">
                        {entry.title}
                      </p>
                      {(entry.start_time || entry.end_time) && (
                        <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-1 tabular-nums">
                          <i className="ri-time-line mr-1 align-[-2px]" />
                          {entry.start_time}{entry.end_time ? ` – ${entry.end_time}` : ''}
                        </p>
                      )}
                      <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-1">
                        <i className="ri-map-pin-line mr-1 align-[-2px]" />
                        {entry.venue}
                      </p>
                      {isMG && eliJalur && (
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)] mt-2 inline-flex items-center gap-1.5">
                          <i className="ri-arrow-right-circle-line" />
                          Eli di {eliJalur}
                        </p>
                      )}
                      {!isMG && entry.members && entry.members.length > 0 && (
                        <p className="text-[10px] text-[color:var(--color-text-muted)] leading-snug mt-2 line-clamp-1 group-hover:text-[color:var(--retro-burgundy)] transition-colors">
                          + {entry.members.length} member · klik untuk detail tiket
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      )}

      {calendar && (
        <p className="mt-5 pt-4 border-t border-[color:var(--retro-brown-dark)]/10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] flex items-center justify-between gap-2 flex-wrap">
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
  );
};

export default ScheduleCard;
