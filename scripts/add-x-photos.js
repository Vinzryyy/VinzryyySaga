/**
 * add-x-photos — add NEW @armeniaca15 photos to the gallery without
 * touching what is already there.
 *
 * import-x-archive.js rebuilds galleryData.js from scratch and still
 * expects .jpg files, which the archive dropped in favour of .webp.
 * This script is the additive path instead:
 *
 *   1. Read a capture list: [{ mediaKey, tweetId }] (one row per post is
 *      enough; the /media grid only shows each post's first photo).
 *   2. Fetch each tweet via the public syndication endpoint for the
 *      caption and ALL its photos.
 *   3. Skip media keys already in the gallery or in gallery-excludes.
 *   4. Download, write public/archive/x/x-KEY.{webp,avif} (1600px) and
 *      thumbs/x-KEY.{webp,avif} (400px).
 *   5. Append to data/armeniaca-authentic-archive.json,
 *      public/data/img-archive-mapping.json and src/data/galleryData.js.
 *
 * Then run: node scripts/build-gallery-enrichments.js && npm run build-memory-pool
 *
 * Usage: node scripts/add-x-photos.js path/to/capture.json [--dry]
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'archive', 'x');
const THUMB_DIR = path.join(OUT_DIR, 'thumbs');
const AUTH_FILE = path.join(ROOT, 'data', 'armeniaca-authentic-archive.json');
const EXCLUDES_FILE = path.join(ROOT, 'data', 'gallery-excludes.json');
const MAPPING_FILE = path.join(ROOT, 'public', 'data', 'img-archive-mapping.json');
const GALLERY_FILE = path.join(ROOT, 'src', 'data', 'galleryData.js');

// Same targets as import-x-archive.js / build-thumbnails.js.
const MAX_WIDTH = 1600;
const THUMB_WIDTH = 400;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchTweet = async (id) => {
  const token = (Number(BigInt(id) / 1000000000000000n) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
  const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=id&token=${token}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://platform.twitter.com/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for tweet ${id}`);
  return res.json();
};

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const stripEmoji = (s) => s
  .replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200D|\uFE0F/gu, '')
  .replace(/\s{2,}/g, ' ').trim();
const clean = (line) => stripEmoji(line.replace(/\s*(@\w+|#\S+|https?:\/\/\S+)/g, '')).replace(/^[\s,\-:.|/]+|[\s,\-:.|/]+$/g, '');

// "201126" is DDMMYY on newer posts, YYMMDD on older ones; pick the
// reading that is on/before the upload date and closest to it.
const parseDigits = (d, upload) => {
  const tryDate = (yy, mm, dd) => {
    const iso = `20${yy}-${mm}-${dd}`;
    const t = Date.parse(`${iso}T00:00:00Z`);
    return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== iso ? null : { iso, t };
  };
  const up = Date.parse(`${upload}T00:00:00Z`) + 86400000;
  const c = [tryDate(d.slice(4, 6), d.slice(2, 4), d.slice(0, 2)), tryDate(d.slice(0, 2), d.slice(2, 4), d.slice(4, 6))]
    .filter((x) => x && x.t <= up && x.t >= Date.parse('2023-01-01'))
    .sort((a, b) => Math.abs(up - a.t) - Math.abs(up - b.t));
  return c[0]?.iso || null;
};

/**
 * Captions look like "Greeting @H_EliJKT48\n\n201126 || SCTV Awards 2026 🧜🏻‍♀️\n\n#tags".
 * The event is the line that starts with a date; fall back to line one.
 */
export const parseCaption = (text, upload) => {
  const lines = decode(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(\d{6})\d?\s*[,\-:.|/]*\s*(.+)$/);
    if (!m) continue;
    const name = clean(m[2]);
    if (name) return { eventDate: parseDigits(m[1], upload) || upload, eventName: name };
  }
  const first = lines.map(clean).find(Boolean) || null;
  return { eventDate: upload, eventName: first };
};

const download = async (url) => {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (attempt >= 3) throw new Error(`HTTP ${res.status} ${url}`);
    await sleep(1000 * attempt);
  }
};

const readGallery = async () => {
  const src = await readFile(GALLERY_FILE, 'utf8');
  const start = src.indexOf('const RAW_DATA = ') + 'const RAW_DATA = '.length;
  const end = src.indexOf(';\n\nexport const GALLERY_IMAGES');
  if (start < 17 || end < 0) throw new Error('galleryData.js layout changed; cannot find RAW_DATA');
  return { src, start, end, records: JSON.parse(src.slice(start, end)) };
};

