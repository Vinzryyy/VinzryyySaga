/**
 * Eli's lifetime theater-show count and the road to the next milestone.
 *
 * The count is a manual baseline plus the theater shows on the schedule
 * that aired after it. Two baselines exist: the per-show log
 * (public/data/eli-show-log.json) and the weekly #JumlahShowJKT48 total in
 * siteConfig.eli.careerStats; the newer one wins. Shared by LiveCounter on
 * /schedule and RoadToShow on the home page so both always agree.
 */

// Theater = SHOW + in-theater EVENT (not Video Call); mirrors count-eli-shows.py.
export const isTheaterEntry = (entry) =>
  entry?.kind === 'SHOW' || (entry?.kind === 'EVENT' && !entry.is_video_call);

/** The newer of the two baselines → { total, asOfDate }. */
export const pickBaseline = (careerStats, showLog) => {
  const logIsNewer =
    showLog?.asOfDate && (!careerStats?.asOfDate || showLog.asOfDate >= careerStats.asOfDate);
  if (logIsNewer) return { total: showLog.totalShows ?? 0, asOfDate: showLog.asOfDate };
  return {
    total: careerStats?.theater ?? showLog?.totalShows ?? 0,
    asOfDate: careerStats?.asOfDate ?? showLog?.asOfDate ?? null,
  };
};

/**
 * Baseline + theater shows dated after the baseline day and not after
 * `nowMs` (future shows don't count until they air).
 * → { total, baseline, delta, asOfDate, lastShow }
 */
export const liveTheaterTotal = ({ events, careerStats, showLog, nowMs = Date.now() }) => {
  const { total: baseline, asOfDate } = pickBaseline(careerStats, showLog);
  const asOfMs = asOfDate ? new Date(asOfDate).getTime() : null;
  let delta = 0;
  let lastShow = null;
  (events || []).forEach((entry) => {
    if (!isTheaterEntry(entry)) return;
    const ms = new Date(entry.date).getTime();
    if (Number.isNaN(ms) || ms > nowMs) return;
    if (asOfMs != null && ms > asOfMs) delta += 1;
    if (!lastShow || ms > new Date(lastShow.date).getTime()) lastShow = entry;
  });
  return { total: baseline + delta, baseline, delta, asOfDate, lastShow };
};

/**
 * Where `total` sits between the last round milestone and the next one.
 * 417 → { from: 400, target: 500, done: 17, left: 83, pct: 17, ticks: [425, 450, 475] }
 */
export const nextMilestone = (total, step = 100, tickStep = 25) => {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  const from = Math.floor(n / step) * step;
  const target = from + step;
  const done = n - from;
  const ticks = [];
  for (let t = from + tickStep; t < target; t += tickStep) ticks.push(t);
  return { from, target, done, left: target - n, pct: (done / step) * 100, ticks };
};
