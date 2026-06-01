/**
 * QuoteOfTheDayStrip — daily-rotating Armeniaca/Eli quote on home.
 *
 * Minimal strip rendered between EliStatusHero and NewsStrip. Same
 * quote as the chat widget greeting (single source: lib/quoteOfTheDay)
 * so visitors who notice both surfaces see the same daily moment.
 *
 * Refreshes itself at WIB midnight via a single setTimeout — no polling.
 */

import React, { useEffect, useState } from 'react';
import { getQuoteOfTheDay } from '../../lib/quoteOfTheDay';

const msUntilNextWIBMidnight = (now = new Date()) => {
  // Compute next WIB midnight from `now`. WIB is fixed offset +07:00
  // (Indonesia doesn't observe DST), so the math is direct.
  const nowMs = now.getTime();
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const wibMs = nowMs + WIB_OFFSET_MS;
  const dayMs = 86_400_000;
  const nextWibMidnight = Math.ceil(wibMs / dayMs) * dayMs - WIB_OFFSET_MS;
  return Math.max(60_000, nextWibMidnight - nowMs); // never <1min as safety
};

const QuoteOfTheDayStrip = () => {
  const [quote, setQuote] = useState(() => getQuoteOfTheDay());

  // Schedule a single timeout to flip the quote at the next WIB
  // midnight. Re-arms itself after firing.
  useEffect(() => {
    let cancelled = false;
    let timer;
    const arm = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        setQuote(getQuoteOfTheDay());
        arm();
      }, msUntilNextWIBMidnight());
    };
    arm();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!quote) return null;

  return (
    <section
      aria-label="Kata untuk hari ini"
      className="relative w-full bg-[#fdf6ee]/60 border-y border-[#d4a574]/25"
    >
      <div className="mx-auto max-w-3xl px-5 md:px-8 py-5 md:py-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#9a5b4a]/75 mb-1.5">
          Kata Hari Ini
        </div>
        <blockquote
          className="font-serif italic text-[15px] md:text-[17px] leading-snug text-[#3a2818]"
          style={{ fontFamily: '"Fraunces Variable", "Fraunces", serif' }}
        >
          “{quote}”
        </blockquote>
        <div className="text-[10px] text-[#9a5b4a]/60 mt-2 tracking-wider">
          — Armeniaca
        </div>
      </div>
    </section>
  );
};

export default QuoteOfTheDayStrip;
