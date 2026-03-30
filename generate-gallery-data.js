/**
 * Generate Gallery Data from Local Archive
 * Reads images from /public/archive/ and creates galleryData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_DIR = path.join(__dirname, 'public', 'archive');
const OUTPUT_FILE = path.join(__dirname, 'src', 'data', 'galleryData.js');

// Month names for date generation
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Get all image files
const imageFiles = fs.readdirSync(ARCHIVE_DIR)
  .filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

console.log(`Found ${imageFiles.length} images in archive folder`);

// Generate gallery data
const galleryData = imageFiles.map((file, index) => {
  // Extract number from filename (e.g., img-000.jpg -> 0)
  const numMatch = file.match(/img-(\d+)\./);
  const imgNum = numMatch ? parseInt(numMatch[1]) : index;
  
  // Generate pseudo-random but consistent dates
  const baseDate = new Date(2023, 0, 1);
  const daysOffset = Math.floor((imgNum * 3.7) % 1000); // Spread over ~3 years
  const randomDate = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  
  const year = randomDate.getFullYear().toString();
  const month = monthNames[randomDate.getMonth()];
  const date = randomDate.toISOString().split('T')[0];
  
  // Create unique ID
  const id = `eli-local-${imgNum.toString().padStart(3, '0')}`;
  
  return {
    id,
    url: `/archive/${file}`,
    thumbnail: `/archive/${file}`,
    title: "Eli JKT48 Moment",
    description: "Eli JKT48 Theater Performance",
    category: "all",
    year,
    month,
    date,
    location: "JKT48 Theater",
    dimensions: { width: 4000, height: 6000 },
    featured: index < 6 // First 6 images are featured
  };
});

// Generate the JavaScript file content
const fileContent = `/**
 * Gallery Data - Year-Based Archive
 * Auto-generated from /public/archive/ folder
 * Last updated: ${new Date().toISOString()}
 */

export const CATEGORIES = [
  { id: 'all', label: 'All Archive', icon: 'ri-gallery-line' },
];

const RAW_DATA = ${JSON.stringify(galleryData, null, 2)};

export const GALLERY_IMAGES = RAW_DATA.map(img => ({
  ...img,
  era: img.year // Map year to era for the context filter
}));

// Dynamically compute available eras from the data
export const getAvailableEras = () => {
  const years = [...new Set(RAW_DATA.map(img => img.year))].sort((a, b) => b - a);
  return years.map(year => ({
    id: year,
    label: \`\${year} Archive\`,
  }));
};

export const getFeaturedImages = () => GALLERY_IMAGES.filter(img => img.featured);
export const getImageById = (id) => GALLERY_IMAGES.find(img => img.id === id);
`;

fs.writeFileSync(OUTPUT_FILE, fileContent);
console.log(`Generated ${OUTPUT_FILE} with ${galleryData.length} images`);

// Also output stats
const yearCounts = {};
galleryData.forEach(img => {
  yearCounts[img.year] = (yearCounts[img.year] || 0) + 1;
});

console.log('\nImages per year:');
Object.entries(yearCounts).sort().forEach(([year, count]) => {
  console.log(`  ${year}: ${count} images`);
});
