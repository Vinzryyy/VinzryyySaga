/**
 * ChalkIllustrations — hand-drawn neon chalk-style SVG background.
 *
 * Renders as an absolute-positioned decorative layer behind content.
 * Three Eli-themed drawings spread across the container:
 *   1. Kamera (Camera)   — archive
 *   2. Aprikot (Apricot) — Armeniaca identity
 *   3. Mikrofon (Mic)    — theater
 *
 * Subtle opacity so they don't compete with foreground text.
 * Positions randomize on each mount for variety.
 */

import { useState } from 'react';

/* Camera — boxy body, viewfinder bump, lens circles, flash dot */
const CameraSvg = ({ color, glow }) => (
  <svg viewBox="0 0 120 100" fill="none">
    <path
      d="M 20 30 C 18 26, 22 22, 26 22 L 94 22 C 98 22, 102 26, 100 30 L 100 75 C 100 80, 96 84, 92 84 L 28 84 C 24 84, 20 80, 20 75 Z"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <path
      d="M 45 22 C 44 18, 46 14, 50 14 L 70 14 C 74 14, 76 18, 75 22"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <circle cx="60" cy="52" r="18"
      stroke={color} strokeWidth="3"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <circle cx="60" cy="52" r="10"
      stroke={color} strokeWidth="2.5"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
    />
    <path d="M 54 46 C 56 44, 58 45, 56 47"
      stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
    />
    <circle cx="86" cy="32" r="4"
      stroke={color} strokeWidth="2.5"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <path d="M 82 14 C 82 12, 84 10, 86 10 C 88 10, 90 12, 90 14"
      stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
    />
  </svg>
);

/* Apricot — fruit body with crease, stem, leaf */
const ApricotSvg = ({ color, glow }) => (
  <svg viewBox="0 0 120 100" fill="none">
    <path d="M 60 24 C 60 18, 62 12, 63 8"
      stroke={color} strokeWidth="3" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <path
      d="M 62 14 C 68 10, 78 9, 82 14 C 86 19, 82 22, 76 20 C 70 18, 65 15, 62 14 Z"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <path d="M 64 15 C 68 14, 74 14, 78 16"
      stroke={color} strokeWidth="1.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
    />
    <path
      d="M 60 26 C 46 25, 28 34, 26 50 C 24 66, 34 80, 50 86 C 55 87, 58 87, 60 86"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <path
      d="M 60 26 C 74 25, 92 34, 94 50 C 96 66, 86 80, 70 86 C 65 87, 62 87, 60 86"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <path d="M 60 28 C 58 40, 57 54, 60 66"
      stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
    />
    <path d="M 42 40 C 44 38, 46 39, 44 42"
      stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
    />
  </svg>
);

/* Microphone — mic head with grille, cradle, stand */
const MicrophoneSvg = ({ color, glow }) => (
  <svg viewBox="0 0 120 100" fill="none">
    <path
      d="M 60 8 C 48 7, 40 14, 40 24 L 40 42 C 40 52, 48 60, 60 60 C 72 60, 80 52, 80 42 L 80 24 C 80 14, 72 7, 60 8 Z"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <line x1="48" y1="24" x2="72" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <line x1="48" y1="32" x2="72" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <line x1="48" y1="40" x2="72" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <line x1="48" y1="48" x2="72" y2="48" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <path
      d="M 32 42 C 30 56, 40 68, 56 70 L 56 78 L 64 78 L 64 70 C 80 68, 90 56, 88 42"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
    />
    <line x1="44" y1="82" x2="76" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <line x1="60" y1="78" x2="60" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
  </svg>
);

const SVGS = [
  { color: 'var(--retro-burgundy-light)', glow: 'rgba(158, 62, 74, 0.4)', Svg: CameraSvg },
  { color: 'var(--retro-gold)',           glow: 'rgba(200, 149, 42, 0.4)', Svg: ApricotSvg },
  { color: 'var(--retro-cream)',          glow: 'rgba(253, 246, 227, 0.25)', Svg: MicrophoneSvg },
];

// Generate random positions once per mount. Each icon gets a random
// (x, y, rotation, scale) that avoids the center content zone (20-80%)
// by biasing toward edges. Uses useState initializer so values are
// stable across re-renders but fresh on each page visit.
const useRandomPlacements = (count) => {
  const [placements] = useState(() => {
    const result = [];
    for (let i = 0; i < count; i++) {
      // Bias x toward edges: 2-22% or 72-95%
      const onLeft = Math.random() > 0.5;
      const x = onLeft
        ? 2 + Math.random() * 20   // 2-22%
        : 72 + Math.random() * 23; // 72-95%
      const y = 5 + Math.random() * 70; // 5-75%
      const rotate = -20 + Math.random() * 40; // -20 to +20 deg
      const scale = 0.7 + Math.random() * 0.5; // 0.7-1.2
      result.push({ x, y, rotate, scale });
    }
    return result;
  });
  return placements;
};

const ChalkIllustrations = () => {
  const placements = useRandomPlacements(SVGS.length);

  return (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25 sm:opacity-30 md:opacity-40" aria-hidden="true">
    {SVGS.map(({ color, glow, Svg }, i) => {
      const p = placements[i];
      return (
      <div
        key={i}
        className="absolute w-20 sm:w-24 md:w-32"
        style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          transform: `rotate(${p.rotate}deg) scale(${p.scale})`,
        }}
      >
        <Svg color={color} glow={glow} />
      </div>
      );
    })}
  </div>
  );
};

export default ChalkIllustrations;
