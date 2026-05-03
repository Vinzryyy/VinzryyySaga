/**
 * ImageCard Component
 * High-End Editorial Version
 *
 * On enriched entries (eventName + eventDate from gallery-enrichments
 * merge), shows a bottom-aligned gradient overlay with the event name
 * and event date — visible by default on touch devices, fade-in on
 * hover for desktop. A small heart pill in the top-right surfaces
 * favoriteCount when ≥ 50.
 */

import React, { memo } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useLightbox } from '../../context/LightboxContext';
import { useGallery } from '../../context';

const formatEventDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const ImageCard = memo(function ImageCard({
  image,
  index = 0,
  density = 'comfortable',
  viewMode = 'grid',
}) {
  const { open } = useLightbox();
  const { filteredImages } = useGallery();
  const handleClick = () => open(filteredImages, index);
  const {
    url,
    thumbnail,
    webpSrcSet,
    avifSrcSet,
    alt,
    dimensions,
    title,
    eventName,
    eventDate,
    favoriteCount,
    metaSource,
  } = image;

  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.05,
    rootMargin: '100px',
    triggerOnce: true,
  });

  const animationDelay = `${Math.min(index * 50, 500)}ms`;
  const aspectByView = {
    grid: {
      compact: '120%',
      comfortable: '140%',
      editorial: '165%',
    },
    timeline: {
      compact: '70%',
      comfortable: '80%',
      editorial: '95%',
    },
    moodboard: {
      compact: '115%',
      comfortable: '130%',
      editorial: '150%',
    },
  };
  const paddingBottom = aspectByView[viewMode]?.[density] || '140%';

  // Treat the placeholder title from the auto-generated gallery file
  // as "no real metadata" so we don't accidentally render the same
  // boilerplate label as an event tag on every card.
  const displayName =
    eventName && eventName !== 'Eli JKT48 Moment' ? eventName : null;
  const displayDate = formatEventDate(eventDate);
  const showOverlay = !!(displayName || displayDate);
  const showFavBadge = typeof favoriteCount === 'number' && favoriteCount >= 50;

  return (
    <article
      ref={elementRef}
      className={`
        group relative overflow-hidden rounded-[2rem]
        bg-[color:var(--retro-bg-primary)] shadow-retro
        transform transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
      style={{ transitionDelay: animationDelay }}
      role="listitem"
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Buka frame${displayName ? ': ' + displayName : ''}`}
        className="block relative overflow-hidden w-full cursor-zoom-in text-left"
        style={{ paddingBottom }}
      >
        <picture>
          {avifSrcSet && <source srcSet={avifSrcSet} type="image/avif" />}
          {webpSrcSet && <source srcSet={webpSrcSet} type="image/webp" />}
          <img
            src={thumbnail || url}
            alt={alt || displayName || title || 'Eli JKT48'}
            loading="lazy"
            decoding="async"
            width={dimensions?.width}
            height={dimensions?.height}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </picture>

        {/* Top-right favorite badge — only on popular posts. Manual-
            source overrides don't have a favorite count, so this
            naturally hides on those. */}
        {showFavBadge && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[color:var(--retro-burgundy)]/85 backdrop-blur-sm text-[color:var(--retro-cream)] text-[9px] font-black tabular-nums tracking-wide pointer-events-none">
            <i className="ri-heart-fill text-[color:var(--retro-gold-light)]" />
            {favoriteCount.toLocaleString('id-ID')}
          </span>
        )}

        {/* Bottom overlay — event name + date. Always visible on
            touch (no hover); desktop fades it in on group-hover so
            cards stay clean at rest. Manual-source pill differentiates
            inferred entries from API-confirmed ones. */}
        {showOverlay && (
          <div
            className="
              absolute inset-x-0 bottom-0 px-4 pt-12 pb-4
              bg-gradient-to-t from-black/85 via-black/45 to-transparent
              text-[color:var(--retro-cream)]
              opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100
              transition-opacity duration-300 pointer-events-none
            "
          >
            {displayName && (
              <p className="font-bold text-sm leading-snug line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                {displayName}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {displayDate && (
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--retro-cream)]/85 inline-flex items-center gap-1">
                  <i className="ri-calendar-event-line" />
                  {displayDate}
                </span>
              )}
              {metaSource === 'manual' && (
                <span className="text-[8px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded bg-[color:var(--retro-gold-light)]/80 text-[color:var(--retro-brown-dark)]">
                  Manual
                </span>
              )}
            </div>
          </div>
        )}
      </button>
    </article>
  );
});

export default ImageCard;
