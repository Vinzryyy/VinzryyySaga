/**
 * Image Optimizer
 *
 * For every /public/archive/img-*.jpg this script generates a sibling
 * .webp and .avif variant (max 1600px wide, original kept untouched).
 * Idempotent — skips files where both variants already exist.
 *
 * Run: npm run optimize-images
 */

import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE_DIR = path.join(__dirname, '..', 'public', 'archive');

const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
const AVIF_QUALITY = 55;
const AVIF_EFFORT = 4;

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  const files = await readdir(ARCHIVE_DIR);
  const jpgs = files.filter((f) => /\.jpe?g$/i.test(f)).sort();
  console.log(`Found ${jpgs.length} source JPG(s) in ${ARCHIVE_DIR}`);

  let processed = 0;
  let skipped = 0;
  const start = Date.now();

  for (const file of jpgs) {
    const base = path.basename(file, path.extname(file));
    const inputPath = path.join(ARCHIVE_DIR, file);
    const webpPath = path.join(ARCHIVE_DIR, `${base}.webp`);
    const avifPath = path.join(ARCHIVE_DIR, `${base}.avif`);

    const [hasWebp, hasAvif] = await Promise.all([exists(webpPath), exists(avifPath)]);
    if (hasWebp && hasAvif) {
      skipped += 1;
      continue;
    }

    const pipeline = sharp(inputPath).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });

    if (!hasWebp) {
      await pipeline.clone().webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(webpPath);
    }
    if (!hasAvif) {
      await pipeline.clone().avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toFile(avifPath);
    }

    processed += 1;
    if (processed % 10 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  [${processed}/${jpgs.length - skipped}] ${file} (${elapsed}s elapsed)`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone. Processed ${processed}, skipped ${skipped}. Total ${elapsed}s.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
