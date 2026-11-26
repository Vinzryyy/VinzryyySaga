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
 * Show the game card on /mini-games. Off for now: the game is link-only, so
 * only people given the link find it (PAGES.lemari also keeps it out of
 * search engines). The page itself is always reachable at /mini-games/lemari.
 * To list it again, turn this on and drop `noindex` from PAGES.lemari.
 */
export const LEMARI_IN_HUB = false;

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

/**
 * The Set Panggung a first visit opens with, and Reset goes back to:
 * Eli's current costume (Kinjirareta Futari, Dream Bakudan), so the page
 * never greets people with the bare base drawing.
 */
export const DEFAULT_SET = 'kinjirareta';

/** The commissioned illustrations: base, stage costumes and tee. */
const ILLUSTRATION = 'Ilustrasi: komisi Armeniaca';

/** The base drawing is always on screen, so creditsFor() always lists it. */
export const BASE_CREDIT = ILLUSTRATION;

const stage = { credit: ILLUSTRATION, tags: ['panggung'], unlock: null, draft: false };

export const LEMARI_ITEMS = [
  // Backgrounds: simple vector scenes by Armeniaca, each after a place in
  // Eli's archive; `note` is shown when it is picked.
  { id: 'bg-studio', slot: 'bg', name: 'Studio Krem', file: 'bg_studio', credit: 'Armeniaca', tags: ['santai'], unlock: null, draft: false },
  { id: 'bg-teater', slot: 'bg', name: 'Panggung Teater', file: 'bg_teater', credit: 'Armeniaca', tags: ['panggung'], unlock: null, draft: false, note: 'Theater JKT48 di fX Sudirman, Jakarta: panggung sebagian besar show Eli.' },
  { id: 'bg-teater-sementara', slot: 'bg', name: 'Teater Sementara', file: 'bg_teater-sementara', credit: 'Armeniaca', tags: ['panggung'], unlock: null, draft: false, note: 'Teater Sementara di Surabaya dan Yogyakarta. Show ke-300 Eli digelar di Teater Sementara Surabaya, 7 Juli 2024.' },
  { id: 'bg-konser', slot: 'bg', name: 'Panggung Konser', file: 'bg_konser', credit: 'Armeniaca', tags: ['panggung', 'konser'], unlock: null, draft: false, note: 'Panggung besar seperti Konser Raya Indosiar, Musikaria, dan Request Hour.' },
  { id: 'bg-festival-prambanan', slot: 'bg', name: 'Festival Prambanan', file: 'bg_festival-prambanan', credit: 'Armeniaca', tags: ['panggung', 'festival', 'hujan'], unlock: null, draft: false, note: 'Eli tampil di Prambanan Jazz (6 Juli 2025) dan Electriczone Prambanan (6 Desember 2025).' },
  { id: 'bg-seitansai', slot: 'bg', name: 'Seitansai', file: 'bg_seitansai', credit: 'Armeniaca', tags: ['seitansai', 'manis'], unlock: null, draft: false, note: 'Show ulang tahun di teater. Seitansai Eli terbaru digelar 21 Juni 2026.' },
  { id: 'bg-meet-greet', slot: 'bg', name: 'Meet & Greet', file: 'bg_meet-greet', credit: 'Armeniaca', tags: ['manis'], unlock: null, draft: false, note: 'Meet & Greet, tempat penggemar bertemu Eli langsung.' },
  { id: 'bg-kamar-live', slot: 'bg', name: 'Kamar Live', file: 'bg_kamar-live', credit: 'Armeniaca', tags: ['santai'], unlock: null, draft: false, note: 'Sudut kamar saat live, seperti cermin pink di live Eli 25 November 2026.' },

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

  // Simple vector accessories by Armeniaca, after things that belong to Eli
  // and her fans; `note` is shown when one is worn.
  { id: 'acc-pita-burgundy', slot: 'accHead', name: 'Pita Burgundy', file: 'acc-head_pita-burgundy', credit: 'Armeniaca', tags: ['manis', 'seitansai'], unlock: null, draft: false, note: 'Burgundy, warna utama Armeniaca.' },
  { id: 'acc-bando-emas', slot: 'accHead', name: 'Bando Emas', file: 'acc-head_bando-emas', credit: 'Armeniaca', tags: ['formal'], unlock: null, draft: false },
  { id: 'acc-jepit-kerang', slot: 'accHead', name: 'Jepit Kerang Mutiara', file: 'acc-head_jepit-kerang', credit: 'Armeniaca', tags: ['mermaid', 'manis'], unlock: null, draft: false, note: 'Kerang dan mutiara, untuk Eli yang disebut penggemarnya "our beloved mermaid".' },
  { id: 'acc-mahkota-seitansai', slot: 'accHead', name: 'Mahkota Seitansai', file: 'acc-head_mahkota-seitansai', credit: 'Armeniaca', tags: ['seitansai', 'formal'], unlock: null, draft: false, note: 'Untuk seitansai, show ulang tahun Eli yang lahir 15 Juni.' },
  { id: 'acc-jepit-kucing', slot: 'accHead', name: 'Jepit Kucing', file: 'acc-head_jepit-kucing', credit: 'Armeniaca', tags: ['manis', 'santai'], unlock: null, draft: false, note: 'Untuk TanTan, kucing peliharaan Eli.' },
  { id: 'acc-mahkota-bunga', slot: 'accHead', name: 'Mahkota Bunga Aprikot', file: 'acc-head_mahkota-bunga-aprikot', credit: 'Armeniaca', tags: ['manis', 'seitansai'], unlock: null, draft: false, note: 'Bunga aprikot yang sedang mekar, seperti tagar #BloomInSpring milik Armeniaca.' },
  { id: 'acc-jepit-bintang-laut', slot: 'accHead', name: 'Jepit Bintang Laut', file: 'acc-head_jepit-bintang-laut', credit: 'Armeniaca', tags: ['mermaid', 'manis'], unlock: null, draft: false, note: 'Bintang laut, teman si mermaid.' },
  { id: 'acc-telinga-kucing', slot: 'accHead', name: 'Bando Telinga Kucing', file: 'acc-head_telinga-kucing', credit: 'Armeniaca', tags: ['manis', 'santai'], unlock: null, draft: false, note: 'Telinga kucing, untuk TanTan si kucing Eli.' },
  { id: 'acc-jepit-mutiara', slot: 'accHead', name: 'Jepit Mutiara', file: 'acc-head_jepit-mutiara', credit: 'Armeniaca', tags: ['mermaid', 'formal'], unlock: null, draft: false, note: 'Tiga jepit mutiara, untuk Eli si mermaid.' },
  { id: 'acc-pita-lembayung', slot: 'accHead', name: 'Pita Besar Lembayung', file: 'acc-head_pita-lembayung', credit: 'Armeniaca', tags: ['manis', 'panggung'], unlock: null, draft: false, note: 'Pita besar warna lembayung senja, dari kiasan di catchphrase Eli.' },
  { id: 'acc-pita-polkadot', slot: 'accHead', name: 'Pita Polkadot Pink', file: 'acc-head_pita-polkadot', credit: 'Armeniaca', tags: ['manis'], unlock: null, draft: false },
  { id: 'acc-pita-kembar', slot: 'accHead', name: 'Pita Kembar Aprikot', file: 'acc-head_pita-kembar', credit: 'Armeniaca', tags: ['manis'], unlock: null, draft: false, note: 'Warna aprikot, dari nama Armeniaca.' },
  { id: 'acc-bando-polkadot', slot: 'accHead', name: 'Bando Empuk Polkadot', file: 'acc-head_bando-polkadot', credit: 'Armeniaca', tags: ['manis', 'santai'], unlock: null, draft: false },
  { id: 'acc-telinga-kelinci', slot: 'accHead', name: 'Bando Telinga Kelinci', file: 'acc-head_telinga-kelinci', credit: 'Armeniaca', tags: ['manis', 'santai'], unlock: null, draft: false },
  { id: 'acc-baret', slot: 'accHead', name: 'Baret Burgundy', file: 'acc-head_baret', credit: 'Armeniaca', tags: ['santai', 'formal'], unlock: null, draft: false, note: 'Baret burgundy, warna utama Armeniaca.' },
  { id: 'acc-topi-pesta', slot: 'accHead', name: 'Topi Pesta', file: 'acc-head_topi-pesta', credit: 'Armeniaca', tags: ['seitansai', 'manis'], unlock: null, draft: false, note: 'Topi pesta untuk seitansai Eli, 15 Juni.' },
  { id: 'acc-kalung-aprikot', slot: 'accNeck', name: 'Kalung Bunga Aprikot', file: 'acc-neck_kalung-aprikot', credit: 'Armeniaca', tags: ['manis', 'formal'], unlock: null, draft: false, note: 'Bunga aprikot, asal nama Armeniaca (Prunus armeniaca).' },
  { id: 'acc-kalung-lembayung', slot: 'accNeck', name: 'Kalung Lembayung Senja', file: 'acc-neck_kalung-lembayung', credit: 'Armeniaca', tags: ['formal'], unlock: null, draft: false, note: 'Liontin warna senja, dari kiasan lembayung senja di catchphrase Eli.' },
  { id: 'acc-kalung-mutiara', slot: 'accNeck', name: 'Kalung Mutiara Laut', file: 'acc-neck_kalung-mutiara', credit: 'Armeniaca', tags: ['mermaid', 'formal'], unlock: null, draft: false, note: 'Untaian mutiara dengan kerang kecil, untuk Eli si mermaid.' },
  { id: 'acc-choker-pita', slot: 'accNeck', name: 'Choker Pita Hitam', file: 'acc-neck_choker-pita', credit: 'Armeniaca', tags: ['panggung', 'formal'], unlock: null, draft: false, note: 'Choker hitam, aksesori panggung yang juga ada di kostum Ame no Pianist.' },
  { id: 'acc-syal-handuk', slot: 'accNeck', name: 'Syal Handuk', file: 'acc-neck_syal-handuk', credit: 'Armeniaca', tags: ['konser', 'santai'], unlock: null, draft: false, note: 'Seperti handuk oshi yang dibawa penggemar ke konser.' },
  { id: 'acc-kalung-huruf-e', slot: 'accNeck', name: 'Kalung Huruf E', file: 'acc-neck_kalung-huruf-e', credit: 'Armeniaca', tags: ['manis'], unlock: null, draft: false, note: 'E untuk Eli.' },
  { id: 'acc-dasi-seragam', slot: 'accNeck', name: 'Dasi Pita Seragam', file: 'acc-neck_dasi-seragam', credit: 'Armeniaca', tags: ['panggung', 'manis'], unlock: null, draft: false, note: 'Pita seragam, dari setlist Tunas di Balik Seragam, tempat Eli membawakan Kareha no Station sendirian.' },
  { id: 'acc-gelang-mutiara', slot: 'accHand', name: 'Gelang Mutiara', file: 'acc-hand_gelang-mutiara', credit: 'Armeniaca', tags: ['formal', 'mermaid'], unlock: null, draft: false, note: 'Mutiara, untuk Eli si mermaid.' },
  { id: 'acc-gelang-festival', slot: 'accHand', name: 'Gelang Festival', file: 'acc-hand_gelang-festival', credit: 'Armeniaca', tags: ['festival', 'santai'], unlock: null, draft: false, note: 'Gelang kain festival musik, seperti di Prambanan Jazz 2025 tempat Eli tampil.' },
  { id: 'acc-scrunchie-aprikot', slot: 'accHand', name: 'Scrunchie Aprikot', file: 'acc-hand_scrunchie-aprikot', credit: 'Armeniaca', tags: ['manis', 'santai'], unlock: null, draft: false, note: 'Warna aprikot, warna pohon yang menjadi nama Armeniaca.' },
  { id: 'acc-gelang-lembayung', slot: 'accHand', name: 'Gelang Manik Lembayung', file: 'acc-hand_gelang-lembayung', credit: 'Armeniaca', tags: ['manis'], unlock: null, draft: false, note: 'Manik warna lembayung senja, dari kiasan di catchphrase Eli.' },
  { id: 'acc-gelang-bunga-aprikot', slot: 'accHand', name: 'Gelang Bunga Aprikot', file: 'acc-hand_gelang-bunga-aprikot', credit: 'Armeniaca', tags: ['manis', 'formal'], unlock: null, draft: false, note: 'Tiga bunga aprikot, dari nama Armeniaca.' },
  { id: 'acc-gelang-persahabatan', slot: 'accHand', name: 'Gelang Persahabatan', file: 'acc-hand_gelang-persahabatan', credit: 'Armeniaca', tags: ['santai', 'manis'], unlock: null, draft: false, note: 'Dari lagu Sahabat atau Cinta, duet Eli di setlist Pertaruhan Cinta.' },
  { id: 'acc-gelang-pita', slot: 'accHand', name: 'Gelang Pita Burgundy', file: 'acc-hand_gelang-pita', credit: 'Armeniaca', tags: ['manis'], unlock: null, draft: false, note: 'Pita burgundy, warna utama Armeniaca.' },
  { id: 'acc-jam-tangan', slot: 'accHand', name: 'Jam Tangan', file: 'acc-hand_jam-tangan', credit: 'Armeniaca', tags: ['santai', 'formal'], unlock: null, draft: false, note: 'Jarumnya menunjuk 15.06, tanggal lahir Eli (15 Juni).' },
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
 * `listen` plays a 30-second preview of the song's official JKT48
 * release (not always Eli's voice): Apple's own preview file, played only
 * on tap, with a link to the song on Apple Music. Never put song files in
 * this repo: it is public, and the recordings belong to JKT48. `by` names
 * the recording when it isn't JKT48's own.
 *
 * The Ramune setlist has no official JKT48 release. At the site owner's
 * request, two of its songs play a fan upload of the JKT48 version on
 * YouTube instead (`youtube` id, `channel`, `end` in seconds; embedded via
 * youtube-nocookie on tap, and gone if the upload is removed), and Nice To
 * Meet You plays SKE48's original, the only version that can be played.
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
    listen: {
      title: 'Nice to meet you !',
      by: 'versi asli SKE48',
      album: 'Ramune no Nomikata',
      year: 2012,
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/d3/a2/e1/d3a2e174-0ace-6d03-8f9a-5e0574059b26/mzaf_10585087508234781935.plus.aac.p.m4a',
      link: 'https://music.apple.com/jp/album/nice-to-meet-you/535024232?i=535024402',
    },
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
    listen: {
      title: 'Sang Pianis Hujan',
      album: 'Sambil Menggandeng Erat Tanganku',
      year: 2020,
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/1e/53/76/1e537688-7321-9ff9-fc7c-20b61849ea03/mzaf_10011476502933517106.plus.aac.p.m4a',
      link: 'https://music.apple.com/id/album/sang-pianis-hujan-ame-no-pianist/1673233912?i=1673234172',
    },
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
    listen: {
      title: 'Dua Orang yang Terlarang',
      album: 'Gadis Gadis Remaja',
      year: 2020,
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0d/68/70/0d6870cb-c042-723c-0f72-d8224a889418/mzaf_4756847846399892378.plus.aac.p.m4a',
      link: 'https://music.apple.com/id/album/kinjirareta-futari-dua-orang-yang-terlarang/1707288847?i=1707289179',
    },
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
    listen: {
      title: 'Mawar Natal Musim Panas',
      album: 'Renai Kinshi Jourei',
      year: 2013,
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/86/a0/a9/86a0a901-3a46-61b6-1605-bb86be7eeeae/mzaf_2885070205418359877.plus.aac.p.m4a',
      link: 'https://music.apple.com/id/album/mawar-natal-musim-panas/1665436159?i=1665436506',
    },
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
    listen: { title: 'Menatapmu, Sayonara', youtube: 'WL28NFtXS0I', channel: 'Bread Talking', end: 90 },
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
    listen: {
      title: 'Aturan Anti Cinta',
      album: 'Renai Kinshi Jourei',
      year: 2013,
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/61/65/df/6165df1e-f341-9c48-86e6-a0ee7393f5b5/mzaf_914375744454333897.plus.aac.p.m4a',
      link: 'https://music.apple.com/id/album/aturan-anti-cinta/1665436159?i=1665436496',
    },
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
    listen: {
      title: 'Sahabat atau Cinta',
      album: 'Pertaruhan Cinta',
      year: 2025,
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/50/59/90/50599052-01a7-a2ab-7272-4af4e5e0932e/mzaf_14823116958183249264.plus.aac.p.m4a',
      link: 'https://music.apple.com/id/album/sahabat-atau-cinta/1844370935?i=1844371470',
    },
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
    listen: { title: 'Burung Unta si Pembohong', youtube: 'O0Ub8Jv1gPg', channel: 'Bread Talking', end: 90 },
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
    listen: {
      title: 'Ajak Aku Pergi Menuju ke Wimbledon',
      album: 'Sambil Menggandeng Erat Tanganku',
      year: 2020,
      preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/74/86/19/748619cb-8565-faa7-be0b-51cc10212049/mzaf_2768239644832825714.plus.aac.p.m4a',
      link: 'https://music.apple.com/id/album/ajak-aku-pergi-menuju-ke-wimbledon-wimbledon-he-tsuretette/1673233912?i=1673234168',
    },
    moment: {
      text: 'Unit song kedua Eli, sesudah Romance Kakurenbo di setlist debutnya. Ia membawakannya di setlist Te wo Tsunaginagara dari 23 Februari sampai Juli 2019, sekitar dua bulan setelah debut theater.',
      to: TIMELINE,
    },
  },
];
