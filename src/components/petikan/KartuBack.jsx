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
import { TIER_CONFIG } from '../../data/pohonAprikot';

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

        {/* Leaf motif */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          className="mb-6"
          aria-hidden="true"
        >
          <ellipse cx="24" cy="24" rx="14" ry="22" fill="#6b7a47" opacity="0.75" transform="rotate(35 24 24)" />
          <ellipse cx="24" cy="24" rx="13" ry="20" fill="#8a9659" opacity="0.5" transform="rotate(35 24 24)" />
          <path d="M 24 4 Q 24 24 24 44" stroke="#5a3e2b" strokeWidth="1" fill="none" transform="rotate(35 24 24)" />
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

        {/* Bottom seal — small ornamental dot */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-[color:var(--retro-burgundy)]/40" />
          <span className="w-2 h-2 rounded-full bg-[color:var(--retro-burgundy)]/55" />
          <span className="w-1 h-1 rounded-full bg-[color:var(--retro-burgundy)]/40" />
        </div>
      </div>
    </div>
  );
};

export default KartuBack;
