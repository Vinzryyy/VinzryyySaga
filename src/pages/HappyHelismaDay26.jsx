/**
 * Rekap Seitansai — Post-birthday recap page for Eli's 26th birthday.
 *
 * Sections (top to bottom):
 *   1. Hero — sentimental recap header
 *   2. Highlights strip — key numbers (wishes, tree supporters, byu supporters)
 *   3. Wishes preview — top hearted wishes with CTA to full wall
 *   4. Galeri Kebaikan summary — donation categories + total
 *   5. By-U Music — embedded player + final supporter count
 *   6. Frame yang Tersimpan — 3D flipbook archive photos
 *   7. Videotron — dual portrait screens
 *   8. Closing message — sentimental thank you
 *
 * Retains the /countdown route for backward compat. Pre-birthday timer
 * still works if targetIso hasn't passed (future-proof).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/siteConfig';
import Seo from '../components/Seo';
import FloatingPetals from '../components/countdown/FloatingPetals';
import { subscribeToWishCount, subscribeToWishes, subscribeToHearts } from '../lib/wishesDb';
import { subscribeToByuSupportCount } from '../lib/byuSupportDb';
import { subscribeToTreeSupports } from '../lib/treeDb';
import { isFirebaseConfigured } from '../lib/firebase';
import { KEBAIKAN_CATEGORIES, KEBAIKAN_ENTRIES, getKebaikanStats } from '../data/galeriKebaikan';
import HarmoniFlipbook from '../components/harmoni/HarmoniFlipbook';
import VideotronDisplay from '../components/harmoni/VideotronDisplay';

/* ------------------------------------------------------------------ */
/*  Countdown hook — retained for pre-birthday fallback               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Pre-birthday timer card                                            */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Section divider — thin rule with center ornament                   */
/* ------------------------------------------------------------------ */
const SectionDivider = () => (
  <div className="max-w-5xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20">
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[color:var(--retro-brown-dark)]/15" />
      <span className="text-[color:var(--retro-gold)] text-xs opacity-60">✦</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[color:var(--retro-brown-dark)]/15" />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */
const RecapSection = ({ children, className = '' }) => (
  <section className={`max-w-5xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 py-12 sm:py-16 md:py-20 ${className}`}>
    {children}
  </section>
);

/* ------------------------------------------------------------------ */
/*  Section eyebrow + title                                            */
/* ------------------------------------------------------------------ */
const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <div className="mb-8 sm:mb-10">
    <div className="flex items-center gap-3 mb-3">
      <span className="w-1 h-4 rounded-full bg-[color:var(--retro-gold)]" />
      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
        {eyebrow}
      </p>
      <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/12 max-w-[120px]" />
    </div>
    <h2 className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
        {subtitle}
      </p>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Format rupiah                                                      */
/* ------------------------------------------------------------------ */
const formatRupiah = (n) =>
  `Rp ${n.toLocaleString('id-ID')}`;

/* ------------------------------------------------------------------ */
/*  Wish card for preview — deterministic rotation from id             */
/* ------------------------------------------------------------------ */
const cardRotations = [-1.1, 0.8, -0.5, 1.3, -0.9, 0.6, -1.4, 0.4];
const WishPreviewCard = ({ wish, hearts, index = 0 }) => (
  <div
    className="group rounded-xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-cream)] p-4 sm:p-5 shadow-[0_4px_20px_rgba(61,52,43,0.07)] hover:shadow-[0_8px_32px_rgba(61,52,43,0.12)] transition-all duration-300 relative"
    style={{ transform: `rotate(${cardRotations[index % cardRotations.length]}deg)` }}
  >
    {/* Tape accent */}
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-[color:var(--retro-gold)]/30 rounded-sm" />
    <p className="text-sm sm:text-base text-[color:var(--retro-text-primary)] leading-relaxed mb-3 font-serif italic pt-1">
      &ldquo;{wish.message}&rdquo;
    </p>
    <div className="flex items-center justify-between border-t border-[color:var(--retro-brown-dark)]/8 pt-3">
      <div>
        <p className="text-xs font-bold text-[color:var(--retro-text-primary)]">{wish.name}</p>
        {wish.handle && (
          <p className="text-[10px] text-[color:var(--color-text-muted)]">{wish.handle}</p>
        )}
      </div>
      {hearts > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-[color:var(--retro-burgundy)] font-bold bg-[color:var(--retro-burgundy)]/8 px-2 py-0.5 rounded-full">
          <i className="ri-heart-3-fill text-sm" />
          {hearts}
        </span>
      )}
    </div>
  </div>
);

