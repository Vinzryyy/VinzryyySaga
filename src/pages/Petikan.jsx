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
import KartuFlip from '../components/petikan/KartuFlip';
import LegendaReveal from '../components/petikan/LegendaReveal';
import BukuPetikan from '../components/petikan/BukuPetikan';
import ShareCardImage from '../components/petikan/ShareCardImage';
import {
  applyPluck,
  canPluckToday,
  getJakartaDate,
  loadState,
  msUntilNextJakartaMidnight,
  saveState,
} from '../lib/petikanStorage';
import { BATCH_ID, pickCard } from '../data/pohonAprikot';

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
        image="https://armeniaca.online/og-petikan.png"
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

          {/* Reveal — KartuFlip orchestrator: drops in from above, flips
              from spine-cover (KartuBack) ke book-page front (KartuIngatan)
              dengan page-turn sfx. Ephemeral per session — full koleksi
              historis di Buku Petikan (P7).

              Legenda tier dapat extra cinematic: aurora overlay + floating
              petals + chime audio (LegendaReveal). Card entry di-delay
              1.5s biar aurora buildup finish dulu sebelum drop. */}
          {pluckedCard && pluckedCard.tier === 'legenda' && <LegendaReveal />}
          {pluckedCard && (
            <div className="mt-10 relative z-10">
              <KartuFlip
                card={pluckedCard}
                delay={pluckedCard.tier === 'legenda' ? 1.5 : 0}
              />
              {/* Share button — capture off-screen clone via html-to-image
                  → Web Share API mobile, download fallback desktop. */}
              <div className="mt-6 flex justify-center">
                <ShareCardImage card={pluckedCard} />
              </div>
            </div>
          )}

          {/* Buku Petikan — koleksi historis lintas hari. Render setelah
              tree + reveal supaya focus utama tetep di pohon hari ini. */}
          <BukuPetikan state={state} />

          {/* Footer credit */}
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-brown-dark)]/50 mt-16">
            Armeniaca · arsip independen
          </p>
        </div>
      </main>
    </>
  );
};

export default Petikan;
