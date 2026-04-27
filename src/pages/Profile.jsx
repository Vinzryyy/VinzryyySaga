/**
 * Profile Page — full archive of Eli's career, discography, theater
 * setlists, JKT48 Fight 2026 placement, and trivia. Five anchored
 * sections share one page so the navbar stays compact.
 */

import React, { useEffect, useState } from 'react';
import Section from '../components/layout/Section';
import { SITE_CONFIG } from '../config/siteConfig';
import { ELI_PROFILE_SECTIONS } from '../data/eliProfile';

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

      {ELI_PROFILE_SECTIONS.map((section) => (
        <Section
          key={section.id}
          id={section.id}
          padding="lg"
          background={section.id === 'fight' || section.id === 'theater' ? 'gradient' : 'default'}
        >
          <SectionPlaceholder section={section} />
        </Section>
      ))}
    </main>
  );
};

// Temporary placeholder until each section gets its real implementation
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
