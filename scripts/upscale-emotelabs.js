/**
 * Upscale EmoteLabs source GIFs ke animated WebP (4x, ~448x448).
 *
 * Source GIFs di public/EmoteLabs/ adalah 112x112 — too low-res buat
 * Petikan card display (~200px container). GIF palette quantization
 * (256 color) bikin scale-up looks blocky, jadi convert ke WebP yang
 * support 24-bit color + better compression.
 *
 * Settings:
 *   - kernel: lanczos3 (sharp default for cel-shaded chibi)
 *   - quality: 90 (visual ~indistinguishable dari lossless, much smaller)
 *   - effort: 6 (max libwebp compression effort — sekali run, file
 *     dipakai forever; CPU time saat build OK)
 *   - 4x upscale → ~448x448 final size
 *
 * Usage:
 *   node scripts/upscale-emotelabs.js
 *
 * Re-runnable: skip files yang udah ada .webp + .gif missing. Re-encode
 * kalau .gif lebih baru dari .webp.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DIR = path.join(__dirname, '..', 'public', 'EmoteLabs');
const UPSCALE_FACTOR = 4;
const KERNEL = 'lanczos3';
const QUALITY = 90;
const EFFORT = 6;

const main = async () => {
  if (!fs.existsSync(DIR)) {
    console.error(`Dir not found: ${DIR}`);
    process.exit(1);
  }

  const gifs = fs
    .readdirSync(DIR)
    .filter((f) => f.toLowerCase().endsWith('.gif'));

  if (gifs.length === 0) {
    console.log('No .gif files to convert — nothing to do.');
    return;
  }

  let done = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const f of gifs) {
    const srcPath = path.join(DIR, f);
    const dstPath = path.join(DIR, f.replace(/\.gif$/i, '.webp'));

    // Skip kalau .webp udah newer than .gif (idempotent re-run).
    if (fs.existsSync(dstPath)) {
      const srcStat = fs.statSync(srcPath);
      const dstStat = fs.statSync(dstPath);
      if (dstStat.mtimeMs >= srcStat.mtimeMs) {
        console.log(`SKIP   ${f} (.webp up-to-date)`);
        continue;
      }
    }

    const meta = await sharp(srcPath, { animated: true }).metadata();
    const targetW = (meta.width || 0) * UPSCALE_FACTOR;

    const info = await sharp(srcPath, { animated: true })
      .resize({ width: targetW, kernel: KERNEL })
      .webp({ quality: QUALITY, effort: EFFORT })
      .toFile(dstPath);

    const inSize = fs.statSync(srcPath).size;
    totalIn += inSize;
    totalOut += info.size;
    done++;
    console.log(
      `OK     ${f.padEnd(54)} ${meta.width}x${meta.pageHeight || meta.height} → ${info.width}x${info.pageHeight || info.height}  ` +
        `${(inSize / 1024).toFixed(1)}KB → ${(info.size / 1024).toFixed(1)}KB`,
    );
  }

  // Delete original GIFs that have a matching .webp now (committed
  // step — caller bisa git revert kalau salah, atau re-encode dgn
  // script + .gif yang masih ada di history).
  for (const f of gifs) {
    const srcPath = path.join(DIR, f);
    const dstPath = path.join(DIR, f.replace(/\.gif$/i, '.webp'));
    if (fs.existsSync(dstPath)) {
      fs.unlinkSync(srcPath);
      console.log(`RM     ${f}`);
    }
  }

  console.log(
    `\nDone: ${done} converted. ` +
      `Total: ${(totalIn / 1024).toFixed(1)}KB → ${(totalOut / 1024).toFixed(1)}KB ` +
      `(${(((totalOut - totalIn) / totalIn) * 100).toFixed(0)}% size change).`,
  );
};

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
