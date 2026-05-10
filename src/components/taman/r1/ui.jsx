/**
 * UI overlays + DOM-based components untuk Konstelasi Perjalanan.
 *
 * - SceneFallback: themed loading state (shimmer + gradient)
 * - handleShare: Web Share API + clipboard fallback
 * - LorongHeader: top nav (peta link + share + exit)
 * - IntroTitle: cinematic title card first visit only (localStorage)
 * - MobileFPVControls: joystick + look swipe touch zone
 * - EraGuide: 7 era panel + spotlight chip
 * - LorongFooter: bottom hint (footer text)
 * - MilestoneOverlay: modal star detail dgn era-grouped dots + nav
 * - MonumentMomentOverlay: 2D vignette + warm tint saat monument
 *   signature event
 * - ClockSync: bridge state.clock ke parent ref (Canvas-side)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrame } from '@react-three/fiber';
import { ELI_TIMELINE } from '../../../data/eliProfile';
import { ERA_DEFS, ERA_LOOKUP } from './era';

// Themed loading fallback — gradient senja palette dengan subtle
// shimmer line yang slide. Lebih tematik dari plain text.
export const SceneFallback = () => (
  <div
    className="absolute inset-0 grid place-items-center overflow-hidden"
    style={{
      background:
        'linear-gradient(180deg, #0a0d18 0%, #1f2335 40%, #2a1f2a 70%, #3a2820 100%)',
    }}
  >
    {/* Shimmer line — gradient horizontal yang slide via CSS animation */}
    <div
      className="absolute inset-x-0 h-px top-1/2 opacity-60"
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(255,200,140,0.5), transparent)',
        animation: 'lorongShimmer 2.4s ease-in-out infinite',
      }}
    />
    <style>{`
      @keyframes lorongShimmer {
        0%, 100% { transform: translateX(-30%); opacity: 0.3; }
        50% { transform: translateX(30%); opacity: 0.7; }
      }
    `}</style>
    <div className="relative text-center -translate-y-2">
      <div className="text-white/55 text-[9px] uppercase tracking-[0.55em] mb-3">
        R1 · Petak Pertama
      </div>
      <div
        className="text-white/85 text-2xl"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontWeight: 300,
          letterSpacing: '0.01em',
        }}
      >
        Menyusun konstelasi...
      </div>
    </div>
  </div>
);

// Web Share fallback — kalau Web Share gak ada (desktop browsers
// terutama), copy URL ke clipboard + flash subtle confirmation. Pakai
// link absolute supaya share dari mobile bawa user ke r1, bukan root.
export const handleShare = async () => {
  const url = `${window.location.origin}/taman/r1`;
  const data = {
    title: 'Konstelasi Perjalanan',
    text: `${ELI_TIMELINE.length} perjalanan Eli, dirajut sebagai konstelasi di langit taman senja.`,
    url,
  };
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(data)) {
      await navigator.share(data);
      return;
    }
  } catch {
    /* user cancel / share denied — fallback ke clipboard */
  }
  try {
    await navigator.clipboard.writeText(url);
    // Subtle visual feedback via document title flash
    const orig = document.title;
    document.title = 'Link disalin ✓';
    setTimeout(() => { document.title = orig; }, 1400);
  } catch {
    /* clipboard blocked — give up gracefully */
  }
};

export const LorongHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 gap-2">
    <div className="pointer-events-auto">
      <Link
        to="/taman/peta"
        className="text-white/50 hover:text-white/85 text-[10px] sm:text-xs tracking-[0.2em] uppercase transition"
      >
        ← Peta Taman
      </Link>
    </div>
    {/* Hide center title on narrow screens — kompetisi dgn side links
        di < 480px bikin overflow + tampak crowded. Layar gede tetep
        keep judul di header. */}
    <div
      className="hidden sm:block text-white/85 text-sm tracking-wide"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      Konstelasi Perjalanan
    </div>
    <div className="pointer-events-auto flex items-center gap-3">
      <button
        type="button"
        onClick={handleShare}
        aria-label="Bagikan halaman ini"
        title="Bagikan"
        className="text-white/50 hover:text-white/85 transition flex items-center justify-center w-7 h-7"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>
      <Link
        to="/"
        className="text-white/50 hover:text-white/85 text-[10px] sm:text-xs tracking-[0.2em] uppercase transition"
      >
        Keluar →
      </Link>
    </div>
  </div>
);

