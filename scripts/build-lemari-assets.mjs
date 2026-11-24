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
 *   - writes full/<name>.webp at the source size (SVG backgrounds are
 *     rasterised at base_body's size);
 *   - writes thumb/<name>.webp: the item cropped to its own pixels and fit
 *     into 240×240, for the wardrobe grid;
 *   - writes manifest.json ({ canvas, files }) which tests check data
 *     against.
 *
 * Naming: <slot>_<id>.png, e.g. dress_ntmu-isshou.png, shoes_boots-hitam.png,
 * bg_teater.svg; base_body.png and base_hair-front.png are the body layers.
 * See docs/lemari-eli.md for the illustrator brief.
 */

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'assets/lemari');
const OUT = resolve(ROOT, 'public/minigames/lemari');
const THUMB = 240;
const ASPECT_TOLERANCE = 0.005;

const files = readdirSync(SRC).filter((f) => /\.(png|svg)$/i.test(f)).sort();
if (!files.includes('base_body.png')) {
  console.error('assets/lemari/base_body.png is missing: every layer is measured against it.');
  process.exit(1);
}

const base = await sharp(resolve(SRC, 'base_body.png')).metadata();
const canvas = { width: base.width, height: base.height };
const aspect = canvas.width / canvas.height;

mkdirSync(resolve(OUT, 'full'), { recursive: true });
mkdirSync(resolve(OUT, 'thumb'), { recursive: true });

const errors = [];
const manifest = {};
for (const file of files) {
  const name = basename(file, extname(file));
  const isSvg = /\.svg$/i.test(file);
  const input = isSvg
    ? sharp(resolve(SRC, file), { density: 300 }).resize(canvas.width, canvas.height, { fit: 'fill' })
    : sharp(resolve(SRC, file));
  const buf = await input.png().toBuffer();
  const meta = await sharp(buf).metadata();
  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - aspect) / aspect > ASPECT_TOLERANCE) {
    errors.push(`${file}: ${meta.width}×${meta.height} is not on the base canvas (${canvas.width}×${canvas.height} ratio).`);
    continue;
  }
  await sharp(buf).webp({ quality: 88, alphaQuality: 100 }).toFile(resolve(OUT, 'full', `${name}.webp`));
  // Thumbnail: crop to the item's own pixels (backgrounds stay whole).
  const thumbSrc = name.startsWith('bg_') ? sharp(buf) : sharp(buf).trim({ threshold: 1 });
  await thumbSrc
    .resize(THUMB, THUMB, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile(resolve(OUT, 'thumb', `${name}.webp`));
  manifest[name] = { width: meta.width, height: meta.height };
  console.log(`  ${name}  ${meta.width}×${meta.height}`);
}

if (errors.length) {
  console.error(`\n${errors.length} file(s) rejected:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

writeFileSync(resolve(OUT, 'manifest.json'), `${JSON.stringify({ canvas, files: manifest }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(manifest).length} layer(s) to public/minigames/lemari/.`);
