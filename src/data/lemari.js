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
 *   credit   illustration credit (printed on the share card)
 *   tags     theme tags, for Tema Hari Ini (phase 2, unused for now)
 *   unlock   null = open; reserved for Koleksi (phase 2)
 *   draft    true = placeholder art, shown with a "draft" label
 *   tintable true = can be recoloured with TINTS
 */

/**
 * Show the game card on /mini-games. Off while the art is draft; the page
 * itself is always reachable at /mini-games/lemari for testing.
 */
export const LEMARI_IN_HUB = false;

export const ASSET_BASE = '/minigames/lemari';
export const fullSrc = (file) => `${ASSET_BASE}/full/${file}.webp`;
export const thumbSrc = (file) => `${ASSET_BASE}/thumb/${file}.webp`;

/** Width / height of the shared canvas (base_body). */
export const CANVAS_ASPECT = 342 / 730;

export const BASE_LAYERS = { body: 'base_body', hairFront: 'base_hair-front' };

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
 * Bottom → top. 'body' and 'hairFront' are the base layers; the hair in
 * front of the shoulders sits above clothes so long hair isn't covered.
 */
export const LAYER_ORDER = ['bg', 'body', 'bottom', 'top', 'dress', 'outer', 'shoes', 'hairFront', 'accHead', 'accNeck', 'accHand'];

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

const DRAFT_CREDIT = 'Ilustrasi: kontributor Armeniaca (draft)';

export const LEMARI_ITEMS = [
  { id: 'bg-studio', slot: 'bg', name: 'Studio Krem', file: 'bg_studio', credit: 'Armeniaca', tags: ['santai'], unlock: null, draft: false },
  { id: 'bg-teater', slot: 'bg', name: 'Panggung Teater', file: 'bg_teater', credit: 'Armeniaca', tags: ['panggung'], unlock: null, draft: false },
  {
    id: 'dress-ntmu-isshou',
    slot: 'dress',
    name: 'Dress Zebra NTMU',
    file: 'dress_ntmu-isshou',
    setId: 'ntmu-isshou',
    credit: DRAFT_CREDIT,
    tags: ['panggung', 'formal'],
    unlock: null,
    draft: true,
    tintable: true,
  },
  {
    id: 'shoes-boots-hitam',
    slot: 'shoes',
    name: 'Boots Hitam',
    file: 'shoes_boots-hitam',
    setId: 'ntmu-isshou',
    credit: DRAFT_CREDIT,
    tags: ['panggung', 'hujan'],
    unlock: null,
    draft: true,
  },
  { id: 'acc-pita-burgundy', slot: 'accHead', name: 'Pita Burgundy', file: 'acc-head_pita-burgundy', credit: 'Armeniaca', tags: ['manis', 'seitansai'], unlock: null, draft: false },
  { id: 'acc-bando-emas', slot: 'accHead', name: 'Bando Emas', file: 'acc-head_bando-emas', credit: 'Armeniaca', tags: ['formal'], unlock: null, draft: false },
  { id: 'acc-kalung-aprikot', slot: 'accNeck', name: 'Kalung Bunga Aprikot', file: 'acc-neck_kalung-aprikot', credit: 'Armeniaca', tags: ['manis', 'formal'], unlock: null, draft: false },
  { id: 'acc-gelang-mutiara', slot: 'accHand', name: 'Gelang Mutiara', file: 'acc-hand_gelang-mutiara', credit: 'Armeniaca', tags: ['formal'], unlock: null, draft: false },
];

/**
 * Set Panggung: a full stage look in one tap. `moment` tells where Eli
 * wore it (null until verified; the game then says the story is coming).
 */
export const LEMARI_SETS = [
  {
    id: 'ntmu-isshou',
    name: 'NTMU Isshou',
    items: ['dress-ntmu-isshou', 'shoes-boots-hitam'],
    bg: 'bg-teater',
    moment: null,
  },
];
