/**
 * EliTree — "Pohon untuk Eli" interactive growth gimmick.
 *
 * One support = +1 to the global RTDB counter. Every 100 supports the
 * tree advances one stage (0 = empty soil, 6 = fruiting apricot).
 *
 * Rate limiting: localStorage stamp keyed by today's date. One device
 * can support once per calendar day; trying again before midnight
 * shows a friendly "kembali besok" state. Persistence is best-effort
 * (private mode wipes it), so this is a UX guardrail, not abuse
 * protection — that lives in the RTDB security rules at deploy time.
 *
 * Falls back gracefully when Firebase env vars aren't set: the
 * component still renders, the tree stays at stage 0, and tapping
 * shows a "demo mode" message instead of crashing.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeToTreeSupports,
  incrementTreeSupports,
} from '../../lib/treeDb';
import { subscribeToWishes } from '../../lib/wishesDb';
import { isFirebaseConfigured } from '../../lib/firebase';
import { SITE_CONFIG } from '../../config/siteConfig';

// Same hash function used in /wishes so curated seeds get a stable
// id we can show alongside live RTDB submissions.
const seedHashId = (seed) => {
  const str = `${seed.name || ''}|${seed.date || ''}|${(seed.message || '').slice(0, 40)}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return `seed-${(h >>> 0).toString(36)}`;
};

// Card hang positions distributed around the LOWER + OUTER perimeter
// of the canopy at the max stage. Each card's string anchors at
// (CENTER_X + dx, trunkY + dy) — placed near the canopy edge so the
// string emerges naturally from the foliage — and the card body
// dangles `hang` pixels below the anchor. All dx values keep |dx| ≥ 70
// to avoid overlapping the trunk visually.
const HANG_POSITIONS = [
  { dx: -150, dy: -38, hang: 40 },
  { dx: 150, dy: -38, hang: 40 },
  { dx: -125, dy: 0, hang: 38 },
  { dx: 125, dy: 0, hang: 38 },
  { dx: -100, dy: 32, hang: 36 },
  { dx: 100, dy: 32, hang: 36 },
  { dx: -72, dy: 54, hang: 32 },
  { dx: 72, dy: 54, hang: 32 },
  { dx: -115, dy: -22, hang: 38 },
  { dx: 115, dy: -22, hang: 38 },
];

const SUPPORTS_PER_STAGE = 100;
const MAX_STAGE = 10;

const STAGES = [
  { id: 0, label: 'Bibit', icon: 'ri-seedling-line', detail: 'Bibit yang baru ditanam menunggu air pertama.' },
  { id: 1, label: 'Tunas', icon: 'ri-plant-line', detail: 'Tunas hijau pertama mulai mendongak ke matahari.' },
  { id: 2, label: 'Setek', icon: 'ri-plant-fill', detail: 'Daun-daun pertama membuka, akar mulai mencengkeram.' },
  { id: 3, label: 'Pohon Muda', icon: 'ri-mist-line', detail: 'Pohon muda dengan ranting pertama yang bercabang.' },
  { id: 4, label: 'Pohon Tumbuh', icon: 'ri-mist-fill', detail: 'Batang menebal, daun mulai melebar, bayangan teduh muncul.' },
  { id: 5, label: 'Pohon Dewasa', icon: 'ri-leaf-line', detail: 'Daun rimbun, batang kuat, siap menyambut musim semi.' },
  { id: 6, label: 'Pohon Kuat', icon: 'ri-leaf-fill', detail: 'Akar dalam, kanopi luas, tahan segala cuaca.' },
  { id: 7, label: 'Berbunga', icon: 'ri-flower-line', detail: 'Bunga aprikot mekar — Bloom in Spring.' },
  { id: 8, label: 'Berbuah', icon: 'ri-apple-line', detail: 'Buah aprikot matang siap dipanen.' },
  { id: 9, label: 'Pohon Penuh', icon: 'ri-sun-line', detail: 'Pohon penuh, kanopi terluas, panen melimpah.' },
  { id: 10, label: 'Pohon Megah', icon: 'ri-sparkling-2-fill', detail: 'Pohon megah di tengah taman bunga. Setelah ini setiap 50 dukungan menambah satu makhluk hidup ke ekosistem. Terima kasih.' },
];

// === Ecosystem (taman bunga) generation ===
//
// As supports accumulate, the garden around the tree fills out:
// rumput → bibit bunga → bunga mekar → daun lebar → pakis → jamur
// → kupu-kupu beterbangan. Driven by raw `count` (not stage) so
// every vote literally adds something to the ecosystem — 1 org 1
// vote membantu ekosistem tumbuh.

const FLOWER_PALETTE = [
  '#F7D6E0', '#FFB7C5', '#FFD0A0', '#FFE082',
  '#E1BEE7', '#B5EAD7', '#C8B6FF', '#FFAB91',
];

const BUTTERFLY_PALETTES = [
  ['var(--retro-burgundy)', 'var(--retro-gold)'],
  ['var(--retro-gold-light)', '#F7D6E0'],
  ['#C8B6FF', '#E1BEE7'],
  ['var(--retro-burgundy-light)', 'var(--retro-cream)'],
];

// Mulberry32 PRNG — deterministic so positions stay stable across
// re-renders and only change when the population (driven by count)
// grows enough to add new entries.
const seedRandom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Linear interpolation across a list of [count, value] stops.
const lerpStops = (x, stops) => {
  if (x <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [x0, y0] = stops[i - 1];
      const [x1, y1] = stops[i];
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return last[1];
};

const generateEcosystem = (count) => {
  const rand = seedRandom(13);
  // Hard cap di 50.000 sebagai safety perf. Bonus loop di bawah hanya
  // drop 1 elemen per 50 votes (cadence pelan supaya garden tetap
  // readable past 1.000), jadi 50K total ≈ 980 bonus node + base.
  // Sangat manageable di DOM; cap tinggi memberi ruang nafas untuk
  // gelombang dukungan besar tanpa stuck di milestone tertentu.
  const c = Math.max(0, Math.min(50000, count || 0));
  const potVisible = c < 500;
  // Base population is driven by lerp stops up to count=1000. Past
  // that, every 50 additional votes drops a single random element
  // into the garden via the bonus loop at the bottom.
  const baseCount = Math.min(c, 1000);

  const flowerCount = Math.floor(lerpStops(baseCount, [
    [0, 0], [200, 0], [300, 2], [400, 8], [500, 20],
    [600, 40], [700, 80], [800, 128], [900, 184], [1000, 240],
  ]));
  const budCount = Math.floor(lerpStops(baseCount, [
    [0, 0], [100, 0], [150, 1], [200, 4], [250, 5],
    [300, 3], [400, 2], [500, 0],
  ]));
  const grassCount = Math.floor(lerpStops(baseCount, [
    [0, 0], [100, 3], [200, 7], [300, 13], [400, 21],
    [500, 31], [600, 45], [700, 60], [800, 78], [900, 97], [1000, 120],
  ]));
  const butterflyCount = Math.floor(lerpStops(baseCount, [
    [0, 0], [400, 0], [500, 2], [600, 4], [700, 7],
    [800, 11], [900, 16], [1000, 22],
  ]));
  const leafyCount = Math.floor(lerpStops(baseCount, [
    [0, 0], [600, 0], [700, 2], [800, 4], [900, 6], [1000, 8],
  ]));
  const fernCount = Math.floor(lerpStops(baseCount, [
    [0, 0], [700, 0], [800, 3], [900, 5], [1000, 7],
  ]));
  const mushroomCount = Math.floor(lerpStops(baseCount, [
    [0, 0], [800, 0], [900, 2], [1000, 5],
  ]));

  // Trunk + (when present) pot + (when present) apricot table occupy
  // footprints that flowers/grass must dodge so they don't render
  // in front/under them.
  const inTrunkOrPot = (x, y) => {
    if (Math.abs(x - 200) < 26 && y < 320) return true;
    if (potVisible && y >= 318 && y <= 362 && x >= 100 && x <= 300) return true;
    // Apricot table footprint (right edge) — reserve area saat
    // count >= BUCKET_THRESHOLD + BUCKET_FILL_RATIO (= 1100, saat
    // table beneran render dgn first apricot). Supaya ekosistem
    // gak nimpa meja.
    if (
      c >= BUCKET_THRESHOLD + BUCKET_FILL_RATIO &&
      x >= TABLE_FOOTPRINT_X1 &&
      x <= TABLE_FOOTPRINT_X2 &&
      y >= TABLE_FOOTPRINT_Y1 &&
      y <= TABLE_FOOTPRINT_Y2
    ) return true;
    return false;
  };

  const tryPlace = (target, builder, yMin, yMax) => {
    const items = [];
    const cap = target * 3 + 30;
    let tries = 0;
    while (items.length < target && tries < cap) {
      tries++;
      const x = 8 + rand() * 384;
      const y = yMin + rand() * (yMax - yMin);
      if (inTrunkOrPot(x, y)) continue;
      items.push(builder(x, y));
    }
    return items;
  };

  const flowers = tryPlace(flowerCount, (x, y) => {
    const v = rand();
    return {
      x, y,
      color: FLOWER_PALETTE[Math.floor(rand() * FLOWER_PALETTE.length)],
      variant: v < 0.07 ? 'tulip' : v < 0.24 ? 'big' : 'tiny',
      size: 2 + rand() * 2,
    };
  }, 312, 380);

  const buds = tryPlace(budCount, (x, y) => ({ x, y }), 322, 372);
  const grass = tryPlace(grassCount, (x, y) => ({
    x, y,
    lean: (rand() - 0.5) * 4,
    tall: 5 + rand() * 5,
  }), 348, 366);
  const leafy = tryPlace(leafyCount, (x, y) => ({ x, y }), 322, 358);
  const ferns = tryPlace(fernCount, (x, y) => ({
    x, y,
    dir: rand() < 0.5 ? 1 : -1,
  }), 332, 360);
  const mushrooms = tryPlace(mushroomCount, (x, y) => ({
    x, y,
    capColor: rand() < 0.5 ? 'var(--retro-burgundy)' : 'var(--retro-gold)',
  }), 348, 362);

  const butterflies = [];
  for (let i = 0; i < butterflyCount; i++) {
    butterflies.push({
      x: 30 + rand() * 340,
      y: 200 + rand() * 110,
      palette: BUTTERFLY_PALETTES[Math.floor(rand() * BUTTERFLY_PALETTES.length)],
      tilt: (rand() - 0.5) * 30,
      scale: 0.75 + rand() * 0.5,
      delay: -rand() * 4,
    });
  }

  const fallenFruits = [];
  const bees = [];

  // Bonus growth past 1000, two-tier cadence supaya DOM tetap waras
  // kalau ada gelombang dukungan besar:
  //   Tier 1 (votes 1.001-10.000): 1 elemen per 50 votes  (max ~180)
  //   Tier 2 (votes 10.001+):      1 elemen per 200 votes (max ~200 di cap 50K)
  // Tier 2 = antisipasi viral — di skala low-end mobile, ratusan node
  // SVG masih lancar, ribuan mulai berat. Cadence pelan = ekosistem
  // tetap tumbuh tanpa meledakkan render cost.
  // Each bonus slot drops one random element (bunga / rumput / buah
  // jatuh / hewan) — type weights: 55% bunga, 20% rumput, 12% buah,
  // 13% hewan. RNG is shared with the base population, so positions
  // stay stable across re-renders and only NEW slots open up as count
  // grows.
  const tier1Votes = Math.min(Math.max(0, c - 1000), 9000);
  const tier2Votes = Math.max(0, c - 10000);
  const bonusCount = Math.floor(tier1Votes / 50) + Math.floor(tier2Votes / 200);

  // Pohon-pohon kecil tambahan (companion trees) — past 1.000 siraman,
  // satu pohon kecil baru tumbuh setiap 200 siraman di sisi kiri /
  // kanan kanvas, sebagai pengkaya environment di sekitar pohon utama.
  // Capped 30 supaya grid tetap bersih + tidak menutupi pohon utama.
  // Pakai seed RNG terpisah supaya posisi pohon kecil stabil tanpa
  // tergantung perubahan di loop bonus di atas.
  const companionRand = seedRandom(17);
  const companionTarget = c > 1000
    ? Math.min(30, Math.floor((c - 1000) / 200))
    : 0;
  const companions = [];
  if (companionTarget > 0) {
    let tries = 0;
    const cap = companionTarget * 8 + 30;
    while (companions.length < companionTarget && tries < cap) {
      tries++;
      // Selalu di sisi (kiri ATAU kanan) — pohon utama di tengah, jadi
      // companion tidak boleh menutupi trunk/canopy area.
      const onLeft = companionRand() < 0.5;
      const x = onLeft
        ? 16 + companionRand() * 114   // 16..130
        : 270 + companionRand() * 114; // 270..384
      const y = 340 + companionRand() * 36; // 340..376 (variasi depth)
      // Min-distance check ke companion lain supaya tidak overlap.
      let tooClose = false;
      for (let i = 0; i < companions.length; i++) {
        const o = companions[i];
        const dx = o.x - x;
        const dy = o.y - y;
        if (dx * dx + dy * dy < 30 * 30) { tooClose = true; break; }
      }
      if (tooClose) continue;
      // Roll order dipertahankan supaya posisi companion existing
      // tidak bergeser saat menambah varian medium (call medium roll
      // di paling akhir).
      const scaleRoll = 0.85 + companionRand() * 0.55;     // 0.85..1.4
      const toneRoll = Math.floor(companionRand() * 3);    // 0..2
      const hasFruitRoll = companionRand() < 0.3;          // ~30% berbuah
      const isMedium = companionRand() < 0.28;             // ~28% medium
      companions.push({
        x, y,
        scale: isMedium ? 1 : scaleRoll,                   // medium = fixed
        tone: toneRoll,
        // Pohon sedang = pohon dewasa berbuah (fase 8) → selalu pakai
        // apricot fruits supaya silhouette-nya kebaca.
        hasFruit: isMedium ? true : hasFruitRoll,
        size: isMedium ? 'medium' : 'small',
      });
    }
    // Sort by y so companions di belakang render dulu (depth order).
    companions.sort((a, b) => a.y - b.y);
  }

  for (let i = 0; i < bonusCount; i++) {
    const typeRoll = rand();
    if (typeRoll < 0.55) {
      const x = 8 + rand() * 384;
      const y = 312 + rand() * 68;
      const v = rand();
      const color = FLOWER_PALETTE[Math.floor(rand() * FLOWER_PALETTE.length)];
      const size = 2 + rand() * 2;
      if (!inTrunkOrPot(x, y)) {
        flowers.push({
          x, y, color,
          variant: v < 0.07 ? 'tulip' : v < 0.24 ? 'big' : 'tiny',
          size,
        });
      }
    } else if (typeRoll < 0.75) {
      const x = 8 + rand() * 384;
      const y = 348 + rand() * 18;
      const lean = (rand() - 0.5) * 4;
      const tall = 5 + rand() * 5;
      if (!inTrunkOrPot(x, y)) grass.push({ x, y, lean, tall });
    } else if (typeRoll < 0.87) {
      const x = 8 + rand() * 384;
      const y = 350 + rand() * 14;
      const size = 4 + rand() * 2;
      if (!inTrunkOrPot(x, y)) fallenFruits.push({ x, y, size });
    } else {
      const x = 30 + rand() * 340;
      const y = 200 + rand() * 130;
      if (rand() < 0.3) {
        bees.push({
          x, y,
          scale: 0.8 + rand() * 0.3,
          delay: -rand() * 4,
        });
      } else {
        butterflies.push({
          x, y,
          palette: BUTTERFLY_PALETTES[Math.floor(rand() * BUTTERFLY_PALETTES.length)],
          tilt: (rand() - 0.5) * 30,
          scale: 0.75 + rand() * 0.5,
          delay: -rand() * 4,
        });
      }
    }
  }

  flowers.sort((a, b) => a.y - b.y);

  return {
    flowers, buds, grass, leafy, ferns, mushrooms,
    butterflies, fallenFruits, bees, companions,
  };
};

const LS_KEY = (dateStr) => `armeniaca-tree-support-${dateStr}`;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const hasSupportedToday = () => {
  try {
    return localStorage.getItem(LS_KEY(todayKey())) === '1';
  } catch {
    return false;
  }
};

const markSupportedToday = () => {
  try {
    localStorage.setItem(LS_KEY(todayKey()), '1');
  } catch {
    /* private mode — no-op */
  }
};

