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

import React, { useEffect, useState } from 'react';
import {
  subscribeToTreeSupports,
  incrementTreeSupports,
} from '../../lib/treeDb';
import { isFirebaseConfigured } from '../../lib/firebase';

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
const VIEWBOX_W = 400;
const VIEWBOX_H = 460;

const TreeArt = ({ stage }) => {
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

  // Pot cracks start at stage 4. potBroken === split visually at 5+.
  const potCracked = stage >= 4;
  const potBroken = stage >= 5;
  // Roots peek out from cracks starting stage 4, expand at stage 6.
  const rootsVisible = stage >= 4;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
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

      {/* Pot — at stage 5+ rendered as two halves split apart slightly,
          otherwise a single piece. */}
      {!potBroken && (
        <g style={{ transition: 'opacity 0.6s ease' }}>
          <path
            d={`M ${CENTER_X - 100} ${POT_TOP_Y + 14} Q ${CENTER_X - 100} ${POT_BOTTOM_Y} ${CENTER_X - 60} ${POT_BOTTOM_Y} L ${CENTER_X + 60} ${POT_BOTTOM_Y} Q ${CENTER_X + 100} ${POT_BOTTOM_Y} ${CENTER_X + 100} ${POT_TOP_Y + 14} L ${CENTER_X + 92} ${POT_TOP_Y} L ${CENTER_X - 92} ${POT_TOP_Y} Z`}
            fill="var(--retro-brown)"
          />
          <ellipse cx={CENTER_X} cy={POT_TOP_Y} rx="92" ry="9" fill="var(--retro-brown-dark)" />
        </g>
      )}

      {/* Stage 4: cracks visible on the still-intact pot */}
      {potCracked && !potBroken && (
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

      {/* Stage 5+: pot split into two halves, gap in the middle filled
          with soil that bulges up. Halves slide apart slightly so the
          cracks read as "pecah". */}
      {potBroken && (
        <g style={{ transition: 'all 0.8s ease' }}>
          {/* LEFT HALF — tilted slightly */}
          <g transform={`translate(-${Math.min(8, (stage - 4) * 2)} 0) rotate(-3 ${CENTER_X - 100} ${POT_BOTTOM_Y})`}>
            <path
              d={`M ${CENTER_X - 100} ${POT_TOP_Y + 14} Q ${CENTER_X - 100} ${POT_BOTTOM_Y} ${CENTER_X - 60} ${POT_BOTTOM_Y} L ${CENTER_X - 12} ${POT_BOTTOM_Y} L ${CENTER_X - 16} ${POT_TOP_Y + 32} L ${CENTER_X - 22} ${POT_TOP_Y + 14} L ${CENTER_X - 36} ${POT_TOP_Y} L ${CENTER_X - 92} ${POT_TOP_Y} Z`}
              fill="var(--retro-brown)"
            />
            <ellipse cx={CENTER_X - 64} cy={POT_TOP_Y} rx="28" ry="6" fill="var(--retro-brown-dark)" opacity="0.85" />
          </g>
          {/* RIGHT HALF — tilted opposite */}
          <g transform={`translate(${Math.min(8, (stage - 4) * 2)} 0) rotate(3 ${CENTER_X + 100} ${POT_BOTTOM_Y})`}>
            <path
              d={`M ${CENTER_X + 12} ${POT_BOTTOM_Y} L ${CENTER_X + 60} ${POT_BOTTOM_Y} Q ${CENTER_X + 100} ${POT_BOTTOM_Y} ${CENTER_X + 100} ${POT_TOP_Y + 14} L ${CENTER_X + 92} ${POT_TOP_Y} L ${CENTER_X + 36} ${POT_TOP_Y} L ${CENTER_X + 22} ${POT_TOP_Y + 14} L ${CENTER_X + 16} ${POT_TOP_Y + 32} Z`}
              fill="var(--retro-brown)"
            />
            <ellipse cx={CENTER_X + 64} cy={POT_TOP_Y} rx="28" ry="6" fill="var(--retro-brown-dark)" opacity="0.85" />
          </g>
          {/* Soil bulging through the broken middle */}
          <ellipse cx={CENTER_X} cy={POT_TOP_Y + 6} rx="40" ry="10" fill="var(--retro-brown-dark)" />
          <ellipse cx={CENTER_X} cy={POT_TOP_Y - 2} rx="32" ry="6" fill="#5C4A3A" />
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

      {/* Branches — multiply at higher stages */}
      {stage >= 3 && (
        <g
          stroke="var(--retro-brown-dark)"
          strokeWidth={Math.min(8, 4 + Math.max(0, stage - 4))}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'all 0.7s ease' }}
        >
          {/* Always-present main pair */}
          <path d={`M ${CENTER_X} ${trunkY + 14} Q ${CENTER_X - 36} ${trunkY} ${CENTER_X - 64} ${trunkY - 24}`} />
          <path d={`M ${CENTER_X} ${trunkY + 14} Q ${CENTER_X + 36} ${trunkY} ${CENTER_X + 64} ${trunkY - 24}`} />
          {/* Stage 5+ — second pair lower on trunk */}
          {stage >= 5 && (
            <>
              <path d={`M ${CENTER_X} ${trunkY + 50} Q ${CENTER_X - 48} ${trunkY + 36} ${CENTER_X - 86} ${trunkY + 12}`} />
              <path d={`M ${CENTER_X} ${trunkY + 50} Q ${CENTER_X + 48} ${trunkY + 36} ${CENTER_X + 86} ${trunkY + 12}`} />
            </>
          )}
          {/* Stage 6+ — third pair (banyak cabang) */}
          {stage >= 6 && (
            <>
              <path d={`M ${CENTER_X} ${trunkY - 4} Q ${CENTER_X - 22} ${trunkY - 30} ${CENTER_X - 40} ${trunkY - 56}`} />
              <path d={`M ${CENTER_X} ${trunkY - 4} Q ${CENTER_X + 22} ${trunkY - 30} ${CENTER_X + 40} ${trunkY - 56}`} />
              <path d={`M ${CENTER_X - 50} ${trunkY - 18} Q ${CENTER_X - 70} ${trunkY - 32} ${CENTER_X - 96} ${trunkY - 44}`} />
              <path d={`M ${CENTER_X + 50} ${trunkY - 18} Q ${CENTER_X + 70} ${trunkY - 32} ${CENTER_X + 96} ${trunkY - 44}`} />
            </>
          )}
          {/* Stage 9+ — extra spread on the lower outer branches */}
          {stage >= 9 && (
            <>
              <path d={`M ${CENTER_X - 86} ${trunkY + 12} Q ${CENTER_X - 110} ${trunkY - 4} ${CENTER_X - 136} ${trunkY - 14}`} />
              <path d={`M ${CENTER_X + 86} ${trunkY + 12} Q ${CENTER_X + 110} ${trunkY - 4} ${CENTER_X + 136} ${trunkY - 14}`} />
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

      {/* Sparkles for the maxed-out tree */}
      {stage >= MAX_STAGE && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [70, 100], [330, 110], [50, 240], [350, 250], [80, 180], [320, 170],
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

  useEffect(() => {
    setSupportedToday(hasSupportedToday());
    const unsub = subscribeToTreeSupports(setCount);
    return unsub;
  }, []);

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
              <TreeArt stage={stage} />
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
    </section>
  );
};

export default EliTree;
