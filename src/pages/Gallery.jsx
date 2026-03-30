/**
 * GalleryPage Component
 * Full gallery page with filtering, search
 */

import React from 'react';
import Section from '../components/layout/Section';
import PageHeader from '../components/layout/PageHeader';
import GalleryGrid from '../components/gallery/GalleryGrid';
import FilterBar from '../components/gallery/FilterBar';

const GalleryPage = () => {
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
        <GalleryGrid />
      </Section>
    </main>
  );
};

export default GalleryPage;
