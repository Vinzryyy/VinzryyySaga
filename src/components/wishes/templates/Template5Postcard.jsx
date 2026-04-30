/**
 * Template 5 — Postcard with Stamp
 * Gold postcard layout: bone-white "stamp" box top-right with date +
 * apricot blossom, dashed brown divider, name in dark espresso, message
 * body in dark, burgundy edge border + accents. Reads like a luxe Vogue
 * postcard. Gold body so it doesn't blend with the cream page.
 */

import React from 'react';
import { formatWishDate } from './utils';

const Template5Postcard = ({ wish }) => {
  const date = formatWishDate(wish.date);
  return (
    <article className="relative h-full min-h-[280px] flex flex-col rounded-md bg-[color:var(--retro-gold)] p-5 shadow-md border-2 border-[color:var(--retro-burgundy)]/35">
      {/* Header row — name + stamp */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-1">
            Postcard
          </p>
          <h3 className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-brown-dark)] tracking-tight leading-tight truncate">
            {wish.name}
          </h3>
          {wish.handle && (
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/65 mt-0.5 truncate">
              {wish.handle}
            </p>
          )}
        </div>
        {/* Stamp box — bone-white with brown content */}
        <div className="flex-shrink-0 w-16 h-20 border-2 border-dashed border-[color:var(--retro-burgundy)]/45 rounded flex flex-col items-center justify-center p-1 text-center bg-[color:var(--retro-cream)]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[color:var(--retro-burgundy)]" fill="currentColor">
            <circle cx="12" cy="6" r="2.5" opacity="0.55" />
            <circle cx="18" cy="10" r="2.5" opacity="0.55" />
            <circle cx="16" cy="16.5" r="2.5" opacity="0.55" />
            <circle cx="8" cy="16.5" r="2.5" opacity="0.55" />
            <circle cx="6" cy="10" r="2.5" opacity="0.55" />
            <circle cx="12" cy="11.5" r="1.4" />
          </svg>
          {date && (
            <span className="mt-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-[color:var(--retro-burgundy)] tabular-nums leading-tight">
              {date.replace(/\s/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-[color:var(--retro-brown-dark)]/30 mb-3" />

      {/* Message */}
      <p className="text-sm text-[color:var(--retro-brown-dark)] leading-relaxed flex-1">
        {wish.message}
      </p>

      <p className="mt-3 text-right text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
        Armeniaca
      </p>
    </article>
  );
};

export default Template5Postcard;
