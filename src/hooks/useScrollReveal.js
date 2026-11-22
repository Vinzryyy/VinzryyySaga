/**
 * useScrollReveal Hook
 * Simplified & Robust Version for Editorial Gallery
 */

import { useEffect, useRef, useState } from 'react';

export const useScrollReveal = (options = {}) => {
  const {
    threshold = 0.05,
    // Start revealing a bit before the element reaches the viewport so
    // fast scrollers don't land on blank space.
    rootMargin = '0px 0px 160px 0px',
    triggerOnce = true,
  } = options;

  // Reduced motion (or no IntersectionObserver): show content right away
  // instead of leaving it invisible until it scrolls into view.
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window) ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [triggerOnce, threshold, rootMargin, isVisible]);

  return { elementRef, isVisible };
};

export default useScrollReveal;
