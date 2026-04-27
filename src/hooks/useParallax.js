/**
 * useParallax Hook
 * Returns a Y-offset (in pixels) derived from window.scrollY * factor.
 * Throttled via requestAnimationFrame so the consumer doesn't re-render
 * on every raw scroll event. Returns 0 when prefers-reduced-motion.
 */

import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useParallax = (factor = 0.2) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let rafId = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        setOffset(window.scrollY * factor);
        rafId = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [factor]);

  return offset;
};

export default useParallax;
