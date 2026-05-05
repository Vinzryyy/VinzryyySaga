/**
 * InstagramGrid — IG-style square thumbnail grid for /gallery.
 *
 * - 3-col on mobile, scales to 4 on tablet, 5 on desktop
 * - 1:1 aspect crops with 1px gap (no rounding, no card chrome)
 * - On hover: dim image, center favoriteCount + a "multi-photo"
 *   indicator if the post had more than one image (shared tweetId)
 * - Click → existing lightbox (caption / hashtags / X link)
 * - Infinite scroll preserved from the old GalleryGrid
 *
 * Replaces the old grid/timeline/moodboard view-mode switcher — for an
 * archive with this many frames, a single dense grid scans faster than
 * three different layouts no one was using.
 */

import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useGallery } from '../../context';
import { useLightbox } from '../../context/LightboxContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SITE_CONFIG } from '../../config/siteConfig';

const INITIAL_COUNT = 15; // first paint stays light — only 15 thumbs render
const BATCH_SIZE = 15;    // each subsequent scroll-triggered append

// Quick lookup: which tweetIds carry > 1 image. Used to flag carousel-
// style posts with the IG copy icon. Not stored in the image record
// because it's relative to the *visible* set; recomputing here is O(n).
const buildMultiImageSet = (images) => {
  const counts = new Map();
  images.forEach((img) => {
    if (!img.tweetId) return;
    counts.set(img.tweetId, (counts.get(img.tweetId) || 0) + 1);
  });
  const set = new Set();
  counts.forEach((c, id) => {
    if (c > 1) set.add(id);
  });
  return set;
};

const ThumbCell = memo(function ThumbCell({ image, index, isCarousel }) {
  const { open } = useLightbox();
  const { filteredImages } = useGallery();
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.05,
    rootMargin: '300px',
    triggerOnce: true,
  });

  const handleClick = () => open(filteredImages, index);
  const fav = typeof image.favoriteCount === 'number' ? image.favoriteCount : null;

  return (
    <button
      ref={elementRef}
      type="button"
      onClick={handleClick}
      aria-label={`Buka ${image.eventName || image.title || 'frame'}`}
      className={`
        group relative block aspect-square overflow-hidden bg-[color:var(--retro-brown-dark)]/8
        transition-opacity duration-500 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <picture>
        {image.avifSrcSet && <source srcSet={image.avifSrcSet} type="image/avif" />}
        {image.webpSrcSet && <source srcSet={image.webpSrcSet} type="image/webp" />}
        <img
          src={image.thumbnail || image.url}
          alt={image.eventName || image.title || 'Eli JKT48'}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </picture>

      {/* Top-right carousel icon — IG's "this post has multiple
          photos" affordance. Stays visible (not hover-only) since
          users rely on it before hovering. */}
      {isCarousel && (
        <span className="absolute top-2 right-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] pointer-events-none">
          <i className="ri-stack-fill text-base" />
        </span>
      )}

      {/* Hover/focus overlay — dims the image and centers engagement
          stats (heart count). Pointer-events-none so the button below
          stays the click target. Always visible on touch devices via
          the focus-visible variant when the user taps. */}
      <div
        className="
          absolute inset-0 bg-black/40
          flex items-center justify-center gap-5 text-white
          opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
          transition-opacity duration-200 pointer-events-none
        "
      >
        {fav !== null && fav > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-black tabular-nums">
            <i className="ri-heart-fill text-base" />
            {fav.toLocaleString('id-ID')}
          </span>
        )}
        {image.eventDate && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]">
            <i className="ri-calendar-event-line" />
            {new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              year: '2-digit',
            }).format(new Date(image.eventDate))}
          </span>
        )}
      </div>
    </button>
  );
});

const InstagramGrid = memo(function InstagramGrid() {
  const { filteredImages, isLoading, error, hasFilters, clearFilters } = useGallery();

  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [isAppending, setIsAppending] = useState(false);
  const sentinelRef = useRef(null);
  const appendTimeoutRef = useRef(null);

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [filteredImages.length, hasFilters]);

  const loadMore = useCallback(() => {
    if (isAppending) return;
    setIsAppending(true);
    if (appendTimeoutRef.current) clearTimeout(appendTimeoutRef.current);
    appendTimeoutRef.current = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredImages.length));
      setIsAppending(false);
    }, 150);
  }, [isAppending, filteredImages.length]);

  useEffect(() => {
    if (!sentinelRef.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < filteredImages.length) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filteredImages.length, loadMore]);

  useEffect(() => () => {
    if (appendTimeoutRef.current) clearTimeout(appendTimeoutRef.current);
  }, []);

  const visibleImages = useMemo(
    () => filteredImages.slice(0, visibleCount),
    [filteredImages, visibleCount],
  );

  const carouselSet = useMemo(
    () => buildMultiImageSet(filteredImages),
    [filteredImages],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-2 border-[color:var(--retro-burgundy)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || filteredImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-10">
        <i className="ri-image-2-line text-6xl text-[color:var(--retro-burgundy)]/30 mb-6" />
        <h3 className="text-2xl font-bold text-[color:var(--color-text-primary)] mb-2">
          {SITE_CONFIG.gallery?.emptyMessage || 'Belum ada frame'}
        </h3>
        <p className="text-[color:var(--color-text-secondary)] mb-8 max-w-xs">
          {SITE_CONFIG.gallery?.emptyDescription || 'Coba ganti filter atau tunggu update arsip berikutnya.'}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-8 py-3 bg-[color:var(--retro-burgundy)] text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-[2px] sm:gap-[3px]"
        role="list"
        aria-label="Arsip frame"
      >
        {visibleImages.map((image, index) => (
          <div key={image.id} role="listitem">
            <ThumbCell
              image={image}
              index={index}
              isCarousel={image.tweetId && carouselSet.has(image.tweetId)}
            />
          </div>
        ))}
      </div>

      <div
        ref={sentinelRef}
        className="mt-12 flex flex-col items-center justify-center py-8"
      >
        {visibleCount < filteredImages.length ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-7 h-7 border-2 border-[color:var(--retro-burgundy)] border-t-transparent rounded-full ${
                isAppending ? 'animate-spin opacity-100' : 'opacity-0'
              } transition-opacity`}
            />
            <span className="text-[10px] font-black tracking-[0.4em] text-[color:var(--color-text-muted)] uppercase">
              Memuat frame berikutnya…
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
            <span className="text-[10px] font-black tracking-[0.4em] text-[color:var(--color-text-muted)] uppercase">
              {filteredImages.length.toLocaleString('id-ID')} frame ditampilkan
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default InstagramGrid;
