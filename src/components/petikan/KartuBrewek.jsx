/**
 * KartuBrewek — pack-opening orchestrator. KartuBack rendered sebagai
 * "sealed pack" → user tap → pack robek horizontal (separuh atas
 * terbang ke atas + miring, separuh bawah turun + miring), kartu front
 * muncul dari belakang scale/fade. TCG Pocket-style unpack, bukan
 * sekedar flip.
 *
 * Layer stacking (grid row 1 col 1 — semua di cell yang sama):
 *   - Pack top half (clipPath inset top 50%) — pivot di split line
 *   - Pack bottom half (clipPath inset bottom 50%) — pivot di split line
 *   - KartuIngatan front (opacity 0 initial) — di belakang pack
 *
 * Phases:
 *   1. Anticipation (0-0.12s): both halves scale 1.0→1.05
 *   2. SFX trigger: page-turn sfx (legenda skip — chime di LegendaReveal)
 *   3. Top half flies up (-220y, rotate -10, fade) — 0.55s
 *   4. Bottom half drops down (+220y, rotate 10, fade) — 0.55s, +0.05s offset
 *   5. Card front emerges (opacity 0→1, scale 0.85→1.0) — 0.7s starts at 0.4s
 *
 * Legenda: delay 1.5s sebelum kick-off untuk LegendaReveal aurora
 * buildup window.
 */

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import KartuBack from './KartuBack';
import KartuIngatan from './KartuIngatan';
import HoloShimmer from './HoloShimmer';
import ParticleBurst from './ParticleBurst';
import { playPageTurnSfx } from './PluckTimeline';
import { readEnabled, readVolume } from '../../lib/townAudioBus';

// Per-tier halo glow palette — radiating dari belakang card saat emerge
const TIER_HALO = {
  muda: { color: 'rgba(232, 200, 156, 0.0)', intensity: 0 },
  matang: { color: 'rgba(218, 175, 92, 0.45)', intensity: 0.4 },
  langka: { color: 'rgba(255, 184, 77, 0.65)', intensity: 0.65 },
  legenda: { color: 'rgba(255, 217, 122, 0.85)', intensity: 0.85 },
};

// Per-tier reveal timing — HONEST scaling. Durasi naik monotonik dari
// muda → legenda; gak ada fake "almost-legenda" tease yang downgrade.
// Player belajar: "kalau reveal lama, pasti tier tinggi" — feel-it-coming
// reward, bukan ilusi.
//   preDelay         — jeda dari tap sampai pack mulai gerak
//   anticipation     — durasi pack scale-up sebelum rip
//   rip              — durasi top/bottom half melayang keluar
//   emerge           — durasi card front fade-in + scale
//   emergeStart      — kapan card mulai muncul (offset di timeline)
// Note: legenda.preDelay = 1.5s match dengan LegendaReveal aurora buildup
// window (1.5s) di LegendaReveal.jsx — jangan ubah salah satu doang.
const TIER_REVEAL = {
  muda: {
    preDelay: 0.15,
    anticipation: 0.12,
    rip: 0.5,
    emerge: 0.6,
    emergeStart: 0.36,
  },
  matang: {
    preDelay: 0.3,
    anticipation: 0.18,
    rip: 0.6,
    emerge: 0.7,
    emergeStart: 0.42,
  },
  langka: {
    preDelay: 0.55,
    anticipation: 0.22,
    rip: 0.75,
    emerge: 0.85,
    emergeStart: 0.55,
  },
  legenda: {
    preDelay: 1.5,
    anticipation: 0.3,
    rip: 0.9,
    emerge: 1.1,
    emergeStart: 0.7,
  },
};

