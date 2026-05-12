/**
 * Arsip Ingatan — book registry for /armeniacaTown/r2.
 *
 * Konten 100% derived dari sumber existing — gak ada copy baru di sini.
 * Tiap entry punya `getBody()` yang resolve isi dari ELI_TIMELINE,
 * ELI_DISCOGRAPHY, ELI_FIGHT_2026, SITE_CONFIG.about, atau
 * KEBAIKAN_ENTRIES. Saat sumber data tumbuh (timeline tambah entry,
 * kebaikan tambah aksi), Perpustakaan otomatis ikut tumbuh tanpa
 * sync manual.
 *
 * State tier: drought (rak utuh + meja + S — 6 buku) vs restored
 * (semua rak — 11 buku). Drought tier diatur supaya cerita "selamat
 * dari kehancuran" konsisten: Etimologi/Filosofi (rooting Armeniaca),
 * 3 era awal Eli (Trainee/Theater/Senbatsu-NewEra), dan satu cross-
 * link Galeri Kebaikan. Era akhir (Mature/Variety/Fight + diskografi)
 * unlock setelah ruangan pulih (count >= 5000).
 */

import { ELI_TIMELINE, ELI_DISCOGRAPHY, ELI_FIGHT_2026 } from './eliProfile';
import { SITE_CONFIG } from '../config/siteConfig';
import { KEBAIKAN_ENTRIES } from './galeriKebaikan';

// Era groupings — milestone IDs di ELI_TIMELINE dikelompokin ke buku.
// Sinkron dengan ERA_DEFS Konstelasi tapi gak hard-import (avoid coupling
// — kalau ERA_DEFS pivot, buku-buku Perpustakaan tetap stabil).
const ERA_GROUPS = {
  trainee: ['audition', 'sousenkyo-2018', 'class-a'],
  theater: ['theater-debut', 'team-kiii', 'show-100'],
  'senbatsu-newera': [
    'first-senbatsu',
    'new-formation-2021',
    'darashinai-aishikata',
    'show-200',
  ],
  mature: [
    'sayonara-crawl',
    'spv-langit-biru-2024',
    'show-300',
    'undergirl-bibir-2024',
  ],
  variety: ['belajar-konseling'],
  fight: [
    'pertaruhan-cinta-shonichi',
    'three-team-announce',
    'fight-tagline',
    'team-dream',
    'dream-bakudan-shonichi',
    'show-400',
  ],
};

const getTimelineByEra = (eraKey) => {
  const ids = ERA_GROUPS[eraKey] || [];
  return ELI_TIMELINE.filter((m) => ids.includes(m.id));
};

// Rak slot constants — match dengan posisi 3D di TamanArsipIngatan scene.
export const RAK_SLOTS = {
  MEJA: 'meja',
  NW: 'nw',
  NE: 'ne',
  W: 'w',
  E: 'e',
  S: 's',
};

// Tier unlock — drought tier accessible dari count >= 2000 (peta open),
// restored tier accessible dari count >= 5000 (r2Restore threshold).
export const UNLOCK_TIERS = {
  DROUGHT: 'drought',
  RESTORED: 'restored',
};

export const CATEGORIES = {
  REFLEKSI: 'refleksi',
  LINIMASA: 'linimasa',
  DISKOGRAFI: 'diskografi',
  ERA: 'era',
  KEBAIKAN: 'kebaikan',
};

