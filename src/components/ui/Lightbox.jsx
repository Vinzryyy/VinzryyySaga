/**
 * Lightbox modal — fullscreen image viewer with prev/next nav, keyboard
 * arrows, swipe gestures, and metadata footer. Image picks AVIF/WebP via
 * <picture> when available, falls back to the source JPG.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLightbox } from '../../context/LightboxContext';

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const SWIPE_THRESHOLD = 50;

const Lightbox = () => {
  const { isOpen, close, next, prev, images, index } = useLightbox();
  const touchStartX = useRef(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return undefined;
    setImageLoading(true);
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close, next, prev]);

  useEffect(() => {
    setImageLoading(true);
  }, [index]);

  if (!isOpen) return null;
  const image = images[index];
  if (!image) return null;

  const showNav = images.length > 1;
  const dateLabel = formatDate(image.date);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0) next();
    else prev();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[200] bg-[color:var(--retro-brown-dark)]/95 backdrop-blur-md flex flex-col animate-[fadeIn_0.25s_ease-out]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar — index + close */}
      <header className="relative flex items-center justify-between px-5 sm:px-8 md:px-12 py-4 sm:py-5 z-10 text-[color:var(--retro-cream)]">
        <div className="flex items-center gap-3">
          <span className="font-header text-xl font-black tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[color:var(--retro-cream)]/40">/</span>
          <span className="text-[color:var(--retro-cream)]/60 tabular-nums">
            {String(images.length).padStart(2, '0')}
          </span>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Tutup"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[color:var(--retro-cream)]/10 hover:bg-[color:var(--retro-cream)]/20 border border-[color:var(--retro-cream)]/20 flex items-center justify-center text-xl transition-colors"
        >
          <i className="ri-close-line" />
        </button>
      </header>

      {/* Image container */}
      <div className="relative flex-1 flex items-center justify-center px-2 sm:px-6 md:px-16 lg:px-24 min-h-0">
        {/* Loading shimmer */}
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <i className="ri-loader-4-line text-3xl text-[color:var(--retro-cream)]/60 animate-spin" />
          </div>
        )}

        <picture className="block max-h-full max-w-full">
          {image.avifSrcSet && <source srcSet={image.avifSrcSet} type="image/avif" />}
          {image.webpSrcSet && <source srcSet={image.webpSrcSet} type="image/webp" />}
          <img
            key={image.id || image.url}
            src={image.url || image.thumbnail}
            alt={image.alt || image.title || 'Eli JKT48'}
            onLoad={() => setImageLoading(false)}
            className={`max-h-[calc(100vh-180px)] max-w-full w-auto h-auto object-contain rounded-sm shadow-2xl transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </picture>

        {/* Prev / next */}
        {showNav && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Frame sebelumnya"
              className="hidden sm:flex absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[color:var(--retro-cream)]/10 hover:bg-[color:var(--retro-cream)]/20 border border-[color:var(--retro-cream)]/20 text-[color:var(--retro-cream)] items-center justify-center text-xl transition-colors"
            >
              <i className="ri-arrow-left-s-line" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Frame berikutnya"
              className="hidden sm:flex absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[color:var(--retro-cream)]/10 hover:bg-[color:var(--retro-cream)]/20 border border-[color:var(--retro-cream)]/20 text-[color:var(--retro-cream)] items-center justify-center text-xl transition-colors"
            >
              <i className="ri-arrow-right-s-line" />
            </button>
          </>
        )}
      </div>

      {/* Metadata footer */}
      <footer className="px-5 sm:px-8 md:px-12 py-4 sm:py-5 text-[color:var(--retro-cream)] flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {image.title && (
            <p className="font-header text-base sm:text-lg font-black truncate">{image.title}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/60">
            {dateLabel && <span>{dateLabel}</span>}
            {image.location && (
              <>
                <span className="text-[color:var(--retro-cream)]/30">·</span>
                <span>{image.location}</span>
              </>
            )}
            {image.era && (
              <>
                <span className="text-[color:var(--retro-cream)]/30">·</span>
                <span>{image.era}</span>
              </>
            )}
          </div>
        </div>

        {/* Mobile-only prev/next buttons in footer */}
        {showNav && (
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={prev}
              aria-label="Frame sebelumnya"
              className="w-10 h-10 rounded-full bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/20 flex items-center justify-center"
            >
              <i className="ri-arrow-left-s-line" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Frame berikutnya"
              className="w-10 h-10 rounded-full bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/20 flex items-center justify-center"
            >
              <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

export default Lightbox;
