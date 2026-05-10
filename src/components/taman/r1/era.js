/**
 * Era definitions + sky position math untuk Konstelasi Perjalanan.
 *
 * 7 era career Eli, masing-masing jadi 1 konstelasi di langit.
 * Distribute evenly di celestial sphere 360° keliling user.
 * Spacing 2π/7 ≈ 51.4° per era. Chronological clockwise (viewed
 * from above): Trainee di forward, sweep ke kanan via Theater →
 * Senbatsu → New Era (back-right), wrap ke Mature (back-left) →
 * Variety (left) → Fight (front-left). User pan camera = lihat
 * perjalanan wrap around them.
 */

import { hashSeed, lerpHexColor } from './utils';

// Sky dome centered around orbit target supaya user "berdiri di
// tengah" dunia bulat — pan camera = lihat sisi sky berbeda.
// SKY_CENTER align dengan ORBIT_TARGET di utils.
export const SKY_RADIUS = 11;
export const SKY_CENTER = [0, 5, -10];

// azimuth = sudut horizontal dari -z (forward of garden),
// counterclockwise viewed from above. altitude 0..1 = horizon..zenith.
// Color = palette dominant per era; bintang individual mendapat
// gradient seputar warna ini. spread = scatter radius bintang dari
// center konstelasi (radian). Order matters — milestoneIds urutannya
// kronologis, line connections membentuk line dari oldest ke newest.
export const ERA_DEFS = [
  {
    id: 'trainee',
    name: 'Trainee',
    color: '#a8c0ff',
    azimuth: 0, // forward
    altitude: 0.32,
    spread: 0.22,
    milestoneIds: ['audition', 'sousenkyo-2018', 'class-a'],
  },
  {
    id: 'theater',
    name: 'Theater',
    color: '#ffcc88',
    azimuth: 0.898, // front-right ~51°
    altitude: 0.40,
    spread: 0.18,
    milestoneIds: ['theater-debut', 'team-kiii'],
  },
  {
    id: 'senbatsu',
    name: 'Senbatsu',
    color: '#ff9ec0',
    azimuth: 1.795, // right ~103°
    altitude: 0.34,
    spread: 0.18,
    milestoneIds: ['show-100', 'first-senbatsu'],
  },
  {
    id: 'new-era',
    name: 'New Era',
    color: '#a4e8d0',
    azimuth: 2.693, // back-right ~154°
    altitude: 0.42,
    spread: 0.22,
    milestoneIds: ['new-formation-2021', 'darashinai-aishikata', 'show-200'],
  },
  {
    id: 'mature',
    name: 'Mature',
    color: '#d8a8ff',
    azimuth: -2.693, // back-left ~-154°
    altitude: 0.36,
    spread: 0.26,
    milestoneIds: [
      'sayonara-crawl',
      'spv-langit-biru-2024',
      'show-300',
      'undergirl-bibir-2024',
    ],
  },
  {
    id: 'variety',
    name: 'Variety',
    color: '#ffe6a0',
    azimuth: -1.795, // left ~-103°
    altitude: 0.28,
    spread: 0.18,
    milestoneIds: ['belajar-konseling', 'pertaruhan-cinta-shonichi'],
  },
  {
    id: 'fight',
    name: 'JKT48 Fight',
    color: '#ff9080',
    azimuth: -0.898, // front-left ~-51°
    altitude: 0.30,
    spread: 0.30,
    milestoneIds: [
      'three-team-announce',
      'fight-tagline',
      'team-dream',
      'dream-bakudan-shonichi',
      'show-400',
    ],
  },
];

// Build flat lookup: milestoneId → { eraIdx, posInEra, eraDef }.
// Dipake saat compute star position deterministic per milestone.
export const ERA_LOOKUP = (() => {
  const map = new Map();
  ERA_DEFS.forEach((era, eraIdx) => {
    era.milestoneIds.forEach((mid, posInEra) => {
      map.set(mid, { eraIdx, posInEra, eraDef: era });
    });
  });
  return map;
})();

// Convert (azimuth, altitude) → world XYZ on sky dome of SKY_RADIUS,
// centered at SKY_CENTER. User stands di SKY_CENTER, pan camera 360°
// untuk lihat semua bintang (full celestial sphere around user).
// Azimuth 0 = -z (forward of original scene), positive = +x (right),
// negative = -x (left). Wrap to behind user via |azimuth| > π/2.
export const skyPosition = (azimuth, altitude) => {
  const pitch = altitude * (Math.PI / 2); // 0=horizon, π/2=zenith
  const horizR = SKY_RADIUS * Math.cos(pitch);
  const y = SKY_CENTER[1] + SKY_RADIUS * Math.sin(pitch);
  const x = SKY_CENTER[0] + horizR * Math.sin(azimuth);
  const z = SKY_CENTER[2] - horizR * Math.cos(azimuth);
  return [x, y, z];
};

// Position milestone — chronological azimuth (oldest kiri → newest
// kanan dalam era, subtle weight) + random jitter dari hash. Hasil:
// stars terdistribusi natural dalam era spread, line connections
// (oldest→newest) tetep mostly L→R sehingga gak ngerajut chaotic.
export const milestoneSkyPosition = (milestoneId) => {
  const info = ERA_LOOKUP.get(milestoneId);
  if (!info) return [0, SKY_RADIUS * 0.6, -SKY_RADIUS * 0.5];
  const { eraDef, posInEra } = info;
  const total = eraDef.milestoneIds.length;
  const t = total === 1 ? 0 : posInEra / (total - 1) - 0.5;
  const seedA = hashSeed(`${milestoneId}-a`) - 0.5;
  const seedB = hashSeed(`${milestoneId}-b`) - 0.5;
  const az =
    eraDef.azimuth + t * eraDef.spread * 0.7 + seedA * eraDef.spread * 0.85;
  const alt = Math.max(
    0.10,
    Math.min(0.6, eraDef.altitude + seedB * eraDef.spread * 0.95),
  );
  return skyPosition(az, alt);
};

// Bikin warna bintang per milestone — base era color, slight
// brightness shift berdasarkan posisi dalam era (oldest = sedikit
// dimmer, newest = sedikit brighter). Returns hex string.
export const starColorForMilestone = (milestoneId) => {
  const info = ERA_LOOKUP.get(milestoneId);
  if (!info) return '#ffffff';
  const { eraDef, posInEra } = info;
  const total = eraDef.milestoneIds.length;
  const t = total === 1 ? 0.5 : posInEra / (total - 1);
  const dim = lerpHexColor('#000000', eraDef.color, 0.78);
  const bright = lerpHexColor(eraDef.color, '#ffffff', 0.22);
  if (t < 0.5) return lerpHexColor(dim, eraDef.color, t / 0.5);
  return lerpHexColor(eraDef.color, bright, (t - 0.5) / 0.5);
};
