/**
 * EliTree — "Pohon untuk Eli" interactive growth gimmick.
 *
 * One support = +1 to the global RTDB counter. Every 100 supports the
 * tree advances one stage (0 = empty soil, 6 = fruiting apricot).
 *
 * Rate limiting: localStorage stamp keyed by today's date. One device
 * can support once per calendar day; trying again before midnight
 * shows a friendly "kembali besok" state. Persistence is best-effort
 * (private mode wipes it), so this is a UX guardrail, not abuse
 * protection — that lives in the RTDB security rules at deploy time.
 *
 * Falls back gracefully when Firebase env vars aren't set: the
 * component still renders, the tree stays at stage 0, and tapping
 * shows a "demo mode" message instead of crashing.
 */

import React, { useEffect, useState } from 'react';
import {
  subscribeToTreeSupports,
  incrementTreeSupports,
} from '../../lib/treeDb';
import { isFirebaseConfigured } from '../../lib/firebase';

const SUPPORTS_PER_STAGE = 100;
const MAX_STAGE = 6;

const STAGES = [
  { id: 0, label: 'Bibit', icon: 'ri-seedling-line', detail: 'Bibit yang baru ditanam menunggu air pertama.' },
  { id: 1, label: 'Tunas', icon: 'ri-plant-line', detail: 'Tunas hijau pertama mulai mendongak ke matahari.' },
  { id: 2, label: 'Setek', icon: 'ri-plant-fill', detail: 'Daun-daun pertama membuka, akar mulai mencengkeram.' },
  { id: 3, label: 'Pohon Muda', icon: 'ri-mist-line', detail: 'Pohon muda dengan ranting pertama yang bercabang.' },
  { id: 4, label: 'Pohon Dewasa', icon: 'ri-leaf-line', detail: 'Daun rimbun, batang kuat, siap menyambut musim semi.' },
  { id: 5, label: 'Berbunga', icon: 'ri-flower-line', detail: 'Bunga aprikot mekar — Bloom in Spring.' },
  { id: 6, label: 'Berbuah', icon: 'ri-apple-line', detail: 'Buah aprikot matang siap dipanen. Pohon penuh, terima kasih.' },
];

const LS_KEY = (dateStr) => `armeniaca-tree-support-${dateStr}`;

// Dev-mode bypass — when running `npm run dev` locally, the rate
// limit is skipped so the maintainer can mash the button to test
// stage progressions. Production builds always enforce 1×/day.
const RATE_LIMIT_BYPASSED = import.meta.env.DEV;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const hasSupportedToday = () => {
  if (RATE_LIMIT_BYPASSED) return false;
  try {
    return localStorage.getItem(LS_KEY(todayKey())) === '1';
  } catch {
    return false;
  }
};

const markSupportedToday = () => {
  if (RATE_LIMIT_BYPASSED) return;
  try {
    localStorage.setItem(LS_KEY(todayKey()), '1');
  } catch {
    /* private mode — no-op */
  }
};

/**
 * Inline SVG tree that swaps elements based on stage. Each layer
 * (trunk, foliage, flowers, fruits) reveals progressively. Smooth
 * CSS transition on opacity + transform makes the growth feel alive
 * when the count crosses a stage boundary.
 */
