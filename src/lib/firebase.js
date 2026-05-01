/**
 * Firebase init — Realtime Database (RTDB) only.
 *
 * Why RTDB and not Firestore: as of mid-2024 Google requires billing on
 * all newly-created Firestore projects. RTDB still works on Spark/free
 * with no card. For the wishes wall (a flat list of submissions with
 * realtime read), RTDB is a fine fit and slightly simpler than Firestore.
 *
 * Env vars are loaded from `.env.local` (gitignored). See `.env.example`
 * for the full list.
 */

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL,
);

// Init only when both required env vars are present. `getDatabase()`
// throws "FIREBASE FATAL ERROR: Cannot parse Firebase url" when
// databaseURL is missing — that crash propagates up through the lazy
// Countdown chunk and the ErrorBoundary catches it on Vercel deploys
// where the env vars haven't been set. Every consumer in lib/wishesDb
// already short-circuits via isFirebaseConfigured, so leaving these
// null is safe.
export const firebaseApp = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;
export const realtimeDb = firebaseApp ? getDatabase(firebaseApp) : null;

if (!isFirebaseConfigured) {
  console.warn(
    '[firebase] Missing VITE_FIREBASE_* env vars — wishes feed disabled. Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_DATABASE_URL (Vercel → Project → Settings → Environment Variables) to enable.',
  );
}
