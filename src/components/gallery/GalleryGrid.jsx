/**
 * GalleryGrid Component
 * Responsive masonry-style grid for displaying gallery images
 * 
 * Features:
 * - Responsive grid layout
 * - Empty state handling
 * - Loading state
 * - Infinite scroll ready
 */

import React, { memo } from 'react';
import { useGallery } from '../../context';
import ImageCard from './ImageCard';

const GalleryGrid = memo(function GalleryGrid({
  onImageClick,
  imagesOverride = null,
}) {
  const { filteredImages, isLoading, error, hasFilters, clearFilters } = useGallery();

  // Use overridden images if provided, otherwise use filtered images from context
  const imagesToDisplay = imagesOverride || filteredImages;

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[color:var(--retro-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[color:var(--retro-text-secondary)]">Loading gallery...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6">
          <i className="ri-error-warning-line text-5xl text-[color:var(--retro-burgundy)] mb-4" />
          <h3 className="text-xl font-semibold text-[color:var(--retro-text-primary)] mb-2">
            Something went wrong
          </h3>
          <p className="text-[color:var(--retro-text-secondary)] mb-4">{error}</p>
          <button
            onClick={clearFilters}
            className="px-6 py-2 bg-[color:var(--retro-gold)] hover:bg-[color:var(--retro-gold-light)] text-[color:var(--retro-bg-dark)] rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty State - No images
  if (imagesToDisplay.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6">
          <i className="ri-gallery-view-2 text-5xl text-[color:var(--retro-text-light)] mb-4" />
          <h3 className="text-xl font-semibold text-[color:var(--retro-text-primary)] mb-2">
            No photos found
          </h3>
          <p className="text-[color:var(--retro-text-secondary)] mb-4">
            {hasFilters
              ? "Try adjusting your filters to find what you're looking for"
              : 'No photos available at the moment'}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-[color:var(--retro-gold)] hover:bg-[color:var(--retro-gold-light)] text-[color:var(--retro-bg-dark)] rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
        auto-rows-fr
      "
      role="list"
      aria-label="Photo gallery"
    >
      {imagesToDisplay.map((image, index) => (
        <div key={image.id} role="listitem">
          <ImageCard
            image={image}
            onClick={onImageClick}
            index={index}
          />
        </div>
      ))}
    </div>
  );
});

export default GalleryGrid;
