/**
 * Profile Page — full archive of Eli's career, discography, theater
 * setlists, JKT48 Fight 2026 placement, and trivia. Five anchored
 * sections share one page so the navbar stays compact.
 */

import React, { useEffect, useState } from 'react';
import Section from '../components/layout/Section';
import { SITE_CONFIG } from '../config/siteConfig';
import {
  ELI_PROFILE_SECTIONS,
  ELI_TIMELINE,
  ELI_TRIVIA,
  ELI_FUN_FACTS,
} from '../data/eliProfile';

const ProfilePage = () => {
  const eli = SITE_CONFIG.eli;
  const [activeSection, setActiveSection] = useState(ELI_PROFILE_SECTIONS[0].id);

  // Track which anchor is in view so the sticky sub-nav can highlight it
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.1, 0.5, 1] }
    );

    ELI_PROFILE_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main className="bg-[color:var(--retro-bg-primary)]">
      {/* Page header */}
      <header className="relative pt-32 pb-12 md:pt-40 md:pb-16 px-6 md:px-16 lg:px-24 border-b border-[color:var(--retro-brown-dark)]/15">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
            Profil Lengkap
          </p>
          <h1 className="font-header text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
            Arsip Eli, <br className="md:hidden" />
            <span className="text-[color:var(--retro-burgundy)]">Bab demi Bab.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            Riwayat karier {eli.stageName}, partisipasi single, setlist teater, posisinya di JKT48 Fight 2026, sampai trivia ringan — semua dirangkum dalam satu tempat.
          </p>
        </div>
      </header>

      {/* Sticky sub-navigation */}
      <nav className="sticky top-20 z-30 bg-[color:var(--retro-bg-primary)]/85 backdrop-blur-md border-b border-[color:var(--retro-brown-dark)]/10">
        <div className="max-w-5xl mx-auto px-6 md:px-16 lg:px-24 overflow-x-auto">
          <ul className="flex items-center gap-1 py-3 min-w-max">
            {ELI_PROFILE_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] transition-all
                    ${
                      activeSection === section.id
                        ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-md'
                        : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/5'
                    }
                  `}
                >
                  <i className={`${section.icon} text-base`} />
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {ELI_PROFILE_SECTIONS.map((section) => {
        const useGradient = section.id === 'fight' || section.id === 'theater';
        return (
          <Section
            key={section.id}
            id={section.id}
            padding="lg"
            background={useGradient ? 'gradient' : 'default'}
          >
            <SectionRouter id={section.id} section={section} />
          </Section>
        );
      })}
    </main>
  );
};

const SectionRouter = ({ id, section }) => {
  switch (id) {
    case 'timeline':
      return <TimelineSection />;
    case 'trivia':
      return <TriviaSection />;
    default:
      return <SectionPlaceholder section={section} />;
  }
};

const SectionHeader = ({ eyebrow, title, lead }) => (
  <header className="max-w-3xl mb-12">
    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
      {eyebrow}
    </p>
    <h2 className="font-header text-3xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
      {title}
    </h2>
    {lead && (
      <p className="mt-4 text-base text-[color:var(--color-text-secondary)] leading-relaxed">
        {lead}
      </p>
    )}
  </header>
);

const TimelineSection = () => {
  const formatYear = (iso) => new Date(iso).getFullYear();
  return (
    <>
      <SectionHeader
        eyebrow="Career Timeline"
        title="Dari Gen 7 ke Team Dream."
        lead="Linimasa milestone Eli sejak audisi 2018 hingga penempatan di Team Dream dalam format kompetisi JKT48 Fight 2026."
      />

      <ol className="relative border-l-2 border-[color:var(--retro-burgundy)]/20 ml-3 md:ml-6 space-y-10">
        {ELI_TIMELINE.map((event) => (
          <li key={event.id} className="relative pl-8 md:pl-12">
            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[color:var(--retro-burgundy)] ring-4 ring-[color:var(--retro-bg-primary)]" />
            <div className="flex flex-wrap items-baseline gap-3 mb-2">
              <span className="font-header text-2xl md:text-3xl font-black text-[color:var(--retro-burgundy)]">
                {formatYear(event.date)}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
                {event.period}
              </span>
              {event.badge && (
                <span className="ml-auto px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] text-[9px] font-black uppercase tracking-[0.25em]">
                  {event.badge}
                </span>
              )}
            </div>
            <h3 className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-text-primary)] leading-tight mb-2">
              {event.title}
            </h3>
            <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
              {event.body}
            </p>
          </li>
        ))}
      </ol>
    </>
  );
};

const TriviaSection = () => (
  <>
    <SectionHeader
      eyebrow="Trivia & Fun Facts"
      title="Yang Sering Ditanyakan."
      lead="Data ringan tentang Eli yang sering muncul di kolom komentar — dari makanan favorit, hewan peliharaan, sampai keluarga roleplay Cangcorang."
    />

    <div className="mb-10">
      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-4">
        Identitas
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ELI_TRIVIA.map((fact) => (
          <TriviaCard key={fact.label} fact={fact} />
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-4">
        Yang Disukai
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ELI_FUN_FACTS.map((fact) => (
          <TriviaCard key={fact.label} fact={fact} accent />
        ))}
      </div>
    </div>
  </>
);

const TriviaCard = ({ fact, accent = false }) => (
  <div
    className={`group p-5 rounded-2xl border transition-all hover:-translate-y-0.5 ${
      accent
        ? 'bg-[color:var(--retro-burgundy)]/5 border-[color:var(--retro-burgundy)]/15 hover:border-[color:var(--retro-burgundy)]/40'
        : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] flex items-center justify-center group-hover:bg-[color:var(--retro-burgundy)] group-hover:text-[color:var(--retro-cream)] transition-colors">
        <i className={`${fact.icon} text-lg`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mb-1">
          {fact.label}
        </p>
        <p className="text-sm font-bold text-[color:var(--retro-text-primary)] leading-snug">
          {fact.value}
        </p>
      </div>
    </div>
  </div>
);

const SectionPlaceholder = ({ section }) => (
  <div className="text-center py-16">
    <i className={`${section.icon} text-5xl text-[color:var(--retro-burgundy)]/30 mb-4 inline-block`} />
    <h2 className="font-header text-3xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-text-primary)]">
      {section.label}
    </h2>
    <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
      Section dalam pembangunan.
    </p>
  </div>
);

export default ProfilePage;
