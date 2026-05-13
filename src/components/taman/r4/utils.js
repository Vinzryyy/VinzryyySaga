/**
 * Hooks + helpers untuk r4 Menara Jam.
 *
 * Berisi:
 *   - useIsMobile               — matchMedia 767px
 *   - computeWibTime / useWibTime — WIB time via Intl.DateTimeFormat
 *   - wibTodayIso / wibTodayLong  — kalender hari ini (YYYY-MM-DD &
 *                                   "Rabu, 13 Mei 2026")
 *   - daysFromWibToday          — signed jarak hari ke ISO date
 *   - formatShortIdDate         — "13 Mei 2026" buat display
 *   - useNearestSchedule        — fetch /data/eli-schedule.json, return
 *                                 event upcoming ≤30 hari
 *   - useAlmanak                — derive daysSinceDebut + last/next
 *                                 milestone + nearestEvent
 *   - playBellStrike            — Web Audio synth bell (4 harmonic)
 *   - useHourlyBell             — trigger bel di top of every WIB hour
 *   - useAnniversaryMatch       — MM-DD match vs birthday + ELI_TIMELINE
 *   - BELL_STORAGE_KEY          — localStorage key utk toggle persist
 *
 * Note: semua time computation pakai WIB (Asia/Jakarta) explicit,
 * independen dari local TZ user — penting karena situs ini archive
 * Indonesia-specific content.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ELI_TIMELINE } from '../../../data/eliProfile';
import { SITE_CONFIG } from '../../../config/siteConfig';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
};

// WIB time via Intl.DateTimeFormat('Asia/Jakarta') — independen dari
// user's local timezone. Update setiap 1s — cukup buat jarum jam/menit
// (jarum detik gak ditampilkan di dial).
export const computeWibTime = () => {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const get = (type) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hours = get('hour');
  const minutes = get('minute');
  const seconds = get('second');
  return {
    hours,
    minutes,
    seconds,
    hour12Frac: (hours % 12) + minutes / 60,
    minuteFrac: minutes + seconds / 60,
  };
};

export const useWibTime = () => {
  const [time, setTime] = useState(() => computeWibTime());
  useEffect(() => {
    const tick = () => setTime(computeWibTime());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

// Today di kalender WIB sebagai YYYY-MM-DD — anchor buat "hari ini"
// calculations independen dari local TZ user.
export const wibTodayIso = () => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
};

// Jarak hari kalender (signed integer) dari `isoDateStr` (YYYY-MM-DD) ke
// hari ini di WIB. Positif = di masa depan, negatif = di masa lalu.
// Return null jika tanggal invalid/null. Komputasi pakai WIB midnight di
// kedua sisi supaya gak ada off-by-one karena timezone shift.
export const daysFromWibToday = (isoDateStr) => {
  if (!isoDateStr) return null;
  const target = new Date(`${isoDateStr}T00:00:00+07:00`);
  if (Number.isNaN(target.getTime())) return null;
  const todayIso = wibTodayIso();
  const todayWibStart = new Date(`${todayIso}T00:00:00+07:00`);
  const diffMs = target - todayWibStart;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

// "Rabu, 13 Mei 2026" — display di header Almanak.
export const wibTodayLong = () => {
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return fmt.format(new Date());
};

// "13 Mei 2026" — short form. Accept either YYYY-MM-DD atau full ISO.
export const formatShortIdDate = (isoDateStr) => {
  if (!isoDateStr) return '—';
  const d = new Date(`${isoDateStr.substring(0, 10)}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

// useNearestSchedule — fetch /data/eli-schedule.json sekali saat mount,
// filter event Eli yang upcoming (date >= today) dan dalam ≤30 hari.
// Return entry pertama (nearest), atau null. Failure modes (404, parse
// error) silently return null — fallback ke "bandul nungguin".
export const useNearestSchedule = () => {
  const [nearest, setNearest] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/data/eli-schedule.json', { cache: 'no-cache' });
        if (!r.ok) return;
        const data = await r.json();
        const events = data?.events || [];
        const now = Date.now();
        const cap = now + 30 * 24 * 60 * 60 * 1000;
        const upcoming = events
          .map((ev) => ({ ...ev, _ts: new Date(ev.date).getTime() }))
          .filter((ev) => !Number.isNaN(ev._ts) && ev._ts >= now && ev._ts <= cap)
          .sort((a, b) => a._ts - b._ts);
        if (!cancelled) setNearest(upcoming[0] || null);
      } catch {
        // fail-quiet — Almanak/CountdownChip handle null state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return nearest;
};

// useAlmanak — derive data buat panel: hari ini, days-since-debut,
// milestone terakhir lewat, milestone berikutnya, event Eli terdekat.
// ELI_TIMELINE entries sudah sorted ascending by date; entries dengan
// date=null (upcoming, mis. show-400) di-skip dari past/future calc tapi
// dipakai buat "menuju" placeholder.
//
// `today` di-include di useMemo deps supaya re-compute saat kalender WIB
// flip lewat tengah malam (re-render trigger dari useWibTime di parent
// scene cukup buat re-evaluate ini).
export const useAlmanak = () => {
  const nearestEvent = useNearestSchedule();
  const today = wibTodayIso();
  return useMemo(() => {
    const todayMs = new Date(`${today}T00:00:00+07:00`).getTime();
    const debutEntry = ELI_TIMELINE.find((e) => e.id === 'theater-debut');
    const daysSinceDebut = debutEntry
      ? -daysFromWibToday(debutEntry.date)
      : null;
    const past = ELI_TIMELINE.filter(
      (e) => e.date && new Date(`${e.date}T00:00:00+07:00`).getTime() < todayMs,
    ).sort((a, b) => (a.date < b.date ? 1 : -1));
    const lastMilestone = past[0] || null;
    const future = ELI_TIMELINE.filter(
      (e) => e.date && new Date(`${e.date}T00:00:00+07:00`).getTime() >= todayMs,
    ).sort((a, b) => (a.date < b.date ? -1 : 1));
    const upcomingTagged = ELI_TIMELINE.filter((e) => e.upcoming);
    const nextMilestone = future[0] || upcomingTagged[0] || null;
    return {
      today,
      todayLong: wibTodayLong(),
      daysSinceDebut,
      debutEntry,
      lastMilestone,
      nextMilestone,
      nearestEvent,
    };
  }, [nearestEvent, today]);
};

// === BELL CHIME AUDIO ===
// Synth bell strike via Web Audio API — 4-harmonic additive synth dgn
// exponential decay envelope. No audio asset needed, ~80B code path.
// Frekuensi A4 fundamental + harmonics ganjil-ish bikin timbre bel
// "tower clock" yang lembut, bukan service-desk ding.
export const playBellStrike = (ctx, peakGain = 0.45) => {
  const now = ctx.currentTime;
  const harmonics = [
    { freq: 440, gain: peakGain, decay: 2.4 },
    { freq: 880, gain: peakGain * 0.5, decay: 1.5 },
    { freq: 1320, gain: peakGain * 0.28, decay: 0.85 },
    { freq: 1760, gain: peakGain * 0.16, decay: 0.55 },
  ];
  harmonics.forEach((h) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = h.freq;
    gain.gain.setValueAtTime(h.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + h.decay);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + h.decay + 0.1);
  });
};

export const BELL_STORAGE_KEY = 'menara-bell-on';

// useHourlyBell — saat enabled, ring bell tiap kali jam WIB berubah
// (deteksi via lastHourRef). Browser butuh user gesture buat unlock
// AudioContext, jadi context di-init lazy. Avoid catching up missed
// hours: cuma trigger kalau menit==0 & seconds<30.
//
// Returns `playPreview` function yg reuse ctxRef internal — supaya
// BellToggle gak bikin AudioContext baru tiap toggle (browser limit
// ~5-6 contexts per origin, leak setelah ~5 toggle bell).
export const useHourlyBell = (enabled) => {
  const lastHourRef = useRef(null);
  const ctxRef = useRef(null);

  const ensureCtx = () => {
    if (ctxRef.current) return ctxRef.current;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
      return ctxRef.current;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const ctx = ensureCtx();
    if (!ctx) return undefined;
    const init = computeWibTime();
    lastHourRef.current = init.hours;

    const tick = () => {
      const t = computeWibTime();
      if (t.hours !== lastHourRef.current) {
        lastHourRef.current = t.hours;
        if (t.minutes === 0 && t.seconds < 30) {
          playBellStrike(ctxRef.current);
        }
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled]);

  // playPreview — single strike (peakGain lower) buat konfirmasi
  // toggle ON. Reuse ctxRef supaya gak leak.
  return () => {
    const ctx = ensureCtx();
    if (ctx) playBellStrike(ctx, 0.25);
  };
};

// === SEITANSAI COUNTDOWN (hybrid) ===
// useSeitansaiCountdown — countdown utama menara. Default target = ulang
// tahun Eli berikutnya (MM-DD = 06-15). Override jika ada event Eli
// dalam ≤14 hari — supaya menara nunjuk ke yang paling dekat secara
// kontekstual (mis. jelang concert, dial point ke concert bukan ultah).
//
// Output:
//   - daysUntil: integer ≥0
//   - targetIso: YYYY-MM-DD
//   - title: "Ulang Tahun Eli" atau event title
//   - isOverride: true kalau yang ditampilkan event override
//   - yearFraction: 0..1 — fraction-of-year remaining (utk dial hand angle)
export const useSeitansaiCountdown = () => {
  const nearestEvent = useNearestSchedule();
  const todayIso = wibTodayIso();
  return useMemo(() => {
    const birthMMDD = (
      SITE_CONFIG?.eli?.birthdateIso || '2000-06-15T00:00:00+07:00'
    ).substring(5, 10);
    const todayYear = parseInt(todayIso.substring(0, 4), 10);
    const candidateThisYear = `${todayYear}-${birthMMDD}`;
    const candidateNextYear = `${todayYear + 1}-${birthMMDD}`;
    const daysThisYear = daysFromWibToday(candidateThisYear);
    const seitansaiTarget =
      daysThisYear !== null && daysThisYear >= 0
        ? candidateThisYear
        : candidateNextYear;
    const seitansaiDays = Math.max(0, daysFromWibToday(seitansaiTarget) || 0);

    let targetIso = seitansaiTarget;
    let title = 'Ulang Tahun Eli';
    let isOverride = false;
    let daysUntil = seitansaiDays;

    if (nearestEvent && nearestEvent.date) {
      const evIso = nearestEvent.date.substring(0, 10);
      const evDays = daysFromWibToday(evIso);
      if (evDays !== null && evDays >= 0 && evDays <= 14 && evDays < seitansaiDays) {
        targetIso = evIso;
        title = nearestEvent.title || 'Eli tampil';
        isOverride = true;
        daysUntil = evDays;
      }
    }

    // Year fraction utk dial hand: 0 = at target, 1 = far away (365d).
    // Pakai mod 365 supaya tetep meaningful kalau hybrid event jauh.
    const yearFraction = Math.min(1, daysUntil / 365);
    return { daysUntil, targetIso, title, isOverride, yearFraction };
  }, [nearestEvent, todayIso]);
};

// IMPORTANT_DATES_MMDD — list MM-DD untuk marker dot di Orloj calendar
// dial. Sumber: ELI_TIMELINE entries dgn date + birthday Eli. Dedup &
// sort untuk stable iteration order.
export const useImportantDatesMMDD = () => {
  return useMemo(() => {
    const set = new Set();
    const birthIso = (
      SITE_CONFIG?.eli?.birthdateIso || '2000-06-15T00:00:00+07:00'
    ).substring(0, 10);
    set.add(birthIso.substring(5));
    ELI_TIMELINE.forEach((e) => {
      if (e.date) set.add(e.date.substring(5));
    });
    return Array.from(set);
  }, []);
};

// dayOfYearFromMMDD — convert "MM-DD" jadi 0..1 fraction-of-year (utk
// posisi sudut di calendar dial). Pakai non-leap year baseline supaya
// stabil. Jan 1 = 0, Dec 31 ≈ 0.997.
export const dayOfYearFromMMDD = (mmdd) => {
  if (!mmdd || mmdd.length !== 5) return 0;
  const month = parseInt(mmdd.substring(0, 2), 10);
  const day = parseInt(mmdd.substring(3, 5), 10);
  // Days at start of each month (non-leap)
  const cumulative = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const dayIdx = (cumulative[month - 1] || 0) + (day - 1);
  return dayIdx / 365;
};

// useTodayMMDDFraction — hari ini sebagai fraction-of-year (jarum
// calendar dial selalu nunjuk ke hari ini).
export const useTodayMMDDFraction = () => {
  const todayIso = wibTodayIso();
  return useMemo(() => dayOfYearFromMMDD(todayIso.substring(5)), [todayIso]);
};

// === ANNIVERSARY DETECTION ===
// useAnniversaryMatch — return list dari ELI_TIMELINE entries + birthday
// yang MM-DD-nya cocok dengan hari ini di WIB. Empty array = bukan
// anniversary day. Dev override `?day=MM-DD` buat preview.
//
// `todayIso` di-include di deps supaya re-compute lewat midnight WIB —
// parent scene's useWibTime trigger re-render tiap detik = today
// re-evaluated.
export const useAnniversaryMatch = () => {
  const [searchParams] = useSearchParams();
  const todayIso = wibTodayIso();
  return useMemo(() => {
    const override = import.meta.env.DEV ? searchParams.get('day') : null;
    let todayMM, todayYear;
    if (override && /^\d{2}-\d{2}$/.test(override)) {
      todayMM = override;
      todayYear = new Date().getFullYear();
    } else {
      todayMM = todayIso.substring(5);
      todayYear = parseInt(todayIso.substring(0, 4), 10);
    }
    const matches = [];
    const birthIso =
      (SITE_CONFIG?.eli?.birthdateIso || '2000-06-15T00:00:00+07:00').substring(0, 10);
    if (birthIso.substring(5) === todayMM) {
      const year = parseInt(birthIso.substring(0, 4), 10);
      const age = Math.max(0, todayYear - year);
      matches.push({
        type: 'birthday',
        title: 'Ulang Tahun Eli',
        period: age > 0 ? `${age} tahun hari ini` : 'Hari ini',
        rank: 0,
      });
    }
    ELI_TIMELINE.forEach((e) => {
      if (!e.date) return;
      if (e.date.substring(5) !== todayMM) return;
      const year = parseInt(e.date.substring(0, 4), 10);
      const yearsAgo = todayYear - year;
      if (yearsAgo <= 0) return;
      matches.push({
        type: 'milestone',
        id: e.id,
        title: e.title,
        period: `${yearsAgo} tahun lalu hari ini`,
        rank: yearsAgo,
      });
    });
    matches.sort((a, b) => a.rank - b.rank);
    return matches;
  }, [searchParams, todayIso]);
};
