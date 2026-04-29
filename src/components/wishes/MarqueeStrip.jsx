/**
 * MarqueeStrip — horizontal infinite-scrolling wish band.
 *
 * Renders a row of compact wish cards drifting sideways in `direction`
 * ('left' = scrolls right→left, 'right' = scrolls left→right). The list
 * is duplicated end-to-end so the translateX wrap is seamless. Hovering
 * pauses the animation for legibility. Edges fade via CSS mask so cards
 * appear/disappear gracefully.
 *
 * No new deps — pure CSS keyframes (defined in <style> below).
 */

import React from 'react';

const MarqueeStrip = ({
  wishes,
  direction = 'left',
  durationS = 60,
  ariaLabel,
}) => {
  if (!wishes || wishes.length === 0) return null;

  // Duplicate so the loop wraps without a visible jump. The keyframes
  // translate -50% (the width of one full copy) so the second copy lands
  // exactly where the first started.
  const looped = [...wishes, ...wishes];

  return (
    <>
      <style>{`
        @keyframes wish-marquee-left {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes wish-marquee-right {
          from { transform: translate3d(-50%, 0, 0); }
          to   { transform: translate3d(0, 0, 0); }
        }
        .wish-marquee-track {
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .wish-marquee-left  { animation-name: wish-marquee-left; }
        .wish-marquee-right { animation-name: wish-marquee-right; }
        .wish-marquee-region:hover .wish-marquee-track {
          animation-play-state: paused;
        }
        .wish-marquee-mask {
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .wish-marquee-track { animation: none !important; }
        }
      `}</style>
      <div
        role="region"
        aria-label={ariaLabel || 'Wishes terbang'}
        className="wish-marquee-region wish-marquee-mask relative overflow-hidden py-2"
      >
        <div
          className={`wish-marquee-track wish-marquee-${direction} flex gap-4 w-max`}
          style={{ animationDuration: `${durationS}s` }}
        >
          {looped.map((wish, i) => (
            <article
              key={`${wish.name}-${wish.date}-${i}`}
              className="flex-shrink-0 w-[260px] sm:w-[300px] rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-4 shadow-md hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] flex items-center justify-center flex-shrink-0">
                  <i className="ri-user-smile-line text-sm" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-[color:var(--retro-text-primary)] leading-tight truncate">
                    {wish.name}
                  </p>
                  {wish.handle && (
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] truncate">
                      {wish.handle}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-[color:var(--retro-text-secondary)] leading-snug line-clamp-3">
                “{wish.message}”
              </p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
};

export default MarqueeStrip;
