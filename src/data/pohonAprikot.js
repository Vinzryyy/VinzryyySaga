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
import { PETIKAN_EMOTELABS_CARDS } from './petikanEmoteLabsCards';

// Helper untuk audio path /AI/*.wav — encodeURI handle spaces + special
// chars di legacy "N. CAPS.wav" naming dari sesi recording. Pattern
// sama dengan armeDialogs.js — single source of truth biar konsisten.
const AI = (filename) => `/AI/${encodeURI(filename)}`;

export const BATCH_ID = 'life-of-armeniaca-2026';

// Tier labels updated 2026-05-27 — refactor theme ke "The Life of Armeniaca"
// (fan story idolizing Helisma). Internal keys tetap muda/matang/langka/
// legenda untuk backward compat dgn storage layer + tests. Display label
// di UI pakai S/A/B/C (gacha-style hierarchy).
export const TIER_CONFIG = {
  muda: {
    weight: 60,
    label: 'C',
    fullLabel: 'Tier C · Vibes Harian',
    spineColor: 'var(--retro-brown-dark)',
    spineWidth: '2px',
  },
  matang: {
    weight: 30,
    label: 'B',
    fullLabel: 'Tier B · Beat Emosional',
    spineColor: 'var(--retro-burgundy)',
    spineWidth: '4px',
  },
  langka: {
    weight: 9,
    label: 'A',
    fullLabel: 'Tier A · Momen Penting',
    spineColor: 'var(--retro-burgundy)',
    spineWidth: '6px',
    accent: 'gold-inner-line',
  },
  legenda: {
    weight: 1,
    label: 'S',
    fullLabel: 'Tier S · Peak Fan Life',
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
  // Arme — year-round legenda, always eligible
  {
    id: 'arme-warga-terakhir',
    tier: 'legenda',
    title: 'Warga Terakhir Kota',
    caption: 'Arme menunggu di bawah pohon aprikot, memetik satu buah untuk setiap pengunjung.',
    image: '/Arme/ELI_1_a.webp',
    era: 'armeniaca-town',
  },
  // Aprikot Mei — seitansaiOnly, hanya muncul 2026-06-14 → 06-30 WIB.
  // Pure illustration (no Eli photo) — symbolic seitansai fruit. Art di
  // /public/petikan/aprikot-mei.svg (hand-craft v1, designer Helismiley
  // bisa swap di P6 polish kalau ada timeline).
  {
    id: 'aprikot-mei-seitansai',
    tier: 'legenda',
    title: 'Aprikot Mei',
    caption: 'Buah yang hanya jatuh di musim seitansai — penanda waktu yang dijaga pohon untuk satu hari di tahun.',
    image: '/petikan/aprikot-mei.svg',
    date: '2026-06-15',
    era: 'seitansai',
    seitansaiOnly: true,
  },
];

const LANGKA_CARDS = [
  {
    id: 'eli-gen7-debut',
    tier: 'langka',
    title: 'Hari Pertama Generasi 7',
    caption: 'Awal mula perjalanan — debut Generasi 7 JKT48, 2018.',
    image: '/archive/img-379.webp',
    date: '2018-09-15',
    era: 'gen7-debut',
  },
  {
    id: 'eli-senbatsu-pertama',
    tier: 'langka',
    title: 'Senbatsu Pertama',
    caption: 'Naik ke barisan depan untuk pertama kalinya — momen yang sering diingat fans.',
    image: '/archive/img-379.webp',
    era: 'senbatsu',
  },
  {
    id: 'eli-show-milestone',
    tier: 'langka',
    title: 'Show Ke-500 di Theater',
    caption: 'Angka bulat yang sering terlewat di kepala, tapi dijaga di arsip — banyak panggung yang sudah dilewati.',
    image: '/archive/img-379.webp',
    era: 'milestone',
  },
  {
    id: 'eli-byu-collab-gift',
    tier: 'langka',
    title: 'By-U — Titipan dari Fans',
    caption: 'Lagu By-U sebagai hadiah seitansai dari fans — bukan karya solo Eli, tapi bentuk kolektif terima kasih.',
    image: '/archive/img-379.webp',
    date: '2026-06-15',
    era: 'byu-gift',
  },
  {
    id: 'eli-kapten-dream-fight',
    tier: 'langka',
    title: 'Kapten Team Dream Fight 2026',
    caption: 'Era baru — memimpin Team Dream menuju JKT48 Fight 2026.',
    image: '/archive/img-379.webp',
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
    image: '/archive/img-379.webp',
    date: '2018-12-01',
    era: 'gen7',
  },
  {
    id: 'era-2020-team-k',
    tier: 'matang',
    title: 'Era 2020 — Team K',
    caption: 'Pandemi menutup theater, tapi koneksi dengan fans tetap menyala lewat live.',
    image: '/archive/img-379.webp',
    date: '2020-06-01',
    era: 'team-k',
  },
  {
    id: 'era-2022-team-j',
    tier: 'matang',
    title: 'Era 2022 — Team J',
    caption: 'Theater hidup kembali. Eli matang sebagai performer.',
    image: '/archive/img-379.webp',
    date: '2022-06-01',
    era: 'team-j',
  },
  {
    id: 'era-2026-team-dream',
    tier: 'matang',
    title: 'Era 2026 — Team Dream',
    caption: 'Memimpin Team Dream menuju JKT48 Fight 2026.',
    image: '/archive/img-379.webp',
    date: '2026-01-01',
    era: 'team-dream-2026',
  },
  // Setlist signature — 4 cards untuk lagu yang membentuk identitas panggung
  {
    id: 'setlist-pajama-drive',
    tier: 'matang',
    title: 'Pajama Drive',
    caption: 'Setlist yang membentuk identitas panggung Eli di era awal.',
    image: '/archive/img-379.webp',
    era: 'setlist',
  },
  {
    id: 'setlist-renai-kinshi',
    tier: 'matang',
    title: 'Renai Kinshi Jourei',
    caption: 'Cinta yang dilarang — tema yang berulang dirayakan di panggung JKT48.',
    image: '/archive/img-379.webp',
    era: 'setlist',
  },
  {
    id: 'setlist-theater-no-megami',
    tier: 'matang',
    title: 'Theater no Megami',
    caption: 'Title track theater — pernyataan identitas group yang dikenang.',
    image: '/archive/img-379.webp',
    era: 'setlist',
  },
  {
    id: 'setlist-bokutachi-no-eureka',
    tier: 'matang',
    title: 'Bokutachi no Eureka',
    caption: 'Lagu anniversary — refleksi tentang perjalanan bareng.',
    image: '/archive/img-379.webp',
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
    image: '/Arme/ELI_2_a.webp',
    audio: AI('1. ARME ADALAH WARGA TERAKHIR DI ARMENIACA TOWN.wav'),
    era: 'narration',
  },
  {
    id: 'voice-orang-pertama-harapan',
    tier: 'matang',
    title: 'Yang Pertama Menitipkan',
    caption: 'Siapa orang pertama yang menitipkan harapan di telaga itu lagi ya.',
    image: '/Arme/ELI_2_a.webp',
    audio: AI('11. SIAPA ORANG PERTAMA YANG MENITIPKAN HARAPAN DI TELAGA ITU LAGI YA.wav'),
    era: 'narration',
  },
  {
    id: 'voice-kursi-rapi-sepi',
    tier: 'matang',
    title: 'Kursi Berjejer',
    caption: 'Kursi berjejer rapi, tapi suasana masih sepi.',
    image: '/Arme/ELI_2_a.webp',
    audio: AI('13. KURSI BERJEJER RAPI, TAPI SUASANA MASIH SEPI.wav'),
    era: 'narration',
  },
  {
    id: 'voice-dulu-rame-anak',
    tier: 'matang',
    title: 'Dulu Rame, Sekarang Sunyi',
    caption: 'Disini dulu rame anak-anak bernyanyi riang gembira, sekarang hanya angin sunyi berhembus.',
    image: '/Arme/ELI_2_a.webp',
    audio: AI('14. DISINI DULU RAME ANAK-ANAK BERNYANYI RIANG GEMBIRA, SEKARANG HANYA ANGIN SUNYI BERHEMBUS.wav'),
    era: 'narration',
  },
  {
    id: 'voice-rak-buku-terisi',
    tier: 'matang',
    title: 'Rak Buku Terisi Lagi',
    caption: 'Tapi rak buku 1 per 1 sudah mulai terisi dengan yang baru.',
    image: '/Arme/ELI_2_a.webp',
    audio: AI('17. TAPI RAK BUKU 1 PER 1 SUDAH MULAI TERISI DENGAN YANG BARU.wav'),
    era: 'narration',
  },
  {
    id: 'voice-pohon-cahaya',
    tier: 'matang',
    title: 'Pohon Memancarkan Cahaya',
    caption: 'Pohon mulai memancarkan cahayanya.',
    image: '/Arme/ELI_2_a.webp',
    audio: AI('106. Pohon mulai memancarkan cahayanya..wav'),
    era: 'narration',
  },
  {
    id: 'voice-mercusuar-armeniaca',
    tier: 'matang',
    title: 'Mercusuar Armeniaca',
    caption: 'Dulu mereka menyebut Pohon ini Mercusuar Armeniaca.',
    image: '/Arme/ELI_2_a.webp',
    audio: AI('107. Dulu mereka menyebut Pohon ini Mercusuar Armeniaca..wav'),
    era: 'narration',
  },
];

// Illustrator credit derived dari image path prefix — no per-card data
// edit needed. Override possible via explicit `card.illustrator` field.
const inferIllustrator = (image) => {
  if (!image) return null;
  if (image.startsWith('/EmoteLabs/')) return 'Emote Labs';
  if (image.startsWith('/archive/')) return 'JKT48 · Arsip';
  // /AI/ (mascot poses) + /petikan/ (hand-crafted SVGs) — both Armeniaca
  // origin (in-house AI + designer). Default fallback juga Armeniaca.
  return 'Armeniaca';
};

// Composed pool — cards di-tag dgn cardNumber (1-based) + setSize +
// illustrator at module-eval. setSize jadi single source untuk "X/Y"
// footer di kartu (no manual count maintenance).
//
// ⚠️ EXPERIMENTAL (2026-05-26): GIF-only mode — semua tier diisi dari
// PETIKAN_EMOTELABS_CARDS aja. Old arrays di-comment-out (gak deleted)
// supaya gampang revert. Lihat petikanEmoteLabsCards.js untuk tier
// mapping (Lightstick di-promote ke legenda saat experiment ini).
const RAW_POOL = [
  // ...LEGENDA_CARDS,
  // ...LANGKA_CARDS,
  // ...MATANG_CARDS,
  // ...PETIKAN_MUDA_POOL,
  ...PETIKAN_EMOTELABS_CARDS,
];

export const SET_SIZE = RAW_POOL.length;
export const SET_CODE = 'TLA'; // The Life of Armeniaca — batch I

export const POHON_APRIKOT_POOL = RAW_POOL.map((card, idx) => ({
  ...card,
  cardNumber: idx + 1,
  setSize: SET_SIZE,
  setCode: SET_CODE,
  illustrator: card.illustrator || inferIllustrator(card.image),
}));

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
 *
 * Soft pity bias: opts.wishlist (Set<cardId>) + opts.pityActive (bool).
 * Saat pityActive=true dan ada eligible candidate yang juga di
 * wishlist user, 50/50 chance pick dari wishlist subset vs full pool.
 * Player agency without breaking randomness (referensi: Genshin/HSR
 * banner systems). Pure rolls (non-pity) UN-touched — wishlist gak
 * influence muda/matang biar gak gampang banget.
 */
export const pickCardFromTier = (
  pool,
  tier,
  todayJakarta,
  ownedLegendaIds,
  rng = Math.random,
  opts = {}
) => {
  let candidates = eligibleCards(pool, tier, todayJakarta);
  if (tier === 'legenda' && TIER_CONFIG.legenda.noDup) {
    candidates = candidates.filter((c) => !ownedLegendaIds.has(c.id));
  }
  if (candidates.length === 0) return null;
  // Soft pity wishlist bias — only saat pityActive + ada candidate yang
  // matching wishlist + user belum own card itu (for non-legenda, owned
  // gak diblokir tapi user mungkin mau langka baru, jadi bias ke yang
  // belum dipunya kalau mungkin).
  if (opts.pityActive && opts.wishlist && opts.wishlist.size > 0) {
    const wishMatches = candidates.filter((c) => opts.wishlist.has(c.id));
    if (wishMatches.length > 0 && rng() < 0.5) {
      const idx = Math.floor(rng() * wishMatches.length);
      return wishMatches[idx];
    }
  }
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx];
};

