/**
 * Prose library tests — tier-specific picks, deterministic via injected RNG,
 * fallback ke muda untuk tier unknown.
 */

import { describe, expect, it } from 'vitest';
import { pickProse, _TIER_PROSE } from '../petikanProse';

describe('pickProse', () => {
  it('returns first line at rng=0', () => {
    const line = pickProse('muda', () => 0);
    expect(line).toBe(_TIER_PROSE.muda[0]);
  });

  it('returns last line at rng→1', () => {
    const lastIdx = _TIER_PROSE.legenda.length - 1;
    // Math.floor((1 - epsilon) * N) = N - 1
    const line = pickProse('legenda', () => 0.9999);
    expect(line).toBe(_TIER_PROSE.legenda[lastIdx]);
  });

  it('uses tier-specific library', () => {
    const m = pickProse('muda', () => 0);
    const lg = pickProse('legenda', () => 0);
    expect(m).not.toBe(lg);
    expect(_TIER_PROSE.muda).toContain(m);
    expect(_TIER_PROSE.legenda).toContain(lg);
  });

  it('falls back to muda for unknown tier', () => {
    const line = pickProse('unknown-tier', () => 0);
    expect(_TIER_PROSE.muda).toContain(line);
  });

  it('each tier has at least 3 prose lines (avoid repetitive UX)', () => {
    Object.entries(_TIER_PROSE).forEach(([tier, lines]) => {
      expect(lines.length, `tier ${tier}`).toBeGreaterThanOrEqual(3);
    });
  });

  it('all prose lines are non-empty strings', () => {
    Object.values(_TIER_PROSE).flat().forEach((line) => {
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
    });
  });
});