/**
 * Inline SVG tree that grows through 10 stages (0-10). Trunk thickens
 * and lengthens, branches multiply, foliage layers expand, blossoms
 * appear at stage 7, fruits at stage 8, and at the max stage the
 * tree gets a soft glow + visible roots to communicate "fully grown".
 *
 * Most numeric values are computed from `stage` so the growth reads
 * as continuous progression rather than discrete jumps.
 */
const POT_TOP_Y = 320;
const POT_BOTTOM_Y = 360;
const CENTER_X = 200;

// Apricot table — muncul di samping pot/akar saat count >= 1000
// (MAX_STAGE udah tercapai, panen mulai dikumpulkan di meja). Tiap
// 100 supports past 1000 = 1 apricot taruh di meja. Visual: meja
// kayu dgn perspective, apricot pile pyramid di atas (cap 33 visual,
// counter di bawah show actual harvest count).
//
// Dengan ratio 1:100, full table (33 buah) tercapai di count = 4300.
const BUCKET_THRESHOLD = 1000;
const BUCKET_FILL_RATIO = 100; // 1 apricot per N supports past threshold
const BUCKET_CAPACITY = 33;
const TABLE_CX = 342; // tepi kanan + breathing room utk sign post
const TABLE_GROUND_Y = POT_BOTTOM_Y - 2;
const TABLE_LEG_H = 30; // sedikit lebih tinggi
const TABLE_TOP_FRONT_Y = TABLE_GROUND_Y - TABLE_LEG_H;
const TABLE_TOP_BACK_Y = TABLE_TOP_FRONT_Y - 16;
const TABLE_FRONT_W = 110; // dibesarin dari 96
const TABLE_BACK_W = 86;   // dibesarin dari 74
const TABLE_TOP_THICKNESS = 5;

// Sign post (papan pengumuman) — vertikal di tengah meja, board di
// atas. Post sticks dari tanah, tabletop nutupin middle section,
// board visible di atas table back.
const SIGN_X = TABLE_CX;
const SIGN_POST_BOTTOM_Y = TABLE_GROUND_Y;
const SIGN_POST_TOP_Y = TABLE_TOP_BACK_Y - 36;
const SIGN_BOARD_W = 92;
const SIGN_BOARD_H = 32;
const SIGN_BOARD_CY = SIGN_POST_TOP_Y - 4;

// Footprint box utk ecosystem avoidance — meja + pile + sign post +
// board area.
const TABLE_FOOTPRINT_X1 = Math.min(TABLE_CX - TABLE_FRONT_W / 2, SIGN_X - SIGN_BOARD_W / 2) - 6;
const TABLE_FOOTPRINT_X2 = Math.max(TABLE_CX + TABLE_FRONT_W / 2, SIGN_X + SIGN_BOARD_W / 2) + 6;
const TABLE_FOOTPRINT_Y1 = SIGN_BOARD_CY - SIGN_BOARD_H / 2 - 6; // include board atas
const TABLE_FOOTPRINT_Y2 = TABLE_GROUND_Y + 8;

// Apricot pyramid pile di atas meja — 6 rows total 35 slots.
// Base row sits on top front edge, naik makin kecil.
const BUCKET_APRICOT_POSITIONS = (() => {
  const rows = [
    { count: 9, dy: -5,  width: 84, size: 5.8 },
    { count: 8, dy: -14, width: 72, size: 5.5 },
    { count: 7, dy: -23, width: 58, size: 5.3 },
    { count: 5, dy: -32, width: 42, size: 5.0 },
    { count: 3, dy: -41, width: 24, size: 4.8 },
    { count: 1, dy: -50, width: 0,  size: 4.6 },
  ];
  const arr = [];
  let idx = 0;
  rows.forEach((row, rowIdx) => {
    for (let i = 0; i < row.count; i++) {
      const t = row.count === 1 ? 0.5 : i / (row.count - 1);
      const x = TABLE_CX - row.width / 2 + t * row.width + ((idx * 7) % 7 - 3) * 0.35;
      const y = TABLE_TOP_FRONT_Y + row.dy + ((idx * 11) % 4 - 2) * 0.4;
      arr.push({
        x,
        y,
        size: row.size + ((idx * 13) % 3) * 0.18,
        idx,
        isApex: rowIdx === rows.length - 1, // apex apricot (pyramid top)
      });
      idx++;
    }
  });
  return arr;
})();

