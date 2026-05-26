/**
 * KartuFlip — orchestrator komponen untuk reveal experience. Combines
 * KartuBack + KartuIngatan in CSS 3D preserve-3d layout, drives
 * GSAP timeline (entry drop + settle + flip + glow), plays page-turn
 * sfx pada flip moment.
 *
 * Layout: both kartu di-grid-stack di same cell (row 1 col 1) supaya
 * height = max content (KartuIngatan biasanya yang dominan). KartuBack
 * h-full stretches ke height itu.
 *
 * Initial state (set via gsap.set di timeline factory):
 *   container: opacity 0, y -60, rotateZ -3
 *   inner    : rotateY 0   (back facing user)
 *   front    : pre-rotated rotateY 180 (will face user setelah flip)
 *
 * Timeline (~1.5-1.7s total):
 *   0.0-0.6  entry drop from above
 *   0.6-0.9  settle bounce + anticipation pause
 *   0.9-1.5  flip rotateY 0 → 180 + page-turn sfx at start
 *   1.5-2.5  glow pulse settle
 *
 * Re-mount on new card.id triggers fresh timeline.
 */

import React, { useEffect, useRef } from 'react';
import KartuBack from './KartuBack';
import KartuIngatan from './KartuIngatan';
import { createPluckTimeline, playPageTurnSfx } from './PluckTimeline';
import { readEnabled, readVolume } from '../../lib/townAudioBus';

const KartuFlip = ({ card, onComplete, delay = 0 }) => {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const glowRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref fresh tanpa re-running effect.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Card identity drives re-run — new pluck = fresh animation.
  const cardId = card?.id || null;
  const isLegenda = card?.tier === 'legenda';

  useEffect(() => {
    if (!cardId) return undefined;
    const tl = createPluckTimeline({
      containerRef,
      innerRef,
      glowRef,
      delay,
      onFlipStart: () => {
        // Legenda tier dapat chime cinematic via LegendaReveal — skip
        // page-turn biar gak overlap audio.
        if (isLegenda) return;
        if (!readEnabled()) return;
        const vol = readVolume();
        // Scale sfx ke volume bus, dgn floor untuk biar tetep audible
        // kalau slider rendah tapi audio enabled.
        const mult = Math.max(0.3, vol * 1.6);
        playPageTurnSfx(mult);
      },
      onComplete: () => {
        if (typeof onCompleteRef.current === 'function') {
          onCompleteRef.current();
        }
      },
    });
    return () => tl.kill();
  }, [cardId, delay, isLegenda]);

  if (!card) return null;

  return (
    <div
      className="relative w-full max-w-xs mx-auto"
      style={{ perspective: '1500px' }}
    >
      <div ref={containerRef} className="relative">
        {/* Glow overlay — z-behind, pulses after flip complete */}
        <div
          ref={glowRef}
          className="absolute inset-0 pointer-events-none rounded-2xl"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,217,122,0.45) 0%, transparent 70%)',
            opacity: 0,
            filter: 'blur(24px)',
            transform: 'scale(1.1)',
          }}
        />

        <div
          ref={innerRef}
          className="relative grid"
          style={{
            transformStyle: 'preserve-3d',
            minHeight: '480px',
          }}
        >
          {/* Back — default facing user (rotateY 0) */}
          <div
            className="row-start-1 col-start-1"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <KartuBack tier={card.tier} />
          </div>
          {/* Front — pre-rotated 180; faces user after innerRef flips */}
          <div
            className="row-start-1 col-start-1"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <KartuIngatan card={card} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KartuFlip;
