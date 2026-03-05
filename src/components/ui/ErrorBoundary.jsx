/**
 * ErrorBoundary Component
 * Catches and displays React errors gracefully
 * 
 * Security Note: Error messages are sanitized to prevent
 * leaking sensitive information
 */

import React from 'react';

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
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
              <i className="ri-error-warning-line text-4xl text-red-500" />
            </div>

            {/* Title */}
            <h1 className="font-header text-2xl font-bold text-white mb-2">
              Oops! Something went wrong
            </h1>

            {/* Description */}
            <p className="text-gray-400 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-4 bg-gray-900 rounded-lg overflow-auto max-h-48">
                  <pre className="text-xs text-red-400 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs text-gray-500 whitespace-pre-wrap">
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
                  px-6 py-3 bg-purple-600 hover:bg-purple-700
                  text-white font-medium rounded-lg
                  transition-colors
                "
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="
                  px-6 py-3 bg-gray-700 hover:bg-gray-600
                  text-white font-medium rounded-lg
                  transition-colors
                "
              >
                Reload Page
              </button>
            </div>

            {/* Contact Support */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-500">
                Still having issues?{' '}
                <a
                  href="mailto:support@vinzryyysaga.com"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Contact Support
                </a>
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
