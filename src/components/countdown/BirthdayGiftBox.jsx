/**
 * BirthdayGiftBox — companion to the cake on the birthday celebration
 * plate. Tap the wrapped gift box → lid lifts off with a confetti puff
 * → reveals a random photo + quote pulled from
 * SITE_CONFIG.countdown.gifts. Tap again to close + re-randomize for
 * the next visitor.
 *
 * Design notes:
 *  - Each open re-rolls the photo+quote so refreshing the page or
 *    clicking again surfaces something different. Photos and quotes
 *    are decoupled — paired randomly each open.
 *  - Pure SVG box (no external image). Lid is its own group with a
 *    transform-origin at the back so it lifts up + tilts back like a
 *    real lid hinging open.
 *  - Reveal panel slides in below the box once opened, sized to fit
 *    next to the cake on the celebration plate.
 *  - Honors prefers-reduced-motion (instant state swap, no lid
 *    animation, no confetti puff).
 */

import React, { useMemo, useState } from 'react';
import { SITE_CONFIG } from '../../config/siteConfig';

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const BirthdayGiftBox = () => {
  const gifts = SITE_CONFIG.countdown.gifts;
  const [open, setOpen] = useState(false);
  const [revealKey, setRevealKey] = useState(0);

  const reveal = useMemo(() => {
    if (!open || !gifts) return null;
    return {
      photo: pickRandom(gifts.photos),
      quote: pickRandom(gifts.quotes),
    };
    // revealKey forces a fresh random on each open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, revealKey, gifts]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
    } else {
      setRevealKey((k) => k + 1); // re-randomize on next open
      setOpen(true);
    }
  };

  if (!gifts) return null;

  return (
    <div className="bd-gift-wrap">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? 'Tutup hadiah' : 'Buka hadiah'}
        aria-pressed={open}
        className="bd-gift-button"
      >
        <svg viewBox="0 0 200 240" width="100%" height="100%" aria-hidden="true">
          {/* Plate shadow */}
          <ellipse cx="100" cy="232" rx="90" ry="5" fill="rgba(0,0,0,0.18)" />

          {/* Box body — burgundy with gold ribbon */}
          <g className="bd-gift-body">
            <rect x="30" y="100" width="140" height="125" rx="8" fill="var(--retro-burgundy)" />
            {/* Vertical ribbon */}
            <rect x="92" y="100" width="16" height="125" fill="var(--retro-gold)" />
            {/* Subtle box highlight */}
            <rect x="30" y="100" width="140" height="6" rx="3" fill="rgba(255,255,255,0.15)" />
          </g>

          {/* Lid — animates open. transform-origin set on the .bd-gift-lid via CSS */}
          <g className={`bd-gift-lid ${open ? 'is-open' : ''}`}>
            <rect x="20" y="80" width="160" height="32" rx="6" fill="var(--retro-burgundy-light)" />
            {/* Lid horizontal ribbon */}
            <rect x="20" y="92" width="160" height="8" fill="var(--retro-gold)" />
            {/* Bow knot */}
            <circle cx="100" cy="80" r="9" fill="var(--retro-gold)" />
            {/* Bow loops */}
            <ellipse
              cx="84"
              cy="74"
              rx="14"
              ry="9"
              fill="var(--retro-gold-light)"
              transform="rotate(-25 84 74)"
            />
            <ellipse
              cx="116"
              cy="74"
              rx="14"
              ry="9"
              fill="var(--retro-gold-light)"
              transform="rotate(25 116 74)"
            />
            {/* Bow tails */}
            <path
              d="M93 88 L88 105 L93 102 Z"
              fill="var(--retro-gold)"
              opacity="0.85"
            />
            <path
              d="M107 88 L112 105 L107 102 Z"
              fill="var(--retro-gold)"
              opacity="0.85"
            />
          </g>

          {/* Confetti puff — only when open, restarts via key on each open */}
          {open && (
            <g key={`puff-${revealKey}`} className="bd-gift-puff">
              <circle cx="100" cy="78" r="3" fill="var(--retro-gold-light)" />
              <circle cx="80"  cy="70" r="2" fill="var(--retro-cream)" />
              <circle cx="120" cy="70" r="2" fill="var(--retro-cream)" />
              <rect   x="65"   y="60"  width="3" height="6" fill="var(--retro-burgundy-light)" rx="1" />
              <rect   x="135"  y="60"  width="3" height="6" fill="var(--retro-burgundy-light)" rx="1" />
              <circle cx="100" cy="55" r="2" fill="var(--retro-gold)" />
              <rect   x="92"   y="40"  width="3" height="3" fill="var(--retro-cream)" rx="0.5" />
            </g>
          )}
        </svg>

        <span className="bd-gift-hint">
          <i className={open ? 'ri-gift-2-fill' : 'ri-gift-2-line'} />
          <span>{open ? 'Tap untuk tutup lagi' : 'Tap untuk buka hadiah'}</span>
        </span>
      </button>

      {/* Reveal panel — slides in once the box is open */}
      {open && reveal && (
        <div key={`reveal-${revealKey}`} className="bd-gift-reveal">
          <div className="bd-gift-photo-wrap">
            <img
              src={reveal.photo}
              alt={`Random moment Eli — gift reveal`}
              loading="lazy"
              decoding="async"
              className="bd-gift-photo"
            />
          </div>
          <p className="bd-gift-quote">
            <i className="ri-double-quotes-l" />
            <span>{reveal.quote}</span>
          </p>
        </div>
      )}

      <style>{`
        .bd-gift-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 360px;
        }
        .bd-gift-button {
          background: transparent;
          border: 0;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0;
          width: clamp(180px, 38vw, 260px);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .bd-gift-button > svg {
          filter:
            drop-shadow(0 8px 18px rgba(0, 0, 0, 0.35))
            drop-shadow(0 0 18px rgba(229, 197, 117, 0.18));
        }
        .bd-gift-button:hover { transform: translateY(-4px) scale(1.02); }
        .bd-gift-button:active { transform: translateY(-2px) scale(0.99); }
        .bd-gift-button:focus-visible {
          outline: 2px solid var(--retro-gold-light);
          outline-offset: 8px;
          border-radius: 1.5rem;
        }

        /* Lid lift — transform-origin near the back-bottom of the lid
           so it tilts back like a real hinge. */
        .bd-gift-lid {
          transform-origin: 100px 110px;
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .bd-gift-lid.is-open {
          transform: translateY(-30px) rotate(-12deg);
        }

        .bd-gift-puff > * {
          opacity: 0;
          animation: bd-gift-puff-rise 1.2s ease-out forwards;
        }
        .bd-gift-puff > *:nth-child(1) { animation-delay: 0.05s; }
        .bd-gift-puff > *:nth-child(2) { animation-delay: 0.10s; }
        .bd-gift-puff > *:nth-child(3) { animation-delay: 0.10s; }
        .bd-gift-puff > *:nth-child(4) { animation-delay: 0.15s; }
        .bd-gift-puff > *:nth-child(5) { animation-delay: 0.15s; }
        .bd-gift-puff > *:nth-child(6) { animation-delay: 0.20s; }
        .bd-gift-puff > *:nth-child(7) { animation-delay: 0.25s; }
        @keyframes bd-gift-puff-rise {
          0%   { opacity: 0;   transform: translateY(0)    scale(0.6); }
          25%  { opacity: 1;                                            }
          100% { opacity: 0;   transform: translateY(-40px) scale(1.1); }
        }

        .bd-gift-hint {
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
        .bd-gift-hint i { font-size: 14px; color: var(--retro-gold-light); }

        .bd-gift-reveal {
          width: 100%;
          padding: 1rem;
          background: rgba(253, 246, 227, 0.08);
          border: 1px solid rgba(253, 246, 227, 0.15);
          border-radius: 1rem;
          backdrop-filter: blur(6px);
          animation: bd-gift-reveal-in 0.55s cubic-bezier(0.22, 1.1, 0.36, 1) both;
        }
        @keyframes bd-gift-reveal-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .bd-gift-photo-wrap {
          aspect-ratio: 4 / 3;
          width: 100%;
          overflow: hidden;
          border-radius: 0.625rem;
          border: 2px solid var(--retro-cream);
        }
        .bd-gift-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .bd-gift-quote {
          margin: 0.85rem 0 0;
          padding: 0;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-family: "Fraunces Variable", Georgia, serif;
          font-style: italic;
          color: var(--retro-cream);
          font-size: 0.95rem;
          line-height: 1.5;
          text-align: left;
        }
        .bd-gift-quote i {
          color: var(--retro-gold-light);
          font-size: 1.4rem;
          line-height: 1;
          flex-shrink: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .bd-gift-button { transition: none; }
          .bd-gift-button:hover { transform: none; }
          .bd-gift-lid { transition: none; }
          .bd-gift-puff > * { animation: none; opacity: 0.6; }
          .bd-gift-reveal { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default BirthdayGiftBox;
