/**
 * Konstanta dimensi Menara Jam — **Japanese yagura** (castle watchtower)
 * silhouette dgn dual shoji dial. Twin yagura flanking a **honden**
 * (shrine main hall). Tema match `/armeniacaTown/peta` (Japanese garden
 * elements: tsukubai, jizo, torii, koi, omikuji, bamboo, paper lanterns).
 *
 * YAGURA stack (Y bottom→top):
 *   ishigaki base (sloped masonry) → tier-1 wood/plaster shaft → mid
 *   eaves roof (irimoya hip-and-gable) → clock chamber (2 shoji dials
 *   stacked di front+back; kōshi lattice di sisi) → top irimoya roof →
 *   sōrin finial spire (rings + hōju jewel).
 *
 * HONDEN: wooden raised hall di antara dua yagura — curved roof dgn
 * chigi forked finials + katsuogi logs, kara-hafu cusped gable doorway,
 * kōshi lattice walls.
 */
export const TOWER = {
  // === ISHIGAKI BASE === sloped castle stone masonry, narrower at top
  baseWidth: 2.6, // bottom width
  baseTopWidth: 2.0, // top width (narrowed — slope)
  baseHeight: 0.9,

  // === TIER-1 SHAFT === wood frame + plaster (white shikkui)
  shaftWidth: 1.7,
  shaftHeight: 3.5,
  // Wooden vertical beam thickness (visible exterior framing)
  beamThickness: 0.05,
  // Horizontal nuki band thickness (mid-shaft horizontal beam)
  nukiThickness: 0.06,

  // === MID EAVES ROOF === irimoya wrapping around top of tier-1 shaft
  midEavesWidth: 2.4, // outer span (wider than shaft — overhang)
  midEavesHeight: 0.32, // roof slab thickness
  midEavesUpturn: 0.18, // corner upturn extra at edge

  // === CLOCK CHAMBER === houses 2 shoji dials stacked (front+back)
  // sides = kōshi-mado lattice wood window
  clockChamberWidth: 1.9,
  clockChamberHeight: 2.8,

  // === UPPER DIAL (countdown) === shoji circular window
  upperDialRadius: 0.55,
  upperDialFrac: 0.72,
  // === LOWER DIAL (Orloj-equivalent calendar) === smaller shoji
  lowerDialRadius: 0.45,
  lowerDialFrac: 0.28,
  dialThickness: 0.1,

  // === KŌSHI-MADO === wood-lattice window for side walls (square wood
  // grid window, traditional Japanese architecture)
  koshiSize: 0.62, // square window edge
  koshiYFrac: 0.55,
  koshiGridDivisions: 6, // 6×6 lattice grid

  // === TOP ROOF === main irimoya at top of clock chamber
  topRoofWidth: 2.55,
  topRoofHeight: 0.45,
  topRoofUpturn: 0.28,

  // === SŌRIN FINIAL === pagoda-style metal spire dgn 9 rings + hōju
  sorinShaftRadius: 0.04,
  sorinShaftHeight: 1.2,
  sorinRingRadius: 0.16,
  sorinRingThickness: 0.02,
  sorinRingCount: 9,
  sorinJewelRadius: 0.13,

  // === TWIN COMPOSITION === 2 menara identical + honden di tengah
  twinXOffset: 2.6,

  // Derived ===========================================================
  // Bottom Y of clock chamber (after base + shaft + mid-eaves)
  get chamberBottomY() {
    return this.baseHeight + this.shaftHeight + this.midEavesHeight;
  },
  get chamberCenterY() {
    return this.chamberBottomY + this.clockChamberHeight / 2;
  },
  get upperDialY() {
    return this.chamberBottomY + this.clockChamberHeight * this.upperDialFrac;
  },
  get lowerDialY() {
    return this.chamberBottomY + this.clockChamberHeight * this.lowerDialFrac;
  },
  get koshiY() {
    return this.chamberBottomY + this.clockChamberHeight * this.koshiYFrac;
  },
  get clockHalf() {
    return this.clockChamberWidth / 2;
  },
  // Top of clock chamber Y — anchor utk top roof
  get clockTopY() {
    return this.chamberBottomY + this.clockChamberHeight;
  },
  // Top of top-roof Y — anchor utk sōrin base
  get topRoofTopY() {
    return this.clockTopY + this.topRoofHeight;
  },
  // Sōrin tip Y
  get topY() {
    return this.topRoofTopY + this.sorinShaftHeight + this.sorinJewelRadius * 2;
  },
};

// === HONDEN === shrine main hall di tengah twin yagura. Style: wooden
// raised structure dgn curved roof, chigi + katsuogi ridge ornaments,
// kara-hafu (cusped gable) doorway, kōshi lattice walls.
export const HALL = {
  width: 4.4, // X — span antara dua yagura
  depth: 2.6, // Z
  bodyHeight: 2.6, // wooden body height (di atas stone base)

  // Stone base (raised platform) — kasarakeyaku style stone podium
  baseHeight: 0.4,
  baseOverhang: 0.15, // ledge beyond body footprint

  // Engawa (wooden veranda) di front + sides — narrow walkway raised
  engawaHeight: 0.05,
  engawaDepth: 0.25,

  // Wooden pillar (hashira) — 6 pillars di front, supporting eaves
  pillarRadius: 0.08,
  pillarCount: 6, // along front length

  // Kara-hafu doorway — cusped/ogee-curved gable above entrance
  doorwayWidth: 1.0,
  doorwayHeight: 1.6,
  karahafuHeight: 0.5, // ogee curve cap above lintel

  // Kōshi lattice wall panels — between pillars
  koshiPanelHeight: 1.4, // height of lattice section
  koshiPanelYStart: 0.3, // from body bottom
  koshiPanelDivisions: 5, // grid divisions per panel

  // Main roof — irimoya curved hip-and-gable, deep overhanging eaves
  roofWidth: 5.2, // wider than body — deep eaves overhang
  roofDepth: 3.6,
  roofHeight: 0.55,
  roofUpturn: 0.3, // corner upturn extra

  // Chigi (forked roof finials) — X-shaped projections at gable ends
  chigiHeight: 0.55,
  chigiThickness: 0.04,

  // Katsuogi (cylindrical logs along roof ridge) — 3 logs
  katsuogiCount: 3,
  katsuogiRadius: 0.06,
  katsuogiLength: 0.5,

  // Derived
  get bodyTopY() {
    return this.baseHeight + this.bodyHeight;
  },
  get roofBaseY() {
    return this.bodyTopY;
  },
  get roofTopY() {
    return this.bodyTopY + this.roofHeight;
  },
  get chigiTopY() {
    return this.roofTopY + this.chigiHeight;
  },
};
