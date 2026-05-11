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
  Navigate,
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
import BirthdayMusic from './components/celebration/BirthdayMusic';
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
// Galeri Kebaikan — donation/kebaikan archive page utk Harmoni Kebaikan
// project (Armeniaca × Helismiley). Enabled karena donasi pertama udah
// dilakukan (Pohon Kebaikan — Penanaman Pohon).
const GaleriKebaikanPage = lazy(() => import('./pages/GaleriKebaikan'));
const VivoPage = lazy(() => import('./pages/Vivo'));
// Taman Kebaikan — fase 1 (Padang Tandus / R0 entrance) dan fase 2
// (Peta Taman / hub denah). Lazy-loaded supaya bundle Three.js + R3F
// (~250KB gzipped) hanya di-fetch saat user buka rute /taman/*, nggak
// nambah berat first-paint halaman lain. Sebelumnya bernama "Museum
// Kebaikan" — di-rename ke Taman supaya konsisten sama identitas
// Armeniaca (= Prunus armeniaca, pohon aprikot) dan tone seitansai
// (= perayaan ulang tahun yang tumbuh, bukan monumen perpisahan).
// Route /museum/* di-redirect ke /taman/* untuk backward-compat link
// yang udah pernah di-share.
const TamanPage = lazy(() => import('./pages/Taman'));
const TamanPetaPage = lazy(() => import('./pages/TamanPeta'));
const TamanLorongPohonPage = lazy(() => import('./pages/TamanLorongPohon'));
const TamanKolamKataPage = lazy(() => import('./pages/TamanKolamKata'));
// Denyut — heartbeat website (presence-driven pulse visual). Standalone
// page, di-lazy supaya Firebase presence module gak ke-bundle ke halaman
// lain.
const DenyutPage = lazy(() => import('./pages/Denyut'));
// ByuMusic — page dedicated utk lagu By-U Putri Helisma. Pre-release
// support phase → auto-reveal player 15 Juni 2026. Standalone page,
// linked dari dropdown navbar Harmoni Kebaikan.
const ByuMusicPage = lazy(() => import('./pages/ByuMusic'));
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
      <BirthdayMusic />
      <div className="min-h-screen bg-[color:var(--retro-bg-primary)] text-[color:var(--retro-text-primary)] antialiased">
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/gallery/:year" element={<GalleryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/countdown" element={<CountdownPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/wishes" element={<WishesPage />} />
            <Route path="/26" element={<Page26 />} />
            <Route path="/byu-music" element={<ByuMusicPage />} />
            {/* Link lama /titipan & /byu redirect ke /byu-music supaya
                gak 404. */}
            <Route
              path="/titipan"
              element={<Navigate to="/byu-music" replace />}
            />
            <Route
              path="/byu"
              element={<Navigate to="/byu-music" replace />}
            />
            <Route path="/galeri-kebaikan" element={<GaleriKebaikanPage />} />
            <Route path="/vivo" element={<VivoPage />} />
            <Route path="/denyut" element={<DenyutPage />} />
            <Route path="/taman" element={<TamanPage />} />
            <Route path="/taman/peta" element={<TamanPetaPage />} />
            <Route path="/taman/r1" element={<TamanLorongPohonPage />} />
            <Route path="/taman/r3" element={<TamanKolamKataPage />} />
            {/* Backward-compat: rute /museum/* dari era sebelum rebrand */}
            <Route path="/museum" element={<Navigate to="/taman" replace />} />
            <Route
              path="/museum/denah"
              element={<Navigate to="/taman/peta" replace />}
            />
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
