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
import BirthdayCelebration from './components/countdown/BirthdayCelebration';
import useIsBirthdayToday from './hooks/useIsBirthdayToday';
import { SITE_CONFIG } from './config/siteConfig';

const HomePage = lazy(() => import('./pages/Home'));
const GalleryPage = lazy(() => import('./pages/Gallery'));
const AboutPage = lazy(() => import('./pages/About'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const CountdownPage = lazy(() => import('./pages/Countdown'));
const SchedulePage = lazy(() => import('./pages/Schedule'));
const WishesPage = lazy(() => import('./pages/Wishes'));
const Page26 = lazy(() => import('./pages/Page26'));
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

function AppShell() {
  // Site-wide birthday overlay — balloons + confetti + sparkles on
  // every page on 15 Juni 2026 (24-hour window only). After the day
  // passes, the overlay quietly removes itself; takeover headers /
  // cake / gift on Countdown stay forever via separate isComplete
  // checks.
  const isBirthdayToday = useIsBirthdayToday(SITE_CONFIG.countdown.targetIso);

  return (
    <>
      <ScrollManager />
      <BirthdayCelebration active={isBirthdayToday} />
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
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/wishes" element={<WishesPage />} />
            <Route path="/26" element={<Page26 />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider>
            <GalleryProvider>
              <LightboxProvider>
                <AppShell />
              </LightboxProvider>
            </GalleryProvider>
          </ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
