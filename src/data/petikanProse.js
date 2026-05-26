/**
 * Petikan prose library — short contextual lines yang di-pick random
 * setiap pluck, di-freeze ke journal entry sebagai "narasi hari ini".
 *
 * Per-tier biar prose match weight kartu — muda dapet daily lines,
 * legenda dapet "rare moment" lines. Total ~20 lines (5 per tier).
 *
 * Tone: paper-archive, retro-Indonesian, kalimat pendek. Hindari
 * "selamat" / "hooray" / kata heboh — Petikan tone reflektif, bukan
 * gacha grind. Reference design language di reference_armeniaca_design_language.md.
 */

const PROSE_MUDA = [
  'Hari biasa, tapi tidak persis sama.',
  'Halaman buku baru saja terbuka.',
  'Lampu lorong sedikit redup hari ini.',
  'Pohon menggugurkan satu, pelan.',
  'Buah ini ringan di tangan, berat di ingatan.',
];

const PROSE_MATANG = [
  'Cahaya jatuh di tempat yang tepat hari ini.',
  'Angin dari arah barat membawa sapaan kecil.',
  'Telaga sedang tenang. Mungkin Mei sedang menunggu.',
  'Pohon ingat. Pelan, tapi sabar.',
  'Hari ini langit di Armeniaca sedikit lebih lembut.',
];

const PROSE_LANGKA = [
  'Pohon ini jarang menggugurkan yang seperti ini.',
  'Halaman ini ada bekas lipatan — pernah dibaca berkali.',
  'Buah yang ini disimpan lebih lama dari yang lain.',
  'Ingatan ini menunggu untuk ditemukan kembali.',
  'Mercusuar berkedip dua kali — tanda yang langka.',
];

const PROSE_LEGENDA = [
  'Pohon menahan ini untuk hari yang tepat.',
  'Satu warga kota berhenti, lalu mengangguk pelan.',
  'Aprikot terjatuh — bukan kebetulan.',
  'Lampu utama di Armeniaca menyala lebih terang sebentar.',
  'Ingatan ini setara satu musim.',
];

const TIER_PROSE = {
  muda: PROSE_MUDA,
  matang: PROSE_MATANG,
  langka: PROSE_LANGKA,
  legenda: PROSE_LEGENDA,
};

/**
 * Pick random prose line untuk tier tertentu. RNG injectable untuk
 * deterministic testing.
 */
export const pickProse = (tier, rng = Math.random) => {
  const lines = TIER_PROSE[tier] || PROSE_MUDA;
  const idx = Math.floor(rng() * lines.length);
  return lines[idx];
};

// Surface untuk tests / debugging.
export const _TIER_PROSE = TIER_PROSE;
