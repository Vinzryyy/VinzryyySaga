import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useLightbox Hook
 * Manages lightbox state, navigation, and keyboard controls
 * @param {Array} images - Array of image objects
 * @returns {Object} Lightbox state and actions
 */
export const useLightbox = (images = []) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const closeTimeoutRef = useRef(null);

  // Open lightbox at specific index
  const open = useCallback((index = 0) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
      setIsOpen(true);
      setError(null);
    }
  }, [images.length]);

  // Close lightbox with optional delay
  const close = useCallback((delay = 0) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    if (delay > 0) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        setCurrentIndex(0);
        setError(null);
      }, delay);
    } else {
      setIsOpen(false);
      setCurrentIndex(0);
      setError(null);
    }
  }, []);

  // Navigate to next image
  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsLoading(true);
    setError(null);
  }, [images.length]);

  // Navigate to previous image
  const previous = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsLoading(true);
    setError(null);
  }, [images.length]);

  // Navigate to specific index
  const goToIndex = useCallback((index) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
      setIsLoading(true);
      setError(null);
    }
  }, [images.length]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle image error
  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setError("Failed to load image");
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          close();
          break;
        case "ArrowRight":
          next();
          break;
        case "ArrowLeft":
          previous();
          break;
        case "Home":
          goToIndex(0);
          break;
        case "End":
          goToIndex(images.length - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [isOpen, close, next, previous, goToIndex, images.length]);

  // Preload adjacent images
  useEffect(() => {
    if (!isOpen || images.length === 0) return;

    const preloadImage = (index) => {
      const img = new Image();
      img.src = images[index]?.image;
    };

    // Preload next and previous images
    const nextIndex = (currentIndex + 1) % images.length;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    
    preloadImage(nextIndex);
    preloadImage(prevIndex);
  }, [currentIndex, isOpen, images]);

  // Get current image
  const currentImage = images[currentIndex] || null;

  return {
    // State
    isOpen,
    currentIndex,
    currentImage,
    isLoading,
    error,
    totalImages: images.length,

    // Actions
    open,
    close,
    next,
    previous,
    goToIndex,
    handleImageLoad,
    handleImageError,
  };
};

export default useLightbox;
