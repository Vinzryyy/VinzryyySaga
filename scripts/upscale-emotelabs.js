/**
 * Convert EmoteLabs source GIFs ke animated WebP, dengan target-width
 * scaling biar reusable untuk source size beda-beda.
 *
 * Awalnya script ini hardcoded 4x karena semua source 112x112. Sekarang
 * pakai TARGET_WIDTH cap supaya source yang udah HD (mis. 500x500)
 * gak di-upscale berlebihan jadi 2000x2000 — waste bandwidth tanpa
 * benefit visible di Petikan card ~200px display.
 *
 * Scaling rule:
 *   scaleFactor = min(MAX_UPSCALE_FACTOR, TARGET_WIDTH / source.width)
 *   targetW    = max(source.width, round(source.width * scaleFactor))
 *
 * Contoh:
 *   - 112x112 source → 4x → 448x448 (sama kayak behavior lama)
 *   - 500x500 source → 1.6x → 800x800 (modest upscale + format gain)
 *   - 1200x1200 source → 1x → 1200x1200 (no upscale, format convert only)
 *
 * GIF palette quantization (256 color) bikin scale-up looks blocky,
 * jadi convert ke WebP yang support 24-bit color + better compression
 * tetep wajib bahkan kalau source udah HD.
 *
 * Settings:
 *   - kernel: lanczos3 (sharp default for cel-shaded chibi)
 *   - quality: 80 (good balance — visual artifacts minimal di 200-300px
 *     display, ~30% smaller dari q90. Was 90 sebelum perf audit 2026-05-27.)
 *   - effort: 6 (max libwebp compression effort — sekali run, file
 *     dipakai forever; CPU time saat build OK)
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
// Ceiling cap: bahkan source super-mini (mis. 64px) gak boleh upscale
// > 4x karena lanczos kelimit di sini — beyond itu fake detail.
const MAX_UPSCALE_FACTOR = 4;
// Target retina-grade density untuk display ~200-300px di Petikan card
// + lightbox. 800px = 3x density at 266px display, comfy.
const TARGET_WIDTH = 800;
const KERNEL = 'lanczos3';
const QUALITY = 80;
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
    const srcW = meta.width || 0;
    // Target = scale enough to hit TARGET_WIDTH, but capped at
    // MAX_UPSCALE_FACTOR; never downscale below source.
    const scaleFactor = Math.min(MAX_UPSCALE_FACTOR, TARGET_WIDTH / srcW);
    const targetW = Math.max(srcW, Math.round(srcW * scaleFactor));

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
