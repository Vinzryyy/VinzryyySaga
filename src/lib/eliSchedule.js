/**
 * Eli Schedule data layer — Firebase Realtime Database.
 *
 * Owner-managed list of confirmed/announced Eli appearances. The site
 * displays these prominently alongside the auto-scraped general JKT48
 * calendar (see public/data/jkt48-calendar.json) so visitors see what
 * Eli is actually in, not just every JKT48 event.
 *
 * Schema (one node per appearance under /eli-schedule):
 *   {
 *     date: string (ISO date, e.g. "2026-06-15"),
 *     time: string (optional, e.g. "19:00"),
 *     title: string (e.g. "Cara Meminum Ramune"),
 *     setlist: string (optional),
 *     venue: string,
 *     status: 'confirmed' | 'announced' | 'rumored',
 *     source: string (URL where you saw it announced — for verification),
 *     notes: string (optional),
 *     addedAt: serverTimestamp,
 *   }
 *
 * Owner adds entries via Firebase console (or a future admin page).
 * Frontend is read-only here — no public submit path.
 */

import { ref, onValue, off, query, orderByChild } from 'firebase/database';
import { realtimeDb, isFirebaseConfigured } from './firebase';

const SCHEDULE_PATH = 'eli-schedule';

/**
 * Subscribe to the live Eli schedule feed (sorted ascending by date).
 * @param {(items: Array<{id:string, date:string, time?:string, title:string, setlist?:string, venue:string, status:string, source?:string, notes?:string}>) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToEliSchedule(callback) {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => {};
  }

  const scheduleRef = query(ref(realtimeDb, SCHEDULE_PATH), orderByChild('date'));

  const handler = (snapshot) => {
    const value = snapshot.val();
    if (!value) {
      callback([]);
      return;
    }
    const list = Object.entries(value)
      .map(([id, entry]) => ({
        id,
        date: entry.date,
        time: entry.time || '',
        title: entry.title,
        setlist: entry.setlist || '',
        venue: entry.venue,
        status: entry.status || 'announced',
        source: entry.source || '',
        notes: entry.notes || '',
      }))
      // Ascending by date so the next-upcoming bubbles to the top
      // when the consumer filters out past entries.
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    callback(list);
  };

  onValue(scheduleRef, handler);
  return () => off(scheduleRef, 'value', handler);
}
