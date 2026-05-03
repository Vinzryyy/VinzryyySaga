/**
 * build-gallery-enrichments — bridge img-archive-mapping.json (keyed by
 * legacy img-NNN files) to gallery data (keyed by mediaKey) via the
 * tweetId in armeniaca-authentic-archive.json. Output a flat mediaKey
 * → metadata lookup that the GalleryContext fetches at runtime.
 *
 * Output: public/data/gallery-enrichments.json
 *   { mediaKey: { eventName, eventDate, uploadDate, caption, hashtags,
 *                 tweetUrl, tweetId, favoriteCount, source } }
 *
 * Multiple mediaKeys can share a tweetId (multi-photo posts) — they
 * inherit identical metadata since the caption / event applies to the
 * whole tweet.
 *
 * Usage: node scripts/build-gallery-enrichments.js
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MAPPING_FILE = path.join(ROOT, 'public', 'data', 'img-archive-mapping.json');
const AUTH_FILE = path.join(ROOT, 'armeniaca-authentic-archive.json');
const EXCLUDES_FILE = path.join(ROOT, 'gallery-excludes.json');
const OUT_DIR = path.join(ROOT, 'public', 'data');
const OUT_FILE = path.join(OUT_DIR, 'gallery-enrichments.json');

const extractMediaKey = (url) => {
  if (!url) return null;
  const m = url.match(/\/media\/([A-Za-z0-9_-]+)/) || url.match(/x-([A-Za-z0-9_-]+)\./);
  return m ? m[1] : null;
};

const main = async () => {
  const mapping = JSON.parse(await readFile(MAPPING_FILE, 'utf8'));
  const auth = JSON.parse(await readFile(AUTH_FILE, 'utf8'));

  // Build tweetId → mediaKey[] map from authentic archive (one tweet
  // can carry multiple photos = multiple mediaKeys).
  const mediaKeysByTweetId = new Map();
  auth.forEach((entry) => {
    const mk = extractMediaKey(entry.url);
    if (!mk || !entry.tweetId) return;
    if (!mediaKeysByTweetId.has(entry.tweetId)) {
      mediaKeysByTweetId.set(entry.tweetId, []);
    }
    mediaKeysByTweetId.get(entry.tweetId).push(mk);
  });

  // For each mapping entry that has a tweetId + eventName, propagate
  // the metadata to every mediaKey that shares the tweet. Picking the
  // first occurrence per mediaKey (they should all agree since
  // metadata is per-tweet, not per-photo).
  const enrichments = {};
  let coveredMediaKeys = 0;
  let skippedDupes = 0;

  mapping.entries.forEach((entry) => {
    if (!entry.matched || !entry.tweetId) return;
    const mks = mediaKeysByTweetId.get(entry.tweetId) || [];
    mks.forEach((mk) => {
      if (enrichments[mk]) {
        skippedDupes++;
        return;
      }
      enrichments[mk] = {
        eventName: entry.eventName || null,
        eventDate: entry.eventDate || null,
        uploadDate: entry.uploadDate || entry.date || null,
        caption: entry.caption || null,
        hashtags: entry.hashtags || [],
        tweetId: entry.tweetId,
        tweetUrl: entry.tweetUrl || null,
        favoriteCount: entry.favoriteCount ?? null,
        source: entry.source || 'x',
      };
      coveredMediaKeys++;
    });
  });

  // Manual override entries (not matched to X) don't have a tweetId,
  // so they don't propagate via the tweet→media bridge. Surface them
  // via their img-NNN file path so the gallery can still pick them up
  // by alternate key (the gallery builds an img-NNN → mediaKey lookup
  // separately if needed).
  const manualByFile = {};
  mapping.entries.forEach((entry) => {
    if (entry.source === 'manual' && entry.eventName) {
      manualByFile[entry.file] = {
        eventName: entry.eventName || null,
        eventDate: entry.eventDate || null,
        source: 'manual',
        notes: entry.manualNotes || null,
      };
    }
  });

  // Pull in the exclude list so the consumer can filter promo / off-
  // topic frames at render time without us having to delete files.
  // Optional — missing file = empty exclude list (graceful default).
  let excludeMediaKeys = [];
  let excludeDetails = [];
  try {
    const excludesDoc = JSON.parse(await readFile(EXCLUDES_FILE, 'utf8'));
    excludeDetails = (excludesDoc.excludes || []).filter(
      (e) => e && e.mediaKey,
    );
    excludeMediaKeys = excludeDetails.map((e) => e.mediaKey);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    OUT_FILE,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        coveredMediaKeys,
        totalMappingEntries: mapping.entries.length,
        manualOverrideFiles: Object.keys(manualByFile).length,
        excludedMediaKeyCount: excludeMediaKeys.length,
        notes: {
          source:
            'Built from public/data/img-archive-mapping.json (caption + event metadata) joined to armeniaca-authentic-archive.json (mediaKey ↔ tweetId) by tweetId.',
          schema:
            'byMediaKey[mediaKey] = full metadata; manualByFile[img-NNN.jpg] = manual overrides for files outside the X scrape; excludeMediaKeys = mediaKeys to hide from the gallery (consumer filters at load).',
        },
        byMediaKey: enrichments,
        manualByFile,
        excludeMediaKeys,
        excludeDetails,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(`Built enrichments: ${coveredMediaKeys} mediaKeys covered.`);
  console.log(`Manual overrides: ${Object.keys(manualByFile).length} files.`);
  console.log(`Excluded mediaKeys: ${excludeMediaKeys.length}`);
  if (skippedDupes) console.log(`(skipped ${skippedDupes} duplicate mediaKey writes — same metadata across multi-photo tweets)`);
  console.log(`Output: ${path.relative(ROOT, OUT_FILE)}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
