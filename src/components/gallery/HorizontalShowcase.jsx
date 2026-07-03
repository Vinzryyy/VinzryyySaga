/**
 * HorizontalShowcase
 * GSAP ScrollTrigger Horizontal-Pan — the section pins to the viewport
 * while the image track scrolls left as the user scrolls down. Gives the
 * gallery page a cinematic intro before the Instagram grid.
 *
 * Desktop (≥768px): GSAP pinned horizontal pan with scrub.
 * Mobile (<768px):  Native horizontal scroll-snap strip (no GSAP).
 *
 * Uses the first 10 featuredImages from GalleryContext. Opens the
 * lightbox on click, same as the marquee on Home.
 */

import React, { useEffect, useRef } from 'react';
import { useGallery } from '../../context';
import { useLightbox } from '../../context/LightboxContext';

const HorizontalShowcase = () => {
  const { featuredImages } = useGallery();
  const { open: openLightbox } = useLightbox();
  const containerRef = useRef(null);
  const trackRef = useRef(null);

  const slides = (featuredImages || []).slice(0, 10);

  useEffect(() => {
    if (slides.length === 0) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 768) return;

    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    let ctx;
    (async () => {
      try {
        const { gsap } = await import('gsap');
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          // Pan distance = total track width minus one viewport width.
          // We measure after fonts + images have laid out — the RAF tick
          // ensures the browser has painted at least once before measuring.
          requestAnimationFrame(() => {
            const totalPan = track.scrollWidth - window.innerWidth;
            if (totalPan <= 0) return;

            gsap.to(track, {
              x: -totalPan,
              ease: 'none',
              scrollTrigger: {
                trigger: container,
                start: 'top top',
                end: () => `+=${totalPan}`,
                pin: true,
                scrub: 1.2,
                anticipatePin: 1,
                // Re-calculate end on resize so the pan stays accurate.
                invalidateOnRefresh: true,
              },
            });
          });
        }, container);
      } catch {
        // GSAP not available — desktop sees the mobile snap strip via CSS fallback
      }
    })();

    return () => ctx?.revert();
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <>
      {/* ─── Desktop: GSAP pinned horizontal pan ─────────────────────── */}
      <div
        ref={containerRef}
        className="hidden md:block relative h-screen bg-[color:var(--retro-brown-dark)]"
      >
        {/* Top eyebrow — gradient overlay keeps it legible over any image */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none px-10 pt-10 pb-24"
          style={{
            background:
              'linear-gradient(to bottom, rgba(92,74,58,0.75) 0%, transparent 100%)',
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-cream)]/70">
            Sorotan Arsip
          </p>
        </div>

        {/* Bottom scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-cream)]/50">
            Scroll untuk jelajah
          </span>
          <div className="w-px h-6 bg-gradient-to-b from-[color:var(--retro-cream)]/40 to-transparent animate-pulse" />
        </div>

        {/* Horizontal track — GSAP translates this on scroll */}
        <div
          ref={trackRef}
          className="flex h-full items-center gap-5 pl-[8vw] pr-[35vw] w-max will-change-transform"
        >
          {slides.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => openLightbox(slides, i)}
              aria-label={`Buka frame: ${image.title || 'Eli JKT48'}`}
              className="group flex-shrink-0 h-[72vh] aspect-[3/4] rounded-2xl overflow-hidden relative img-shine cursor-zoom-in shadow-2xl shadow-[color:var(--retro-brown-dark)]/60"
              style={{
                transform: `rotate(${i % 2 === 0 ? '-0.8' : '0.8'}deg)`,
              }}
            >
              <picture>
                {image.avifSrcSet && (
                  <source srcSet={image.avifSrcSet} type="image/avif" />
                )}
                {image.webpSrcSet && (
                  <source srcSet={image.webpSrcSet} type="image/webp" />
                )}
                <img
                  src={image.thumbnail || image.url}
                  alt={image.alt || image.title || 'Eli JKT48'}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                  draggable="false"
                />
              </picture>

              {/* Year badge */}
              {image.date && (
                <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-full bg-[color:var(--retro-brown-dark)]/70 backdrop-blur-sm">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/80 tabular-nums">
                    {String(image.date).slice(0, 4)}
                  </span>
                </div>
              )}

              {/* Hover dark overlay */}
              <div className="absolute inset-0 bg-[color:var(--retro-brown-dark)]/0 group-hover:bg-[color:var(--retro-brown-dark)]/20 transition-colors duration-300" />
            </button>
          ))}
        </div>
      </div>

      {/* ─── Mobile: native horizontal scroll-snap strip ─────────────── */}
      <div className="block md:hidden bg-[color:var(--retro-brown-dark)] py-8">
        <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-cream)]/60 px-5 mb-5">
          Sorotan Arsip
        </p>
        <div className="overflow-x-auto [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3 w-max px-5">
            {slides.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => openLightbox(slides, i)}
                aria-label={`Buka frame: ${image.title || 'Eli JKT48'}`}
                className="flex-shrink-0 h-[55vw] aspect-[3/4] rounded-xl overflow-hidden [scroll-snap-align:center] cursor-zoom-in relative"
              >
                <img
                  src={image.thumbnail || image.url}
                  alt={image.alt || image.title || 'Eli JKT48'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable="false"
                />
                {image.date && (
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-[color:var(--retro-brown-dark)]/70 backdrop-blur-sm">
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-cream)]/80 tabular-nums">
                      {String(image.date).slice(0, 4)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default HorizontalShowcase;
