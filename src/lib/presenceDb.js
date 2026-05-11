/**
 * Presence tracker — siapa yang lagi buka /denyut (Heartbeat Website)
 * sekarang. Berbasis Firebase RTDB pattern presence:
 *   /presence/{sessionId} = { joinedAt: serverTimestamp }
 *   onDisconnect().remove() — Firebase server hapus otomatis saat
 *   socket putus (tab tutup, lost connection, dll).
 *
 * Bukan per-user auth (anon, gak ada login). sessionId = uuid generate
 * per page mount, jadi 1 tab = 1 "hati". Refresh = sessionId baru tapi
 * yg lama di-cleanup via onDisconnect; transient overlap beberapa
 * detik aja.
 *
 * Schema flat, single counter via snapshot.size dari subscribe. Cocok
 * sampai puluhan ribu concurrent — RTDB Spark tier OK. Kalau jadi
 * concern, pindahin ke counter aggregate dgn cloud function.
 */

import {
  ref,
  onValue,
  off,
  onDisconnect,
  set,
  serverTimestamp,
  remove,
} from 'firebase/database';
import { realtimeDb, isFirebaseConfigured } from './firebase';

const PRESENCE_PATH = 'presence';

const genSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Join presence: write own node + register onDisconnect cleanup.
 * Returns { sessionId, leave } — caller harus panggil leave() saat
 * unmount supaya node ke-cleanup di hot reload juga (onDisconnect cuma
 * fire kalau socket bener-bener putus).
 *
 * @returns {{sessionId:string, leave:() => Promise<void>} | null}
 */
export function joinPresence() {
  if (!isFirebaseConfigured) return null;
  const sessionId = genSessionId();
  const nodeRef = ref(realtimeDb, `${PRESENCE_PATH}/${sessionId}`);
  set(nodeRef, { joinedAt: serverTimestamp() }).catch(() => {});
  onDisconnect(nodeRef).remove().catch(() => {});
  return {
    sessionId,
    leave: async () => {
      try {
        await remove(nodeRef);
      } catch {
        /* offline or already removed */
      }
    },
  };
}

/**
 * Subscribe to live presence count.
 * @param {(count:number) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToPresenceCount(callback) {
  if (!isFirebaseConfigured) {
    callback(0);
    return () => {};
  }
  const presenceRef = ref(realtimeDb, PRESENCE_PATH);
  const handler = (snapshot) => {
    const val = snapshot.val();
    callback(val ? Object.keys(val).length : 0);
  };
  onValue(presenceRef, handler);
  return () => off(presenceRef, 'value', handler);
}
