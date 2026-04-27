/**
 * Countdown Page — live D/H/M/S timer to Eli's birthday (15 June 2026 WIB).
 * After the target passes, swaps to a "Selamat Ulang Tahun" celebration state.
 *
 * GSAP choreography on mount: SplitText hero title, stagger reveal on the
 * timer cards, scroll-triggered fade-up on the context block. All
 * lazy-loaded via dynamic import + bypassed under prefers-reduced-motion.
 *
 * Mobile-responsive sizing throughout — title scales 4xl -> 8xl across
 * breakpoints; timer numbers cap at 5xl on phones to fit 2-col grid; hero
 * top padding accounts for the fixed navbar.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    data-time-unit
    className={`relative rounded-2xl border p-4 sm:p-5 md:p-8 text-center transition-colors ${
      accent
        ? 'bg-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-xl shadow-[color:var(--retro-burgundy)]/30'
        : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)]'
    }`}
  >
    <div
      className={`font-header text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-none tracking-tighter tabular-nums ${
        accent ? 'text-[color:var(--retro-cream)]' : 'text-[color:var(--retro-burgundy)]'
      }`}
    >
      {String(value).padStart(2, '0')}
    </div>
    <div
      className={`mt-2 sm:mt-3 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] sm:tracking-[0.4em] ${
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

  const rootRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroBgRef = useRef(null);
  const heroLeadRef = useRef(null);
  const heroTagRef = useRef(null);
  const timerRef = useRef(null);
  const liveCaptionRef = useRef(null);
  const contextRef = useRef(null);
  const animationFiredRef = useRef(false);

  useEffect(() => {
    if (animationFiredRef.current) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    animationFiredRef.current = true;

    let ctx;
    let cancelled = false;

    (async () => {
      try {
        const [{ gsap }, { SplitText }, { ScrollTrigger }] = await Promise.all([
          import('gsap'),
          import('gsap/SplitText'),
          import('gsap/ScrollTrigger'),
        ]);
        if (cancelled || !rootRef.current) return;
        gsap.registerPlugin(SplitText, ScrollTrigger);

        ctx = gsap.context(() => {
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

          // 1. Slow Ken-Burns-ish background scale
          if (heroBgRef.current) {
            tl.from(
              heroBgRef.current,
              { scale: 1.15, duration: 2.4, ease: 'power2.out' },
              0
            );
          }

          // 2. Title char-by-char
          if (heroTitleRef.current) {
            const split = new SplitText(heroTitleRef.current, { type: 'chars,words' });
            tl.from(
              split.chars,
              {
                yPercent: 100,
                opacity: 0,
                rotateX: -50,
                duration: 0.9,
                ease: 'back.out(1.6)',
                stagger: { amount: 0.6, from: 'start' },
              },
              0.2
            );
          }

          // 3. Lead + tag
          tl.from(
            [heroLeadRef.current, heroTagRef.current].filter(Boolean),
            { y: 24, opacity: 0, duration: 0.7, stagger: 0.12 },
            0.7
          );

          // 4. Timer cards pop in with stagger + scale
          if (timerRef.current) {
            tl.from(
              timerRef.current.querySelectorAll('[data-time-unit]'),
              {
                y: 40,
                opacity: 0,
                scale: 0.9,
                duration: 0.65,
                ease: 'back.out(1.4)',
                stagger: 0.1,
              },
              0.95
            );
          }

          if (liveCaptionRef.current) {
            tl.from(liveCaptionRef.current, { opacity: 0, duration: 0.6 }, 1.6);
          }

          // 5. Scroll-triggered context block reveal
          if (contextRef.current) {
            gsap.from(contextRef.current.children, {
              y: 40,
              opacity: 0,
              duration: 0.8,
              stagger: 0.15,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: contextRef.current,
                start: 'top bottom-=100',
                toggleActions: 'play none none reverse',
              },
            });
          }
        }, rootRef);
      } catch {
        // GSAP failed — content stays statically rendered; everything still works
      }
    })();

    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <main
      ref={rootRef}
      id="countdown"
      className="bg-[color:var(--retro-bg-primary)] overflow-x-hidden"
    >
      {/* Hero band — full-width portrait with overlay. min-h scales for mobile
          (small phones cap at 60vh so the image doesn't dominate the fold). */}
      <header className="relative min-h-[60vh] sm:min-h-[70vh] md:min-h-[80vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <img
            ref={heroBgRef}
            src={config.backgroundImage}
            alt=""
            className="w-full h-full object-cover will-change-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)] via-[color:var(--retro-brown-dark)]/70 to-[color:var(--retro-brown-dark)]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--retro-brown-dark)]/70 via-transparent to-transparent" />
        </div>

        <div
          className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 pt-28 sm:pt-32 md:pt-36 pb-10 sm:pb-12 md:pb-16 w-full"
          style={{ perspective: '600px' }}
        >
          <div className="max-w-3xl">
            <span
              ref={heroTagRef}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[color:var(--retro-cream)]/10 backdrop-blur-md text-[color:var(--retro-cream)] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] sm:tracking-[0.4em] mb-4 sm:mb-6 border border-[color:var(--retro-cream)]/20"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)]" />
              {config.eyebrow}
            </span>
            <h1
              ref={heroTitleRef}
              className="font-header text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tighter text-[color:var(--retro-cream)]"
            >
              {isComplete ? config.completedTitle : config.title}
              <br />
              <span className="text-[color:var(--retro-gold-light)]">
                {isComplete ? config.completedAccent : config.titleAccent}
              </span>
            </h1>
            <p
              ref={heroLeadRef}
              className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-[color:var(--retro-cream)]/80 leading-relaxed max-w-2xl"
            >
              {isComplete ? config.completedLead : config.lead}
            </p>
            <div className="mt-6 sm:mt-8 inline-flex items-center gap-3 text-[color:var(--retro-cream)]/70">
              <i className="ri-calendar-event-line text-base" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] sm:tracking-[0.4em]">
                {config.targetLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Timer block — overlaps hero by lifting up. Smaller -mt on phones
          so cards don't crowd the title. */}
      <section className="relative -mt-12 sm:-mt-16 md:-mt-24 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-20">
          {!isComplete && (
            <>
              <div ref={timerRef} className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-5">
                <TimeUnit value={days} label="Hari" accent />
                <TimeUnit value={hours} label="Jam" />
                <TimeUnit value={minutes} label="Menit" />
                <TimeUnit value={seconds} label="Detik" />
              </div>
              <p
                ref={liveCaptionRef}
                className="mt-5 sm:mt-6 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] sm:tracking-[0.4em] text-[color:var(--color-text-muted)]"
              >
                live · update tiap detik
              </p>
            </>
          )}

          {isComplete && (
            <div className="rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-8 sm:p-10 md:p-16 text-center">
              <i className="ri-cake-3-fill text-5xl sm:text-6xl text-[color:var(--retro-gold-light)] mb-4 inline-block" />
              <p className="font-header text-2xl sm:text-3xl md:text-5xl font-black leading-[0.95] tracking-tighter">
                Happy {config.age}th Birthday, Ceu Eli!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Context block — birthday facts + catchphrase */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 py-12 sm:py-16 md:py-24">
        <div ref={contextRef} className="grid md:grid-cols-2 gap-8 md:gap-16 items-start">
          <div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
              About the Day
            </p>
            <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-5 sm:mb-6">
              15 Juni 2026, hari ke-{config.age}.
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed">
              Helisma Putri Kurnia lahir di Bandung pada 15 Juni 2000. Tahun
              ini, di tengah era JKT48 Fight 2026 dan posisi barunya di Team
              Dream, ulang tahun ke-{config.age} menjadi penanda satu dekade
              lebih perjalanan musiknya.
            </p>
          </div>

          <blockquote className="border-l-2 border-[color:var(--retro-gold)] pl-5 sm:pl-6">
            <i className="ri-double-quotes-l text-2xl sm:text-3xl text-[color:var(--retro-gold)] mb-3 inline-block" />
            <p className="font-header text-base sm:text-lg md:text-xl italic text-[color:var(--retro-text-secondary)] leading-relaxed">
              {SITE_CONFIG.eli.catchphrase}
            </p>
            <footer className="mt-3 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
              Catchphrase {SITE_CONFIG.eli.nickname}
            </footer>
          </blockquote>
        </div>
      </section>
    </main>
  );
};

export default CountdownPage;