/**
 * Pity thresholds — counter di state.pity {langka, legenda} naik tiap
 * pluck. Saat hitung MENCAPAI threshold, tier di-override ke pity tier.
 *   langka  → 10 plucks tanpa langka+ guarantees langka
 *   legenda → 50 plucks tanpa legenda guarantees legenda
 * Single source di petikanStorage.js (PITY_THRESHOLD), di-mirror di
 * sini supaya data layer self-contained untuk testing tanpa import
 * storage.
 *
 * Referensi: UR_PITY_LIMIT dari Tierlist-JKT48 (MrcellSbst).
 */
export const PITY_THRESHOLD = {
  langka: 10,
  legenda: 50,
};

/**
 * Top-level orchestrator: roll tier, pick card, fallback ke tier lower
 * kalau pool tier yang di-roll kosong/exhausted. Returns the card or
 * null kalau seluruh pool kosong (pohon belum berbuah).
 *
 * State shape: `{ legenda: Set<string>, pity?: {langka, legenda} }`.
 * Pity overrides:
 *   - state.pity.legenda >= 50 → force tier = 'legenda'
 *   - state.pity.langka  >= 10 → force tier = 'langka' (if not already legenda override)
 * Override skipped saat user udah own semua legenda (pool exhausted
 * for that tier) — pity gak meaningful kalau gak ada card baru.
 */
