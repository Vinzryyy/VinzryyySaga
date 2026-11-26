/**
 * Lemari Eli — pure outfit rules, shared by the page and tests.
 *
 * An outfit is { [slot]: itemId, tints?: { [slot]: tintId } }. An empty
 * slot means Eli wears what the base layer shows (black tube top and
 * shorts), so a look is never "bare". Rules:
 *   - a dress replaces top and bottom; wearing a top or bottom takes the
 *     dress off;
 *   - there is always a background;
 *   - a tint belongs to the item in its slot: changing or removing the
 *     item drops it, and only tintable items take one.
 */

import { BASE_CREDIT, BASE_LAYERS, DEFAULT_BG, DEFAULT_SET, LAYER_ORDER, LEMARI_ITEMS, LEMARI_SETS, TINTS } from '../data/lemari';

export const NAME_MAX = 24;

const byId = (items) => new Map(items.map((i) => [i.id, i]));
const tintById = new Map(TINTS.map((t) => [t.id, t]));

export const defaultOutfit = () => ({ bg: DEFAULT_BG });

/** [slot, itemId] pairs of what is worn, in layer order (tints left out). */
export const wornEntries = (outfit) => LAYER_ORDER.filter((slot) => outfit[slot]).map((slot) => [slot, outfit[slot]]);

const dropTint = (outfit, slot) => {
  if (!outfit.tints?.[slot]) return outfit;
  const tints = { ...outfit.tints };
  delete tints[slot];
  const next = { ...outfit, tints };
  if (!Object.keys(tints).length) delete next.tints;
  return next;
};

const removeSlot = (outfit, slot) => {
  const next = dropTint(outfit, slot);
  if (next === outfit) {
    const copy = { ...outfit };
    delete copy[slot];
    return copy;
  }
  delete next[slot];
  return next;
};

/** Put `item` on (no toggling). Returns a new outfit. */
export const wearItem = (outfit, item) => {
  if (!item) return outfit;
  let next = outfit[item.slot] === item.id ? { ...outfit } : { ...dropTint(outfit, item.slot), [item.slot]: item.id };
  if (item.slot === 'dress') {
    next = removeSlot(removeSlot(next, 'top'), 'bottom');
  } else if (item.slot === 'top' || item.slot === 'bottom') {
    next = removeSlot(next, 'dress');
  }
  return next;
};

/** Take off whatever is in `slot` (the background stays). */
export const clearSlot = (outfit, slot) => (slot === 'bg' || !outfit[slot] ? outfit : removeSlot(outfit, slot));

/** Tap on an item: put it on, or take it off if already worn (background stays). */
export const toggleItem = (outfit, item) => {
  if (!item) return outfit;
  if (outfit[item.slot] !== item.id) return wearItem(outfit, item);
  return clearSlot(outfit, item.slot);
};

/** Recolour the item in `slot` ('asli' = original). Ignored if it isn't tintable. */
export const setTint = (outfit, slot, tintId, items = LEMARI_ITEMS) => {
  const item = byId(items).get(outfit[slot]);
  const tint = tintById.get(tintId);
  if (!item?.tintable || !tint) return outfit;
  if (!tint.filter) return dropTint(outfit, slot);
  return { ...outfit, tints: { ...(outfit.tints || {}), [slot]: tint.id } };
};

export const tintOf = (outfit, slot) => tintById.get(outfit.tints?.[slot]) || TINTS[0];

/** Wear a whole Set Panggung over the base (keeps the background unless the set has one). */
export const applySet = (outfit, set, items = LEMARI_ITEMS) => {
  const map = byId(items);
  let next = { bg: set.bg || outfit.bg || DEFAULT_BG };
  for (const id of set.items) next = wearItem(next, map.get(id));
  return next;
};

/**
 * What a first visit, and Reset, show: Eli in DEFAULT_SET. (defaultOutfit
 * stays bare: share links are decoded on top of it.)
 */
export const startingOutfit = (items = LEMARI_ITEMS, sets = LEMARI_SETS) => {
  const set = sets.find((s) => s.id === DEFAULT_SET);
  return set ? applySet(defaultOutfit(), set, items) : defaultOutfit();
};

/**
 * The look a visit opens with when the link has none: the one saved in this
 * browser, unless it is only the bare base. Before DEFAULT_SET existed, the
 * game saved the bare base on every first visit, so a saved bare base means
 * "nothing chosen yet".
 */
export const openingOutfit = (saved, items = LEMARI_ITEMS, sets = LEMARI_SETS) =>
  saved && encodeOutfit(saved) !== encodeOutfit(defaultOutfit()) ? saved : startingOutfit(items, sets);

/**
 * Which set the outfit shows, if any:
 *   { set, modified: false } when exactly the set's clothes are worn,
 *   uncoloured; { set, modified: true } when some of a set's clothes are
 *   worn with other changes; or null.
 */
export const matchSet = (outfit, sets = LEMARI_SETS) => {
  const worn = new Set(wornEntries(outfit).filter(([slot]) => slot !== 'bg').map(([, id]) => id));
  const tinted = Boolean(outfit.tints && Object.keys(outfit.tints).length);
  let best = null;
  for (const set of sets) {
    const hits = set.items.filter((id) => worn.has(id)).length;
    if (!hits) continue;
    const exact = hits === set.items.length && worn.size === set.items.length;
    if (exact && !tinted) return { set, modified: false };
    if (!best || hits > best.hits) best = { set, hits };
  }
  return best ? { set: best.set, modified: true } : null;
};

