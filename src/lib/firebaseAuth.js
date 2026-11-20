/**
 * Firebase Auth — only imported by the admin page, so the auth SDK never
 * lands in public page bundles. Google sign-in; admin rights come from
 * RTDB /admins/{uid} === true (see database.rules.json).
 */

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { firebaseApp } from './firebase';

export const auth = firebaseApp ? getAuth(firebaseApp) : null;

export const signInWithGoogle = () => {
  if (!auth) return Promise.reject(new Error('Firebase belum dikonfigurasi'));
  return signInWithPopup(auth, new GoogleAuthProvider());
};

export const signOutAdmin = () => (auth ? signOut(auth) : Promise.resolve());

export const subscribeToAuth = (cb) => {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
};
