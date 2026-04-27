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
  ELI_DISCOGRAPHY,
  ELI_THEATER,
  ELI_FIGHT_2026,
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

  const profile = SITE_CONFIG.profile;

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

            {/* Stat strip */}
            <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
              {profile.quickStats.map((stat) => (
                <div key={stat.label} className="border-l-2 border-[color:var(--retro-burgundy)] pl-3">
                  <dd className="font-header text-2xl md:text-3xl font-black text-[color:var(--retro-text-primary)] leading-tight">
                    {stat.value}
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

const FightSection = () => {
  const { tagline, anniversary, effective, format, team, rivals } = ELI_FIGHT_2026;
  return (
    <>
      <SectionHeader
        eyebrow="JKT48 Fight 2026"
        title={`Team Dream — “${tagline}”`}
        lead={format}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {team.members.map((member, idx) => {
            const isCaptain = member === team.captain;
            const isEli = member === 'Eli';
            return (
              <div
                key={member}
                className={`relative p-4 rounded-xl border text-center transition-all ${
                  isEli
                    ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)] shadow-lg shadow-[color:var(--retro-burgundy)]/30'
                    : isCaptain
                    ? 'bg-[color:var(--retro-gold-light)]/15 border-[color:var(--retro-gold)]/40 text-[color:var(--retro-text-primary)]'
                    : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/40'
                }`}
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
  return (
    <>
      <SectionHeader
        eyebrow="Diskografi"
        title="Single, Posisi, & Momen Senbatsu."
        lead="Daftar single JKT48 yang melibatkan Eli, lengkap dengan posisinya. Masih dalam tahap kurasi — entri akan terus ditambah seiring data terverifikasi."
      />

      <div className="space-y-4">
        {confirmed.map((entry) => (
          <article
            key={`${entry.title}-${entry.year}`}
            className={`relative rounded-2xl border p-5 md:p-6 ${
              entry.highlight
                ? 'bg-[color:var(--retro-burgundy)]/5 border-[color:var(--retro-burgundy)]/30'
                : 'bg-[color:var(--retro-bg-primary)] border-[color:var(--retro-brown-dark)]/15'
            }`}
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

        {placeholders.map((entry) => (
          <div
            key={entry.title}
            className="rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 p-5 md:p-6 text-center"
          >
            <i className="ri-add-line text-2xl text-[color:var(--retro-burgundy)]/40 mb-2 inline-block" />
            <p className="font-bold text-[color:var(--retro-text-primary)]">{entry.title}</p>
            <p className="text-sm text-[color:var(--color-text-muted)] mt-1">{entry.note}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mt-2">
              {entry.year}
            </p>
          </div>
        ))}
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
  return (
    <>
      <SectionHeader
        eyebrow="Theater Setlist Tracker"
        title="Panggung yang Pernah Dinaiki."
        lead="Setlist teater JKT48 yang pernah dibawakan Eli sepanjang kariernya, beserta unit songs dan tim yang membawakannya."
      />

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {ELI_THEATER.map((entry) => {
          const debut = formatDate(entry.debutDate);
          return (
            <article
              key={entry.setlist}
              className="group relative rounded-2xl border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-bg-primary)] p-6 hover:border-[color:var(--retro-burgundy)]/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                  {entry.team}
                </span>
                {debut && (
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">
                    Debut · {debut}
                  </span>
                )}
              </div>
              <h3 className="font-header text-2xl md:text-3xl font-black text-[color:var(--retro-text-primary)] leading-tight tracking-tight">
                {entry.setlist}
              </h3>
              {entry.note && (
                <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
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
                        key={unit}
                        className="flex items-center gap-2 text-sm font-bold text-[color:var(--retro-text-primary)]"
                      >
                        <i className="ri-music-fill text-[color:var(--retro-burgundy)]" />
                        {unit}
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
