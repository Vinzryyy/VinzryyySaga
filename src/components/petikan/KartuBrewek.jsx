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
  skipPack = false,
}) => {
  const containerRef = useRef(null);
  const topHalfRef = useRef(null);
  const bottomHalfRef = useRef(null);
  const cardFrontRef = useRef(null);
  const haloRef = useRef(null);
  const breatheRef = useRef(null);
  const playedRef = useRef(false);
  // Track previous card id supaya bisa detect kartu baru (sequential
  // reveal di triad) dan re-trigger animation tanpa unmount/remount.
  const prevCardIdRef = useRef(null);
  // Tear-seam flash — gold gradient strip yang muncul di garis split saat
  // pack mau robek. Cue visual "ada cahaya keluar dari pack".
  const tearFlashRef = useRef(null);
  // Light sweep — diagonal gradient yang nyapu kartu sekali setelah emerge.
  // Bikin kesan spotlight pass-over, TCG holographic finish vibe.
  const lightSweepRef = useRef(null);
  // Halo pulse loop ref — buat kill saat unmount / card swap.
  const haloPulseRef = useRef(null);
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

  // Unpack timeline — kicks off saat pluckedCard set. Re-runs saat
  // card.id berubah (sequential reveal di triad: card 1 → card 2 → card 3).
  // playedRef di-reset di reset effect (pluckedCard null) ATAU di awal
  // sini kalau card id berubah dari prev.
  useEffect(() => {
    if (!pluckedCard) return undefined;
    // Card baru? Reset gating + visuals supaya animation re-trigger.
    if (prevCardIdRef.current !== pluckedCard.id) {
      playedRef.current = false;
    }
    if (playedRef.current) return undefined;
    if (!topHalfRef.current || !bottomHalfRef.current || !cardFrontRef.current) {
      return undefined;
    }
    playedRef.current = true;
    prevCardIdRef.current = pluckedCard.id;

    const isLegenda = pluckedCard.tier === 'legenda';
    const reveal = TIER_REVEAL[pluckedCard.tier] || TIER_REVEAL.muda;

    // Pre-set initial states. Kartu emerge dari sedikit bawah + tilt
    // mundur untuk kesan "diangkat dari dalam pack" — bukan cuma fade.
    // skipPack mode: pack halves di-hide dari awal (kartu 2 & 3 di
    // sequential triad — pack udah robek di kartu 1).
    gsap.set(cardFrontRef.current, {
      opacity: 0,
      scale: 0.88,
      y: 26,
      rotateX: -8,
      filter: 'blur(6px)',
      transformPerspective: 1000,
    });
    if (skipPack) {
      gsap.set([topHalfRef.current, bottomHalfRef.current], { opacity: 0 });
    } else {
      gsap.set([topHalfRef.current, bottomHalfRef.current], {
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
      });
    }
    // Reset tear-flash + light-sweep ke initial hidden state.
    if (tearFlashRef.current) {
      gsap.set(tearFlashRef.current, { opacity: 0, scaleX: 0.3 });
    }
    if (lightSweepRef.current) {
      gsap.set(lightSweepRef.current, { opacity: 0, x: '-110%', skewX: -18 });
    }
    // Kill any previous halo pulse loop (card swap edge case).
    if (haloPulseRef.current) {
      haloPulseRef.current.kill();
      haloPulseRef.current = null;
    }

    // revealDelay = manual offset (mis. stagger). Ditambah ke tier-based
    // preDelay, jadi legenda dapet aurora window penuh + stagger nya.
    const tl = gsap.timeline({ delay: reveal.preDelay + revealDelay });

    if (!skipPack) {
      // Phase 1 — Anticipation (pack "winds back" — scale + slight
      // tilt + lift). Pakai back.out untuk overshoot natural.
      tl.to(
        [topHalfRef.current, bottomHalfRef.current],
        {
          scale: 1.06,
          y: -3,
          rotate: -0.5,
          duration: reveal.anticipation,
          ease: 'back.out(1.6)',
        },
        0
      );

      // Phase 1b — Tear-seam flash builds saat pack mau robek. Stretch
      // horizontal dari 0.3 → 1.0, opacity 0 → 0.85, then fade out saat
      // halves mulai exit (overlap dengan rip start).
      if (tearFlashRef.current) {
        tl.to(
          tearFlashRef.current,
          {
            opacity: 0.85,
            scaleX: 1,
            duration: reveal.anticipation * 0.9,
            ease: 'power2.out',
          },
          reveal.anticipation * 0.1
        );
        tl.to(
          tearFlashRef.current,
          {
            opacity: 0,
            scaleX: 1.4,
            duration: reveal.rip * 0.5,
            ease: 'power3.out',
          },
          reveal.anticipation + reveal.rip * 0.1
        );
      }

      // SFX trigger at unpack start (post-anticipation)
      tl.add(() => {
        if (isLegenda) return; // LegendaReveal owns chime
        if (!readEnabled()) return;
        const vol = readVolume();
        playPageTurnSfx(Math.max(0.3, vol * 1.6));
      }, reveal.anticipation);

      // Phase 2 — Top half flies up & fades. Power3 lebih punchy dari
      // power2, gerakan terasa "dilempar" bukan "dilepas perlahan".
      tl.to(
        topHalfRef.current,
        {
          y: -260,
          rotate: -14,
          opacity: 0,
          scale: 0.88,
          filter: 'blur(3px)',
          duration: reveal.rip,
          ease: 'power3.in',
        },
        reveal.anticipation
      );

      // Phase 3 — Bottom half drops down & fades (small offset for organic feel)
      tl.to(
        bottomHalfRef.current,
        {
          y: 260,
          rotate: 14,
          opacity: 0,
          scale: 0.88,
          filter: 'blur(3px)',
          duration: reveal.rip,
          ease: 'power3.in',
        },
        reveal.anticipation + 0.06
      );
    }

    // Phase 4 — Card front emerges. skipPack: start immediately (no rip
    // window to overlap with). Normal: start saat halves keluar.
    // Multi-prop animate: lift up (y), zoom in (scale), un-tilt (rotateX),
    // un-blur (filter). expo.out kasih kurva luxurious — initial cepat,
    // settle smooth ke posisi final.
    const cardEmergeAt = skipPack ? 0 : reveal.emergeStart;
    tl.to(
      cardFrontRef.current,
      {
        opacity: 1,
        scale: 1.0,
        y: 0,
        rotateX: 0,
        filter: 'blur(0px)',
        duration: reveal.emerge,
        ease: 'expo.out',
      },
      cardEmergeAt
    );

    // Phase 4d — Settle micro-bounce: tiny rotation back-and-forth
    // setelah main emerge selesai. Elastic.out (1, 0.4) bikin organic
    // life — kartu "settling into place" instead of statis langsung.
    tl.to(
      cardFrontRef.current,
      {
        rotate: 0.6,
        duration: 0.18,
        ease: 'sine.out',
      },
      cardEmergeAt + reveal.emerge * 0.85
    );
    tl.to(
      cardFrontRef.current,
      {
        rotate: 0,
        duration: 0.55,
        ease: 'elastic.out(1, 0.4)',
      },
      cardEmergeAt + reveal.emerge * 0.85 + 0.18
    );

    // Phase 4e — Light sweep — diagonal gradient nyapu dari kiri ke kanan
    // setelah emerge. Sekali jalan, ~0.85s. Bikin kesan "spotlight pass"
    // di card surface. Per-tier opacity (langka+ lebih intense).
    if (lightSweepRef.current) {
      const sweepOpacity = isLegenda ? 0.7 : pluckedCard.tier === 'langka' ? 0.55 : pluckedCard.tier === 'matang' ? 0.35 : 0.22;
      tl.to(
        lightSweepRef.current,
        {
          opacity: sweepOpacity,
          duration: 0.12,
          ease: 'sine.out',
        },
        cardEmergeAt + reveal.emerge * 0.7
      );
      tl.to(
        lightSweepRef.current,
        {
          x: '110%',
          duration: 0.85,
          ease: 'power2.inOut',
        },
        cardEmergeAt + reveal.emerge * 0.75
      );
      tl.to(
        lightSweepRef.current,
        {
          opacity: 0,
          duration: 0.25,
          ease: 'sine.in',
        },
        cardEmergeAt + reveal.emerge * 0.75 + 0.6
      );
    }

    // Phase 4b — Halo glow fades in (sync with card emerge). Setelah
    // mencapai full intensity, mulai loop pulse breathing supaya halo
    // gak stagnan — kesan "card alive, glowing softly".
    const haloConfig = TIER_HALO[pluckedCard.tier] || TIER_HALO.muda;
    if (haloRef.current && haloConfig.intensity > 0) {
      tl.to(
        haloRef.current,
        {
          opacity: haloConfig.intensity,
          duration: reveal.emerge * 1.15,
          ease: 'sine.out',
        },
        Math.max(0, cardEmergeAt - 0.05)
      );
      // Schedule pulse loop kick-off setelah initial fade-in selesai.
      tl.add(() => {
        if (!haloRef.current) return;
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
      }, cardEmergeAt + reveal.emerge * 1.15);
    }

    // Phase 4c — Particle burst at emerge moment
    tl.add(() => {
      setParticleTrigger((p) => p + 1);
    }, cardEmergeAt + 0.02);

    return () => {
      tl.kill();
      if (haloPulseRef.current) {
        haloPulseRef.current.kill();
        haloPulseRef.current = null;
      }
    };
  }, [pluckedCard, revealDelay, skipPack]);

  // Reset state saat pluckedCard cleared (sequential triad transition,
  // dev re-arm, midnight). Kalau ada kartu yang lagi visible, animate
  // EXIT dulu (lift up + fade + blur) baru clear — supaya transisi
  // antar kartu di triad terasa intentional, bukan cut hard.
  useEffect(() => {
    if (pluckedCard) return;
    const hadCard = prevCardIdRef.current !== null;
    // Kill halo pulse — gak ada lagi yang harus glow.
    if (haloPulseRef.current) {
      haloPulseRef.current.kill();
      haloPulseRef.current = null;
    }
    const clearAll = () => {
      playedRef.current = false;
      prevCardIdRef.current = null;
      if (topHalfRef.current) gsap.set(topHalfRef.current, { clearProps: 'all' });
      if (bottomHalfRef.current) gsap.set(bottomHalfRef.current, { clearProps: 'all' });
      if (cardFrontRef.current) {
        gsap.set(cardFrontRef.current, {
          opacity: 0,
          scale: 0.88,
          y: 26,
          rotateX: -8,
          filter: 'blur(6px)',
          rotate: 0,
        });
      }
      if (haloRef.current) gsap.set(haloRef.current, { opacity: 0 });
      if (lightSweepRef.current) gsap.set(lightSweepRef.current, { opacity: 0, x: '-110%', skewX: -18 });
      if (tearFlashRef.current) gsap.set(tearFlashRef.current, { opacity: 0, scaleX: 0.3 });
    };
    if (hadCard && cardFrontRef.current) {
      // Exit animation — kartu lift up sedikit + scale down + fade +
      // blur out. Tier-agnostic (semua kartu pakai same exit feel).
      // Halo juga fade simultaneously.
      const exitTl = gsap.timeline({ onComplete: clearAll });
      exitTl.to(
        cardFrontRef.current,
        {
          opacity: 0,
          scale: 0.94,
          y: -18,
          filter: 'blur(5px)',
          duration: 0.4,
          ease: 'power2.in',
        },
        0
      );
      if (haloRef.current) {
        exitTl.to(haloRef.current, { opacity: 0, duration: 0.35, ease: 'sine.in' }, 0);
      }
      return () => exitTl.kill();
    }
    clearAll();
    return undefined;
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
        {/* Tear-seam flash — horizontal gold streak di split line.
            Muncul saat pack mau robek, cue cahaya keluar dari dalam.
            Cuma render kalau pluckedCard ada (skipPack pun gak render
            karena pack udah robek sebelumnya). */}
        {pluckedCard && !skipPack && (
          <div
            ref={tearFlashRef}
            aria-hidden="true"
            className="row-start-1 col-start-1 pointer-events-none flex items-center justify-center"
            style={{ opacity: 0 }}
          >
            <div
              style={{
                width: '100%',
                height: '14px',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255, 230, 160, 0.7) 25%, rgba(255, 255, 240, 0.95) 50%, rgba(255, 230, 160, 0.7) 75%, transparent 100%)',
                filter: 'blur(6px)',
                transformOrigin: 'center',
              }}
            />
          </div>
        )}
        {/* Card front — di belakang pack, opacity 0 initial.
            HoloShimmer wrap kasih TCG Pocket-style mouse-tilt + foil
            untuk langka+ tiers. Muda/matang render plain.
            Light-sweep overlay nyapu kartu sekali setelah emerge —
            kesan spotlight pass yang nambah elegance. */}
        <div
          ref={cardFrontRef}
          className="row-start-1 col-start-1 relative"
          style={{ opacity: 0, overflow: 'hidden', borderRadius: '1rem' }}
        >
          {pluckedCard && (
            <HoloShimmer tier={pluckedCard.tier}>
              <KartuIngatan card={pluckedCard} />
            </HoloShimmer>
          )}
          {/* Light sweep — diagonal gradient overlay yang nyapu kartu
              sekali post-emerge. Positioned absolute, x animated via GSAP. */}
          {pluckedCard && (
            <div
              ref={lightSweepRef}
              aria-hidden="true"
              className="absolute inset-y-0 pointer-events-none"
              style={{
                opacity: 0,
                width: '60%',
                left: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255, 240, 200, 0.4) 35%, rgba(255, 255, 240, 0.7) 50%, rgba(255, 240, 200, 0.4) 65%, transparent 100%)',
                mixBlendMode: 'overlay',
                filter: 'blur(2px)',
              }}
            />
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
