/**
 * ByuTitipan — modul By-U Music di /byu-music.
 *
 * Fase 1 (sebelum 2026-06-15 00:00 WIB): kumpulkan dukungan.
 * Tombol "Saya menunggu" → increment Firebase counter (dedup
 * localStorage). Centerpiece: hati anatomis yg berdenyut, intensitas
 * glow naik per supporter. Plus countdown DD/HH/MM/SS.
 *
 * Fase 2 (15 Juni dan setelahnya): auto-reveal player. <audio> HTML5
 * dengan source FLAC (Chrome/Firefox/Edge desktop native; Safari iOS
 * < 17 mungkin tidak putar).
 *
 * URL override testing: ?force=release / ?force=preview.
 *
 * Reuse byuSupportDb.js Firebase wrapper.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  subscribeToByuSupportCount,
  incrementByuSupport,
} from '../../lib/byuSupportDb';

const RELEASE_ISO = '2026-06-15T00:00:00+07:00';
const RELEASE_DATE = new Date(RELEASE_ISO);
const AUDIO_URL = '/byUmusic/By-U%20-%20Putri%20Helisma%20(16%20BIT).flac';
const SUPPORT_CLICKED_KEY = 'byu-support-clicked';

// Stage progression — 5 stage mingguan dari 2026-05-11 (page launch) ke
// 2026-06-15 (rilis). Tiap minggu unlock satu layer anatomi heart +
// satu baris staff dgn notes. Trigger by calendar, bukan supporter count.
//
// Override testing: ?stage=N (1–5) di URL.
const STAGE_START_ISO = '2026-05-11T00:00:00+07:00';
const STAGE_START_DATE = new Date(STAGE_START_ISO);
const STAGE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const TOTAL_STAGES = 5;
const STAGE_INFO = [
  // index 0 unused; UI pakai stage 1–5
  null,
  { name: 'Sunyi', hint: 'Hati masih terkunci penuh, denyutnya bisu.' },
  { name: 'Bisikan', hint: 'Mata rantai mulai longgar, denyut pertama terdengar.' },
  { name: 'Sayup', hint: 'Rantai pelan-pelan lepas, melodi mulai terdengar.' },
  { name: 'Bernyanyi', hint: 'Gembok hampir lepas, suara semakin terang.' },
  { name: 'Siap Pulang', hint: 'Rantai hilang, lagu siap dibuka.' },
];

const computeStage = (nowMs) => {
  const elapsed = nowMs - STAGE_START_DATE.getTime();
  if (elapsed < 0) return 1;
  return Math.max(
    1,
    Math.min(TOTAL_STAGES, Math.floor(elapsed / STAGE_DURATION_MS) + 1),
  );
};

const formatNumber = (n) => n.toLocaleString('id-ID');

// Map raw Firebase errors ke pesan ramah-pengguna. Default fallback
// kalau pesan gak match pattern apa pun.
const friendlyError = (raw) => {
  if (!raw) return 'Gagal menyimpan dukungan.';
  const lower = String(raw).toLowerCase();
  if (lower.includes('permission_denied') || lower.includes('permission denied')) {
    return 'Belum bisa menyimpan dukungan. Coba lagi beberapa saat.';
  }
  if (lower.includes('network') || lower.includes('offline')) {
    return 'Koneksi terputus. Coba lagi setelah kembali online.';
  }
  return 'Gagal menyimpan dukungan. Coba lagi.';
};

const useCountdown = (target) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

// Love heart SVG — Valentine symmetric heart dgn glossy gradient.
// Stage progression: saturate filter ramp per stage (heart selalu
// fully visible, cuma warnanya yg jadi lebih hidup).
const AnatomicalHeartSvg = ({ stage = TOTAL_STAGES }) => {
  const saturate = 0.45 + (Math.min(stage, TOTAL_STAGES) - 1) * 0.18;
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{
        display: 'block',
        filter: `saturate(${saturate})`,
        transition: 'filter 800ms ease-out',
      }}
    >
      <defs>
        <linearGradient id="byuHeartFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff5060" />
          <stop offset="40%" stopColor="#e02030" />
          <stop offset="80%" stopColor="#a0101c" />
          <stop offset="100%" stopColor="#6a0810" />
        </linearGradient>
        <radialGradient id="byuHeartShine" cx="32%" cy="28%" r="32%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="50%" stopColor="rgba(255,200,210,0.35)" />
          <stop offset="100%" stopColor="rgba(255,200,210,0)" />
        </radialGradient>
        <linearGradient id="byuHeartShadow" x1="50%" y1="50%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(40,0,5,0.35)" />
        </linearGradient>
      </defs>

      {/* Valentine heart body — symmetric, slightly wider top. Curve
          control points biar shape-nya plump & glossy, kayak referensi
          user kasih. */}
      <path
        d="M 50 92 C 18 74 4 50 4 30 C 4 14 18 4 32 4 C 41 4 47 9 50 19 C 53 9 59 4 68 4 C 82 4 96 14 96 30 C 96 50 82 74 50 92 Z"
        fill="url(#byuHeartFill)"
        stroke="#3a0408"
        strokeWidth="0.6"
      />
      {/* Bottom shadow — kasih depth */}
      <path
        d="M 50 92 C 18 74 4 50 4 30 C 4 14 18 4 32 4 C 41 4 47 9 50 19 C 53 9 59 4 68 4 C 82 4 96 14 96 30 C 96 50 82 74 50 92 Z"
        fill="url(#byuHeartShadow)"
      />
      {/* Glossy shine highlight di kiri-atas */}
      <ellipse
        cx="32"
        cy="28"
        rx="13"
        ry="9"
        fill="url(#byuHeartShine)"
      />
      {/* Tiny extra reflection di kanan */}
      <ellipse
        cx="68"
        cy="22"
        rx="4"
        ry="2.5"
        fill="rgba(255,255,255,0.5)"
      />
    </svg>
  );
};

