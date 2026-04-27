/**
 * HomePage Component
 * Mirrors the section flow of corsyava.id, adapted to Armeniaca / Eli JKT48.
 * Flow: Hero -> Data Eli -> About Eli -> Gallery Eli -> Storyline (X archive) -> Helismiley
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useGallery } from '../context';
import Section from '../components/layout/Section';
import XInsights from '../components/gallery/XInsights';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';

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

const HomePage = () => {
  const { featuredImages } = useGallery();
  const { hero, data, about, gallery, community } = SITE_CONFIG.home;
  const eli = SITE_CONFIG.eli;

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

  const formatFrameDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(d);
  };

  const { elementRef: heroRef, isVisible: heroVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });
  const { elementRef: factsRef, isVisible: factsVisible } = useScrollReveal({
    threshold: 0.1,
    rootMargin: '-40px',
  });
  const { elementRef: bentoRef, isVisible: bentoVisible } = useScrollReveal({
    threshold: 0.05,
    rootMargin: '-40px',
  });
  const { elementRef: communityRef, isVisible: communityVisible } = useScrollReveal({
    threshold: 0.1,
    rootMargin: '-40px',
  });

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
            keeps the title clear of the fixed navbar even on short browser windows */}
        <div
          ref={heroRef}
          className={`
            relative z-10 h-full flex items-end pt-36 md:pt-40 pb-16 md:pb-24 px-6 md:px-16 lg:px-24
            transform transition-all duration-1000
            ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--retro-cream)]/10 backdrop-blur-md text-[color:var(--retro-cream)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.35em] mb-4 md:mb-6 border border-[color:var(--retro-cream)]/20">
              <span className="w-1 h-1 rounded-full bg-[color:var(--retro-gold)]" />
              {hero.eyebrow}
            </span>

            <h1 className="font-header text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[0.95] tracking-tighter text-[color:var(--retro-cream)]">
              {hero.title}
              <br />
              <span className="text-[color:var(--retro-gold-light)]">{hero.subtitle}.</span>
            </h1>

            <p className="mt-4 md:mt-6 text-xs sm:text-sm md:text-base text-[color:var(--retro-cream)]/75 leading-relaxed max-w-xl line-clamp-3 md:line-clamp-none">
              {hero.lead}
            </p>

            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-start gap-3">
              <a
                href={`#${hero.primaryCta.hash}`}
                className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-brown-dark)] font-bold text-xs md:text-sm uppercase tracking-widest shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                {hero.primaryCta.label}
                <i className={`${hero.primaryCta.icon} group-hover:translate-x-1 transition-transform`} />
              </a>
              <a
                href={`#${hero.secondaryCta.hash}`}
                className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-full bg-transparent border-2 border-[color:var(--retro-cream)]/30 text-[color:var(--retro-cream)] font-bold text-xs md:text-sm uppercase tracking-widest hover:bg-[color:var(--retro-cream)]/10 hover:border-[color:var(--retro-cream)] transition-all"
              >
                <i className={hero.secondaryCta.icon} />
                {hero.secondaryCta.label}
              </a>
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
          {/* Portrait close-up */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[3/4] rounded-sm overflow-hidden">
              <img
                src={eli.portrait}
                alt={about.portraitAlt}
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
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
          {/* Portrait */}
          <div className="relative group order-2 lg:order-1">
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
              <img
                src={about.portrait}
                alt={about.portraitAlt}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                loading="lazy"
              />
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
            <a
              href={`#${about.ctaHash}`}
              className="group inline-flex items-center gap-3 mt-4 px-7 py-3.5 rounded-full bg-[color:var(--retro-sepia)] hover:bg-[color:var(--retro-brown)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest transition-colors"
            >
              {about.ctaLabel}
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
            </a>
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

        {/* Bento mosaic — uniform on small screens, asymmetric on lg+. Item 0 spans
            2x2 as a feature tile; the last cell of the lg grid is a CTA card so the
            "view all" action lives inside the rhythm instead of floating below. */}
        <div ref={bentoRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:auto-rows-fr">
          {featuredEight.map((image, index) => {
            const dateLabel = formatFrameDate(image.date);
            return (
              <a
                key={image.id}
                href={`#${gallery.ctaHash}`}
                className={`
                  group relative overflow-hidden rounded-sm bg-[color:var(--retro-brown-dark)]/10
                  ${index === 0 ? 'lg:col-span-2 lg:row-span-2 aspect-square lg:aspect-auto' : 'aspect-square'}
                  ${staggerClass(bentoVisible)}
                `}
                style={staggerStyle(Math.min(index, 7))}
                aria-label={`Frame ${index + 1}: ${image.title || 'Eli JKT48'}`}
              >
                <img
                  src={image.thumbnail || image.url}
                  alt={image.alt || image.title || 'Eli JKT48'}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                {/* Bottom gradient + caption */}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/85 via-[color:var(--retro-brown-dark)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-end justify-between gap-2 text-[color:var(--retro-cream)]">
                    <div className="min-w-0">
                      {dateLabel && (
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)]">
                          {dateLabel}
                        </p>
                      )}
                      {image.location && (
                        <p className="text-xs font-bold truncate mt-0.5">{image.location}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-black tracking-[0.3em] flex-shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                {/* Persistent index for first/feature tile */}
                {index === 0 && (
                  <div className="absolute top-3 left-3 text-[9px] font-black tracking-[0.3em] text-[color:var(--retro-cream)] bg-[color:var(--retro-brown-dark)]/40 backdrop-blur-sm px-2 py-1 rounded-full">
                    Feature
                  </div>
                )}
              </a>
            );
          })}

          {/* CTA tile — fills the empty 12th cell on lg, hidden on smaller grids
              (CTA button below covers them) */}
          <a
            href={`#${gallery.ctaHash}`}
            className="group hidden lg:flex aspect-square relative overflow-hidden rounded-sm bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] flex-col items-center justify-center text-center p-6 hover:bg-[color:var(--retro-brown-dark)] transition-colors"
          >
            <i className="ri-arrow-right-up-line text-3xl mb-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              {gallery.ctaLabel}
            </span>
            <span className="mt-2 text-[9px] uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
              Full Archive
            </span>
          </a>
        </div>

        {/* CTA button — visible only when bento CTA tile is hidden (sm/md) */}
        <div className="text-center mt-10 lg:hidden">
          <a
            href={`#${gallery.ctaHash}`}
            className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest shadow-lg shadow-[color:var(--retro-burgundy)]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            {gallery.ctaLabel}
            <i className="ri-arrow-right-up-line group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </a>
        </div>
      </Section>

      {/* STORYLINE — XInsights carries its own internal heading; no outer SectionHeading */}
      <Section id="storyline" padding="lg">
        <XInsights />
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
