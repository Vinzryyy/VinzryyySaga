/**
 * Tree-for-Eli data layer — community support counter for the
 * birthday "Pohon untuk Eli" gimmick on Home.
 *
 * Schema (RTDB):
 *   /tree_support/total: integer  — global lifetime support count
 *
 * One tap = +1 support; the Home component handles per-day-per-device
 * rate limiting via localStorage so this layer just trusts the
 * request. Server-side throttling (one increment per IP per day)
 * lives in the RTDB security rules — set those up at deploy time
 * if abuse becomes a concern.
 */

import {
  ref,
  onValue,
  off,
  runTransaction,
} from 'firebase/database';
import { realtimeDb, isFirebaseConfigured } from './firebase';

const TREE_TOTAL_PATH = 'tree_support/total';

/**
 * Subscribe to the live total support count.
 * @param {(count:number) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToTreeSupports(callback) {
  if (!isFirebaseConfigured) {
    callback(0);
    return () => {};
  }
  const node = ref(realtimeDb, TREE_TOTAL_PATH);
  const handler = (snapshot) => {
    callback(Number(snapshot.val()) || 0);
  };
  onValue(node, handler);
  return () => off(node, 'value', handler);
}

/**
 * Atomically increment the total support count by 1.
 * @returns {Promise<{ok:boolean, count?:number, error?:string}>}
 */
export async function incrementTreeSupports() {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase belum terkonfigurasi.' };
  }
  try {
    const node = ref(realtimeDb, TREE_TOTAL_PATH);
    const result = await runTransaction(node, (current) => (current || 0) + 1);
    return { ok: true, count: result.snapshot.val() };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Gagal menyimpan dukungan.',
    };
  }
}
