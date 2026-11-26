/**
 * Lemari Eli — wardrobe data for the dress-up game (/mini-games/lemari).
 *
 * Every layer file lives in public/minigames/lemari/{full,thumb}/<file>.webp,
 * built from assets/lemari/ by scripts/build-lemari-assets.mjs. All layers
 * share base_body's canvas, so they are stacked at 0,0 without offsets.
 * Illustrator brief and how to add an item: docs/lemari-eli.md.
 *
 * Item:
 *   id       unique, kebab-case; used in share links, never rename
 *   slot     one of SLOTS keys
 *   name     shown in the wardrobe and alt text
 *   file     layer file name without extension
 *   setId?   the Set Panggung it belongs to
 *   credit   who drew it (kept for the record; the game prints no credits)
 *   tags     theme tags, for Tema Hari Ini (phase 2, unused for now)
 *   unlock   null = open; reserved for Koleksi (phase 2)
 *   draft    true = placeholder art, shown with a "draft" label
 *   tintable true = can be recoloured with TINTS
 */

/**
 * Show the game card on /mini-games. Turn it off while the wardrobe is only
 * draft art; the page itself is always reachable at /mini-games/lemari.
 */
export const LEMARI_IN_HUB = true;

export const ASSET_BASE = '/minigames/lemari';
export const fullSrc = (file) => `${ASSET_BASE}/full/${file}.webp`;
export const thumbSrc = (file) => `${ASSET_BASE}/thumb/${file}.webp`;

/** Width / height of the shared canvas (manifest.json `canvas`; a test checks they agree). */
export const CANVAS_ASPECT = 1240 / 1754;

export const BASE_LAYERS = { body: 'base_body' };

/** Wardrobe tabs, in display order. */
export const SLOTS = [
  { key: 'dress', label: 'Dress', icon: 'ri-t-shirt-air-line' },
  { key: 'top', label: 'Atasan', icon: 'ri-t-shirt-line' },
  { key: 'bottom', label: 'Bawahan', icon: 'ri-layout-bottom-line' },
  { key: 'outer', label: 'Luaran', icon: 'ri-shirt-line' },
  { key: 'shoes', label: 'Sepatu', icon: 'ri-footprint-line' },
  { key: 'accHead', label: 'Aksesori Kepala', icon: 'ri-vip-crown-2-line' },
  { key: 'accNeck', label: 'Aksesori Leher', icon: 'ri-heart-3-line' },
  { key: 'accHand', label: 'Aksesori Tangan', icon: 'ri-hand-heart-line' },
  { key: 'bg', label: 'Latar', icon: 'ri-landscape-line' },
];

/**
 * Bottom → top. 'body' is the base layer; the illustrated base keeps all of
 * the hair behind the shoulders, so clothes never cover it. A bracelet sits
 * on the skin, under sleeves, gloves and the skirts drawn in front of the
 * hands.
 */
export const LAYER_ORDER = ['bg', 'body', 'accHand', 'bottom', 'top', 'dress', 'outer', 'shoes', 'accHead', 'accNeck'];

/**
 * Colour variants for tintable items, done with CSS filters on the layer
 * (so one drawing gives several colours). `swatch` is the dot shown in
 * the picker. Never rename an id: share links use it.
 */
export const TINTS = [
  { id: 'asli', label: 'Asli', swatch: 'linear-gradient(135deg,#f4f1ec 50%,#2b2b2b 50%)', filter: null },
  { id: 'burgundy', label: 'Burgundy', swatch: '#8a2a33', filter: 'sepia(1) saturate(3) hue-rotate(-45deg) brightness(0.65) contrast(1.1)' },
  { id: 'emas', label: 'Emas', swatch: '#c9a646', filter: 'sepia(1) saturate(1.8) hue-rotate(5deg) brightness(0.95)' },
  { id: 'aprikot', label: 'Aprikot', swatch: '#f0a060', filter: 'sepia(0.8) saturate(1.8) hue-rotate(-15deg) brightness(1.08)' },
  { id: 'biru', label: 'Biru Dream', swatch: '#34507e', filter: 'sepia(1) saturate(2) hue-rotate(185deg) brightness(0.8)' },
  { id: 'lavender', label: 'Lavender', swatch: '#a99ad6', filter: 'sepia(0.9) saturate(1.8) hue-rotate(215deg) brightness(1.02)' },
];

