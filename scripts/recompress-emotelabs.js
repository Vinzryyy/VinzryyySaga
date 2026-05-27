/**
 * Re-encode existing public/EmoteLabs/*.webp ke quality 80.
 *
 * Use case: source GIFs udah dihapus setelah upscale-emotelabs.js
 * pertama (q90, ~69MB total). Audit perf 2026-05-27 nunjukin file
 * size kegedean untuk mobile. Re-encode ke q80 = ~30-40% lebih kecil,
 * visual difference minimal di display ~200-300px.
 *
 * Trade-off: transcoding lossy → lossy. Pass kedua loses sedikit
 * quality. Visually masih acceptable untuk Petikan cards, tapi bukan
 * cara ideal. Kalau punya source GIFs, re-run upscale-emotelabs.js
 * (sekarang q80 default).
 *
 * Output: overwrite .webp di-place. Backup ke .webp.bak kalau --backup.
 *
 * Usage:
 *   node scripts/recompress-emotelabs.js
 *   node scripts/recompress-emotelabs.js --backup
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DIR = path.join(__dirname, '..', 'public', 'EmoteLabs');
const QUALITY = 80;
const EFFORT = 6;
const BACKUP = process.argv.includes('--backup');

const main = async () => {
  if (!fs.existsSync(DIR)) {
    console.error(`Dir not found: ${DIR}`);
    process.exit(1);
  }

  const webps = fs
    .readdirSync(DIR)
    .filter((f) => f.toLowerCase().endsWith('.webp'));

  if (webps.length === 0) {
    console.log('No .webp files — nothing to do.');
    return;
  }

  let done = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const f of webps) {
    const srcPath = path.join(DIR, f);
    const tmpPath = path.join(DIR, `${f}.tmp`);
    const bakPath = path.join(DIR, `${f}.bak`);

    const inSize = fs.statSync(srcPath).size;

    // Read whole file into buffer first — sharp ke .toFile() same path
    // bakal race condition.
    const inputBuffer = fs.readFileSync(srcPath);

    await sharp(inputBuffer, { animated: true })
      .webp({ quality: QUALITY, effort: EFFORT })
      .toFile(tmpPath);

    const outSize = fs.statSync(tmpPath).size;

    if (BACKUP) {
      fs.renameSync(srcPath, bakPath);
    }
    fs.renameSync(tmpPath, srcPath);

    totalIn += inSize;
    totalOut += outSize;
    done++;
    const pct = ((outSize - inSize) / inSize) * 100;
    console.log(
      `OK ${f.padEnd(54)} ${(inSize / 1024).toFixed(0)}KB → ${(outSize / 1024).toFixed(0)}KB  (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)`,
    );
  }

  console.log(
    `\nDone: ${done} re-encoded. ` +
      `Total: ${(totalIn / 1048576).toFixed(1)}MB → ${(totalOut / 1048576).toFixed(1)}MB ` +
      `(${(((totalOut - totalIn) / totalIn) * 100).toFixed(0)}% size change).` +
      (BACKUP ? '\n[.bak files preserved — review then delete.]' : ''),
  );
};

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
