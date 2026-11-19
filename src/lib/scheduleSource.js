/**
 * scheduleSource — one loader for Eli's schedule, merging two files:
 *
 *   /data/eli-schedule.json         scraped from jkt48.com by GH Actions
 *   /data/eli-schedule.manual.json  hand-written entries (see docs/manual-schedule.md)
 *
 * Manual entries are normalized to the scraped event shape so every
 * consumer (status hero, /schedule list + calendar, setlist counts,
 * Town almanak) treats them the same. When the scraper later finds the
 * same event (same WIB day + start time + type), the scraped copy wins
 * because it carries cast lists, quotas and the exact jkt48.com URL.
 *
 * No browser-only APIs here — scripts/check-manual-schedule.js imports
 * this module in Node to validate the manual file.
 */

import { dayKeyWIB, eventType } from '../utils/calendar.js';

export const SCHEDULE_URL = '/data/eli-schedule.json';
export const MANUAL_SCHEDULE_URL = '/data/eli-schedule.manual.json';

const KINDS = new Set(['SHOW', 'EXCLUSIVE', 'EVENT', 'GENERAL']);
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const defaultVenue = (kind, isVideoCall) => {
  if (kind === 'SHOW') return 'JKT48 Theater';
  if (kind === 'EXCLUSIVE') return 'JKT48 Personal M&G Festival';
  if (kind === 'EVENT') return isVideoCall ? 'Video Call (online)' : 'JKT48 Event';
  return 'JKT48 Off-site Event';
};

/**
 * Validate + normalize one manual entry.
 * Returns { event } on success or { error } describing what's wrong.
 *
 * Minimal entry: { "title": "Aitakatta", "date": "2026-11-21", "start_time": "19:00" }
 * `date` may also be a full ISO timestamp with offset.
 */
export const normalizeManualEvent = (raw) => {
  if (!raw || typeof raw !== 'object') return { error: 'entry is not an object' };
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return { error: 'missing "title"' };

  const kind = raw.kind ? String(raw.kind).toUpperCase() : 'SHOW';
  if (!KINDS.has(kind)) {
    return { error: `"kind" must be one of ${[...KINDS].join(', ')} (got "${raw.kind}")` };
  }

  const start = raw.start_time ? String(raw.start_time) : null;
  if (start && !TIME_RE.test(start)) return { error: `"start_time" must be HH:MM (got "${start}")` };
  const end = raw.end_time ? String(raw.end_time) : null;
  if (end && !TIME_RE.test(end)) return { error: `"end_time" must be HH:MM (got "${end}")` };

  if (!raw.date) return { error: 'missing "date"' };
  const dateStr = String(raw.date);
  // Date-only values are WIB wall-clock dates; anchor them to +07:00 so
  // the event lands on the same day for every viewer.
  const iso = DATE_ONLY_RE.test(dateStr) ? `${dateStr}T${start || '00:00'}:00+07:00` : dateStr;
  if (Number.isNaN(new Date(iso).getTime())) return { error: `invalid "date" (got "${dateStr}")` };

  const isVideoCall = raw.is_video_call === true;
  return {
    event: {
      kind,
      code: raw.code || `manual-${dayKeyWIB(iso)}-${start || 'allday'}-${kind.toLowerCase()}`,
      title,
      date: iso,
      start_time: start,
      end_time: end,
      category: raw.category || null,
      team: raw.team || (kind === 'SHOW' ? 'DREAM' : null),
      venue: raw.venue || defaultVenue(kind, isVideoCall),
      members: Array.isArray(raw.members) ? raw.members : [],
      eli_jalur: Array.isArray(raw.eli_jalur) ? raw.eli_jalur : undefined,
      sold_out: raw.sold_out === true,
      remaining_total: Number.isFinite(raw.remaining_total) ? raw.remaining_total : undefined,
      is_birthday_show: raw.is_birthday_show === true,
      is_video_call: isVideoCall,
      url: raw.url || 'https://jkt48.com/schedule',
      note: raw.note || undefined,
      source: 'manual',
    },
  };
};

/** Normalize the whole manual file. Returns { events, errors[] }. */
export const normalizeManualFile = (data) => {
  const list = Array.isArray(data?.events) ? data.events : [];
  const events = [];
  const errors = [];
  list.forEach((raw, i) => {
    const { event, error } = normalizeManualEvent(raw);
    if (event) events.push(event);
    else errors.push({ index: i, title: raw?.title, error });
  });
  return { events, errors };
};

const dedupeKey = (e) => `${dayKeyWIB(e.date)}|${e.start_time || ''}|${eventType(e)}`;

const latestIso = (...values) =>
  values
    .filter((v) => v && !Number.isNaN(new Date(v).getTime()))
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

/**
 * Merge scraped + manual payloads into the shape consumers already use:
 * { events, fetchedAt, ... }. Either side may be null.
 */
export const mergeSchedules = (scraped, manual) => {
  const scrapedEvents = Array.isArray(scraped?.events) ? scraped.events : [];
  const { events: manualEvents } = normalizeManualFile(manual);
  const taken = new Set(scrapedEvents.map(dedupeKey));
  const extra = manualEvents.filter((e) => !taken.has(dedupeKey(e)));
  const events = [...scrapedEvents, ...extra].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  return {
    ...(scraped || {}),
    events,
    eventCount: events.length,
    manualCount: extra.length,
    fetchedAt: latestIso(scraped?.fetchedAt, manual?.updatedAt),
  };
};

const fetchJson = (url) =>
  fetch(url, { cache: 'no-cache' }).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
  );

let cachedPromise = null;

/**
 * Cached loader (one network round per page load). Rejects only when
 * BOTH files fail — either one alone is enough to render something.
 */
export const loadSchedule = () => {
  if (!cachedPromise) {
    cachedPromise = Promise.allSettled([fetchJson(SCHEDULE_URL), fetchJson(MANUAL_SCHEDULE_URL)])
      .then(([scraped, manual]) => {
        if (scraped.status === 'rejected' && manual.status === 'rejected') {
          throw scraped.reason;
        }
        return mergeSchedules(
          scraped.status === 'fulfilled' ? scraped.value : null,
          manual.status === 'fulfilled' ? manual.value : null,
        );
      })
      .catch((err) => {
        cachedPromise = null;
        throw err;
      });
  }
  return cachedPromise;
};

/** Test hook — clears the module cache between tests. */
export const __resetScheduleCache = () => {
  cachedPromise = null;
};