export const DEFAULT_BG = 'bg-studio';

/** The commissioned illustrations: base, stage costumes and tee. */
const ILLUSTRATION = 'Ilustrasi: komisi Armeniaca';

/** The base drawing is always on screen, so creditsFor() always lists it. */
export const BASE_CREDIT = ILLUSTRATION;

const stage = { credit: ILLUSTRATION, tags: ['panggung'], unlock: null, draft: false };

export const LEMARI_ITEMS = [
  { id: 'bg-studio', slot: 'bg', name: 'Studio Krem', file: 'bg_studio', credit: 'Armeniaca', tags: ['santai'], unlock: null, draft: false },
  { id: 'bg-teater', slot: 'bg', name: 'Panggung Teater', file: 'bg_teater', credit: 'Armeniaca', tags: ['panggung'], unlock: null, draft: false },

  // Stage costumes. The illustrator drew each look as one file; it was split
  // into its dress and its shoes (scripts/split-lemari-look.mjs).
  { ...stage, id: 'dress-ntmu-isshou', slot: 'dress', name: 'Dress Nice To Meet You', file: 'dress_ntmu-isshou', setId: 'ntmu-isshou', tags: ['panggung', 'formal'], tintable: true },
  { ...stage, id: 'dress-ame-no-pianist', slot: 'dress', name: 'Dress Ame no Pianist', file: 'dress_ame-no-pianist', setId: 'ame-no-pianist' },
  { ...stage, id: 'dress-kinjirareta', slot: 'dress', name: 'Dress Kinjirareta', file: 'dress_kinjirareta', setId: 'kinjirareta', tintable: true },
  { ...stage, id: 'dress-manatsu', slot: 'dress', name: 'Dress Manatsu', file: 'dress_manatsu', setId: 'manatsu' },
  { ...stage, id: 'dress-manazashi-sayonara', slot: 'dress', name: 'Dress Manazashi Sayonara', file: 'dress_manazashi-sayonara', setId: 'manazashi-sayonara' },
  { ...stage, id: 'dress-rkj', slot: 'dress', name: 'Dress RKJ', file: 'dress_rkj', setId: 'rkj' },
  { ...stage, id: 'dress-sahabat-atau-cinta', slot: 'dress', name: 'Dress Sahabat atau Cinta', file: 'dress_sahabat-atau-cinta', setId: 'sahabat-atau-cinta' },
  { ...stage, id: 'dress-usotsuki-na-dachou', slot: 'dress', name: 'Dress Usotsuki na Dachou', file: 'dress_usotsuki-na-dachou', setId: 'usotsuki-na-dachou' },
  { ...stage, id: 'dress-wimbledon', slot: 'dress', name: 'Dress Wimbledon', file: 'dress_wimbledon', setId: 'wimbledon' },

  { ...stage, id: 'top-kaos-hitam', slot: 'top', name: 'Kaos Hitam', file: 'top_kaos-hitam', tags: ['santai'] },

  { ...stage, id: 'shoes-boots-hitam', slot: 'shoes', name: 'Ankle Boots Hitam', file: 'shoes_boots-hitam', setId: 'ntmu-isshou', tags: ['panggung', 'hujan'] },
  { ...stage, id: 'shoes-boots-tali-hitam', slot: 'shoes', name: 'Boots Tali Hitam', file: 'shoes_boots-tali-hitam', setId: 'ame-no-pianist' },
  // One pair, drawn for both Manatsu and RKJ.
  { ...stage, id: 'shoes-boots-tali-hitam-lancip', slot: 'shoes', name: 'Boots Tali Hitam Lancip', file: 'shoes_boots-tali-hitam-lancip' },
  { ...stage, id: 'shoes-boots-tali-putih', slot: 'shoes', name: 'Boots Tali Putih', file: 'shoes_boots-tali-putih', setId: 'wimbledon' },
  { ...stage, id: 'shoes-flat-putih', slot: 'shoes', name: 'Flat Shoes Putih', file: 'shoes_flat-putih', setId: 'kinjirareta' },
  { ...stage, id: 'shoes-sandal-hak-hitam', slot: 'shoes', name: 'Sandal Hak Hitam', file: 'shoes_sandal-hak-hitam', setId: 'manazashi-sayonara' },
  { ...stage, id: 'shoes-sandal-t-strap', slot: 'shoes', name: 'Sandal T-Strap Hitam', file: 'shoes_sandal-t-strap', setId: 'sahabat-atau-cinta' },
  { ...stage, id: 'shoes-ankle-boots-putih', slot: 'shoes', name: 'Ankle Boots Putih', file: 'shoes_ankle-boots-putih', setId: 'usotsuki-na-dachou' },

  // Simple vector accessories by Armeniaca.
  { id: 'acc-pita-burgundy', slot: 'accHead', name: 'Pita Burgundy', file: 'acc-head_pita-burgundy', credit: 'Armeniaca', tags: ['manis', 'seitansai'], unlock: null, draft: false },
  { id: 'acc-bando-emas', slot: 'accHead', name: 'Bando Emas', file: 'acc-head_bando-emas', credit: 'Armeniaca', tags: ['formal'], unlock: null, draft: false },
  { id: 'acc-kalung-aprikot', slot: 'accNeck', name: 'Kalung Bunga Aprikot', file: 'acc-neck_kalung-aprikot', credit: 'Armeniaca', tags: ['manis', 'formal'], unlock: null, draft: false },
  { id: 'acc-gelang-mutiara', slot: 'accHand', name: 'Gelang Mutiara', file: 'acc-hand_gelang-mutiara', credit: 'Armeniaca', tags: ['formal'], unlock: null, draft: false },
];

