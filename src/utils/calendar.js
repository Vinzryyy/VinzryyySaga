/**
 * calendar.js — pure helpers shared by the /schedule list + calendar views.
 *
 * Day bucketing is anchored to WIB (Asia/Jakarta) so a 19:00 WIB show
 * lands on the same date for every viewer, wherever they are. Month
 * grids are built with UTC arithmetic so DST in the viewer's zone can
 * never shift a cell.
 */

export const JAKARTA_TZ = 'Asia/Jakarta';

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: JAKARTA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const pad2 = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' of the instant in WIB, or null for invalid input. */
export const dayKeyWIB = (input) => {
  if (input == null || input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return dayKeyFormatter.format(d);
};

/** { year, month } (month 0-based) of the instant in WIB. */
export const monthOfWIB = (input) => {
  const key = dayKeyWIB(input);
  if (!key) return null;
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
};

export const makeDayKey = (year, month, day) => `${year}-${pad2(month + 1)}-${pad2(day)}`;

export const addMonths = ({ year, month }, delta) => {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

export const compareMonths = (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month);

/**
 * Event category used for filter chips and calendar dots.
 *   vc    — video call (incl. photobook bonus VC sessions)
 *   mg    — face-to-face per-fan sessions (2Shot, M&G, photocard)
 *   event — off-site / special events that aren't theater shows
 *   show  — theater shows
 */
export const eventType = (entry) => {
  const isExclusive = entry?.kind === 'EXCLUSIVE';
  const isPhotobookVC = isExclusive && entry.category === 'DIGITAL_PHOTOBOOK';
  if (entry?.is_video_call === true || isPhotobookVC) return 'vc';
  if (isExclusive) return 'mg';
  if (entry?.kind === 'GENERAL' || entry?.kind === 'EVENT') return 'event';
  return 'show';
};

/**
 * Filter-chip matching. 'show' keeps its original meaning (anything that
 * isn't a per-fan session or a video call), so EVENT/GENERAL still count
 * as "Show Teater" in the list — unchanged behaviour from before.
 */
export const eventKindMatches = (entry, filter) => {
  if (filter === 'all' || filter === 'past') return true;
  const type = eventType(entry);
  if (filter === 'vc') return type === 'vc';
  if (filter === 'mg') return type === 'mg';
  if (filter === 'show') return type === 'show' || type === 'event';
  return true;
};

/** Map<'YYYY-MM-DD', event[]> keyed by WIB date, each day sorted by time. */
export const groupEventsByDay = (events) => {
  const map = new Map();
  (events || []).forEach((e) => {
    const key = dayKeyWIB(e.date);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  });
  map.forEach((list) =>
    list.sort((a, b) => {
      const ta = a.start_time || '';
      const tb = b.start_time || '';
      if (ta !== tb) return ta < tb ? -1 : 1;
      return new Date(a.date) - new Date(b.date);
    }),
  );
  return map;
};

/**
 * Monday-first month grid. Returns full weeks only (5 or 6 rows), each
 * cell `{ key, year, month, day, inMonth }`.
 */
export const buildMonthGrid = (year, month) => {
  const first = new Date(Date.UTC(year, month, 1));
  // getUTCDay: 0 = Sunday … 6 = Saturday → shift so Monday = 0.
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < total; i += 1) {
    const d = new Date(Date.UTC(year, month, 1 - lead + i));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    cells.push({ key: makeDayKey(y, m, day), year: y, month: m, day, inMonth: m === month });
  }
  return cells;
};

/**
 * Navigation range for the calendar: earliest/latest month that has an
 * event, always widened to include the current month.
 */
export const monthRange = (events, now = new Date()) => {
  const current = monthOfWIB(now);
  let min = current;
  let max = current;
  (events || []).forEach((e) => {
    const m = monthOfWIB(e.date);
    if (!m) return;
    if (compareMonths(m, min) < 0) min = m;
    if (compareMonths(m, max) > 0) max = m;
  });
  return { min, max };
};
