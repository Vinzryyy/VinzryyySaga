/**
 * BirthdayCake — interactive 2-tier cake that progresses through a
 * birthday ritual:
 *
 *   lit ──tap→ blown ──tap→ eating(1) ──tap→ ... ──tap→ eaten ──tap→ lit
 *
 * Each tap advances the state. Lit/blown handle the candle (flame
 * flicker → extinguish + smoke). Once blown, subsequent taps "bite"
 * the cake — a SVG clipPath shrinks the cake from right to left,
 * 5 bites total. After the last bite the cake renders an empty plate
 * with scattered crumbs and a "Habis!" message. Tap once more to reset.
 *
 * Design notes:
 *  - Pure SVG + CSS, no deps, scales cleanly on retina.
 *  - clipPath is animated via a width transition for a satisfying
 *    "chomp" feel on each bite.
 *  - Plate base is rendered OUTSIDE the clip so the empty plate stays
 *    visible after the cake is fully eaten.
 *  - Auto-relight after 8s if the user blew and walked away (no
 *    auto-progress past 'blown' though — eating is opt-in per tap).
 *  - Auto-reset after 10s in the 'eaten' state so the cake reappears
 *    for the next visitor.
 *  - Honors prefers-reduced-motion (no flicker, instant state swap,
 *    no transition on the bite clip).
 */

import React, { useEffect, useId, useMemo, useState } from 'react';

const TOTAL_BITES = 5;
const SVG_W = 240;

