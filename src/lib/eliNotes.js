/**
 * Eli Notes — short written notes about moments from Eli's IDN / SHOWROOM
 * lives (/eli-notes, /eli-notes/:slug).
 *
 * Text only, by design: no video, GIF or screenshot of a live is ever
 * hosted here. A note is a short quote of what Eli said, a retelling in the
 * admin's own words, and optionally a link to where the moment was posted
 * (an official account or the admin's own post). Notes are written as
 * drafts (from EliRecorder on the admin's Mac) and only those marked
 * "published" are shown.
 *
 * Data: public/data/eli-notes.json → { notes: [Note] }
 *   Note = { id, status: 'draft'|'published', date: 'YYYY-MM-DD',
 *            platform: 'idn'|'showroom', liveTitle, at (seconds into the live),
 *            quote, story, mood, link?, createdAt, updatedAt }
 *
 * Pure functions so the page, EliRecorder and tests share the same rules.
 */

export const MOODS = {
  lucu: { label: 'Lucu', icon: 'ri-emotion-laugh-line', tone: '#c8952a' },
  haru: { label: 'Haru', icon: 'ri-heart-3-line', tone: '#7c2d34' },
  nyanyi: { label: 'Nyanyi', icon: 'ri-music-2-line', tone: '#4f6b5a' },
  ngobrol: { label: 'Ngobrol', icon: 'ri-chat-smile-2-line', tone: '#5c4a3a' },
  seru: { label: 'Seru', icon: 'ri-fire-line', tone: '#b4532a' },
};

export const PLATFORMS = { idn: 'IDN Live', showroom: 'SHOWROOM' };

export const LIMITS = { quote: 160, story: 700, liveTitle: 120, link: 300 };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const NOTE_ID_RE = /^\d{4}-\d{2}-\d{2}-(idn|showroom)-\d{1,6}$/;

/** 2026-11-22 + idn + 692 s → "2026-11-22-idn-692" (also the URL slug). */
export const noteId = (date, platform, at) => `${date}-${platform}-${Math.max(0, Math.floor(Number(at) || 0))}`;

/** 692 → "11:32", 3725 → "1:02:05". */
export const fmtMinute = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const LINK_HOSTS = [
  'youtube.com', 'youtu.be', 'tiktok.com', 'x.com', 'twitter.com', 'instagram.com',
  'idn.app', 'showroom-live.com', 'jkt48.com',
];

/** Only https links on known platforms; anything else is refused. */
export const safeLink = (raw) => {
  if (!raw) return null;
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.replace(/^(www|m|vm|vt|mobile)\./, '');
    return LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ? u.toString() : null;
  } catch {
    return null;
  }
};

/**
 * How to show a link: a YouTube id gets a click-to-load player
 * (youtube-nocookie); everything else is a plain "open" link.
 */
export const embedOf = (raw) => {
  const url = safeLink(raw);
  if (!url) return null;
  const u = new URL(url);
  const host = u.hostname.replace(/^(www|m)\./, '');
  let yt = null;
  if (host === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
  else if (host.endsWith('youtube.com')) {
    yt = u.searchParams.get('v') || (/^\/(shorts|embed|live)\/([\w-]{6,})/.exec(u.pathname) || [])[2] || null;
  }
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    const t = Number(u.searchParams.get('t')?.replace(/s$/, '')) || 0;
    return { kind: 'youtube', id: yt, start: t, url };
  }
  const name = host.includes('tiktok') ? 'TikTok'
    : host === 'x.com' || host.includes('twitter') ? 'X'
      : host.includes('instagram') ? 'Instagram'
        : host.includes('idn.app') ? 'IDN'
          : host.includes('showroom') ? 'SHOWROOM'
            : host.includes('youtube') || host === 'youtu.be' ? 'YouTube' : 'tautan';
  return { kind: 'link', name, url };
};

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Problems with a note, in Indonesian; empty array = valid. */
export const validateNote = (n) => {
  const errors = [];
  if (!n || typeof n !== 'object') return ['Catatan kosong.'];
  if (!DATE_RE.test(str(n.date))) errors.push('Tanggal tidak valid.');
  if (!PLATFORMS[n.platform]) errors.push('Platform harus IDN atau SHOWROOM.');
  if (!Number.isFinite(Number(n.at)) || Number(n.at) < 0) errors.push('Menit tidak valid.');
  if (!MOODS[n.mood]) errors.push('Pilih suasananya.');
  const quote = str(n.quote);
  const story = str(n.story);
  if (quote.length > LIMITS.quote) errors.push(`Kutipan maksimal ${LIMITS.quote} karakter (biar tetap kutipan singkat).`);
  if (story.length < 40) errors.push('Ceritakan momennya dengan kata-katamu sendiri (minimal 40 karakter).');
  if (story.length > LIMITS.story) errors.push(`Cerita maksimal ${LIMITS.story} karakter.`);
  if (str(n.liveTitle).length > LIMITS.liveTitle) errors.push('Judul live terlalu panjang.');
  if (n.link && !safeLink(n.link)) errors.push('Tautan harus https dari YouTube, TikTok, X, Instagram, IDN, SHOWROOM atau jkt48.com.');
  if (n.status && n.status !== 'draft' && n.status !== 'published') errors.push('Status tidak dikenal.');
  return errors;
};

/** Published, valid notes, newest first (by date, then later in the live first). */
export const publishedNotes = (data) =>
  (Array.isArray(data?.notes) ? data.notes : [])
    .filter((n) => n?.status === 'published' && NOTE_ID_RE.test(String(n.id)) && validateNote(n).length === 0)
    .map((n) => ({ ...n, year: n.date.slice(0, 4), link: safeLink(n.link) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);

/** Notes from a given day (for Album Momen's "Eli Notes hari itu"). */
export const notesOn = (notes, date) => (notes || []).filter((n) => n.date === date);
