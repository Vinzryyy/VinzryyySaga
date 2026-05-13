/**
 * Konstanta dimensi Menara Jam — inspirasi Big Ben (Elizabeth Tower).
 *
 * Square cross-section shaft (bukan cylindrical), 4 clock faces — satu
 * di tiap sisi, corner pinnacles, Gothic spire. Proporsi tall + narrow
 * mengikuti Big Ben (96m tall × 12m wide ≈ 8:1 ratio).
 *
 * Total height stack (Y): base → shaft → cap cornice → clock chamber
 * (dgn 4 face) → upper cornice → corner pinnacles (4 sudut) + main
 * spire (center) → finial ball.
 *
 * Dipakai oleh ClockTower (semua mesh geometry), Pendulum (pivot offset
 * di bawah dial), AnniversaryGlow + ShowtimeIndicator (positioned di
 * front clock face).
 */
export const TOWER = {
  // === BASE ===
  baseWidth: 2.4,
  baseTopWidth: 2.2, // slight inward taper bottom→top
  baseHeight: 0.6,

  // === SHAFT === square, plain stone w/ Gothic windows
  shaftWidth: 1.7,
  shaftHeight: 4.5,

  // === LOWER CORNICE === overhang sebelum clock section
  capWidth: 2.0,
  capHeight: 0.4,

  // === CLOCK CHAMBER === house 4 dials, wider than shaft
  clockChamberWidth: 1.9,
  clockChamberHeight: 1.4,

  // === DIAL === circular face per side of clock chamber
  dialRadius: 0.55,
  dialThickness: 0.1,

  // === UPPER CORNICE === di atas clock chamber, base buat pinnacles
  upperCorniceWidth: 2.05,
  upperCorniceHeight: 0.3,

  // === CORNER PINNACLES === 4 sudut, gothic spire kecil
  pinnacleWidth: 0.3,
  pinnacleHeight: 1.0,

  // === MAIN SPIRE === center, taller dramatic pyramid
  spireBaseWidth: 1.1,
  spireHeight: 2.0,

  // Derived ===========================================================
  // Dial center Y = base + shaft + cap + clockChamber/2
  get dialY() {
    return this.baseHeight + this.shaftHeight + this.capHeight + this.clockChamberHeight / 2;
  },
  // Clock chamber half-width — buat positioning 4 face di tiap sisi
  get clockHalf() {
    return this.clockChamberWidth / 2;
  },
  // Top of clock chamber Y — anchor untuk upper cornice + pinnacles
  get clockTopY() {
    return this.baseHeight + this.shaftHeight + this.capHeight + this.clockChamberHeight;
  },
  // Spire tip Y
  get topY() {
    return this.clockTopY + this.upperCorniceHeight + this.spireHeight;
  },
};
