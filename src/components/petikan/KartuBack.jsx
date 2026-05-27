/**
 * KartuBack — card-back / sealed pack cover.
 *
 * Pakai master pack art "The Life of Armeniaca" (chibi Arme + wordmark
 * pop-art style) sebagai background fill. Image dirancang full-bleed
 * untuk pack visual — wordmark sudah ada di image, gak perlu overlay
 * text dari komponen.
 *
 * Tier-aware accent overlays (subtle gold/copper border) tetep ada untuk
 * pre-flip tier hint. Saat dipakai di KartuBrewek (sebelum reveal),
 * tier hardcoded "matang" — tapi accent system reusable kalau nanti
 * mau bikin variant pack per tier.
 */

import React from 'react';

const PACK_IMAGE = '/EmoteLabs/Master.PackArmeniacaPhase1.jpeg';

const KartuBack = ({ tier = 'muda' }) => {
  const isLegenda = tier === 'legenda';
  const isLangka = tier === 'langka';

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(61,52,43,0.18)]"
      style={{ aspectRatio: '320 / 480' }}
    >
      {/* Master pack art — full-bleed cover image */}
      <img
        src={PACK_IMAGE}
        alt="Pohon Aprikot — Seitansai 2026 pack art"
        className="absolute inset-0 w-full h-full object-cover select-none"
        draggable={false}
        loading="eager"
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