export const pickCard = (state, todayJakarta, rng = Math.random, pool = POHON_APRIKOT_POOL) => {
  const pity = state.pity || { langka: 0, legenda: 0 };
  // Check legenda pity first — kalau hit, force legenda tier (fallback
  // chain will handle if all legenda owned).
  let rolledTier;
  let pityActive = false;
  const legendaInPool = pool.filter((c) => c.tier === 'legenda');
  const allLegendaOwned =
    legendaInPool.length > 0 &&
    legendaInPool.every((c) => state.legenda?.has(c.id));
  if (pity.legenda >= PITY_THRESHOLD.legenda && !allLegendaOwned) {
    rolledTier = 'legenda';
    pityActive = true;
  } else if (pity.langka >= PITY_THRESHOLD.langka) {
    rolledTier = 'langka';
    pityActive = true;
  } else {
    rolledTier = rollTier(rng);
  }
  // Wishlist bias hanya kalau pityActive — pure rolls un-touched.
  const opts = { pityActive, wishlist: state.wishlist };
  const startIdx = TIER_FALLBACK_ORDER.indexOf(rolledTier);
  for (let i = startIdx; i < TIER_FALLBACK_ORDER.length; i++) {
    const tier = TIER_FALLBACK_ORDER[i];
    const card = pickCardFromTier(pool, tier, todayJakarta, state.legenda, rng, opts);
    if (card) return card;
  }
  return null;
};

