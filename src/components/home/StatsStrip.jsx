import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useCountUp } from '../../hooks/useCountUp';

const StatsStrip = ({ frameCount, theaterCount }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: true });
  const yearsActive = new Date().getFullYear() - 2018;

  const frames = useCountUp(frameCount || 0, { duration: 1400, start: isVisible });
  const theater = useCountUp(theaterCount || 0, { duration: 1200, start: isVisible });
  const years = useCountUp(yearsActive, { duration: 900, start: isVisible });

  const stats = [
    { value: frames, suffix: '+', label: 'Frame Arsip', sub: 'dalam koleksi', delay: 0 },
    { value: theater, suffix: '+', label: 'Panggung Theater', sub: 'sejak debut 2018', delay: 120 },
    { value: years, suffix: '', label: 'Tahun Berkarya', sub: 'di JKT48', delay: 240 },
  ];

  return (
    <div ref={elementRef} className="bg-[color:var(--retro-brown-dark)]">
      {/* Eyebrow ornament */}
      <div className="flex items-center gap-4 px-4 sm:px-6 lg:px-8 pt-10 md:pt-14 max-w-7xl mx-auto" aria-hidden="true">
        <span className="flex-1 h-px bg-[color:var(--retro-cream)]/10" />
        <span className="text-[9px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-cream)]/30">
          Armeniaca × Eli JKT48
        </span>
        <span className="flex-1 h-px bg-[color:var(--retro-cream)]/10" />
      </div>

      {/* Stats grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 md:pb-14 pt-8">
        <div className="grid grid-cols-3 divide-x divide-[color:var(--retro-cream)]/10">
          {stats.map(({ value, suffix, label, sub, delay }) => (
            <div
              key={label}
              className="text-center px-3 sm:px-6 md:px-10 py-2"
              style={{ transitionDelay: `${delay}ms` }}
            >
              <div className="font-header text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[color:var(--retro-cream)] tabular-nums leading-none">
                {value}{suffix}
              </div>
              <div className="mt-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--retro-cream)]/65">
                {label}
              </div>
              <div className="mt-0.5 text-[8px] sm:text-[9px] uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/30 hidden sm:block">
                {sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsStrip;
