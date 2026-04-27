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

// Page route mapping
const routes = {
  '': HomePage,
  'home': HomePage,
  'gallery': GalleryPage,
  'about': AboutPage,
};

const resolveRoute = (hash) => {
  if (routes[hash]) return hash;
  if (/^\d{4}$/.test(hash)) return 'gallery';
  return '';
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
    return resolveRoute(hash);
  });

  // Handle hash changes — route on page hashes, scroll to anchor on in-page hashes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const nextPage = resolveRoute(hash);
      const pageChanged = nextPage !== currentPage;

      setCurrentPage(nextPage);

      if (pageChanged) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Same page — try to scroll to a section with this id (defer one frame so any
      // newly-mounted sections from the route swap are in the DOM)
      requestAnimationFrame(() => {
        const target = hash ? document.getElementById(hash) : null;
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentPage]);

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