/** A random valid look: always a background, a dress or top/bottom, sometimes extras and a colour. */
export const randomOutfit = (items = LEMARI_ITEMS, rng = Math.random) => {
  const open = items.filter((i) => !i.unlock);
  const pick = (slot) => {
    const pool = open.filter((i) => i.slot === slot);
    return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
  };
  let outfit = { bg: (pick('bg') || { id: DEFAULT_BG }).id };
  const hasDress = open.some((i) => i.slot === 'dress');
  const hasSeparates = open.some((i) => i.slot === 'top' || i.slot === 'bottom');
  if (hasDress && (!hasSeparates || rng() < 0.5)) outfit = wearItem(outfit, pick('dress'));
  else {
    outfit = wearItem(outfit, pick('top'));
    outfit = wearItem(outfit, pick('bottom'));
  }
  for (const slot of ['shoes', 'outer', 'accHead', 'accNeck', 'accHand']) {
    // Shoes most of the time; extras now and then.
    if (rng() < (slot === 'shoes' ? 0.85 : 0.4)) outfit = wearItem(outfit, pick(slot));
  }
  for (const [slot] of wornEntries(outfit)) {
    if (rng() < 0.5) outfit = setTint(outfit, slot, TINTS[Math.floor(rng() * TINTS.length)].id, items);
  }
  return outfit;
};

/** Outfit → share-link value: "id" or "id~tint" in layer order, joined by ".". */
export const encodeOutfit = (outfit) =>
  wornEntries(outfit)
    .map(([slot, id]) => (outfit.tints?.[slot] ? `${id}~${outfit.tints[slot]}` : id))
    .join('.');

/** Share-link value → outfit. Unknown or locked ids are skipped; rules re-applied. */
export const decodeOutfit = (value, items = LEMARI_ITEMS) => {
  const map = byId(items);
  let outfit = defaultOutfit();
  String(value || '')
    .split('.')
    .slice(0, LAYER_ORDER.length)
    .forEach((token) => {
      const [id, tint] = token.trim().split('~');
      const item = map.get(id);
      if (!item || item.unlock) return;
      outfit = wearItem(outfit, item);
      if (tint) outfit = setTint(outfit, item.slot, tint, items);
    });
  return outfit;
};

/** Layers to stack, bottom → top: [{ file, filter }]. */
export const layersFor = (outfit, items = LEMARI_ITEMS) => {
  const map = byId(items);
  return LAYER_ORDER.map((slot) => {
    if (slot === 'body') return { file: BASE_LAYERS.body, filter: null };
    const item = map.get(outfit[slot]);
    return item ? { file: item.file, filter: tintOf(outfit, slot).filter } : null;
  }).filter(Boolean);
};

/** Alt text, e.g. "Eli memakai Dress Nice To Meet You (Burgundy) dan Ankle Boots Hitam, latar Panggung Teater". */
export const describeOutfit = (outfit, items = LEMARI_ITEMS) => {
  const map = byId(items);
  const clothes = wornEntries(outfit)
    .filter(([slot]) => slot !== 'bg')
    .map(([slot, id]) => {
      const name = map.get(id)?.name;
      const tint = outfit.tints?.[slot] && tintOf(outfit, slot);
      return name && (tint ? `${name} (${tint.label})` : name);
    })
    .filter(Boolean);
  const wear = clothes.length
    ? clothes.length === 1
      ? clothes[0]
      : `${clothes.slice(0, -1).join(', ')} dan ${clothes.at(-1)}`
    : 'baju latihan';
  const bg = map.get(outfit.bg)?.name;
  return `Eli memakai ${wear}${bg ? `, latar ${bg}` : ''}`;
};

/**
 * Distinct credits of the base and the items worn. The game prints none for
 * now (the site owner took the credit line off the card and the page);
 * this stays so a credit line can come back in one place.
 */
export const creditsFor = (outfit, items = LEMARI_ITEMS) => {
  const map = byId(items);
  return [...new Set([BASE_CREDIT, ...wornEntries(outfit).map(([, id]) => map.get(id)?.credit)].filter(Boolean))];
};

/** The "Didandani oleh" name: plain text, one line, at most NAME_MAX characters. */
export const cleanName = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    // Drop control characters and angle brackets.
    .split('')
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127 && ch !== '<' && ch !== '>')
    .join('')
    .trim()
    .slice(0, NAME_MAX);

// ── Per-browser memory of the last look ───────────────────────────────
const KEY = 'armeniaca_lemari';

export const readSaved = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return null;
    return { outfit: decodeOutfit(raw.o), name: cleanName(raw.n), template: typeof raw.t === 'string' ? raw.t : null };
  } catch {
    return null;
  }
};

export const writeSaved = (outfit, name, template) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ o: encodeOutfit(outfit), n: cleanName(name), t: template }));
  } catch {
    /* storage blocked: the look lasts for this visit */
  }
};

// ── Undo ──────────────────────────────────────────────────────────────
export const HISTORY_MAX = 30;

/** Push the current outfit before a change; unchanged looks aren't recorded. */
export const pushHistory = (history, outfit) => {
  const last = history.at(-1);
  if (last && encodeOutfit(last) === encodeOutfit(outfit)) return history;
  return [...history, outfit].slice(-HISTORY_MAX);
};
