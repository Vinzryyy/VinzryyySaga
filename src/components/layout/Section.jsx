/**
 * Section Component
 * Reusable section wrapper with consistent spacing and animations
 */

import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const Section = ({
  id,
  children,
  className = '',
  background = 'default',
  padding = 'default',
  glow = null,
}) => {
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.08,
    triggerOnce: true,
  });

  const backgroundClasses = {
    default: 'bg-paper',
    dark: 'bg-[color:var(--retro-bg-dark)]',
    gradient: 'bg-paper-gradient',
    transparent: 'bg-transparent',
  };

  const paddingClasses = {
    none: '',
    sm: 'py-8 md:py-12',
    default: 'py-16 md:py-24',
    lg: 'py-24 md:py-32',
    xl: 'py-32 md:py-48',
  };

  return (
    <section
      id={id}
      ref={elementRef}
      className={`
        relative
        ${backgroundClasses[background]}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {/* Ambient glow overlay — absolute, renders before the content div in
          DOM order. Content div is also `relative` (positioned), so both are
          in the same z-index:auto stacking step; DOM order puts content on
          top of the glow. pointer-events-none keeps the glow inert. */}
      {glow && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: glow }}
        />
      )}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`
            transform transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-[0.99]'}
          `}
        >
          {children}
        </div>
      </div>
    </section>
  );
};

export default Section;
