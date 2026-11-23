/**
 * Rekap 2026 — year-in-review scroll story for Eli JKT48.
 *
 * Every number on this page is counted from the archive's own data:
 * the manual theater show log (/data/eli-show-log.json) and the gallery
 * (useGallery). Sections without data are omitted, never filled in.
 * Logic lives in lib/rekap.js; this file is layout only.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEliNotes } from '../hooks/useEliNotes';
import { MOODS, notesRecap } from '../lib/eliNotes';
import { NoteCard } from '../components/EliNoteCard';
import { useLiveRecaps } from '../hooks/useLiveRecaps';
import { fmtDuration, yearTotals } from '../lib/liveRecaps';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { useGallery } from '../context';
import {
  MONTHS_ID,
  MONTHS_ID_SHORT,
  buildPhotoRecap,
  buildShowRecap,
  formatDateId,
  rekapShareText,
} from '../lib/rekap';

const YEAR = 2026;
const PAGE_URL = 'https://armeniaca.online/rekap-2026';
const HERO_FALLBACK = '/archive/img-036.webp';

const fmt = (n) => n.toLocaleString('id-ID');

/* ── small building blocks ─────────────────────────────────────────── */

const Kicker = ({ icon, children }) => (
  <div className="flex items-center gap-3 mb-2 text-[color:var(--retro-burgundy)]">
    <span className="text-[10px] font-black uppercase tracking-[0.35em] inline-flex items-center gap-2">
      {icon && <i className={`${icon} text-sm`} aria-hidden="true" />}
      {children}
    </span>
    <span aria-hidden="true" className="flex-1 h-px bg-[color:var(--retro-burgundy)]/30 max-w-[120px]" />
  </div>
);

const Section = ({ id, icon, kicker, title, lead, children }) => (
  <section aria-labelledby={id} className="py-10 sm:py-14 border-t border-[color:var(--retro-brown-dark)]/15">
    <Kicker icon={icon}>{kicker}</Kicker>
    <h2 id={id} className="font-header text-2xl sm:text-4xl font-black tracking-tight text-[color:var(--retro-text-primary)] leading-tight">
      {title}
    </h2>
    {lead && <p className="mt-2 text-sm sm:text-base text-[color:var(--retro-text-secondary)] max-w-2xl">{lead}</p>}
    <div className="mt-6">{children}</div>
  </section>
);

const BigNumber = ({ value, label, sub }) => (
  <div className="rounded-2xl bg-white/60 border border-[color:var(--retro-brown-dark)]/15 px-4 py-5 sm:px-6 sm:py-6">
    <dt className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)]">{label}</dt>
    <dd className="mt-1">
      <span className="font-header text-5xl sm:text-6xl font-black tabular-nums text-[color:var(--retro-burgundy)] leading-none">
        {fmt(value)}
      </span>
      {sub && <span className="block mt-2 text-xs sm:text-sm text-[color:var(--retro-text-secondary)]">{sub}</span>}
    </dd>
  </div>
);

const ShareButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Rekap ${YEAR} · Eli JKT48`, text, url: PAGE_URL });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked: nothing sensible to do silently.
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] px-4 py-2 text-sm font-bold shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--retro-gold)]"
    >
      <i className={copied ? 'ri-check-line' : 'ri-share-forward-line'} aria-hidden="true" />
      <span aria-live="polite">{copied ? 'Tersalin' : 'Bagikan rekap'}</span>
    </button>
  );
};

/* ── month-by-month bars ───────────────────────────────────────────── */

const Bar = ({ value, max, color, future, grown }) => (
  <div className="flex items-center gap-2 min-w-0">
    <div className="flex-1 h-2.5 rounded-full bg-[color:var(--retro-brown-dark)]/10 overflow-hidden">
      <div
        className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
        style={{ width: grown ? `${(value / max) * 100}%` : 0, background: color }}
      />
    </div>
    <span className="w-7 text-right text-xs tabular-nums font-bold text-[color:var(--retro-text-secondary)]">
      {future ? '–' : value}
    </span>
  </div>
);

const MonthBars = ({ shows, frames, lastShowMonth, lastFrameMonth }) => {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const maxShows = Math.max(1, ...shows);
  const maxFrames = Math.max(1, ...frames);

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-xs text-[color:var(--retro-text-secondary)]" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[color:var(--retro-burgundy)]" />Panggung teater</span>
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[color:var(--retro-gold)]" />Frame arsip</span>
      </div>
      <ol className="space-y-2.5">
        {MONTHS_ID.map((name, i) => {
          const showFuture = i > lastShowMonth;
          const frameFuture = i > lastFrameMonth;
          const label = `${name}: ${showFuture ? 'belum ada data show' : `${shows[i]} show`}, ${frameFuture ? 'belum ada data frame' : `${frames[i]} frame`}`;
          return (
            <li key={name} className={`grid grid-cols-[2.75rem_1fr] items-center gap-3 ${showFuture && frameFuture ? 'opacity-50' : ''}`}>
              <span className="sr-only">{label}</span>
              <span aria-hidden="true" className="text-[10px] font-black uppercase tracking-[0.15em] text-[color:var(--retro-text-muted)]">
                {MONTHS_ID_SHORT[i]}
              </span>
              <div aria-hidden="true" className="space-y-1">
                <Bar value={shows[i]} max={maxShows} color="var(--retro-burgundy)" future={showFuture} grown={grown} />
                <Bar value={frames[i]} max={maxFrames} color="var(--retro-gold)" future={frameFuture} grown={grown} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/* ── page ──────────────────────────────────────────────────────────── */

const monthOf = (iso) => (iso ? Number(iso.slice(5, 7)) - 1 : -1);

export default function Rekap2026() {
  const { images, isLoading: galleryLoading } = useGallery();
  const [showLog, setShowLog] = useState(null);
  const [logError, setLogError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-show-log.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((doc) => { if (!cancelled) setShowLog(doc); })
      .catch(() => { if (!cancelled) setLogError(true); });
    return () => { cancelled = true; };
  }, []);

  const shows = useMemo(() => (showLog ? buildShowRecap(showLog, YEAR) : null), [showLog]);
  const photos = useMemo(() => buildPhotoRecap(images, YEAR), [images]);
  const { notes } = useEliNotes();
  const liveRecap = useMemo(() => notesRecap(notes, YEAR), [notes]);
  const { recaps } = useLiveRecaps();
  const liveYear = useMemo(() => yearTotals(recaps, YEAR), [recaps]);
  const shareText = useMemo(() => rekapShareText(shows, photos, PAGE_URL), [shows, photos]);

  const asOfLabel = shows?.asOfDate ? formatDateId(shows.asOfDate) : null;
  const heroImage = photos.favorites[0]?.src || HERO_FALLBACK;
  const loading = (!showLog && !logError) || galleryLoading;

  const hasPerformance = shows && (shows.unitSongs.length > 0 || shows.positions.length > 0);
  const timeline = shows
    ? [
        shows.first && { key: 'first', icon: 'ri-play-circle-line', title: 'Panggung pertama 2026', ...shows.first },
        ...shows.milestones.map((m) => ({
          key: `m${m.no}`,
          icon: 'ri-award-line',
          title: `Show ke-${m.no}`,
          highlight: true,
          ...m,
        })),
        shows.last && shows.last.no !== shows.first?.no && {
          key: 'last',
          icon: 'ri-map-pin-time-line',
          title: `Terakhir tercatat (per ${asOfLabel})`,
          ...shows.last,
        },
      ].filter(Boolean)
    : [];

  return (
    <main className="relative min-h-screen bg-[color:var(--retro-bg-primary)] pb-16">
      <Seo
        path="/rekap-2026"
        title="Rekap 2026"
        description="Rekap 2026 Eli JKT48 dari arsip Armeniaca: panggung teater, setlist, unit song, momen favorit penggemar, dan foto sepanjang tahun."
      />

      {/* Hero — dark photo band so the (light-on-dark) navbar stays legible. */}
      <header className="relative overflow-hidden pt-24 sm:pt-28 pb-10 sm:pb-14 px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: '50% 25%' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(61, 52, 43, 0.9) 0%, rgba(92, 74, 58, 0.78) 55%, rgba(124, 45, 52, 0.7) 100%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2 text-[color:var(--retro-gold-light)]">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] inline-flex items-center gap-2">
              <i className="ri-calendar-2-line text-base" aria-hidden="true" />
              Rekap Tahunan
            </span>
            <span aria-hidden="true" className="flex-1 h-px bg-[color:var(--retro-gold-light)]/50 max-w-[120px]" />
          </div>
          <h1 className="font-header text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.05] drop-shadow-[0_2px_14px_rgba(0,0,0,0.35)]">
            Rekap 2026
            <span className="block text-2xl sm:text-4xl text-[color:var(--retro-cream)]/90">Eli JKT48</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[color:var(--retro-cream)]/85 max-w-xl">
            Setahun panggung, setlist, dan frame yang dirawat penggemar. Bukan sekadar angka, tapi cara Eli membawakan setiap malamnya.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ShareButton text={shareText} />
            {asOfLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--retro-cream)]/40 px-3 py-1.5 text-xs text-[color:var(--retro-cream)]">
                <i className="ri-time-line" aria-hidden="true" />
                Data hingga {asOfLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {loading && (
          <p className="py-16 text-center text-sm text-[color:var(--retro-text-muted)]" role="status">
            Membuka arsip 2026…
          </p>
        )}

        {!loading && (
          <>
            {/* Big numbers */}
            <section aria-label="Angka 2026" className="py-10 sm:py-12">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {shows && (
                  <BigNumber
                    value={shows.count}
                    label="Panggung teater 2026"
                    sub={shows.first && shows.last ? `Show ke-${shows.first.no} sampai ke-${shows.last.no}` : null}
                  />
                )}
                <BigNumber
                  value={photos.count}
                  label="Frame arsip 2026"
                  sub={photos.eventCount ? `dari ${photos.eventCount} momen` : null}
                />
                {shows && (
                  <BigNumber
                    value={shows.setlists.length}
                    label="Setlist dibawakan"
                    sub={shows.setlists[0] ? `Paling sering: ${shows.setlists[0].setlist}` : null}
                  />
                )}
              </dl>
              {logError && (
                <p className="mt-4 text-xs text-[color:var(--retro-text-muted)]">
                  Show log belum bisa dimuat, jadi bagian panggung disembunyikan dulu.
                </p>
              )}
            </section>

            {/* Month by month */}
            {(shows?.count > 0 || photos.count > 0) && (
              <Section
                id="rekap-bulan"
                icon="ri-bar-chart-horizontal-line"
                kicker="Bulan demi bulan"
                title="Ritme setahun"
                lead={
                  photos.busiestMonth
                    ? `Arsip paling ramai di bulan ${MONTHS_ID[photos.busiestMonth.month]} dengan ${photos.busiestMonth.count} frame.`
                    : null
                }
              >
                <MonthBars
                  shows={shows?.perMonth || Array(12).fill(0)}
                  frames={photos.perMonth}
                  lastShowMonth={shows?.asOfDate ? monthOf(shows.asOfDate) : 11}
                  lastFrameMonth={photos.latestDate ? Math.max(monthOf(photos.latestDate), monthOf(shows?.asOfDate)) : 11}
                />
              </Section>
            )}

            {/* Setlists */}
            {shows?.setlists.length > 0 && (
              <Section
                id="rekap-setlist"
                icon="ri-music-2-line"
                kicker="Setlist"
                title="Panggung yang dibawakan"
                lead="Setlist yang sama dibawakan banyak member, tapi tiap member membawakannya dengan caranya sendiri."
              >
                <ol className="divide-y divide-[color:var(--retro-brown-dark)]/10">
                  {shows.setlists.map((s, i) => (
                    <li key={s.setlist} className="flex items-baseline gap-3 py-3">
                      <span className="w-6 text-xs font-bold tabular-nums text-[color:var(--retro-text-muted)]">{i + 1}</span>
                      <span className="flex-1 font-header text-lg sm:text-xl font-bold text-[color:var(--retro-text-primary)]">{s.setlist}</span>
                      <span className="text-sm tabular-nums font-bold text-[color:var(--retro-burgundy)]">
                        {s.count}<span className="ml-1 text-xs font-medium text-[color:var(--retro-text-muted)]">show</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* How Eli performs: unit songs, positions, center */}
            {hasPerformance && (
              <Section
                id="rekap-pembawaan"
                icon="ri-mic-line"
                kicker="Cara Eli membawakan"
                title="Unit song & posisi"
                lead="Dicatat dari show log: unit song, posisi, dan siapa yang berdiri di sebelahnya."
              >
                {shows.unitSongs.length > 0 && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shows.unitSongs.map((u) => (
                      <li key={u.name} className="rounded-xl bg-white/60 border border-[color:var(--retro-brown-dark)]/15 px-4 py-3">
                        <p className="font-header text-lg font-bold text-[color:var(--retro-text-primary)] leading-snug">{u.name}</p>
                        <p className="mt-0.5 text-xs text-[color:var(--retro-text-secondary)]">
                          {u.count} show · {u.setlists.join(', ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {shows.positions.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)] mb-2">Posisi tercatat</p>
                    <ul className="flex flex-wrap gap-2">
                      {shows.positions.map((p) => (
                        <li key={p.position} className="rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] px-3 py-1 text-sm font-bold">
                          {p.position} <span className="tabular-nums">×{p.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {shows.centerShows.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)] mb-2">Di posisi center</p>
                    <ul className="space-y-2">
                      {shows.centerShows.map((c) => (
                        <li key={c.no} className="text-sm text-[color:var(--retro-text-primary)]">
                          <span className="font-bold">Show ke-{c.no}</span> · {formatDateId(c.date)} · {c.setlist}
                          {c.unitSong && <> · <em>{c.unitSong}</em></>}
                          {c.partner && <span className="text-[color:var(--retro-text-secondary)]"> (bersama {c.partner})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {shows.partners.length > 0 && (
                  <p className="mt-6 text-sm text-[color:var(--retro-text-secondary)]">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)] block mb-1">Berbagi panggung unit dengan</span>
                    {shows.partners.map((p) => (p.count > 1 ? `${p.name} (${p.count}×)` : p.name)).join(', ')}
                  </p>
                )}
              </Section>
            )}

            {/* Fan favorites */}
            {photos.favorites.length > 0 && (
              <Section
                id="rekap-favorit"
                icon="ri-heart-3-line"
                kicker="Dipilih penggemar"
                title="Momen favorit penggemar"
                lead="Unggahan 2026 yang paling banyak disukai di X."
              >
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.favorites.map((f) => {
                    const external = Boolean(f.tweetUrl);
                    const inner = (
                      <>
                        <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[color:var(--retro-brown-dark)]/10">
                          <img
                            src={f.src}
                            alt={`Eli di ${f.name}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                        <p className="mt-2 text-xs sm:text-sm font-bold text-[color:var(--retro-text-primary)] leading-snug line-clamp-2">{f.name}</p>
                        <p className="text-xs text-[color:var(--retro-text-muted)]">
                          {formatDateId(f.date)} · <i className="ri-heart-fill text-[color:var(--retro-burgundy)]" aria-hidden="true" /> {fmt(f.favoriteCount)} suka
                        </p>
                      </>
                    );
                    return (
                      <li key={f.id}>
                        {external ? (
                          <a href={f.tweetUrl} target="_blank" rel="noopener noreferrer" className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--retro-gold)] rounded-xl">
                            {inner}
                          </a>
                        ) : (
                          <Link to="/gallery/2026" className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--retro-gold)] rounded-xl">
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--retro-text-muted)]">
                  <span>
                    Foto:{' '}
                    <a href="https://x.com/armeniaca15" target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--retro-text-secondary)] underline underline-offset-2">
                      @armeniaca15
                    </a>
                  </span>
                  <Link to="/gallery/2026" className="font-bold text-[color:var(--retro-burgundy)] inline-flex items-center gap-1 hover:underline">
                    Semua frame 2026 di galeri <i className="ri-arrow-right-line" aria-hidden="true" />
                  </Link>
                </div>

                {photos.topEvents.length > 0 && (
                  <div className="mt-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)] mb-2">Momen paling banyak terekam</p>
                    <ol className="divide-y divide-[color:var(--retro-brown-dark)]/10">
                      {photos.topEvents.map((e) => (
                        <li key={`${e.date}|${e.name}`} className="flex items-baseline gap-3 py-2.5">
                          <span className="flex-1 text-sm text-[color:var(--retro-text-primary)]">
                            <span className="font-bold">{e.name}</span>
                            <span className="text-xs text-[color:var(--retro-text-muted)]"> · {formatDateId(e.date)}</span>
                          </span>
                          <span className="text-sm tabular-nums font-bold text-[color:var(--retro-gold)]">
                            {e.count}<span className="ml-1 text-xs font-medium text-[color:var(--retro-text-muted)]">frame</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </Section>
            )}

            {/* From the lives (Eli Notes) */}
            {(liveRecap.count > 0 || liveYear.lives > 0) && (
              <Section
                id="rekap-live"
                icon="ri-broadcast-line"
                kicker="Dari live"
                title={liveYear.lives > 0 ? `${fmt(liveYear.lives)} live, ${fmtDuration(liveYear.minutes * 60)} bareng Eli` : `${fmt(liveRecap.count)} catatan dari ${fmt(liveRecap.lives)} live`}
                lead={liveYear.lives > 0
                  ? `${fmt(liveYear.comments)} komentar di IDN Live dan SHOWROOM sepanjang ${YEAR}${liveRecap.count ? `, dan ${fmt(liveRecap.count)} momen yang kami tulis di Eli Notes` : ''}.`
                  : 'Momen-momen kecil dari IDN Live dan SHOWROOM yang kami tulis di Eli Notes.'}
              >
                <div className="flex flex-wrap gap-2">
                  {liveRecap.moods.map(([m, n]) => (
                    <span key={m} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black text-white" style={{ background: MOODS[m]?.tone }}>
                      <i className={MOODS[m]?.icon} /> {MOODS[m]?.label} · {n}
                    </span>
                  ))}
                </div>
                {liveRecap.picks.length > 0 && (
                  <ul className="en-board mt-10">
                    {liveRecap.picks.map((n) => (
                      <li key={n.id}><NoteCard note={n} /></li>
                    ))}
                  </ul>
                )}
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                  {liveYear.lives > 0 && <Link to="/rekap-live" className="text-sm font-bold underline text-[color:var(--retro-burgundy)]">Lihat Rekap Live</Link>}
                  {liveRecap.count > 0 && <Link to="/eli-notes" className="text-sm font-bold underline text-[color:var(--retro-burgundy)]">Baca semua Eli Notes</Link>}
                </div>
              </Section>
            )}

            {/* Milestones & notes */}
            {timeline.length > 0 && (
              <Section id="rekap-tonggak" icon="ri-flag-2-line" kicker="Tonggak" title="Titik-titik penting">
                <ol className="relative border-l-2 border-[color:var(--retro-gold)]/40 ml-2 space-y-6">
                  {timeline.map((t) => (
                    <li key={t.key} className="pl-5 relative">
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-[color:var(--retro-bg-primary)] ${t.highlight ? 'bg-[color:var(--retro-burgundy)]' : 'bg-[color:var(--retro-gold)]'}`}
                      />
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)]">{formatDateId(t.date, { long: true })}</p>
                      <p className={`font-header font-black leading-tight ${t.highlight ? 'text-2xl sm:text-3xl text-[color:var(--retro-burgundy)]' : 'text-lg text-[color:var(--retro-text-primary)]'}`}>
                        {t.title}
                      </p>
                      <p className="text-sm text-[color:var(--retro-text-secondary)]">
                        Show ke-{t.no} · {t.setlist}
                      </p>
                    </li>
                  ))}
                </ol>

                {shows.notes.length > 0 && (
                  <div className="mt-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-text-muted)] mb-2">Catatan dari show log</p>
                    <ul className="space-y-1.5">
                      {shows.notes.map((n) => (
                        <li key={n.no} className="text-sm text-[color:var(--retro-text-primary)]">
                          <span className="tabular-nums text-xs text-[color:var(--retro-text-muted)]">{formatDateId(n.date)}</span>{' '}
                          <span className="font-bold">{n.note}</span>
                          <span className="text-[color:var(--retro-text-secondary)]"> · {n.setlist}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>
            )}

            {/* Closing */}
            <section aria-labelledby="rekap-penutup" className="mt-4 rounded-3xl bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)] px-5 py-8 sm:px-8 sm:py-10">
              <h2 id="rekap-penutup" className="font-header text-2xl sm:text-3xl font-black leading-tight">
                Angka hanya jalan untuk mengingat.
              </h2>
              <p className="mt-2 text-sm text-[color:var(--retro-cream)]/80 max-w-xl">
                Cerita di balik tiap panggung ada di kalian. Lanjutkan ke sini:
              </p>
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { to: '/happy-helisma-day-26', icon: 'ri-hand-heart-line', title: 'Harmoni Kebaikan', sub: 'Kilas balik ulang tahun ke-26 Eli' },
                  { to: '/cerita', icon: 'ri-quill-pen-line', title: 'Cerita Penggemar', sub: 'Momen 2026 dari sudut pandangmu' },
                  { to: '/momen', icon: 'ri-image-2-line', title: 'Album Momen', sub: 'Kumpulan momen pilihan' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="flex items-start gap-3 h-full rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--retro-gold)]"
                    >
                      <i className={`${l.icon} text-xl text-[color:var(--retro-gold-light)]`} aria-hidden="true" />
                      <span>
                        <span className="block font-bold text-sm">{l.title}</span>
                        <span className="block text-xs text-[color:var(--retro-cream)]/75">{l.sub}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ShareButton text={shareText} />
                {asOfLabel && <span className="text-xs text-[color:var(--retro-cream)]/70">Data hingga {asOfLabel}. Rekap diperbarui sampai akhir tahun.</span>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