// Twinkling sparkles di sekeliling heart — gold star shapes yg
// scale-pulse on/off dgn stagger delay. Density naik per stage:
// stage 1 = 3 sparkles, stage 5 = 15. Bikin kerasa meriah baseline.
const SPARKLE_POSITIONS = [
  { x: -100, y: -40, delay: 0,    size: 6 },
  { x: 90,   y: -60, delay: 0.4,  size: 5 },
  { x: 110,  y: 20,  delay: 0.8,  size: 7 },
  { x: -80,  y: 50,  delay: 1.2,  size: 5 },
  { x: 70,   y: 90,  delay: 1.6,  size: 6 },
  { x: -120, y: 30,  delay: 2.0,  size: 5 },
  { x: 130,  y: 70,  delay: 0.6,  size: 6 },
  { x: -70,  y: -90, delay: 1.0,  size: 7 },
  { x: 0,    y: -110,delay: 1.4,  size: 5 },
  { x: 100,  y: -100,delay: 1.8,  size: 6 },
  { x: -110, y: -10, delay: 2.2,  size: 5 },
  { x: 50,   y: 110, delay: 0.2,  size: 7 },
  { x: -50,  y: 100, delay: 2.4,  size: 6 },
  { x: 120,  y: -30, delay: 1.5,  size: 5 },
  { x: -130, y: 60,  delay: 0.9,  size: 6 },
];
const Sparkles = ({ stage }) => {
  const count = Math.max(3, Math.min(15, (stage - 1) * 3 + 3));
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 top-1/2 pointer-events-none"
    >
      {SPARKLE_POSITIONS.slice(0, count).map((s, i) => (
        <svg
          key={i}
          width={s.size * 4}
          height={s.size * 4}
          viewBox="0 0 24 24"
          className="absolute"
          style={{
            left: s.x,
            top: s.y,
            transform: 'translate(-50%, -50%)',
            animation: 'byuSparkle 2.8s ease-in-out infinite',
            animationDelay: `${s.delay}s`,
            opacity: 0,
          }}
        >
          <path
            d="M12 2 L13.4 10.6 L22 12 L13.4 13.4 L12 22 L10.6 13.4 L2 12 L10.6 10.6 Z"
            fill="#e8b35a"
            stroke="rgba(255,210,140,0.8)"
            strokeWidth="0.5"
          />
        </svg>
      ))}
    </div>
  );
};

// Confetti rain — stage 5 only. 18 pieces (burgundy/gold/cream/pink)
// falling dari atas card area, rotating + drifting. Loop infinite
// supaya kerasa party kontinyu, bukan one-shot.
const CONFETTI_PIECES = [
  { x: -130, color: '#e85064', delay: 0,    dur: 5.2, rot: 12 },
  { x: -100, color: '#e8b35a', delay: 0.8,  dur: 6.0, rot: -18 },
  { x: -70,  color: '#f4d0a0', delay: 1.5,  dur: 5.5, rot: 8 },
  { x: -40,  color: '#8b4040', delay: 2.1,  dur: 6.4, rot: -22 },
  { x: -15,  color: '#e85064', delay: 0.3,  dur: 5.7, rot: 14 },
  { x: 10,   color: '#e8b35a', delay: 1.1,  dur: 6.2, rot: -10 },
  { x: 35,   color: '#f4a8c0', delay: 1.8,  dur: 5.3, rot: 18 },
  { x: 60,   color: '#e85064', delay: 2.4,  dur: 5.9, rot: -14 },
  { x: 90,   color: '#f4d0a0', delay: 0.6,  dur: 6.3, rot: 22 },
  { x: 120,  color: '#8b4040', delay: 1.3,  dur: 5.6, rot: -8 },
  { x: 150,  color: '#e8b35a', delay: 2.0,  dur: 6.1, rot: 16 },
  { x: -150, color: '#f4a8c0', delay: 0.4,  dur: 5.8, rot: -20 },
  { x: -85,  color: '#e85064', delay: 1.7,  dur: 5.4, rot: 10 },
  { x: 75,   color: '#e8b35a', delay: 2.6,  dur: 6.5, rot: -16 },
  { x: -25,  color: '#f4d0a0', delay: 0.9,  dur: 5.1, rot: 20 },
  { x: 45,   color: '#8b4040', delay: 1.4,  dur: 6.0, rot: -12 },
  { x: 105,  color: '#f4a8c0', delay: 2.2,  dur: 5.7, rot: 18 },
  { x: -115, color: '#e8b35a', delay: 1.9,  dur: 6.2, rot: -22 },
];
const ConfettiRain = () => (
  <div
    aria-hidden="true"
    className="absolute left-1/2 -top-16 w-[28rem] h-[24rem] pointer-events-none overflow-hidden -translate-x-1/2"
  >
    {CONFETTI_PIECES.map((c, i) => (
      <span
        key={i}
        className="absolute"
        style={{
          left: `calc(50% + ${c.x}px)`,
          top: 0,
          width: '7px',
          height: '11px',
          background: c.color,
          borderRadius: '1px',
          animation: `byuConfettiFall ${c.dur}s linear infinite`,
          animationDelay: `${c.delay}s`,
          '--byu-confetti-rot': `${c.rot * 30}deg`,
        }}
      />
    ))}
  </div>
);

