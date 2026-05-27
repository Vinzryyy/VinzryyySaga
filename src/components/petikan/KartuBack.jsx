/**
 * KartuBack — card-back / sealed pack cover.
 *
 * Layout mimic Pokemon TCG booster pack:
 * - TOP band (~12% height) — burgundy gradient, brand identifier + edition
 * - MIDDLE — master pack art "The Life of Armeniaca" (object-cover)
 * - BOTTOM band (~14% height) — burgundy gradient, set code + foil wordmark
 *
 * Bands kasih frame yang khas TCG pack (Pokemon Scarlet/Violet style),
 * sementara master image di tengah jadi hero illustration. Tier-aware
 * accent (legenda gold foil, langka copper dashed) layered on top untuk
 * pre-flip hint.
 */

import React from 'react';
import { SET_SIZE, SET_CODE, CARDS_PER_PLUCK } from '../../data/pohonAprikot';

const PACK_IMAGE = '/EmoteLabs/Master.PackArmeniacaPhase1.jpeg';

const KartuBack = ({ tier = 'muda' }) => {
  const isLegenda = tier === 'legenda';
  const isLangka = tier === 'langka';

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(61,52,43,0.18)] bg-[#3b1414]"
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

      {/* TOP BAND — brand identifier + edition. Gradient burgundy dengan
          gold hairline di bawah biar separate clean dari art di tengah. */}
      <div
        className="absolute top-0 inset-x-0 px-3 py-2.5"
        style={{
          background:
            'linear-gradient(to bottom, #5a1f1f 0%, #7c2d12 60%, rgba(124, 45, 18, 0.92) 100%)',
          borderBottom: '1px solid rgba(218, 175, 92, 0.5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1.5">
            <i className="ri-leaf-line text-[11px] text-[#daaf5c]" />
            <span
              className="text-[9px] uppercase tracking-[0.28em] font-semibold"
              style={{ fontFamily: '"Fraunces Variable", serif' }}
            >
              Petikan
            </span>
          </div>
          <span className="text-[8px] uppercase tracking-[0.22em] opacity-80">
            Seitansai · 2026
          </span>
        </div>
        <div className="flex items-center justify-center mt-1">
          <span
            className="text-[10px] uppercase tracking-[0.35em] text-white"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontWeight: 600,
            }}
          >
            Pohon Aprikot
          </span>
        </div>
      </div>

      {/* BOTTOM BAND — set code + foil wordmark "Buka N Kartu".
          Gradient gold sheen di wordmark mimic foil printing Pokemon
          pack bottom edge ("FESTIVAL TERASTAL ex"). */}
      <div
        className="absolute bottom-0 inset-x-0 px-3 py-2.5"
        style={{
          background:
            'linear-gradient(to top, #5a1f1f 0%, #7c2d12 60%, rgba(124, 45, 18, 0.92) 100%)',
          borderTop: '1px solid rgba(218, 175, 92, 0.5)',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex items-center justify-center mb-1">
          <span
            className="text-[12px] uppercase tracking-[0.18em] font-bold"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              backgroundImage:
                'linear-gradient(135deg, #ffd97a 0%, #daaf5c 35%, #ffe9a3 50%, #daaf5c 65%, #ffd97a 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              filter: 'drop-shadow(0 0 4px rgba(255, 217, 122, 0.25))',
            }}
          >
            Buka · {CARDS_PER_PLUCK} Kartu
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-white/85">
          <span className="text-[8px] uppercase tracking-[0.25em]">
            {SET_CODE} · Batch I
          </span>
          <span className="text-[8px] uppercase tracking-[0.2em] opacity-75">
            {SET_SIZE} kartu
          </span>
        </div>
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
