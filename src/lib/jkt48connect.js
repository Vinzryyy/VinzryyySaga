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

// ── Exclusive: Personal M&G, 2-Shot, Photocard, Video Call ─────────────
//   GET /api/exclusives?page=N&perpage=M → { exclusives: [{ code, title, category }] }
//   GET /api/exclusives/:code → { sales_status, sales_periods: [{ label,
//     starts_at, ends_at, status }], sessions: [{ label, date, start_time,
//     end_time, timezone_label, lanes: [{ label, member_name, status,
//     remaining_quantity }] }], default_price, purchase_url, … }
// Lanes name members in full, so Eli is matched by "Helisma".

const TZ_OFFSET = { WIB: '+07:00', WITA: '+08:00', WIT: '+09:00' };

export const isEliLane = (lane) => /helisma/i.test(String(lane?.member_name || ''));

/** "WIB" | "WITA" | "WIT" for a session (mini-tour sessions outside Java use local time). */
export const sessionZone = (s) => {
  const m = `${s?.timezone_label || ''} ${s?.label || ''}`.match(/\b(WITA|WIT|WIB)\b/);
  return m ? m[1] : 'WIB';
};

const hhmm = (t) => (typeof t === 'string' && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);

/** Every session lane that is Eli's, as flat rows. */
export const eliLanes = (detail) =>
  (detail?.sessions || []).flatMap((s) =>
    (s.lanes || []).filter(isEliLane).map((lane) => {
      const zone = sessionZone(s);
      const start = hhmm(s.start_time);
      return {
        sessionLabel: s.label,
        sessionDate: s.date,
        startTime: start,
        endTime: hhmm(s.end_time),
        zone,
        iso: `${s.date}T${start || '00:00'}:00${TZ_OFFSET[zone]}`,
        jalur: lane.label,
        soldOut: lane.status === 'sold_out',
        status: lane.status || 'unknown',
        remainingQuota: Number.isFinite(lane.remaining_quantity) ? lane.remaining_quantity : null,
      };
    }),
  );

/** Eli's sessions of one product → schedule events (EXCLUSIVE kind). */
export const exclusiveEvents = (detail, sinceMs = 0) =>
  eliLanes(detail)
    .filter((l) => new Date(l.iso).getTime() >= sinceMs)
    .map((l) => ({
      kind: 'EXCLUSIVE',
      code: `${detail.code}-${l.sessionDate}-${l.startTime || 'x'}`,
      title: `${detail.title} (${l.sessionLabel})`,
      date: l.iso,
      start_time: l.startTime,
      end_time: l.endTime,
      category: detail.category || null,
      team: null,
      venue: detail.category === 'DIGITAL_PHOTOBOOK' ? 'Video Call (online)' : 'JKT48 Personal M&G',
      members: [{ name: 'Helisma Putri', member_id: ELI_ID, url_key: ELI_KEY }],
      eli_jalur: [l.jalur],
      sold_out: l.soldOut,
      remaining_total: l.remainingQuota ?? undefined,
      is_birthday_show: false,
      is_video_call: false,
      url: detail.purchase_url || 'https://jkt48.com/exclusive',
      source: 'jkt48connect',
    }));

/**
 * One product → an entry for "Sedang Dijual", or null when it isn't on
 * sale or Eli has no session left from `todayYmd` on.
 */
export const exclusiveSale = (detail, todayYmd) => {
  const periods = (detail?.sales_periods || []).map((p) => ({
    label: p.label,
    start_date: p.starts_at,
    end_date: p.ends_at,
    status: p.status,
  }));
  const open = detail?.sales_status === 'open' || periods.some((p) => p.status === 'open');
  const sessions = eliLanes(detail).filter((l) => l.sessionDate >= todayYmd);
  if (!open || !sessions.length) return null;
  return {
    code: detail.code,
    category: detail.category,
    title: detail.title,
    url: detail.purchase_url,
    defaultPrice: detail.default_price ?? null,
    salesPeriod: periods,
    soonestSessionDate: sessions.map((s) => s.sessionDate).sort()[0],
    eliSessions: sessions.map((l) => {
      const { iso: _iso, ...rest } = l;
      return rest;
    }),
    lastChangedAt: detail.last_changed_at || null,
  };
};
