// Path/anchor mapping for the path-based router. Pages live at their
// own `/path`; in-page sub-anchors stay as `#fragment` on their parent
// path so the browser handles smooth scroll natively after navigation.

const HOME_ANCHORS = new Set([
  'data',
  'about-preview',
  'gallery-preview',
  'community',
]);
const PROFILE_ANCHORS = new Set([
  'timeline',
  'fight',
  'discography',
  'theater',
  'trivia',
]);

// Convert a SITE_CONFIG-style identifier (the legacy `hash` field on
// nav/CTA items) to a router href. Year codes (`/^\d{4}$/`) become
// `/gallery/{year}` so era filters are deep-linkable.
export const hashToHref = (hash) => {
  if (!hash || hash === 'home') return '/';
  if (HOME_ANCHORS.has(hash)) return `/#${hash}`;
  if (PROFILE_ANCHORS.has(hash)) return `/profile#${hash}`;
  if (/^\d{4}$/.test(hash)) return `/gallery/${hash}`;
  return `/${hash}`;
};

// Inverse mapping used to highlight the active nav item. Given the
// current location, return the identifier that nav items compare
// against.
export const hrefToActiveId = (pathname, hash) => {
  const cleanHash = (hash || '').replace('#', '').toLowerCase();
  if (pathname === '/' || pathname === '/home') return cleanHash || 'home';
  if (pathname.startsWith('/gallery/')) {
    const year = pathname.split('/')[2];
    return /^\d{4}$/.test(year) ? year : 'gallery';
  }
  if (pathname === '/gallery') return cleanHash || 'gallery';
  if (pathname === '/profile') return cleanHash || 'profile';
  return pathname.replace(/^\//, '') || 'home';
};
