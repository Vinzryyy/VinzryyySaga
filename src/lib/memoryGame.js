/**
 * memoryGame — pure logic for "Pasangkan Momen" (Memory Match).
 *
 * No React, no DOM: deck building, the flip reducer and scoring live here so
 * they can be unit-tested. The page wires these to UI and timers.
 */

export const MEMORY_POOL_URL = '/data/memory-pool.json';

/** Board presets. cols/rows are the phone (portrait) layout. */
export const LEVELS = {
  mudah: { id: 'mudah', label: 'Mudah', cols: 3, rows: 4, pairs: 6, peekMs: 2000 },
  sedang: { id: 'sedang', label: 'Sedang', cols: 4, rows: 4, pairs: 8, peekMs: 1000 },
  sulit: { id: 'sulit', label: 'Sulit', cols: 5, rows: 6, pairs: 15, peekMs: 0 },
};
export const LEVEL_IDS = Object.keys(LEVELS);
export const MODES = ['bebas', 'harian'];

/** Photos closer than this (Hamming distance of 64-bit dHash) count as twins. */
export const TWIN_DISTANCE = 20;
/** How long a mismatched pair stays face up. */
export const MISMATCH_MS = 700;

// ── Seeded RNG ────────────────────────────────────────────────────────

/** FNV-1a 32-bit hash of a string → uint32 seed. */
export const hashSeed = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32 → function returning floats in [0, 1). */
export const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher–Yates on a copy. */
export const shuffle = (arr, rng) => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Seed for the daily board: same for everyone on a WIB date + level. */
export const dailySeed = (wibDate, levelId) => hashSeed(`pasangkan-momen:${wibDate}:${levelId}`);

// ── Photo picking ─────────────────────────────────────────────────────

/** Hamming distance between two 16-hex-char hashes. */
export const hamming = (a, b) => {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
};

/**
 * Pick `n` photos in shuffled order, skipping any that is a near-twin of one
 * already picked. Falls back to allowing twins only if the pool runs out.
 */
export const pickPhotos = (pool, n, rng, minDistance = TWIN_DISTANCE) => {
  const order = shuffle(pool, rng);
  const picked = [];
  for (const p of order) {
    if (picked.length >= n) break;
    if (!p.h || picked.every((q) => !q.h || hamming(p.h, q.h) >= minDistance)) picked.push(p);
  }
  for (const p of order) {
    if (picked.length >= n) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked;
};

/** Two cards per photo, shuffled. Card: { uid, photoId }. */
export const buildDeck = (photos, rng) =>
  shuffle(
    photos.flatMap((p) => [
      { uid: `${p.id}-a`, photoId: p.id },
      { uid: `${p.id}-b`, photoId: p.id },
    ]),
    rng,
  );

/** Everything needed to start a board. */
/**
 * Photos the daily board may use on `wibDate`: only those added to the pool
 * before that day, so an import mid-day doesn't change today's board for
 * people who already played it (or for the leaderboard check).
 */
export const poolForDay = (pool, wibDate) => pool.filter((p) => !p.added || p.added < wibDate);

export const createBoard = (pool, levelId, seed) => {
  const level = LEVELS[levelId];
  const rng = makeRng(seed);
  const photos = pickPhotos(pool, level.pairs, rng);
  return { level, photos, deck: buildDeck(photos, rng) };
};

// ── Game reducer ──────────────────────────────────────────────────────

export const initialGame = (deck) => ({
  deck,
  open: [], // indexes face up and not yet matched (0, 1 or 2)
  matched: [], // photoIds, in the order they were matched
  moves: 0, // one move = turning a second card
  combo: 0,
  maxCombo: 0,
  lastMatch: null, // photoId of the most recent match (for the reveal toast)
  startedAt: null,
  finishedAt: null,
  log: [], // [index, now] for every flip that changed the board (leaderboard proof)
});

/**
 * Actions:
 *  { type: 'flip', index, now }
 *  { type: 'hide' }            — mismatch timer elapsed
 *  { type: 'reset', deck }
 */
export const gameReducer = (state, action) => {
  switch (action.type) {
    case 'reset':
      return initialGame(action.deck);

    case 'hide':
      return state.open.length === 2 ? { ...state, open: [] } : state;

    case 'flip': {
      const { index, now } = action;
      if (state.finishedAt != null) return state;
      const card = state.deck[index];
      if (!card || state.matched.includes(card.photoId)) return state;

      // A mismatched pair is still showing: close it now and treat this tap
      // as the first card of the next turn (no waiting).
      let open = state.open.length === 2 ? [] : state.open;
      if (open.includes(index)) return state;

      const startedAt = state.startedAt ?? now;
      const log = [...state.log, [index, now]];
      if (open.length === 0) return { ...state, open: [index], startedAt, log };

      const first = state.deck[open[0]];
      const moves = state.moves + 1;
      if (first.photoId === card.photoId) {
        const matched = [...state.matched, card.photoId];
        const combo = state.combo + 1;
        const done = matched.length * 2 === state.deck.length;
        return {
          ...state,
          open: [],
          matched,
          moves,
          combo,
          maxCombo: Math.max(state.maxCombo, combo),
          lastMatch: card.photoId,
          startedAt,
          finishedAt: done ? now : null,
          log,
        };
      }
      open = [open[0], index];
      return { ...state, open, moves, combo: 0, startedAt, log };
    }

    default:
      return state;
  }
};

// ── Scoring ───────────────────────────────────────────────────────────

/** ★★★ ≤ 1.5× pairs moves, ★★ ≤ 2×, else ★. */
export const starRating = (moves, pairs) => {
  if (moves <= pairs * 1.5) return 3;
  if (moves <= pairs * 2) return 2;
  return 1;
};

/** Negative when `a` is the better result: faster wins, fewer moves breaks ties. */
export const compareResults = (a, b) => a.timeMs - b.timeMs || a.moves - b.moves;

/** "0:42", "1:05", "12:30". */
export const formatDuration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** Text for the share button. */
export const shareText = ({ mode, level, wibDate, timeMs, moves, stars, url }) => {
  const [, mm, dd] = (wibDate || '').split('-');
  const head = mode === 'harian'
    ? `Pasangkan Momen · Harian ${dd}/${mm} · ${LEVELS[level].label}`
    : `Pasangkan Momen · ${LEVELS[level].label}`;
  return `${head}\n⏱ ${formatDuration(timeMs)} · ${moves} langkah · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}\n${url}`;
};

// ── Leaderboard ───────────────────────────────────────────────────────

export const NAME_MAX = 16;
export const NAME_RE = /^[\p{L}\p{N} ._-]{2,16}$/u;
/** Fastest believable gap between two flips, in active (unpaused) ms. */
export const MIN_FLIP_GAP_MS = 120;

/** "Malvin" → "M****n", "Malvin Evano" → "M****n E***o", "Al" → "A*". */
export const maskName = (name) =>
  String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => {
      const c = [...w];
      if (c.length <= 1) return w;
      if (c.length === 2) return `${c[0]}*`;
      return c[0] + '*'.repeat(c.length - 2) + c[c.length - 1];
    })
    .join(' ');

