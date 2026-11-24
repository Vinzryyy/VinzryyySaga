/**
 * Rekap Live — an automatic summary of each of Eli's IDN / SHOWROOM lives
 * (/rekap-live, /rekap-live/:id), published by EliRecorder minutes after
 * the live ends.
 *
 * Numbers and patterns only: length, comments, how busy each minute was,
 * the liveliest minutes, and the words viewers typed / Eli talked about
 * most. No video, no viewer names, no transcript excerpts (automatic
 * speech recognition mishears; a recap must never put words in Eli's mouth).
 *
 * Data: public/data/live-recaps.json → { recaps: [Recap] }
 *   Recap = { id: 'YYYY-MM-DD-idn' (+ '-2' for a second live that day),
 *             date, platform, title, startedAt, durationSec, comments,
 *             commenters, peak: { minute, count } | null, perMinute: [n],
 *             moments: [{ t, reasons: [text], commentCount }],
 *             chatWords: [[word, n]], chatEmoji: [[emoji, n]],
 *             talkWords: [[word, n]], publishedAt }
 *
 * Pure functions shared by the page, EliRecorder (the publisher) and tests.
 */

export const RECAP_ID_RE = /^\d{4}-\d{2}-\d{2}-(idn|showroom)(-\d{1,2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PLATFORMS = new Set(['idn', 'showroom']);

const isCount = (n) => Number.isInteger(n) && n >= 0;
const isPairs = (a, valid) => Array.isArray(a) && a.length <= 20 && a.every((p) => Array.isArray(p) && p.length === 2 && valid(p[0]) && isCount(p[1]));
const isWord = (w) => typeof w === 'string' && w.length >= 2 && w.length <= 30;
const isEmoji = (e) => typeof e === 'string' && e.length >= 1 && e.length <= 12;

/** Problems with a recap (English, for logs); empty = valid. */
export const recapProblems = (r) => {
  const p = [];
  if (!r || typeof r !== 'object') return ['not an object'];
  if (!RECAP_ID_RE.test(String(r.id))) p.push('id');
  if (!DATE_RE.test(String(r.date)) || !String(r.id).startsWith(r.date)) p.push('date');
  if (!PLATFORMS.has(r.platform)) p.push('platform');
  if (typeof r.title !== 'string' || r.title.length > 160) p.push('title');
  if (!isCount(r.durationSec) || r.durationSec < 60) p.push('durationSec');
  if (!isCount(r.comments) || !isCount(r.commenters)) p.push('counts');
  if (!Array.isArray(r.perMinute) || r.perMinute.length > 600 || !r.perMinute.every(isCount)) p.push('perMinute');
  if (!Array.isArray(r.moments) || r.moments.length > 5 || !r.moments.every((m) => Number.isFinite(m.t) && Array.isArray(m.reasons))) p.push('moments');
  if (!isPairs(r.chatWords, isWord) || !isPairs(r.talkWords, isWord) || !isPairs(r.chatEmoji, isEmoji)) p.push('words');
  return p;
};

/** Valid recaps, newest first. */
export const publicRecaps = (data) =>
  (Array.isArray(data?.recaps) ? data.recaps : [])
    .filter((r) => recapProblems(r).length === 0)
    .sort((a, b) => String(b.startedAt || b.date).localeCompare(String(a.startedAt || a.date)));

/** 2411 → "40 menit", 4980 → "1 jam 23 menit". */
export const fmtDuration = (sec) => {
  const m = Math.round((Number(sec) || 0) / 60);
  return m >= 60 ? `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} menit` : ''}` : `${m} menit`;
};

/** Average comments per minute, one decimal. */
export const perMinuteAvg = (r) => (r.durationSec ? Math.round((r.comments / (r.durationSec / 60)) * 10) / 10 : 0);

/**
 * The recap a note belongs to. Notes from EliRecorder carry the recording's
 * startedAt, which is the recap's own. Older notes fall back to: same day +
 * platform, long enough to contain the minute, same title, then the longest
 * (a day with a 1-minute test live and a real one picks the real one).
 */
export const recapForNote = (recaps, note) => {
  if (!note) return null;
  const list = recaps || [];
  if (note.startedAt) {
    const exact = list.find((r) => r.startedAt === note.startedAt);
    if (exact) return exact;
  }
  const fits = list.filter((r) => r.date === note.date && r.platform === note.platform && r.durationSec >= note.at);
  const score = (r) => (note.liveTitle && r.title === note.liveTitle ? 1e7 : 0) + r.durationSec;
  return fits.reduce((best, r) => (best === null || score(r) > score(best) ? r : best), null);
};

/** Eli Notes written about this live. `recaps` = all recaps, to tell two lives on one day apart. */
export const notesForRecap = (notes, recap, recaps = [recap]) =>
  (notes || []).filter((n) => recapForNote(recaps, n)?.id === recap.id);

/** The Eli Note (if any) within `window` seconds of a moment. */
export const noteNear = (notes, t, window = 90) =>
  (notes || []).find((n) => Math.abs(n.at - t) <= window) || null;

// ── Used by the publisher (EliRecorder) ──────────────────────────────

// Words that should never appear on the site even if viewers typed them a lot.
const BLOCK = /^(anj(i|e)ng|anjir|bangsat|babi|kontol|memek|ngentot|goblok|tolol|bego|kampret|asu|jancok|tai|fuck|shit|bitch)$/i;

/**
 * Removes anything that could identify a viewer, and rude words: a word is
 * dropped when it equals or is part of a commenter's username (people often
 * get called by their handle), or when it is blocklisted.
 */
export const scrubWords = (pairs, usernames) => {
  const handles = (usernames || []).map((u) => String(u).toLowerCase()).filter(Boolean);
  const parts = new Set(handles.flatMap((u) => u.split(/[^a-z0-9]+/).filter((x) => x.length >= 3)));
  return (pairs || []).filter(([w]) => {
    const lw = String(w).toLowerCase();
    if (BLOCK.test(lw)) return false;
    if (parts.has(lw)) return false;
    return !handles.some((h) => h.length >= 4 && (h === lw || (lw.length >= 4 && h.includes(lw))));
  });
};

/** Id for a new recap: date-platform, with -2, -3… when that day already has one from another live. */
export const recapId = (existing, date, platform, startedAt) => {
  const base = `${date}-${platform}`;
  const same = (existing || []).find((r) => r.startedAt === startedAt);
  if (same) return same.id;
  const taken = new Set((existing || []).map((r) => r.id));
  if (!taken.has(base)) return base;
  for (let k = 2; k < 100; k++) if (!taken.has(`${base}-${k}`)) return `${base}-${k}`;
  return `${base}-99`;
};

// ── Context: comparisons, records, calendar, patterns ────────────────

const avg = (xs) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);
const peakOf = (r) => r.peak?.count || 0;
const maxBy = (list, f) => list.reduce((best, r) => (best === null || f(r) > f(best) ? r : best), null);

/**
 * Short badges that put one live in context: busier/longer than usual,
 * all-time records, longest of the month. Needs a few lives to compare with.
 * → [{ icon, text }]
 */
export const recapInsights = (recaps, recap) => {
  const out = [];
  const others = (recaps || []).filter((r) => r.id !== recap.id);
  const all = [...others, recap];
  if (all.length >= 3) {
    if (maxBy(all, (r) => r.comments) === recap) out.push({ icon: 'ri-trophy-line', text: 'Komentar terbanyak sepanjang arsip' });
    if (maxBy(all, (r) => r.durationSec) === recap) out.push({ icon: 'ri-timer-line', text: 'Live terlama sepanjang arsip' });
    if (maxBy(all, peakOf) === recap) out.push({ icon: 'ri-flashlight-line', text: 'Menit terheboh sepanjang arsip' });
  }
  if (others.length >= 2) {
    const ratio = recap.comments / Math.max(1, avg(others.map((r) => r.comments)));
    if (ratio >= 1.15) out.push({ icon: 'ri-fire-line', text: `${Math.round((ratio - 1) * 100)}% lebih ramai dari rata-rata` });
    const dur = recap.durationSec / Math.max(1, avg(others.map((r) => r.durationSec)));
    if (dur >= 1.3 && !out.some((b) => b.text.startsWith('Live terlama'))) out.push({ icon: 'ri-time-line', text: 'Lebih lama dari biasanya' });
  }
  const month = recap.date.slice(0, 7);
  const sameMonth = all.filter((r) => r.date.startsWith(month));
  if (sameMonth.length >= 2 && maxBy(sameMonth, (r) => r.durationSec) === recap && !out.some((b) => b.text.startsWith('Live terlama'))) {
    out.push({ icon: 'ri-calendar-check-line', text: 'Live terlama bulan ini' });
  }
  return out.slice(0, 4);
};

/** All-time records (needs 2+ lives): { longest, mostComments, hottest } recaps. */
export const recapRecords = (recaps) => {
  const list = recaps || [];
  if (list.length < 2) return null;
  return { longest: maxBy(list, (r) => r.durationSec), mostComments: maxBy(list, (r) => r.comments), hottest: maxBy(list, peakOf) };
};

const DAY_MS = 86_400_000;
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * GitHub-style calendar ending at `endDate` (YYYY-MM-DD): `weeks` columns of
 * 7 days (Monday first). → [[{ date, lives, minutes, ids } | null (future)]].
 */
export const liveCalendar = (recaps, endDate, weeks = 26) => {
  const byDay = new Map();
  for (const r of recaps || []) {
    const d = byDay.get(r.date) || { lives: 0, minutes: 0, ids: [] };
    d.lives += 1;
    d.minutes += Math.round(r.durationSec / 60);
    d.ids.push(r.id);
    byDay.set(r.date, d);
  }
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const mondayIdx = (new Date(end).getUTCDay() + 6) % 7; // 0 = Monday
  const start = end - (mondayIdx + (weeks - 1) * 7) * DAY_MS;
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const ms = start + (w * 7 + d) * DAY_MS;
      const date = isoDay(ms);
      col.push(ms > end ? null : { date, ...(byDay.get(date) || { lives: 0, minutes: 0, ids: [] }) });
    }
    cols.push(col);
  }
  return cols;
};

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Favourite weekday and hour (WIB) to go live, once there are 4+ lives. → { weekday, hour } | null */
export const livePattern = (recaps) => {
  const list = (recaps || []).filter((r) => r.startedAt);
  if (list.length < 4) return null;
  const days = new Map();
  const hours = new Map();
  for (const r of list) {
    const wib = new Date(Date.parse(r.startedAt) + 7 * 3600_000);
    const d = WEEKDAYS[wib.getUTCDay()];
    const h = wib.getUTCHours();
    days.set(d, (days.get(d) || 0) + 1);
    hours.set(h, (hours.get(h) || 0) + 1);
  }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { weekday: top(days), hour: top(hours) };
};

/** Per month, newest first: [{ month: 'YYYY-MM', lives, minutes, comments }]. */
export const monthlyTotals = (recaps) => {
  const m = new Map();
  for (const r of recaps || []) {
    const k = r.date.slice(0, 7);
    const t = m.get(k) || { month: k, lives: 0, minutes: 0, comments: 0 };
    t.lives += 1;
    t.minutes += Math.round(r.durationSec / 60);
    t.comments += r.comments;
    m.set(k, t);
  }
  return [...m.values()].sort((a, b) => b.month.localeCompare(a.month));
};

/** Totals for one year: { lives, minutes, comments }. */
export const yearTotals = (recaps, year) => {
  const list = (recaps || []).filter((r) => r.date.startsWith(String(year)));
  return { lives: list.length, minutes: Math.round(list.reduce((a, r) => a + r.durationSec, 0) / 60), comments: list.reduce((a, r) => a + r.comments, 0) };
};

// ── Ringkasan mingguan: one week of lives and notes ───────────────────

/** Monday (YYYY-MM-DD) of the week a date falls in. Dates are already WIB days. */
export const weekOf = (date) => {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return isoDay(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS);
};

const addDays = (date, n) => isoDay(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS);
export const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Sums [[word, n]] lists and keeps the `limit` most common. */
const mergePairs = (lists, limit) => {
  const m = new Map();
  for (const pairs of lists) for (const [w, n] of pairs || []) m.set(w, (m.get(w) || 0) + n);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
};

/**
 * One summary per week that had a live or a note, newest first:
 * { week (Monday), end (Sunday), lives, minutes, comments, recaps (newest
 *   first), busiest, longest, chatWords, talkWords, notes, moods: [[mood, n]],
 *   picks (up to 3 quoted notes, different moods first) }.
 * Numbers come from the recaps; the stories from Eli Notes.
 */
// A recording this short is a restart or a test, not a live of its own.
export const MIN_WEEK_LIVE_SEC = 180;

export const weeklySummaries = (recaps, notes = []) => {
  const weeks = new Map();
  const get = (week) => {
    if (!weeks.has(week)) weeks.set(week, { week, end: addDays(week, 6), recaps: [], notes: [] });
    return weeks.get(week);
  };
  for (const r of recaps || []) if (r.durationSec >= MIN_WEEK_LIVE_SEC) get(weekOf(r.date)).recaps.push(r);
  for (const n of notes || []) get(weekOf(n.date)).notes.push(n);
  const out = [...weeks.values()].map((w) => {
    const rs = [...w.recaps].sort((a, b) => String(b.startedAt || b.date).localeCompare(String(a.startedAt || a.date)));
    const ns = [...w.notes].sort((a, b) => b.date.localeCompare(a.date) || a.at - b.at);
    const moods = new Map();
    for (const n of ns) moods.set(n.mood, (moods.get(n.mood) || 0) + 1);
    const picks = [];
    const usedMoods = new Set();
    for (const n of ns) if (picks.length < 3 && n.quote && !usedMoods.has(n.mood)) { picks.push(n); usedMoods.add(n.mood); }
    for (const n of ns) if (picks.length < 3 && n.quote && !picks.includes(n)) picks.push(n);
    return {
      week: w.week,
      end: w.end,
      lives: rs.length,
      minutes: Math.round(rs.reduce((a, r) => a + r.durationSec, 0) / 60),
      comments: rs.reduce((a, r) => a + r.comments, 0),
      recaps: rs,
      busiest: rs.length > 1 ? maxBy(rs, (r) => r.comments) : rs[0] || null,
      longest: rs.length > 1 ? maxBy(rs, (r) => r.durationSec) : rs[0] || null,
      chatWords: mergePairs(rs.map((r) => r.chatWords), 10),
      talkWords: mergePairs(rs.map((r) => r.talkWords), 10),
      notes: ns,
      moods: [...moods.entries()].sort((a, b) => b[1] - a[1]),
      picks,
    };
  });
  out.sort((a, b) => b.week.localeCompare(a.week));
  return out;
};

/** "23–29 November 2026", "30 November – 6 Desember 2026". */
export const weekLabel = (week) => {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const end = addDays(week, 6);
  const [y1, m1, d1] = week.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  if (y1 !== y2) return `${d1} ${months[m1 - 1]} ${y1} – ${d2} ${months[m2 - 1]} ${y2}`;
  if (m1 !== m2) return `${d1} ${months[m1 - 1]} – ${d2} ${months[m2 - 1]} ${y2}`;
  return `${d1}–${d2} ${months[m1 - 1]} ${y1}`;
};
