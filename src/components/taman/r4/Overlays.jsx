/**
 * HTML overlay components untuk r4 Menara Jam.
 *
 * Public exports:
 *   - Header        — top bar w/ back link + title + (restored) BellToggle
 *   - TimePill      — bottom-center HH:MM:SS WIB live tick
 *   - AlmanakCard   — restored only, bottom-left card dgn anniversary chip
 *                     + daysSinceDebut + last/next milestone + nearest event
 *   - CountdownChip — drought only, bottom-center chip "X hari lagi · {event}"
 *
 * Internal helper: BellToggle (di Header restored slot).
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BELL_STORAGE_KEY,
  daysFromWibToday,
  formatShortIdDate,
  useAlmanak,
  useAnniversaryMatch,
  useHourlyBell,
  useSeitansaiCountdown,
  useWibTime,
} from './utils';

// TimePill — bottom-center confirms clock is "alive" dgn real-time WIB
// tick. Drought: copy "jam separuh jalan". Restored: copy "jam pulih".
export const TimePill = ({ restored }) => {
  const time = useWibTime();
  const hh = String(time.hours).padStart(2, '0');
  const mm = String(time.minutes).padStart(2, '0');
  const ss = String(time.seconds).padStart(2, '0');
  const subline = restored
    ? 'WIB kalibrasi penuh — menara nunjuk waktu Eli'
    : 'WIB jalan, bandul menara masih cari ritme';
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[92vw]">
      <div className="flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 shadow-lg">
        <div className="flex items-baseline gap-2 tabular-nums">
          <span className="text-white/95 text-base sm:text-lg font-medium tracking-wide">
            {hh}:{mm}
          </span>
          <span className="text-white/45 text-[10px]">:{ss}</span>
          <span className="text-amber-200/75 text-[10px] uppercase tracking-[0.2em] ml-1">
            WIB
          </span>
        </div>
        <p
          className="text-white/55 text-[10px] sm:text-[11px] tracking-wide italic"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          {subline}
        </p>
      </div>
    </div>
  );
};

// AlmanakCard — restored only, panel bottom-left dgn derived data dari
// ELI_TIMELINE + eli-schedule.json. Drought variant gak render card ini —
// drought hanya dapet CountdownChip (lebih ringkas).
export const AlmanakCard = () => {
  const a = useAlmanak();
  const anniversaries = useAnniversaryMatch();
  const eventDays =
    a.nearestEvent && a.nearestEvent.date
      ? Math.max(0, daysFromWibToday(a.nearestEvent.date.substring(0, 10)))
      : null;
  const eventDate = a.nearestEvent ? formatShortIdDate(a.nearestEvent.date) : null;
  const lastDays =
    a.lastMilestone && a.lastMilestone.date
      ? -daysFromWibToday(a.lastMilestone.date)
      : null;

  return (
    <div className="pointer-events-auto absolute bottom-28 sm:bottom-6 left-3 sm:left-6 z-10 w-[calc(100vw-1.5rem)] sm:w-[320px]">
      <div
        className="rounded-2xl border border-white/12 bg-[#1c1612]/85 backdrop-blur-md shadow-2xl px-4 py-3.5 sm:px-5 sm:py-4"
        style={{ fontFamily: '"Fraunces Variable", serif' }}
      >
        {/* Anniversary chip — golden header strip muncul HANYA saat hari
            ini cocok dgn birthday Eli atau MM-DD milestone. Self-refreshing
            tiap tahun karena driven by today's MM-DD. */}
        {anniversaries.length > 0 && (
          <div className="mb-3 -mx-1 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-500/10 border border-amber-300/25">
            <div className="text-amber-200/85 text-[9px] uppercase tracking-[0.3em] mb-0.5">
              Hari ini · {anniversaries[0].period}
            </div>
            <div className="text-amber-50/90 text-[12px] sm:text-[13px] italic leading-snug">
              {anniversaries[0].title}
            </div>
            {anniversaries.length > 1 && (
              <div className="text-amber-100/55 text-[10px] mt-1 italic">
                +{anniversaries.length - 1} milestone lain hari ini
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-amber-200/75 text-[9px] uppercase tracking-[0.3em]">
            Almanak Kota
          </div>
          <div className="text-white/35 text-[9px] tabular-nums">
            {a.todayLong}
          </div>
        </div>

        {/* Days since debut counter — anchor "tower remembers time" */}
        {a.daysSinceDebut !== null && (
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-amber-100/90 text-2xl sm:text-3xl font-medium tabular-nums">
              {a.daysSinceDebut.toLocaleString('id-ID')}
            </span>
            <span className="text-white/55 text-[11px] sm:text-xs italic">
              hari sejak Debut Theater
            </span>
          </div>
        )}

        {/* Last milestone */}
        {a.lastMilestone && (
          <div className="mb-2.5 pb-2.5 border-b border-white/8">
            <div className="text-white/40 text-[9px] uppercase tracking-[0.2em] mb-1">
              Milestone terakhir{lastDays !== null && ` · ${lastDays} hari lalu`}
            </div>
            <div className="text-white/85 text-[13px] leading-snug italic">
              {a.lastMilestone.title}
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">
              {a.lastMilestone.period}
            </div>
          </div>
        )}

        {/* Next event (≤30 days) — if available, fallback nextMilestone */}
        {a.nearestEvent ? (
          <div>
            <div className="text-white/40 text-[9px] uppercase tracking-[0.2em] mb-1">
              Eli tampil · {eventDays === 0 ? 'hari ini' : `${eventDays} hari lagi`}
            </div>
            <div className="text-white/85 text-[13px] leading-snug italic">
              {a.nearestEvent.title}
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">
              {eventDate}
              {a.nearestEvent.venue ? ` · ${a.nearestEvent.venue}` : ''}
            </div>
          </div>
        ) : a.nextMilestone ? (
          <div>
            <div className="text-white/40 text-[9px] uppercase tracking-[0.2em] mb-1">
              {a.nextMilestone.date ? 'Milestone berikutnya' : 'Menuju'}
            </div>
            <div className="text-white/85 text-[13px] leading-snug italic">
              {a.nextMilestone.title}
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">
              {a.nextMilestone.period}
            </div>
          </div>
        ) : (
          <div className="text-white/50 text-[11px] italic">
            Bandul nungguin event berikutnya.
          </div>
        )}
      </div>
    </div>
  );
};

// CountdownChip — drought variant pakai ini (kompak). Mirror logic dari
// useSeitansaiCountdown (sama dgn upper dial menara): default countdown
// ke ultah Eli, override jika ada event ≤14 hari.
export const CountdownChip = () => {
  const c = useSeitansaiCountdown();
  const dayLabel = c.daysUntil === 0 ? 'Hari ini' : `${c.daysUntil} hari lagi`;
  const copy = `${dayLabel} · ${c.title}`;
  return (
    <div className="pointer-events-none absolute bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 z-10 max-w-[88vw]">
      <div className="px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 shadow-lg">
        <p
          className="text-white/65 text-[10px] sm:text-[11px] italic text-center tracking-wide whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          {copy}
        </p>
      </div>
    </div>
  );
};

// BellToggle — restored only. Toggles hourly bell chime + persists ke
// localStorage. Default OFF supaya user yg buka page gak kaget sama
// audio (juga policy "no autoplay sound" yang umum). User gesture
// pertama saat toggle ON unlock AudioContext.
//
// useHourlyBell returns `playPreview` yg reuse ctxRef internal — fix
// AudioContext leak (sebelumnya `new Ctx()` tiap toggle, hit browser
// limit ~5-6 contexts).
const BellToggle = () => {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(BELL_STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  });
  const playPreview = useHourlyBell(enabled);

  const handleClick = () => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BELL_STORAGE_KEY, next ? 'on' : 'off');
      } catch {
        /* storage disabled — fail silently */
      }
      // Toggle ON → preview strike (reuse ctx, no leak)
      if (next) playPreview();
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={enabled}
      aria-label={enabled ? 'Matikan bel jam' : 'Nyalakan bel jam'}
      title={enabled ? 'Bel: tiap jam (klik buat mute)' : 'Bel: mute (klik buat aktifkan)'}
      className={`pointer-events-auto rounded-full border w-10 h-10 sm:w-9 sm:h-9 grid place-items-center transition ${
        enabled
          ? 'border-amber-300/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
          : 'border-white/15 bg-black/30 text-white/55 hover:bg-white/10 hover:text-white/80'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
        {!enabled && <line x1="4" y1="4" x2="20" y2="20" />}
      </svg>
    </button>
  );
};

export const Header = ({ restored }) => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-2 px-3 pt-20 md:px-6 md:pt-24 pb-4 md:pb-5">
    <div className="pointer-events-auto shrink-0">
      <Link
        to="/armeniacaTown/peta"
        className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
      >
        ← Peta Kota
      </Link>
    </div>
    <div className="text-center min-w-0 flex-1">
      <div className="text-white/45 text-[8px] md:text-[9px] uppercase tracking-[0.35em] md:tracking-[0.45em] mb-0.5">
        ArmeniacaTown
      </div>
      <div
        className="text-white/85 text-[12px] md:text-sm tracking-wide truncate"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
        }}
      >
        Menara Jam
        {!restored && (
          <span className="hidden sm:inline"> — Separuh Jalan</span>
        )}
      </div>
    </div>
    {/* Right-side slot — BellToggle hanya muncul di restored (drought
        belum boleh bunyi per spec "bel masih bisu"). Drought spacer biar
        layout balance. */}
    {restored ? <BellToggle /> : <div className="w-10 sm:w-9 shrink-0" aria-hidden />}
  </div>
);