/**
 * Re-play a finished daily game from its flip log so the server can trust
 * the result instead of the numbers the browser sends.
 *
 *   log    [[index, now], …]  every flip that changed the board (state.log)
 *   pauses [[from, to], …]    pause intervals, same clock as `now`
 *
 * Mismatched pairs auto-hide MISMATCH_MS after the second card, exactly
 * like the page does. Returns { ok, moves, timeMs, stars } or { ok:false, error }.
 */
export const verifyRun = (deck, log, pauses = []) => {
  if (!Array.isArray(log) || log.length < deck.length || log.length > 2000) return { ok: false, error: 'log' };
  if (!Array.isArray(pauses) || pauses.length > 200) return { ok: false, error: 'pauses' };
  const ps = [];
  for (const p of pauses) {
    if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || p[1] < p[0]) return { ok: false, error: 'pauses' };
    ps.push([p[0], p[1]]);
  }
  ps.sort((a, b) => a[0] - b[0]);
  const pausedBefore = (t) => ps.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, t) - a), 0);

  let state = initialGame(deck);
  let secondAt = null; // real time the current mismatched pair was completed
  let prevActive = null;
  for (const entry of log) {
    if (!Array.isArray(entry) || !Number.isInteger(entry[0]) || !Number.isFinite(entry[1])) return { ok: false, error: 'log' };
    const [index, now] = entry;
    if (index < 0 || index >= deck.length) return { ok: false, error: 'log' };
    const active = now - pausedBefore(now);
    if (prevActive != null && active - prevActive < MIN_FLIP_GAP_MS) return { ok: false, error: 'speed' };
    prevActive = active;
    if (state.open.length === 2 && secondAt != null && now - secondAt >= MISMATCH_MS) state = gameReducer(state, { type: 'hide' });
    const next = gameReducer(state, { type: 'flip', index, now });
    if (next === state) return { ok: false, error: 'replay' };
    secondAt = next.open.length === 2 ? now : null;
    state = next;
  }
  if (state.finishedAt == null) return { ok: false, error: 'unfinished' };
  const timeMs = Math.round(state.finishedAt - state.startedAt - (pausedBefore(state.finishedAt) - pausedBefore(state.startedAt)));
  const pairs = deck.length / 2;
  return { ok: true, moves: state.moves, timeMs, stars: starRating(state.moves, pairs) };
};
