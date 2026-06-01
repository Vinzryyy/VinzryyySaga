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

import { SITE_CONFIG } from '../config/siteConfig';

// Curated quotes — short, on-brand, Eli/archive-themed. Append to grow
// the cycle; insert order is preserved so rotation stays predictable.
const CURATED_QUOTES = [
  'Bagai lembayung senja — menghangatkan setiap panggung.',
  'Senyum Eli adalah cahaya yang Armeniaca rawat.',
  'Mekar di akhir musim dingin — itulah Armeniaca, itulah Eli.',
  'Satu dekade lebih, dan masih terus tumbuh.',
  'Setiap frame disimpan rapi — satu per satu, satu per Eli.',
  'Dari Generasi 7 sampai Team Dream, perjalanan yang panjang.',
  'Sang Mermaid dari Bandung yang tak pernah berhenti bersinar.',
  'Helismiley selalu ada di setiap stage Eli.',
  'We bloom in spring with you, Ceu Eli.',
  'Hari-hari kecil ini adalah halaman yang Armeniaca jaga.',
  'Arme menunggu, dan kota perlahan kembali ramai.',
  'Setiap siraman adalah doa kecil untuk Ceu Eli.',
  'Yang sederhana, kalau dirawat lama, jadi sejarah.',
  'Kota ini sepi karena ramai — bukan karena ditinggal.',
  'Aprikot mekar pertama-tama; harapan menyusul.',
  'Eli bukan jauh — tinggal satu panggung, satu live, satu frame.',
];

// Fold in the seitansai gift quotes from siteConfig so this stays a
// single source of truth — kalau quote di countdown.gifts ditambah,
// QOTD pool ikut tumbuh tanpa harus duplicate edit di sini.
const SEITANSAI_QUOTES = SITE_CONFIG?.countdown?.gifts?.quotes ?? [];

// Dedupe (case-insensitive) and freeze. Insertion order preserved so
// older quotes land on the same days they always did.
const seen = new Set();
const QUOTE_POOL = [];
for (const q of [...CURATED_QUOTES, ...SEITANSAI_QUOTES]) {
  if (typeof q !== 'string') continue;
  const trimmed = q.trim();
  const key = trimmed.toLowerCase();
  if (!trimmed || seen.has(key)) continue;
  seen.add(key);
  QUOTE_POOL.push(trimmed);
}

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

export const getQuotePoolSize = () => QUOTE_POOL.length;
