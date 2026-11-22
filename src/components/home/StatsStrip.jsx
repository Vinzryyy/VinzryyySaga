import React, { useRef, useEffect, useState } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * StatsStrip — dark band with three count-up stats.
 *
 * Animation: GSAP ScrollTrigger reveals each card (opacity + y + scale)
 * once the strip enters the viewport, then fires the count-up hooks.
 * Falls back to instant-visible on reduced-motion or if GSAP fails.
 */
const StatsStrip = ({ frameCount, theaterCount }) => {
  const stripRef = useRef(null);
  const cardRefs = useRef([]);
  const [triggered, setTriggered] = useState(false);

  const yearsActive = new Date().getFullYear() - 2018;
  const frames  = useCountUp(frameCount   || 0, { duration: 900, start: triggered });
  const theater = useCountUp(theaterCount || 0, { duration: 800, start: triggered });
  const years   = useCountUp(yearsActive,        { duration: 600,  start: triggered });

  useEffect(() => {
    const el = stripRef.current;
    const cards = cardRefs.current.filter(Boolean);
    if (!el || !cards.length) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTriggered(true);
      return undefined;
    }

    // IntersectionObserver instead of ScrollTrigger: with Lenis smooth
    // scroll the ScrollTrigger sometimes never fired, leaving the strip
    // invisible. IO works off real layout, so it always triggers.
    let cancelled = false;
    let gsapRef = null;
    let observer = null;
    const reveal = () => {
      setTriggered(true);
      if (gsapRef) {
        gsapRef.to(cards, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' });
      }
    };
    (async () => {
      try {
        const { gsap } = await import('gsap');
        if (cancelled || !stripRef.current) return;
        gsapRef = gsap;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          reveal();
          return;
        }
        gsap.set(cards, { opacity: 0, y: 16 });
      } catch {
        /* no gsap: just count up */
      }
      if (cancelled) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          reveal();
        },
        { rootMargin: '0px 0px -5% 0px' },
      );
      observer.observe(el);
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  const stats = [
    { value: frames,  suffix: '+', label: 'Frame Arsip',      sub: 'dalam koleksi',   icon: 'ri-gallery-line'  },
    { value: theater, suffix: '+', label: 'Panggung Theater', sub: 'sejak debut 2018', icon: 'ri-mic-line'      },
    { value: years,   suffix: '',  label: 'Tahun Berkarya',   sub: 'di JKT48',         icon: 'ri-route-line'    },
  ];

  return (
    <div ref={stripRef} className="relative bg-[color:var(--retro-brown-dark)] overflow-hidden">
      {/* Centered warm glow */}
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
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/65">
          Armeniaca × Eli JKT48
        </span>
        <span className="flex-1 h-px bg-[color:var(--retro-cream)]/10" />
      </div>

      {/* Stats grid */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 md:pb-14 pt-6 md:pt-8">
        <div className="grid grid-cols-3 divide-x divide-[color:var(--retro-cream)]/10">
          {stats.map(({ value, suffix, label, sub, icon }, i) => (
            <div
              key={label}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="text-center px-3 sm:px-6 md:px-10 py-3 md:py-5"
            >
              <i className={`${icon} text-lg text-[color:var(--retro-gold)]/55 mb-4 block`} />

              <div className="font-header text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[color:var(--retro-cream)] tabular-nums leading-none">
                {value}{suffix}
              </div>

              <div className="w-8 h-px bg-gradient-to-r from-transparent via-[color:var(--retro-gold)]/45 to-transparent mx-auto my-3" />

              <div className="text-[10px] sm:text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--retro-cream)]/65">
                {label}
              </div>

              <div className="mt-1 text-[10px] sm:text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/65 hidden sm:block">
                {sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[color:var(--retro-gold)]/22 to-transparent" />
    </div>
  );
};

export default StatsStrip;
