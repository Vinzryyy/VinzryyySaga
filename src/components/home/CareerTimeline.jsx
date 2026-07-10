import React, { useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ELI_TIMELINE } from '../../data/eliProfile';
import { hashToHref } from '../../utils/routes';

const FEATURED_IDS = [
  'audition',
  'theater-debut',
  'team-kiii',
  'show-100',
  'first-senbatsu',
  'show-200',
  'show-300',
  'undergirl-bibir-2024',
  'team-dream',
  'dream-bakudan-shonichi',
];

const CareerTimeline = () => {
  const entries = useMemo(
    () => FEATURED_IDS.map((id) => ELI_TIMELINE.find((e) => e.id === id)).filter(Boolean),
    []
  );

  const headerRef = useRef(null);
  const trackRef  = useRef(null);
  const stRefs    = useRef([]);

  useEffect(() => {
    const header = headerRef.current;
    const track  = trackRef.current;
    if (!header && !track) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        // Header entrance
        if (header) {
          gsap.from(header, {
            opacity: 0,
            y: 28,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: header, start: 'top 88%', once: true },
          });
        }

        // Cards stagger in when the track enters the viewport
        if (track) {
          const cols = track.querySelectorAll('.timeline-col');
          gsap.set(cols, { opacity: 0, y: 32 });
          stRefs.current.push(
            ScrollTrigger.create({
              trigger: track,
              start: 'top 86%',
              once: true,
              onEnter: () =>
                gsap.to(cols, {
                  opacity: 1,
                  y: 0,
                  duration: 0.5,
                  stagger: 0.055,
                  ease: 'power2.out',
                }),
            })
          );
        }
      } catch { /* GSAP unavailable — render static */ }
    })();

    return () => {
      cancelled = true;
      stRefs.current.forEach((st) => st.kill());
    };
  }, [entries.length]);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div ref={headerRef} className="flex items-end justify-between gap-4 mb-3 md:mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-2">
            Linimasa
          </p>
          <h2 className="font-header text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
            Perjalanan Eli
          </h2>
        </div>
        <div className="text-right hidden sm:block flex-shrink-0">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
            {entries.length} momen
          </p>
          <p className="text-[9px] text-[color:var(--color-text-muted)] mt-0.5 uppercase tracking-widest">
            2018 — 2026
          </p>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)] mb-8 sm:hidden">
        ← Geser untuk lihat →
      </p>
      <div className="hidden sm:block h-px bg-[color:var(--retro-brown-dark)]/10 mb-12" />

      {/* ── Scroll container ──────────────────────────────────── */}
      <div className="relative">
        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-6 z-10 bg-gradient-to-r from-[color:var(--retro-bg-primary)] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-14 z-10 bg-gradient-to-l from-[color:var(--retro-bg-primary)] to-transparent" />

        <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden pb-6">
          <div ref={trackRef} className="flex w-max">
            {entries.map((entry, i) => {
              const isShowMilestone = entry.category === 'show-recap';
              const isFirst = i === 0;
              const isLast  = i === entries.length - 1;
              const year    = entry.date ? entry.date.slice(0, 4) : '2026';

              const accentColor  = isShowMilestone ? 'var(--retro-gold)'     : 'var(--retro-burgundy)';
              const yearClass    = isShowMilestone ? 'text-[color:var(--retro-gold)]'     : 'text-[color:var(--retro-burgundy)]';
              const dotClass     = isShowMilestone
                ? 'bg-[color:var(--retro-gold)]     ring-[color:var(--retro-gold)]/20'
                : 'bg-[color:var(--retro-burgundy)] ring-[color:var(--retro-burgundy)]/18';
              const badgeClass   = isShowMilestone
                ? 'bg-[color:var(--retro-gold)]/15     text-[color:var(--retro-brown-dark)]'
                : 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]';
              const borderAccent = isShowMilestone
                ? 'border-t-[color:var(--retro-gold)]/40'
                : 'border-t-[color:var(--retro-burgundy)]/30';

              return (
                <div key={entry.id} className="timeline-col flex-shrink-0 w-52 sm:w-60 flex items-start">
                  <div className="w-full">
                    {/* Year label */}
                    <p className={`text-[11px] font-black uppercase tracking-[0.35em] mb-3 px-1 ${yearClass}`}>
                      {year}
                    </p>

                    {/* Timeline axis: line · dot · line
                        ring-[color:...] creates a "knockout" halo around the dot
                        matching the page background so the line appears to pass
                        behind the dot rather than through it. */}
                    <div className="flex items-center mb-5">
                      <div
                        className={`h-px flex-1 ${isFirst ? 'bg-transparent' : 'bg-[color:var(--retro-brown-dark)]/18'}`}
                      />
                      <div
                        className={`w-4 h-4 rounded-full flex-shrink-0 ring-4 ring-[color:var(--retro-bg-primary)] ${dotClass} shadow-sm`}
                      />
                      <div
                        className={`h-px flex-1 ${isLast ? 'bg-transparent' : 'bg-[color:var(--retro-brown-dark)]/18'}`}
                      />
                    </div>

                    {/* Card */}
                    <div className="pr-4 pl-1">
                      <div
                        className={`bg-[color:var(--retro-cream)] rounded-2xl border border-[color:var(--retro-brown-dark)]/10 border-t-2 ${borderAccent} shadow-sm px-4 pt-4 pb-5 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-[color:var(--retro-brown-dark)]/10 transition-all duration-300 cursor-default`}
                      >
                        <p className="font-header text-base sm:text-lg font-black text-[color:var(--retro-text-primary)] leading-snug mb-2 line-clamp-2">
                          {entry.title}
                        </p>
                        <p className="text-[9px] text-[color:var(--color-text-muted)] uppercase tracking-[0.2em] mb-3 leading-relaxed">
                          {entry.period}
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${badgeClass}`}
                        >
                          {entry.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* End cap — "more" hint */}
            <div className="flex-shrink-0 w-10 sm:w-16 flex items-start pt-[3.5rem]">
              <div className="h-px flex-1 bg-[color:var(--retro-brown-dark)]/18" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer link ─────────────────────────────────────── */}
      <div className="mt-2 flex justify-end">
        <Link
          to={hashToHref('timeline')}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--retro-burgundy)] hover:opacity-70 transition-opacity group"
        >
          Lihat semua perjalanan
          <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default CareerTimeline;
