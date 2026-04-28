/**
 * Main App Component
 *
 * Architecture:
 * - Path-based routing via react-router-dom (BrowserRouter). Netlify
 *   serves index.html for unknown paths via netlify.toml redirect.
 * - Per-page <Helmet> tags via react-helmet-async (HelmetProvider).
 * - Global providers for theme/gallery/lightbox state.
 * - Lazy-loaded pages for code splitting.
 * - <ScrollManager> handles scroll-to-top on path change and
 *   scroll-to-element on hash change (waits a few RAFs for the lazy
 *   target to mount).
 */

import React, { Suspense, lazy, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { GalleryProvider } from './context';
import { ThemeProvider } from './context';
import { LightboxProvider } from './context/LightboxContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import Navbar from './components/Navbar';
import Footer from './components/layout/Footer';

const HomePage = lazy(() => import('./pages/Home'));
const GalleryPage = lazy(() => import('./pages/Gallery'));
const AboutPage = lazy(() => import('./pages/About'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const CountdownPage = lazy(() => import('./pages/Countdown'));
// Wishes feature di-disable sementara — un-comment lazy import + route
// di bawah (dan nav entry di siteConfig) untuk re-enable.
// const WishesPage = lazy(() => import('./pages/Wishes'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading page..." />
  </div>
);

const ScrollManager = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return undefined;
    }
    const id = hash.replace('#', '');
    let attempts = 0;
    let raf;
    const tryScroll = () => {
      const el = id ? document.getElementById(id) : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (++attempts < 20) raf = requestAnimationFrame(tryScroll);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    raf = requestAnimationFrame(tryScroll);
    return () => raf && cancelAnimationFrame(raf);
  }, [pathname, hash]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider>
            <GalleryProvider>
              <LightboxProvider>
                <ScrollManager />
                <div className="min-h-screen bg-[color:var(--retro-bg-primary)] text-[color:var(--retro-text-primary)] antialiased">
                  <Navbar />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/home" element={<HomePage />} />
                      <Route path="/gallery" element={<GalleryPage />} />
                      <Route path="/gallery/:year" element={<GalleryPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/countdown" element={<CountdownPage />} />
                      {/* <Route path="/wishes" element={<WishesPage />} /> */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                  <Footer />
                </div>
              </LightboxProvider>
            </GalleryProvider>
          </ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
