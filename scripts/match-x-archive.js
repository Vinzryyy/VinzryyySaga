/**
 * match-x-archive — match legacy /public/archive/img-NNN.jpg files to
 * X-imported /public/archive/x/x-MEDIAKEY.jpg files via perceptual
 * hash (dHash), then cross-reference matches with the upload metadata
 * in armeniaca-authentic-archive.json (date, year, tweetId).
 *
 * Why: the legacy img-NNN files have no source metadata; the X-imported
 * ones do. Matching them by image content lets us bring the dates and
 * tweet IDs across so the existing assets become traceable.
 *
 * What this CAN'T do:
 *   - caption text / event name — those don't exist anywhere yet. The
 *     extract-x-media.js v4 script that produced authentic-archive.json
 *     only captured image URLs and tweet IDs (date is decoded from the
 *     Snowflake ID), not caption bodies. To fill caption / eventName
 *     fields, either (a) get an X API bearer token and run
 *     sync-x-archive.js, or (b) write an extract-x-media-v5.js that
 *     captures caption text and re-run the manual scrape.
 *
 * Output: public/data/img-archive-mapping.json
 *   Array of one entry per img-NNN file:
 *     {
 *       file: "img-070.jpg",
 *       path: "/archive/img-070.jpg",
 *       matched: true | false,
 *       confidence: 0..1,            // 1 = exact dHash match
 *       date: "2024-03-01" | null,   // upload date (from tweet snowflake)
 *       year: "2024" | null,
 *       tweetId: "..." | null,
 *       tweetUrl: "https://x.com/..." | null,
 *       caption: null,               // not available without X access
 *       eventName: null,             // not available without X access
 *     }
 *
 * Usage: node scripts/match-x-archive.js
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ARCHIVE_DIR = path.join(ROOT, 'public', 'archive');
const X_DIR = path.join(ARCHIVE_DIR, 'x');
const AUTH_JSON = path.join(ROOT, 'data', 'armeniaca-authentic-archive.json');
const OUT_DIR = path.join(ROOT, 'public', 'data');
const OUT_FILE = path.join(OUT_DIR, 'img-archive-mapping.json');

// dHash: resize to 9x8 grayscale, compare each pixel to the one on its
// right, output a 64-bit hash. Robust against scaling, JPEG artifacts,
// and minor color shifts. Hamming distance threshold ~10 = same image.
const dhash = async (filePath) => {
  const raw = await sharp(filePath)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer();

  const bits = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = raw[row * 9 + col];
      const right = raw[row * 9 + col + 1];
      bits.push(left < right ? 1 : 0);
    }
  }
  return bits;
};

const hamming = (a, b) => {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
};

const MATCH_THRESHOLD = 12; // out of 64 — empirically robust for compressed JPEGs

const main = async () => {
  // Load X-imported metadata. Map mediaKey → entry so we can look up
  // date/tweetId once we know which mediaKey a legacy file matches.
  const authRaw = await readFile(AUTH_JSON, 'utf8');
  const authEntries = JSON.parse(authRaw);
  const metaByMediaKey = new Map();
  authEntries.forEach((e) => {
    const m = e.url?.match(/\/media\/([A-Za-z0-9_-]+)/);
    if (m) metaByMediaKey.set(m[1], e);
  });
  console.log(`Loaded ${metaByMediaKey.size} X archive entries with metadata.`);

  // Hash all x-MEDIAKEY images. Keyed by mediaKey for join later.
  const xFiles = (await readdir(X_DIR)).filter((f) => f.endsWith('.jpg'));
  console.log(`Hashing ${xFiles.length} X-imported images...`);
  const xHashes = [];
  for (const f of xFiles) {
    const mediaKey = f.replace(/^x-/, '').replace(/\.jpg$/, '');
    try {
      const hash = await dhash(path.join(X_DIR, f));
      xHashes.push({ mediaKey, file: f, hash });
    } catch (err) {
      console.warn(`  skip ${f}: ${err.message}`);
    }
  }

  // Hash all img-NNN files (top-level archive dir, not subdirs).
  const allFiles = await readdir(ARCHIVE_DIR);
  const imgFiles = allFiles
    .filter((f) => /^img-\d+\.jpg$/.test(f))
    .sort();
  console.log(`Hashing ${imgFiles.length} legacy img-NNN images...`);

  const results = [];
  let matchedCount = 0;
  for (let i = 0; i < imgFiles.length; i++) {
    const f = imgFiles[i];
    if (i % 50 === 0) console.log(`  ${i}/${imgFiles.length}...`);
    let entry = {
      file: f,
      path: `/archive/${f}`,
      matched: false,
      confidence: 0,
      date: null,
      year: null,
      tweetId: null,
      tweetUrl: null,
      caption: null,
      eventName: null,
    };

    try {
      const hash = await dhash(path.join(ARCHIVE_DIR, f));
      // Find best Hamming match across X archive
      let best = { dist: Infinity, x: null };
      for (const x of xHashes) {
        const d = hamming(hash, x.hash);
        if (d < best.dist) best = { dist: d, x };
      }
      if (best.dist <= MATCH_THRESHOLD && best.x) {
        const meta = metaByMediaKey.get(best.x.mediaKey);
        if (meta) {
          matchedCount++;
          entry = {
            ...entry,
            matched: true,
            confidence: Number((1 - best.dist / 64).toFixed(3)),
            date: meta.date || null,
            year: meta.year ? String(meta.year) : null,
            tweetId: meta.tweetId || null,
            tweetUrl: meta.tweetId
              ? `https://x.com/armeniaca15/status/${meta.tweetId}`
              : null,
          };
        }
      }
    } catch (err) {
      console.warn(`  skip ${f}: ${err.message}`);
    }

    results.push(entry);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    OUT_FILE,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalFiles: results.length,
        matched: matchedCount,
        unmatched: results.length - matchedCount,
        notes: {
          methodology:
            'Perceptual dHash (9x8 grayscale, Hamming distance threshold 12/64). Matched legacy img-NNN files to x-MEDIAKEY files imported from @armeniaca15.',
          missingFields:
            'caption + eventName are null because X caption text was never captured by extract-x-media.js v4. Fill via X API (sync-x-archive.js with bearer token) or extract-x-media-v5.js that captures tweet caption text.',
          source: 'armeniaca-authentic-archive.json (manual browser-console scrape via extract-x-media.js)',
        },
        entries: results,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(`\nDone. ${matchedCount}/${results.length} matched.`);
  console.log(`Output: ${path.relative(ROOT, OUT_FILE)}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
