/**
 * memoryChallenge — "Mode Tantangan" for Pasangkan Momen.
 *
 * A run climbs 7 stages. Each stage adds one twist:
 *   Joker  — matches anything; flipped with a photo it clears that pair.
 *   Bom    — flipping it reshuffles every face-down card.
 *   Gelisah— every 3rd mismatch, two face-down cards swap places.
 * Lives (3 per run, +1 back after each cleared stage, max 3) are lost only
 * when you mismatch although the first card's partner was already seen:
 * forgetting costs, bad luck doesn't.
 *
 * Pure logic, no React. Randomness for shuffles/swaps comes in on the
 * action (`rand`) so the reducer stays deterministic and testable.
 */

import { MISMATCH_MS, makeRng, pickPhotos, shuffle } from './memoryGame.js';

export { MISMATCH_MS };
export const MAX_LIVES = 3;
export const SWAP_EVERY = 3;

/**
 * Stage presets. cols/rows = phone layout, wide = [cols, rows] from 640px.
 * cards = pairs*2 + jokers + bombs always fills the grid exactly.
 */
export const STAGES = [
  { n: 1, pairs: 6, jokers: 0, bombs: 0, swap: false, peekMs: 2000, cols: 3, rows: 4, wide: [4, 3], intro: 'Pemanasan: 6 pasang, intip 2 detik.' },
  { n: 2, pairs: 8, jokers: 0, bombs: 0, swap: false, peekMs: 1000, cols: 4, rows: 4, wide: [4, 4], intro: '8 pasang, intip cuma 1 detik.' },
  { n: 3, pairs: 9, jokers: 2, bombs: 0, swap: false, peekMs: 1000, cols: 4, rows: 5, wide: [5, 4], intro: 'Baru: Joker ★ — cocok dengan kartu apa saja.' },
  { n: 4, pairs: 11, jokers: 0, bombs: 2, swap: false, peekMs: 800, cols: 4, rows: 6, wide: [6, 4], intro: 'Baru: Bom 💣 — kelihatan di awal, ingat letaknya. Kalau terbuka, semua kartu tertutup diacak ulang.' },
  { n: 5, pairs: 12, jokers: 0, bombs: 0, swap: true, peekMs: 0, cols: 4, rows: 6, wide: [6, 4], intro: 'Baru: Papan gelisah — tiap 3 kali salah, dua kartu bertukar tempat. Tanpa intip.' },
  { n: 6, pairs: 13, jokers: 2, bombs: 2, swap: false, peekMs: 0, specialPeekMs: 1500, cols: 5, rows: 6, wide: [6, 5], intro: 'Joker dan Bom sekaligus, 30 kartu. Hanya kartu spesial yang diintip.' },
  {
    n: 7, pairs: 16, jokers: 2, bombs: 2, swap: true, peekMs: 0, specialPeekMs: 1500, cols: 6, rows: 6, wide: [6, 6],
    intro: 'Master: 36 kartu, Joker, Bom, dan papan gelisah.',
    // Phones: 36 cards would be ~50px each — too small to tell photos of
    // the same person apart. Same twists, 30 bigger cards.
    compact: { pairs: 13, cols: 5, rows: 6, wide: [5, 6], intro: 'Master: 30 kartu, Joker, Bom, dan papan gelisah.' },
  },
];
export const STAGE_COUNT = STAGES.length;

/** Stage preset, with the phone variant applied when `compact`. */
export const stageFor = (stageIndex, compact = false) => {
  const base = STAGES[stageIndex];
  return compact && base.compact ? { ...base, ...base.compact } : base;
};

