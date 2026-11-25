/**
 * Link previews. Runs after `vite build` (see "build" in package.json) and
 * writes dist/<page>/index.html for every public page and every Eli Note,
 * Rekap Live, weekly summary, Album Momen and news article: a copy of
 * dist/index.html with that page's title, description, URL and share image
 * already in <head>.
 *
 * WhatsApp, X, Discord, LINE and Telegram build previews from the raw HTML
 * without running JavaScript, so before this every shared link showed the
 * homepage's preview. Vercel serves these files ahead of the SPA rewrite in
 * vercel.json, and the app boots from them exactly as from index.html.
 *
 * Meta comes from src/lib/pageMeta.js, the same source as each page's <Seo>.
 * Data comes from public/data/, so every EliRecorder publish (which triggers
 * a deploy) gets previews for its new notes and recaps.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedNotes } from '../src/lib/eliNotes.js';
import { publicRecaps } from '../src/lib/liveRecaps.js';
import { mergeEnrichments } from '../src/lib/galleryEnrichments.js';
import { injectMeta, prerenderRoutes, routeFile } from '../src/lib/prerender.js';
import { GALLERY_IMAGES } from '../src/data/galleryData.js';
import NEWS_ARTICLES from '../src/data/newsArticles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

const readData = async (file) => {
  try {
    return JSON.parse(await fs.readFile(path.join(publicDir, 'data', file), 'utf8'));
  } catch (e) {
    console.warn(`prerender-meta: could not read public/data/${file} (${e.message}); its pages keep the default preview`);
    return null;
  }
};
const exists = (p) => fs.access(p).then(() => true, () => false);

try {
  const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
  const [notes, recaps, enrichments] = await Promise.all(['eli-notes.json', 'live-recaps.json', 'gallery-enrichments.json'].map(readData));
  const { routes, skipped } = prerenderRoutes({
    notes: publishedNotes(notes),
    recaps: publicRecaps(recaps),
    images: mergeEnrichments(GALLERY_IMAGES, enrichments),
    articles: NEWS_ARTICLES,
  });

  let written = 0;
  for (const route of routes) {
    const file = routeFile(route.path);
    // Never shadow a real file from public/ that answers the same URL.
    if (await exists(path.join(publicDir, file))) {
      skipped.push({ path: route.path, reason: `public/${file} already exists` });
      continue;
    }
    const out = path.join(dist, file);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, injectMeta(template, route.meta));
    written += 1;
  }
  for (const s of skipped) console.warn(`prerender-meta: skipped ${s.path}: ${s.reason}`);
  console.log(`prerender-meta: wrote ${written} pages with their own link preview`);
} catch (e) {
  console.error(`prerender-meta: ${e.message}`);
  process.exit(1);
}
