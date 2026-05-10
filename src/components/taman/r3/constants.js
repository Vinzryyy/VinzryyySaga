/**
 * Konstanta dimensi & palette untuk scene Telaga Harapan (R3).
 * Di-share antar banyak component, jadi diisolasi di sini supaya
 * component file bisa import tanpa bergantung ke order definisi.
 */

// Dimensi danau utama — lebar 20 supaya pond kerasa luas dari overhead
export const RIVER_WIDTH = 20;
export const RIVER_LENGTH = 28;

// Bridge: kayu kecil melintasi ujung utara danau (z negatif)
export const BRIDGE_Z = -12.5;
export const BRIDGE_SPAN = 16;

// Lily pad drift downstream — wrap dari FLOW_END_Z balik ke
// FLOW_START_Z. FLOW_START_Z di -10.5 supaya pad nggak masuk
// area bridge (z=-12.5 ± 0.8). Pad center radius max 0.95,
// jadi pad terutara extend ke z=-11.45 — masih 0.25u south of
// bridge front -11.7.
export const FLOW_SPEED = 0.03; // unit per detik
export const FLOW_END_Z = 12;
export const FLOW_START_Z = -10.5;

// Palet teratai bloom — variasi pink/peach/cream/lavender supaya
// telaga kerasa kayak ladang teratai mekar, bukan stamping.
export const BLOOM_COLORS = [
  '#f4a8c0', // pink
  '#f4c890', // peach
  '#f5e0c0', // warm cream
  '#d4a8e0', // lavender
  '#f48ba0', // dusty rose
  '#f4d870', // sunny yellow
];
// Daun teratai — variasi hijau cerah (siang) untuk match daytime mood
export const LEAF_COLORS = ['#5a8045', '#6e9358', '#4f7438', '#65884d'];

// Wildflower scattered di banks
export const WILDFLOWER_COLORS = [
  '#f4d870', // dandelion yellow
  '#ffffff', // white daisy
  '#e89bb8', // pink wildflower
  '#9bb8e8', // blue wildflower
  '#c89be8', // purple wildflower
  '#f4a570', // soft orange
];
