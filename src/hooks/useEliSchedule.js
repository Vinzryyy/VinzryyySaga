/**
 * useEliSchedule — shared loader for /data/eli-schedule.json.
 *
 * EliStatusHero (full status section) and Home hero (compact "berikutnya"
 * chip) both need the same data. Module-level promise cache dedupes the
 * HTTP request so mounting both components only fetches once.
 *
 * Exports `deriveLiveState` so each consumer can reuse the same
 * idle/upcoming/imminent/live classification logic.
 */

import { useEffect, useState } from 'react';

const SCHEDULE_URL = '/data/eli-schedule.json';

export const IMMINENT_MS = 24 * 60 * 60 * 1000;
export const UPCOMING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const ONGOING_GRACE_MS = 2 * 60 * 60 * 1000;

let cachedPromise = null;

const loadSchedule = () => {
  if (!cachedPromise) {
    cachedPromise = fetch(SCHEDULE_URL, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((err) => {
        cachedPromise = null;
        throw err;
      });
  }
  return cachedPromise;
};

export const useEliSchedule = () => {
  const [schedule, setSchedule] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadSchedule()
      .then((data) => { if (!cancelled) setSchedule(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return schedule;
};

export const pickNextEvent = (schedule, nowMs) => {
  const events = schedule?.events || [];
  return (
    events
      .filter((e) => {
        const t = new Date(e.date).getTime();
        if (Number.isNaN(t)) return false;
        return t >= nowMs - ONGOING_GRACE_MS;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  );
};

export const deriveLiveState = ({ schedule, idnLive, showroomLive, now }) => {
  const isIdnLive = !!idnLive?.isLive;
  const isShowroomLive = !!showroomLive?.isLive;
  const anyLive = isIdnLive || isShowroomLive;
  const nextEvent = pickNextEvent(schedule, now);
  const diffToNext = nextEvent ? new Date(nextEvent.date).getTime() - now : null;
  let state = 'idle';
  if (anyLive) state = 'live';
  else if (diffToNext != null && diffToNext <= IMMINENT_MS) state = 'imminent';
  else if (diffToNext != null && diffToNext <= UPCOMING_WINDOW_MS) state = 'upcoming';
  return { state, nextEvent, diffToNext, isIdnLive, isShowroomLive };
};
