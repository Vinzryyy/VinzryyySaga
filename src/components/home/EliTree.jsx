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

// Card hang positions around the canopy at the max stage. Each entry
// describes where the string anchors to a branch (anchorY) and where
// the card body hangs below it. Coordinates are in the SVG's viewBox
// space and assume CENTER_X = 200 / POT_TOP_Y = 320 / max trunkY ~ 58.
const HANG_POSITIONS = [
  { dx: -120, dy: -180, hang: 32 },
  { dx: 120, dy: -180, hang: 28 },
  { dx: -60, dy: -220, hang: 30 },
  { dx: 60, dy: -220, hang: 26 },
  { dx: -160, dy: -130, hang: 34 },
  { dx: 160, dy: -130, hang: 30 },
  { dx: -100, dy: -90, hang: 38 },
  { dx: 100, dy: -90, hang: 30 },
  { dx: 0, dy: -140, hang: 40 },
  { dx: -50, dy: -50, hang: 28 },
  { dx: 50, dy: -50, hang: 28 },
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
  { id: 10, label: 'Pohon Megah', icon: 'ri-sparkling-2-fill', detail: 'Pohon megah dengan akar terlihat — komunitas membawanya sampai ke puncak. Terima kasih.' },
];

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

const TreeArt = ({ stage, wishes = [], onOpenWish }) => {
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
  // (the tree has outgrown it). Soil mound + roots remain to anchor
  // the tree visually.
  const potCracked = stage >= 4;
  const potVisible = stage <= 4;
  // Roots peek out from cracks starting stage 4, expand at stage 6.
  const rootsVisible = stage >= 4;

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

      {/* Roots emerging beyond the pot — stage 4+, spread further at
          higher stages. Drawn before the pot so the pot edges sit on
          top of where the roots meet it. */}
      {rootsVisible && (
        <g
          stroke="var(--retro-brown-dark)"
          strokeWidth={Math.min(7, 3 + (stage - 4))}
          strokeLinecap="round"
          fill="none"
          opacity={Math.min(1, (stage - 3) * 0.3)}
          style={{ transition: 'all 0.8s ease' }}
        >
          <path d={`M ${CENTER_X - 60} ${POT_TOP_Y + 6} Q ${CENTER_X - 90} ${POT_TOP_Y + 28} ${CENTER_X - 130} ${POT_BOTTOM_Y - 4}`} />
          <path d={`M ${CENTER_X + 60} ${POT_TOP_Y + 6} Q ${CENTER_X + 90} ${POT_TOP_Y + 28} ${CENTER_X + 130} ${POT_BOTTOM_Y - 4}`} />
          {stage >= 5 && (
            <>
              <path d={`M ${CENTER_X - 30} ${POT_TOP_Y + 10} Q ${CENTER_X - 50} ${POT_BOTTOM_Y - 8} ${CENTER_X - 80} ${POT_BOTTOM_Y + 14}`} />
              <path d={`M ${CENTER_X + 30} ${POT_TOP_Y + 10} Q ${CENTER_X + 50} ${POT_BOTTOM_Y - 8} ${CENTER_X + 80} ${POT_BOTTOM_Y + 14}`} />
            </>
          )}
          {stage >= 7 && (
            <>
              <path d={`M ${CENTER_X - 100} ${POT_TOP_Y + 18} Q ${CENTER_X - 140} ${POT_BOTTOM_Y} ${CENTER_X - 180} ${POT_BOTTOM_Y + 12}`} />
              <path d={`M ${CENTER_X + 100} ${POT_TOP_Y + 18} Q ${CENTER_X + 140} ${POT_BOTTOM_Y} ${CENTER_X + 180} ${POT_BOTTOM_Y + 12}`} />
            </>
          )}
        </g>
      )}

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

      {/* Branches — proper limb structure that fans out into the
          canopy. Each tier targets a row of HANG_POSITIONS so the
          stage-10 wish cards land on or near a real branch tip
          rather than floating in the foliage:
          - Primary L/R       → cards at (±100, -90)
          - Side twigs        → cards at (±50, -50)
          - Center upward     → card at (0, -140)
          - Lower outer pair  → cards at (±160, -130)
          - Upper inner forks → cards at (±60, -220)
          - Wider mid forks   → cards at (±120, -180)        */}
      {stage >= 3 && (
        <g
          stroke="var(--retro-brown-dark)"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'all 0.7s ease' }}
        >
          {/* Primary pair — main outward limbs from trunk top */}
          <path
            strokeWidth={Math.min(9, 4 + Math.max(0, stage - 3))}
            d={`M ${CENTER_X} ${trunkY + 18} Q ${CENTER_X - 50} ${trunkY - 30} ${CENTER_X - 100} ${trunkY - 90}`}
          />
          <path
            strokeWidth={Math.min(9, 4 + Math.max(0, stage - 3))}
            d={`M ${CENTER_X} ${trunkY + 18} Q ${CENTER_X + 50} ${trunkY - 30} ${CENTER_X + 100} ${trunkY - 90}`}
          />

          {/* Stage 4+ — short side twigs near the trunk top */}
          {stage >= 4 && (
            <>
              <path
                strokeWidth={Math.min(5, 2 + (stage - 4))}
                d={`M ${CENTER_X - 6} ${trunkY + 12} Q ${CENTER_X - 28} ${trunkY - 12} ${CENTER_X - 50} ${trunkY - 50}`}
              />
              <path
                strokeWidth={Math.min(5, 2 + (stage - 4))}
                d={`M ${CENTER_X + 6} ${trunkY + 12} Q ${CENTER_X + 28} ${trunkY - 12} ${CENTER_X + 50} ${trunkY - 50}`}
              />
            </>
          )}

          {/* Stage 5+ — center limb shooting straight up */}
          {stage >= 5 && (
            <path
              strokeWidth={Math.min(7, 3 + (stage - 5))}
              d={`M ${CENTER_X} ${trunkY + 4} Q ${CENTER_X - 8} ${trunkY - 70} ${CENTER_X} ${trunkY - 140}`}
            />
          )}

          {/* Stage 6+ — lower outer pair sweeping from mid-trunk to canopy edge */}
          {stage >= 6 && (
            <>
              <path
                strokeWidth={Math.min(7, 3 + (stage - 6))}
                d={`M ${CENTER_X} ${trunkY + 70} Q ${CENTER_X - 70} ${trunkY + 20} ${CENTER_X - 160} ${trunkY - 130}`}
              />
              <path
                strokeWidth={Math.min(7, 3 + (stage - 6))}
                d={`M ${CENTER_X} ${trunkY + 70} Q ${CENTER_X + 70} ${trunkY + 20} ${CENTER_X + 160} ${trunkY - 130}`}
              />
            </>
          )}

          {/* Stage 7+ — upper inner forks off the primary limbs */}
          {stage >= 7 && (
            <>
              <path
                strokeWidth={Math.min(5, 2 + (stage - 7))}
                d={`M ${CENTER_X - 60} ${trunkY - 50} Q ${CENTER_X - 80} ${trunkY - 130} ${CENTER_X - 60} ${trunkY - 220}`}
              />
              <path
                strokeWidth={Math.min(5, 2 + (stage - 7))}
                d={`M ${CENTER_X + 60} ${trunkY - 50} Q ${CENTER_X + 80} ${trunkY - 130} ${CENTER_X + 60} ${trunkY - 220}`}
              />
            </>
          )}

          {/* Stage 8+ — wider mid forks reaching upper-outer canopy */}
          {stage >= 8 && (
            <>
              <path
                strokeWidth={Math.min(5, 2 + (stage - 8))}
                d={`M ${CENTER_X - 90} ${trunkY - 80} Q ${CENTER_X - 110} ${trunkY - 130} ${CENTER_X - 120} ${trunkY - 180}`}
              />
              <path
                strokeWidth={Math.min(5, 2 + (stage - 8))}
                d={`M ${CENTER_X + 90} ${trunkY - 80} Q ${CENTER_X + 110} ${trunkY - 130} ${CENTER_X + 120} ${trunkY - 180}`}
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
                  strokeWidth="1"
                  opacity="0.5"
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
  // curated seeds from siteConfig + live RTDB submissions, newest
  // first so the freshest ones land on the most-visible branches.
  const hangingWishes = useMemo(() => {
    const seeds = (SITE_CONFIG.wishes?.seeds || []).map((s) => ({
      ...s,
      id: s.id || seedHashId(s),
    }));
    return [...seeds, ...liveWishes].sort(
      (a, b) => (b.date || '').localeCompare(a.date || ''),
    );
  }, [liveWishes]);

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
              Galeri Kebaikan · Live
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
