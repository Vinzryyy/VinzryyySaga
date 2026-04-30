/**
 * Template 3 — Vintage Telegram
 * Muted-rose paper with dashed cream borders, centered "TELEGRAM ·
 * MM/YYYY" stamp, mono body in bone-white, gold-light accents. Reads
 * like a softer apricot-blossom telegram stock. Rose body so it doesn't
 * blend with the cream page background.
 */

import React from 'react';

const TELEGRAM_MONTH = (iso) => {
  if (!iso) return '00 / 0000';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '00 / 0000';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${mm} / ${d.getFullYear()}`;
};

const Template3Telegram = ({ wish }) => {
  const stamp = TELEGRAM_MONTH(wish.date);
  return (
    <article className="relative h-full min-h-[280px] flex flex-col bg-[color:var(--retro-burgundy-light)] p-6 shadow-md border border-[color:var(--retro-cream)]/30 [border-style:double] rounded-md">
      {/* Dotted top + bottom rules */}
      <div className="absolute top-3 left-6 right-6 border-t border-dashed border-[color:var(--retro-cream)]/30" />
      <div className="absolute bottom-3 left-6 right-6 border-t border-dashed border-[color:var(--retro-cream)]/30" />

      <p className="text-center text-[10px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-gold-light)] mt-2 mb-1">
        Telegram
      </p>
      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/55 tabular-nums mb-4">
        {stamp}
      </p>

      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/55 mb-3">
        TO · {wish.handle || 'Eli JKT48'}
      </p>

      <p className="text-sm text-[color:var(--retro-cream)] leading-relaxed flex-1 text-center font-mono tracking-tight">
        {wish.message.toUpperCase()} STOP.
      </p>

      <div className="mt-4 pt-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)]">
          — {wish.name} —
        </p>
      </div>
    </article>
  );
};

export default Template3Telegram;
