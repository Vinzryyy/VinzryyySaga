/**
 * LegendaReveal — cinematic overlay yang mount sebelum + selama KartuFlip
 * untuk tier legenda (Arme atau Aprikot Mei). Genshin-style: aurora
 * gradient sweep + floating petals + warm chime audio = ceremony moment.
 *
 * Layers (translucent, ethereal feel):
 *   - Aurora SVG radial gradient di fixed overlay, opacity animated
 *     via GSAP (0 → 0.65 → 0.8 pulse → 0). Total ~4.5s.
 *   - FloatingPetals (existing component, reused) — apricot petals
 *     drifting throughout reveal window.
 *   - Audio: playLegendaChime triggered ~400ms after mount (slight
 *     delay biar visual establishes dulu, then chime joins).
 *
 * Lifecycle: aurora self-fades, petals continue until parent unmounts
 * (Petikan controls when pluckedCard cleared = reload/midnight).
 *
 * Z-index notes: aurora di z-[5] same plane as petals. Card di document
 * flow stays underneath, translucent aurora creates "ethereal haze"
 * effect — card seen through golden mist. Bukan blocking overlay.
 */

import React, { useEffect, useId, useRef } from 'react';
import { gsap } from 'gsap';
import FloatingPetals from '../countdown/FloatingPetals';
import { playLegendaChime } from './PluckTimeline';
import { readEnabled, readVolume } from '../../lib/townAudioBus';

const LegendaReveal = () => {
  const auroraRef = useRef(null);
  const uid = useId();
  const gradId = `legenda-aurora-${uid}`;

  useEffect(() => {
    const el = auroraRef.current;
    if (!el) return undefined;

    gsap.set(el, { opacity: 0, scale: 0.7 });
    const tl = gsap.timeline();
    // Buildup — aurora swells from center
    tl.to(el, {
      opacity: 0.65,
      scale: 1.0,
      duration: 1.5,
      ease: 'sine.out',
    });
    // Peak pulse — slight intensify (yoyo creates pulse)
    tl.to(el, {
      opacity: 0.8,
      scale: 1.06,
      duration: 0.7,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    });
    // Fade — aurora settles back
    tl.to(el, {
      opacity: 0,
      duration: 1.5,
      ease: 'sine.in',
    });

    // Chime audio — fire 400ms in (after initial visual buildup)
    const chimeTimer = setTimeout(() => {
      if (!readEnabled()) return;
      const vol = readVolume();
      const mult = Math.max(0.4, vol * 1.8);
      playLegendaChime(mult);
    }, 400);

    return () => {
      tl.kill();
      clearTimeout(chimeTimer);
    };
  }, []);

  return (
    <>
      <FloatingPetals />
      <div
        ref={auroraRef}
        className="fixed inset-0 pointer-events-none z-[5]"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id={gradId} cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#ffd97a" stopOpacity="0.85" />
              <stop offset="30%" stopColor="#ffb84d" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#daaf5c" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#daaf5c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${gradId})`} />
        </svg>
      </div>
    </>
  );
};

export default LegendaReveal;
