/**
 * Build-time link previews: turns the built index.html into one HTML file
 * per public page, each with that page's title, description, URL and share
 * image in <head>. scripts/prerender-meta.js does the file IO; this module
 * is pure so tests can run it on the real index.html.
 */

import { DEFAULT_IMAGE, NOINDEX, PAGES, articleMeta, fullTitle, galleryYearMeta, momentMeta, noteMeta, pageUrl, recapMeta, weekMeta } from './pageMeta.js';
import { weeklySummaries } from './liveRecaps.js';
import { buildMoments } from './moments.js';

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const imageType = (url) => IMAGE_TYPES[String(url).split(/[?#]/)[0].split('.').pop().toLowerCase()];

const TITLE_RE = /<title>[^<]*<\/title>/;
const CANONICAL_RE = /<link\s[^>]*\brel="canonical"[^>]*>/;
const metaRe = (key, name) => new RegExp(`<meta\\s[^>]*\\b${key}="${name}"[^>]*>`);

// Sets `attr` on the one tag that `re` matches. Throws when index.html no
// longer has exactly one such tag, so a template change fails the build
// instead of shipping wrong previews.
const setAttr = (html, label, re, attr, value) => {
  const found = html.match(new RegExp(re.source, 'g')) || [];
  if (found.length !== 1) throw new Error(`index.html should have exactly one ${label}, found ${found.length}`);
  const attrRe = new RegExp(`\\s${attr}="[^"]*"`);
  if (!attrRe.test(found[0])) throw new Error(`index.html: ${label} has no ${attr}="…"`);
  // Function replacers: a "$&" in a note's text must stay literal.
  return html.replace(re, (tag) => tag.replace(attrRe, () => ` ${attr}="${escapeAttr(value)}"`));
};

/**
 * index.html with the head tags of one page: meta = { path, title?,
 * description?, image?, type?, noindex? }, the same shape <Seo> takes. A
 * missing description or image keeps the site's default. `noindex` adds a
 * robots tag, so a link-only page keeps its preview but stays out of search
 * engines (crawlers that run no JavaScript never see <Seo>'s copy).
 */
export const injectMeta = (html, meta) => {
  const title = fullTitle(meta.title);
  const url = pageUrl(meta.path);
  const image = meta.image || DEFAULT_IMAGE;

  const titles = html.match(new RegExp(TITLE_RE.source, 'g')) || [];
  if (titles.length !== 1) throw new Error(`index.html should have exactly one <title>, found ${titles.length}`);
  let out = html.replace(TITLE_RE, () => `<title>${escapeText(title)}</title>`);
  out = setAttr(out, 'canonical link', CANONICAL_RE, 'href', url);

  const tags = [
    ['property', 'og:title', title],
    ['name', 'twitter:title', title],
    ['property', 'og:url', url],
    ['property', 'og:type', meta.type || 'website'],
    ['property', 'og:image', image],
    ['name', 'twitter:image', image],
    ['property', 'og:image:type', imageType(image)],
  ];
  if (meta.description) {
    tags.push(['name', 'description', meta.description], ['property', 'og:description', meta.description], ['name', 'twitter:description', meta.description]);
  }
  // The template's alt text describes the default card; a page's own image gets the page title.
  if (image !== DEFAULT_IMAGE) tags.push(['property', 'og:image:alt', title], ['name', 'twitter:image:alt', title]);
  for (const [key, name, value] of tags) {
    if (value) out = setAttr(out, `<meta ${key}="${name}">`, metaRe(key, name), 'content', value);
  }
  if (meta.noindex) {
    const heads = out.match(/<\/head>/g) || [];
    if (heads.length !== 1) throw new Error(`index.html should have exactly one </head>, found ${heads.length}`);
    if (metaRe('name', 'robots').test(out)) throw new Error('index.html already has a <meta name="robots">');
    out = out.replace('</head>', () => `  <meta name="robots" content="${NOINDEX}" />\n  </head>`);
  }
  return out;
};

// A URL that may become a folder in dist/.
const SAFE_PATH = /^(\/[A-Za-z0-9_-]+)+$/;

/**
 * Every page that gets its own HTML file, as { routes: [{ path, meta }],
 * skipped: [{ path, reason }] }. `path` is the URL the file answers and
 * meta.path the canonical URL; they differ only for /rekap-live/minggu,
 * which shows the newest week. The homepage is left out: it is
 * dist/index.html itself, which also answers every other URL.
 *
 * @param {{ notes?: Array, recaps?: Array, images?: Array, articles?: Array }} data
 *   published notes, public recaps, gallery images merged with their
 *   enrichments, news articles
 */
export const prerenderRoutes = ({ notes = [], recaps = [], images = [], articles = [] } = {}) => {
  const routes = [];
  const skipped = [];
  const seen = new Set();
  const add = (path, toMeta) => {
    if (!SAFE_PATH.test(path)) return skipped.push({ path, reason: 'not usable as a folder name' });
    if (seen.has(path)) return skipped.push({ path, reason: 'duplicate URL' });
    try {
      routes.push({ path, meta: toMeta() });
      seen.add(path);
    } catch (e) {
      skipped.push({ path, reason: e.message });
    }
  };

  const weeks = weeklySummaries(recaps, notes);
  for (const page of Object.values(PAGES)) {
    if (page.path === '/') continue;
    add(page.path, () => (page === PAGES.rekapLiveWeekly && weeks.length ? weekMeta(weeks[0], weeks[1]) : page));
  }
  const years = [...new Set(images.map((img) => String(img.year)))].filter((y) => /^\d{4}$/.test(y)).sort();
  for (const year of years) add(`/gallery/${year}`, () => galleryYearMeta(year));
  for (const moment of buildMoments(images)) add(`/momen/${moment.slug}`, () => momentMeta(moment));
  for (const note of notes) add(`/eli-notes/${note.id}`, () => noteMeta(note));
  for (const recap of recaps) add(`/rekap-live/${recap.id}`, () => recapMeta(recap));
  weeks.forEach((week, i) => add(`/rekap-live/minggu/${week.week}`, () => weekMeta(week, weeks[i + 1])));
  for (const article of articles) add(`/news/${article.slug}`, () => articleMeta(article));
  return { routes, skipped };
};

/** '/eli-notes/abc' → 'eli-notes/abc/index.html', relative to dist/. */
export const routeFile = (path) => `${path.slice(1)}/index.html`;
