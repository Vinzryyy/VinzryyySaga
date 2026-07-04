/**
 * PetakQuickNav — prev/next petak links for immersive petak pages.
 *
 * Renders as a fixed bottom-center pill with two sibling petak links.
 * Intentionally subtle — semi-transparent, small text — so it doesn't
 * compete with the 3D scene. Props:
 *   currentId — 'r1'|'r2'|'r3'|'r4'|'r5'
 */
import React from 'react';
import { Link } from 'react-router-dom';

const PETAKS = [
  { id: 'r1', label: 'Lorong Pohon', route: '/armeniacaTown/r1' },
  { id: 'r2', label: 'Perpustakaan', route: '/armeniacaTown/r2' },
  { id: 'r3', label: 'Telaga Harapan', route: '/armeniacaTown/r3' },
  { id: 'r4', label: 'Menara Jam', route: '/armeniacaTown/r4' },
  { id: 'r5', label: 'Panggung Sorotan', route: '/armeniacaTown/r5' },
];

const PetakQuickNav = ({ currentId }) => {
  const idx = PETAKS.findIndex((p) => p.id === currentId);
  if (idx === -1) return null;

  const prev = PETAKS[(idx - 1 + PETAKS.length) % PETAKS.length];
  const next = PETAKS[(idx + 1) % PETAKS.length];

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
      <Link
        to={prev.route}
        className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-white/50 hover:text-white/85 hover:bg-black/60 hover:border-white/20 transition-all whitespace-nowrap"
        aria-label={`Ke ${prev.label}`}
      >
        <i className="ri-arrow-left-s-line text-xs" />
        {prev.label}
      </Link>

      <span className="w-px h-3 bg-white/15" aria-hidden="true" />

      <Link
        to={next.route}
        className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-white/50 hover:text-white/85 hover:bg-black/60 hover:border-white/20 transition-all whitespace-nowrap"
        aria-label={`Ke ${next.label}`}
      >
        {next.label}
        <i className="ri-arrow-right-s-line text-xs" />
      </Link>
    </div>
  );
};

export default PetakQuickNav;
