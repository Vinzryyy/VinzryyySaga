/**
 * Bits shared by the Pasangkan Momen modes (classic page + Mode Tantangan).
 */
import React, { useEffect, useState } from 'react';
import { readSoundOn, subscribeSound, writeSoundOn } from '../../lib/gameSfx';
import { MEMORY_POOL_URL } from '../../lib/memoryGame';

export const SITE_URL = 'https://armeniaca.online';

let poolPromise = null;
export const loadPool = () => {
  if (!poolPromise) {
    poolPromise = fetch(MEMORY_POOL_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => d.items || [])
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
};

export const preload = (photos) =>
  Promise.all(
    photos.map(
      (p) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = p.webp;
        }),
    ),
  );

// Lenis (smooth scroll) owns the scroll position when active; ask it first.
export const scrollToEl = (el, offset = -96) => {
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = window.__armeLenis;
  if (lenis) lenis.scrollTo(el, { offset, immediate: reduce });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
};

export const prettyDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00+07:00`);
  return Number.isNaN(d.getTime())
    ? null
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d);
};

export const Chip = ({ active, onClick, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active}
    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
      active
        ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]'
        : 'bg-white/70 text-[color:var(--retro-text-secondary)] border border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40'
    }`}
  >
    {children}
  </button>
);

export const btnPrimary =
  'px-5 py-2 rounded-full text-sm font-black uppercase tracking-wider bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)] disabled:opacity-50';
export const btnGhost =
  'px-5 py-2 rounded-full text-sm font-bold border border-[color:var(--retro-brown-dark)]/20 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/40';

/** Sound + vibration on/off (one switch for both). */
export const SoundToggle = () => {
  const [on, setOn] = useState(readSoundOn);
  useEffect(() => subscribeSound(setOn), []);
  return (
    <button
      type="button"
      onClick={() => writeSoundOn(!on)}
      aria-pressed={on}
      aria-label={on ? 'Matikan suara dan getar' : 'Nyalakan suara dan getar'}
      title={on ? 'Suara & getar: nyala' : 'Suara & getar: mati'}
      className="w-8 h-8 grid place-items-center rounded-full border border-[color:var(--retro-brown-dark)]/20 text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40"
    >
      <i className={on ? 'ri-volume-up-line' : 'ri-volume-mute-line'} />
    </button>
  );
};

const CONFETTI_COLORS = ['#C8952A', '#7C2D34', '#DFAE42', '#E8B4B8', '#9B7BB4', '#FDF6E3'];

/**
 * A short CSS confetti burst over its (relative) parent. Remount with a new
 * `key` to fire again. Hidden entirely under prefers-reduced-motion.
 */
export const Celebration = ({ count = 28 }) => {
  const [bits] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: 5 + Math.random() * 90,
      delay: Math.random() * 0.25,
      dur: 1.1 + Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 160,
      rot: Math.random() * 720 - 360,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 6,
    })),
  );
  return (
    <div className="mm-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            left: `${b.left}%`,
            width: b.w,
            height: b.w * 0.45,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            '--drift': `${b.drift}px`,
            '--rot': `${b.rot}deg`,
          }}
        />
      ))}
    </div>
  );
};
