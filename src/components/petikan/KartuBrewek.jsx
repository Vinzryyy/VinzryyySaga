/**
 * KartuBrewek — envelope + pull-string + polaroid mechanic.
 *
 * Unique pack-opening: pack di-style sebagai amplop dengan flap atas
 * yang ada pull-string (red ribbon) di sisi kanan. User DRAG string
 * ke bawah → flap rotateX terbuka mengikuti drag progress. Lewat
 * threshold 50% → snap open + invoke onPluck.
 *
 * Kartu emerge sebagai POLAROID — white border frame + develop animation
 * (high blur → sharp blur 0, opacity 0 → 1, slight tilt rotate).
 *
 * Layer stacking di grid cell yang sama:
 *   - Envelope body (bottom half of master image, static) — bawah
 *   - Polaroid card (KartuIngatan + frame) — middle, hidden initially
 *   - Envelope flap (top half of master image, pulls open) — top
 *   - Pull-string ribbon — overlay right side
 *
 * skipPack=true (kartu 2/3 di triad atau swipe-back): envelope flap
 * hidden, polaroid langsung visible static — no drag interaction.
 *
 * prefers-reduced-motion: skip drag interaction, render tap-to-open
 * fallback. Polaroid emerge tanpa develop blur animation.
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

// Polaroid develop timing per tier — legenda paling lambat develop
// untuk "feel-it-coming" reward. preDelay diturunin karena flap-open
// udah jadi buildup; cuma legenda yang butuh window panjang (aurora).
const TIER_DEVELOP = {
  muda: { preDelay: 0.05, slideOut: 0.45, develop: 0.7 },
  matang: { preDelay: 0.15, slideOut: 0.55, develop: 0.9 },
  langka: { preDelay: 0.35, slideOut: 0.7, develop: 1.2 },
  legenda: { preDelay: 1.4, slideOut: 0.85, develop: 1.6 },
};

// Drag config — threshold progress untuk auto-complete vs snap-back.
const DRAG_THRESHOLD = 0.5; // 50% pulled → open
const DRAG_FULL_PX = 100; // px drag distance untuk 100% progress

const KartuBrewek = ({
  canPluck = false,
  pluckedCard = null,
  onPluck,
  revealDelay = 0,
  skipPack = false,
}) => {
  const containerRef = useRef(null);
  const flapRef = useRef(null);
  const bodyRef = useRef(null);
  const stringRef = useRef(null);
  const polaroidRef = useRef(null);
  const haloRef = useRef(null);
  const playedRef = useRef(false);
  const prevCardIdRef = useRef(null);
  const haloPulseRef = useRef(null);
  // Drag state — track start position + active pointer id.
  // dragProgressRef = always-fresh value (synchronous), dragProgress
  // state = render-trigger. Read REF di handler untuk avoid stale closure.
  const dragStartRef = useRef(null);
  const dragProgressRef = useRef(0);
  const [dragProgress, setDragProgress] = useState(0);
  const [openingFlap, setOpeningFlap] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(0);
  // Slight polaroid rotation untuk doodle feel — random per card mount.
  const polaroidTiltRef = useRef((Math.random() - 0.5) * 5);

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Re-randomize polaroid tilt saat new card
  useEffect(() => {
    if (pluckedCard) {
      polaroidTiltRef.current = (Math.random() - 0.5) * 5;
    }
  }, [pluckedCard?.id]);

  // Drag handlers — hanya aktif saat pre-pluck (canPluck + no card + no anim)
  const interactive =
    canPluck && !pluckedCard && typeof onPluck === 'function' && !openingFlap;

  const handlePointerDown = (e) => {
    if (!interactive || prefersReducedMotion) return;
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const handlePointerMove = (e) => {
    if (!dragStartRef.current) return;
    if (e.pointerId !== dragStartRef.current.pointerId) return;
    const dy = e.clientY - dragStartRef.current.y;
    const progress = Math.max(0, Math.min(1, dy / DRAG_FULL_PX));
    dragProgressRef.current = progress;
    setDragProgress(progress);
    if (flapRef.current) {
      gsap.set(flapRef.current, {
        rotateX: -progress * 160,
        y: -progress * 4,
      });
    }
    if (stringRef.current) {
      gsap.set(stringRef.current, {
        y: progress * 22,
      });
    }
  };

  const finishOpen = () => {
    setOpeningFlap(true);
    if (flapRef.current) {
      gsap.to(flapRef.current, {
        rotateX: -180,
        y: -8,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
      });
    }
    // Body juga fade out — pack cover semuanya pergi, polaroid clean
    // against page background. Slight scale-down + y offset = "pack
    // jatuh ke bawah" implicit.
    if (bodyRef.current) {
      gsap.to(bodyRef.current, {
        opacity: 0,
        scale: 0.96,
        y: 12,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
    if (stringRef.current) {
      gsap.to(stringRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.25,
        ease: 'power1.in',
      });
    }
    // Audio cue + onPluck callback setelah flap selesai open
    setTimeout(() => {
      if (readEnabled()) {
        const vol = readVolume();
        playPageTurnSfx(Math.max(0.4, vol * 1.8));
      }
      if (typeof onPluck === 'function') onPluck();
    }, 320);
  };

  const snapBack = () => {
    dragProgressRef.current = 0;
    setDragProgress(0);
    if (flapRef.current) {
      gsap.to(flapRef.current, {
        rotateX: 0,
        y: 0,
        duration: 0.35,
        ease: 'back.out(1.5)',
      });
    }
    if (stringRef.current) {
      gsap.to(stringRef.current, {
        y: 0,
        duration: 0.35,
        ease: 'back.out(1.5)',
      });
    }
  };

  const handlePointerUp = (e) => {
    if (!dragStartRef.current) return;
    if (e.pointerId !== dragStartRef.current.pointerId) return;
    // Read REF (fresh) bukan state (stale closure).
    const currentProgress = dragProgressRef.current;
    dragStartRef.current = null;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    if (currentProgress >= DRAG_THRESHOLD) {
      finishOpen();
    } else {
      snapBack();
    }
  };

  // Fallback: reduced-motion atau no-drag accidental — tap-to-open
  const handleTapFallback = (e) => {
    if (!interactive) return;
    e.preventDefault();
    finishOpen();
  };

  // Polaroid develop reveal — triggered when pluckedCard set
  useEffect(() => {
    if (!pluckedCard) return undefined;
    if (prevCardIdRef.current !== pluckedCard.id) {
      playedRef.current = false;
    }
    if (playedRef.current) return undefined;
    if (!polaroidRef.current) return undefined;
    playedRef.current = true;
    prevCardIdRef.current = pluckedCard.id;

    const isLegenda = pluckedCard.tier === 'legenda';
    const reveal = TIER_DEVELOP[pluckedCard.tier] || TIER_DEVELOP.muda;
    const tilt = polaroidTiltRef.current;

    // Reduced-motion atau skipPack: instant polaroid visible, no animation.
    // Body + flap hidden permanent (pack udah dibuka di card 1 atau user
    // explicitly skip animations).
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
      // Kick halo (tier coloring)
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

    // Full polaroid develop animation
    gsap.set(polaroidRef.current, {
      opacity: 0,
      scale: 0.78,
      y: -60, // start inside envelope (above slot)
      rotate: tilt - 4,
      filter: 'blur(22px)',
    });

    const tl = gsap.timeline({ delay: reveal.preDelay + revealDelay });

    // Phase 1: slide out from envelope position
    tl.to(polaroidRef.current, {
      y: 0,
      scale: 1,
      opacity: 1,
      rotate: tilt,
      duration: reveal.slideOut,
      ease: 'power2.out',
    });

    // Phase 2: develop blur (the "polaroid developing" moment)
    tl.to(
      polaroidRef.current,
      {
        filter: 'blur(0px)',
        duration: reveal.develop,
        ease: 'power2.out',
      },
      reveal.slideOut * 0.4,
    );

    // Particle burst saat polaroid sharp
    tl.add(() => {
      setParticleTrigger((p) => p + 1);
    }, reveal.slideOut + reveal.develop * 0.6);

    // Halo glow fade in + pulse loop
    const haloConfig = TIER_HALO[pluckedCard.tier] || TIER_HALO.muda;
    if (haloRef.current && haloConfig.intensity > 0) {
      tl.to(
        haloRef.current,
        {
          opacity: haloConfig.intensity,
          duration: reveal.develop,
          ease: 'sine.out',
        },
        reveal.slideOut * 0.5,
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
      }, reveal.slideOut + reveal.develop);
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
    setOpeningFlap(false);
    setDragProgress(0);
    if (flapRef.current) gsap.set(flapRef.current, { clearProps: 'all' });
    if (stringRef.current) gsap.set(stringRef.current, { clearProps: 'all' });
    if (polaroidRef.current) {
      gsap.set(polaroidRef.current, {
        opacity: 0,
        scale: 0.78,
        y: -60,
        filter: 'blur(22px)',
      });
    }
    if (haloRef.current) gsap.set(haloRef.current, { opacity: 0 });
  }, [pluckedCard]);

  // Subtle wiggle animation on string saat idle pre-pluck — invite gesture.
  useEffect(() => {
    if (!interactive || prefersReducedMotion) return undefined;
    if (!stringRef.current) return undefined;
    const tween = gsap.to(stringRef.current, {
      rotate: 3,
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => tween.kill();
  }, [interactive, prefersReducedMotion]);

  if (!canPluck && !pluckedCard) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-xs mx-auto"
      style={{
        minHeight: '480px',
        perspective: '1200px',
      }}
    >
      {/* Halo glow — behind everything */}
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

      <div className="relative grid" style={{ minHeight: '480px' }}>
        {/* Envelope body — bottom half of master pack art, static */}
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

        {/* Polaroid card — emerges from envelope. position:relative
            wajib supaya caption absolute child anchor ke polaroid (bukan
            ancestor grid container). */}
        <div
          ref={polaroidRef}
          className="row-start-1 col-start-1 mx-auto self-center"
          style={{
            opacity: 0,
            width: '92%',
            padding: '12px 12px 36px 12px',
            background:
              'linear-gradient(180deg, #fefefe 0%, #fbf8f0 100%)',
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
              {/* Polaroid caption bawah — era label + tier badge. */}
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

        {/* Envelope flap — top half of master image, opens via rotateX */}
        <div
          ref={flapRef}
          className="row-start-1 col-start-1 pointer-events-none"
          style={{
            clipPath: 'inset(0 0 65% 0)',
            WebkitClipPath: 'inset(0 0 65% 0)',
            transformOrigin: 'center top',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          }}
          aria-hidden={!interactive}
        >
          <KartuBack tier="matang" />
          {/* Wax seal indicator — center of flap, only visible pre-pluck */}
          {!pluckedCard && !openingFlap && (
            <div
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: '60px',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 35% 30%, #c43838 0%, #8b1818 60%, #5a0e0e 100%)',
                boxShadow:
                  'inset -3px -3px 6px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)',
              }}
            >
              <span
                className="absolute inset-0 flex items-center justify-center text-[color:#fce8a0] text-xs font-bold"
                style={{ fontFamily: '"Fraunces Variable", serif' }}
              >
                H
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Particle burst on polaroid sharp */}
      {pluckedCard && (
        <ParticleBurst tier={pluckedCard.tier} trigger={particleTrigger} />
      )}

      {/* Pull-string — draggable red ribbon di sisi kanan flap.
          Visible only pre-pluck. Drag down untuk membuka.
          Past 50% threshold: warna brighten + glow (visual "ready" cue).
          touch-action: none supaya gesture gak ke-hijack browser scroll. */}
      {!pluckedCard && canPluck && !openingFlap && (() => {
        const pastThreshold = dragProgress >= DRAG_THRESHOLD;
        return (
          <div
            ref={stringRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute z-30 cursor-grab active:cursor-grabbing select-none"
            style={{
              top: '40px',
              right: '20px',
              width: '36px',
              height: '120px',
              touchAction: 'none',
              transformOrigin: 'top center',
              padding: '0 8px',
            }}
            role="button"
            tabIndex={0}
            aria-label="Tarik pita merah ke bawah untuk membuka amplop"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                finishOpen();
              }
            }}
          >
            {/* Ribbon visual — thin red strip + tassel ball */}
            <div
              className="mx-auto transition-all duration-200"
              style={{
                width: pastThreshold ? '5px' : '4px',
                height: '94px',
                background: pastThreshold
                  ? 'linear-gradient(180deg, #e85050 0%, #c43838 50%, #e85050 100%)'
                  : 'linear-gradient(180deg, #c43838 0%, #a02828 50%, #c43838 100%)',
                borderRadius: '2.5px',
                boxShadow: pastThreshold
                  ? '0 0 8px rgba(196, 56, 56, 0.5), 1px 0 2px rgba(0,0,0,0.2)'
                  : '1px 0 2px rgba(0,0,0,0.2)',
              }}
            />
            <div
              className="mx-auto -mt-1 transition-all duration-200"
              style={{
                width: pastThreshold ? '18px' : '15px',
                height: pastThreshold ? '18px' : '15px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 35% 30%, #e85050 0%, #8b1818 85%)',
                boxShadow: pastThreshold
                  ? '0 0 12px rgba(232, 80, 80, 0.6), inset -2px -2px 4px rgba(0,0,0,0.3)'
                  : 'inset -2px -2px 4px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </div>
        );
      })()}

      {/* Reduced-motion fallback OR keyboard tap target — large invisible
          tap area covering pack saat pre-pluck. Prefers-reduced-motion
          users tap to skip drag mechanic. */}
      {interactive && prefersReducedMotion && (
        <button
          type="button"
          onClick={handleTapFallback}
          className="absolute inset-0 z-20 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40"
          aria-label="Buka amplop hari ini"
        />
      )}

      {/* Hint text — kasih tau user untuk tarik string. Hilang saat drag
          mulai supaya gak kelihatan stale. Past threshold: ganti jadi
          "Lepaskan!" supaya user tau tinggal release. */}
      {interactive && !prefersReducedMotion && (
        <p
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 -bottom-6 text-[10px] uppercase tracking-[0.3em] pointer-events-none transition-colors duration-200"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            color:
              dragProgress >= DRAG_THRESHOLD
                ? 'var(--retro-burgundy)'
                : dragProgress > 0
                  ? 'rgba(124, 45, 18, 0.55)'
                  : 'rgba(124, 45, 18, 0.45)',
          }}
        >
          {dragProgress >= DRAG_THRESHOLD
            ? '✓ Lepaskan!'
            : dragProgress > 0
              ? `Tarik terus · ${Math.round(dragProgress * 100)}%`
              : '↓ Tarik pita merah'}
        </p>
      )}
    </div>
  );
};

export default KartuBrewek;
