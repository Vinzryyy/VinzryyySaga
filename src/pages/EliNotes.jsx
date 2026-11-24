/**
 * Eli Notes — /eli-notes (all notes) and /eli-notes/:slug (one note).
 *
 * Written notes about moments from Eli's IDN / SHOWROOM lives: a short
 * quote, the story in our own words, the minute, and a link to where the
 * moment was posted. Text only: no live video is hosted here (see
 * src/lib/eliNotes.js). Embedded players load only after a click.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { useGallery } from '../context';
import { useEliNotes } from '../hooks/useEliNotes';
import { useLiveRecaps } from '../hooks/useLiveRecaps';
import { fmtDuration, recapForNote, weekOf } from '../lib/liveRecaps';
import { MOODS, PLATFORMS, embedOf, fmtMinute } from '../lib/eliNotes';
import { buildMoments, showsOn } from '../lib/moments';
import { NoteCard, Stamp } from '../components/EliNoteCard';

const PAGE = 18;
const COVER = '/archive/img-211.webp';
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const prettyDate = (iso) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

let showLogPromise = null;
const loadShowLog = () => {
  if (!showLogPromise) {
    showLogPromise = fetch('/data/eli-show-log.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return showLogPromise;
};

const Band = ({ eyebrow, title, children }) => (
  <header className="relative overflow-hidden pt-24 sm:pt-28 pb-10 px-4 sm:px-6">
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ backgroundImage: `url(${COVER})`, backgroundSize: 'cover', backgroundPosition: '50% 30%' }}
    />
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'linear-gradient(180deg, rgba(61,52,43,0.92) 0%, rgba(92,74,58,0.82) 55%, rgba(124,45,52,0.7) 100%)' }}
    />
    <div className="relative max-w-5xl mx-auto">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 text-[color:var(--retro-gold-light)]">
        <i className="ri-quill-pen-line text-base" /> {eyebrow}
      </p>
      <h1 className="mt-2 font-header text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{title}</h1>
      {children}
    </div>
  </header>
);

const MoodChip = ({ mood }) => {
  const m = MOODS[mood];
  if (!m) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black text-white"
      style={{ background: m.tone }}
    >
      <i className={m.icon} /> {m.label}
    </span>
  );
};

const credit = (n) => `${PLATFORMS[n.platform]} · ${prettyDate(n.date)} · menit ${fmtMinute(n.at)}`;

// ── List ─────────────────────────────────────────────────────────────

const NoteList = ({ notes, loading }) => {
  const [mood, setMood] = useState('all');
  const [year, setYear] = useState('all');
  const [shown, setShown] = useState(PAGE);

  const years = useMemo(() => [...new Set(notes.map((n) => n.year))].sort().reverse(), [notes]);
  const filtered = useMemo(
    () => notes.filter((n) => (mood === 'all' || n.mood === mood) && (year === 'all' || n.year === year)),
    [notes, mood, year],
  );

  const moodCount = useMemo(() => {
    const c = {};
    for (const n of notes) c[n.mood] = (c[n.mood] || 0) + 1;
    return c;
  }, [notes]);
  const showFeatured = mood === 'all' && year === 'all' && filtered.length > 2;
  const rest = showFeatured ? filtered.slice(1) : filtered;

  return (
    <>
      <Band eyebrow="Eli Notes" title="Catatan kecil dari live Eli">
        <p className="mt-2 text-sm sm:text-base text-[color:var(--retro-cream)]/85 max-w-xl">
          Momen-momen dari live IDN dan SHOWROOM yang sayang kalau terlewat, kami tulis ulang dengan kata-kata sendiri.
          Ada kutipan singkat Eli, menit kejadiannya, dan tautan ke tempat momennya diunggah.
        </p>
        <p className="mt-3 text-xs sm:text-sm text-[color:var(--retro-cream)]/75 max-w-xl inline-flex gap-2">
          <i className="ri-lock-line mt-0.5" aria-hidden="true" />
          <span>Kalau Eli bilang “kita-kita aja yang tau ya” atau “jangan diklip”, bagian live itu tidak kami catat.</span>
        </p>
      </Band>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {notes.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Suasana">
              <button type="button" className="en-tab" aria-pressed={mood === 'all'} onClick={() => { setMood('all'); setShown(PAGE); }}>
                Semua <span className="count">{notes.length}</span>
              </button>
              {Object.entries(MOODS).filter(([key]) => moodCount[key]).map(([key, m]) => (
                <button key={key} type="button" className="en-tab" style={{ '--tab-tone': m.tone }} aria-pressed={mood === key} onClick={() => { setMood(key); setShown(PAGE); }}>
                  <i className={m.icon} /> {m.label} <span className="count">{moodCount[key]}</span>
                </button>
              ))}
            </div>
            {years.length > 1 && (
              <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Tahun">
                {['all', ...years].map((y) => (
                  <button key={y} type="button" className="en-tab" aria-pressed={year === y} onClick={() => { setYear(y); setShown(PAGE); }}>
                    {y === 'all' ? 'Semua tahun' : y}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-[color:var(--retro-text-secondary)]">Memuat catatan…</p>
        ) : notes.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-6 sm:p-8 max-w-xl">
            <p className="font-header text-xl font-black text-[color:var(--retro-text-primary)]">Buku catatannya masih kosong.</p>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--retro-text-secondary)]">
              Catatan pertama akan muncul setelah live Eli berikutnya. Sambil menunggu, intip{' '}
              <Link to="/vivo" className="font-bold underline text-[color:var(--retro-burgundy)]">arsip live di Vivo</Link> atau{' '}
              <Link to="/momen" className="font-bold underline text-[color:var(--retro-burgundy)]">Album Momen</Link>.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-sm text-[color:var(--retro-text-secondary)]">Belum ada catatan dengan suasana ini.</p>
        ) : (
          <>
            {showFeatured && (
              <div className="mt-10 max-w-3xl">
                <NoteCard note={filtered[0]} featured />
              </div>
            )}
            <ul className={`en-board ${showFeatured ? 'mt-12' : 'mt-10'}`}>
              {rest.slice(0, shown).map((n) => (
                <li key={n.id}><NoteCard note={n} /></li>
              ))}
            </ul>
          </>
        )}

        {rest.length > shown && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShown((x) => x + PAGE)}
              className="px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-wider bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)]"
            >
              Lihat lagi ({rest.length - shown})
            </button>
          </div>
        )}

        <p className="mt-10 max-w-2xl text-xs leading-relaxed text-[color:var(--retro-text-muted)]">
          Eli Notes hanya berisi tulisan. Kami tidak mengunggah ulang video atau tangkapan layar live; tautan mengarah ke unggahan aslinya.
          Nama dan komentar penonton live tidak dicantumkan.
        </p>
      </div>
    </>
  );
};

// ── Detail ───────────────────────────────────────────────────────────

/** YouTube: thumbnail until clicked, then a youtube-nocookie player. Others: an "open" button. */
const LinkBlock = ({ link }) => {
  const [playing, setPlaying] = useState(false);
  const e = embedOf(link);
  if (!e) return null;
  if (e.kind === 'youtube') {
    return playing ? (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${e.id}?autoplay=1&rel=0${e.start ? `&start=${e.start}` : ''}`}
          title="Video di YouTube"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block w-full aspect-video rounded-2xl overflow-hidden bg-black"
        aria-label="Putar video di YouTube"
      >
        <img src={`https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-[color:var(--retro-burgundy)] px-5 py-2.5 text-sm font-black text-white shadow-lg">
            <i className="ri-play-fill" /> Putar di YouTube
          </span>
        </span>
      </button>
    );
  }
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--retro-burgundy)] px-5 py-2.5 text-sm font-black text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)]"
    >
      <i className="ri-external-link-line" /> Lihat momennya di {e.name}
    </a>
  );
};

