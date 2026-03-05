import { useState, useEffect, useCallback } from "react";

/**
 * useMediaQuery Hook
 * Tracks media query matches and updates on viewport changes
 * @param {string} query - Media query string
 * @returns {boolean} Whether the media query matches
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
};

/**
 * useBreakpoint Hook
 * Provides breakpoint detection for responsive design
 * @returns {Object} Breakpoint state
 */
export const useBreakpoint = () => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1025px)");
  const isLargeDesktop = useMediaQuery("(min-width: 1440px)");

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint: isLargeDesktop
      ? "large-desktop"
      : isDesktop
      ? "desktop"
      : isTablet
      ? "tablet"
      : "mobile",
  };
};

/**
 * useDarkMode Hook
 * Manages dark mode preference with system detection
 * @param {string} storageKey - LocalStorage key
 * @returns {Object} Dark mode state and toggle function
 */
export const useDarkMode = (storageKey = "theme") => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem(storageKey, "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem(storageKey, "light");
    }
  }, [isDark, storageKey]);

  const toggle = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const set = useCallback((value) => {
    setIsDark(value);
  }, []);

  return { isDark, toggle, set };
};

/**
 * usePrefersReducedMotion Hook
 * Detects user's motion preference for accessibility
 * @returns {boolean} Whether user prefers reduced motion
 */
export const usePrefersReducedMotion = () => {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
};

export default {
  useMediaQuery,
  useBreakpoint,
  useDarkMode,
  usePrefersReducedMotion,
};