const BirthdayCake = ({ name = 'Eli' }) => {
  const [state, setState] = useState('lit'); // 'lit' | 'blown' | 'eating' | 'eaten'
  const [bites, setBites] = useState(0);
  const [smokeKey, setSmokeKey] = useState(0);
  const clipId = useId();

  const handleTap = () => {
    if (state === 'lit') {
      setState('blown');
      setSmokeKey((k) => k + 1);
      return;
    }
    if (state === 'blown') {
      setState('eating');
      setBites(1);
      return;
    }
    if (state === 'eating') {
      setBites((prev) => {
        const next = prev + 1;
        if (next >= TOTAL_BITES) {
          setState('eaten');
        }
        return next;
      });
      return;
    }
    // 'eaten' → reset
    setBites(0);
    setState('lit');
  };

  // Auto-relight after 8s if the user blew but didn't proceed.
  useEffect(() => {
    if (state !== 'blown') return undefined;
    const t = setTimeout(() => setState('lit'), 8000);
    return () => clearTimeout(t);
  }, [state, smokeKey]);

  // Auto-reset after 10s in 'eaten' state.
  useEffect(() => {
    if (state !== 'eaten') return undefined;
    const t = setTimeout(() => {
      setBites(0);
      setState('lit');
    }, 10000);
    return () => clearTimeout(t);
  }, [state]);

  // Width of the visible cake region. Shrinks linearly from full → 0
  // as bites accumulate. CSS transition smooths the change.
  const clipWidth = useMemo(() => {
    if (state === 'lit' || state === 'blown') return SVG_W;
    if (state === 'eating') {
      return Math.max(0, SVG_W * (1 - bites / TOTAL_BITES));
    }
    return 0; // 'eaten'
  }, [state, bites]);

  const ariaLabel = useMemo(() => {
    if (state === 'lit') return 'Tiup lilin';
    if (state === 'blown') return 'Gigit kuenya';
    if (state === 'eating') return `Gigit lagi (${TOTAL_BITES - bites} tersisa)`;
    return 'Reset kue';
  }, [state, bites]);

  const hint = useMemo(() => {
    if (state === 'lit') return { icon: 'ri-windy-line', text: 'Tap untuk tiup lilinnya' };
    if (state === 'blown') return { icon: 'ri-restaurant-line', text: 'Tap untuk gigit kuenya' };
    if (state === 'eating')
      return {
        icon: 'ri-restaurant-line',
        text: `Lagi... ${TOTAL_BITES - bites} gigitan tersisa`,
      };
    return { icon: 'ri-refresh-line', text: 'Habis! Tap untuk reset' };
  }, [state, bites]);

  return (
    <div className="bd-cake-wrap">
      <button
        type="button"
        onClick={handleTap}
        aria-label={ariaLabel}
        aria-pressed={state !== 'lit'}
        className="bd-cake-button"
      >
        <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden="true">
          <defs>
            <clipPath id={`cake-clip-${clipId}`}>
              <rect
                x="0"
                y="0"
                width={clipWidth}
                height="300"
                className="bd-cake-clip-rect"
              />
            </clipPath>
          </defs>

          {/* Plate — always visible (outside clip) so the empty plate
              still shows after the cake is fully eaten. */}
          <ellipse cx="120" cy="290" rx="115" ry="6" fill="rgba(0,0,0,0.15)" />
          <ellipse cx="120" cy="285" rx="105" ry="9" fill="var(--retro-brown-dark)" />

          {/* Crumbs in 'eaten' state — also outside clip */}
          {state === 'eaten' && (
            <g className="bd-cake-crumbs">
              <circle cx="55" cy="278" r="2.5" fill="var(--retro-cream)" />
              <circle cx="68" cy="282" r="1.8" fill="var(--retro-burgundy)" />
              <circle cx="82" cy="276" r="2"   fill="var(--retro-sepia)" />
              <circle cx="100" cy="280" r="1.5" fill="var(--retro-cream-dark)" />
              <circle cx="118" cy="277" r="2.3" fill="var(--retro-cream)" />
              <circle cx="138" cy="282" r="1.7" fill="var(--retro-burgundy)" />
              <circle cx="156" cy="276" r="2"   fill="var(--retro-sepia)" />
              <circle cx="175" cy="280" r="1.6" fill="var(--retro-cream)" />
              <rect x="65" y="269" width="3" height="2" fill="var(--retro-gold)" rx="0.5" />
              <rect x="125" y="271" width="3" height="2" fill="var(--retro-gold)" rx="0.5" />
              <rect x="180" y="270" width="3" height="2" fill="var(--retro-gold)" rx="0.5" />
            </g>
          )}

          {/* Everything that gets eaten lives inside the clip group. */}
          <g clipPath={`url(#cake-clip-${clipId})`}>
            {/* Bottom tier */}
            <rect x="15" y="215" width="210" height="70" fill="var(--retro-cream)" />
            <ellipse cx="120" cy="215" rx="105" ry="11" fill="var(--retro-cream-dark)" />
            {/* Burgundy drip icing on bottom tier */}
            <path
              d="M15 215
                 Q22 232 29 217 Q36 230 43 218 Q50 234 57 219
                 Q64 232 71 217 Q78 230 85 218 Q92 234 99 219
                 Q106 232 113 217 Q120 230 127 218 Q134 234 141 219
                 Q148 232 155 217 Q162 230 169 218 Q176 234 183 219
                 Q190 232 197 217 Q204 230 211 218 Q218 234 225 219
                 L225 215 L15 215 Z"
              fill="var(--retro-burgundy)"
            />
            {/* Gold sprinkles */}
            <g fill="var(--retro-gold)">
              <rect x="35"  y="248" width="3" height="6" rx="1" transform="rotate(20 36 251)" />
              <rect x="58"  y="262" width="3" height="6" rx="1" transform="rotate(-30 59 265)" />
              <rect x="82"  y="245" width="3" height="6" rx="1" transform="rotate(45 83 248)" />
              <rect x="108" y="265" width="3" height="6" rx="1" transform="rotate(-15 109 268)" />
              <rect x="135" y="250" width="3" height="6" rx="1" transform="rotate(60 136 253)" />
              <rect x="160" y="263" width="3" height="6" rx="1" transform="rotate(-40 161 266)" />
              <rect x="185" y="248" width="3" height="6" rx="1" transform="rotate(25 186 251)" />
              <rect x="205" y="265" width="3" height="6" rx="1" transform="rotate(-25 206 268)" />
            </g>

            {/* Top tier — sepia body so it contrasts against the burgundy
                celebration plate (don't use burgundy here, it'd blend in) */}
            <ellipse cx="120" cy="210" rx="75" ry="6" fill="var(--retro-brown)" />
            <rect x="45" y="150" width="150" height="62" fill="var(--retro-sepia)" />
            <ellipse cx="120" cy="150" rx="75" ry="9" fill="var(--retro-gold-light)" />
            {/* Cream drip icing on top tier */}
            <path
              d="M45 150
                 Q52 167 59 152 Q66 165 73 153 Q80 169 87 154
                 Q94 167 101 152 Q108 165 115 153 Q122 169 129 154
                 Q136 167 143 152 Q150 165 157 153 Q164 169 171 154
                 Q178 167 185 152 Q192 165 195 156
                 L195 150 L45 150 Z"
              fill="var(--retro-cream)"
            />
            {/* Apricot blossoms on top tier (brand motif) */}
            <g fill="var(--retro-burgundy)" opacity="0.85">
              <circle cx="70" cy="180" r="3.5" />
              <circle cx="73" cy="175" r="3" />
              <circle cx="73" cy="185" r="3" />
              <circle cx="76" cy="178" r="2" fill="var(--retro-gold)" />
            </g>
            <g fill="var(--retro-burgundy)" opacity="0.85">
              <circle cx="170" cy="185" r="3.5" />
              <circle cx="173" cy="180" r="3" />
              <circle cx="173" cy="190" r="3" />
              <circle cx="176" cy="183" r="2" fill="var(--retro-gold)" />
            </g>

            {/* Candle holder ring */}
            <ellipse cx="120" cy="148" rx="9" ry="2.5" fill="var(--retro-gold)" />

            {/* Candle */}
            <rect x="113" y="80" width="14" height="68" fill="var(--retro-cream-dark)" />
            <rect x="113" y="92"  width="14" height="3" fill="var(--retro-burgundy)" opacity="0.7" />
            <rect x="113" y="118" width="14" height="3" fill="var(--retro-burgundy)" opacity="0.7" />
            <rect x="113" y="80"  width="14" height="3" fill="var(--retro-gold)" />
            {/* Wick */}
            <rect x="119" y="64" width="2" height="18" fill="var(--retro-brown-dark)" />

            {/* Flame — only render when lit */}
            {state === 'lit' && (
              <g className="bd-cake-flame" style={{ transformOrigin: '120px 78px' }}>
                <ellipse cx="120" cy="50" rx="9" ry="18" fill="#FF7A3D" opacity="0.92" />
                <ellipse cx="120" cy="54" rx="6" ry="14" fill="#FFC76B" />
                <ellipse cx="120" cy="60" rx="3" ry="8" fill="#FFF6D9" opacity="0.95" />
              </g>
            )}

            {/* Smoke wisps — only render right after blowing */}
            {state === 'blown' && (
              <g key={`smoke-${smokeKey}`} className="bd-cake-smoke">
                <circle cx="118" cy="60" r="4" fill="rgba(180,180,180,0.55)" />
                <circle cx="124" cy="48" r="5" fill="rgba(180,180,180,0.45)" />
                <circle cx="116" cy="34" r="6" fill="rgba(180,180,180,0.35)" />
              </g>
            )}
          </g>
        </svg>

        <span className="bd-cake-hint">
          <i className={hint.icon} />
          <span>{hint.text}</span>
        </span>
      </button>

      {state === 'blown' && (
        <p key={`wish-${smokeKey}`} className="bd-cake-wish">
          ✨ Make a wish, {name}!
        </p>
      )}
      {state === 'eaten' && (
        <p className="bd-cake-wish">🎉 Habis! Wish-nya keturutan, {name}.</p>
      )}

      <style>{`
        .bd-cake-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .bd-cake-button {
          background: transparent;
          border: 0;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0;
          width: clamp(220px, 50vw, 340px);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .bd-cake-button > svg {
          filter:
            drop-shadow(0 8px 18px rgba(0, 0, 0, 0.35))
            drop-shadow(0 0 24px rgba(229, 197, 117, 0.18));
        }
        .bd-cake-button:hover { transform: translateY(-4px) scale(1.02); }
        .bd-cake-button:active { transform: translateY(-2px) scale(0.99); }
        .bd-cake-button:focus-visible {
          outline: 2px solid var(--retro-gold-light);
          outline-offset: 8px;
          border-radius: 1.5rem;
        }

        /* Bite chomp — clip rect width transitions for a satisfying snap */
        .bd-cake-clip-rect {
          transition: width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .bd-cake-flame {
          animation: bd-cake-flicker 0.7s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 10px rgba(255, 175, 80, 0.55));
        }
        @keyframes bd-cake-flicker {
          0%   { transform: scaleY(1)    scaleX(1)    rotate(-3deg); opacity: 1;   }
          50%  { transform: scaleY(1.1)  scaleX(0.92) rotate(2deg);  opacity: 0.9; }
          100% { transform: scaleY(0.94) scaleX(1.06) rotate(-1deg); opacity: 1;   }
        }

        .bd-cake-smoke > circle {
          opacity: 0;
          animation: bd-cake-smoke-rise 1.6s ease-out forwards;
        }
        .bd-cake-smoke > circle:nth-child(1) { animation-delay: 0s;    }
        .bd-cake-smoke > circle:nth-child(2) { animation-delay: 0.15s; }
        .bd-cake-smoke > circle:nth-child(3) { animation-delay: 0.3s;  }
        @keyframes bd-cake-smoke-rise {
          0%   { opacity: 0;   transform: translateY(0); }
          20%  { opacity: 0.7; }
          100% { opacity: 0;   transform: translateY(-26px); }
        }

        .bd-cake-crumbs {
          animation: bd-cake-crumbs-in 0.5s ease-out both;
        }
        @keyframes bd-cake-crumbs-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .bd-cake-hint {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: "Plus Jakarta Sans Variable", system-ui, sans-serif;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.32em;
          color: var(--retro-cream);
          opacity: 0.85;
        }
        .bd-cake-hint i { font-size: 14px; color: var(--retro-gold-light); }

        .bd-cake-wish {
          margin: 0;
          font-family: "Fraunces Variable", Georgia, serif;
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          font-weight: 700;
          font-style: italic;
          color: var(--retro-gold-light);
          text-align: center;
          animation: bd-cake-wish-in 0.6s cubic-bezier(0.22, 1.2, 0.36, 1) both;
        }
        @keyframes bd-cake-wish-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        @media (prefers-reduced-motion: reduce) {
          .bd-cake-button { transition: none; }
          .bd-cake-button:hover { transform: none; }
          .bd-cake-flame { animation: none; }
          .bd-cake-smoke > circle { animation: none; opacity: 0.5; }
          .bd-cake-crumbs { animation: none; }
          .bd-cake-clip-rect { transition: none; }
          .bd-cake-wish { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default BirthdayCake;
