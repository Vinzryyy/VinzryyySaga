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
// P2 ships 12 placeholder cards untuk mechanic testing — assets dummy,
// metadata real. P5 swap dengan curated pool ~60 cards (40 muda auto-
// generated dari archive 350+, 15 matang hand-curated, 3-5 langka, 1
// legenda).
export const POHON_APRIKOT_POOL = [
  // Legenda — sole entry, no-dup enforced
  {
    id: 'arme-warga-terakhir',
    tier: 'legenda',
    title: 'Warga Terakhir Kota',
    caption: 'Arme menunggu di bawah pohon aprikot, memetik satu buah untuk setiap pengunjung.',
    image: '/AI/ELI_1_a.png',
    era: 'armeniaca-town',
  },
  // Langka — milestone-tier placeholders
  {
    id: 'eli-gen7-debut',
    tier: 'langka',
    title: 'Hari Pertama Generasi 7',
    caption: 'Awal mula perjalanan — debut Generasi 7 JKT48, 2018.',
    image: '',
    date: '2018-09-15',
    era: 'gen7-debut',
  },
  {
    id: 'eli-kapten-dream-fight',
    tier: 'langka',
    title: 'Kapten Team Dream Fight 2026',
    caption: 'Era baru — memimpin Team Dream menuju JKT48 Fight 2026.',
    image: '',
    date: '2026-01-01',
    era: 'dream-fight-2026',
  },
  // Matang — iconic moments
  {
    id: 'era-2018-gen7-awal',
    tier: 'matang',
    title: 'Era 2018 — Gen 7 Awal',
    caption: 'Tahun pertama panggung — masih meraba ritme theater.',
    image: '',
    date: '2018-12-01',
    era: 'gen7',
  },
  {
    id: 'era-2020-team-k',
    tier: 'matang',
    title: 'Era 2020 — Team K',
    caption: 'Pandemi menutup theater, tapi koneksi dengan fans tetap menyala lewat live.',
    image: '',
    date: '2020-06-01',
    era: 'team-k',
  },
  {
    id: 'era-2022-team-j',
    tier: 'matang',
    title: 'Era 2022 — Team J',
    caption: 'Theater hidup kembali. Eli matang sebagai performer.',
    image: '',
    date: '2022-06-01',
    era: 'team-j',
  },
  // Muda — daily snapshots, abundance tier
  {
    id: 'muda-pajama-drive-2019',
    tier: 'muda',
    title: 'Pajama Drive · 2019',
    caption: 'Setlist Pajama Drive — salah satu show favorit fans era awal.',
    image: '',
    date: '2019-07-14',
  },
  {
    id: 'muda-renai-kinshi-2020',
    tier: 'muda',
    title: 'Renai Kinshi Jourei · 2020',
    caption: 'Salah satu setlist iconic JKT48 — era pandemi tetap dijaga ritmenya.',
    image: '',
    date: '2020-11-22',
  },
  {
    id: 'muda-theater-snapshot-2021',
    tier: 'muda',
    title: 'Snapshot Theater · 2021',
    caption: 'Momen kecil dari panggung yang sering terlewat.',
    image: '',
    date: '2021-03-10',
  },
  {
    id: 'muda-handshake-2022',
    tier: 'muda',
    title: 'Handshake · 2022',
    caption: 'Sapaan singkat di meja, kenangan yang panjang.',
    image: '',
    date: '2022-08-21',
  },
  {
    id: 'muda-livestream-2023',
    tier: 'muda',
    title: 'Live IDN · 2023',
    caption: 'Malam tenang di kamar, cerita ngalir di depan kamera.',
    image: '',
    date: '2023-05-15',
  },
  {
    id: 'muda-stage-light-2024',
    tier: 'muda',
    title: 'Cahaya Panggung · 2024',
    caption: 'Sorot lampu yang akrab — rumah yang sudah jadi tempat pulang.',
    image: '',
    date: '2024-09-08',
  },
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