// Music notes emitted dari pusat heart — melayang radial keluar atas
// kanan/kiri, scale-in, fade out di ujung. 7 notes dgn stagger delay
// sync ke beat period (tiap notes muncul ~per beat). Glyph variety
// utk feel musical: ♪♫♩♬♭♯. Cuma muncul saat intensity >= 0.3.
const NOTE_EMITTERS = [
  { ex: -130, ey: -90,  rot: -28, glyph: '♪', stagger: 0    },
  { ex: -70,  ey: -140, rot: -10, glyph: '♫', stagger: 0.55 },
  { ex: 25,   ey: -160, rot: 4,   glyph: '♩', stagger: 1.1  },
  { ex: 95,   ey: -135, rot: 18,  glyph: '♬', stagger: 1.65 },
  { ex: 140,  ey: -75,  rot: 30,  glyph: '♪', stagger: 2.2  },
  { ex: -140, ey: -50,  rot: -34, glyph: '♭', stagger: 2.75 },
  { ex: 60,   ey: -100, rot: 12,  glyph: '♯', stagger: 3.3  },
];
const EmittedNotes = ({ show }) => {
  if (!show) return null;
  return (
    <div aria-hidden="true" className="absolute left-1/2 top-1/2 pointer-events-none">
      {NOTE_EMITTERS.map((n, i) => (
        <span
          key={i}
          className="absolute text-[color:var(--retro-burgundy)]/55"
          style={{
            fontFamily: 'serif',
            fontSize: '20px',
            lineHeight: 1,
            '--byu-note-ex': `${n.ex}px`,
            '--byu-note-ey': `${n.ey}px`,
            '--byu-note-rot': `${n.rot}deg`,
            // dur = 3.5× beat period (semua note travel time sama),
            // staggered delays seamless emission stream.
            animation: 'byuNoteEmit calc(var(--byu-beat) * 3.5) ease-out infinite',
            animationDelay: `calc(var(--byu-beat) * ${n.stagger})`,
            opacity: 0,
          }}
        >
          {n.glyph}
        </span>
      ))}
    </div>
  );
};

// Chain & padlock overlay — realistic interlocking oval chain links,
// silver chrome. 5 main strands + 2 loose ends + center padlock.
//
// Stage progression: chains pecah DISCRETE per stage (bukan fade).
// Tiap minggu, satu strand putus & lenyap. Padlock juga progress:
// closed → cracked → shackle popped → falls off.
const CHAIN_STROKES = [
  { angle: 22, y: 30, x1: -14, x2: 114 },
  { angle: -28, y: 48, x1: -16, x2: 116 },
  { angle: 52, y: 60, x1: -12, x2: 112 },
  { angle: -56, y: 42, x1: -12, x2: 112 },
  { angle: 8, y: 72, x1: -14, x2: 114 },
];
const CHAIN_LOOSE_ENDS = [
  { x1: 95, y1: 78, x2: 122, y2: 92 },
  { x1: 5, y1: 18, x2: -20, y2: 10 },
];
// Berapa main strand visible per stage:
// 1→5, 2→4, 3→3, 4→1, 5→0
const STRAND_COUNT_BY_STAGE = [0, 5, 4, 3, 1, 0];
const LOOSE_COUNT_BY_STAGE = [0, 2, 2, 1, 0, 0];

// Render N oval links sepanjang strand horizontal x1→x2 at y. Alternate
// rotation 0°/90° untuk interlocking effect. Caller wraps dgn rotate(angle).
const renderHorizontalChainLinks = (x1, y, x2, keyPrefix) => {
  const spacing = 4.6;
  const linkRx = 2.7;
  const linkRy = 1.55;
  const total = x2 - x1;
  const n = Math.max(2, Math.floor(total / spacing));
  const step = total / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const cx = x1 + (i + 0.5) * step;
    const isPerp = i % 2 === 1;
    out.push(
      <g
        key={`${keyPrefix}-${i}`}
        transform={`translate(${cx} ${y}) rotate(${isPerp ? 90 : 0})`}
      >
        {/* Link body — outline only, supaya kerasa loop terbuka. */}
        <ellipse
          cx="0" cy="0"
          rx={linkRx} ry={linkRy}
          fill="none"
          stroke="url(#byuChain)"
          strokeWidth="0.85"
        />
        {/* Inner shadow di bawah link — depth */}
        <path
          d={`M ${-linkRx + 0.5} ${linkRy - 0.3} A ${linkRx - 0.5} ${linkRy - 0.3} 0 0 0 ${linkRx - 0.5} ${linkRy - 0.3}`}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.4"
        />
        {/* Top highlight di atas link — chrome shine */}
        <path
          d={`M ${-linkRx + 0.6} ${-linkRy + 0.4} A ${linkRx - 0.6} ${linkRy - 0.4} 0 0 1 ${linkRx - 0.6} ${-linkRy + 0.4}`}
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="0.45"
        />
      </g>,
    );
  }
  return out;
};

