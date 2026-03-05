import { forwardRef } from "react";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";

/**
 * LazyImage Component
 * Performance-optimized image with lazy loading and fade-in effect
 * @param {Object} props - Component props
 */
export const LazyImage = forwardRef(({
  src,
  alt = "",
  className = "",
  placeholderColor = "#1a1a1a",
  onLoad,
  onError,
  ...imgProps
}, ref) => {
  const { ref: observerRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "50px",
  });

  const handleLoad = (e) => {
    e.target.classList.add("image-loaded");
    onLoad?.(e);
  };

  const handleError = (e) => {
    e.target.classList.add("image-error");
    onError?.(e);
  };

  return (
    <div
      ref={(node) => {
        observerRef(node);
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{ backgroundColor: placeholderColor }}
    >
      {/* Placeholder skeleton */}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />

      {/* Actual image */}
      {isVisible && src && (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 image-element"
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          {...imgProps}
        />
      )}
    </div>
  );
});

LazyImage.displayName = "LazyImage";

/**
 * OptimizedImage Component
 * Image with srcset for responsive loading
 * @param {Object} props - Component props
 */
export const OptimizedImage = forwardRef(({
  src,
  alt = "",
  className = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  srcSet,
  placeholderColor = "#1a1a1a",
  ...imgProps
}, ref) => {
  const { ref: observerRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "100px",
  });

  const generateSrcSet = (baseUrl) => {
    if (!baseUrl) return "";
    const widths = [400, 800, 1200, 1600];
    return widths
      .map((w) => `${baseUrl}?w=${w} ${w}w`)
      .join(", ");
  };

  const finalSrcSet = srcSet || generateSrcSet(src);

  return (
    <div
      ref={observerRef}
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{ backgroundColor: placeholderColor }}
    >
      {/* Placeholder */}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />

      {/* Actual image */}
      {isVisible && src && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 image-element"
          sizes={sizes}
          srcSet={finalSrcSet}
          loading="lazy"
          decoding="async"
          onLoad={(e) => e.target.classList.add("image-loaded")}
          {...imgProps}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default LazyImage;
