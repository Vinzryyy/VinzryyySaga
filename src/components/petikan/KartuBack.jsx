/**
 * KartuBack — card-back / sealed pack cover.
 *
 * Foil pouch hybrid:
 * - Master pack art ("The Life of Armeniaca") full-bleed sebagai body.
 *   Tampil utuh tanpa crop berat — design illustration hero.
 * - Heat-seal crimp overlay TOP (purple tint, match master image langit)
 *   dan BOTTOM (yellow tint, match master image tanah). Stripes pattern
 *   transparan di atas image — design tetep keliatan, crimps cuma kasih
 *   texture sealed-pouch feel.
 *
 * Tier-aware accent overlays (S gold foil, A copper dashed) untuk
 * pre-flip hint.
 */

import React from 'react';

const PACK_IMAGE = '/EmoteLabs/Master.PackArmeniacaPhase1.jpeg';

// Heat-seal crimp pattern — horizontal stripes density tinggi, machine-
// pressed foil edges. Stripes pakai blend 'multiply' supaya gelap-an
// area tanpa nutupin warna dasar di bawahnya.
const CRIMP_STRIPES = `repeating-linear-gradient(
  to bottom,
  rgba(0, 0, 0, 0.35) 0,
  rgba(0, 0, 0, 0.35) 1px,
  transparent 1px,
  transparent 3px
)`;

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

      {/* TOP CRIMP — heat-seal stripes overlay dengan purple tint untuk
          match langit di master image. Tint subtle supaya design tetep
          terbaca — stripes kasih texture, bukan blanket cover. */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 pointer-events-none"
        style={{
          height: '10%',
          background: `${CRIMP_STRIPES},
            linear-gradient(to bottom,
              rgba(124, 92, 178, 0.25) 0%,
              rgba(154, 118, 198, 0.18) 60%,
              transparent 100%
            )`,
          mixBlendMode: 'multiply',
        }}
      />

      {/* BOTTOM CRIMP — heat-seal stripes overlay dengan yellow tint untuk
          match tanah di master image. */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0 pointer-events-none"
        style={{
          height: '10%',
          background: `${CRIMP_STRIPES},
            linear-gradient(to top,
              rgba(232, 198, 88, 0.3) 0%,
              rgba(244, 218, 110, 0.2) 60%,
              transparent 100%
            )`,
          mixBlendMode: 'multiply',
        }}
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
