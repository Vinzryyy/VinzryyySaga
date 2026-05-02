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
const MAX_STAGE = 10;

const STAGES = [
  { id: 0, label: 'Bibit', icon: 'ri-seedling-line', detail: 'Bibit yang baru ditanam menunggu air pertama.' },
  { id: 1, label: 'Tunas', icon: 'ri-plant-line', detail: 'Tunas hijau pertama mulai mendongak ke matahari.' },
  { id: 2, label: 'Setek', icon: 'ri-plant-fill', detail: 'Daun-daun pertama membuka, akar mulai mencengkeram.' },
  { id: 3, label: 'Pohon Muda', icon: 'ri-mist-line', detail: 'Pohon muda dengan ranting pertama yang bercabang.' },
  { id: 4, label: 'Pohon Tumbuh', icon: 'ri-mist-fill', detail: 'Batang menebal, daun mulai melebar, bayangan teduh muncul.' },
  { id: 5, label: 'Pohon Dewasa', icon: 'ri-leaf-line', detail: 'Daun rimbun, batang kuat, siap menyambut musim semi.' },
  { id: 6, label: 'Pohon Kuat', icon: 'ri-leaf-fill', detail: 'Akar dalam, kanopi luas, tahan segala cuaca.' },
  { id: 7, label: 'Berbunga', icon: 'ri-flower-line', detail: 'Bunga aprikot mekar — Bloom in Spring.' },
  { id: 8, label: 'Berbuah', icon: 'ri-apple-line', detail: 'Buah aprikot matang siap dipanen.' },
  { id: 9, label: 'Pohon Penuh', icon: 'ri-sun-line', detail: 'Pohon penuh, kanopi terluas, panen melimpah.' },
  { id: 10, label: 'Pohon Megah', icon: 'ri-sparkling-2-fill', detail: 'Pohon megah dengan akar terlihat — komunitas membawanya sampai ke puncak. Terima kasih.' },
];

const LS_KEY = (dateStr) => `armeniaca-tree-support-${dateStr}`;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const hasSupportedToday = () => {
  try {
    return localStorage.getItem(LS_KEY(todayKey())) === '1';
  } catch {
    return false;
  }
};

const markSupportedToday = () => {
  try {
    localStorage.setItem(LS_KEY(todayKey()), '1');
  } catch {
    /* private mode — no-op */
  }
};

/**
 * Inline SVG tree that grows through 10 stages (0-10). Trunk thickens
 * and lengthens, branches multiply, foliage layers expand, blossoms
 * appear at stage 7, fruits at stage 8, and at the max stage the
 * tree gets a soft glow + visible roots to communicate "fully grown".
 *
 * Most numeric values are computed from `stage` so the growth reads
 * as continuous progression rather than discrete jumps.
 */
