import { describe, it, expect } from 'vitest';
import {
  MAX_LIVES,
  STAGES,
  challengeReducer,
  compareRuns,
  createStage,
  initialStage,
  livesAfterClear,
} from '../memoryChallenge';
import { makeRng } from '../memoryGame';

const rng = makeRng(5);
const POOL = Array.from({ length: 60 }, (_, i) => ({
  id: `p${i}`,
  h: Math.floor(rng() * 2 ** 32).toString(16).padStart(8, '0') + Math.floor(rng() * 2 ** 32).toString(16).padStart(8, '0'),
}));

const photo = (id, s) => ({ uid: `${id}-${s}`, kind: 'photo', photoId: id });
const run = (deck, actions, stage = {}) =>
  actions.reduce(challengeReducer, initialStage(deck, stage));
const flip = (index, now = 1000, rand = 0.3) => ({ type: 'flip', index, now, rand });

describe('stages', () => {
  it('every stage fills its grid exactly, phone and wide', () => {
    [...STAGES, ...STAGES.filter((st) => st.compact).map((st) => ({ ...st, ...st.compact }))].forEach((st) => {
      const cards = st.pairs * 2 + st.jokers + st.bombs;
      expect(st.cols * st.rows).toBe(cards);
      expect(st.wide[0] * st.wide[1]).toBe(cards);
    });
  });

  it('builds decks with the right card kinds and avoids photos used earlier', () => {
    const used = new Set();
    STAGES.forEach((st, i) => {
      const { deck, photos } = createStage(POOL, i, 100 + i, used);
      expect(deck.filter((c) => c.kind === 'joker')).toHaveLength(st.jokers);
      expect(deck.filter((c) => c.kind === 'bomb')).toHaveLength(st.bombs);
      expect(deck.filter((c) => c.kind === 'photo')).toHaveLength(st.pairs * 2);
      if (i < 3) photos.forEach((p) => expect(used.has(p.id)).toBe(false));
      photos.forEach((p) => used.add(p.id));
    });
  });
});

describe('challengeReducer', () => {
  // A A B B J X  (J = joker, X = bomb)
  const deck = [photo('A', 'a'), photo('A', 'b'), photo('B', 'a'), photo('B', 'b'), { uid: 'joker-0', kind: 'joker' }, { uid: 'bomb-0', kind: 'bomb' }];

  it('joker clears the pair of the other card', () => {
    const s = run(deck, [flip(0), flip(4)]);
    expect(s.done).toEqual(expect.arrayContaining(['A-a', 'A-b', 'joker-0']));
    expect(s.event.type).toBe('joker');
    expect(s.moves).toBe(1);
  });

  it('finishes when all photo pairs are done, jokers and bombs optional', () => {
    const s = run(deck, [flip(0, 1000), flip(1, 1500), flip(2, 2000), flip(3, 2600)]);
    expect(s.finishedAt).toBe(2600);
  });

  it('bomb explodes, closes the open card, and reshuffles face-down cards only', () => {
    const s1 = run(deck, [flip(0), flip(1)]); // A matched, stays in place
    const s2 = run(deck, [flip(0), flip(1), flip(2), flip(5, 2000, 0.77)]);
    expect(s2.done).toContain('bomb-0');
    expect(s2.open).toEqual([]);
    expect(s2.event.type).toBe('bomb');
    expect(s2.deck[0]).toBe(s1.deck[0]);
    expect(s2.deck[1]).toBe(s1.deck[1]);
    expect(s2.deck[5].uid).toBe('bomb-0');
    expect(new Set(s2.deck.map((c) => c.uid)).size).toBe(6);
  });

  it('loses a life only when the partner of the first card was already seen', () => {
    const d = [photo('A', 'a'), photo('B', 'a'), photo('A', 'b'), photo('B', 'b')];
    const lucky = run(d, [flip(0), flip(1)]);
    expect(lucky.lives).toBe(MAX_LIVES);
    // Saw A-b, then flipped A-a and missed: careless.
    const careless = run(d, [flip(2), flip(3), { type: 'hide' }, flip(0), flip(1)]);
    expect(careless.lives).toBe(MAX_LIVES - 1);
    expect(careless.event.type).toBe('life');
    expect(careless.event.slot).toBe(2); // where the forgotten partner A-b sits
  });

  it('runs out of lives', () => {
    const d = [photo('A', 'a'), photo('B', 'a'), photo('A', 'b'), photo('B', 'b')];
    let st = initialStage(d, {}, 1);
    for (const a of [flip(2), flip(3), { type: 'hide' }, flip(0, 5000), flip(1, 5100)]) st = challengeReducer(st, a);
    expect(st.failedAt).toBe(5100);
    expect(challengeReducer(st, flip(3))).toBe(st);
  });

  it('papan gelisah swaps two face-down cards every 3rd mismatch', () => {
    const d = [photo('A', 'a'), photo('B', 'a'), photo('C', 'a'), photo('A', 'b'), photo('B', 'b'), photo('C', 'b')];
    let st = initialStage(d, { swap: true });
    const misses = [[0, 1], [1, 2], [0, 2]];
    misses.forEach(([a, b], k) => {
      st = challengeReducer(st, flip(a, 1000 + k * 2000));
      st = challengeReducer(st, flip(b, 1400 + k * 2000));
      if (k < 2) st = challengeReducer(st, { type: 'hide', rand: 0.4 });
    });
    expect(st.pendingSwap).toBe(true);
    const after = challengeReducer(st, { type: 'hide', rand: 0.4 });
    expect(after.event.type).toBe('swap');
    const [a, b] = after.event.slots;
    expect(after.deck[a]).toBe(st.deck[b]);
    expect(after.deck[b]).toBe(st.deck[a]);
    expect(after.pendingSwap).toBe(false);
  });
});

describe('compact stages', () => {
  it('phones get a 30-card Master with the same twists', async () => {
    const { stageFor } = await import('../memoryChallenge');
    const st = stageFor(6, true);
    expect(st.pairs * 2 + st.jokers + st.bombs).toBe(30);
    expect(st.swap).toBe(true);
    expect(createStage(POOL, 6, 9, new Set(), true).deck).toHaveLength(30);
    expect(stageFor(6, false).pairs).toBe(16);
  });
});

describe('run helpers', () => {
  it('gives a life back after a stage, capped', () => {
    expect(livesAfterClear(1)).toBe(2);
    expect(livesAfterClear(MAX_LIVES)).toBe(MAX_LIVES);
  });
  it('ranks by stage, then time, then moves', () => {
    expect(compareRuns({ stage: 5, timeMs: 9e5, moves: 99 }, { stage: 4, timeMs: 1, moves: 1 })).toBeLessThan(0);
    expect(compareRuns({ stage: 4, timeMs: 100, moves: 9 }, { stage: 4, timeMs: 200, moves: 1 })).toBeLessThan(0);
  });
});
