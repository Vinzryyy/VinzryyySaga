/**
 * Lemari Eli — /mini-games/lemari. Dress Eli up layer by layer, wear a
 * Set Panggung in one tap, save the look as a card or share it as a link.
 *
 * Each Set Panggung carries the story of where Eli wore it, so the game
 * leads back to real moments (docs/prinsip-armeniaca.md). Rules live in
 * lib/lemari.js, wardrobe data in data/lemari.js, art in
 * public/minigames/lemari (docs/lemari-eli.md).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { PAGES } from '../lib/pageMeta';
import { CANVAS_ASPECT, LEMARI_ITEMS, LEMARI_SETS, SLOTS, TINTS, fullSrc, thumbSrc } from '../data/lemari';
import {
  NAME_MAX,
  applySet,
  cleanName,
  clearSlot,
  decodeOutfit,
  describeOutfit,
  encodeOutfit,
  layersFor,
  matchSet,
  openingOutfit,
  pushHistory,
  randomOutfit,
  readSaved,
  setTint,
  startingOutfit,
  tintOf,
  toggleItem,
  wornEntries,
  writeSaved,
} from '../lib/lemari';
import { btnGhost, btnPrimary } from '../components/minigames/shared';

const PATH = '/mini-games/lemari';
const SITE = 'armeniaca.online';
const SERIF = "'Fraunces Variable', 'Fraunces', Georgia, serif";
const SANS = "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif";
/** The song's one-line story on the card: italic, two lines at most. */
const ABOUT_STYLE = { marginTop: 5, fontStyle: 'italic', lineHeight: 1.3, opacity: 0.85, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
const dayFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const itemById = new Map(LEMARI_ITEMS.map((i) => [i.id, i]));

// Tabs: Set Panggung first, then only the slots that have items.
const TABS = [
  ...(LEMARI_SETS.length ? [{ key: 'sets', label: 'Set Panggung', icon: 'ri-sparkling-2-line' }] : []),
  ...SLOTS.filter((s) => LEMARI_ITEMS.some((i) => i.slot === s.key)),
];
const COMING = SLOTS.filter((s) => !LEMARI_ITEMS.some((i) => i.slot === s.key)).map((s) => s.label);

const initialOutfit = (params) => {
  if (params.get('o')) return decodeOutfit(params.get('o'));
  return openingOutfit(readSaved()?.outfit);
};

/** The stage sticks this far from the top on phones (Tailwind top-16). */
const PHONE_STAGE_TOP = 64;

/** The stacked figure. `animate` fades a layer in when it changes. */
const Stage = ({ outfit, className = '', animate = true }) => (
  <div className={`relative ${className}`} style={{ aspectRatio: CANVAS_ASPECT }}>
    {layersFor(outfit).map(({ file, filter }) => (
      <img
        key={file}
        src={fullSrc(file)}
        alt=""
        draggable="false"
        style={filter ? { filter } : undefined}
        className={`absolute inset-0 h-full w-full select-none object-contain transition-[filter] duration-300 ${animate ? 'motion-safe:animate-[lemari-in_220ms_ease-out]' : ''}`}
      />
    ))}
  </div>
);

/** Card templates for "Simpan kartu". */
const TEMPLATES = [
  { id: 'klasik', label: 'Klasik', icon: 'ri-layout-4-line' },
  { id: 'polaroid', label: 'Polaroid', icon: 'ri-camera-3-line' },
  { id: 'tiket', label: 'Tiket Teater', icon: 'ri-ticket-2-line' },
];

/** The figure with its background blurred behind, for the cards. */
const CardStage = ({ outfit, radius = 22, border = '1px solid rgba(124,45,52,0.15)' }) => {
  const bgFile = itemById.get(outfit.bg)?.file;
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: radius, overflow: 'hidden', border, display: 'flex', justifyContent: 'center', background: '#efe2cf' }}>
      {bgFile && <img src={fullSrc(bgFile)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'blur(24px)', transform: 'scale(1.1)' }} />}
      <Stage outfit={outfit} animate={false} className="h-full" />
    </div>
  );
};

