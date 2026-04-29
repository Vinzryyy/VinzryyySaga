/**
 * JKT48 Calendar Scraper
 *
 * Fetches the source HTML from beritajkt48/event (a fan-curated JKT48
 * events calendar on GitHub Pages), extracts the `const eventData = {…}`
 * JS object literal, normalizes it into a flat array of events, and
 * writes the result to `public/data/jkt48-calendar.json`.
 *
 * Run via `node scripts/scrape-jkt48-calendar.js` locally, or via the
 * `.github/workflows/refresh-calendar.yml` cron on GitHub Actions.
 *
 * Why this source: jkt48.com itself is behind Cloudflare's anti-bot
 * challenge (curl/fetch returns a 403 + JS challenge page). This fan
 * repo on GitHub Pages is plain HTML, has CORS open, and gets updated
 * when the maintainer adds new events. Tradeoff: it's not member-
 * filtered (no cast lists per event) and future months can be sparse,
 * but it's the only practical free no-API-key source.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'jkt48-calendar.json');

const SOURCE_URL = 'https://raw.githubusercontent.com/beritajkt48/event/main/index.html';

// Order of months as they appear in the source (Indonesian, lowercase).
// Used to sort the flat output deterministically.
const MONTH_ORDER = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
];

async function fetchSource() {
  const res = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'armeniaca-calendar-scraper/1.0' },
  });
  if (!res.ok) throw new Error(`Source fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Extract the `const eventData = { … };` block from the page HTML.
 * The source uses single-quoted month keys + bracket-notation arrays
 * of object literals — not strict JSON. We normalize to JSON before
 * parsing.
 */
function extractEventData(html) {
  // Greedy match until the closing `};` that terminates the literal.
  // Anchored on `const eventData = {` to avoid grabbing other `{}` blocks.
  const start = html.indexOf('const eventData = {');
  if (start === -1) {
    throw new Error('Could not find `const eventData = {` in source HTML');
  }
  // Find the matching closing brace by depth-counting from `start`.
  // Skip the literal `eventData = ` portion and start at the first `{`.
  const objStart = html.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = objStart; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error('Unbalanced braces — could not find end of eventData');

  const literal = html.slice(objStart, end + 1);
  return literalToJson(literal);
}

/**
 * Convert the JS object literal to a JS value. The source uses single
 * quotes, unquoted keys, and trailing whitespace — we normalize to JSON
 * and JSON.parse instead of `eval()` (avoid arbitrary code execution
 * even on a trusted source).
 */
function literalToJson(literal) {
  // 1. Quote unquoted keys: `date:` → `"date":`. Match `<word>:` after
  //    `{` or `,` or whitespace, but NOT after `://` (URL colons).
  let json = literal.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
  // 2. Replace single-quoted strings with double-quoted, escaping
  //    embedded double quotes and unescaping any embedded singles.
  json = json.replace(/'((?:[^'\\]|\\.)*)'/g, (_match, inner) => {
    const escaped = inner.replace(/\\'/g, "'").replace(/"/g, '\\"');
    return `"${escaped}"`;
  });
  // 3. Strip trailing commas before } or ]
  json = json.replace(/,(\s*[}\]])/g, '$1');
  // 4. Curly quotes that snuck in from titles ('Mika's Corner' had the
  //    curly apostrophe in the source) — re-encode for JSON safety.
  json = json.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

  try {
    return JSON.parse(json);
  } catch (err) {
    // Persist what we tried to parse for easier debugging in CI logs
    console.error('--- failed JSON ---');
    console.error(json.slice(0, 400));
    throw new Error(`literalToJson: JSON.parse failed — ${err.message}`);
  }
}

/**
 * Flatten the { januari: [...], februari: [...] } shape into a sorted
 * array, dropping placeholder rows where title/location are 'none'.
 */
function flatten(eventData) {
  const out = [];
  for (const monthKey of MONTH_ORDER) {
    const entries = eventData[monthKey] || [];
    for (const e of entries) {
      // Skip placeholders the source uses to reserve a future month
      // (title: 'none', location: 'none').
      if (e.title === 'none' && e.location === 'none') continue;
      out.push({
        date: e.date,
        title: e.title,
        location: e.location,
        tags: Array.isArray(e.tags) ? e.tags : [],
      });
    }
  }
  // Sort ascending by date so consumers can slice "next N upcoming"
  out.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return out;
}

async function main() {
  console.log(`Scraping ${SOURCE_URL}`);
  const html = await fetchSource();
  console.log(`Fetched ${html.length.toLocaleString()} bytes`);

  const eventData = extractEventData(html);
  const events = flatten(eventData);
  console.log(`Extracted ${events.length} events (placeholders skipped)`);

  const payload = {
    source: 'https://github.com/beritajkt48/event',
    sourceNote:
      'Fan-curated calendar of all JKT48 events. Not Eli-specific — cast lists are not in the source. Use as general JKT48 context alongside the manual /eli-schedule Firebase node for Eli-confirmed appearances.',
    fetchedAt: new Date().toISOString(),
    eventCount: events.length,
    events,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
