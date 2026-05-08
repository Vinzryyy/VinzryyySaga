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

import React, { useEffect, useMemo, useState } from 'react';
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

  // Trunk + (when present) pot occupy a footprint that flowers must
  // dodge so they don't render in front of the trunk or inside the pot.
  const inTrunkOrPot = (x, y) => {
    if (Math.abs(x - 200) < 26 && y < 320) return true;
    if (potVisible && y >= 318 && y <= 362 && x >= 100 && x <= 300) return true;
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
      companions.push({
        x, y,
        scale: 0.85 + companionRand() * 0.55,    // 0.85..1.4
        tone: Math.floor(companionRand() * 3),   // 0..2 hue palette
        hasFruit: companionRand() < 0.3,         // ~30% berbuah
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

// Pohon kecil pendamping — muncul di sisi kiri/kanan past 1.000
// siraman (lihat companions generation di generateEcosystem).
// Trunk pendek + canopy 3-lapis supaya silhouette-nya kebaca sebagai
// pohon mungil, bukan semak. `tone` pilih palet hijau (terang / sedang
// / gelap), `hasFruit` nambahin ~3 buah aprikot kecil di canopy.
const COMPANION_TONES = [
  { back: '#88AB66', main: '#9CC074', highlight: '#B3D097' },
  { back: '#5E7C3F', main: '#7BA05B', highlight: '#88AB66' },
  { back: '#4A6630', main: '#5E7C3F', highlight: '#7BA05B' },
];
const CompanionTree = ({ cx, cy, scale = 1, tone = 1, hasFruit = false }) => {
  const trunkH = 18 * scale;
  const trunkW = Math.max(2, 2.4 * scale);
  const canopyR = 11 * scale;
  const p = COMPANION_TONES[tone] || COMPANION_TONES[1];
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
const Apricot = ({ cx, cy, size }) => (
  <g>
    <circle cx={cx} cy={cy} r={size} fill="var(--retro-gold)" />
    <ellipse cx={cx - size * 0.3} cy={cy - size * 0.3} rx={size * 0.35} ry={size * 0.35} fill="var(--retro-gold-light)" opacity="0.85" />
    <line x1={cx} y1={cy - size} x2={cx} y2={cy - size - 4} stroke="var(--retro-brown-dark)" strokeWidth="1.5" strokeLinecap="round" />
    <ellipse
      cx={cx + 3}
      cy={cy - size - 3}
      rx="3.5"
      ry="2.5"
      fill="#7BA05B"
      transform={`rotate(35 ${cx + 3} ${cy - size - 3})`}
    />
  </g>
);

const EliTree = () => {
  const [count, setCount] = useState(0);
  const [supportedToday, setSupportedToday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'success'|'error', message }
  const [justAdvancedStage, setJustAdvancedStage] = useState(null);
  const [liveWishes, setLiveWishes] = useState([]);
  const [openWish, setOpenWish] = useState(null);
  // One random seed picked once per mount. Drives the hanging-wish
  // shuffle below via a deterministic PRNG so the memo stays pure
  // (Math.random() during render trips react-hooks/purity).
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));

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
              <TreeArt
                stage={stage}
                count={count}
                wishes={hangingWishes}
                onOpenWish={setOpenWish}
              />
              {justAdvancedStage != null && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.3em] shadow-lg animate-[fadeIn_0.4s_ease-out]">
                  <i className="ri-sparkling-2-fill mr-1" />
                  Pohon naik level: {STAGES[justAdvancedStage]?.label}
                </div>
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
                  {count}
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
