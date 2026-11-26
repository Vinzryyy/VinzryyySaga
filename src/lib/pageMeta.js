/**
 * Page meta: the title, description and share image of every public page.
 *
 * One source, two readers:
 *   - <Seo> in each page, which sets the tags once the app has loaded, and
 *   - scripts/prerender-meta.js, which at build time writes a copy of
 *     index.html per page with these tags already in <head>. WhatsApp, X,
 *     Discord, LINE and Telegram build link previews from that raw HTML
 *     without running JavaScript; before, every shared link showed the
 *     homepage's preview.
 *
 * A page added to PAGES gets its own link preview on the next build. Pure
 * and Node-safe (no JSX, no browser APIs), like the rest of src/lib.
 */

import { PLATFORMS, fmtMinute } from './eliNotes.js';
import { fmtDuration, fmtN, prettyDay, weekLabel, weekSentences } from './liveRecaps.js';

export const SITE_URL = 'https://armeniaca.online';
export const DEFAULT_TITLE = 'Armeniaca — Arsip Visual Eli JKT48';
// A JPEG under 300 KB: WhatsApp shows no image for share images over
// ~600 KB, and og-card.png is 730 KB.
export const DEFAULT_IMAGE = `${SITE_URL}/og-card.jpg`;
/** robots content for a page with `noindex: true`: reachable by link, never listed by search engines. */
export const NOINDEX = 'noindex, nofollow';

/** 'Jadwal Eli' → 'Jadwal Eli · Armeniaca'; no title → the site's own name. */
export const fullTitle = (title) => (title ? `${title} · Armeniaca` : DEFAULT_TITLE);

/** '/schedule' → 'https://armeniaca.online/schedule'; '/' → the bare site URL. */
export const pageUrl = (path = '/') => `${SITE_URL}${path === '/' ? '' : path}`;

/**
 * Static pages, plus the index page of each section that has detail pages.
 * Keyed by name; a page passes its entry to <Seo>, and may override a field
 * at runtime (e.g. the "(Pulih)" titles in ArmeniacaTown).
 */
