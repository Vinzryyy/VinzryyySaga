import { describe, it, expect, beforeEach } from 'vitest';
import {
  LEVELS,
  buildDeck,
  compareResults,
  createBoard,
  dailySeed,
  formatDuration,
  gameReducer,
  hamming,
  initialGame,
  makeRng,
  pickPhotos,
  shareText,
  starRating,
} from '../memoryGame';
import { STORAGE_KEY, getMemoryRecord, saveMemoryResult } from '../miniGamesStorage';

// 40 photos with well-spread hashes, plus near-twins of the first five.
const hex = (n) => n.toString(16).padStart(16, '0');
const u32 = (rng) => Math.floor(rng() * 2 ** 32).toString(16).padStart(8, '0');
const hashRng = makeRng(99);
const spread = Array.from({ length: 40 }, (_, i) => ({
  id: `p${i}`,
  webp: `/p${i}.webp`,
  h: u32(hashRng) + u32(hashRng),
}));
const twins = spread.slice(0, 5).map((p) => ({ id: `${p.id}-twin`, webp: '/t.webp', h: hex(BigInt(`0x${p.h}`) ^ 1n) }));
const POOL = [...spread, ...twins];

describe('hamming', () => {
  it('counts differing bits', () => {
    expect(hamming('0000000000000000', '0000000000000000')).toBe(0);
    expect(hamming('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hamming('00000000000000f0', '000000000000000f')).toBe(8);
  });
});

describe('pickPhotos', () => {
  it('never puts a near-twin on the same board', () => {
    for (let s = 1; s < 40; s++) {
      const picked = pickPhotos(POOL, 15, makeRng(s), 4);
      expect(picked).toHaveLength(15);
      expect(new Set(picked.map((p) => p.id)).size).toBe(15);
      for (const a of picked) for (const b of picked) if (a !== b) expect(hamming(a.h, b.h)).toBeGreaterThanOrEqual(4);
    }
  });
  it('falls back to twins when the pool is too small', () => {
    const tiny = [{ id: 'a', h: '0000000000000000' }, { id: 'b', h: '0000000000000001' }];
    expect(pickPhotos(tiny, 2, makeRng(1))).toHaveLength(2);
  });
});

describe('boards', () => {
  it('daily board is identical for the same date and level', () => {
    const a = createBoard(POOL, 'sedang', dailySeed('2026-11-21', 'sedang'));
    const b = createBoard(POOL, 'sedang', dailySeed('2026-11-21', 'sedang'));
    expect(a.deck).toEqual(b.deck);
    const c = createBoard(POOL, 'sedang', dailySeed('2026-11-22', 'sedang'));
    expect(c.deck).not.toEqual(a.deck);
  });
  it('deck has exactly two cards per photo', () => {
    Object.keys(LEVELS).forEach((lvl) => {
      const { deck, photos } = createBoard(POOL, lvl, 7);
      expect(photos).toHaveLength(LEVELS[lvl].pairs);
      expect(deck).toHaveLength(LEVELS[lvl].pairs * 2);
      const counts = {};
      deck.forEach((c) => { counts[c.photoId] = (counts[c.photoId] || 0) + 1; });
      expect(Object.values(counts).every((n) => n === 2)).toBe(true);
    });
  });
});

describe('gameReducer', () => {
  // Fixed deck: positions 0/2 are photo A, 1/3 are photo B.
  const deck = [
    { uid: 'A-a', photoId: 'A' },
    { uid: 'B-a', photoId: 'B' },
    { uid: 'A-b', photoId: 'A' },
    { uid: 'B-b', photoId: 'B' },
  ];
  const run = (actions, s = initialGame(deck)) => actions.reduce(gameReducer, s);
  const flip = (index, now = 1000) => ({ type: 'flip', index, now });

  it('starts the clock on the first flip and ignores re-tapping an open card', () => {
    const s = run([flip(0, 5000), flip(0, 6000)]);
    expect(s.startedAt).toBe(5000);
    expect(s.open).toEqual([0]);
    expect(s.moves).toBe(0);
  });

  it('keeps a mismatch open until hidden, counting one move', () => {
    const s = run([flip(0), flip(1)]);
    expect(s.open).toEqual([0, 1]);
    expect(s.moves).toBe(1);
    expect(s.combo).toBe(0);
    expect(gameReducer(s, { type: 'hide' }).open).toEqual([]);
  });

  it('a third tap during a mismatch closes the pair and opens the new card', () => {
    const s = run([flip(0), flip(1), flip(3)]);
    expect(s.open).toEqual([3]);
    expect(s.moves).toBe(1);
  });

  it('matches, builds combo, and finishes', () => {
    const s = run([flip(0, 1000), flip(2, 1500), flip(1, 2000), flip(3, 4200)]);
    expect(s.matched).toEqual(['A', 'B']);
    expect(s.moves).toBe(2);
    expect(s.maxCombo).toBe(2);
    expect(s.finishedAt).toBe(4200);
    // finished board ignores input
    expect(gameReducer(s, flip(0))).toBe(s);
  });

  it('ignores taps on matched cards', () => {
    const s = run([flip(0), flip(2)]);
    expect(gameReducer(s, flip(0))).toBe(s);
  });
});

describe('scoring', () => {
  it('stars from moves vs pairs', () => {
    expect(starRating(9, 6)).toBe(3);
    expect(starRating(12, 6)).toBe(2);
    expect(starRating(13, 6)).toBe(1);
  });
  it('faster wins, fewer moves breaks ties', () => {
    expect(compareResults({ timeMs: 1000, moves: 9 }, { timeMs: 2000, moves: 5 })).toBeLessThan(0);
    expect(compareResults({ timeMs: 1000, moves: 9 }, { timeMs: 1000, moves: 8 })).toBeGreaterThan(0);
  });
  it('formats time and share text', () => {
    expect(formatDuration(42_900)).toBe('0:42');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(shareText({ mode: 'harian', level: 'sedang', wibDate: '2026-11-21', timeMs: 42_000, moves: 11, stars: 3, url: 'u' }))
      .toBe('Pasangkan Momen · Harian 21/11 · Sedang\n⏱ 0:42 · 11 langkah · ★★★\nu');
  });
});

describe('miniGamesStorage', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));

  it('keeps the best free-mode result', () => {
    expect(saveMemoryResult('bebas', 'mudah', '2026-11-21', { timeMs: 50_000, moves: 10, stars: 2 }).isRecord).toBe(true);
    expect(saveMemoryResult('bebas', 'mudah', '2026-11-21', { timeMs: 60_000, moves: 8, stars: 3 }).isRecord).toBe(false);
    expect(saveMemoryResult('bebas', 'mudah', '2026-11-22', { timeMs: 40_000, moves: 12, stars: 1 }).isRecord).toBe(true);
    expect(getMemoryRecord('bebas', 'mudah').timeMs).toBe(40_000);
  });

  it('daily results reset on a new WIB date', () => {
    saveMemoryResult('harian', 'sulit', '2026-11-21', { timeMs: 90_000, moves: 30, stars: 2 });
    expect(getMemoryRecord('harian', 'sulit', '2026-11-21').timeMs).toBe(90_000);
    expect(getMemoryRecord('harian', 'sulit', '2026-11-22')).toBeNull();
    expect(saveMemoryResult('harian', 'sulit', '2026-11-22', { timeMs: 120_000, moves: 40, stars: 1 }).isRecord).toBe(true);
  });
});