const ApricotBucket = ({ filled = 0 }) => {
  const visible = Math.min(BUCKET_CAPACITY, Math.max(0, filled));
  const apricots = BUCKET_APRICOT_POSITIONS.slice(0, visible);
  const isFull = filled >= BUCKET_CAPACITY;
  // 4 leg positions relative to TABLE_CX. Front legs visible full,
  // back legs sebagian ke-hidden di belakang tabletop.
  const legW = 4;
  const legXs = [
    TABLE_CX - TABLE_FRONT_W / 2 + 6,  // front-left
    TABLE_CX + TABLE_FRONT_W / 2 - 6,  // front-right
    TABLE_CX - TABLE_BACK_W / 2 + 5,   // back-left
    TABLE_CX + TABLE_BACK_W / 2 - 5,   // back-right
  ];
  return (
    <g
      aria-label={`Meja panen — ${filled} buah aprikot`}
      className="eli-table-mount"
      style={{ transformOrigin: `${TABLE_CX}px ${TABLE_GROUND_Y}px`, transformBox: 'fill-box' }}
    >
      <title>{`Panen Pohon Kebaikan · ${filled.toLocaleString('id-ID')} buah aprikot terkumpul`}</title>
      {/* Drop shadow di tanah */}
      <ellipse
        cx={TABLE_CX}
        cy={TABLE_GROUND_Y + 3}
        rx={TABLE_FRONT_W / 2 + 8}
        ry="5"
        fill="#3a2820"
        opacity="0.32"
      />
      {/* Sign post — drawn FIRST supaya tabletop top nutupin middle
          section, post visible above table back & between back legs
          di bawah. */}
      <rect
        x={SIGN_X - 1.8}
        y={SIGN_POST_TOP_Y}
        width="3.6"
        height={SIGN_POST_BOTTOM_Y - SIGN_POST_TOP_Y}
        fill="#6a4a2d"
        stroke="#3a2415"
        strokeWidth="0.6"
      />
      {/* Back legs (drawn first, partially behind tabletop) */}
      {[legXs[2], legXs[3]].map((lx, i) => (
        <rect
          key={`bleg-${i}`}
          x={lx - legW / 2}
          y={TABLE_TOP_BACK_Y + 2}
          width={legW}
          height={TABLE_GROUND_Y - TABLE_TOP_BACK_Y - 2}
          rx="1"
          fill="#5a3e25"
          stroke="#3a2415"
          strokeWidth="0.5"
        />
      ))}
      {/* Tabletop side surface — visible front edge (thickness) */}
      <path
        d={`M ${TABLE_CX - TABLE_FRONT_W / 2} ${TABLE_TOP_FRONT_Y}
           L ${TABLE_CX + TABLE_FRONT_W / 2} ${TABLE_TOP_FRONT_Y}
           L ${TABLE_CX + TABLE_FRONT_W / 2} ${TABLE_TOP_FRONT_Y + TABLE_TOP_THICKNESS}
           L ${TABLE_CX - TABLE_FRONT_W / 2} ${TABLE_TOP_FRONT_Y + TABLE_TOP_THICKNESS} Z`}
        fill="#6a4a2d"
        stroke="#3a2415"
        strokeWidth="1"
      />
      {/* Tabletop top surface — trapezoid perspective (front wider, back narrower) */}
      <path
        d={`M ${TABLE_CX - TABLE_FRONT_W / 2} ${TABLE_TOP_FRONT_Y}
           L ${TABLE_CX + TABLE_FRONT_W / 2} ${TABLE_TOP_FRONT_Y}
           L ${TABLE_CX + TABLE_BACK_W / 2} ${TABLE_TOP_BACK_Y}
           L ${TABLE_CX - TABLE_BACK_W / 2} ${TABLE_TOP_BACK_Y} Z`}
        fill="#8b6f47"
        stroke="#3a2415"
        strokeWidth="1"
      />
      {/* Wood grain lines di top surface — parallel ke front edge */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const yLine = TABLE_TOP_BACK_Y + (TABLE_TOP_FRONT_Y - TABLE_TOP_BACK_Y) * t;
        const wLine = TABLE_BACK_W + (TABLE_FRONT_W - TABLE_BACK_W) * t;
        return (
          <line
            key={`grain-${i}`}
            x1={TABLE_CX - wLine / 2 + 3}
            y1={yLine}
            x2={TABLE_CX + wLine / 2 - 3}
            y2={yLine}
            stroke="#5a3e25"
            strokeWidth="0.6"
            opacity="0.5"
          />
        );
      })}
      {/* Sheen highlight diagonal di top */}
      <path
        d={`M ${TABLE_CX - TABLE_FRONT_W / 2 + 4} ${TABLE_TOP_FRONT_Y - 1}
           L ${TABLE_CX - TABLE_BACK_W / 2 + 4} ${TABLE_TOP_BACK_Y + 1}`}
        stroke="rgba(255,225,180,0.45)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Front legs (drawn after tabletop sehingga di depan) */}
      {[legXs[0], legXs[1]].map((lx, i) => (
        <rect
          key={`fleg-${i}`}
          x={lx - legW / 2}
          y={TABLE_TOP_FRONT_Y + TABLE_TOP_THICKNESS}
          width={legW}
          height={TABLE_GROUND_Y - TABLE_TOP_FRONT_Y - TABLE_TOP_THICKNESS}
          rx="1"
          fill="#6a4a2d"
          stroke="#3a2415"
          strokeWidth="0.6"
        />
      ))}

      {/* Tablecloth drape — cloth corner menutup front-left tabletop,
          menjuntai sedikit ke bawah dgn lipatan tipis. Kasih kerasa
          "domestic harvest" bukan industrial. */}
      <g>
        {(() => {
          const clx = TABLE_CX - TABLE_FRONT_W / 2;
          const clTop = TABLE_TOP_FRONT_Y;
          const clBot = clTop + 20;
          return (
            <>
              {/* Shadow underneath cloth */}
              <path
                d={`M ${clx + 1} ${clTop + 1}
                   L ${clx + 24} ${clTop + 1}
                   L ${clx + 21} ${clBot - 4}
                   L ${clx + 16} ${clBot + 1}
                   L ${clx + 3} ${clBot - 1}
                   L ${clx - 1} ${clBot - 9} Z`}
                fill="rgba(0,0,0,0.18)"
              />
              {/* Cloth body — cream linen */}
              <path
                d={`M ${clx - 2} ${clTop - 1}
                   L ${clx + 24} ${clTop - 1}
                   L ${clx + 22} ${clBot - 5}
                   L ${clx + 17} ${clBot - 1}
                   L ${clx + 4} ${clBot - 3}
                   L ${clx - 2} ${clBot - 11} Z`}
                fill="#fae5b8"
                stroke="#c9a961"
                strokeWidth="0.55"
              />
              {/* Fold lines — 2 subtle creases */}
              <path
                d={`M ${clx + 8} ${clTop + 2} Q ${clx + 9} ${clTop + 9} ${clx + 11} ${clBot - 8}`}
                fill="none"
                stroke="#c9a961"
                strokeWidth="0.35"
                opacity="0.6"
              />
              <path
                d={`M ${clx + 16} ${clTop + 2} Q ${clx + 17} ${clTop + 9} ${clx + 18} ${clBot - 6}`}
                fill="none"
                stroke="#c9a961"
                strokeWidth="0.35"
                opacity="0.5"
              />
              {/* Highlight along top edge */}
              <line
                x1={clx + 2}
                y1={clTop + 0.8}
                x2={clx + 22}
                y2={clTop + 0.8}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="0.5"
              />
            </>
          );
        })()}
      </g>

      {/* Wooden crate di sebelah kiri meja — empty crate ready for next
          batch / overflow harvest visual. Pendek (18 tall), 4 slats. */}
      {(() => {
        const ccx = TABLE_CX - TABLE_FRONT_W / 2 - 16;
        const ctop = TABLE_GROUND_Y - 18;
        const cbot = TABLE_GROUND_Y;
        const cw = 24;
        return (
          <g>
            {/* Shadow */}
            <ellipse cx={ccx} cy={cbot + 2} rx={cw / 2 + 3} ry="2.5" fill="#3a2820" opacity="0.3" />
            {/* Body */}
            <rect
              x={ccx - cw / 2}
              y={ctop}
              width={cw}
              height={cbot - ctop}
              fill="#8b6f47"
              stroke="#4a3220"
              strokeWidth="1.1"
            />
            {/* Vertical slats — 3 wood planks */}
            {[-0.3, 0, 0.3].map((p, i) => (
              <line
                key={`crate-slat-${i}`}
                x1={ccx + p * cw}
                y1={ctop + 1}
                x2={ccx + p * cw}
                y2={cbot - 1}
                stroke="#5a3e25"
                strokeWidth="0.8"
                opacity="0.6"
              />
            ))}
            {/* Top metal band */}
            <rect
              x={ccx - cw / 2 - 1}
              y={ctop - 1}
              width={cw + 2}
              height="3"
              rx="0.6"
              fill="#4a4035"
              stroke="#2a1f15"
              strokeWidth="0.4"
            />
            {/* Bottom metal band */}
            <rect
              x={ccx - cw / 2 - 1}
              y={cbot - 3}
              width={cw + 2}
              height="3"
              rx="0.6"
              fill="#4a4035"
              stroke="#2a1f15"
              strokeWidth="0.4"
            />
            {/* 2 apricots peeking out top — hint of contents */}
            <circle cx={ccx - 4} cy={ctop - 0.5} r="3" fill="var(--retro-gold)" />
            <ellipse cx={ccx - 5} cy={ctop - 1.5} rx="1" ry="1" fill="var(--retro-gold-light)" opacity="0.85" />
            <circle cx={ccx + 4} cy={ctop} r="2.6" fill="var(--retro-gold)" />
            <ellipse cx={ccx + 3} cy={ctop - 0.8} rx="0.8" ry="0.8" fill="var(--retro-gold-light)" opacity="0.85" />
            {/* Sheen highlight kiri */}
            <line
              x1={ccx - cw / 2 + 2}
              y1={ctop + 2}
              x2={ccx - cw / 2 + 2}
              y2={cbot - 2}
              stroke="rgba(255,225,180,0.35)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
        );
      })()}

      {/* Apricot pile di atas meja — layered render, low row first */}
      {apricots.map((a) => (
        <g key={`tab-${a.idx}`}>
          {/* Apex glow halo (di belakang fruit body) */}
          {a.isApex && (
            <circle
              cx={a.x}
              cy={a.y}
              r={a.size + 3.5}
              fill="var(--retro-gold-light)"
              opacity="0.35"
              className="eli-table-apex-glow"
            />
          )}
          <circle cx={a.x} cy={a.y} r={a.size} fill="var(--retro-gold)" />
          <ellipse
            cx={a.x - a.size * 0.3}
            cy={a.y - a.size * 0.3}
            rx={a.size * 0.32}
            ry={a.size * 0.32}
            fill="var(--retro-gold-light)"
            opacity="0.85"
          />
          {/* Top apricot (pyramid apex) dapat stem + leaf */}
          {a.isApex && (
            <>
              <line
                x1={a.x}
                y1={a.y - a.size}
                x2={a.x}
                y2={a.y - a.size - 3}
                stroke="var(--retro-brown-dark)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <ellipse
                cx={a.x + 2}
                cy={a.y - a.size - 2.5}
                rx="2.2"
                ry="1.4"
                fill="#7BA05B"
                transform={`rotate(40 ${a.x + 2} ${a.y - a.size - 2.5})`}
              />
            </>
          )}
        </g>
      ))}

      {/* Honeybee buzzing di sekitar apricot pile — Lissajous orbit
          around apex area, wings static (motion-implied via translation).
          Drift period 4.2s ease-in-out. */}
      <g transform={`translate(${TABLE_CX} ${TABLE_TOP_FRONT_Y - 28})`}>
        <g className="eli-bee">
          {/* Wings — semi-transparent */}
          <ellipse cx="-1.6" cy="-2" rx="2.4" ry="1.4" fill="rgba(255,255,255,0.72)" />
          <ellipse cx="1.6" cy="-2" rx="2.4" ry="1.4" fill="rgba(255,255,255,0.72)" />
          {/* Body — yellow oval */}
          <ellipse cx="0" cy="0" rx="3.2" ry="1.9" fill="#e8b35a" stroke="#3a2415" strokeWidth="0.35" />
          {/* Stripes */}
          <line x1="-1.5" y1="-1.5" x2="-1.5" y2="1.5" stroke="#3a2415" strokeWidth="0.85" />
          <line x1="0" y1="-1.7" x2="0" y2="1.7" stroke="#3a2415" strokeWidth="0.85" />
          <line x1="1.5" y1="-1.5" x2="1.5" y2="1.5" stroke="#3a2415" strokeWidth="0.85" />
          {/* Head */}
          <circle cx="-3.2" cy="-0.2" r="1.3" fill="#3a2415" />
          {/* Eye highlight */}
          <circle cx="-3.4" cy="-0.5" r="0.4" fill="rgba(255,225,180,0.85)" />
          {/* Antenna */}
          <path d="M -4 -1 Q -4.5 -2.5 -3.8 -3" fill="none" stroke="#3a2415" strokeWidth="0.4" />
        </g>
      </g>

      {/* Papan pengumuman di atas sign post — wooden board dgn text
          "Pohon Kebaikan" + sub-line stage milestone. Slight tilt
          -3° untuk rustic feel + gentle sway via CSS (origin top
          center, pivot di mana board attached ke post). */}
      <g className="eli-sign-sway">
       <g transform={`rotate(-3 ${SIGN_X} ${SIGN_BOARD_CY})`}>
        {/* Drop shadow di bawah board */}
        <rect
          x={SIGN_X - SIGN_BOARD_W / 2 + 1.5}
          y={SIGN_BOARD_CY - SIGN_BOARD_H / 2 + 2.5}
          width={SIGN_BOARD_W}
          height={SIGN_BOARD_H}
          rx="2"
          fill="rgba(0,0,0,0.25)"
        />
        {/* Board body — wooden plank */}
        <rect
          x={SIGN_X - SIGN_BOARD_W / 2}
          y={SIGN_BOARD_CY - SIGN_BOARD_H / 2}
          width={SIGN_BOARD_W}
          height={SIGN_BOARD_H}
          rx="2"
          fill="#a78657"
          stroke="#4a3220"
          strokeWidth="1.2"
        />
        {/* Wood grain horizontal lines */}
        <line
          x1={SIGN_X - SIGN_BOARD_W / 2 + 4}
          y1={SIGN_BOARD_CY - SIGN_BOARD_H / 2 + 8}
          x2={SIGN_X + SIGN_BOARD_W / 2 - 4}
          y2={SIGN_BOARD_CY - SIGN_BOARD_H / 2 + 8}
          stroke="#5a3e25"
          strokeWidth="0.4"
          opacity="0.4"
        />
        <line
          x1={SIGN_X - SIGN_BOARD_W / 2 + 4}
          y1={SIGN_BOARD_CY + SIGN_BOARD_H / 2 - 8}
          x2={SIGN_X + SIGN_BOARD_W / 2 - 4}
          y2={SIGN_BOARD_CY + SIGN_BOARD_H / 2 - 8}
          stroke="#5a3e25"
          strokeWidth="0.4"
          opacity="0.4"
        />
        {/* Decorative nails di pojok */}
        {[
          [SIGN_X - SIGN_BOARD_W / 2 + 4, SIGN_BOARD_CY - SIGN_BOARD_H / 2 + 4],
          [SIGN_X + SIGN_BOARD_W / 2 - 4, SIGN_BOARD_CY - SIGN_BOARD_H / 2 + 4],
          [SIGN_X - SIGN_BOARD_W / 2 + 4, SIGN_BOARD_CY + SIGN_BOARD_H / 2 - 4],
          [SIGN_X + SIGN_BOARD_W / 2 - 4, SIGN_BOARD_CY + SIGN_BOARD_H / 2 - 4],
        ].map(([nx, ny], i) => (
          <circle key={`nail-${i}`} cx={nx} cy={ny} r="0.9" fill="#2a1810" />
        ))}
        {/* Sheen highlight kiri-atas */}
        <line
          x1={SIGN_X - SIGN_BOARD_W / 2 + 3}
          y1={SIGN_BOARD_CY - SIGN_BOARD_H / 2 + 3}
          x2={SIGN_X - SIGN_BOARD_W / 2 + 3}
          y2={SIGN_BOARD_CY + SIGN_BOARD_H / 2 - 3}
          stroke="rgba(255,225,180,0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Text title */}
        <text
          x={SIGN_X}
          y={SIGN_BOARD_CY - 2}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="#3a2415"
          fontFamily="inherit"
        >
          Pohon Kebaikan
        </text>
        {/* Sub-line: panen count */}
        <text
          x={SIGN_X}
          y={SIGN_BOARD_CY + 9}
          textAnchor="middle"
          fontSize="7"
          fill="#5a3e25"
          fontStyle="italic"
          fontFamily="inherit"
        >
          panen · {filled.toLocaleString('id-ID')} buah
        </text>
        {/* Lantern menggantung dari bawah board front-right — small
            amber glow. Inside rotate group jadi ikut tilt -3° board,
            inside sway group jadi swing pelan dgn board. */}
        {(() => {
          const lx = SIGN_X + SIGN_BOARD_W / 2 - 14;
          const ly = SIGN_BOARD_CY + SIGN_BOARD_H / 2;
          return (
            <g transform={`translate(${lx} ${ly})`}>
              {/* Chain dari board edge ke lantern top */}
              <line x1="0" y1="0" x2="0" y2="6" stroke="#3a2415" strokeWidth="0.7" />
              {/* Lantern top cap — trapezoid */}
              <path
                d="M -3.2 6 L 3.2 6 L 2.6 4.5 L -2.6 4.5 Z"
                fill="#3a2415"
                stroke="#1a0f08"
                strokeWidth="0.3"
              />
              {/* Glow halo behind lantern */}
              <circle
                cx="0"
                cy="11"
                r="9"
                fill="#f9c66a"
                opacity="0.28"
                className="eli-lantern-glow"
              />
              {/* Lantern body — dark frame */}
              <rect
                x="-3.5"
                y="6.5"
                width="7"
                height="9"
                rx="0.6"
                fill="#3a2415"
                stroke="#1a0f08"
                strokeWidth="0.3"
              />
              {/* Inner glass — amber */}
              <rect
                x="-2.6"
                y="7.4"
                width="5.2"
                height="7"
                fill="#f9c66a"
              />
              {/* Inner flame highlight */}
              <ellipse
                cx="0"
                cy="11"
                rx="1.3"
                ry="2.4"
                fill="#fff2c8"
                opacity="0.9"
                className="eli-lantern-flame"
              />
              {/* Glass left-right framing — supaya beneran kayak grid lantern */}
              <line x1="0" y1="7.4" x2="0" y2="14.4" stroke="#3a2415" strokeWidth="0.4" />
              {/* Bottom plate */}
              <path
                d="M -3.5 15.5 L 3.5 15.5 L 3 16.6 L -3 16.6 Z"
                fill="#3a2415"
                stroke="#1a0f08"
                strokeWidth="0.3"
              />
            </g>
          );
        })()}
       </g>
      </g>

      {/* Bird perched di pojok kanan-atas papan — kecil, occasional
          tail flutter via CSS (animasi mostly idle, gerak singkat tiap
          ~5s). Posisinya outside sign-sway group supaya gak ikut sway
          jadi pivot-nya stay anchored ke "tempat duduk" di board. */}
      <g
        transform={`translate(${SIGN_X + SIGN_BOARD_W / 2 - 14} ${SIGN_BOARD_CY - SIGN_BOARD_H / 2 - 1})`}
      >
        <g className="eli-sign-bird">
          {/* Tail */}
          <path d="M -3.5 0.5 L -6.5 -1.2 L -5.5 1.4 Z" fill="#3a2415" />
          {/* Body — oval */}
          <ellipse cx="0" cy="0" rx="3.4" ry="2.2" fill="#3a2415" />
          {/* Wing line */}
          <path
            d="M -1.4 -0.4 Q 0 -1.2 1.6 -0.2"
            fill="none"
            stroke="#1a0f08"
            strokeWidth="0.5"
          />
          {/* Head */}
          <circle cx="3" cy="-1.2" r="1.9" fill="#3a2415" />
          {/* Beak */}
          <path d="M 4.5 -1.2 L 6.5 -0.8 L 4.5 -0.3 Z" fill="#c9a961" />
          {/* Eye highlight */}
          <circle cx="3.2" cy="-1.6" r="0.4" fill="rgba(255,225,180,0.9)" />
          {/* Tiny legs */}
          <line x1="-0.8" y1="2" x2="-0.8" y2="3.2" stroke="#3a2415" strokeWidth="0.4" />
          <line x1="0.8" y1="2" x2="0.8" y2="3.2" stroke="#3a2415" strokeWidth="0.4" />
        </g>
      </g>

      {/* Counter badge di bawah meja */}
      <g>
        <rect
          x={TABLE_CX - 30}
          y={TABLE_GROUND_Y + 10}
          width="60"
          height="18"
          rx="9"
          fill="var(--retro-burgundy)"
          opacity="0.94"
        />
        <text
          x={TABLE_CX}
          y={TABLE_GROUND_Y + 22.5}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--retro-cream)"
          fontFamily="inherit"
        >
          {filled.toLocaleString('id-ID')}
          {isFull && (
            <tspan opacity="0.7" dx="2" fontSize="9">
              ✦
            </tspan>
          )}
        </text>
      </g>
    </g>
  );
};
// viewBox dimensions. The y origin is negative so the foliage +
// hanging cards at the highest stages have headroom above y=0
// without clipping. x range still 0..400, y range -260..400.
const VIEWBOX_X = 0;
const VIEWBOX_Y = -260;
const VIEWBOX_W = 400;
const VIEWBOX_H = 660;

