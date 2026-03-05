import { useState, useEffect } from "react";

/**
 * useIntersectionObserver Hook
 * Tracks when an element enters the viewport using Intersection Observer API
 * @param {Object} options - Intersection Observer options
 * @returns {Object} ref callback and visibility state
 */
export const useIntersectionObserver = (options = {}) => {
  const [ref, setRef] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: "50px",
      ...options,
    });

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return { ref: setRef, isVisible };
};

export default useIntersectionObserver;
