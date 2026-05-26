/**
 * KartuBrewek — primary interaction untuk Petikan tanpa tree.
 * KartuBack rendered sebagai "sealed pack" yang user tap untuk buka.
 * Setelah tap → pickCard di parent → card prop set → flip rotateY 0→180
 * di-place tanpa drop-in. Lebih direct/TCG Pocket-ish vs pre-tree pattern.
 *
 * 2 phase utama:
 *   1. Closed (canPluck && !pluckedCard) — KartuBack visible, breathe
 *      animation invitation cue, click/keyboard activated
 *   2. Opening (pluckedCard set) — flip GSAP timeline rotateY 0→180.
 *      Legenda delay 1.5s biar LegendaReveal aurora buildup finish.
 *
 * KartuBack di-render dengan tier "matang" sebagai default sealed-pack
 * look — tier specific dressing cuma di KartuIngatan (front). Bikin
 * "what's inside" surprise tetap intact.
 */

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import KartuBack from './KartuBack';
import KartuIngatan from './KartuIngatan';
import { playPageTurnSfx } from './PluckTimeline';
import { readEnabled, readVolume } from '../../lib/townAudioBus';

const KartuBrewek = ({ canPluck = false, pluckedCard = null, onPluck }) => {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const breatheRef = useRef(null);
  const flipPlayedRef = useRef(false);

  // Breathing animation — invitation cue saat pack siap dibuka
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    // Stop breathing kalau card udah ke-pluck or not pluckable
    if (pluckedCard || !canPluck) {
      if (breatheRef.current) {
        breatheRef.current.kill();
        breatheRef.current = null;
      }
      return undefined;
    }
    breatheRef.current = gsap.to(el, {
      scale: 1.03,
      duration: 1.8,
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
  }, [canPluck, pluckedCard]);

  // Flip timeline — kicks off saat pluckedCard set
  useEffect(() => {
    const inner = innerRef.current;
    if (!pluckedCard || !inner) return undefined;
    if (flipPlayedRef.current) return undefined;
    flipPlayedRef.current = true;

    const isLegenda = pluckedCard.tier === 'legenda';
    // Legenda delay 1.5s untuk aurora buildup di LegendaReveal.
    // Non-legenda dapat micro-delay 0.3s biar tap-to-flip ada anticipation.
    const delay = isLegenda ? 1.5 : 0.3;

    const tl = gsap.timeline({ delay });

    tl.add(() => {
      // Legenda chime owned by LegendaReveal — skip page-turn untuk
      // avoid audio overlap. Non-legenda → page-turn sfx.
      if (isLegenda) return;
      if (!readEnabled()) return;
      const vol = readVolume();
      playPageTurnSfx(Math.max(0.3, vol * 1.6));
    });

    tl.to(inner, {
      rotateY: 180,
      duration: 0.7,
      ease: 'power3.inOut',
    });

    return () => tl.kill();
  }, [pluckedCard]);

  // Reset flip flag kalau pluckedCard cleared (e.g., new day)
  useEffect(() => {
    if (!pluckedCard) {
      flipPlayedRef.current = false;
      if (innerRef.current) {
        gsap.set(innerRef.current, { rotateY: 0 });
      }
    }
  }, [pluckedCard]);

  if (!canPluck && !pluckedCard) return null;

  const tappable = canPluck && !pluckedCard;
  const handleClick = tappable && typeof onPluck === 'function' ? onPluck : undefined;
  const handleKey = (e) => {
    if (!tappable || typeof onPluck !== 'function') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPluck();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-xs mx-auto"
      style={{ perspective: '1500px' }}
    >
      <div
        ref={innerRef}
        className="relative grid"
        style={{
          transformStyle: 'preserve-3d',
          minHeight: '480px',
        }}
      >
        {/* Back — facing user initially, becomes click target saat tappable */}
        <div
          className={`row-start-1 col-start-1 ${tappable ? 'cursor-pointer' : ''}`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          onClick={handleClick}
          onKeyDown={handleKey}
          tabIndex={tappable ? 0 : -1}
          role={tappable ? 'button' : 'img'}
          aria-label={
            tappable ? 'Buka kartu Pohon Aprikot hari ini' : 'Kartu Pohon Aprikot'
          }
        >
          <KartuBack tier="matang" />
        </div>
        {/* Front — pre-rotated 180, revealed after flip */}
        <div
          className="row-start-1 col-start-1"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {pluckedCard && <KartuIngatan card={pluckedCard} />}
        </div>
      </div>
    </div>
  );
};

export default KartuBrewek;
