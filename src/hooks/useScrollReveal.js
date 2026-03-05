/**
 * useScrollReveal Hook
 * Handles scroll-based animations and visibility detection
 */

import { useEffect, useRef, useState } from 'react';

/**
 * @param {Object} options - Intersection Observer options
 * @returns {Object} Ref and visibility state
 */
export const useScrollReveal = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            
            if (triggerOnce && entry.target === element) {
              observerRef.current?.unobserve(element);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return {
    elementRef,
    isVisible,
  };
};

/**
 * useScrollPosition Hook
 * Tracks scroll position for navbar, back-to-top, etc.
 * @param {number} throttleMs - Throttle time in milliseconds
 * @returns {number} Current scroll Y position
 */
export const useScrollPosition = (throttleMs = 100) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      
      // Throttle updates
      if (now - lastUpdateRef.current >= throttleMs) {
        setScrollPosition(window.scrollY);
        lastUpdateRef.current = now;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [throttleMs]);

  return scrollPosition;
};

/**
 * useParallax Hook
 * Creates parallax scrolling effect
 * @param {number} speed - Parallax speed multiplier
 * @returns {Object} Transform style for parallax effect
 */
export const useParallax = (speed = 0.5) => {
  const [offset, setOffset] = useState(0);
  const requestRef = useRef(null);

  useEffect(() => {
    const animate = () => {
      setOffset(window.scrollY * speed);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [speed]);

  return {
    transform: `translateY(${offset}px)`,
    offset,
  };
};

/**
 * useRevealOnScroll Hook
 * Combines scroll position with reveal animation
 * @param {number} revealAt - Scroll position to trigger reveal (in px)
 * @returns {Object} Ref and animation state
 */
export const useRevealOnScroll = (revealAt = 200) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const elementRef = useRef(null);
  const scrollPosition = useScrollPosition(100);

  useEffect(() => {
    if (scrollPosition > revealAt) {
      setIsRevealed(true);
    }
  }, [scrollPosition, revealAt]);

  return {
    elementRef,
    isRevealed,
  };
};

/**
 * useActiveSection Hook
 * Tracks which section is currently in viewport
 * @param {Array<string>} sectionIds - Array of section IDs to track
 * @returns {string} Active section ID
 */
export const useActiveSection = (sectionIds = []) => {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');
  const observerRef = useRef(null);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px',
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [sectionIds]);

  return activeSection;
};

export default useScrollReveal;
