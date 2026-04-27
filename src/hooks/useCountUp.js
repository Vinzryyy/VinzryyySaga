/**
 * useCountUp Hook
 * Animates an integer from 0 to target with easeOutCubic when `start` is true.
 * Returns the current animated value. Respects prefers-reduced-motion by
 * snapping straight to the target.
 */

import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useCountUp = (target, { duration = 1500, start = false } = {}) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) {
      setValue(0);
      return undefined;
    }
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }

    let rafId;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, start]);

  return value;
};

export default useCountUp;