// Cinematic intro title card — fade in saat first load, hold, fade
// out. Eyebrow + title Fraunces italic + poetic subtitle. Once done,
// removed dari DOM. User refresh untuk replay.
const INTRO_STORAGE_KEY = 'taman-r1-intro-seen';
export const IntroTitle = ({ isMobile = false }) => {
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    // Skip kalau user udah lihat di visit sebelumnya — gak ngulang
    // intro tiap kali masuk r1
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_STORAGE_KEY) === '1';
    } catch {
      /* storage blocked */
    }
    if (seen) {
      setRemoved(true);
      return undefined;
    }
    const t1 = setTimeout(() => setVisible(true), 350); // start fade in
    const t2 = setTimeout(() => setVisible(false), 5500); // start fade out
    const t3 = setTimeout(() => {
      setRemoved(true);
      try {
        localStorage.setItem(INTRO_STORAGE_KEY, '1');
      } catch {
        /* storage blocked */
      }
    }, 7800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  if (removed) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-[2200ms] ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Vignette gradient full-screen — darken edges supaya fokus
          ke center card */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d18]/45 via-transparent to-[#0a0d18]/45" />
      {/* Title card — solid bordered box dengan backdrop blur. Padding
          + text size responsive: di mobile sempit, text-5xl + px-14
          bikin overflow, dipotong jadi text-3xl + px-8. */}
      <div className="relative mx-6 px-8 py-9 sm:px-14 sm:py-12 -translate-y-6 rounded-md border border-white/15 bg-[#0a0d18]/85 backdrop-blur-md shadow-2xl">
        {/* Content */}
        <div className="relative text-center">
          <div className="text-white/60 text-[9px] sm:text-[10px] uppercase tracking-[0.45em] sm:tracking-[0.55em] mb-5 sm:mb-6">
            R1 · Petak Pertama
          </div>
          <h1
            className="text-white text-3xl sm:text-5xl mb-5 sm:mb-6 leading-[1.1]"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              fontWeight: 400,
              letterSpacing: '0.01em',
              textShadow: '0 0 40px rgba(255, 220, 160, 0.18)',
            }}
          >
            Konstelasi Perjalanan
          </h1>
          {/* Inner separator line antara title & subtitle */}
          <div className="mx-auto mb-5 w-12 h-px bg-white/30" />
          <div
            className="text-white/70 text-[13px] mb-6"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              letterSpacing: '0.02em',
            }}
          >
            {ELI_TIMELINE.length} perjalanan, dirajut menjadi konstelasi di atas taman senja.
          </div>
          {/* Inline tip — replace separate TutorialHint surface */}
          <div className="text-white/35 text-[9px] uppercase tracking-[0.3em]">
            {isMobile
              ? 'Ketuk bintang · Tatap langit untuk jalan di taman'
              : 'Klik bintang · Drag untuk berputar · Tatap langit untuk jalan'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile FPV controls overlay — joystick visual bottom-left + invisible
// touch zone full-screen. Touch left half = joystick movement, touch
// right half = swipe-look. Multi-touch via touch.identifier tracking.
export const MobileFPVControls = ({ joystickRef, lookRef }) => {
  const baseRef = useRef();
  const stickRef = useRef();
  const joyTouchId = useRef(null);
  const lookTouchId = useRef(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const baseRect = useRef({ cx: 0, cy: 0, r: 36 });

  useEffect(() => {
    const updateBaseRect = () => {
      if (baseRef.current) {
        const rect = baseRef.current.getBoundingClientRect();
        baseRect.current = {
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
          r: rect.width / 2 - 8,
        };
      }
    };
    updateBaseRect();
    window.addEventListener('resize', updateBaseRect);
    window.addEventListener('orientationchange', updateBaseRect);
    return () => {
      window.removeEventListener('resize', updateBaseRect);
      window.removeEventListener('orientationchange', updateBaseRect);
    };
  }, []);

  const handleTouchStart = (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const x = touch.clientX;
      const w = window.innerWidth;
      // Left 45% screen = joystick zone, right 55% = look swipe
      if (x < w * 0.45 && joyTouchId.current === null) {
        joyTouchId.current = touch.identifier;
      } else if (lookTouchId.current === null) {
        lookTouchId.current = touch.identifier;
        lookLast.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId.current) {
        const { cx, cy, r } = baseRect.current;
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > r) {
          dx = (dx / dist) * r;
          dy = (dy / dist) * r;
        }
        joystickRef.current.x = dx / r;
        joystickRef.current.y = -dy / r; // drag up = forward
        if (stickRef.current) {
          stickRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
      } else if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lookLast.current.x;
        const dy = touch.clientY - lookLast.current.y;
        lookRef.current.yaw -= dx * 0.005;
        lookRef.current.pitch -= dy * 0.005;
        lookRef.current.pitch = Math.max(-1.3, Math.min(1.3, lookRef.current.pitch));
        lookLast.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId.current) {
        joyTouchId.current = null;
        joystickRef.current.x = 0;
        joystickRef.current.y = 0;
        if (stickRef.current) {
          stickRef.current.style.transform = `translate(-50%, -50%)`;
        }
      } else if (touch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
      }
    }
  };

  return (
    <>
      {/* Full-screen invisible touch zone */}
      <div
        className="absolute inset-0 z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />
      {/* Joystick visual */}
      <div
        ref={baseRef}
        className="absolute bottom-8 left-8 w-20 h-20 rounded-full border-2 border-white/35 bg-black/30 backdrop-blur-sm pointer-events-none z-20"
      >
        <div
          ref={stickRef}
          className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full bg-white/45"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      </div>
      {/* Hint */}
      <div className="absolute bottom-32 left-8 text-white/40 text-[8px] uppercase tracking-[0.25em] pointer-events-none z-20 max-w-[140px]">
        Drag stick · Swipe kanan untuk menengadah
      </div>
    </>
  );
};

