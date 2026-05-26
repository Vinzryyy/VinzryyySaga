/**
 * Petikan storage tests — Jakarta date math, daily-lock boundary,
 * applyPluck immutability + legenda dedup, localStorage corruption.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getJakartaDate,
  msUntilNextJakartaMidnight,
  loadState,
  saveState,
  canPluckToday,
  applyPluck,
  resetState,
  getBuah,
  addBuah,
  spendBuah,
  BUAH_CAP,
  PITY_THRESHOLD,
  _KEYS,
} from '../petikanStorage';

describe('getJakartaDate', () => {
  it('returns YYYY-MM-DD format', () => {
    const date = getJakartaDate(new Date('2026-05-26T10:00:00+07:00'));
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns Jakarta date even when input UTC is previous day', () => {
    // 2026-05-26 03:00 WIB = 2026-05-25 20:00 UTC
    const utc = new Date('2026-05-25T20:00:00Z');
    expect(getJakartaDate(utc)).toBe('2026-05-26');
  });

  it('handles WIB midnight crossover (00:00:00 WIB = 17:00 UTC prev day)', () => {
    const justAfterMidnightWib = new Date('2026-06-15T00:00:01+07:00');
    expect(getJakartaDate(justAfterMidnightWib)).toBe('2026-06-15');
  });
});

describe('canPluckToday boundary', () => {
  it('returns false when lastPluck equals today WIB', () => {
    const now = new Date('2026-05-26T15:30:00+07:00');
    const state = { lastPluck: '2026-05-26', buku: {}, legenda: new Set() };
    expect(canPluckToday(state, now)).toBe(false);
  });

  it('returns true when lastPluck is null', () => {
    const now = new Date('2026-05-26T15:30:00+07:00');
    const state = { lastPluck: null, buku: {}, legenda: new Set() };
    expect(canPluckToday(state, now)).toBe(true);
  });

  it('returns true at WIB midnight when yesterday was plucked', () => {
    const justMidnight = new Date('2026-05-27T00:00:00+07:00');
    const state = { lastPluck: '2026-05-26', buku: {}, legenda: new Set() };
    expect(canPluckToday(state, justMidnight)).toBe(true);
  });

  it('returns false at 23:59:59 WIB on same day as pluck', () => {
    const lastSec = new Date('2026-05-26T23:59:59+07:00');
    const state = { lastPluck: '2026-05-26', buku: {}, legenda: new Set() };
    expect(canPluckToday(state, lastSec)).toBe(false);
  });
});

describe('msUntilNextJakartaMidnight', () => {
  it('returns ~24h at WIB midnight', () => {
    const midnight = new Date('2026-05-26T00:00:00+07:00');
    const ms = msUntilNextJakartaMidnight(midnight);
    // Tolerate ±2s drift from sub-second precision
    expect(ms).toBeGreaterThan(24 * 3600 * 1000 - 2000);
    expect(ms).toBeLessThanOrEqual(24 * 3600 * 1000);
  });

  it('returns ~1s at 23:59:59 WIB', () => {
    const lastSec = new Date('2026-05-26T23:59:59+07:00');
    const ms = msUntilNextJakartaMidnight(lastSec);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThan(2000);
  });

  it('returns positive value at any time', () => {
    const noon = new Date('2026-05-26T12:00:00+07:00');
    const ms = msUntilNextJakartaMidnight(noon);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(24 * 3600 * 1000);
  });
});

describe('applyPluck immutability + legenda dedup', () => {
  it('returns new state object (does not mutate input)', () => {
    const original = { lastPluck: null, buku: {}, legenda: new Set() };
    const card = { id: 'test-1', tier: 'muda' };
    const next = applyPluck(original, card, new Date('2026-05-26T10:00:00+07:00'));
    expect(next).not.toBe(original);
    expect(original.lastPluck).toBeNull();
    expect(original.buku).toEqual({});
    expect(original.legenda.size).toBe(0);
  });

  it('increments count for repeated pull of same card', () => {
    let state = { lastPluck: null, buku: {}, legenda: new Set() };
    const card = { id: 'muda-1', tier: 'muda' };
    state = applyPluck(state, card, new Date('2026-05-26T10:00:00+07:00'));
    state = applyPluck(state, card, new Date('2026-05-27T10:00:00+07:00'));
    expect(state.buku['muda-1'].count).toBe(2);
    expect(state.buku['muda-1'].firstPluckedAt).toBe('2026-05-26');
  });

  it('adds legenda card to legenda set', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set() };
    const card = { id: 'arme', tier: 'legenda' };
    const next = applyPluck(state, card, new Date('2026-06-15T10:00:00+07:00'));
    expect(next.legenda.has('arme')).toBe(true);
  });

  it('does NOT add non-legenda card to legenda set', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set() };
    const card = { id: 'langka-x', tier: 'langka' };
    const next = applyPluck(state, card, new Date('2026-05-26T10:00:00+07:00'));
    expect(next.legenda.size).toBe(0);
  });

  it('sets lastPluck to today WIB', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set() };
    const card = { id: 'x', tier: 'muda' };
    // 2026-05-26 23:30 UTC = 2026-05-27 06:30 WIB
    const next = applyPluck(state, card, new Date('2026-05-26T23:30:00Z'));
    expect(next.lastPluck).toBe('2026-05-27');
  });
});

describe('localStorage corruption recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads fresh state when nothing in storage', () => {
    const state = loadState();
    expect(state.lastPluck).toBeNull();
    expect(state.buku).toEqual({});
    expect(state.legenda.size).toBe(0);
  });

  it('recovers gracefully from corrupted buku JSON', () => {
    localStorage.setItem(_KEYS.buku, '{not valid json');
    const state = loadState();
    expect(state.buku).toEqual({});
  });

  it('recovers gracefully from corrupted legenda JSON', () => {
    localStorage.setItem(_KEYS.legenda, '!!broken!!');
    const state = loadState();
    expect(state.legenda.size).toBe(0);
  });

  it('handles non-array legenda value gracefully', () => {
    localStorage.setItem(_KEYS.legenda, '{"not": "array"}');
    const state = loadState();
    expect(state.legenda.size).toBe(0);
  });

  it('roundtrips: saveState → loadState preserves data', () => {
    const state = {
      lastPluck: '2026-05-26',
      buku: { 'card-1': { count: 3, firstPluckedAt: '2026-05-20' } },
      legenda: new Set(['arme']),
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded.lastPluck).toBe('2026-05-26');
    expect(loaded.buku['card-1'].count).toBe(3);
    expect(loaded.legenda.has('arme')).toBe(true);
  });

  it('resetState clears all keys', () => {
    saveState({
      lastPluck: '2026-05-26',
      buku: { x: { count: 1 } },
      legenda: new Set(['y']),
    });
    addBuah(5);
    resetState();
    const loaded = loadState();
    expect(loaded.lastPluck).toBeNull();
    expect(loaded.buku).toEqual({});
    expect(loaded.legenda.size).toBe(0);
    expect(getBuah()).toBe(0);
  });
});

describe('buah currency (Pohon Kebaikan reward)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns 0 when nothing stored', () => {
    expect(getBuah()).toBe(0);
  });

  it('addBuah increments and persists', () => {
    expect(addBuah(1)).toBe(1);
    expect(addBuah(2)).toBe(3);
    expect(getBuah()).toBe(3);
  });

  it('addBuah caps at BUAH_CAP (30)', () => {
    addBuah(25);
    expect(addBuah(10)).toBe(BUAH_CAP);
    expect(getBuah()).toBe(BUAH_CAP);
  });

  it('addBuah ignores negative amounts (no-op)', () => {
    addBuah(5);
    expect(addBuah(-3)).toBe(5);
  });

  it('spendBuah succeeds when sufficient', () => {
    addBuah(5);
    expect(spendBuah(2)).toBe(true);
    expect(getBuah()).toBe(3);
  });

  it('spendBuah rejects when insufficient (no partial spend)', () => {
    addBuah(2);
    expect(spendBuah(5)).toBe(false);
    expect(getBuah()).toBe(2); // unchanged
  });

  it('spendBuah down to exactly 0', () => {
    addBuah(3);
    expect(spendBuah(3)).toBe(true);
    expect(getBuah()).toBe(0);
  });

  it('getBuah clamps invalid stored values', () => {
    localStorage.setItem(_KEYS.buah, 'not-a-number');
    expect(getBuah()).toBe(0);
    localStorage.setItem(_KEYS.buah, '-5');
    expect(getBuah()).toBe(0);
    localStorage.setItem(_KEYS.buah, '999');
    expect(getBuah()).toBe(BUAH_CAP);
  });
});

describe('pity counters (applyPluck + loadState roundtrip)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loadState initializes pity to {langka:0, legenda:0} when missing', () => {
    const state = loadState();
    expect(state.pity).toEqual({ langka: 0, legenda: 0 });
  });

  it('applyPluck increments both counters on muda drop', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set(), pity: { langka: 3, legenda: 12 } };
    const next = applyPluck(state, { id: 'x', tier: 'muda' }, new Date('2026-05-26T10:00:00+07:00'));
    expect(next.pity.langka).toBe(4);
    expect(next.pity.legenda).toBe(13);
  });

  it('applyPluck increments both counters on matang drop', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set(), pity: { langka: 5, legenda: 20 } };
    const next = applyPluck(state, { id: 'x', tier: 'matang' }, new Date('2026-05-26T10:00:00+07:00'));
    expect(next.pity.langka).toBe(6);
    expect(next.pity.legenda).toBe(21);
  });

  it('langka drop resets langka counter, increments legenda', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set(), pity: { langka: 8, legenda: 25 } };
    const next = applyPluck(state, { id: 'x', tier: 'langka' }, new Date('2026-05-26T10:00:00+07:00'));
    expect(next.pity.langka).toBe(0);
    expect(next.pity.legenda).toBe(26);
  });

  it('legenda drop resets BOTH counters', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set(), pity: { langka: 5, legenda: 49 } };
    const next = applyPluck(state, { id: 'arme', tier: 'legenda' }, new Date('2026-05-26T10:00:00+07:00'));
    expect(next.pity.langka).toBe(0);
    expect(next.pity.legenda).toBe(0);
  });

  it('saveState → loadState roundtrip preserves pity', () => {
    const state = {
      lastPluck: '2026-05-26',
      buku: {},
      legenda: new Set(),
      pity: { langka: 7, legenda: 33 },
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded.pity).toEqual({ langka: 7, legenda: 33 });
  });

  it('PITY_THRESHOLD constants exported correctly', () => {
    expect(PITY_THRESHOLD.langka).toBe(10);
    expect(PITY_THRESHOLD.legenda).toBe(50);
  });

  it('resetState clears pity key', () => {
    saveState({
      lastPluck: '2026-05-26',
      buku: {},
      legenda: new Set(),
      pity: { langka: 9, legenda: 49 },
    });
    resetState();
    const loaded = loadState();
    expect(loaded.pity).toEqual({ langka: 0, legenda: 0 });
  });
});