/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */
const CountdownPage = () => {
  const config = SITE_CONFIG.countdown;
  const { days, hours, minutes, seconds, isComplete } = useCountdown(config.targetIso);

  /* ---- Firebase live data ---- */
  const [wishCount, setWishCount] = useState(0);
  const [wishes, setWishes] = useState([]);
  const [heartCounts, setHeartCounts] = useState({});
  const [treeCount, setTreeCount] = useState(0);
  const [byuCount, setByuCount] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    const unsubs = [
      subscribeToWishCount(setWishCount),
      subscribeToWishes(setWishes),
      subscribeToHearts(setHeartCounts),
      subscribeToTreeSupports(setTreeCount),
      subscribeToByuSupportCount(setByuCount),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  /* ---- Top hearted wishes ---- */
  const topWishes = useMemo(() => {
    const seeds = (SITE_CONFIG.wishes.seeds || []).map((s, i) => ({
      ...s,
      id: `seed-${i}`,
      date: s.date,
    }));
    const all = [...wishes, ...seeds];
    return all
      .sort((a, b) => (heartCounts[b.id] || 0) - (heartCounts[a.id] || 0))
      .slice(0, 5);
  }, [wishes, heartCounts]);

  /* ---- Galeri Kebaikan stats ---- */
  const kebaikanStats = useMemo(() => getKebaikanStats(KEBAIKAN_ENTRIES), []);

  /* ---- GSAP entrance ---- */
  const rootRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroBgRef = useRef(null);
  const heroLeadRef = useRef(null);
  const heroTagRef = useRef(null);
  const timerRef = useRef(null);
  const liveCaptionRef = useRef(null);
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

          if (heroBgRef.current) {
            tl.from(heroBgRef.current, { scale: 1.15, duration: 2.4, ease: 'power2.out' }, 0);
          }

          if (heroTitleRef.current) {
            const split = new SplitText(heroTitleRef.current, { type: 'chars,words' });
            tl.from(split.chars, {
              yPercent: 100, opacity: 0, rotateX: -50,
              duration: 0.9, ease: 'back.out(1.6)',
              stagger: { amount: 0.6, from: 'start' },
            }, 0.2);
          }

          tl.from(
            [heroLeadRef.current, heroTagRef.current].filter(Boolean),
            { y: 24, opacity: 0, duration: 0.7, stagger: 0.12 }, 0.7,
          );

          if (timerRef.current) {
            tl.from(timerRef.current.querySelectorAll('[data-time-unit]'), {
              y: 40, opacity: 0, scale: 0.9, duration: 0.65,
              ease: 'back.out(1.4)', stagger: 0.1,
            }, 0.95);
          }

          if (liveCaptionRef.current) {
            tl.from(liveCaptionRef.current, { opacity: 0, duration: 0.6 }, 1.6);
          }

          // Scroll-triggered sections
          rootRef.current.querySelectorAll('[data-recap-section]').forEach((el) => {
            gsap.from(el.children, {
              y: 40, opacity: 0, duration: 0.8, stagger: 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: el,
                start: 'top bottom-=80',
                toggleActions: 'play none none reverse',
              },
            });
          });
        }, rootRef);
      } catch {
        // GSAP failed — content stays statically rendered
      }
    })();

    return () => { cancelled = true; if (ctx) ctx.revert(); };
  }, []);

  return (
    <main
      ref={rootRef}
      id="countdown"
      className="bg-[color:var(--retro-bg-primary)] overflow-x-hidden"
    >
      <FloatingPetals />
      <Seo
        title="Rekap Seitansai ke-26 Ceu Eli"
        description="Kilas balik momen ulang tahun ke-26 Helisma Putri (Eli JKT48) — 15 Juni 2026. Ucapan, kebaikan, lagu, dan kenangan."
        path="/happy-helisma-day-26"
      />

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <header className="relative min-h-[85svh] flex items-end overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <img
            ref={heroBgRef}
            src={config.backgroundImage}
            alt=""
            className="w-full h-full object-cover will-change-transform"
          />
          {/* Layered gradients for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)] via-[color:var(--retro-brown-dark)]/65 to-[color:var(--retro-brown-dark)]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--retro-brown-dark)]/80 via-[color:var(--retro-brown-dark)]/30 to-transparent" />
          {/* Film grain texture */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: '128px',
            }}
          />
          {/* Large faded date watermark */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-end pr-8 md:pr-16 pointer-events-none overflow-hidden"
          >
            <p
              className="font-header font-black text-[color:var(--retro-cream)]/[0.04] select-none leading-none"
              style={{ fontSize: 'clamp(8rem, 20vw, 22rem)', letterSpacing: '-0.04em' }}
            >
              26
            </p>
          </div>
        </div>

        <div
          className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 pt-28 sm:pt-32 md:pt-36 pb-12 sm:pb-16 md:pb-20 w-full"
          style={{ perspective: '600px' }}
        >
          <div className="max-w-3xl">
            <span
              ref={heroTagRef}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-[color:var(--retro-cream)]/10 backdrop-blur-md text-[color:var(--retro-cream)] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] sm:tracking-[0.4em] mb-5 sm:mb-7 border border-[color:var(--retro-cream)]/20"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)] animate-pulse" />
              {isComplete ? config.completedEyebrow : config.eyebrow}
            </span>
            <h1
              ref={heroTitleRef}
              className="font-header text-[2.4rem] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.9] tracking-tighter text-[color:var(--retro-cream)] break-words"
            >
              {isComplete ? config.completedTitle : config.title}
              <br />
              <span className="text-[color:var(--retro-gold-light)]">
                {isComplete ? config.completedAccent : config.titleAccent}
              </span>
            </h1>
            <p
              ref={heroLeadRef}
              className="mt-5 sm:mt-7 text-sm sm:text-base md:text-lg text-[color:var(--retro-cream)]/75 leading-relaxed max-w-xl"
            >
              {isComplete ? config.completedLead : config.lead}
            </p>
            <div className="mt-7 sm:mt-9 flex items-center gap-3 text-[color:var(--retro-cream)]/60">
              <div className="w-px h-5 bg-[color:var(--retro-gold)]/50" />
              <i className="ri-calendar-event-line text-sm" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] sm:tracking-[0.4em]">
                {config.targetLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 opacity-40">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-[color:var(--retro-cream)]" />
          <i className="ri-arrow-down-s-line text-[color:var(--retro-cream)] text-lg animate-bounce" />
        </div>
      </header>

      {/* ============================================================ */}
      {/*  TIMER (pre-birthday only)                                    */}
      {/* ============================================================ */}
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
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HIGHLIGHTS STRIP (post-birthday)                             */}
      {/* ============================================================ */}
      {isComplete && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-20 mt-12 sm:mt-16 md:mt-20">
          <div data-recap-section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                icon: '💌',
                value: isFirebaseConfigured ? wishCount.toLocaleString('id-ID') : '—',
                label: 'Ucapan masuk',
                gold: true,
                emoji: true,
              },
              {
                icon: 'ri-plant-line',
                value: isFirebaseConfigured ? treeCount.toLocaleString('id-ID') : '—',
                label: 'Siraman pohon',
              },
              {
                icon: 'ri-music-2-line',
                value: isFirebaseConfigured ? byuCount.toLocaleString('id-ID') : '—',
                label: 'Menunggu By-U',
              },
              {
                icon: 'ri-heart-3-line',
                value: kebaikanStats.totalEntries,
                label: 'Kebaikan tersalurkan',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`relative rounded-2xl border bg-[color:var(--retro-cream)] p-4 sm:p-5 md:p-6 text-center overflow-hidden ${
                  stat.gold
                    ? 'border-[color:var(--retro-gold)]/40 shadow-[0_4px_24px_rgba(201,169,97,0.15)]'
                    : 'border-[color:var(--retro-brown-dark)]/10'
                }`}
              >
                {stat.gold && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[color:var(--retro-gold)] to-transparent" />
                )}
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  stat.gold
                    ? 'bg-[color:var(--retro-gold)]/15'
                    : 'bg-[color:var(--retro-burgundy)]/8 text-[color:var(--retro-burgundy)]'
                }`}>
                  {stat.emoji
                    ? <span className="text-base sm:text-lg leading-none">{stat.icon}</span>
                    : <i className={`${stat.icon} text-base sm:text-lg`} />}
                </div>
                <p className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-burgundy)] tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  ABOUT / CONTEXT BLOCK                                        */}
      {/* ============================================================ */}
      <RecapSection>
        <div data-recap-section className="grid md:grid-cols-2 gap-8 md:gap-16 items-start">
          <div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
              {isComplete ? config.completedAboutEyebrow : 'About the Day'}
            </p>
            <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-5 sm:mb-6">
              {isComplete
                ? config.completedAboutTitle.replace('{age}', config.age)
                : `15 Juni 2026, hari ke-${config.age}.`}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed">
              {isComplete ? (
                config.completedAboutBody.replace(/\{age\}/g, config.age)
              ) : (
                <>
                  Helisma Putri Kurnia lahir di Bandung pada 15 Juni 2000. Tahun
                  ini, di tengah era JKT48 Fight 2026 dan posisi barunya di Team
                  Dream, ulang tahun ke-{config.age} menjadi penanda satu dekade
                  lebih perjalanan musiknya.
                </>
              )}
            </p>
          </div>

          <blockquote className="relative pl-6 sm:pl-7">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[color:var(--retro-gold)] via-[color:var(--retro-gold)]/50 to-transparent rounded-full" />
            <i className="ri-double-quotes-l text-2xl sm:text-3xl text-[color:var(--retro-gold)] mb-4 inline-block" />
            <p className="font-header text-base sm:text-lg md:text-xl italic text-[color:var(--retro-text-secondary)] leading-relaxed">
              {SITE_CONFIG.eli.catchphrase}
            </p>
            <footer className="mt-4 flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
              <span className="w-4 h-px bg-[color:var(--color-text-muted)]/40" />
              Catchphrase {SITE_CONFIG.eli.nickname}
            </footer>
          </blockquote>
        </div>
      </RecapSection>

      {/* ============================================================ */}
      {/*  POST-BIRTHDAY RECAP SECTIONS                                 */}
      {/* ============================================================ */}
      {isComplete && (
        <>
          <SectionDivider />

          {/* ---- WISHES PREVIEW ---- */}
          <RecapSection>
            <div data-recap-section>
              <SectionHeader
                eyebrow="Wishes Wall"
                title="Suara-suara yang sampai."
                subtitle="Pesan dari mereka yang turut merayakan. Setiap kata ditulis dengan tulus — dan Armeniaca menyimpannya di sini."
              />

              {topWishes.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-10 py-3">
                  {topWishes.map((w, i) => (
                    <WishPreviewCard key={w.id} wish={w} hearts={heartCounts[w.id] || 0} index={i} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[color:var(--color-text-muted)] italic mb-8">
                  Belum ada ucapan yang masuk.
                </p>
              )}

              <Link
                to="/wishes"
                className="group inline-flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full border-2 border-[color:var(--retro-burgundy)] text-[color:var(--retro-burgundy)] font-bold text-xs sm:text-sm uppercase tracking-[0.15em] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] transition-all duration-300"
              >
                <i className="ri-mail-heart-line text-base" />
                <span>Baca semua ucapan</span>
                <i className="ri-arrow-right-line text-base transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </RecapSection>

          <SectionDivider />

          {/* ---- GALERI KEBAIKAN SUMMARY ---- */}
          <RecapSection>
            <div data-recap-section>
              <SectionHeader
                eyebrow="Galeri Kebaikan"
                title="Kebaikan yang mengalir."
                subtitle={`${kebaikanStats.totalEntries} kebaikan tersalurkan senilai ${formatRupiah(kebaikanStats.totalAmount)} — atas nama Ceu Eli, dari fans yang peduli.`}
              />

              {/* Total amount highlight */}
              <div className="mb-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-[color:var(--retro-burgundy)]/6 border border-[color:var(--retro-burgundy)]/15">
                <i className="ri-hand-heart-line text-xl text-[color:var(--retro-burgundy)]" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">Total Tersalurkan</p>
                  <p className="font-header text-xl sm:text-2xl font-black tracking-tight text-[color:var(--retro-burgundy)]">
                    {formatRupiah(kebaikanStats.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
                {KEBAIKAN_CATEGORIES.map((cat) => {
                  const catStat = kebaikanStats.byCategory.find((c) => c.id === cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="group rounded-xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-cream)] p-3 sm:p-4 text-center hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(61,52,43,0.1)] transition-all duration-300"
                    >
                      <div className="w-9 h-9 rounded-full bg-[color:var(--retro-burgundy)]/8 group-hover:bg-[color:var(--retro-burgundy)]/14 flex items-center justify-center mx-auto mb-2 transition-colors">
                        <i className={`${cat.icon} text-base text-[color:var(--retro-burgundy)]`} />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[color:var(--retro-text-primary)]">
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-[color:var(--color-text-muted)] mt-1">
                        {catStat?.count || 0} kebaikan
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/galeri-kebaikan"
                  className="group inline-flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full border-2 border-[color:var(--retro-burgundy)] text-[color:var(--retro-burgundy)] font-bold text-xs sm:text-sm uppercase tracking-[0.15em] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] transition-all duration-300"
                >
                  <i className="ri-heart-3-line text-base" />
                  <span>Lihat arsip kebaikan</span>
                  <i className="ri-arrow-right-line text-base transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/26"
                  className="group inline-flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-xs sm:text-sm uppercase tracking-[0.15em] hover:opacity-90 transition-all duration-300"
                >
                  <i className="ri-book-open-line text-base" />
                  <span>Buka rekap event</span>
                  <i className="ri-arrow-right-line text-base transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </RecapSection>

          <SectionDivider />

          {/* ---- BY-U MUSIC ---- */}
          <RecapSection>
            <div data-recap-section>
              <SectionHeader
                eyebrow="By-U Music"
                title="Lagu yang menunggu dibuka."
                subtitle="Sebelum 15 Juni, lagu ini tersegel. Fans menunggu bersama — dan di hari itu, musiknya akhirnya terdengar."
              />

              <div className="relative rounded-2xl overflow-hidden bg-[color:var(--retro-brown-dark)] shadow-[0_20px_60px_rgba(61,52,43,0.25)]">
                {/* Background texture */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(201,169,97,0.6) 0%, transparent 60%)',
                  }}
                />
                {/* Waveform decoration */}
                <div aria-hidden="true" className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 flex items-center gap-[3px] opacity-10">
                  {[18, 32, 24, 40, 28, 48, 22, 36, 30, 44, 20, 38, 26, 42, 18].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[color:var(--retro-cream)]"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>

                <div className="relative p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 flex items-center justify-center flex-shrink-0">
                    <i className="ri-music-2-line text-2xl sm:text-3xl text-[color:var(--retro-cream)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-cream)]/50 mb-1">
                      Lagu Seitansai
                    </p>
                    <p className="font-header text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--retro-cream)] mb-1">
                      By-U
                    </p>
                    <p className="text-sm text-[color:var(--retro-cream)]/60">
                      Putri Helisma · Seitansai ke-26
                    </p>
                    {isFirebaseConfigured && byuCount > 0 && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[color:var(--retro-gold)] font-bold">
                        <i className="ri-group-line" />
                        {byuCount.toLocaleString('id-ID')} orang menunggu bersama
                      </p>
                    )}
                  </div>
                  <Link
                    to="/byu-music"
                    className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-brown-dark)] font-bold text-xs sm:text-sm uppercase tracking-[0.15em] hover:bg-[color:var(--retro-gold-light)] transition-colors flex-shrink-0"
                  >
                    <i className="ri-play-circle-fill text-base" />
                    <span>Dengarkan</span>
                  </Link>
                </div>
              </div>
            </div>
          </RecapSection>

          <SectionDivider />

          {/* ---- FRAME YANG TERSIMPAN — 3D FLIPBOOK ---- */}
          <RecapSection>
            <div data-recap-section>
              <SectionHeader
                eyebrow="Frame yang Tersimpan"
                title="Momen yang Armeniaca rawat."
                subtitle="Diambil dari arsip, ditampilkan kembali untuk dikenang."
              />
              <HarmoniFlipbook />
            </div>
          </RecapSection>

          <SectionDivider />

          {/* ---- VIDEOTRON ---- */}
          <RecapSection>
            <div data-recap-section>
              <SectionHeader
                eyebrow="Videotron Project"
                title="Tayang di Blok M."
                subtitle="Double-sided videotron di Pillar MRT Blok M — 3 pilar, 6 layar, seharian penuh pada 15 Juni 2026."
              />
              <VideotronDisplay />
            </div>
          </RecapSection>

          <SectionDivider />

          {/* ---- CLOSING MESSAGE ---- */}
          <RecapSection>
            <div data-recap-section className="text-center max-w-2xl mx-auto">
              {/* Decorative frame */}
              <div className="relative inline-block mb-8">
                <div className="w-16 h-16 rounded-full bg-[color:var(--retro-burgundy)]/8 border border-[color:var(--retro-burgundy)]/20 flex items-center justify-center mx-auto">
                  <i className="ri-quill-pen-line text-2xl text-[color:var(--retro-burgundy)]" />
                </div>
                {/* Radial dots */}
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <span
                    key={deg}
                    aria-hidden="true"
                    className="absolute w-1 h-1 rounded-full bg-[color:var(--retro-gold)]/40"
                    style={{
                      top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 36}px - 2px)`,
                      left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 36}px - 2px)`,
                    }}
                  />
                ))}
              </div>

              <h2 className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-5 sm:mb-6">
                Terima kasih sudah<br />
                <span className="text-[color:var(--retro-burgundy)]">merayakan bersama.</span>
              </h2>
              <p className="text-sm sm:text-base text-[color:var(--color-text-secondary)] leading-relaxed mb-4">
                Halaman ini bukan sekadar arsip — ini adalah bukti bahwa setiap panggung yang Eli pijak,
                ada yang menunggu di luar sana. Dari ucapan tulus di dinding wishes, pohon kebaikan yang
                tumbuh dari dukungan nyata, hingga lagu yang tersegel sampai hari itu tiba.
              </p>
              <p className="text-sm sm:text-base text-[color:var(--color-text-secondary)] leading-relaxed mb-8">
                Semua dimulai dari hal kecil — dan Armeniaca ada untuk memastikan
                tidak ada yang terlupa.
              </p>

              {/* Signature */}
              <div className="inline-flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-px bg-[color:var(--retro-gold)]/50" />
                  <p className="font-header text-lg sm:text-xl italic text-[color:var(--retro-burgundy)]">
                    Armeniaca, untuk Ceu Eli.
                  </p>
                  <span className="w-8 h-px bg-[color:var(--retro-gold)]/50" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                  15 · 06 · 2026
                </p>
              </div>
            </div>
          </RecapSection>
        </>
      )}
    </main>
  );
};

export default CountdownPage;