/** Build a stage: picks fresh photos (excluding ones used earlier in the run). */
export const createStage = (pool, stageIndex, seed, usedIds = new Set(), compact = false) => {
  const stage = stageFor(stageIndex, compact);
  const rng = makeRng(seed);
  const fresh = pool.filter((p) => !usedIds.has(p.id));
  const photos = pickPhotos(fresh.length >= stage.pairs ? fresh : pool, stage.pairs, rng);
  const cards = [
    ...photos.flatMap((p) => [
      { uid: `${p.id}-a`, kind: 'photo', photoId: p.id },
      { uid: `${p.id}-b`, kind: 'photo', photoId: p.id },
    ]),
    ...Array.from({ length: stage.jokers }, (_, i) => ({ uid: `joker-${i}`, kind: 'joker' })),
    ...Array.from({ length: stage.bombs }, (_, i) => ({ uid: `bomb-${i}`, kind: 'bomb' })),
  ];
  return { stage, photos, deck: shuffle(cards, rng) };
};

export const initialStage = (deck, stage, lives = MAX_LIVES) => ({
  deck,
  swapEnabled: Boolean(stage?.swap),
  open: [],
  done: [], // uids that are finished: matched photos, used jokers, exploded bombs
  seen: [], // uids ever shown face up
  lives,
  livesLost: 0,
  moves: 0,
  combo: 0,
  maxCombo: 0,
  mismatches: 0,
  pendingSwap: false,
  event: null, // { type, seq, ... } — last thing worth a toast/animation
  seq: 0,
  startedAt: null,
  finishedAt: null,
  failedAt: null,
});

const photoPairsLeft = (deck, done) => deck.some((c) => c.kind === 'photo' && !done.includes(c.uid));

/** Reorder the cards in `slots` (indexes) with a seeded shuffle. */
const reshuffleSlots = (deck, slots, rand) => {
  const rng = makeRng(Math.floor(rand * 2 ** 32));
  const moved = shuffle(slots.map((i) => deck[i]), rng);
  const next = deck.slice();
  slots.forEach((slot, k) => {
    next[slot] = moved[k];
  });
  return next;
};

const withEvent = (state, type, extra = {}) => ({ ...state, seq: state.seq + 1, event: { type, seq: state.seq + 1, ...extra } });

