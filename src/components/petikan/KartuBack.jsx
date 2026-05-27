/**
 * KartuBack — card-back / sealed pack cover.
 *
 * Master pack art "The Life of Armeniaca" sebagai full-bleed image,
 * no overlays. Tier-aware accent (S gold foil, A copper dashed)
 * untuk pre-flip hint tipis.
 */

import React from 'react';

const PACK_IMAGE = '/EmoteLabs/Master.PackArmeniacaPhase1.jpeg';

const KartuBack = ({ tier = 'C' }) => {
  const isS = tier === 'S';
  const isA = tier === 'A';

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_14px_48px_rgba(61,52,43,0.25)]"
      style={{ aspectRatio: '320 / 480' }}
    >
      {/* Master pack art — full-bleed, no crop berat. Image visible 100% */}
      <img
        src={PACK_IMAGE}
        alt="The Life of Armeniaca — pack art"
        className="absolute inset-0 w-full h-full object-cover select-none"
        draggable={false}
        loading="eager"
      />

      {/* S tier — gold foil inner border (pre-flip hint paling jelas) */}
      {isS && (
        <span
          className="absolute inset-3 rounded-xl pointer-events-none"
          style={{
            border: '1px solid rgba(218, 175, 92, 0.7)',
            boxShadow:
              'inset 0 0 0 1px rgba(255, 217, 122, 0.35), 0 0 28px rgba(218, 175, 92, 0.3)',
          }}
        />
      )}

      {/* A tier — copper inner accent (dashed, subtler than S) */}
      {isA && (
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
