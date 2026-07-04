/**
 * TownPageFade — black overlay that fades out on mount.
 *
 * Pair with TamanPeta's fade-out on navigate: peta fades to black
 * before navigate(); room page mounts black, then fades to clear.
 * Net effect: clean cross-dissolve between peta and any room.
 *
 * Usage: render anywhere inside the room page's outer div.
 */
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const TownPageFade = () => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const tween = gsap.fromTo(
      el,
      { opacity: 1 },
      {
        opacity: 0,
        duration: 0.65,
        ease: 'power2.out',
        delay: 0.08,
        onComplete: () => {
          if (el) el.style.display = 'none';
        },
      },
    );
    return () => tween.kill();
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-[999] bg-black"
      aria-hidden="true"
    />
  );
};

export default TownPageFade;
