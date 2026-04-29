/**
 * Wishes Page — birthday wishes wall. Fans submit a short message + handle;
 * after moderation, owner adds it to siteConfig.wishes.seeds and redeploys
 * (or wires Formspree-style endpoint via siteConfig.wishes.endpoint to skip
 * manual moderation).
 *
 * Pure client-side — no live database. Each submission posts to the
 * configured endpoint, then the form swaps to a success state. The wall
 * displays seed wishes from config (curated list).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';
import MarqueeStrip from '../components/wishes/MarqueeStrip';
import MotifBackdrop from '../components/about/MotifBackdrop';
import { WISH_TEMPLATES } from '../components/wishes/templates';
import { submitWish, subscribeToWishes } from '../lib/wishesDb';
import { isFirebaseConfigured } from '../lib/firebase';

// Subtle decorative rotation for each card so the wall feels like sticky
// notes pinned up rather than a uniform grid. Deterministic per index.
const cardTilt = (idx) => {
  const tilts = [-1.2, 0.8, -0.4, 1.5, -0.9, 0.5, -1.6, 1.1];
  return tilts[idx % tilts.length];
};

const WishesPage = () => {
  const wishes = SITE_CONFIG.wishes;
  const eli = SITE_CONFIG.eli;

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // bot trap — humans never fill this
  // Template id chosen by the submitter — defaults to the first template.
  // Stored alongside the wish in RTDB so the wall renders it in the
  // submitter's chosen style instead of cycling.
  const [templateId, setTemplateId] = useState(WISH_TEMPLATES[0].id);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');
  const [liveWishes, setLiveWishes] = useState([]);

  const charsLeft = wishes.charLimit - message.length;
  const isOverLimit = charsLeft < 0;
  const formDisabled = status === 'submitting' || isOverLimit || !name.trim() || !message.trim();

  // Subscribe to live RTDB wishes feed. Cleanup on unmount detaches the listener.
  useEffect(() => {
    const unsubscribe = subscribeToWishes(setLiveWishes);
    return unsubscribe;
  }, []);

  // Curated seeds from siteConfig come first in the wall (chronological),
  // followed by live RTDB wishes (newest first). No visual differentiator —
  // they read as one continuous wall.
  const curatedSeeds = useMemo(
    () =>
      [...(wishes.seeds || [])].sort(
        (a, b) => (b.date || '').localeCompare(a.date || ''),
      ),
    [wishes.seeds],
  );

  const seeds = useMemo(
    () => [...curatedSeeds, ...liveWishes],
    [curatedSeeds, liveWishes],
  );

  const { elementRef: wallRef, isVisible: wallVisible } = useScrollReveal({
    threshold: 0.05,
    rootMargin: '-40px',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isFirebaseConfigured) {
      setStatus('error');
      setError(wishes.demoMessage);
      return;
    }
    setStatus('submitting');
    const result = await submitWish({ name, handle, message, honeypot, template: templateId });
    if (result.ok) {
      setStatus('success');
      setName('');
      setHandle('');
      setMessage('');
      setHoneypot('');
      // Keep templateId as-is so users can quickly post another wish in
      // the same style if they want.
    } else {
      setStatus('error');
      setError(result.error || 'Pesan gagal terkirim, coba lagi sebentar lagi.');
    }
  };

  // Split seeds into two bands for the flying marquee (alternating).
  // Band A gets even-indexed seeds, Band B gets odd-indexed; both scroll
  // in opposite directions at slightly different speeds.
  const marqueeA = seeds.filter((_, i) => i % 2 === 0);
  const marqueeB = seeds.filter((_, i) => i % 2 === 1);

  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
      {/* Ambient motif backdrop — same brand symbology used on Profile,
          but with a wishes-specific seed so the layout differs and won't
          look identical when both pages open in adjacent tabs. */}
      <MotifBackdrop count={50} seed="wishes-2026" />

      {/* Per-card bob keyframe — translates Y so it composes with each
          card's inline `transform: rotate(...)` (the sticky-note tilt) */}
      <style>{`
        @keyframes wish-bob {
          0%, 100% { translate: 0 0; }
          50%      { translate: 0 -8px; }
        }
        .wish-bob {
          animation: wish-bob var(--bob-duration, 5s) ease-in-out var(--bob-delay, 0s) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wish-bob { animation: none !important; }
        }
      `}</style>
      {/* Editorial header */}
      <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
        {/* Watermark wordmark */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-2/5 hidden lg:block pointer-events-none opacity-[0.05]"
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
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-5 text-[color:var(--retro-burgundy)]">
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">{wishes.eyebrow}</span>
            <span className="w-10 h-px bg-[color:var(--retro-burgundy)]/30" />
            <Link
              to="/countdown"
              className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hover:text-[color:var(--retro-burgundy)] transition-colors inline-flex items-center gap-2"
            >
              <i className="ri-cake-2-line text-base" />
              Cek countdown 15 Juni 2026
            </Link>
          </div>

          <h1 className="font-header text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-4xl">
            {wishes.title} <br />
            <span className="text-[color:var(--retro-burgundy)]">{wishes.titleAccent}</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            {wishes.lead}
          </p>
          <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy)]/40 via-[color:var(--retro-brown-dark)]/10 to-transparent" />
        </div>
      </header>

      {/* Submission form — "Surat untuk Eli" editorial concept.
          Cream paper plate (departing from the burgundy block) with a
          burgundy letterhead bar at top, addressee block, letter-style
          form on the left, and a vertical postage column with Eli's
          portrait on the right. Reads like a letter to a pen-pal idol
          rather than a contact form. */}
      <section className="px-4 sm:px-6 md:px-8 lg:px-12 mb-12 md:mb-16">
        <article className="max-w-6xl mx-auto bg-[color:var(--retro-bg-primary)] border border-[color:var(--retro-burgundy)]/15 rounded-2xl shadow-2xl shadow-[color:var(--retro-burgundy)]/15 relative">
          {/* Letterhead — burgundy bar across the top */}
          <header className="bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] px-5 sm:px-7 md:px-10 py-4 flex items-center justify-between gap-4 rounded-t-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <i className="ri-mail-send-line text-xl text-[color:var(--retro-gold-light)] flex-shrink-0" />
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] truncate">
                Surat Ulang Tahun
              </p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60 tabular-nums hidden sm:block flex-shrink-0">
              No. 2026 · Vol. 26
            </p>
          </header>

          {/* Faint blossom watermark in the body */}
          <div
            aria-hidden="true"
            className="absolute right-0 top-16 bottom-0 w-2/5 hidden md:block pointer-events-none opacity-[0.04] z-0"
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

          <div className="relative grid md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px] gap-0 z-[1]">
            {/* LEFT — letter content */}
            <div className="px-5 py-7 sm:px-7 sm:py-9 md:px-8 md:py-10 lg:px-10 md:border-r border-dashed border-[color:var(--retro-burgundy)]/20 order-2 md:order-1">
              {/* Addressee block — like the "To:" line on a real letter */}
              <div className="mb-6 pb-5 border-b border-dashed border-[color:var(--retro-burgundy)]/20">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-1.5">
                  Kepada
                </p>
                <p className="font-header text-xl sm:text-2xl font-black text-[color:var(--retro-text-primary)] leading-tight tracking-tight">
                  Helisma Putri
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mt-1">
                  {eli.stageName} JKT48 · Team Dream
                </p>
              </div>

              {/* Title + lead */}
              <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-[0.95] text-[color:var(--retro-text-primary)] mb-3">
                Suratmu, langsung di
                <span className="text-[color:var(--retro-burgundy)]"> wall.</span>
              </h2>
              <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed mb-7 max-w-md">
                {isFirebaseConfigured ? wishes.pendingMessage : wishes.demoMessage}
              </p>

              {status === 'success' ? (
                <div className="rounded-2xl bg-[color:var(--retro-burgundy)]/[0.04] border-2 border-dashed border-[color:var(--retro-burgundy)]/30 p-6 text-center">
                  <i className="ri-checkbox-circle-line text-4xl text-[color:var(--retro-burgundy)] mb-3 inline-block" />
                  <p className="font-bold text-[color:var(--retro-text-primary)] mb-1">{wishes.successMessage}</p>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-text-primary)] transition-colors"
                  >
                    <i className="ri-add-line" /> Tulis lagi
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                        Dari <span className="text-[color:var(--retro-burgundy)]/60">*</span>
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        placeholder="Nama panggilan"
                        className="mt-1 w-full px-4 py-3 rounded-lg bg-white border border-[color:var(--retro-burgundy)]/20 focus:border-[color:var(--retro-burgundy)] focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/20 focus:outline-none text-[color:var(--retro-text-primary)] placeholder-[color:var(--color-text-muted)] text-sm transition-colors"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                        Handle (opsional)
                      </span>
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        maxLength={40}
                        placeholder="@handle X / IG"
                        className="mt-1 w-full px-4 py-3 rounded-lg bg-white border border-[color:var(--retro-burgundy)]/20 focus:border-[color:var(--retro-burgundy)] focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/20 focus:outline-none text-[color:var(--retro-text-primary)] placeholder-[color:var(--color-text-muted)] text-sm transition-colors"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                        Isi surat <span className="text-[color:var(--retro-burgundy)]/60">*</span>
                      </span>
                      <span
                        className={`text-[10px] font-black tabular-nums ${
                          isOverLimit
                            ? 'text-red-500'
                            : charsLeft < 30
                            ? 'text-[color:var(--retro-burgundy)]'
                            : 'text-[color:var(--color-text-muted)]'
                        }`}
                      >
                        {charsLeft}
                      </span>
                    </div>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Tulis ucapan singkat untuk Ceu Eli..."
                      className="mt-1 w-full px-4 py-3 rounded-lg bg-white border border-[color:var(--retro-burgundy)]/20 focus:border-[color:var(--retro-burgundy)] focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/20 focus:outline-none text-[color:var(--retro-text-primary)] placeholder-[color:var(--color-text-muted)] text-sm leading-relaxed transition-colors resize-none"
                    />
                  </label>

                  {/* Template picker — chips on cream bg use white tile +
                      burgundy outline; selected fills with burgundy. Strip
                      stays a horizontal swipe carousel on all viewports. */}
                  <fieldset>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                        Tampilan kartu — preview live
                      </legend>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] inline-flex items-center gap-1.5 flex-shrink-0">
                        <i className="ri-arrow-left-line" />
                        Geser
                        <i className="ri-arrow-right-line" />
                      </span>
                    </div>
                    <div
                      className="-mx-1 px-1 flex gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar snap-x snap-proximity overscroll-x-contain"
                      style={{
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-x',
                      }}
                    >
                      {WISH_TEMPLATES.map((tpl, tplIdx) => {
                        const selected = tpl.id === templateId;
                        const PreviewCard = tpl.Component;
                        const sampleWish = {
                          name: name || 'Armeniaca',
                          handle: handle || '@armeniaca15',
                          message:
                            message ||
                            'Selamat ulang tahun, Ceu Eli! Tetap mekar seperti aprikot di musim semi.',
                          date: new Date().toISOString(),
                        };
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setTemplateId(tpl.id)}
                            aria-pressed={selected}
                            title={tpl.label}
                            className={`flex-shrink-0 w-[75vw] max-w-[260px] sm:w-[220px] sm:max-w-[240px] snap-center sm:snap-start touch-pan-x flex flex-col items-stretch gap-2 p-2 rounded-xl transition-all ${
                              selected
                                ? 'bg-[color:var(--retro-burgundy)] ring-2 ring-[color:var(--retro-burgundy)] -translate-y-0.5 shadow-lg shadow-[color:var(--retro-burgundy)]/30'
                                : 'bg-white ring-1 ring-[color:var(--retro-burgundy)]/15 hover:ring-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5'
                            }`}
                          >
                            <div
                              aria-hidden="true"
                              className="relative w-full h-[220px] sm:w-[204px] sm:h-[160px] overflow-hidden rounded-lg pointer-events-none bg-[color:var(--retro-bg-primary)]"
                            >
                              <div
                                className="absolute top-0 left-0 origin-top-left scale-[0.85] sm:scale-[0.64]"
                                style={{ width: '320px', height: '260px' }}
                              >
                                <PreviewCard wish={sampleWish} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-1">
                              <span
                                className={`text-[9px] font-black uppercase tracking-[0.25em] tabular-nums ${
                                  selected ? 'text-[color:var(--retro-gold-light)]' : 'text-[color:var(--retro-burgundy)]/60'
                                }`}
                              >
                                {String(tplIdx + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`text-[10px] font-black uppercase tracking-[0.18em] truncate ${
                                  selected ? 'text-[color:var(--retro-cream)]' : 'text-[color:var(--retro-text-primary)]'
                                }`}
                              >
                                {tpl.label}
                              </span>
                              {selected && (
                                <i className="ri-check-line ml-auto text-base text-[color:var(--retro-gold-light)]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  {/* Honeypot — invisible to humans, irresistible to spam bots */}
                  <div aria-hidden="true" className="absolute left-[-9999px] w-px h-px overflow-hidden">
                    <label>
                      Website (jangan diisi)
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </label>
                  </div>

                  {status === 'error' && error && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  {/* Submit — styled like a wax-seal stamp */}
                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={formDisabled}
                      className="inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] font-bold text-sm uppercase tracking-widest shadow-xl shadow-[color:var(--retro-burgundy)]/30 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-2xl transition-all"
                    >
                      {status === 'submitting' ? (
                        <>
                          <i className="ri-loader-4-line animate-spin" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <i className="ri-send-plane-fill" />
                          {wishes.formCta}
                        </>
                      )}
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:block">
                      Terkirim · langsung di wall
                    </p>
                  </div>
                </form>
              )}

              {/* Sign-off */}
              <div className="mt-7 pt-5 border-t border-dashed border-[color:var(--retro-burgundy)]/20 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
                  armeniaca.online
                </span>
                <span className="w-6 h-px bg-[color:var(--retro-burgundy)]/30" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
                  #BloomInSpring
                </span>
              </div>
            </div>

            {/* RIGHT — postage column with Eli portrait + stamp box.
                Mobile: stacks ABOVE the form as a hero banner. md+: vertical
                strip on the right with the portrait + a postage-stamp tile. */}
            <aside className="relative order-1 md:order-2 min-h-[260px] md:min-h-[560px] lg:min-h-[640px] overflow-hidden md:rounded-tr-2xl md:rounded-br-2xl bg-[color:var(--retro-burgundy)]">
              <img
                src="/archive/img-024.jpg"
                alt={`Portrait ${eli.stageName} (${eli.fullName || 'Helisma Putri'})`}
                loading="eager"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-[50%_30%]"
              />
              {/* Burgundy gradient softens the image into the rest of the card */}
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-burgundy)] via-[color:var(--retro-burgundy)]/30 to-transparent" />
              {/* Postage stamp — top-right */}
              <div className="absolute top-4 right-4 w-[88px] border-2 border-dashed border-[color:var(--retro-cream)]/60 rounded bg-[color:var(--retro-cream)]/15 backdrop-blur-md text-center px-2 py-2.5">
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)]">
                  Date
                </p>
                <p className="font-header text-base font-black text-[color:var(--retro-cream)] leading-tight tabular-nums my-0.5">
                  15.06.26
                </p>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                  Birthday
                </p>
              </div>
              {/* Sealed-with footer */}
              <div className="absolute bottom-5 left-5 right-5 text-[color:var(--retro-cream)]">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-1">
                  Sealed with
                </p>
                <p className="font-header text-2xl sm:text-3xl font-black leading-tight tracking-tight">
                  #BloomInSpring
                </p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
                  {eli.stageName} · 2026
                </p>
              </div>
            </aside>
          </div>
        </article>
      </section>

      {/* Flying marquee — wishes drift past in two opposite-direction bands.
          Edge-to-edge (breaks out of container max-w) for the full sky-of-
          wishes feel. */}
      {seeds.length > 0 && (
        <section aria-label="Wishes terbang" className="mb-12 md:mb-16">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
              <i className="ri-send-plane-2-line text-base" />
              Wishes terbang lewat
            </p>
          </div>
          <div className="space-y-3">
            {marqueeA.length > 0 && (
              <MarqueeStrip wishes={marqueeA} direction="left" durationS={55} ariaLabel="Band wishes — kanan ke kiri" />
            )}
            {marqueeB.length > 0 && (
              <MarqueeStrip wishes={marqueeB} direction="right" durationS={70} ariaLabel="Band wishes — kiri ke kanan" />
            )}
          </div>
        </section>
      )}

      {/* Wall */}
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
              Wall · {seeds.length} ucapan
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:block">
              Kurasi terbaru di atas
            </p>
          </div>

          {seeds.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-burgundy)]/[0.02] p-10 text-center">
              <i className="ri-mail-send-line text-4xl text-[color:var(--retro-burgundy)]/40 mb-3 inline-block" />
              <p className="text-[color:var(--retro-text-primary)] font-bold">
                Belum ada ucapan yang dimoderasi.
              </p>
              <p className="text-sm text-[color:var(--color-text-muted)] mt-1">
                Jadilah yang pertama lewat form di atas.
              </p>
            </div>
          ) : (
            <div
              ref={wallRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            >
              {seeds.map((wish, idx) => {
                const tilt = cardTilt(idx);
                // Prefer the template the submitter chose. Fall back to
                // a per-index cycle for curated seeds (no template field)
                // and for any legacy live wishes saved before the picker
                // existed.
                const template =
                  WISH_TEMPLATES.find((t) => t.id === wish.template) ||
                  WISH_TEMPLATES[idx % WISH_TEMPLATES.length];
                const Card = template.Component;
                return (
                  <div
                    key={wish.id || `${wish.name}-${wish.date}-${idx}`}
                    style={{
                      transitionDelay: `${idx * 50}ms`,
                      transform: `rotate(${tilt}deg)`,
                      ['--bob-duration']: `${4 + (idx % 4)}s`,
                      ['--bob-delay']: `${(idx * 0.4) % 3}s`,
                    }}
                    className={`wish-bob hover:rotate-0 transition-all duration-500 relative ${
                      wallVisible
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-6'
                    }`}
                    data-template={template.id}
                  >
                    <Card wish={wish} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default WishesPage;
