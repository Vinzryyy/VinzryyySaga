#!/usr/bin/env node
/**
 * Lemari Eli: split an illustrator's full look into a dress layer and a
 * shoes layer, so shoes can be worn with other dresses.
 *
 *   node scripts/split-lemari-look.mjs <look.png> <dress name> <shoes name>
 *   e.g. node scripts/split-lemari-look.mjs ~/Downloads/wimbledon.png dress_wimbledon shoes_wimbledon
 *
 * A look is one PNG on the base canvas: the dress (with its accessories) and
 * the shoes, drawn in place. The script cuts it at the widest band of fully
 * transparent rows in the lower half of the canvas, between the hem and the
 * shoes, so nothing is cut through. Both halves keep the whole canvas and are
 * written to assets/lemari/<name>.png at the size of assets/lemari/base_body.png;
 * then run `npm run build-lemari`.
 *
 * The repo is public, so assets/lemari holds web-size copies (1240×1754): pass
 * the illustrator's original here, and keep the original outside the repo.
 *
 * A look with no such band (a gown down to the floor) is refused: add it
 * whole as a dress instead.
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets/lemari');
const MIN_GAP = 24; // rows; anything narrower is a gap inside one item

const [look, dressName, shoesName] = process.argv.slice(2);
const NAME_RE = /^[a-z][a-z-]*_[a-z0-9-]+$/;
if (!look || !NAME_RE.test(dressName || '') || !NAME_RE.test(shoesName || '')) {
  console.error('Usage: node scripts/split-lemari-look.mjs <look.png> <dress name> <shoes name>\n  e.g. ... wimbledon.png dress_wimbledon shoes_wimbledon');
  process.exit(1);
}

const { data, info } = await sharp(look).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const rowHasInk = (y) => {
  for (let x = 0, i = y * width * 4 + 3; x < width; x += 1, i += 4) if (data[i] > 0) return true;
  return false;
};
const ink = Array.from({ length: height }, (_, y) => rowHasInk(y));

// Runs of empty rows with ink above and below, reaching into the lower half.
const gaps = [];
for (let y = 0; y < height; ) {
  if (ink[y]) { y += 1; continue; }
  const start = y;
  while (y < height && !ink[y]) y += 1;
  const inkAbove = ink.slice(0, start).some(Boolean);
  const inkBelow = y < height;
  if (inkAbove && inkBelow && y > height / 2 && y - start >= MIN_GAP) gaps.push({ start, end: y });
}
if (!gaps.length) {
  console.error(`${look}: no clear gap between the clothes and the shoes: add it whole, as one item.`);
  process.exit(1);
}
const gap = gaps.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
const cut = Math.round((gap.start + gap.end) / 2);

// Written at base_body's size. A look on another canvas is refused here, since
// resizing it would hide the mismatch from the build's aspect check.
const BASE = resolve(OUT, 'base_body.png');
const target = existsSync(BASE) ? await sharp(BASE).metadata() : { width, height };
if (Math.abs(target.width / target.height - width / height) > 0.005 * (width / height)) {
  console.error(`${look}: ${width}×${height} is not on the base canvas (${target.width}×${target.height}).`);
  process.exit(1);
}
const half = (keep) => {
  const out = Buffer.from(data);
  for (let y = 0; y < height; y += 1) if (!keep(y)) out.fill(0, y * width * 4, (y + 1) * width * 4);
  return sharp(out, { raw: { width, height, channels: 4 } })
    .resize(target.width, target.height, { fit: 'fill' })
    .png({ compressionLevel: 9 });
};
await half((y) => y < cut).toFile(resolve(OUT, `${dressName}.png`));
await half((y) => y >= cut).toFile(resolve(OUT, `${shoesName}.png`));
console.log(`  ${dressName} + ${shoesName}: cut at row ${cut} (empty rows ${gap.start}-${gap.end - 1} of ${height})`);
