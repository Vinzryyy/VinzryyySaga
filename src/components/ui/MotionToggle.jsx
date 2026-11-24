/**
 * MotionToggle — small floating "Jeda animasi" switch (bottom-left, so it
 * never sits on top of the Arme chat bubble on the right). See
 * lib/motionPref.js for what turning motion off does.
 */

import React, { useEffect, useState } from 'react';
import { isMotionOff, setMotionOff, subscribeMotion } from '../../lib/motionPref';

export const useMotionOff = () => {
  const [off, setOff] = useState(isMotionOff);
  useEffect(() => subscribeMotion(setOff), []);
  return off;
};

const MotionToggle = () => {
  const off = useMotionOff();
  const label = off ? 'Putar animasi' : 'Jeda animasi';
  return (
    <button
      type="button"
      onClick={() => setMotionOff(!off)}
      aria-pressed={off}
      title={off ? 'Animasi sedang dijeda. Klik untuk menyalakan lagi.' : 'Matikan animasi dan efek gerak di seluruh situs'}
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-cream)]/90 px-3 py-2 text-[11px] font-bold text-[color:var(--retro-brown-dark)] shadow-md backdrop-blur hover:bg-[color:var(--retro-cream)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--retro-burgundy)] print:hidden"
    >
      <i className={`${off ? 'ri-play-circle-line' : 'ri-pause-circle-line'} text-base`} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
};

export default MotionToggle;
