/**
 * EliStatusHero — unified "Status Eli Sekarang" surface untuk landing.
 *
 * Selalu render (gak conditional kayak old LIVE NOW block), jadi
 * visitor langsung tau status Eli di multi-platform tanpa cari-cari.
 * Empat state, di-prioritize urutan:
 *
 *   1. live      — IDN atau SHOWROOM aktif. Preserve existing dark/red
 *                  HLS player layout (visual high-energy emang fit waktu
 *                  live, gak perlu di-rework).
 *   2. imminent  — next event ≤24h. Urgent paper-archive card dengan
 *                  HH:MM:SS countdown live-ticking.
 *   3. upcoming  — next event >24h, ≤30d. Calm cream card + "X hari lagi".
 *   4. idle      — gak ada upcoming. Subtle pointer ke /schedule arsip.
 *
 * Always-shown bottom strip: IDN ● SHOWROOM ● Theater next-date.
 * Single-glance multi-platform read.
 *
 * Data sources:
 *   - idnLive / showroomLive props (lifted dari Home — hooks tetep di
 *     parent biar polling gak duplikat)
 *   - /data/eli-schedule.json (auto-refreshed via GH Actions tiap 6 jam,
 *     sumber jkt48.com official API; sama dengan yg dipakai /schedule)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Section from '../layout/Section';
import IdnLiveStreamPlayer from '../IdnLiveStreamPlayer';
import ScheduleEventCard from '../schedule/ScheduleEventCard';
import {
  useEliSchedule,
  deriveLiveState,
  ONGOING_GRACE_MS,
} from '../../hooks/useEliSchedule';

const KIND_LABEL = {
  SHOW: 'Theater',
  EXCLUSIVE: 'Meet & Greet',
  EVENT: 'Event',
  GENERAL: 'Event',
};

const TEAM_LABEL = {
  DREAM: 'Team Dream',
  JKT48: 'All-Team',
  LOVE: 'Team Love',
  PASSION: 'Team Passion',
};

const pad2 = (n) => String(n).padStart(2, '0');

// Indonesian short date — "Sen, 02 Jun · 17:00 WIB"
const formatEventDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(d);
  return `${datePart} · ${timePart} WIB`;
};

// Compact date untuk platform strip — "02 Jun · 17:00"
const formatShortDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(d);
};

// Refresh timestamp untuk footer attribution — "Update 27 Mei 18:55"
const formatRefreshed = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

// Countdown formatter — picks granularity based on remaining time.
//   <1h   → "MM:SS" tick (urgent live ticker)
//   <24h  → "HH:MM:SS"
//   <7d   → "X hari Y jam"
//   >=7d  → "X hari"
const formatCountdown = (diffMs) => {
  if (diffMs <= 0) return 'Mulai sekarang';
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days >= 7) return `${days} hari`;
  if (days >= 1) return `${days} hari ${hours} jam`;
  if (hours >= 1) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
};

const useTicker = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id = null;
    const start = () => {
      if (id != null) return;
      id = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
  return now;
};

const PlatformDot = ({ live, label, sub, href }) => {
  const content = (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {live && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            live
              ? 'bg-red-500'
              : 'bg-[color:var(--retro-brown-dark)]/30'
          }`}
        />
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[color:var(--retro-brown-dark)]/80">
        {label}
      </span>
      <span
        className={`text-[10px] uppercase tracking-[0.2em] ${
          live
            ? 'text-red-600 font-black'
            : 'text-[color:var(--retro-brown-dark)]/50'
        }`}
      >
        {sub}
      </span>
    </span>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-80 transition-opacity"
    >
      {content}
    </a>
  ) : (
    content
  );
};

const EliStatusHero = ({ idnLive, showroomLive }) => {
  const schedule = useEliSchedule();
  const now = useTicker(1000);

  // Re-pick state setiap menit — event window can pass during a long
  // session. Avoid 1s recompute (wasteful). Countdown display uses
  // the 1s `now` so HH:MM:SS still ticks smoothly within imminent state.
  const nowMinute = Math.floor(now / 60000) * 60000;
  const { state, nextEvent, isIdnLive, isShowroomLive } = useMemo(
    () => deriveLiveState({ schedule, idnLive, showroomLive, now: nowMinute }),
    [schedule, idnLive, showroomLive, nowMinute],
  );
  const anyLive = isIdnLive || isShowroomLive;
  const diffToNext = nextEvent ? new Date(nextEvent.date).getTime() - now : null;

  // Bottom platform strip — always shown. Theater = next SHOW event.
  const nextShow = useMemo(() => {
    const events = schedule?.events || [];
    return (
      events
        .filter((e) => {
          if (e.kind !== 'SHOW') return false;
          const t = new Date(e.date).getTime();
          return t >= nowMinute - ONGOING_GRACE_MS;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
    );
  }, [schedule, nowMinute]);

  // "Mendatang Lainnya" list — semua upcoming events, skip yang udah
  // di-primary-surface (kalau non-live state). Cap di 3 biar tetep
  // compact; CTA ke /schedule kalau ada lebih.
  const upcomingOthers = useMemo(() => {
    const events = schedule?.events || [];
    const upcoming = events
      .filter((e) => {
        const t = new Date(e.date).getTime();
        if (Number.isNaN(t)) return false;
        return t >= nowMinute - ONGOING_GRACE_MS;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    // Skip primary event hanya kalau primary state pakai event
    // (imminent/upcoming). Untuk live/idle, tampilin semua upcoming.
    const usesEventInPrimary = state === 'imminent' || state === 'upcoming';
    return upcoming.slice(usesEventInPrimary ? 1 : 0, usesEventInPrimary ? 4 : 3);
  }, [schedule, nowMinute, state]);

  const totalUpcomingCount = useMemo(() => {
    const events = schedule?.events || [];
    return events.filter((e) => {
      const t = new Date(e.date).getTime();
      if (Number.isNaN(t)) return false;
      return t >= nowMinute - ONGOING_GRACE_MS;
    }).length;
  }, [schedule, nowMinute]);

  // Skip rendering for non-urgent states — 'upcoming' (>24h) folds into a
  // compact chip in Home hero, 'idle' has nothing actionable to show.
  // Only 'live' and 'imminent' (≤24h) earn the full status section.
  if (state === 'upcoming' || state === 'idle') return null;

  return (
    <Section id="status-eli" padding="lg">
      <header className="flex items-center justify-center gap-3 mb-5">
        <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
        <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
          <i className={`text-base ${anyLive ? 'ri-broadcast-fill text-red-600' : 'ri-pulse-line'}`} />
          Status &amp; Jadwal Eli
        </p>
        <span className="w-12 h-px bg-[color:var(--retro-burgundy)]/30" />
      </header>

      {state === 'live' && (
        <LiveSurface
          idnLive={idnLive}
          isShowroomLive={isShowroomLive}
        />
      )}

      {state === 'imminent' && nextEvent && (
        <ImminentSurface
          event={nextEvent}
          countdown={formatCountdown(diffToNext)}
        />
      )}

      {state === 'upcoming' && nextEvent && (
        <UpcomingSurface
          event={nextEvent}
          countdown={formatCountdown(diffToNext)}
        />
      )}

      {state === 'idle' && <IdleSurface />}

      {/* Mendatang Lainnya — list 3 next events selain yang udah di
          primary. Hidden saat idle (gak ada upcoming) atau saat
          upcoming events <= 0 setelah skip primary. */}
      {upcomingOthers.length > 0 && (
        <div className="mt-8 pt-7 border-t border-[color:var(--retro-brown-dark)]/12">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
              <i className="ri-calendar-event-line text-base" />
              {state === 'live' ? 'Show & M&G Mendatang' : 'Mendatang Lainnya'}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              {totalUpcomingCount} upcoming
            </p>
          </div>
          <ol className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none">
            {upcomingOthers.map((entry, idx) => (
              <li
                key={`${entry.code || entry.schedule_id}-${entry.date}-${entry.start_time || idx}`}
                className="flex-shrink-0 w-[80%] sm:w-auto snap-center"
              >
                <ScheduleEventCard entry={entry} />
              </li>
            ))}
          </ol>
        </div>
      )}

      <PlatformStrip
        isIdnLive={isIdnLive}
        isShowroomLive={isShowroomLive}
        idnLiveUrl={idnLive?.liveStream?.url}
        nextShow={nextShow}
      />

      {/* Source attribution + arsip CTA. Sumber + last refresh kalau
          schedule data udah loaded. */}
      {schedule && (
        <div className="mt-5 pt-4 border-t border-[color:var(--retro-brown-dark)]/10 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] inline-flex items-center gap-2 flex-wrap">
            <i className="ri-refresh-line" />
            Auto-refresh tiap 6 jam · sumber{' '}
            <a
              href="https://jkt48.com/schedule"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--retro-burgundy)] hover:underline"
            >
              jkt48.com (official)
            </a>
            {schedule.fetchedAt && (
              <span className="text-[color:var(--color-text-muted)]/70 normal-case tracking-normal font-bold ml-1">
                · Update {formatRefreshed(schedule.fetchedAt)}
              </span>
            )}
          </p>
          {totalUpcomingCount > 0 && (
            <Link
              to="/schedule"
              className="group inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[color:var(--retro-burgundy)]/20 text-[color:var(--retro-burgundy)] font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] hover:border-[color:var(--retro-burgundy)] transition-all"
            >
              <i className="ri-calendar-line" />
              Lihat semua jadwal
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}
    </Section>
  );
};

