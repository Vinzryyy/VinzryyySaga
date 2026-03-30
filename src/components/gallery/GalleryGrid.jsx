/**
 * GalleryGrid Component
 * Enhanced Editorial Masonry with INFINITE SCROLL (Lazy Scroll)
 */

import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useGallery } from '../../context';
import ImageCard from './ImageCard';
import { SITE_CONFIG } from '../../config/siteConfig';

const BATCH_SIZE = 24;

const GalleryGrid = memo(function GalleryGrid({
  imagesOverride = null,
}) {
  const {
    filteredImages,
    ui,
    isLoading,
    error,
    hasFilters,
    clearFilters,
  } = useGallery();
  const imagesToDisplay = imagesOverride || filteredImages;

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [isAppending, setIsAppending] = useState(false);

  // Reset pagination when filters change or images change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [imagesToDisplay.length, hasFilters]);

  // Infinite Scroll Sentinel
  const sentinelRef = useRef(null);
  const appendTimeoutRef = useRef(null);

  const loadMore = useCallback(() => {
    if (isAppending) return;
    setIsAppending(true);
    if (appendTimeoutRef.current) clearTimeout(appendTimeoutRef.current);
    appendTimeoutRef.current = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, imagesToDisplay.length));
      setIsAppending(false);
    }, 150);
  }, [isAppending, imagesToDisplay.length]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < imagesToDisplay.length) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, imagesToDisplay.length, loadMore]);

  useEffect(() => {
    return () => {
      if (appendTimeoutRef.current) clearTimeout(appendTimeoutRef.current);
    };
  }, []);

  // Get only currently visible images
  const visibleImages = useMemo(() => {
    return imagesToDisplay.slice(0, visibleCount);
  }, [imagesToDisplay, visibleCount]);

  const gridColumnsClass = useMemo(() => {
    if (ui.viewMode !== 'grid') return '';
    if (ui.density === 'compact') return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5';
    if (ui.density === 'editorial') return 'grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8';
  }, [ui.viewMode, ui.density]);

  const timelineGapClass = useMemo(() => {
    if (ui.density === 'compact') return 'space-y-4';
    if (ui.density === 'editorial') return 'space-y-10';
    return 'space-y-6';
  }, [ui.density]);

  const moodboardColumnsClass = useMemo(() => {
    if (ui.density === 'compact') return 'columns-2 md:columns-3 lg:columns-4';
    if (ui.density === 'editorial') return 'columns-1 md:columns-2 lg:columns-3';
    return 'columns-1 md:columns-2 lg:columns-3';
  }, [ui.density]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-2 border-[color:var(--retro-burgundy)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || imagesToDisplay.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-10 bg-white/30 rounded-[3rem] backdrop-blur-md border border-white/20">
        <i className="ri-windy-line text-6xl text-[color:var(--retro-burgundy)]/30 mb-6" />
        <h3 className="text-2xl font-bold text-[color:var(--color-text-primary)] mb-2">{SITE_CONFIG.gallery.emptyMessage}</h3>
        <p className="text-[color:var(--color-text-secondary)] mb-8 max-w-xs">{SITE_CONFIG.gallery.emptyDescription}</p>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-8 py-3 bg-[color:var(--retro-burgundy)] text-white rounded-full font-bold shadow-lg shadow-[color:var(--retro-burgundy)]/20 hover:scale-105 transition-transform"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {ui.viewMode === 'timeline' && (
        <div className={`max-w-4xl mx-auto ${timelineGapClass}`} role="list" aria-label="Photo gallery timeline">
          {visibleImages.map((image, index) => (
            <div key={image.id} className="w-full">
              <ImageCard image={image} index={index} density={ui.density} viewMode={ui.viewMode} />
            </div>
          ))}
        </div>
      )}

      {ui.viewMode === 'grid' && (
        <div className={`grid ${gridColumnsClass}`} role="list" aria-label="Photo gallery grid">
          {visibleImages.map((image, index) => (
            <div key={image.id} className="w-full">
              <ImageCard image={image} index={index} density={ui.density} viewMode={ui.viewMode} />
            </div>
          ))}
        </div>
      )}

      {ui.viewMode === 'moodboard' && (
        <div className={moodboardColumnsClass} role="list" aria-label="Photo moodboard">
          {visibleImages.map((image, index) => (
            <div key={image.id} className="mb-4 lg:mb-6 break-inside-avoid">
              <ImageCard image={image} index={index} density={ui.density} viewMode={ui.viewMode} />
            </div>
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel & Loading Indicator */}
      <div
        ref={sentinelRef}
        className="mt-16 flex flex-col items-center justify-center py-10"
      >
        {visibleCount < imagesToDisplay.length ? (
          <div className="flex flex-col items-center gap-4">
            <div className={`w-8 h-8 border-2 border-[color:var(--retro-burgundy)] border-t-transparent rounded-full ${isAppending ? 'animate-spin opacity-100' : 'opacity-0'} transition-opacity`} />
            <span className="text-[10px] font-black tracking-[0.4em] text-[color:var(--retro-text-muted)] uppercase">{SITE_CONFIG.gallery.loadingMessage}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-[1px] bg-[color:var(--retro-burgundy)] opacity-30" />
            <div className="text-center">
              <span className="text-[10px] font-black tracking-[0.5em] text-[color:var(--retro-text-muted)] uppercase block mb-2">{SITE_CONFIG.gallery.endMessage}</span>
              <p className="font-header text-2xl font-black text-[color:var(--color-text-primary)] tracking-tighter italic">{SITE_CONFIG.gallery.endQuote}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default GalleryGrid;
