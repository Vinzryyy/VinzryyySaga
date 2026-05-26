/**
 * Petikan storage layer — localStorage helpers + Jakarta date utilities.
 *
 * Daily-window logic uses midnight WIB (Asia/Jakarta). Compare via
 * YYYY-MM-DD string equality biar gak ada DST/floating-point edge case.
 *
 * Storage keys:
 *   aprikot_last_pluck — YYYY-MM-DD WIB (last successful pluck date)
 *   aprikot_buku       — { [cardId]: { firstPluckedAt, count } }
 *   aprikot_legenda    — array of cardIds yang udah pernah ke-pull
 *
 * Semua getter/setter graceful — kalau localStorage blocked (private
 * browsing, storage quota exceeded), fall back ke ephemeral state in
 * memory tanpa crash.
 */

const KEYS = {
  lastPluck: 'aprikot_last_pluck',
  buku: 'aprikot_buku',
  legenda: 'aprikot_legenda',
  buah: 'aprikot_buah',
  pity: 'aprikot_pity',
};

// Pity thresholds — referensi mekanik UR_PITY_LIMIT dari Tierlist-JKT48
// (MrcellSbst). Counter naik tiap pluck di bawah tier, reset saat tier
// (atau lebih tinggi) didapat.
//   langka  → guaranteed in 10 plucks
//   legenda → guaranteed in 50 plucks
export const PITY_THRESHOLD = {
  langka: 10,
  legenda: 50,
};

// Buah Pohon Kebaikan — currency yang user dapat dari tap dukungan
// di /26 (1 tap = 1 buah, 1× per device per day rate-limited oleh
// EliTree's markSupportedToday). Tiap buah = 1 extra Petikan pluck
// (di luar free daily). Capped untuk encourage spending, bukan hoard.
export const BUAH_CAP = 30;

/**
 * Returns YYYY-MM-DD string in Asia/Jakarta timezone for a given Date.
 * Pakai 'en-CA' locale karena format default-nya YYYY-MM-DD lexicographic
 * (urut-string-aman, easy compare).
 */
export const getJakartaDate = (now = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
};

/**
 * Milliseconds until next midnight Asia/Jakarta. Untuk countdown UI
 * ("Pohon kembali dalam Xh Ym").
 */
export const msUntilNextJakartaMidnight = (now = new Date()) => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value])
  );
  // '24' jadi '00' di Intl — handle keduanya.
  const h = parseInt(parts.hour, 10) % 24;
  const m = parseInt(parts.minute, 10);
  const s = parseInt(parts.second, 10);
  const elapsedMs = (h * 3600 + m * 60 + s) * 1000;
  return 24 * 3600 * 1000 - elapsedMs;
};

const safeParse = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const safeRead = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Read full state from localStorage. Defensive — returns fresh state
 * (no pluck, empty book/legenda) kalau ada parse error atau storage
 * blocked.
 */
export const loadState = () => {
  const lastPluck = safeRead(KEYS.lastPluck);
  const buku = safeParse(safeRead(KEYS.buku), {});
  const legendaArr = safeParse(safeRead(KEYS.legenda), []);
  const pityRaw = safeParse(safeRead(KEYS.pity), null);
  const pity =
    pityRaw && typeof pityRaw === 'object'
      ? {
          langka: Math.max(0, parseInt(pityRaw.langka, 10) || 0),
          legenda: Math.max(0, parseInt(pityRaw.legenda, 10) || 0),
        }
      : { langka: 0, legenda: 0 };
  return {
    lastPluck: typeof lastPluck === 'string' ? lastPluck : null,
    buku: typeof buku === 'object' && buku !== null ? buku : {},
    legenda: new Set(Array.isArray(legendaArr) ? legendaArr : []),
    pity,
  };
};

/**
 * Persist state. Set fields (Set) serialized as arrays.
 */
export const saveState = (state) => {
  if (state.lastPluck) safeWrite(KEYS.lastPluck, state.lastPluck);
  safeWrite(KEYS.buku, JSON.stringify(state.buku || {}));
  safeWrite(
    KEYS.legenda,
    JSON.stringify(Array.from(state.legenda || []))
  );
  if (state.pity) {
    safeWrite(KEYS.pity, JSON.stringify(state.pity));
  }
};

/**
 * Boundary check — true kalau lastPluck != today (WIB). Boundary
 * critical: 23:59:59 hari A vs 00:00:00 hari B — pakai string equality
 * di YYYY-MM-DD, gak ada off-by-one.
 */
export const canPluckToday = (state, now = new Date()) => {
  const today = getJakartaDate(now);
  return state.lastPluck !== today;
};

/**
 * Immutable update — return new state object setelah pluck card.
 * Caller validate canPluckToday() dulu; fungsi ini gak re-check.
 */
export const applyPluck = (state, card, now = new Date()) => {
  const today = getJakartaDate(now);
  const prevEntry = state.buku[card.id] || { count: 0, firstPluckedAt: null };
  const nextBuku = {
    ...state.buku,
    [card.id]: {
      count: prevEntry.count + 1,
      firstPluckedAt: prevEntry.firstPluckedAt || today,
    },
  };
  const nextLegenda = new Set(state.legenda);
  if (card.tier === 'legenda') nextLegenda.add(card.id);
  // Pity counters — reset saat threshold tier (atau di atasnya) drop,
  // increment otherwise. langka counter reset on langka+ (langka or
  // legenda), legenda counter reset on legenda only.
  const prevPity = state.pity || { langka: 0, legenda: 0 };
  const isLegenda = card.tier === 'legenda';
  const isLangkaPlus = card.tier === 'langka' || isLegenda;
  const nextPity = {
    langka: isLangkaPlus ? 0 : prevPity.langka + 1,
    legenda: isLegenda ? 0 : prevPity.legenda + 1,
  };
  return {
    lastPluck: today,
    buku: nextBuku,
    legenda: nextLegenda,
    pity: nextPity,
  };
};

/**
 * Read current buah count (0..BUAH_CAP). Graceful fallback ke 0
 * kalau storage blocked atau value invalid.
 */
export const getBuah = () => {
  try {
    const raw = localStorage.getItem(KEYS.buah);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(BUAH_CAP, n));
  } catch {
    return 0;
  }
};

/**
 * Add `amount` buah (default 1). Capped at BUAH_CAP — surplus dropped
 * (no overflow). Returns new total.
 */
export const addBuah = (amount = 1) => {
  const next = Math.min(BUAH_CAP, getBuah() + Math.max(0, amount));
  safeWrite(KEYS.buah, String(next));
  return next;
};

/**
 * Spend `amount` buah (default 1). Returns true kalau berhasil
 * (cukup buah), false kalau insufficient. Caller harus cek dulu
 * via getBuah() kalau perlu reject di UI.
 */
export const spendBuah = (amount = 1) => {
  const current = getBuah();
  if (current < amount) return false;
  const next = current - amount;
  safeWrite(KEYS.buah, String(next));
  return true;
};

/**
 * Clear storage (testing utility — surfaced for dev console + tests).
 */
export const resetState = () => {
  try {
    localStorage.removeItem(KEYS.lastPluck);
    localStorage.removeItem(KEYS.buku);
    localStorage.removeItem(KEYS.legenda);
    localStorage.removeItem(KEYS.buah);
    localStorage.removeItem(KEYS.pity);
  } catch {
    // ignored
  }
};

// Surfaced for tests / debugging.
export const _KEYS = KEYS;
