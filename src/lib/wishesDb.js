/**
 * Wishes data layer — thin wrapper around Firebase Realtime Database.
 *
 * Exposes:
 *   submitWish(payload)   — push a new wish; honeypot-aware (silent reject)
 *   subscribeToWishes(cb) — live subscription; returns unsubscribe fn
 *
 * Schema (one node per wish under /wishes):
 *   { name, handle, message, date }
 *
 * `date` is set server-side via `serverTimestamp()` so client clock skew
 * can't reorder the wall.
 */

import {
  ref,
  push,
  set,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp,
} from 'firebase/database';
import { realtimeDb, isFirebaseConfigured } from './firebase';

const WISHES_PATH = 'wishes';
// Cap on how many wishes the wall renders. RTDB's limitToLast keeps the
// query cheap regardless of total volume.
const WISHES_PAGE_SIZE = 100;

/**
 * Submit a new wish.
 * @param {{name:string, handle?:string, message:string, template?:string, honeypot?:string}} payload
 * @returns {Promise<{ok:boolean, silentRejection?:boolean, error?:string}>}
 *   - ok=true on real success
 *   - silentRejection=true when the honeypot fired (we lie back to the
 *     bot/user with a "success" surface to avoid teaching spammers)
 *   - error set when something legitimately went wrong
 */
export async function submitWish(payload) {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase belum terkonfigurasi.' };
  }

  // Honeypot — invisible field humans don't fill. Return ok without writing.
  if (payload.honeypot && payload.honeypot.trim() !== '') {
    return { ok: true, silentRejection: true };
  }

  const name = (payload.name || '').trim();
  const message = (payload.message || '').trim();
  const handle = (payload.handle || '').trim();
  const template = (payload.template || '').trim();

  if (!name || !message) {
    return { ok: false, error: 'Nama dan pesan wajib diisi.' };
  }
  if (name.length > 60) return { ok: false, error: 'Nama maks 60 karakter.' };
  if (handle.length > 40) return { ok: false, error: 'Handle maks 40 karakter.' };
  if (message.length > 240) return { ok: false, error: 'Pesan maks 240 karakter.' };
  if (template.length > 32) return { ok: false, error: 'Template id terlalu panjang.' };

  try {
    const wishRef = push(ref(realtimeDb, WISHES_PATH));
    const data = {
      name,
      handle,
      message,
      date: serverTimestamp(),
    };
    // Only include template when present so the schema stays minimal for
    // wishes submitted before the picker existed (and for any clients
    // that opt out of choosing).
    if (template) data.template = template;
    await set(wishRef, data);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Gagal menyimpan pesan, coba lagi.',
    };
  }
}

/**
 * Subscribe to the live total wish count.
 * Cheaper than fetching the wall when all the caller needs is a number,
 * but still reads every key under /wishes — at meaningful scale (>1k) we
 * should denormalize this into a /wishes_count node updated via a
 * server-side trigger or transaction. Fine for the launch window.
 *
 * @param {(count:number) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToWishCount(callback) {
  if (!isFirebaseConfigured) {
    callback(0);
    return () => {};
  }
  const wishesRef = ref(realtimeDb, WISHES_PATH);
  const handler = (snapshot) => {
    const value = snapshot.val();
    callback(value ? Object.keys(value).length : 0);
  };
  onValue(wishesRef, handler);
  return () => off(wishesRef, 'value', handler);
}

/**
 * Subscribe to the live wishes feed.
 * @param {(wishes: Array<{id:string, name:string, handle?:string, message:string, date:string}>) => void} callback
 *   — Called with the latest sorted (newest-first) wishes whenever RTDB updates.
 * @returns {() => void} unsubscribe — call this in cleanup to detach the listener.
 */
export function subscribeToWishes(callback) {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => {};
  }

  const wishesRef = query(
    ref(realtimeDb, WISHES_PATH),
    orderByChild('date'),
    limitToLast(WISHES_PAGE_SIZE),
  );

  const handler = (snapshot) => {
    const value = snapshot.val();
    if (!value) {
      callback([]);
      return;
    }
    // RTDB returns an object keyed by push-id; reshape to an array and
    // sort newest-first (limitToLast returns ascending by date).
    const list = Object.entries(value)
      .map(([id, wish]) => ({
        id,
        name: wish.name,
        handle: wish.handle || '',
        message: wish.message,
        template: wish.template || '',
        // serverTimestamp resolves to a millis number; convert to ISO so
        // existing date-formatting helpers keep working.
        date:
          typeof wish.date === 'number'
            ? new Date(wish.date).toISOString()
            : wish.date,
      }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    callback(list);
  };

  onValue(wishesRef, handler);
  return () => off(wishesRef, 'value', handler);
}