// Era guide HUD — panel kecil dengan 7 era list + color chip + count.
// Click chip → trigger spotlight: bintang dalam era pulse 4 detik
// supaya user gampang identifikasi mana yang mana di langit. Active
// era (lagi spotlight) di-highlight visual.
const ERA_GUIDE_STORAGE_KEY = 'taman-r1-guide-collapsed';
export const EraGuide = ({ trees, isMobile, onSpotlight, spotlightEra }) => {
  // Persistence: user bisa collapse panel kalau merasa intrusive.
  // Default collapsed di mobile (less screen real estate), expanded
  // di desktop. User can toggle either way, persisted.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(ERA_GUIDE_STORAGE_KEY);
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch {
      /* storage blocked */
    }
    // Initial default: collapsed di mobile, expanded di desktop
    return isMobile;
  });
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(ERA_GUIDE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage blocked */
      }
      return next;
    });
  };
  const grouped = useMemo(
    () =>
      ERA_DEFS.map((era) => ({
        ...era,
        stars: trees.filter(
          (t) => ERA_LOOKUP.get(t.id)?.eraDef.id === era.id,
        ),
      })),
    [trees],
  );
  return (
    <div
      className={`pointer-events-none absolute z-20 ${
        isMobile
          ? 'bottom-20 left-3 right-3 flex justify-center'
          : 'top-20 left-4'
      }`}
    >
      <div className="pointer-events-auto rounded-md border border-white/10 bg-[#0a0d18]/75 backdrop-blur-md shadow-xl">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-white/5 transition"
          aria-label={collapsed ? 'Buka panduan era' : 'Tutup panduan era'}
        >
          <span className="text-white/55 text-[8px] uppercase tracking-[0.3em]">
            Era
          </span>
          <span
            className="text-white/40 text-[10px] ml-auto"
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            ▾
          </span>
        </button>
        {!collapsed && (
          <div
            className={`px-2 pb-2 ${
              isMobile ? 'flex flex-wrap justify-center gap-1' : 'flex flex-col gap-0.5'
            }`}
          >
            {grouped.map((era) => {
              const isActive = spotlightEra === era.id;
              return (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => onSpotlight(era.id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-sm transition ${
                    isActive ? 'bg-white/12' : 'hover:bg-white/8'
                  }`}
                  aria-label={`Spotlight ${era.name} (${era.stars.length} bintang)`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: era.color,
                      boxShadow: isActive
                        ? `0 0 10px ${era.color}, 0 0 4px ${era.color}`
                        : `0 0 4px ${era.color}55`,
                    }}
                  />
                  <span
                    className="text-[10px] uppercase tracking-[0.16em] whitespace-nowrap"
                    style={{
                      color: isActive
                        ? era.color
                        : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {era.name}
                  </span>
                  <span className="text-[9px] text-white/35 tabular-nums ml-1">
                    {era.stars.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const LorongFooter = ({ hoveredTreeId, isMobile }) => {
  const hint = hoveredTreeId
    ? 'Klik untuk baca milestone'
    : isMobile
      ? `Ketuk salah satu bintang · ${ELI_TIMELINE.length} perjalanan di langit`
      : `Pilih bintang dari ${ELI_TIMELINE.length} perjalanan · drag untuk berputar langit`;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-center px-4 max-w-[90vw]">
      {hint}
    </div>
  );
};

// Format ISO date "YYYY-MM-DD" → "29 September 2018" untuk display.
// ELI_TIMELINE.period kadang full kalimat ("Single Rapsodi") jadi
// kita pakai date kalau ada, fallback ke period.
const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const formatFullDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${ID_MONTHS[m - 1]} ${y}`;
};

export const MilestoneOverlay = ({ tree, trees, onClose, onPrev, onNext }) => {
  useEffect(() => {
    if (!tree) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [tree]);

  // Keyboard nav — arrow left/right paginate, Esc close.
  useEffect(() => {
    if (!tree) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key === 'ArrowRight') onNext?.();
      else if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tree, onPrev, onNext, onClose]);

  if (!tree) return null;
  const total = trees?.length ?? 0;
  const idx = trees?.findIndex((t) => t.id === tree.id) ?? -1;
  const fullDate = formatFullDate(tree.date);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < total - 1;
  const eraDef = ERA_LOOKUP.get(tree.id)?.eraDef;
  const eraColor = eraDef?.color ?? '#ffffff';

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="relative bg-[#0e1018]/96 border border-white/10 rounded-2xl max-w-lg mx-6 w-[calc(100%-3rem)] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          // Era color tint subtle di background — 4% gradient dari atas
          background: `linear-gradient(180deg, ${eraColor}0c 0%, transparent 35%), #0e1018f5`,
        }}
      >
        {/* Top accent stripe — era color soft glow line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${eraColor}cc 50%, transparent 100%)`,
            boxShadow: `0 0 12px ${eraColor}99`,
          }}
        />

        <div className="px-7 sm:px-9 py-7 sm:py-8">
          {/* Header — era badge + date */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: eraColor,
                  boxShadow: `0 0 8px ${eraColor}`,
                }}
                aria-hidden="true"
              />
              <span
                className="text-[9px] uppercase tracking-[0.3em] font-medium"
                style={{ color: eraColor }}
              >
                {eraDef?.name ?? 'Era'}
              </span>
              <span className="text-white/25 text-[10px]">·</span>
              <span className="text-white/55 text-[9px] uppercase tracking-[0.25em]">
                {tree.badge}
              </span>
            </div>
            <span className="text-white/45 text-[10px] tabular-nums shrink-0 pt-0.5">
              {fullDate ?? tree.period}
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-white text-[26px] sm:text-[30px] leading-[1.15] mb-4"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              fontWeight: 400,
              letterSpacing: '0.005em',
            }}
          >
            {tree.title}
          </h2>

          {/* Subtle separator under title */}
          <div
            className="w-10 h-px mb-5"
            style={{ background: `${eraColor}66` }}
          />

          {/* Body */}
          <p className="text-white/72 text-[14px] leading-[1.6] mb-7">
            {tree.body}
          </p>

          {/* Counter */}
          {idx >= 0 && (
            <div className="text-center text-white/35 text-[9px] uppercase tracking-[0.3em] mb-4">
              Bintang ke-{idx + 1} dari {total}
            </div>
          )}

          {/* Progress dots grouped by era — 7 cluster, color per era.
              Active dot pakai era color + ring untuk emphasis. */}
          {total > 0 && (
            <div className="flex items-center justify-center gap-2 mb-7 flex-wrap">
              {ERA_DEFS.map((era, eraIdx) => {
                const eraStars = trees.filter((t) => t.eraId === era.id);
                if (eraStars.length === 0) return null;
                return (
                  <React.Fragment key={era.id}>
                    {eraIdx > 0 && (
                      <span
                        className="w-px h-2 bg-white/12"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center gap-1">
                      {eraStars.map((t) => {
                        const i = trees.findIndex((x) => x.id === t.id);
                        const active = t.id === tree.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (active) return;
                              if (i < idx) onPrev?.(i);
                              else onNext?.(i);
                            }}
                            aria-label={`${t.year} — ${t.title}`}
                            className="group p-1 -m-1"
                          >
                            <span
                              className={`block rounded-full transition-all ${
                                active ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'
                              }`}
                              style={{
                                background: active
                                  ? era.color
                                  : 'rgba(255,255,255,0.20)',
                                boxShadow: active
                                  ? `0 0 10px ${era.color}, 0 0 0 2px ${era.color}33`
                                  : 'none',
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Nav buttons — prev | close | next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => hasPrev && onPrev?.()}
              disabled={!hasPrev}
              className="w-11 h-11 rounded-full border border-white/15 text-white/65 text-base hover:bg-white/8 hover:border-white/35 hover:text-white/95 transition disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              aria-label="Bintang sebelumnya"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-white/25 text-white/85 text-[13px] hover:bg-white/8 hover:border-white/45 transition tracking-wide"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
              }}
            >
              Kembali ke konstelasi
            </button>
            <button
              type="button"
              onClick={() => hasNext && onNext?.()}
              disabled={!hasNext}
              className="w-11 h-11 rounded-full border border-white/15 text-white/65 text-base hover:bg-white/8 hover:border-white/35 hover:text-white/95 transition disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              aria-label="Bintang selanjutnya"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// 2D HUD overlay yang fade in saat monument signatureEvent active.
// Radial vignette darken edges + warm tint kasih kesan "moment" focus.
// Plus poetic confirmation text tampil ~3.5s di tengah bawah.
export const MonumentMomentOverlay = ({ active }) => {
  const [removed, setRemoved] = useState(true);
  useEffect(() => {
    if (active) {
      setRemoved(false);
      return undefined;
    }
    // Fade out → remove dari DOM after transition done
    const t = setTimeout(() => setRemoved(true), 1300);
    return () => clearTimeout(t);
  }, [active]);
  if (removed) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-25 transition-opacity duration-[1200ms] ease-out"
      style={{ opacity: active ? 1 : 0 }}
    >
      {/* Vignette tighten — radial gradient gelap di edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(20,12,5,0.45) 75%, rgba(20,12,5,0.78) 100%)',
        }}
      />
      {/* Warm amber tint subtle — kerasa kayak golden hour membungkus */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,170,80,0.04), rgba(255,140,60,0.07))',
          mixBlendMode: 'overlay',
        }}
      />
      {/* Poetic text di bottom-center — fade in setelah vignette settle */}
      <div
        className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center px-6"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          color: 'rgba(255,228,178,0.92)',
          fontSize: '15px',
          letterSpacing: '0.02em',
          textShadow: '0 0 10px rgba(0,0,0,0.7), 0 0 28px rgba(255,170,80,0.25)',
          animation: active ? 'monumentTextFade 5500ms ease-out forwards' : 'none',
          opacity: 0,
        }}
      >
        Kau sampai ke ujung.
      </div>
      <style>{`
        @keyframes monumentTextFade {
          0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
          18%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(-2px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

// Sync R3F state.clock.elapsedTime ke ref di parent component supaya
// click handler (yg di luar Canvas) bisa baca elapsed time saat trigger
// signature event. Tanpa ini, signatureTime jadi di domain Date.now()
// sementara useFrame di domain state.clock — campur 2 clock = ugly.
export const ClockSync = ({ clockRef }) => {
  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime;
  });
  return null;
};
