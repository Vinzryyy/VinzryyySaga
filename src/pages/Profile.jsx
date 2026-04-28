/**
 * Profile Page — full archive of Eli's career, discography, theater
 * setlists, JKT48 Fight 2026 placement, and trivia. Five anchored
 * sections share one page so the navbar stays compact.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Section from '../components/layout/Section';
import Seo from '../components/Seo';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';
import { useParallax } from '../hooks/useParallax';
import {
  ELI_PROFILE_SECTIONS,
  ELI_TIMELINE,
  ELI_DISCOGRAPHY,
  ELI_ALBUMS,
  ELI_THEATER,
  ELI_FIGHT_2026,
  ELI_TRIVIA,
  ELI_FUN_FACTS,
  ELI_TAGLINES,
} from '../data/eliProfile';

// Stagger reveal helpers — wire useScrollReveal on a list container, then
// compose these on each child so they cascade in once the container hits view.
const STAGGER_STEP_MS = 60;
const staggerStyle = (index, baseDelay = 0) => ({
  transitionDelay: `${baseDelay + index * STAGGER_STEP_MS}ms`,
});
const staggerClass = (visible) =>
  `transition-all duration-700 ease-out ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
  }`;

// Splits a stat value like "350+", "6+ Tahun", "Dream" into a number to
// animate plus the surrounding text. Pure-text values are passed through
// without animation.
const parseStatValue = (raw) => {
  const match = String(raw).match(/^(\D*)(\d+)(.*)$/);
  if (!match) return { number: null, prefix: '', suffix: String(raw) };
  return { number: parseInt(match[2], 10), prefix: match[1], suffix: match[3] };
};

const AnimatedStat = ({ value, start, duration = 1400 }) => {
  const { number, prefix, suffix } = parseStatValue(value);
  const animated = useCountUp(number ?? 0, { start: start && number !== null, duration });
  if (number === null) return <>{value}</>;
  return (
    <>
      {prefix}
      {animated.toLocaleString('id-ID')}
      {suffix}
    </>
  );
};

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

  const profile = SITE_CONFIG.profile;
  const { elementRef: statsRef, isVisible: statsVisible } = useScrollReveal({
    threshold: 0.2,
    rootMargin: '0px',
  });
  // Three different parallax rates so the portraits visually decouple as the
  // user scrolls — front frame moves fastest, back frames trail behind.
  const collageOffsetA = useParallax(-0.12);
  const collageOffsetB = useParallax(-0.22);
  const collageOffsetC = useParallax(-0.08);

  return (
    <main className="bg-[color:var(--retro-bg-primary)]">
      <Seo
        title="Profil Eli"
        description="Profil lengkap Helisma Putri (Eli JKT48) — timeline karier, JKT48 Fight 2026 di Team Dream, diskografi termasuk Sousenkyo Rapsodi, daftar setlist teater, plus trivia dan fun facts."
        path="/profile"
      />
      {/* Editorial hero — title block left, layered portrait collage right */}
      <header className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12 lg:px-20 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[color:var(--retro-burgundy)]/8 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-7">
            {/* Magazine issue plate */}
            <div className="flex items-center gap-3 mb-6 text-[color:var(--retro-burgundy)]">
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{profile.issue}</span>
              <span className="w-10 h-px bg-[color:var(--retro-burgundy)]/30" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">{profile.edition}</span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
              {profile.eyebrow}
            </p>
            <h1 className="font-header text-5xl sm:text-6xl md:text-7xl lg:text-[110px] font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.9]">
              {profile.title}
              <br />
              <span className="text-[color:var(--retro-burgundy)]">{profile.titleAccent}</span>
            </h1>
            <p className="mt-8 text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
              {profile.lead.replace('Eli', eli.stageName)}
            </p>

            {/* Stat strip — numeric values count up when the strip enters view */}
            <dl ref={statsRef} className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
              {profile.quickStats.map((stat, idx) => (
                <div
                  key={stat.label}
                  style={staggerStyle(idx)}
                  className={`border-l-2 border-[color:var(--retro-burgundy)] pl-3 ${staggerClass(statsVisible)}`}
                >
                  <dd className="font-header text-2xl md:text-3xl font-black text-[color:var(--retro-text-primary)] leading-tight tabular-nums">
                    <AnimatedStat value={stat.value} start={statsVisible} />
                  </dd>
                  <dt className="text-[9px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)] mt-1">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Portrait collage — three frames with independent parallax so they
              shift at different rates as the user scrolls (front fastest). */}
          <div className="lg:col-span-5 relative h-[420px] sm:h-[520px] lg:h-[600px] hidden md:block">
            {profile.heroCollage[0] && (
              <div
                style={{ transform: `translate3d(0, ${collageOffsetA}px, 0) rotate(-3deg)` }}
                className="absolute top-0 right-12 w-[55%] aspect-[3/4] rounded-sm overflow-hidden shadow-xl z-10 will-change-transform"
              >
                <img src={profile.heroCollage[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
            {profile.heroCollage[1] && (
              <div
                style={{ transform: `translate3d(0, ${collageOffsetB}px, 0) rotate(2deg)` }}
                className="absolute top-32 left-0 w-[50%] aspect-[3/4] rounded-sm overflow-hidden shadow-2xl z-20 will-change-transform"
              >
                <img src={profile.heroCollage[1]} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
            {profile.heroCollage[2] && (
              <div
                style={{ transform: `translate3d(0, ${collageOffsetC}px, 0) rotate(-1deg)` }}
                className="absolute bottom-0 right-0 w-[45%] aspect-[3/4] rounded-sm overflow-hidden shadow-xl z-10 will-change-transform"
              >
                <img src={profile.heroCollage[2]} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
            {/* Decorative tag */}
            <div className="absolute bottom-2 left-4 z-30 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[9px] font-black uppercase tracking-[0.4em] shadow-lg">
              Helisma · 2018 — 2026
            </div>
          </div>

          {/* Mobile portrait — single image strip */}
          {profile.heroCollage[0] && (
            <div className="md:hidden relative aspect-[16/10] -mx-6 overflow-hidden">
              <img src={profile.heroCollage[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/40 to-transparent" />
            </div>
          )}
        </div>
      </header>

      {/* Sticky sub-navigation — TOC with section numbers */}
      <nav className="sticky top-20 z-30 bg-[color:var(--retro-bg-primary)]/90 backdrop-blur-md border-y border-[color:var(--retro-brown-dark)]/10">
        <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 overflow-x-auto">
          <ul className="flex items-center gap-1 py-3 min-w-max">
            <li className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] pr-3 hidden md:block">
              Table of Contents
            </li>
            {ELI_PROFILE_SECTIONS.map((section, idx) => {
              const isActive = activeSection === section.id;
              return (
                <li key={section.id}>
                  <Link
                    to={`#${section.id}`}
                    className={`
                      inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.22em] transition-all
                      ${
                        isActive
                          ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-md'
                          : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/5'
                      }
                    `}
                  >
                    <span
                      className={`text-[9px] font-black ${
                        isActive ? 'text-[color:var(--retro-cream)]/70' : 'text-[color:var(--retro-burgundy)]/60'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <i className={`${section.icon} text-base`} />
                    <span>{section.label}</span>
                  </Link>
                </li>
              );
            })}
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
    case 'fight':
      return <FightSection />;
    case 'discography':
      return <DiscographySection />;
    case 'theater':
      return <TheaterSection />;
    case 'trivia':
      return <TriviaSection />;
    default:
      return <SectionPlaceholder section={section} />;
  }
};

const SectionOpener = ({ id, title, lead, kicker }) => {
  const idx = ELI_PROFILE_SECTIONS.findIndex((s) => s.id === id);
  const eyebrow = ELI_PROFILE_SECTIONS[idx]?.label || '';
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.2, rootMargin: '-50px' });
  return (
    <header ref={elementRef} className="relative mb-12 md:mb-16 overflow-hidden">
      {/* Decorative wordmark watermark — fills the empty right side of the
          opener on lg+ where title/lead are constrained to max-w-3xl/2xl.
          Mask-image lets us tint the white asset to faded burgundy. */}
      <div
        aria-hidden="true"
        className={`absolute right-0 top-0 bottom-0 w-2/5 hidden lg:block pointer-events-none transition-opacity duration-1000 ${
          isVisible ? 'opacity-[0.07]' : 'opacity-0'
        }`}
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

      <div className="relative flex items-baseline gap-4 mb-5">
        <span
          className={`font-header text-5xl md:text-7xl font-black text-[color:var(--retro-burgundy)]/15 tracking-tighter leading-none select-none transition-all duration-1000 ease-out origin-left ${
            isVisible ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-50 -translate-x-6'
          }`}
        >
          {String(idx + 1).padStart(2, '0')}
        </span>
        <span
          style={{ transitionDelay: '120ms' }}
          className={`text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
          }`}
        >
          {eyebrow}
        </span>
        {kicker && (
          <span
            style={{ transitionDelay: '300ms' }}
            className={`ml-auto text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:inline-block transition-all duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'
            }`}
          >
            {kicker}
          </span>
        )}
      </div>
      <h2
        style={{ transitionDelay: '160ms' }}
        className={`relative font-header text-4xl md:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-3xl transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {title}
      </h2>
      {lead && (
        <p
          style={{ transitionDelay: '260ms' }}
          className={`relative mt-5 text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {lead}
        </p>
      )}
      <div
        className={`relative mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy)]/40 via-[color:var(--retro-brown-dark)]/10 to-transparent transition-all duration-[1200ms] ease-out origin-left ${
          isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
        }`}
        style={{ transitionDelay: '400ms' }}
      />
    </header>
  );
};

const TimelineSection = () => {
  const formatYear = (iso) => new Date(iso).getFullYear();
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-50px' });
  return (
    <>
      <SectionOpener
        id="timeline"
        title="Dari Gen 7 ke Team Dream."
        lead="Linimasa milestone Eli sejak audisi 2018 hingga penempatan di Team Dream dalam format kompetisi JKT48 Fight 2026."
        kicker={`${ELI_TIMELINE.length} milestones`}
      />

      <ol ref={elementRef} className="space-y-8 md:space-y-0">
        {ELI_TIMELINE.map((event, idx) => {
          const isLast = idx === ELI_TIMELINE.length - 1;
          return (
            <li
              key={event.id}
              style={staggerStyle(idx)}
              className={`grid grid-cols-[80px_1fr] md:grid-cols-[200px_24px_1fr] gap-4 md:gap-0 relative pb-8 md:pb-12 ${staggerClass(isVisible)}`}
            >
              {/* Year column */}
              <div className="md:pr-8 md:text-right md:pt-1">
                <p className="font-header text-3xl md:text-5xl lg:text-6xl font-black text-[color:var(--retro-burgundy)] leading-none tracking-tighter">
                  {formatYear(event.date)}
                </p>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-2">
                  {event.period}
                </p>
              </div>

              {/* Center rail (desktop only) */}
              <div className="hidden md:flex justify-center relative">
                <span className="absolute top-3 w-3 h-3 rounded-full bg-[color:var(--retro-burgundy)] ring-4 ring-[color:var(--retro-bg-primary)] z-10" />
                {!isLast && (
                  <span className="absolute top-3 bottom-[-3rem] w-px bg-[color:var(--retro-burgundy)]/20" />
                )}
              </div>

              {/* Content card */}
              <div className="md:pl-8">
                {event.badge && (
                  <span className="inline-block px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] text-[9px] font-black uppercase tracking-[0.3em] mb-3">
                    {event.badge}
                  </span>
                )}
                <h3 className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-text-primary)] leading-tight mb-2">
                  {event.title}
                </h3>
                <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-xl">
                  {event.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
};

const FightSection = () => {
  const { tagline, anniversary, effective, format, team, rivals } = ELI_FIGHT_2026;
  const { elementRef: rosterRef, isVisible: rosterVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-40px' });
  return (
    <>
      <SectionOpener
        id="fight"
        title={`Team Dream — “${tagline}”`}
        lead={format}
        kicker={`${team.members.length} member · effective ${effective}`}
      />

      {/* Hero card — team summary */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)] p-8 md:p-12 mb-10">
        <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-3">
              Format Tahun 2026
            </p>
            <h3 className="font-header text-4xl md:text-6xl font-black leading-[0.95] tracking-tighter mb-4">
              {team.name}.
            </h3>
            <p className="text-base md:text-lg text-[color:var(--retro-cream)]/75 leading-relaxed max-w-2xl">
              Eli ditempatkan di {team.name} bersama {team.members.length - 1} member lain. Tim ini diumumkan saat {anniversary} dan resmi berlaku per {effective}.
            </p>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-[color:var(--retro-cream)]/5 border border-[color:var(--retro-cream)]/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] mb-2">
                Captain
              </p>
              <p className="font-header text-2xl font-black leading-tight mb-1">{team.captain}</p>
              <p className="text-xs text-[color:var(--retro-cream)]/60 leading-relaxed">{team.captainNote}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--retro-cream)]/5 border border-[color:var(--retro-cream)]/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] mb-2">
                Total Member
              </p>
              <p className="font-header text-2xl font-black leading-tight">
                {team.members.length} <span className="text-sm text-[color:var(--retro-cream)]/60 font-bold">members</span>
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Roster */}
      <div className="mb-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-4">
          Roster Team Dream
        </h3>
        <div ref={rosterRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {team.members.map((member, idx) => {
            const isCaptain = member === team.captain;
            const isEli = member === 'Eli';
            return (
              <div
                key={member}
                style={staggerStyle(idx, 0)}
                className={`relative p-4 rounded-xl border text-center ${
                  isEli
                    ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)] shadow-lg shadow-[color:var(--retro-burgundy)]/30'
                    : isCaptain
                    ? 'bg-[color:var(--retro-gold-light)]/15 border-[color:var(--retro-gold)]/40 text-[color:var(--retro-text-primary)]'
                    : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/40'
                } ${staggerClass(rosterVisible)}`}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <p className="font-bold text-sm leading-tight">{member}</p>
                {isCaptain && (
                  <span className="mt-2 inline-block text-[8px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                    Captain
                  </span>
                )}
                {isEli && (
                  <span className="mt-2 inline-block text-[8px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/80">
                    Eli — focus
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rival teams */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-4">
          Tim Rival
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {rivals.map((rival) => (
            <div
              key={rival.name}
              className="p-5 rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-bg-primary)]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-2">
                Rival
              </p>
              <p className="font-header text-2xl font-black text-[color:var(--retro-text-primary)] tracking-tight mb-1">
                {rival.name}
              </p>
              <p className="text-sm text-[color:var(--color-text-secondary)]">{rival.note}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const DiscographySection = () => {
  const confirmed = ELI_DISCOGRAPHY.filter((entry) => !entry.placeholder);
  const placeholders = ELI_DISCOGRAPHY.filter((entry) => entry.placeholder);
  const totalAlbumTracks = ELI_ALBUMS.reduce((sum, album) => sum + album.tracks.length, 0);
  const { elementRef: singlesRef, isVisible: singlesVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-40px' });
  const { elementRef: albumsRef, isVisible: albumsVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-40px' });
  // Only one roster open at a time. null = all closed.
  const [openSingleKey, setOpenSingleKey] = useState(null);
  const toggleSingle = (key) =>
    setOpenSingleKey((prev) => (prev === key ? null : key));
  return (
    <>
      <SectionOpener
        id="discography"
        title="Single, Album, & Momen Senbatsu."
        lead="Single JKT48 yang melibatkan Eli plus track-nya di album JKT48. Single masih dalam kurasi; album sudah lengkap berdasarkan participation list."
        kicker={`${confirmed.length} single · ${ELI_ALBUMS.length} album · ${totalAlbumTracks} track`}
      />

      {/* SINGLES */}
      <div ref={singlesRef} className="space-y-4 mb-12">
        <div className="flex items-baseline gap-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
            Singles
          </p>
          <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
        </div>

        {confirmed.map((entry, idx) => {
          const key = `${entry.title}-${entry.year}`;
          const hasRoster = Boolean(entry.members);
          const isOpen = openSingleKey === key;
          return (
            <article
              key={key}
              style={staggerStyle(idx)}
              className={`relative rounded-2xl border p-5 md:p-6 ${
                entry.highlight
                  ? 'bg-[color:var(--retro-burgundy)]/5 border-[color:var(--retro-burgundy)]/30'
                  : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/15'
              } ${staggerClass(singlesVisible)}`}
            >
              {entry.highlight && (
                <span className="absolute -top-2 left-6 px-2.5 py-0.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[9px] font-black uppercase tracking-[0.3em]">
                  First Senbatsu
                </span>
              )}
              <div className="grid md:grid-cols-[120px_1fr_auto] gap-4 md:gap-6 items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
                    {entry.type}
                  </p>
                  <p className="font-header text-2xl font-black text-[color:var(--retro-burgundy)] tracking-tight">
                    {entry.year}
                  </p>
                </div>
                <div className="min-w-0">
                  <h3 className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-text-primary)] leading-tight">
                    {entry.title}
                  </h3>
                  {entry.note && (
                    <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                      {entry.note}
                    </p>
                  )}
                </div>
                <div className="md:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-1">
                    Posisi
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] text-xs font-bold uppercase tracking-widest">
                    {entry.position}
                  </span>
                </div>
              </div>
              {hasRoster && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleSingle(key)}
                    aria-expanded={isOpen}
                    aria-controls={`roster-${key}`}
                    className="mt-4 w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[color:var(--retro-burgundy)]/[0.06] hover:bg-[color:var(--retro-burgundy)]/15 border border-[color:var(--retro-burgundy)]/20 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)]/60"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                      {isOpen ? `Tutup ${entry.rosterLabel}` : `Lihat ${entry.rosterLabel}`}
                      <span className="ml-2 text-[color:var(--color-text-muted)]">
                        · {entry.members.length} member
                      </span>
                    </span>
                    <i
                      className={`ri-arrow-down-s-line text-xl text-[color:var(--retro-burgundy)] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div id={`roster-${key}`}>
                      <MemberRoster members={entry.members} label={entry.rosterLabel} />
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}

        {placeholders.length > 0 && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-burgundy)]/[0.02] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] flex items-center justify-center flex-shrink-0">
                <i className="ri-book-open-line text-2xl" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-1">
                  Data Single Sedang Dikurasi
                </p>
                <p className="font-bold text-[color:var(--retro-text-primary)] mb-1">
                  Single JKT48 lainnya yang melibatkan Eli akan ditambah secara bertahap.
                </p>
                <p className="text-sm text-[color:var(--color-text-secondary)]">
                  {placeholders.map((p) => p.year).join(' · ')} — entri akan dilengkapi setelah posisi per single terverifikasi.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ALBUMS */}
      <div ref={albumsRef}>
        <div className="flex items-baseline gap-3 mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
            Album Participations
          </p>
          <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
            {totalAlbumTracks} tracks
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {ELI_ALBUMS.map((album, idx) => (
            <article
              key={album.title}
              style={staggerStyle(idx, 100)}
              className={`group relative rounded-2xl border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-bg-primary)] p-6 hover:border-[color:var(--retro-burgundy)]/40 flex flex-col ${staggerClass(albumsVisible)}`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] text-[9px] font-black uppercase tracking-[0.3em]">
                  Album Participation
                </span>
                {album.year && (
                  <span className="font-header text-xl font-black text-[color:var(--retro-burgundy)]">
                    {album.year}
                  </span>
                )}
              </div>
              <h3 className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-text-primary)] leading-tight tracking-tight mb-1">
                {album.title}
              </h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-4">
                {album.tracks.length} track{album.tracks.length === 1 ? '' : 's'} dengan Eli
              </p>
              <ul className="space-y-2 mt-auto pt-4 border-t border-[color:var(--retro-brown-dark)]/10">
                {album.tracks.map((track, idx) => (
                  <li
                    key={track.song}
                    className="flex items-baseline gap-3 text-sm font-bold text-[color:var(--retro-text-primary)] leading-snug"
                  >
                    <span className="flex-shrink-0 text-[10px] font-black text-[color:var(--retro-burgundy)]/60 tracking-widest pt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span>{track.song}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </>
  );
};

const MemberRoster = ({ members, label = 'Roster' }) => {
  const eli = members.find((m) => m.isEli);
  const fmt = (n) => n.toLocaleString('id-ID');
  return (
    <div className="mt-5 pt-5 border-t border-[color:var(--retro-brown-dark)]/10">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
          {label} ({members.length} member)
        </p>
        {eli && (
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)]">
            Eli #{eli.rank} · {fmt(eli.votes)} votes · {eli.status}
          </p>
        )}
      </div>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {members.map((m) => (
          <li
            key={m.name}
            className={`flex items-center gap-3 p-2.5 rounded-lg border ${
              m.isEli
                ? 'bg-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] shadow-md shadow-[color:var(--retro-burgundy)]/20'
                : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/10'
            }`}
          >
            <span
              className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black tabular-nums ${
                m.isEli
                  ? 'bg-[color:var(--retro-cream)]/20 text-[color:var(--retro-cream)]'
                  : 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]'
              }`}
            >
              {String(m.rank).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold leading-tight truncate ${m.isEli ? '' : 'text-[color:var(--retro-text-primary)]'}`}>
                {m.name}
              </p>
              <p className={`text-[9px] font-black uppercase tracking-[0.25em] mt-0.5 ${
                m.isEli ? 'text-[color:var(--retro-cream)]/70' : 'text-[color:var(--color-text-muted)]'
              }`}>
                {m.group} · {fmt(m.votes)}
                {m.position ? ` · ${m.position}` : ''}
              </p>
            </div>
            <span
              className={`flex-shrink-0 text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded ${
                m.status === 'NEW'
                  ? m.isEli
                    ? 'bg-[color:var(--retro-cream)]/15 text-[color:var(--retro-cream)]'
                    : 'bg-[color:var(--retro-gold-light)]/30 text-[color:var(--retro-burgundy)]'
                  : m.isEli
                    ? 'bg-[color:var(--retro-cream)]/15 text-[color:var(--retro-cream)]'
                    : 'bg-[color:var(--retro-brown-dark)]/10 text-[color:var(--color-text-muted)]'
              }`}
            >
              {m.status}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

const TheaterSection = () => {
  const formatDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  };
  const { elementRef: gridRef, isVisible: gridVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-40px' });

  // Spotlight defaults to the debut entry. Clicking a card in "Setlist Lainnya"
  // sets activeCode to swap that entry into the spotlight; clicking the same
  // card again toggles activeCode back to null and the debut returns.
  const debutEntry = ELI_THEATER.find((entry) => entry.isDebut) || ELI_THEATER[0];
  const [activeCode, setActiveCode] = useState(null);
  const feature =
    (activeCode && ELI_THEATER.find((e) => e.code === activeCode)) || debutEntry;
  const isDebutFeature = feature.code === debutEntry.code;
  const handleSelectCard = (code) => {
    setActiveCode((prev) => (prev === code ? null : code));
  };

  const debut = formatDate(feature.debutDate);

  return (
    <>
      <SectionOpener
        id="theater"
        title="Panggung yang Pernah Dinaiki."
        lead="Setlist teater JKT48 yang pernah dibawakan Eli sepanjang kariernya, beserta unit songs dan tim yang membawakannya."
        kicker={`${ELI_THEATER.length} setlists tracked`}
      />

      {/* Spotlight — defaults to Stage Debut, swapped by clicking another card */}
      <article
        key={feature.code}
        className="relative rounded-[2rem] overflow-hidden bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)] p-8 md:p-12 mb-6 md:mb-8 transition-opacity duration-300"
      >
        <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
        <div className="relative grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-[color:var(--retro-gold-light)]/20 text-[color:var(--retro-gold-light)] text-[9px] font-black uppercase tracking-[0.4em]">
                {isDebutFeature ? 'Stage Debut' : 'Setlist'}
              </span>
              {feature.status === 'active' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.4em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Sedang Aktif
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
                {feature.team}
              </span>
              {!isDebutFeature && (
                <button
                  type="button"
                  onClick={() => setActiveCode(null)}
                  className="ml-auto inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70 hover:text-[color:var(--retro-cream)] transition-colors"
                >
                  <i className="ri-arrow-go-back-line" />
                  Kembali ke Stage Debut
                </button>
              )}
            </div>
            <h3 className="font-header text-3xl md:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tighter mb-4">
              {feature.setlist}
            </h3>
            {feature.note && (
              <p className="text-base text-[color:var(--retro-cream)]/75 leading-relaxed max-w-xl">
                {feature.note}
              </p>
            )}
            {feature.units.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[color:var(--retro-cream)]/10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] mb-3">
                  Unit Songs Eli
                </p>
                <ul className="space-y-2">
                  {feature.units.map((unit) => (
                    <li
                      key={unit.song}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
                    >
                      <span className="flex items-center gap-2 font-bold">
                        <i className="ri-music-fill text-[color:var(--retro-gold-light)]" />
                        {unit.song}
                      </span>
                      {unit.note && (
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/50">
                          {unit.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <aside className="space-y-3">
            {debut && (
              <div className="rounded-2xl bg-[color:var(--retro-cream)]/5 border border-[color:var(--retro-cream)]/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] mb-2">
                  Tanggal Debut
                </p>
                <p className="font-header text-xl font-black leading-tight">{debut}</p>
              </div>
            )}
            <div className="rounded-2xl bg-[color:var(--retro-cream)]/5 border border-[color:var(--retro-cream)]/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] mb-2">
                Status
              </p>
              <p className="font-header text-xl font-black leading-tight">
                {isDebutFeature
                  ? 'Setlist Pertama'
                  : feature.status === 'active'
                  ? 'Sedang Aktif'
                  : 'Setlist Berakhir'}
              </p>
              <p className="text-xs text-[color:var(--retro-cream)]/60 mt-1">
                {isDebutFeature
                  ? 'Titik nol panggung Eli di JKT48.'
                  : feature.status === 'active'
                  ? 'Setlist yang sedang dibawakan Eli saat ini.'
                  : 'Setlist sudah selesai berjalan.'}
              </p>
            </div>
            <div className="rounded-2xl bg-[color:var(--retro-cream)]/5 border border-[color:var(--retro-cream)]/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] mb-2">
                Total Setlist
              </p>
              <p className="font-header text-xl font-black leading-tight">
                {ELI_THEATER.length} <span className="text-sm text-[color:var(--retro-cream)]/60 font-bold">stages</span>
              </p>
            </div>
          </aside>
        </div>
      </article>

      <RemainingTheaters
        formatDate={formatDate}
        gridRef={gridRef}
        gridVisible={gridVisible}
        activeCode={activeCode}
        onSelect={handleSelectCard}
      />
    </>
  );
};

// Renders the non-debut setlists as a responsive grid. Click a card to
// swap its detail into the spotlight at the top of TheaterSection.
const RemainingTheaters = ({ formatDate, gridRef, gridVisible, activeCode, onSelect }) => {
  const remaining = ELI_THEATER;

  return (
    <>
      <div className="flex items-baseline justify-between mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
          Daftar Setlist
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
          Klik kartu · tampil di spotlight
        </p>
      </div>
      <div
        ref={gridRef}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
      >
        {remaining.map((entry, idx) => (
          <div
            key={entry.code}
            style={staggerStyle(idx)}
            className={staggerClass(gridVisible)}
          >
            <TheaterCard
              entry={entry}
              formatDate={formatDate}
              isActive={activeCode === entry.code}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </>
  );
};

const TheaterCard = ({ entry, formatDate, isActive = false, onSelect }) => {
  const debut = formatDate(entry.debutDate);
  const interactive = typeof onSelect === 'function';
  const handleClick = () => {
    if (!interactive) return;
    onSelect(entry.code);
  };
  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-pressed={interactive ? isActive : undefined}
      className={`group relative rounded-2xl border p-6 transition-all h-full ${
        isActive
          ? 'bg-[color:var(--retro-burgundy)]/10 border-[color:var(--retro-burgundy)] shadow-md shadow-[color:var(--retro-burgundy)]/15'
          : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40'
      } ${interactive ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)]/60' : ''}`}
    >
      {isActive && (
        <span className="absolute -top-2 left-6 px-2.5 py-0.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[9px] font-black uppercase tracking-[0.3em]">
          On Spotlight
        </span>
      )}
      {entry.status === 'active' && (
        <span className="absolute -top-2 right-6 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.3em] shadow-md shadow-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Aktif
        </span>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
          {entry.team}
        </span>
        {debut && (
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] text-right">
            Debut · {debut}
          </span>
        )}
      </div>
      <h3 className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-text-primary)] leading-tight tracking-tight">
        {entry.setlist}
      </h3>
      {entry.note && (
        <p className="mt-2 text-sm text-[color:var(--color-text-secondary)] leading-snug">
          {entry.note}
        </p>
      )}
      {entry.units.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[color:var(--retro-brown-dark)]/10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-3">
            Unit Songs Eli
          </p>
          <ul className="space-y-2">
            {entry.units.map((unit) => (
              <li
                key={unit.song}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
              >
                <span className="flex items-center gap-2 font-bold text-[color:var(--retro-text-primary)]">
                  <i className="ri-music-fill text-[color:var(--retro-burgundy)]" />
                  {unit.song}
                </span>
                {unit.note && (
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">
                    {unit.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {interactive && (
        <p className="mt-4 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/70">
          {isActive ? 'Klik lagi · kembali ke Stage Debut' : 'Klik · tampilkan di spotlight'}
        </p>
      )}
    </article>
  );
};

const TriviaSection = () => {
  const eli = SITE_CONFIG.eli;
  // Catchphrase tile portrait — face is upper-left in the source frame, so
  // object-position is biased to keep it visible above the gradient overlay
  // both in the square (mobile) and 2:1 (lg) crops.
  const featurePhoto = '/archive/img-019.jpg';
  const { elementRef: idRef, isVisible: idVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-40px' });
  const { elementRef: funRef, isVisible: funVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-40px' });
  return (
    <>
      <SectionOpener
        id="trivia"
        title="Yang Sering Ditanyakan."
        lead="Data ringan tentang Eli yang sering muncul di kolom komentar — dari makanan favorit, hewan peliharaan, sampai keluarga roleplay Cangcorang."
        kicker={`${ELI_TRIVIA.length + ELI_FUN_FACTS.length} facts`}
      />

      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
          Identitas
        </p>
        <div ref={idRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
          {/* Feature catchphrase tile — 2x2 on lg, full-width on smaller */}
          <div
            style={staggerStyle(0)}
            className={`col-span-2 row-span-2 relative aspect-square lg:aspect-auto rounded-2xl overflow-hidden bg-[color:var(--retro-brown-dark)] group ${staggerClass(idVisible)}`}
          >
            <img
              src={featurePhoto}
              alt={eli.stageName || 'Eli'}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-[35%_25%] transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)] via-[color:var(--retro-brown-dark)]/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 text-[color:var(--retro-cream)]">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-3">
                Catchphrase Eli
              </p>
              <i className="ri-double-quotes-l text-2xl text-[color:var(--retro-gold-light)] mb-1" />
              <p className="font-header text-sm md:text-base italic leading-snug">
                {eli.catchphrase}
              </p>
            </div>
          </div>
          {ELI_TRIVIA.map((fact, idx) => (
            <div
              key={fact.label}
              style={staggerStyle(idx + 1, 80)}
              className={staggerClass(idVisible)}
            >
              <TriviaCard fact={fact} />
            </div>
          ))}
        </div>
      </div>

      {ELI_TAGLINES.length > 0 && (
        <div className="space-y-4 mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
              Tagline per Tahun
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
              {ELI_TAGLINES.length} tag
            </p>
          </div>
          <ol className="flex flex-wrap gap-3">
            {ELI_TAGLINES.map((item, idx) => (
              <li
                key={item.year}
                style={staggerStyle(idx)}
                className="px-5 py-3 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-bg-primary)] hover:border-[color:var(--retro-burgundy)]/40 transition-colors"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-0.5 tabular-nums">
                  {item.year}
                </p>
                <p className="font-header text-xl md:text-2xl font-black text-[color:var(--retro-burgundy)] tracking-tight leading-tight">
                  {item.tag}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="space-y-4 mt-10">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
          Yang Disukai
        </p>
        <div ref={funRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {ELI_FUN_FACTS.map((fact, idx) => (
            <div
              key={fact.label}
              style={staggerStyle(idx)}
              className={staggerClass(funVisible)}
            >
              <TriviaCard fact={fact} accent />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

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
