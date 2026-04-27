/**
 * Countdown Page — live D/H/M/S timer to Eli's birthday (15 June 2026 WIB).
 * After the target passes, swaps to a "Selamat Ulang Tahun" celebration state.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { SITE_CONFIG } from '../config/siteConfig';

const useCountdown = (targetIso) => {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const diff = Math.max(0, target - now);
  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isComplete: diff === 0 };
};

const TimeUnit = ({ value, label, accent = false }) => (
  <div
    className={`relative rounded-2xl border p-5 md:p-8 text-center transition-colors ${
      accent
        ? 'bg-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-xl shadow-[color:var(--retro-burgundy)]/30'
        : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)]'
    }`}
  >
    <div
      className={`font-header text-6xl md:text-7xl lg:text-8xl font-black leading-none tracking-tighter tabular-nums ${
        accent ? 'text-[color:var(--retro-cream)]' : 'text-[color:var(--retro-burgundy)]'
      }`}
    >
      {String(value).padStart(2, '0')}
    </div>
    <div
      className={`mt-3 text-[10px] font-black uppercase tracking-[0.4em] ${
        accent ? 'text-[color:var(--retro-cream)]/70' : 'text-[color:var(--color-text-muted)]'
      }`}
    >
      {label}
    </div>
  </div>
);

const CountdownPage = () => {
  const config = SITE_CONFIG.countdown;
  const { days, hours, minutes, seconds, isComplete } = useCountdown(config.targetIso);

  return (
    <main id="countdown" className="bg-[color:var(--retro-bg-primary)]">
      {/* Hero band — full-width portrait with overlay */}
      <header className="relative min-h-[70vh] md:min-h-[80vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={config.backgroundImage}
            alt=""
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)] via-[color:var(--retro-brown-dark)]/70 to-[color:var(--retro-brown-dark)]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--retro-brown-dark)]/70 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-32 pb-12 md:pb-16 w-full">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[color:var(--retro-cream)]/10 backdrop-blur-md text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.4em] mb-6 border border-[color:var(--retro-cream)]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)]" />
              {config.eyebrow}
            </span>
            <h1 className="font-header text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tighter text-[color:var(--retro-cream)]">
              {isComplete ? config.completedTitle : config.title}
              <br />
              <span className="text-[color:var(--retro-gold-light)]">
                {isComplete ? config.completedAccent : config.titleAccent}
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-[color:var(--retro-cream)]/80 leading-relaxed max-w-2xl">
              {isComplete ? config.completedLead : config.lead}
            </p>
            <div className="mt-8 inline-flex items-center gap-3 text-[color:var(--retro-cream)]/70">
              <i className="ri-calendar-event-line text-base" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                {config.targetLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Timer block — overlaps hero by lifting up */}
      <section className="relative -mt-16 md:-mt-24 z-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          {!isComplete && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                <TimeUnit value={days} label="Hari" accent />
                <TimeUnit value={hours} label="Jam" />
                <TimeUnit value={minutes} label="Menit" />
                <TimeUnit value={seconds} label="Detik" />
              </div>
              <p className="mt-6 text-center text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                live · update tiap detik
              </p>
            </>
          )}

          {isComplete && (
            <div className="rounded-[2rem] overflow-hidden bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-10 md:p-16 text-center">
              <i className="ri-cake-3-fill text-6xl text-[color:var(--retro-gold-light)] mb-4 inline-block" />
              <p className="font-header text-3xl md:text-5xl font-black leading-[0.95] tracking-tighter">
                Happy {config.age}th Birthday, Ceu Eli!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Context block — birthday facts + catchphrase */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
              About the Day
            </p>
            <h2 className="font-header text-3xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-6">
              15 Juni 2026, hari ke-{config.age}.
            </h2>
            <p className="text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed">
              Helisma Putri Kurnia lahir di Bandung pada 15 Juni 2000. Tahun
              ini, di tengah era JKT48 Fight 2026 dan posisi barunya di Team
              Dream, ulang tahun ke-{config.age} menjadi penanda satu dekade
              lebih perjalanan musiknya.
            </p>
          </div>

          <blockquote className="border-l-2 border-[color:var(--retro-gold)] pl-6">
            <i className="ri-double-quotes-l text-3xl text-[color:var(--retro-gold)] mb-3 inline-block" />
            <p className="font-header text-lg md:text-xl italic text-[color:var(--retro-text-secondary)] leading-relaxed">
              {SITE_CONFIG.eli.catchphrase}
            </p>
            <footer className="mt-3 text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
              Catchphrase {SITE_CONFIG.eli.nickname}
            </footer>
          </blockquote>
        </div>
      </section>
    </main>
  );
};

export default CountdownPage;
