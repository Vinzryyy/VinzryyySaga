/**
 * RoadToShow — "Menuju 500 Show": a progress bar from Eli's last round
 * milestone to the next one, with Arme walking along it.
 *
 * The count is live (lib/showMilestone): the manual baseline plus every
 * theater show on the merged schedule (scraper, JKT48Connect bot, admin)
 * that has aired since, so Arme moves forward on her own after each show.
 * Same rule as LiveCounter on /schedule: a show counts from the day after.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../../config/siteConfig';
import { liveTheaterTotal, nextMilestone } from '../../lib/showMilestone';

const ARME = '/Arme/ELI_1_a.webp';
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const useShowLog = () => {
  const [log, setLog] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-show-log.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setLog(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return log;
};

const RoadToShow = ({ events }) => {
  const showLog = useShowLog();
  const [todayMs] = useState(startOfToday);
  const { total, lastShow } = useMemo(
    () => liveTheaterTotal({ events, careerStats: SITE_CONFIG.eli.careerStats, showLog, nowMs: todayMs }),
    [events, showLog, todayMs],
  );
  if (!total) return null;
  const m = nextMilestone(total);
  // Keep Arme fully inside the track at both ends. (The image has ~13%
  // transparent space under her feet; the negative margin sets her on the bar.)
  const armeAt = Math.min(Math.max(m.pct, 4), 96);

  return (
    <section
      aria-labelledby="road-to-show-title"
      className="mt-6 rounded-3xl border border-[color:var(--retro-burgundy)]/15 bg-gradient-to-br from-[#fdf6ee] to-white p-5 sm:p-6 md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
            <i className="ri-flag-2-line text-sm" aria-hidden="true" /> Menuju {m.target} Show
          </p>
          <h3 id="road-to-show-title" className="mt-2 font-header text-2xl sm:text-3xl font-black tracking-tighter leading-none text-[color:var(--retro-text-primary)]">
            {m.left} show lagi
          </h3>
        </div>
        <p className="text-xs text-[color:var(--retro-text-muted)] sm:text-right">
          <b className="font-header text-lg tabular-nums text-[color:var(--retro-burgundy)]">{total}</b> panggung teater sejak debut
          {lastShow && (
            <span className="block">
              Terakhir: {lastShow.set_list || lastShow.title}, {dateFmt.format(new Date(lastShow.date))}
            </span>
          )}
        </p>
      </div>

      {/* Track: Arme stands on the bar at the current position. */}
      <div className="relative mt-20 sm:mt-24">
        <div
          className="absolute bottom-full -translate-x-1/2 transition-[left] duration-700"
          style={{ left: `${armeAt}%` }}
          aria-hidden="true"
        >
          <img
            src={ARME}
            alt=""
            width="96"
            height="96"
            loading="lazy"
            className="-mb-[8px] sm:-mb-[10px] h-20 w-20 sm:h-24 sm:w-24 object-contain drop-shadow-md motion-safe:animate-[arme-walk_1.6s_ease-in-out_infinite]"
          />
        </div>
        <div
          role="progressbar"
          aria-label={`Show teater Eli menuju ${m.target}`}
          aria-valuemin={m.from}
          aria-valuemax={m.target}
          aria-valuenow={total}
          aria-valuetext={`${total} dari ${m.target} show, ${m.left} lagi`}
          className="relative h-3 rounded-full bg-[color:var(--retro-brown-dark)]/10 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[color:var(--retro-gold)] to-[color:var(--retro-burgundy)] transition-[width] duration-700"
            style={{ width: `${m.pct}%` }}
          />
          {m.ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 h-full w-px bg-white/70"
              style={{ left: `${((t - m.from) / (m.target - m.from)) * 100}%` }}
            />
          ))}
        </div>
        <div className="relative mt-2 h-4 text-[10px] font-bold tabular-nums text-[color:var(--retro-text-muted)]">
          <span className="absolute left-0">{m.from}</span>
          {m.ticks.map((t) => (
            <span
              key={t}
              className={`absolute -translate-x-1/2 ${total >= t ? 'text-[color:var(--retro-burgundy)]' : ''}`}
              style={{ left: `${((t - m.from) / (m.target - m.from)) * 100}%` }}
            >
              {t}
            </span>
          ))}
          <span className="absolute right-0 inline-flex items-center gap-1 text-[color:var(--retro-burgundy)]">
            <i className="ri-flag-fill" aria-hidden="true" /> {m.target}
          </span>
        </div>
      </div>

      <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--retro-text-muted)]">
        <span>Arme maju sendiri setiap kali Eli tampil di teater.</span>
        <Link to="/schedule" className="font-bold text-[color:var(--retro-burgundy)] hover:underline">
          Lihat jadwal show →
        </Link>
      </p>
    </section>
  );
};

export default RoadToShow;
