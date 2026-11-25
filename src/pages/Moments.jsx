/**
 * Album Momen — /momen (all moments) and /momen/:slug (one moment).
 *
 * Turns the gallery from a pile of photos into a set of memories: each
 * moment has its photos, date, place, the @armeniaca15 caption (credited),
 * the theater show that day if any, and stories from fans.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { PAGES, momentMeta } from '../lib/pageMeta';
import { useGallery } from '../context';
import { useLightbox } from '../context/LightboxContext';
import { buildMoments, cleanCaption, showsOn } from '../lib/moments';
import MomentStories from '../components/stories/MomentStories';
import { useEliNotes } from '../hooks/useEliNotes';
import { notesOn } from '../lib/eliNotes';
import { NoteCard } from '../components/EliNoteCard';

const PAGE = 24;
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const prettyDate = (iso) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
const thumbOf = (p) => p.thumbnail || p.url;

let showLogPromise = null;
const loadShowLog = () => {
  if (!showLogPromise) {
    showLogPromise = fetch('/data/eli-show-log.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return showLogPromise;
};

const Band = ({ image, eyebrow, title, children }) => (
  <header className="relative overflow-hidden pt-24 sm:pt-28 pb-10 px-4 sm:px-6">
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: '50% 30%' }}
    />
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'linear-gradient(180deg, rgba(61,52,43,0.9) 0%, rgba(92,74,58,0.78) 55%, rgba(124,45,52,0.62) 100%)' }}
    />
    <div className="relative max-w-5xl mx-auto">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 text-[color:var(--retro-gold-light)]">
        <i className="ri-book-open-line text-base" /> {eyebrow}
      </p>
      <h1 className="mt-2 font-header text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{title}</h1>
      {children}
    </div>
  </header>
);

// ── List ─────────────────────────────────────────────────────────────

const MomentList = ({ moments, loading }) => {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [shown, setShown] = useState(PAGE);

  const years = useMemo(() => [...new Set(moments.map((m) => m.year))].sort().reverse(), [moments]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return moments.filter(
      (m) => (year === 'all' || m.year === year) && (!q || m.name.toLowerCase().includes(q) || m.location.toLowerCase().includes(q)),
    );
  }, [moments, query, year]);

  return (
    <>
      <Band image="/archive/img-211.webp" eyebrow="Album Momen" title="Setiap foto punya cerita">
        <p className="mt-2 text-sm sm:text-base text-[color:var(--retro-cream)]/85 max-w-xl">
          {moments.length ? `${moments.length} momen` : 'Momen-momen'} Eli dari arsip @armeniaca15, dikelompokkan per acara.
          Buka satu momen untuk melihat fotonya, panggung hari itu, dan cerita dari sesama penggemar.
        </p>
        <Link to="/eli-notes" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white hover:bg-white/25">
          <i className="ri-quill-pen-line" /> Momen dari live ada di Eli Notes
        </Link>
      </Band>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Cari momen</span>
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--retro-text-muted)]" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
              placeholder="Cari acara atau tempat (mis. Jakarta Fair)"
              className="w-full rounded-full border border-[color:var(--retro-brown-dark)]/20 bg-white pl-10 pr-4 py-2.5 text-sm text-[color:var(--retro-text-primary)] focus:outline-none focus:border-[color:var(--retro-burgundy)]"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Tahun">
            {['all', ...years].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => { setYear(y); setShown(PAGE); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-colors ${
                  year === y
                    ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
                    : 'bg-white border border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40'
                }`}
              >
                {y === 'all' ? 'Semua' : y}
              </button>
            ))}
          </div>
        </div>

        {loading && !moments.length ? (
          <p className="mt-10 text-sm text-[color:var(--retro-text-secondary)]">Memuat momen…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-sm text-[color:var(--retro-text-secondary)]">Belum ada momen yang cocok.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.slice(0, shown).map((m) => (
              <li key={m.slug}>
                <Link
                  to={`/momen/${m.slug}`}
                  className="group block overflow-hidden rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 shadow-sm hover:shadow-md transition"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--retro-cream-dark)]">
                    <img src={thumbOf(m.photos[0])} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                      <i className="ri-image-line" /> {m.photos.length}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[color:var(--retro-text-muted)]">{prettyDate(m.date)}</p>
                    <p className="mt-0.5 font-bold text-sm leading-snug text-[color:var(--retro-text-primary)] line-clamp-2">{m.name}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {filtered.length > shown && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-wider bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)]"
            >
              Lihat lagi ({filtered.length - shown})
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Detail ───────────────────────────────────────────────────────────

const MomentDetail = ({ moment, prev, next }) => {
  const { open: openLightbox } = useLightbox();
  const [showLog, setShowLog] = useState(null);
  useEffect(() => {
    let alive = true;
    loadShowLog().then((d) => alive && setShowLog(d));
    return () => { alive = false; };
  }, []);

  const shows = showsOn(showLog, moment.date);
  const caption = cleanCaption(moment.caption);
  const { notes } = useEliNotes();
  const dayNotes = notesOn(notes, moment.date);

  return (
    <>
      <Band image={moment.photos[0].url} eyebrow={`Album Momen · ${prettyDate(moment.date)}`} title={moment.name}>
        <p className="mt-2 text-sm text-[color:var(--retro-cream)]/85">
          {moment.location && <><i className="ri-map-pin-line" /> {moment.location} · </>}
          {moment.photos.length} foto
        </p>
      </Band>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link to="/momen" className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)]">
          <i className="ri-arrow-left-line" /> Semua momen
        </Link>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_280px]">
          {caption ? (
            <figure className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-5">
              <blockquote className="font-header text-lg italic leading-relaxed text-[color:var(--retro-text-primary)] whitespace-pre-line">
                “{caption}”
              </blockquote>
              <figcaption className="mt-3 text-xs text-[color:var(--retro-text-secondary)]">
                — @armeniaca15
                {moment.tweetUrl && (
                  <> · <a href={moment.tweetUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">lihat postingan asli</a></>
                )}
              </figcaption>
            </figure>
          ) : (
            <div />
          )}

          {shows.length > 0 && (
            <aside className="rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)]">Panggung hari itu</p>
              {shows.map((s) => (
                <div key={s.no} className="mt-3">
                  <p className="font-header text-2xl font-black">Show #{s.no}</p>
                  <p className="text-sm">{s.setlist}</p>
                  {s.unitSong && <p className="mt-1 text-xs text-[color:var(--retro-cream)]/80">Unit: {s.unitSong}{s.position ? ` · ${s.position}` : ''}</p>}
                </div>
              ))}
              <Link to="/schedule" className="mt-3 inline-block text-xs font-bold underline">Arsip jadwal</Link>
            </aside>
          )}
        </div>

        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {moment.photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openLightbox(moment.photos, i)}
                aria-label={`Buka foto ${i + 1} dari ${moment.photos.length}`}
                className="block w-full overflow-hidden rounded-xl bg-[color:var(--retro-cream-dark)] aspect-[4/5]"
              >
                <img src={thumbOf(p)} alt={`${moment.name}, foto ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover hover:scale-[1.03] transition-transform duration-500" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[color:var(--retro-text-muted)]">Foto: @armeniaca15. Watermark dan sumber dipertahankan.</p>

        {dayNotes.length > 0 && (
          <section className="mt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)]">Eli Notes hari itu</p>
            <ul className="en-board mt-8">
              {dayNotes.map((n) => (
                <li key={n.id}><NoteCard note={n} /></li>
              ))}
            </ul>
          </section>
        )}

        <MomentStories slug={moment.slug} label={`${moment.name} · ${prettyDate(moment.date)}`} />

        <nav className="mt-10 grid grid-cols-2 gap-3" aria-label="Momen lain">
          {next ? (
            <Link to={`/momen/${next.slug}`} className="rounded-2xl border border-[color:var(--retro-brown-dark)]/12 p-4 hover:border-[color:var(--retro-burgundy)]/40">
              <span className="text-xs text-[color:var(--retro-text-muted)]"><i className="ri-arrow-left-line" /> Sebelumnya</span>
              <span className="mt-1 block text-sm font-bold text-[color:var(--retro-text-primary)] line-clamp-2">{next.name}</span>
            </Link>
          ) : <span />}
          {prev ? (
            <Link to={`/momen/${prev.slug}`} className="rounded-2xl border border-[color:var(--retro-brown-dark)]/12 p-4 text-right hover:border-[color:var(--retro-burgundy)]/40">
              <span className="text-xs text-[color:var(--retro-text-muted)]">Sesudahnya <i className="ri-arrow-right-line" /></span>
              <span className="mt-1 block text-sm font-bold text-[color:var(--retro-text-primary)] line-clamp-2">{prev.name}</span>
            </Link>
          ) : <span />}
        </nav>
      </div>
    </>
  );
};

// ── Page ─────────────────────────────────────────────────────────────

const Moments = () => {
  const { slug } = useParams();
  const { images, enrichmentsLoaded } = useGallery();
  const moments = useMemo(() => buildMoments(images), [images]);
  const idx = slug ? moments.findIndex((m) => m.slug === slug) : -1;
  const moment = idx >= 0 ? moments[idx] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <div className="min-h-screen bg-[color:var(--retro-bg-primary)] pb-20">
      <Seo {...(moment ? momentMeta(moment) : { ...PAGES.momen, path: slug ? `/momen/${slug}` : PAGES.momen.path })} />
      {!slug ? (
        <MomentList moments={moments} loading={!enrichmentsLoaded} />
      ) : moment ? (
        <MomentDetail moment={moment} prev={moments[idx - 1]} next={moments[idx + 1]} />
      ) : (
        <>
          <Band image="/archive/img-211.webp" eyebrow="Album Momen" title={enrichmentsLoaded ? 'Momen tidak ditemukan' : 'Memuat momen…'} />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
            <Link to="/momen" className="text-sm font-bold underline text-[color:var(--retro-burgundy)]">Lihat semua momen</Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Moments;
