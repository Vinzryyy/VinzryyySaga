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
import { ELI_PROFILE_SECTIONS } from './data/eliProfile';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/Home'));
const GalleryPage = lazy(() => import('./pages/Gallery'));
const AboutPage = lazy(() => import('./pages/About'));
const ProfilePage = lazy(() => import('./pages/Profile'));

// Page route mapping
const routes = {
  '': HomePage,
  'home': HomePage,
  'gallery': GalleryPage,
  'about': AboutPage,
  'profile': ProfilePage,
};

// Sub-anchors on the Profile page — clicking them must keep the user on
// /#profile, not fall through to the empty/home route.
const PROFILE_ANCHORS = new Set(ELI_PROFILE_SECTIONS.map((s) => s.id));

const resolveRoute = (hash) => {
  if (routes[hash]) return hash;
  if (/^\d{4}$/.test(hash)) return 'gallery';
  if (PROFILE_ANCHORS.has(hash)) return 'profile';
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

  // Handle hash changes — route on page hashes, scroll to anchor on in-page hashes.
  // After a page swap the target section is lazy-mounted, so we poll a few frames
  // for the element to appear before falling back to scroll-to-top.
  useEffect(() => {
    const scrollToHash = (hash) => {
      const target = hash ? document.getElementById(hash) : null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const nextPage = resolveRoute(hash);
      const pageChanged = nextPage !== currentPage;

      setCurrentPage(nextPage);

      if (!pageChanged) {
        requestAnimationFrame(() => {
          if (!scrollToHash(hash)) window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        return;
      }

      // Page changed — wait up to ~20 frames for the lazy-loaded section to mount
      let attempts = 0;
      const tryScroll = () => {
        if (scrollToHash(hash)) return;
        if (++attempts < 20) {
          requestAnimationFrame(tryScroll);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };
      requestAnimationFrame(tryScroll);
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
