/**
 * By-U support counter — thin wrapper around Firebase Realtime Database
 * untuk track berapa orang udah klik "Saya menunggu" di /taman/titipan
 * sebelum tanggal rilis 15 Juni 2026.
 *
 * Exposes:
 *   subscribeToByuSupportCount(cb) — live count subscription
 *   incrementByuSupport()           — atomic +1
 *
 * Schema: /byu_support_count (number) — single counter, no per-user
 * tracking server-side. Dedup terjadi client-side via localStorage
 * (key 'byu-support-clicked') sebelum increment. Spam-resistant cukup
 * untuk skala launch window; kalau jadi target abuse nanti, pindahin
 * ke per-user node + security rules.
 */

import {
  ref,
  onValue,
  off,
  runTransaction,
} from 'firebase/database';
import { realtimeDb, isFirebaseConfigured } from './firebase';

const BYU_SUPPORT_PATH = 'byu_support_count';

/**
 * Subscribe to live By-U support count.
 * @param {(count:number) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToByuSupportCount(callback) {
  if (!isFirebaseConfigured) {
    callback(0);
    return () => {};
  }
  const countRef = ref(realtimeDb, BYU_SUPPORT_PATH);
  const handler = (snapshot) => {
    callback(snapshot.val() || 0);
  };
  onValue(countRef, handler);
  return () => off(countRef, 'value', handler);
}

/**
 * Increment By-U support count by 1 atomically.
 * Caller is responsible untuk localStorage dedup biar 1 user gak nge-spam.
 *
 * @returns {Promise<{ok:boolean, count?:number, error?:string}>}
 */
export async function incrementByuSupport() {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase belum terkonfigurasi.' };
  }
  try {
    const countRef = ref(realtimeDb, BYU_SUPPORT_PATH);
    const result = await runTransaction(countRef, (current) => (current || 0) + 1);
    return { ok: true, count: result.snapshot.val() };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Gagal menyimpan dukungan.',
    };
  }
}
