/**
 * AboutPage Component
 *
 * Three sections only — kept lean:
 *   1. Hero        — title + lead + draggable portrait card-stack
 *   2. Etymology   — apricot-blossom theme + logo + motif legend + palette
 *   3. Philosophy  — pull quote
 *
 * All copy lives in SITE_CONFIG.about.
 */

import React from 'react';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useParallax } from '../hooks/useParallax';
import Seo from '../components/Seo';
import PortraitCardStack from '../components/about/PortraitCardStack';

const STAGGER_STEP_MS = 60;
const staggerStyle = (index, baseDelay = 0) => ({
  transitionDelay: `${baseDelay + index * STAGGER_STEP_MS}ms`,
});
const staggerClass = (visible) =>
  `transition-all duration-700 ease-out ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
  }`;

const SectionEyebrow = ({ eyebrow, kicker }) => (
  <div className="flex items-baseline justify-between gap-3 mb-6">
    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
      {eyebrow}
    </p>
    <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
    {kicker && (
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
        {kicker}
      </p>
    )}
  </div>
);

const Hero = ({ hero }) => {
  const portraitOffset = useParallax(-0.15);
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <header className="relative pt-32 pb-16 md:pt-40 md:pb-20 px-6 md:px-12 lg:px-20 overflow-hidden">
      {/* Full-bleed background photo + brown-dark gradient overlay,
          matching the treatment on /schedule and /profile so the
          three long pages share visual identity. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/archive/x/x-F82qnMPaoAAZTip.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: '50% 30%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(61, 52, 43, 0.85) 0%, rgba(92, 74, 58, 0.7) 35%, rgba(252, 244, 230, 0.95) 92%, var(--retro-bg-primary) 100%)',
        }}
      />
      {/* Wordmark watermark — kept but bumped opacity slightly so it
          still reads on the new dark overlay. */}
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 bottom-0 w-2/5 hidden lg:block pointer-events-none opacity-[0.08]"
        style={{
          maskImage: 'url(/logo-armeniaca.png)',
          WebkitMaskImage: 'url(/logo-armeniaca.png)',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'right center',
          WebkitMaskPosition: 'right center',
          backgroundColor: 'var(--retro-cream)',
        }}
      />

      <div
        ref={elementRef}
        className="relative max-w-7xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-16 items-center"
      >
        <div className={`lg:col-span-3 ${staggerClass(isVisible)}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy-light)] mb-4">
            {hero.eyebrow}
          </p>
          <h1 className="font-header text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.95] drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
            {hero.title}
            <span className="text-[color:var(--retro-burgundy-light)]"> {hero.titleAccent}</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
            {hero.lead}
          </p>

          {hero.scope && (
            <div className="mt-8 flex items-center gap-3 md:gap-4 flex-wrap">
              <div className="px-4 py-2.5 rounded-2xl border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-bg-primary)]">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-1">
                  {hero.scope.from.sub}
                </p>
                <p className="font-header text-base md:text-lg font-black text-[color:var(--retro-burgundy)] leading-tight tracking-tight">
                  {hero.scope.from.label}
                </p>
              </div>
              <i
                aria-hidden="true"
                className="ri-arrow-right-line text-2xl text-[color:var(--retro-burgundy)]/40"
              />
              <div className="px-4 py-2.5 rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-md shadow-[color:var(--retro-burgundy)]/25">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70 mb-1">
                  {hero.scope.to.sub}
                </p>
                <p className="font-header text-base md:text-lg font-black leading-tight tracking-tight">
                  {hero.scope.to.label}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 relative">
          <PortraitCardStack
            portraits={hero.portraits}
            wrapperStyle={{ transform: `translateY(${portraitOffset}px)` }}
          />
          <span className="absolute -top-3 -left-3 z-10 px-4 py-2 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.35em] shadow-xl pointer-events-none">
            Armeniaca
          </span>
          <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
            <i className="ri-drag-move-2-line mr-1.5 align-[-2px]" />
            Geser kartu
          </p>
        </div>
      </div>
    </header>
  );
};

const EtymologySection = ({ etymology }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.1, triggerOnce: true });
  return (
    <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
      <div ref={elementRef} className="max-w-7xl mx-auto">
        <SectionEyebrow eyebrow={etymology.eyebrow} />

        {/* Theme story — title + paragraphs */}
        <div className="max-w-3xl mb-12 md:mb-16">
          <h2 className={`font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-6 ${staggerClass(isVisible)}`}>
            {etymology.title}
          </h2>
          <div className="space-y-5 text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed">
            {etymology.paragraphs.map((p, idx) => (
              <p key={idx} style={staggerStyle(idx + 1, 100)} className={staggerClass(isVisible)}>
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Wordmark on a dark tile, rendered via CSS mask so the line-art
            logo reads in cream instead of disappearing on the page bg. */}
        <div
          style={staggerStyle(3, 100)}
          className={`relative rounded-[2rem] overflow-hidden bg-[color:var(--retro-brown-dark)] mb-12 md:mb-16 ${staggerClass(isVisible)}`}
        >
          <div className="absolute -top-20 -right-20 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-[260px] h-[260px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />
          <div className="relative px-8 md:px-16 py-12 md:py-20 flex items-center justify-center">
            <div
              role="img"
              aria-label={etymology.logo.alt}
              className="w-full max-w-2xl h-auto"
              style={{
                aspectRatio: '2481 / 943',
                maskImage: `url(${etymology.logo.src})`,
                WebkitMaskImage: `url(${etymology.logo.src})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                backgroundColor: 'var(--retro-cream)',
              }}
            />
          </div>
        </div>

        {/* Motif legend */}
        <div className="mb-12 md:mb-16">
          <p
            style={staggerStyle(4, 100)}
            className={`text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 ${staggerClass(isVisible)}`}
          >
            Legend
          </p>
          <h3
            style={staggerStyle(5, 100)}
            className={`font-header text-2xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-tight mb-8 ${staggerClass(isVisible)}`}
          >
            {etymology.motifsTitle}
          </h3>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {etymology.motifs.map((motif, idx) => (
              <li
                key={motif.name}
                style={staggerStyle(idx + 6, 80)}
                className={`group p-4 md:p-5 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-bg-primary)] hover:border-[color:var(--retro-burgundy)]/40 transition-colors ${staggerClass(isVisible)}`}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]/70 mb-2 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <h4 className="font-header text-base md:text-lg font-black tracking-tight text-[color:var(--retro-text-primary)] leading-tight mb-1">
                  {motif.name}
                </h4>
                <p className="text-xs md:text-sm text-[color:var(--color-text-secondary)] leading-snug">
                  {motif.meaning}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* Palette */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
            {etymology.paletteTitle}
          </p>
          <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {etymology.swatches.map((swatch, idx) => (
              <li
                key={swatch.name}
                style={staggerStyle(idx + 14, 60)}
                className={`p-3 rounded-xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-bg-primary)] ${staggerClass(isVisible)}`}
              >
                <span
                  className="block w-full aspect-square rounded-lg border border-[color:var(--retro-brown-dark)]/15 mb-3"
                  style={{ backgroundColor: swatch.cssVar }}
                  aria-hidden="true"
                />
                <p className="font-bold text-[color:var(--retro-text-primary)] text-sm leading-tight">
                  {swatch.name}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mt-0.5 tabular-nums">
                  {swatch.hex}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

const PhilosophyQuote = ({ philosophy }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: true });
  return (
    <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
      <div ref={elementRef} className="max-w-3xl mx-auto text-center">
        <p className={`text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-6 ${staggerClass(isVisible)}`}>
          {philosophy.eyebrow}
        </p>
        <i className={`ri-double-quotes-l text-5xl md:text-6xl text-[color:var(--retro-gold)]/60 mb-4 inline-block ${staggerClass(isVisible)}`} style={staggerStyle(1)} />
        <blockquote
          className={`font-header text-2xl md:text-3xl lg:text-4xl text-[color:var(--retro-text-primary)] tracking-tight leading-[1.15] mb-6 ${staggerClass(isVisible)}`}
          style={staggerStyle(2)}
        >
          {philosophy.quote}
        </blockquote>
        <cite
          className={`text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] not-italic ${staggerClass(isVisible)}`}
          style={staggerStyle(3)}
        >
          — {philosophy.author}
        </cite>
      </div>
    </section>
  );
};

const AboutPage = () => {
  const { about } = SITE_CONFIG;
  return (
    <main className="bg-[color:var(--retro-bg-primary)]">
      <Seo
        title="About"
        description="Tentang Armeniaca — arsip visual independen untuk Helisma Putri (Eli JKT48). Cerita di balik nama, simbol-simbol di logo, dan filosofi proyek."
        path="/about"
      />
      <Hero hero={about.hero} />
      <EtymologySection etymology={about.etymology} />
      <PhilosophyQuote philosophy={about.philosophy} />
    </main>
  );
};

export default AboutPage;
