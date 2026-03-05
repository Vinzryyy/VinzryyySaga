/**
 * useImageLoader Hook
 * Handles lazy loading, error handling, and loading states for images
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * @param {string} src - Image source URL
 * @param {Object} options - Loading options
 * @returns {Object} Loading state and handlers
 */
export const useImageLoader = (src, options = {}) => {
  const {
    placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMzAwIj48cmVjdCBmaWxsPSIjMWExYTJlIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIvPjwvc3ZnPg==',
    rootMargin = '50px',
    threshold = 0.01,
    skipLazyLoad = false,
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [isInView, setIsInView] = useState(false);
  
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Load image handler
  const loadImage = useCallback(() => {
    if (!src) {
      setError('No image source provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
      setIsLoaded(false);
    };
    
    img.src = src;
  }, [src]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (skipLazyLoad) {
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [rootMargin, threshold, skipLazyLoad]);

  // Load image when in view
  useEffect(() => {
    if (isInView && !isLoaded && !error) {
      loadImage();
    }
  }, [isInView, isLoaded, error, loadImage]);

  // Retry function
  const retry = useCallback(() => {
    setIsLoaded(false);
    setError(null);
    setIsLoading(true);
    loadImage();
  }, [loadImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return {
    imgRef,
    isLoading,
    isLoaded,
    error,
    isInView,
    retry,
    // For rendering
    src: isLoaded ? src : placeholder,
  };
};

/**
 * useImagePreload Hook
 * Preloads multiple images for smoother gallery experience
 */
export const useImagePreload = (imageUrls) => {
  const [loadedCount, setLoadedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) {
      setIsComplete(true);
      return;
    }

    let loaded = 0;
    const total = imageUrls.length;

    imageUrls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === total) {
          setIsComplete(true);
        }
      };
      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === total) {
          setIsComplete(true);
        }
      };
      img.src = url;
    });

    return () => {
      // Cleanup
    };
  }, [imageUrls]);

  return {
    loadedCount,
    total: imageUrls?.length || 0,
    isComplete,
    progress: imageUrls?.length ? (loadedCount / imageUrls.length) * 100 : 100,
  };
};

export default useImageLoader;