/** Off-screen 540×675 board, captured at 2× (1080×1350, IG portrait). */
const CardBoard = ({ template, outfit, setLabel, about, name }) => {
  const title = setLabel || 'Gaya pilihanku';
  const today = dayFmt.format(new Date());

  if (template === 'polaroid') {
    return (
      <div style={{ width: 540, height: 675, background: '#e9dcc8', fontFamily: SANS, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 440, height: 600, background: '#fffdf8', padding: '22px 22px 0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '0 18px 40px rgba(58,40,24,0.25)', transform: 'rotate(-2deg)' }}>
          <CardStage outfit={outfit} radius={2} border="none" />
          <div style={{ minHeight: 118, padding: '8px 0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#3a2818' }}>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 30, lineHeight: 1.05 }}>{title}</div>
            {about && <div style={{ ...ABOUT_STYLE, maxWidth: 370, fontSize: 11.5 }}>{about}</div>}
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{name ? `oleh ${name} · ` : ''}{today}</div>
            <div style={{ marginTop: 6, fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', color: '#7c2d34' }}>LEMARI ELI · {SITE.toUpperCase()}</div>
          </div>
        </div>
      </div>
    );
  }

  if (template === 'tiket') {
    return (
      <div style={{ width: 540, height: 675, background: '#2a1416', fontFamily: SANS, color: '#f4ece4', padding: 26, boxSizing: 'border-box', display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#7c2d34', borderRadius: 18, overflow: 'hidden', border: '2px solid #c8952a' }}>
          <div style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed rgba(227,189,106,0.6)' }}>
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.3em', color: '#e3bd6a' }}>TIKET PANGGUNG · ADMIT ONE</span>
            <span style={{ fontFamily: SERIF, fontSize: 18 }}>Armeniaca<span style={{ color: '#e3bd6a' }}>.</span></span>
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 0', display: 'flex' }}>
            <CardStage outfit={outfit} radius={12} border="1px solid rgba(227,189,106,0.5)" />
          </div>
          <div style={{ padding: '14px 22px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', color: '#e3bd6a' }}>PERTUNJUKAN</div>
              <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 28, lineHeight: 1.05 }}>{title}</div>
              {about && <div style={{ ...ABOUT_STYLE, fontSize: 11.5 }}>{about}</div>}
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Bintang tamu: Eli{name ? ` · Penata gaya: ${name}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, opacity: 0.85 }}>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', color: '#e3bd6a' }}>TANGGAL</div>
              {today}
            </div>
          </div>
          <div style={{ padding: '8px 22px', background: 'rgba(0,0,0,0.18)', fontSize: 9, opacity: 0.75, textAlign: 'right' }}>{SITE}/mini-games/lemari</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 540, height: 675, background: '#fdf6ee', color: '#3a2818', fontFamily: SANS, padding: '32px 36px 26px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10, fontWeight: 900, letterSpacing: '0.3em', color: '#7c2d34' }}>
        <span>LEMARI ELI</span>
        <span style={{ fontFamily: SERIF, fontSize: 18, letterSpacing: 0, color: '#3a2818' }}>Armeniaca<span style={{ color: '#7c2d34' }}>.</span></span>
      </div>
      <div style={{ marginTop: 14, flex: 1, minHeight: 0, display: 'flex' }}>
        <CardStage outfit={outfit} />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{title}</div>
        {about && <div style={{ ...ABOUT_STYLE, fontSize: 12 }}>{about}</div>}
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          {name ? <>Didandani oleh <b>{name}</b> · </> : null}{today}
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, opacity: 0.6, textAlign: 'right' }}>{SITE}/mini-games/lemari</div>
    </div>
  );
};

/** A small live copy of the card, so its shape is seen before saving. */
const PREVIEW_SCALE = 0.3;
const CardPreview = (props) => (
  <div aria-hidden="true" className="relative flex-shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-black/5" style={{ width: 540 * PREVIEW_SCALE, height: 675 * PREVIEW_SCALE }}>
    <div style={{ width: 540, height: 675, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
      <CardBoard {...props} />
    </div>
  </div>
);

/** The preview playing now, so starting another one stops it. */
let playingPreview = null;

/**
 * A 30-second preview of the song's official release: Apple's own file,
 * loaded only when tapped, with a link to the song on Apple Music.
 */
const SongPreview = ({ listen }) => {
  const audioRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | loading | playing | paused | error
  const [progress, setProgress] = useState(0);

  // Stop when the costume changes or the story closes.
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (playingPreview && playingPreview !== audio) playingPreview.pause();
    playingPreview = audio;
    setState('loading');
    try {
      await audio.play();
    } catch {
      setState('error');
    }
  };

  const playing = state === 'playing';
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#d4a574]/40 bg-white/70 p-2 pr-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Jeda cuplikan' : `Putar cuplikan ${listen.title}`}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--retro-burgundy)] text-lg text-[color:var(--retro-cream)] transition-transform active:scale-95"
      >
        <i className={playing ? 'ri-pause-fill' : state === 'loading' ? 'ri-loader-4-line animate-spin' : 'ri-play-fill'} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#3a2818]">{listen.title}</p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#d4a574]/30" aria-hidden="true">
          <div className="h-full rounded-full bg-[color:var(--retro-burgundy)] transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="mt-1 text-[10px] leading-snug text-[#3a2818]/65">
          {state === 'error' ? 'Cuplikan tidak bisa diputar. ' : `Cuplikan 30 detik · ${listen.by || 'rekaman resmi JKT48'} (${listen.album}, ${listen.year}) · `}
          <a href={listen.link} target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-dotted underline-offset-2 hover:text-[color:var(--retro-burgundy)]">
            Apple Music
          </a>
        </p>
      </div>
      <audio
        ref={audioRef}
        src={listen.preview}
        preload="none"
        onPlaying={() => setState('playing')}
        onPause={() => setState((s) => (s === 'error' ? s : 'paused'))}
        onEnded={() => {
          setState('idle');
          setProgress(0);
        }}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 30))}
        onError={() => setState('error')}
      />
    </div>
  );
};

/**
 * A fan upload of the song on YouTube (songs with no official release):
 * the youtube-nocookie player opens on tap, from the start to `end`.
 */
const VideoClip = ({ listen }) => {
  const [open, setOpen] = useState(false);
  const watch = `https://www.youtube.com/watch?v=${listen.youtube}`;
  const src = `https://www.youtube-nocookie.com/embed/${listen.youtube}?autoplay=1&rel=0&modestbranding=1&playsinline=1&start=${listen.start || 0}${listen.end ? `&end=${listen.end}` : ''}`;
  return (
    <div className="mt-3 rounded-xl border border-[#d4a574]/40 bg-white/70 p-2">
      <div className="flex items-center gap-3 pr-1">
        <button
          type="button"
          onClick={() => {
            playingPreview?.pause();
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          aria-label={open ? 'Tutup cuplikan' : `Putar cuplikan ${listen.title}`}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--retro-burgundy)] text-lg text-[color:var(--retro-cream)] transition-transform active:scale-95"
        >
          <i className={open ? 'ri-close-line' : 'ri-play-fill'} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-[#3a2818]">{listen.title}</p>
          <p className="mt-1 text-[10px] leading-snug text-[#3a2818]/65">
            Cuplikan versi JKT48 · unggahan penggemar ({listen.channel}) ·{' '}
            <a href={watch} target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-dotted underline-offset-2 hover:text-[color:var(--retro-burgundy)]">
              YouTube
            </a>
          </p>
        </div>
      </div>
      {open && (
        <div className="mt-2 aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            src={src}
            title={`${listen.title} (YouTube)`}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
    </div>
  );
};

/** "Cerita kostum": what the song tells, and when Eli wore the costume. */
const CostumeStory = ({ set, id, className = '' }) => (
  <aside id={id} className={`rounded-2xl border border-[#d4a574]/30 bg-[#fdf6ee] p-4 ${className}`}>
    <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[#9a5b4a]">
      <i className="ri-history-line text-sm" aria-hidden="true" /> Cerita kostum · {set.name}
    </p>
    {set.about && (
      <p className="mt-2 flex gap-1.5 text-sm italic leading-relaxed text-[#6b4a35]">
        <i className="ri-music-2-line mt-0.5 not-italic" aria-hidden="true" />
        <span>
          <span className="sr-only">Tentang lagunya: </span>
          {set.about}
        </span>
      </p>
    )}
    {set.listen && (set.listen.youtube ? <VideoClip key={set.id} listen={set.listen} /> : <SongPreview key={set.id} listen={set.listen} />)}
    {set.moment ? (
      <p className="mt-3 text-sm leading-relaxed text-[#3a2818]">
        {set.moment.text}{' '}
        {set.moment.to && (
          <Link to={set.moment.to} className="font-bold text-[color:var(--retro-burgundy)] hover:underline">Lihat momennya →</Link>
        )}
      </p>
    ) : (
      <p className="mt-2 text-sm leading-relaxed text-[#3a2818]/80">Cerita kapan Eli memakai kostum ini sedang kami kumpulkan.</p>
    )}
  </aside>
);

const Lemari = () => {
  const [params, setParams] = useSearchParams();
  const [outfit, setOutfit] = useState(() => initialOutfit(params));
  const [name, setName] = useState(() => readSaved()?.name || '');
  const [template, setTemplate] = useState(() => (TEMPLATES.some((t) => t.id === readSaved()?.template) ? readSaved().template : 'klasik'));
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState(TABS[0]?.key);
  const [status, setStatus] = useState('idle'); // card: idle | capturing | done | error
  const [copied, setCopied] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false); // phones: the story opens under the stage
  const cardRef = useRef(null);
  const tabRefs = useRef([]);
  const stageRef = useRef(null);
  const [stageH, setStageH] = useState(0);

  // Phones: the tabs stick right under the stage, whatever its height.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setStageH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const match = useMemo(() => matchSet(outfit), [outfit]);
  const alt = useMemo(() => describeOutfit(outfit), [outfit]);
  const wornDraft = wornEntries(outfit).some(([, id]) => itemById.get(id)?.draft);
  const setLabel = match ? `${match.set.name}${match.modified ? ' (modifikasi)' : ''}` : null;
  const encoded = encodeOutfit(outfit);
  const bgFile = itemById.get(outfit.bg)?.file;

  // Remember the look and keep the address shareable.
  useEffect(() => {
    writeSaved(outfit, name, template);
  }, [outfit, name, template]);

  /** Every change goes through here so it can be undone. */
  const change = (fn) => {
    const next = fn(outfit);
    if (encodeOutfit(next) === encodeOutfit(outfit)) return;
    setHistory((h) => pushHistory(h, outfit));
    setOutfit(next);
  };
  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setOutfit(h.at(-1));
      return h.slice(0, -1);
    });
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !/^(INPUT|TEXTAREA)$/.test(e.target?.tagName)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);
  useEffect(() => {
    if (params.get('o') !== encoded) setParams({ o: encoded }, { replace: true });
  }, [encoded]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTabKey = (e, idx) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (idx + step + TABS.length) % TABS.length;
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  };

  const shareUrl = `https://${SITE}${PATH}?o=${encoded}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const saveCard = useCallback(async () => {
    if (!cardRef.current) return;
    setStatus('capturing');
    const filename = `lemari-eli-${template}-${new Date().toISOString().slice(0, 10)}.png`;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all([...cardRef.current.querySelectorAll('img')].map((img) => (img.complete ? null : img.decode().catch(() => null))));
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#fdf6ee' });
      if (!blob) throw new Error('empty image');
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Lemari Eli', text: `Gaya Eli pilihanku · ${shareUrl}` });
          setStatus('done');
          setTimeout(() => setStatus('idle'), 2000);
          return;
        } catch (e) {
          if (e?.name === 'AbortError') {
            setStatus('idle');
            return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('[Lemari] card failed:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [shareUrl, template]);

  const slotItems = (slot) => LEMARI_ITEMS.filter((i) => i.slot === slot && !i.unlock);
  const cardLabel = { idle: 'Simpan kartu', capturing: 'Menyiapkan…', done: 'Tersimpan ✓', error: 'Gagal, coba lagi' }[status];

  // The card: live preview, shape, "Didandani oleh" and save. Beside the
  // stage on wide screens, after the wardrobe on phones.
  const cardSection = (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <CardPreview template={template} outfit={outfit} setLabel={setLabel} about={match?.set.about} name={cleanName(name)} />
      <div className="w-full min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)]">Bentuk kartu</p>
        <div role="radiogroup" aria-label="Bentuk kartu" className="mt-1.5 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={template === t.id}
              onClick={() => setTemplate(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                template === t.id ? 'border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]' : 'border-[color:var(--retro-brown-dark)]/12 bg-white/70 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/40'
              }`}
            >
              <i className={`${t.icon} text-sm`} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[180px] text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)]">
            Didandani oleh (opsional)
            <input
              type="text"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              onBlur={() => setName((n) => cleanName(n))}
              placeholder="Nama atau akun X"
              className="mt-1 block w-full rounded-xl border border-[color:var(--retro-brown-dark)]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[color:var(--retro-text-primary)] focus:border-[color:var(--retro-burgundy)] focus:outline-none"
            />
          </label>
          <button type="button" className={btnPrimary} onClick={saveCard} disabled={status === 'capturing'}>
            <i className={status === 'capturing' ? 'ri-loader-4-line animate-spin' : 'ri-image-add-line'} aria-hidden="true" /> {cardLabel}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--retro-text-muted)]">Kartu 1080×1350, siap dibagikan ke X atau Instagram.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[color:var(--retro-bg-primary)] pb-28 lg:pb-20 pt-24 sm:pt-28 px-4 sm:px-6">
      <Seo {...PAGES.lemari} />
      <div className="max-w-6xl mx-auto">
        <Link to="/mini-games" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)]">
          <i className="ri-arrow-left-line" /> Mini games
        </Link>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
          <h1 className="font-header text-3xl sm:text-5xl font-black tracking-tight text-[color:var(--retro-text-primary)]">Lemari Eli</h1>
          <span className="mb-1 rounded-full bg-[color:var(--retro-gold)]/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)]">Beta</span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--retro-text-secondary)]">
          Pilih kostum untuk Eli, atau pakai satu Set Panggung sekaligus. Setiap set punya cerita tentang kapan Eli memakainya.
        </p>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          {/* STAGE — sticky so the look stays in view while choosing; the
              costume's story sits right under it (on phones, behind a button
              so the stage stays short). */}
          <div
            ref={stageRef}
            className="sticky top-16 z-10 -mx-4 bg-[color:var(--retro-bg-primary)]/95 px-4 pb-2 pt-2 backdrop-blur sm:mx-0 sm:px-0 lg:top-28 lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none [scrollbar-width:thin]"
          >
            <figure className="relative rounded-3xl border border-[color:var(--retro-burgundy)]/15 bg-[#efe2cf] overflow-hidden flex justify-center">
              {/* The background, blurred, fills the space beside the figure. */}
              {bgFile && (
                <img src={fullSrc(bgFile)} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-xl" />
              )}
              <div role="img" aria-label={alt} className="relative h-[34svh] sm:h-[44svh] lg:h-[46svh] max-h-[680px]">
                <Stage outfit={outfit} className="h-full" />
              </div>
            </figure>
            <div className="mt-2 flex min-h-6 items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-bold text-[color:var(--retro-text-primary)]">
                {setLabel ? <><i className="ri-sparkling-2-line text-[color:var(--retro-burgundy)]" /> {setLabel}</> : 'Gaya pilihanmu'}
              </span>
              <span className="flex flex-shrink-0 items-center gap-2">
                {wornDraft && (
                  <span className="rounded-full bg-[color:var(--retro-brown-dark)]/[0.07] px-2 py-0.5 text-[10px] font-bold text-[color:var(--retro-text-muted)]" title="Gambar sementara, versi rapi dari ilustrator menyusul">
                    Gambar draft
                  </span>
                )}
                {match && (
                  <button
                    type="button"
                    onClick={() => setStoryOpen((o) => !o)}
                    aria-expanded={storyOpen}
                    aria-controls="lemari-story-phone"
                    className="inline-flex items-center gap-1 rounded-full border border-[#d4a574]/60 bg-[#fdf6ee] px-2.5 py-1 text-[11px] font-bold text-[#9a5b4a] lg:hidden"
                  >
                    <i className={storyOpen ? 'ri-close-line' : 'ri-history-line'} aria-hidden="true" /> {storyOpen ? 'Tutup cerita' : 'Cerita kostum'}
                  </button>
                )}
              </span>
            </div>
            {match && storyOpen && <CostumeStory id="lemari-story-phone" set={match.set} className="mt-2 max-h-[38svh] overflow-y-auto lg:hidden" />}
            {/* What's left of the screen under the stage (46svh) and its fixed
                parts (~11rem); a long story scrolls inside, the stage stays whole. */}
            {match && <CostumeStory set={match.set} className="mt-3 hidden lg:block lg:max-h-[calc(54svh-11rem)] lg:overflow-y-auto" />}
          </div>

          {/* WARDROBE */}
          <div className="min-w-0">
            <div
              role="tablist"
              aria-label="Lemari"
              style={{ top: PHONE_STAGE_TOP + stageH }}
              className="sticky z-[9] -mx-4 flex gap-2 overflow-x-auto bg-[color:var(--retro-bg-primary)]/95 px-4 py-2 backdrop-blur sm:mx-0 sm:flex-wrap sm:px-0 lg:static lg:bg-transparent lg:py-0 lg:pb-1 lg:backdrop-blur-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TABS.map((t, idx) => (
                <button
                  key={t.key}
                  ref={(el) => (tabRefs.current[idx] = el)}
                  type="button"
                  role="tab"
                  id={`lemari-tab-${t.key}`}
                  aria-selected={tab === t.key}
                  aria-controls="lemari-panel"
                  tabIndex={tab === t.key ? 0 : -1}
                  onClick={() => setTab(t.key)}
                  onKeyDown={(e) => onTabKey(e, idx)}
                  className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                    tab === t.key
                      ? 'border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
                      : 'border-[color:var(--retro-burgundy)]/15 bg-white/70 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/40'
                  }`}
                >
                  <i className={`${t.icon} text-sm`} aria-hidden="true" /> {t.label}
                </button>
              ))}
            </div>

            <div id="lemari-panel" role="tabpanel" aria-labelledby={`lemari-tab-${tab}`} className="mt-4">
              {tab === 'sets' ? (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {LEMARI_SETS.map((set) => {
                    const active = match?.set.id === set.id && !match.modified;
                    return (
                      <li key={set.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => change((o) => applySet(o, set))}
                          className={`h-full w-full rounded-2xl border p-3 text-left transition-colors ${
                            active ? 'border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)]/[0.06]' : 'border-[color:var(--retro-brown-dark)]/12 bg-white/70 hover:border-[color:var(--retro-burgundy)]/40'
                          }`}
                        >
                          <span className="flex gap-1.5">
                            {set.items.map((id) => (
                              <img key={id} src={thumbSrc(itemById.get(id)?.file)} alt="" loading="lazy" className="h-12 w-12 rounded-lg bg-[#efe2cf] object-contain p-0.5" />
                            ))}
                          </span>
                          <span className="mt-2 block font-header text-sm font-black leading-tight text-[color:var(--retro-text-primary)]">{set.name}</span>
                          <span className="mt-1 hidden text-[11px] leading-snug text-[color:var(--retro-text-muted)] sm:line-clamp-2">
                            {set.items.map((id) => itemById.get(id)?.name).join(' · ')}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {tab !== 'bg' && (
                    <li>
                      <button
                        type="button"
                        aria-pressed={!outfit[tab]}
                        onClick={() => change((o) => clearSlot(o, tab))}
                        className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-bold transition-colors ${
                          !outfit[tab] ? 'border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)]/[0.06] text-[color:var(--retro-burgundy)]' : 'border-dashed border-[color:var(--retro-brown-dark)]/20 text-[color:var(--retro-text-muted)] hover:border-[color:var(--retro-burgundy)]/40'
                        }`}
                      >
                        <i className="ri-close-circle-line text-xl" aria-hidden="true" /> Tanpa
                      </button>
                    </li>
                  )}
                  {slotItems(tab).map((item) => {
                    const worn = outfit[item.slot] === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-pressed={worn}
                          onClick={() => change((o) => toggleItem(o, item))}
                          className={`group relative flex w-full flex-col rounded-2xl border p-2 text-left transition-colors ${
                            worn ? 'border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)]/[0.06]' : 'border-[color:var(--retro-brown-dark)]/12 bg-white/70 hover:border-[color:var(--retro-burgundy)]/40'
                          }`}
                        >
                          <img src={thumbSrc(item.file)} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-[#efe2cf] object-contain p-1" />
                          <span className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-tight text-[color:var(--retro-text-primary)]">{item.name}</span>
                          {item.draft && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-1.5 text-[9px] font-bold text-[color:var(--retro-text-muted)]">draft</span>}
                          {worn && <i className="ri-check-line absolute left-3 top-3 rounded-full bg-[color:var(--retro-burgundy)] px-1 text-xs text-[color:var(--retro-cream)]" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {/* Where the background or accessory worn in this tab comes from. */}
              {tab !== 'sets' && itemById.get(outfit[tab])?.note && (
                <p className="mt-3 flex gap-1.5 text-xs leading-relaxed text-[color:var(--retro-text-secondary)]">
                  <i className={`${tab === 'bg' ? 'ri-map-pin-2-line' : 'ri-sparkling-line'} mt-0.5 text-[color:var(--retro-burgundy)]`} aria-hidden="true" />
                  <span>
                    <b className="text-[color:var(--retro-text-primary)]">{itemById.get(outfit[tab]).name}.</b> {itemById.get(outfit[tab]).note}
                  </span>
                </p>
              )}
              {tab !== 'sets' && itemById.get(outfit[tab])?.tintable && (
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)] inline-flex items-center gap-1.5">
                    <i className="ri-palette-line text-sm" aria-hidden="true" /> Warna {itemById.get(outfit[tab]).name}
                  </p>
                  <div role="radiogroup" aria-label="Warna" className="mt-2 flex flex-wrap gap-2">
                    {TINTS.map((t) => {
                      const on = tintOf(outfit, tab).id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => change((o) => setTint(o, tab, t.id))}
                          className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[11px] font-bold transition-colors ${
                            on ? 'border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)]/[0.06] text-[color:var(--retro-burgundy)]' : 'border-[color:var(--retro-brown-dark)]/12 bg-white/70 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/40'
                          }`}
                        >
                          <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: t.swatch }} aria-hidden="true" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {COMING.length > 0 && (
                <p className="mt-3 text-[11px] text-[color:var(--retro-text-muted)]">
                  Segera hadir: {COMING.join(', ')}.
                </p>
              )}
            </div>

            {/* ACTIONS */}
            <div className="mt-5 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white/60 p-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => change(() => randomOutfit())}>
                  <i className="ri-shuffle-line" aria-hidden="true" /> Acak
                </button>
                <button type="button" className={btnGhost} onClick={undo} disabled={!history.length} aria-keyshortcuts="Control+Z Meta+Z">
                  <i className="ri-arrow-go-back-line" aria-hidden="true" /> Urungkan
                </button>
                <button type="button" className={btnGhost} onClick={() => change(() => startingOutfit())}>
                  <i className="ri-refresh-line" aria-hidden="true" /> Reset
                </button>
                <button type="button" className={btnGhost} onClick={copyLink}>
                  <i className={copied ? 'ri-check-line' : 'ri-link'} aria-hidden="true" /> {copied ? 'Link tersalin' : 'Salin link'}
                </button>
              </div>
              {/* Wide screens: the card sits here, beside the stage. */}
              <div className="mt-4 hidden lg:block">{cardSection}</div>
            </div>
          </div>
        </div>

        {/* Phones: the card comes after the wardrobe, once the stage has
            scrolled away, so the sticky stage never covers it. */}
        <div className="mt-5 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white/60 p-4 lg:hidden">{cardSection}</div>
      </div>

      {/* Off-screen card for "Simpan kartu" (capture the inner board, not the moved holder). */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <div ref={cardRef}>
          <CardBoard template={template} outfit={outfit} setLabel={setLabel} about={match?.set.about} name={cleanName(name)} />
        </div>
      </div>
    </div>
  );
};

export default Lemari;
