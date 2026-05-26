/**
 * Pohon Aprikot — data layer untuk Petikan batch #1 (Seitansai 2026).
 *
 * Skeleton di-populate di P5. P1 cuma define shape + tier configs + RNG
 * primitives biar UI shell + storage layer bisa wiring tanpa nunggu
 * pool konten asli.
 *
 * Tier weights total 100. Probabilitas drop:
 *   muda    60% — buah biasa, koleksi abundan
 *   matang  30% — momen iconic, depth
 *   langka   9% — milestone-tier
 *   legenda  1% — Arme mascot (no-dup, sole entry di tier ini)
 *
 * Distribution akan di-test di Vitest suite (P2) — 10k iterations, target
 * ±2% per tier biar variance acceptable.
 */

import { PETIKAN_MUDA_POOL } from './petikanMudaPool';

// Helper untuk audio path /AI/*.wav — encodeURI handle spaces + special
// chars di legacy "N. CAPS.wav" naming dari sesi recording. Pattern
// sama dengan armeDialogs.js — single source of truth biar konsisten.
const AI = (filename) => `/AI/${encodeURI(filename)}`;

export const BATCH_ID = 'seitansai-2026';

export const TIER_CONFIG = {
  muda: {
    weight: 60,
    label: 'Buah Muda',
    spineColor: 'var(--retro-brown-dark)',
    spineWidth: '2px',
  },
  matang: {
    weight: 30,
    label: 'Buah Matang',
    spineColor: 'var(--retro-burgundy)',
    spineWidth: '4px',
  },
  langka: {
    weight: 9,
    label: 'Buah Langka',
    spineColor: 'var(--retro-burgundy)',
    spineWidth: '6px',
    accent: 'gold-inner-line',
  },
  legenda: {
    weight: 1,
    label: 'Buah Legenda',
    spineColor: 'var(--retro-gold)',
    spineWidth: '8px',
    accent: 'gold-foil-watermark',
    noDup: true,
  },
};

// Card shape:
//   {
//     id: 'arme-warga-terakhir',
//     tier: 'legenda' | 'langka' | 'matang' | 'muda',
//     title: 'Warga Terakhir Kota',
//     caption: '...',
//     image: '/path/to/asset.webp',
//     audio: '/path/to/clip.wav',   // optional
//     date: '2026-06-15',           // optional, ISO date
//     era: 'dream-fight-2026',      // optional
//     seitansaiOnly: true,          // gated to 06-14 → 06-30 WIB
//   }
//
// Card pool — di-compose dari tier-specific arrays untuk maintainability.
// Buah Muda auto-generated via `npm run generate-petikan-pool` (40 cards
// even-spaced dari /public/archive/). Langka/Matang/Legenda hand-curated.

const LEGENDA_CARDS = [
  // Sole legenda saat ini (Arme). Aprikot Mei akan ditambah di commit
  // selanjutnya — seitansaiOnly gated.
  {
    id: 'arme-warga-terakhir',
    tier: 'legenda',
    title: 'Warga Terakhir Kota',
    caption: 'Arme menunggu di bawah pohon aprikot, memetik satu buah untuk setiap pengunjung.',
    image: '/AI/ELI_1_a.png',
    era: 'armeniaca-town',
  },
];

const LANGKA_CARDS = [
  {
    id: 'eli-gen7-debut',
    tier: 'langka',
    title: 'Hari Pertama Generasi 7',
    caption: 'Awal mula perjalanan — debut Generasi 7 JKT48, 2018.',
    image: '/archive/img-379.jpg',
    date: '2018-09-15',
    era: 'gen7-debut',
  },
  {
    id: 'eli-kapten-dream-fight',
    tier: 'langka',
    title: 'Kapten Team Dream Fight 2026',
    caption: 'Era baru — memimpin Team Dream menuju JKT48 Fight 2026.',
    image: '/archive/img-379.jpg',
    date: '2026-01-01',
    era: 'dream-fight-2026',
  },
];