export const challengeReducer = (state, action) => {
  switch (action.type) {
    case 'reset':
      return initialStage(action.deck, action.stage, action.lives);

    case 'hide': {
      if (state.open.length !== 2) return state;
      let next = { ...state, open: [] };
      // Papan gelisah: swap two face-down cards after the pair closes.
      if (state.pendingSwap) {
        const free = next.deck.map((c, i) => i).filter((i) => !next.done.includes(next.deck[i].uid));
        if (free.length >= 2) {
          const rng = makeRng(Math.floor((action.rand ?? 0.5) * 2 ** 32));
          const i1 = Math.floor(rng() * free.length);
          let i2 = Math.floor(rng() * (free.length - 1));
          if (i2 >= i1) i2 += 1;
          const [a, b] = [free[i1], free[i2]];
          const deck = next.deck.slice();
          [deck[a], deck[b]] = [deck[b], deck[a]];
          next = withEvent({ ...next, deck }, 'swap', { slots: [a, b] });
        }
        next.pendingSwap = false;
      }
      return next;
    }

    case 'flip': {
      const { index, now, rand = 0.5 } = action;
      if (state.finishedAt != null || state.failedAt != null) return state;
      const card = state.deck[index];
      if (!card || state.done.includes(card.uid)) return state;

      // A mismatched pair is still up: close it (and run any pending swap)
      // before this tap counts, exactly like the classic board.
      let s = state;
      if (s.open.length === 2) {
        s = challengeReducer(s, { type: 'hide', rand: 1 - rand });
        // Cards just swapped: this tap only closes the pair, so the player
        // sees the swap before acting on a board that changed under them.
        if (s.event?.type === 'swap' && s.seq !== state.seq) return s;
      }
      if (s.open.includes(index)) return state;

      const startedAt = s.startedAt ?? now;
      const seen = s.seen.includes(card.uid) ? s.seen : [...s.seen, card.uid];

      // Bom: explode, close everything, reshuffle the face-down cards.
      if (card.kind === 'bomb') {
        const done = [...s.done, card.uid];
        const slots = s.deck.map((c, i) => i).filter((i) => i !== index && !done.includes(s.deck[i].uid));
        const deck = reshuffleSlots(s.deck, slots, rand);
        return withEvent({ ...s, deck, done, seen, open: [], combo: 0, startedAt }, 'bomb', { slot: index });
      }

      if (s.open.length === 0) return { ...s, open: [index], seen, startedAt };

      const firstIdx = s.open[0];
      const first = s.deck[firstIdx];
      const moves = s.moves + 1;

      // Joker with anything: that photo's pair is cleared (joker used up).
      if (card.kind === 'joker' || first.kind === 'joker') {
        const photo = card.kind === 'joker' ? first : card;
        const joker = card.kind === 'joker' ? card : first;
        if (photo.kind === 'joker') {
          // Two jokers: both are spent, nothing else happens.
          const done = [...s.done, photo.uid, joker.uid];
          return withEvent({ ...s, done, seen, open: [], moves, startedAt }, 'joker', { photoId: null });
        }
        const partner = s.deck.find((c) => c.kind === 'photo' && c.photoId === photo.photoId && c.uid !== photo.uid);
        const done = [...s.done, joker.uid, photo.uid, partner.uid];
        const combo = s.combo + 1;
        const finished = !photoPairsLeft(s.deck, done);
        return withEvent(
          { ...s, done, seen, open: [], moves, combo, maxCombo: Math.max(s.maxCombo, combo), startedAt, finishedAt: finished ? now : null },
          'joker',
          { photoId: photo.photoId },
        );
      }

      if (first.photoId === card.photoId) {
        const done = [...s.done, first.uid, card.uid];
        const combo = s.combo + 1;
        const finished = !photoPairsLeft(s.deck, done);
        return withEvent(
          { ...s, done, seen, open: [], moves, combo, maxCombo: Math.max(s.maxCombo, combo), startedAt, finishedAt: finished ? now : null },
          'match',
          { photoId: card.photoId, combo },
        );
      }

      // Mismatch. Lose a life only if the first card's partner had been seen.
      const partner = s.deck.find((c) => c.kind === 'photo' && c.photoId === first.photoId && c.uid !== first.uid);
      const careless = s.seen.includes(partner.uid);
      const lives = careless ? s.lives - 1 : s.lives;
      const mismatches = s.mismatches + 1;
      let next = {
        ...s,
        open: [firstIdx, index],
        seen,
        moves,
        combo: 0,
        mismatches,
        lives,
        livesLost: s.livesLost + (careless ? 1 : 0),
        pendingSwap: s.swapEnabled && mismatches % SWAP_EVERY === 0,
        startedAt,
      };
      if (careless) next = withEvent(next, 'life', { lives, slot: s.deck.indexOf(partner) });
      if (lives <= 0) next = { ...next, failedAt: now };
      return next;
    }

    default:
      return state;
  }
};

/** Lives carried into the next stage: +1 back, capped. */
export const livesAfterClear = (lives) => Math.min(MAX_LIVES, lives + 1);

/** Better run = higher stage reached, then less time, then fewer moves. */
export const compareRuns = (a, b) => b.stage - a.stage || a.timeMs - b.timeMs || a.moves - b.moves;

export const challengeShareText = ({ stage, cleared, timeMs, moves, url, formatDuration }) =>
  [
    `Pasangkan Momen · Mode Tantangan`,
    cleared ? `🏆 Tamat ${STAGE_COUNT}/${STAGE_COUNT} tingkat!` : `Sampai Tingkat ${stage}/${STAGE_COUNT}`,
    `⏱ ${formatDuration(timeMs)} · ${moves} langkah`,
    url,
  ].join('\n');
