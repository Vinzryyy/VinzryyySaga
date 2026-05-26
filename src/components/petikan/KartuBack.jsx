/**
 * KartuBack — card-back / spine cover. Render saat kartu belum di-flip,
 * mirip cover buku tertutup di Perpustakaan. Cream paper + spine band
 * di kiri + wordmark vertical "POHON APRIKOT — SEITANSAI 2026" + leaf
 * motif center.
 *
 * Tier-aware: spine color/width derive dari TIER_CONFIG biar kartu udah
 * "kasih hint" tier-nya bahkan sebelum flip (subtle giveaway). Untuk
 * legenda, full gold-foil border + ornamen pojok.
 */

import React from 'react';
import { TIER_CONFIG, SET_SIZE, SET_CODE } from '../../data/pohonAprikot';

const KartuBack = ({ tier = 'muda' }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.muda;
  const isLegenda = tier === 'legenda';
  const isLangka = tier === 'langka';

  return (
    <div
      className="relative w-full h-full bg-[color:var(--retro-cream,#faf6ed)] rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(61,52,43,0.18)]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(140,100,60,0.025) 0 1px, transparent 1px 8px)',
      }}
    >
      {/* Spine band — left edge */}
      <span
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: cfg.spineWidth || '4px',
          background: cfg.spineColor || 'var(--retro-burgundy)',
        }}
      />

      {/* Legenda — gold foil inner border */}
      {isLegenda && (
        <span
          className="absolute inset-3 rounded-xl pointer-events-none"
          style={{
            border: '1px solid rgba(218, 175, 92, 0.55)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 217, 122, 0.25)',
          }}
        />
      )}

      {/* Langka — copper inner accent */}
      {isLangka && (
        <span
          className="absolute inset-4 rounded-lg pointer-events-none border border-[color:var(--retro-burgundy)]/20"
          style={{ borderStyle: 'dashed' }}
        />
      )}

      {/* Content — centered column */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8 text-center">
        {/* Top eyebrow */}
        <p
          className="text-[9px] uppercase tracking-[0.5em] text-[color:var(--retro-burgundy)]/70 mb-6"
          style={{ marginLeft: cfg.spineWidth || '4px' }}
        >
          Petikan
        </p>

        {/* Pohon Aprikot crest — apricot fruit + leaf inside dotted
            roundel. TCG set-symbol convention scaled up untuk card back
            centerpiece. Color matches tier (legenda = gold, others =
            burgundy) sebagai subtle pre-flip hint. */}
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          className="mb-6"
          aria-hidden="true"
        >
          {/* Dotted roundel — 16 dots around perimeter */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
            const cx = 36 + Math.cos(angle) * 32;
            const cy = 36 + Math.sin(angle) * 32;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="1.1"
                fill={isLegenda ? '#daaf5c' : 'var(--retro-burgundy)'}
                opacity="0.55"
              />
            );
          })}
          {/* Inner circle outline */}
          <circle
            cx="36"
            cy="36"
            r="25"
            stroke={isLegenda ? '#daaf5c' : 'var(--retro-burgundy)'}
            strokeWidth="0.8"
            fill="none"
            opacity="0.4"
          />
          {/* Apricot fruit */}
          <circle
            cx="36"
            cy="42"
            r="14"
            fill={isLegenda ? '#daaf5c' : 'var(--retro-burgundy)'}
            opacity="0.85"
          />
          {/* Apricot cleft */}
          <path
            d="M 36 30 Q 36 42 36 56"
            stroke={isLegenda ? '#b8893f' : '#5a2e2e'}
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
          />
          {/* Stem */}
          <path
            d="M 36 28 Q 39 22 44 19"
            stroke={isLegenda ? '#b8893f' : '#5a3e2b'}
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Leaf */}
          <ellipse
            cx="46"
            cy="20"
            rx="6"
            ry="3"
            fill="#6b7a47"
            opacity="0.85"
            transform="rotate(-25 46 20)"
          />
          <path
            d="M 42 21 Q 46 19 50 18"
            stroke="#5a3e2b"
            strokeWidth="0.6"
            fill="none"
            opacity="0.6"
            transform="rotate(-25 46 20)"
          />
        </svg>

        {/* Wordmark — large */}
        <h3
          className="text-2xl sm:text-3xl text-[color:var(--retro-brown-dark)] leading-tight mb-2"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Pohon
          <br />
          Aprikot
        </h3>

        {/* Subtitle */}
        <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-brown-dark)]/55 mt-3">
          Seitansai · 2026
        </p>

        {/* Bottom: set code + total card count — TCG batch identifier.
            Replaces decorative dots dengan informasi yang berguna buat
            collector context ("Batch I, set PAA, 64 kartu total"). */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-burgundy)]/55" />
          <p className="text-[8px] uppercase tracking-[0.35em] text-[color:var(--retro-brown-dark)]/55">
            Batch I · {SET_CODE} · {SET_SIZE} kartu
          </p>
        </div>
      </div>
    </div>
  );
};

export default KartuBack;
