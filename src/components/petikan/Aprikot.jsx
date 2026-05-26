/**
 * Aprikot — single fruit SVG. Renders sebagai <g> di-position via cx/cy
 * di parent SVG (PohonAprikot). Dua state visual:
 *
 *   idle    — decorative fruit, gak interactive (cuma ambient illustration)
 *   active  — shimmery + clickable (hari ini punya buah, ready to pluck)
 *
 * Botanical style: warm orange/peach body dengan subtle gradient untuk
 * volume, crease line tipis vertikal (signature apricot), daun kecil di
 * stem. Active state nambah glow halo + radial pulse.
 *
 * Hover scale via CSS transform (lebih responsive vs GSAP untuk instant
 * feedback). Continuous shimmer via GSAP infinite tween — driven dari
 * PohonAprikot parent biar timeline-nya cleanup terkoordinasi.
 */

import React, { forwardRef } from 'react';

const Aprikot = forwardRef(function Aprikot(
  { cx, cy, r = 12, active = false, onClick, gradientId, glowId, label },
  ref
) {
  const handleClick = active && onClick ? onClick : undefined;
  const handleKey = (e) => {
    if (!active || !onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <g
      ref={ref}
      transform={`translate(${cx} ${cy})`}
      className={active ? 'cursor-pointer' : ''}
      style={{
        transformOrigin: `${cx}px ${cy}px`,
        transition: 'transform 200ms ease-out',
      }}
      onClick={handleClick}
      onKeyDown={handleKey}
      tabIndex={active ? 0 : -1}
      role={active ? 'button' : 'img'}
      aria-label={label || (active ? 'Petik aprikot' : 'Aprikot di pohon')}
      onMouseEnter={(e) => {
        if (active) e.currentTarget.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) scale(1.12)';
      }}
      onMouseLeave={(e) => {
        if (active) e.currentTarget.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) scale(1)';
      }}
    >
      {/* Glow halo — visible saat active. Animated via GSAP di parent. */}
      {active && (
        <circle
          className="aprikot-glow"
          cx={0}
          cy={0}
          r={r * 2.2}
          fill={`url(#${glowId})`}
          opacity={0.55}
        />
      )}

      {/* Stem (small brown nub) */}
      <path
        d={`M ${-0.5} ${-r + 1} L 0 ${-r - 2} L 0.5 ${-r + 1} Z`}
        fill="#5a3e2b"
      />

      {/* Daun di stem — slight wedge */}
      <path
        d={`M 0 ${-r - 1} Q ${r * 0.5} ${-r - 3} ${r * 0.4} ${-r + 2} Q ${r * 0.15} ${-r - 0.5} 0 ${-r - 1} Z`}
        fill="#6b7a47"
      />

      {/* Body — main fruit shape, slightly egg-ish */}
      <ellipse
        cx={0}
        cy={0}
        rx={r}
        ry={r * 1.05}
        fill={`url(#${gradientId})`}
        stroke="#c4794a"
        strokeWidth={0.5}
        strokeOpacity={0.4}
      />

      {/* Crease line — signature apricot cleft */}
      <path
        d={`M 0 ${-r * 0.9} Q ${-r * 0.15} 0 0 ${r * 0.9}`}
        fill="none"
        stroke="#a05828"
        strokeWidth={0.6}
        strokeOpacity={0.35}
      />

      {/* Blush spot (ripeness highlight) — top-left */}
      <ellipse
        cx={-r * 0.35}
        cy={-r * 0.3}
        rx={r * 0.25}
        ry={r * 0.18}
        fill="#ffd9b8"
        opacity={0.55}
      />
    </g>
  );
});

export default Aprikot;
