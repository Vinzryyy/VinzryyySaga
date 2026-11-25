#!/usr/bin/env node
/**
 * Lemari Eli assets: assets/lemari/*.{png,svg} → public/minigames/lemari/
 *
 *   node scripts/build-lemari-assets.mjs
 *
 * Every layer is drawn on the same canvas as base_body (same aspect ratio,
 * clothes already in place over the body), so the game just stacks the
 * files at 0,0. This script:
 *   - refuses any file whose aspect ratio differs from base_body (a layer
 *     on the wrong canvas would sit visibly off the body);
 *   - writes full/<name>.webp at the web canvas size: base_body's size,
 *     halved (or more) while it is taller than MAX_HEIGHT;
 *   - writes thumb/<name>.webp: the item cropped to its own pixels and fit
 *     into 240×240, for the wardrobe grid;
 *   - deletes built files whose source is gone;
 *   - writes manifest.json ({ canvas, files }) which tests check data
 *     against.
 *
 * Naming: <slot>_<id>.png, e.g. dress_ntmu-isshou.png, shoes_boots-hitam.png,
 * bg_teater.svg; base_body.png is the body layer. A full look from the
 * illustrator (dress and shoes in one file) is split first with
 * scripts/split-lemari-look.mjs. See docs/lemari-eli.md.
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'assets/lemari');
const OUT = resolve(ROOT, 'public/minigames/lemari');
const THUMB = 240;
const ASPECT_TOLERANCE = 0.005;
// The stage is at most 680 px tall and the card figure about 1040 px, so
// 1800 px stays sharp on 2x screens. Whole steps (1/2, 1/3) keep lines crisp.
const MAX_HEIGHT = 1800;

const files = readdirSync(SRC).filter((f) => /\.(png|svg)$/i.test(f)).sort();
if (!files.includes('base_body.png')) {
  console.error('assets/lemari/base_body.png is missing: every layer is measured against it.');
  process.exit(1);
}

const base = await sharp(resolve(SRC, 'base_body.png')).metadata();
const step = Math.max(1, Math.ceil(base.height / MAX_HEIGHT));
const canvas = { width: Math.round(base.width / step), height: Math.round(base.height / step) };
const aspect = base.width / base.height;

mkdirSync(resolve(OUT, 'full'), { recursive: true });
mkdirSync(resolve(OUT, 'thumb'), { recursive: true });

const errors = [];
const manifest = {};
for (const file of files) {
  const name = basename(file, extname(file));
  const isSvg = /\.svg$/i.test(file);
  // SVGs are drawn at the source canvas size; render them at least as large as the web canvas.
  const density = isSvg ? Math.max(72, Math.ceil((72 * canvas.width) / (await sharp(resolve(SRC, file)).metadata()).width)) : undefined;
  const buf = await sharp(resolve(SRC, file), isSvg ? { density } : {}).png().toBuffer();
  const meta = await sharp(buf).metadata();
  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - aspect) / aspect > ASPECT_TOLERANCE) {
    errors.push(`${file}: ${meta.width}×${meta.height} is not on the base canvas (${canvas.width}×${canvas.height} ratio).`);
    continue;
  }
  await sharp(buf)
    .resize(canvas.width, canvas.height, { fit: 'fill' })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(resolve(OUT, 'full', `${name}.webp`));
  // Thumbnail: crop to the item's own pixels (backgrounds stay whole).
  const thumbSrc = name.startsWith('bg_') ? sharp(buf) : sharp(buf).trim({ threshold: 1 });
  await thumbSrc
    .resize(THUMB, THUMB, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile(resolve(OUT, 'thumb', `${name}.webp`));
  manifest[name] = { width: canvas.width, height: canvas.height };
  console.log(`  ${name}  ${meta.width}×${meta.height} → ${canvas.width}×${canvas.height}`);
}

if (errors.length) {
  console.error(`\n${errors.length} file(s) rejected:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

// Built files whose source was removed or renamed would otherwise stay in public/.
for (const dir of ['full', 'thumb']) {
  for (const f of readdirSync(resolve(OUT, dir))) {
    if (f.endsWith('.webp') && !manifest[basename(f, '.webp')]) {
      rmSync(resolve(OUT, dir, f));
      console.log(`  removed ${dir}/${f}`);
    }
  }
}

writeFileSync(resolve(OUT, 'manifest.json'), `${JSON.stringify({ canvas, files: manifest }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(manifest).length} layer(s) to public/minigames/lemari/.`);
