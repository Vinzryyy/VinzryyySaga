/**
 * Album Momen — groups gallery photos into "moments" (one event on one day).
 *
 * A moment is keyed by event date + event name, the same metadata the
 * gallery already carries from @armeniaca15's captions. Pure functions so
 * the page and tests share them.
 */

export const slugify = (text) =>
  String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'"“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');

const dateOf = (img) => img.eventDate || img.date || '';
const nameOf = (img) => (img.eventName || img.title || 'Momen').trim();

/**
 * @param {Array} images gallery items (merged with enrichments)
 * @returns {Array<{slug,name,date,year,location,photos,caption,tweetUrl,favorites}>} newest first
 */
export const buildMoments = (images) => {
  const groups = new Map();
  for (const img of images || []) {
    const date = dateOf(img);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const name = nameOf(img);
    const key = `${date}|${name.toLowerCase()}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, name, date, year: date.slice(0, 4), location: img.location || '', photos: [], caption: null, tweetUrl: null, favorites: 0 };
      groups.set(key, g);
    }
    g.photos.push(img);
    if (!g.caption && img.caption) g.caption = img.caption;
    if (!g.tweetUrl && img.tweetUrl) g.tweetUrl = img.tweetUrl;
    if (Number.isFinite(img.favoriteCount)) g.favorites = Math.max(g.favorites, img.favoriteCount);
  }

  const list = [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  // Slugs: date + name; a numeric suffix only if two moments collide.
  const used = new Map();
  for (const m of list) {
    const base = `${m.date}-${slugify(m.name) || 'momen'}`;
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    m.slug = n === 1 ? base : `${base}-${n}`;
    delete m.key;
  }
  return list;
};

/** Caption text without hashtags, mentions, and t.co links — for a short quote. */
export const cleanCaption = (caption) =>
  String(caption || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#@][\p{L}\p{N}_]+/gu, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .trim();

/** Theater show(s) Eli performed on that date, from eli-show-log.json. */
export const showsOn = (showLog, date) => (showLog?.shows || []).filter((s) => s.date === date);
