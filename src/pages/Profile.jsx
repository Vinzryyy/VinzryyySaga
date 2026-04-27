/**
 * Profile Page — full archive of Eli's career, discography, theater
 * setlists, JKT48 Fight 2026 placement, and trivia. Five anchored
 * sections share one page so the navbar stays compact.
 */

import React, { useEffect, useState } from 'react';
import Section from '../components/layout/Section';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';
import {
  ELI_PROFILE_SECTIONS,
  ELI_TIMELINE,
  ELI_DISCOGRAPHY,
  ELI_ALBUMS,
  ELI_THEATER,
  ELI_FIGHT_2026,
  ELI_TRIVIA,
  ELI_FUN_FACTS,
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

  return (
    <main className="bg-[color:var(--retro-bg-primary)]">
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

          {/* Portrait collage — three frames stacked + offset for depth */}
          <div className="lg:col-span-5 relative h-[420px] sm:h-[520px] lg:h-[600px] hidden md:block">
            {profile.heroCollage[0] && (
              <div className="absolute top-0 right-12 w-[55%] aspect-[3/4] rounded-sm overflow-hidden shadow-xl rotate-[-3deg] z-10">
                <img src={profile.heroCollage[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
            {profile.heroCollage[1] && (
              <div className="absolute top-32 left-0 w-[50%] aspect-[3/4] rounded-sm overflow-hidden shadow-2xl rotate-[2deg] z-20">
                <img src={profile.heroCollage[1]} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
            {profile.heroCollage[2] && (
              <div className="absolute bottom-0 right-0 w-[45%] aspect-[3/4] rounded-sm overflow-hidden shadow-xl rotate-[-1deg] z-10">
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
                  <a
                    href={`#${section.id}`}
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
                  </a>
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
  return (
    <header className="mb-12 md:mb-16">
      <div className="flex items-baseline gap-4 mb-5">
        <span className="font-header text-5xl md:text-7xl font-black text-[color:var(--retro-burgundy)]/15 tracking-tighter leading-none select-none">
          {String(idx + 1).padStart(2, '0')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
          {eyebrow}
        </span>
        {kicker && (
          <span className="ml-auto text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:inline-block">
            {kicker}
          </span>
        )}
      </div>
      <h2 className="font-header text-4xl md:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-3xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-5 text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
          {lead}
        </p>
      )}
      <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy)]/40 via-[color:var(--retro-brown-dark)]/10 to-transparent" />
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

        {confirmed.map((entry, idx) => (
          <article
            key={`${entry.title}-${entry.year}`}
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
          </article>
        ))}

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
                  Album
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

const TheaterSection = () => {
  const formatDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  };
  const { elementRef: gridRef, isVisible: gridVisible } = useScrollReveal({ threshold: 0.05, rootMargin: '-40px' });
  return (
    <>
      <SectionOpener
        id="theater"
        title="Panggung yang Pernah Dinaiki."
        lead="Setlist teater JKT48 yang pernah dibawakan Eli sepanjang kariernya, beserta unit songs dan tim yang membawakannya."
        kicker={`${ELI_THEATER.length} setlists tracked`}
      />

      {/* Debut feature card — first setlist marked isDebut gets a full-width spotlight */}
      {(() => {
        const feature = ELI_THEATER.find((entry) => entry.isDebut) || ELI_THEATER[0];
        const debut = formatDate(feature.debutDate);
        return (
          <article className="relative rounded-[2rem] overflow-hidden bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)] p-8 md:p-12 mb-6 md:mb-8">
            <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
            <div className="relative grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-[color:var(--retro-gold-light)]/20 text-[color:var(--retro-gold-light)] text-[9px] font-black uppercase tracking-[0.4em]">
                    Stage Debut
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
                    {feature.team} · {feature.code}
                  </span>
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
                  <p className="font-header text-xl font-black leading-tight">Setlist Pertama</p>
                  <p className="text-xs text-[color:var(--retro-cream)]/60 mt-1">
                    Titik nol panggung Eli di JKT48.
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
        );
      })()}

      {/* Remaining setlists — 2-col grid, each card lists every unit + note */}
      <div ref={gridRef} className="grid md:grid-cols-2 gap-4 md:gap-6">
        {ELI_THEATER.filter((entry) => !entry.isDebut).map((entry, idx) => {
          const debut = formatDate(entry.debutDate);
          return (
            <article
              key={entry.code}
              style={staggerStyle(idx)}
              className={`group relative rounded-2xl border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-bg-primary)] p-6 hover:border-[color:var(--retro-burgundy)]/40 ${staggerClass(gridVisible)}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                    {entry.code}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mt-0.5">
                    {entry.team}
                  </span>
                </div>
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
            </article>
          );
        })}
      </div>
    </>
  );
};

const TriviaSection = () => {
  const eli = SITE_CONFIG.eli;
  const profile = SITE_CONFIG.profile;
  const featurePhoto = profile.heroCollage[1] || eli.portrait;
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
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
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
