#!/usr/bin/env node
/**
 * Bot: Eli's schedule and M&G sales from JKT48Connect.
 *
 *   JKT48CONNECT_API_KEY=… node scripts/fetch-jkt48connect-schedule.mjs
 *
 * Writes, only when the content changes (a quiet run commits nothing):
 *   public/data/eli-schedule.jkt48connect.json  theater shows + M&G / 2-Shot /
 *                                               Video Call sessions (last 30 days + upcoming)
 *   public/data/eli-sales.jkt48connect.json     products on sale where Eli still has a
 *                                               session, with sold-out status per session
 *
 * Runs in GitHub Actions (.github/workflows/refresh-jkt48connect.yml).
 * Without a key it exits quietly so the site keeps using the other
 * sources. Locally the key is read from .env.local when it isn't in the
 * environment. See docs/jkt48connect.md.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_BASE, eliEvents, exclusiveEvents, exclusiveSale, toWIB } from '../src/lib/jkt48connect.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEDULE_OUT = resolve(ROOT, 'public/data/eli-schedule.jkt48connect.json');
const SALES_OUT = resolve(ROOT, 'public/data/eli-sales.jkt48connect.json');
const PER_PAGE = 20;
const MAX_PAGES = 10;
const KEEP_DAYS = 30; // recent past events stay listed for a month
// Newest products first; older ones closed long ago. Keeps each run to
// ~20 requests (well inside the 50,000/month fanbase plan when hourly).
const EXCLUSIVE_DETAILS = 15;

const keyFromEnvFile = () => {
  const file = resolve(ROOT, '.env.local');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('JKT48CONNECT_API_KEY='));
  return line ? line.slice('JKT48CONNECT_API_KEY='.length).trim() : '';
};

const key = process.env.JKT48CONNECT_API_KEY || keyFromEnvFile();
if (!key) {
  console.log('::notice::JKT48CONNECT_API_KEY not set; skipping JKT48Connect.');
  process.exit(0);
}

const get = async (path, params = {}) => {
  const qs = new URLSearchParams({ ...params, apikey: key });
  const res = await fetch(`${API_BASE}/${path}?${qs}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

const since = Date.now() - KEEP_DAYS * 86_400_000;
const today = toWIB(new Date().toISOString()).day;

const fetchShows = async () => {
  const shows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = (await get('theater', { page, perpage: PER_PAGE }))?.theater || [];
    shows.push(...batch);
    const oldest = batch.at(-1);
    if (batch.length < PER_PAGE || !oldest || new Date(oldest.start_date).getTime() < since) break;
  }
  return shows;
};

const fetchExclusives = async () => {
  const list = (await get('exclusives', { page: 1, perpage: EXCLUSIVE_DETAILS }))?.exclusives || [];
  const details = [];
  for (const item of list.slice(0, EXCLUSIVE_DETAILS)) {
    try {
      details.push(await get(`exclusives/${encodeURIComponent(item.code)}`));
    } catch (err) {
      console.log(`::warning::exclusive ${item.code}: ${err.message}`);
    }
  }
  return details;
};

/** Write `body` (plus fetchedAt) only if `compare` differs from what's on disk. */
const writeIfChanged = (file, compareKey, body) => {
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  if (previous && JSON.stringify(previous[compareKey]) === JSON.stringify(body[compareKey])) return false;
  writeFileSync(file, `${JSON.stringify({ ...body, fetchedAt: new Date().toISOString() }, null, 2)}\n`);
  return true;
};

const main = async () => {
  const [shows, details] = await Promise.all([fetchShows(), fetchExclusives()]);

  const events = [...eliEvents(shows, since), ...details.flatMap((d) => exclusiveEvents(d, since))]
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const sales = details
    .map((d) => exclusiveSale(d, today))
    .filter(Boolean)
    .sort((a, b) => a.soonestSessionDate.localeCompare(b.soonestSessionDate));

  const wroteSchedule = writeIfChanged(SCHEDULE_OUT, 'events', {
    source: 'https://jkt48connect.com (fanbase plan)',
    sourceNote: `Eli (Helisma Putri): theater shows and M&G / 2-Shot / Video Call sessions from the last ${KEEP_DAYS} days and upcoming.`,
    eventCount: events.length,
    events,
  });
  const wroteSales = writeIfChanged(SALES_OUT, 'sales', {
    source: 'https://jkt48connect.com (fanbase plan)',
    sourceNote: 'Exclusive products on sale where Eli still has a session; sold-out status per session.',
    salesCount: sales.length,
    sales,
  });

  console.log(`Checked ${shows.length} shows and ${details.length} exclusive products.`);
  console.log(`${wroteSchedule ? 'Wrote' : 'No change'}: ${events.length} Eli event(s).`);
  for (const e of events) console.log(`  ${e.date}  ${e.kind}  ${e.title}${e.kind === 'EXCLUSIVE' ? `  ${e.eli_jalur} ${e.sold_out ? 'SOLD OUT' : 'tersedia'}` : ''}`);
  console.log(`${wroteSales ? 'Wrote' : 'No change'}: ${sales.length} product(s) on sale with Eli.`);
  for (const s of sales) console.log(`  ${s.code}  ${s.title}  ${s.eliSessions.map((x) => `${x.sessionDate} ${x.sessionLabel} ${x.jalur} ${x.soldOut ? 'SOLD OUT' : 'tersedia'}`).join('; ')}`);
};

main().catch((err) => {
  // A failing API must not break the workflow; the old files stay.
  console.log(`::warning::JKT48Connect fetch failed: ${err.message}`);
  process.exit(0);
});
