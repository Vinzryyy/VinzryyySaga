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

  // Seeds = curated/pinned wishes from siteConfig, marked with `pinned: true`
  // so the wall can render a small badge on them.
  const pinnedSeeds = useMemo(
    () =>
      [...(wishes.seeds || [])]
        .map((s) => ({ ...s, pinned: true }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [wishes.seeds],
  );

  // Combined feed: pinned seeds first, then live wishes (newest first).
  const seeds = useMemo(
    () => [...pinnedSeeds, ...liveWishes],
    [pinnedSeeds, liveWishes],
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
    const result = await submitWish({ name, handle, message, honeypot });
    if (result.ok) {
      setStatus('success');
      setName('');
      setHandle('');
      setMessage('');
      setHoneypot('');
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
    <main className="bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
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

      {/* Submission form */}
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-12 md:mb-16">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-[2rem] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-6 sm:p-8 md:p-10 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />

            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-3">
                Form Ucapan
              </p>
              <h2 className="font-header text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tighter mb-2">
                Tulis pesan singkat untuk {eli.nickname}.
              </h2>
              <p className="text-sm text-[color:var(--retro-cream)]/70 mb-6">
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
                // Cycle through the 5 templates so the wall demos all of
                // them. Once you pick a favourite, swap this for a fixed
                // index (e.g. WISH_TEMPLATES[0].Component) or a per-wish
                // template id stored on the seed object.
                const template = WISH_TEMPLATES[idx % WISH_TEMPLATES.length];
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
                    {wish.pinned && (
                      <span className="absolute -top-2 -right-2 z-10 px-2.5 py-0.5 rounded-full bg-[color:var(--retro-gold)] text-[color:var(--retro-brown-dark)] text-[9px] font-black uppercase tracking-[0.3em] shadow-md">
                        ★ Pinned
                      </span>
                    )}
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
