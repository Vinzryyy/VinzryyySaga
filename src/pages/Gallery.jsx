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

import React, { useEffect } from 'react';
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

  const seoTitle = year ? `Arsip ${year}` : 'Arsip Lengkap';
  const seoDescription = year
    ? `Frame-frame Eli JKT48 dari arsip tahun ${year}. Dokumentasi visual Helisma Putri di sepanjang tahun ${year}.`
    : 'Arsip visual lengkap Eli JKT48 — frame demi frame dari Generasi 7 hingga era Team Dream. Filter berdasarkan tahun untuk menjelajah era spesifik.';
  const seoPath = year ? `/gallery/${year}` : '/gallery';

  return (
    <main className="bg-[color:var(--retro-bg-primary)] min-h-screen">
      <Seo title={seoTitle} description={seoDescription} path={seoPath} />

      {/* Profile bar — IG-style header with avatar, handle, stats, bio. */}
      <ArchiveProfileHeader />

      {/* Sticky filter bar — era pills + event search. Sits right under
          the profile header so filtering stays one tap away. */}
      <FilterBar />

      {/* IG-style square grid */}
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
            {SITE_CONFIG.branding.name} · {SITE_CONFIG.branding.tagline}
          </span>
        </div>
      </div>
    </main>
  );
};

export default GalleryPage;
