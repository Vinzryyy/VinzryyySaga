/**
 * Application Constants
 * Centralized configuration for the photography gallery website
 */

import { SITE_CONFIG } from '../config/siteConfig.js';

// Re-export SITE_CONFIG for convenience
export { SITE_CONFIG };

// Animation configurations
export const ANIMATION_CONFIG = {
  slider: {
    duration: 5500,
    transitionDuration: 1400,
    zoomDuration: 7000,
  },
  fade: {
    duration: 800,
    easing: "ease-out",
  },
  scroll: {
    threshold: 100,
  },
};

// Security settings
export const SECURITY_CONFIG = {
  maxUploadSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  sanitizeInput: true,
  enableCSP: true,
};

// Performance settings
export const PERFORMANCE_CONFIG = {
  lazyLoadThreshold: 200,
  imageQuality: 85,
  maxConcurrentLoads: 3,
  cacheDuration: 3600000, // 1 hour
};
