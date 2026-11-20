/**
 * scheduleEntry — cleaning + validation for admin schedule entries.
 * Shared by the admin page (instant feedback) and /api/admin-schedule
 * (the real gate: the API only writes what passes here).
 * No browser or Node-only APIs.
 */

import { normalizeManualEvent } from './scheduleSource.js';

const STRING_LIMITS = {
  kind: 10, title: 120, date: 10, start_time: 5, end_time: 5, category: 20,
  venue: 120, url: 300, unit_song: 80, position: 10, partner: 120, note: 200,
};
const BOOLEANS = ['is_video_call', 'is_birthday_show'];
export const ENTRY_FIELDS = [...Object.keys(STRING_LIMITS), ...BOOLEANS];

/** Keep known, non-empty fields; trim strings; booleans only when true. */
export const cleanEntry = (entry = {}) => {
  const out = {};
  Object.keys(STRING_LIMITS).forEach((k) => {
    const v = entry[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  });
  BOOLEANS.forEach((k) => {
    if (entry[k] === true) out[k] = true;
  });
  return out;
};

const DATE_RE = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ENUMS = {
  kind: ['SHOW', 'EXCLUSIVE', 'EVENT', 'GENERAL'],
  category: ['TWO_SHOT', 'MEET_GREET', 'PHOTOCARD', 'DIGITAL_PHOTOBOOK'],
  position: ['Center', 'Solo', 'Duo'],
};

/** Returns { entry } (cleaned) or { error } with a readable reason. */
export const validateEntry = (raw) => {
  const entry = cleanEntry(raw);
  for (const [k, max] of Object.entries(STRING_LIMITS)) {
    if (entry[k] && entry[k].length > max) return { error: `"${k}" terlalu panjang (maks ${max})` };
  }
  if (!entry.kind) return { error: 'missing "kind"' };
  if (!entry.date || !DATE_RE.test(entry.date)) return { error: '"date" harus YYYY-MM-DD' };
  for (const [k, allowed] of Object.entries(ENUMS)) {
    if (entry[k] && !allowed.includes(entry[k])) return { error: `"${k}" tidak valid` };
  }
  if (entry.url && !entry.url.startsWith('https://')) return { error: '"url" harus diawali https://' };
  const { error } = normalizeManualEvent(entry);
  if (error) return { error };
  return { entry };
};