// Render N oval links sepanjang loose end (x1,y1)→(x2,y2). Compute
// segment angle internally, alternate orientation. Tail end dapet
// ring kecil utk hint "loose link".
const renderLooseChainLinks = (x1, y1, x2, y2, keyPrefix) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const segAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const spacing = 4.6;
  const linkRx = 2.7;
  const linkRy = 1.55;
  const n = Math.max(2, Math.floor(length / spacing));
  const step = 1 / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * step;
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    const isPerp = i % 2 === 1;
    out.push(
      <g
        key={`${keyPrefix}-${i}`}
        transform={`translate(${cx} ${cy}) rotate(${segAngle + (isPerp ? 90 : 0)})`}
      >
        <ellipse cx="0" cy="0" rx={linkRx} ry={linkRy} fill="none" stroke="url(#byuChain)" strokeWidth="0.85" />
        <path d={`M ${-linkRx + 0.5} ${linkRy - 0.3} A ${linkRx - 0.5} ${linkRy - 0.3} 0 0 0 ${linkRx - 0.5} ${linkRy - 0.3}`} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.4" />
        <path d={`M ${-linkRx + 0.6} ${-linkRy + 0.4} A ${linkRx - 0.6} ${linkRy - 0.4} 0 0 1 ${linkRx - 0.6} ${-linkRy + 0.4}`} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.45" />
      </g>,
    );
  }
  // Tail ring di ujung loose — link terakhir yg dangling.
  out.push(
    <ellipse
      key={`${keyPrefix}-tail`}
      cx={x2} cy={y2}
      rx="2.6" ry="2.6"
      fill="none"
      stroke="url(#byuChain)"
      strokeWidth="1.1"
    />,
  );
  return out;
};