/**
 * Set Panggung: a full stage look in one tap. Each costume is from a unit
 * song Eli performed in theater. `moment` tells that story, from her show
 * record (400 shows, up to 24 July 2026); `moment.to` links to the
 * milestone on her timeline when the story has one. null = not verified
 * yet (the game then says the story is coming).
 *
 * `about` says in one line what the song tells, in our own words (never a
 * lyric line). It is shown with the story and printed on the share card,
 * so it stays under ABOUT_MAX characters. Leave it out until verified.
 * The current lines were written from the lyrics: the Japanese originals
 * (j-lyric.net, utaten.com) and JKT48's Indonesian versions, which tell
 * the same stories.
 *
 * 'ntmu-isshou' keeps the first draft's file name: "isshou" (衣装) means
 * costume, and NTMU was a typo for NTMY, Nice To Meet You.
 */
const TIMELINE = '/profile#timeline';

/** Longest `about` line that fits the share card in two lines. */
export const ABOUT_MAX = 100;

export const LEMARI_SETS = [
  {
    id: 'ntmu-isshou',
    name: 'Nice To Meet You',
    items: ['dress-ntmu-isshou', 'shoes-boots-hitam'],
    bg: 'bg-teater',
    about: 'Rasa syukur bertemu sahabat terbaik, teman seperjalanan yang menguatkan di saat sulit.',
    moment: {
      text: 'Unit song di setlist Ramune no Nomikata. Eli mulai membawakannya di show #RamuneRefilled pada 15 Januari 2023, paling sering bersama Muthe, Lia, Adel, dan Indira, lalu menjadi center-nya pada 1 Juni 2024.',
    },
  },
  {
    id: 'ame-no-pianist',
    name: 'Ame no Pianist',
    items: ['dress-ame-no-pianist', 'shoes-boots-tali-hitam'],
    bg: 'bg-teater',
    about: 'Patah hati pertama: diputus halus oleh pacar yang lebih dewasa, ditemani rintik hujan.',
    moment: {
      text: 'Unit song di setlist Te wo Tsunaginagara. Eli mulai membawakannya pada 1 Februari 2025, paling sering bersama Marsha dan Raisha, dan membawakannya lagi di show pertamanya sebagai member Team Dream, 10 April 2026.',
    },
  },
  {
    id: 'kinjirareta',
    name: 'Kinjirareta Futari',
    items: ['dress-kinjirareta', 'shoes-flat-putih'],
    bg: 'bg-teater',
    about: 'Cinta terlarang yang tak direstui dunia; berdua mereka pergi ke danau yang sunyi.',
    moment: {
      text: 'Kinjirareta Futari, atau Dua Orang yang Terlarang, adalah duet Eli dan Greesel di Dream Bakudan, setlist pertama Team Dream. Mereka membawakannya sejak shonichi setlist itu pada 18 April 2026, sampai ke Teater Sementara Surabaya dan Yogyakarta.',
      to: TIMELINE,
    },
  },
  {
    id: 'manatsu',
    name: 'Manatsu no Christmas Rose',
    items: ['dress-manatsu', 'shoes-boots-tali-hitam-lancip'],
    bg: 'bg-teater',
    about: 'Mawar Natal di musim panas membuatnya teringat ciuman pertama dan cinta yang kandas.',
    moment: {
      text: 'Unit song di setlist Renai Kinshi Jourei. Eli membawakannya selama lebih dari empat tahun, sejak 20 Maret 2021, dan menjadi center-nya mulai 4 September 2022.',
    },
  },
  {
    id: 'manazashi-sayonara',
    name: 'Manazashi Sayonara',
    items: ['dress-manazashi-sayonara', 'shoes-sandal-hak-hitam'],
    bg: 'bg-teater',
    about: 'Putus di tengah hujan: ia memilih melepas kekasihnya supaya tak makin melukainya.',
    moment: {
      text: 'Duet di setlist Ramune no Nomikata. Eli pertama membawakannya bersama Adel pada 2 Oktober 2024, lalu bersama Lulu, Indah, dan Oline. Show ke-400 Eli, 24 Juli 2026, juga dengan lagu ini.',
      to: TIMELINE,
    },
  },
  {
    id: 'rkj',
    name: 'Renai Kinshi Jourei',
    items: ['dress-rkj', 'shoes-boots-tali-hitam-lancip'],
    bg: 'bg-teater',
    about: 'Diam-diam pacaran di geng yang melarang cinta, dan larangan itu justru menyulut asmara.',
    moment: {
      text: 'Lagu yang menjadi judul setlist Renai Kinshi Jourei, dibawakan sebagai unit. Eli mulai membawakannya pada 9 Oktober 2021, mencapai show ke-200 dengan lagu ini pada 20 November 2021, dan menjadi center-nya mulai 12 September 2024.',
      to: TIMELINE,
    },
  },
  {
    id: 'sahabat-atau-cinta',
    name: 'Sahabat atau Cinta',
    items: ['dress-sahabat-atau-cinta', 'shoes-sandal-t-strap'],
    bg: 'bg-teater',
    about: 'Dua sahabat jatuh hati pada orang yang sama, lalu harus memilih: persahabatan atau cinta.',
    moment: {
      text: 'Duet dari Pertaruhan Cinta, setlist original JKT48. Eli membawakannya sejak shonichi pada 12 Oktober 2025 bersama Kathrina, lalu bersama Christy, termasuk di show ulang tahunnya sendiri pada 21 Juni 2026.',
      to: TIMELINE,
    },
  },
  {
    id: 'usotsuki-na-dachou',
    name: 'Usotsuki na Dachou',
    items: ['dress-usotsuki-na-dachou', 'shoes-ankle-boots-putih'],
    bg: 'bg-teater',
    about: 'Ia tahu cowok yang ditaksirnya cuma pura-pura polos dan ramah ke semua, demi lari dari cinta.',
    moment: {
      text: 'Unit song di setlist Ramune no Nomikata yang paling lama menemani Eli: lebih dari lima tahun, sejak 15 November 2020. Show ke-300-nya pada 7 Juli 2024 di Teater Sementara Surabaya juga dengan lagu ini, dan sejak Juni 2024 ia beberapa kali menjadi center-nya.',
      to: TIMELINE,
    },
  },
  {
    id: 'wimbledon',
    name: 'Wimbledon e Tsureteitte',
    items: ['dress-wimbledon', 'shoes-boots-tali-putih'],
    bg: 'bg-teater',
    about: 'Diam-diam naksir cowok petenis di kereta ke sekolah, ia bermimpi diajak ke Wimbledon.',
    moment: {
      text: 'Unit song kedua Eli, sesudah Romance Kakurenbo di setlist debutnya. Ia membawakannya di setlist Te wo Tsunaginagara dari 23 Februari sampai Juli 2019, sekitar dua bulan setelah debut theater.',
      to: TIMELINE,
    },
  },
];
