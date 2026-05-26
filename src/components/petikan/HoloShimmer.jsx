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

const TILT_RANGE_DEG = 10;

const HoloShimmer = ({ tier = 'muda', children }) => {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0.5, y: 0.5 });
  const [autoAngle, setAutoAngle] = useState(0);

  const isLangka = tier === 'langka';
  const isLegenda = tier === 'legenda';
  const hasHolo = isLangka || isLegenda;

  // Auto-rotate angle for legenda — slow loop biar idle card hidup
  useEffect(() => {
    if (!isLegenda) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = (now - start) / 1000;
      setAutoAngle((elapsed * 30) % 360); // 12s full rotation
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isLegenda]);

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
