/**
 * "Jeda animasi" — a visitor's own switch to calm the site down, for
 * anyone whose system isn't set to reduced motion but who still finds the
 * reveals, parallax and smooth scroll too much.
 *
 * Turning it off:
 *   - sets <html data-motion="off">, which index.css uses to stop CSS
 *     animations and transitions at once;
 *   - makes `matchMedia('(prefers-reduced-motion: reduce)')` answer true,
 *     so every component that already respects the OS setting (GSAP
 *     reveals, count-ups, parallax, Lenis, petals…) treats this visitor
 *     the same way, with no per-component change.
 *
 * The choice is a per-browser convenience kept in localStorage; when
 * storage is unavailable the site simply animates as before.
 */

const KEY = 'armeniaca_motion';
const QUERY_RE = /prefers-reduced-motion\s*:\s*reduce/i;
const listeners = new Set();

const read = () => {
  try {
    return localStorage.getItem(KEY) === 'off';
  } catch {
    return false;
  }
};

let off = typeof window !== 'undefined' ? read() : false;

export const isMotionOff = () => off;

const apply = () => {
  if (typeof document === 'undefined') return;
  if (off) document.documentElement.dataset.motion = 'off';
  else delete document.documentElement.dataset.motion;
};

/** Call once before React renders. */
export const installMotionPref = () => {
  if (typeof window === 'undefined' || !window.matchMedia || window.matchMedia.__armeniaca) return;
  const native = window.matchMedia.bind(window);
  const patched = (query) => {
    const mql = native(query);
    if (!off || !QUERY_RE.test(String(query))) return mql;
    // Same shape as a MediaQueryList, but always matching.
    return {
      matches: true,
      media: mql.media,
      onchange: null,
      addEventListener: (...a) => mql.addEventListener?.(...a),
      removeEventListener: (...a) => mql.removeEventListener?.(...a),
      addListener: (...a) => mql.addListener?.(...a),
      removeListener: (...a) => mql.removeListener?.(...a),
      dispatchEvent: (...a) => mql.dispatchEvent?.(...a),
    };
  };
  patched.__armeniaca = true;
  window.matchMedia = patched;
  apply();
};

export const setMotionOff = (value) => {
  off = Boolean(value);
  try {
    if (off) localStorage.setItem(KEY, 'off');
    else localStorage.removeItem(KEY);
  } catch {
    /* choice lasts for this page view only */
  }
  apply();
  listeners.forEach((fn) => fn(off));
};

export const subscribeMotion = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
