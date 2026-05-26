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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Seo from '../components/Seo';
import PohonAprikot from '../components/petikan/PohonAprikot';
import {
  applyPluck,
  canPluckToday,
  getJakartaDate,
  loadState,
  msUntilNextJakartaMidnight,
  saveState,
} from '../lib/petikanStorage';
import { BATCH_ID, pickCard, TIER_CONFIG } from '../data/pohonAprikot';

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
  // pluckedCard = card yang baru di-petik di session ini. Ephemeral —
  // reset di reload (intentional, biar moment "petik" terasa langsung).
  // Full koleksi historis di-render di Buku Petikan (P7).
  const [pluckedCard, setPluckedCard] = useState(null);
  const [emptyPool, setEmptyPool] = useState(false);

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
      setPluckedCard(null);
      setEmptyPool(false);
    }
  }, [countdownMs, canPluck]);

  const handlePluck = useCallback(() => {
    if (!canPluck) return;
    const today = getJakartaDate(now);
    const card = pickCard(state, today);
    if (!card) {
      // Pool fully empty — surface graceful empty-state, don't burn
      // the daily pluck token (state intact).
      setEmptyPool(true);
      return;
    }
    const nextState = applyPluck(state, card, now);
    saveState(nextState);
    setState(nextState);
    setPluckedCard(card);
  }, [canPluck, state, now]);

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
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
            <i className="ri-leaf-line text-[color:var(--retro-burgundy)] text-lg" />
            <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
          </div>

          {/* Pohon Aprikot — primary affordance. Fruit yang berkilau =
              today's pluck candidate. Click langsung trigger handlePluck. */}
          <div className="mb-8">
            <PohonAprikot canPluck={canPluck} onPluck={handlePluck} />
          </div>

          {/* Status card — pure info, button removed (fruit IS the button) */}
          <div className="bg-white/70 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(61,52,43,0.08)]">
            {canPluck ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
                  Hari ini
                </p>
                <p
                  className="text-lg sm:text-xl text-[color:var(--retro-brown-dark)] leading-relaxed"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  Pohon punya satu buah untukmu.
                </p>
                <p className="text-xs text-[color:var(--retro-brown-dark)]/60 mt-3">
                  Klik aprikot yang berkilau untuk memetiknya.
                </p>
                {emptyPool && (
                  <p className="text-xs text-[color:var(--retro-burgundy)]/80 mt-3">
                    Pohon belum berbuah untuk pool ini. Coba lagi nanti.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
                  Pohon istirahat
                </p>
                <p
                  className="text-lg sm:text-xl text-[color:var(--retro-brown-dark)] mb-4 leading-relaxed"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  Kamu sudah memetik hari ini. Kembali besok pagi.
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/60 mb-1">
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

          {/* Reveal card — ephemeral, shows the card just plucked this
              session. P4 swaps this with full GSAP flip animation +
              proper card-back/front split. Here we render a book-page
              styled card with image + tier eyebrow + title + caption. */}
          {pluckedCard && (
            <div className="mt-8 text-left bg-[color:var(--retro-cream,#faf6ed)] border border-[color:var(--retro-brown-dark)]/10 rounded-2xl shadow-[0_8px_32px_rgba(61,52,43,0.1)] relative overflow-hidden">
              {/* Spine accent — full height, color per tier */}
              <span
                className="absolute left-0 top-0 bottom-0 z-10"
                style={{
                  width: TIER_CONFIG[pluckedCard.tier]?.spineWidth || '4px',
                  background: TIER_CONFIG[pluckedCard.tier]?.spineColor || 'var(--retro-burgundy)',
                }}
              />

              {/* Image hero — portrait crop with subtle sepia tint to
                  match retro paper palette. Cream mat margin di sekeliling
                  biar gambar terasa "ditempel" di halaman buku. */}
              {pluckedCard.image && (
                <div className="px-6 pt-6 pb-2">
                  <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full max-w-xs mx-auto overflow-hidden rounded-lg border border-[color:var(--retro-brown-dark)]/15 shadow-md">
                    <img
                      src={pluckedCard.image}
                      alt={pluckedCard.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      style={{ filter: 'sepia(0.18) saturate(0.92)' }}
                    />
                  </div>
                </div>
              )}

              {/* Content block */}
              <div className="px-6 pb-6 pt-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3 pl-3">
                  {TIER_CONFIG[pluckedCard.tier]?.label || pluckedCard.tier}
                  {pluckedCard.date && (
                    <span className="text-[color:var(--retro-brown-dark)]/50 ml-2">
                      · {pluckedCard.date}
                    </span>
                  )}
                </p>
                <h2
                  className="text-2xl sm:text-3xl text-[color:var(--retro-brown-dark)] mb-3 pl-3"
                  style={{
                    fontFamily: '"Fraunces Variable", serif',
                    fontWeight: 600,
                  }}
                >
                  {pluckedCard.title}
                </h2>
                <p
                  className="text-[color:var(--retro-brown-dark)]/80 leading-relaxed pl-3"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  {pluckedCard.caption}
                </p>
              </div>
            </div>
          )}

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
