/**
 * Petikan — Arme's VTuber form (CoffeeBean) cards.
 *
 * Arme has two visual forms:
 *   1. Town mascot (ELI_1_a / ELI_2_a) — used di peta, legenda tier.
 *   2. VTuber/PNGTuber form (CoffeeBean) — used di sini.
 *
 * Each entry = 1 mood from the Emote Labs V1_4 commission set di
 * public/EmoteLabs/. User akan tambah more GIFs over time — append entries
 * di array sesuai tier. Filenames di-keep as-is (CoffeeBean_V1_4_*), UI
 * labels her as Arme.
 *
 * Tier defaults — louder/more performative = rarer:
 *   muda    — everyday vibes (idle, chatter, eat, arrive, loading)
 *   matang  — depth (cry, nervous)
 *   langka  — peak fan-culture (dance variants, jail)
 *   legenda — Lightstick (peak wotagei = thematic apex Arme moment).
 *             Promoted dari langka saat GIF-only experiment 2026-05-26.
 *
 * Captions di sini placeholder — user akan iterate quotes later.
 */

// Helper biar spaces + parens di filenames ke-encode benar untuk URL.
const EM = (filename) => `/EmoteLabs/${encodeURI(filename)}`;

export const PETIKAN_EMOTELABS_CARDS = [
  // ── muda ─────────────────────────────────────────────────────────
  {
    id: 'arme-vtuber-arrive',
    tier: 'muda',
    title: 'Arme Datang',
    caption: 'Masuk ke kamar live, pelan-pelan menyalakan lampu.',
    image: EM('CoffeeBean_V1_4_Arrive_2026-05-26-21-02-58.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-idle',
    tier: 'muda',
    title: 'Menunggu Live',
    caption: 'Menatap layar, menunggu penonton pertama datang.',
    image: EM('CoffeeBean_V1_4_PNGTuber Idle 2_2026-05-26-21-05-34.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-yap',
    tier: 'muda',
    title: 'Ngobrol Pelan',
    caption: 'Ngobrol panjang tentang panggung yang sudah lewat.',
    image: EM('CoffeeBean_V1_4_PNGTuber Yap_2026-05-26-21-05-43.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-loading',
    tier: 'muda',
    title: 'Buffering',
    caption: 'Sinyal lambat, tapi penonton masih setia menunggu.',
    image: EM('CoffeeBean_V1_4_PNGTuber Loading_2026-05-26-21-05-38.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-eat-watermelon',
    tier: 'muda',
    title: 'Istirahat Sebentar',
    caption: 'Semangka di tangan — break di tengah live yang panjang.',
    image: EM('CoffeeBean_V1_4_Eat (Watermelon)_2026-05-26-21-03-22.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },

  // ── matang ───────────────────────────────────────────────────────
  {
    id: 'arme-vtuber-cry',
    tier: 'matang',
    title: 'Selesai Show',
    caption: 'Air mata setelah encore terakhir — yang tak sempat di-zoom kamera.',
    image: EM('CoffeeBean_V1_4_Cry 3_2026-05-26-21-06-01.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-nervous',
    tier: 'matang',
    title: 'Sebelum Tayang',
    caption: 'Tangan dingin, jantung berdebar — hitungan mundur sebelum live.',
    image: EM('CoffeeBean_V1_4_Nervous 1_2026-05-26-21-05-27.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },

  // ── langka ───────────────────────────────────────────────────────
  {
    id: 'arme-vtuber-lightstick',
    tier: 'legenda',
    title: 'Wotagei Penuh',
    caption: 'Penlight di tangan kanan — call yang dihafal sejak generasi pertama.',
    image: EM('CoffeeBean_V1_4_Lightstick 2_2026-05-26-21-05-21.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-dance-helltaker',
    tier: 'langka',
    title: 'Dance Cover',
    caption: 'Cover lagu yang sedang trending — gerakan masih agak kaku tapi semangat penuh.',
    image: EM('CoffeeBean_V1_4_Dance (Helltaker)_2026-05-26-21-12-40.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-dance-lowcortisol',
    tier: 'langka',
    title: 'Lepas-lepas',
    caption: 'Joget tanpa beban — momen di mana stress hilang sebentar.',
    image: EM('CoffeeBean_V1_4_Dance (Low Cortisol)_2026-05-26-21-12-50.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
  {
    id: 'arme-vtuber-jail',
    tier: 'langka',
    title: 'Dikurung Kenangan',
    caption: 'Terjebak di balik jeruji — bayangan show yang tak bisa diulang.',
    image: EM('CoffeeBean_V1_4_Jail 1_2026-05-26-21-00-56.webp'),
    era: 'vtuber',
    artStyle: 'chibi',
  },
];
