/**
 * scheduleAdminDb — read/write Eli's schedule entries at RTDB /eli_schedule.
 * Used by /admin/jadwal. Public pages read the same node via REST in
 * scheduleSource.js.
 *
 * Entry shape (all strings unless noted; dates/times are WIB):
 *   { kind, title, date: 'YYYY-MM-DD', start_time?, end_time?, category?,
 *     venue?, url?, is_video_call?: bool, is_birthday_show?: bool,
 *     unit_song?, position?, partner?, note?, updatedAt: number }
 */

import { ref, push, set, remove, onValue, get, serverTimestamp } from 'firebase/database';
import { realtimeDb } from './firebase';
import { ADMIN_SCHEDULE_PATH } from './scheduleSource';

const ALLOWED = [
  'kind', 'title', 'date', 'start_time', 'end_time', 'category', 'venue', 'url',
  'is_video_call', 'is_birthday_show', 'unit_song', 'position', 'partner', 'note',
];

/** Drop empty strings / unknown keys so the DB rules' $other guard passes. */
export const cleanEntry = (entry) => {
  const out = {};
  ALLOWED.forEach((k) => {
    const v = entry[k];
    if (v === undefined || v === null) return;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) out[k] = t;
    } else if (typeof v === 'boolean') {
      if (v) out[k] = true;
    }
  });
  return out;
};

const requireDb = () => {
  if (!realtimeDb) throw new Error('Firebase belum dikonfigurasi');
  return realtimeDb;
};

export const isAdmin = async (uid) => {
  if (!uid || !realtimeDb) return false;
  try {
    const snap = await get(ref(realtimeDb, `admins/${uid}`));
    return snap.val() === true;
  } catch {
    return false; // rules deny reads for non-admins' own missing node too
  }
};

export const subscribeToSchedule = (cb, onError) => {
  if (!realtimeDb) {
    cb([]);
    return () => {};
  }
  return onValue(
    ref(realtimeDb, ADMIN_SCHEDULE_PATH),
    (snap) => {
      const val = snap.val() || {};
      cb(Object.entries(val).map(([id, v]) => ({ ...v, id })));
    },
    onError,
  );
};

export const saveEntry = (entry, id) => {
  const db = requireDb();
  const data = { ...cleanEntry(entry), updatedAt: serverTimestamp() };
  if (id) return set(ref(db, `${ADMIN_SCHEDULE_PATH}/${id}`), data);
  return set(push(ref(db, ADMIN_SCHEDULE_PATH)), data);
};

export const deleteEntry = (id) => remove(ref(requireDb(), `${ADMIN_SCHEDULE_PATH}/${id}`));
