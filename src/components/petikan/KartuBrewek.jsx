/**
 * KartuBrewek — Fruit Ninja-style cut + polaroid develop mechanic.
 *
 * User tap pack → diagonal white slash trail draws across (Fruit Ninja
 * blade swipe vibe) → splash particles burst at impact → pack split
 * apart (flap fly up-left, body fall down-right, gravity-like) → polaroid
 * emerges with develop animation (blur → sharp).
 *
 * Visual layers:
 *   - Envelope body (bottom 65% master art)
 *   - Polaroid card (KartuIngatan + frame)
 *   - Envelope flap (top 35% master art)
 *   - Slash trail SVG overlay (drawn on cut)
 *
 * skipPack=true (kartu 2/3 di triad): no slash anim, polaroid instant visible.
 * prefers-reduced-motion: tap = instant open, no slash anim, polaroid static.
 */

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import KartuBack from './KartuBack';
import KartuIngatan from './KartuIngatan';
import HoloShimmer from './HoloShimmer';
import ParticleBurst from './ParticleBurst';
import { playPageTurnSfx } from './PluckTimeline';
import { readEnabled, readVolume } from '../../lib/townAudioBus';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Per-tier halo glow palette
const TIER_HALO = {
  muda: { color: 'rgba(232, 200, 156, 0.0)', intensity: 0 },
  matang: { color: 'rgba(218, 175, 92, 0.45)', intensity: 0.4 },
  langka: { color: 'rgba(255, 184, 77, 0.65)', intensity: 0.65 },
  legenda: { color: 'rgba(255, 217, 122, 0.85)', intensity: 0.85 },
};

// Polaroid develop timing per tier
const TIER_DEVELOP = {
  muda: { preDelay: 0.05, slideOut: 0.45, develop: 0.7 },
  matang: { preDelay: 0.15, slideOut: 0.55, develop: 0.9 },
  langka: { preDelay: 0.35, slideOut: 0.7, develop: 1.2 },
  legenda: { preDelay: 1.4, slideOut: 0.85, develop: 1.6 },
};