const TreeArt = ({ stage }) => {
  // Trunk dimensions scale with stage. height = how tall, width = how
  // thick. At stage 0/1 the trunk doesn't exist yet (sprout era).
  const trunkHeight = stage >= 2
    ? Math.min(170, 50 + (stage - 2) * 15) // 50 -> 170 across stages 2-10
    : 0;
  const trunkWidth = stage >= 2
    ? Math.min(28, 12 + (stage - 2) * 2) // 12 -> 28 across stages 2-10
    : 0;
  const trunkY = 280 - trunkHeight; // baseline for the canopy

  // Foliage radii scale up — bigger and bigger blobs.
  const foliageMain = stage >= 2 ? Math.min(78, 26 + (stage - 2) * 7) : 0;
  const foliageSide = stage >= 3 ? Math.min(56, 18 + (stage - 3) * 5) : 0;
  const foliageTop = stage >= 4 ? Math.min(48, 22 + (stage - 4) * 4) : 0;
  const foliageOuter = stage >= 6 ? Math.min(40, 22 + (stage - 6) * 5) : 0;

  return (
    <svg
      viewBox="0 0 320 360"
      className="w-full max-w-[420px] h-auto drop-shadow-[0_22px_36px_rgba(61,52,43,0.22)]"
      role="img"
      aria-label={`Pohon Eli stage ${stage} dari ${MAX_STAGE}`}
    >
      {/* Stage-10 glow — soft halo behind the canopy at full growth */}
      {stage >= MAX_STAGE && (
        <circle
          cx="160"
          cy={Math.max(120, trunkY - 30)}
          r="160"
          fill="var(--retro-gold)"
          opacity="0.18"
          style={{ transition: 'all 0.8s ease' }}
        />
      )}

      {/* Ground shadow */}
      <ellipse cx="160" cy="335" rx={130} ry="12" fill="#5C4A3A" opacity="0.2" />
      {/* Pot / soil mound */}
      <path
        d="M 80 322 Q 80 348 110 348 L 210 348 Q 240 348 240 322 L 234 308 L 86 308 Z"
        fill="var(--retro-brown)"
      />
      <ellipse cx="160" cy="308" rx="74" ry="8" fill="var(--retro-brown-dark)" />

      {/* Visible roots emerging from the pot at the strongest stages.
          Adds a "kuat" / firmly-rooted reading. */}
      {stage >= 6 && (
        <g
          stroke="var(--retro-brown-dark)"
          strokeWidth={Math.min(7, 4 + (stage - 6))}
          strokeLinecap="round"
          fill="none"
          opacity={Math.min(1, (stage - 5) * 0.25)}
          style={{ transition: 'all 0.8s ease' }}
        >
          <path d="M 130 312 Q 110 318 95 320" />
          <path d="M 190 312 Q 210 318 225 320" />
          {stage >= 8 && <path d="M 145 314 Q 130 326 110 332" />}
          {stage >= 8 && <path d="M 175 314 Q 190 326 210 332" />}
        </g>
      )}

      {/* Stage 0 — seed sitting on the soil */}
      {stage === 0 && (
        <g style={{ transition: 'opacity 0.6s ease' }}>
          <ellipse cx="160" cy="305" rx="6" ry="4" fill="var(--retro-burgundy)" />
          <ellipse cx="158" cy="304" rx="2" ry="1" fill="var(--retro-burgundy-light)" />
        </g>
      )}

      {/* Stage 1 — sprout: thin stem + two cotyledons */}
      {stage === 1 && (
        <g style={{ transition: 'opacity 0.6s ease' }}>
          <line x1="160" y1="305" x2="160" y2="265" stroke="var(--retro-brown-dark)" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="146" cy="270" rx="11" ry="5" fill="#7BA05B" transform="rotate(-30 146 270)" />
          <ellipse cx="174" cy="270" rx="11" ry="5" fill="#88AB66" transform="rotate(30 174 270)" />
          <ellipse cx="160" cy="258" rx="6" ry="4" fill="#9CC074" />
        </g>
      )}

      {/* Trunk (stage 2+) — thickens and lengthens with stage */}
      {stage >= 2 && (
        <>
          <rect
            x={160 - trunkWidth / 2}
            y={trunkY}
            width={trunkWidth}
            height={trunkHeight}
            rx={Math.min(6, trunkWidth / 4)}
            fill="var(--retro-brown-dark)"
            style={{ transition: 'all 0.7s ease' }}
          />
          {/* Trunk grain highlight */}
          <rect
            x={160 - trunkWidth / 2 + 2}
            y={trunkY + 4}
            width={Math.max(2, trunkWidth / 5)}
            height={trunkHeight - 6}
            fill="var(--retro-brown)"
            opacity="0.55"
            style={{ transition: 'all 0.7s ease' }}
          />
          {/* Bark detail at stronger stages */}
          {stage >= 5 && (
            <g
              stroke="var(--retro-brown)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={Math.min(0.7, (stage - 4) * 0.18)}
              style={{ transition: 'opacity 0.6s ease' }}
            >
              <line x1={160 - trunkWidth / 4} y1={trunkY + 30} x2={160 - trunkWidth / 4} y2={trunkY + 60} />
              <line x1={160 + trunkWidth / 4} y1={trunkY + 80} x2={160 + trunkWidth / 4} y2={trunkY + 110} />
              <line x1={160} y1={trunkY + 50} x2={160} y2={trunkY + 70} />
            </g>
          )}
        </>
      )}

      {/* Branches — appear at stage 3+, multiply at higher stages */}
      {stage >= 3 && (
        <g
          stroke="var(--retro-brown-dark)"
          strokeWidth={Math.min(6, 3 + Math.max(0, stage - 4))}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'all 0.7s ease' }}
        >
          <path d={`M 160 ${trunkY + 12} Q 130 ${trunkY} 110 ${trunkY - 18}`} />
          <path d={`M 160 ${trunkY + 12} Q 190 ${trunkY} 210 ${trunkY - 18}`} />
          {stage >= 5 && <path d={`M 160 ${trunkY + 36} Q 122 ${trunkY + 24} 96 ${trunkY + 8}`} />}
          {stage >= 5 && <path d={`M 160 ${trunkY + 36} Q 198 ${trunkY + 24} 224 ${trunkY + 8}`} />}
          {stage >= 7 && <path d={`M 160 ${trunkY - 4} Q 142 ${trunkY - 24} 130 ${trunkY - 38}`} />}
          {stage >= 7 && <path d={`M 160 ${trunkY - 4} Q 178 ${trunkY - 24} 190 ${trunkY - 38}`} />}
        </g>
      )}

      {/* Main canopy — central foliage blob */}
      {stage >= 2 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx="160" cy={trunkY - 8} r={foliageMain} fill="#5E7C3F" opacity="0.88" />
        </g>
      )}

      {/* Side foliage — appears stage 3+, grows wider */}
      {stage >= 3 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx={160 - foliageMain * 0.55} cy={trunkY - 4} r={foliageSide} fill="#7BA05B" opacity="0.85" />
          <circle cx={160 + foliageMain * 0.55} cy={trunkY - 4} r={foliageSide} fill="#7BA05B" opacity="0.85" />
        </g>
      )}

      {/* Top crown — stage 4+ */}
      {stage >= 4 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx="160" cy={trunkY - foliageMain * 0.7} r={foliageTop} fill="#88AB66" opacity="0.88" />
        </g>
      )}

      {/* Outer fluff — stage 6+ for the "kanopi luas" silhouette */}
      {stage >= 6 && (
        <g style={{ transition: 'all 0.8s ease' }}>
          <circle cx={160 - foliageMain * 0.85} cy={trunkY - foliageMain * 0.4} r={foliageOuter} fill="#9CC074" opacity="0.78" />
          <circle cx={160 + foliageMain * 0.85} cy={trunkY - foliageMain * 0.4} r={foliageOuter} fill="#9CC074" opacity="0.78" />
          <circle cx={160 - foliageMain * 0.45} cy={trunkY - foliageMain} r={foliageOuter * 0.85} fill="#9CC074" opacity="0.72" />
          <circle cx={160 + foliageMain * 0.45} cy={trunkY - foliageMain} r={foliageOuter * 0.85} fill="#9CC074" opacity="0.72" />
        </g>
      )}

      {/* Apricot blossoms — stage 7+ */}
      {stage >= 7 && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [128, -10], [148, -34], [172, -34], [192, -10],
            [160, -56], [108, 8], [212, 8], [136, 14], [184, 14],
            [160, -10], [96, -2], [224, -2], [124, -28], [196, -28],
          ].map(([dx, dy], i) => {
            const cx = dx + 32;
            const cy = trunkY + dy;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="6" fill="#F7D6E0" />
                <circle cx={cx} cy={cy} r="2.5" fill="var(--retro-gold)" />
              </g>
            );
          })}
        </g>
      )}

      {/* Apricot fruits — stage 8+ */}
      {stage >= 8 && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [102, 4], [220, 4], [128, -16], [192, -16], [160, -4],
            [110, -30], [210, -30], [148, 22], [172, 22], [88, -8], [232, -8],
          ].map(([dx, dy], i) => {
            const cx = dx + 32;
            const cy = trunkY + dy;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={stage >= MAX_STAGE ? 8 : 7} fill="var(--retro-gold)" />
                <ellipse cx={cx - 2} cy={cy - 2} rx="2.5" ry="2.5" fill="var(--retro-gold-light)" opacity="0.85" />
                <line
                  x1={cx}
                  y1={cy - (stage >= MAX_STAGE ? 8 : 7)}
                  x2={cx}
                  y2={cy - (stage >= MAX_STAGE ? 12 : 11)}
                  stroke="var(--retro-brown-dark)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <ellipse
                  cx={cx + 2}
                  cy={cy - (stage >= MAX_STAGE ? 8 : 7) - 2}
                  rx="3"
                  ry="2"
                  fill="#7BA05B"
                  transform={`rotate(35 ${cx + 2} ${cy - 9})`}
                />
              </g>
            );
          })}
        </g>
      )}

      {/* Sparkles around the fully grown tree */}
      {stage >= MAX_STAGE && (
        <g style={{ transition: 'opacity 0.8s ease' }}>
          {[
            [50, 80], [270, 90], [40, 200], [280, 210], [60, 160], [262, 150],
          ].map(([cx, cy], i) => (
            <g key={`sp-${i}`}>
              <path
                d={`M ${cx} ${cy - 5} L ${cx + 2} ${cy} L ${cx} ${cy + 5} L ${cx - 2} ${cy} Z`}
                fill="var(--retro-gold-light)"
                opacity="0.9"
              />
              <path
                d={`M ${cx - 5} ${cy} L ${cx} ${cy - 2} L ${cx + 5} ${cy} L ${cx} ${cy + 2} Z`}
                fill="var(--retro-gold-light)"
                opacity="0.9"
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