const KartuBrewek = ({
  canPluck = false,
  pluckedCard = null,
  onPluck,
  revealDelay = 0,
}) => {
  const containerRef = useRef(null);
  const topHalfRef = useRef(null);
  const bottomHalfRef = useRef(null);
  const cardFrontRef = useRef(null);
  const haloRef = useRef(null);
  const breatheRef = useRef(null);
  const playedRef = useRef(false);
  // Bumped to trigger ParticleBurst re-animation
  const [particleTrigger, setParticleTrigger] = useState(0);

  // Breathing animation — invitation cue saat pack siap dibuka. Hanya
  // di pack yang tappable (punya onPluck handler). 2nd/3rd pack di
  // 3-pack triad gak breathing — cuma static pre-reveal.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    if (pluckedCard || !canPluck || typeof onPluck !== 'function') {
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
  }, [canPluck, pluckedCard, onPluck]);

  // Unpack timeline — kicks off saat pluckedCard set
  useEffect(() => {
    if (!pluckedCard) return undefined;
    if (playedRef.current) return undefined;
    if (!topHalfRef.current || !bottomHalfRef.current || !cardFrontRef.current) {
      return undefined;
    }
    playedRef.current = true;

    const isLegenda = pluckedCard.tier === 'legenda';
    const reveal = TIER_REVEAL[pluckedCard.tier] || TIER_REVEAL.muda;

    // Pre-set initial states
    gsap.set(cardFrontRef.current, { opacity: 0, scale: 0.85 });
    gsap.set([topHalfRef.current, bottomHalfRef.current], {
      y: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
    });

    // revealDelay = stagger offset di 3-pack triad (kartu 2 dan 3 nunggu
    // giliran). Ditambah ke tier-based preDelay, jadi legenda di slot 2
    // dapet aurora window penuh + stagger nya.
    const tl = gsap.timeline({ delay: reveal.preDelay + revealDelay });

    // Phase 1 — Anticipation (both halves slight scale up)
    tl.to(
      [topHalfRef.current, bottomHalfRef.current],
      {
        scale: 1.05,
        duration: reveal.anticipation,
        ease: 'sine.out',
      },
      0
    );

    // SFX trigger at unpack start (post-anticipation)
    tl.add(() => {
      if (isLegenda) return; // LegendaReveal owns chime
      if (!readEnabled()) return;
      const vol = readVolume();
      playPageTurnSfx(Math.max(0.3, vol * 1.6));
    }, reveal.anticipation);

    // Phase 2 — Top half flies up & fades
    tl.to(
      topHalfRef.current,
      {
        y: -220,
        rotate: -10,
        opacity: 0,
        scale: 0.92,
        duration: reveal.rip,
        ease: 'power2.in',
      },
      reveal.anticipation
    );

    // Phase 3 — Bottom half drops down & fades (small offset for organic feel)
    tl.to(
      bottomHalfRef.current,
      {
        y: 220,
        rotate: 10,
        opacity: 0,
        scale: 0.92,
        duration: reveal.rip,
        ease: 'power2.in',
      },
      reveal.anticipation + 0.05
    );

    // Phase 4 — Card front emerges from behind (starts during halves' exit)
    tl.to(
      cardFrontRef.current,
      {
        opacity: 1,
        scale: 1.0,
        duration: reveal.emerge,
        ease: 'power2.out',
      },
      reveal.emergeStart
    );

    // Phase 4b — Halo glow fades in (sync with card emerge)
    const haloConfig = TIER_HALO[pluckedCard.tier] || TIER_HALO.muda;
    if (haloRef.current && haloConfig.intensity > 0) {
      tl.to(
        haloRef.current,
        {
          opacity: haloConfig.intensity,
          duration: reveal.emerge * 1.15,
          ease: 'sine.out',
        },
        Math.max(0, reveal.emergeStart - 0.05)
      );
    }

    // Phase 4c — Particle burst at emerge moment
    tl.add(() => {
      setParticleTrigger((p) => p + 1);
    }, reveal.emergeStart + 0.02);

    return () => tl.kill();
  }, [pluckedCard, revealDelay]);

  // Reset state saat pluckedCard cleared (dev re-arm, midnight transition)
  useEffect(() => {
    if (pluckedCard) return;
    playedRef.current = false;
    if (topHalfRef.current) {
      gsap.set(topHalfRef.current, { clearProps: 'all' });
    }
    if (bottomHalfRef.current) {
      gsap.set(bottomHalfRef.current, { clearProps: 'all' });
    }
    if (cardFrontRef.current) {
      gsap.set(cardFrontRef.current, { opacity: 0, scale: 0.85 });
    }
    if (haloRef.current) {
      gsap.set(haloRef.current, { opacity: 0 });
    }
  }, [pluckedCard]);

  if (!canPluck && !pluckedCard) return null;

  // Tappable hanya kalau caller pass onPluck handler. Di 3-pack triad,
  // pack 2 dan 3 receive onPluck=undefined → visible tapi gak interactive.
  const tappable = canPluck && !pluckedCard && typeof onPluck === 'function';
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
      style={{ minHeight: '480px' }}
    >
      {/* Halo glow — fixed inset, behind everything via render order.
          Radial bloom color per-tier (muda=none, matang→legenda
          escalating warm-gold intensity). Fades in pas card emerge
          phase via GSAP, persist while card visible. */}
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
        {/* Pack top half — visible region 0-50%, pivot at split line */}
        <div
          ref={topHalfRef}
          className="row-start-1 col-start-1 pointer-events-none"
          style={{
            clipPath: 'inset(0 0 50% 0)',
            WebkitClipPath: 'inset(0 0 50% 0)',
            transformOrigin: 'center 50%',
          }}
          aria-hidden={!tappable}
        >
          <KartuBack tier="matang" />
        </div>
        {/* Pack bottom half — visible region 50-100%, pivot at split line */}
        <div
          ref={bottomHalfRef}
          className="row-start-1 col-start-1 pointer-events-none"
          style={{
            clipPath: 'inset(50% 0 0 0)',
            WebkitClipPath: 'inset(50% 0 0 0)',
            transformOrigin: 'center 50%',
          }}
          aria-hidden={!tappable}
        >
          <KartuBack tier="matang" />
        </div>
        {/* Card front — di belakang pack, opacity 0 initial.
            HoloShimmer wrap kasih TCG Pocket-style mouse-tilt + foil
            untuk langka+ tiers. Muda/matang render plain. */}
        <div
          ref={cardFrontRef}
          className="row-start-1 col-start-1"
          style={{ opacity: 0 }}
        >
          {pluckedCard && (
            <HoloShimmer tier={pluckedCard.tier}>
              <KartuIngatan card={pluckedCard} />
            </HoloShimmer>
          )}
        </div>
      </div>

      {/* Particle burst — sparkles fly outward saat card emerge.
          Per-tier count + palette. Triggered via particleTrigger bump
          di timeline phase 4c. */}
      {pluckedCard && (
        <ParticleBurst
          tier={pluckedCard.tier}
          trigger={particleTrigger}
        />
      )}

      {/* Click overlay — covers whole pack area pre-pluck untuk generous
          touch target (mobile-friendly, >44px) */}
      {tappable && (
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKey}
          className="absolute inset-0 z-20 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40"
          aria-label="Buka kartu Pohon Aprikot hari ini"
        />
      )}
    </div>
  );
};

export default KartuBrewek;
