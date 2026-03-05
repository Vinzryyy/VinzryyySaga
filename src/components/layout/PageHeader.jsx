/**
 * PageHeader Component
 * Reusable page header with title and subtitle
 */

import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const PageHeader = ({ title, subtitle, centered = true }) => {
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.2,
    triggerOnce: true,
  });

  return (
    <div
      ref={elementRef}
      className={`
        text-center py-12 md:py-16
        transform transition-all duration-700
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${centered ? 'text-center' : 'text-left'}
      `}
    >
      <h1 className="font-header text-4xl md:text-5xl lg:text-6xl font-bold text-[color:var(--retro-text-primary)] mb-4">
        {title}
      </h1>
      
      {subtitle && (
        <p className="text-lg md:text-xl text-[color:var(--retro-text-secondary)] max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}

      {/* Decorative Line - Retro Gold */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-[color:var(--retro-gold)]" />
        <div className="w-2 h-2 bg-[color:var(--retro-gold)] rounded-full" />
        <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-[color:var(--retro-gold)]" />
      </div>
    </div>
  );
};

export default PageHeader;
