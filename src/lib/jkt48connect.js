/**
 * JKT48Connect → Eli's schedule. Pure helpers shared by the bot
 * (scripts/fetch-jkt48connect-schedule.mjs) and tests.
 *
 * API (fanbase plan, key server-side only):
 *   GET https://api.jkt48connect.com/api/theater?apikey=…&page=N&perpage=M
 *   → { theater: [Show], page, perpage, total_count }, newest first.
 *   Show = { id: 'SHB149', title, team, start_date, end_date (UTC ISO),
 *            members: [{ id, name, url_key }], seitansai?: [{…}] }
 *
 * Eli is matched by her member key, never by name ("Eli" is a prefix of
 * "Elin", "Elina"…).
 */

export const API_BASE = 'https://api.jkt48connect.com/api';
export const ELI_KEY = 'helisma-putri';
export const ELI_ID = '112';

const WIB_MS = 7 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');

/** UTC ISO → { day: 'YYYY-MM-DD', time: 'HH:MM' } in WIB, or null. */
export const toWIB = (iso) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const d = new Date(t + WIB_MS);
  return {
    day: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
};

export const hasEli = (show) =>
  (Array.isArray(show?.members) ? show.members : []).some(
    (m) => m?.url_key === ELI_KEY || String(m?.id) === ELI_ID,
  );

/** One API show → the event shape the site already uses (see scheduleSource). */
export const toEvent = (show) => {
  const start = toWIB(show.start_date);
  if (!start) return null;
  const end = toWIB(show.end_date);
  return {
    kind: 'SHOW',
    code: show.id,
    title: show.title,
    set_list: show.title,
    date: `${start.day}T${start.time}:00+07:00`,
    start_time: start.time,
    end_time: end && end.day === start.day ? end.time : null,
    team: show.team || null,
    venue: 'JKT48 Theater',
    members: (show.members || []).map((m) => ({ name: m.name, member_id: String(m.id), url_key: m.url_key })),
    is_birthday_show: Array.isArray(show.seitansai) && show.seitansai.length > 0,
    is_video_call: false,
    url: 'https://jkt48.com/theater/schedule',
    source: 'jkt48connect',
  };
};

/**
 * All API shows → Eli's events from `sinceMs` on, oldest first, one per
 * show code.
 */
export const eliEvents = (shows, sinceMs = 0) => {
  const seen = new Set();
  return (shows || [])
    .filter((s) => s && hasEli(s) && new Date(s.start_date).getTime() >= sinceMs)
    .map(toEvent)
    .filter((e) => e && !seen.has(e.code) && seen.add(e.code))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};
