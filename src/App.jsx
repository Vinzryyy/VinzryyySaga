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
import TownMusic from './components/taman/TownMusic';
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
// (~250KB gzipped) hanya di-fetch saat user buka rute /armeniacaTown/*, nggak
// nambah berat first-paint halaman lain. Sebelumnya bernama "Museum
// Kebaikan" — di-rename ke Taman supaya konsisten sama identitas
// Armeniaca (= Prunus armeniaca, pohon aprikot) dan tone seitansai
// (= perayaan ulang tahun yang tumbuh, bukan monumen perpisahan).
// Route /museum/* di-redirect ke /armeniacaTown/* untuk backward-compat link
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
// Drought variant r3 — dirender saat 4000 ≤ count < 6000 (r3 baru
// unlocked tapi belum direstorasi penuh). count ≥ 6000 → canonical.
// Pattern sama dgn r1 gersang.
const TamanKolamKataGersangPage = lazy(() =>
  import('./pages/TamanKolamKataGersang')
);
// r2 (Arsip Ingatan) — petak perpustakaan, indoor scene. Single file
// dengan prop `restored` (beda dari r1/r3 yang split jadi dua file
// gersang/restored). Diff antar state-nya kecil (rak rotation + paper
// count + book availability), gak architectural — single file lebih
// sehat dipelihara.
const TamanArsipIngatanPage = lazy(() =>
  import('./pages/TamanArsipIngatan')
);
// r4 (Menara Jam) — clock tower north petak. Single file dengan prop
// `restored` (pola sama r2: diff antar state visual + content kecil,
// gak butuh split file). Stub fase awal — full scene menyusul.
const TamanMenaraJamPage = lazy(() => import('./pages/TamanMenaraJam'));
// r5 (Panggung Terbuka) — anfiteater SE petak. Single file dengan prop
// `restored`. Hosts donation archive (Sorotan Kebaikan) — reuse data
// dari src/data/galeriKebaikan.js, re-framed jadi "sorotan di panggung"
// dgn dark warm aesthetic taman.
const TamanPanggungSorotanPage = lazy(() =>
  import('./pages/TamanPanggungSorotan')
);
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
//   < 2000  : Peta Taman (/armeniacaTown/peta) terkunci. Redirect ke /armeniacaTown
//             (Gerbang) — di sana user belum bisa masuk ke peta.
//   < 4000  : Peta unlocked, tapi r1 (/armeniacaTown/r1) masih versi gersang
//             (ekosistem rusak: pohon mati, gak ada makhluk hidup).
//   >= 4000 : r1 di-replace dengan canonical restored (foliage hijau,
//             owls/rabbits/fireflies, beacon di big tree).
//
// URL override `?restoration=0` / `?restoration=1` memaksa pilih
// gersang / restored — untuk preview tanpa harus nunggu count naik.
// Override hanya berlaku di chooser r1 / r3 (gak nge-unlock map).
const MAP_UNLOCK_THRESHOLD = 2000;
const R1_RESTORATION_THRESHOLD = 4000;
// r2 (Perpustakaan) — pattern sama dengan r3: punya unlock tier sendiri.
// Locked <5000 (redirect ke peta), drought 5000-6999 (perpustakaan buka
// tapi masih runtuh), restored di 7000 (purify). Milestone pacing:
// 4000 r1 restore + r3 unlock, 5000 r2 unlock, 6000 r3 restore, 7000 r2
// restore — tiap 1000 count satu milestone.
const R2_UNLOCK_THRESHOLD = 5000;
const R2_RESTORATION_THRESHOLD = 7000;
const R3_UNLOCK_THRESHOLD = 4000;
const R3_RESTORATION_THRESHOLD = 6000;
// r4 (Menara Jam) early-game tier — unlock pertama setelah peta buka,
// kasih payoff cepat ("kota inget waktu lagi"). Restore @ 5000 sinkron
// dengan r2 unlock, milestone "kota fungsional".
const R4_UNLOCK_THRESHOLD = 3000;
const R4_RESTORATION_THRESHOLD = 5000;
// r5 (Panggung Terbuka) mid-game tier — unlock 4500 (antara r3 unlock
// 4000 dan r4 restore 5000), restore 6500 (antara r3 restore 6000 dan
// r2 restore 7000). Halaman penuh (galeri teater Eli) TBD — sementara
// route ke placeholder.
const R5_UNLOCK_THRESHOLD = 4500;
const R5_RESTORATION_THRESHOLD = 6500;

