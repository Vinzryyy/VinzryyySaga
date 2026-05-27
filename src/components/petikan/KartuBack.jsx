/**
 * KartuBack — card-back / sealed pack cover.
 *
 * Hybrid design:
 * - Foil pouch shape (heat-seal crimp atas/bawah, mockup reference
 *   image.png yellow trading card pouch)
 * - Body fill = Master.PackArmeniacaPhase1.jpeg (chibi Arme trio +
 *   "THE LIFE OF ARMENIACA" wordmark pop-art)
 *
 * Crimp bands cover top + bottom 11% masing-masing — master art visible
 * di middle ~78%. Tier-aware accent (gold foil legenda, copper dashed
 * langka) layered on top.
 */

import React from 'react';

const PACK_IMAGE = '/EmoteLabs/Master.PackArmeniacaPhase1.jpeg';

// Heat-seal crimp pattern — horizontal stripes, machine-pressed foil.
const CRIMP_PATTERN = `repeating-linear-gradient(
  to bottom,
  rgba(0, 0, 0, 0.22) 0,
  rgba(0, 0, 0, 0.22) 1px,
  transparent 1px,
  transparent 3px
)`;

const KartuBack = ({ tier = 'muda' }) => {
  const isLegenda = tier === 'legenda';
  const isLangka = tier === 'langka';

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_14px_48px_rgba(61,52,43,0.25)]"
      style={{ aspectRatio: '320 / 480' }}
    >
      {/* Master pack art — full-bleed background. Object-cover supaya
          chibi & wordmark tetep visible meskipun crimps cover edges. */}
      <img
        src={PACK_IMAGE}
        alt="Pohon Aprikot — Seitansai 2026 pack art"
        className="absolute inset-0 w-full h-full object-cover select-none"
        draggable={false}
        loading="eager"
      />

      {/* TOP CRIMP — heat-seal stripes overlay. Mid-tone burgundy gradient
          dengan stripes pattern + gold hairline bottom + inner shadow. */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0"
        style={{
          height: '11%',
          background: `${CRIMP_PATTERN}, linear-gradient(to bottom, #4a1818 0%, #5a1f1f 65%, rgba(90, 31, 31, 0.85) 100%)`,
          boxShadow:
            'inset 0 -1px 0 rgba(218, 175, 92, 0.4), inset 0 -8px 12px -8px rgba(0,0,0,0.45)',
        }}
      />

      {/* BOTTOM CRIMP — mirror dari top */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0"
        style={{
          height: '11%',
          background: `${CRIMP_PATTERN}, linear-gradient(to top, #4a1818 0%, #5a1f1f 65%, rgba(90, 31, 31, 0.85) 100%)`,
          boxShadow:
            'inset 0 1px 0 rgba(218, 175, 92, 0.4), inset 0 8px 12px -8px rgba(0,0,0,0.45)',
        }}
      />

      {/* Foil sheen across body — subtle left-edge highlight + right-edge
          shadow, simulate cellophane wrap. Body area between crimps. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[12%] pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(255, 240, 220, 0.15), transparent)',
          mixBlendMode: 'overlay',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[15%] pointer-events-none"
        style={{
          background:
            'linear-gradient(to left, rgba(0, 0, 0, 0.22), transparent)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Legenda — gold foil inner border (subtle pre-flip hint) */}
      {isLegenda && (
        <span
          className="absolute inset-3 rounded-xl pointer-events-none"
          style={{
            border: '1px solid rgba(218, 175, 92, 0.65)',
            boxShadow:
              'inset 0 0 0 1px rgba(255, 217, 122, 0.3), 0 0 24px rgba(218, 175, 92, 0.25)',
          }}
        />
      )}

      {/* Langka — copper inner accent (dashed, subtler than legenda) */}
      {isLangka && (
        <span
          className="absolute inset-4 rounded-lg pointer-events-none"
          style={{
            border: '1px dashed rgba(196, 121, 74, 0.55)',
          }}
        />
      )}
    </div>
  );
};

export default KartuBack;
