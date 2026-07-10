/**
 * PetalBurst
 *
 * Global click/tap listener that spawns a small burst of apricot-blossom
 * petals at the cursor/touch position. Each petal flies outward, rotates,
 * and fades out over ~650ms, then removes itself from the DOM.
 *
 * Design:
 *  - 6 petals per burst, fanned evenly around 360° with slight random jitter
 *  - Same SVG silhouette and CSS-var colours as FloatingPetals / PageBlossomTransition
 *  - z-index 9998 — below the page transition overlay (9999), above content
 *  - Respects prefers-reduced-motion (no-op if motion is reduced)
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const PETALS_PER_BURST = 6;
const PETAL_FILLS = [
  'var(--retro-burgundy-light)',
  'var(--retro-burgundy)',
  'var(--retro-sepia)',
  'var(--retro-gold-light)',
];

const PetalBurst = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const x = e.clientX;
      const y = e.clientY;
      // Vary each burst using current ms so rapid clicks look different
      const jitter = Date.now() % 1000;

      for (let i = 0; i < PETALS_PER_BURST; i++) {
        const size = 8 + (i % 3) * 5; // 8, 13, 18 px
        const fill = PETAL_FILLS[i % PETAL_FILLS.length];

        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
        el.innerHTML = `<svg width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 24 32" aria-hidden="true">
          <path d="M12 2 C18 6, 21 14, 19 22 C17 28, 13 30, 12 30 C11 30, 7 28, 5 22 C3 14, 6 6, 12 2 Z" fill="${fill}"/>
        </svg>`;
        container.appendChild(el);

        // Fan petals evenly around the click point with slight angular jitter
        const baseAngle = (i / PETALS_PER_BURST) * 360;
        const jitterAngle = ((jitter + i * 17) % 40) - 20; // ±20°
        const angleDeg = baseAngle + jitterAngle;
        const rad = (angleDeg * Math.PI) / 180;
        const dist = 44 + ((jitter + i * 31) % 36); // 44–80 px

        gsap.fromTo(
          el,
          {
            x: x - size / 2,
            y: y - size / 2,
            scale: 0.2,
            opacity: 0.85,
            rotation: (jitter + i * 53) % 360,
          },
          {
            x: x - size / 2 + Math.cos(rad) * dist,
            y: y - size / 2 + Math.sin(rad) * dist,
            scale: 1,
            opacity: 0,
            rotation: `+=${100 + (i % 3) * 70}`,
            duration: 0.55 + (i % 3) * 0.08,
            ease: 'power2.out',
            onComplete: () => el.remove(),
          }
        );
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};

export default PetalBurst;
