/**
 * HoloShimmer — TCG Pocket-style mouse-tilt holographic effect.
 * Wrap any card content; rare tiers (langka+) dapat foil shimmer
 * yang shift mengikuti mouse position. Mobile fallback: auto-rotate
 * conic gradient simulasi cahaya bergerak.
 *
 * Tier behavior:
 *   muda    — no effect, render children plain (positioning only)
 *   matang  — subtle hover-only static shine
 *   langka  — full mouse-tilt holographic foil (conic + radial)
 *   legenda — extra intense holo + auto-rotate fallback layer
 *
 * Effects:
 *   1. 3D rotateX/rotateY card tilt mengikuti mouse position (±10°)
 *   2. Radial "light point" gradient at mouse position (white→gold)
 *   3. Conic gradient foil overlay (gold→purple→cyan→peach→gold) di
 *      mix-blend-mode overlay biar interact dengan card surface
 *   4. Auto-rotate fallback (legenda) — slow continuous rotation
 *      conic supaya cards punya life even tanpa mouse (mobile, idle)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const TILT_RANGE_DEG = 10;

const HoloShimmer = ({ tier = 'muda', children }) => {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0.5, y: 0.5 });
  const [autoAngle, setAutoAngle] = useState(0);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const isLangka = tier === 'langka';
  const isLegenda = tier === 'legenda';
  const hasHolo = isLangka || isLegenda;

  // Auto-rotate angle for legenda — slow loop biar idle card hidup.
  // Pause saat tab hidden (document.visibilityState) untuk save battery
  // dan CPU. Skip entirely kalau prefers-reduced-motion.
  useEffect(() => {
    if (!isLegenda || prefersReducedMotion) return undefined;
    let raf = 0;
    let lastTime = performance.now();
    let accumulated = 0;
    const tick = (now) => {
      if (document.visibilityState === 'visible') {
        const delta = now - lastTime;
        accumulated += delta;
        setAutoAngle((accumulated * 0.03) % 360); // 30 deg/sec → 12s rotation
      }
      lastTime = now;
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      // Reset lastTime saat tab balik visible biar gak ada jump besar.
      lastTime = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isLegenda, prefersReducedMotion]);

  const handleMove = (e) => {
    if (!hasHolo || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setTilt({ x, y });
  };

  const handleLeave = () => setTilt({ x: 0.5, y: 0.5 });

  const handleTouchMove = (e) => {
    if (!hasHolo || !containerRef.current || !e.touches[0]) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
    setTilt({ x, y });
  };

  const rotateX = hasHolo ? (0.5 - tilt.y) * TILT_RANGE_DEG : 0;
  const rotateY = hasHolo ? (tilt.x - 0.5) * TILT_RANGE_DEG : 0;
  const shimmerX = tilt.x * 100;
  const shimmerY = tilt.y * 100;
  // Auto-angle adds untuk legenda; otherwise tilt-derived angle
  const conicAngle = isLegenda ? autoAngle : tilt.x * 360;

  // Opacity per tier
  const radialOpacity = isLegenda ? 0.6 : isLangka ? 0.45 : 0;
  const conicOpacity = isLegenda ? 0.5 : isLangka ? 0.32 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchMove={handleTouchMove}
      style={{
        perspective: '1500px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: hasHolo ? 'transform 0.15s ease-out' : 'none',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}

        {/* Holographic foil overlay — di atas card content */}
        {hasHolo && (
          <>
            {/* Conic foil — oil slick rainbow effect */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: `conic-gradient(
                  from ${conicAngle}deg at ${shimmerX}% ${shimmerY}%,
                  rgba(255, 217, 122, 0.5),
                  rgba(184, 144, 209, 0.5),
                  rgba(123, 199, 213, 0.5),
                  rgba(255, 167, 167, 0.5),
                  rgba(157, 235, 195, 0.5),
                  rgba(255, 217, 122, 0.5)
                )`,
                mixBlendMode: 'overlay',
                opacity: conicOpacity,
                transition: 'opacity 0.2s ease-out',
              }}
            />
            {/* Radial light point — moving highlight at mouse */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: `radial-gradient(
                  circle at ${shimmerX}% ${shimmerY}%,
                  rgba(255, 248, 232, 0.7) 0%,
                  rgba(255, 217, 122, 0.4) 18%,
                  transparent 50%
                )`,
                mixBlendMode: 'soft-light',
                opacity: radialOpacity,
                transition: 'opacity 0.2s ease-out',
              }}
            />
            {/* Legenda extra — gold sparkle ring at edges */}
            {isLegenda && (
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  boxShadow:
                    'inset 0 0 30px rgba(255, 217, 122, 0.35), inset 0 0 60px rgba(255, 184, 77, 0.15)',
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HoloShimmer;
