/**
 * ScheduleCard — two-tier schedule display:
 *
 *   1. Eli (Confirmed)  — owner-curated entries from Firebase RTDB.
 *      These are appearances Eli is verified to be in (senbatsu list,
 *      announced unit songs, etc.).
 *   2. JKT48 Calendar    — auto-scraped from beritajkt48 every 6h via
 *      GitHub Actions (public/data/jkt48-calendar.json). General JKT48
 *      events with no member-specific filtering — provides context
 *      around Eli's confirmed dates.
 *
 * If Firebase isn't configured (or has no entries yet), the Eli tier
 * shows an empty-state explaining why. The general calendar still
 * renders from the static JSON.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { subscribeToEliSchedule } from '../../lib/eliSchedule';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const STATUS_LABEL = {
  confirmed: 'Konfirmasi',
  announced: 'Diumumkan',
  rumored: 'Rumor',
};

const STATUS_COLOR = {
  confirmed: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  announced: 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)]/30',
  rumored: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
};

const isUpcoming = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  // Treat anything from "today midnight" onward as upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
};

const ScheduleCard = () => {
  const [eliEntries, setEliEntries] = useState([]);
  const [calendar, setCalendar] = useState(null); // { events, fetchedAt, source } or null
  const [calendarError, setCalendarError] = useState(null);

  // Firebase live subscription for Eli's confirmed schedule
  useEffect(() => {
    const unsub = subscribeToEliSchedule(setEliEntries);
    return unsub;
  }, []);

  // Static JSON for the general JKT48 calendar (refreshed by GH Actions cron)
  useEffect(() => {
    let cancelled = false;
    fetch('/data/jkt48-calendar.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (!cancelled) setCalendar(data); })
      .catch((err) => { if (!cancelled) setCalendarError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const upcomingEli = useMemo(() => eliEntries.filter((e) => isUpcoming(e.date)).slice(0, 5), [eliEntries]);
  const upcomingCalendar = useMemo(
    () => (calendar?.events || []).filter((e) => isUpcoming(e.date)).slice(0, 8),
    [calendar],
  );

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      {/* — Eli tier (Firebase, manual) ----------------------------------- */}
      <section className="rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-6 md:p-7 relative overflow-hidden shadow-lg shadow-[color:var(--retro-burgundy)]/20">
        <div className="absolute -top-20 -right-20 w-[260px] h-[260px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] inline-flex items-center gap-2">
              <i className="ri-mic-line text-base" />
              Jadwal Eli — Confirmed
            </p>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/50">
              {upcomingEli.length} upcoming
            </span>
          </div>

          {upcomingEli.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[color:var(--retro-cream)]/20 p-5 text-center">
              <i className="ri-calendar-line text-3xl text-[color:var(--retro-gold-light)]/60 mb-2 inline-block" />
              <p className="font-bold text-sm mb-1">Belum ada jadwal Eli yang dikonfirmasi.</p>
              <p className="text-xs text-[color:var(--retro-cream)]/60 leading-snug">
                Owner Armeniaca akan update kalau ada announcement resmi.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {upcomingEli.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-stretch gap-3 p-3 rounded-xl bg-[color:var(--retro-cream)]/5 border border-[color:var(--retro-cream)]/10 hover:bg-[color:var(--retro-cream)]/10 transition-colors"
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-gold-light)]">
                      {formatDate(entry.date).split(',')[0]}
                    </p>
                    <p className="font-header text-2xl font-black text-[color:var(--retro-cream)] leading-none mt-1 tabular-nums">
                      {String(new Date(entry.date).getDate()).padStart(2, '0')}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/50">
                      {new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(entry.date))}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-full border ${STATUS_COLOR[entry.status] || STATUS_COLOR.announced}`}>
                        {STATUS_LABEL[entry.status] || 'Diumumkan'}
                      </span>
                      {entry.time && (
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/60 tabular-nums">
                          {entry.time}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-[color:var(--retro-cream)] leading-tight truncate">
                      {entry.title}
                    </p>
                    <p className="text-xs text-[color:var(--retro-cream)]/60 leading-snug mt-0.5 truncate">
                      {entry.venue}{entry.setlist ? ` · ${entry.setlist}` : ''}
                    </p>
                    {entry.notes && (
                      <p className="text-[11px] text-[color:var(--retro-cream)]/55 mt-1 leading-snug">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 pt-3 border-t border-[color:var(--retro-cream)]/10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/50">
            Sumber: kurasi manual Armeniaca
          </p>
        </div>
      </section>

      {/* — General JKT48 calendar (auto-scraped) ------------------------- */}
      <section className="rounded-2xl bg-[color:var(--retro-bg-primary)] border border-[color:var(--retro-brown-dark)]/15 p-6 md:p-7">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
            <i className="ri-calendar-event-line text-base" />
            Kalender JKT48
          </p>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
            {upcomingCalendar.length} upcoming
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

        {calendar && upcomingCalendar.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 p-5 text-center">
            <i className="ri-calendar-todo-line text-3xl text-[color:var(--retro-burgundy)]/30 mb-2 inline-block" />
            <p className="font-bold text-sm text-[color:var(--retro-text-primary)]">
              Belum ada event JKT48 yang dijadwalkan ke depan.
            </p>
            <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
              Cek lagi nanti — sumber akan auto-refresh tiap 6 jam.
            </p>
          </div>
        )}

        {calendar && upcomingCalendar.length > 0 && (
          <ol className="space-y-2.5">
            {upcomingCalendar.map((entry, idx) => (
              <li
                key={`${entry.date}-${entry.title}-${idx}`}
                className="flex items-stretch gap-3 p-3 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 transition-colors"
              >
                <div className="flex-shrink-0 w-14 text-center border-r border-[color:var(--retro-brown-dark)]/10 pr-2">
                  <p className="font-header text-2xl font-black text-[color:var(--retro-burgundy)] leading-none tabular-nums">
                    {String(new Date(entry.date).getDate()).padStart(2, '0')}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mt-1">
                    {new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(entry.date))}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight truncate">
                    {entry.title}
                  </p>
                  <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-0.5 truncate">
                    {entry.location}
                  </p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
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
          <p className="mt-4 pt-3 border-t border-[color:var(--retro-brown-dark)]/10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
            Sumber: beritajkt48 · refresh otomatis tiap 6 jam
          </p>
        )}
      </section>
    </div>
  );
};

export default ScheduleCard;
