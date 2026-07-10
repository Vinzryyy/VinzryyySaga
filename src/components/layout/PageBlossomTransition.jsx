/**
 * PageBlossomTransition
 *
 * On every client-side route change:
 *   1. Parchment backing (--retro-bg-primary) fades in (220ms) — hides swap
 *   2. 22 apricot-blossom petals sweep left → right across the backing
 *   3. Backing fades out (300ms) — reveals new page underneath
 *
 * Total duration ~850ms. Same petal SVG silhouette as FloatingPetals.
 * Uses GSAP timeline; kills in-flight animation on rapid navigation.
 * Skips first mount so the landing page is not hidden on load.
 */

import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

const PETAL_COUNT = 22;
const PETAL_FILLS = [
  'var(--retro-burgundy-light)',
  'var(--retro-burgundy)',
  'var(--retro-sepia)',
  'var(--retro-gold-light)',
];

// Deterministic spread — same seed function as FloatingPetals
const seeded = (i, mod) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % mod;

const PageBlossomTransition = () => {
  const { pathname } = useLocation();
  const containerRef = useRef(null);
  const bgRef = useRef(null);
  const tlRef = useRef(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    const container = containerRef.current;
    const bg = bgRef.current;
    if (!container || !bg) return;

    const petals = container.querySelectorAll('.pt-petal');

    if (tlRef.current) tlRef.current.kill();

    // Place all petals off-screen left at varied y positions
    gsap.set(petals, {
      x: -100,
      y: (i) => `${seeded(i, 85) + 5}vh`,
      rotation: (i) => seeded(i, 360),
      opacity: 1,
      scale: (i) => 0.7 + seeded(i, 0.7),
    });

    tlRef.current = gsap
      .timeline({
        onComplete: () => gsap.set(petals, { opacity: 0 }),
      })
      // 1. Backing fades in — hides the page swap happening underneath
      .to(bg, { opacity: 1, duration: 0.22, ease: 'power2.in' })
      // 2. Petals sweep across while backing is opaque
      .to(
        petals,
        {
          x: '115vw',
          y: (i) => `${seeded(i + 5, 88)}vh`,
          rotation: '+=300',
          duration: 0.55,
          stagger: 0.022,
          ease: 'power1.inOut',
        },
        '-=0.08'
      )
      // 3. Backing fades out — reveals new page
      .to(bg, { opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.25');

    return () => tlRef.current?.kill();
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Parchment backing */}
      <div
        ref={bgRef}
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--retro-bg-primary)', opacity: 0 }}
      />

      {/* Petals — decorative layer on top of backing */}
      {Array.from({ length: PETAL_COUNT }).map((_, i) => {
        const size = 14 + (i % 3) * 7; // 14, 21, 28px
        const fill = PETAL_FILLS[i % PETAL_FILLS.length];
        return (
          <div
            key={i}
            className="pt-petal absolute"
            style={{ opacity: 0, top: 0, left: 0 }}
          >
            <svg
              width={size}
              height={Math.round(size * 1.3)}
              viewBox="0 0 24 32"
            >
              <path
                d="M12 2 C18 6, 21 14, 19 22 C17 28, 13 30, 12 30 C11 30, 7 28, 5 22 C3 14, 6 6, 12 2 Z"
                fill={fill}
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default PageBlossomTransition;