const TreeArt = ({ stage, count = 0, wishes = [], onOpenWish }) => {
  // Procedural ecosystem — flowers, grass, butterflies etc. populate
  // the ground based on the raw support count, so each new vote
  // visibly enriches the garden. Memoized so the seeded RNG only
  // re-rolls when `count` changes.
  const ecosystem = useMemo(() => generateEcosystem(count), [count]);

  // Trunk extends from the pot rim upward. Bottom = POT_TOP_Y so it
  // visually meets the soil — no gap. Width and height scale per
  // stage with bigger jumps in the early "growth spurt" stages
  // (200 -> 300 -> 400).
  const trunkHeight = stage >= 2
    ? Math.min(280, 70 + (stage - 2) * 24)   // stage 2: 70 ... stage 10: 262 (capped 280)
    : 0;
  const trunkWidth = stage >= 2
    ? Math.min(46, 14 + (stage - 2) * 4)     // stage 2: 14 ... stage 10: 46
    : 0;
  const trunkBottomY = POT_TOP_Y;
  const trunkY = trunkBottomY - trunkHeight;

  // Foliage radii scale per stage.
  const foliageMain = stage >= 2 ? Math.min(110, 30 + (stage - 2) * 11) : 0;
  const foliageSide = stage >= 3 ? Math.min(78, 22 + (stage - 3) * 7) : 0;
  const foliageTop = stage >= 4 ? Math.min(72, 28 + (stage - 4) * 6) : 0;
  const foliageOuter = stage >= 5 ? Math.min(66, 24 + (stage - 5) * 7) : 0;

  // Pot cracks at stage 4, then disappears entirely from stage 5+
  // (the tree has outgrown it). Soil mound + flower garden anchor
  // the tree visually from stage 5 onward.
  const potCracked = stage >= 4;
  const potVisible = stage <= 4;

  return (
    <svg
      viewBox={`${VIEWBOX_X} ${VIEWBOX_Y} ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="w-full h-auto drop-shadow-[0_24px_40px_rgba(61,52,43,0.22)]"
      role="img"
      aria-label={`Pohon Eli stage ${stage} dari ${MAX_STAGE}`}
    >
      {/* Stage-10 glow halo — soft golden aura behind the canopy */}
      {stage >= MAX_STAGE && (
        <circle
          cx={CENTER_X}
          cy={Math.max(140, trunkY - 30)}
          r="220"
          fill="var(--retro-gold)"
          opacity="0.18"
          style={{ transition: 'all 0.8s ease' }}
        />
      )}

      {/* Ground shadow */}
      <ellipse cx={CENTER_X} cy={POT_BOTTOM_Y - 4} rx="160" ry="14" fill="#5C4A3A" opacity="0.2" />

      {/* Pot rendered intact through stage 4. From stage 5 onward the
          tree has outgrown its container, so we drop the pot entirely
          and let the soil + visible roots anchor the visual. */}
      {potVisible && (
        <g style={{ transition: 'opacity 0.6s ease' }}>
          <path
            d={`M ${CENTER_X - 100} ${POT_TOP_Y + 14} Q ${CENTER_X - 100} ${POT_BOTTOM_Y} ${CENTER_X - 60} ${POT_BOTTOM_Y} L ${CENTER_X + 60} ${POT_BOTTOM_Y} Q ${CENTER_X + 100} ${POT_BOTTOM_Y} ${CENTER_X + 100} ${POT_TOP_Y + 14} L ${CENTER_X + 92} ${POT_TOP_Y} L ${CENTER_X - 92} ${POT_TOP_Y} Z`}
            fill="var(--retro-brown)"
          />
          <ellipse cx={CENTER_X} cy={POT_TOP_Y} rx="92" ry="9" fill="var(--retro-brown-dark)" />
          {/* Stage-4 cracks on the still-intact pot — telegraph the
              imminent break. */}
          {potCracked && (
            <g
              stroke="var(--retro-brown-dark)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              style={{ transition: 'opacity 0.6s ease' }}
            >
              <path d={`M ${CENTER_X - 70} ${POT_TOP_Y} L ${CENTER_X - 78} ${POT_TOP_Y + 14} L ${CENTER_X - 70} ${POT_TOP_Y + 28} L ${CENTER_X - 80} ${POT_BOTTOM_Y - 4}`} />
              <path d={`M ${CENTER_X + 30} ${POT_TOP_Y} L ${CENTER_X + 36} ${POT_TOP_Y + 18} L ${CENTER_X + 28} ${POT_TOP_Y + 32} L ${CENTER_X + 42} ${POT_BOTTOM_Y - 6}`} />
            </g>
          )}
        </g>
      )}

      {/* Soil mound — replaces the pot from stage 5+. Pohon yang
          tumbuh langsung di tanah. */}
      {!potVisible && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <ellipse cx={CENTER_X} cy={POT_TOP_Y + 8} rx="120" ry="16" fill="var(--retro-brown-dark)" />
          <ellipse cx={CENTER_X} cy={POT_TOP_Y} rx="100" ry="10" fill="#5C4A3A" />
          <ellipse cx={CENTER_X - 20} cy={POT_TOP_Y - 2} rx="30" ry="5" fill="var(--retro-brown)" opacity="0.6" />
        </g>
      )}

      {/* Ground ecosystem — procedurally populated based on raw
          support count. Renders in depth order: companion trees
          (background, sides) → grass → buds → flowers (back-to-front
          by y) → leafy plants → ferns → mushrooms. Butterflies render
          later above the trunk so they appear in front of foliage. */}
      <g style={{ transition: 'opacity 0.8s ease' }}>
        {ecosystem.companions.map((c, i) => (
          <CompanionTree
            key={`co-${i}`}
            cx={c.x}
            cy={c.y}
            scale={c.scale}
            tone={c.tone}
            hasFruit={c.hasFruit}
            size={c.size}
          />
        ))}
        {ecosystem.grass.map((g, i) => (
          <GrassBlade key={`gr-${i}`} cx={g.x} cy={g.y} lean={g.lean} tall={g.tall} />
        ))}
        {ecosystem.buds.map((b, i) => (
          <FlowerBud key={`bd-${i}`} cx={b.x} cy={b.y} />
        ))}
        {ecosystem.flowers.map((f, i) => {
          if (f.variant === 'tulip') {
            return <Tulip key={`fl-${i}`} cx={f.x} cy={f.y - 8} color={f.color} />;
          }
          if (f.variant === 'big') {
            return (
              <Flower
                key={`fl-${i}`}
                cx={f.x}
                cy={f.y}
                size={f.size + 1}
                petalColor={f.color}
                centerColor="var(--retro-gold)"
              />
            );
          }
          return <TinyFlower key={`fl-${i}`} cx={f.x} cy={f.y} color={f.color} size={f.size} />;
        })}
        {ecosystem.leafy.map((l, i) => (
          <LeafyPlant key={`lf-${i}`} cx={l.x} cy={l.y} />
        ))}
        {ecosystem.ferns.map((fn, i) => (
          <Fern key={`fn-${i}`} cx={fn.x} cy={fn.y} dir={fn.dir} />
        ))}
        {ecosystem.mushrooms.map((m, i) => (
          <Mushroom key={`mu-${i}`} cx={m.x} cy={m.y} capColor={m.capColor} />
        ))}
        {ecosystem.fallenFruits.map((f, i) => (
          <FallenApricot key={`ff-${i}`} x={f.x} y={f.y} size={f.size} />
        ))}
      </g>

      {/* Stage 0 — seed on the soil */}
      {stage === 0 && (
        <g style={{ transition: 'opacity 0.6s ease' }}>
          <ellipse cx={CENTER_X} cy={POT_TOP_Y - 4} rx="7" ry="5" fill="var(--retro-burgundy)" />
          <ellipse cx={CENTER_X - 2} cy={POT_TOP_Y - 5} rx="2.5" ry="1.5" fill="var(--retro-burgundy-light)" />
        </g>
      )}

      {/* Stage 1 — sprout */}
      {stage === 1 && (
        <g style={{ transition: 'opacity 0.6s ease' }}>
          <line x1={CENTER_X} y1={POT_TOP_Y} x2={CENTER_X} y2={POT_TOP_Y - 50} stroke="var(--retro-brown-dark)" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx={CENTER_X - 16} cy={POT_TOP_Y - 44} rx="14" ry="6" fill="#7BA05B" transform={`rotate(-30 ${CENTER_X - 16} ${POT_TOP_Y - 44})`} />
          <ellipse cx={CENTER_X + 16} cy={POT_TOP_Y - 44} rx="14" ry="6" fill="#88AB66" transform={`rotate(30 ${CENTER_X + 16} ${POT_TOP_Y - 44})`} />
          <ellipse cx={CENTER_X} cy={POT_TOP_Y - 56} rx="8" ry="5" fill="#9CC074" />
        </g>
      )}

      {/* Trunk (stage 2+) — meets the pot rim, thickens with stage */}
      {stage >= 2 && (
        <>
          <rect
            x={CENTER_X - trunkWidth / 2}
            y={trunkY}
            width={trunkWidth}
            height={trunkHeight}
            rx={Math.min(8, trunkWidth / 4)}
            fill="var(--retro-brown-dark)"
            style={{ transition: 'all 0.7s ease' }}
          />
          {/* Highlight stripe on the left edge */}
          <rect
            x={CENTER_X - trunkWidth / 2 + 3}
            y={trunkY + 5}
            width={Math.max(2, trunkWidth / 5)}
            height={trunkHeight - 8}
            fill="var(--retro-brown)"
            opacity="0.55"
            style={{ transition: 'all 0.7s ease' }}
          />
          {/* Bark grain detail at stronger stages */}
          {stage >= 5 && (
            <g
              stroke="var(--retro-brown)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={Math.min(0.7, (stage - 4) * 0.18)}
              style={{ transition: 'opacity 0.6s ease' }}
            >
              <line x1={CENTER_X - trunkWidth / 4} y1={trunkY + 40} x2={CENTER_X - trunkWidth / 4} y2={trunkY + 80} />
              <line x1={CENTER_X + trunkWidth / 4} y1={trunkY + 110} x2={CENTER_X + trunkWidth / 4} y2={trunkY + 150} />
              <line x1={CENTER_X} y1={trunkY + 70} x2={CENTER_X} y2={trunkY + 100} />
            </g>
          )}
        </>
      )}

      {/* Branches — kept INSIDE the foliage envelope so they read
          as structural limbs within the canopy (no spikes poking out
          above). Foliage layers cover them partially; what shows
          through gives the canopy structural texture. Wish cards at
          stage 10 hang from the lower/outer canopy edge below — see
          HANG_POSITIONS for anchor points. */}
      {stage >= 3 && (
        <g
          stroke="var(--retro-brown-dark)"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'all 0.7s ease' }}
        >
          {/* Primary outward pair — arc from trunk top into the canopy */}
          <path
            strokeWidth={Math.min(8, 4 + Math.max(0, stage - 3))}
            d={`M ${CENTER_X} ${trunkY + 16} Q ${CENTER_X - 50} ${trunkY - 14} ${CENTER_X - 90} ${trunkY - 30}`}
          />
          <path
            strokeWidth={Math.min(8, 4 + Math.max(0, stage - 3))}
            d={`M ${CENTER_X} ${trunkY + 16} Q ${CENTER_X + 50} ${trunkY - 14} ${CENTER_X + 90} ${trunkY - 30}`}
          />

          {/* Stage 5+ — center limb upward inside the crown */}
          {stage >= 5 && (
            <path
              strokeWidth={Math.min(6, 3 + (stage - 5))}
              d={`M ${CENTER_X} ${trunkY + 4} Q ${CENTER_X - 4} ${trunkY - 50} ${CENTER_X} ${trunkY - 90}`}
            />
          )}

          {/* Stage 6+ — lower outward pair sweeping to the lower-outer canopy edge */}
          {stage >= 6 && (
            <>
              <path
                strokeWidth={Math.min(6, 3 + (stage - 6))}
                d={`M ${CENTER_X} ${trunkY + 60} Q ${CENTER_X - 60} ${trunkY + 40} ${CENTER_X - 110} ${trunkY + 20}`}
              />
              <path
                strokeWidth={Math.min(6, 3 + (stage - 6))}
                d={`M ${CENTER_X} ${trunkY + 60} Q ${CENTER_X + 60} ${trunkY + 40} ${CENTER_X + 110} ${trunkY + 20}`}
              />
            </>
          )}

          {/* Stage 8+ — primary limb extensions to the side-mid canopy edge */}
          {stage >= 8 && (
            <>
              <path
                strokeWidth={Math.min(5, 3 + (stage - 8))}
                d={`M ${CENTER_X - 90} ${trunkY - 30} Q ${CENTER_X - 120} ${trunkY - 32} ${CENTER_X - 150} ${trunkY - 18}`}
              />
              <path
                strokeWidth={Math.min(5, 3 + (stage - 8))}
                d={`M ${CENTER_X + 90} ${trunkY - 30} Q ${CENTER_X + 120} ${trunkY - 32} ${CENTER_X + 150} ${trunkY - 18}`}
              />
            </>
          )}
        </g>
      )}

      {/* Foliage — multi-layer, gets dramatically denser at stage 5+ */}
      {stage >= 2 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx={CENTER_X} cy={trunkY - 12} r={foliageMain} fill="#5E7C3F" opacity="0.9" />
        </g>
      )}
      {stage >= 3 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx={CENTER_X - foliageMain * 0.55} cy={trunkY - 6} r={foliageSide} fill="#7BA05B" opacity="0.86" />
          <circle cx={CENTER_X + foliageMain * 0.55} cy={trunkY - 6} r={foliageSide} fill="#7BA05B" opacity="0.86" />
        </g>
      )}
      {stage >= 4 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx={CENTER_X} cy={trunkY - foliageMain * 0.7} r={foliageTop} fill="#88AB66" opacity="0.88" />
        </g>
      )}
      {/* Stage 5+ — foliage densification: extra blobs filling the silhouette */}
      {stage >= 5 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx={CENTER_X - foliageMain * 0.85} cy={trunkY - foliageMain * 0.4} r={foliageOuter} fill="#9CC074" opacity="0.78" />
          <circle cx={CENTER_X + foliageMain * 0.85} cy={trunkY - foliageMain * 0.4} r={foliageOuter} fill="#9CC074" opacity="0.78" />
          <circle cx={CENTER_X - foliageMain * 0.45} cy={trunkY - foliageMain * 0.95} r={foliageOuter * 0.85} fill="#9CC074" opacity="0.74" />
          <circle cx={CENTER_X + foliageMain * 0.45} cy={trunkY - foliageMain * 0.95} r={foliageOuter * 0.85} fill="#9CC074" opacity="0.74" />
          <circle cx={CENTER_X - foliageMain * 0.7} cy={trunkY + 18} r={foliageOuter * 0.7} fill="#7BA05B" opacity="0.7" />
          <circle cx={CENTER_X + foliageMain * 0.7} cy={trunkY + 18} r={foliageOuter * 0.7} fill="#7BA05B" opacity="0.7" />
        </g>
      )}
      {/* Stage 9+ — even more density to back up the "Pohon Penuh" copy */}
      {stage >= 9 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx={CENTER_X - foliageMain * 1.0} cy={trunkY - foliageMain * 0.05} r={foliageOuter * 0.75} fill="#88AB66" opacity="0.72" />
          <circle cx={CENTER_X + foliageMain * 1.0} cy={trunkY - foliageMain * 0.05} r={foliageOuter * 0.75} fill="#88AB66" opacity="0.72" />
          <circle cx={CENTER_X} cy={trunkY - foliageMain * 1.15} r={foliageOuter * 0.85} fill="#9CC074" opacity="0.78" />
        </g>
      )}

      {/* Apricot blossoms — stage 7+ ONLY (fade out as fruits replace at 8+) */}
      {stage === 7 && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [-60, -20], [-30, -50], [0, -70], [30, -50], [60, -20],
            [-90, 0], [90, 0], [-50, -10], [50, -10], [0, -30],
            [-72, 30], [72, 30], [-20, 16], [20, 16], [-40, 50], [40, 50],
          ].map(([dx, dy], i) => {
            const cx = CENTER_X + dx;
            const cy = trunkY + dy;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="7" fill="#F7D6E0" />
                <circle cx={cx} cy={cy} r="3" fill="var(--retro-gold)" />
              </g>
            );
          })}
        </g>
      )}

      {/* Stage 8: some flowers + first fruits (~6 fruits, mostly upper) */}
      {stage === 8 && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {/* Lingering flowers */}
          {[
            [-90, 0], [90, 0], [-30, -50], [30, -50], [0, -30],
          ].map(([dx, dy], i) => (
            <g key={`fl-${i}`}>
              <circle cx={CENTER_X + dx} cy={trunkY + dy} r="6" fill="#F7D6E0" opacity="0.7" />
              <circle cx={CENTER_X + dx} cy={trunkY + dy} r="2.5" fill="var(--retro-gold)" />
            </g>
          ))}
          {/* First fruits */}
          {[
            [-60, -20], [60, -20], [0, -70], [-50, -10], [50, -10], [0, 16],
          ].map(([dx, dy], i) => (
            <Apricot key={`fr-${i}`} cx={CENTER_X + dx} cy={trunkY + dy} size={8} />
          ))}
        </g>
      )}

      {/* Stage 9: full of fruits (~14) */}
      {stage === 9 && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [-90, 0], [90, 0], [-30, -50], [30, -50], [0, -70],
            [-60, -20], [60, -20], [-50, -10], [50, -10], [0, -30],
            [-72, 30], [72, 30], [-20, 16], [20, 16], [-40, 50], [40, 50],
            [-110, -20], [110, -20],
          ].map(([dx, dy], i) => (
            <Apricot key={`fr9-${i}`} cx={CENTER_X + dx} cy={trunkY + dy} size={9} />
          ))}
        </g>
      )}

      {/* Stage 10 (Megah): even more fruits, slightly larger */}
      {stage >= MAX_STAGE && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [-100, -10], [100, -10], [-40, -60], [40, -60], [0, -80],
            [-70, -28], [70, -28], [-58, -8], [58, -8], [0, -36],
            [-86, 24], [86, 24], [-26, 14], [26, 14], [-46, 48], [46, 48],
            [-130, -8], [130, -8], [-22, -56], [22, -56], [-12, -10], [12, -10],
          ].map(([dx, dy], i) => (
            <Apricot key={`fr10-${i}`} cx={CENTER_X + dx} cy={trunkY + dy} size={11} />
          ))}
        </g>
      )}

      {/* Sparkles for the maxed-out tree — placed around the canopy
          which now lives in the upper portion of the (negative-y)
          viewBox. */}
      {stage >= MAX_STAGE && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [40, -200], [360, -190], [20, -60], [380, -50], [60, -130], [340, -120],
          ].map(([cx, cy], i) => (
            <g key={`sp-${i}`}>
              <path
                d={`M ${cx} ${cy - 6} L ${cx + 2.5} ${cy} L ${cx} ${cy + 6} L ${cx - 2.5} ${cy} Z`}
                fill="var(--retro-gold-light)"
                opacity="0.95"
              />
              <path
                d={`M ${cx - 6} ${cy} L ${cx} ${cy - 2.5} L ${cx + 6} ${cy} L ${cx} ${cy + 2.5} Z`}
                fill="var(--retro-gold-light)"
                opacity="0.95"
              />
            </g>
          ))}
        </g>
      )}

      {/* Flying creatures — drawn after the canopy so they appear
          IN FRONT of the foliage. Butterflies from the base population
          + bonus bees/butterflies past count=1000. */}
      {(ecosystem.butterflies.length > 0 || ecosystem.bees.length > 0) && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {ecosystem.butterflies.map((b, i) => (
            <Butterfly
              key={`bf-${i}`}
              x={b.x}
              y={b.y}
              palette={b.palette}
              tilt={b.tilt}
              scale={b.scale}
              delay={b.delay}
            />
          ))}
          {ecosystem.bees.map((b, i) => (
            <Bee key={`be-${i}`} x={b.x} y={b.y} scale={b.scale} delay={b.delay} />
          ))}
        </g>
      )}

      {/* Hanging wish cards — stage 10 only. Each card is anchored
          to a branch tip in the canopy via a thin string, hanging
          below by `hang` pixels. Click handler calls onOpenWish so
          the parent can pop a modal. */}
      {stage >= MAX_STAGE && wishes.length > 0 && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {wishes.slice(0, HANG_POSITIONS.length).map((wish, i) => {
            const pos = HANG_POSITIONS[i];
            const anchorX = CENTER_X + pos.dx;
            const anchorY = trunkY + pos.dy;
            const cardCx = anchorX;
            const cardCy = anchorY + pos.hang;
            const cardW = 64;
            const cardH = 32;
            const tilt = (i % 2 === 0 ? -1 : 1) * (3 + (i % 3));
            const displayName = (wish.name || 'Anonim').slice(0, 9);
            return (
              <g
                key={wish.id || `hang-${i}`}
                onClick={() => onOpenWish?.(wish)}
                style={{ cursor: 'pointer', transition: 'transform 0.4s ease' }}
                className="hanging-wish-card"
                tabIndex={0}
                role="button"
                aria-label={`Buka ucapan dari ${wish.name}`}
              >
                {/* String connecting branch to card */}
                <line
                  x1={anchorX}
                  y1={anchorY}
                  x2={cardCx}
                  y2={cardCy - cardH / 2}
                  stroke="var(--retro-brown-dark)"
                  strokeWidth="1.3"
                  opacity="0.7"
                />
                {/* Card body — slight tilt so it reads as physically hanging */}
                <g transform={`rotate(${tilt} ${cardCx} ${cardCy})`}>
                  <rect
                    x={cardCx - cardW / 2}
                    y={cardCy - cardH / 2}
                    width={cardW}
                    height={cardH}
                    rx="4"
                    fill="var(--retro-cream)"
                    stroke="var(--retro-burgundy)"
                    strokeWidth="1.5"
                  />
                  {/* Heart decoration */}
                  <text
                    x={cardCx - cardW / 2 + 6}
                    y={cardCy - cardH / 2 + 11}
                    fontSize="9"
                    fill="var(--retro-burgundy)"
                    fontWeight="900"
                  >
                    ♥
                  </text>
                  <text
                    x={cardCx}
                    y={cardCy + 1}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="800"
                    fill="var(--retro-text-primary)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {displayName}
                  </text>
                  <text
                    x={cardCx}
                    y={cardCy + 11}
                    textAnchor="middle"
                    fontSize="6.5"
                    fill="var(--retro-burgundy)"
                    style={{ pointerEvents: 'none', letterSpacing: '0.1em' }}
                  >
                    BUKA
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* Falling leaves dari area tree foliage drifting ke meja — 3
          leaves dgn stagger delays. Hanya muncul kalau ada foliage
          (stage >= 3) supaya gak melayang dari trunk kosong. */}
      {stage >= 3 && (
        <g aria-hidden="true">
          {[
            { x0: 220, x1: 360, y0: 90, y1: 320, rot: 540, delay: 0,   dur: 9 },
            { x0: 250, x1: 340, y0: 110, y1: 340, rot: -480, delay: 3.2, dur: 10 },
            { x0: 195, x1: 320, y0: 140, y1: 350, rot: 360, delay: 6.4, dur: 8.5 },
          ].map((leaf, i) => (
            <g
              key={`leaf-${i}`}
              className="eli-falling-leaf"
              style={{
                '--leaf-x0': `${leaf.x0}px`,
                '--leaf-x1': `${leaf.x1}px`,
                '--leaf-y0': `${leaf.y0}px`,
                '--leaf-y1': `${leaf.y1}px`,
                '--leaf-rot': `${leaf.rot}deg`,
                animationDelay: `${leaf.delay}s`,
                animationDuration: `${leaf.dur}s`,
              }}
            >
              {/* Leaf body — elongated oval green */}
              <ellipse cx="0" cy="0" rx="4.5" ry="2.3" fill="#7BA05B" stroke="#5a7842" strokeWidth="0.4" />
              {/* Vein down center */}
              <line x1="-4" y1="0" x2="4" y2="0" stroke="#3d5a2b" strokeWidth="0.4" />
              {/* Side veins */}
              <path d="M -2.5 -0.3 L -2 -1.5" stroke="#3d5a2b" strokeWidth="0.3" fill="none" />
              <path d="M 0 -0.5 L 0.6 -1.7" stroke="#3d5a2b" strokeWidth="0.3" fill="none" />
              <path d="M 2.5 -0.3 L 2.2 -1.4" stroke="#3d5a2b" strokeWidth="0.3" fill="none" />
            </g>
          ))}
        </g>
      )}

      {/* Apricot harvest table 1 — muncul saat count >= 1100 (MAX_STAGE
          + 1st harvest unit). Tiap 100 supports past 1000 → 1 apricot
          taruh di meja. Cap visual di 33 buah (= 4300 total supports).
          Threshold render = THRESHOLD + RATIO supaya table appears WITH
          first apricot, gak kosong. */}
      {count >= BUCKET_THRESHOLD + BUCKET_FILL_RATIO && (
        <ApricotBucket
          filled={Math.floor((count - BUCKET_THRESHOLD) / BUCKET_FILL_RATIO)}
        />
      )}
    </svg>
  );
};

// Tiny flower for high-density meadow rendering — just a colored
// bloom + tiny center, no stem. Cheap to render in bulk.
const TinyFlower = ({ cx, cy, color, size = 2.5 }) => (
  <g>
    <circle cx={cx} cy={cy} r={size} fill={color} />
    <circle cx={cx} cy={cy} r={size * 0.4} fill="var(--retro-gold)" />
  </g>
);

// Flower bud — bibit yang belum mekar. Closed green sheath on stem.
const FlowerBud = ({ cx, cy }) => (
  <g>
    <line
      x1={cx} y1={cy + 2} x2={cx} y2={cy + 9}
      stroke="#5E7C3F" strokeWidth="1.2" strokeLinecap="round"
    />
    <ellipse cx={cx} cy={cy} rx="2" ry="3" fill="#88AB66" />
    <ellipse cx={cx - 0.6} cy={cy - 0.6} rx="0.8" ry="1.2" fill="#9CC074" opacity="0.85" />
  </g>
);

// Single grass blade — slight curve via lean parameter.
const GrassBlade = ({ cx, cy, lean = 0, tall = 8 }) => (
  <path
    d={`M ${cx} ${cy} Q ${cx + lean / 2} ${cy - tall * 0.6} ${cx + lean} ${cy - tall}`}
    fill="none"
    stroke="#5E7C3F"
    strokeWidth="1.4"
    strokeLinecap="round"
  />
);

// Bonus apricot resting on the ground — small drop shadow makes it
// read as a fallen fruit rather than a yellow dot.
const FallenApricot = ({ x, y, size = 5 }) => (
  <g>
    <ellipse cx={x} cy={y + size * 0.3 + 1} rx={size + 1} ry="1.4" fill="var(--retro-brown-dark)" opacity="0.25" />
    <circle cx={x} cy={y} r={size} fill="var(--retro-gold)" />
    <ellipse cx={x - size * 0.3} cy={y - size * 0.3} rx={size * 0.35} ry={size * 0.35} fill="var(--retro-gold-light)" opacity="0.85" />
  </g>
);

// Bee — small rounded body with stripes + tiny translucent wings.
// Reuses the .eli-butterfly class for fluttering motion.
const Bee = ({ x, y, scale = 1, delay = 0 }) => (
  <g
    className="eli-butterfly"
    style={{ animationDelay: `${delay.toFixed(2)}s` }}
  >
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={-1.5} cy={-2.2} rx="2.2" ry="1.4" fill="white" opacity="0.7" />
      <ellipse cx={1.5} cy={-2.2} rx="2.2" ry="1.4" fill="white" opacity="0.7" />
      <ellipse cx={0} cy={0} rx="3.5" ry="2.3" fill="var(--retro-gold)" />
      <line x1={-2} y1={-1.6} x2={-2} y2={1.6} stroke="var(--retro-brown-dark)" strokeWidth="0.9" strokeLinecap="round" />
      <line x1={0} y1={-1.8} x2={0} y2={1.8} stroke="var(--retro-brown-dark)" strokeWidth="0.9" strokeLinecap="round" />
      <line x1={2} y1={-1.6} x2={2} y2={1.6} stroke="var(--retro-brown-dark)" strokeWidth="0.9" strokeLinecap="round" />
    </g>
  </g>
);

// Butterfly with two-tone wings + thin body. CSS class drives a slow
// flutter animation; delay staggers each butterfly's loop.
const Butterfly = ({ x, y, palette, tilt = 0, scale = 1, delay = 0 }) => {
  const [c1, c2] = palette;
  return (
    <g
      className="eli-butterfly"
      style={{ animationDelay: `${delay.toFixed(2)}s` }}
    >
      <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${scale})`}>
        <ellipse cx={-3.5} cy={-1} rx="4" ry="3" fill={c1} opacity="0.92" />
        <ellipse cx={3.5} cy={-1} rx="4" ry="3" fill={c1} opacity="0.92" />
        <ellipse cx={-3.5} cy={3} rx="3" ry="2.5" fill={c2} opacity="0.92" />
        <ellipse cx={3.5} cy={3} rx="3" ry="2.5" fill={c2} opacity="0.92" />
        <line x1={0} y1={-3} x2={0} y2={5} stroke="var(--retro-brown-dark)" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </g>
  );
};

