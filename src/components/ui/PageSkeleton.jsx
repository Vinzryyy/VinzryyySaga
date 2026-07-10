/**
 * PageSkeleton — layout-accurate shimmer placeholders shown via Suspense
 * while lazy-loaded pages are fetching. Picks the right skeleton based
 * on the current pathname so the user sees the page's shape, not a
 * generic spinner.
 *
 * Anatomy:
 *   S          — base shimmer block (rounded rect, inherits --sk-* vars)
 *   .sk-light  — CSS vars for cream/parchment backgrounds
 *   .sk-dark   — CSS vars for dark (--retro-brown-dark) backgrounds
 *
 * Skeletons: Home · Gallery · Profile · News · Schedule · Generic
 */

import { useLocation } from 'react-router-dom';

/* ── Shimmer keyframe + block class ─────────────────────────────── */
const STYLE = `
  @keyframes sk-shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  .sk-block {
    background: linear-gradient(
      90deg,
      var(--sk-base)      25%,
      var(--sk-highlight) 50%,
      var(--sk-base)      75%
    );
    background-size: 1600px 100%;
    animation: sk-shimmer 1.6s ease-in-out infinite;
  }
  .sk-light { --sk-base: rgba(61,52,43,0.07); --sk-highlight: rgba(61,52,43,0.15); }
  .sk-dark  { --sk-base: rgba(255,255,255,0.07); --sk-highlight: rgba(255,255,255,0.14); }
  @media (prefers-reduced-motion: reduce) { .sk-block { animation: none; } }
`;

/* Base block — add any sizing / shape classes via className */
const S = ({ className = '' }) => (
  <div className={`sk-block rounded-lg ${className}`} />
);

/* ── Page skeletons ──────────────────────────────────────────────── */

const HomeSkeleton = () => (
  <>
    {/* Hero — dark full-bleed */}
    <div className="sk-dark relative h-[100svh] min-h-[640px] bg-[color:var(--retro-brown-dark)]">
      <div className="absolute bottom-16 left-6 md:left-16 lg:left-24 max-w-lg space-y-4">
        <S className="h-3 w-28 rounded-full" />
        <S className="h-12 w-full" />
        <S className="h-12 w-4/5" />
        <S className="h-4 w-2/3 mt-2" />
        <div className="flex gap-3 mt-5">
          <S className="h-12 w-36 rounded-full" />
          <S className="h-12 w-28 rounded-full" />
        </div>
      </div>
    </div>

    {/* Stats strip */}
    <div className="sk-dark bg-[color:var(--retro-brown-dark)] py-12">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-3 divide-x divide-white/10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center px-6 py-4 space-y-3">
            <S className="h-16 w-20 mx-auto" />
            <S className="h-2.5 w-24 mx-auto rounded-full" />
          </div>
        ))}
      </div>
    </div>

    {/* First content section */}
    <div className="sk-light bg-[color:var(--retro-bg-primary)] py-20">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <S className="aspect-[2/3] w-full" />
        </div>
        <div className="lg:col-span-7 space-y-4 pt-4">
          <S className="h-3 w-20 rounded-full" />
          <S className="h-12 w-3/4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-6 py-3 border-t border-[color:var(--retro-brown-dark)]/10">
              <S className="h-4 w-32 flex-shrink-0" />
              <S className="h-6 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

