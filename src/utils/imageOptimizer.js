/**
 * Image Optimization Utilities
 * Performance helpers for image loading and optimization
 */

import { PERFORMANCE_CONFIG } from "./constants";

/**
 * Generate responsive image srcset
 * @param {string} baseUrl - Base image URL
 * @param {number[]} widths - Array of widths for srcset
 * @returns {string} Srcset string
 */
export const generateSrcSet = (baseUrl, widths = [400, 800, 1200, 1600]) => {
  if (!baseUrl) return "";
  
  return widths
    .map((width) => {
      // In production, this would use an image CDN
      return `${baseUrl}?w=${width} ${width}w`;
    })
    .join(", ");
};

/**
 * Generate image sizes attribute for responsive images
 * @param {string} breakpoint - Breakpoint configuration
 * @returns {string} Sizes attribute string
 */
export const generateImageSizes = (breakpoint = "default") => {
  const sizeConfigs = {
    default: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    thumbnail: "(max-width: 768px) 50vw, 25vw",
    full: "100vw",
  };
  
  return sizeConfigs[breakpoint] || sizeConfigs.default;
};

/**
 * Create a placeholder image using SVG
 * @param {number} width - Placeholder width
 * @param {number} height - Placeholder height
 * @param {string} color - Background color
 * @returns {string} Data URI of placeholder SVG
 */
export const createPlaceholder = (width = 400, height = 300, color = "#1a1a1a") => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
};

/**
 * Blur-up placeholder generator
 * @param {string} imageUrl - Original image URL
 * @param {number} quality - Blur quality (0-100)
 * @returns {string} Blurred image data URL
 */
export const createBlurPlaceholder = async (imageUrl, quality = 10) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // Small size for blur effect
      canvas.width = quality;
      canvas.height = Math.round((quality * img.height) / img.width);
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get blurred image as data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      resolve(createPlaceholder());
    };
  });
};

/**
 * Lazy load image with Intersection Observer
 * @param {HTMLImageElement} img - Image element to load
 * @param {string} src - Image source URL
 * @returns {Promise<void>}
 */
export const lazyLoadImage = (img, src) => {
  return new Promise((resolve, reject) => {
    const loadedImg = new Image();
    loadedImg.src = src;
    
    loadedImg.onload = () => {
      img.src = src;
      img.classList.add("loaded");
      resolve();
    };
    
    loadedImg.onerror = reject;
  });
};

/**
 * Preload critical images
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export const preloadImages = (imageUrls) => {
  imageUrls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
};

/**
 * Get optimized image URL based on viewport
 * @param {string} baseUrl - Base image URL
 * @param {number} viewportWidth - Current viewport width
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (baseUrl, viewportWidth = window.innerWidth) => {
  if (!baseUrl) return "";
  
  // Determine appropriate width based on viewport
  let width;
  if (viewportWidth < 768) {
    width = 400;
  } else if (viewportWidth < 1200) {
    width = 800;
  } else {
    width = 1200;
  }
  
  // In production, use image CDN parameters
  return `${baseUrl}?w=${width}&q=${PERFORMANCE_CONFIG.imageQuality}`;
};

/**
 * Check if image is cached
 * @param {string} url - Image URL
 * @returns {boolean} True if image is in cache
 */
export const isImageCached = (url) => {
  const cache = caches;
  if (!cache) return false;
  
  // Check cache API if available
  return cache.match(url).then((response) => response !== undefined).catch(() => false);
};

/**
 * Extract dominant color from image (simplified version)
 * @param {HTMLImageElement} img - Image element
 * @returns {Promise<string>} Dominant color as hex
 */
export const getDominantColor = (img) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1;
    canvas.height = 1;
    
    ctx.drawImage(img, 0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    const [r, g, b] = imageData.data;
    
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    resolve(hex);
  });
};
