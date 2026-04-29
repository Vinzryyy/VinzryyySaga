/**
 * MotifBackdrop
 *
 * Ambient decorative backdrop. Renders N motif glyphs scattered across an
 * absolute-inset layer, each drifting gently. Position/size/rotation are
 * deterministic per `seed` so layouts stay stable across renders (no hydration
 * drift, no jumping).
 *
 * Motif symbology (Armeniaca brand):
 *   leaf       — daun arme yang lama
 *   ribbon     — pita · feminin
 *   bug        — pencinta hewan
 *   bloom      — bunga mekar · sudah dewasa
 *   apricotCut — buah apricot terbagi 2 · arme yang berkembang
 *   butterfly  — kupu-kupu · akan terbang jauh
 *   apricot    — buah apricot · armeniaca origin
 *   ice        — es · setelah musim dingin akan ada musim semi
 *   star       — bintang · dreams
 *
 * The parent should be `position: relative` so the absolute layer fills it.
 * Use `pointer-events: none` (already set) so the backdrop never intercepts
 * clicks. Hidden from assistive tech via aria-hidden.
 */

import React, { useMemo } from 'react';

// — SVG glyphs ----------------------------------------------------------------
// All use stroke="currentColor" so the wrapper can tint each instance via
// the inline `color` style. ViewBox 0 0 24 24, no fixed dims so they scale.

const Leaf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20c0-9 7-16 16-16-1 9-7 16-16 16z" />
    <path d="M4 20l8-8" />
  </svg>
);

const Ribbon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8c2-3 6-3 9 1-3 4-7 4-9 1z" />
    <path d="M21 8c-2-3-6-3-9 1 3 4 7 4 9 1z" />
    <path d="M12 9l-3 12M12 9l3 12" />
    <circle cx="12" cy="9" r="1.4" fill="currentColor" />
  </svg>
);

const Bug = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="14" rx="6" ry="5" fill="currentColor" fillOpacity="0.18" />
    <path d="M12 9v10M6 14h12" />
    <circle cx="12" cy="6" r="2" fill="currentColor" />
    <path d="M10 5l-2-2M14 5l2-2" />
    <circle cx="9" cy="12" r="0.7" fill="currentColor" />
    <circle cx="15" cy="12" r="0.7" fill="currentColor" />
    <circle cx="9.5" cy="16" r="0.7" fill="currentColor" />
    <circle cx="14.5" cy="16" r="0.7" fill="currentColor" />
  </svg>
);

const Bloom = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="6" r="3" />
    <circle cx="18.2" cy="10" r="3" />
    <circle cx="15.8" cy="17" r="3" />
    <circle cx="8.2" cy="17" r="3" />
    <circle cx="5.8" cy="10" r="3" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
  </svg>
);

const ApricotCut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13a9 8 0 0 1 18 0z" fill="currentColor" fillOpacity="0.14" />
    <path d="M3 13h18" />
    <ellipse cx="12" cy="9.5" rx="2.6" ry="2" fill="currentColor" fillOpacity="0.55" />
    <path d="M12 7.5v4M10 8.5l4 2M14 8.5l-4 2" opacity="0.5" />
  </svg>
);

const Butterfly = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M12 8c-2-3-5-4-8-2-1 2 0 5 3 7 2 1 4 1 5-1z" />
    <path d="M12 8c2-3 5-4 8-2 1 2 0 5-3 7-2 1-4 1-5-1z" />
    <path d="M12 13c-1 3-3 5-5 5-1 0-2-1-2-2 1-2 4-3 7-3z" />
    <path d="M12 13c1 3 3 5 5 5 1 0 2-1 2-2-1-2-4-3-7-3z" />
    <circle cx="12" cy="5" r="1" fill="currentColor" />
    <path d="M12 4l-1.5-1.5M12 4l1.5-1.5" />
  </svg>
);

const Apricot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="14" r="7" fill="currentColor" fillOpacity="0.12" />
    <path d="M12 7c0-2 1-3 3-3" />
    <path d="M15 4c2 0 3 1 3 3-2 0-3-1-3-3z" fill="currentColor" fillOpacity="0.4" />
    <path d="M9 9c1 4 1 8 0 11" opacity="0.55" />
  </svg>
);