const MATANG_CARDS = [
  // Era markers — 4 cards spanning 2018-2026 perjalanan Eli
  {
    id: 'era-2018-gen7-awal',
    tier: 'matang',
    title: 'Era 2018 — Gen 7 Awal',
    caption: 'Tahun pertama panggung — masih meraba ritme theater.',
    image: '/archive/img-379.jpg',
    date: '2018-12-01',
    era: 'gen7',
  },
  {
    id: 'era-2020-team-k',
    tier: 'matang',
    title: 'Era 2020 — Team K',
    caption: 'Pandemi menutup theater, tapi koneksi dengan fans tetap menyala lewat live.',
    image: '/archive/img-379.jpg',
    date: '2020-06-01',
    era: 'team-k',
  },
  {
    id: 'era-2022-team-j',
    tier: 'matang',
    title: 'Era 2022 — Team J',
    caption: 'Theater hidup kembali. Eli matang sebagai performer.',
    image: '/archive/img-379.jpg',
    date: '2022-06-01',
    era: 'team-j',
  },
  {
    id: 'era-2026-team-dream',
    tier: 'matang',
    title: 'Era 2026 — Team Dream',
    caption: 'Memimpin Team Dream menuju JKT48 Fight 2026.',
    image: '/archive/img-379.jpg',
    date: '2026-01-01',
    era: 'team-dream-2026',
  },
  // Setlist signature — 4 cards untuk lagu yang membentuk identitas panggung
  {
    id: 'setlist-pajama-drive',
    tier: 'matang',
    title: 'Pajama Drive',
    caption: 'Setlist yang membentuk identitas panggung Eli di era awal.',
    image: '/archive/img-379.jpg',
    era: 'setlist',
  },
  {
    id: 'setlist-renai-kinshi',
    tier: 'matang',
    title: 'Renai Kinshi Jourei',
    caption: 'Cinta yang dilarang — tema yang berulang dirayakan di panggung JKT48.',
    image: '/archive/img-379.jpg',
    era: 'setlist',
  },
  {
    id: 'setlist-theater-no-megami',
    tier: 'matang',
    title: 'Theater no Megami',
    caption: 'Title track theater — pernyataan identitas group yang dikenang.',
    image: '/archive/img-379.jpg',
    era: 'setlist',
  },
  {
    id: 'setlist-bokutachi-no-eureka',
    tier: 'matang',
    title: 'Bokutachi no Eureka',
    caption: 'Lagu anniversary — refleksi tentang perjalanan bareng.',
    image: '/archive/img-379.jpg',
    era: 'setlist',
  },
  // Voice ingatan — 7 cards dengan audio Arme dari /public/AI/.
  // Narration dari Arme = "voice of memory" yang mengaitkan ingatan Eli
  // ke lore ArmeniacaTown. Audio plays via ▶ button di card front.
  {
    id: 'voice-warga-terakhir',
    tier: 'matang',
    title: 'Warga Terakhir',
    caption: 'Arme adalah warga terakhir di Armeniaca Town.',
    image: '/AI/ELI_2_a.png',
    audio: AI('1. ARME ADALAH WARGA TERAKHIR DI ARMENIACA TOWN.wav'),
    era: 'narration',
  },
  {
    id: 'voice-orang-pertama-harapan',
    tier: 'matang',
    title: 'Yang Pertama Menitipkan',
    caption: 'Siapa orang pertama yang menitipkan harapan di telaga itu lagi ya.',
    image: '/AI/ELI_2_a.png',
    audio: AI('11. SIAPA ORANG PERTAMA YANG MENITIPKAN HARAPAN DI TELAGA ITU LAGI YA.wav'),
    era: 'narration',
  },
  {
    id: 'voice-kursi-rapi-sepi',
    tier: 'matang',
    title: 'Kursi Berjejer',
    caption: 'Kursi berjejer rapi, tapi suasana masih sepi.',
    image: '/AI/ELI_2_a.png',
    audio: AI('13. KURSI BERJEJER RAPI, TAPI SUASANA MASIH SEPI.wav'),
    era: 'narration',
  },
  {
    id: 'voice-dulu-rame-anak',
    tier: 'matang',
    title: 'Dulu Rame, Sekarang Sunyi',
    caption: 'Disini dulu rame anak-anak bernyanyi riang gembira, sekarang hanya angin sunyi berhembus.',
    image: '/AI/ELI_2_a.png',
    audio: AI('14. DISINI DULU RAME ANAK-ANAK BERNYANYI RIANG GEMBIRA, SEKARANG HANYA ANGIN SUNYI BERHEMBUS.wav'),
    era: 'narration',
  },
  {
    id: 'voice-rak-buku-terisi',
    tier: 'matang',
    title: 'Rak Buku Terisi Lagi',
    caption: 'Tapi rak buku 1 per 1 sudah mulai terisi dengan yang baru.',
    image: '/AI/ELI_2_a.png',
    audio: AI('17. TAPI RAK BUKU 1 PER 1 SUDAH MULAI TERISI DENGAN YANG BARU.wav'),
    era: 'narration',
  },
  {
    id: 'voice-pohon-cahaya',
    tier: 'matang',
    title: 'Pohon Memancarkan Cahaya',
    caption: 'Pohon mulai memancarkan cahayanya.',
    image: '/AI/ELI_2_a.png',
    audio: AI('106. Pohon mulai memancarkan cahayanya..wav'),
    era: 'narration',
  },
  {
    id: 'voice-mercusuar-armeniaca',
    tier: 'matang',
    title: 'Mercusuar Armeniaca',
    caption: 'Dulu mereka menyebut Pohon ini Mercusuar Armeniaca.',
    image: '/AI/ELI_2_a.png',
    audio: AI('107. Dulu mereka menyebut Pohon ini Mercusuar Armeniaca..wav'),
    era: 'narration',
  },
];