export const PAGES = {
  // Beranda & Eli
  home: {
    path: '/',
    description: 'Arsip visual independen untuk Helisma Putri (Eli JKT48). Mendokumentasikan panggung, event, dan momen Ceu Eli dari Generasi 7 hingga era Team Dream JKT48 Fight 2026.',
  },
  profile: {
    path: '/profile',
    title: 'Profil Eli',
    description: 'Profil lengkap Helisma Putri (Eli JKT48) — timeline karier, JKT48 Fight 2026 di Team Dream, diskografi termasuk Sousenkyo Rapsodi, plus trivia dan fun facts.',
  },
  rekap2026: {
    path: '/rekap-2026',
    title: 'Rekap 2026',
    description: 'Rekap 2026 Eli JKT48 dari arsip Armeniaca: panggung teater, setlist, unit song, momen favorit penggemar, dan foto sepanjang tahun.',
  },
  happyHelismaDay26: {
    path: '/happy-helisma-day-26',
    title: 'Rekap Seitansai ke-26 Ceu Eli',
    description: 'Kilas balik momen ulang tahun ke-26 Helisma Putri (Eli JKT48) — 15 Juni 2026. Ucapan, kebaikan, lagu, dan kenangan.',
  },
  // Memoria
  gallery: {
    path: '/gallery',
    title: 'Memoria',
    description: 'Memoria — kenangan visual Eli JKT48, frame demi frame dari Generasi 7 hingga era Team Dream. Filter berdasarkan tahun untuk menjelajah era spesifik.',
  },
  momen: {
    path: '/momen',
    title: 'Album Momen',
    description: 'Album Momen: foto-foto Eli JKT48 dari arsip Armeniaca, dikelompokkan per acara, lengkap dengan cerita penggemar.',
  },
  eliNotes: {
    path: '/eli-notes',
    title: 'Eli Notes',
    description: 'Eli Notes: catatan momen dari live IDN dan SHOWROOM Eli JKT48, ditulis ulang oleh penggemar, lengkap dengan kutipan dan menitnya.',
  },
  rekapLive: {
    path: '/rekap-live',
    title: 'Rekap Live',
    description: 'Rekap Live: ringkasan otomatis setiap live IDN dan SHOWROOM Eli JKT48. Durasi, keramaian chat, momen paling heboh, dan topik obrolan.',
  },
  rekapLiveWeekly: {
    path: '/rekap-live/minggu',
    title: 'Ringkasan mingguan',
    description: 'Ringkasan mingguan live IDN dan SHOWROOM Eli JKT48.',
  },
  vivo: {
    path: '/vivo',
    title: 'Vivo — Live Streaming Eli',
    description: 'Arsip live streaming Helisma Putri di IDN Live dan SHOWROOM. Playlist YouTube tertanam, auto-update kalau ada video baru.',
  },
  // Jadwal & kabar
  schedule: {
    path: '/schedule',
    title: 'Jadwal Eli',
    description: 'Daftar lengkap show teater dan Personal Meet & Greet Eli JKT48 (Helisma Putri). Auto-refresh setiap 6 jam.',
  },
  news: {
    path: '/news',
    title: 'News',
    description: 'Kabar terbaru seputar Eli JKT48 — rekap event, pengumuman, dan highlight.',
  },
  // Komunitas & tentang
  cerita: {
    path: '/cerita',
    title: 'Cerita Penggemar',
    description: 'Cerita-cerita kecil penggemar tentang Eli JKT48 (Helisma Putri): momen yang diingat, dibagikan, dan dibaca bersama di Armeniaca.',
  },
  wishes: {
    path: '/wishes',
    title: 'Wishes untuk Eli',
    description: 'Ucapan dan harapan dari fans untuk Helisma Putri (Eli JKT48). Wishes wall perayaan ulang tahun ke-26 pada 15 Juni 2026.',
  },
  byuMusic: {
    path: '/byu-music',
    title: 'By-U Music',
    description: 'Lagu By-U untuk Putri Helisma — dirilis 15 Juni 2026 sebagai bagian dari Harmoni Kebaikan. Dengarkan sekarang.',
  },
  galeriKebaikan: {
    path: '/galeri-kebaikan',
    title: 'Galeri Kebaikan — Harmoni Kebaikan',
    description: 'Arsip aksi kebaikan yang dilakukan atas nama Helisma Putri (Eli JKT48) untuk seitansai ke-26 pada 15 Juni 2026. Project Helismiley × Armeniaca.',
  },
  page26: {
    path: '/26',
    title: '#26 — Pohon Kebaikan',
    description: 'Project ulang tahun ke-26 Eli JKT48. Tekan tombol untuk memberi 1 dukungan; setiap 100 dukungan, pohon untuk Eli tumbuh ke tahap berikutnya.',
  },
  denyut: {
    path: '/denyut',
    title: 'Denyut — Heartbeat Website',
    description: 'Project ini hidup karena banyak hati. Tiap orang yang membuka halaman ini menambah satu detak ke ritme website.',
  },
  about: {
    path: '/about',
    title: 'About',
    description: 'Tentang Armeniaca — arsip visual independen untuk Helisma Putri (Eli JKT48). Cerita di balik nama, simbol-simbol di logo, dan filosofi proyek.',
  },
  // Mini games
  miniGames: {
    path: '/mini-games',
    title: 'Mini Games',
    description: 'Arcade Armeniaca: ArmePack, Pasangkan Momen, Tebak Momen, dan ArmeniacaTown. Main sebentar tiap hari sambil mengingat momen-momen Eli JKT48.',
  },
  memory: {
    path: '/mini-games/memory',
    title: 'Pasangkan Momen',
    description: 'Mini game memory: cocokkan pasangan foto Eli JKT48 dari arsip Armeniaca. Ada mode harian yang sama untuk semua orang.',
  },
  tebakMomen: {
    path: '/mini-games/tebak-momen',
    title: 'Tebak Momen · Mini Games',
    description: 'Tebak Momen: Eli bilang ini di live tanggal berapa? Mini game dari Eli Notes, catatan momen live Eli JKT48.',
  },
  lemari: {
    path: '/mini-games/lemari',
    title: 'Lemari Eli · Mini Games',
    description: 'Lemari Eli: dandani Eli dengan kostum panggungnya, kenali cerita di balik tiap kostum, lalu simpan gayamu sebagai kartu.',
    // Link-only for now (LEMARI_IN_HUB): kept out of search engines, but shared
    // links still get this preview.
    noindex: true,
  },
  armepack: {
    path: '/armepack',
    title: 'ArmePack — The Life of Armeniaca',
    description: 'ArmePack: The Life of Armeniaca — kepingan harian Arme sebagai fan Helisma Putri Kurnia. Buka pack, dapat 3 kartu tiap hari. Batch I, Seitansai 2026.',
    image: `${SITE_URL}/og-petikan.png`,
  },
  // ArmeniacaTown (r1–r5 also have a "gersang" version; the preview uses this one)
  town: {
    path: '/armeniacaTown',
    title: 'Gerbang',
    description: 'Gerbang ke Kota — pintu masuk wilayah kebaikan, kenangan, dan harapan yang tumbuh.',
  },
  townPeta: {
    path: '/armeniacaTown/peta',
    title: 'ArmeniacaTown — Peta Kota',
    description: 'Peta ArmeniacaTown — kota yang tumbuh dari siraman komunitas Helismiley.',
  },
  townR1: {
    path: '/armeniacaTown/r1',
    title: 'Konstelasi Perjalanan',
    description: 'Perjalanan karier Eli dari Generasi 7 ke Team Dream — milestone-milestone yang dirajut menjadi konstelasi di langit taman senja.',
  },
  townR2: {
    path: '/armeniacaTown/r2',
    title: 'Perpustakaan',
    description: 'Perpustakaan kota yang setengah runtuh — rak yang masih berdiri menyimpan halaman-halaman tentang perjalanan Eli dan Armeniaca.',
  },
  townR3: {
    path: '/armeniacaTown/r3',
    title: 'Telaga Harapan',
    description: 'Telaga teratai dengan harapan-harapan dari fans untuk Eli — wish wall dalam bentuk taman 3D.',
  },
  townR4: {
    path: '/armeniacaTown/r4',
    title: 'ArmeniacaTown — Menara Jam',
    description: 'Menara Jam ArmeniacaTown — twin yagura (Japanese castle watchtower) + Honden shrine hall. Countdown Seitansai Eli + kalender hari-hari penting di shoji dial.',
  },
  townR5: {
    path: '/armeniacaTown/r5',
    title: 'Panggung Terbuka · ArmeniacaTown',
    description: 'Pameran sederhana Panggung Terbuka — sorotan kebaikan dilakukan atas nama Helisma Putri (Eli JKT48). Arsip donasi & aksi nyata Helismiley × Armeniaca.',
  },
  townR6: {
    path: '/armeniacaTown/r6',
    title: 'ArmeniacaTown — Aula (Virtual Companion FX Sudirman)',
    description: "Replika virtual venue offline event seitansai Eli di FX Sudirman — pavilion sticky notes 'Kebaikan apa yang sudah kamu lakukan?' + arsip sertifikat donasi Harmoni Kebaikan.",
  },
};

