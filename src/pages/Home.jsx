/**
 * HomePage Component
 * Mirrors the section flow of corsyava.id, adapted to Armeniaca / Eli JKT48.
 * Flow: Hero -> Data Eli -> About Eli -> Gallery Eli -> Storyline (X archive) -> Helismiley
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGallery } from '../context';
import Section from '../components/layout/Section';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useParallax } from '../hooks/useParallax';
import { useElementParallax } from '../hooks/useElementParallax';
import { useLightbox } from '../context/LightboxContext';
import { hashToHref } from '../utils/routes';
import useSplitTextReveal from '../hooks/useSplitTextReveal';
import Seo from '../components/Seo';
import { useShowroomLive } from '../hooks/useShowroomLive';
import { useIdnLive } from '../hooks/useIdnLive';
import { useEliSchedule, deriveLiveState } from '../hooks/useEliSchedule';
import EliStatusHero from '../components/home/EliStatusHero';
import NewsStrip from '../components/home/NewsStrip';
import QuoteOfTheDayStrip from '../components/home/QuoteOfTheDayStrip';
import AnnouncementPopup from '../components/home/AnnouncementPopup';
import VideotronPopup from '../components/home/VideotronPopup';

// Stagger reveal helpers — same pattern as Profile page so list/grid items
// cascade in once their container hits the viewport.
const STAGGER_STEP_MS = 60;
const staggerStyle = (index, baseDelay = 0) => ({
  transitionDelay: `${baseDelay + index * STAGGER_STEP_MS}ms`,
});
const staggerClass = (visible) =>
  `transition-all duration-700 ease-out ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
  }`;
// Horizontal variant — fact rows slide in from left instead of up.
const staggerClassH = (visible) =>
  `transition-all duration-700 ease-out ${
    visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
  }`;

// Count-up animation — fires once when `trigger` turns true.
// Pure RAF, no GSAP dependency needed for a simple counter.
const useCountUp = (target, trigger, duration = 1200) => {
  const [value, setValue] = React.useState(0);
  const rafRef = React.useRef(null);
  React.useEffect(() => {
    if (!trigger || !target) return undefined;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, trigger, duration]);
  return value;
};

// Thin ornamental rule between editorial sections — keeps the cream
// pages from reading as one unbroken wall of whitespace.
const SectionOrnament = () => (
  <div className="flex items-center justify-center gap-4 mb-14 mt-2" aria-hidden="true">
    <span className="flex-1 h-px bg-gradient-to-r from-transparent to-[color:var(--retro-brown-dark)]/18" />
    <i className="ri-seedling-line text-sm text-[color:var(--retro-gold)]/55" />
    <span className="flex-1 h-px bg-gradient-to-l from-transparent to-[color:var(--retro-brown-dark)]/18" />
  </div>
);

// Inline badge that counts up — used in Gallery header.
const GalleryCountBadge = ({ total, trigger }) => {
  const count = useCountUp(total, trigger, 1000);
  return <>{count}+ Frame</>;
};


// Derive a year per image — prefer explicit `year` field, fall back to
// parsing the first 4 chars of `date` (YYYY-MM-DD). Returns null when
// neither is usable so the image is excluded from year buckets.
const imageYear = (img) => {
  if (img?.year) {
    const y = Number(img.year);
    if (Number.isFinite(y)) return y;
  }
  if (img?.date) {
    const m = String(img.date).match(/^(\d{4})/);
    if (m) return Number(m[1]);
  }
  return null;
};

// Fisher-Yates on a copy. Used so the archive marquee shows a fresh
// random slice on every page mount instead of the same fixed sequence.
const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Hover-reveal highlight reel.
//
// Single layout for all breakpoints — centered title list with three
// floating frames per active highlight. On hover-capable devices
// (desktop) the title activates on mouseenter and frames track mouse
// parallax. On touch devices the title activates on tap (toggles)
// and the parallax is disabled (frames stay in their resting offset).
// Sizes scale by breakpoint so frames don't overlap titles on narrow
// screens.
const HighlightReel = ({ highlights, eyebrow, title }) => {
  const [active, setActive] = React.useState(null);
  const [mouse, setMouse] = React.useState({ x: 0, y: 0 });
  const [hasHover, setHasHover] = React.useState(true);
  // isNarrow drives the mobile frame layout — frames hug top/bottom
  // corners so they don't crash into the centered title text. Switches
  // back to the desktop floating layout at sm (640px) and up.
  const [isNarrow, setIsNarrow] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const hoverMql = window.matchMedia('(hover: hover)');
    const narrowMql = window.matchMedia('(max-width: 639px)');
    setHasHover(hoverMql.matches);
    setIsNarrow(narrowMql.matches);
    const onHover = (e) => setHasHover(e.matches);
    const onNarrow = (e) => setIsNarrow(e.matches);
    hoverMql.addEventListener?.('change', onHover);
    narrowMql.addEventListener?.('change', onNarrow);
    return () => {
      hoverMql.removeEventListener?.('change', onHover);
      narrowMql.removeEventListener?.('change', onNarrow);
    };
  }, []);

  if (!highlights || highlights.length === 0) return null;

  const handleMouseMove = (e) => {
    if (!hasHover) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMouse({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
  };
  const handleEnter = (idx) => { if (hasHover) setActive(idx); };
  const handleLeave = () => { if (hasHover) setActive(null); };
  const handleClick = (idx) => setActive((prev) => (prev === idx ? null : idx));

  // Two layouts:
  // - Desktop / tablet (>=640px): three frames floating at edges with
  //   mouse-parallax. Frames sit off to the sides of the centered title.
  // - Mobile (<640px): frames hug the top/bottom corners of the
  //   container so the middle vertical band is clear for the title.
  //   Two frames flank the top corners, one centers along the bottom.
  //   Parallax disabled (factor 0) — touch input would jitter.
  const POSITIONS_DESKTOP = [
    { left: '2%', top: '8%', tx: 0, factor: 0.04, rotate: -5 },
    { right: '2%', top: '5%', tx: 0, factor: 0.07, rotate: 6 },
    { left: '6%', bottom: '8%', tx: 0, factor: 0.05, rotate: 3 },
  ];
  const POSITIONS_MOBILE = [
    { left: '0%', top: '0%', tx: 0, factor: 0, rotate: -3 },
    { right: '0%', top: '0%', tx: 0, factor: 0, rotate: 3 },
    { left: '50%', bottom: '0%', tx: -50, factor: 0, rotate: 0 },
  ];
  const POSITIONS = isNarrow ? POSITIONS_MOBILE : POSITIONS_DESKTOP;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      className="relative mb-12 md:mb-16"
    >
      <div className="flex items-baseline justify-between gap-3 mb-6 md:mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
          {eyebrow}
        </p>
        <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
          {highlights.length} momen
        </p>
      </div>

      <div className="relative min-h-[560px] sm:min-h-[640px] md:min-h-[640px] lg:min-h-[680px]">
        {/* Floating frames — one absolute layer per highlight, only the
            active one is opaque. pointer-events-none so they don't trap
            taps/hovers on the title list underneath. */}
        {highlights.map((h, hIdx) => {
          const isActive = active === hIdx;
          return (
            <div
              key={`frames-${h.title}`}
              aria-hidden="true"
              className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {h.frames.slice(0, 3).map((frame, fIdx) => {
                const { tx, factor, rotate, ...posStyle } = POSITIONS[fIdx] || POSITIONS[0];
                return (
                  <div
                    key={fIdx}
                    className="absolute w-[170px] sm:w-[180px] md:w-[200px] lg:w-[240px] xl:w-[280px] aspect-[3/4] rounded-xl md:rounded-2xl overflow-hidden shadow-xl md:shadow-2xl shadow-[color:var(--retro-brown-dark)]/30 will-change-transform"
                    style={{
                      ...posStyle,
                      transform: isActive
                        ? `translate(calc(${tx}% + ${mouse.x * factor}px), ${mouse.y * factor}px) rotate(${rotate}deg)`
                        : `translate(${tx}%, 24px) rotate(${rotate}deg)`,
                      transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    <img
                      src={frame}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Title list — relative + z-10 so it sits above the floating
            frames and stays the click/hover target. */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[560px] sm:min-h-[640px] md:min-h-[640px] lg:min-h-[680px] py-8 md:py-12">
          <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-4 md:mb-6">
            {title}
          </p>
          <ol className="flex flex-col items-center gap-0.5 md:gap-1">
            {highlights.map((h, hIdx) => {
              const isActive = active === hIdx;
              const isOther = active !== null && active !== hIdx;
              return (
                <li
                  key={h.title}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onMouseEnter={() => handleEnter(hIdx)}
                  onClick={() => handleClick(hIdx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick(hIdx);
                    }
                  }}
                  className={`group cursor-pointer transition-opacity duration-300 text-center select-none px-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)]/60 ${
                    isOther ? 'opacity-25' : 'opacity-100'
                  }`}
                >
                  <h3
                    className={`font-header text-3xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tighter leading-[1.05] transition-colors duration-300 ${
                      isActive
                        ? 'text-[color:var(--retro-burgundy)] italic'
                        : 'text-[color:var(--retro-text-primary)] group-hover:text-[color:var(--retro-burgundy)]'
                    }`}
                  >
                    {h.title}
                  </h3>
                  {h.subtitle && (
                    <p
                      className={`mt-1.5 text-[10px] sm:text-xs md:text-xs font-black uppercase tracking-[0.3em] transition-colors duration-300 ${
                        isActive
                          ? 'text-[color:var(--retro-burgundy)]/70'
                          : 'text-[color:var(--color-text-muted)]'
                      }`}
                    >
                      {h.subtitle}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {/* Tap hint — only on touch devices, only before the user has
              activated anything. Disappears after first activation. */}
          {!hasHover && active === null && (
            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/60 animate-pulse">
              Tap untuk lihat momennya
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { featuredImages, images } = useGallery();
  const { hero, data, about, gallery, community } = SITE_CONFIG.home;
  const eli = SITE_CONFIG.eli;
  const { open: openLightbox } = useLightbox();
  const showroomLive = useShowroomLive('JKT48_Eli');
  const idnLive = useIdnLive('jkt48_eli');


  // Shared schedule load — EliStatusHero uses the same hook, module-level
  // promise cache dedupes the request. Drives the hero "Berikutnya" chip
  // for the 'upcoming' state (>24h, ≤30d) where EliStatusHero renders null.
  const eliSchedule = useEliSchedule();
  const eliStatus = useMemo(
    () => deriveLiveState({
      schedule: eliSchedule,
      idnLive,
      showroomLive,
      now: Date.now(),
    }),
    [eliSchedule, idnLive, showroomLive],
  );
  const upcomingChipDays = useMemo(() => {
    if (eliStatus.state !== 'upcoming' || !eliStatus.nextEvent) return null;
    const eventDate = new Date(eliStatus.nextEvent.date);
    const today = new Date();
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((eventDate - today) / (24 * 60 * 60 * 1000));
    if (diffDays <= 1) return 'Besok';
    return `${diffDays} hari lagi`;
  }, [eliStatus.state, eliStatus.nextEvent]);

  const profileFacts = useMemo(
    () => [
      { label: 'Nama Lengkap', value: eli.fullName },
      { label: 'Tanggal Lahir', value: `${eli.birthdate} - ${eli.birthplace}` },
      { label: 'Generasi', value: eli.generation },
      { label: 'Team', value: eli.team },
      { label: 'Bergabung', value: eli.joined },
      { label: 'Asal', value: eli.origin },
      // Social media row — inline icon pills, each links to Eli's
      // handle on that platform. SHOWROOM pill turns red + pulses
      // when she's actively streaming (status checked every 30s via
      // /api/showroom-status proxy). Source: SITE_CONFIG.eli.socials.
      // font-sans on the wrapper resets the parent dd's font-header
      // so the pill labels use the body font (cleaner at small size).
      ...(eli.socials?.length
        ? [{
            label: 'Sosial Media',
            value: (
              <div className="flex flex-wrap items-center gap-2 font-sans">
                {eli.socials.map((s) => {
                  // Map platform name → its live boolean from the
                  // matching hook. Both polled every 30s; both fail
                  // silently in dev where /api routes aren't served.
                  const liveMap = {
                    SHOWROOM: showroomLive.isLive,
                    'IDN Live': idnLive.isLive,
                  };
                  const isLive = !!liveMap[s.platform];
                  // When live, swap the static profile URL for the
                  // active stream's room URL so the click drops the
                  // user directly into the live room.
                  const liveUrl = isLive
                    ? (s.platform === 'IDN Live' && idnLive.liveStream?.url) || s.url
                    : s.url;
                  return (
                    <a
                      key={s.platform}
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${s.platform}: ${s.handle}${isLive ? ' · LIVE NOW' : ''}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-colors ${
                        isLive
                          ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md shadow-red-500/30'
                          : 'bg-[color:var(--retro-burgundy)]/8 hover:bg-[color:var(--retro-burgundy)] text-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)]/15 hover:border-[color:var(--retro-burgundy)]'
                      }`}
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      <i className={`${s.icon} text-base`} />
                      {s.handle}
                      {isLive && <span className="text-[9px] tracking-[0.18em] uppercase ml-0.5">Live</span>}
                    </a>
                  );
                })}
              </div>
            ),
          }]
        : []),
    ],
    [eli, showroomLive.isLive, idnLive.isLive, idnLive.liveStream]
  );

  const featuredEight = useMemo(
    () => (featuredImages || []).slice(0, 8),
    [featuredImages]
  );

  // Year-filter state for the marquee. null = "Semua" (random shuffle of
  // the full archive); a year value filters the marquee to that year only.
  // Filter chips render above the marquee; "Semua" preserves the original
  // serendipity, picking a year repurposes the marquee as a timeline-nav.
  const [marqueeYear, setMarqueeYear] = useState(null);

  // Marquee candidate pool — broader archive minus the bento's first 8
  // featured frames so they don't duplicate. Extracted from the marquee
  // memo below so the year chip strip can render from the same source.
  const marqueeCandidates = useMemo(() => {
    const featured = featuredImages || [];
    const pool = images && images.length > 0 ? images : featured;
    if (pool.length === 0) return [];
    const bentoIds = new Set(featured.slice(0, 8).map((f) => f.id));
    return pool.length > 8 ? pool.filter((img) => !bentoIds.has(img.id)) : pool;
  }, [featuredImages, images]);

  // Years that actually have ≥1 image in the candidate pool — drives the
  // chip strip. Sorted descending so newest archive era leads.
  const availableMarqueeYears = useMemo(() => {
    const set = new Set();
    marqueeCandidates.forEach((img) => {
      const y = imageYear(img);
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [marqueeCandidates]);

  // Marquee strip — random 14-frame slice when "Semua" is active, or all
  // frames from the picked year (random within the year) when filtered.
  // Reshuffles each time `marqueeYear` toggles so swapping years feels
  // intentional, not a cached pre-roll.
  const marqueeFrames = useMemo(() => {
    if (marqueeCandidates.length === 0) return [];
    const filtered = marqueeYear == null
      ? marqueeCandidates
      : marqueeCandidates.filter((img) => imageYear(img) === marqueeYear);
    if (filtered.length === 0) return [];
    return shuffleArray(filtered).slice(0, Math.min(filtered.length, 14));
  }, [marqueeCandidates, marqueeYear]);

  const featuredMeta = useMemo(() => {
    if (featuredEight.length === 0) return null;
    const years = featuredEight.map(imageYear).filter((y) => y != null);
    if (years.length === 0) return null;
    const minY = Math.min(...years);
    const maxY = Math.max(...years);
    return {
      count: featuredEight.length,
      span: minY === maxY ? `${minY}` : `${minY}–${maxY}`,
    };
  }, [featuredEight]);

  const { elementRef: heroRef, isVisible: heroVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });
  const { elementRef: factsRef, isVisible: factsVisible } = useScrollReveal({
    threshold: 0.1,
    rootMargin: '-40px',
  });
  const { elementRef: communityRef, isVisible: communityVisible } = useScrollReveal({
    threshold: 0.1,
    rootMargin: '-40px',
  });
  const { elementRef: galleryStatRef, isVisible: galleryStatVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });
  // Subtle parallax for the two on-page portraits. Data Eli sits high on
  // the page so simple scrollY-driven parallax stays in range. About Eli is
  // farther down, so it uses element-relative parallax (centered around the
  // section's viewport position) — otherwise the cumulative scrollY would
  // shift the image off-frame before the user even sees it.
  const dataPortraitOffset = useParallax(-0.08);
  const [aboutPortraitRef, aboutPortraitOffset] = useElementParallax(0.16, 40);

  // Section heading word-reveal refs (F) — each fires once when the heading
  // enters the viewport. Stagger 0.07s between words feels editorial without
  // being slow. Community heading uses a slightly longer delay so the dark
  // card has time to bloom in before the title animates.
  const dataTitleRef = useSplitTextReveal();
  const aboutTitleRef = useSplitTextReveal();
  const galleryTitleRef = useSplitTextReveal();
  const communityTitleRef = useSplitTextReveal({ delay: 0.15 });

  // GSAP SplitText hero entrance — lazy-loaded so the ~30KB GSAP core only
  // ships when the user lands on the home page, and only when the hero is
  // visible (no work for reduced-motion or background tab cases).
  const heroTitleRef = useRef(null);
  const splitTextFiredRef = useRef(false);
  useEffect(() => {
    if (!heroVisible || !heroTitleRef.current || splitTextFiredRef.current) return undefined;
    splitTextFiredRef.current = true;

    if (
      typeof window === 'undefined' ||
      !window.matchMedia ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    let split;
    let tween;
    let cancelled = false;
    (async () => {
      try {
        const [{ gsap }, { SplitText }] = await Promise.all([
          import('gsap'),
          import('gsap/SplitText'),
        ]);
        if (cancelled || !heroTitleRef.current) return;
        gsap.registerPlugin(SplitText);

        split = new SplitText(heroTitleRef.current, { type: 'chars,words' });
        tween = gsap.from(split.chars, {
          y: 70,
          opacity: 0,
          rotateX: -60,
          duration: 0.9,
          ease: 'back.out(1.6)',
          stagger: { amount: 0.7, from: 'start' },
          transformOrigin: '50% 50% -20',
        });
      } catch {
        // GSAP failed to load — h1 stays visible via the existing markup
      }
    })();

    return () => {
      cancelled = true;
      if (tween) tween.kill();
      if (split) split.revert();
    };
  }, [heroVisible]);

  // Rotating hero backdrop — falls back to a single legacy `background` field
  // if no array is configured.
  const heroSlides = useMemo(() => {
    if (Array.isArray(hero.backgrounds) && hero.backgrounds.length > 0) {
      return hero.backgrounds;
    }
    if (hero.background) return [hero.background];
    return [eli.portrait];
  }, [hero.backgrounds, hero.background, eli.portrait]);

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    const interval = hero.backgroundIntervalMs ?? 10000;
    const id = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % heroSlides.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [heroSlides.length, hero.backgroundIntervalMs]);

  // Prefetch every hero slide once via requestIdleCallback so subsequent
  // cycles don't flicker. Browser already loads the first slide eagerly
  // (it's painted), and the next slide stays preloaded via the second
  // effect below — this one fills in slides 2..N during idle time so a
  // visitor who stays for two cycles never sees an uncached crossfade.
  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const handle = idle(() => {
      heroSlides.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    });
    return () => cancel(handle);
  }, [heroSlides]);

  // Belt-and-braces — explicitly preload the immediate next slide on
  // every index tick. Redundant after the idle prefetch above resolves,
  // but covers the gap between mount and idle-callback firing.
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const next = heroSlides[(slideIndex + 1) % heroSlides.length];
    const img = new Image();
    img.src = next;
  }, [slideIndex, heroSlides]);

  const previousSlide =
    heroSlides[(slideIndex - 1 + heroSlides.length) % heroSlides.length];
  const currentSlide = heroSlides[slideIndex];

  return (
    <main>
      <Seo
        path="/"
        description="Arsip visual independen untuk Helisma Putri (Eli JKT48). Mendokumentasikan panggung, event, dan momen Ceu Eli dari Generasi 7 hingga era Team Dream JKT48 Fight 2026."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Armeniaca',
          url: 'https://armeniaca.online',
          description: 'Arsip visual independen untuk Helisma Putri (Eli JKT48)',
          publisher: {
            '@type': 'Organization',
            name: 'Armeniaca',
            url: 'https://armeniaca.online',
            logo: { '@type': 'ImageObject', url: 'https://armeniaca.online/og-card.png' },
          },
        }}
      />
      {/* HERO — full-bleed Eli portrait with Ken Burns reveal */}
      <section
        id="home"
        className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-[color:var(--retro-brown-dark)]"
      >
        {/* Rotating Ken Burns Background — previous slide stays as a static
            underlay while the new slide fades in + zooms over the top */}
        <div className="absolute inset-0 overflow-hidden">
          {heroSlides.length > 1 && (
            <img
              key={`underlay-${previousSlide}`}
              src={previousSlide}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <img
            key={`overlay-${slideIndex}`}
            src={currentSlide}
            alt={about.portraitAlt}
            className="absolute inset-0 w-full h-full object-cover animate-hero-slide-in"
          />
          {/* Tonal grade — warms to the cream palette while keeping text legible */}
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)] via-[color:var(--retro-brown-dark)]/60 to-[color:var(--retro-brown-dark)]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--retro-brown-dark)]/80 via-transparent to-transparent" />
          {/* Film light leak — warm amber streak bleeding in from the top-right
              corner, layered above the dark vignette so it reads as light
              intruding through the grain, photographic analog effect. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 88% -5%, rgba(201,169,97,0.38) 0%, rgba(201,169,97,0.14) 28%, transparent 55%)',
            }}
          />
        </div>

        {/* Vertical side caption */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
          <div className="rotate-90 origin-right text-[10px] font-black tracking-[0.5em] text-[color:var(--retro-cream)]/40 uppercase whitespace-nowrap">
            Armeniaca | Mermaid Archive | {new Date().getFullYear()}
          </div>
        </div>

        {/* Content — bottom-anchored on tall viewports, but pt-36 + tighter sizing
            keeps the title clear of the fixed navbar even on short browser windows.
            Each child has its own delay so the entrance reads as a sequence
            (eyebrow → headline → lead → CTAs) instead of one block. */}
        <div
          ref={heroRef}
          className="relative z-10 h-full flex items-end pt-36 md:pt-40 pb-16 md:pb-24 px-6 md:px-16 lg:px-24"
        >
          <div className="max-w-3xl">
            <span
              style={{ transitionDelay: '100ms' }}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--retro-cream)]/10 backdrop-blur-md text-[color:var(--retro-cream)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.35em] mb-4 md:mb-6 border border-[color:var(--retro-cream)]/20 transition-all duration-700 ease-out ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            >
              <span className="w-1 h-1 rounded-full bg-[color:var(--retro-gold)]" />
              {hero.eyebrow}
            </span>

            <h1
              ref={heroTitleRef}
              className="font-header text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[0.95] tracking-tighter text-[color:var(--retro-cream)]"
              style={{ perspective: '600px' }}
            >
              {hero.title}
            </h1>
            <p className="font-header text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight text-[color:var(--retro-gold-light)] mt-2 md:mt-3">
              {hero.subtitle}.
            </p>

            <p
              style={{ transitionDelay: '450ms' }}
              className={`mt-4 md:mt-6 text-xs sm:text-sm md:text-base text-[color:var(--retro-cream)]/75 leading-relaxed max-w-xl line-clamp-none transition-all duration-1000 ease-out ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {hero.lead}
            </p>

            <div
              style={{ transitionDelay: '650ms' }}
              className={`mt-6 md:mt-8 flex flex-col sm:flex-row items-start gap-3 transition-all duration-1000 ease-out ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Link
                to={hashToHref(hero.primaryCta.hash)}
                className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-brown-dark)] font-bold text-xs md:text-sm uppercase tracking-widest shadow-2xl hover:-translate-y-0.5 transition-all btn-press"
              >
                {hero.primaryCta.label}
                <i className={`${hero.primaryCta.icon} group-hover:translate-x-1 transition-transform`} />
              </Link>
              <Link
                to={hashToHref(hero.secondaryCta.hash)}
                className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-full bg-transparent border-2 border-[color:var(--retro-cream)]/30 text-[color:var(--retro-cream)] font-bold text-xs md:text-sm uppercase tracking-widest hover:bg-[color:var(--retro-cream)]/10 hover:border-[color:var(--retro-cream)] transition-all"
              >
                <i className={hero.secondaryCta.icon} />
                {hero.secondaryCta.label}
              </Link>
            </div>

            {/* Berikutnya chip — only renders for 'upcoming' state
                (>24h, ≤30d). Live/imminent get the full EliStatusHero
                section below; idle has nothing actionable. */}
            {upcomingChipDays && eliStatus.nextEvent && (
              <div
                style={{ transitionDelay: '800ms' }}
                className={`mt-5 transition-all duration-1000 ease-out ${
                  heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <Link
                  to="/schedule"
                  title={eliStatus.nextEvent.title || 'Event Eli berikutnya'}
                  className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[color:var(--retro-cream)]/10 backdrop-blur-md border border-[color:var(--retro-cream)]/20 hover:bg-[color:var(--retro-cream)]/15 hover:border-[color:var(--retro-cream)]/35 transition-all"
                >
                  <i className="ri-calendar-event-line text-[color:var(--retro-gold-light)] text-sm" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                    Berikutnya
                  </span>
                  <span className="text-[11px] font-bold text-[color:var(--retro-cream)] tracking-wide">
                    {upcomingChipDays}
                  </span>
                  <i className="ri-arrow-right-line text-[color:var(--retro-cream)]/55 text-xs group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Scroll cue — anchors to first numbered spread (01 Data Eli).
            Hidden when the Berikutnya chip renders so hero doesn't end up
            with four competing anchor elements (eyebrow + CTAs + chip +
            cue). Without the chip, this stays as the scroll affordance. */}
        {!upcomingChipDays && (
          <a
            href="#data"
            aria-label="Lanjut ke Data Eli"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-[color:var(--retro-cream)]/50 hover:text-[color:var(--retro-cream)]/80 transition-colors group"
          >
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">
              Lanjut ke Data Eli
            </span>
            <div className="w-px h-8 bg-gradient-to-b from-current to-transparent group-hover:h-10 transition-all" />
          </a>
        )}
      </section>

      {/* STATUS ELI SEKARANG — unified hero, selalu render. Empat state:
          live (IDN/SHOWROOM) → imminent (≤24h) → upcoming (≤30d) → idle.
          Hooks polling tetep di sini biar gak duplikat dengan social pills. */}
      <EliStatusHero idnLive={idnLive} showroomLive={showroomLive} />

      {/* KATA HARI INI — daily-rotating Eli/Armeniaca quote. Pool +
          rotation logic in src/lib/quoteOfTheDay.js, shared with the
          Arme chat greeting so both surfaces show the same daily
          quote (WIB-anchored midnight flip). */}
      <QuoteOfTheDayStrip />

      {/* BERITA JKT48 — hybrid strip: latest /api/v1/news with Eli-mention
          rows pinned to the front + gold badge. Auto-hides if the scrape
          hasn't run yet. Data refreshed every 6h via GH Actions. */}
      <NewsStrip />

      {/* HARMONI KEBAIKAN — single CTA banner to the recap page */}
      <Section id="harmoni-kebaikan" padding="lg">
        <div className="relative rounded-3xl overflow-hidden border border-[color:var(--retro-burgundy)]/15 bg-[color:var(--retro-cream)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-70"
            style={{
              background:
                'radial-gradient(circle at 20% 0%, rgba(122, 46, 46, 0.08) 0%, transparent 55%), radial-gradient(circle at 100% 100%, rgba(201, 169, 97, 0.12) 0%, transparent 60%)',
            }}
          />
          <div className="relative px-6 sm:px-8 md:px-12 py-10 md:py-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)] animate-pulse" />
                Rekap Seitansai
              </span>
              <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
                Harmoni Kebaikan
                <span className="text-[color:var(--retro-burgundy)]"> untuk Ceu Eli.</span>
              </h2>
            </div>
            <Link
              to="/happy-helisma-day-26"
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-xs sm:text-sm uppercase tracking-[0.15em] hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <i className="ri-hand-heart-line text-base" />
              <span>Lihat Rekap</span>
              <i className="ri-arrow-right-line text-base transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Section>


      {/* DATA ELI — editorial spread (portrait left, vertical fact list right) */}
      <Section
        id="data"
        padding="xl"
        glow="radial-gradient(ellipse at 0% 100%, rgba(139,64,64,0.09) 0%, transparent 52%), radial-gradient(ellipse at 100% 0%, rgba(201,169,97,0.11) 0%, transparent 52%)"
      >
        <SectionOrnament />
        {/* Ghost watermark — magazine-editorial large section number behind content */}
        <div className="relative overflow-hidden">
          <span
            aria-hidden="true"
            className="absolute -right-4 -top-8 font-header font-black leading-none select-none pointer-events-none text-[color:var(--retro-brown-dark)]/[0.04]"
            style={{ fontSize: 'clamp(7rem,22vw,19rem)' }}
          >01</span>
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Portrait close-up. Source img-364 has Eli's face in the
              upper 5-25% of frame — anchor object-position at the very
              top + drop the scale entirely so the face is never pushed
              out by parallax. Parallax intensity halved so the image
              barely shifts on scroll, keeping face locked in view. */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[2/3] rounded-sm overflow-hidden img-shine">
              <img
                src={eli.portrait}
                alt={about.portraitAlt}
                style={{
                  transform: `translate3d(0, ${dataPortraitOffset * 0.5}px, 0)`,
                  objectPosition: '50% 0%',
                }}
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-[filter] duration-1000 will-change-transform"
                loading="lazy"
              />
            </div>
            {/* Issue plate — magazine credit */}
            <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] border-t border-[color:var(--retro-brown-dark)]/15 pt-3">
              <span>Plate 01</span>
              <span>{eli.stageName} — JKT48</span>
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Editorial fact list */}
          <div className="lg:col-span-7">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-header text-3xl font-black text-[color:var(--retro-burgundy)]">01</span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                /  {data.eyebrow}
              </span>
            </div>
            <h2 ref={dataTitleRef} className="font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-10">
              {data.title}
            </h2>

            <dl ref={factsRef} className="divide-y divide-[color:var(--retro-brown-dark)]/15 border-y border-[color:var(--retro-brown-dark)]/15">
              {profileFacts.map((fact, idx) => (
                <div
                  key={fact.label}
                  style={staggerStyle(idx)}
                  className={`grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-6 py-4 group ${staggerClassH(factsVisible)}`}
                >
                  <dt className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] pt-1.5">
                    {fact.label}
                  </dt>
                  <dd className="font-header text-lg md:text-xl text-[color:var(--retro-text-primary)] group-hover:text-[color:var(--retro-burgundy)] transition-colors">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>

            <blockquote className="mt-10 pl-6 border-l-2 border-[color:var(--retro-gold)]">
              <p className="font-header text-lg md:text-xl italic text-[color:var(--retro-text-secondary)] leading-relaxed">
                "{eli.catchphrase}"
              </p>
              <footer className="mt-3 text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                Catchphrase — {eli.nickname}
              </footer>
            </blockquote>
          </div>
        </div>
        </div>{/* /relative overflow-hidden ghost-watermark wrapper */}
      </Section>

      {/* ABOUT ELI — asymmetric inline header (eyebrow + title fold into the text column) */}
      <Section
        id="about-preview"
        padding="xl"
        glow="radial-gradient(ellipse at 100% 100%, rgba(201,169,97,0.10) 0%, transparent 52%), radial-gradient(ellipse at 0% 0%, rgba(139,64,64,0.07) 0%, transparent 52%)"
      >
        <SectionOrnament />
        {/* Ghost watermark */}
        <div className="relative overflow-hidden">
          <span
            aria-hidden="true"
            className="absolute -left-4 -top-8 font-header font-black leading-none select-none pointer-events-none text-[color:var(--retro-brown-dark)]/[0.04]"
            style={{ fontSize: 'clamp(7rem,22vw,19rem)' }}
          >02</span>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Portrait — element-relative parallax centered on the section's
              viewport position so the image doesn't drift off-frame before
              user even sees it. Inner wrapper holds the transform; outer
              ref measures the section position. Scale 1.15 gives the +/-40px
              parallax range enough headroom without revealing empty edges. */}
          <div ref={aboutPortraitRef} className="relative group order-2 lg:order-1">
            <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
              <div
                style={{ transform: `translate3d(0, ${aboutPortraitOffset}px, 0) scale(1.15)` }}
                className="absolute inset-0 will-change-transform img-shine"
              >
                <img
                  src={about.portrait}
                  alt={about.portraitAlt}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/40 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 px-5 py-3 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.35em] shadow-xl">
              JKT48 {eli.team}
            </div>
            {/* Plate credit — mirrors Data section's magazine signature.
                mt-12 clears the Team pill which overlaps -bottom-6. */}
            <div className="mt-12 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] border-t border-[color:var(--retro-brown-dark)]/15 pt-3">
              <span>Plate 02</span>
              <span>{eli.stageName} — Profil</span>
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Text + inline header */}
          <div className="order-1 lg:order-2">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-header text-3xl font-black text-[color:var(--retro-burgundy)]">02</span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                /  {about.eyebrow}
              </span>
              <span className="flex-1 h-px bg-[color:var(--retro-burgundy)]/30" />
            </div>
            <h2 ref={aboutTitleRef} className="font-header text-4xl md:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tighter text-[color:var(--retro-text-primary)] mb-8">
              {about.title}
            </h2>
            {about.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed mb-5"
              >
                {p}
              </p>
            ))}
            <Link
              to={hashToHref(about.ctaHash)}
              className="group inline-flex items-center gap-3 mt-4 px-7 py-3.5 rounded-full bg-[color:var(--retro-sepia)] hover:bg-[color:var(--retro-brown)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest transition-colors btn-press"
            >
              {about.ctaLabel}
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
        </div>{/* /relative overflow-hidden ghost-watermark wrapper */}
      </Section>

      {/* GALLERY ELI — bento mosaic with feature tile + integrated CTA cell */}
      <Section
        id="gallery-preview"
        padding="xl"
        background="gradient"
        glow="radial-gradient(ellipse at 100% 0%, rgba(201,169,97,0.13) 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(139,64,64,0.08) 0%, transparent 50%)"
      >
        <SectionOrnament />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-[color:var(--retro-brown-dark)]/15 pb-6 mb-12">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-header text-3xl font-black text-[color:var(--retro-burgundy)]">03</span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                /  {gallery.eyebrow}
              </span>
            </div>
            <h2 ref={galleryTitleRef} className="font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mt-3">
              {gallery.title}
            </h2>
          </div>
          <div ref={galleryStatRef} className="flex flex-col md:items-end gap-3 md:max-w-sm">
            {images?.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                <span className="px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)]/10 tabular-nums">
                  <GalleryCountBadge total={images.length} trigger={galleryStatVisible} />
                </span>
              </div>
            )}
            <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed md:text-right">
              {gallery.subtitle}
            </p>
          </div>
        </div>

        {/* Memorable highlight reel — hover-reveal with mouse parallax.
            Curated list lives in SITE_CONFIG.home.gallery.highlights. */}
        {gallery.highlights && gallery.highlights.length > 0 && (
          <HighlightReel
            highlights={gallery.highlights}
            eyebrow={gallery.highlightsEyebrow}
            title={gallery.highlightsTitle}
          />
        )}

        {/* Infinite marquee + year-filter chips. Chips are part of the
            marquee surface (they CONTROL it), not a separate section —
            keeps the Gallery section count at HighlightReel + Marquee
            + CTA = 3. "Semua" preserves the original random shuffle;
            picking a year repurposes the marquee as a timeline-nav. */}
        {marqueeCandidates.length > 0 && (
          <div className="mt-12 md:mt-16">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                {marqueeYear ? `Arsip ${marqueeYear}` : 'Lebih banyak dari arsip'}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:block">
                {marqueeYear ? `${marqueeFrames.length} frame` : 'Hover untuk pause'}
              </p>
            </div>

            {availableMarqueeYears.length > 1 && (
              <div className="-mx-6 sm:mx-0 px-6 sm:px-0 overflow-x-auto mb-5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                <div
                  role="tablist"
                  aria-label="Filter arsip per tahun"
                  className="flex gap-2 w-max sm:w-auto sm:flex-wrap"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={marqueeYear === null}
                    onClick={() => setMarqueeYear(null)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-colors whitespace-nowrap ${
                      marqueeYear === null
                        ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-md shadow-[color:var(--retro-burgundy)]/20'
                        : 'bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] border border-[color:var(--retro-burgundy)]/20 hover:bg-[color:var(--retro-burgundy)]/10'
                    }`}
                  >
                    Semua
                  </button>
                  {availableMarqueeYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      role="tab"
                      aria-selected={marqueeYear === year}
                      onClick={() => setMarqueeYear(year)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-colors whitespace-nowrap tabular-nums ${
                        marqueeYear === year
                          ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-md shadow-[color:var(--retro-burgundy)]/20'
                          : 'bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] border border-[color:var(--retro-burgundy)]/20 hover:bg-[color:var(--retro-burgundy)]/10'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {marqueeFrames.length > 0 ? (
              <div
                key={marqueeYear ?? 'all'}
                className="marquee-wrapper relative overflow-hidden"
                style={{ '--marquee-duration': `${Math.max(30, marqueeFrames.length * 3)}s` }}
              >
                {/* Edge fade overlays */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-[color:var(--retro-bg-secondary)] to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-[color:var(--retro-bg-secondary)] to-transparent" />

                <div className="marquee-track flex gap-3 md:gap-4 w-max">
                  {[...marqueeFrames, ...marqueeFrames].map((image, i) => (
                    <button
                      type="button"
                      key={`${image.id}-${i}`}
                      onClick={() => openLightbox(marqueeFrames, i % marqueeFrames.length)}
                      aria-label={`Buka frame: ${image.title || 'Eli JKT48'}`}
                      className="group/tile flex-shrink-0 w-32 sm:w-40 md:w-44 lg:w-52 aspect-[3/4] rounded-sm overflow-hidden relative bg-[color:var(--retro-brown-dark)]/10 cursor-zoom-in img-shine"
                      aria-hidden={i >= marqueeFrames.length}
                      tabIndex={i >= marqueeFrames.length ? -1 : 0}
                    >
                      <picture>
                        {image.avifSrcSet && <source srcSet={image.avifSrcSet} type="image/avif" />}
                        {image.webpSrcSet && <source srcSet={image.webpSrcSet} type="image/webp" />}
                        <img
                          src={image.thumbnail || image.url}
                          alt={image.alt || image.title || 'Eli JKT48'}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/tile:scale-105"
                        />
                      </picture>
                      <div className="absolute inset-0 bg-[color:var(--retro-brown-dark)]/0 group-hover/tile:bg-[color:var(--retro-brown-dark)]/30 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--color-text-muted)] italic py-8 text-center">
                Belum ada frame untuk tahun ini.
              </p>
            )}
          </div>
        )}

        {/* CTA button — full-width on all breakpoints now that the bento
            (with its own embedded CTA tile) is gone. */}
        <div className="text-center mt-10">
          <Link
            to={hashToHref(gallery.ctaHash)}
            className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest shadow-lg shadow-[color:var(--retro-burgundy)]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press"
          >
            {gallery.ctaLabel}
            <i className="ri-arrow-right-up-line group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
        </div>
      </Section>

      {/* PETIKAN — ArmePack teaser. Surfaces the daily card feature that sits
          behind the navbar and is otherwise invisible on the homepage. Dark card
          intentionally contrasts the cream Gallery section above it. */}
      <Section id="armepack-preview" padding="lg">
        <div className="relative rounded-3xl overflow-hidden border border-[color:var(--retro-gold)]/20 bg-[color:var(--retro-brown-dark)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 80% 110%, rgba(201,169,97,0.20) 0%, transparent 55%), radial-gradient(circle at 0% 0%, rgba(122,46,46,0.22) 0%, transparent 50%)',
            }}
          />
          <div className="relative px-6 sm:px-8 md:px-12 py-10 md:py-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            <div className="flex-1">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)] animate-pulse" />
                Kartu Harian
              </span>
              <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.95]">
                ArmePack
                <span className="text-[color:var(--retro-gold-light)]"> · The Life of Armeniaca</span>
              </h2>
              <p className="mt-4 text-sm md:text-base text-[color:var(--retro-cream)]/70 leading-relaxed max-w-md">
                Tiga kartu per hari — kepingan cerita Arme sebagai fan Helisma. Kumpulkan semuanya, temukan cerita di baliknya.
              </p>
              <div className="mt-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/45">
                <span>Batch I — Seitansai 2026</span>
                <span>·</span>
                <span>51 Kartu</span>
              </div>
            </div>
            <Link
              to="/armepack"
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)] font-bold text-xs sm:text-sm uppercase tracking-[0.15em] hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <i className="ri-coupon-3-line text-base" />
              <span>Buka Pack</span>
              <i className="ri-arrow-right-line text-base transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Section>

      {/* COMMUNITY — Helismiley as a 2-col platform card (header left, link list right) */}
      <Section id="community" padding="lg">
        {/* Palette bridge — cream→dark transition was abrupt without
            this. Centered burgundy ornament + thin rules previews the
            colour shift so the dark card below feels editorial, not
            jarring. */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--retro-brown-dark)]/20 to-[color:var(--retro-brown-dark)]/30" />
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-burgundy)]">
            <i className="ri-flower-line text-base text-[color:var(--retro-gold)]" />
            Komunitas
          </span>
          <span className="flex-1 h-px bg-gradient-to-l from-transparent via-[color:var(--retro-brown-dark)]/20 to-[color:var(--retro-brown-dark)]/30" />
        </div>
        <div className="relative overflow-hidden rounded-[2rem] bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)]">
          <div className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-5 gap-10 lg:gap-12 p-8 md:p-12 lg:p-16">
            <div className="lg:col-span-3">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-header text-3xl font-black text-[color:var(--retro-gold-light)]">04</span>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-cream)]/60">
                  /  {community.eyebrow}
                </span>
              </div>
              <h2 ref={communityTitleRef} className="font-header text-4xl md:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tighter">
                {community.title}
              </h2>
              <p className="mt-6 text-base md:text-lg text-[color:var(--retro-cream)]/75 leading-relaxed max-w-xl">
                {community.body}
              </p>
            </div>

            <div ref={communityRef} className="lg:col-span-2 flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-cream)]/50 mb-1">
                Tautan Komunitas
              </p>
              {community.links.map((link, idx) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={staggerStyle(idx, 100)}
                  className={`group flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-[color:var(--retro-cream)]/5 hover:bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/10 hover:border-[color:var(--retro-gold-light)]/40 ${staggerClass(communityVisible)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[color:var(--retro-cream)]/10 flex items-center justify-center group-hover:bg-[color:var(--retro-gold-light)] group-hover:text-[color:var(--retro-brown-dark)] transition-colors">
                      <i className={`${link.icon} text-base`} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest">{link.label}</span>
                  </div>
                  <i className="ri-arrow-right-up-line text-lg text-[color:var(--retro-cream)]/40 group-hover:text-[color:var(--retro-gold-light)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Pengumuman one-shot — Photo Frame Project. Auto-dismiss
          persisted di localStorage, kelar dengan satu klik. Mount
          terakhir biar overlay-nya selalu di atas section lainnya. */}
      <AnnouncementPopup />
      <VideotronPopup />
    </main>
  );
};

export default HomePage;