// Reusable 4-petal flower for ground decorations. Stem points down
// from the bloom and is sized relative to the bloom for consistency.
const Flower = ({ cx, cy, size = 5, petalColor, centerColor = 'var(--retro-gold)' }) => (
  <g>
    <line
      x1={cx}
      y1={cy + size + 1}
      x2={cx}
      y2={cy + size + 8}
      stroke="#5E7C3F"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle cx={cx - size * 0.6} cy={cy} r={size * 0.7} fill={petalColor} />
    <circle cx={cx + size * 0.6} cy={cy} r={size * 0.7} fill={petalColor} />
    <circle cx={cx} cy={cy - size * 0.6} r={size * 0.7} fill={petalColor} />
    <circle cx={cx} cy={cy + size * 0.6} r={size * 0.7} fill={petalColor} />
    <circle cx={cx} cy={cy} r={size * 0.5} fill={centerColor} />
  </g>
);

// Tulip — closed bloom on a tall stem with a single side leaf.
// `cy` marks the BLOOM position; the stem extends 18px below.
const Tulip = ({ cx, cy, color = 'var(--retro-burgundy)' }) => (
  <g>
    <line
      x1={cx}
      y1={cy + 2}
      x2={cx}
      y2={cy + 20}
      stroke="#5E7C3F"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <ellipse
      cx={cx - 4}
      cy={cy + 12}
      rx="3"
      ry="5"
      fill="#7BA05B"
      transform={`rotate(-25 ${cx - 4} ${cy + 12})`}
    />
    <path
      d={`M ${cx - 3.5} ${cy + 2} Q ${cx - 4.5} ${cy - 4} ${cx} ${cy - 6} Q ${cx + 4.5} ${cy - 4} ${cx + 3.5} ${cy + 2} Z`}
      fill={color}
    />
    <path
      d={`M ${cx - 1.5} ${cy} Q ${cx} ${cy - 4} ${cx + 1.5} ${cy}`}
      fill="none"
      stroke="rgba(0,0,0,0.18)"
      strokeWidth="0.8"
    />
  </g>
);

