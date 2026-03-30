/**
 * LoadingSpinner Component
 * Reusable loading spinner with variants
 */

import React from 'react';

const LoadingSpinner = ({
  size = 'md',
  variant = 'default',
  text,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const variantClasses = {
    default: 'border-[color:var(--retro-gold)] border-t-transparent',
    white: 'border-white border-t-gray-300',
    gray: 'border-[color:var(--retro-text-muted)] border-t-[color:var(--retro-border)]',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          border-4 rounded-full
          animate-spin
        `}
      />
      {text && (
        <p className="text-[color:var(--retro-text-muted)] text-sm animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[color:var(--retro-bg-dark)]/90 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
