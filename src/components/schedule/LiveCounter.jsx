/**
 * LiveCounter — three-stat strip at the top of /schedule:
 *   1. Theater Shows  · baseline + delta from API since baseline date
 *   2. Personal M&G   · sessions completed / upcoming
 *   3. Special Events · video call + non-theater events done / upcoming
 *
 * Theater is the only stat with a manual baseline (siteConfig.eli
 * .careerStats.theater = 385) because the public API has gaps for
 * older shows. M&G + events are recent products (2024+) so the
 * scheduled-window data is enough to give an accurate live count
 * without a baseline.
 */

import React, { useEffect, useMemo, useState } from 'react';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatAsOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

// Theater = SHOW + in-theater EVENT (NOT video call). Mirrors the
// classification in count-eli-shows.py so live deltas line up with the
// manual baseline.
const isTheater = (entry) => {
  if (entry.kind === 'SHOW') return true;
  if (entry.kind === 'EVENT' && !entry.is_video_call) return true;
  return false;
};

// Video Calls Eli participates in are sold as Digital Photobook
// "bonus VC" sessions. The schedule API tags them as kind=EXCLUSIVE
// with category=DIGITAL_PHOTOBOOK. The kind=EVENT video calls in the
// API are gen-14 trial events Eli isn't part of.
const isVC = (entry) =>
  (entry.kind === 'EXCLUSIVE' && entry.category === 'DIGITAL_PHOTOBOOK') ||
  (entry.kind === 'EVENT' && entry.is_video_call);

// M&G = face-to-face EXCLUSIVE sessions (2Shot + Meet & Greet +
// photocard bonus). Excludes Photobook VC which gets its own stat.
const isMG = (entry) =>
  entry.kind === 'EXCLUSIVE' && entry.category !== 'DIGITAL_PHOTOBOOK';

const isSpecialEvent = (entry) => entry.kind === 'GENERAL';

const StatCard = ({ eyebrow, value, valueAccent, sub, footnote }) => (
  <div className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-4 md:p-5 hover:border-[color:var(--retro-burgundy)]/30 hover:-translate-y-0.5 transition-all shadow-sm flex flex-col">
    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
      {eyebrow}
    </p>
    <p className="font-header text-4xl md:text-5xl font-black text-[color:var(--retro-text-primary)] tracking-tighter leading-none mt-2 tabular-nums">
      {value}
      {valueAccent != null && (
        <span className="text-[color:var(--retro-burgundy)] text-2xl md:text-3xl ml-1 align-baseline">
          {valueAccent}
        </span>
      )}
    </p>
    {sub && (
      <p className="mt-2 text-xs text-[color:var(--color-text-secondary)] leading-snug">
        {sub}
      </p>
    )}
    {footnote && (
      <p className="mt-auto pt-2 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
        {footnote}
      </p>
    )}
  </div>
);

