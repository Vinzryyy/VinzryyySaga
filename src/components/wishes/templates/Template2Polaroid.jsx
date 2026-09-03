/**
 * Template 2 — Polaroid Note
 * White paper-feel card with a small apricot blossom badge top, burgundy
 * serif name, body copy, and a date "stamp" in the bottom-right border
 * area like a Polaroid film tab.
 */

import React from 'react';
import { formatWishDateNumeric } from './utils';

const Template2Polaroid = ({ wish }) => {
  const date = formatWishDateNumeric(wish.date);
  return (
    <article className="relative flex flex-col rounded-md bg-white p-5 pb-10 shadow-md border border-[color:var(--retro-brown-dark)]/8">
      {/* Bloom badge */}
      <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[color:var(--retro-burgundy)]/8 text-[color:var(--retro-burgundy)] flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="6" r="3" />
          <circle cx="18.2" cy="10" r="3" />
          <circle cx="15.8" cy="17" r="3" />
          <circle cx="8.2" cy="17" r="3" />
          <circle cx="5.8" cy="10" r="3" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </div>

      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-text-muted)] mb-2">
        Polaroid · Wish
      </p>
      <h3 className="font-header text-2xl font-black text-[color:var(--retro-burgundy)] tracking-tight leading-tight mb-3 pr-12">
        {wish.name}
      </h3>
      <p className="text-sm text-[color:var(--retro-text-secondary)] leading-relaxed flex-1">
        {wish.message}
      </p>

      {/* Polaroid tab — name + date in the bottom strip */}
      <div className="absolute bottom-2 left-5 right-5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)]">
        <span className="truncate">{wish.handle || '—'}</span>
        {date && <span className="tabular-nums">{date}</span>}
      </div>
    </article>
  );
};

export default Template2Polaroid;
