/**
 * X Archive Importer — full pipeline: download → resize → write gallery
 *
 * Reads `armeniaca-authentic-archive.json` (output from `extract-x-media.js`
 * pasted in browser console on x.com/armeniaca15/media), downloads each
 * `pbs.twimg.com` URL, auto-resizes via sharp (max 1600px wide — matches
 * `scripts/optimize-images.js`), writes `.jpg / .webp / .avif` siblings to
 * `public/archive/x/`, then regenerates `src/data/galleryData.js` so it
 * points at the new local files with real Snowflake-decoded dates.
 *
 * Idempotent: skips media keys whose three variants already exist.
 *
 * Usage:
 *   npm run import-x-archive                       # uses default JSON
 *   node scripts/import-x-archive.js path/to.json  # custom input
 *
 * Workflow:
 *   1. Open https://x.com/armeniaca15/media
 *   2. Scroll to the very bottom (load full history)
 *   3. F12 → paste contents of `extract-x-media.js`
 *   4. Replace `armeniaca-authentic-archive.json` with the downloaded file
 *   5. Run this script
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const INPUT_JSON = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'armeniaca-authentic-archive.json');
const OUT_DIR = path.join(ROOT, 'public', 'archive', 'x');
const GALLERY_OUTPUT = path.join(ROOT, 'src', 'data', 'galleryData.js');

// Resize / encoding parameters — kept in sync with optimize-images.js
// so all archive imagery shares one quality target.
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 82;
const AVIF_QUALITY = 55;
const AVIF_EFFORT = 4;
const JPG_QUALITY = 88;

// Concurrency for download + resize. Twimg tolerates this fine; raising
// past ~6 starts hitting transient 429s in practice.
const CONCURRENCY = 4;

const exists = async (p) =>
  access(p).then(() => true).catch(() => false);

// pbs.twimg.com follows ~302 once for region routing; chase up to 3 hops.
const downloadBuffer = (url, hops = 0) =>
  new Promise((resolve, reject) => {
    if (hops > 3) return reject(new Error(`Too many redirects: ${url}`));
    https
      .get(url, { headers: { 'User-Agent': 'armeniaca-archive-importer/1.0' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          downloadBuffer(next, hops + 1).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });

// Stable basename derived from the twimg media key so re-runs are
// idempotent. Example URL:
//   https://pbs.twimg.com/media/GHmSHjFaEAA28L0?format=jpg&name=large
// → media key `GHmSHjFaEAA28L0` → basename `x-GHmSHjFaEAA28L0`.
const mediaKeyFromUrl = (url) => {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/media\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const normalizeEntry = (entry) => {
  // Re-derive month/year from `date` so any drift between fields is
  // canonicalized off the ISO date string.
  const d = new Date(`${entry.date}T00:00:00Z`);
  return {
    ...entry,
    year: String(d.getUTCFullYear()),
    month: monthNames[d.getUTCMonth()],
  };
};

const processEntry = async (entry, mediaKey) => {
  const baseName = `x-${mediaKey}`;
  const jpgPath = path.join(OUT_DIR, `${baseName}.jpg`);
  const webpPath = path.join(OUT_DIR, `${baseName}.webp`);
  const avifPath = path.join(OUT_DIR, `${baseName}.avif`);

  const [hasJpg, hasWebp, hasAvif] = await Promise.all([
    exists(jpgPath),
    exists(webpPath),
    exists(avifPath),
  ]);

  // Always need real dimensions for galleryData even on skip — read from
  // the existing jpg if it's there, otherwise download fresh.
  let dims;

  if (hasJpg && hasWebp && hasAvif) {
    const meta = await sharp(jpgPath).metadata();
    dims = { width: meta.width, height: meta.height };
    return { baseName, dims, status: 'skipped' };
  }

  const buf = await downloadBuffer(entry.url);
  const meta = await sharp(buf).metadata();
  const willResize = meta.width > MAX_WIDTH;
  dims = willResize
    ? { width: MAX_WIDTH, height: Math.round((meta.height * MAX_WIDTH) / meta.width) }
    : { width: meta.width, height: meta.height };

  const pipeline = sharp(buf)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true });

  const jobs = [];
  if (!hasJpg) jobs.push(pipeline.clone().jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toFile(jpgPath));
  if (!hasWebp) jobs.push(pipeline.clone().webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(webpPath));
  if (!hasAvif) jobs.push(pipeline.clone().avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toFile(avifPath));
  await Promise.all(jobs);

  return { baseName, dims, status: 'processed' };
};

const writeGalleryData = async (records) => {
  // Newest first. Featured = first 6 (consistent with original generator).
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  sorted.forEach((r, idx) => {
    r.featured = idx < 6;
  });

  const fileContent = `/**
 * Gallery Data — sourced from @armeniaca15 on X
 * Auto-generated by scripts/import-x-archive.js
 * Last updated: ${new Date().toISOString()}
 *
 * Do not edit by hand. Re-run \`npm run import-x-archive\` after refreshing
 * \`armeniaca-authentic-archive.json\` to regenerate this file.
 */