// Returns { count, loaded }. `loaded` flag false sampai first RTDB
// snapshot masuk — penting biar route guard / chooser gak bikin
// keputusan prematur berdasarkan count=0 default. Tanpa ini, user
// dengan count real >=2000 di prod bakal sempat ke-redirect dulu
// sebelum snapshot Firebase landed.
const useTreeSupportCount = () => {
  const [state, setState] = useState({ count: 0, loaded: false });
  useEffect(() => {
    const unsubscribe = subscribeToTreeSupports((count) => {
      setState({ count, loaded: true });
    });
    return unsubscribe;
  }, []);
  return state;
};

const TamanR1RouteChooser = () => {
  const { count, loaded } = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  // Dev-only override: ?restoration=0|1 paksa pilih variant r1.
  // Gated import.meta.env.DEV — di production param ini diabaikan
  // total (user gak bisa bypass gating dari URL).
  const override = import.meta.env.DEV
    ? searchParams.get('restoration')
    : null;
  // Override bypass loading wait — dev preview tetep instant.
  if (override !== null) {
    const n = parseFloat(override);
    const useRestored = !Number.isNaN(n) && n >= 0.5;
    return useRestored ? <TamanLorongPohonPage /> : <TamanLorongPohonGersangPage />;
  }
  // Hold rendering sampai first snapshot. Tanpa ini, user dengan count
  // real 4000+ sempet liat drought variant briefly sebelum canonical
  // ke-render (jelek banget visual).
  if (!loaded) return <PageLoader />;
  const useRestored = count >= R1_RESTORATION_THRESHOLD;
  return useRestored ? <TamanLorongPohonPage /> : <TamanLorongPohonGersangPage />;
};

const TamanPetaRouteGuard = () => {
  const { count, loaded } = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  // Dev-only override: ?unlock=1 buka peta walau count belum 2000.
  // ?purified=1 implicit force-unlock — kondisi purified (count >=7000)
  // udah pasti lewat map gate, jadi preview-nya gak perlu lagi
  // pasangin ?unlock=1.
  // Gated import.meta.env.DEV — di production param ini diabaikan,
  // gating real RTDB count yang berlaku.
  const forceUnlock =
    import.meta.env.DEV &&
    (searchParams.get('unlock') === '1' ||
      searchParams.get('purified') === '1');
  if (forceUnlock) return <TamanPetaPage />;
  // Hold redirect decision sampai first snapshot — tanpa ini, user
  // dengan count >=2000 di prod akan sempet ke-redirect ke /armeniacaTown
  // dulu sebelum bounce balik (route flicker).
  if (!loaded) return <PageLoader />;
  if (count < MAP_UNLOCK_THRESHOLD) {
    return <Navigate to="/armeniacaTown" replace />;
  }
  return <TamanPetaPage />;
};

// r3 (Telaga Harapan) gating:
//   count < 4000  → r3 belum unlocked. Redirect ke /armeniacaTown/peta.
//   4000-5999     → render drought variant (TamanKolamKataGersang)
//   count >= 6000 → render canonical (TamanKolamKata)
// Dev override ?restoration=0|1 paksa pilih variant (gak bypass unlock —
// route guard pakai R3_UNLOCK_THRESHOLD, terpisah dari restorasi).
// r2 (Perpustakaan) chooser — punya unlock tier (selaras r3):
//   count < 5000 → redirect ke /armeniacaTown/peta (perpustakaan locked)
//   5000-6999    → drought (perpustakaan buka, rak runtuh, sebagian halaman)
//   count >= 7000 → restored (purify — rak berdiri lagi, kupu-kupu, glow)
// Pakai single file dengan prop `restored` (beda dari r1/r3 yang
// chooser-nya swap component file). Dev override ?restoration=0|1
// paksa pilih variant (bypass unlock). ?unlock=1 buka drought variant
// walau count belum 5000.
const TamanR2RouteChooser = () => {
  const { count, loaded } = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  const override = import.meta.env.DEV
    ? searchParams.get('restoration')
    : null;
  const forceUnlock =
    import.meta.env.DEV && searchParams.get('unlock') === '1';

  if (override !== null) {
    const n = parseFloat(override);
    const restored = !Number.isNaN(n) && n >= 0.5;
    return <TamanArsipIngatanPage restored={restored} />;
  }
  if (forceUnlock) {
    return <TamanArsipIngatanPage restored={false} />;
  }
  if (!loaded) return <PageLoader />;
  if (count < R2_UNLOCK_THRESHOLD) {
    return <Navigate to="/armeniacaTown/peta" replace />;
  }
  const restored = count >= R2_RESTORATION_THRESHOLD;
  return <TamanArsipIngatanPage restored={restored} />;
};