const main = async () => {
  const [input, ...flags] = process.argv.slice(2);
  if (!input) throw new Error('Usage: node scripts/add-x-photos.js capture.json [--dry]');
  const dry = flags.includes('--dry');
  const capture = JSON.parse(await readFile(path.resolve(input), 'utf8'));

  const auth = JSON.parse(await readFile(AUTH_FILE, 'utf8'));
  const excludes = JSON.parse(await readFile(EXCLUDES_FILE, 'utf8')).excludes || [];
  const gallery = await readGallery();
  const known = new Set([
    ...auth.map((e) => e.url.match(/\/media\/([\w-]+)/)?.[1]),
    ...gallery.records.map((r) => r.url.match(/x-([\w-]+)\./)?.[1]),
    ...excludes.map((e) => e.mediaKey),
  ].filter(Boolean));

  const tweetIds = [...new Set(capture.map((c) => c.tweetId))];
  console.log(`Fetching ${tweetIds.length} posts…`);

  const posts = [];
  for (const id of tweetIds) {
    try {
      const t = await fetchTweet(id);
      const upload = new Date(new Date(t.created_at).getTime() + 7 * 3600e3).toISOString().slice(0, 10);
      const photos = (t.mediaDetails || []).filter((m) => m.type === 'photo')
        .map((m) => m.media_url_https.match(/\/media\/([\w-]+)/)?.[1]).filter(Boolean);
      posts.push({ id, upload, text: t.text || '', photos, fav: t.favorite_count ?? null,
        hashtags: (t.entities?.hashtags || []).map((h) => h.text), ...parseCaption(t.text, upload) });
    } catch (err) {
      console.warn(`  ✗ ${id}: ${err.message}`);
    }
    await sleep(400);
  }

  const jobs = posts.flatMap((p) => p.photos.filter((k) => !known.has(k)).map((key) => ({ key, post: p })));
  console.log(`${posts.length} posts → ${jobs.length} new photos (${posts.reduce((n, p) => n + p.photos.length, 0) - jobs.length} already known/excluded)`);
  posts.forEach((p) => console.log(`  ${p.upload}  ${p.photos.length}×  ${p.eventName}`));
  if (dry) return;

  const added = [];
  for (const { key, post } of jobs) {
    try {
      const base = `x-${key}`;
      const buf = await download(`https://pbs.twimg.com/media/${key}?format=jpg&name=orig`);
      const full = sharp(buf).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
      const thumb = sharp(buf).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true });
      const [info] = await Promise.all([
        full.clone().webp({ quality: 82, effort: 5 }).toFile(path.join(OUT_DIR, `${base}.webp`)),
        full.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(OUT_DIR, `${base}.avif`)),
        thumb.clone().webp({ quality: 72, effort: 5 }).toFile(path.join(THUMB_DIR, `${base}.webp`)),
        thumb.clone().avif({ quality: 50, effort: 4 }).toFile(path.join(THUMB_DIR, `${base}.avif`)),
      ]);
      added.push({ key, post, dims: { width: info.width, height: info.height } });
      process.stdout.write('.');
    } catch (err) {
      console.warn(`\n  ✗ ${key}: ${err.message}`);
    }
  }
  console.log(`\nDownloaded ${added.length}/${jobs.length}`);
  if (!added.length) return;

  // 1. Authentic archive (mediaKey ↔ tweetId bridge for enrichments).
  for (const { key, post } of added) {
    const title = post.eventName || 'Eli JKT48 Moment';
    auth.push({
      id: `eli-tt-${key}`,
      url: `https://pbs.twimg.com/media/${key}?format=jpg&name=large`,
      thumbnail: `https://pbs.twimg.com/media/${key}?format=jpg&name=small`,
      title, description: title, category: 'all',
      year: post.upload.slice(0, 4), month: MONTHS[+post.upload.slice(5, 7) - 1], date: post.upload,
      location: 'JKT48 Theater', dimensions: { width: 4000, height: 6000 }, featured: false, tweetId: post.id,
    });
  }
  auth.sort((a, b) => b.date.localeCompare(a.date));
  await writeFile(AUTH_FILE, `${JSON.stringify(auth, null, 2)}\n`);

  // 2. Caption/event mapping: one entry per post (enrichments fan it out
  //    to every photo of that tweet).
  const mapping = JSON.parse(await readFile(MAPPING_FILE, 'utf8'));
  const mapped = new Set(mapping.entries.map((e) => e.tweetId).filter(Boolean));
  for (const post of new Map(added.map((a) => [a.post.id, a.post])).values()) {
    if (mapped.has(post.id)) continue;
    mapping.entries.push({
      file: `x-${post.photos[0]}.webp`, path: `/archive/x/x-${post.photos[0]}.webp`,
      matched: true, confidence: 1, date: post.upload, year: post.upload.slice(0, 4),
      tweetId: post.id, tweetUrl: `https://x.com/armeniaca15/status/${post.id}`,
      caption: post.text, eventName: post.eventName, uploadDate: post.upload, eventDate: post.eventDate,
      hashtags: post.hashtags, favoriteCount: post.fav, source: 'x',
    });
  }
  mapping.totalFiles = mapping.entries.length;
  mapping.matched = mapping.entries.filter((e) => e.matched).length;
  mapping.enrichedAt = new Date().toISOString();
  await writeFile(MAPPING_FILE, `${JSON.stringify(mapping, null, 2)}\n`);

  // 3. galleryData.js — keep every existing record, add the new ones.
  const records = [...gallery.records];
  for (const { key, post, dims } of added) {
    const title = post.eventName || 'Eli JKT48 Moment';
    records.push({
      id: `eli-tt-${key}`, url: `/archive/x/x-${key}.webp`, thumbnail: `/archive/x/x-${key}.webp`,
      title, description: title, category: 'all',
      year: post.upload.slice(0, 4), month: MONTHS[+post.upload.slice(5, 7) - 1], date: post.upload,
      location: 'JKT48 Theater', dimensions: dims, featured: false,
    });
  }
  records.sort((a, b) => b.date.localeCompare(a.date));
  records.forEach((r, i) => { r.featured = i < 6; });
  const head = gallery.src.slice(0, gallery.start).replace(/Last updated: .*/, `Last updated: ${new Date().toISOString()}`);
  await writeFile(GALLERY_FILE, head + JSON.stringify(records, null, 2) + gallery.src.slice(gallery.end));
  console.log(`galleryData.js: ${gallery.records.length} → ${records.length} records`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
