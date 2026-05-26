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

// Card shape (populated in P5):
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
export const POHON_APRIKOT_POOL = [];

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