// Book registry. Order dalam array juga = order prev/next dalam rak
// yang sama (sortable by rakSlot lalu by position dalam array).
export const ARSIP_BOOKS = [
  // === MEJA (focal point — pertama dilihat saat masuk) ===
  {
    id: 'halaman-terakhir',
    title: 'Halaman Terakhir',
    eyebrow: 'Filosofi · Halaman Pembuka',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Armeniaca',
    rakSlot: RAK_SLOTS.MEJA,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#8B4040',
    preview:
      'Buku ini terbuka di meja, menunggu siapa pun yang melangkah masuk.',
    getBody: () => {
      const phil = SITE_CONFIG.about.philosophy;
      return {
        type: 'quote',
        quote: phil.quote,
        author: phil.author,
        epilogue:
          'Inilah yang tersisa dari apa yang tidak boleh hilang. ' +
          'Sebagian rak masih berdiri. Sebagian halaman masih bisa dibaca. ' +
          'Silakan.',
      };
    },
  },

  // === RAK NW (utuh, drought) — Tentang Armeniaca (root identity) ===
  {
    id: 'etimologi-armeniaca',
    title: 'Setelah Musim Dingin, yang Mekar',
    eyebrow: 'Refleksi · Etimologi',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'siteConfig.about.etymology',
    rakSlot: RAK_SLOTS.NW,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#C9A961',
    preview: 'Kenapa "Armeniaca"? Apa arti tiap simbol di logo?',
    getBody: () => {
      const ety = SITE_CONFIG.about.etymology;
      return {
        type: 'prose-with-motifs',
        paragraphs: ety.paragraphs,
        motifsTitle: ety.motifsTitle,
        motifs: ety.motifs,
      };
    },
  },
  {
    id: 'filosofi-armeniaca',
    title: 'Filosofi Armeniaca',
    eyebrow: 'Refleksi · Voice',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'siteConfig.about.philosophy',
    rakSlot: RAK_SLOTS.NW,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#D4A574',
    preview:
      'Setiap panggung Eli adalah momen yang sekejap. Tugas Armeniaca...',
    getBody: () => {
      const phil = SITE_CONFIG.about.philosophy;
      const community = SITE_CONFIG.home.community;
      return {
        type: 'philosophy',
        quote: phil.quote,
        author: phil.author,
        communityTitle: community.title,
        communityBody: community.body,
      };
    },
  },

  // === RAK NE (utuh, drought) — Linimasa era awal ===
  {
    id: 'linimasa-trainee',
    title: 'Era Trainee — Akademi & Audisi',
    eyebrow: 'Linimasa · 2018',
    category: CATEGORIES.LINIMASA,
    era: 'trainee',
    source: 'ELI_TIMELINE',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#fff5c8',
    preview: 'Tiga langkah pertama: audisi, sousenkyo perdana, naik kelas.',
    getBody: () => ({
      type: 'timeline-section',
      milestones: getTimelineByEra('trainee'),
    }),
  },
  {
    id: 'linimasa-theater',
    title: 'Era Theater — Panggung Pertama',
    eyebrow: 'Linimasa · 2018-2019',
    category: CATEGORIES.LINIMASA,
    era: 'theater',
    source: 'ELI_TIMELINE',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#e8b878',
    preview: 'Theater no Megami, Team KIII, dan 100 show pertama.',
    getBody: () => ({
      type: 'timeline-section',
      milestones: getTimelineByEra('theater'),
    }),
  },
  {
    id: 'linimasa-senbatsu-newera',
    title: 'Era Senbatsu & New Era',
    eyebrow: 'Linimasa · 2020-2021',
    category: CATEGORIES.LINIMASA,
    era: 'senbatsu-newera',
    source: 'ELI_TIMELINE',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#3a4858',
    preview:
      'Rapsodi, restrukturisasi besar, Darashinai Aishikata, 200 show.',
    getBody: () => ({
      type: 'timeline-section',
      milestones: getTimelineByEra('senbatsu-newera'),
    }),
  },

  // === RAK W (tumbang, restored) — Era tengah ===
  {
    id: 'linimasa-mature',
    title: 'Era Mature — Konsistensi',
    eyebrow: 'Linimasa · 2023-2024',
    category: CATEGORIES.LINIMASA,
    era: 'mature',
    source: 'ELI_TIMELINE',
    rakSlot: RAK_SLOTS.W,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#7a3030',
    preview: 'Sayonara Crawl, SPV Langit Biru, 300 show, Undergirls.',
    getBody: () => ({
      type: 'timeline-section',
      milestones: getTimelineByEra('mature'),
    }),
  },
  {
    id: 'linimasa-variety',
    title: 'Era Variety — Belajar Konseling',
    eyebrow: 'Linimasa · 2025',
    category: CATEGORIES.LINIMASA,
    era: 'variety',
    source: 'ELI_TIMELINE',
    rakSlot: RAK_SLOTS.W,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#c8a060',
    preview:
      'Buna Eli, host JKT48 TV, format yang menemukan tone-nya sendiri.',
    getBody: () => ({
      type: 'timeline-section',
      milestones: getTimelineByEra('variety'),
    }),
  },

  // === RAK E (miring, restored) — Era Fight + Diskografi ===
  {
    id: 'era-fight-team-dream',
    title: 'Era JKT48 Fight — Team Dream',
    eyebrow: 'Era Terkini · 2026',
    category: CATEGORIES.ERA,
    era: 'fight',
    source: 'ELI_FIGHT_2026 + ELI_TIMELINE',
    rakSlot: RAK_SLOTS.E,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#5a8aa8',
    preview:
      'Format kompetisi tiga tim, line-up Team Dream, era baru bersama Freya.',
    getBody: () => ({
      type: 'era-fight',
      fight: ELI_FIGHT_2026,
      milestones: getTimelineByEra('fight'),
    }),
  },
  {
    id: 'diskografi-rapsodi',
    title: 'Diskografi — Rapsodi',
    eyebrow: 'Single · 2020 · Senbatsu',
    category: CATEGORIES.DISKOGRAFI,
    era: 'senbatsu-newera',
    source: 'ELI_DISCOGRAPHY',
    rakSlot: RAK_SLOTS.E,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#e8d4a8',
    preview:
      'Senbatsu pertama Eli — original song pertama JKT48, posisi 15.',
    getBody: () => ({
      type: 'diskografi',
      entry: ELI_DISCOGRAPHY.find((e) => e.title === 'Rapsodi'),
    }),
  },
  {
    id: 'diskografi-bibir',
    title: 'Diskografi — Bibir yang Telah Dicuri',
    eyebrow: 'Single · 2025 · Undergirls',
    category: CATEGORIES.DISKOGRAFI,
    era: 'mature',
    source: 'ELI_DISCOGRAPHY',
    rakSlot: RAK_SLOTS.E,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#8B4040',
    preview:
      'Undergirls Sousenkyo 2024 — #Semangka, posisi 22 dengan 28.925 suara.',
    getBody: () => ({
      type: 'diskografi',
      entry: ELI_DISCOGRAPHY.find((e) =>
        (e.title || '').startsWith('Bibir'),
      ),
    }),
  },

  // === RAK S (kecil, drought) — Cross-link Galeri Kebaikan ===
  {
    id: 'kebaikan-pohon',
    title: 'Lembar Kebaikan — Pohon Lingkungan',
    eyebrow: 'Aksi · Harmoni Kebaikan',
    category: CATEGORIES.KEBAIKAN,
    era: null,
    source: 'KEBAIKAN_ENTRIES',
    rakSlot: RAK_SLOTS.S,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#7aa858',
    preview:
      'Tiga pohon ditanam atas nama Eli — kebaikan yang akarnya tumbuh.',
    getBody: () => ({
      type: 'kebaikan',
      entries: KEBAIKAN_ENTRIES,
    }),
  },
];