const KartuBrewek = ({
  canPluck = false,
  pluckedCard = null,
  onPluck,
  revealDelay = 0,
  skipPack = false,
}) => {
  const containerRef = useRef(null);
  const innerWrapperRef = useRef(null);
  const flapRef = useRef(null);
  const bodyRef = useRef(null);
  const polaroidRef = useRef(null);
  const haloRef = useRef(null);
  const slashRef = useRef(null);
  const splashRef = useRef(null);
  const shimmerRef = useRef(null);
  const playedRef = useRef(false);
  const prevCardIdRef = useRef(null);
  const haloPulseRef = useRef(null);
  const breatheRef = useRef(null);

  const [cutting, setCutting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const polaroidTiltRef = useRef((Math.random() - 0.5) * 5);

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Re-randomize polaroid tilt saat new card mount
  useEffect(() => {
    if (pluckedCard) {
      polaroidTiltRef.current = (Math.random() - 0.5) * 5;
    }
  }, [pluckedCard?.id]);

  // Pre-pluck breathing — invite tap cue via subtle scale yoyo
  useEffect(() => {
    if (!containerRef.current) return undefined;
    if (
      pluckedCard ||
      !canPluck ||
      typeof onPluck !== 'function' ||
      cutting ||
      prefersReducedMotion
    ) {
      if (breatheRef.current) {
        breatheRef.current.kill();
        breatheRef.current = null;
      }
      return undefined;
    }
    breatheRef.current = gsap.to(containerRef.current, {
      scale: 1.025,
      duration: 1.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => {
      if (breatheRef.current) {
        breatheRef.current.kill();
        breatheRef.current = null;
      }
    };
  }, [canPluck, pluckedCard, onPluck, cutting, prefersReducedMotion]);

  const interactive =
    canPluck && !pluckedCard && typeof onPluck === 'function' && !cutting;

  // 3D mouse-tilt — pack rotates following cursor position relative to
  // pack bounds. Hover lift + cursor-tracking shimmer overlay. Skip
  // saat reduced-motion atau gak interactive.
  const handlePointerMoveTilt = (e) => {
    if (!interactive || prefersReducedMotion) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    if (innerWrapperRef.current) {
      gsap.to(innerWrapperRef.current, {
        rotateY: (xRatio - 0.5) * 14, // ±7°
        rotateX: -(yRatio - 0.5) * 14,
        duration: 0.25,
        ease: 'sine.out',
        overwrite: 'auto',
      });
    }
    if (shimmerRef.current) {
      gsap.set(shimmerRef.current, {
        '--shimmer-x': `${xRatio * 100}%`,
        '--shimmer-y': `${yRatio * 100}%`,
      });
    }
  };

  const handlePointerEnterPack = () => {
    if (!interactive || prefersReducedMotion) return;
    setHovered(true);
  };

  const handlePointerLeavePack = () => {
    setHovered(false);
    if (innerWrapperRef.current && !cutting && !pluckedCard) {
      gsap.to(innerWrapperRef.current, {
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  };

  const handlePressDown = () => {
    if (!interactive || prefersReducedMotion) return;
    if (innerWrapperRef.current) {
      gsap.to(innerWrapperRef.current, {
        scale: 0.96,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handlePressUp = () => {
    if (cutting || !innerWrapperRef.current) return;
    gsap.to(innerWrapperRef.current, {
      scale: 1,
      duration: 0.28,
      ease: 'back.out(2.2)',
      overwrite: 'auto',
    });
  };

  // Cut animation — slash trail + split apart + onPluck
  const handleTapCut = (e) => {
    if (!interactive) return;
    e?.preventDefault?.();
    setCutting(true);
    setHovered(false);

    // Reset tilt + scale ke neutral sebelum slash animation jalan
    if (innerWrapperRef.current) {
      gsap.to(innerWrapperRef.current, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.15,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    if (prefersReducedMotion) {
      // Reduced motion: skip slash, langsung fade pack out + onPluck
      if (flapRef.current)
        gsap.to(flapRef.current, { opacity: 0, duration: 0.25 });
      if (bodyRef.current)
        gsap.to(bodyRef.current, { opacity: 0, duration: 0.25 });
      setTimeout(() => {
        if (typeof onPluck === 'function') onPluck();
      }, 260);
      return;
    }

    // Phase 1: Slash trail SVG draws diagonal — top-left → bottom-right
    if (slashRef.current) {
      const line = slashRef.current.querySelector('line');
      if (line) {
        const len = 360; // approximate diagonal length
        gsap.set(line, {
          strokeDasharray: len,
          strokeDashoffset: len,
          opacity: 1,
        });
        gsap.to(line, {
          strokeDashoffset: 0,
          duration: 0.18,
          ease: 'power4.out',
        });
        gsap.to(line, {
          opacity: 0,
          duration: 0.32,
          delay: 0.22,
          ease: 'power2.in',
        });
      }
    }

    // Phase 2: Splash particle burst at slash midpoint
    if (splashRef.current) {
      const splashEls = splashRef.current.querySelectorAll('.splash-piece');
      splashEls.forEach((el, i) => {
        const angle = (i / splashEls.length) * Math.PI * 2 + Math.PI * 0.25;
        const dist = 50 + Math.random() * 60;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        gsap.set(el, { x: 0, y: 0, opacity: 0, scale: 0 });
        gsap.to(el, {
          opacity: 1,
          scale: 1,
          duration: 0.12,
          delay: 0.16,
          ease: 'sine.out',
        });
        gsap.to(el, {
          x: tx,
          y: ty,
          rotation: Math.random() * 360,
          duration: 0.7 + Math.random() * 0.3,
          delay: 0.16,
          ease: 'power2.out',
        });
        gsap.to(el, {
          opacity: 0,
          scale: 0.4,
          duration: 0.4,
          delay: 0.45,
          ease: 'sine.in',
        });
      });
    }

    // Phase 3: Pack splits apart — flap fly up-left, body drop down-right.
    // Mimic diagonal cut: pieces gravitate to opposite sides of slash line.
    if (flapRef.current) {
      gsap.to(flapRef.current, {
        rotateZ: -22,
        x: -55,
        y: -45,
        opacity: 0,
        duration: 0.6,
        delay: 0.16,
        ease: 'power3.in',
      });
    }
    if (bodyRef.current) {
      gsap.to(bodyRef.current, {
        rotateZ: 18,
        x: 48,
        y: 40,
        opacity: 0,
        duration: 0.6,
        delay: 0.16,
        ease: 'power3.in',
      });
    }

    // Phase 4: Audio cue + onPluck callback
    setTimeout(() => {
      if (readEnabled()) {
        const vol = readVolume();
        playPageTurnSfx(Math.max(0.5, vol * 2));
      }
      if (typeof onPluck === 'function') onPluck();
    }, 320);
  };

  // Polaroid develop reveal
  useEffect(() => {
    if (!pluckedCard) return undefined;
    if (prevCardIdRef.current !== pluckedCard.id) {
      playedRef.current = false;
    }
    if (playedRef.current) return undefined;
    if (!polaroidRef.current) return undefined;
    playedRef.current = true;
    prevCardIdRef.current = pluckedCard.id;

    const reveal = TIER_DEVELOP[pluckedCard.tier] || TIER_DEVELOP.muda;
    const tilt = polaroidTiltRef.current;

    // Reduced-motion atau skipPack: instant polaroid visible
    if (prefersReducedMotion || skipPack) {
      if (bodyRef.current) gsap.set(bodyRef.current, { opacity: 0 });
      if (flapRef.current) gsap.set(flapRef.current, { opacity: 0 });
      gsap.set(polaroidRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        rotate: tilt,
        filter: 'blur(0px)',
      });
      const haloConfig = TIER_HALO[pluckedCard.tier] || TIER_HALO.muda;
      if (haloRef.current) {
        if (haloPulseRef.current) {
          haloPulseRef.current.kill();
          haloPulseRef.current = null;
        }
        gsap.set(haloRef.current, { opacity: haloConfig.intensity });
        if (haloConfig.intensity > 0 && !prefersReducedMotion) {
          const peak = haloConfig.intensity;
          const valley = peak * 0.7;
          haloPulseRef.current = gsap.to(haloRef.current, {
            opacity: valley,
            duration: 2.2,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
        }
      }
      return undefined;
    }

    // Surprise reveal: zoom-in dari small + heavy blur, clear dramatis
    // di akhir. User gak bisa lihat tier sampai blur clear → rare card
    // surprise lebih impact. Halo color (tier indicator) delay ke
    // ujung reveal — gak telegraph tier lewat warna glow di awal.
    gsap.set(polaroidRef.current, {
      opacity: 0,
      scale: 0.5, // start small (distant)
      y: -40,
      rotate: tilt - 4,
      filter: 'blur(45px)', // heavy blur — identitas kartu hidden
    });

    const tl = gsap.timeline({ delay: reveal.preDelay + revealDelay });

    // Phase 1: quick fade + slide in (kartu masih small + blurred)
    tl.to(polaroidRef.current, {
      opacity: 1,
      y: 0,
      rotate: tilt,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Phase 2: SUSPENSE — zoom in + blur clear bareng dengan
    // power3.in curve. Most action happens di 30% terakhir =
    // build-up panjang lalu reveal cepat di akhir. Total durasi
    // pakai tier-specific develop length.
    const totalReveal = reveal.slideOut + reveal.develop;
    tl.to(
      polaroidRef.current,
      {
        scale: 1.0,
        filter: 'blur(0px)',
        duration: totalReveal,
        ease: 'power3.in',
      },
      0,
    );

    // Particle burst di reveal peak — moment blur clear sharp
    tl.add(() => {
      setParticleTrigger((p) => p + 1);
    }, totalReveal * 0.92);

    // Halo (tier-color) fade in DI AKHIR setelah blur clear — supaya
    // user gak tau tier dari halo warna selama suspense phase.
    const haloConfig = TIER_HALO[pluckedCard.tier] || TIER_HALO.muda;
    if (haloRef.current && haloConfig.intensity > 0) {
      tl.to(
        haloRef.current,
        {
          opacity: haloConfig.intensity,
          duration: 0.45,
          ease: 'sine.out',
        },
        totalReveal * 0.88,
      );
      tl.add(() => {
        if (haloPulseRef.current) haloPulseRef.current.kill();
        const peak = haloConfig.intensity;
        const valley = peak * 0.7;
        haloPulseRef.current = gsap.to(haloRef.current, {
          opacity: valley,
          duration: 2.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }, totalReveal + 0.3);
    }

    return () => {
      tl.kill();
      if (haloPulseRef.current) {
        haloPulseRef.current.kill();
        haloPulseRef.current = null;
      }
    };
  }, [pluckedCard, revealDelay, skipPack, prefersReducedMotion]);

  // Reset state saat pluckedCard cleared
  useEffect(() => {
    if (pluckedCard) return;
    if (haloPulseRef.current) {
      haloPulseRef.current.kill();
      haloPulseRef.current = null;
    }
    playedRef.current = false;
    prevCardIdRef.current = null;
    setCutting(false);
    if (flapRef.current) gsap.set(flapRef.current, { clearProps: 'all' });
    if (bodyRef.current) gsap.set(bodyRef.current, { clearProps: 'all' });
    if (polaroidRef.current) {
      gsap.set(polaroidRef.current, {
        opacity: 0,
        scale: 0.5,
        y: -40,
        filter: 'blur(45px)',
      });
    }
    if (haloRef.current) gsap.set(haloRef.current, { opacity: 0 });
  }, [pluckedCard]);

  if (!canPluck && !pluckedCard) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-xs mx-auto"
      style={{ minHeight: '480px', perspective: '1200px' }}
    >
      {/* Halo glow */}
      {pluckedCard && (
        <div
          ref={haloRef}
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            inset: '-60px',
            opacity: 0,
            background: `radial-gradient(circle, ${(TIER_HALO[pluckedCard.tier] || TIER_HALO.muda).color} 0%, transparent 65%)`,
            filter: 'blur(35px)',
          }}
        />
      )}

      {/* Inner 3D wrapper — receives mouse-tilt + press-compression
          transforms. Preserve-3d supaya rotateX/Y stay 3D, gak flat
          ke 2D rendering. */}
      <div
        ref={innerWrapperRef}
        className="relative grid"
        style={{
          minHeight: '480px',
          transformStyle: 'preserve-3d',
          willChange: interactive ? 'transform' : 'auto',
        }}
      >
        {/* Envelope body — bottom 65% */}
        <div
          ref={bodyRef}
          className="row-start-1 col-start-1 pointer-events-none"
          style={{
            clipPath: 'inset(35% 0 0 0)',
            WebkitClipPath: 'inset(35% 0 0 0)',
          }}
          aria-hidden="true"
        >
          <KartuBack tier="matang" />
        </div>

        {/* Polaroid card */}
        <div
          ref={polaroidRef}
          className="row-start-1 col-start-1 mx-auto self-center"
          style={{
            opacity: 0,
            width: '92%',
            padding: '12px 12px 36px 12px',
            background: 'linear-gradient(180deg, #fefefe 0%, #fbf8f0 100%)',
            borderRadius: '6px',
            boxShadow:
              '0 12px 28px rgba(61,52,43,0.22), 0 2px 6px rgba(61,52,43,0.15)',
            border: '1px solid rgba(140,100,60,0.08)',
            position: 'relative',
          }}
        >
          {pluckedCard && (
            <>
              <HoloShimmer tier={pluckedCard.tier}>
                <KartuIngatan card={pluckedCard} />
              </HoloShimmer>
              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-3 text-[8px] uppercase tracking-[0.18em] text-[color:var(--retro-brown-dark)]/55">
                <span className="truncate max-w-[55%]">
                  {pluckedCard.era?.replace(/-/g, ' ') || 'arme'}
                </span>
                <span
                  className="font-bold text-[color:var(--retro-burgundy)] tabular-nums"
                  style={{ letterSpacing: '0.1em' }}
                >
                  {pluckedCard.tier === 'legenda'
                    ? 'S'
                    : pluckedCard.tier === 'langka'
                      ? 'A'
                      : pluckedCard.tier === 'matang'
                        ? 'B'
                        : 'C'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Envelope flap — top 35% */}
        <div
          ref={flapRef}
          className="row-start-1 col-start-1 pointer-events-none"
          style={{
            clipPath: 'inset(0 0 65% 0)',
            WebkitClipPath: 'inset(0 0 65% 0)',
            transformOrigin: 'center center',
          }}
          aria-hidden="true"
        >
          <KartuBack tier="matang" />
        </div>
      </div>

      {/* Particle burst on polaroid sharp */}
      {pluckedCard && (
        <ParticleBurst tier={pluckedCard.tier} trigger={particleTrigger} />
      )}

      {/* Slash trail — SVG line draws diagonal saat tap.
          Preserve aspect via percentage coords. line ada glow via filter. */}
      {(!pluckedCard || cutting) && !prefersReducedMotion && (
        <svg
          ref={slashRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-30"
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="slashGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="-5"
            y1="15"
            x2="105"
            y2="135"
            stroke="url(#slashGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9))',
            }}
          />
        </svg>
      )}

      {/* Splash particles — small white slivers burst at slash midpoint.
          12 pieces radial spread, opacity + scale fade. */}
      {(!pluckedCard || cutting) && !prefersReducedMotion && (
        <div
          ref={splashRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-30"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="splash-piece absolute block"
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '2px',
                background: i % 2 === 0 ? '#ffffff' : '#fce8a0',
                boxShadow: '0 0 4px rgba(255,255,255,0.7)',
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Cursor-following shimmer overlay — radial gradient yang nge-track
          mouse position via CSS variables. Hanya muncul saat hovered untuk
          gak distract pre-pluck breathing. */}
      {interactive && !prefersReducedMotion && (
        <div
          ref={shimmerRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none rounded-2xl z-25 transition-opacity duration-300"
          style={{
            opacity: hovered ? 1 : 0,
            background:
              'radial-gradient(circle 120px at var(--shimmer-x, 50%) var(--shimmer-y, 50%), rgba(255, 240, 200, 0.28) 0%, rgba(255, 220, 160, 0.12) 35%, transparent 70%)',
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Tap-to-cut button — full pack area, large touch target. Plus
          mouse-tilt + hover lift + press compression handlers untuk
          interactive idle pack feel. */}
      {interactive && (
        <button
          type="button"
          onClick={handleTapCut}
          onPointerMove={handlePointerMoveTilt}
          onPointerEnter={handlePointerEnterPack}
          onPointerLeave={handlePointerLeavePack}
          onPointerDown={handlePressDown}
          onPointerUp={handlePressUp}
          onPointerCancel={handlePressUp}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTapCut(e);
            }
          }}
          className="absolute inset-0 z-20 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40 transition-transform"
          style={{
            transform: hovered && !cutting ? 'translateY(-3px)' : 'translateY(0)',
            filter:
              hovered && !cutting
                ? 'drop-shadow(0 10px 22px rgba(61,52,43,0.22))'
                : 'none',
            transitionDuration: '220ms',
          }}
          aria-label="Tap untuk membelah amplop"
        />
      )}

      {/* Hint text — kasih tau user untuk tap */}
      {interactive && !prefersReducedMotion && (
        <p
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 -bottom-6 text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/55 pointer-events-none"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          ✦ Tap untuk membelah
        </p>
      )}
    </div>
  );
};

export default KartuBrewek;
