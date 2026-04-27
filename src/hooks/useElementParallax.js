/**
 * useElementParallax Hook
 * Element-relative parallax. Returns [ref, offset] — attach the ref to a
 * stable (non-transformed) wrapper, then apply translateY(offset) to a
 * child. Offset is computed from the element's distance to viewport center,
 * so movement stays subtle regardless of how far down the page the element
 * lives. rAF-throttled. Returns 0 under prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useElementParallax = (factor = 0.1, maxOffset = 60) => {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let rafId = null;
    const update = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const distance = elementCenter - viewportCenter;
        const next = Math.max(-maxOffset, Math.min(maxOffset, distance * factor));
        setOffset(next);
      }
      rafId = null;
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [factor, maxOffset]);

  return [ref, offset];
};

export default useElementParallax;
