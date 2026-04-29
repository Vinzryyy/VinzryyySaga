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

      {/* Submission form — og-card style: editorial burgundy plate with
          eyebrow + oversized display title on the left, Eli portrait
          peeking from the right. On mobile the portrait stacks on top
          like a hero banner; on lg+ it lives beside the form. */}
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-12 md:mb-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-[2rem] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] relative overflow-hidden shadow-2xl shadow-[color:var(--retro-burgundy)]/30">
            <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none z-[1]" />
            <div className="absolute -bottom-32 -left-32 w-[280px] h-[280px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none z-[1]" />

            <div className="relative grid lg:grid-cols-[1.7fr_1fr] gap-0 z-[2]">
              {/* LEFT — text + form */}
              <div className="p-6 sm:p-8 md:p-10 lg:p-12 order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)]">
                  ★ Form Ucapan
                </span>
                <span className="flex-1 h-px bg-[color:var(--retro-gold-light)]/40" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/50">
                  Live Wall
                </span>
              </div>
              <h2 className="font-header text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-black leading-[0.95] tracking-tighter mb-3">
                Tulis pesan untuk
                <span className="text-[color:var(--retro-gold-light)]"> {eli.nickname}.</span>
              </h2>
              <p className="text-sm md:text-base text-[color:var(--retro-cream)]/70 leading-relaxed mb-6 max-w-md">
                {isFirebaseConfigured ? wishes.pendingMessage : wishes.demoMessage}
              </p>

              {status === 'success' ? (
                <div className="rounded-2xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 p-6 text-center">
                  <i className="ri-checkbox-circle-line text-4xl text-[color:var(--retro-gold-light)] mb-3 inline-block" />
                  <p className="font-bold mb-2">{wishes.successMessage}</p>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] hover:text-[color:var(--retro-cream)] transition-colors"
                  >
                    <i className="ri-add-line" /> Tulis lagi
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                        Nama <span className="text-[color:var(--retro-gold-light)]">*</span>
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        placeholder="Nama panggilan"
                        className="mt-1 w-full px-4 py-3 rounded-xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 focus:border-[color:var(--retro-gold-light)] focus:ring-2 focus:ring-[color:var(--retro-gold-light)]/30 focus:outline-none text-[color:var(--retro-cream)] placeholder-[color:var(--retro-cream)]/40 text-sm transition-colors"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                        Handle (opsional)
                      </span>
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        maxLength={40}
                        placeholder="@handle X / IG"
                        className="mt-1 w-full px-4 py-3 rounded-xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 focus:border-[color:var(--retro-gold-light)] focus:ring-2 focus:ring-[color:var(--retro-gold-light)]/30 focus:outline-none text-[color:var(--retro-cream)] placeholder-[color:var(--retro-cream)]/40 text-sm transition-colors"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                        Pesan <span className="text-[color:var(--retro-gold-light)]">*</span>
                      </span>
                      <span
                        className={`text-[10px] font-black tabular-nums ${
                          isOverLimit
                            ? 'text-[#FF8B7A]'
                            : charsLeft < 30
                            ? 'text-[color:var(--retro-gold-light)]'
                            : 'text-[color:var(--retro-cream)]/50'
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
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 focus:border-[color:var(--retro-gold-light)] focus:ring-2 focus:ring-[color:var(--retro-gold-light)]/30 focus:outline-none text-[color:var(--retro-cream)] placeholder-[color:var(--retro-cream)]/40 text-sm leading-relaxed transition-colors resize-none"
                    />
                  </label>

                  {/* Template picker — each option renders a real, scaled-down
                      version of its template using sample content. Clicking
                      selects; selected card gets a cream ring + lift. The
                      preview is wrapped in `pointer-events-none` so clicks
                      land on the outer button regardless of inner element
                      shapes. */}
                  <fieldset>
                    <legend className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70 mb-3">
                      Pilih tampilan kartu — preview live
                    </legend>
                    {/* Mobile: horizontal swipe strip — keeps the picker
                        from eating 5 vertical rows on small screens.
                        sm+: flex-wrap so chips reflow to multiple rows. */}
                    <div className="-mx-1 px-1 flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-x-visible scrollbar-hide no-scrollbar">
                      {WISH_TEMPLATES.map((tpl, tplIdx) => {
                        const selected = tpl.id === templateId;
                        const PreviewCard = tpl.Component;
                        // Live preview content. If the user has typed a
                        // name/message the preview fills with it; otherwise
                        // a tasteful placeholder so the layout still reads.
                        const sampleWish = {
                          name: name || 'Helismiley',
                          handle: handle || '@helismiley',
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
                            className={`flex-shrink-0 w-[200px] flex flex-col items-stretch gap-2 p-2 rounded-xl transition-all ${
                              selected
                                ? 'bg-[color:var(--retro-cream)]/15 ring-2 ring-[color:var(--retro-gold-light)] -translate-y-0.5 shadow-lg'
                                : 'bg-[color:var(--retro-cream)]/5 ring-1 ring-[color:var(--retro-cream)]/10 hover:bg-[color:var(--retro-cream)]/10 hover:ring-[color:var(--retro-cream)]/30'
                            }`}
                          >
                            {/* Scaled preview — inner renders at 320×260,
                                outer is 200×170 (scale 0.625 fits 200 wide
                                exactly; height clips the bottom 5px which
                                is just card padding). Big enough to read
                                eyebrows + names + first line of message. */}
                            <div
                              aria-hidden="true"
                              className="relative w-[184px] h-[160px] overflow-hidden rounded-lg pointer-events-none bg-[color:var(--retro-cream)]/5"
                            >
                              <div
                                className="absolute top-0 left-0 origin-top-left"
                                style={{
                                  width: '320px',
                                  height: '260px',
                                  transform: 'scale(0.575)',
                                }}
                              >
                                <PreviewCard wish={sampleWish} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-1">
                              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-gold-light)] opacity-70 tabular-nums">
                                {String(tplIdx + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`text-[10px] font-black uppercase tracking-[0.18em] truncate ${
                                  selected ? 'text-[color:var(--retro-cream)]' : 'text-[color:var(--retro-cream)]/70'
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

                  {/* Honeypot — invisible to humans, irresistible to spam bots.
                      Off-screen, aria-hidden, tab-skipped. If a submission
                      arrives with this field filled, wishesDb silently
                      rejects it (returns ok=true so the bot thinks success). */}
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
                    <p className="text-xs text-[#FFB1A2] bg-[#FF8B7A]/10 border border-[#FF8B7A]/30 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={formDisabled}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] font-bold text-sm uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all"
                  >
                    {status === 'submitting' ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line" />
                        {wishes.formCta}
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Signature footer — mirrors og-card's bottom strip */}
              <div className="mt-6 pt-4 border-t border-[color:var(--retro-cream)]/15 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)]">
                  armeniaca.online
                </span>
                <span className="w-6 h-px bg-[color:var(--retro-cream)]/20" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/50">
                  #BloomInSpring
                </span>
              </div>
              </div>

              {/* RIGHT — portrait peeking from the side, like og-card */}
              <div className="relative order-1 lg:order-2 min-h-[280px] lg:min-h-0 overflow-hidden">
                <picture>
                  <source srcSet="/archive/img-024.avif" type="image/avif" />
                  <source srcSet="/archive/img-024.webp" type="image/webp" />
                  <img
                    src="/archive/img-024.jpg"
                    alt={`Portrait ${eli.stageName} (${eli.fullName || 'Helisma Putri'})`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover object-[50%_30%]"
                  />
                </picture>
                {/* Mobile fade — top edge fades into burgundy so eyebrow row stays readable */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[color:var(--retro-burgundy)] to-transparent lg:hidden" />
                {/* Mobile fade — bottom edge fades into burgundy so the form below blends */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[color:var(--retro-burgundy)] to-transparent lg:hidden" />
                {/* Desktop fade — left edge fades into burgundy so the form text doesn't crash into the photo */}
                <div className="hidden lg:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[color:var(--retro-burgundy)] to-transparent" />
                <span className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-[color:var(--retro-cream)]/15 backdrop-blur-md text-[color:var(--retro-cream)] text-[9px] font-black uppercase tracking-[0.3em] border border-[color:var(--retro-cream)]/20">
                  Eli · 15.06
                </span>
              </div>
            </div>
          </div>
        </div>
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