/**
 * Batch pick — N kartu untuk satu "buka" event. Default 3 (1 tap = 3 kartu).
 *
 * Semantics:
 *   - Setiap kartu di-roll pakai state PRE-event (pity belum advance,
 *     legenda set belum di-update). Tapi within batch, legenda yang udah
 *     ke-pick di-track supaya gak duplicate dalam 1 buka (no-dup legenda).
 *   - Soft batch-dupe avoidance: kalau roll dapet card-id yang udah dipick
 *     di batch ini, retry sampai 5×. Setelah itu accept dupe (small pool
 *     edge case — rather than infinite loop).
 *   - Pool exhausted di-tengah-batch: return array < count (caller handle).
 *
 * Returns array of cards (length 0..count).
 */
export const pickCards = (
  state,
  todayJakarta,
  count = 3,
  rng = Math.random,
  pool = POHON_APRIKOT_POOL
) => {
  const cards = [];
  const batchLegenda = new Set(state.legenda || []);
  const batchPickedIds = new Set();
  for (let i = 0; i < count; i++) {
    const tempState = { ...state, legenda: batchLegenda };
    let card = pickCard(tempState, todayJakarta, rng, pool);
    let attempts = 0;
    while (card && batchPickedIds.has(card.id) && attempts < 5) {
      card = pickCard(tempState, todayJakarta, rng, pool);
      attempts += 1;
    }
    if (!card) break;
    cards.push(card);
    batchPickedIds.add(card.id);
    if (card.tier === 'legenda') batchLegenda.add(card.id);
  }
  return cards;
};

// Default jumlah kartu per buka event. Single source — UI + tests
// reference this. Naik dari 1 ke 3 di 2026-05-27.
export const CARDS_PER_PLUCK = 3;
