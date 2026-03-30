/**
 * useScrollReveal Hook
 * Simplified & Robust Version for Editorial Gallery
 */

import { useEffect, useRef, useState } from 'react';

export const useScrollReveal = (options = {}) => {
  const {
    threshold = 0.05,
    rootMargin = '100px',
    triggerOnce = true,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

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
  }, [triggerOnce, threshold, rootMargin]);

  return { elementRef, isVisible };
};

export default useScrollReveal;