// ── Detail pages ─────────────────────────────────────────────────────

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const prettyDate = (iso) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

/** /gallery/:year */
export const galleryYearMeta = (year) => ({
  path: `/gallery/${year}`,
  title: `Memoria ${year}`,
  description: `Frame-frame Eli JKT48 dari Memoria tahun ${year}. Kenangan visual Helisma Putri di sepanjang tahun ${year}.`,
});

/** /momen/:slug, a moment from buildMoments() (src/lib/moments.js). */
export const momentMeta = (moment) => ({
  path: `/momen/${moment.slug}`,
  title: `${moment.name} · Album Momen`,
  description: `${moment.name} (${prettyDate(moment.date)}): ${moment.photos.length} foto Eli JKT48 dari arsip @armeniaca15.`,
});

/** /eli-notes/:id, a published note (src/lib/eliNotes.js). */
export const noteMeta = (note) => ({
  path: `/eli-notes/${note.id}`,
  title: `${note.quote ? `“${note.quote}”` : note.liveTitle || 'Catatan live'} · Eli Notes`,
  description: `${PLATFORMS[note.platform]} · ${prettyDate(note.date)} · menit ${fmtMinute(note.at)}. ${note.story.slice(0, 140)}`,
});

/** /rekap-live/:id, a public recap (src/lib/liveRecaps.js). */
export const recapMeta = (recap) => ({
  path: `/rekap-live/${recap.id}`,
  title: `Rekap live ${prettyDay(recap)}`,
  description: `Live ${PLATFORMS[recap.platform]} Eli JKT48, ${prettyDay(recap)}: ${fmtDuration(recap.durationSec)}, ${fmtN(recap.comments)} komentar, momen paling ramai dan topik obrolannya.`,
});

/** /rekap-live/minggu/:week, a week from weeklySummaries(); prev is the week before it. */
export const weekMeta = (week, prev) => ({
  path: `/rekap-live/minggu/${week.week}`,
  title: `Ringkasan mingguan ${weekLabel(week.week)}`,
  description: `Seminggu live Eli JKT48 (${weekLabel(week.week)}): ${weekSentences(week, prev).join(' ')}`,
});

/** /news/:slug, an article from src/data/newsArticles.js. */
export const articleMeta = (article) => ({
  path: `/news/${article.slug}`,
  title: article.title,
  description: article.subtitle || article.title,
});