it('buildDeck uid is unique', () => {
  const deck = buildDeck(spread.slice(0, 8), makeRng(3));
  expect(new Set(deck.map((c) => c.uid)).size).toBe(16);
});

describe('leaderboard', () => {
  it('masks names', async () => {
    const { maskName } = await import('../memoryGame');
    expect(maskName('Malvin')).toBe('M****n');
    expect(maskName('  malvin   evano ')).toBe('m****n e***o');
    expect(maskName('Al')).toBe('A*');
    expect(maskName('X')).toBe('X');
  });

  // Plays the board the way the page does and returns the reducer log.
  const play = (deck, { start = 10_000, gap = 400, mistakes = 2 } = {}) => {
    let s = initialGame(deck);
    let t = start;
    const step = (i) => { s = gameReducer(s, { type: 'flip', index: i, now: (t += gap) }); };
    const byPhoto = {};
    deck.forEach((c, i) => (byPhoto[c.photoId] ||= []).push(i));
    const pairs = Object.values(byPhoto);
    for (let m = 0; m < mistakes; m++) {
      step(pairs[m][0]); step(pairs[m + 1][0]);
      t += 800; s = gameReducer(s, { type: 'hide' });
    }
    pairs.forEach(([a, b]) => { step(a); step(b); });
    return s;
  };

  it('verifies a real run and recomputes time and moves', async () => {
    const { verifyRun } = await import('../memoryGame');
    const { deck } = createBoard(POOL, 'mudah', dailySeed('2026-11-21', 'mudah'));
    const s = play(deck);
    const r = verifyRun(deck, s.log, []);
    expect(r).toMatchObject({ ok: true, moves: s.moves });
    expect(r.timeMs).toBe(s.finishedAt - s.startedAt);
  });

  it('subtracts pauses and rejects tampering', async () => {
    const { verifyRun } = await import('../memoryGame');
    const { deck } = createBoard(POOL, 'mudah', dailySeed('2026-11-21', 'mudah'));
    const s = play(deck, { mistakes: 0 });
    const mid = s.log[5][1];
    const withPause = verifyRun(deck, s.log.map(([i, t]) => [i, t > mid ? t + 5000 : t]), [[mid + 100, mid + 5100]]);
    expect(withPause.timeMs).toBe(s.finishedAt - s.startedAt);
    expect(verifyRun(deck, s.log.slice(0, -1)).ok).toBe(false);
    const s2 = play(deck);
    expect(verifyRun(deck, s2.log.slice(0, -1)).error).toBe('unfinished');
    expect(verifyRun(deck, s.log.map(([i], k) => [i, 1000 + k * 10])).error).toBe('speed');
    const other = createBoard(POOL, 'mudah', dailySeed('2026-11-22', 'mudah')).deck;
    expect(verifyRun(other, s.log).ok).toBe(false);
  });
});

it('poolForDay keeps photos imported today off today\'s daily board', async () => {
  const { poolForDay } = await import('../memoryGame');
  const pool = [...POOL.map((p) => ({ ...p, added: '2026-11-20' })), { id: 'new', h: '0000000000000000', added: '2026-11-21' }];
  const board = (d) => createBoard(poolForDay(pool, d), 'sulit', dailySeed(d, 'sulit')).deck;
  expect(board('2026-11-21')).toEqual(createBoard(poolForDay(pool.slice(0, -1), '2026-11-21'), 'sulit', dailySeed('2026-11-21', 'sulit')).deck);
  expect(poolForDay(pool, '2026-11-22').some((p) => p.id === 'new')).toBe(true);
});
