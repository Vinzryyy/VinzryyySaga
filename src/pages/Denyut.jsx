/**
 * Denyut — Heartbeat Website.
 *
 * Visualisasi denyut kolektif: makin banyak orang online di /denyut,
 * makin cepat & kuat ritme detaknya. Background throb pelan ikut BPM,
 * hati besar di tengah scale-pulse, dan ECG line di bawah menggambar
 * sinyalnya. Caption: "project ini hidup karena banyak hati".
 *
 * Presence: Firebase RTDB /presence/{sessionId} dengan onDisconnect
 * cleanup. Live count via subscribe — render BPM = base + count * step,
 * dicap supaya gak liar di lonjakan.
 *
 * BPM formula:
 *   base 56 BPM (resting-ish), +3 per orang online, cap 132 BPM.
 *   Solo (count=1) cuma user sendiri → ritme tenang.
 *   Banyak hati → ritme deg-degan.
 *
 * Cycle timing: durasi 1 cycle = 60 / BPM detik. Animasi via CSS
 * variable yang di-update tiap render — keyframes pakai var(--beat).
 * Browser ngitung interpolasi sendiri, JS gak loop per frame.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import {
  joinPresence,
  subscribeToPresenceCount,
} from '../lib/presenceDb';

const BPM_BASE = 56;
const BPM_PER_HEART = 3;
const BPM_CAP = 132;

const calcBpm = (count) =>
  Math.min(BPM_CAP, BPM_BASE + Math.max(0, count) * BPM_PER_HEART);

// ECG/EKG path: P-Q-R-S-T wave shape. Width 100 unit, sampled di SVG
// viewBox 100x40. Stroke-dasharray + offset animasi bikin garis jalan
// dari kanan ke kiri (kayak monitor rumah sakit).
const ECG_PATH =
  'M0 20 L10 20 L14 18 L18 22 L22 8 L26 32 L30 20 L40 20 L44 19 L48 21 L52 20 L65 20 L69 18 L73 22 L77 8 L81 32 L85 20 L100 20';

// Anatomical jantung — bukan hati simetris ala valentine. Bentuk
// asimetris kayak organ asli: ventricle kiri (kanan layar) lebih
// bulk, apex condong ke bawah-kiri. Aorta arch + pulmonary trunk
// muncul di atas, dua vena di sisi. Coronary vessels (LAD + RCA)
// dilukis tipis di permukaan untuk detail organik.
const HeartIcon = () => (
  <svg
    viewBox="0 0 100 100"
    width="100%"
    height="100%"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <defs>
      <radialGradient id="heartGlow" cx="55%" cy="45%" r="65%">
        <stop offset="0%" stopColor="#ff9090" />
        <stop offset="40%" stopColor="#d04a4a" />
        <stop offset="85%" stopColor="#7a2020" />
        <stop offset="100%" stopColor="#4a1010" />
      </radialGradient>
      <radialGradient id="heartHighlight" cx="35%" cy="35%" r="40%">
        <stop offset="0%" stopColor="rgba(255,200,200,0.55)" />
        <stop offset="100%" stopColor="rgba(255,200,200,0)" />
      </radialGradient>
      <linearGradient id="aortaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#9a2828" />
        <stop offset="100%" stopColor="#c04545" />
      </linearGradient>
      <linearGradient id="pulmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6a3a55" />
        <stop offset="100%" stopColor="#a85575" />
      </linearGradient>
    </defs>

    {/* Vena cava superior — silinder dari atas-kanan masuk ke atrium */}
    <path
      d="M68 6 Q70 18 64 28"
      fill="none"
      stroke="#7a3a48"
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* Aorta arch — lengkungan ke kanan, lebih bulk drpd pulmonary */}
    <path
      d="M48 26 Q48 8 60 6 Q74 6 76 22 L74 36"
      fill="none"
      stroke="url(#aortaGrad)"
      strokeWidth="7"
      strokeLinecap="round"
    />
    {/* Pulmonary trunk — lebih kecil, ke kiri-atas */}
    <path
      d="M40 28 Q34 16 26 14"
      fill="none"
      stroke="url(#pulmGrad)"
      strokeWidth="5.5"
      strokeLinecap="round"
    />
    {/* Branch pulmonary kecil */}
    <path
      d="M30 18 Q24 16 20 22"
      fill="none"
      stroke="url(#pulmGrad)"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* Main ventricle body — asimetris, apex condong ke bawah-kiri.
        Curve disusun supaya kerasa organ, bukan symbol hati. */}
    <path
      d="M50 30
         Q32 24 22 38
         Q14 52 24 70
         Q34 86 44 92
         Q48 94 46 88
         Q42 78 44 70
         Q38 66 36 58
         Q44 64 50 62
         Q58 66 64 60
         Q66 70 62 78
         Q60 86 64 90
         Q76 80 80 64
         Q84 48 76 38
         Q66 28 56 32
         Q52 30 50 30 Z"
      fill="url(#heartGlow)"
      stroke="#3a0808"
      strokeWidth="0.6"
    />

    {/* Highlight — sheen kiri-atas biar kerasa volumetrik */}
    <ellipse
      cx="38"
      cy="46"
      rx="14"
      ry="10"
      fill="url(#heartHighlight)"
      opacity="0.7"
    />

    {/* Coronary arteries — LAD (left anterior descending) dari atas
        turun ke apex, RCA (right coronary) di sisi kanan. Tipis,
        warna lebih gelap supaya kerasa pembuluh di permukaan. */}
    <path
      d="M48 34 Q44 50 38 70 Q42 82 46 88"
      fill="none"
      stroke="#5a1010"
      strokeWidth="1.1"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M58 36 Q66 42 70 56 Q70 70 64 84"
      fill="none"
      stroke="#5a1010"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.65"
    />
    {/* Branch kecil dari LAD */}
    <path
      d="M42 56 Q36 60 32 66"
      fill="none"
      stroke="#5a1010"
      strokeWidth="0.7"
      strokeLinecap="round"
      opacity="0.55"
    />
  </svg>
);

const PresenceDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-300" />
  </span>
);

const Denyut = () => {
  const [count, setCount] = useState(0);
  const [joined, setJoined] = useState(false);

  // Join presence — register node + subscribe count.
  useEffect(() => {
    const session = joinPresence();
    setJoined(Boolean(session));
    const unsub = subscribeToPresenceCount((n) => setCount(n));
    return () => {
      unsub();
      if (session) session.leave();
    };
  }, []);

  const bpm = useMemo(() => calcBpm(count), [count]);
  // Period detik per cycle. CSS keyframes di-tied ke var.
  const period = (60 / bpm).toFixed(3);

  return (
    <main
      className="relative min-h-screen overflow-hidden select-none"
      style={{
        '--beat': `${period}s`,
        background:
          'radial-gradient(ellipse at center, #2a1418 0%, #150a0d 55%, #0a0507 100%)',
      }}
    >
      <Seo
        path="/denyut"
        title="Denyut — Heartbeat Website"
        description="Project ini hidup karena banyak hati. Tiap orang yang membuka halaman ini menambah satu detak ke ritme website."
      />

      {/* Subtle full-screen pulse — background throb lebih lambat
          (period * 2) supaya gak overpowering. Opacity layer di atas
          gradient base. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(220,80,90,0.18) 0%, transparent 60%)',
          animation: 'denyutBgPulse calc(var(--beat) * 2) ease-in-out infinite',
        }}
      />

      {/* Header */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-5 md:px-8 md:py-6">
        <div className="pointer-events-auto">
          <Link
            to="/"
            className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.2em] uppercase transition"
          >
            ← Keluar
          </Link>
        </div>
        <div className="text-center">
          <div className="text-white/45 text-[9px] md:text-[10px] uppercase tracking-[0.45em] mb-1">
            Heartbeat Website
          </div>
          <div
            className="text-white/85 text-sm md:text-base tracking-wide"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
            }}
          >
            Denyut
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <PresenceDot />
          <span className="text-white/60 text-[10px] md:text-xs tracking-wide tabular-nums">
            {count.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Central column */}
      <div className="relative z-[1] min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-32">
        {/* Heart — scale & glow pulse */}
        <div
          className="relative flex items-center justify-center mb-8"
          style={{
            animation: 'denyutHeartBeat var(--beat) ease-in-out infinite',
          }}
        >
          {/* Outer glow halo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -m-16 rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255,90,100,0.45) 0%, transparent 65%)',
              animation: 'denyutHaloPulse var(--beat) ease-in-out infinite',
            }}
          />
          {/* The heart itself */}
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 drop-shadow-[0_0_28px_rgba(255,90,100,0.55)]">
            <HeartIcon />
          </div>
        </div>

        {/* BPM + count caption */}
        <div className="text-center mb-10">
          <div
            className="text-white text-5xl sm:text-6xl md:text-7xl font-light tabular-nums leading-none"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              textShadow: '0 0 24px rgba(255,90,100,0.35)',
            }}
          >
            {bpm}
            <span className="text-base sm:text-lg ml-2 text-white/55 not-italic tracking-[0.2em] uppercase">
              bpm
            </span>
          </div>
          <p
            className="mt-5 text-white/80 text-base sm:text-lg md:text-xl leading-relaxed max-w-md mx-auto"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
            }}
          >
            {count <= 1 ? (
              <>
                Kamu satu-satunya yang sedang di sini.
                <br />
                <span className="text-white/55 text-sm not-italic tracking-wide">
                  Ritmenya tenang — tunggu hati lain bergabung.
                </span>
              </>
            ) : (
              <>
                <span className="text-rose-200 font-bold not-italic">
                  {count.toLocaleString('id-ID')} hati
                </span>{' '}
                berdetak bersama sekarang.
              </>
            )}
          </p>
        </div>

        {/* ECG line — drawn dgn stroke-dashoffset animation supaya
            kerasa "scrolling". Period sama dgn heart beat, jadi puncak
            QRS-nya sinkron dgn pulse hati. */}
        <div className="w-full max-w-2xl">
          <svg
            viewBox="0 0 100 40"
            className="w-full h-16 sm:h-20"
            preserveAspectRatio="none"
          >
            <path
              d={ECG_PATH}
              fill="none"
              stroke="rgba(255,120,130,0.85)"
              strokeWidth="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(255,90,100,0.6))',
                strokeDasharray: '100 100',
                animation:
                  'denyutEcgScroll calc(var(--beat) * 2) linear infinite',
              }}
            />
            {/* Baseline */}
            <line
              x1="0"
              y1="20"
              x2="100"
              y2="20"
              stroke="rgba(255,120,130,0.1)"
              strokeWidth="0.2"
            />
          </svg>
        </div>

        {/* Bottom narrative */}
        <div className="mt-12 text-center max-w-md mx-auto px-2">
          <p
            className="text-white/70 text-sm sm:text-base leading-relaxed"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
            }}
          >
            Project ini hidup karena banyak hati.
          </p>
          <div className="mx-auto mt-3 mb-3 w-10 h-px bg-white/20" />
          <p className="text-white/45 text-xs sm:text-[13px] leading-relaxed tracking-wide">
            Tiap orang yang membuka halaman ini menambah satu detak ke ritme
            website. Tutup tab — detakmu pergi. Buka lagi — kembali ke ritme.
          </p>
          {!joined && (
            <p className="mt-4 text-amber-200/65 text-[11px] tracking-wide">
              Mode offline — detak kamu belum tersinkron ke ritme global.
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes denyutHeartBeat {
          0%   { transform: scale(1); }
          14%  { transform: scale(1.14); }
          28%  { transform: scale(0.98); }
          42%  { transform: scale(1.09); }
          70%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        @keyframes denyutHaloPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          14%      { opacity: 0.95; transform: scale(1.08); }
          70%      { opacity: 0.55; transform: scale(1); }
        }
        @keyframes denyutBgPulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.95; }
        }
        @keyframes denyutEcgScroll {
          from { stroke-dashoffset: 200; }
          to   { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="denyutHeartBeat"], [class*="denyutHaloPulse"],
          [class*="denyutBgPulse"], [class*="denyutEcgScroll"] {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
};

export default Denyut;
