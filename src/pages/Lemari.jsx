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
import { CANVAS_ASPECT, LEMARI_ITEMS, LEMARI_SETS, SLOTS, TINTS, fullSrc, thumbSrc } from '../data/lemari';
import {
  NAME_MAX,
  applySet,
  cleanName,
  clearSlot,
  creditsFor,
  decodeOutfit,
  defaultOutfit,
  describeOutfit,
  encodeOutfit,
  layersFor,
  matchSet,
  pushHistory,
  randomOutfit,
  readSaved,
  setTint,
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
  return readSaved()?.outfit || defaultOutfit();
};

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
const CardBoard = ({ template, outfit, setLabel, name, credits }) => {
  const title = setLabel || 'Gaya pilihanku';
  const today = dayFmt.format(new Date());
  const creditLine = credits.join(' · ');

  if (template === 'polaroid') {
    return (
      <div style={{ width: 540, height: 675, background: '#e9dcc8', fontFamily: SANS, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 440, height: 600, background: '#fffdf8', padding: '22px 22px 0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '0 18px 40px rgba(58,40,24,0.25)', transform: 'rotate(-2deg)' }}>
          <CardStage outfit={outfit} radius={2} border="none" />
          <div style={{ height: 118, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#3a2818' }}>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 30, lineHeight: 1.05 }}>{title}</div>
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
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Bintang tamu: Eli{name ? ` · Penata gaya: ${name}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, opacity: 0.85 }}>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', color: '#e3bd6a' }}>TANGGAL</div>
              {today}
            </div>
          </div>
          <div style={{ padding: '8px 22px', background: 'rgba(0,0,0,0.18)', fontSize: 9, opacity: 0.75, display: 'flex', justifyContent: 'space-between' }}>
            <span>{creditLine}</span><span>{SITE}/mini-games/lemari</span>
          </div>
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
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{title}</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            {name ? <>Didandani oleh <b>{name}</b> · </> : null}{today}
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, textAlign: 'right', whiteSpace: 'nowrap' }}>{SITE}/mini-games/lemari</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 9, opacity: 0.55 }}>{creditLine}</div>
    </div>
  );
};

const Lemari = () => {
  const [params, setParams] = useSearchParams();
  const [outfit, setOutfit] = useState(() => initialOutfit(params));
  const [name, setName] = useState(() => readSaved()?.name || '');
  const [template, setTemplate] = useState(() => (TEMPLATES.some((t) => t.id === readSaved()?.template) ? readSaved().template : 'klasik'));
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState(TABS[0]?.key);
  const [status, setStatus] = useState('idle'); // card: idle | capturing | done | error
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);
  const tabRefs = useRef([]);

  const match = useMemo(() => matchSet(outfit), [outfit]);
  const credits = useMemo(() => creditsFor(outfit), [outfit]);
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

  return (
    <div className="min-h-screen bg-[color:var(--retro-bg-primary)] pb-20 pt-24 sm:pt-28 px-4 sm:px-6">
      <Seo
        path={PATH}
        title="Lemari Eli · Mini Games"
        description="Lemari Eli: dandani Eli dengan kostum panggungnya, kenali cerita di balik tiap kostum, lalu simpan gayamu sebagai kartu."
      />
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
          {/* STAGE — sticky on phones so the look stays in view while choosing. */}
          <div className="sticky top-16 z-10 -mx-4 bg-[color:var(--retro-bg-primary)]/95 px-4 pb-3 pt-2 backdrop-blur sm:mx-0 sm:px-0 lg:top-28 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <figure className="relative rounded-3xl border border-[color:var(--retro-burgundy)]/15 bg-[#efe2cf] overflow-hidden flex justify-center">
              {/* The background, blurred, fills the space beside the figure. */}
              {bgFile && (
                <img src={fullSrc(bgFile)} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-xl" />
              )}
              <div role="img" aria-label={alt} className="relative h-[44svh] sm:h-[56svh] lg:h-[62svh] max-h-[680px]">
                <Stage outfit={outfit} className="h-full" />
              </div>
            </figure>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[color:var(--retro-text-primary)]">
                {setLabel ? <><i className="ri-sparkling-2-line text-[color:var(--retro-burgundy)]" /> {setLabel}</> : 'Gaya pilihanmu'}
              </span>
              {wornDraft && (
                <span className="rounded-full bg-[color:var(--retro-brown-dark)]/[0.07] px-2 py-0.5 text-[10px] font-bold text-[color:var(--retro-text-muted)]" title="Gambar sementara, versi rapi dari ilustrator menyusul">
                  Gambar draft
                </span>
              )}
            </div>
          </div>

          {/* WARDROBE */}
          <div className="min-w-0">
            <div role="tablist" aria-label="Lemari" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                <ul className="grid gap-3 sm:grid-cols-2">
                  {LEMARI_SETS.map((set) => {
                    const active = match?.set.id === set.id && !match.modified;
                    return (
                      <li key={set.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => change((o) => applySet(o, set))}
                          className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                            active ? 'border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)]/[0.06]' : 'border-[color:var(--retro-brown-dark)]/12 bg-white/70 hover:border-[color:var(--retro-burgundy)]/40'
                          }`}
                        >
                          <span className="flex gap-2">
                            {set.items.map((id) => (
                              <img key={id} src={thumbSrc(itemById.get(id)?.file)} alt="" loading="lazy" className="h-16 w-16 rounded-xl bg-[#efe2cf] object-contain p-1" />
                            ))}
                          </span>
                          <span className="mt-3 block font-header text-lg font-black text-[color:var(--retro-text-primary)]">{set.name}</span>
                          <span className="mt-1 block text-xs text-[color:var(--retro-text-muted)]">
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

            {/* The story behind the set being worn. */}
            {match && (
              <aside className="mt-5 rounded-2xl border border-[#d4a574]/30 bg-[#fdf6ee] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9a5b4a] inline-flex items-center gap-1.5">
                  <i className="ri-history-line text-sm" aria-hidden="true" /> Cerita kostum · {match.set.name}
                </p>
                {match.set.moment ? (
                  <p className="mt-2 text-sm leading-relaxed text-[#3a2818]">
                    {match.set.moment.text}{' '}
                    {match.set.moment.to && (
                      <Link to={match.set.moment.to} className="font-bold text-[color:var(--retro-burgundy)] hover:underline">Lihat momennya →</Link>
                    )}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-[#3a2818]/80">Cerita kapan Eli memakai kostum ini sedang kami kumpulkan.</p>
                )}
              </aside>
            )}

            {/* ACTIONS */}
            <div className="mt-5 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white/60 p-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => change(() => randomOutfit())}>
                  <i className="ri-shuffle-line" aria-hidden="true" /> Acak
                </button>
                <button type="button" className={btnGhost} onClick={undo} disabled={!history.length} aria-keyshortcuts="Control+Z Meta+Z">
                  <i className="ri-arrow-go-back-line" aria-hidden="true" /> Urungkan
                </button>
                <button type="button" className={btnGhost} onClick={() => change(() => defaultOutfit())}>
                  <i className="ri-refresh-line" aria-hidden="true" /> Reset
                </button>
                <button type="button" className={btnGhost} onClick={copyLink}>
                  <i className={copied ? 'ri-check-line' : 'ri-link'} aria-hidden="true" /> {copied ? 'Link tersalin' : 'Salin link'}
                </button>
              </div>
              <div className="mt-4">
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

            <p className="mt-4 text-[11px] text-[color:var(--retro-text-muted)]">{credits.join(' · ')}</p>
          </div>
        </div>
      </div>

      {/* Off-screen card for "Simpan kartu" (capture the inner board, not the moved holder). */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <div ref={cardRef}>
          <CardBoard template={template} outfit={outfit} setLabel={setLabel} name={cleanName(name)} credits={credits} />
        </div>
      </div>
    </div>
  );
};

export default Lemari;
