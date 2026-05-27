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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import KartuBrewek from '../components/petikan/KartuBrewek';
import LegendaReveal from '../components/petikan/LegendaReveal';
import BukuPetikan from '../components/petikan/BukuPetikan';
import ShareCardImage from '../components/petikan/ShareCardImage';
import {
  applyPlucks,
  canPluckToday,
  getJakartaDate,
  getBuah,
  loadState,
  msUntilNextJakartaMidnight,
  saveState,
  spendBuah,
} from '../lib/petikanStorage';
import { BATCH_ID, CARDS_PER_PLUCK, pickCards } from '../data/pohonAprikot';
import { pickProse } from '../data/petikanProse';

// Hold duration per tier — berapa lama kartu di-display sebelum
// auto-advance ke kartu berikutnya dalam triad. Naik dgn tier biar
// kartu langka/legenda dapat dwell time lebih panjang untuk dinikmati.
// Pakai milliseconds. Active hanya selama kartu BUKAN terakhir (kartu
// terakhir tetap visible permanent sampai navigation).
const TIER_HOLD_MS = {
  muda: 3500,
  matang: 4000,
  langka: 5000,
  legenda: 6500,
};

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
  // pluckedCards = array of N kartu (CARDS_PER_PLUCK=3) yang baru di-petik
  // di session ini. Ephemeral — reset di reload (intentional, biar moment
  // "petik" terasa langsung). Full koleksi historis di-render di Buku
  // Petikan (P7). Empty array sebelum first pluck di session ini.
  const [pluckedCards, setPluckedCards] = useState([]);
  // revealIndex = posisi kartu mana yang lagi di-display di slot center.
  // -1 = belum ada pluck. 0..2 = kartu 1, 2, 3. Auto-advance via timer
  // setelah TIER_HOLD_MS, kecuali kartu terakhir (stay visible).
  const [revealIndex, setRevealIndex] = useState(-1);
  // isExiting = true selama jeda transisi antar kartu di triad. Bikin
  // pluckedCard prop ke KartuBrewek jadi null sehingga exit animation
  // jalan, TANPA mengubah revealIndex (yang akan re-trigger auto-advance
  // useEffect dan cancel t2). Reset balik ke false saat advance complete.
  const [isExiting, setIsExiting] = useState(false);
  // Pack udah robek di batch ini? True setelah kartu 1 emerge complete
  // (revealIndex maju ke 1+). Dipakai supaya kalau user swipe-balik
  // ke kartu 1, pack rip animation TIDAK replay (pack udah pergi).
  const [hasRippedThisBatch, setHasRippedThisBatch] = useState(false);
  // Refs untuk cancel pending auto-advance timer saat manual gesture.
  const transitionTimersRef = useRef({ t1: null, t2: null });
  // Pointer/touch start untuk swipe vs tap detection.
  const pointerStartRef = useRef(null);
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
      setPluckedCards([]);
      setRevealIndex(-1);
      setIsExiting(false);
      setHasRippedThisBatch(false);
      setEmptyPool(false);
    }
  }, [countdownMs, canPluck]);

  // Mark "pack robek" begitu revealIndex maju ke kartu 2+. Setelah ini
  // skipPack tetap true untuk semua sisa reveal di batch ini — termasuk
  // kalau user swipe balik ke kartu 1 (pack udah gak ada, jangan replay).
  useEffect(() => {
    if (revealIndex >= 1 && !hasRippedThisBatch) {
      setHasRippedThisBatch(true);
    }
  }, [revealIndex, hasRippedThisBatch]);

  // Auto-advance reveal cursor. Setelah hold window selesai, isExiting
  // di-set true (KartuBrewek receive null → exit animation jalan), lalu
  // bump revealIndex + reset isExiting. Pakai isExiting (bukan ubah
  // revealIndex ke -1) supaya useEffect deps gak ke-trigger di tengah
  // transisi — kalau ke-trigger, cleanup cancel t2 dan reveal stuck.
  // Timer IDs di-save ke ref supaya manual gesture (tap/swipe) bisa
  // cancel auto-advance.
  useEffect(() => {
    if (revealIndex < 0 || pluckedCards.length === 0) return undefined;
    if (revealIndex >= pluckedCards.length - 1) return undefined;
    const current = pluckedCards[revealIndex];
    const holdMs = TIER_HOLD_MS[current?.tier] || TIER_HOLD_MS.muda;
    const exitGapMs = 500;
    const t1 = setTimeout(() => setIsExiting(true), holdMs);
    const t2 = setTimeout(() => {
      setIsExiting(false);
      setRevealIndex((idx) => idx + 1);
    }, holdMs + exitGapMs);
    transitionTimersRef.current = { t1, t2 };
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      transitionTimersRef.current = { t1: null, t2: null };
    };
  }, [revealIndex, pluckedCards]);

  // Manual jump (tap, swipe, atau thumbnail click) — cancel pending
  // auto-advance, trigger exit anim, advance/back ke target index.
  // Guarded: skip kalau lagi exiting (let current transisi selesai) atau
  // target invalid.
  const jumpTo = useCallback(
    (targetIndex) => {
      if (pluckedCards.length === 0) return;
      if (isExiting) return;
      if (targetIndex === revealIndex) return;
      if (targetIndex < 0 || targetIndex >= pluckedCards.length) return;
      // Cancel pending auto-advance dari current revealIndex's effect.
      const timers = transitionTimersRef.current;
      if (timers.t1) clearTimeout(timers.t1);
      if (timers.t2) clearTimeout(timers.t2);
      transitionTimersRef.current = { t1: null, t2: null };
      // Manual exit → bump
      setIsExiting(true);
      setTimeout(() => {
        setIsExiting(false);
        setRevealIndex(targetIndex);
      }, 500);
    },
    [pluckedCards.length, isExiting, revealIndex]
  );

  const handlePluck = useCallback(() => {
    if (!canPluck) return;
    const today = getJakartaDate(now);
    const cards = pickCards(state, today, CARDS_PER_PLUCK);
    if (cards.length === 0) {
      // Pool fully empty — surface graceful empty-state, don't burn
      // the daily pluck token (state intact).
      setEmptyPool(true);
      return;
    }
    // Pick prose per card — frozen at pluck time (random pick now, not
    // deferred render) supaya entry stays stable even kalau prose library
    // di-update di future deploy. Tiap kartu dapet prose-nya sendiri.
    const cardsWithProse = cards.map((c) => ({ ...c, prose: pickProse(c.tier) }));
    const nextState = applyPlucks(state, cardsWithProse, now);
    // Free daily first (set lastPluck via applyPlucks), else spend buah.
    // Cost model: 1 event = 1 free daily ATAU 1 buah, terlepas dari
    // berapa kartu yang ke-pull dalam event itu.
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
    setPluckedCards(cardsWithProse);
    setRevealIndex(0);
    setIsExiting(false);
    setHasRippedThisBatch(false);
  }, [canPluck, state, now, devBypass, hasFreeDaily]);

  // Pointer/touch gesture detection — tap = next, swipe-left = next,
  // swipe-right = previous. Vertical move di-ignore (kemungkinan scroll).
  const handlePointerDown = useCallback((e) => {
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
    };
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      if (!pointerStartRef.current) return;
      if (pluckedCards.length === 0 || revealIndex < 0) {
        pointerStartRef.current = null;
        return;
      }
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dt = Date.now() - start.t;
      const SWIPE_PX = 40;
      const TAP_MAX_PX = 12;
      const TAP_MAX_MS = 350;
      // Vertical dominant → likely scroll, jangan handle
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) return;
      // Tap (kecil + cepat) atau swipe-left = next
      if (Math.abs(dx) < TAP_MAX_PX && dt < TAP_MAX_MS) {
        jumpTo(revealIndex + 1);
      } else if (dx < -SWIPE_PX) {
        jumpTo(revealIndex + 1);
      } else if (dx > SWIPE_PX) {
        jumpTo(revealIndex - 1);
      }
    },
    [pluckedCards.length, revealIndex, jumpTo]
  );

  const handlePointerCancel = useCallback(() => {
    pointerStartRef.current = null;
  }, []);

  // Re-arm pluck after each reveal in dev mode so user bisa pluck lagi
  // tanpa reload. Clear setelah window cukup buat sequential reveal +
  // reading time (sum hold per kartu di triad).
  useEffect(() => {
    if (!devBypass || pluckedCards.length === 0) return undefined;
    const totalHoldMs = pluckedCards.reduce(
      (acc, c) => acc + (TIER_HOLD_MS[c.tier] || TIER_HOLD_MS.muda),
      0
    );
    const t = setTimeout(() => {
      setPluckedCards([]);
      setRevealIndex(-1);
      setIsExiting(false);
      setHasRippedThisBatch(false);
    }, totalHoldMs + 2000);
    return () => clearTimeout(t);
  }, [devBypass, pluckedCards]);

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

          {/* KartuBrewek — single pack, sequential reveal triad.
              Pre-pluck: 1 KartuBack sealed pack dengan breathing animation,
              tap untuk buka. Pack rip terjadi sekali (kartu 1). Kartu 2 & 3
              emerge di slot yang sama tanpa pack rip ulang (skipPack=true).

              Auto-advance via TIER_HOLD_MS — kartu langka/legenda dapat
              hold lebih lama. Kartu terakhir stay visible permanent.

              Legenda tier dapat extra cinematic: LegendaReveal aurora
              overlay + chime audio. Trigger saat current displayed card
              tier === legenda (bukan saat batch ada legenda — supaya
              aurora muncul di moment yang tepat). */}
          {revealIndex >= 0 &&
            !isExiting &&
            pluckedCards[revealIndex]?.tier === 'legenda' && <LegendaReveal />}
          <div
            className="mb-8 relative z-10"
            onPointerDown={
              pluckedCards.length > 0 ? handlePointerDown : undefined
            }
            onPointerUp={
              pluckedCards.length > 0 ? handlePointerUp : undefined
            }
            onPointerCancel={
              pluckedCards.length > 0 ? handlePointerCancel : undefined
            }
            style={{ touchAction: 'pan-y' /* allow vertical scroll, capture horizontal */ }}
          >
            <KartuBrewek
              canPluck={canPluck && pluckedCards.length === 0}
              pluckedCard={
                revealIndex >= 0 && !isExiting
                  ? pluckedCards[revealIndex]
                  : null
              }
              onPluck={handlePluck}
              skipPack={hasRippedThisBatch}
            />
          </div>

          {/* Triad progress dots — "● ○ ○" → "● ● ○" → "● ● ●".
              Hanya visible saat sequential reveal lagi jalan. Jadi
              cue visual: ada berapa kartu lagi yang menanti. */}
          {pluckedCards.length > 1 && revealIndex >= 0 && (
            <div className="flex justify-center gap-2 mb-6">
              {pluckedCards.map((_, i) => (
                <span
                  key={i}
                  className="block w-2 h-2 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor:
                      i <= revealIndex
                        ? 'var(--retro-burgundy)'
                        : 'rgba(124, 45, 18, 0.2)',
                  }}
                  aria-label={`Kartu ${i + 1} dari ${pluckedCards.length}`}
                />
              ))}
            </div>
          )}

          {/* Triad recap — 3 thumbnail kartu, tap untuk browse. Visible
              setelah sequential reveal nyentuh kartu terakhir (jangan
              spoil image kartu yang belum revealed di slot utama).
              Highlight thumbnail kartu yang lagi displayed di slot atas. */}
          {pluckedCards.length > 0 &&
            revealIndex === pluckedCards.length - 1 && (
            <div className="mb-8 flex justify-center gap-2 flex-wrap">
              {pluckedCards.map((c, i) => (
                <button
                  key={c.id + '-' + i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  disabled={isExiting || i === revealIndex}
                  className={`relative overflow-hidden rounded-md border transition-all cursor-pointer disabled:cursor-default ${
                    i === revealIndex
                      ? 'border-[color:var(--retro-burgundy)] shadow-md scale-105'
                      : 'border-[color:var(--retro-brown-dark)]/20 hover:border-[color:var(--retro-burgundy)]/60 hover:shadow-sm'
                  }`}
                  style={{ width: '64px', height: '90px' }}
                  aria-label={`Lihat kartu ${i + 1}: ${c.title} (tier ${c.tier})`}
                >
                  {c.image && (
                    <img
                      src={c.image}
                      alt=""
                      className="w-full h-full object-cover"
                      aria-hidden="true"
                    />
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[9px] uppercase tracking-wider py-0.5 text-center">
                    {c.tier}
                  </span>
                </button>
              ))}
            </div>
          )}

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
                    ? `${CARDS_PER_PLUCK} kartu menanti.`
                    : `Petik habis hari ini, tapi ${buah} buah dari Pohon Kebaikan siap dipakai.`}
                </p>
                <p className="text-xs text-[color:var(--retro-brown-dark)]/60 mt-3">
                  Tap pack — buka satu kali, dapat {CARDS_PER_PLUCK} kartu.
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
              hanya saat sequential reveal udah selesai (kartu terakhir
              ditampilkan). Default share the rarest card di batch
              (legenda > langka > matang > muda) — highlight paling
              spesial dari 3 kartu. */}
          {pluckedCards.length > 0 &&
            revealIndex === pluckedCards.length - 1 &&
            (() => {
              const TIER_RANK = { legenda: 4, langka: 3, matang: 2, muda: 1 };
              const shareCard = [...pluckedCards].sort(
                (a, b) => (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0)
              )[0];
              return (
                <div className="mt-6 flex justify-center">
                  <ShareCardImage card={shareCard} />
                </div>
              );
            })()}

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
