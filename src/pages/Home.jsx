/**
 * HomePage Component
 * Mirrors the section flow of corsyava.id, adapted to Armeniaca / Eli JKT48.
 * Flow: Hero -> Data Eli -> About Eli -> Gallery Eli -> Storyline (X archive) -> Helismiley
 */

import React, { useMemo } from 'react';
import { useGallery } from '../context';
import Section from '../components/layout/Section';
import GalleryGrid from '../components/gallery/GalleryGrid';
import XInsights from '../components/gallery/XInsights';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';

const HomePage = () => {
  const { featuredImages, images, eras } = useGallery();
  const { hero, data, about, gallery, storyline, community } = SITE_CONFIG.home;
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

  const archiveStats = useMemo(() => {
    if (!images || images.length === 0) return [];
    const sorted = [...images].sort((a, b) => a.date.localeCompare(b.date));
    const monthFormat = (date) =>
      new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(date);
    return [
      { number: images.length.toLocaleString('id-ID'), label: 'Frame Diarsipkan' },
      { number: eras.length.toString(), label: 'Era Tercatat' },
      { number: monthFormat(new Date(sorted[0].date)), label: 'Frame Pertama' },
      { number: monthFormat(new Date(sorted[sorted.length - 1].date)), label: 'Frame Terbaru' },
    ];
  }, [images, eras.length]);

  const { elementRef: heroRef, isVisible: heroVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <main>
      {/* HERO — full-bleed Eli portrait with Ken Burns reveal */}
      <section
        id="home"
        className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-[color:var(--retro-brown-dark)]"
      >
        {/* Ken Burns Background */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={eli.portrait}
            alt={about.portraitAlt}
            className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
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

        {/* Content */}
        <div
          ref={heroRef}
          className={`
            relative z-10 h-full flex items-end pb-20 md:pb-28 px-6 md:px-16 lg:px-24
            transform transition-all duration-1000
            ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[color:var(--retro-cream)]/10 backdrop-blur-md text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.35em] mb-8 border border-[color:var(--retro-cream)]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)]" />
              {hero.eyebrow}
            </span>

            <h1 className="font-header text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tighter text-[color:var(--retro-cream)]">
              {hero.title}
              <br />
              <span className="text-[color:var(--retro-gold-light)]">{hero.subtitle}.</span>
            </h1>

            <p className="mt-8 text-base md:text-lg text-[color:var(--retro-cream)]/75 leading-relaxed max-w-xl">
              {hero.lead}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <a
                href={`#${hero.primaryCta.hash}`}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-brown-dark)] font-bold text-sm uppercase tracking-widest shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                {hero.primaryCta.label}
                <i className={`${hero.primaryCta.icon} group-hover:translate-x-1 transition-transform`} />
              </a>
              <a
                href={`#${hero.secondaryCta.hash}`}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-transparent border-2 border-[color:var(--retro-cream)]/30 text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest hover:bg-[color:var(--retro-cream)]/10 hover:border-[color:var(--retro-cream)] transition-all"
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

            <dl className="divide-y divide-[color:var(--retro-brown-dark)]/15 border-y border-[color:var(--retro-brown-dark)]/15">
              {profileFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-6 py-4 group"
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

      {/* ABOUT ELI — text-left, portrait-right */}
      <Section id="about-preview" padding="xl">
        <SectionHeading eyebrow={about.eyebrow} title={about.title} />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mt-12">
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
              JKT48 Team KIII
            </div>
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2">
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

      {/* GALLERY ELI — 8-thumbnail grid + CTA */}
      <Section id="gallery-preview" padding="xl" background="gradient">
        <SectionHeading eyebrow={gallery.eyebrow} title={gallery.title} subtitle={gallery.subtitle} />

        {archiveStats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 mt-10">
            {archiveStats.map((stat) => (
              <div
                key={stat.label}
                className="p-5 rounded-2xl bg-[color:var(--retro-bg-primary)]/70 border border-[color:var(--retro-border)] text-center"
              >
                <div className="text-2xl md:text-3xl font-black text-[color:var(--retro-text-primary)] tracking-tight mb-1">
                  {stat.number}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <GalleryGrid imagesOverride={(featuredImages || []).slice(0, 8)} />
        </div>

        <div className="text-center mt-12">
          <a
            href={`#${gallery.ctaHash}`}
            className="group inline-flex items-center gap-3 px-9 py-4 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest shadow-lg shadow-[color:var(--retro-burgundy)]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            {gallery.ctaLabel}
            <i className="ri-arrow-right-up-line group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </a>
        </div>
      </Section>

      {/* STORYLINE — substitutes corsyava's "JKT48 TV" with the X archive chronicle */}
      <Section id="storyline" padding="lg">
        <SectionHeading eyebrow={storyline.eyebrow} title={storyline.title} subtitle={storyline.subtitle} />
        <div className="mt-10">
          <XInsights />
        </div>
      </Section>

      {/* COMMUNITY — Helismiley callout */}
      <Section id="community" padding="lg" background="gradient">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
            {community.eyebrow}
          </p>
          <h2 className="font-header text-3xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] mb-6">
            {community.title}
          </h2>
          <p className="text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed mb-10">
            {community.body}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {community.links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy)] text-xs font-bold uppercase tracking-widest transition-all"
              >
                <i className={`${link.icon} text-base`} />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
};

const SectionHeading = ({ eyebrow, title, subtitle }) => (
  <div className="text-center max-w-2xl mx-auto">
    {eyebrow && (
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
        {eyebrow}
      </p>
    )}
    <h2 className="font-header text-3xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[1.05]">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-4 text-base text-[color:var(--color-text-secondary)] leading-relaxed">
        {subtitle}
      </p>
    )}
    <div className="mt-6 flex items-center justify-center gap-3">
      <div className="w-10 h-px bg-gradient-to-r from-transparent to-[color:var(--retro-gold)]" />
      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)]" />
      <div className="w-10 h-px bg-gradient-to-l from-transparent to-[color:var(--retro-gold)]" />
    </div>
  </div>
);

export default HomePage;
