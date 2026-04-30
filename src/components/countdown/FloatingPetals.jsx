/**
 * FloatingPetals — apricot-blossom petals drifting down across the
 * viewport. Subtle ambient motif that ties the page to the Armeniaca
 * brand (Prunus armeniaca) without competing with content.
 *
 * Design notes:
 *  - 12 petals, low opacity (~0.4 max), slow fall (18-26s each), each
 *    with its own sway delta + rotation so the group never feels
 *    synchronized.
 *  - Pure CSS animations + inline SVG — no library, no images, no
 *    layout cost.
 *  - Pinned to position: fixed so the petals follow the viewport on
 *    scroll instead of disappearing once you scroll past the hero.
 *  - z-index 5: above the page background, below all content
 *    (content sections are z-10+ via their own positioning context).
 *  - pointer-events: none so the petals never block clicks.
 *  - Honors prefers-reduced-motion (renders nothing — no still petals
 *    cluttering the page).
 */

import React from 'react';

const PETAL_COUNT = 12;

// Deterministic pseudo-random spread so SSR/client agree and so the
// petals don't bunch up after refresh.
const seeded = (i, mod) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % mod;

const PETAL_FILLS = [
  'var(--retro-burgundy-light)',
  'var(--retro-burgundy)',
  'var(--retro-sepia)',
  'var(--retro-gold-light)',
];

const FloatingPetals = () => (
  <div className="bd-petals-layer" aria-hidden="true">
    {Array.from({ length: PETAL_COUNT }).map((_, i) => {
      const left = (i * 37 + seeded(i, 13)) % 100;
      const delay = -seeded(i, 18); // negative delay so animation starts mid-cycle
      const duration = 18 + seeded(i, 8); // 18-26s
      const size = 10 + (i % 3) * 4; // 10, 14, 18
      const fill = PETAL_FILLS[i % PETAL_FILLS.length];
      const sway = (i % 2 === 0 ? 1 : -1) * (16 + (i % 3) * 6);
      const startTilt = (i * 47) % 360;
      const opacity = 0.25 + (i % 4) * 0.05; // 0.25-0.4

      return (
        <div
          key={i}
          className="bd-petal"
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            ['--bd-petal-sway']: `${sway}px`,
            ['--bd-petal-tilt']: `${startTilt}deg`,
            opacity,
          }}
        >
          <svg width={size} height={size * 1.3} viewBox="0 0 24 32">
            {/* Apricot blossom petal silhouette — teardrop with a
                soft notch at the tip for extra "petal" feel. */}
            <path
              d="M12 2 C18 6, 21 14, 19 22 C17 28, 13 30, 12 30 C11 30, 7 28, 5 22 C3 14, 6 6, 12 2 Z"
              fill={fill}
            />
          </svg>
        </div>
      );
    })}

    <style>{`
      .bd-petals-layer {
        position: fixed;
        inset: 0;
        z-index: 5;
        pointer-events: none;
        overflow: hidden;
      }
      .bd-petal {
        position: absolute;
        top: -40px;
        will-change: transform;
        animation-name: bd-petal-fall;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      @keyframes bd-petal-fall {
        0% {
          transform: translate3d(0, -10vh, 0) rotate(var(--bd-petal-tilt, 0deg));
        }
        50% {
          transform: translate3d(var(--bd-petal-sway, 0), 50vh, 0)
                     rotate(calc(var(--bd-petal-tilt, 0deg) + 180deg));
        }
        100% {
          transform: translate3d(0, 110vh, 0)
                     rotate(calc(var(--bd-petal-tilt, 0deg) + 360deg));
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .bd-petals-layer { display: none; }
      }
    `}</style>
  </div>
);

export default FloatingPetals;
