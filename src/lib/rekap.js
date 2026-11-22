/**
 * Rekap tahunan — pure helpers that turn the archive's data files into a
 * year-in-review. Nothing here invents numbers: every field is counted
 * straight from the show log (public/data/eli-show-log.json) or the merged
 * gallery items (GalleryContext). Missing data stays missing (null / []),
 * so the page can omit a section instead of guessing.
 */

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const MONTHS_ID_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Month index 0–11 from an ISO date string, or -1 when unparseable. */
const monthIndex = (iso) => {
  const m = typeof iso === 'string' ? iso.match(ISO_DATE) : null;
  if (!m) return -1;
  const idx = Number(m[2]) - 1;
  return idx >= 0 && idx < 12 ? idx : -1;
};

const inYear = (iso, year) => typeof iso === 'string' && iso.startsWith(`${year}-`);

/** "2026-11-12" → "12 Nov 2026" (null for anything unparseable). */
export const formatDateId = (iso, { long = false } = {}) => {
  const m = typeof iso === 'string' ? iso.match(ISO_DATE) : null;
  if (!m) return null;
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return null;
  const names = long ? MONTHS_ID : MONTHS_ID_SHORT;
  return `${Number(m[3])} ${names[idx]} ${m[1]}`;
};

/** Counter → [{ [key]: name, count }] sorted by count desc, then name asc. */
const sortedCounts = (map, key = 'name') =>
  [...map.entries()]
    .map(([name, count]) => ({ [key]: name, count }))
    .sort((a, b) => b.count - a.count || String(a[key]).localeCompare(String(b[key])));

const bump = (map, k, n = 1) => map.set(k, (map.get(k) || 0) + n);

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** "Duo (1st)" → "Duo"; keeps "Center", "Solo" as-is. */
const positionGroup = (pos) => pos.replace(/\s*\(.*\)\s*$/, '').trim();

const showSummary = (s) => (s ? { no: s.no, date: s.date, setlist: s.setlist } : null);

/**
 * Year recap from the manual theater show log.
 *
 * Center is recorded per show as `position: "Center"` (the log's
 * `totals.centers` is the all-time count of those rows). Duo/Solo use the
 * same field ("Duo", "Duo (1st)", "Solo"); `partner` holds the duo partner
 * or the other unit members. `note` is free text (event hashtags, city,
 * "Shonichi ..."), shown verbatim.
 */
