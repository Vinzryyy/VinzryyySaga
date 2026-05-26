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
    const state = { legenda: new Set(['arme-warga-terakhir']) };
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

describe('POHON_APRIKOT_POOL placeholder pool', () => {
  it('contains at least one card per tier', () => {
    const tiers = new Set(POHON_APRIKOT_POOL.map((c) => c.tier));
    expect(tiers.has('legenda')).toBe(true);
    expect(tiers.has('langka')).toBe(true);
    expect(tiers.has('matang')).toBe(true);
    expect(tiers.has('muda')).toBe(true);
  });

  it('has Arme as a legenda card', () => {
    const arme = POHON_APRIKOT_POOL.find((c) => c.id === 'arme-warga-terakhir');
    expect(arme).toBeTruthy();
    expect(arme.tier).toBe('legenda');
  });

  it('has Aprikot Mei as seitansaiOnly legenda', () => {
    const aprikotMei = POHON_APRIKOT_POOL.find(
      (c) => c.id === 'aprikot-mei-seitansai'
    );
    expect(aprikotMei).toBeTruthy();
    expect(aprikotMei.tier).toBe('legenda');
    expect(aprikotMei.seitansaiOnly).toBe(true);
  });

  it('Aprikot Mei NOT eligible outside seitansai window', () => {
    const eligible = eligibleCards(POHON_APRIKOT_POOL, 'legenda', '2026-05-01');
    expect(eligible.map((c) => c.id)).not.toContain('aprikot-mei-seitansai');
  });

  it('Aprikot Mei eligible inside seitansai window', () => {
    const eligible = eligibleCards(POHON_APRIKOT_POOL, 'legenda', '2026-06-15');
    expect(eligible.map((c) => c.id)).toContain('aprikot-mei-seitansai');
  });

  it('has at least 40 muda cards (auto-generated pool)', () => {
    const muda = POHON_APRIKOT_POOL.filter((c) => c.tier === 'muda');
    expect(muda.length).toBeGreaterThanOrEqual(40);
  });

  it('has pool size around batch #1 target (~60 cards)', () => {
    expect(POHON_APRIKOT_POOL.length).toBeGreaterThanOrEqual(55);
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
});
