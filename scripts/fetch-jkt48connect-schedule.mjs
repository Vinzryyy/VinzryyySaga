#!/usr/bin/env node
/**
 * Bot: Eli's theater shows from JKT48Connect → public/data/eli-schedule.jkt48connect.json
 *
 *   JKT48CONNECT_API_KEY=… node scripts/fetch-jkt48connect-schedule.mjs
 *
 * Runs in GitHub Actions (.github/workflows/refresh-jkt48connect.yml).
 * Without a key it exits quietly so the site keeps using the other
 * schedule sources. The file is rewritten only when Eli's shows change,
 * so a quiet day makes no commit. Locally the key is read from
 * .env.local when it isn't in the environment.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_BASE, eliEvents } from '../src/lib/jkt48connect.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/data/eli-schedule.jkt48connect.json');
const PER_PAGE = 20;
const MAX_PAGES = 10; // 200 shows, far more than the window below
const KEEP_DAYS = 30; // recent past shows stay listed for a month

const keyFromEnvFile = () => {
  const file = resolve(ROOT, '.env.local');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('JKT48CONNECT_API_KEY='));
  return line ? line.slice('JKT48CONNECT_API_KEY='.length).trim() : '';
};

const key = process.env.JKT48CONNECT_API_KEY || keyFromEnvFile();
if (!key) {
  console.log('::notice::JKT48CONNECT_API_KEY not set; skipping JKT48Connect schedule.');
  process.exit(0);
}

const since = Date.now() - KEEP_DAYS * 86_400_000;

const fetchPage = async (page) => {
  const url = `${API_BASE}/theater?apikey=${encodeURIComponent(key)}&page=${page}&perpage=${PER_PAGE}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`theater page ${page}: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.theater) ? data.theater : [];
};

const main = async () => {
  const shows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await fetchPage(page);
    shows.push(...batch);
    // Newest first: stop once a page reaches past the window.
    const oldest = batch.at(-1);
    if (batch.length < PER_PAGE || !oldest || new Date(oldest.start_date).getTime() < since) break;
  }

  const events = eliEvents(shows, since);
  const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  if (previous && JSON.stringify(previous.events) === JSON.stringify(events)) {
    console.log(`No change: ${events.length} Eli show(s) from ${shows.length} checked.`);
    return;
  }

  const out = {
    source: 'https://jkt48connect.com (fanbase plan)',
    sourceNote: `Eli (Helisma Putri) theater shows from the last ${KEEP_DAYS} days and upcoming, matched by member key.`,
    fetchedAt: new Date().toISOString(),
    eventCount: events.length,
    events,
  };
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${events.length} Eli show(s) from ${shows.length} checked.`);
  for (const e of events) console.log(`  ${e.date}  ${e.title}  (${e.team})`);
};

main().catch((err) => {
  // A failing API must not break the workflow; the old file stays.
  console.log(`::warning::JKT48Connect fetch failed: ${err.message}`);
  process.exit(0);
});
