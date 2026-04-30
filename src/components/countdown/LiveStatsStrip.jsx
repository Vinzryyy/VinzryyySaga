/**
 * LiveStatsStrip — two cards underneath the countdown timer:
 *
 *   1. Eli age clock — years/months/days/hours/minutes/seconds since
 *      Eli's birthdate, updating per second so the page always feels
 *      "alive". Reinforces the "menghitung hari" theme.
 *   2. Live wish count — total wishes submitted to Firebase RTDB,
 *      auto-updating via onValue subscription. Social proof + FOMO.
 *
 * Both fail gracefully — the age card always works; the count card
 * shows "—" when Firebase isn't configured (instead of crashing).
 */

import React, { useEffect, useState } from 'react';
import { SITE_CONFIG } from '../../config/siteConfig';
import { subscribeToWishCount } from '../../lib/wishesDb';
import { isFirebaseConfigured } from '../../lib/firebase';

/**
 * Compute years/months/days/hours/minutes/seconds between birthIso and
 * now, with proper carry-over (borrowing days from previous month, etc.).
 */
const computeAge = (birthIso, nowMs = Date.now()) => {
  const birth = new Date(birthIso);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date(nowMs);

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  let hours = now.getHours() - birth.getHours();
  let minutes = now.getMinutes() - birth.getMinutes();
  let seconds = now.getSeconds() - birth.getSeconds();

  if (seconds < 0) { seconds += 60; minutes -= 1; }
  if (minutes < 0) { minutes += 60; hours -= 1; }
  if (hours < 0)   { hours   += 24; days    -= 1; }
  if (days < 0) {
    // Borrow days from the previous month — use day 0 of current month
    // which JS resolves as the last day of the previous month.
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthEnd;
    months -= 1;
  }
  if (months < 0) { months += 12; years -= 1; }

  return { years, months, days, hours, minutes, seconds };
};

const useEliAge = () => {
  const birth = SITE_CONFIG.eli.birthdateIso;
  const [age, setAge] = useState(() => computeAge(birth));
  useEffect(() => {
    const id = setInterval(() => setAge(computeAge(birth)), 1000);
    return () => clearInterval(id);
  }, [birth]);
  return age;
};

const useWishCount = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return subscribeToWishCount(setCount);
  }, []);
  return count;
};

const StatCard = ({ eyebrow, accent = false, children }) => (
  <div
    className={`relative rounded-2xl p-5 sm:p-6 md:p-7 border transition-colors ${
      accent
        ? 'bg-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
        : 'bg-[color:var(--retro-cream)] border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)]'
    }`}
  >
    <p
      className={`text-[10px] font-black uppercase tracking-[0.4em] mb-3 ${
        accent ? 'text-[color:var(--retro-gold-light)]' : 'text-[color:var(--retro-burgundy)]'
      }`}
    >
      {eyebrow}
    </p>
    {children}
  </div>
);

const LiveStatsStrip = () => {
  const age = useEliAge();
  const count = useWishCount();

  return (
    <section
      aria-label="Live stats"
      className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-20 mt-10 sm:mt-14 md:mt-16"
    >
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {/* AGE CLOCK */}
        <StatCard eyebrow="Umur Eli sekarang" accent>
          {age ? (
            <>
              <p className="font-header text-4xl sm:text-5xl md:text-6xl font-black leading-none tracking-tighter tabular-nums">
                {age.years}
                <span className="text-[color:var(--retro-gold-light)] text-2xl sm:text-3xl ml-2 font-normal">
                  tahun
                </span>
              </p>
              <p className="mt-3 text-sm sm:text-base text-[color:var(--retro-cream)]/80 leading-snug">
                <span className="tabular-nums">{age.months}</span> bulan{' '}
                <span className="tabular-nums">{age.days}</span> hari
              </p>
              <p className="mt-1.5 font-mono text-xs sm:text-sm text-[color:var(--retro-cream)]/55 tabular-nums tracking-tight">
                {String(age.hours).padStart(2, '0')}j{' '}
                {String(age.minutes).padStart(2, '0')}m{' '}
                <span className="text-[color:var(--retro-gold-light)]">
                  {String(age.seconds).padStart(2, '0')}d
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-[color:var(--retro-cream)]/60">
              Birthdate belum di-set di siteConfig.
            </p>
          )}
        </StatCard>

        {/* WISH COUNT */}
        <StatCard eyebrow="Total ucapan dari fans">
          <p className="font-header text-4xl sm:text-5xl md:text-6xl font-black leading-none tracking-tighter tabular-nums text-[color:var(--retro-burgundy)]">
            {isFirebaseConfigured ? count : '—'}
          </p>
          <p className="mt-3 text-sm sm:text-base text-[color:var(--color-text-secondary)] leading-snug">
            {isFirebaseConfigured
              ? count === 0
                ? 'Belum ada ucapan masuk. Jadilah yang pertama.'
                : `${count.toLocaleString('id-ID')} ucapan untuk Ceu Eli`
              : 'Firebase belum dikonfigurasi.'}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-burgundy)] animate-pulse" />
            Live · auto-update
          </p>
        </StatCard>
      </div>
    </section>
  );
};

export default LiveStatsStrip;
