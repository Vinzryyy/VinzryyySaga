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
  applyPlucks,
  resetState,
  getBuah,
  addBuah,
  spendBuah,
  toggleWishlist,
  BUAH_CAP,
  PITY_THRESHOLD,
  WISHLIST_CAP,
  JOURNAL_CAP,
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

describe('applyPlucks batch (3-card pluck event)', () => {
  const now = new Date('2026-05-26T10:00:00+07:00');

  it('processes 3 cards atomically — buku increments each, lastPluck set once', () => {
    const state = {
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      pity: { langka: 0, legenda: 0 },
      recent: [],
    };
    const cards = [
      { id: 'a', tier: 'muda' },
      { id: 'b', tier: 'muda' },
      { id: 'c', tier: 'muda' },
    ];
    const next = applyPlucks(state, cards, now);
    expect(next.lastPluck).toBe('2026-05-26');
    expect(next.buku.a.count).toBe(1);
    expect(next.buku.b.count).toBe(1);
    expect(next.buku.c.count).toBe(1);
    expect(next.recent).toHaveLength(3);
  });

  it('pity advances 1× per event, not per-card', () => {
    const state = {
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      pity: { langka: 5, legenda: 20 },
      recent: [],
    };
    const cards = [
      { id: 'a', tier: 'muda' },
      { id: 'b', tier: 'muda' },
      { id: 'c', tier: 'muda' },
    ];
    const next = applyPlucks(state, cards, now);
    // 1 increment per event, NOT 3
    expect(next.pity.langka).toBe(6);
    expect(next.pity.legenda).toBe(21);
  });

  it('pity langka resets kalau any kartu langka+ ada di batch', () => {
    const state = {
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      pity: { langka: 8, legenda: 30 },
      recent: [],
    };
    const cards = [
      { id: 'a', tier: 'muda' },
      { id: 'b', tier: 'langka' },
      { id: 'c', tier: 'muda' },
    ];
    const next = applyPlucks(state, cards, now);
    expect(next.pity.langka).toBe(0);
    expect(next.pity.legenda).toBe(31); // langka tidak reset legenda counter
  });

  it('pity legenda resets kalau ada legenda di batch', () => {
    const state = {
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      pity: { langka: 8, legenda: 40 },
      recent: [],
    };
    const cards = [
      { id: 'a', tier: 'muda' },
      { id: 'b', tier: 'muda' },
      { id: 'c', tier: 'legenda' },
    ];
    const next = applyPlucks(state, cards, now);
    expect(next.pity.langka).toBe(0); // legenda is langka+
    expect(next.pity.legenda).toBe(0);
    expect(next.legenda.has('c')).toBe(true);
  });

  it('recent journal prepends all 3 entries in batch order', () => {
    const state = {
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      pity: { langka: 0, legenda: 0 },
      recent: [{ cardId: 'prev', tier: 'muda', at: '2026-05-25T10:00:00Z', prose: null }],
    };
    const cards = [
      { id: 'first', tier: 'muda', prose: 'A' },
      { id: 'second', tier: 'matang', prose: 'B' },
      { id: 'third', tier: 'langka', prose: 'C' },
    ];
    const next = applyPlucks(state, cards, now);
    expect(next.recent).toHaveLength(4);
    expect(next.recent[0].cardId).toBe('first');
    expect(next.recent[1].cardId).toBe('second');
    expect(next.recent[2].cardId).toBe('third');
    expect(next.recent[3].cardId).toBe('prev');
  });

  it('returns input state unchanged kalau cards array kosong', () => {
    const state = {
      lastPluck: '2026-05-25',
      buku: {},
      legenda: new Set(),
      pity: { langka: 5, legenda: 10 },
      recent: [],
    };
    const next = applyPlucks(state, [], now);
    expect(next).toBe(state);
  });

  it('handles batch dupe (same card-id 2× di batch) by incrementing count properly', () => {
    const state = {
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      pity: { langka: 0, legenda: 0 },
      recent: [],
    };
    const cards = [
      { id: 'dupe', tier: 'muda' },
      { id: 'dupe', tier: 'muda' },
      { id: 'other', tier: 'muda' },
    ];
    const next = applyPlucks(state, cards, now);
    expect(next.buku.dupe.count).toBe(2);
    expect(next.buku.other.count).toBe(1);
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

describe('recent pulls log', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loadState initializes recent to [] when missing', () => {
    const state = loadState();
    expect(state.recent).toEqual([]);
  });

  it('applyPluck prepends new entry to recent', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set(), recent: [] };
    const card = { id: 'card-1', tier: 'muda' };
    const next = applyPluck(state, card, new Date('2026-05-26T10:00:00Z'));
    expect(next.recent.length).toBe(1);
    expect(next.recent[0].cardId).toBe('card-1');
    expect(next.recent[0].tier).toBe('muda');
    expect(next.recent[0].at).toBe('2026-05-26T10:00:00.000Z');
  });

  it('applyPluck caps recent at JOURNAL_CAP (100) entries', () => {
    let state = { lastPluck: null, buku: {}, legenda: new Set(), recent: [] };
    // Push 105 entries — cap should drop oldest 5
    for (let i = 0; i < 105; i++) {
      state = applyPluck(
        state,
        { id: `card-${i}`, tier: 'muda' },
        new Date(2026, 0, 1, 0, 0, i), // unique timestamps
      );
    }
    expect(state.recent.length).toBe(100);
    // Newest (card-104) should be first
    expect(state.recent[0].cardId).toBe('card-104');
    // After cap, oldest kept is card-5 (104-99 = 5)
    expect(state.recent[99].cardId).toBe('card-5');
  });

  it('saveState → loadState preserves recent', () => {
    const state = {
      lastPluck: '2026-05-26',
      buku: {},
      legenda: new Set(),
      recent: [
        { cardId: 'a', tier: 'muda', at: '2026-05-26T10:00:00Z' },
        { cardId: 'b', tier: 'langka', at: '2026-05-25T10:00:00Z' },
      ],
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded.recent).toHaveLength(2);
    expect(loaded.recent[0].cardId).toBe('a');
    expect(loaded.recent[1].tier).toBe('langka');
  });

  it('filters out garbage entries from corrupted recent', () => {
    localStorage.setItem(
      _KEYS.recent,
      JSON.stringify([
        { cardId: 'valid', tier: 'muda', at: '2026-05-26T10:00:00Z' },
        null,
        { cardId: 123 }, // wrong type
        { cardId: 'no-tier', at: 'now' },
        'string-entry',
      ]),
    );
    const loaded = loadState();
    expect(loaded.recent).toHaveLength(1);
    expect(loaded.recent[0].cardId).toBe('valid');
  });

  it('resetState clears recent', () => {
    saveState({
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      recent: [{ cardId: 'x', tier: 'muda', at: '2026-05-26T10:00:00Z' }],
    });
    resetState();
    const loaded = loadState();
    expect(loaded.recent).toEqual([]);
  });

  it('applyPluck preserves card.prose into journal entry', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set(), recent: [] };
    const card = { id: 'card-1', tier: 'matang', prose: 'Hari ini langit lembut.' };
    const next = applyPluck(state, card, new Date('2026-05-26T10:00:00Z'));
    expect(next.recent[0].prose).toBe('Hari ini langit lembut.');
  });

  it('applyPluck defaults prose to null when card has none', () => {
    const state = { lastPluck: null, buku: {}, legenda: new Set(), recent: [] };
    const card = { id: 'card-1', tier: 'muda' };
    const next = applyPluck(state, card, new Date('2026-05-26T10:00:00Z'));
    expect(next.recent[0].prose).toBeNull();
  });

  it('JOURNAL_CAP exported as 100', () => {
    expect(JOURNAL_CAP).toBe(100);
  });
});

