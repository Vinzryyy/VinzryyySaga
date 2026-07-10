/**
 * PageTransition
 *
 * Fixed burgundy curtain that animates on every client-side route change:
 *   1. scaleY 0→1 from the top  (covers the page swap, 350ms)
 *   2. brief pause (50ms) while the new page mounts underneath
 *   3. scaleY 1→0 from the bottom (reveals the new page, 350ms)
 *
 * Skips on the very first render so the landing page is not hidden on load.
 * Kills any in-flight GSAP timeline before starting a new one so rapid
 * navigation never leaves the curtain half-open.
 */

import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

const PageTransition = () => {
  const { pathname } = useLocation();
  const curtainRef = useRef(null);
  const tlRef = useRef(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    const el = curtainRef.current;
    if (!el) return;

    if (tlRef.current) tlRef.current.kill();

    tlRef.current = gsap
      .timeline()
      .set(el, { transformOrigin: 'top center' })
      .fromTo(el, { scaleY: 0 }, { scaleY: 1, duration: 0.35, ease: 'power2.inOut' })
      .set(el, { transformOrigin: 'bottom center' })
      .to(el, { scaleY: 0, duration: 0.35, ease: 'power2.inOut', delay: 0.05 });

    return () => {
      if (tlRef.current) tlRef.current.kill();
    };
  }, [pathname]);

  return (
    <div
      ref={curtainRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{
        backgroundColor: 'var(--retro-burgundy, #7a1c3a)',
        transform: 'scaleY(0)',
        transformOrigin: 'top center',
      }}
    />
  );
};

export default PageTransition;