// Low leafy groundcover plant (hosta-style) — 3 broad ellipse leaves.
const LeafyPlant = ({ cx, cy }) => (
  <g>
    <ellipse
      cx={cx - 5}
      cy={cy}
      rx="6"
      ry="3.2"
      fill="#7BA05B"
      transform={`rotate(-22 ${cx - 5} ${cy})`}
    />
    <ellipse
      cx={cx + 5}
      cy={cy}
      rx="6"
      ry="3.2"
      fill="#88AB66"
      transform={`rotate(22 ${cx + 5} ${cy})`}
    />
    <ellipse cx={cx} cy={cy - 3} rx="5" ry="3" fill="#9CC074" />
  </g>
);

// Fern frond — curved spine with three leaflets that taper. `dir`
// controls the curve direction (1 = lean right, -1 = lean left).
const Fern = ({ cx, cy, dir = 1 }) => (
  <g>
    <path
      d={`M ${cx} ${cy} Q ${cx + 3 * dir} ${cy - 7} ${cx + 7 * dir} ${cy - 15}`}
      fill="none"
      stroke="#5E7C3F"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <ellipse
      cx={cx + 2 * dir}
      cy={cy - 4}
      rx="2.6"
      ry="1.2"
      fill="#7BA05B"
      transform={`rotate(${-35 * dir} ${cx + 2 * dir} ${cy - 4})`}
    />
    <ellipse
      cx={cx + 4 * dir}
      cy={cy - 9}
      rx="2.2"
      ry="1.1"
      fill="#88AB66"
      transform={`rotate(${-45 * dir} ${cx + 4 * dir} ${cy - 9})`}
    />
    <ellipse
      cx={cx + 5.5 * dir}
      cy={cy - 13}
      rx="1.6"
      ry="0.9"
      fill="#9CC074"
      transform={`rotate(${-55 * dir} ${cx + 5.5 * dir} ${cy - 13})`}
    />
  </g>
);

