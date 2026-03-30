/**
 * ImageCard Component
 * High-End Editorial Version
 */

import React, { memo } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const ImageCard = memo(function ImageCard({
  image,
  index = 0,
  density = 'comfortable',
  viewMode = 'grid',
}) {
  const {
    url,
    thumbnail,
    alt,
    dimensions,
    title,
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
      <div
        className="block relative overflow-hidden w-full"
        style={{ paddingBottom }}
      >
        {/* Image */}
        <img
          src={thumbnail || url}
          alt={alt || title}
          loading="lazy"
          decoding="async"
          width={dimensions?.width}
          height={dimensions?.height}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </article>
  );
});

export default ImageCard;
