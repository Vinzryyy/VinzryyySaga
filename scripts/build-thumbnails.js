/**
 * Build Gallery Thumbnails
 *
 * Generates small (400px-wide) AVIF + WebP variants for every JPG under
 * `public/archive/x/` and writes them to `public/archive/x/thumbs/`.
 * The originals + the existing 1600px-wide webp/avif siblings stay
 * untouched — these are dedicated grid thumbnails so /gallery doesn't
 * have to download the full-resolution variants just to fill 200×200
 * cells.
 *
 * Idempotent: skips media keys whose AVIF + WebP thumb already exists.
 *
 * Run: npm run build-thumbnails
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'public', 'archive', 'x');
const OUT_DIR = path.join(SRC_DIR, 'thumbs');

// 400px is ~2× the rendered grid cell on a 5-col desktop breakpoint
// (max-w-5xl ÷ 5 ≈ 200px) and ~3× on mobile (3-col). Covers retina
// without being wasteful.
const THUMB_WIDTH = 400;
const WEBP_QUALITY = 72;
const AVIF_QUALITY = 50;
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
  await mkdir(OUT_DIR, { recursive: true });
  const files = await readdir(SRC_DIR);
  const jpgs = files.filter((f) => /^x-.*\.jpe?g$/i.test(f)).sort();
  console.log(`Found ${jpgs.length} source JPG(s) under ${path.relative(process.cwd(), SRC_DIR)}`);

  let processed = 0;
  let skipped = 0;
  const start = Date.now();

  for (const file of jpgs) {
    const base = path.basename(file, path.extname(file));
    const inputPath = path.join(SRC_DIR, file);
    const webpPath = path.join(OUT_DIR, `${base}.webp`);
    const avifPath = path.join(OUT_DIR, `${base}.avif`);

    const [hasWebp, hasAvif] = await Promise.all([exists(webpPath), exists(avifPath)]);
    if (hasWebp && hasAvif) {
      skipped += 1;
      continue;
    }

    const pipeline = sharp(inputPath)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true });

    if (!hasWebp) {
      await pipeline.clone().webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(webpPath);
    }
    if (!hasAvif) {
      await pipeline.clone().avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT }).toFile(avifPath);
    }

    processed += 1;
    if (processed % 25 === 0) {
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
