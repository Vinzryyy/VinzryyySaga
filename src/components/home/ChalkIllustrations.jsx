/**
 * ChalkIllustrations — scattered hand-drawn neon SVG background decoration.
 *
 * Renders as an absolute full-coverage layer behind content.
 * Spawns ~8 randomly placed drawings (camera, apricot, microphone)
 * with random position, rotation, scale, and color picks.
 * Positions regenerate each mount for variety.
 */

import { useState } from 'react';

/* Camera */
const CameraSvg = ({ color, glow }) => (
  <svg viewBox="0 0 120 100" fill="none">
    <path d="M 20 30 C 18 26, 22 22, 26 22 L 94 22 C 98 22, 102 26, 100 30 L 100 75 C 100 80, 96 84, 92 84 L 28 84 C 24 84, 20 80, 20 75 Z"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <path d="M 45 22 C 44 18, 46 14, 50 14 L 70 14 C 74 14, 76 18, 75 22"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <circle cx="60" cy="52" r="18" stroke={color} strokeWidth="3"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <circle cx="60" cy="52" r="10" stroke={color} strokeWidth="2.5"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <path d="M 54 46 C 56 44, 58 45, 56 47" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <circle cx="86" cy="32" r="4" stroke={color} strokeWidth="2.5"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <path d="M 82 14 C 82 12, 84 10, 86 10 C 88 10, 90 12, 90 14"
      stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
  </svg>
);

/* Apricot */
const ApricotSvg = ({ color, glow }) => (
  <svg viewBox="0 0 120 100" fill="none">
    <path d="M 60 24 C 60 18, 62 12, 63 8" stroke={color} strokeWidth="3" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <path d="M 62 14 C 68 10, 78 9, 82 14 C 86 19, 82 22, 76 20 C 70 18, 65 15, 62 14 Z"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <path d="M 64 15 C 68 14, 74 14, 78 16" stroke={color} strokeWidth="1.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <path d="M 60 26 C 46 25, 28 34, 26 50 C 24 66, 34 80, 50 86 C 55 87, 58 87, 60 86"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <path d="M 60 26 C 74 25, 92 34, 94 50 C 96 66, 86 80, 70 86 C 65 87, 62 87, 60 86"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <path d="M 60 28 C 58 40, 57 54, 60 66" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <path d="M 42 40 C 44 38, 46 39, 44 42" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
  </svg>
);

/* Microphone */
const MicrophoneSvg = ({ color, glow }) => (
  <svg viewBox="0 0 120 100" fill="none">
    <path d="M 60 8 C 48 7, 40 14, 40 24 L 40 42 C 40 52, 48 60, 60 60 C 72 60, 80 52, 80 42 L 80 24 C 80 14, 72 7, 60 8 Z"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <line x1="48" y1="24" x2="72" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <line x1="48" y1="32" x2="72" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <line x1="48" y1="40" x2="72" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <line x1="48" y1="48" x2="72" y2="48" stroke={color} strokeWidth="2" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
    <path d="M 32 42 C 30 56, 40 68, 56 70 L 56 78 L 64 78 L 64 70 C 80 68, 90 56, 88 42"
      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <line x1="44" y1="82" x2="76" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <line x1="60" y1="78" x2="60" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
  </svg>
);

/* Star — small accent shape to fill gaps */
const StarSvg = ({ color, glow }) => (
  <svg viewBox="0 0 60 60" fill="none">
    <path d="M 30 5 L 35 22 L 55 22 L 39 33 L 44 52 L 30 40 L 16 52 L 21 33 L 5 22 L 25 22 Z"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
  </svg>
);

/* Music note — small accent */
const NoteSvg = ({ color, glow }) => (
  <svg viewBox="0 0 60 70" fill="none">
    <path d="M 20 55 C 14 55, 10 50, 12 46 C 14 42, 20 41, 24 44 C 26 45, 26 48, 25 50"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <line x1="26" y1="48" x2="26" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    <path d="M 26 12 C 30 10, 38 8, 42 12 C 46 16, 42 20, 38 18 C 34 16, 30 14, 26 12"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
  </svg>
);

const SHAPES = [CameraSvg, ApricotSvg, MicrophoneSvg, StarSvg, NoteSvg];

const PALETTES = [
  { color: 'var(--retro-burgundy-light)', glow: 'rgba(158, 62, 74, 0.4)' },
  { color: 'var(--retro-gold)',           glow: 'rgba(200, 149, 42, 0.4)' },
  { color: 'var(--retro-cream)',          glow: 'rgba(253, 246, 227, 0.25)' },
  { color: 'var(--retro-sepia)',          glow: 'rgba(212, 165, 116, 0.35)' },
  { color: 'var(--retro-gold-light)',     glow: 'rgba(223, 174, 66, 0.35)' },
];

const MIN_COUNT = 200;
const MAX_COUNT = 500;

const useRandomItems = () => {
  const [items] = useState(() => {
    const count = Math.floor(MIN_COUNT + Math.random() * (MAX_COUNT - MIN_COUNT));
    return Array.from({ length: count }, (_, i) => {
      const x = Math.random() * 94 + 3;        // 3-97%
      const y = Math.random() * 90 + 5;        // 5-95%
      const rotate = -35 + Math.random() * 70;  // -35 to +35 deg
      const scale = 0.3 + Math.random() * 0.8;  // 0.3-1.1
      const shapeIdx = Math.floor(Math.random() * SHAPES.length);
      const paletteIdx = (i + Math.floor(Math.random() * 3)) % PALETTES.length;
      const opacity = 0.08 + Math.random() * 0.35; // 0.08-0.43 (subtler per item since there are so many)
      return { x, y, rotate, scale, shapeIdx, paletteIdx, opacity };
    });
  });
  return items;
};

const ChalkIllustrations = () => {
  const items = useRandomItems();

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {items.map((item, i) => {
        const Svg = SHAPES[item.shapeIdx];
        const palette = PALETTES[item.paletteIdx];
        return (
          <div
            key={i}
            className="absolute w-12 sm:w-16 md:w-24"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              opacity: item.opacity,
              transform: `translate(-50%, -50%) rotate(${item.rotate}deg) scale(${item.scale})`,
            }}
          >
            <Svg color={palette.color} glow={palette.glow} />
          </div>
        );
      })}
    </div>
  );
};

export default ChalkIllustrations;
