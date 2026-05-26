/**
 * Pohon Aprikot data layer tests — RNG distribution, no-dup legenda,
 * seitansai window gating, tier fallback.
 *
 * Distribution test pakai 10k iterasi dengan tolerance ±2% — variance
 * acceptable buat tier weights 60/30/9/1 yg total 100.
 */

import { describe, expect, it } from 'vitest';
import {
  POHON_APRIKOT_POOL,
  TIER_CONFIG,
  SEITANSAI_WINDOW,
  PITY_THRESHOLD,
  rollTier,
  pickCardFromTier,
  pickCard,
  eligibleCards,
} from '../pohonAprikot';

// Deterministic seeded RNG — mulberry32 algorithm. Standard mini-PRNG
// untuk testing weighted-random tanpa nambah dep crypto.
const seededRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe('rollTier distribution', () => {
  it('matches weighted probabilities within ±2% over 10k iterations', () => {
    const rng = seededRng(12345);
    const counts = { muda: 0, matang: 0, langka: 0, legenda: 0 };
    const iterations = 10_000;
    for (let i = 0; i < iterations; i++) {
      counts[rollTier(rng)]++;
    }
    // Convert ke percentage
    const pct = {
      muda: (counts.muda / iterations) * 100,
      matang: (counts.matang / iterations) * 100,
      langka: (counts.langka / iterations) * 100,
      legenda: (counts.legenda / iterations) * 100,
    };
    expect(pct.muda).toBeGreaterThanOrEqual(58);
    expect(pct.muda).toBeLessThanOrEqual(62);
    expect(pct.matang).toBeGreaterThanOrEqual(28);
    expect(pct.matang).toBeLessThanOrEqual(32);
    expect(pct.langka).toBeGreaterThanOrEqual(7);
    expect(pct.langka).toBeLessThanOrEqual(11);
    // Legenda tolerance lebih longgar — 1% base, ±0.5pt variance
    expect(pct.legenda).toBeGreaterThanOrEqual(0.5);
    expect(pct.legenda).toBeLessThanOrEqual(1.5);
  });

  it('weights sum to 100', () => {
    const total = Object.values(TIER_CONFIG).reduce(
      (sum, cfg) => sum + cfg.weight,
      0
    );
    expect(total).toBe(100);
  });
});

