#!/usr/bin/env node
/**
 * Validates public/data/eli-schedule.manual.json using the same
 * normalizer the site uses, so an entry that passes here renders.
 *
 *   npm run check-schedule
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeManualFile } from '../src/lib/scheduleSource.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'eli-schedule.manual.json');

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`✗ ${path.relative(process.cwd(), file)} is not valid JSON: ${err.message}`);
  process.exit(1);
}

const { events, errors } = normalizeManualFile(data);
const fmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
});

events
  .sort((a, b) => new Date(a.date) - new Date(b.date))
  .forEach((e) => console.log(`✓ ${fmt.format(new Date(e.date))} WIB  [${e.kind}] ${e.title}`));
errors.forEach((e) => console.error(`✗ entry #${e.index + 1}${e.title ? ` ("${e.title}")` : ''}: ${e.error}`));

if (!data.updatedAt) console.warn('! "updatedAt" is missing — set it to today (YYYY-MM-DD) when you edit the file.');
console.log(`\n${events.length} valid, ${errors.length} invalid`);
process.exit(errors.length ? 1 : 0);
