/**
 * useShowroomLive — polls /api/showroom-status?room=… every 30s and
 * returns the current live state. The serverless function caches at
 * the edge for 20s, so all visitors share a near-cached read regardless
 * of how many tabs are open.
 *
 * Returns: { isLive, startedAt, isLoading, error }
 *
 * Pauses polling when the document tab isn't visible — there's no
 * point burning cycles when the user can't see the indicator anyway.
 */

import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 30000;

export function useShowroomLive(roomKey) {
  const [state, setState] = useState({
    isLive: false,
    startedAt: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!roomKey) return undefined;
    let cancelled = false;
    let timer;

    const fetchOnce = async () => {
      try {
        const r = await fetch(`/api/showroom-status?room=${encodeURIComponent(roomKey)}`, {
          cache: 'no-store',
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        setState({
          isLive: !!data.isLive,
          startedAt: data.startedAt || null,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        // Quietly surface errors — the indicator just stays in its
        // last known state. In dev (no /api) this 404s; we don't want
        // a noisy dot on screen.
        setState((s) => ({ ...s, isLoading: false, error: err.message }));
      }
    };

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchOnce();
    };

    fetchOnce();
    timer = setInterval(tick, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) fetchOnce();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [roomKey]);

  return state;
}