const GallerySkeleton = () => (
  <div className="sk-light min-h-screen bg-[color:var(--retro-bg-primary)] pt-24 sm:pt-28">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Archive profile header */}
      <div className="flex items-center gap-4 mb-8">
        <S className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <S className="h-4 w-32" />
          <S className="h-3 w-48" />
        </div>
      </div>
      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[72, 56, 56, 64, 56].map((w, i) => (
          <S key={i} className="h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>
      {/* Photo grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-1.5">
        {Array.from({ length: 20 }).map((_, i) => (
          <S key={i} className="aspect-square w-full rounded-none sm:rounded" />
        ))}
      </div>
    </div>
  </div>
);

const ProfileSkeleton = () => (
  <>
    {/* Full-bleed hero */}
    <div className="sk-dark bg-[color:var(--retro-brown-dark)] pt-32 md:pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-20 grid lg:grid-cols-3 gap-12 items-end">
        <div className="lg:col-span-2 space-y-4">
          <S className="h-3 w-24 rounded-full" />
          <S className="h-14 w-3/4" />
          <S className="h-14 w-1/2" />
          <S className="h-4 w-2/3 mt-3" />
          <div className="flex gap-3 mt-6">
            <S className="h-10 w-28 rounded-full" />
            <S className="h-10 w-28 rounded-full" />
          </div>
        </div>
        <div className="hidden lg:block">
          <S className="aspect-[3/4] w-full rounded-2xl" />
        </div>
      </div>
    </div>

    {/* Tab strip */}
    <div className="sk-light bg-[color:var(--retro-bg-primary)] sticky top-20 z-30 border-b border-[color:var(--retro-brown-dark)]/10 px-6 py-3">
      <div className="flex gap-2">
        {[80, 72, 104, 72].map((w, i) => (
          <S key={i} className="h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>
    </div>

    {/* Content */}
    <div className="sk-light bg-[color:var(--retro-bg-primary)] max-w-7xl mx-auto px-6 lg:px-20 py-12 space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-start">
          <S className="w-2 h-2 rounded-full mt-2 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <S className="h-5 w-3/4" />
            <S className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </>
);

const NewsSkeleton = () => (
  <>
    {/* Hero */}
    <div className="sk-dark bg-[color:var(--retro-brown-dark)] pt-32 sm:pt-36 md:pt-44 pb-20 text-center px-6">
      <S className="h-3 w-20 rounded-full mx-auto mb-4" />
      <S className="h-12 w-64 mx-auto mb-3" />
      <S className="h-4 w-40 rounded-full mx-auto" />
    </div>

    {/* Article cards */}
    <div className="sk-light bg-[color:var(--retro-bg-primary)] max-w-4xl mx-auto px-5 sm:px-8 md:px-12 -mt-4 pb-16 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 rounded-2xl bg-[color:var(--retro-cream)] border border-[color:var(--retro-brown-dark)]/8"
        >
          <S className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-xl" />
          <div className="flex-1 space-y-2 py-1">
            <S className="h-3 w-20 rounded-full" />
            <S className="h-5 w-full" />
            <S className="h-5 w-4/5" />
            <S className="h-3 w-24 rounded-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  </>
);

const ScheduleSkeleton = () => (
  <>
    {/* Hero */}
    <div className="sk-dark bg-[color:var(--retro-brown-dark)] pt-28 sm:pt-32 md:pt-40 pb-16 px-6 lg:px-20">
      <div className="max-w-7xl mx-auto space-y-4">
        <S className="h-3 w-28 rounded-full" />
        <S className="h-14 w-72" />
        <S className="h-4 w-48 mt-2" />
      </div>
    </div>

    {/* Toolbar */}
    <div className="sk-light bg-[color:var(--retro-bg-primary)]/85 sticky top-[72px] z-30 backdrop-blur px-6 lg:px-20 py-3 border-b border-[color:var(--retro-brown-dark)]/8">
      <div className="max-w-7xl mx-auto flex gap-2">
        <S className="flex-1 max-w-xs h-9 rounded-xl" />
        {[64, 64, 72].map((w, i) => (
          <S key={i} className="h-9 rounded-full" style={{ width: w }} />
        ))}
      </div>
    </div>

    {/* Event grid */}
    <div className="sk-light bg-[color:var(--retro-bg-primary)] max-w-7xl mx-auto px-5 sm:px-8 lg:px-20 pb-16 pt-8">
      <S className="h-4 w-28 mb-5" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[color:var(--retro-brown-dark)]/8 p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <S className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <S className="h-4 w-3/4" />
                <S className="h-3 w-1/2" />
              </div>
            </div>
            <S className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </>
);

const GenericSkeleton = () => (
  <>
    {/* Hero */}
    <div className="sk-dark bg-[color:var(--retro-brown-dark)] pt-28 sm:pt-32 md:pt-40 pb-16 px-6 lg:px-20">
      <div className="max-w-7xl mx-auto space-y-4">
        <S className="h-3 w-24 rounded-full" />
        <S className="h-14 w-80" />
        <S className="h-4 w-56 mt-2" />
      </div>
    </div>

    {/* Content blocks */}
    <div className="sk-light bg-[color:var(--retro-bg-primary)] max-w-7xl mx-auto px-6 lg:px-20 py-14 space-y-4">
      <S className="h-4 w-full max-w-xl" />
      <S className="h-4 w-4/5 max-w-xl" />
      <S className="h-4 w-3/5 max-w-xl" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <S key={i} className="h-52 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  </>
);

/* ── Route → Skeleton map ────────────────────────────────────────── */

const PageSkeleton = () => {
  const { pathname } = useLocation();

  const skeleton = (() => {
    if (pathname === '/' || pathname === '/home') return <HomeSkeleton />;
    if (pathname.startsWith('/gallery'))          return <GallerySkeleton />;
    if (pathname === '/profile')                  return <ProfileSkeleton />;
    if (pathname.startsWith('/news'))             return <NewsSkeleton />;
    if (pathname === '/schedule')                 return <ScheduleSkeleton />;
    return <GenericSkeleton />;
  })();

  return (
    <div className="min-h-screen bg-[color:var(--retro-bg-primary)] overflow-x-hidden">
      <style>{STYLE}</style>
      {skeleton}
    </div>
  );
};

export default PageSkeleton;