export const CATEGORIES = [
  { id: 'all', label: 'All Archive', icon: 'ri-gallery-line' },
];

const RAW_DATA = ${JSON.stringify(sorted, null, 2)};

export const GALLERY_IMAGES = RAW_DATA.map((img) => ({
  ...img,
  era: img.year, // year used as era for filter pills
}));

export const getAvailableEras = () => {
  const years = [...new Set(RAW_DATA.map((img) => img.year))].sort((a, b) => b.localeCompare(a));
  return years.map((year) => ({ id: year, label: \`\${year} Archive\` }));
};

export const getFeaturedImages = () => GALLERY_IMAGES.filter((img) => img.featured);
export const getImageById = (id) => GALLERY_IMAGES.find((img) => img.id === id);
`;

  await writeFile(GALLERY_OUTPUT, fileContent, 'utf8');
};

const main = async () => {
  console.log(`Reading ${path.relative(ROOT, INPUT_JSON)}`);
  const raw = await readFile(INPUT_JSON, 'utf8');
  const entries = JSON.parse(raw).map(normalizeEntry);
  console.log(`Found ${entries.length} entries`);

  await mkdir(OUT_DIR, { recursive: true });

  const queue = entries.map((entry) => ({
    entry,
    mediaKey: mediaKeyFromUrl(entry.url),
  }));

  // Drop entries whose URL doesn't match the twimg media pattern (rare —
  // usually only happens with hand-edited rows).
  const valid = queue.filter((q) => q.mediaKey);
  const dropped = queue.length - valid.length;
  if (dropped) console.log(`Skipping ${dropped} entries with unrecognised URLs`);

  const results = [];
  let completed = 0;
  let processed = 0;
  let skipped = 0;
  const start = Date.now();

  const worker = async (q) => {
    while (q.length) {
      const { entry, mediaKey } = q.shift();
      try {
        const result = await processEntry(entry, mediaKey);
        results.push({
          id: entry.id,
          url: `/archive/x/${result.baseName}.jpg`,
          thumbnail: `/archive/x/${result.baseName}.webp`,
          title: entry.title,
          description: entry.description,
          category: 'all',
          year: entry.year,
          month: entry.month,
          date: entry.date,
          location: entry.location || 'JKT48 Theater',
          dimensions: result.dims,
          featured: false, // overwritten in writeGalleryData
        });
        if (result.status === 'processed') processed += 1;
        else skipped += 1;
      } catch (err) {
        console.error(`  ✗ ${entry.id}: ${err.message}`);
      } finally {
        completed += 1;
        if (completed % 10 === 0 || completed === valid.length) {
          const elapsed = ((Date.now() - start) / 1000).toFixed(1);
          console.log(`  [${completed}/${valid.length}] processed=${processed} skipped=${skipped} (${elapsed}s)`);
        }
      }
    }
  };

  const sharedQueue = [...valid];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(sharedQueue)));

  if (results.length === 0) {
    console.error('No entries processed successfully — galleryData.js untouched.');
    process.exit(1);
  }

  await writeGalleryData(results);
  console.log(
    `\nDone. Wrote ${path.relative(ROOT, GALLERY_OUTPUT)} with ${results.length} records.`
  );
};

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
