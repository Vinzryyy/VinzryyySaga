/**
 * KartuBack — card-back / sealed pack cover.
 *
 * Foil pouch style (mockup user reference: yellow trading card mockup):
 * - TOP crimp (~12% height) — horizontal heat-seal stripes, darker tone
 * - BODY — solid burgundy foil dengan subtle sheen (light dari kiri,
 *   shadow ke kanan biar terasa 3D-glossy)
 * - BOTTOM crimp — mirror dari top, ditto styling
 * - LEFT content stack — leaf badge + brand title + subtitle + tagline
 * - RIGHT mega wordmark — "POHON APRIKOT" vertical translucent
 *
 * Tier-aware accent overlays (legenda gold foil border, langka copper
 * dashed) layered di atas untuk pre-flip hint.
 */

import React from 'react';
import { SET_CODE, CARDS_PER_PLUCK } from '../../data/pohonAprikot';

// Heat-seal crimp pattern — horizontal stripes density tinggi, mimic
// machine-pressed foil edges.
const CRIMP_PATTERN = `repeating-linear-gradient(
  to bottom,
  rgba(0, 0, 0, 0.18) 0,
  rgba(0, 0, 0, 0.18) 1px,
  transparent 1px,
  transparent 3px
)`;

const KartuBack = ({ tier = 'muda' }) => {
  const isLegenda = tier === 'legenda';
  const isLangka = tier === 'langka';

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_14px_48px_rgba(61,52,43,0.25)]"
      style={{
        aspectRatio: '320 / 480',
        background:
          'linear-gradient(135deg, #8b2e1a 0%, #7c2d12 35%, #5a1f1f 70%, #4a1818 100%)',
      }}
    >
      {/* Foil sheen — vertical highlight strip kiri, shadow kanan */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[20%] pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(255, 220, 180, 0.15) 0%, rgba(255, 220, 180, 0.06) 50%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[25%] pointer-events-none"
        style={{
          background:
            'linear-gradient(to left, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.08) 60%, transparent 100%)',
        }}
      />

      {/* RIGHT vertical mega wordmark — translucent foil text */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 right-3 flex items-center justify-end pointer-events-none"
        style={{ width: '32%' }}
      >
        <span
          className="text-white/12 select-none"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 9vw, 64px)',
            lineHeight: 1,
            letterSpacing: '0.02em',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            textShadow: '0 1px 2px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            opacity: 0.18,
          }}
        >
          POHON APRIKOT
        </span>
      </div>

      {/* TOP CRIMP — heat-seal stripes band */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0"
        style={{
          height: '12%',
          background: `${CRIMP_PATTERN}, linear-gradient(to bottom, #4a1818 0%, #5a1f1f 70%, rgba(90, 31, 31, 0.6) 100%)`,
          boxShadow:
            'inset 0 -1px 0 rgba(218, 175, 92, 0.18), inset 0 -8px 12px -8px rgba(0,0,0,0.4)',
        }}
      />

      {/* BOTTOM CRIMP — mirror of top */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0"
        style={{
          height: '12%',
          background: `${CRIMP_PATTERN}, linear-gradient(to top, #4a1818 0%, #5a1f1f 70%, rgba(90, 31, 31, 0.6) 100%)`,
          boxShadow:
            'inset 0 1px 0 rgba(218, 175, 92, 0.18), inset 0 8px 12px -8px rgba(0,0,0,0.4)',
        }}
      />

      {/* LEFT content stack */}
      <div
        className="absolute left-6 right-[40%] flex flex-col justify-center"
        style={{ top: '12%', bottom: '12%' }}
      >
        {/* Leaf badge — small circular brand mark */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mb-5"
          style={{
            background:
              'linear-gradient(135deg, #faf6ed 0%, #f0e6d2 100%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          }}
        >
          <i
            className="ri-leaf-line text-[18px]"
            style={{ color: '#7c2d12' }}
          />
        </div>

        {/* Brand title — large Fraunces */}
        <h3
          className="text-white leading-none mb-1"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 700,
            fontSize: '26px',
            letterSpacing: '-0.01em',
          }}
        >
          PETIKAN
        </h3>

        {/* Subtitle — Pohon Aprikot */}
        <p
          className="text-white/90 leading-tight mb-1"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Pohon Aprikot
        </p>

        {/* Edition meta — small caps */}
        <p
          className="text-[8px] uppercase tracking-[0.3em] text-white/70 mb-4"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          Seitansai · 2026
        </p>

        {/* Tagline body — italic small */}
        <p
          className="text-white/65 text-[10px] leading-[1.5] italic max-w-[14ch]"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          Satu paket. Tiga kenangan dari pohon.
        </p>

        {/* Footer set code — tiny, foil gold */}
        <p
          className="text-[8px] uppercase tracking-[0.4em] mt-5"
          style={{
            background:
              'linear-gradient(135deg, #ffd97a 0%, #daaf5c 50%, #ffd97a 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600,
          }}
        >
          {SET_CODE} · {CARDS_PER_PLUCK} kartu
        </p>
      </div>

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
