import { describe, expect, it } from 'vitest';
import { POCKETS_PER_PAGE, SETS, claimableSets, duplicates, setProgress, tradeDuplicates } from '../petikanBinder';

const card = (id, era, tier = 'muda') => ({ id, era, tier, title: id });
const pool = [
  card('s1', 'helisma-show', 'legenda'),
  card('s2', 'helisma-show', 'langka'),
  card('s3', 'helisma-show'),
  card('l1', 'helisma-livestream'),
  card('d1', 'fan-life'),
  card('d2', 'fan-life', 'matang'),
  card('x1', 'era-baru'), // unknown era → last set
];

describe('setProgress', () => {
  it('groups by era with progress, completion and 9-pocket pages', () => {
    const buku = { s1: { count: 1 }, s2: { count: 2 }, s3: { count: 1 }, d1: { count: 4 } };
    const sets = setProgress(pool, buku);
    expect(sets.map((s) => s.id)).toEqual(SETS.map((s) => s.id));
    const show = sets[0];
    expect([show.owned, show.total, show.complete]).toEqual([3, 3, true]);
    expect(show.cards[0].tier).toBe('legenda'); // rarest first
    expect(show.pages).toHaveLength(1);
    expect(show.pages[0]).toHaveLength(POCKETS_PER_PAGE);
    expect(show.pages[0].filter(Boolean)).toHaveLength(3);
    const daily = sets[2];
    expect(daily.cards.map((c) => c.id).sort()).toEqual(['d1', 'd2', 'x1']);
    expect(daily.complete).toBe(false);
  });

  it('lists only complete, unclaimed sets as claimable', () => {
    const sets = setProgress(pool, { s1: {}, s2: {}, s3: {}, l1: {} });
    expect(claimableSets(sets, new Set()).map((s) => s.id)).toEqual(['helisma-show', 'helisma-livestream']);
    expect(claimableSets(sets, new Set(['helisma-show'])).map((s) => s.id)).toEqual(['helisma-livestream']);
  });
});

describe('duplicates and trading', () => {
  const buku = { s2: { count: 3 }, d1: { count: 4, firstPluckedAt: 'x' }, d2: { count: 2 }, l1: { count: 1 } };

  it('counts extra copies per tier', () => {
    expect(duplicates(pool, buku)).toEqual({ total: 6, byTier: { muda: 3, matang: 1, langka: 2, legenda: 0 } });
  });

  it('trades 3 duplicates for 1 buah, commonest first, never the last copy', () => {
    const r = tradeDuplicates(pool, buku, 30);
    expect([r.buah, r.used]).toEqual([2, 6]);
    expect(Object.values(r.buku).every((e) => e.count >= 1)).toBe(true);
    expect(r.buku.d1).toEqual({ count: 1, firstPluckedAt: 'x' });
    expect(buku.d1.count).toBe(4); // input untouched
  });

  it('respects the buah cap room and uses common cards before rare ones', () => {
    const r = tradeDuplicates(pool, buku, 1);
    expect([r.buah, r.used]).toEqual([1, 3]);
    expect(r.buku.d1.count).toBe(1); // 3 muda extras used
    expect(r.buku.s2.count).toBe(3); // langka kept
    expect(tradeDuplicates(pool, buku, 0)).toEqual({ buku, used: 0, buah: 0 });
  });
});
