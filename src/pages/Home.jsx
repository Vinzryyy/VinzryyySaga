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
import Seo from '../components/Seo';

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

      <div className="relative min-h-[720px] sm:min-h-[640px] md:min-h-[640px] lg:min-h-[680px]">
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
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[720px] sm:min-h-[640px] md:min-h-[640px] lg:min-h-[680px] py-8 md:py-12">
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

  const profileFacts = useMemo(
    () => [
      { label: 'Nama Lengkap', value: eli.fullName },
      { label: 'Tanggal Lahir', value: `${eli.birthdate} - ${eli.birthplace}` },
      { label: 'Generasi', value: eli.generation },
      { label: 'Team', value: eli.team },
      { label: 'Bergabung', value: eli.joined },
      { label: 'Asal', value: eli.origin },
    ],
    [eli]
  );

  const featuredEight = useMemo(
    () => (featuredImages || []).slice(0, 8),
    [featuredImages]
  );

  // Marquee strip — random 14-frame slice from the broader archive pool,
  // excluding the bento's first 8 featured frames so they don't duplicate.
  // Reshuffles per mount, so each refresh surfaces different photos.
  // Duplicated in JSX for the seamless 50%-translate loop.
  const marqueeFrames = useMemo(() => {
    const featured = featuredImages || [];
    const pool = images && images.length > 0 ? images : featured;
    if (pool.length === 0) return [];
    const bentoIds = new Set(featured.slice(0, 8).map((f) => f.id));
    const candidates =
      pool.length > 8 ? pool.filter((img) => !bentoIds.has(img.id)) : pool;
    return shuffleArray(candidates).slice(0, Math.min(candidates.length, 14));
  }, [featuredImages, images]);

  const featuredMeta = useMemo(() => {
    if (featuredEight.length === 0) return null;
    const years = featuredEight
      .map((img) => Number(img.year))
      .filter((y) => Number.isFinite(y));
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
  // Subtle parallax for the two on-page portraits. Data Eli sits high on
  // the page so simple scrollY-driven parallax stays in range. About Eli is
  // farther down, so it uses element-relative parallax (centered around the
  // section's viewport position) — otherwise the cumulative scrollY would
  // shift the image off-frame before the user even sees it.
  const dataPortraitOffset = useParallax(-0.08);
  const [aboutPortraitRef, aboutPortraitOffset] = useElementParallax(0.1, 40);

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

  // Preload the next slide so the crossfade starts from a cached image.
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
              <br />
              <span className="text-[color:var(--retro-gold-light)]">{hero.subtitle}.</span>
            </h1>

            <p
              style={{ transitionDelay: '450ms' }}
              className={`mt-4 md:mt-6 text-xs sm:text-sm md:text-base text-[color:var(--retro-cream)]/75 leading-relaxed max-w-xl line-clamp-3 md:line-clamp-none transition-all duration-1000 ease-out ${
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
                className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-brown-dark)] font-bold text-xs md:text-sm uppercase tracking-widest shadow-2xl hover:-translate-y-0.5 transition-all"
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
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-[color:var(--retro-cream)]/50">
          <span className="text-[9px] font-black uppercase tracking-[0.4em]">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[color:var(--retro-cream)]/50 to-transparent" />
        </div>
      </section>

      {/* DATA ELI — editorial spread (portrait left, vertical fact list right) */}
      <Section id="data" padding="xl">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Portrait close-up — object-top biases the crop so Eli's face
              (upper-15% of the source frame) stays in view as the parallax
              + scale(1.06) move things around. */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[3/4] rounded-sm overflow-hidden">
              <img
                src={eli.portrait}
                alt={about.portraitAlt}
                style={{ transform: `translate3d(0, ${dataPortraitOffset}px, 0) scale(1.06)` }}
                className="w-full h-full object-cover object-top grayscale hover:grayscale-0 transition-[filter] duration-1000 will-change-transform"
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
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-4">
              {data.eyebrow}
            </p>
            <h2 className="font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-10">
              {data.title}
            </h2>

            <dl ref={factsRef} className="divide-y divide-[color:var(--retro-brown-dark)]/15 border-y border-[color:var(--retro-brown-dark)]/15">
              {profileFacts.map((fact, idx) => (
                <div
                  key={fact.label}
                  style={staggerStyle(idx)}
                  className={`grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-6 py-4 group ${staggerClass(factsVisible)}`}
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
      </Section>

      {/* ABOUT ELI — asymmetric inline header (eyebrow + title fold into the text column) */}
      <Section id="about-preview" padding="xl">
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
                className="absolute inset-0 will-change-transform"
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
              JKT48 Team Dream
            </div>
          </div>

          {/* Text + inline header */}
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-3 mb-4 text-[color:var(--retro-burgundy)]">
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{about.eyebrow}</span>
              <span className="flex-1 h-px bg-[color:var(--retro-burgundy)]/30" />
            </div>
            <h2 className="font-header text-4xl md:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tighter text-[color:var(--retro-text-primary)] mb-8">
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
              className="group inline-flex items-center gap-3 mt-4 px-7 py-3.5 rounded-full bg-[color:var(--retro-sepia)] hover:bg-[color:var(--retro-brown)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest transition-colors"
            >
              {about.ctaLabel}
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </Section>

      {/* GALLERY ELI — bento mosaic with feature tile + integrated CTA cell */}
      <Section id="gallery-preview" padding="xl" background="gradient">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-[color:var(--retro-brown-dark)]/15 pb-6 mb-12">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-header text-3xl font-black text-[color:var(--retro-burgundy)]">03</span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                /  {gallery.eyebrow}
              </span>
            </div>
            <h2 className="font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mt-3">
              {gallery.title}
            </h2>
          </div>
          <div className="flex flex-col md:items-end gap-3 md:max-w-sm">
            {featuredMeta && (
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                <span className="px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)]/10">
                  {featuredMeta.count} Frames
                </span>
                <span className="text-[color:var(--color-text-muted)]">·</span>
                <span>Curated {featuredMeta.span}</span>
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

        {/* Infinite marquee — CSS-only horizontal scroll of additional frames,
            pauses on hover/focus. Duplicated track gives a seamless loop at
            translateX(-50%). Edge fades hint that there's more off-screen. */}
        {marqueeFrames.length > 0 && (
          <div className="mt-12 md:mt-16">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                Lebih banyak dari arsip
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:block">
                Hover untuk pause
              </p>
            </div>
            <div
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
                    className="group/tile flex-shrink-0 w-32 sm:w-40 md:w-44 lg:w-52 aspect-[3/4] rounded-sm overflow-hidden relative bg-[color:var(--retro-brown-dark)]/10 cursor-zoom-in"
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
          </div>
        )}

        {/* CTA button — full-width on all breakpoints now that the bento
            (with its own embedded CTA tile) is gone. */}
        <div className="text-center mt-10">
          <Link
            to={hashToHref(gallery.ctaHash)}
            className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest shadow-lg shadow-[color:var(--retro-burgundy)]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            {gallery.ctaLabel}
            <i className="ri-arrow-right-up-line group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
        </div>
      </Section>

      {/* COMMUNITY — Helismiley as a 2-col platform card (header left, link list right) */}
      <Section id="community" padding="lg">
        <div className="relative overflow-hidden rounded-[2rem] bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)]">
          <div className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-5 gap-10 lg:gap-12 p-8 md:p-12 lg:p-16">
            <div className="lg:col-span-3">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-4">
                {community.eyebrow}
              </p>
              <h2 className="font-header text-4xl md:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tighter">
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
    </main>
  );
};

export default HomePage;
