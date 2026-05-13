/**
 * Konstanta dimensi Menara Jam — Big Ben silhouette + Gothic Prague
 * ornament (mirip Old Town Hall / Astronomical Clock Tower).
 *
 * Square cross-section shaft (bukan cylindrical), 2 dial stacked di
 * front + back (countdown atas, Orloj calendar bawah), rosette gothic
 * di kiri + kanan, corner pinnacles, Gothic spire.
 *
 * Total height stack (Y): base → shaft → cap cornice → clock chamber
 * (TALL, fit 2 dial stacked) → upper cornice → corner pinnacles +
 * main spire → finial.
 */
export const TOWER = {
  // === BASE ===
  baseWidth: 2.4,
  baseTopWidth: 2.2,
  baseHeight: 0.6,

  // === SHAFT === square, plain stone w/ Gothic windows
  shaftWidth: 1.7,
  shaftHeight: 4.5,

  // === LOWER CORNICE === overhang sebelum clock section
  capWidth: 2.0,
  capHeight: 0.4,

  // === CLOCK CHAMBER === TALLER untuk muat 2 dial stacked
  clockChamberWidth: 1.9,
  clockChamberHeight: 2.8,

  // === UPPER DIAL (countdown) === big, di atas
  upperDialRadius: 0.55,
  // Y offset dari chamber bottom (fraction of chamber height)
  upperDialFrac: 0.72,

  // === LOWER DIAL (Orloj calendar) === smaller, di bawah
  lowerDialRadius: 0.45,
  lowerDialFrac: 0.28,

  // === DIAL geometry shared ===
  dialThickness: 0.1,

  // === ROSETTE WINDOW === kiri/kanan clock chamber, gothic decorative
  rosetteRadius: 0.4,
  // Y offset (fraction of chamber height) — center of chamber
  rosetteFrac: 0.55,
  // Lancet pair (small twin lancets di bawah rosette)
  lancetWidth: 0.16,
  lancetHeight: 0.5,
  lancetGap: 0.14,
  lancetFrac: 0.22,

  // === UPPER CORNICE ===
  upperCorniceWidth: 2.05,
  upperCorniceHeight: 0.3,

  // === CORNER PINNACLES === 4 sudut
  pinnacleWidth: 0.3,
  pinnacleHeight: 1.0,

  // === MAIN SPIRE ===
  spireBaseWidth: 1.1,
  spireHeight: 2.0,

  // === TWIN COMPOSITION === 2 menara identical + balai kota di tengah
  // Tower X offset dari pusat scene. Half = (hallWidth + towerBaseGap)/2.
  twinXOffset: 2.6,

  // Derived ===========================================================
  // Bottom Y of clock chamber
  get chamberBottomY() {
    return this.baseHeight + this.shaftHeight + this.capHeight;
  },
  // Center Y of clock chamber
  get chamberCenterY() {
    return this.chamberBottomY + this.clockChamberHeight / 2;
  },
  // Upper dial center Y
  get upperDialY() {
    return this.chamberBottomY + this.clockChamberHeight * this.upperDialFrac;
  },
  // Lower dial center Y
  get lowerDialY() {
    return this.chamberBottomY + this.clockChamberHeight * this.lowerDialFrac;
  },
  // Rosette center Y (side faces)
  get rosetteY() {
    return this.chamberBottomY + this.clockChamberHeight * this.rosetteFrac;
  },
  // Lancet center Y (below rosette)
  get lancetY() {
    return this.chamberBottomY + this.clockChamberHeight * this.lancetFrac;
  },
  // Clock chamber half-width — buat positioning di tiap sisi
  get clockHalf() {
    return this.clockChamberWidth / 2;
  },
  // Top of clock chamber Y
  get clockTopY() {
    return this.chamberBottomY + this.clockChamberHeight;
  },
  // Spire tip Y
  get topY() {
    return this.clockTopY + this.upperCorniceHeight + this.spireHeight;
  },
};

// === BALAI KOTA === gothic central hall yang menghubungkan dua menara.
// Inspirasi: facade Notre Dame de Paris / Old Town Hall Praha — body
// rectangular dgn pointed-arch doorway sentral, rosette window di atas
// pintu, lancet pair di samping, parapet crenellation + small central
// turret. Tinggi < tower shaft supaya menara nembus skyline.
export const HALL = {
  width: 4.4, // X — span antara dua menara, sedikit overlap di edge
  depth: 2.4, // Z
  height: 3.6, // Y — lebih rendah dari shaftTop (5.5) tower

  // Pointed-arch doorway di front face
  doorwayWidth: 0.9,
  doorwayHeight: 1.7, // termasuk arch tip
  doorwayDepth: 0.16, // recess depth

  // Rosette window di atas pintu (front + back face)
  rosetteRadius: 0.42,
  // Y center fraction of hall height
  rosetteYFrac: 0.72,

  // Lancet windows di sisi kiri/kanan facade depan (flank doorway)
  flankLancetWidth: 0.18,
  flankLancetHeight: 0.95,
  flankLancetXOffset: 0.95, // jarak dari pusat ke center lancet
  flankLancetYFrac: 0.38,

  // Parapet (crenellated top trim)
  parapetHeight: 0.18,
  // Merlon = "gigi" parapet, count along width
  merlonCount: 14,
  merlonWidth: 0.16,
  merlonHeight: 0.14,

  // Central turret/lantern di atap (small octagonal lantern)
  turretBaseRadius: 0.32,
  turretShaftHeight: 0.55,
  turretSpireHeight: 0.7,
  turretFinialRadius: 0.06,

  // Stone trim band di tengah body (decorative horizontal divider)
  midBandHeight: 0.06,
  midBandYFrac: 0.5,

  // Derived
  get topY() {
    return this.height;
  },
  get parapetTopY() {
    return this.height + this.parapetHeight;
  },
  get turretBaseY() {
    return this.parapetTopY;
  },
  get turretSpireBaseY() {
    return this.turretBaseY + this.turretShaftHeight;
  },
  get turretTipY() {
    return this.turretSpireBaseY + this.turretSpireHeight;
  },
};

