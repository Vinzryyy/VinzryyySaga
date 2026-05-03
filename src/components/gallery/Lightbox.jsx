/**
 * Lightbox Component
 * Full-screen image viewer with navigation and details
 * 
 * Features:
 * - Keyboard navigation (Arrow keys, Escape)
 * - Touch swipe support
 * - Image zoom
 * - Image details panel
 * - Smooth transitions
 * - Focus trap for accessibility
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useGallery } from '../../context';
import { useImageLoader } from '../../hooks/useImageLoader';

const Lightbox = ({ isOpen, onClose, initialImage }) => {
  const { images } = useGallery();
  const initialIndex = initialImage
    ? Math.max(images.findIndex((img) => img.id === initialImage.id), 0)
    : -1;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showDetails, setShowDetails] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const currentImage = currentIndex >= 0 ? images[currentIndex] : null;

  // Image loading
  const { isLoaded, error, retry } = useImageLoader(currentImage?.url, {
    skipLazyLoad: true,
  });

  // Close handler
  const handleClose = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    onClose();
  }, [onClose]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          setShowDetails((prev) => !prev);
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(prev + 0.25, 3));
          break;
        case '-':
          setZoom((prev) => Math.max(prev - 0.25, 1));
          break;
        case '0':
          setZoom(1);
          setOffset({ x: 0, y: 0 });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, goToPrevious, goToNext]);

  // Focus trap
  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e) => {
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    
    // Only drag if zoomed in
    if (zoom > 1) {
      setOffset({ x: deltaX, y: deltaY });
    }
  }, [isDragging, dragStart, zoom]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--retro-bg-dark)]/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      tabIndex={-1}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white bg-[color:var(--retro-bg-dark)]/50 hover:bg-[color:var(--retro-bg-dark)]/70 rounded-full transition-all"
        aria-label="Close lightbox"
      >
        <i className="ri-close-line text-3xl" />
      </button>

      {/* Toggle Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="absolute top-4 left-4 z-10 p-2 text-white/70 hover:text-white bg-[color:var(--retro-bg-dark)]/50 hover:bg-[color:var(--retro-bg-dark)]/70 rounded-full transition-all"
        aria-label={showDetails ? 'Hide details' : 'Show details'}
      >
        <i className={`${showDetails ? 'ri-information-line' : 'ri-information-off-line'} text-2xl`} />
      </button>

      {/* Navigation - Previous */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/70 hover:text-white bg-[color:var(--retro-bg-dark)]/50 hover:bg-[color:var(--retro-bg-dark)]/70 rounded-full transition-all"
        aria-label="Previous image"
      >
        <i className="ri-arrow-left-s-line text-3xl" />
      </button>

      {/* Navigation - Next */}
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/70 hover:text-white bg-[color:var(--retro-bg-dark)]/50 hover:bg-[color:var(--retro-bg-dark)]/70 rounded-full transition-all"
        aria-label="Next image"
      >
        <i className="ri-arrow-right-s-line text-3xl" />
      </button>

      {/* Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-16 overflow-hidden">
        {/* Loading State */}
        {!isLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[color:var(--retro-gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center">
            <i className="ri-image-off-line text-5xl text-[color:var(--retro-text-muted)] mb-4" />
            <p className="text-[color:var(--retro-text-light)] mb-4">Failed to load image</p>
            <button
              onClick={retry}
              className="px-4 py-2 bg-[color:var(--retro-gold)] hover:bg-[color:var(--retro-gold-light)] text-[color:var(--retro-bg-dark)] rounded-lg transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Actual Image */}
        <img
          ref={imageRef}
          src={currentImage.url}
          alt={currentImage.alt || currentImage.title}
          className={`
            max-w-full max-h-full object-contain
            transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}
          `}
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
          }}
        />
      </div>

      {/* Image Info Panel — driven by enriched metadata from
          gallery-enrichments.json. Falls back to placeholders for
          frames that didn't get enriched (legacy unmatched). */}
      <div
        className={`
          absolute bottom-0 left-0 right-0
          bg-gradient-to-t from-[color:var(--retro-bg-dark)]/95 via-[color:var(--retro-bg-dark)]/85 to-transparent
          px-5 sm:px-8 pt-12 pb-6 md:pb-8
          transform transition-transform duration-300
          ${showDetails ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-header font-bold text-[color:var(--retro-cream)] leading-tight">
              {currentImage.eventName || currentImage.title || 'Eli JKT48'}
            </h2>
            {typeof currentImage.favoriteCount === 'number' && currentImage.favoriteCount > 0 && (
              <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:var(--retro-burgundy)]/80 text-[color:var(--retro-cream)] text-xs font-black tabular-nums">
                <i className="ri-heart-fill text-[color:var(--retro-gold-light)]" />
                {currentImage.favoriteCount.toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {/* Date row — separates event date (when it happened) from
              upload date (when it was posted to X). For throwback
              posts these differ by months. */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-[color:var(--retro-cream)]/75 mb-3">
            {currentImage.eventDate && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-calendar-event-line text-[color:var(--retro-gold-light)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mr-1">Event</span>
                {new Date(currentImage.eventDate).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            {currentImage.uploadDate && currentImage.uploadDate !== currentImage.eventDate && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-upload-line text-[color:var(--retro-cream)]/40" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mr-1">Diposting</span>
                {new Date(currentImage.uploadDate).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {currentImage.dimensions && (
              <span className="inline-flex items-center gap-1.5 text-[color:var(--retro-cream)]/55">
                <i className="ri-aspect-ratio-line" />
                <span className="tabular-nums">
                  {currentImage.dimensions.width}×{currentImage.dimensions.height}
                </span>
              </span>
            )}
            {currentImage.metaSource === 'manual' && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-[color:var(--retro-gold-light)]/80 text-[color:var(--retro-brown-dark)] self-center">
                Manual
              </span>
            )}
          </div>

          {/* Raw caption — collapsed-by-default look (line-clamp 3) so
              long captions don't dominate the panel. Hover/tap unfolds
              via group-hover + peer pattern would over-engineer this,
              so we just show the truncated form and let users click
              "Buka di X" for the full thing. */}
          {currentImage.caption && (
            <p className="text-xs sm:text-sm text-[color:var(--retro-cream)]/85 leading-relaxed mb-3 max-w-3xl whitespace-pre-line line-clamp-3">
              {currentImage.caption}
            </p>
          )}

          {/* Hashtag chips */}
          {currentImage.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {currentImage.hashtags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded bg-[color:var(--retro-cream)]/10 text-[color:var(--retro-cream)]/70"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Tweet link CTA */}
          {currentImage.tweetUrl && (
            <a
              href={currentImage.tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-gold-light)] hover:text-[color:var(--retro-gold)] transition-colors"
            >
              <i className="ri-twitter-x-line text-base" />
              Lihat post di X
              <i className="ri-arrow-right-up-line text-base" />
            </a>
          )}
        </div>
      </div>

      {/* Image Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[color:var(--retro-bg-dark)]/50 backdrop-blur-sm rounded-full text-sm text-white/70">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setZoom((prev) => Math.max(prev - 0.25, 1))}
          className="p-2 text-white/70 hover:text-white bg-[color:var(--retro-bg-dark)]/50 hover:bg-[color:var(--retro-bg-dark)]/70 rounded-full transition-all"
          aria-label="Zoom out"
        >
          <i className="ri-subtract-line" />
        </button>
        <span className="text-sm text-white/70 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((prev) => Math.min(prev + 0.25, 3))}
          className="p-2 text-white/70 hover:text-white bg-[color:var(--retro-bg-dark)]/50 hover:bg-[color:var(--retro-bg-dark)]/70 rounded-full transition-all"
          aria-label="Zoom in"
        >
          <i className="ri-add-line" />
        </button>
      </div>
    </div>
  );
};

export default Lightbox;