// Pohon pendamping — muncul di sisi kiri/kanan past 1.000 siraman.
// Dua varian:
//   - 'small'  : trunk pendek + canopy 3-lapis, tinggi ~30-40px,
//                ~30% berbuah. Pohon mungil pengisi background.
//   - 'medium' : trunk sedang + canopy 4-lapis dengan apricot
//                fruits, kira-kira setinggi pohon utama di fase 8
//                (pohon dewasa berbuah, tapi proporsi kecil). Selalu
//                berbuah supaya silhouette-nya kebaca sebagai
//                "pohon yang sudah berbuah".
// `tone` pilih palet hijau (terang / sedang / gelap).
const COMPANION_TONES = [
  { back: '#88AB66', main: '#9CC074', highlight: '#B3D097' },
  { back: '#5E7C3F', main: '#7BA05B', highlight: '#88AB66' },
  { back: '#4A6630', main: '#5E7C3F', highlight: '#7BA05B' },
];
const CompanionTree = ({ cx, cy, scale = 1, tone = 1, hasFruit = false, size = 'small' }) => {
  const p = COMPANION_TONES[tone] || COMPANION_TONES[1];
  const isMedium = size === 'medium';
  const trunkH = isMedium ? 50 : 18 * scale;
  const trunkW = isMedium ? 4.6 : Math.max(2, 2.4 * scale);
  const canopyR = isMedium ? 18 : 11 * scale;

  if (isMedium) {
    const top = cy - trunkH;
    return (
      <g>
        <ellipse cx={cx} cy={cy + 2} rx={canopyR * 1.15} ry={2.6} fill="#5C4A3A" opacity="0.26" />
        <rect
          x={cx - trunkW / 2}
          y={top}
          width={trunkW}
          height={trunkH}
          rx={trunkW / 4}
          fill="var(--retro-brown-dark)"
        />
        <rect
          x={cx - trunkW / 2 + 0.8}
          y={top + 4}
          width={Math.max(1, trunkW / 4)}
          height={trunkH - 8}
          fill="var(--retro-brown)"
          opacity="0.5"
        />
        <circle cx={cx - canopyR * 0.62} cy={top + 2} r={canopyR * 0.78} fill={p.back} opacity="0.86" />
        <circle cx={cx + canopyR * 0.62} cy={top + 2} r={canopyR * 0.78} fill={p.back} opacity="0.86" />
        <circle cx={cx} cy={top - 6} r={canopyR} fill={p.main} opacity="0.94" />
        <circle cx={cx - canopyR * 0.5} cy={top - 12} r={canopyR * 0.65} fill={p.highlight} opacity="0.86" />
        <circle cx={cx + canopyR * 0.5} cy={top - 12} r={canopyR * 0.65} fill={p.highlight} opacity="0.86" />
        <circle cx={cx} cy={top - 16} r={canopyR * 0.5} fill={p.highlight} opacity="0.78" />
        <circle cx={cx - canopyR * 0.55} cy={top - 2} r={2} fill="var(--retro-gold)" />
        <circle cx={cx + canopyR * 0.5} cy={top - 4} r={2} fill="var(--retro-gold)" />
        <circle cx={cx} cy={top + 2} r={1.8} fill="var(--retro-gold-light)" />
        <circle cx={cx - canopyR * 0.25} cy={top - 14} r={1.7} fill="var(--retro-gold)" />
        <circle cx={cx + canopyR * 0.3} cy={top - 9} r={1.7} fill="var(--retro-gold-light)" />
        <circle cx={cx - canopyR * 0.05} cy={top - 8} r={1.5} fill="var(--retro-gold)" />
      </g>
    );
  }

  return (
    <g>
      <ellipse cx={cx} cy={cy + 1.5} rx={canopyR * 1.05} ry={2} fill="#5C4A3A" opacity="0.22" />
      <rect
        x={cx - trunkW / 2}
        y={cy - trunkH}
        width={trunkW}
        height={trunkH}
        rx={trunkW / 4}
        fill="var(--retro-brown-dark)"
      />
      <circle cx={cx - canopyR * 0.5} cy={cy - trunkH} r={canopyR * 0.78} fill={p.back} opacity="0.86" />
      <circle cx={cx + canopyR * 0.5} cy={cy - trunkH} r={canopyR * 0.78} fill={p.back} opacity="0.86" />
      <circle cx={cx} cy={cy - trunkH - 3} r={canopyR} fill={p.main} opacity="0.94" />
      <circle cx={cx - canopyR * 0.3} cy={cy - trunkH - 6} r={canopyR * 0.55} fill={p.highlight} opacity="0.85" />
      {hasFruit && (
        <g>
          <circle cx={cx - canopyR * 0.45} cy={cy - trunkH - 1} r={1.4} fill="var(--retro-gold)" />
          <circle cx={cx + canopyR * 0.35} cy={cy - trunkH - 4} r={1.3} fill="var(--retro-gold-light)" />
          <circle cx={cx - canopyR * 0.05} cy={cy - trunkH + 2} r={1.2} fill="var(--retro-gold)" />
        </g>
      )}
    </g>
  );
};

// Spotted mushroom — cap + stalk with a couple of light spots.
const Mushroom = ({ cx, cy, capColor = 'var(--retro-burgundy)' }) => (
  <g>
    <rect x={cx - 2} y={cy - 1} width="4" height="6" rx="1.5" fill="var(--retro-cream)" />
    <ellipse cx={cx} cy={cy - 1} rx="7" ry="5" fill={capColor} />
    <ellipse cx={cx - 2.5} cy={cy - 2.5} rx="1.8" ry="1.1" fill="var(--retro-cream)" opacity="0.95" />
    <ellipse cx={cx + 2.5} cy={cy - 0.5} rx="1.4" ry="0.9" fill="var(--retro-cream)" opacity="0.9" />
  </g>
);

// Reusable apricot fruit. Stem + leaf included so it reads as a real
// fruit on the branch rather than just a yellow dot.
// Quotes random yg muncul saat fruit di-klik. Pendek, warm, tone
// Helismiley/seitansai. Picked random per click.
const FRUIT_QUOTES = [
  '+1 doa',
  'mekar',
  'tumbuh',
  '+1 ❤',
  'kebaikan',
  'untuk Eli',
  'jaga ya',
  'pop!',
];

const Apricot = ({ cx, cy, size }) => {
  // animKey berubah tiap klik supaya CSS animation re-trigger (re-mount
  // sub-group dgn key baru).
  const [animKey, setAnimKey] = useState(0);
  const [quote, setQuote] = useState(FRUIT_QUOTES[0]);

  const handleClick = (e) => {
    e.stopPropagation();
    setQuote(FRUIT_QUOTES[Math.floor(Math.random() * FRUIT_QUOTES.length)]);
    setAnimKey((k) => k + 1);
  };

  // Sway timing deterministic dari posisi fruit — fruits di posisi
  // beda dapat delay beda, jadi gak in-sync (kerasa alami, kayak
  // angin pelan goyangin). Delay 0-3.6s, duration 3.6-4.8s spread.
  const seed = Math.abs(Math.round(cx) * 7 + Math.round(cy) * 13);
  const swayDelay = `${(seed % 36) / 10}s`;
  const swayDuration = `${3.6 + ((seed % 13) / 13) * 1.2}s`;

  return (
    <g transform={`translate(${cx} ${cy})`} style={{ cursor: 'pointer' }}>
      {/* Outer sway group — ayun pelan dari stem (top), gak ikut
          ke-scale saat hover/pop di inner. */}
      <g
        className="eli-fruit-sway"
        style={{
          animationDelay: swayDelay,
          animationDuration: swayDuration,
        }}
      >
        <g
          key={`fruit-${animKey}`}
          className={animKey > 0 ? 'eli-fruit eli-fruit-pop' : 'eli-fruit'}
          onClick={handleClick}
          onPointerEnter={(e) => {
            e.currentTarget.classList.add('eli-fruit-hover');
          }}
          onPointerLeave={(e) => {
            e.currentTarget.classList.remove('eli-fruit-hover');
          }}
        >
          <circle cx={0} cy={0} r={size} fill="var(--retro-gold)" />
          <ellipse cx={-size * 0.3} cy={-size * 0.3} rx={size * 0.35} ry={size * 0.35} fill="var(--retro-gold-light)" opacity="0.85" />
          <line x1={0} y1={-size} x2={0} y2={-size - 4} stroke="var(--retro-brown-dark)" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse
            cx={3}
            cy={-size - 3}
            rx="3.5"
            ry="2.5"
            fill="#7BA05B"
            transform="rotate(35 3 -8)"
          />
        </g>
        {animKey > 0 && (
          <g key={`fx-${animKey}`} className="eli-fruit-fx" pointerEvents="none">
            {/* Floating quote di atas fruit */}
            <text
              x="0"
              y={-size - 8}
              fontSize="5.5"
              textAnchor="middle"
              fill="var(--retro-burgundy)"
              fontWeight="700"
              className="eli-fruit-quote"
            >
              {quote}
            </text>
            {/* 3 spark particles meletup keluar */}
            <circle cx={-size - 1} cy={-size * 0.4} r="0.9" fill="var(--retro-gold-light)" className="eli-fruit-spark eli-fruit-spark-l" />
            <circle cx={size + 1} cy={-size * 0.4} r="0.9" fill="var(--retro-gold-light)" className="eli-fruit-spark eli-fruit-spark-r" />
            <circle cx="0" cy={size + 1} r="0.9" fill="var(--retro-gold-light)" className="eli-fruit-spark eli-fruit-spark-b" />
          </g>
        )}
      </g>
    </g>
  );
};

// Count-up hook — animate number dari prev → target value (ease-out
// cubic). Hindari snapping yg kerasa "ngehack". Smooth tween 700ms.
const useCountUp = (target, duration = 700) => {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) {
      setDisplay(to);
      return undefined;
    }
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      setDisplay(v);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
};

