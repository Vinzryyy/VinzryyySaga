/**
 * enrich-x-archive — fetch tweet captions via X's public syndication
 * endpoint (no auth required, same one used by the embed widget),
 * extract event date + event name from each caption, and merge back
 * into public/data/img-archive-mapping.json.
 *
 * Caption format observed from @armeniaca15:
 *   "YYMMDD EventName 🧜🏻‍♀️\n\n@H_EliJKT48 #HelismaPutri #EliJKT48 #armeniaca"
 *
 * Parser:
 *   - First line. Strip trailing mentions/hashtags/emojis from the END
 *     so the eventName isn't polluted with #HelismaPutri etc.
 *   - If it starts with a 6-digit date (YYMMDD), extract that as
 *     eventDate (canonical YYYY-MM-DD), and the rest of the line as
 *     eventName.
 *   - Otherwise eventName = first line, eventDate = upload date.
 *
 * Token algorithm reverse-engineered from twitter widgets.js:
 *   ((tweetId / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MAPPING_FILE = path.join(ROOT, 'public', 'data', 'img-archive-mapping.json');

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://platform.twitter.com/',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
};

// ~500ms between requests is gentle enough to avoid rate-limiting on
// the syndication CDN. With 44 tweets total this finishes in <30s.
const REQUEST_DELAY_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const computeToken = (tweetId) => {
  // BigInt conversion preserves precision for 19-digit Snowflake IDs.
  const fraction = Number(BigInt(tweetId) / 1000000000000000n);
  return (fraction * Math.PI).toString(36).replace(/(0+|\.)/g, '');
};

const fetchTweet = async (tweetId) => {
  const token = computeToken(tweetId);
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=id&token=${token}`;
  const res = await fetch(url, { headers: REQUEST_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for tweet ${tweetId}`);
  return res.json();
};

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};
const decodeHtmlEntities = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => HTML_ENTITY_MAP[m] || m);

// Strip emoji + their modifiers/joiners that get left behind when the
// glyph itself is removed: ZWJ (200D), VS16 (FE0F), skin-tone modifiers
// (1F3FB-1F3FF), all the emoji blocks. Done as one pass so combining
// sequences don't leave orphan modifiers.
const stripEmoji = (s) =>
  s
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{FE0F}]/gu,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

// Try to interpret "AABBCC" as either YYMMDD or DDMMYY (both formats
// observed in @armeniaca15 captions). Returns the valid date that's
// most plausible given the upload date — events should be ≤ upload
// date (you post AFTER the event), and the one closest to upload date
// wins when both interpretations are valid. Returns null if neither
// parse produces a sensible date.
const parseAmbiguousDate = (digits, uploadDateStr) => {
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 4);
  const c = digits.slice(4, 6);

  const tryDate = (yy, mm, dd) => {
    const m = parseInt(mm, 10);
    const d = parseInt(dd, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const iso = `20${yy}-${mm}-${dd}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    // Validate the JS-parsed date matches input (rejects invalid days
    // like Feb 30 that JS would silently roll forward to March)
    if (
      date.getUTCFullYear() !== 2000 + parseInt(yy, 10) ||
      date.getUTCMonth() + 1 !== m ||
      date.getUTCDate() !== d
    ) {
      return null;
    }
    return { iso, date };
  };

  const yymmdd = tryDate(a, b, c); // "100126" → 2010-01-26
  const ddmmyy = tryDate(c, b, a); // "100126" → 2026-01-10
  const upload = uploadDateStr ? new Date(`${uploadDateStr}T00:00:00Z`) : null;

  // Allow 1-day fuzz forward (timezone slip when posting near midnight)
  const cutoff = upload ? upload.getTime() + 86400000 : Infinity;
  const candidates = [yymmdd, ddmmyy].filter(
    (c) => c && c.date.getTime() <= cutoff && c.date.getUTCFullYear() >= 2018,
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1 || !upload) return candidates[0].iso;

  // Both valid — pick the one closer to upload date
  candidates.sort(
    (x, y) =>
      Math.abs(upload - x.date) - Math.abs(upload - y.date),
  );
  return candidates[0].iso;
};

// Parse "240224 GIS 2 Festival 2024 🧜🏻‍♀️\n@H_EliJKT48 #..." → {
//   eventDate: "2024-02-24", eventName: "GIS 2 Festival 2024"
// }
//
// Date prefix accepts 6 digits followed by space, comma, dash, colon,
// or pipe — observed in the wild as "240224 ...", "231117, ...",
// "100126 || ...", "280625 | ...".
//
// 6-digit prefix is ambiguous: @armeniaca15 uses both YYMMDD (older
// posts) and DDMMYY (newer posts). parseAmbiguousDate disambiguates
// using the upload date as a sanity anchor.
const parseCaption = (text, fallbackUploadDate) => {
  if (!text) {
    return { eventDate: fallbackUploadDate, eventName: null };
  }
  const decoded = decodeHtmlEntities(text);
  const firstLine = decoded.split('\n').find((l) => l.trim().length > 0) || '';

  // Strip trailing mentions/hashtags/URLs so eventName is just the
  // human-readable bit. Processed before date extraction so the
  // leading 6-digit date stays untouched.
  const trimmed = firstLine
    .replace(/\s*(@\w+|#\w+|https?:\/\/\S+|t\.co\/\S+)/g, '')
    .trim();

  const dateMatch = trimmed.match(/^(\d{6})[\s,\-:.|/]+(.+)$/);
  if (dateMatch) {
    const [, digits, rest] = dateMatch;
    const parsedDate = parseAmbiguousDate(digits, fallbackUploadDate);
    if (parsedDate) {
      return {
        eventDate: parsedDate,
        eventName: stripEmoji(rest.replace(/^[\s,\-:.|/]+/, '')) || null,
      };
    }
    // Date prefix didn't make sense — keep the rest as event name,
    // fall back to upload date.
    return {
      eventDate: fallbackUploadDate,
      eventName: stripEmoji(rest.replace(/^[\s,\-:.|/]+/, '')) || null,
    };
  }

  return {
    eventDate: fallbackUploadDate,
    eventName: stripEmoji(trimmed) || null,
  };
};

const main = async () => {
  const raw = await readFile(MAPPING_FILE, 'utf8');
  const data = JSON.parse(raw);

  // Group entries by tweetId so we fetch each tweet exactly once and
  // apply the caption to all photos that share it (multi-photo posts).
  const matched = data.entries.filter((e) => e.matched && e.tweetId);
  const tweetIds = [...new Set(matched.map((e) => e.tweetId))];
  console.log(
    `Fetching ${tweetIds.length} unique tweets (covering ${matched.length} matched images)...`,
  );

  const tweetCache = new Map();
  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < tweetIds.length; i++) {
    const id = tweetIds[i];
    try {
      const tweet = await fetchTweet(id);
      tweetCache.set(id, tweet);
      okCount++;
      if (i % 10 === 0 || i === tweetIds.length - 1) {
        console.log(`  ${i + 1}/${tweetIds.length} ok`);
      }
    } catch (err) {
      failCount++;
      console.warn(`  ${i + 1}/${tweetIds.length} fail: ${err.message}`);
      tweetCache.set(id, null);
    }
    if (i < tweetIds.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\nFetched ${okCount} ok, ${failCount} failed.`);
  console.log('Merging captions into mapping...');

  // Update each matched entry with caption + parsed event info.
  // Unmatched entries stay as-is.
  let enrichedCount = 0;
  data.entries = data.entries.map((entry) => {
    if (!entry.matched || !entry.tweetId) return entry;
    const tweet = tweetCache.get(entry.tweetId);
    if (!tweet?.text) return entry;

    const uploadDate = tweet.created_at?.slice(0, 10) || entry.date;
    const { eventDate, eventName } = parseCaption(tweet.text, uploadDate);

    enrichedCount++;
    return {
      ...entry,
      uploadDate,
      eventDate,
      eventName,
      caption: tweet.text,
      hashtags: (tweet.entities?.hashtags || []).map((h) => h.text),
      favoriteCount: tweet.favorite_count ?? null,
    };
  });

  // Refresh metadata block on the wrapper.
  data.generatedAt = new Date().toISOString();
  data.enrichedAt = new Date().toISOString();
  data.enrichedCount = enrichedCount;
  data.notes = {
    ...data.notes,
    captionSource:
      'Fetched via cdn.syndication.twimg.com tweet-result endpoint (public, no auth). Same endpoint used by twitter widgets.js. Token computed from tweet ID via the documented algorithm.',
    eventParsing:
      'Caption first line with format "YYMMDD EventName" → eventDate (YYYY-MM-DD) + eventName (mentions/hashtags/emojis stripped).',
  };

  await writeFile(MAPPING_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`\nDone. ${enrichedCount} entries enriched with caption data.`);
  console.log(`Output: ${path.relative(ROOT, MAPPING_FILE)}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