const ChainOverlay = ({ stage }) => {
  if (stage >= TOTAL_STAGES) return null; // stage 5 = no chain, no lock
  const strandCount = STRAND_COUNT_BY_STAGE[stage] || 0;
  const looseCount = LOOSE_COUNT_BY_STAGE[stage] || 0;
  // Padlock state per stage:
  //   1-2: locked & intact
  //   3:   keyhole glowing (kunci mulai masuk)
  //   4:   shackle popped open (terlepas dari body, miring)
  const shackleOpen = stage === 4;
  const keyholeGlow = stage >= 3;
  return (
    <svg
      aria-hidden="true"
      viewBox="-22 -22 144 144"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 sm:w-72 sm:h-72 pointer-events-none z-10"
      style={{
        filter: 'drop-shadow(0 1.5px 2.5px rgba(0,0,0,0.55))',
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Silver chrome gradient — chain link stroke */}
        <linearGradient id="byuChain" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f0f1f4" />
          <stop offset="35%" stopColor="#b4b7bd" />
          <stop offset="55%" stopColor="#7a7d83" />
          <stop offset="100%" stopColor="#c8ccd0" />
        </linearGradient>
        <linearGradient id="byuLock" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dadde2" />
          <stop offset="35%" stopColor="#9a9da3" />
          <stop offset="70%" stopColor="#6a6d73" />
          <stop offset="100%" stopColor="#4a4d53" />
        </linearGradient>
        <linearGradient id="byuShackle" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c8ccd0" />
          <stop offset="50%" stopColor="#7a7d83" />
          <stop offset="100%" stopColor="#5a5d63" />
        </linearGradient>
      </defs>

      {/* Main strands — sliced per stage. Tiap minggu hilang
          satu, sampai stage 5 (0 strand). */}
      {CHAIN_STROKES.slice(0, strandCount).map((c, i) => (
        <g key={`strand-${i}`} transform={`rotate(${c.angle} 50 50)`}>
          {renderHorizontalChainLinks(c.x1, c.y, c.x2, `s${i}`)}
        </g>
      ))}

      {/* Loose ends — juga reduced per stage */}
      {CHAIN_LOOSE_ENDS.slice(0, looseCount).map((c, i) => (
        <g key={`loose-${i}`}>
          {renderLooseChainLinks(c.x1, c.y1, c.x2, c.y2, `l${i}`)}
        </g>
      ))}

      {/* Padlock di pusat — stage 1-4 visible, stage 5 hilang.
          Shackle states:
          - stage 1-3: closed (U-bar nempel body)
          - stage 4:   popped — shackle rotate 65° dari kiri (lepas
            dari sisi kanan body), kerasa kayak baru meledak. */}
      <g transform="translate(50, 56)">
        {/* Body (rendered first, di bawah shackle) */}
        <rect
          x="-11" y="-4"
          width="22" height="17"
          rx="2.4"
          fill="url(#byuLock)"
          stroke="#3a3d43"
          strokeWidth="0.45"
        />
        <rect
          x="-11" y="9"
          width="22" height="4"
          rx="2.4"
          fill="rgba(0,0,0,0.18)"
        />
        <rect
          x="-9" y="-2.5"
          width="4" height="10"
          rx="1.2"
          fill="rgba(255,255,255,0.5)"
        />

        {/* Shackle group — rotate sebagai unit kalau popped */}
        <g
          style={{
            transform: shackleOpen
              ? 'rotate(-58deg) translate(-3px, -1px)'
              : 'none',
            transformOrigin: '-8px -4px',
            transition: 'transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <path
            d="M-8 -4 Q-8 -16 0 -16 Q8 -16 8 -4"
            fill="none"
            stroke="url(#byuShackle)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M-8 -4 Q-8 -16 0 -16 Q8 -16 8 -4"
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </g>

        {/* Keyhole — stage 3+ glow kuning hangat (kunci mulai masuk) */}
        <circle
          cx="0" cy="2.5" r="2.1"
          fill={keyholeGlow ? '#3a1f08' : '#0e1116'}
        />
        {keyholeGlow && (
          <circle
            cx="0" cy="2.5" r="1.4"
            fill="#e8b35a"
            style={{
              filter: 'drop-shadow(0 0 3px rgba(232,179,90,0.85))',
            }}
          />
        )}
        <path
          d="M -0.8 2.5 L -1.4 9 L 1.4 9 L 0.8 2.5 Z"
          fill={keyholeGlow ? '#5a3010' : '#0e1116'}
        />
      </g>
    </svg>
  );
};

// Musical staff (5 baris) di belakang heart, dgn notes posisional yg
// tumbuh per stage. Stage-by-stage:
//   1 — 0 baris, 0 notes (kosong)
//   2 — 1 baris (tengah), 2 notes
//   3 — 3 baris, 4 notes
//   4 — 4 baris, 7 notes
//   5 — 5 baris (full staff), 11 notes
// Notes static (gak animated) — kerasa kayak "lagu yg udah terkumpul"
// sambil heart pusat masih emit live notes. Posisi notes deterministic.
const STAFF_LINE_POS = [22, 36, 50, 64, 78]; // y dalam viewBox 0..100
const STAFF_NOTES = [
  { x: 85, y: 50, glyph: '♪' },
  { x: 315, y: 50, glyph: '♫' },
  { x: 70, y: 36, glyph: '♩' },
  { x: 330, y: 64, glyph: '♬' },
  { x: 120, y: 22, glyph: '♪' },
  { x: 280, y: 78, glyph: '♫' },
  { x: 105, y: 64, glyph: '♩' },
  { x: 295, y: 36, glyph: '♬' },
  { x: 140, y: 78, glyph: '♪' },
  { x: 260, y: 22, glyph: '♫' },
  { x: 155, y: 50, glyph: '♭' },
];
const STAGE_TO_LINES = [0, 0, 1, 3, 4, 5]; // index = stage
const STAGE_TO_NOTES = [0, 0, 2, 4, 7, 11];
const StaffWithNotes = ({ stage }) => {
  const numLines = STAGE_TO_LINES[stage] ?? 0;
  const numNotes = STAGE_TO_NOTES[stage] ?? 0;
  if (numLines === 0 && numNotes === 0) return null;
  // Pick baris paling tengah-luar dulu: stage 2 (1 baris) ambil index 2
  // (middle), stage 3 (3 baris) ambil index 1,2,3, dst.
  const sliceLines = () => {
    if (numLines === 5) return STAFF_LINE_POS;
    if (numLines === 4) return STAFF_LINE_POS.slice(0, 4);
    if (numLines === 3) return STAFF_LINE_POS.slice(1, 4);
    if (numLines === 1) return [STAFF_LINE_POS[2]];
    return [];
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[24rem] sm:w-[28rem] h-32 sm:h-36 -z-[1]"
    >
      {sliceLines().map((y, i) => (
        <line
          key={`line-${i}`}
          x1="20"
          y1={y}
          x2="380"
          y2={y}
          stroke="rgba(139,64,64,0.22)"
          strokeWidth="0.6"
          style={{ transition: 'opacity 600ms ease-out' }}
        />
      ))}
      {STAFF_NOTES.slice(0, numNotes).map((n, i) => (
        <text
          key={`note-${i}`}
          x={n.x}
          y={n.y + 4}
          fill="rgba(139,64,64,0.45)"
          fontSize="14"
          fontFamily="serif"
          textAnchor="middle"
          style={{
            transition: 'opacity 800ms ease-out',
            animation: `byuStaffNoteIn 800ms ease-out ${i * 100}ms both`,
          }}
        >
          {n.glyph}
        </text>
      ))}
    </svg>
  );
};

// Centerpiece beating heart. `intensity` (0–1) scales halo glow + ripple
// rings + floating notes density, `period` (CSS time) controls speed.
//
// Animasi pakai LUB-DUB two-stage (mirror cardiac sound):
//   8%  lub — sharp uptick (AV valves close, systole start)
//   22% relax dip
//   36% dub — softer second peak (semilunar close, systole end)
//   60% rest
// Lebih anatomis dari single PQRST spike, kerasa "double-thump" beneran.
//
// Layered visuals dari luar ke dalam:
//   - Outer halo blur (warm red ambient)
//   - 3 concentric ripple rings (expanding ring waves)
//   - Heart SVG body (scale beat)
//   - Inner hot core (pulse opacity sync lub — kerasa "darah dipompa")
//   - Specular sheen highlight (overlay, brightens at lub)
const BeatingHeart = ({ intensity = 0.5, period = '1.1s', stage = TOTAL_STAGES }) => {
  const haloOpacity = 0.4 + intensity * 0.5;
  const coreOpacity = 0.45 + intensity * 0.45;
  // Notes emit hanya kalau stage >= 2 — di stage 1 (Sunyi) heart masih
  // bisu. Stage 2+ baru ada notes keluar.
  const showNotes = stage >= 2 && intensity >= 0.3;
  return (
    <div
      className="relative flex items-center justify-center mb-8 min-h-[14rem] sm:min-h-[15rem]"
      style={{ '--byu-beat': period }}
    >
      <StaffWithNotes stage={stage} />
      <EmittedNotes show={showNotes} />
      <Sparkles stage={stage} />
      {stage >= TOTAL_STAGES && <ConfettiRain />}

      {/* Light rays — muncul stage 5 only. 12 sinar memancar dari pusat
          heart, kerasa "lepas / siap pulang". Slow rotation supaya
          kerasa hidup. */}
      {stage >= TOTAL_STAGES && (
        <div
          aria-hidden="true"
          className="absolute w-72 h-72 sm:w-80 sm:h-80 pointer-events-none"
          style={{ animation: 'byuRaysRotate 22s linear infinite' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="byuRay" x1="50%" y1="50%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,180,180,0)" />
                <stop offset="40%" stopColor="rgba(255,180,180,0.15)" />
                <stop offset="100%" stopColor="rgba(255,200,210,0)" />
              </linearGradient>
            </defs>
            {Array.from({ length: 12 }).map((_, i) => (
              <polygon
                key={i}
                points="50,50 49,8 51,8"
                fill="url(#byuRay)"
                transform={`rotate(${i * 30} 50 50)`}
              />
            ))}
          </svg>
        </div>
      )}

      {/* Concentric ripple rings — expand outward + fade dgn rhythm
          beat. 3 rings dgn stagger delay supaya kontinyu. */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-[color:var(--retro-burgundy)]/35 pointer-events-none"
          style={{
            animation: 'byuRipple calc(var(--byu-beat) * 3) ease-out infinite',
            animationDelay: `calc(var(--byu-beat) * ${i})`,
            opacity: 0,
          }}
        />
      ))}

      <div
        aria-hidden="true"
        className="absolute inset-0 -m-12 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(180,40,55,${haloOpacity}) 0%, transparent 65%)`,
          animation:
            'byuHaloPulse var(--byu-beat) ease-in-out infinite, byuHaloHue 14s linear infinite',
        }}
      />

      <div
        className="relative w-44 h-44 sm:w-52 sm:h-52"
        style={{
          animation:
            'byuHeartBeat var(--byu-beat) ease-in-out infinite, byuHeartShadow var(--byu-beat) ease-in-out infinite',
        }}
      >
        <AnatomicalHeartSvg stage={stage} />

        {/* Inner hot core — gloss merah cerah di tengah-bawah heart
            yg pulse opacity + scale sync lub. Mix-blend screen di-
            bypass karena bg bukan transparent; pakai positioning
            absolute di tengah body heart (offset ke kanan-bawah krn
            heart asimetris, apex condong kiri-bawah). */}
        <div
          aria-hidden="true"
          className="absolute left-[44%] top-[52%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full blur-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(255,110,110,${coreOpacity}) 0%, rgba(220,60,70,${coreOpacity * 0.5}) 45%, transparent 75%)`,
            animation: 'byuCorePulse var(--byu-beat) ease-in-out infinite',
          }}
        />

        {/* Specular sheen highlight — overlay terang yg shift posisi
            tipis + brightens saat lub. Kasih kerasa permukaan otot
            yg basah / glossy, bukan flat. */}
        <div
          aria-hidden="true"
          className="absolute left-[28%] top-[32%] w-16 h-10 rounded-full blur-md pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(255,210,210,0.65) 0%, transparent 75%)',
            animation: 'byuSheen var(--byu-beat) ease-in-out infinite',
          }}
        />
      </div>

      {/* Chain & padlock — sibling heart wrapper (gak ikut beat-pulse),
          tampil di atas semua layer heart. Hati "terkurung" rantai
          rigid yg pelan-pelan lepas tiap minggu. */}
      <ChainOverlay stage={stage} />

      <style>{`
        @keyframes byuHeartBeat {
          0%   { transform: scale(1); }
          8%   { transform: scale(1.14); }
          22%  { transform: scale(0.99); }
          36%  { transform: scale(1.07); }
          60%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        @keyframes byuHeartShadow {
          0%, 100% { filter: drop-shadow(0 4px 18px rgba(139,30,40,0.35)); }
          8%       { filter: drop-shadow(0 8px 28px rgba(180,40,55,0.6)); }
          36%      { filter: drop-shadow(0 6px 22px rgba(160,35,50,0.5)); }
          60%      { filter: drop-shadow(0 4px 18px rgba(139,30,40,0.35)); }
        }
        @keyframes byuHaloPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          8%       { opacity: 0.98; transform: scale(1.08); }
          36%      { opacity: 0.78; transform: scale(1.03); }
          60%      { opacity: 0.55; transform: scale(1); }
        }
        @keyframes byuCorePulse {
          0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(0.92); }
          8%       { opacity: 1;    transform: translate(-50%, -50%) scale(1.18); }
          22%      { opacity: 0.5;  transform: translate(-50%, -50%) scale(0.98); }
          36%      { opacity: 0.8;  transform: translate(-50%, -50%) scale(1.08); }
          60%      { opacity: 0.35; transform: translate(-50%, -50%) scale(0.92); }
        }
        @keyframes byuSheen {
          0%, 100% { opacity: 0.55; transform: translate(0, 0); }
          8%       { opacity: 0.95; transform: translate(-2px, -1px); }
          36%      { opacity: 0.75; transform: translate(1px, 0); }
          60%      { opacity: 0.55; transform: translate(0, 0); }
        }
        @keyframes byuRipple {
          0%   { transform: scale(1); opacity: 0.55; }
          80%  { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes byuStaffNoteIn {
          0%   { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes byuRaysRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes byuSparkle {
          0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0) rotate(0deg); }
          50%      { opacity: 0.92; transform: translate(-50%, -50%) scale(1.15) rotate(45deg); }
        }
        @keyframes byuConfettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 0.95; }
          90%  { opacity: 0.85; }
          100% { transform: translateY(380px) rotate(var(--byu-confetti-rot, 540deg)); opacity: 0; }
        }
        @keyframes byuHaloHue {
          0%   { filter: hue-rotate(0deg); }
          50%  { filter: hue-rotate(-20deg); }
          100% { filter: hue-rotate(0deg); }
        }
        @keyframes byuNoteEmit {
          0%   {
            transform: translate(0, 0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          12%  {
            transform: translate(
              calc(var(--byu-note-ex) * 0.18),
              calc(var(--byu-note-ey) * 0.18)
            ) scale(1.1) rotate(calc(var(--byu-note-rot) * 0.2));
            opacity: 0.85;
          }
          60%  {
            transform: translate(
              calc(var(--byu-note-ex) * 0.7),
              calc(var(--byu-note-ey) * 0.7)
            ) scale(1) rotate(calc(var(--byu-note-rot) * 0.7));
            opacity: 0.55;
          }
          100% {
            transform: translate(var(--byu-note-ex), var(--byu-note-ey))
                       scale(0.85) rotate(var(--byu-note-rot));
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="byuHeartBeat"], [class*="byuHeartShadow"],
          [class*="byuHaloPulse"], [class*="byuCorePulse"],
          [class*="byuSheen"], [class*="byuRipple"],
          [class*="byuNoteEmit"], [class*="byuStaffNoteIn"],
          [class*="byuRaysRotate"], [class*="byuSparkle"],
          [class*="byuConfettiFall"], [class*="byuHaloHue"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

const CountdownDisplay = ({ days, hours, minutes, seconds }) => {
  const units = [
    { v: days, label: 'hari', key: 'd' },
    { v: hours, label: 'jam', key: 'h' },
    { v: minutes, label: 'menit', key: 'm' },
    { v: seconds, label: 'detik', key: 's' },
  ];
  return (
    <div className="flex items-stretch justify-center gap-3 sm:gap-5 mb-8">
      {units.map((u, i) => (
        <React.Fragment key={u.key}>
          <div className="text-center min-w-[56px] sm:min-w-[72px]">
            {/* key=u.v memaksa re-mount setiap nilai berubah supaya
                animation tick replay — detik = tiap detik. */}
            <div
              key={u.v}
              className="font-header text-3xl sm:text-5xl font-black tabular-nums leading-none text-[color:var(--retro-burgundy)]"
              style={{ animation: 'byuTick 380ms ease-out' }}
            >
              {String(u.v).padStart(2, '0')}
            </div>
            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-2 text-[color:var(--retro-burgundy)]/55">
              {u.label}
            </div>
          </div>
          {i < units.length - 1 && (
            <div
              aria-hidden="true"
              className="self-start mt-2 sm:mt-3 font-header text-2xl sm:text-4xl text-[color:var(--retro-burgundy)]/20 leading-none select-none"
            >
              :
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const PreReleaseView = ({ supporters, stage = TOTAL_STAGES }) => {
  const { days, hours, minutes, seconds } = useCountdown(RELEASE_DATE);
  const [hasClicked, setHasClicked] = useState(() => {
    try {
      return localStorage.getItem(SUPPORT_CLICKED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Acknowledgment beat — saat klik berhasil, heart denyut lebih cepat
  // + intensity penuh selama 2s. Kasih feedback fisik bahwa input
  // ke-record, sebelum return ke ritme tenang.
  const [justClicked, setJustClicked] = useState(false);

  const handleClick = async () => {
    if (hasClicked || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await incrementByuSupport();
    setSubmitting(false);
    if (result.ok) {
      try {
        localStorage.setItem(SUPPORT_CLICKED_KEY, '1');
      } catch {
        /* storage blocked */
      }
      setHasClicked(true);
      setJustClicked(true);
      setTimeout(() => setJustClicked(false), 2200);
    } else {
      setError(friendlyError(result.error));
    }
  };

  // Intensity driven by stage utama — supporters cuma kasih boost
  // kecil di atas baseline stage. Stage 1 = 0.2 (heart pucat & redup),
  // stage 5 = 1.0 (glow penuh).
  const stageIntensity = 0.2 + (stage - 1) * 0.2;
  const supporterBonus = Math.min(0.15, supporters / 800);
  const baseIntensity = Math.min(1, stageIntensity + supporterBonus);

  return (
    <>
      <BeatingHeart
        intensity={justClicked ? 1 : baseIntensity}
        period={justClicked ? '0.7s' : '1.1s'}
        stage={stage}
      />

      <p className="text-center font-header italic text-base sm:text-lg text-[color:var(--retro-text-primary)] leading-relaxed mb-8 max-w-xl mx-auto">
        Lagu ini masih kesegel. Akan dibuka pada{' '}
        <span className="text-[color:var(--retro-burgundy)] not-italic font-bold">15 Juni 2026</span>.
        <br />
        Sampai saat itu, kita yang menjaga denyutnya.
      </p>

      <CountdownDisplay
        days={days}
        hours={hours}
        minutes={minutes}
        seconds={seconds}
      />

      <div className="text-center">
        {hasClicked ? (
          <div className="space-y-3">
            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[color:var(--retro-burgundy)]/30 bg-gradient-to-r from-[color:var(--retro-burgundy)]/5 via-[color:var(--retro-burgundy)]/10 to-[color:var(--retro-burgundy)]/5 text-[color:var(--retro-burgundy)] text-sm font-header italic"
              style={{ animation: 'byuThanksIn 600ms ease-out' }}
            >
              <i className="ri-heart-fill text-rose-500/85 text-base" aria-hidden="true" />
              Terima kasih, kau salah satu yang menjaga denyutnya.
            </div>
            <div className="text-[11px] tracking-wide text-[color:var(--color-text-secondary)]">
              {formatNumber(supporters)} orang sedang menjaga denyutnya.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleClick}
              disabled={submitting}
              className="group inline-flex items-center gap-2 px-7 py-3.5 border-2 border-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)] hover:border-[color:var(--retro-burgundy-light)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(139,64,64,0.55)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <i className="ri-heart-pulse-line text-base group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span className="font-header text-[11px] sm:text-xs font-black uppercase tracking-[0.32em]">
                {submitting ? 'Mencatat...' : 'Saya menunggu'}
              </span>
            </button>
            <div className="text-[11px] tracking-wide text-[color:var(--color-text-secondary)]">
              {formatNumber(supporters)} orang sedang menjaga denyutnya.
            </div>
            {error && (
              <div className="text-[11px] text-[color:var(--retro-burgundy)]">{error}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

const ReleasedView = ({ supporters, stage = TOTAL_STAGES }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setAudioError(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Auto-play attempt saat ReleasedView mount. Pattern: muted autoplay
  // dulu (browser allow), unmute pas user first gesture. Setelah H day
  // (15 Juni), tiap user yg buka /byu-music langsung dapet lagu jalan.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.muted = true;
    audio.volume = 0.25;
    audio.play().catch(() => {
      /* autoplay blocked — user can still manual click */
    });
    const unlock = () => {
      audio.muted = false;
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    };
    const opts = { once: true, passive: true };
    document.addEventListener('click', unlock, opts);
    document.addEventListener('touchstart', unlock, opts);
    document.addEventListener('keydown', unlock, opts);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => setAudioError(true));
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const fmt = (sec) => {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Released — heart yg sama, tapi denyut lebih cepat saat lagu
          jalan (kayak adrenalin), pelan saat di-pause. Stage 5 full. */}
      <BeatingHeart
        intensity={1}
        period={isPlaying ? '0.85s' : '1.1s'}
        stage={stage}
      />

      <audio ref={audioRef} src={AUDIO_URL} preload="metadata" />

      {audioError ? (
        <div className="text-center text-sm text-[color:var(--retro-burgundy)] mb-6 max-w-md mx-auto">
          Audio gagal dimuat. Coba di Chrome/Firefox/Edge desktop.
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <div
            className="w-full h-1.5 rounded-full bg-[color:var(--retro-burgundy)]/15 cursor-pointer mb-2 group"
            onClick={seek}
          >
            <div
              className="h-full rounded-full bg-[color:var(--retro-burgundy)] transition-all group-hover:bg-[color:var(--retro-burgundy-light)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] tabular-nums mb-6 text-[color:var(--color-text-secondary)]">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>

          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Jeda' : 'Putar'}
              className="w-16 h-16 rounded-full bg-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy-light)] text-[color:var(--retro-cream)] flex items-center justify-center transition shadow-xl"
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="text-center font-header italic text-sm text-[color:var(--color-text-secondary)]">
        Denyutnya dijaga oleh{' '}
        <span className="text-[color:var(--retro-burgundy)] not-italic font-bold">
          {formatNumber(supporters)} orang
        </span>{' '}
        sampai hari ini.
      </div>

      <div className="mt-4 text-center text-[10px] text-[color:var(--color-text-secondary)]/65 italic">
        iPhone Safari lama mungkin tidak putar FLAC — gunakan Chrome/Firefox.
      </div>
    </>
  );
};

const ByuTitipan = () => {
  const [searchParams] = useSearchParams();
  const force = searchParams.get('force');
  const stageOverrideRaw = searchParams.get('stage');
  const [supporters, setSupporters] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsub = subscribeToByuSupportCount((count) => setSupporters(count));
    return unsub;
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isReleased = useMemo(() => {
    if (force === 'release') return true;
    if (force === 'preview') return false;
    return now >= RELEASE_DATE.getTime();
  }, [force, now]);

  // Released = stage 5 (final unlock); otherwise computed dari calendar.
  // ?stage=N override aktif (1-5).
  const stage = useMemo(() => {
    if (isReleased) return TOTAL_STAGES;
    if (stageOverrideRaw) {
      const n = parseInt(stageOverrideRaw, 10);
      if (!Number.isNaN(n)) return Math.max(1, Math.min(TOTAL_STAGES, n));
    }
    return computeStage(now);
  }, [isReleased, stageOverrideRaw, now]);

  const stageInfo = STAGE_INFO[stage] || STAGE_INFO[1];

  return (
    <section
      id="titipan-byu"
      className="px-5 sm:px-6 md:px-12 lg:px-20 pb-14 md:pb-20"
    >
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-[2rem] bg-white/70 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/10 px-6 sm:px-10 py-10 sm:py-12 shadow-sm"
          style={{ animation: 'byuCardIn 750ms ease-out' }}
        >
          <div className="text-center mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
              <i className="ri-music-2-line text-base" aria-hidden="true" />
              {isReleased ? 'Lagu Kebuka' : 'Lagu Kesegel'}
            </p>
            {!isReleased && (
              <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1.5 rounded-full border border-[color:var(--retro-burgundy)]/20 bg-[color:var(--retro-burgundy)]/5">
                <span className="text-[9px] font-black uppercase tracking-[0.32em] text-[color:var(--retro-burgundy)]/65">
                  Minggu {stage} dari {TOTAL_STAGES}
                </span>
                <span className="w-1 h-1 rounded-full bg-[color:var(--retro-burgundy)]/40" />
                <span className="font-header italic text-[12px] text-[color:var(--retro-burgundy)]">
                  {stageInfo.name}
                </span>
              </div>
            )}
            {!isReleased && (
              <p className="mt-2 font-header italic text-[11px] text-[color:var(--color-text-secondary)]/85">
                {stageInfo.hint}
              </p>
            )}
          </div>
          {isReleased ? (
            <ReleasedView supporters={supporters} stage={stage} />
          ) : (
            <PreReleaseView supporters={supporters} stage={stage} />
          )}
        </div>
      </div>
      <style>{`
        @keyframes byuCardIn {
          0%   { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes byuThanksIn {
          0%   { opacity: 0; transform: scale(0.92); }
          60%  { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes byuTick {
          0%   { opacity: 0.5; transform: translateY(-3px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="byuCardIn"], [class*="byuThanksIn"],
          [class*="byuTick"] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default ByuTitipan;
