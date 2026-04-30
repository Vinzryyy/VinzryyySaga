/**
 * BirthdayCelebration — full-viewport festive overlay that paints when
 * Eli's birthday countdown reaches zero. Rises balloons from the bottom,
 * drops confetti from the top, and twinkles sparkles in the middle band.
 *
 * Design notes:
 *  - All animation is pure CSS (transform-only, GPU-friendly) so we don't
 *    pull in a confetti library just for this one moment.
 *  - pointer-events: none — the overlay never blocks scroll or clicks
 *    underneath.
 *  - Particles loop infinitely once active (matches Google Doodle style
 *    where the celebration persists while you stay on the page).
 *  - Honors prefers-reduced-motion: nothing renders at all in that case,
 *    so users who opted out of motion don't see flickering still-frames.
 *  - Brand palette only — no rainbow. Burgundy / burgundy-light / gold /
 *    gold-light / cream-dark / sepia keep it editorial.
 */

import React, { useEffect, useState } from 'react';

const BALLOON_COLORS = [
  'var(--retro-burgundy)',
  'var(--retro-burgundy-light)',
  'var(--retro-gold)',
  'var(--retro-gold-light)',
  'var(--retro-cream-dark)',
  'var(--retro-sepia)',
];

const CONFETTI_COLORS = [
  'var(--retro-burgundy)',
  'var(--retro-gold)',
  'var(--retro-gold-light)',
  'var(--retro-burgundy-light)',
  'var(--retro-cream-dark)',
];

const BALLOON_COUNT = 14;
const CONFETTI_COUNT = 36;
const SPARKLE_COUNT = 18;

// Deterministic pseudo-random spread so the balloons don't bunch up
// after refresh (and so SSR + client agree if the page ever ships SSR).
const seeded = (i, mod) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % mod;

const Balloon = ({ index }) => {
  const left = (index * 73 + seeded(index, 13)) % 95 + 2; // 2–97% spread
  const delay = seeded(index, 7);
  const duration = 9 + seeded(index, 5);
  const size = 28 + (index % 4) * 8; // 28–52px
  const color = BALLOON_COLORS[index % BALLOON_COLORS.length];
  const swayPx = (index % 2 === 0 ? 1 : -1) * (10 + (index % 3) * 4);
  return (
    <div
      className="bd-balloon"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        ['--bd-sway']: `${swayPx}px`,
      }}
    >
      <svg
        viewBox="0 0 40 56"
        width={size}
        height={size * 1.4}
        aria-hidden="true"
      >
        {/* balloon body */}
        <ellipse cx="20" cy="20" rx="16" ry="20" fill={color} />
        {/* highlight */}
        <ellipse
          cx="14"
          cy="14"
          rx="4"
          ry="6"
          fill="rgba(255,255,255,0.35)"
        />
        {/* knot */}
        <path
          d="M17 39 L23 39 L21 43 L19 43 Z"
          fill={color}
          opacity="0.85"
        />
        {/* string */}
        <path
          d="M20 43 Q22 49 19 56"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      </svg>
    </div>
  );
};

const Confetti = ({ index }) => {
  const left = (index * 41 + seeded(index, 11)) % 100;
  const delay = seeded(index, 6);
  const duration = 5 + seeded(index, 4);
  const size = 6 + (index % 3) * 3; // 6, 9, 12
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const rotate = (index * 47) % 360;
  const isStrip = index % 3 === 0;
  return (
    <div
      className="bd-confetti"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        ['--bd-rotate']: `${rotate}deg`,
      }}
    >
      <span
        style={{
          background: color,
          width: isStrip ? `${size / 2}px` : `${size}px`,
          height: isStrip ? `${size * 1.6}px` : `${size}px`,
          borderRadius: isStrip ? '1px' : index % 2 === 0 ? '50%' : '2px',
          display: 'block',
        }}
      />
    </div>
  );
};

const Sparkle = ({ index }) => {
  const left = (index * 53 + seeded(index, 17)) % 100;
  const top = 15 + ((index * 31) % 60); // 15–75% vertical
  const delay = seeded(index, 4);
  const duration = 1.6 + seeded(index, 2);
  const size = 4 + (index % 3) * 2;
  return (
    <div
      className="bd-sparkle"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
};

const BirthdayCelebration = ({ active }) => {
  // Initial-burst flag — first 1.4s after activation we add an extra
  // pulse + bigger emoji surge so the takeover lands with a "pop"
  // instead of fading in mid-loop.
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    setBurst(true);
    const t = setTimeout(() => setBurst(false), 1400);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: BALLOON_COUNT }).map((_, i) => (
        <Balloon key={`b${i}`} index={i} />
      ))}
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <Confetti key={`c${i}`} index={i} />
      ))}
      {Array.from({ length: SPARKLE_COUNT }).map((_, i) => (
        <Sparkle key={`s${i}`} index={i} />
      ))}

      {/* Big emoji burst on first activation */}
      {burst && (
        <div className="bd-emoji-burst" role="presentation">
          <span>🎉</span>
          <span>🎂</span>
          <span>🌸</span>
        </div>
      )}

      <style>{`
        .bd-balloon {
          position: absolute;
          bottom: -120px;
          will-change: transform;
          animation-name: bd-balloon-rise;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.12));
        }
        @keyframes bd-balloon-rise {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          5%   { opacity: 1; }
          50%  { transform: translate3d(var(--bd-sway, 0), -55vh, 0); }
          95%  { opacity: 1; }
          100% { transform: translate3d(0, -115vh, 0); opacity: 0; }
        }

        .bd-confetti {
          position: absolute;
          top: -40px;
          will-change: transform;
          animation-name: bd-confetti-fall;
          animation-timing-function: cubic-bezier(0.45, 0.05, 0.55, 0.95);
          animation-iteration-count: infinite;
        }
        @keyframes bd-confetti-fall {
          0%   { transform: translate3d(0, 0, 0) rotate(var(--bd-rotate, 0deg)); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(${'10vw'}, 110vh, 0) rotate(calc(var(--bd-rotate, 0deg) + 720deg)); opacity: 0.85; }
        }

        .bd-sparkle {
          position: absolute;
          background: radial-gradient(circle, var(--retro-gold-light) 0%, transparent 70%);
          border-radius: 50%;
          will-change: transform, opacity;
          animation-name: bd-sparkle-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes bd-sparkle-twinkle {
          0%, 100% { transform: scale(0.4); opacity: 0; }
          50%      { transform: scale(1.4); opacity: 0.9; }
        }

        .bd-emoji-burst {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          gap: 1.5rem;
          font-size: clamp(3rem, 8vw, 5rem);
          animation: bd-emoji-pop 1.4s cubic-bezier(0.22, 1.2, 0.36, 1) both;
          pointer-events: none;
        }
        .bd-emoji-burst > span:nth-child(1) { animation: bd-emoji-bob 1.4s ease-out 0s both;   }
        .bd-emoji-burst > span:nth-child(2) { animation: bd-emoji-bob 1.4s ease-out 0.1s both; }
        .bd-emoji-burst > span:nth-child(3) { animation: bd-emoji-bob 1.4s ease-out 0.2s both; }
        @keyframes bd-emoji-pop {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          100% { opacity: 0; transform: translate(-50%, -180%) scale(1); }
        }
        @keyframes bd-emoji-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .bd-balloon, .bd-confetti, .bd-sparkle, .bd-emoji-burst {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default BirthdayCelebration;
