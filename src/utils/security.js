/**
 * Security Utilities
 * Frontend security helpers for XSS protection, input sanitization, and safe rendering
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * Uses a whitelist approach - only allows safe characters
 * @param {string} str - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Sanitize URL to prevent javascript: protocol attacks
 * @param {string} url - URL to validate
 * @returns {string|null} Safe URL or null if invalid
 */
export const sanitizeURL = (url) => {
  if (typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();
  
  if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
    console.warn('[Security] Blocked dangerous URL protocol:', url);
    return null;
  }
  
  // Allow http, https, and relative URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  
  // Block everything else
  console.warn('[Security] Blocked unsafe URL:', url);
  return null;
};

/**
 * Validate image URL before loading
 * @param {string} url - Image URL to validate
 * @returns {boolean} True if safe to load
 */
export const isValidImageURL = (url) => {
  if (typeof url !== 'string') return false;
  
  const sanitized = sanitizeURL(url);
  if (!sanitized) return false;
  
  // Check for valid image extensions or trusted domains
  const trustedDomains = ['images.unsplash.com', 'images.pexels.com', 'cdn.', 'static.'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  
  const isTrustedDomain = trustedDomains.some(domain => sanitized.includes(domain));
  const hasValidExtension = imageExtensions.some(ext => sanitized.toLowerCase().includes(ext));
  
  return isTrustedDomain || hasValidExtension;
};

/**
 * Escape HTML entities for safe text rendering
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export const escapeHTML = (text) => {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  
  return String(text).replace(/[&<>"'/]/g, (char) => escapeMap[char]);
};

/**
 * Sanitize form input - removes potentially dangerous characters
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and trim
  let sanitized = input.replace(/\0/g, '').trim();
  
  // Limit length to prevent buffer overflow attacks
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  return sanitized;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  
  // RFC 5322 compliant email regex (simplified but effective)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Create Content Security Policy nonce (for CSP implementation)
 * In production, this should be generated server-side
 * @returns {string} Random nonce string
 */
export const generateNonce = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Get Content Security Policy header value
 * Adjust based on your specific needs
 * @returns {string} CSP header value
 */
export const getContentSecurityPolicy = () => {
  const nonce = generateNonce();
  
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: https: blob:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://images.unsplash.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');
};

/**
 * Safe JSON parse with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed JSON or default value
 */
export const safeJSONParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('[Security] JSON parse failed:', error.message);
    return defaultValue;
  }
};

/**
 * Debounce function for rate limiting user input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for limiting execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
