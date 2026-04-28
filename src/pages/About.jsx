/**
 * AboutPage Component
 *
 * Editorial layout matching Profile/Home aesthetic. Six sections:
 *   1. Hero — title + lead + portrait + stat strip
 *   2. Etymology — Prunus armeniaca origin + palette swatches
 *   3. Pillars — three-card manifesto (kurasi / kontinuitas / fanbase)
 *   4. Sources — attribution list + non-commercial usage note
 *   5. Philosophy — pull quote
 *   6. CTA — links to Gallery / Profile / X
 *
 * All copy lives in SITE_CONFIG.about so future tweaks stay in one
 * place and the JSX stays focused on layout.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useParallax } from '../hooks/useParallax';
import Seo from '../components/Seo';

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
    <header className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12 lg:px-20 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 bottom-0 w-2/5 hidden lg:block pointer-events-none opacity-[0.05]"
        style={{
          maskImage: 'url(/logo-armeniaca.png)',
          WebkitMaskImage: 'url(/logo-armeniaca.png)',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'right center',
          WebkitMaskPosition: 'right center',
          backgroundColor: 'var(--retro-burgundy)',
        }}
      />

      <div ref={elementRef} className="relative max-w-7xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-16 items-center">
        <div className={`lg:col-span-3 ${staggerClass(isVisible)}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-4">
            {hero.eyebrow}
          </p>
          <h1 className="font-header text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
            {hero.title}
            <span className="text-[color:var(--retro-burgundy)]"> {hero.titleAccent}</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            {hero.lead}
          </p>

          <div className="mt-6 space-y-4 text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            {hero.paragraphs.map((p, idx) => (
              <p key={idx} style={staggerStyle(idx + 1, 100)} className={staggerClass(isVisible)}>
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3 text-[color:var(--color-text-muted)]">
            <span className="w-10 h-px bg-[color:var(--retro-gold)]/60" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">
              {hero.kicker}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 relative">
          <div
            className="relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl shadow-[color:var(--retro-burgundy)]/20"
            style={{ transform: `translateY(${portraitOffset}px)` }}
          >
            <img
              src={hero.portrait}
              alt={hero.portraitAlt}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/40 via-transparent to-transparent" />
          </div>
          <span className="absolute -top-3 -left-3 px-4 py-2 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.35em] shadow-xl">
            Armeniaca
          </span>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto mt-12 md:mt-16 grid grid-cols-3 gap-3 md:gap-6">
        {hero.stats.map((stat, idx) => (
          <div
            key={stat.label}
            style={staggerStyle(idx, 200)}
            className={`p-5 md:p-6 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-bg-primary)] ${staggerClass(isVisible)}`}
          >
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-1">
              {stat.label}
            </p>
            <p className="font-header text-xl md:text-3xl font-black text-[color:var(--retro-burgundy)] tracking-tight leading-tight">
              {stat.value}
            </p>
          </div>
        ))}
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

        {/* Theme story — title + paragraphs centered for editorial weight */}
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

        {/* Wordmark on a darker tile so the white-line logo reads. The
            mask trick lets the same PNG render in burgundy here while
            staying white in the navbar — single asset, two contexts. */}
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

        {/* Motif legend — numbered grid, decoded one symbol at a time */}
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
          <h3 className="font-header text-2xl md:text-3xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-tight mb-6">
            Warna-warna aprikot.
          </h3>
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

