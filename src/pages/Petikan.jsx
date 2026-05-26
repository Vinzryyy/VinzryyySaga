/**
 * Petikan — top-level batch container untuk daily-pluck memory feature.
 *
 * P1 skeleton: page shell + status indicator + countdown to next pluck.
 * Mechanic implementation di P2 (pluck logic + RNG + tier roll), visuals
 * di P3 (pohon SVG) dan P4 (kartu flip).
 *
 * Tonal goal: retro paper-archive (cream/sepia/burgundy + Fraunces),
 * NOT trading-card glossy. Differentiation dari FouReality eksplisit.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Seo from '../components/Seo';
import {
  canPluckToday,
  loadState,
  msUntilNextJakartaMidnight,
} from '../lib/petikanStorage';
import { BATCH_ID } from '../data/pohonAprikot';

const formatCountdown = (ms) => {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const Petikan = () => {
  const [state, setState] = useState(() => loadState());
  const [now, setNow] = useState(() => new Date());

  // Tick every second untuk countdown ke midnight WIB.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const canPluck = useMemo(() => canPluckToday(state, now), [state, now]);
  const countdownMs = useMemo(() => msUntilNextJakartaMidnight(now), [now]);

  // Reload state ketika jendela midnight WIB lewat (countdown jadi 0).
  // Cheap polling — interval di atas udah jalan, ini cuma cek transisi.
  useEffect(() => {
    if (countdownMs <= 1000 && !canPluck) {
      setState(loadState());
    }
  }, [countdownMs, canPluck]);

  return (
    <>
      <Seo
        path="/petikan"
        title="Petikan — Pohon Aprikot"
        description="Satu kenangan dari Pohon Aprikot, tiap pagi. Arsip harian Eli JKT48 dari Armeniaca — batch Seitansai 2026."
      />

      <main className="min-h-screen bg-[color:var(--retro-bg-primary)] text-[color:var(--retro-text-primary)] pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Eyebrow — batch identifier */}
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-6">
            Seitansai 2026 · Batch #1 · {BATCH_ID}
          </p>

          {/* Title */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl text-[color:var(--retro-text-primary)] mb-4"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Pohon Aprikot
          </h1>

          {/* Tagline italic */}
          <p
            className="text-lg sm:text-xl text-[color:var(--retro-brown-dark)]/80 italic mb-12"
            style={{ fontFamily: '"Fraunces Variable", serif' }}
          >
            Satu kenangan dari pohon, tiap pagi.
          </p>

          {/* Spine divider */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
            <i className="ri-leaf-line text-[color:var(--retro-burgundy)] text-lg" />
            <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
          </div>

          {/* Status card */}
          <div className="bg-white/70 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/10 rounded-2xl p-8 shadow-[0_8px_32px_rgba(61,52,43,0.08)]">
            {canPluck ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
                  Hari ini
                </p>
                <p
                  className="text-xl sm:text-2xl text-[color:var(--retro-brown-dark)] mb-6 leading-relaxed"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  Pohon punya satu buah untukmu.
                </p>
                <button
                  type="button"
                  disabled
                  title="Mekanik petik live di fase berikutnya"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.18em] bg-[color:var(--retro-burgundy)]/40 text-white cursor-not-allowed"
                >
                  <i className="ri-leaf-line text-base" />
                  <span>Belum bisa dipetik</span>
                </button>
                <p className="text-xs text-[color:var(--retro-brown-dark)]/60 mt-4">
                  Pohon sedang ditumbuhkan. Buah pertama jatuh menjelang seitansai.
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
                  Pohon istirahat
                </p>
                <p
                  className="text-xl sm:text-2xl text-[color:var(--retro-brown-dark)] mb-6 leading-relaxed"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  Kamu sudah memetik hari ini. Kembali besok pagi.
                </p>
                <p className="text-xs text-[color:var(--retro-brown-dark)]/60 mb-2 uppercase tracking-[0.3em]">
                  Pohon kembali dalam
                </p>
                <p
                  className="text-3xl text-[color:var(--retro-burgundy)] tabular-nums"
                  style={{ fontFamily: '"Fraunces Variable", serif', fontWeight: 600 }}
                >
                  {formatCountdown(countdownMs)}
                </p>
              </>
            )}
          </div>

          {/* Footer credit */}
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-brown-dark)]/50 mt-12">
            Armeniaca · arsip independen
          </p>
        </div>
      </main>
    </>
  );
};

export default Petikan;