const TreeArt = ({ stage }) => {
  const trunk = stage >= 2;
  const branches = stage >= 3;
  const foliageSmall = stage >= 1;
  const foliageMedium = stage >= 3;
  const foliageLarge = stage >= 4;
  const flowers = stage >= 5;
  const fruits = stage >= 6;

  return (
    <svg
      viewBox="0 0 240 280"
      className="w-full max-w-[280px] h-auto drop-shadow-[0_18px_28px_rgba(61,52,43,0.18)]"
      role="img"
      aria-label={`Pohon Eli stage ${stage} dari ${MAX_STAGE}`}
    >
      {/* Ground / pot */}
      <ellipse cx="120" cy="262" rx="100" ry="10" fill="#5C4A3A" opacity="0.18" />
      <path
        d="M 70 250 Q 70 268 90 268 L 150 268 Q 170 268 170 250 L 165 240 L 75 240 Z"
        fill="var(--retro-brown)"
      />
      <ellipse cx="120" cy="240" rx="50" ry="6" fill="var(--retro-brown-dark)" />

      {/* Stage 0 — seed in soil. Stays as a small dot under the pot rim. */}
      <circle
        cx="120"
        cy="240"
        r="3"
        fill="var(--retro-burgundy)"
        opacity={stage === 0 ? 1 : 0}
        style={{ transition: 'opacity 0.6s ease' }}
      />

      {/* Sprout (stage 1) — small stem with two leaves */}
      <g
        opacity={stage === 1 ? 1 : 0}
        style={{ transition: 'opacity 0.6s ease' }}
      >
        <line x1="120" y1="240" x2="120" y2="215" stroke="var(--retro-brown-dark)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="111" cy="218" rx="8" ry="4" fill="#7BA05B" transform="rotate(-25 111 218)" />
        <ellipse cx="129" cy="218" rx="8" ry="4" fill="#88AB66" transform="rotate(25 129 218)" />
      </g>

      {/* Trunk + main canopy — stage 2+. Trunk grows taller per stage */}
      {trunk && (
        <>
          <rect
            x="113"
            y={240 - (stage >= 4 ? 110 : stage >= 3 ? 90 : 60)}
            width="14"
            height={stage >= 4 ? 110 : stage >= 3 ? 90 : 60}
            rx="3"
            fill="var(--retro-brown-dark)"
            style={{ transition: 'all 0.6s ease' }}
          />
          {/* Trunk highlight */}
          <rect
            x="115"
            y={240 - (stage >= 4 ? 110 : stage >= 3 ? 90 : 60)}
            width="3"
            height={stage >= 4 ? 110 : stage >= 3 ? 90 : 60}
            fill="var(--retro-brown)"
            opacity="0.6"
            style={{ transition: 'all 0.6s ease' }}
          />
        </>
      )}

      {/* Branches — stage 3+ */}
      {branches && (
        <g
          stroke="var(--retro-brown-dark)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'opacity 0.6s ease' }}
        >
          <path d="M 120 180 Q 100 170 88 155" />
          <path d="M 120 180 Q 140 170 152 155" />
          {stage >= 4 && <path d="M 120 165 Q 95 150 78 135" />}
          {stage >= 4 && <path d="M 120 165 Q 145 150 162 135" />}
        </g>
      )}

      {/* Foliage — three concentric blobs growing per stage. */}
      {foliageSmall && stage >= 2 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx="120" cy="170" r={stage >= 4 ? 56 : stage >= 3 ? 46 : 32} fill="#5E7C3F" opacity="0.85" />
        </g>
      )}
      {foliageMedium && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx="92" cy="155" r={stage >= 4 ? 38 : 26} fill="#7BA05B" opacity="0.85" />
          <circle cx="148" cy="155" r={stage >= 4 ? 38 : 26} fill="#7BA05B" opacity="0.85" />
        </g>
      )}
      {foliageLarge && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx="120" cy="125" r="32" fill="#88AB66" opacity="0.85" />
          <circle cx="78" cy="135" r="24" fill="#88AB66" opacity="0.7" />
          <circle cx="162" cy="135" r="24" fill="#88AB66" opacity="0.7" />
        </g>
      )}

      {/* Apricot blossoms — stage 5+ */}
      {flowers && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [95, 145], [110, 130], [135, 130], [150, 145],
            [120, 110], [85, 160], [155, 160], [105, 165], [135, 165],
            [120, 145], [78, 150], [162, 150],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="5" fill="#F7D6E0" />
              <circle cx={cx} cy={cy} r="2" fill="var(--retro-gold)" />
            </g>
          ))}
        </g>
      )}

      {/* Apricot fruits — stage 6 */}
      {fruits && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [98, 150], [142, 150], [120, 130], [85, 165], [155, 165],
            [108, 170], [132, 170], [120, 158],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="6" fill="var(--retro-gold)" />
              <ellipse cx={cx - 1.5} cy={cy - 1.5} rx="2" ry="2" fill="var(--retro-gold-light)" opacity="0.8" />
              <line
                x1={cx}
                y1={cy - 6}
                x2={cx}
                y2={cy - 9}
                stroke="var(--retro-brown-dark)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};

const EliTree = () => {
  const [count, setCount] = useState(0);
  const [supportedToday, setSupportedToday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'success'|'error', message }
  const [justAdvancedStage, setJustAdvancedStage] = useState(null);

  useEffect(() => {
    setSupportedToday(hasSupportedToday());
    const unsub = subscribeToTreeSupports(setCount);
    return unsub;
  }, []);

  const stage = Math.min(MAX_STAGE, Math.floor(count / SUPPORTS_PER_STAGE));
  const stageMeta = STAGES[stage];
  const isMaxStage = stage >= MAX_STAGE;
  const intoCurrentStage = count - stage * SUPPORTS_PER_STAGE;
  const progressPct = isMaxStage ? 100 : (intoCurrentStage / SUPPORTS_PER_STAGE) * 100;
  const supportsToNext = isMaxStage ? 0 : SUPPORTS_PER_STAGE - intoCurrentStage;

  const handleSupport = async () => {
    if (supportedToday || submitting) return;
    if (!isFirebaseConfigured) {
      setFeedback({
        kind: 'error',
        message:
          'Mode demo — Firebase belum dikonfigurasi. Dukungan tidak tersimpan sampai owner men-set env vars.',
      });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const prevStage = stage;
    const result = await incrementTreeSupports();
    setSubmitting(false);
    if (result.ok) {
      setSupportedToday(true);
      markSupportedToday();
      setFeedback({
        kind: 'success',
        message: 'Terima kasih! Dukunganmu sudah dikirim. Kembali besok untuk menyiram lagi 🌱',
      });
      const newStage = Math.min(MAX_STAGE, Math.floor((result.count || count + 1) / SUPPORTS_PER_STAGE));
      if (newStage > prevStage) {
        setJustAdvancedStage(newStage);
        setTimeout(() => setJustAdvancedStage(null), 5000);
      }
    } else {
      setFeedback({
        kind: 'error',
        message: result.error || 'Gagal mengirim dukungan, coba lagi sebentar lagi.',
      });
    }
  };

  return (
    <section
      aria-label="Pohon untuk Eli"
      className="relative px-5 sm:px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-gradient-to-b from-[color:var(--retro-bg-primary)] via-[color:var(--retro-bg-secondary)] to-[color:var(--retro-bg-primary)]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* LEFT — tree + counter */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-full flex justify-center">
              <TreeArt stage={stage} />
              {justAdvancedStage != null && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.3em] shadow-lg animate-[fadeIn_0.4s_ease-out]">
                  <i className="ri-sparkling-2-fill mr-1" />
                  Pohon naik level: {STAGES[justAdvancedStage]?.label}
                </div>
              )}
            </div>
            <div className="mt-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
                <i className={`${stageMeta.icon} text-base`} />
                {stageMeta.label} · Stage {stage}/{MAX_STAGE}
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-text-secondary)] max-w-xs mx-auto leading-snug">
                {stageMeta.detail}
              </p>
            </div>
          </div>

          {/* RIGHT — copy + counter + button */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Galeri Kebaikan · Live
            </p>
            <h2 className="font-header text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95]">
              Pohon untuk
              <span className="text-[color:var(--retro-burgundy)]"> Eli.</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-md">
              Tekan tombol di bawah untuk memberi 1 dukungan. Setiap 100 dukungan, pohonnya
              tumbuh ke tahap berikutnya — sampai berbunga dan berbuah aprikot. Satu orang
              hanya bisa menyiram 1× per hari, jadi kembalilah besok untuk menyiram lagi.
            </p>

            {/* Big counter */}
            <div className="mt-6 flex items-end gap-4 flex-wrap">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)] mb-1">
                  Dukungan Terkumpul
                </p>
                <p className="font-header text-6xl md:text-7xl font-black tabular-nums text-[color:var(--retro-burgundy)] leading-none">
                  {count}
                </p>
              </div>
              {!isMaxStage && (
                <p className="text-xs text-[color:var(--color-text-muted)] mb-2 font-bold">
                  +{supportsToNext} lagi menuju{' '}
                  <span className="text-[color:var(--retro-burgundy)] uppercase tracking-[0.2em] text-[10px] font-black">
                    {STAGES[stage + 1]?.label}
                  </span>
                </p>
              )}
            </div>

            {/* Progress bar to next stage */}
            <div className="mt-3 h-2 rounded-full bg-[color:var(--retro-burgundy)]/12 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[color:var(--retro-burgundy)] to-[color:var(--retro-gold)] transition-[width] duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={handleSupport}
              disabled={supportedToday || submitting}
              className={`mt-6 inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-bold text-sm uppercase tracking-widest transition-all shadow-lg ${
                supportedToday
                  ? 'bg-[color:var(--retro-brown-dark)]/15 text-[color:var(--color-text-muted)] cursor-default'
                  : submitting
                  ? 'bg-[color:var(--retro-burgundy)]/70 text-[color:var(--retro-cream)] cursor-wait'
                  : 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:-translate-y-0.5 hover:shadow-xl active:scale-95'
              }`}
            >
              {supportedToday ? (
                <>
                  <i className="ri-checkbox-circle-line text-lg" />
                  Sudah menyiram hari ini
                </>
              ) : submitting ? (
                <>
                  <i className="ri-loader-4-line text-lg animate-spin" />
                  Mengirim…
                </>
              ) : (
                <>
                  <i className="ri-water-flash-line text-lg" />
                  Beri 1 Dukungan
                </>
              )}
            </button>

            {feedback && (
              <p
                className={`mt-3 text-xs leading-snug ${
                  feedback.kind === 'success'
                    ? 'text-emerald-700'
                    : 'text-red-700'
                }`}
              >
                {feedback.message}
              </p>
            )}

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] inline-flex items-center gap-2">
              <i className="ri-time-line text-base" />
              Reset tiap tengah malam · 1 device · 1 dukungan / hari
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EliTree;