const EliTree = () => {
  const [count, setCount] = useState(0);
  const [supportedToday, setSupportedToday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'success'|'error', message }
  const [justAdvancedStage, setJustAdvancedStage] = useState(null);
  // Wobble state — tree goyang singkat begitu support sukses.
  const [wobbleKey, setWobbleKey] = useState(0);
  const [liveWishes, setLiveWishes] = useState([]);
  const [openWish, setOpenWish] = useState(null);
  // One random seed picked once per mount. Drives the hanging-wish
  // shuffle below via a deterministic PRNG so the memo stays pure
  // (Math.random() during render trips react-hooks/purity).
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));

  // Animated counter — display tween dari nilai sebelumnya ke target.
  const displayCount = useCountUp(count);

  useEffect(() => {
    setSupportedToday(hasSupportedToday());
    const unsubCount = subscribeToTreeSupports(setCount);
    const unsubWishes = subscribeToWishes(setLiveWishes);
    return () => {
      unsubCount();
      unsubWishes();
    };
  }, []);

  // Combined wish pool used for the hanging cards at the max stage —
  // curated seeds from siteConfig + live RTDB submissions, shuffled
  // per page load so every wish gets fair rotation across refreshes
  // instead of the newest 10 dominating forever. Seeded mulberry32 PRNG
  // keeps this deterministic for a given mount.
  const hangingWishes = useMemo(() => {
    const seeds = (SITE_CONFIG.wishes?.seeds || []).map((s) => ({
      ...s,
      id: s.id || seedHashId(s),
    }));
    const pool = [...seeds, ...liveWishes];
    let s = shuffleSeed >>> 0;
    const rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }, [liveWishes, shuffleSeed]);

  // Esc-to-close on the open wish modal
  useEffect(() => {
    if (!openWish) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') setOpenWish(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openWish]);

  const stage = Math.min(MAX_STAGE, Math.floor(count / SUPPORTS_PER_STAGE));
  const stageMeta = STAGES[stage];
  const isMaxStage = stage >= MAX_STAGE;
  const intoCurrentStage = count - stage * SUPPORTS_PER_STAGE;
  const progressPct = isMaxStage ? 100 : (intoCurrentStage / SUPPORTS_PER_STAGE) * 100;
  const supportsToNext = isMaxStage ? 0 : SUPPORTS_PER_STAGE - intoCurrentStage;

  const handleSupport = async () => {
    if (supportedToday || submitting) return;
    if (!isFirebaseConfigured) {
      setFeedback({
        kind: 'error',
        message:
          'Mode demo — Firebase belum dikonfigurasi. Dukungan tidak tersimpan sampai owner men-set env vars.',
      });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const prevStage = stage;
    const result = await incrementTreeSupports();
    setSubmitting(false);
    if (result.ok) {
      setSupportedToday(true);
      markSupportedToday();
      setFeedback({
        kind: 'success',
        message: 'Terima kasih! Dukunganmu sudah dikirim. Kembali besok untuk menyiram lagi 🌱',
      });
      // Trigger wobble (re-mount via key bump supaya animation restart).
      setWobbleKey((k) => k + 1);
      const newStage = Math.min(MAX_STAGE, Math.floor((result.count || count + 1) / SUPPORTS_PER_STAGE));
      if (newStage > prevStage) {
        setJustAdvancedStage(newStage);
        setTimeout(() => setJustAdvancedStage(null), 5000);
      }
    } else {
      setFeedback({
        kind: 'error',
        message: result.error || 'Gagal mengirim dukungan, coba lagi sebentar lagi.',
      });
    }
  };

  return (
    <section
      aria-label="Pohon untuk Eli"
      className="relative px-5 sm:px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-gradient-to-b from-[color:var(--retro-bg-primary)] via-[color:var(--retro-bg-secondary)] to-[color:var(--retro-bg-primary)]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-10 lg:gap-16 items-center">
          {/* LEFT — tree + counter. Wider lg column so the tree has
              room to grow without being cramped against the form. */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-full flex justify-center">
              {/* Wrapper untuk wobble — key bump force animation restart
                  tiap kali user siram sukses. w-full supaya SVG tree
                  tetap stretch fill parent (jangan shrink). */}
              <div
                key={`wobble-${wobbleKey}`}
                className={`w-full ${wobbleKey > 0 ? 'eli-tree-wobble' : ''}`}
              >
                <TreeArt
                  stage={stage}
                  count={count}
                  wishes={hangingWishes}
                  onOpenWish={setOpenWish}
                />
              </div>

              {/* Water droplets — tetes air jatuh dari atas tree ke
                  kanopi tiap user klik support sukses. Re-mount lewat
                  wobbleKey supaya tiap siram baru ngerasa fresh. */}
              {wobbleKey > 0 && (
                <div
                  key={`drops-${wobbleKey}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 w-80 h-72 overflow-hidden"
                >
                  {Array.from({ length: 10 }).map((_, i) => {
                    // Spread horizontal -110 to +110 px relative center.
                    const x = -110 + (i / 9) * 220 + ((i * 11) % 7 - 3);
                    const delay = (i * 0.05).toFixed(2);
                    const dur = (1.1 + (i % 5) * 0.12).toFixed(2);
                    return (
                      <span
                        key={i}
                        className="absolute eli-water-drop"
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: '-8px',
                          animationDelay: `${delay}s`,
                          animationDuration: `${dur}s`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Stage advance burst — confetti + flash label di atas
                  pohon. Lebih dramatis dari chip kecil sebelumnya. */}
              {justAdvancedStage != null && (
                <>
                  {/* Confetti burst dari atas tree */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const colors = ['#8b4040', '#c9a961', '#e85064', '#f4d0a0', '#f4a8c0', '#a95050'];
                      const c = colors[i % colors.length];
                      // Spread linear dgn jitter — left jadi negatif/positif
                      // relatif center, range -150 to +150 px.
                      const xOff = -150 + (i / 13) * 300 + ((i * 7) % 13 - 6);
                      return (
                        <span
                          key={`adv-conf-${justAdvancedStage}-${i}`}
                          className="absolute eli-stage-confetti"
                          style={{
                            left: `calc(50% + ${xOff}px)`,
                            top: '-10px',
                            background: c,
                            animationDelay: `${(i * 0.06).toFixed(2)}s`,
                            animationDuration: `${(2.2 + (i % 5) * 0.25).toFixed(2)}s`,
                          }}
                        />
                      );
                    })}
                  </div>
                  {/* Big radial flash */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full eli-stage-flash"
                  />
                  {/* Stage label — bigger + pulse */}
                  <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-5 py-2.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-[0_10px_40px_-8px_rgba(139,64,64,0.7)] eli-stage-badge">
                      <span className="block text-[9px] font-black uppercase tracking-[0.32em] opacity-75 text-center">
                        Pohon naik level
                      </span>
                      <span className="flex items-center justify-center gap-2 mt-0.5">
                        <i className="ri-sparkling-2-fill text-base text-[color:var(--retro-gold-light)]" />
                        <span className="font-header italic text-sm">
                          {STAGES[justAdvancedStage]?.label}
                        </span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
                <i className={`${stageMeta.icon} text-base`} />
                {stageMeta.label} · Stage {stage}/{MAX_STAGE}
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-text-secondary)] max-w-xs mx-auto leading-snug">
                {stageMeta.detail}
              </p>
            </div>
          </div>

          {/* RIGHT — copy + counter + button */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Pohon Kebaikan · Live
            </p>
            <h2 className="font-header text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
              Pohon untuk
              <span className="text-[color:var(--retro-burgundy)]"> Eli.</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-md">
              Tekan tombol di bawah untuk memberi 1 dukungan. Setiap 100 dukungan, pohonnya
              tumbuh ke tahap berikutnya — sampai berbunga dan berbuah aprikot. Satu orang
              hanya bisa menyiram 1× per hari, jadi kembalilah besok untuk menyiram lagi.
            </p>

            {/* Big counter */}
            <div className="mt-6 flex items-end gap-4 flex-wrap">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-1">
                  Dukungan Terkumpul
                </p>
                <p className="font-header text-6xl md:text-7xl font-black tabular-nums text-[color:var(--retro-burgundy)] leading-none">
                  {displayCount.toLocaleString('id-ID')}
                </p>
              </div>
              {!isMaxStage && (
                <p className="text-xs text-[color:var(--color-text-muted)] mb-2 font-bold">
                  +{supportsToNext} lagi menuju{' '}
                  <span className="text-[color:var(--retro-burgundy)] uppercase tracking-[0.2em] text-[10px] font-black">
                    {STAGES[stage + 1]?.label}
                  </span>
                </p>
              )}
            </div>

            {/* Progress bar to next stage */}
            <div className="mt-3 h-2 rounded-full bg-[color:var(--retro-burgundy)]/12 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[color:var(--retro-burgundy)] to-[color:var(--retro-gold)] transition-[width] duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={handleSupport}
              disabled={supportedToday || submitting}
              className={`mt-6 inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-bold text-sm uppercase tracking-widest transition-all shadow-lg ${
                supportedToday
                  ? 'bg-[color:var(--retro-brown-dark)]/15 text-[color:var(--color-text-muted)] cursor-default'
                  : submitting
                  ? 'bg-[color:var(--retro-burgundy)]/70 text-[color:var(--retro-cream)] cursor-wait'
                  : 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:-translate-y-0.5 hover:shadow-xl active:scale-95'
              }`}
            >
              {supportedToday ? (
                <>
                  <i className="ri-checkbox-circle-line text-lg" />
                  Sudah menyiram hari ini
                </>
              ) : submitting ? (
                <>
                  <i className="ri-loader-4-line text-lg animate-spin" />
                  Mengirim…
                </>
              ) : (
                <>
                  <i className="ri-water-flash-line text-lg" />
                  Beri 1 Dukungan
                </>
              )}
            </button>

            {feedback && (
              <p
                className={`mt-3 text-xs leading-snug ${
                  feedback.kind === 'success'
                    ? 'text-emerald-700'
                    : 'text-red-700'
                }`}
              >
                {feedback.message}
              </p>
            )}

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] inline-flex items-center gap-2">
              <i className="ri-time-line text-base" />
              Reset tiap tengah malam · 1 device · 1 dukungan / hari
            </p>
          </div>
        </div>
      </div>

      {/* Wish open modal — fired when a hanging card on the canopy
          is clicked. Click outside, Esc, or the X button closes. */}
      {openWish && (
        <WishModal wish={openWish} onClose={() => setOpenWish(null)} />
      )}
    </section>
  );
};

const WishModal = ({ wish, onClose }) => {
  const formatted = (() => {
    if (!wish.date) return '';
    const d = new Date(wish.date);
    if (Number.isNaN(d.getTime())) return wish.date;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ucapan dari ${wish.name}`}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8 bg-[color:var(--retro-brown-dark)]/70 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-[color:var(--retro-cream)] shadow-2xl border-2 border-[color:var(--retro-burgundy)]/20 overflow-hidden"
      >
        {/* Top burgundy strip */}
        <div className="h-2 bg-gradient-to-r from-[color:var(--retro-burgundy)] via-[color:var(--retro-gold)] to-[color:var(--retro-burgundy)]" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup ucapan"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[color:var(--retro-burgundy)]/10 hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] flex items-center justify-center text-xl transition-colors"
        >
          <i className="ri-close-line" />
        </button>
        <div className="p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2 mb-4">
            <i className="ri-mail-heart-line text-base" />
            Ucapan untuk Eli
          </p>
          <h3 className="font-header text-2xl md:text-3xl font-black text-[color:var(--retro-text-primary)] tracking-tight leading-tight">
            {wish.name}
          </h3>
          {wish.handle && (
            <p className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)]">
              {wish.handle}
            </p>
          )}
          <blockquote className="mt-5 pl-4 border-l-2 border-[color:var(--retro-burgundy)]/40 text-sm md:text-base text-[color:var(--retro-text-secondary)] leading-relaxed italic">
            "{wish.message}"
          </blockquote>
          {formatted && (
            <p className="mt-5 pt-4 border-t border-[color:var(--retro-brown-dark)]/10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] inline-flex items-center gap-1.5">
              <i className="ri-calendar-line text-base" />
              {formatted}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EliTree;
