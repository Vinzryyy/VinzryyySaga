/**
 * Helpers for "Baru di Armeniaca": which updates are new for this visitor.
 * The last visit date is a per-browser convenience in localStorage; with
 * no storage (or on a first visit) nothing is marked new, so a first-time
 * visitor isn't greeted by a wall of "Baru" badges.
 */

const KEY = 'armeniaca_updates_seen';

export const readLastSeen = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const markSeen = (date) => {
  try {
    localStorage.setItem(KEY, date);
  } catch {
    /* nothing to remember */
  }
};

/** Updates newer than lastSeen ('YYYY-MM-DD'); none on a first visit. */
export const isNewSince = (update, lastSeen) => Boolean(lastSeen) && update.date > lastSeen;

/** Newest date in the list, or null. */
export const latestDate = (updates) => (updates.length ? updates.reduce((m, u) => (u.date > m ? u.date : m), updates[0].date) : null);
