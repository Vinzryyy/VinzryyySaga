/**
 * GalleryPage — Instagram-style archive view.
 *
 * Layout:
 *   ArchiveProfileHeader (avatar + handle + stats + bio)
 *   ─────────────────────────────────
 *   Tab strip: All / Era pills / Search
 *   ─────────────────────────────────
 *   InstagramGrid (3-5 col square thumbs)
 */

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useParams } from 'react-router-dom';
import { useGallery } from '../context';
import ArchiveProfileHeader from '../components/gallery/ArchiveProfileHeader';
import InstagramGrid from '../components/gallery/InstagramGrid';
import FilterBar from '../components/gallery/FilterBar';
import { SITE_CONFIG } from '../config/siteConfig';
import Seo from '../components/Seo';

const GalleryPage = () => {
  const { eras, setEraFilter } = useGallery();
  const { year } = useParams();
  const headerRef = useRef(null);
  const filterRef = useRef(null);

  // Entrance animation — header fades up, then filterbar slides in.
  // Skipped automatically when prefers-reduced-motion is set.
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      if (headerRef.current) {
        tl.from(headerRef.current, { opacity: 0, y: 24, duration: 0.75 });
      }
      if (filterRef.current) {
        tl.from(filterRef.current, { opacity: 0, y: -12, duration: 0.45 }, '-=0.35');
      }
      return () => tl.kill();
    });
    return () => mm.revert();
  }, []);

  // Sync the era filter to whatever year is in the URL. `/gallery` (no
  // year) clears to "all"; `/gallery/2025` sets it to that era.
  useEffect(() => {
    if (!setEraFilter) return;
    const validIds = new Set(eras.map((e) => String(e.id)));
    if (year && validIds.has(year)) {
      setEraFilter(year);
    } else {
      setEraFilter('all');
    }
  }, [year, eras, setEraFilter]);

  const seoTitle = year ? `Memoria ${year}` : 'Memoria';
  const seoDescription = year
    ? `Frame-frame Eli JKT48 dari Memoria tahun ${year}. Kenangan visual Helisma Putri di sepanjang tahun ${year}.`
    : 'Memoria — kenangan visual Eli JKT48, frame demi frame dari Generasi 7 hingga era Team Dream. Filter berdasarkan tahun untuk menjelajah era spesifik.';
  const seoPath = year ? `/gallery/${year}` : '/gallery';

  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
      <Seo title={seoTitle} description={seoDescription} path={seoPath} />

      {/* Decorative background — soft, large icon scatter behind all
          content. Matches the cover banner's icon vocabulary (flowers,
          sparkles, hearts, leaves) but at much larger sizes and lower
          opacity so the page reads textured, not busy. pointer-events-
          none + z-0 so it never intercepts clicks; main content gets
          relative + z-10 below. Uses retro-burgundy/retro-gold tones
          so the marks blend with the cream bg instead of fighting it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <i className="absolute ri-flower-fill text-[color:var(--retro-burgundy)]/[0.06] text-[180px] sm:text-[240px] md:text-[320px]"
           style={{ top: '8%', left: '-4%', transform: 'rotate(-18deg)' }} />
        <i className="absolute ri-sparkling-2-fill text-[color:var(--retro-gold)]/[0.10] text-[120px] sm:text-[160px] md:text-[200px]"
           style={{ top: '32%', right: '-3%', transform: 'rotate(12deg)' }} />
        <i className="absolute ri-heart-fill text-[color:var(--retro-burgundy)]/[0.05] text-[140px] sm:text-[180px] md:text-[240px]"
           style={{ top: '52%', left: '-5%', transform: 'rotate(8deg)' }} />
        <i className="absolute ri-leaf-fill text-[color:var(--retro-gold-dark,#a07d3a)]/[0.08] text-[160px] sm:text-[220px] md:text-[280px]"
           style={{ top: '68%', right: '-6%', transform: 'rotate(-22deg)' }} />
        <i className="absolute ri-flower-line text-[color:var(--retro-burgundy)]/[0.07] text-[130px] sm:text-[180px] md:text-[240px]"
           style={{ top: '85%', left: '8%', transform: 'rotate(20deg)' }} />
        <i className="absolute ri-music-2-fill text-[color:var(--retro-burgundy)]/[0.06] text-[100px] sm:text-[140px] md:text-[180px]"
           style={{ top: '92%', right: '12%', transform: 'rotate(-10deg)' }} />
      </div>

      {/* All page content sits above the decorative layer. */}
      <div className="relative z-10">
        {/* Profile bar — IG-style header with avatar, handle, stats, bio. */}
        <div ref={headerRef}>
          <ArchiveProfileHeader />
        </div>

        {/* Sticky filter bar — era pills + event search. Sits right under
            the profile header so filtering stays one tap away. */}
        <div ref={filterRef}>
          <FilterBar />
        </div>

        {/* IG-style square photo grid */}
        <section className="px-1 sm:px-2 md:px-4 lg:px-6 pb-12 md:pb-16">
          <div className="max-w-5xl mx-auto">
            <InstagramGrid />
          </div>
        </section>

        {/* Footer micro-sig */}
        <div className="max-w-5xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 pb-12 md:pb-16">
          <div className="flex items-center gap-3 text-[color:var(--color-text-muted)]">
            <div className="w-10 h-px bg-[color:var(--retro-gold)]/50" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">
              {SITE_CONFIG.branding.name} · Memoria · {SITE_CONFIG.branding.tagline}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default GalleryPage;
