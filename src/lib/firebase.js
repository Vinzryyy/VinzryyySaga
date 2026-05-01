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

// Surface a useful error in dev when env vars are missing instead of a
// cryptic runtime crash deep inside the Firebase SDK.
if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
  console.warn(
    '[firebase] Missing VITE_FIREBASE_* env vars. Copy .env.example to .env.local and fill in the values from Firebase console → Project Settings.',
  );
}

export const firebaseApp = initializeApp(firebaseConfig);
export const realtimeDb = getDatabase(firebaseApp);
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL,
);