const LiveSurface = ({ idnLive, isShowroomLive }) => {
  // Tetap pakai layout existing live block — dark gradient, red accent,
  // HLS player + title + viewers + CTA. Cuma support dual-platform:
  // IDN player kalau ada playback URL, fallback message kalau SHOWROOM
  // only (gak ada HLS player buat SHOWROOM, redirect ke profile).
  const hasIdnPlayback = idnLive?.isLive && idnLive?.liveStream?.playbackUrl;
  return (
    <div className="relative rounded-3xl overflow-hidden border border-red-500/25 bg-gradient-to-br from-[color:var(--retro-brown-dark)] via-[color:var(--retro-burgundy)] to-black shadow-2xl shadow-red-900/20">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(circle at 90% 0%, rgba(220, 38, 38, 0.35) 0%, transparent 55%), radial-gradient(circle at 0% 100%, rgba(201, 169, 97, 0.18) 0%, transparent 60%)',
        }}
      />
      <div className="relative px-5 sm:px-7 md:px-10 py-7 md:py-9">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-md shadow-red-900/40">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            On Air
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-cream)]/70">
            {hasIdnPlayback ? 'Eli sedang live di IDN App' : 'Eli sedang live di SHOWROOM'}
          </span>
          <span className="hidden sm:block flex-1 h-px bg-[color:var(--retro-cream)]/15 max-w-[200px]" />
        </div>

        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          <div className="lg:col-span-8">
            {hasIdnPlayback ? (
              <IdnLiveStreamPlayer
                playbackUrl={idnLive.liveStream.playbackUrl}
                posterUrl={idnLive.liveStream.imageUrl}
                externalUrl={idnLive.liveStream.url}
                title={idnLive.liveStream.title}
                viewCount={idnLive.liveStream.viewCount}
              />
            ) : (
              <div className="aspect-video rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-[color:var(--retro-cream)]/70 gap-3 px-6 text-center">
                <i className="ri-vidicon-line text-3xl text-red-400" />
                <p className="text-sm">
                  Live ini tidak punya player embeddable. Buka SHOWROOM untuk nonton.
                </p>
              </div>
            )}
          </div>
          <div className="lg:col-span-4 text-[color:var(--retro-cream)]">
            <h2 className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-[0.95] mb-3">
              {idnLive?.liveStream?.title || 'Live bareng Eli'}
            </h2>
            <p className="text-sm text-[color:var(--retro-cream)]/75 leading-relaxed mb-5">
              {hasIdnPlayback
                ? 'Klik tombol di player buat aktifin suara. Mau kirim gift atau komentar? Buka langsung di IDN App.'
                : 'Eli streaming di SHOWROOM sekarang. Klik tombol untuk buka room-nya.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {typeof idnLive?.liveStream?.viewCount === 'number' && idnLive.liveStream.viewCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-black uppercase tracking-[0.25em] tabular-nums">
                  <i className="ri-eye-line text-sm" />
                  {idnLive.liveStream.viewCount.toLocaleString('id-ID')} nonton
                </span>
              )}
              {hasIdnPlayback ? (
                <a
                  href={idnLive.liveStream.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[color:var(--retro-brown-dark)] text-[11px] font-black uppercase tracking-[0.25em] hover:bg-[color:var(--retro-cream)] transition-colors"
                >
                  <i className="ri-broadcast-line text-sm" />
                  Buka di IDN
                  <i className="ri-arrow-right-up-line text-sm" />
                </a>
              ) : (
                <a
                  href="https://www.showroom-live.com/r/JKT48_Eli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[color:var(--retro-brown-dark)] text-[11px] font-black uppercase tracking-[0.25em] hover:bg-[color:var(--retro-cream)] transition-colors"
                >
                  <i className="ri-vidicon-line text-sm" />
                  Buka SHOWROOM
                  <i className="ri-arrow-right-up-line text-sm" />
                </a>
              )}
            </div>
            {/* Dual-platform note kalau dua-duanya nyala (rare tapi possible) */}
            {idnLive?.isLive && isShowroomLive && (
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/55">
                Live paralel di SHOWROOM juga
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ImminentSurface = ({ event, countdown }) => {
  const kindLabel = KIND_LABEL[event.kind] || 'Event';
  const teamLabel = event.team ? TEAM_LABEL[event.team] : null;
  const dayBucket = (() => {
    const eventDate = new Date(event.date);
    const today = new Date();
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((eventDate - today) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return 'Hari Ini';
    if (diffDays === 1) return 'Besok';
    return `${diffDays} Hari Lagi`;
  })();
  return (
    <div className="relative rounded-3xl overflow-hidden border border-[color:var(--retro-burgundy)]/25 bg-[color:var(--retro-cream-dark)] shadow-lg">
      {/* Spine accent */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ background: 'var(--retro-burgundy)' }}
      />
      {/* Sepia paper texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(140,100,60,0.04) 0 1px, transparent 1px 8px)',
        }}
      />
      <div className="relative px-6 sm:px-8 md:px-10 py-7 md:py-9">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.3em]">
            <i className="ri-time-line text-xs" />
            {dayBucket}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--retro-brown-dark)]/65">
            {kindLabel}
            {teamLabel && ` · ${teamLabel}`}
          </span>
        </div>

        <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-center">
          <div className="md:col-span-7">
            <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-[0.95] text-[color:var(--retro-text-primary)] mb-3">
              {event.title || 'Eli akan tampil'}
            </h2>
            <p className="text-sm text-[color:var(--retro-brown-dark)]/75 mb-1">
              {formatEventDate(event.date)}
            </p>
            {/* Venue ditampilkan untuk M&G/off-site/event; theater show
                gak perlu (venue + set_list udah implied oleh title). */}
            {event.venue && event.kind !== 'SHOW' && (
              <p className="text-sm text-[color:var(--retro-brown-dark)]/65 italic">
                {event.venue}
              </p>
            )}
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[11px] font-black uppercase tracking-[0.25em] hover:bg-[color:var(--retro-burgundy-light)] transition-colors"
              >
                <i className="ri-ticket-2-line text-sm" />
                Buka di jkt48.com
                <i className="ri-arrow-right-up-line text-sm" />
              </a>
            )}
          </div>
          <div className="md:col-span-5 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]/80 mb-2">
              Hitung Mundur
            </p>
            <p
              className="font-header text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter tabular-nums text-[color:var(--retro-text-primary)] leading-none"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              {countdown}
            </p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/55">
              sampai mulai
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const UpcomingSurface = ({ event, countdown }) => {
  const kindLabel = KIND_LABEL[event.kind] || 'Event';
  const teamLabel = event.team ? TEAM_LABEL[event.team] : null;
  return (
    <div className="relative rounded-3xl overflow-hidden border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-bg-primary)] shadow-sm">
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: 'var(--retro-burgundy)', opacity: 0.7 }}
      />
      <div className="relative px-6 sm:px-8 md:px-10 py-6 md:py-8">
        <div className="grid md:grid-cols-12 gap-5 md:gap-8 items-center">
          <div className="md:col-span-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]/80 mb-2">
              Show Berikutnya · {kindLabel}
              {teamLabel && ` · ${teamLabel}`}
            </p>
            <h2 className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-[1] text-[color:var(--retro-text-primary)] mb-2">
              {event.title || 'Eli akan tampil'}
            </h2>
            <p className="text-sm text-[color:var(--retro-brown-dark)]/75 mb-1">
              {formatEventDate(event.date)}
            </p>
            {event.venue && event.kind !== 'SHOW' && (
              <p className="text-sm text-[color:var(--retro-brown-dark)]/60 italic">
                {event.venue}
              </p>
            )}
          </div>
          <div className="md:col-span-4 md:text-right">
            <p
              className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter tabular-nums text-[color:var(--retro-burgundy)] leading-none"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              {countdown}
            </p>
            <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/55">
              lagi
            </p>
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy-light)] underline decoration-dotted underline-offset-4 transition-colors"
              >
                Buka di jkt48.com
                <i className="ri-arrow-right-up-line text-sm" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const IdleSurface = () => (
  <div className="relative rounded-3xl border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-bg-primary)] px-6 sm:px-8 py-6 text-center">
    <p className="text-sm text-[color:var(--retro-brown-dark)]/65 italic mb-2">
      Belum ada jadwal Eli yang tercatat saat ini.
    </p>
    <Link
      to="/schedule"
      className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy-light)] underline decoration-dotted underline-offset-4"
    >
      <i className="ri-archive-line text-sm" />
      Buka Arsip Jadwal
    </Link>
  </div>
);

const PlatformStrip = ({ isIdnLive, isShowroomLive, idnLiveUrl, nextShow }) => {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2">
      <PlatformDot
        live={isIdnLive}
        label="IDN Live"
        sub={isIdnLive ? 'Live' : 'Off'}
        href={isIdnLive ? idnLiveUrl || 'https://www.idn.app/jkt48_eli' : 'https://www.idn.app/jkt48_eli'}
      />
      <span className="hidden sm:block w-px h-3 bg-[color:var(--retro-brown-dark)]/20" />
      <PlatformDot
        live={isShowroomLive}
        label="Showroom"
        sub={isShowroomLive ? 'Live' : 'Off'}
        href="https://www.showroom-live.com/r/JKT48_Eli"
      />
      <span className="hidden sm:block w-px h-3 bg-[color:var(--retro-brown-dark)]/20" />
      <span className="inline-flex items-center gap-2">
        <i className="ri-mic-2-line text-sm text-[color:var(--retro-burgundy)]/70" />
        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[color:var(--retro-brown-dark)]/80">
          Theater
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--retro-brown-dark)]/55">
          {nextShow ? formatShortDate(nextShow.date) : 'Belum dijadwalkan'}
        </span>
      </span>
    </div>
  );
};

export default EliStatusHero;