/** The live this note came from, as a small dark card: its pulse with this minute marked, and a link to the full recap. */
const RecapAside = ({ recap, at }) => {
  const minute = Math.floor(at / 60);
  const bars = recap.perMinute;
  const max = Math.max(1, ...bars);
  const here = bars[minute] ?? 0;
  return (
    <Link
      to={`/rekap-live/${recap.id}`}
      className="group block rounded-2xl bg-[#16110e] text-[#f4ece4] p-5 hover:ring-2 hover:ring-[color:var(--retro-gold)] transition"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)]">Rekap live ini</p>
      <p className="mt-2 font-header text-2xl font-black leading-tight">{fmtDuration(recap.durationSec)}</p>
      <p className="text-sm text-[#f4ece4]/65">{recap.comments.toLocaleString('id-ID')} komentar</p>
      <div className="mt-4 flex items-end gap-px h-12" aria-hidden="true">
        {bars.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: i === minute ? 'var(--retro-gold)' : 'rgba(244,236,228,0.22)' }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-[#f4ece4]/60">
        Momen ini di menit {minute + 1}: {here.toLocaleString('id-ID')} komentar{recap.peak && recap.peak.minute === minute ? ', menit paling ramai' : ''}.
      </p>
      <p className="mt-4 pt-3 border-t border-[#f4ece4]/12 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-between">
        Lihat rekapnya <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
      </p>
    </Link>
  );
};

