/**
 * fanStory — shared rules for Cerita Penggemar (/cerita).
 *
 * validateStory() is used by both the form (instant feedback) and
 * /api/fan-stories (the real gate), so the two never disagree. The small
 * fetch helpers below are for the browser only.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 24;
export const STORY_MIN = 20;
export const STORY_MAX = 600;
export const LABEL_MAX = 80;
export const NAME_RE = /^[\p{L}\p{N} ._-]{2,24}$/u;
export const MOMENT_RE = /^[a-z0-9-]{1,80}$/;
export const ID_RE = /^[-A-Za-z0-9_]{1,40}$/;
export const API_URL = '/api/fan-stories';

// Control chars except tab/newline (stories may have line breaks).
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;
const URL_RE = /(https?:\/\/|www\.)/i;

const clean = (v) => String(v ?? '').replace(CONTROL_RE, '');
const oneLine = (v) => clean(v).replace(/\s+/g, ' ').trim();

/**
 * Cleans and checks a story. Returns { story } or { error } (Indonesian
 * message, safe to show). Empty moment/momentLabel are dropped; a label
 * without a moment slug is dropped too.
 */
export const validateStory = (input) => {
  const src = input && typeof input === 'object' ? input : {};
  const name = oneLine(src.name);
  const story = clean(src.story)
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const moment = oneLine(src.moment);
  const momentLabel = oneLine(src.momentLabel);

  if (!NAME_RE.test(name)) {
    return { error: `Nama panggilan ${NAME_MIN}–${NAME_MAX} karakter (huruf, angka, spasi, titik, _ atau -).` };
  }
  if (story.length < STORY_MIN) return { error: `Ceritanya minimal ${STORY_MIN} karakter, ya.` };
  if (story.length > STORY_MAX) return { error: `Ceritanya maksimal ${STORY_MAX} karakter.` };
  if (URL_RE.test(story) || URL_RE.test(name) || URL_RE.test(momentLabel)) {
    return { error: 'Cerita tidak boleh berisi tautan (http/www).' };
  }
  if (moment && !MOMENT_RE.test(moment)) return { error: 'Momen tidak valid.' };
  if (momentLabel.length > LABEL_MAX) return { error: `Nama momen maksimal ${LABEL_MAX} karakter.` };

  const out = { name, story };
  if (moment) {
    out.moment = moment;
    if (momentLabel) out.momentLabel = momentLabel;
  }
  return { story: out };
};

/** Length the server will see (after trim + control-char strip). */
export const storyLength = (text) => clean(text).trim().length;

// ── Dates ────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
});
const DAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });

/** "baru saja", "5 menit lalu", "kemarin", "3 hari lalu", else "12 November 2026". */
export const formatStoryDate = (ms, now = Date.now()) => {
  if (!Number.isFinite(ms)) return '';
  const diff = now - ms;
  if (diff < 0) return DATE_FMT.format(new Date(ms));
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const today = DAY_FMT.format(new Date(now));
  const day = DAY_FMT.format(new Date(ms));
  if (day === today) return `${Math.floor(min / 60)} jam lalu`;
  const days = Math.round((Date.parse(today) - Date.parse(day)) / 86400000);
  if (days === 1) return 'kemarin';
  if (days < 7) return `${days} hari lalu`;
  return DATE_FMT.format(new Date(ms));
};

// ── Browser helpers ─────────────────────────────────────────────────

export class FanStoryApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const parse = async (r) => {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new FanStoryApiError(j.error || `HTTP ${r.status}`, r.status);
  return j;
};

export const fetchStories = async ({ moment, limit } = {}) => {
  const qs = new URLSearchParams();
  if (moment) qs.set('moment', moment);
  if (limit) qs.set('limit', String(limit));
  let r;
  try {
    const q = qs.toString();
    r = await fetch(`${API_URL}${q ? `?${q}` : ''}`);
  } catch {
    throw new FanStoryApiError('Tidak bisa menghubungi server.', 0);
  }
  return (await parse(r)).stories || [];
};

export const postStoryApi = async (body) => {
  let r;
  try {
    r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new FanStoryApiError('Tidak bisa menghubungi server.', 0);
  }
  return parse(r);
};
