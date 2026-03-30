/**
 * AboutPage Component
 * Photographer biography and philosophy
 */

import React from 'react';
import Section from '../components/layout/Section';
import PageHeader from '../components/layout/PageHeader';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { SITE_CONFIG } from '../config/siteConfig';

const AboutPage = () => {
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  const { about } = SITE_CONFIG;

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <Section id="about" padding="xl" background="gradient">
        <PageHeader
          title={`About ${SITE_CONFIG.branding.name}`}
          subtitle={SITE_CONFIG.site.description}
        />
      </Section>

      {/* Bio Section */}
      <Section padding="lg">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div
            ref={elementRef}
            className={`
              relative transform transition-all duration-700
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}
            `}
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white/50 shadow-pastel">
              <img
                src="/archive/img-000.jpg"
                alt="Portrait of Eli JKT48"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Signature placeholder */}
            <div className="mt-6">
              <p className="font-header text-2xl text-[color:var(--color-accent)] italic">Armeniaca</p>
            </div>
          </div>

          {/* Content */}
          <div
            className={`
              transform transition-all duration-700 delay-200
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
            `}
          >
            <h2 className="font-header text-3xl md:text-4xl font-bold text-[color:var(--color-text-primary)] mb-6">
              {about.bio.title}
            </h2>

            <div className="space-y-4 text-[color:var(--color-text-secondary)] leading-relaxed">
              {about.bio.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-[color:var(--color-bg-tertiary)]">
              {about.bio.quickStats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-[color:var(--color-accent)]">{stat.value}</div>
                  <div className="text-sm text-[color:var(--color-text-light)]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Philosophy Section */}
      <Section background="gradient" padding="lg">
        <div className="max-w-3xl mx-auto text-center">
          <i className="ri-quote-line text-5xl text-[color:var(--color-accent)] mb-6" />
          <blockquote className="font-header text-2xl md:text-3xl text-[color:var(--color-text-primary)] leading-relaxed mb-6">
            "{about.philosophy.quote}"
          </blockquote>
          <cite className="text-[color:var(--color-text-secondary)] not-italic">- {about.philosophy.author}</cite>
        </div>
      </Section>
    </main>
  );
};

export default AboutPage;

