/**
 * Template 1 — Editorial Plate
 * The most direct riff on og-card.png: burgundy plate, eyebrow with star,
 * big display name, body copy, footer signature with handle + date.
 */

import React from 'react';
import { formatWishTimeRelative } from './utils';

const Template1Editorial = ({ wish }) => {
  const date = formatWishTimeRelative(wish.date);
  return (
    <article className="relative h-full min-h-[280px] flex flex-col rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-6 overflow-hidden shadow-md">
      <div className="absolute -top-16 -right-16 w-[220px] h-[220px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />
      <div className="relative flex-1 flex flex-col">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-3">
          ★ Birthday Wish
        </p>
        <h3 className="font-header text-3xl md:text-4xl font-black leading-[0.95] tracking-tighter mb-3">
          {wish.name}
        </h3>
        <p className="text-sm text-[color:var(--retro-cream)]/85 leading-relaxed flex-1">
          “{wish.message}”
        </p>
        <div className="mt-4 pt-3 border-t border-[color:var(--retro-cream)]/15 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] truncate">
            {wish.handle || 'Armeniaca'}
          </span>
          {date && (
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/60 tabular-nums">
              {date}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default Template1Editorial;
