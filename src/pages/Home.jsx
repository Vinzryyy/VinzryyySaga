/**
 * HomePage Component
 * Landing page with hero, featured gallery, and call-to-action
 */

import React, { useState, useCallback } from 'react';
import { useGallery } from '../context';
import Section from '../components/layout/Section';
import PageHeader from '../components/layout/PageHeader';
import GalleryGrid from '../components/gallery/GalleryGrid';
import Lightbox from '../components/gallery/Lightbox';
import Button from '../components/ui/Button';
import { useScrollReveal } from '../hooks/useScrollReveal';

const HomePage = () => {
  const { featuredImages } = useGallery();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  const handleImageClick = useCallback((image) => {
    setSelectedImage(image);
    setLightboxOpen(true);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false);
    setSelectedImage(null);
  }, []);

  return (
    <main>
      {/* Featured Gallery Section */}
      <Section id="gallery" padding="lg">
        <PageHeader
          title="Featured Works"
          subtitle="A curated collection of my finest photographs capturing moments across the globe"
        />

        {/* Stats */}
        <div
          ref={elementRef}
          className={`
            grid grid-cols-2 md:grid-cols-4 gap-6 mb-12
            transform transition-all duration-700 delay-200
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          {[
            { number: '500+', label: 'Photos Captured', icon: 'ri-camera-3-line' },
            { number: '50+', label: 'Locations', icon: 'ri-map-pin-line' },
            { number: '10+', label: 'Years Experience', icon: 'ri-time-line' },
            { number: '100%', label: 'Passion', icon: 'ri-heart-line' },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-6 bg-white/60 rounded-xl backdrop-blur-md border border-[color:var(--color-bg-tertiary)] shadow-pastel"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <i className={`${stat.icon} text-3xl text-[color:var(--color-accent)] mb-3`} />
              <div className="text-3xl md:text-4xl font-bold text-[color:var(--color-text-primary)] mb-1">
                {stat.number}
              </div>
              <div className="text-sm text-[color:var(--color-text-secondary)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Gallery Grid with Featured Images Only */}
        <GalleryGrid
          onImageClick={handleImageClick}
          imagesOverride={featuredImages}
        />

        {/* View All CTA */}
        <div className="text-center mt-12">
          <a href="#gallery-full">
            <Button
              variant="pastel"
              size="lg"
              icon="ri-gallery-view-2"
            >
              View Full Gallery
            </Button>
          </a>
        </div>
      </Section>

      {/* About Preview Section */}
      <Section id="about-preview" background="gradient" padding="lg">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square rounded-2xl overflow-hidden bg-white/50 shadow-pastel">
              <img
                src="https://images.unsplash.com/photo-1554048612-387768052bf7?w=800&q=80"
                alt="Photographer at work"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            {/* Decorative Element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[color:var(--color-pastel-pink)]/30 rounded-full blur-3xl" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-[color:var(--color-pastel-peach)]/30 rounded-full blur-3xl" />
          </div>

          {/* Content */}
          <div>
            <h2 className="font-header text-3xl md:text-4xl font-bold text-[color:var(--color-text-primary)] mb-4">
              Behind the Lens
            </h2>
            <p className="text-[color:var(--color-text-secondary)] text-lg leading-relaxed mb-6">
              Every photograph tells a story. With over a decade of experience
              capturing moments across continents, I bring a unique perspective
              to every shoot. From intimate portraits to sweeping landscapes,
              each image is crafted with intention and passion.
            </p>
            <p className="text-[color:var(--color-text-secondary)] text-lg leading-relaxed mb-8">
              My work has been featured in publications worldwide, and I continue
              to push the boundaries of visual storytelling.
            </p>
            <a href="#about">
              <Button variant="primary" size="lg" icon="ri-user-line">
                Learn More About Me
              </Button>
            </a>
          </div>
        </div>
      </Section>

      {/* Contact CTA Section */}
      <Section id="contact-preview" padding="lg">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-header text-3xl md:text-4xl font-bold text-[color:var(--color-text-primary)] mb-4">
            Let's Create Together
          </h2>
          <p className="text-[color:var(--color-text-secondary)] text-lg mb-8">
            Have a project in mind? I'd love to hear about it. Let's discuss
            how we can bring your vision to life through photography.
          </p>
          <a href="#contact">
            <Button variant="pastel" size="xl" icon="ri-mail-send-line">
              Get In Touch
            </Button>
          </a>
        </div>
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

export default HomePage;
