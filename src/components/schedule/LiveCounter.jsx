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

import React, { useMemo } from 'react';

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

const isMG = (entry) => entry.kind === 'EXCLUSIVE';
const isSpecialEvent = (entry) =>
  (entry.kind === 'EVENT' && entry.is_video_call) || entry.kind === 'GENERAL';

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
  const asOfMs = careerStats?.asOfDate
    ? new Date(careerStats.asOfDate).getTime()
    : null;

  const stats = useMemo(() => {
    const todayMs = today.getTime();
    let theaterDelta = 0;
    let mgDone = 0;
    let mgUpcoming = 0;
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
      } else if (isMG(entry)) {
        if (isPast) mgDone += 1;
        else mgUpcoming += 1;
      } else if (isSpecialEvent(entry)) {
        if (isPast) specialDone += 1;
        else specialUpcoming += 1;
      }
    });

    const theaterBaseline = careerStats?.theater ?? 0;
    return {
      theaterTotal: theaterBaseline + theaterDelta,
      theaterBaseline,
      theaterDelta,
      mgDone,
      mgUpcoming,
      specialDone,
      specialUpcoming,
    };
    // `today` is recomputed every render — its ms value drives `isPast`,
    // and it's stable enough within a single page view (no live midnight
    // crossover handling needed for a stat strip). Excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, asOfMs, careerStats?.theater]);

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
              dominates the strip so the lifetime count reads first. */}
          <div className="lg:col-span-2 rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-6 md:p-8 lg:p-10 relative overflow-hidden flex flex-col">
            <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-24 w-[260px] h-[260px] rounded-full bg-[color:var(--retro-burgundy)]/40 blur-3xl pointer-events-none" />
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
              <p className="mt-auto pt-5 text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/55">
                Baseline {careerStats?.asOfDate ? formatAsOf(careerStats.asOfDate) : 'manual #JumlahShowJKT48'}
              </p>
            </div>
          </div>

          {/* Secondary — M&G + Special Events stacked on lg, side-by-side
              on md/sm so they don't overshadow the hero. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <StatCard
              eyebrow="Personal M&G"
              value={stats.mgDone}
              valueAccent={stats.mgUpcoming > 0 ? `/+${stats.mgUpcoming}` : null}
              sub={
                stats.mgUpcoming > 0
                  ? `${stats.mgDone} sesi selesai · ${stats.mgUpcoming} mendatang.`
                  : `${stats.mgDone} sesi Meet & Greet selesai.`
              }
              footnote="Window 4 bulan · auto-refresh 6 jam"
            />
            <StatCard
              eyebrow="Special Events"
              value={stats.specialDone}
              valueAccent={stats.specialUpcoming > 0 ? `/+${stats.specialUpcoming}` : null}
              sub={
                stats.specialDone + stats.specialUpcoming === 0
                  ? 'Belum ada Video Call / off-site dijadwalkan.'
                  : stats.specialUpcoming > 0
                  ? `${stats.specialDone} selesai · ${stats.specialUpcoming} mendatang.`
                  : `${stats.specialDone} VC / off-site selesai.`
              }
              footnote="Video Call & off-site"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveCounter;