export const POHON_APRIKOT_POOL = [
  ...LEGENDA_CARDS,
  ...LANGKA_CARDS,
  ...MATANG_CARDS,
  ...PETIKAN_MUDA_POOL,
];

// Tier fallback order — kalau tier yang di-roll gak punya eligible
// card (e.g., legenda udah ke-claim semua), turun ke tier di bawahnya.
// Urutan: legenda → langka → matang → muda. User selalu dapat sesuatu
// kecuali pool benar-benar kosong di semua tier.
export const TIER_FALLBACK_ORDER = ['legenda', 'langka', 'matang', 'muda'];

// Seitansai window — Aprikot Mei legenda + any seitansaiOnly cards
// hanya muncul dalam range ini (WIB inclusive).
export const SEITANSAI_WINDOW = {
  start: '2026-06-14',
  end: '2026-06-30',
};

/**
 * Roll a tier given an RNG. RNG default = Math.random (range [0, 1)).
 * Tests inject seeded RNG untuk deterministic distribution check.
 */
export const rollTier = (rng = Math.random) => {
  const r = rng() * 100;
  let acc = 0;
  for (const [key, cfg] of Object.entries(TIER_CONFIG)) {
    acc += cfg.weight;
    if (r < acc) return key;
  }
  // Fallback (floating-point edge case) — return last tier defined.
  return Object.keys(TIER_CONFIG).at(-1);
};

/**
 * Filter pool by date eligibility (seitansaiOnly gating) + tier.
 * `todayJakarta` = YYYY-MM-DD string in Asia/Jakarta timezone.
 */
export const eligibleCards = (pool, tier, todayJakarta) => {
  const inWindow =
    todayJakarta >= SEITANSAI_WINDOW.start &&
    todayJakarta <= SEITANSAI_WINDOW.end;
  return pool.filter((card) => {
    if (card.tier !== tier) return false;
    if (card.seitansaiOnly && !inWindow) return false;
    return true;
  });
};

/**
 * Pick a card given an RNG, tier, and ownedLegendaIds set (for no-dup
 * enforcement). Returns null kalau pool kosong untuk tier itu (caller
 * harus fallback ke tier lower).
 */
export const pickCardFromTier = (pool, tier, todayJakarta, ownedLegendaIds, rng = Math.random) => {
  let candidates = eligibleCards(pool, tier, todayJakarta);
  if (tier === 'legenda' && TIER_CONFIG.legenda.noDup) {
    candidates = candidates.filter((c) => !ownedLegendaIds.has(c.id));
  }
  if (candidates.length === 0) return null;
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx];
};

/**
 * Top-level orchestrator: roll tier, pick card, fallback ke tier lower
 * kalau pool tier yang di-roll kosong/exhausted. Returns the card or
 * null kalau seluruh pool kosong (pohon belum berbuah).
 *
 * State shape minimal: `{ legenda: Set<string> }` — ownedLegendaIds.
 */
export const pickCard = (state, todayJakarta, rng = Math.random, pool = POHON_APRIKOT_POOL) => {
  const rolledTier = rollTier(rng);
  const startIdx = TIER_FALLBACK_ORDER.indexOf(rolledTier);
  for (let i = startIdx; i < TIER_FALLBACK_ORDER.length; i++) {
    const tier = TIER_FALLBACK_ORDER[i];
    const card = pickCardFromTier(pool, tier, todayJakarta, state.legenda, rng);
    if (card) return card;
  }
  return null;
};
