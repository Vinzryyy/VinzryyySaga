/**
 * Quote of the Day — daily-rotating Eli/Armeniaca quote.
 *
 * Single source of truth feeding both the home page strip and the chat
 * widget greeting. Same quote shows across the site for the entire WIB
 * day; cycle advances at midnight WIB regardless of visitor timezone.
 *
 * Selection is deterministic from days-since-epoch so:
 *   - All visitors see the same quote on the same calendar day (WIB),
 *     letting fans share the day's quote without confusion.
 *   - No state to persist server-side or client-side.
 *   - Rotation order stays stable across deploys — once a quote lands
 *     on a particular date, it stays mapped to that date.
 *
 * Pool curation note: keep quotes short (≤140 chars), Indonesian,
 * focused on Eli or the Armeniaca archive metaphor. No emoji, no
 * markdown — they render in plain text on both surfaces.
 */

import { POSITIVE_QUOTES_POOL } from './positiveQuotePool';

// Curated quotes — short, on-brand, Eli/archive-themed. Append to grow
// the cycle; insert order is preserved so rotation stays predictable.
const CURATED_QUOTES = [
  'Seperti lembayung senja, Eli menghangatkan setiap panggung yang ia singgahi.',
  'Senyum Eli adalah cahaya yang ingin terus kami rawat.',
  'Aprikot mekar di ujung musim dingin, pertanda hari yang lebih hangat akan tiba.',
  'Sejak 2018, setiap langkah Eli layak untuk dikenang.',
  'Setiap foto kami simpan dengan rapi, satu per satu, untuk Eli.',
  'Dari Generasi 7 hingga hari ini, perjalanan Eli adalah cerita yang panjang dan indah.',
  'Sang mermaid dari Bandung yang tak pernah lelah bersinar.',
  'Di setiap panggung Eli, selalu ada Helismiley yang menemani.',
  'Kami ingin terus tumbuh dan mekar bersamamu, Ceu Eli.',
  'Hari-hari sederhana pun layak dicatat, karena dari sanalah kenangan lahir.',
  'Hal kecil yang dirawat dengan tulus lama-lama menjadi sejarah.',
  'Setiap dukungan kecil adalah doa baik untuk Ceu Eli.',
  'Setiap siraman membuat ArmeniacaTown tumbuh sedikit lebih ramai.',
  'Eli tidak pernah terlalu jauh: ada di panggung, di siaran langsung, dan di setiap foto.',
  'Kenangan tidak perlu megah; cukup dijaga agar tidak hilang.',
  'Di antara banyak panggung, selalu ada satu senyum yang paling hangat.',
  'Terima kasih sudah terus berkarya dengan sepenuh hati, Ceu Eli.',
  'Arsip ini dibuat agar setiap momen Eli punya tempat untuk pulang.',
  'Bersinar tidak harus selalu paling terang; cukup terus menyala.',
  'Setiap pertunjukan teater adalah halaman baru dalam cerita Eli.',
  'Sedikit demi sedikit, kenangan ini tumbuh menjadi taman.',
  'Yang menghidupkan panggung bukan hanya lampunya, tetapi juga ketulusan orang di atasnya.',
  'Semoga hari ini pun Eli bahagia, di mana pun ia berada.',
];


// Dedupe (case-insensitive) and freeze. Insertion order preserved so
// older quotes land on the same days they always did.
const dedupe = (...lists) => {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const q of list) {
      if (typeof q !== 'string') continue;
      const trimmed = q.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
};

// Daily-rotation pool — curated only. Stays on-brand for the home strip
// (Eli/Armeniaca-specific). Don't add generic positive quotes here or
// the home strip loses its signature.
// The seitansai gift lines (siteConfig countdown.gifts) are no longer
// folded in: they belong to a past event and were rougher drafts of these.
const QUOTE_POOL = dedupe(CURATED_QUOTES);

// Random pool (chat greeting) — daily pool + 400 generic positive
// quotes. Bigger pool means chat greetings feel fresh per panel-open
// without sacrificing brand voice on the home strip.
const QUOTE_POOL_RANDOM = dedupe(QUOTE_POOL, POSITIVE_QUOTES_POOL);

// Days since a fixed WIB epoch. Using a fixed anchor (Eli's audition
// date, 29 Sep 2018) gives an interpretable rotation cursor: "day 2837
// of the archive". WIB anchor (UTC+7) means the cursor flips at
// midnight Jakarta regardless of visitor timezone.
const WIB_EPOCH_MS = Date.UTC(2018, 8, 29) - 7 * 60 * 60 * 1000; // 29 Sep 2018 00:00 WIB
const DAY_MS = 86_400_000;

const dayCursor = (nowMs = Date.now()) =>
  Math.floor((nowMs - WIB_EPOCH_MS) / DAY_MS);

export const getQuoteOfTheDay = (nowMs = Date.now()) => {
  if (QUOTE_POOL.length === 0) return '';
  const idx = ((dayCursor(nowMs) % QUOTE_POOL.length) + QUOTE_POOL.length) %
    QUOTE_POOL.length;
  return QUOTE_POOL[idx];
};

// Random pick — draws from the EXTENDED pool (curated + 400 positive)
// so the chat greeting feels fresh per panel-open. Optional `avoid`
// excludes one quote (typically today's deterministic QOTD) so the
// chat greeting and home strip don't accidentally echo each other.
export const getRandomQuote = (avoid = null) => {
  const pool = QUOTE_POOL_RANDOM;
  if (pool.length === 0) return '';
  if (pool.length === 1) return pool[0];
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if (avoid && pick === avoid) {
    // One re-roll is enough — pool size makes a second collision
    // statistically negligible.
    pick = pool[Math.floor(Math.random() * pool.length)];
  }
  return pick;
};

export const getQuotePoolSize = () => QUOTE_POOL.length;
export const getRandomPoolSize = () => QUOTE_POOL_RANDOM.length;
