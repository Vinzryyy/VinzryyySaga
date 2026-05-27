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
import BrewekMusic from '../components/petikan/BrewekMusic';
import { playSelectSfx } from '../components/petikan/PluckTimeline';
import { readEnabled, readVolume } from '../lib/townAudioBus';
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

// Background wallpaper — chibi Arme PNGs random scattered, B&W (grayscale),
// opacity 50%. Random count (18-26) + positions di-compute via useMemo
// (stable selama session, reshuffle pas refresh). Absolute positioning
// scroll dengan page — bukan fixed wallpaper.
const BG_SRCS = [
  '/EmoteLabs/Background/Arme_2026-05-27-14-38-57.png',
  '/EmoteLabs/Background/Arme_2026-05-27-14-39-06.png',
  '/EmoteLabs/Background/Arme_2026-05-27-14-39-09.png',
  '/EmoteLabs/Background/Arme_2026-05-27-14-39-27.png',
  '/EmoteLabs/Background/Arme_2026-05-27-14-39-30.png',
];

const BackgroundWallpaper = React.memo(() => {
  // Sparse doodle scatter — ~40 PNGs di-place secara asymmetric dengan
  // min-distance enforcement (Poisson-disk style lite). Stable per-mount.
  // Warna (no grayscale) supaya chibi Arme tetep terbaca, opacity rendah
  // (0.15-0.35) supaya gak compete dengan content.
  const items = useMemo(() => {
    const TARGET = 40;
    const MAX_ATTEMPTS = 2000;
    const MIN_VERT_VH = 20; // jarak vertikal min antar item (vh)
    const MIN_HORIZ_PCT = 14; // jarak horizontal min antar item (%)
    const accepted = [];
    let attempts = 0;
    while (accepted.length < TARGET && attempts < MAX_ATTEMPTS) {
      attempts += 1;
      const candidate = {
        top: Math.random() * 380, // 0-380vh
        left: Math.random() * 88, // 0-88% (avoid right edge)
      };
      const tooClose = accepted.some(
        (p) =>
          Math.abs(p.top - candidate.top) < MIN_VERT_VH &&
          Math.abs(p.left - candidate.left) < MIN_HORIZ_PCT,
      );
      if (!tooClose) accepted.push(candidate);
    }
    return accepted.map((p, i) => ({
      key: i,
      src: BG_SRCS[Math.floor(Math.random() * BG_SRCS.length)],
      top: p.top,
      left: p.left,
      rotate: (Math.random() - 0.5) * 24, // ±12°
      opacity: 0.15 + Math.random() * 0.2, // 0.15-0.35
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {items.map((p) => (
        <img
          key={p.key}
          src={p.src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute select-none"
          style={{
            top: `${p.top}vh`,
            left: `${p.left}%`,
            width: 'clamp(60px, 8vw, 100px)',
            opacity: p.opacity,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
});
BackgroundWallpaper.displayName = 'BackgroundWallpaper';

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
  // Pack udah robek di batch ini? True setelah kartu 1 dipindah ke
  // kartu 2+. Dipakai supaya kartu setelahnya (atau swipe-back ke
  // kartu 1) instant swap — pack rip animation cuma jalan SEKALI di
  // first reveal.
  const [hasRippedThisBatch, setHasRippedThisBatch] = useState(false);
  // Semua kartu di batch ini udah pernah ditampilkan? Track max
  // revealIndex yang pernah ke-reach. Setelah hit length-1 (kartu
  // terakhir), thumbnail recap + share button stay visible meskipun
  // user swipe-back ke kartu sebelumnya — preview semua tetap accessible.
  const [allCardsRevealed, setAllCardsRevealed] = useState(false);
  // Ref untuk cancel pending auto-advance timer saat manual gesture.
  const transitionTimerRef = useRef(null);
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
      setHasRippedThisBatch(false);
      setAllCardsRevealed(false);
      setEmptyPool(false);
    }
  }, [countdownMs, canPluck]);

  // Track milestone: semua kartu di batch udah pernah ditampilkan.
  // Sticky — sekali true, stay true sampai handlePluck batch baru.
  useEffect(() => {
    if (
      pluckedCards.length > 0 &&
      revealIndex === pluckedCards.length - 1 &&
      !allCardsRevealed
    ) {
      setAllCardsRevealed(true);
    }
  }, [revealIndex, pluckedCards.length, allCardsRevealed]);

  // Auto-advance reveal cursor. Setelah hold window selesai, langsung
  // bump revealIndex + tandai hasRippedThisBatch=true (batched, same
  // render). No exit animation — kartu lama instant swap ke kartu baru.
  // Timer ID di-save ke ref supaya manual gesture bisa cancel.
  useEffect(() => {
    if (revealIndex < 0 || pluckedCards.length === 0) return undefined;
    if (revealIndex >= pluckedCards.length - 1) return undefined;
    const current = pluckedCards[revealIndex];
    const holdMs = TIER_HOLD_MS[current?.tier] || TIER_HOLD_MS.muda;
    const t = setTimeout(() => {
      setRevealIndex((idx) => idx + 1);
      setHasRippedThisBatch(true);
    }, holdMs);
    transitionTimerRef.current = t;
    return () => {
      clearTimeout(t);
      transitionTimerRef.current = null;
    };
  }, [revealIndex, pluckedCards]);

  // Helper untuk fire Select SFX dengan respect bus enabled + volume.
  // Multiplier 0.9 untuk action besar (pack tap), 0.7 untuk action kecil
  // (thumbnail jump). Disabled flag gate sebelum play biar mute global
  // matiin SFX juga. Declared sebelum jumpTo + handlePluck supaya gak
  // ke-TDZ (const hoisting block-scoped).
  //
  // SFX_VOLUME_MULTIPLIER mirror BREWEK_MUSIC pattern — cap output ke
  // 50% × bus volume supaya gak overshadow music / dialog. Slider 100% =
  // 0.5 SFX gain, slider 50% = 0.25, dst.
  const fireSelectSfx = useCallback((multiplier = 0.9) => {
    if (!readEnabled()) return;
    const baseVol = readVolume();
    if (baseVol <= 0) return;
    const SFX_VOLUME_MULTIPLIER = 0.5;
    playSelectSfx(multiplier * baseVol * SFX_VOLUME_MULTIPLIER);
  }, []);

  // Manual jump (tap, swipe, atau thumbnail click) — cancel pending
  // auto-advance, instant swap ke target index. No exit anim, no
  // entrance anim (KartuBrewek static mode saat skipPack=true).
  // Fire SFX dengan multiplier sedikit lebih lirih (0.7) — action
  // kecil dibanding pack tap awal.
  const jumpTo = useCallback(
    (targetIndex) => {
      if (pluckedCards.length === 0) return;
      if (targetIndex === revealIndex) return;
      if (targetIndex < 0 || targetIndex >= pluckedCards.length) return;
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      fireSelectSfx(0.7);
      setRevealIndex(targetIndex);
      setHasRippedThisBatch(true);
    },
    [pluckedCards.length, revealIndex, fireSelectSfx]
  );

  const handlePluck = useCallback(() => {
    if (!canPluck) return;
    fireSelectSfx(1.0);
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
    setHasRippedThisBatch(false);
    setAllCardsRevealed(false);
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
      setHasRippedThisBatch(false);
      setAllCardsRevealed(false);
    }, totalHoldMs + 2000);
    return () => clearTimeout(t);
  }, [devBypass, pluckedCards]);

  return (
    <>
      <Seo
        path="/petikan"
        title="Petikan — The Life of Armeniaca"
        description="The Life of Armeniaca — kepingan harian Arme sebagai fan Helisma Putri Kurnia. Buka pack, dapat 3 kartu tiap hari. Batch I, Seitansai 2026."
        image="https://armeniaca.online/og-petikan.png"
      />

      {/* Background track BREWEK.mp3 — mount sekali per /petikan visit,
          unmount saat user navigate keluar. Loop continuous, respect
          townAudioBus enabled + volume. */}
      <BrewekMusic />

      <main className="min-h-screen bg-[color:var(--retro-bg-primary)] text-[color:var(--retro-text-primary)] pt-28 pb-20 px-6 relative overflow-hidden">
        {/* Background wallpaper — chibi Arme PNGs scattered random,
            grayscale (black & white), opacity 50%. Absolute positioned
            (scroll dengan page, gak fixed). Random count + positions
            di-compute once per mount via useMemo. */}
        <BackgroundWallpaper />

        <div className="max-w-2xl mx-auto text-center relative" style={{ zIndex: 10 }}>
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
            Batch I · {BATCH_ID}
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
            The Life of
            <br />
            Armeniaca
          </h1>

          {/* Tagline italic */}
          <p
            className="text-lg sm:text-xl text-[color:var(--retro-brown-dark)]/80 italic mb-12"
            style={{ fontFamily: '"Fraunces Variable", serif' }}
          >
            Sehari-hari Arme mengidolakan Helisma. Tiga keping per pack.
          </p>

          {/* Spine divider */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
            <i className="ri-leaf-line text-[color:var(--retro-burgundy)] text-lg" />
            <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
          </div>

          {/* Token counter — prominent indicator of pack availability.
              Total = (free daily ? 1 : 0) + buah. Breakdown di bawah
              kasih konteks: mana yang free, mana yang dari Pohon
              Kebaikan. Visible always (termasuk saat 0) supaya user
              langsung tau status sebelum nyentuh pack. */}
          {(() => {
            const freeAvailable = hasFreeDaily ? 1 : 0;
            const totalTokens = freeAvailable + buah;
            return (
              <div className="mb-8 inline-flex flex-col items-center gap-1">
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-5xl tabular-nums text-[color:var(--retro-burgundy)]"
                    style={{
                      fontFamily: '"Fraunces Variable", serif',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {totalTokens}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--retro-brown-dark)]/70">
                    {totalTokens === 1 ? 'pack' : 'pack'}
                    <br />
                    tersedia
                  </span>
                </div>
                {totalTokens > 0 ? (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/55 mt-1">
                    {freeAvailable > 0 && '1 free hari ini'}
                    {freeAvailable > 0 && buah > 0 && ' · '}
                    {buah > 0 && (
                      <>
                        <span className="text-[11px]">🍑</span> {buah} buah
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/55 mt-1">
                    Tunggu midnight WIB · atau{' '}
                    <a
                      href="/26"
                      className="underline text-[color:var(--retro-burgundy)] hover:opacity-80"
                    >
                      petik buah
                    </a>
                  </p>
                )}
              </div>
            );
          })()}

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
          {/* LegendaReveal aurora — fire HANYA saat first reveal kartu 1
              yang kebetulan legenda (hasRippedThisBatch=false + tier=legenda).
              Static swap ke kartu legenda di posisi 2/3 atau swipe-back =
              gak trigger aurora ulang. */}
          {revealIndex === 0 &&
            !hasRippedThisBatch &&
            pluckedCards[0]?.tier === 'legenda' && <LegendaReveal />}
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
                revealIndex >= 0 ? pluckedCards[revealIndex] : null
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
              sekali semua kartu di batch udah pernah ditampilkan
              (allCardsRevealed). Stay visible walaupun user swipe-back
              ke kartu sebelumnya — preview semua tetap accessible.
              Highlight thumbnail kartu yang lagi displayed di slot atas. */}
          {pluckedCards.length > 0 && allCardsRevealed && (
            <div className="mb-8 flex justify-center gap-2 flex-wrap">
              {pluckedCards.map((c, i) => (
                <button
                  key={c.id + '-' + i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  disabled={i === revealIndex}
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

          {/* Status card — countdown + CTA, simplified karena token
              counter di atas udah handle "berapa pack available". Card
              sini fokus: tunggu midnight WIB atau cara dapet buah. */}
          <div className="bg-white/70 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(61,52,43,0.08)]">
            {canPluck ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
                  Siap buka
                </p>
                <p
                  className="text-lg sm:text-xl text-[color:var(--retro-brown-dark)] leading-relaxed"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  Tap pack — buka satu kali, dapat {CARDS_PER_PLUCK} kartu.
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
              sekali semua kartu udah pernah ditampilkan (allCardsRevealed).
              Default share the rarest card di batch (legenda > langka >
              matang > muda) — highlight paling spesial dari 3 kartu. */}
          {pluckedCards.length > 0 &&
            allCardsRevealed &&
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
