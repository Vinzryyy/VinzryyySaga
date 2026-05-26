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
import { useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import KartuBrewek from '../components/petikan/KartuBrewek';
import LegendaReveal from '../components/petikan/LegendaReveal';
import BukuPetikan from '../components/petikan/BukuPetikan';
import ShareCardImage from '../components/petikan/ShareCardImage';
import {
  applyPluck,
  canPluckToday,
  getJakartaDate,
  getBuah,
  loadState,
  msUntilNextJakartaMidnight,
  saveState,
  spendBuah,
} from '../lib/petikanStorage';
import { BATCH_ID, pickCard } from '../data/pohonAprikot';
import { pickProse } from '../data/petikanProse';

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
  // Buah counter — earned via siraman di /26, dipakai untuk extra
  // pluck setelah free daily habis. Refresh on focus biar pickup
  // perubahan dari /26 visit.
  const [buah, setBuah] = useState(() => getBuah());
  const [searchParams] = useSearchParams();

  // Dev-only bypass: ?dev=1 → daily-lock di-disable, pluck unlimited
  // untuk testing. Gated import.meta.env.DEV — di production param ini
  // diabaikan total.
  const devBypass =
    import.meta.env.DEV && searchParams.get('dev') === '1';

  // Tick every second untuk countdown ke midnight WIB.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Refresh buah saat user balik ke tab (mis. baru tap support di /26
  // lalu navigasi balik ke /petikan).
  useEffect(() => {
    const refresh = () => setBuah(getBuah());
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Free daily check — pure mechanic, gak include dev bypass atau buah.
  // Dipakai handlePluck untuk tau pakai free dulu atau spend buah.
  const hasFreeDaily = useMemo(
    () => canPluckToday(state, now),
    [state, now]
  );
  // canPluck = ada free daily, atau punya buah, atau dev bypass.
  const canPluck = devBypass || hasFreeDaily || buah > 0;
  const countdownMs = useMemo(() => msUntilNextJakartaMidnight(now), [now]);

  // Reload state ketika jendela midnight WIB lewat (countdown jadi 0).
  // Cheap polling — interval di atas udah jalan, ini cuma cek transisi.
  useEffect(() => {
    if (countdownMs <= 1000 && !canPluck) {
      setState(loadState());
      setBuah(getBuah());
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
    // Pick prose line for today's journal entry — frozen at pluck time
    // (random pick now, not deferred render) supaya entry stays stable
    // even kalau prose library di-update di future deploy.
    const prose = pickProse(card.tier);
    const nextState = applyPluck(state, { ...card, prose }, now);
    // Free daily first (set lastPluck via applyPluck), else spend buah.
    // Dev bypass: skip both — preserve lastPluck & buah for testing.
    if (devBypass) {
      saveState({ ...nextState, lastPluck: state.lastPluck });
      setState({ ...nextState, lastPluck: state.lastPluck });
    } else if (hasFreeDaily) {
      saveState(nextState);
      setState(nextState);
    } else {
      // Free habis, pakai buah. spendBuah is atomic — guaranteed by
      // canPluck guard (buah > 0).
      spendBuah(1);
      // Preserve lastPluck (jangan reset daily lock — buah pluck adalah
      // EKSTRA, bukan reset).
      saveState({ ...nextState, lastPluck: state.lastPluck });
      setState({ ...nextState, lastPluck: state.lastPluck });
      setBuah(getBuah());
    }
    setPluckedCard(card);
  }, [canPluck, state, now, devBypass, hasFreeDaily]);

  // Re-arm pluck after each reveal in dev mode so user bisa pluck lagi
  // tanpa reload. Clear pluckedCard setelah 6s biar bisa tap KartuBack
  // baru.
  useEffect(() => {
    if (!devBypass || !pluckedCard) return undefined;
    const t = setTimeout(() => setPluckedCard(null), 6000);
    return () => clearTimeout(t);
  }, [devBypass, pluckedCard]);

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
          {/* Dev mode banner — visible saat ?dev=1, gated DEV build */}
          {devBypass && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--retro-burgundy)]/15 border border-[color:var(--retro-burgundy)]/30">
              <i className="ri-flask-line text-[color:var(--retro-burgundy)] text-sm" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                Dev mode — pluck unlimited
              </span>
            </div>
          )}

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

          {/* KartuBrewek — primary affordance + reveal orchestrator.
              Pre-pluck: KartuBack sealed pack dengan breathing animation,
              tap untuk buka. Post-pluck: in-place flip rotateY 0→180 ke
              KartuIngatan (book-page front). No tree, langsung pack.

              Legenda tier dapat extra cinematic: LegendaReveal aurora
              overlay + floating petals + chime audio. Flip di-delay 1.5s
              biar aurora buildup finish dulu. */}
          {pluckedCard && pluckedCard.tier === 'legenda' && <LegendaReveal />}
          <div className="mb-8 relative z-10">
            <KartuBrewek
              canPluck={canPluck}
              pluckedCard={pluckedCard}
              onPluck={handlePluck}
            />
          </div>

          {/* Buah badge — visible kalau ada buah tersedia, link ke /26
              kalau 0 (call to action) */}
          {buah > 0 && (
            <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--retro-burgundy)]/8 border border-[color:var(--retro-burgundy)]/20">
              <span className="text-base">🍑</span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                Buah Pohon Kebaikan · {buah} pack
              </span>
            </div>
          )}

          {/* Status card — pure info, instruksi sesuai state */}
          <div className="bg-white/70 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(61,52,43,0.08)]">
            {canPluck ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
                  {hasFreeDaily ? 'Hari ini' : 'Buah tersedia'}
                </p>
                <p
                  className="text-lg sm:text-xl text-[color:var(--retro-brown-dark)] leading-relaxed"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  {hasFreeDaily
                    ? 'Sebuah kartu menanti.'
                    : `Petik habis hari ini, tapi ${buah} buah dari Pohon Kebaikan siap dipakai.`}
                </p>
                <p className="text-xs text-[color:var(--retro-brown-dark)]/60 mt-3">
                  Tap kartu untuk membukanya.
                </p>
                {!hasFreeDaily && buah > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/55 mt-3">
                    Pakai 1 buah → tetap dapat pluck baru
                  </p>
                )}
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
                <p className="text-xs text-[color:var(--retro-brown-dark)]/60 mt-4">
                  Atau tap dukungan di{' '}
                  <a
                    href="/26"
                    className="underline text-[color:var(--retro-burgundy)] hover:opacity-80"
                  >
                    Pohon Kebaikan
                  </a>{' '}
                  → dapat 🍑 buah untuk extra petik.
                </p>
              </>
            )}
          </div>

          {/* Share button — capture off-screen clone via html-to-image
              → Web Share API mobile, download fallback desktop. Render
              hanya saat ada kartu yang udah ke-reveal. */}
          {pluckedCard && (
            <div className="mt-6 flex justify-center">
              <ShareCardImage card={pluckedCard} />
            </div>
          )}

          {/* Buku Petikan — koleksi historis lintas hari. Render setelah
              tree + reveal supaya focus utama tetep di pohon hari ini. */}
          <BukuPetikan state={state} onStateChange={setState} />

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
