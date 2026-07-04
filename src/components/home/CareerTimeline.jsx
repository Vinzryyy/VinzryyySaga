import React, { useMemo } from 'react';
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
    () => FEATURED_IDS.map(id => ELI_TIMELINE.find(e => e.id === id)).filter(Boolean),
    []
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-10 md:mb-14">
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

      {/* Scroll container */}
      <div className="relative">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[color:var(--retro-bg-primary)] to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-[color:var(--retro-bg-primary)] to-transparent" />

        <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden pb-4">
          <div className="flex w-max">
            {entries.map((entry, i) => {
              const isShowMilestone = entry.category === 'show-recap';
              const isFirst = i === 0;
              const isLast = i === entries.length - 1;
              const year = entry.date ? entry.date.slice(0, 4) : '2026';
              const dotColor = isShowMilestone
                ? 'bg-[color:var(--retro-gold)] border-[color:var(--retro-gold)]'
                : 'bg-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)]';
              const yearColor = isShowMilestone
                ? 'text-[color:var(--retro-gold)]'
                : 'text-[color:var(--retro-burgundy)]';
              const badgeClass = isShowMilestone
                ? 'bg-[color:var(--retro-gold)]/15 text-[color:var(--retro-brown-dark)]'
                : 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]';

              return (
                <div key={entry.id} className="flex items-start flex-shrink-0 w-48 sm:w-56">
                  <div className="w-full">
                    {/* Year label */}
                    <p className={`text-[10px] font-black uppercase tracking-[0.35em] mb-2 px-3 ${yearColor}`}>
                      {year}
                    </p>

                    {/* Timeline axis: left-line · dot · right-line */}
                    <div className="flex items-center mb-4 px-0">
                      <div className={`h-px flex-1 ${isFirst ? 'bg-transparent' : 'bg-[color:var(--retro-brown-dark)]/15'}`} />
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2 ${dotColor}`} />
                      <div className={`h-px flex-1 ${isLast ? 'bg-transparent' : 'bg-[color:var(--retro-brown-dark)]/15'}`} />
                    </div>

                    {/* Card body */}
                    <div className="px-3 pr-6">
                      <p className="font-header text-base sm:text-lg font-black text-[color:var(--retro-text-primary)] leading-tight mb-3 line-clamp-3">
                        {entry.title}
                      </p>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${badgeClass}`}>
                        {entry.badge}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-6 flex justify-end">
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
