/**
 * Konstanta dimensi Menara Jam — basis ground-level visibility. Total
 * tinggi ~8.5 unit, dial di ~6.2 (eye-level lookup dari kamera @ y=2).
 * Dipakai bareng oleh ClockTower (geometry), Pendulum (pivot offset),
 * AnniversaryGlow (halo position), dan ShowtimeIndicator (posisi-7
 * easter egg).
 */
export const TOWER = {
  baseRadius: 1.6,
  baseHeight: 0.4,
  shaftRadiusBottom: 1.1,
  shaftRadiusTop: 0.85,
  shaftHeight: 5.4,
  capRadius: 1.25,
  capHeight: 0.35,
  dialRadius: 0.95,
  dialThickness: 0.12,
  spireHeight: 1.2,
  // Dial center world Y = base + shaft + cap/2 = 0.4 + 5.4 + 0.175 = ~5.97
  dialY: 0.4 + 5.4 + 0.175 + 0.3,
  topY: 0.4 + 5.4 + 0.35 + 1.2,
};
