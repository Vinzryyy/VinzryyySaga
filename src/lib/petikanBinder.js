/**
 * Binder ArmePack — the collection as sets in a photocard binder.
 *
 *   - Sets: the pool grouped by story era (Show, Livestream, Daily), each
 *     with its own progress and a one-time reward (buah) when complete.
 *   - Duplicates: extra copies can be traded, 3 duplicates → 1 buah (one
 *     more pluck), commonest tier first. The first copy is always kept.
 *
 * Free and daily like the rest of ArmePack: no paid packs, ever.
 * Storage: aprikot_set_rewards = [setId] (rewards already claimed); the
 * collection itself stays in aprikot_buku ({ [cardId]: { count, … } }).
 */

export const SETS = [
  { id: 'helisma-show', title: 'Panggung Helisma', blurb: 'Lampu teater, setlist, dan malam-malam panggung.', icon: 'ri-mic-2-line', reward: 5 },
  { id: 'helisma-livestream', title: 'Malam Livestream', blurb: 'Obrolan larut dari layar kecil.', icon: 'ri-live-line', reward: 3 },
  { id: 'fan-life', title: 'Hari-hari Arme', blurb: 'Keseharian seorang fans yang mengidolakan Helisma.', icon: 'ri-sun-line', reward: 5 },
];

export const POCKETS_PER_PAGE = 9;
export const DUPES_PER_BUAH = 3;
const TIER_ORDER = { muda: 0, matang: 1, langka: 2, legenda: 3 };
const REWARDS_KEY = 'aprikot_set_rewards';

const countOf = (buku, id) => Math.max(0, Number(buku?.[id]?.count) || (buku?.[id] ? 1 : 0));

/** Per set: { ...set, cards, owned, total, complete, pages: [[card|null ×9]] }. Unknown eras go to the last set. */
export const setProgress = (pool, buku) => {
  const known = new Set(SETS.map((s) => s.id));
  return SETS.map((set, i) => {
    const cards = pool
      .filter((c) => c.era === set.id || (i === SETS.length - 1 && !known.has(c.era)))
      .sort((a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier] || a.title.localeCompare(b.title));
    const owned = cards.filter((c) => countOf(buku, c.id) > 0).length;
    const pages = [];
    for (let p = 0; p < Math.max(1, Math.ceil(cards.length / POCKETS_PER_PAGE)); p++) {
      const slice = cards.slice(p * POCKETS_PER_PAGE, (p + 1) * POCKETS_PER_PAGE);
      pages.push([...slice, ...Array(POCKETS_PER_PAGE - slice.length).fill(null)]);
    }
    return { ...set, cards, owned, total: cards.length, complete: cards.length > 0 && owned === cards.length, pages };
  });
};

/** Extra copies in the collection: { total, byTier: { muda, matang, langka, legenda } }. */
export const duplicates = (pool, buku) => {
  const byTier = { muda: 0, matang: 0, langka: 0, legenda: 0 };
  for (const c of pool) byTier[c.tier] += Math.max(0, countOf(buku, c.id) - 1);
  return { total: Object.values(byTier).reduce((a, n) => a + n, 0), byTier };
};

/**
 * Trade duplicates for buah. `room` = how many buah still fit (cap −
 * current). Uses the commonest tier first and never the last copy.
 * → { buku (new object), used, buah }; nothing changes when buah = 0.
 */
export const tradeDuplicates = (pool, buku, room, rate = DUPES_PER_BUAH) => {
  const { total } = duplicates(pool, buku);
  const buah = Math.max(0, Math.min(Math.floor(total / rate), room));
  if (!buah) return { buku, used: 0, buah: 0 };
  let need = buah * rate;
  const next = { ...buku };
  const order = [...pool].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || countOf(buku, b.id) - countOf(buku, a.id));
  for (const c of order) {
    if (!need) break;
    const extra = countOf(next, c.id) - 1;
    if (extra <= 0) continue;
    const take = Math.min(extra, need);
    next[c.id] = { ...next[c.id], count: countOf(next, c.id) - take };
    need -= take;
  }
  return { buku: next, used: buah * rate, buah };
};

// ── Rewards (localStorage, graceful when blocked) ────────────────────

export const loadClaimed = () => {
  try {
    const arr = JSON.parse(localStorage.getItem(REWARDS_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

export const saveClaimed = (set) => {
  try {
    localStorage.setItem(REWARDS_KEY, JSON.stringify([...set]));
  } catch {
    /* storage blocked: reward still given this session */
  }
};

/** Complete sets whose reward has not been taken yet. */
export const claimableSets = (sets, claimed) => sets.filter((s) => s.complete && !claimed.has(s.id));

export const _REWARDS_KEY = REWARDS_KEY;