const Ice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M3 7l18 10M3 17l18-10" />
    <path d="M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2" />
    <path d="M5.5 8.5l-1.2-2.4M5.5 8.5l-2.4-1.2" />
    <path d="M18.5 15.5l1.2 2.4M18.5 15.5l2.4 1.2" />
    <path d="M5.5 15.5l-2.4 1.2M5.5 15.5l-1.2 2.4" />
    <path d="M18.5 8.5l2.4-1.2M18.5 8.5l1.2-2.4" />
  </svg>
);

const Star = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5l3 6.5 7 .9-5.2 4.6 1.5 7.1L12 17.8 5.7 21.6l1.5-7.1L2 9.9l7-.9z" />
  </svg>
);

const GLYPHS = [
  { key: 'leaf',       Glyph: Leaf },
  { key: 'ribbon',     Glyph: Ribbon },
  { key: 'bug',        Glyph: Bug },
  { key: 'bloom',      Glyph: Bloom },
  { key: 'apricotCut', Glyph: ApricotCut },
  { key: 'butterfly',  Glyph: Butterfly },
  { key: 'apricot',    Glyph: Apricot },
  { key: 'ice',        Glyph: Ice },
  { key: 'star',       Glyph: Star },
];

// — Seeded layout -------------------------------------------------------------
// mulberry32 PRNG keyed off a hashed seed string. Keeps motif positions
// identical across renders / hydration so the backdrop doesn't jitter.

const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const generateLayout = (count, seed) => {
  const rand = mulberry32(hashSeed(seed));
  // Force every glyph to appear at least once before any can repeat — keeps
  // the symbology balanced even at low counts.
  const required = GLYPHS.map((g) => g.key);
  return Array.from({ length: count }, (_, i) => {
    const key = i < required.length ? required[i] : GLYPHS[Math.floor(rand() * GLYPHS.length)].key;
    return {
      key,
      // Distribute roughly evenly along the page height while still random
      // (band per item + jitter inside the band) so 20 motifs spread over a
      // long page instead of clumping at the top.
      top: ((i + rand()) / count) * 100,
      left: 4 + rand() * 92, // 4–96% — keep off the very edge
      size: 1.6 + rand() * 2.6, // rem
      rotate: (rand() - 0.5) * 80, // ±40°
      delay: rand() * 8, // s — desync drift across instances
      duration: 7 + rand() * 7, // 7–14s drift loop
      opacity: 0.12 + rand() * 0.18, // 12–30%
      drift: 6 + rand() * 14, // px translateY amplitude
      // Mostly burgundy with occasional gold accents for warmth
      color: rand() > 0.78 ? 'var(--retro-gold)' : 'var(--retro-burgundy)',
    };
  });
};

const MotifBackdrop = ({ count = 20, seed = 'profile' }) => {
  const items = useMemo(() => generateLayout(count, seed), [count, seed]);
  return (
    <>
      <style>{`
        @keyframes motif-drift {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(var(--motif-rot, 0deg));
          }
          50% {
            transform: translate3d(0, calc(var(--motif-drift, 10) * -1px), 0)
                       rotate(calc(var(--motif-rot, 0deg) + 8deg));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .motif-glyph {
            animation: none !important;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        // mix-blend-mode: multiply makes burgundy/gold motifs darken cream
        // backdrops naturally, while becoming visually invisible over the
        // dark burgundy/brown cards inside fight & theater (dark × dark
        // ≈ same dark). Effect: motifs read on cream only, "for free".
        style={{ mixBlendMode: 'multiply' }}
      >
        {items.map((item, i) => {
          const Glyph = GLYPHS.find((g) => g.key === item.key).Glyph;
          return (
            <span
              key={i}
              className="motif-glyph absolute block"
              style={{
                top: `${item.top}%`,
                left: `${item.left}%`,
                width: `${item.size}rem`,
                height: `${item.size}rem`,
                color: item.color,
                opacity: item.opacity,
                transform: `rotate(${item.rotate}deg)`,
                animation: `motif-drift ${item.duration}s ease-in-out ${item.delay}s infinite`,
                ['--motif-rot']: `${item.rotate}deg`,
                ['--motif-drift']: item.drift,
              }}
            >
              <Glyph />
            </span>
          );
        })}
      </div>
    </>
  );
};

export default MotifBackdrop;