describe('wishlist toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loadState initializes wishlist to empty Set when missing', () => {
    const state = loadState();
    expect(state.wishlist).toBeInstanceOf(Set);
    expect(state.wishlist.size).toBe(0);
  });

  it('toggleWishlist adds when not present', () => {
    const next = toggleWishlist(new Set(), 'card-a');
    expect(next.has('card-a')).toBe(true);
    expect(next.size).toBe(1);
  });

  it('toggleWishlist removes when already present', () => {
    const next = toggleWishlist(new Set(['card-a']), 'card-a');
    expect(next.has('card-a')).toBe(false);
    expect(next.size).toBe(0);
  });

  it('toggleWishlist refuses to add when at cap', () => {
    const full = new Set(['a', 'b', 'c']);
    const next = toggleWishlist(full, 'd');
    expect(next.size).toBe(WISHLIST_CAP);
    expect(next.has('d')).toBe(false);
  });

  it('toggleWishlist still removes when at cap (existing entry)', () => {
    const full = new Set(['a', 'b', 'c']);
    const next = toggleWishlist(full, 'b');
    expect(next.size).toBe(2);
    expect(next.has('b')).toBe(false);
  });

  it('toggleWishlist returns NEW Set (immutable)', () => {
    const original = new Set(['x']);
    const next = toggleWishlist(original, 'y');
    expect(next).not.toBe(original);
    expect(original.size).toBe(1); // unchanged
  });

  it('saveState → loadState roundtrip preserves wishlist', () => {
    const state = {
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      wishlist: new Set(['arme-vtuber-lightstick', 'arme-vtuber-dance-helltaker']),
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded.wishlist.size).toBe(2);
    expect(loaded.wishlist.has('arme-vtuber-lightstick')).toBe(true);
  });

  it('loadState caps wishlist at WISHLIST_CAP from corrupted storage', () => {
    // Inject 5 entries — should clip to 3
    localStorage.setItem(
      _KEYS.wishlist,
      JSON.stringify(['a', 'b', 'c', 'd', 'e']),
    );
    const loaded = loadState();
    expect(loaded.wishlist.size).toBe(WISHLIST_CAP);
  });

  it('resetState clears wishlist', () => {
    saveState({
      lastPluck: null,
      buku: {},
      legenda: new Set(),
      wishlist: new Set(['x']),
    });
    resetState();
    const loaded = loadState();
    expect(loaded.wishlist.size).toBe(0);
  });

  it('WISHLIST_CAP exported as 3', () => {
    expect(WISHLIST_CAP).toBe(3);
  });
});
