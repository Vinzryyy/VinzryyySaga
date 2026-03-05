/**
 * ImageCard Component
 * Displays a single gallery image with hover effects and lazy loading
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Hover reveal effects
 * - Loading skeleton
 * - Error handling
 * - Keyboard accessibility
 */

import React, { memo, useCallback } from 'react';
import { useImageLoader } from '../../hooks/useImageLoader';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { getAspectRatioClass } from '../../utils/imageOptimize';

const ImageCard = memo(function ImageCard({
  image,
  onClick,
  index = 0,
}) {
  const {
    url,
    thumbnail,
    title,
    description,
    category,
    year,
    location,
    dimensions,
  } = image;

  // Image loading state
  const {
    imgRef,
    isLoaded,
    error,
    retry,
  } = useImageLoader(thumbnail || url, {
    rootMargin: '100px',
    threshold: 0.01,
  });

  // Scroll reveal animation
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Handle click
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(image);
    }
  }, [image, onClick]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  // Calculate aspect ratio class
  const aspectClass = getAspectRatioClass(
    dimensions?.width || 4,
    dimensions?.height || 3
  );

  // Stagger animation delay based on index
  const animationDelay = `${Math.min(index * 50, 500)}ms`;

  return (
    <article
      ref={elementRef}
      className={`
        group relative overflow-hidden rounded-xl
        bg-[color:var(--retro-bg-primary)]/70 backdrop-blur-md
        border border-[color:var(--retro-border)]
        cursor-pointer
        transform transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        hover:shadow-retro-lg
        focus-within:ring-2 focus-within:ring-[color:var(--retro-gold)]
      `}
      style={{ transitionDelay: animationDelay }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View ${title} - ${description}`}
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden ${aspectClass}`}>
        {/* Loading Skeleton */}
        {!isLoaded && !error && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[color:var(--retro-bg-secondary)] via-[color:var(--retro-bg-tertiary)] to-[color:var(--retro-sepia)]/30" />
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--retro-bg-secondary)]">
            <div className="text-center p-4">
              <i className="ri-image-off-line text-4xl text-[color:var(--retro-text-light)] mb-2" />
              <p className="text-sm text-[color:var(--retro-text-secondary)]">Failed to load</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retry();
                }}
                className="mt-2 text-xs text-[color:var(--retro-gold)] hover:text-[color:var(--retro-gold-light)] underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Actual Image */}
        <img
          ref={imgRef}
          src={url}
          alt={title}
          loading="lazy"
          className={`
            h-full w-full object-cover
            transform transition-transform duration-700 ease-out
            group-hover:scale-110
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        />

        {/* Overlay Gradient - Retro */}
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-bg-dark)]/80 via-[color:var(--retro-bg-dark)]/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Category Badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium text-white bg-[color:var(--retro-bg-dark)]/60 backdrop-blur-sm rounded-full capitalize">
          {category}
        </span>

        {/* Year Badge */}
        <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium text-white bg-[color:var(--retro-gold)]/80 backdrop-blur-sm rounded-full">
          {year}
        </span>

        {/* Hover Action Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <i className="ri-eye-2-line text-2xl text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-header text-lg font-semibold text-[color:var(--retro-text-primary)] group-hover:text-[color:var(--retro-gold)] transition-colors duration-300 line-clamp-1">
          {title}
        </h3>

        <p className="mt-1 text-sm text-[color:var(--retro-text-secondary)] line-clamp-2">
          {description}
        </p>

        {/* Meta Info */}
        <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--retro-text-light)]">
          <span className="flex items-center gap-1">
            <i className="ri-map-pin-line" />
            {location.split(',')[0]}
          </span>
          {dimensions && (
            <span>
              {dimensions.width} × {dimensions.height}
            </span>
          )}
        </div>
      </div>
    </article>
  );
});

export default ImageCard;
