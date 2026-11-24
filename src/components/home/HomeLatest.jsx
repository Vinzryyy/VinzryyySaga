/**
 * HomeLatest — "Terbaru dari Eli": the one place on the home page that
 * changes week to week. Three cards (latest Rekap Live, latest Eli Note,
 * today's quote) and one row of shortcuts to everything else.
 *
 * Replaces the old "Terkini" shortcut cards, the separate Kata Hari Ini strip,
 * the "Saat Eli offline" link grid and the Photobox / Harmoni banners,
 * so the home page has a single set of shortcuts instead of three.
 *
 * Recaps and notes come from the shared cached hooks; until the first one
 * is published the card explains what will appear there instead of
 * hiding, so visitors learn the feature exists.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveRecaps } from '../../hooks/useLiveRecaps';
import { useEliNotes } from '../../hooks/useEliNotes';
import { useEliSchedule, pickNextEvent } from '../../hooks/useEliSchedule';
import { fmtDuration } from '../../lib/liveRecaps';
import { MOODS, PLATFORMS } from '../../lib/eliNotes';
import { getQuoteOfTheDay } from '../../lib/quoteOfTheDay';
import { JAKARTA_TZ } from '../../utils/calendar';

const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: JAKARTA_TZ });
const fmtDay = (ymd) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? ymd : dayFmt.format(d);
};

const SHORTCUTS = [
  { to: '/schedule?view=calendar', icon: 'ri-calendar-event-line', label: 'Jadwal', hint: 'nextEvent' },
  { to: '/armepack', icon: 'ri-coupon-3-line', label: 'ArmePack' },
  { to: '/mini-games', icon: 'ri-gamepad-line', label: 'Mini Games' },
  { to: '/gallery', icon: 'ri-image-2-line', label: 'Galeri' },
  { to: '/photostrip', icon: 'ri-camera-3-line', label: 'Photobox' },
  { to: '/wishes', icon: 'ri-chat-heart-line', label: 'Wishes' },
  { to: '/happy-helisma-day-26', icon: 'ri-hand-heart-line', label: 'Harmoni Kebaikan' },
];

const Card = ({ to, eyebrow, icon, children, cta, dark = false }) => (
  <Link
    to={to}
    className={`group relative flex flex-col h-full rounded-3xl border p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)] ${
      dark
        ? 'bg-[color:var(--retro-brown-dark)] border-[color:var(--retro-gold)]/20 text-[color:var(--retro-cream)]'
        : 'bg-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)]/15 hover:border-[color:var(--retro-burgundy)]/35'
    }`}
  >
    <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] ${dark ? 'text-[color:var(--retro-gold-light)]' : 'text-[color:var(--retro-burgundy)]'}`}>
      <i className={`${icon} text-sm`} /> {eyebrow}
    </span>
    <div className="mt-3 flex-1">{children}</div>
    <span className={`mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] ${dark ? 'text-[color:var(--retro-gold-light)]' : 'text-[color:var(--retro-burgundy)]'}`}>
      {cta} <i className="ri-arrow-right-line transition-transform group-hover:translate-x-1" />
    </span>
  </Link>
);

const Title = ({ children, dark }) => (
  <p className={`font-header text-xl sm:text-2xl font-black tracking-tight leading-tight ${dark ? 'text-[color:var(--retro-cream)]' : 'text-[color:var(--retro-text-primary)]'}`}>
    {children}
  </p>
);

const Muted = ({ children, dark }) => (
  <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-[color:var(--retro-cream)]/70' : 'text-[color:var(--retro-text-muted)]'}`}>{children}</p>
);

const RecapCard = ({ recap, loading }) => {
  if (!recap) {
    return (
      <Card to="/rekap-live" eyebrow="Rekap Live" icon="ri-bar-chart-2-line" cta="Lihat Rekap Live" dark>
        <Title dark>Ringkasan setiap live Eli</Title>
        <Muted dark>
          {loading ? 'Memuat…' : 'Durasi, menit paling ramai, dan kata yang paling sering muncul. Terbit sendiri setelah live Eli berikutnya.'}
        </Muted>
      </Card>
    );
  }
  const topWord = recap.chatWords?.[0]?.[0];
  return (
    <Card to={`/rekap-live/${recap.id}`} eyebrow={`Rekap Live · ${PLATFORMS[recap.platform] || recap.platform}`} icon="ri-bar-chart-2-line" cta="Baca rekapnya" dark>
      <Title dark>{fmtDay(recap.date)}</Title>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="font-header text-2xl font-black text-[color:var(--retro-gold-light)] tabular-nums">{fmtDuration(recap.durationSec)}</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/60">durasi</p>
        </div>
        <div>
          <p className="font-header text-2xl font-black text-[color:var(--retro-gold-light)] tabular-nums">{recap.comments?.toLocaleString('id-ID') ?? 0}</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/60">komentar</p>
        </div>
      </div>
      {topWord && <Muted dark>Kata paling ramai: <b className="text-[color:var(--retro-cream)]">“{topWord}”</b></Muted>}
    </Card>
  );
};

const NoteCard = ({ note, loading }) => {
  if (!note) {
    return (
      <Card to="/eli-notes" eyebrow="Eli Notes" icon="ri-sticky-note-line" cta="Buka Eli Notes">
        <Title>Catatan kecil dari setiap live</Title>
        <Muted>{loading ? 'Memuat…' : 'Momen yang bikin senyum, ditulis dengan kata-kata kami sendiri. Catatan pertama segera terbit.'}</Muted>
      </Card>
    );
  }
  const mood = MOODS[note.mood];
  return (
    <Card to={`/eli-notes/${note.id}`} eyebrow={`Eli Notes · ${mood?.label || ''}`} icon={mood?.icon || 'ri-sticky-note-line'} cta="Baca catatannya">
      {note.quote ? (
        <Title>“{note.quote}”</Title>
      ) : (
        <p className="text-sm leading-relaxed text-[color:var(--retro-text-secondary)] line-clamp-4">{note.story}</p>
      )}
      <Muted>{fmtDay(note.date)} · {PLATFORMS[note.platform]}</Muted>
    </Card>
  );
};

const useDailyQuote = () => {
  const [quote, setQuote] = useState(() => getQuoteOfTheDay());
  useEffect(() => {
    // The quote flips at WIB midnight; checking when the tab regains focus is enough.
    const refresh = () => setQuote(getQuoteOfTheDay());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  return quote;
};

const HomeLatest = () => {
  const { recaps, loading: recapsLoading } = useLiveRecaps();
  const { notes, loading: notesLoading } = useEliNotes();
  const schedule = useEliSchedule();
  const quote = useDailyQuote();
  const [now] = useState(() => Date.now());
  const nextEvent = useMemo(() => pickNextEvent(schedule, now), [schedule, now]);

  return (
    <section aria-labelledby="home-latest-title" className="px-5 sm:px-6 md:px-12 lg:px-20 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)]" />
            Terbaru
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
        </div>
        <h2 id="home-latest-title" className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-6 md:mb-8">
          Kabar kecil dari Eli
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <RecapCard recap={recaps[0]} loading={recapsLoading} />
          <NoteCard note={notes[0]} loading={notesLoading} />
          {quote && (
            <figure className="relative flex flex-col justify-center rounded-3xl border border-[#d4a574]/30 bg-[#fdf6ee] p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#9a5b4a]">
                <i className="ri-double-quotes-l text-sm" /> Kata hari ini
              </span>
              <blockquote className="mt-3 font-header italic text-lg sm:text-xl leading-snug text-[#3a2818]">“{quote}”</blockquote>
              <figcaption className="mt-3 text-xs tracking-wider text-[#9a5b4a]/70">— Armeniaca</figcaption>
            </figure>
          )}
        </div>

        <nav aria-label="Jelajahi Armeniaca" className="mt-6 -mx-5 sm:mx-0 px-5 sm:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex sm:flex-wrap gap-2 w-max sm:w-auto">
            {SHORTCUTS.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--retro-burgundy)]/15 bg-white/70 px-4 py-2 text-xs font-bold text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/40 hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] transition-colors"
                >
                  <i className={`${s.icon} text-sm`} />
                  {s.label}
                  {s.hint === 'nextEvent' && nextEvent && (
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-70">· {shortFmt.format(new Date(nextEvent.date))}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
};

export default HomeLatest;