describe('eligibleCards seitansai window gating', () => {
  const mockPool = [
    { id: 'a', tier: 'muda' },
    { id: 'b', tier: 'muda', seitansaiOnly: true },
    { id: 'c', tier: 'langka' },
  ];

  it('excludes seitansaiOnly cards outside window', () => {
    const result = eligibleCards(mockPool, 'muda', '2026-05-01');
    expect(result.map((c) => c.id)).toEqual(['a']);
  });

  it('includes seitansaiOnly cards inside window (start boundary)', () => {
    const result = eligibleCards(mockPool, 'muda', SEITANSAI_WINDOW.start);
    expect(result.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('includes seitansaiOnly cards inside window (end boundary)', () => {
    const result = eligibleCards(mockPool, 'muda', SEITANSAI_WINDOW.end);
    expect(result.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('excludes seitansaiOnly cards after window', () => {
    const result = eligibleCards(mockPool, 'muda', '2026-07-01');
    expect(result.map((c) => c.id)).toEqual(['a']);
  });

  it('filters by tier', () => {
    const result = eligibleCards(mockPool, 'langka', '2026-05-01');
    expect(result.map((c) => c.id)).toEqual(['c']);
  });
});

describe('pickCardFromTier no-dup legenda', () => {
  const legendaPool = [
    { id: 'arme', tier: 'legenda' },
  ];

  it('returns the card when not yet owned', () => {
    const owned = new Set();
    const card = pickCardFromTier(legendaPool, 'legenda', '2026-05-26', owned, () => 0);
    expect(card?.id).toBe('arme');
  });

  it('returns null when legenda already owned', () => {
    const owned = new Set(['arme']);
    const card = pickCardFromTier(legendaPool, 'legenda', '2026-05-26', owned, () => 0);
    expect(card).toBeNull();
  });

  it('does NOT enforce no-dup on non-legenda tiers', () => {
    const matangPool = [{ id: 'era-2018', tier: 'matang' }];
    const owned = new Set(['era-2018']); // ownedLegenda passed but irrelevant for matang
    const card = pickCardFromTier(matangPool, 'matang', '2026-05-26', owned, () => 0);
    expect(card?.id).toBe('era-2018');
  });
});

describe('pickCard fallback chain', () => {
  it('falls back from legenda → langka when legenda exhausted', () => {
    // GIF-only experiment: legenda = arme-vtuber-lightstick (Lightstick
    // promoted dari langka). Owning it exhausts legenda → fallback.
    const state = { legenda: new Set(['arme-vtuber-lightstick']) };
    // Force tier roll to legenda (rng = 99.5 → 99.5/100 → falls in legenda 99-100 band)
    const forcedRng = () => 0.995;
    const card = pickCard(state, '2026-05-26', forcedRng);
    // Legenda owned → fallback to langka (next in TIER_FALLBACK_ORDER)
    expect(card).not.toBeNull();
    expect(card.tier).toBe('langka');
  });

  it('returns muda when high rng + no fallback needed', () => {
    const state = { legenda: new Set() };
    // rng 0.1 → 10% → muda tier (0-60% band)
    const card = pickCard(state, '2026-05-26', () => 0.1);
    expect(card).not.toBeNull();
    expect(card.tier).toBe('muda');
  });

  it('returns null when pool fully empty', () => {
    const state = { legenda: new Set() };
    const card = pickCard(state, '2026-05-26', Math.random, []);
    expect(card).toBeNull();
  });
});

describe('pickCard pity overrides', () => {
  it('forces langka tier when pity.langka >= threshold', () => {
    const state = {
      legenda: new Set(),
      pity: { langka: PITY_THRESHOLD.langka, legenda: 0 },
    };
    // rng = 0.1 (would normally roll muda) — pity should override
    const card = pickCard(state, '2026-05-26', () => 0.1);
    expect(card).not.toBeNull();
    expect(card.tier).toBe('langka');
  });

  it('forces legenda tier when pity.legenda >= threshold', () => {
    const state = {
      legenda: new Set(),
      pity: { langka: 0, legenda: PITY_THRESHOLD.legenda },
    };
    // rng = 0.1 (would normally roll muda) — legenda pity wins
    const card = pickCard(state, '2026-05-26', () => 0.1);
    expect(card).not.toBeNull();
    expect(card.tier).toBe('legenda');
  });

  it('legenda pity takes precedence over langka pity', () => {
    const state = {
      legenda: new Set(),
      pity: { langka: PITY_THRESHOLD.langka, legenda: PITY_THRESHOLD.legenda },
    };
    const card = pickCard(state, '2026-05-26', () => 0.1);
    expect(card.tier).toBe('legenda');
  });

  it('legenda pity skipped if all legenda already owned (falls to normal roll)', () => {
    const allLegendaIds = POHON_APRIKOT_POOL
      .filter((c) => c.tier === 'legenda')
      .map((c) => c.id);
    const state = {
      legenda: new Set(allLegendaIds),
      pity: { langka: 0, legenda: PITY_THRESHOLD.legenda + 10 },
    };
    // rng = 0.1 → muda. Pity legenda would override → legenda → no
    // eligible legenda → fallback chain. Should NOT trigger pity at
    // all since user owns everything. Result: normal muda roll.
    const card = pickCard(state, '2026-05-26', () => 0.1);
    expect(card).not.toBeNull();
    expect(card.tier).toBe('muda');
  });

  it('does NOT override when pity below threshold', () => {
    const state = {
      legenda: new Set(),
      pity: { langka: PITY_THRESHOLD.langka - 1, legenda: 0 },
    };
    // rng = 0.1 → muda. No override since langka pity = threshold - 1.
    const card = pickCard(state, '2026-05-26', () => 0.1);
    expect(card.tier).toBe('muda');
  });
});

describe('pickCard wishlist soft-pity bias', () => {
  it('respects wishlist when pity-langka triggers and rng favors bias', () => {
    // Force pity langka active. Set wishlist to a SPECIFIC langka card.
    // RNG sequence: first call < 0.5 (bias to wishlist), second pick from
    // wishlist subset (only 1 candidate → idx 0).
    const langkaIds = POHON_APRIKOT_POOL
      .filter((c) => c.tier === 'langka')
      .map((c) => c.id);
    expect(langkaIds.length).toBeGreaterThan(0);
    const wishedId = langkaIds[0];
    const state = {
      legenda: new Set(),
      pity: { langka: PITY_THRESHOLD.langka, legenda: 0 },
      wishlist: new Set([wishedId]),
    };
    let calls = 0;
    const rng = () => {
      // Call 1 (rollTier): irrelevant since pity overrides
      // Call 2 (bias check): 0.4 → < 0.5 → bias to wishlist
      // Call 3 (idx pick): 0 → pick first of wishlist subset
      calls++;
      if (calls === 1) return 0.4;
      return 0;
    };
    const card = pickCard(state, '2026-05-26', rng);
    expect(card.id).toBe(wishedId);
    expect(card.tier).toBe('langka');
  });

  it('does NOT bias on pure (non-pity) rolls — RNG controls', () => {
    // No pity triggered. Wishlist set but should be ignored.
    const langkaIds = POHON_APRIKOT_POOL
      .filter((c) => c.tier === 'langka')
      .map((c) => c.id);
    const wishedId = langkaIds[0];
    const state = {
      legenda: new Set(),
      pity: { langka: 0, legenda: 0 },
      wishlist: new Set([wishedId]),
    };
    // rng=0.1 → muda tier roll. Wishlist (langka entry) gak relevant
    // karena tier yang dipilih muda, dan opts.pityActive = false.
    const card = pickCard(state, '2026-05-26', () => 0.1);
    expect(card.tier).toBe('muda');
  });

  it('falls back to normal random pick when wishlist empty', () => {
    const state = {
      legenda: new Set(),
      pity: { langka: PITY_THRESHOLD.langka, legenda: 0 },
      wishlist: new Set(),
    };
    const card = pickCard(state, '2026-05-26', () => 0);
    expect(card.tier).toBe('langka');
  });

  it('falls back to non-wishlist pick when rng>=0.5 (50% chance)', () => {
    const langkaIds = POHON_APRIKOT_POOL
      .filter((c) => c.tier === 'langka')
      .map((c) => c.id);
    const wishedId = langkaIds[0];
    const state = {
      legenda: new Set(),
      pity: { langka: PITY_THRESHOLD.langka, legenda: 0 },
      wishlist: new Set([wishedId]),
    };
    let calls = 0;
    const rng = () => {
      calls++;
      // Call 1: rollTier (irrelevant — pity overrides)
      // Call 2: bias check, 0.7 → >= 0.5 → no bias
      // Call 3: idx pick (0)
      if (calls === 1) return 0.7;
      return 0;
    };
    const card = pickCard(state, '2026-05-26', rng);
    expect(card.tier).toBe('langka');
    // First langka card in the (filtered) candidates — might be wished
    // or not; we don't assert specifically since order depends on pool.
  });
});

// GIF-only experimental pool (2026-05-26): semua kartu = CoffeeBean
// (Arme VTuber form). Test assertions di-relax buat reflect pool yang
// jauh lebih kecil + tanpa archive photos. Kalau revert ke comprehensive
// pool, re-enable LEGENDA/LANGKA/MATANG/MUDA assertions di bawah (lihat
// git history file ini).
describe('POHON_APRIKOT_POOL (GIF-only experimental)', () => {
  it('contains at least one card per tier', () => {
    const tiers = new Set(POHON_APRIKOT_POOL.map((c) => c.tier));
    expect(tiers.has('legenda')).toBe(true);
    expect(tiers.has('langka')).toBe(true);
    expect(tiers.has('matang')).toBe(true);
    expect(tiers.has('muda')).toBe(true);
  });

  it('Lightstick is the legenda card (Arme wotagei)', () => {
    const legenda = POHON_APRIKOT_POOL.filter((c) => c.tier === 'legenda');
    expect(legenda.length).toBeGreaterThanOrEqual(1);
    const lightstick = legenda.find((c) => c.id === 'arme-vtuber-lightstick');
    expect(lightstick).toBeTruthy();
  });

  it('all cards are chibi (CoffeeBean VTuber form)', () => {
    POHON_APRIKOT_POOL.forEach((card) => {
      expect(card.artStyle).toBe('chibi');
      expect(card.image).toMatch(/^\/EmoteLabs\//);
    });
  });

  it('has pool size matching the EmoteLabs GIF set (~11)', () => {
    expect(POHON_APRIKOT_POOL.length).toBeGreaterThanOrEqual(10);
    expect(POHON_APRIKOT_POOL.length).toBeLessThanOrEqual(20);
  });

  it('all cards have unique ids', () => {
    const ids = POHON_APRIKOT_POOL.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all cards have required fields (id, tier, title, caption)', () => {
    POHON_APRIKOT_POOL.forEach((card) => {
      expect(card.id).toBeTruthy();
      expect(card.tier).toBeTruthy();
      expect(card.title).toBeTruthy();
      expect(card.caption).toBeTruthy();
    });
  });

  it('all cards have TCG metadata (cardNumber + setSize + setCode + illustrator)', () => {
    POHON_APRIKOT_POOL.forEach((card, idx) => {
      expect(card.cardNumber).toBe(idx + 1);
      expect(card.setSize).toBe(POHON_APRIKOT_POOL.length);
      expect(card.setCode).toBe('PAA');
      expect(card.illustrator).toBe('Emote Labs');
    });
  });
});