// Books interactive berdasarkan tier ruangan.
export const getInteractiveBooks = (restored) => {
  if (restored) return ARSIP_BOOKS;
  return ARSIP_BOOKS.filter(
    (b) => b.unlockTier === UNLOCK_TIERS.DROUGHT,
  );
};

// Books grouped by rakSlot — untuk render di scene.
export const groupBooksByRak = (restored) => {
  const interactive = getInteractiveBooks(restored);
  const grouped = {};
  Object.values(RAK_SLOTS).forEach((slot) => {
    grouped[slot] = interactive.filter((b) => b.rakSlot === slot);
  });
  return grouped;
};

// Prev/next dalam rak yang sama. Scope sengaja dibatasi per-rak (bukan
// global) supaya kerasa "ambil buku berikutnya dari rak yang sama,"
// bukan teleport ke rak lain.
export const getRakSiblings = (bookId, restored = true) => {
  const interactive = getInteractiveBooks(restored);
  const book = interactive.find((b) => b.id === bookId);
  if (!book) return { prev: null, next: null, idx: -1, total: 0 };
  const sameRak = interactive.filter((b) => b.rakSlot === book.rakSlot);
  const idx = sameRak.findIndex((b) => b.id === bookId);
  return {
    prev: idx > 0 ? sameRak[idx - 1] : null,
    next: idx < sameRak.length - 1 ? sameRak[idx + 1] : null,
    idx,
    total: sameRak.length,
  };
};

// Persistence — track buku yang udah dibaca lewat localStorage.
// Marker visual di rak (subtle emissive) + counter di petak peta.
const READ_KEY = 'arsip-books-read';

export const getReadBookIds = () => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const markBookRead = (id) => {
  try {
    const current = new Set(getReadBookIds());
    if (current.has(id)) return;
    current.add(id);
    localStorage.setItem(READ_KEY, JSON.stringify([...current]));
  } catch {
    /* storage blocked — no-op */
  }
};
