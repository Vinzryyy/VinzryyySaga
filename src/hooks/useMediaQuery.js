import { useState, useEffect } from "react";

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
};

/**
 * useIsMobile — phone+phablet detection untuk 3D perf tier decisions.
 * Threshold 767px = Tailwind md breakpoint. Beda dari layout breakpoints
 * (640px / sm) — useIsMobile lebih lebar karena intent-nya "device class
 * yang gak boleh dapet full quality 3D".
 */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
