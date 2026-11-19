/**
 * MonthCalendar — month-grid view of Eli's schedule for /schedule.
 *
 * Props:
 *   events      — already filtered (type chips + search) event list,
 *                 past and upcoming mixed; the grid decides what's past.
 *   renderEvent — (entry, { isPast }) => node, so the page can reuse its
 *                 own ScheduleEventCard in the day panel.
 *
 * Days are bucketed in WIB (see utils/calendar). Monday-first grid,
 * roving-tabindex keyboard nav (arrows / Home / End / PageUp / PageDown),
 * dots per event type, day panel beside the grid on lg+ and below it on
 * smaller screens.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  buildMonthGrid,
  compareMonths,
  dayKeyWIB,
  eventType,
  groupEventsByDay,
  makeDayKey,
  monthOfWIB,
  monthRange,
} from '../../utils/calendar';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MAX_DOTS = 3;

export const TYPE_META = {
  show: { label: 'Show Teater', color: 'var(--retro-burgundy)' },
  mg: { label: 'Meet & Greet', color: 'var(--retro-gold)' },
  vc: { label: 'Video Call', color: '#3b82f6' },
  event: { label: 'Event / Off-site', color: 'var(--retro-brown-dark)' },
};

const monthTitleFmt = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayTitleFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const ariaDayFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const keyToUTCDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const shiftKey = (key, days) => {
  const d = keyToUTCDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return makeDayKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const keyToMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
};

const MonthCalendar = ({ events, renderEvent }) => {
  // `now` is captured once per mount — the page isn't long-lived enough
  // for midnight rollover to matter.
  const [now] = useState(() => new Date());
  const todayKey = dayKeyWIB(now);
  const range = useMemo(() => monthRange(events, now), [events, now]);
  const byDay = useMemo(() => groupEventsByDay(events), [events]);

  const [visible, setVisible] = useState(() => monthOfWIB(now));
  const [selectedKey, setSelectedKey] = useState(null);
  const [focusKey, setFocusKey] = useState(todayKey);
  const gridRef = useRef(null);
  const wantFocusRef = useRef(false);

  const cells = useMemo(() => buildMonthGrid(visible.year, visible.month), [visible]);

  // Default selection when nothing is picked (or the pick left the
  // visible month): today if it has events, else the first upcoming day
  // with events this month, else the last past day with events.
  const activeKey = useMemo(() => {
    const inVisible = (k) => k && compareMonths(keyToMonth(k), visible) === 0;
    if (inVisible(selectedKey)) return selectedKey;
    const monthKeys = cells.filter((c) => c.inMonth && byDay.has(c.key)).map((c) => c.key);
    if (monthKeys.includes(todayKey)) return todayKey;
    return monthKeys.find((k) => k >= todayKey) || monthKeys[monthKeys.length - 1] || null;
  }, [selectedKey, visible, cells, byDay, todayKey]);

  const canPrev = compareMonths(visible, range.min) > 0;
  const canNext = compareMonths(visible, range.max) < 0;

  const goMonth = (delta) => {
    const target = addMonths(visible, delta);
    if (compareMonths(target, range.min) < 0 || compareMonths(target, range.max) > 0) return;
    setVisible(target);
    setFocusKey(makeDayKey(target.year, target.month, 1));
  };

  const goToday = () => {
    setVisible(monthOfWIB(now));
    setSelectedKey(byDay.has(todayKey) ? todayKey : null);
    setFocusKey(todayKey);
  };

  // Keep the roving focus target inside the visible month.
  const effectiveFocusKey =
    focusKey && compareMonths(keyToMonth(focusKey), visible) === 0
      ? focusKey
      : activeKey || makeDayKey(visible.year, visible.month, 1);

  useEffect(() => {
    if (!wantFocusRef.current) return;
    wantFocusRef.current = false;
    gridRef.current
      ?.querySelector(`[data-day="${effectiveFocusKey}"]`)
      ?.focus();
  }, [effectiveFocusKey, visible]);

  const moveFocus = (nextKey) => {
    const nextMonth = keyToMonth(nextKey);
    if (compareMonths(nextMonth, range.min) < 0 || compareMonths(nextMonth, range.max) > 0) return;
    wantFocusRef.current = true;
    if (compareMonths(nextMonth, visible) !== 0) setVisible(nextMonth);
    setFocusKey(nextKey);
  };

  const onGridKeyDown = (e) => {
    const k = effectiveFocusKey;
    const dow = (keyToUTCDate(k).getUTCDay() + 6) % 7;
    const map = {
      ArrowLeft: () => shiftKey(k, -1),
      ArrowRight: () => shiftKey(k, 1),
      ArrowUp: () => shiftKey(k, -7),
      ArrowDown: () => shiftKey(k, 7),
      Home: () => shiftKey(k, -dow),
      End: () => shiftKey(k, 6 - dow),
      PageUp: () => {
        const m = addMonths(keyToMonth(k), -1);
        return makeDayKey(m.year, m.month, 1);
      },
      PageDown: () => {
        const m = addMonths(keyToMonth(k), 1);
        return makeDayKey(m.year, m.month, 1);
      },
    };
    if (!map[e.key]) return;
    e.preventDefault();
    moveFocus(map[e.key]());
  };

  const monthEventCount = cells.reduce(
    (n, c) => n + (c.inMonth ? byDay.get(c.key)?.length || 0 : 0),
    0,
  );
  const activeEvents = activeKey ? byDay.get(activeKey) || [] : [];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8 items-start">
      {/* ── Month grid ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-3 sm:p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4 md:mb-5">
          <h2
            className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-burgundy)] capitalize flex-1 min-w-0 truncate"
            aria-live="polite"
          >
            {monthTitleFmt.format(new Date(Date.UTC(visible.year, visible.month, 15)))}
          </h2>
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] border border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)] transition-colors"
          >
            Hari ini
          </button>
          <button
            type="button"
            onClick={() => goMonth(-1)}
            disabled={!canPrev}
            aria-label="Bulan sebelumnya"
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <i className="ri-arrow-left-s-line text-lg" />
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            disabled={!canNext}
            aria-label="Bulan berikutnya"
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <i className="ri-arrow-right-s-line text-lg" />
          </button>
        </div>

        <div
          ref={gridRef}
          role="grid"
          aria-label="Kalender jadwal Eli"
          onKeyDown={onGridKeyDown}
          className="select-none"
        >
          <div role="row" className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                role="columnheader"
                className="text-center text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)] py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {weeks.map((week) => (
            <div role="row" key={week[0].key} className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
              {week.map((cell) => {
                const list = byDay.get(cell.key) || [];
                const isToday = cell.key === todayKey;
                const isPast = cell.key < todayKey;
                const isActive = cell.key === activeKey;
                const types = [...new Set(list.map(eventType))];
                const label = `${ariaDayFmt.format(keyToUTCDate(cell.key))}, ${
                  list.length ? `${list.length} acara` : 'tidak ada acara'
                }`;
                return (
                  <div role="gridcell" key={cell.key} aria-selected={isActive}>
                    <button
                      type="button"
                      data-day={cell.key}
                      tabIndex={cell.key === effectiveFocusKey ? 0 : -1}
                      aria-label={label}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => {
                        setSelectedKey(cell.key);
                        setFocusKey(cell.key);
                        if (!cell.inMonth) setVisible(keyToMonth(cell.key));
                      }}
                      className={`relative w-full aspect-square sm:aspect-[5/4] rounded-lg sm:rounded-xl flex flex-col items-center sm:items-start justify-between p-1 sm:p-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)] ${
                        isActive
                          ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
                          : list.length
                          ? 'bg-[color:var(--retro-burgundy)]/[0.06] hover:bg-[color:var(--retro-burgundy)]/[0.12]'
                          : 'hover:bg-[color:var(--retro-brown-dark)]/[0.04]'
                      } ${!cell.inMonth ? 'opacity-35' : isPast && !isActive ? 'opacity-60' : ''} ${
                        isToday && !isActive ? 'ring-2 ring-[color:var(--retro-gold)]' : ''
                      }`}
                    >
                      <span
                        className={`text-xs sm:text-sm font-black tabular-nums leading-none ${
                          isActive ? '' : 'text-[color:var(--retro-text-primary)]'
                        }`}
                      >
                        {cell.day}
                      </span>
                      {list.length > 0 && (
                        <span className="flex items-center gap-0.5 sm:gap-1" aria-hidden="true">
                          {types.slice(0, MAX_DOTS).map((t) => (
                            <span
                              key={t}
                              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isActive ? 'ring-1 ring-[color:var(--retro-cream)]' : ''}`}
                              style={{ backgroundColor: TYPE_META[t].color }}
                            />
                          ))}
                          {list.length > MAX_DOTS && (
                            <span className="hidden sm:inline text-[9px] font-black tabular-nums leading-none ml-0.5">
                              +{list.length - MAX_DOTS}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <ul className="mt-4 pt-4 border-t border-[color:var(--retro-brown-dark)]/10 flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <li
              key={key}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[color:var(--retro-text-muted)]"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[color:var(--retro-text-muted)]">
            <span className="w-3 h-3 rounded ring-2 ring-[color:var(--retro-gold)]" />
            Hari ini (WIB)
          </li>
        </ul>
      </div>

      {/* ── Day panel ──────────────────────────────────────────── */}
      <aside
        className="lg:sticky lg:top-[150px] rounded-2xl bg-[color:var(--retro-cream)] border border-[color:var(--retro-burgundy)]/15 p-4 sm:p-5"
        aria-live="polite"
      >
        {activeKey ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-1">
              {activeKey === todayKey ? 'Hari ini' : activeKey < todayKey ? 'Sudah berlalu' : 'Jadwal'}
            </p>
            <h3 className="font-header text-xl sm:text-2xl font-black tracking-tight text-[color:var(--retro-text-primary)] capitalize mb-4">
              {dayTitleFmt.format(keyToUTCDate(activeKey))}
            </h3>
            {activeEvents.length > 0 ? (
              <ol className="space-y-3">
                {activeEvents.map((entry, idx) => (
                  <li key={`${entry.code || entry.schedule_id}-${entry.date}-${entry.start_time || idx}`}>
                    {renderEvent(entry, { isPast: activeKey < todayKey })}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[color:var(--retro-text-muted)]">
                Tidak ada jadwal Eli di tanggal ini.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <i className="ri-calendar-todo-line text-4xl text-[color:var(--retro-burgundy)]/30 mb-3 inline-block" />
            <p className="font-bold text-[color:var(--retro-text-primary)]">
              {monthEventCount === 0 ? 'Belum ada jadwal bulan ini.' : 'Pilih tanggal di kalender.'}
            </p>
            <p className="text-xs text-[color:var(--retro-text-muted)] mt-1.5">
              {canNext
                ? 'Coba geser ke bulan berikutnya.'
                : 'Jadwal teater biasanya diumumkan 2–4 minggu sebelumnya.'}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};

export default MonthCalendar;
