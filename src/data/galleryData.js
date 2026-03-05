/**
 * Gallery Data - Scalable mock data structure
 * In production, this would be fetched from an API/CMS
 * 
 * Security Note: All user-generated content should be sanitized
 * before being rendered. This mock data is trusted.
 */

export const CATEGORIES = [
  { id: 'all', label: 'All Photos', icon: 'ri-gallery-line' },
  { id: 'portrait', label: 'Portrait', icon: 'ri-user-line' },
  { id: 'landscape', label: 'Landscape', icon: 'ri-mountain-line' },
  { id: 'street', label: 'Street', icon: 'ri-road-map-line' },
  { id: 'event', label: 'Events', icon: 'ri-calendar-event-line' },
  { id: 'nature', label: 'Nature', icon: 'ri-leaf-line' },
];

export const YEARS = ['2024', '2025', '2026'];

/**
 * Gallery images with metadata
 * Using placeholder images from Unsplash for demo
 * In production, use optimized images from your CDN
 */
export const GALLERY_IMAGES = [
  // 2026 Collection
  {
    id: 'img-2026-001',
    url: 'https://pbs.twimg.com/media/HA4MeBVbkAAewwO?format=jpg&name=large',
    thumbnail: 'https://pbs.twimg.com/media/HA4MeBVbkAAewwO?format=jpg&name=large',
    title: 'First photo of the year',
    description: 'Soekarno–Hatta International Airport (CGK)',
    category: 'portrait',
    year: '2026',
    location: 'Soekarno–Hatta International Airport (CGK)',
    date: '2026-02-11',
    dimensions: { width: 4000, height: 6000 },
    featured: true,
  },
  
  // 2025 Collection
  {
    id: 'img-2025-001',
    url: 'https://pbs.twimg.com/media/G9bSXlkbEAA44AM?format=jpg&name=large',
    thumbnail: 'https://pbs.twimg.com/media/G9bSXlkbEAA44AM?format=jpg&name=large',
    title: 'You are the most beautiful woman I\'ve ever seen.',
    description: '君は今まで見た中で一番綺麗な女性だ',
    category: 'portrait',
    year: '2025',
    location: 'Lalaport',
    date: '2025-12-28',
    dimensions: { width: 4000, height: 6000 },
    featured: true,
  },
  {
    id: 'img-2025-002',
    url: 'https://pbs.twimg.com/media/G9bQW3wbIAAI2ig?format=jpg&name=large',
    thumbnail: 'https://pbs.twimg.com/media/G9bQW3wbIAAI2ig?format=jpg&name=large',
    title: 'If you know, you know .',
    description: 'If you know, you know ',
    category: 'portrait',
    year: '2025',
    location: 'Lalaport',
    date: '2025-12-28',
    dimensions: { width: 4000, height: 6000 },
    featured: true,
  },
  {
    id: 'img-2025-003',
    url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=60',
    title: 'Urban Geometry',
    description: 'Lines and shapes in the concrete jungle',
    category: 'street',
    year: '2025',
    location: 'Chicago, USA',
    date: '2025-04-10',
    dimensions: { width: 4000, height: 6000 },
    camera: 'Fujifilm GFX 100',
    lens: '45mm f/2.8',
    featured: false,
  },
  {
    id: 'img-2025-004',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=60',
    title: 'Corporate Event',
    description: 'Professional moments captured with elegance',
    category: 'event',
    year: '2025',
    location: 'Singapore',
    date: '2025-09-05',
    dimensions: { width: 5000, height: 3500 },
    camera: 'Nikon Z8',
    lens: '70-200mm f/2.8',
    featured: false,
  },
  {
    id: 'img-2025-005',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=60',
    title: 'Morning Dew',
    description: 'Nature\'s diamonds on fresh green leaves',
    category: 'nature',
    year: '2025',
    location: 'Costa Rica',
    date: '2025-03-18',
    dimensions: { width: 6000, height: 4000 },
    camera: 'Canon R5',
    lens: '100mm f/2.8 Macro',
    featured: true,
  },
  {
    id: 'img-2025-006',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=60',
    title: 'Studio Session',
    description: 'Classic black and white portrait study',
    category: 'portrait',
    year: '2025',
    location: 'Studio, KL',
    date: '2025-08-12',
    dimensions: { width: 4000, height: 6000 },
    camera: 'Hasselblad X2D',
    lens: '80mm f/1.9',
    featured: false,
  },
  
  // 2024 Collection
  {
    id: 'img-2024-001',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=60',
    title: 'Contemplation',
    description: 'A moment of quiet reflection',
    category: 'portrait',
    year: '2024',
    location: 'Seoul, Korea',
    date: '2024-11-20',
    dimensions: { width: 4000, height: 6000 },
    camera: 'Sony A7R IV',
    lens: '50mm f/1.2',
    featured: true,
  },
  {
    id: 'img-2024-002',
    url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400&q=60',
    title: 'Alpine Lake',
    description: 'Mirror reflections of mountain majesty',
    category: 'landscape',
    year: '2024',
    location: 'Banff, Canada',
    date: '2024-08-05',
    dimensions: { width: 6000, height: 4000 },
    camera: 'Nikon Z7 II',
    lens: '14-24mm f/2.8',
    featured: true,
  },
  {
    id: 'img-2024-003',
    url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=60',
    title: 'Crosswalk',
    description: 'The organized chaos of city intersections',
    category: 'street',
    year: '2024',
    location: 'Tokyo, Japan',
    date: '2024-10-15',
    dimensions: { width: 5000, height: 3500 },
    camera: 'Fujifilm X-T4',
    lens: '23mm f/1.4',
    featured: false,
  },
  {
    id: 'img-2024-004',
    url: 'https://images.unsplash.com/photo-1507537362848-9c7e70b7e8c6?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1507537362848-9c7e70b7e8c6?w=400&q=60',
    title: 'Concert Night',
    description: 'Energy and passion under the stage lights',
    category: 'event',
    year: '2024',
    location: 'London, UK',
    date: '2024-07-28',
    dimensions: { width: 4500, height: 3000 },
    camera: 'Canon R3',
    lens: '70-200mm f/2.8',
    featured: true,
  },
  {
    id: 'img-2024-005',
    url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=60',
    title: 'Deep Woods',
    description: 'Ancient trees standing as silent guardians',
    category: 'nature',
    year: '2024',
    location: 'Oregon, USA',
    date: '2024-05-12',
    dimensions: { width: 4000, height: 6000 },
    camera: 'Sony A7R V',
    lens: '24-105mm f/4',
    featured: false,
  },
];

/**
 * Get featured images for homepage
 */
export const getFeaturedImages = () => GALLERY_IMAGES.filter(img => img.featured);

/**
 * Get images by year
 */
export const getImagesByYear = (year) => {
  if (year === 'all') return GALLERY_IMAGES;
  return GALLERY_IMAGES.filter(img => img.year === year);
};

/**
 * Get images by category
 */
export const getImagesByCategory = (category) => {
  if (category === 'all') return GALLERY_IMAGES;
  return GALLERY_IMAGES.filter(img => img.category === category);
};

/**
 * Get single image by ID
 */
export const getImageById = (id) => GALLERY_IMAGES.find(img => img.id === id);

/**
 * Get unique locations for filtering
 */
export const getUniqueLocations = () => {
  const locations = new Set(GALLERY_IMAGES.map(img => img.location.split(',')[0]));
  return Array.from(locations).sort();
};
