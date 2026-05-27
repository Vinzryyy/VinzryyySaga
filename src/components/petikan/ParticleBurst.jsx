/**
 * ParticleBurst — sparkles fly outward from card center saat reveal.
 * TCG Pocket signature "pop" moment when pack opens. Per-tier:
 *   muda    →  8 particles, cream/sepia palette
 *   matang  → 14 particles, gold/peach palette
 *   langka  → 22 particles, gold/amber/coral palette
 *   legenda → 32 particles, full rainbow holo palette
 *
 * Trigger via `trigger` prop change (incremented in parent). GSAP
 * animates each particle outward with random angle jitter + rotation +
 * fade. Speeds varied per-particle untuk organic feel.
 *
 * Renders 32 particle slots fixed; tier count slices the active set.
 * Inactive slots stay opacity 0 (never animated).
 */

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const COUNTS = {
  muda: 8,
  matang: 14,
  langka: 22,
  legenda: 32,
};

const PALETTES = {
  muda: ['#e8c89c', '#d4a872', '#c4a47a'],
  matang: ['#daaf5c', '#e8c89c', '#c4794a', '#d4a872'],
  langka: ['#daaf5c', '#ffd97a', '#c4794a', '#ff9a6c', '#e8a06e'],
  legenda: [
    '#ffd97a',
    '#ffb84d',
    '#daaf5c',
    '#b890d1',
    '#7bc7d5',
    '#ff9aa2',
    '#9debc3',
  ],
};

const MAX_PARTICLES = 32;

const ParticleBurst = ({ tier = 'muda', trigger = 0 }) => {
  const refs = useRef([]);
  const count = COUNTS[tier] || COUNTS.muda;
  const palette = PALETTES[tier] || PALETTES.muda;
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    if (!trigger) return undefined;
    // Reduced-motion: skip particle burst entirely.
    if (prefersReducedMotion) return undefined;
    const tweens = [];
    refs.current.slice(0, count).forEach((el, i) => {
      if (!el) return;
      const baseAngle = (i / count) * Math.PI * 2;
      const angleJitter = (Math.random() - 0.5) * 0.5;
      const angle = baseAngle + angleJitter;
      const distance = 90 + Math.random() * 100;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 20; // slight upward bias

      gsap.set(el, {
        x: 0,
        y: 0,
        scale: 0,
        opacity: 0,
        rotation: 0,
      });

      const dur = 0.85 + Math.random() * 0.5;
      const t = gsap.timeline();
      t.to(el, {
        scale: 1,
        opacity: 1,
        duration: 0.16,
        ease: 'sine.out',
      });
      t.to(
        el,
        {
          x: tx,
          y: ty,
          rotation: Math.random() * 360,
          duration: dur,
          ease: 'power2.out',
        },
        0
      );
      t.to(
        el,
        {
          opacity: 0,
          scale: 0.35,
          duration: 0.45,
          ease: 'sine.in',
        },
        dur * 0.55
      );
      tweens.push(t);
    });
    return () => tweens.forEach((t) => t.kill());
    // count is derived from tier, included for completeness
  }, [trigger, count, prefersReducedMotion]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
      {Array.from({ length: MAX_PARTICLES }).map((_, i) => {
        const color = palette[i % palette.length];
        // Vary size for organic feel — 4-point star SVG for sparkle look
        const size = i % 4 === 0 ? 10 : i % 4 === 1 ? 6 : i % 4 === 2 ? 8 : 5;
        return (
          <span
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="absolute"
            style={{
              width: size,
              height: size,
              opacity: 0,
              filter: `drop-shadow(0 0 ${size * 0.6}px ${color})`,
              willChange: 'transform, opacity',
            }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 10 10" width={size} height={size}>
              <path
                d="M 5 0 L 6 4 L 10 5 L 6 6 L 5 10 L 4 6 L 0 5 L 4 4 Z"
                fill={color}
              />
            </svg>
          </span>
        );
      })}
    </div>
  );
};

export default ParticleBurst;
