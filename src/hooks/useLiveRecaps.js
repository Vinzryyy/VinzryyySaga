import { useEffect, useState } from 'react';
import { publicRecaps } from '../lib/liveRecaps';

// One fetch per page load, shared by /rekap-live and Rekap 2026.
let recapsPromise = null;
export const loadLiveRecaps = () => {
  if (!recapsPromise) {
    recapsPromise = fetch('/data/live-recaps.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(publicRecaps)
      .catch(() => []);
  }
  return recapsPromise;
};

/** → { recaps, loading }: valid recaps, newest first. */
export const useLiveRecaps = () => {
  const [state, setState] = useState({ recaps: [], loading: true });
  useEffect(() => {
    let alive = true;
    loadLiveRecaps().then((recaps) => alive && setState({ recaps, loading: false }));
    return () => { alive = false; };
  }, []);
  return state;
};
