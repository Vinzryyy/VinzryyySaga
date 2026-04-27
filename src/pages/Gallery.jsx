/**
 * GalleryPage — full archive view. Editorial header + stats + sticky
 * FilterBar + the existing GalleryGrid (filter / density / infinite scroll
 * machinery preserved). Style aligns with Home and Profile so the page
 * doesn't feel like a different site.
 */

import React, { useMemo } from 'react';
import { useGallery } from '../context';
import GalleryGrid from '../components/gallery/GalleryGrid';
import FilterBar from '../components/gallery/FilterBar';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';

const AnimatedCount = ({ value, start, duration = 1200 }) => {
  const animated = useCountUp(value, { start, duration });
  return <>{animated.toLocaleString('id-ID')}</>;
};

const GalleryPage = () => {
  const { images, eras } = useGallery();

  const stats = useMemo(() => {
    if (!images || images.length === 0) return null;
    const sorted = [...images].sort((a, b) => a.date.localeCompare(b.date));
    const fmtMonth = (d) =>
      new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(d);
    return {
      total: images.length,
      eras: eras.length,
      first: fmtMonth(new Date(sorted[0].date)),
      latest: fmtMonth(new Date(sorted[sorted.length - 1].date)),
    };
  }, [images, eras.length]);

  const { elementRef: statsRef, isVisible: statsVisible } = useScrollReveal({
    threshold: 0.2,
    rootMargin: '0px',
  });

  return (
    <main className="bg-[color:var(--retro-bg-primary)] min-h-screen">
      {/* Editorial header — Issue plate + oversized title + lead + stat strip */}
      <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
        {/* Watermark wordmark on the right (lg+) */}
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
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Arsip Penuh</span>
            <span className="w-10 h-px bg-[color:var(--retro-burgundy)]/30" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              JKT48 Fight 2026 Edition
            </span>
          </div>

          <h1 className="font-header text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-4xl">
            Setiap frame, <br />
            <span className="text-[color:var(--retro-burgundy)]">satu cerita kecil.</span>
          </h1>

          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            Telusuri seluruh arsip visual Eli — dari debut Team T sampai era Team Dream JKT48 Fight 2026. Filter berdasarkan era atau cara tampil, lalu klik bingkai untuk konteksnya.
          </p>

          {/* Stat strip — count-up when visible */}
          {stats && (
            <dl
              ref={statsRef}
              className="mt-8 md:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl"
            >
              <div className="border-l-2 border-[color:var(--retro-burgundy)] pl-3">
                <dd className="font-header text-2xl md:text-3xl font-black text-[color:var(--retro-text-primary)] leading-tight tabular-nums">
                  <AnimatedCount value={stats.total} start={statsVisible} />
                </dd>
                <dt className="text-[9px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)] mt-1">
                  Frame Total
                </dt>
              </div>
              <div className="border-l-2 border-[color:var(--retro-burgundy)] pl-3">
                <dd className="font-header text-2xl md:text-3xl font-black text-[color:var(--retro-text-primary)] leading-tight tabular-nums">
                  <AnimatedCount value={stats.eras} start={statsVisible} />
                </dd>
                <dt className="text-[9px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)] mt-1">
                  Era Tercatat
                </dt>
              </div>
              <div className="border-l-2 border-[color:var(--retro-burgundy)] pl-3">
                <dd className="font-header text-base md:text-xl font-black text-[color:var(--retro-text-primary)] leading-tight">
                  {stats.first}
                </dd>
                <dt className="text-[9px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)] mt-1">
                  Frame Pertama
                </dt>
              </div>
              <div className="border-l-2 border-[color:var(--retro-burgundy)] pl-3">
                <dd className="font-header text-base md:text-xl font-black text-[color:var(--retro-text-primary)] leading-tight">
                  {stats.latest}
                </dd>
                <dt className="text-[9px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)] mt-1">
                  Frame Terbaru
                </dt>
              </div>
            </dl>
          )}

          <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy)]/40 via-[color:var(--retro-brown-dark)]/10 to-transparent" />
        </div>
      </header>

      {/* Sticky FilterBar */}
      <FilterBar />

      {/* Grid */}
      <section className="px-4 sm:px-6 md:px-12 lg:px-20 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <GalleryGrid />
        </div>
      </section>

      {/* Footer micro-sig */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 pb-12 md:pb-16">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)]">
          <div className="w-10 h-px bg-[color:var(--retro-gold)]/50" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">
            {SITE_CONFIG.branding.name} · {SITE_CONFIG.branding.tagline}
          </span>
        </div>
      </div>
    </main>
  );
};

export default GalleryPage;