// r4 (Menara Jam) chooser — pola sama r2 (single file dengan prop
// `restored`). Locked <3000 (redirect ke peta), drought 3000-4999 (menara
// mulai jalan tapi separuh), restored di 5000.
const TamanR4RouteChooser = () => {
  const { count, loaded } = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  const override = import.meta.env.DEV
    ? searchParams.get('restoration')
    : null;
  const forceUnlock =
    import.meta.env.DEV && searchParams.get('unlock') === '1';

  if (override !== null) {
    const n = parseFloat(override);
    const restored = !Number.isNaN(n) && n >= 0.5;
    return <TamanMenaraJamPage restored={restored} />;
  }
  if (forceUnlock) {
    return <TamanMenaraJamPage restored={false} />;
  }
  if (!loaded) return <PageLoader />;
  if (count < R4_UNLOCK_THRESHOLD) {
    return <Navigate to="/armeniacaTown/peta" replace />;
  }
  const restored = count >= R4_RESTORATION_THRESHOLD;
  return <TamanMenaraJamPage restored={restored} />;
};

const TamanR5RouteChooser = () => {
  const { count, loaded } = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  const override = import.meta.env.DEV
    ? searchParams.get('restoration')
    : null;
  const forceUnlock =
    import.meta.env.DEV && searchParams.get('unlock') === '1';

  if (override !== null) {
    const n = parseFloat(override);
    const restored = !Number.isNaN(n) && n >= 0.5;
    return <TamanPanggungSorotanPage restored={restored} />;
  }
  if (forceUnlock) {
    return <TamanPanggungSorotanPage restored={false} />;
  }
  if (!loaded) return <PageLoader />;
  if (count < R5_UNLOCK_THRESHOLD) {
    return <Navigate to="/armeniacaTown/peta" replace />;
  }
  const restored = count >= R5_RESTORATION_THRESHOLD;
  return <TamanPanggungSorotanPage restored={restored} />;
};

const TamanR3RouteChooser = () => {
  const { count, loaded } = useTreeSupportCount();
  const [searchParams] = useSearchParams();
  const override = import.meta.env.DEV
    ? searchParams.get('restoration')
    : null;
  const forceUnlock =
    import.meta.env.DEV && searchParams.get('unlock') === '1';

  // Override bypass loading wait + bypass unlock guard.
  if (override !== null) {
    const n = parseFloat(override);
    const useRestored = !Number.isNaN(n) && n >= 0.5;
    return useRestored ? <TamanKolamKataPage /> : <TamanKolamKataGersangPage />;
  }
  if (forceUnlock) {
    // Force-unlock tanpa restoration override → drought version
    return <TamanKolamKataGersangPage />;
  }
  if (!loaded) return <PageLoader />;
  if (count < R3_UNLOCK_THRESHOLD) {
    return <Navigate to="/armeniacaTown/peta" replace />;
  }
  if (count < R3_RESTORATION_THRESHOLD) {
    return <TamanKolamKataGersangPage />;
  }
  return <TamanKolamKataPage />;
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
      <TownMusic />
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
            <Route path="/armeniacaTown" element={<TamanPage />} />
            <Route path="/armeniacaTown/peta" element={<TamanPetaRouteGuard />} />
            <Route path="/armeniacaTown/r1" element={<TamanR1RouteChooser />} />
            <Route path="/armeniacaTown/r2" element={<TamanR2RouteChooser />} />
            <Route path="/armeniacaTown/r3" element={<TamanR3RouteChooser />} />
            <Route path="/armeniacaTown/r4" element={<TamanR4RouteChooser />} />
            <Route path="/armeniacaTown/r5" element={<TamanR5RouteChooser />} />
            {/* Backward-compat: rute /taman/* dari era sebelum rebrand
                ke /armeniacaTown. Link lama tetep valid. */}
            <Route
              path="/taman"
              element={<Navigate to="/armeniacaTown" replace />}
            />
            <Route
              path="/taman/peta"
              element={<Navigate to="/armeniacaTown/peta" replace />}
            />
            <Route
              path="/taman/r1"
              element={<Navigate to="/armeniacaTown/r1" replace />}
            />
            <Route
              path="/taman/r2"
              element={<Navigate to="/armeniacaTown/r2" replace />}
            />
            <Route
              path="/taman/r3"
              element={<Navigate to="/armeniacaTown/r3" replace />}
            />
            <Route
              path="/taman/r4"
              element={<Navigate to="/armeniacaTown/r4" replace />}
            />
            <Route
              path="/taman/r5"
              element={<Navigate to="/armeniacaTown/r5" replace />}
            />
            {/* Backward-compat: rute /museum/* dari era sebelum rebrand
                Museum → Taman → ArmeniacaTown */}
            <Route path="/museum" element={<Navigate to="/armeniacaTown" replace />} />
            <Route
              path="/museum/denah"
              element={<Navigate to="/armeniacaTown/peta" replace />}
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