const LiveCounter = ({ events, careerStats }) => {
  const today = startOfToday();

  // Prefer the manual show log as the lifetime baseline source — it
  // updates whenever scripts/parse-show-log.py is re-run from the TSV.
  // Falls back to the static siteConfig baseline if the JSON fails
  // to load (offline cache, deploy without re-parse, etc.).
  const [showLog, setShowLog] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-show-log.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setShowLog(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const baselineTheater = showLog?.totalShows ?? careerStats?.theater ?? 0;
  const baselineAsOfDate = showLog?.asOfDate ?? careerStats?.asOfDate ?? null;
  const asOfMs = baselineAsOfDate ? new Date(baselineAsOfDate).getTime() : null;

  const stats = useMemo(() => {
    const todayMs = today.getTime();
    let theaterDelta = 0;
    let mgDone = 0;
    let mgUpcoming = 0;
    let vcDone = 0;
    let vcUpcoming = 0;
    let specialDone = 0;
    let specialUpcoming = 0;

    (events || []).forEach((entry) => {
      const dMs = new Date(entry.date).getTime();
      if (Number.isNaN(dMs)) return;
      const isPast = dMs <= todayMs;

      if (isTheater(entry)) {
        // Only count as a delta if the show happened AFTER the baseline
        // (asOfDate) and ON/BEFORE today. Future-scheduled theater shows
        // are visible in the listing below — they don't bump the live
        // total until they actually air.
        if (asOfMs != null && dMs > asOfMs && isPast) {
          theaterDelta += 1;
        }
      } else if (isVC(entry)) {
        if (isPast) vcDone += 1;
        else vcUpcoming += 1;
      } else if (isMG(entry)) {
        if (isPast) mgDone += 1;
        else mgUpcoming += 1;
      } else if (isSpecialEvent(entry)) {
        if (isPast) specialDone += 1;
        else specialUpcoming += 1;
      }
    });

    return {
      theaterTotal: baselineTheater + theaterDelta,
      theaterBaseline: baselineTheater,
      theaterDelta,
      mgDone,
      mgUpcoming,
      vcDone,
      vcUpcoming,
      specialDone,
      specialUpcoming,
    };
    // `today` is recomputed every render — its ms value drives `isPast`,
    // and it's stable enough within a single page view (no live midnight
    // crossover handling needed for a stat strip). Excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, asOfMs, baselineTheater]);

  return (
    <section
      aria-label="Statistik Eli — live"
      className="px-5 sm:px-6 md:px-12 lg:px-20 mb-10 md:mb-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] inline-flex items-center gap-2">
            <i className="ri-pulse-line text-base text-[color:var(--retro-burgundy)]" />
            Statistik · Live
          </p>
          {careerStats?.source && (
            <a
              href={careerStats.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hover:text-[color:var(--retro-burgundy)] inline-flex items-center gap-1.5 transition-colors"
            >
              <i className="ri-quote-text" />
              <span className="hidden sm:inline">Sumber baseline:</span>
              <span>{careerStats.source.label}</span>
            </a>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Hero — Theater Shows. Burgundy plate, oversized number,
              dominates the strip so the lifetime count reads first.
              Right side carries an Eli portrait watermark masked into
              gold so the card doesn't read as pure typography. */}
          <div className="lg:col-span-2 rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-6 md:p-8 lg:p-10 relative overflow-hidden flex flex-col">
            <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-24 w-[260px] h-[260px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
            {/* Portrait watermark — lives behind the text and inside the
                card's overflow-hidden, so it crops cleanly on small
                viewports. Hidden below md to keep the headline readable. */}
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block pointer-events-none opacity-25"
              style={{
                backgroundImage: 'url(/archive/img-364.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: '50% 20%',
                maskImage: 'linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, transparent 75%)',
                WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, transparent 75%)',
                mixBlendMode: 'luminosity',
              }}
            />
            <div className="relative flex flex-col h-full">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-3 inline-flex items-center gap-2">
                <i className="ri-mic-line text-base" />
                Theater Shows · Lifetime
              </p>
              <p className="font-header text-[5.5rem] sm:text-[7rem] md:text-[8rem] lg:text-[8.5rem] font-black tabular-nums leading-[0.85] tracking-tighter">
                {stats.theaterTotal}
                {stats.theaterDelta > 0 && (
                  <span className="text-[color:var(--retro-gold-light)] text-3xl md:text-4xl ml-3 align-baseline">
                    +{stats.theaterDelta}
                  </span>
                )}
              </p>
              <p className="mt-4 text-sm md:text-base text-[color:var(--retro-cream)]/80 leading-relaxed max-w-md">
                Total panggung teater Eli sejak debut Team T (16 Des 2018).
                {stats.theaterDelta > 0 && (
                  <span className="text-[color:var(--retro-gold-light)] font-bold">
                    {' '}
                    +{stats.theaterDelta} sejak baseline.
                  </span>
                )}
              </p>

              {/* Career totals — Center / Solo / Duo derived from the
                  same show-log JSON. Pinned to the bottom of the hero
                  so they share the burgundy plate visually rather than
                  becoming a separate orphan strip. */}
              {showLog?.totals && (
                <div className="mt-6 pt-5 border-t border-[color:var(--retro-cream)]/15 grid grid-cols-3 gap-4 max-w-md">
                  <div>
                    <p className="font-header text-2xl md:text-3xl font-black tabular-nums text-[color:var(--retro-gold-light)] leading-none">
                      {showLog.totals.centers}
                    </p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
                      Center
                    </p>
                  </div>
                  <div>
                    <p className="font-header text-2xl md:text-3xl font-black tabular-nums text-[color:var(--retro-cream)] leading-none">
                      {showLog.totals.solos}
                    </p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
                      Solo
                    </p>
                  </div>
                  <div>
                    <p className="font-header text-2xl md:text-3xl font-black tabular-nums text-[color:var(--retro-cream)] leading-none">
                      {showLog.totals.duos}
                    </p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
                      Duo
                    </p>
                  </div>
                </div>
              )}

              <p className="mt-auto pt-5 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/55">
                Baseline {baselineAsOfDate ? formatAsOf(baselineAsOfDate) : 'manual #JumlahShowJKT48'}
              </p>
            </div>
          </div>

          {/* Secondary — M&G + Video Call stacked on lg, side-by-side
              on md/sm so they don't overshadow the hero. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <StatCard
              eyebrow="Personal M&G"
              value={stats.mgDone}
              valueAccent={stats.mgUpcoming > 0 ? `/+${stats.mgUpcoming}` : null}
              sub={
                stats.mgUpcoming + stats.mgDone === 0
                  ? 'Belum ada sesi M&G face-to-face dijadwalkan.'
                  : stats.mgUpcoming > 0
                  ? `${stats.mgDone} sesi selesai · ${stats.mgUpcoming} mendatang.`
                  : `${stats.mgDone} sesi 2Shot / Meet & Greet selesai.`
              }
              footnote="2Shot · Photocard · face-to-face"
            />
            <StatCard
              eyebrow="Video Call"
              value={stats.vcDone}
              valueAccent={stats.vcUpcoming > 0 ? `/+${stats.vcUpcoming}` : null}
              sub={
                stats.vcDone + stats.vcUpcoming === 0
                  ? 'Belum ada Video Call dijadwalkan.'
                  : stats.vcUpcoming > 0
                  ? `${stats.vcDone} sesi selesai · ${stats.vcUpcoming} mendatang.`
                  : `${stats.vcDone} sesi Video Call selesai.`
              }
              footnote="Bonus Pre-Order Digital Photobook"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveCounter;
