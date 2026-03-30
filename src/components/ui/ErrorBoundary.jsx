/**
 * ErrorBoundary Component
 * Catches and displays React errors gracefully
 * 
 * Security Note: Error messages are sanitized to prevent
 * leaking sensitive information
 */

import React from 'react';
import { SITE_CONFIG } from '../../utils/constants';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[color:var(--retro-bg-dark)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[color:var(--retro-bg-primary)] rounded-2xl p-8 text-center shadow-retro-lg border border-[color:var(--retro-border)]">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
              <i className="ri-error-warning-line text-4xl text-red-500" />
            </div>

            {/* Title */}
            <h1 className="font-header text-2xl font-bold text-[color:var(--retro-text-primary)] mb-2">
              Oops! Something went wrong
            </h1>

            {/* Description */}
            <p className="text-[color:var(--retro-text-secondary)] mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-[color:var(--retro-text-muted)] cursor-pointer hover:text-[color:var(--retro-text-secondary)]">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-4 bg-[color:var(--retro-bg-dark)] rounded-lg overflow-auto max-h-48">
                  <pre className="text-xs text-red-400 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs text-[color:var(--retro-text-muted)] whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="
                  px-6 py-3 bg-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy-light)]
                  text-[color:var(--retro-cream)] font-medium rounded-lg
                  transition-colors shadow-retro
                "
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="
                  px-6 py-3 bg-[color:var(--retro-text-secondary)] hover:bg-[color:var(--retro-text-primary)]
                  text-[color:var(--retro-cream)] font-medium rounded-lg
                  transition-colors shadow-retro
                "
              >
                Reload Page
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-[color:var(--retro-border)]">
              <p className="text-sm text-[color:var(--retro-text-muted)]">
                Still having issues? Try reloading or opening the page again later.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
