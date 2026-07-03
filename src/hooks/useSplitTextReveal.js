/**
 * useSplitTextReveal
 * Lazy-loads GSAP + SplitText and animates a heading's words sliding up
 * when the element first enters the viewport. Fires once per mount.
 * Respects prefers-reduced-motion — element stays visible with no animation.
 *
 * Usage:
 *   const titleRef = useSplitTextReveal();
 *   <h2 ref={titleRef}>...</h2>
 */

import { useEffect, useRef } from 'react';

const useSplitTextReveal = (options = {}) => {
  const {
    y = 48,
    duration = 0.75,
    ease = 'power3.out',
    stagger = 0.07,
    delay = 0,
    threshold = 0.25,
  } = options;

  const ref = useRef(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || firedRef.current) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let split = null;
    let tween = null;
    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || firedRef.current) return;
        firedRef.current = true;
        observer.disconnect();

        (async () => {
          try {
            const [{ gsap }, { SplitText }] = await Promise.all([
              import('gsap'),
              import('gsap/SplitText'),
            ]);
            if (cancelled || !ref.current) return;
            gsap.registerPlugin(SplitText);

            split = new SplitText(ref.current, { type: 'words' });
            tween = gsap.from(split.words, {
              y,
              opacity: 0,
              duration,
              ease,
              stagger,
              delay,
            });
          } catch {
            // GSAP unavailable — heading stays visible as-is
          }
        })();
      },
      { threshold, rootMargin: '-20px' },
    );

    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (tween) tween.kill();
      if (split) split.revert();
    };
  }, []);

  return ref;
};

export default useSplitTextReveal;