const PillarsSection = ({ pillars }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.1, triggerOnce: true });
  return (
    <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-[color:var(--retro-cream)]/40">
      <div ref={elementRef} className="max-w-7xl mx-auto">
        <SectionEyebrow eyebrow={pillars.eyebrow} kicker={`${pillars.items.length} pilar`} />
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16 items-start mb-10">
          <h2 className={`font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] ${staggerClass(isVisible)}`}>
            {pillars.title}
          </h2>
          <p
            style={staggerStyle(1)}
            className={`text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed ${staggerClass(isVisible)}`}
          >
            {pillars.lead}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {pillars.items.map((item, idx) => (
            <article
              key={item.title}
              style={staggerStyle(idx + 2, 100)}
              className={`relative p-6 md:p-8 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-bg-primary)] hover:border-[color:var(--retro-burgundy)]/40 transition-colors ${staggerClass(isVisible)}`}
            >
              <span className="absolute -top-3 left-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-md shadow-[color:var(--retro-burgundy)]/30">
                <i className={`${item.icon} text-xl`} />
              </span>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]/70 mt-6 mb-2">
                {String(idx + 1).padStart(2, '0')}
              </p>
              <h3 className="font-header text-xl md:text-2xl font-black tracking-tight text-[color:var(--retro-text-primary)] mb-3 leading-tight">
                {item.title}
              </h3>
              <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const SourcesSection = ({ sources }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.1, triggerOnce: true });
  return (
    <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
      <div ref={elementRef} className="max-w-7xl mx-auto">
        <SectionEyebrow eyebrow={sources.eyebrow} />
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16 items-start mb-10">
          <h2 className={`font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] ${staggerClass(isVisible)}`}>
            {sources.title}
          </h2>
          <p
            style={staggerStyle(1)}
            className={`text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed ${staggerClass(isVisible)}`}
          >
            {sources.lead}
          </p>
        </div>
        <ul className="space-y-3 md:space-y-4">
          {sources.items.map((item, idx) => {
            const Wrapper = item.url ? 'a' : 'div';
            const wrapperProps = item.url
              ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' }
              : {};
            return (
              <li key={item.platform} style={staggerStyle(idx + 2, 100)} className={staggerClass(isVisible)}>
                <Wrapper
                  {...wrapperProps}
                  className={`group flex items-start gap-4 md:gap-5 p-5 md:p-6 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-bg-primary)] ${
                    item.url ? 'hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 transition-all' : ''
                  }`}
                >
                  <span className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] flex items-center justify-center group-hover:bg-[color:var(--retro-burgundy)] group-hover:text-[color:var(--retro-cream)] transition-colors">
                    <i className={`${item.icon} text-2xl`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-header text-lg md:text-xl font-black tracking-tight text-[color:var(--retro-text-primary)] leading-tight">
                        {item.platform}
                      </h3>
                      {item.url && (
                        <i className="ri-arrow-right-up-line text-base text-[color:var(--color-text-muted)] group-hover:text-[color:var(--retro-burgundy)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      )}
                    </div>
                    <p className="mt-1 text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </Wrapper>
              </li>
            );
          })}
        </ul>
        {sources.note && (
          <div className="mt-8 p-5 md:p-6 rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-burgundy)]/[0.03]">
            <div className="flex items-start gap-4">
              <i className="ri-shield-check-line text-2xl text-[color:var(--retro-burgundy)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed">
                {sources.note}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const PhilosophyQuote = ({ philosophy }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: true });
  return (
    <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28 bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)]">
      <div ref={elementRef} className="relative max-w-4xl mx-auto text-center">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full bg-[color:var(--retro-burgundy)]/30 blur-3xl pointer-events-none" />
        <p className={`relative text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-6 ${staggerClass(isVisible)}`}>
          {philosophy.eyebrow}
        </p>
        <i className={`relative ri-double-quotes-l text-5xl md:text-6xl text-[color:var(--retro-gold-light)]/50 mb-4 inline-block ${staggerClass(isVisible)}`} style={staggerStyle(1)} />
        <blockquote
          className={`relative font-header text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter leading-[1.05] mb-8 ${staggerClass(isVisible)}`}
          style={staggerStyle(2)}
        >
          {philosophy.quote}
        </blockquote>
        <cite
          className={`relative text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-cream)]/60 not-italic ${staggerClass(isVisible)}`}
          style={staggerStyle(3)}
        >
          — {philosophy.author}
        </cite>
      </div>
    </section>
  );
};

const CtaSection = ({ cta }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: true });
  return (
    <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
      <div ref={elementRef} className="max-w-5xl mx-auto text-center">
        <p className={`text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-4 ${staggerClass(isVisible)}`}>
          {cta.eyebrow}
        </p>
        <h2
          className={`font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-5 ${staggerClass(isVisible)}`}
          style={staggerStyle(1)}
        >
          {cta.title}
        </h2>
        <p
          className={`text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto mb-10 ${staggerClass(isVisible)}`}
          style={staggerStyle(2)}
        >
          {cta.lead}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {cta.items.map((item, idx) => {
            const baseClass =
              'group inline-flex items-center gap-3 px-6 md:px-7 py-3 md:py-3.5 rounded-full font-bold text-xs md:text-sm uppercase tracking-widest transition-all';
            const styleClass = item.primary
              ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-lg shadow-[color:var(--retro-burgundy)]/30 hover:shadow-xl hover:-translate-y-0.5'
              : 'bg-transparent border-2 border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy)]';
            const className = `${baseClass} ${styleClass} ${staggerClass(isVisible)}`;
            const inner = (
              <>
                <i className={item.icon} />
                {item.label}
                <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
              </>
            );
            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={staggerStyle(idx + 3, 100)}
                  className={className}
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                style={staggerStyle(idx + 3, 100)}
                className={className}
              >
                {inner}
              </Link>
            );
          })}
        </div>
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
        description="Tentang Armeniaca — arsip visual independen yang merawat dokumentasi Helisma Putri (Eli JKT48). Etimologi nama, tiga pilar kerja, sumber & atribusi, plus filosofi proyek."
        path="/about"
      />
      <Hero hero={about.hero} />
      <EtymologySection etymology={about.etymology} />
      <PillarsSection pillars={about.pillars} />
      <SourcesSection sources={about.sources} />
      <PhilosophyQuote philosophy={about.philosophy} />
      <CtaSection cta={about.cta} />
    </main>
  );
};

export default AboutPage;
