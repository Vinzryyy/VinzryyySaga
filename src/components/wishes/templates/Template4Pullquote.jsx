/**
 * Template 4 — Magazine Pullquote
 * Two-tone composition on a deep espresso body: thin burgundy left strip
 * with vertical eyebrow, oversized italic message in cream, attribution
 * dash with name + handle. Reads like a premium magazine callout box.
 * Espresso body so it doesn't blend with the cream page background.
 */

import React from 'react';
import { formatWishDate } from './utils';

const Template4Pullquote = ({ wish }) => {
  const date = formatWishDate(wish.date);
  return (
    <article className="relative h-full min-h-[280px] flex rounded-2xl bg-[color:var(--retro-brown-dark)] overflow-hidden shadow-md border border-[color:var(--retro-cream)]/20">
      {/* Left vertical strip with rotated eyebrow */}
      <div className="w-9 flex-shrink-0 bg-[color:var(--retro-burgundy)] flex items-center justify-center">
        <span
          style={{ writingMode: 'vertical-rl' }}
          className="text-[9px] font-black uppercase tracking-[0.5em] text-[color:var(--retro-cream)] rotate-180"
        >
          Pullquote · Wish
        </span>
      </div>

      {/* Body */}
      <div className="relative flex-1 flex flex-col p-6">
        <i className="ri-double-quotes-l text-5xl text-[color:var(--retro-cream)]/45 leading-none mb-1" />
        <p className="font-header italic text-xl md:text-2xl leading-tight tracking-tight text-[color:var(--retro-cream)] flex-1">
          {wish.message}
        </p>
        <div className="mt-4 pt-3 border-t border-[color:var(--retro-cream)]/25">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)]">
            — {wish.name}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/65">
            <span className="truncate">{wish.handle || ''}</span>
            {date && <span className="tabular-nums flex-shrink-0">{date}</span>}
          </div>
        </div>
      </div>
    </article>
  );
};

export default Template4Pullquote;