export function buildShowRecap(showLog, year) {
  const all = Array.isArray(showLog?.shows) ? showLog.shows : [];
  const shows = all
    .filter((s) => s && inYear(s.date, year))
    .sort((a, b) => (a.no ?? 0) - (b.no ?? 0) || String(a.date).localeCompare(String(b.date)));

  const perMonth = Array(12).fill(0);
  const setlistMap = new Map();
  const unitMap = new Map(); // name → { count, setlists:Set }
  const positionMap = new Map();
  const partnerMap = new Map();
  const centerShows = [];
  const notes = [];
  const milestones = [];

  for (const s of shows) {
    const mi = monthIndex(s.date);
    if (mi >= 0) perMonth[mi] += 1;

    const setlist = clean(s.setlist);
    if (setlist) bump(setlistMap, setlist);

    const unit = clean(s.unitSong);
    if (unit) {
      const entry = unitMap.get(unit) || { count: 0, setlists: new Set() };
      entry.count += 1;
      if (setlist) entry.setlists.add(setlist);
      unitMap.set(unit, entry);
    }

    const pos = clean(s.position);
    if (pos) {
      const group = positionGroup(pos);
      bump(positionMap, group);
      if (group === 'Center') {
        centerShows.push({ no: s.no, date: s.date, setlist: s.setlist, unitSong: unit, partner: clean(s.partner) });
      }
    }

    const partner = clean(s.partner);
    if (partner) {
      for (const name of partner.split(',').map((p) => p.trim()).filter(Boolean)) bump(partnerMap, name);
    }

    const note = clean(s.note);
    if (note) notes.push({ no: s.no, date: s.date, setlist: s.setlist, note });

    if (Number.isInteger(s.no) && s.no > 0 && s.no % 50 === 0) {
      milestones.push({ no: s.no, date: s.date, setlist: s.setlist, hundred: s.no % 100 === 0 });
    }
  }

  const unitSongs = [...unitMap.entries()]
    .map(([name, { count, setlists }]) => ({ name, count, setlists: [...setlists] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const positions = sortedCounts(positionMap, 'position');
  const centerCount = positionMap.get('Center') || 0;

  return {
    year: Number(year),
    count: shows.length,
    first: showSummary(shows[0]),
    last: showSummary(shows[shows.length - 1]),
    perMonth,
    setlists: sortedCounts(setlistMap, 'setlist'),
    unitSongs,
    positions,
    centerCount,
    centerShows,
    partners: sortedCounts(partnerMap),
    notes,
    milestones,
    careerTotal: Number.isInteger(showLog?.totalShows) ? showLog.totalShows : null,
    asOfDate: clean(showLog?.asOfDate),
  };
}

const photoDate = (img) => clean(img?.eventDate) || clean(img?.date);
// Captions sometimes start a quote they never close ("Personal Meet…);
// drop a lone unbalanced quote so the name reads cleanly.
const tidyName = (name) => {
  if (!name) return null;
  const quotes = (name.match(/["“”]/g) || []).length;
  return quotes === 1 ? name.replace(/["“”]/, '').trim() || null : name;
};
const photoEvent = (img) => tidyName(clean(img?.eventName) || clean(img?.title)) || 'Tanpa nama acara';
const photoSrc = (img) => clean(img?.thumbnail) || clean(img?.url);

/**
 * Year recap from merged gallery items. A frame belongs to the year of its
 * eventDate (falling back to its upload `date`). Favorites are deduplicated
 * per post (tweetUrl / tweetId) because favoriteCount is a per-post number
 * shared by every photo in that post.
 */
export function buildPhotoRecap(images, year, { topEvents = 5, favorites = 6 } = {}) {
  const list = (Array.isArray(images) ? images : []).filter((img) => img && inYear(photoDate(img), year));

  const perMonth = Array(12).fill(0);
  const eventMap = new Map();
  let latestDate = null;

  for (const img of list) {
    const date = photoDate(img);
    const mi = monthIndex(date);
    if (mi >= 0) perMonth[mi] += 1;
    if (!latestDate || date > latestDate) latestDate = date;

    const name = photoEvent(img);
    const key = `${date}|${name}`;
    const ev = eventMap.get(key) || { name, date, count: 0, location: clean(img.location), cover: photoSrc(img) };
    ev.count += 1;
    eventMap.set(key, ev);
  }

  const events = [...eventMap.values()].sort(
    (a, b) => b.count - a.count || b.date.localeCompare(a.date) || a.name.localeCompare(b.name),
  );

  const seenPosts = new Set();
  const favs = list
    .filter((img) => typeof img.favoriteCount === 'number' && Number.isFinite(img.favoriteCount))
    .sort((a, b) => b.favoriteCount - a.favoriteCount || photoDate(b).localeCompare(photoDate(a)))
    .filter((img) => {
      const post = clean(img.tweetUrl) || clean(img.tweetId);
      if (!post) return true;
      if (seenPosts.has(post)) return false;
      seenPosts.add(post);
      return true;
    })
    .slice(0, favorites)
    .map((img) => ({
      id: img.id ?? photoSrc(img),
      src: photoSrc(img),
      name: photoEvent(img),
      date: photoDate(img),
      favoriteCount: img.favoriteCount,
      tweetUrl: clean(img.tweetUrl),
    }));

  let busiestMonth = null;
  perMonth.forEach((count, month) => {
    if (count > 0 && (!busiestMonth || count > busiestMonth.count)) busiestMonth = { month, count };
  });

  return {
    year: Number(year),
    count: list.length,
    eventCount: eventMap.size,
    perMonth,
    topEvents: events.slice(0, topEvents),
    favorites: favs,
    busiestMonth,
    latestDate,
  };
}

/** Short plain-text summary for sharing / clipboard. Only non-zero facts. */
export function rekapShareText(showRecap, photoRecap, url) {
  const year = showRecap?.year || photoRecap?.year;
  const parts = [];
  if (showRecap?.count) parts.push(`${showRecap.count} panggung teater`);
  if (photoRecap?.count) parts.push(`${photoRecap.count} frame arsip`);
  if (showRecap?.setlists?.length) parts.push(`${showRecap.setlists.length} setlist`);
  const head = `Rekap ${year} · Eli JKT48`;
  const body = parts.length ? `${parts.join(', ')}.` : '';
  const asOf = showRecap?.asOfDate ? `(data hingga ${formatDateId(showRecap.asOfDate)})` : '';
  return [head, [body, asOf].filter(Boolean).join(' '), url].filter(Boolean).join('\n');
}
