/**
 * Button Component
 * Reusable button with variants and states
 */

import React, { memo } from 'react';

const Button = memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[color:var(--color-bg-primary)]
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: `
      bg-[color:var(--retro-gold)] hover:bg-[color:var(--retro-gold-light)] text-[color:var(--retro-bg-dark)]
      focus:ring-[color:var(--retro-gold)]
      shadow-lg shadow-[color:var(--retro-gold)]/30 hover:shadow-[color:var(--retro-gold)]/50
    `,
    pastel: `
      bg-[color:var(--retro-burgundy-light)] hover:bg-[color:var(--retro-burgundy)] text-white
      focus:ring-[color:var(--retro-burgundy-light)]
      shadow-lg shadow-[color:var(--retro-burgundy-light)]/30 hover:shadow-[color:var(--retro-burgundy-light)]/50
    `,
    retro: `
      bg-[color:var(--retro-sepia)] hover:bg-[color:var(--retro-brown)] text-white
      focus:ring-[color:var(--retro-sepia)]
      shadow-lg shadow-[color:var(--retro-sepia)]/30 hover:shadow-[color:var(--retro-sepia)]/50
    `,
    secondary: `
      bg-[color:var(--retro-bg-secondary)] hover:bg-[color:var(--retro-bg-tertiary)] text-[color:var(--retro-text-primary)]
      border border-[color:var(--retro-border)]
      focus:ring-[color:var(--retro-gold)]
    `,
    outline: `
      bg-transparent border-2 border-[color:var(--retro-gold)] text-[color:var(--retro-gold)]
      hover:bg-[color:var(--retro-gold)] hover:text-[color:var(--retro-bg-dark)]
      focus:ring-[color:var(--retro-gold)]
    `,
    ghost: `
      bg-transparent text-[color:var(--retro-text-secondary)] hover:text-[color:var(--retro-text-primary)] hover:bg-[color:var(--retro-bg-secondary)]
      focus:ring-[color:var(--retro-gold)]
    `,
    danger: `
      bg-red-500 hover:bg-red-600 text-white
      focus:ring-red-400
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
    xl: 'px-9 py-4 text-xl',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {/* Loading Spinner */}
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* Icon */}
      {!loading && icon && iconPosition === 'left' && (
        <i className={`${icon} text-lg`} />
      )}

      {/* Children */}
      {children}

      {/* Icon Right */}
      {!loading && icon && iconPosition === 'right' && (
        <i className={`${icon} text-lg`} />
      )}
    </button>
  );
});

export default Button;
