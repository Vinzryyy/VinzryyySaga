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
}) => {
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: false,
  });

  const backgroundClasses = {
    default: 'bg-[color:var(--retro-bg-primary)]',
    dark: 'bg-[color:var(--retro-bg-dark)]',
    gradient: 'bg-gradient-to-b from-[color:var(--retro-bg-primary)] via-[color:var(--retro-bg-secondary)] to-[color:var(--retro-bg-primary)]',
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
        ${backgroundClasses[background]}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`
            transform transition-all duration-700
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          {children}
        </div>
      </div>
    </section>
  );
};

export default Section;
