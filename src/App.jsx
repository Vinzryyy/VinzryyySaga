/**
 * Main App Component
 * Photography Gallery Website
 * 
 * Architecture:
 * - Hash-based routing (no external router dependency)
 * - Global providers for context
 * - Error boundary for graceful error handling
 * - Lazy loading for page components
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { GalleryProvider } from './context';
import { ThemeProvider } from './context';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import Navbar from './components/Navbar';
import Footer from './components/layout/Footer';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/Home'));
const GalleryPage = lazy(() => import('./pages/Gallery'));
const AboutPage = lazy(() => import('./pages/About'));
const ContactPage = lazy(() => import('./pages/Contact'));

// Page route mapping
const routes = {
  '': HomePage,
  'home': HomePage,
  'gallery': GalleryPage,
  '2024': GalleryPage,
  '2025': GalleryPage,
  '2026': GalleryPage,
  'about': AboutPage,
  'contact': ContactPage,
};

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading page..." />
  </div>
);

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    // Get initial route from hash
    const hash = window.location.hash.replace('#', '').toLowerCase();
    return routes[hash] ? hash : '';
  });

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      setCurrentPage(routes[hash] ? hash : '');
      
      // Scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Get current page component
  const CurrentPage = routes[currentPage] || HomePage;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GalleryProvider>
          <div className="min-h-screen bg-[color:var(--retro-bg-primary)] text-[color:var(--retro-text-primary)] antialiased">
            {/* Navigation */}
            <Navbar />
            
            {/* Main Content */}
            <Suspense fallback={<PageLoader />}>
              <CurrentPage />
            </Suspense>
            
            {/* Footer */}
            <Footer />
          </div>
        </GalleryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
