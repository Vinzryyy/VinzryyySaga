import { useState, useEffect, useCallback, useMemo } from "react";
import { throttle } from "../utils/security";

/**
 * useScroll Hook
 * Tracks scroll position and provides scroll-related utilities
 * @param {Object} options - Hook configuration
 * @returns {Object} Scroll state and actions
 */
export const useScroll = (options = {}) => {
  const {
    threshold = 100,
    throttleMs = 100,
    trackDirection = true,
  } = options;

  const [scrollY, setScrollY] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState("up");
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const handleScroll = useMemo(() => {
    return throttle(() => {
      const currentY = window.scrollY;
      const currentX = window.scrollX;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      setScrollY(currentY);
      setScrollX(currentX);
      setIsScrolled(currentY > threshold);
      setIsAtTop(currentY <= threshold);
      setIsAtBottom(currentY >= maxScroll - threshold);

      if (trackDirection) {
        setScrollDirection(currentY > lastScrollY ? "down" : "up");
        setLastScrollY(currentY);
      }
    }, throttleMs);
  }, [threshold, trackDirection, lastScrollY, throttleMs]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Initial scroll check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // Scroll to element
  const scrollToElement = useCallback((selector, offset = 0) => {
    const element = document.querySelector(selector);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      });
    }
  }, []);

  // Scroll progress percentage
  const scrollProgress = scrollY > 0
    ? Math.min(100, (scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
    : 0;

  return {
    // State
    scrollY,
    scrollX,
    isScrolled,
    scrollDirection,
    isAtTop,
    isAtBottom,
    scrollProgress,

    // Actions
    scrollToTop,
    scrollToBottom,
    scrollToElement,
  };
};

export default useScroll;
