import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useCountUp } from '../../hooks/useCountUp';

const StatsStrip = ({ frameCount, theaterCount }) => {
  const { elementRef, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: true });
  const yearsActive = new Date().getFullYear() - 2018;

  const frames  = useCountUp(frameCount   || 0, { duration: 1400, start: isVisible });
  const theater = useCountUp(theaterCount || 0, { duration: 1200, start: isVisible });
  const years   = useCountUp(yearsActive,        { duration: 900,  start: isVisible });

  const stats = [
    { value: frames,  suffix: '+', label: 'Frame Arsip',      sub: 'dalam koleksi',   delay: 0,   icon: 'ri-gallery-line'  },
    { value: theater, suffix: '+', label: 'Panggung Theater', sub: 'sejak debut 2018', delay: 130, icon: 'ri-mic-line'      },
    { value: years,   suffix: '',  label: 'Tahun Berkarya',   sub: 'di JKT48',         delay: 260, icon: 'ri-route-line'    },
  ];

  return (
    <div ref={elementRef} className="relative bg-[color:var(--retro-brown-dark)] overflow-hidden">
      {/* Centered warm glow — gives depth without texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, rgba(201,169,97,0.13) 0%, transparent 62%)',
        }}
      />

      {/* Eyebrow rule */}
      <div
        className="relative flex items-center gap-4 px-4 sm:px-6 lg:px-8 pt-10 md:pt-14 max-w-7xl mx-auto"
        aria-hidden="true"
      >
        <span className="flex-1 h-px bg-[color:var(--retro-cream)]/10" />
        <span className="text-[9px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-cream)]/28">
          Armeniaca × Eli JKT48
        </span>
        <span className="flex-1 h-px bg-[color:var(--retro-cream)]/10" />
      </div>

      {/* Stats grid */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 md:pb-14 pt-6 md:pt-8">
        <div className="grid grid-cols-3 divide-x divide-[color:var(--retro-cream)]/10">
          {stats.map(({ value, suffix, label, sub, delay, icon }) => (
            <div
              key={label}
              className={`text-center px-3 sm:px-6 md:px-10 py-3 md:py-5 transition-all duration-700 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}
              style={{ transitionDelay: `${delay}ms` }}
            >
              {/* Icon */}
              <i className={`${icon} text-lg text-[color:var(--retro-gold)]/55 mb-4 block`} />

              {/* Number */}
              <div className="font-header text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[color:var(--retro-cream)] tabular-nums leading-none">
                {value}{suffix}
              </div>

              {/* Gold rule */}
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-[color:var(--retro-gold)]/45 to-transparent mx-auto my-3" />

              {/* Label */}
              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--retro-cream)]/65">
                {label}
              </div>

              {/* Sub */}
              <div className="mt-1 text-[8px] sm:text-[9px] uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/28 hidden sm:block">
                {sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom accent — thin gold gradient rule */}
      <div className="h-px bg-gradient-to-r from-transparent via-[color:var(--retro-gold)]/22 to-transparent" />
    </div>
  );
};

export default StatsStrip;
