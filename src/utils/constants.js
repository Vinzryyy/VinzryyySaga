/**
 * Application Constants
 * Centralized configuration for the photography gallery website
 */

// Site metadata for SEO
export const SITE_CONFIG = {
  title: "VinzryyySaga Photography",
  description: "Professional photography gallery showcasing moments from Malaysia, Singapore, and beyond. Capturing life's beautiful stories through the lens.",
  keywords: ["photography", "gallery", "portfolio", "Malaysia", "Singapore", "professional photographer"],
  author: "VinzryyySaga",
  url: "https://vinzryyysaga.com",
  social: {
    instagram: "https://instagram.com/vinzryyysaga",
    twitter: "https://twitter.com/vinzryyysaga",
    email: "contact@vinzryyysaga.com",
  },
};

// Navigation configuration
export const NAVIGATION = {
  items: [
    { id: "home", label: "Home", path: "#home" },
    { id: "gallery", label: "Gallery", path: "#gallery" },
    { id: "about", label: "About", path: "#about" },
    { id: "contact", label: "Contact", path: "#contact" },
  ],
};

// Gallery categories
export const GALLERY_CATEGORIES = {
  ALL: "all",
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
  EVENT: "event",
  STREET: "street",
  NATURE: "nature",
};

export const GALLERY_FILTERS = [
  { id: GALLERY_CATEGORIES.ALL, label: "All Photos" },
  { id: GALLERY_CATEGORIES.PORTRAIT, label: "Portrait" },
  { id: GALLERY_CATEGORIES.LANDSCAPE, label: "Landscape" },
  { id: GALLERY_CATEGORIES.EVENT, label: "Event" },
  { id: GALLERY_CATEGORIES.STREET, label: "Street" },
  { id: GALLERY_CATEGORIES.NATURE, label: "Nature" },
];

// Sample gallery data (in production, this would come from an API)
export const GALLERY_DATA = [
  {
    id: "1",
    title: "KLP48 Teater Malaysia",
    category: GALLERY_CATEGORIES.EVENT,
    location: "Malaysia",
    year: 2025,
    image: "/src/assets/Slider4.jpeg",
    thumbnail: "/src/assets/Slider4.jpeg",
    description: "Capturing the vibrant energy of KLP48 theater performance",
  },
  {
    id: "2",
    title: "Tanjong Beach Sunset",
    category: GALLERY_CATEGORIES.LANDSCAPE,
    location: "Singapore",
    year: 2025,
    image: "/src/assets/Slider2.jpeg",
    thumbnail: "/src/assets/Slider2.jpeg",
    description: "Golden hour at the pristine Tanjong Beach",
  },
  {
    id: "3",
    title: "Motion Imei 2025",
    category: GALLERY_CATEGORIES.EVENT,
    location: "Jakarta",
    year: 2025,
    image: "/src/assets/Slider3.jpeg",
    thumbnail: "/src/assets/Slider3.jpeg",
    description: "Dynamic motion photography at Imei 2025 event",
  },
  {
    id: "4",
    title: "Urban Reflections",
    category: GALLERY_CATEGORIES.STREET,
    location: "Kuala Lumpur",
    year: 2024,
    image: "/src/assets/Slider4.jpeg",
    thumbnail: "/src/assets/Slider4.jpeg",
    description: "City life reflected in glass and steel",
  },
  {
    id: "5",
    title: "Mountain Serenity",
    category: GALLERY_CATEGORIES.NATURE,
    location: "Cameron Highlands",
    year: 2024,
    image: "/src/assets/Slider2.jpeg",
    thumbnail: "/src/assets/Slider2.jpeg",
    description: "Peaceful morning mist over the highlands",
  },
  {
    id: "6",
    title: "Portrait in Natural Light",
    category: GALLERY_CATEGORIES.PORTRAIT,
    location: "Studio",
    year: 2025,
    image: "/src/assets/Slider3.jpeg",
    thumbnail: "/src/assets/Slider3.jpeg",
    description: "Natural light portrait session",
  },
];

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
