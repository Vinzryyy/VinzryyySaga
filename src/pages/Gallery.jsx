/**
 * GalleryPage Component
 * Full gallery page with filtering, search, and lightbox
 */

import React, { useState, useCallback } from 'react';
import Section from '../components/layout/Section';
import PageHeader from '../components/layout/PageHeader';
import GalleryGrid from '../components/gallery/GalleryGrid';
import FilterBar from '../components/gallery/FilterBar';
import Lightbox from '../components/gallery/Lightbox';

const GalleryPage = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageClick = useCallback((image) => {
    setSelectedImage(image);
    setLightboxOpen(true);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false);
    setSelectedImage(null);
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <Section id="gallery-full" padding="xl" background="gradient">
        <PageHeader
          title="Gallery"
          subtitle="Explore my complete collection of photographs, organized by year, category, and location"
        />
      </Section>

      {/* Filter Bar - Sticky */}
      <FilterBar />

      {/* Gallery Grid */}
      <Section padding="lg">
        <GalleryGrid onImageClick={handleImageClick} />
      </Section>

      {/* Lightbox */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={handleCloseLightbox}
        initialImage={selectedImage}
      />
    </main>
  );
};

export default GalleryPage;
