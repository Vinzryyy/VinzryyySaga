/**
 * QuickActions — "Terkini" row of 4 shortcut cards under the status hero.
 *
 * Copy + targets live in SITE_CONFIG.home.quickActions. A card with
 * `hint: 'nextEvent'` shows the next scheduled event date; the schedule
 * JSON comes from useEliSchedule's module cache, so this costs no extra
 * request when EliStatusHero has already loaded it.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../../config/siteConfig';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useEliSchedule, pickNextEvent } from '../../hooks/useEliSchedule';
import { JAKARTA_TZ } from '../../utils/calendar';

const nextEventFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: JAKARTA_TZ,
});

const QuickActions = () => {
  const config = SITE_CONFIG.home?.quickActions;
  const schedule = useEliSchedule();
  const [now] = useState(() => Date.now());
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.1, triggerOnce: true });

  if (!config?.items?.length) return null;

  const nextEvent = pickNextEvent(schedule, now);
  const hintFor = (item) => {
    if (item.hint !== 'nextEvent' || !nextEvent) return null;
    return `Berikutnya: ${nextEventFmt.format(new Date(nextEvent.date))}`;
  };

  return (
    <section
      ref={elementRef}
      aria-labelledby="quick-actions-title"
      className="bg-[color:var(--retro-bg-primary)] px-5 sm:px-6 md:px-12 lg:px-20 py-12 md:py-16"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)]" />
            {config.eyebrow}
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-brown-dark)]/10" />
        </div>
        <h2
          id="quick-actions-title"
          className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-6 md:mb-8"
        >
          {config.title}
        </h2>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {config.items.map((item, idx) => {
            const hint = hintFor(item);
            return (
              <li
                key={item.id}
                style={{ transitionDelay: `${idx * 80}ms` }}
                className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0'
                }`}
              >
                <Link
                  to={item.to}
                  className="group relative flex flex-col h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-[color:var(--retro-burgundy)]/15 bg-[color:var(--retro-cream)] p-4 sm:p-5 md:p-6 hover:-translate-y-0.5 hover:shadow-lg hover:border-[color:var(--retro-burgundy)]/35 active:translate-y-0 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)]"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none opacity-70"
                    style={{
                      background:
                        'radial-gradient(circle at 100% 0%, rgba(201, 169, 97, 0.14) 0%, transparent 55%)',
                    }}
                  />
                  <span className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] flex items-center justify-center mb-4 sm:mb-6 shadow-sm">
                    <i className={`${item.icon} text-lg sm:text-xl`} />
                  </span>
                  <span className="relative font-header text-lg sm:text-xl md:text-2xl font-black tracking-tight text-[color:var(--retro-text-primary)] leading-tight">
                    {item.title}
                  </span>
                  <span className="relative text-xs sm:text-sm text-[color:var(--retro-text-muted)] leading-snug mt-1.5 flex-1">
                    {item.subtitle}
                  </span>
                  <span className="relative mt-4 flex items-center justify-between gap-2">
                    {hint ? (
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-[color:var(--retro-burgundy)] truncate">
                        {hint}
                      </span>
                    ) : (
                      <span />
                    )}
                    <i className="ri-arrow-right-line text-base text-[color:var(--retro-burgundy)] transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default QuickActions;
