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
import Seo from '../components/Seo';
import MarqueeStrip from '../components/wishes/MarqueeStrip';
import MotifBackdrop from '../components/about/MotifBackdrop';
import FloatingPetals from '../components/countdown/FloatingPetals';
import { WISH_TEMPLATES } from '../components/wishes/templates';
import {
  submitWish,
  subscribeToWishes,
  subscribeToWishCount,
  subscribeToHearts,
  incrementWishHearts,
} from '../lib/wishesDb';
import { isFirebaseConfigured } from '../lib/firebase';

// Subtle decorative rotation for each card so the wall feels like sticky
// notes pinned up rather than a uniform grid. Deterministic per index.
const cardTilt = (idx) => {
  const tilts = [-1.2, 0.8, -0.4, 1.5, -0.9, 0.5, -1.6, 1.1];
  return tilts[idx % tilts.length];
};

// Stable id for curated seeds (siteConfig has no push-id) so heart
// counts can persist for them too. djb2-style hash on name + date.
const seedHashId = (seed) => {
  const str = `${seed.name || ''}|${seed.date || ''}|${(seed.message || '').slice(0, 40)}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return `seed-${(h >>> 0).toString(36)}`;
};

// localStorage key for tracking which wishes the current device has
// already hearted. Stops double-counts from accidental retap. Server
// trusts the request; throttling lives in RTDB rules.
const HEARTS_LS_KEY = 'armeniaca-wish-hearts-v1';
const loadHeartedSet = () => {
  try {
    const raw = localStorage.getItem(HEARTS_LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
};
const persistHeartedSet = (set) => {
  try {
    localStorage.setItem(HEARTS_LS_KEY, JSON.stringify([...set]));
  } catch {
    /* private mode / quota — just no persistence */
  }
};

// Open X's tweet intent prefilled with the wish. Stays in a popup so the
// user can post without losing the wishes wall. Body is trimmed so the
// quote + attribution + auto-appended URL stay under X's 280 limit (URL
// is counted as ~23 chars regardless of length).
const shareWishToX = (wish) => {
  const attribution = ` — ${wish.name || 'Anon'}`;
  const MAX_BODY = 200;
  const raw = wish.message || '';
  const room = MAX_BODY - attribution.length - 2; // 2 = the surrounding quotes
  const trimmed = raw.length > room ? `${raw.slice(0, room - 1).trimEnd()}…` : raw;
  const body = `"${trimmed}"${attribution}`;
  const intent = new URL('https://x.com/intent/tweet');
  intent.searchParams.set('text', body);
  intent.searchParams.set('url', `${SITE_CONFIG.site.url}/wishes`);
  intent.searchParams.set('hashtags', 'EliJKT48,BloomInSpring');
  window.open(intent.toString(), '_blank', 'noopener,noreferrer,width=550,height=520');
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Terbaru', icon: 'ri-time-line' },
  { id: 'oldest', label: 'Tertua', icon: 'ri-history-line' },
  { id: 'liked', label: 'Paling Disukai', icon: 'ri-heart-fill' },
  { id: 'random', label: 'Acak', icon: 'ri-shuffle-line' },
];

const WishesPage = () => {
  const wishes = SITE_CONFIG.wishes;
  const eli = SITE_CONFIG.eli;

  // Birthday takeover — once 15 Juni 2026 (countdown.targetIso) has
  // passed, swap the page header to the celebration copy. Form stays
  // open so late wishes still land. Re-checks every 60s so a visitor
  // sitting on the page at midnight gets the swap without a refresh.
  const targetMs = useMemo(() => {
    const t = new Date(SITE_CONFIG.countdown.targetIso).getTime();
    return Number.isNaN(t) ? null : t;
  }, []);
  const [isBirthdayPassed, setIsBirthdayPassed] = useState(
    () => targetMs != null && Date.now() >= targetMs,
  );
  useEffect(() => {
    if (targetMs == null || isBirthdayPassed) return undefined;
    const tick = () => {
      if (Date.now() >= targetMs) setIsBirthdayPassed(true);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetMs, isBirthdayPassed]);
  const headerEyebrow = isBirthdayPassed ? wishes.completedEyebrow : wishes.eyebrow;
  const headerTitle = isBirthdayPassed ? wishes.completedTitle : wishes.title;
  const headerTitleAccent = isBirthdayPassed ? wishes.completedTitleAccent : wishes.titleAccent;
  const headerLead = isBirthdayPassed ? wishes.completedLead : wishes.lead;
  const countdownLinkLabel = isBirthdayPassed
    ? wishes.completedCountdownLink
    : 'Cek countdown 15 Juni 2026';

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // bot trap — humans never fill this
  // Template id for the wall card style. Picker lives in a separate
  // section below the form (not inside the burgundy plate) so the form
  // stays focused on writing the message.
  const [templateId, setTemplateId] = useState(WISH_TEMPLATES[0].id);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');
  const [liveWishes, setLiveWishes] = useState([]);
  // True RTDB wish count — independent of the wall's render cap so the
  // header pill stays accurate even when total exceeds WISHES_PAGE_SIZE.
  const [liveWishCount, setLiveWishCount] = useState(0);
  const [heartCounts, setHeartCounts] = useState({});
  const [heartedIds, setHeartedIds] = useState(() => loadHeartedSet());
  const [sortMode, setSortMode] = useState('newest');
  // Random sort needs a seed that changes when the user explicitly
  // re-clicks the chip (so they get a fresh shuffle on demand). Stored
  // as a counter so increments trigger a useMemo recompute.
  const [randomNonce, setRandomNonce] = useState(0);

  const charsLeft = wishes.charLimit - message.length;
  const isOverLimit = charsLeft < 0;
  const formDisabled = status === 'submitting' || isOverLimit || !name.trim() || !message.trim();

  // Subscribe to live RTDB wishes feed + per-wish heart counts + the
  // total count (separate from the wall cap so the header reports real
  // submissions even past WISHES_PAGE_SIZE).
  useEffect(() => {
    const unsubWishes = subscribeToWishes(setLiveWishes);
    const unsubCount = subscribeToWishCount(setLiveWishCount);
    const unsubHearts = subscribeToHearts(setHeartCounts);
    return () => {
      unsubWishes();
      unsubCount();
      unsubHearts();
    };
  }, []);

  const handleHeart = async (wishId) => {
    if (!wishId || heartedIds.has(wishId)) return;
    // Optimistic local mark — the RTDB subscription will reconcile
    // the count on the next snapshot.
    const next = new Set(heartedIds);
    next.add(wishId);
    setHeartedIds(next);
    persistHeartedSet(next);
    if (isFirebaseConfigured) {
      const result = await incrementWishHearts(wishId);
      if (!result.ok) {
        // Roll back so user can try again.
        const rollback = new Set(next);
        rollback.delete(wishId);
        setHeartedIds(rollback);
        persistHeartedSet(rollback);
      }
    }
  };

  // Curated seeds from siteConfig — assigned a stable hash id so heart
  // counts can attach to them just like RTDB wishes. The hash is
  // deterministic from name+date+message so reloads don't reset
  // counts.
  const curatedSeeds = useMemo(
    () =>
      [...(wishes.seeds || [])]
        .map((s) => ({ ...s, id: s.id || seedHashId(s) }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [wishes.seeds],
  );

  // Combined list of curated seeds + live RTDB wishes with hearts
  // merged in. Sort happens later — this is the unsorted pool.
  const allWishes = useMemo(
    () =>
      [...curatedSeeds, ...liveWishes].map((w) => ({
        ...w,
        hearts: heartCounts[w.id] || 0,
      })),
    [curatedSeeds, liveWishes, heartCounts],
  );

  // Sorted view — drives the marquee + wall. The four sort modes:
  //   newest = date desc, oldest = date asc, liked = hearts desc,
  //   random = stable shuffle keyed by randomNonce so re-clicking
  //   the chip reshuffles without re-rendering on every state change.
  const seeds = useMemo(() => {
    const list = [...allWishes];
    if (sortMode === 'oldest') {
      return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }
    if (sortMode === 'liked') {
      return list.sort((a, b) => (b.hearts || 0) - (a.hearts || 0));
    }
    if (sortMode === 'random') {
      // Fisher-Yates with a deterministic seed (id-based) so React
      // reconciliation stays cheap during the same shuffle. randomNonce
      // is intentionally part of the seed so re-clicking reshuffles.
      const seeded = list.map((w, i) => ({
        w,
        // simple deterministic mix of id + nonce
        k: ((w.id || `${i}`).charCodeAt(0) * 9301 + randomNonce * 49297) & 0x7fffffff,
      }));
      seeded.sort((a, b) => a.k - b.k);
      return seeded.map((s) => s.w);
    }
    // newest
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [allWishes, sortMode, randomNonce]);
  // Live counter for the header pill — total of curated seeds plus the
  // TRUE RTDB count (not the wall-capped liveWishes length). Increments
  // in real time as fans submit, never under-reports past the cap.
  const totalWishCount = curatedSeeds.length + liveWishCount;
  // Detect when wall is showing fewer cards than total (real count
  // exceeds WISHES_PAGE_SIZE → divergence between header pill and wall
  // body). Surfaces a small "menampilkan X dari Y" hint so the gap is
  // explained instead of looking like a counting bug.
  const wallCappedAt = seeds.length < totalWishCount ? seeds.length : null;

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
      <Seo
        title="Wishes untuk Eli"
        description="Ucapan dan harapan dari fans untuk Helisma Putri (Eli JKT48). Wishes wall perayaan ulang tahun ke-26 pada 15 Juni 2026."
        path="/wishes"
      />
      {/* Ambient motif backdrop — same brand symbology used on Profile,
          but with a wishes-specific seed so the layout differs and won't
          look identical when both pages open in adjacent tabs. */}
      <MotifBackdrop count={50} seed="wishes-2026" />
      {/* Floating petals — same drift effect used on /countdown,
          dialed in via the component's own low-opacity defaults
          (~0.25-0.4). Adds birthday atmosphere over the wishes wall
          without distracting from reading. Honors prefers-reduced-motion. */}
      <FloatingPetals />

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
      {/* Editorial header — full-bleed photo + brown-dark gradient
          overlay, matching the treatment on /schedule, /profile, and
          /about. img-087 picked here so each page still has its own
          portrait. */}
      <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/archive/img-353.webp)',
            backgroundSize: 'cover',
            backgroundPosition: '50% 30%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(61, 52, 43, 0.92) 0%, rgba(61, 52, 43, 0.85) 40%, rgba(252, 244, 230, 0.95) 75%, var(--retro-bg-primary) 100%)',
          }}
        />
        {/* Wordmark watermark — re-tinted to cream so it still reads
            on the new dark overlay. */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-2/5 hidden lg:block pointer-events-none opacity-[0.08]"
          style={{
            maskImage: 'url(/logo-armeniaca.png)',
            WebkitMaskImage: 'url(/logo-armeniaca.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'right center',
            WebkitMaskPosition: 'right center',
            backgroundColor: 'var(--retro-cream)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-5 text-[color:var(--retro-burgundy-light)] flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">{headerEyebrow}</span>
            <span className="w-10 h-px bg-[color:var(--retro-burgundy-light)]/50" />
            <Link
              to="/happy-helisma-day-26"
              className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/65 hover:text-[color:var(--retro-burgundy-light)] transition-colors inline-flex items-center gap-2"
            >
              <i className="ri-cake-2-line text-base" />
              {countdownLinkLabel}
            </Link>
            {/* Live counter pill — total wish count from RTDB +
                curated seeds. Updates in real time as fans submit. */}
            {totalWishCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] px-2.5 py-1 rounded-full bg-[color:var(--retro-burgundy-light)]/15 text-[color:var(--retro-burgundy-light)] border border-[color:var(--retro-burgundy-light)]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {totalWishCount} ucapan terkumpul
              </span>
            )}
          </div>

          <h1 className="font-header text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-[color:var(--retro-cream)] leading-[0.95] max-w-4xl drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
            {headerTitle} <br />
            <span className="text-[color:var(--retro-burgundy-light)]">{headerTitleAccent}</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[color:var(--retro-text-primary)] leading-relaxed max-w-2xl">
            {headerLead}
          </p>
          <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy-light)]/40 via-[color:var(--retro-cream)]/15 to-transparent" />
        </div>
      </header>

      {/* Submission form + template picker — hidden post-birthday
          (collecting phase over). */}
      {!isBirthdayPassed && (<>
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-12 md:mb-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-[2rem] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] relative overflow-hidden shadow-2xl shadow-[color:var(--retro-burgundy)]/30">
            <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none z-[1]" />
            <div className="absolute -bottom-32 -left-32 w-[280px] h-[280px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none z-[1]" />

            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-0 z-[2]">
              {/* LEFT — text + form */}
              <div className="p-6 sm:p-8 md:p-10 lg:p-12 order-2 md:order-1">
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

              {/* RIGHT — portrait peeking from the side */}
              <div className="relative order-1 md:order-2 min-h-[260px] md:min-h-[560px] overflow-hidden">
                <img
                  src="/archive/img-024.webp"
                  alt={`Portrait ${eli.stageName} (${eli.fullName || 'Helisma Putri'})`}
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-[50%_30%]"
                />
                {/* Mobile fades — top + bottom edges fade into burgundy */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[color:var(--retro-burgundy)] to-transparent md:hidden" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[color:var(--retro-burgundy)] to-transparent md:hidden" />
                {/* Tablet+ fade — left edge fades into burgundy so form text doesn't crash into the photo */}
                <div className="hidden md:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[color:var(--retro-burgundy)] to-transparent" />
                <span className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-[color:var(--retro-cream)]/15 backdrop-blur-md text-[color:var(--retro-cream)] text-[9px] font-black uppercase tracking-[0.3em] border border-[color:var(--retro-cream)]/20">
                  Eli · 15.06
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Template picker — separate section below the form so the burgundy
          plate stays clean. Submitter taps a chip; the chosen template id
          is sent with the wish so the wall renders it in that style. */}
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-12 md:mb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-1">
                Pilih Tampilan Kartu
              </p>
              <p className="text-xs text-[color:var(--color-text-muted)]">
                Preview live — pesanmu akan tampil di wall dengan tampilan ini.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] inline-flex items-center gap-1.5 flex-shrink-0">
              <i className="ri-arrow-left-line" />
              Geser
              <i className="ri-arrow-right-line" />
            </span>
          </div>
          <div
            className="-mx-1 px-1 flex gap-3 overflow-x-auto pb-3 scrollbar-hide no-scrollbar snap-x snap-proximity overscroll-x-contain"
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
        </div>
      </section>
      </>)}

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
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-16 md:pb-24 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
              Wall ·{' '}
              {wallCappedAt
                ? `menampilkan ${wallCappedAt} dari ${totalWishCount} ucapan`
                : `${seeds.length} ucapan`}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:block">
              Tap kartu untuk kasih ❤
            </p>
          </div>

          {/* Sort chips — Terbaru / Tertua / Paling Disukai / Acak.
              Stays visible above the wall on all breakpoints. Random
              re-click reshuffles via randomNonce. */}
          <div
            className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide"
            role="tablist"
            aria-label="Urutkan wishes"
          >
            {SORT_OPTIONS.map((opt) => {
              const active = opt.id === sortMode;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (opt.id === 'random' && active) {
                      setRandomNonce((n) => n + 1);
                    } else {
                      setSortMode(opt.id);
                      if (opt.id === 'random') setRandomNonce((n) => n + 1);
                    }
                  }}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all border ${
                    active
                      ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)] shadow-md'
                      : 'bg-white text-[color:var(--retro-text-secondary)] border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)]'
                  }`}
                >
                  <i className={opt.icon} />
                  {opt.label}
                </button>
              );
            })}
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
              className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6"
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
                const wishId = wish.id;
                const hearted = wishId ? heartedIds.has(wishId) : false;
                const heartCount = wish.hearts || 0;
                return (
                  <div
                    key={wishId || `${wish.name}-${wish.date}-${idx}`}
                    style={{
                      transitionDelay: `${idx * 50}ms`,
                      transform: `rotate(${tilt}deg)`,
                      ['--bob-duration']: `${4 + (idx % 4)}s`,
                      ['--bob-delay']: `${(idx * 0.4) % 3}s`,
                    }}
                    className={`wish-bob hover:rotate-0 transition-all duration-500 relative break-inside-avoid mb-4 md:mb-6 ${
                      wallVisible
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-6'
                    }`}
                    data-template={template.id}
                  >
                    <Card wish={wish} />
                    {/* Action cluster — share opens X intent, heart bumps
                        the count via RTDB. Both styled the same so they
                        read as a paired control rather than two stickers. */}
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => shareWishToX(wish)}
                        aria-label="Bagikan ucapan ke X"
                        title="Bagikan ke X"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[10px] font-black transition-all shadow-md bg-white/95 backdrop-blur-sm text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <i className="ri-twitter-x-line text-sm" />
                      </button>
                      {wishId && (
                        <button
                          type="button"
                          onClick={() => handleHeart(wishId)}
                          disabled={hearted}
                          aria-label={hearted ? `Sudah disukai (${heartCount})` : `Suka ucapan (${heartCount})`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md ${
                            hearted
                              ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] cursor-default'
                              : 'bg-white/95 backdrop-blur-sm text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] hover:scale-110 active:scale-95 cursor-pointer'
                          }`}
                        >
                          <i
                            className={`text-base ${
                              hearted ? 'ri-heart-3-fill animate-pulse' : 'ri-heart-3-line'
                            }`}
                          />
                          <span className="tabular-nums">{heartCount}</span>
                        </button>
                      )}
                    </div>
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
