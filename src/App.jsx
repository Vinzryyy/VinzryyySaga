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

import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { subscribeToTreeSupports } from './lib/treeDb';
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
// Galeri Kebaikan — disabled sampai siap diumumkan. Data entry +
// page file tetap di src/ supaya reaktivasi cuma uncomment lazy import,
// kembalikan Route, dan revert hide di siteConfig nav.
// const GaleriKebaikanPage = lazy(() => import('./pages/GaleriKebaikan'));
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
// Drought variant r1 — dirender saat count siraman < 4000. Saat hit
// 4000, swap ke canonical restored di atas. Duplikat penuh (bukan
// branching prop) supaya canonical bisa diiterasi tanpa risk drift
// di drought file.
const TamanLorongPohonGersangPage = lazy(() =>
  import('./pages/TamanLorongPohonGersang')
);
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

// Threshold gating berdasarkan tree support count (live dari RTDB
// node tree_support/total, dikelola di Page26 /26):
//   < 2000  : Peta Taman (/taman/peta) terkunci. Redirect ke /taman
//             (Gerbang) — di sana user belum bisa masuk ke peta.
//   < 4000  : Peta unlocked, tapi r1 (/taman/r1) masih versi gersang
//             (ekosistem rusak: pohon mati, gak ada makhluk hidup).
//   >= 4000 : r1 di-replace dengan canonical restored (foliage hijau,
//             owls/rabbits/fireflies, beacon di big tree).
//
// URL override `?restoration=0` / `?restoration=1` memaksa pilih
// gersang / restored — untuk preview tanpa harus nunggu count naik.
// Override hanya berlaku di chooser r1 (gak nge-unlock map).
const MAP_UNLOCK_THRESHOLD = 2000;
const R1_RESTORATION_THRESHOLD = 4000;

const useTreeSupportCount = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeToTreeSupports(setCount);
    return unsubscribe;
  }, []);
  return count;
};

const TamanR1RouteChooser = () => {
  const count = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  const override = searchParams.get('restoration');
  let useRestored;
  if (override !== null) {
    const n = parseFloat(override);
    useRestored = !Number.isNaN(n) && n >= 0.5;
  } else {
    useRestored = count >= R1_RESTORATION_THRESHOLD;
  }
  return useRestored ? <TamanLorongPohonPage /> : <TamanLorongPohonGersangPage />;
};

const TamanPetaRouteGuard = () => {
  const count = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  // Dev override: ?unlock=1 buka peta walau count belum 2000
  const forceUnlock = searchParams.get('unlock') === '1';
  if (!forceUnlock && count < MAP_UNLOCK_THRESHOLD) {
    return <Navigate to="/taman" replace />;
  }
  return <TamanPetaPage />;
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
            {/* /galeri-kebaikan disabled — redirect ke /26 supaya link
                lama tetap valid. */}
            <Route path="/galeri-kebaikan" element={<Navigate to="/26" replace />} />
            <Route path="/vivo" element={<VivoPage />} />
            <Route path="/denyut" element={<DenyutPage />} />
            <Route path="/taman" element={<TamanPage />} />
            <Route path="/taman/peta" element={<TamanPetaRouteGuard />} />
            <Route path="/taman/r1" element={<TamanR1RouteChooser />} />
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
