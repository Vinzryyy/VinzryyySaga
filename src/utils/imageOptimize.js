/**
 * Image Optimization Utilities
 * Performance-focused image handling for optimal loading and display
 */

/**
 * Generate responsive image srcset for different screen sizes
 * @param {string} baseUrl - Base image URL
 * @param {Array<number>} widths - Array of widths to generate
 * @returns {string} srcset attribute value
 */
export const generateSrcSet = (baseUrl, widths = [400, 800, 1200, 1600]) => {
  if (!baseUrl) return '';
  
  // Handle Unsplash URLs specially
  if (baseUrl.includes('unsplash.com')) {
    return widths
      .map(w => {
        const sizedUrl = baseUrl.replace(/w=\d+/, `w=${w}`);
        return `${sizedUrl} ${w}w`;
      })
      .join(', ');
  }
  
  // Generic URL handling - append width parameter
  return widths
    .map(w => {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}width=${w} ${w}w`;
    })
    .join(', ');
};

/**
 * Get optimal image size based on viewport
 * @returns {number} Optimal image width
 */
export const getOptimalImageSize = () => {
  if (typeof window === 'undefined') return 800;
  
  const dpr = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;
  
  // Calculate optimal size based on viewport and DPR
  const optimalSize = Math.min(viewportWidth * dpr, 2000);
  
  // Round to nearest standard size
  const standardSizes = [400, 800, 1200, 1600, 2000];
  return standardSizes.reduce((prev, curr) => 
    Math.abs(curr - optimalSize) < Math.abs(prev - optimalSize) ? curr : prev
  );
};

/**
 * Preload critical images
 * @param {Array<string>} urls - Array of image URLs to preload
 */
export const preloadImages = (urls) => {
  if (typeof window === 'undefined') return;
  
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Create blurhash placeholder (simplified version)
 * For real blurhash, use the blurhash library
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} SVG placeholder
 */
export const createBlurPlaceholder = (width = 400, height = 300) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Get image aspect ratio class
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} Tailwind aspect ratio class
 */
export const getAspectRatioClass = (width, height) => {
  const ratio = width / height;
  
  if (ratio > 1.5) return 'aspect-video';
  if (ratio < 0.75) return 'aspect-[3/4]';
  if (ratio > 1.2) return 'aspect-[4/3]';
  return 'aspect-square';
};

/**
 * Lazy load image using Intersection Observer
 * @param {HTMLImageElement} img - Image element to lazy load
 * @param {string} src - Image source URL
 * @returns {Promise<void>}
 */
export const lazyLoadImage = (img, src) => {
  return new Promise((resolve, reject) => {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const image = entry.target;
            
            image.onload = () => {
              image.classList.remove('opacity-0');
              image.classList.add('opacity-100');
              observer.disconnect();
              resolve();
            };
            
            image.onerror = () => {
              observer.disconnect();
              reject(new Error('Failed to load image'));
            };
            
            image.src = src;
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );
    
    observer.observe(img);
  });
};

/**
 * Cache busting for images
 * @param {string} url - Image URL
 * @returns {string} URL with cache busting parameter
 */
export const addCacheBuster = (url) => {
  const separator = url.includes('?') ? '&' : '?';
  const timestamp = Date.now();
  return `${url}${separator}_cb=${timestamp}`;
};

/**
 * Check if image exists (HEAD request)
 * @param {string} url - Image URL to check
 * @returns {Promise<boolean>}
 */
export const imageExists = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get file size estimate from URL (for CDN URLs with metadata)
 * @param {string} url - Image URL
 * @returns {Promise<number|null>} File size in bytes or null
 */
export const getImageFileSize = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch {
    return null;
  }
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Optimize image for web - returns optimized URL for supported services
 * @param {string} url - Original image URL
 * @param {Object} options - Optimization options
 * @returns {string} Optimized image URL
 */
export const optimizeImageURL = (url, options = {}) => {
  const {
    width = 1200,
    quality = 80,
    format = 'webp',
  } = options;
  
  // Unsplash optimization
  if (url.includes('unsplash.com')) {
    return url
      .replace(/w=\d+/, `w=${width}`)
      .replace(/q=\d+/, `q=${quality}`)
      + `&fm=${format}`;
  }
  
  // Pexels optimization
  if (url.includes('pexels.com')) {
    return `${url}?auto=compress&cs=tinysrgb&w=${width}&q=${quality}`;
  }
  
  // Generic - append optimization params
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&q=${quality}&fm=${format}`;
};

/**
 * Create responsive image sizes attribute
 * @returns {string} sizes attribute value
 */
export const getImageSizes = () => {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
};