const NoteDetail = ({ note, prev, next }) => {
  const { images } = useGallery();
  const [showLog, setShowLog] = useState(null);
  useEffect(() => {
    let alive = true;
    loadShowLog().then((d) => alive && setShowLog(d));
    return () => { alive = false; };
  }, []);
  const shows = showsOn(showLog, note.date);
  const photoMoments = useMemo(() => buildMoments(images).filter((m) => m.date === note.date), [images, note.date]);
  const { recaps } = useLiveRecaps();
  const recap = useMemo(() => recapForNote(recaps, note), [recaps, note]);

  return (
    <>
      <Band eyebrow={`Eli Notes · ${prettyDate(note.date)}`} title={note.liveTitle || `Live ${PLATFORMS[note.platform]}`}>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[color:var(--retro-cream)]/85">
          <MoodChip mood={note.mood} /> {PLATFORMS[note.platform]} · menit {fmtMinute(note.at)}
        </p>
      </Band>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link to="/eli-notes" className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)]">
          <i className="ri-arrow-left-line" /> Semua catatan
        </Link>
        <Link to={`/rekap-live/minggu/${weekOf(note.date)}`} className="mt-5 ml-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)] hover:text-[color:var(--retro-burgundy)]">
          <i className="ri-calendar-2-line" /> Minggu ini
        </Link>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_280px]">
          <div>
            <article className="en-card en-letter" style={{ '--tone': MOODS[note.mood].tone }}>
              <span className="en-tape" aria-hidden="true" />
              <Stamp platform={note.platform} />
              <span className="en-mood"><i className={MOODS[note.mood].icon} /> {MOODS[note.mood].label} · menit {fmtMinute(note.at)}</span>
              {note.quote && (
                <figure className="m-0">
                  <blockquote className="en-quote">{note.quote}</blockquote>
                  <figcaption className="mt-2 text-xs text-[color:var(--retro-text-secondary)]">— Eli, {credit(note)}</figcaption>
                </figure>
              )}
              <p className={`en-story ${note.quote ? 'mt-6' : 'no-quote'}`}>{note.story}</p>
              <p className="en-sign">— dicatat oleh Armeniaca</p>
            </article>
            {note.link && <div className="mt-8"><LinkBlock link={note.link} /></div>}
          </div>

          <div className="flex flex-col gap-4">
            {recap && <RecapAside recap={recap} at={note.at} />}
            {shows.length > 0 && (
              <aside className="rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)]">Panggung hari itu</p>
                {shows.map((s) => (
                  <div key={s.no} className="mt-3">
                    <p className="font-header text-2xl font-black">Show #{s.no}</p>
                    <p className="text-sm">{s.setlist}</p>
                  </div>
                ))}
              </aside>
            )}
            {photoMoments.length > 0 && (
              <aside className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)]">Foto hari itu</p>
                {photoMoments.map((m) => (
                  <Link key={m.slug} to={`/momen/${m.slug}`} className="mt-2 block text-sm font-bold text-[color:var(--retro-burgundy)] underline">
                    {m.name}
                  </Link>
                ))}
              </aside>
            )}
          </div>
        </div>

        <nav className="mt-10 grid grid-cols-2 gap-3" aria-label="Catatan lain">
          {next ? (
            <Link to={`/eli-notes/${next.id}`} className="rounded-2xl border border-[color:var(--retro-brown-dark)]/12 p-4 hover:border-[color:var(--retro-burgundy)]/40">
              <span className="text-xs text-[color:var(--retro-text-muted)]"><i className="ri-arrow-left-line" /> Sebelumnya</span>
              <span className="mt-1 block text-sm font-bold text-[color:var(--retro-text-primary)] line-clamp-2">{next.quote || next.liveTitle || prettyDate(next.date)}</span>
            </Link>
          ) : <span />}
          {prev ? (
            <Link to={`/eli-notes/${prev.id}`} className="rounded-2xl border border-[color:var(--retro-brown-dark)]/12 p-4 text-right hover:border-[color:var(--retro-burgundy)]/40">
              <span className="text-xs text-[color:var(--retro-text-muted)]">Sesudahnya <i className="ri-arrow-right-line" /></span>
              <span className="mt-1 block text-sm font-bold text-[color:var(--retro-text-primary)] line-clamp-2">{prev.quote || prev.liveTitle || prettyDate(prev.date)}</span>
            </Link>
          ) : <span />}
        </nav>
      </div>
    </>
  );
};

// ── Page ─────────────────────────────────────────────────────────────

const EliNotes = () => {
  const { slug } = useParams();
  const { notes, loading } = useEliNotes();
  const idx = slug ? notes.findIndex((n) => n.id === slug) : -1;
  const note = idx >= 0 ? notes[idx] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <div className="min-h-screen bg-[color:var(--retro-bg-primary)] pb-20">
      <Seo
        path={slug ? `/eli-notes/${slug}` : '/eli-notes'}
        title={note ? `${note.quote ? `“${note.quote}”` : note.liveTitle || 'Catatan live'} · Eli Notes` : 'Eli Notes'}
        description={
          note
            ? `${credit(note)}. ${note.story.slice(0, 140)}`
            : 'Eli Notes: catatan momen dari live IDN dan SHOWROOM Eli JKT48, ditulis ulang oleh penggemar, lengkap dengan kutipan dan menitnya.'
        }
      />
      {!slug ? (
        <NoteList notes={notes} loading={loading} />
      ) : note ? (
        <NoteDetail note={note} prev={notes[idx - 1]} next={notes[idx + 1]} />
      ) : (
        <>
          <Band eyebrow="Eli Notes" title={loading ? 'Memuat catatan…' : 'Catatan tidak ditemukan'} />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
            <Link to="/eli-notes" className="text-sm font-bold underline text-[color:var(--retro-burgundy)]">Lihat semua catatan</Link>
          </div>
        </>
      )}
    </div>
  );
};

export default EliNotes;
