/**
 * useIdnLive — polls /api/idn-status?username=… every 30s and returns
 * the user's IDN profile snapshot + live state. Mirrors useShowroomLive
 * but exposes profile data too (avatar, follower count, bio) so callers
 * can drive both the live indicator and stat displays from one source.
 *
 * Pauses polling when the document tab isn't visible; refetches on
 * visibilitychange. Errors are silent so the indicator just stays in
 * its last-known state instead of going noisy.
 *
 * Returns:
 *   { isLive, liveStream, profile, isLoading, error }
 */

import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 30000;

export function useIdnLive(username) {
  const [state, setState] = useState({
    isLive: false,
    liveStream: null,
    profile: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!username) return undefined;
    let cancelled = false;
    let timer;

    const fetchOnce = async () => {
      try {
        const r = await fetch(
          `/api/idn-status?username=${encodeURIComponent(username)}`,
          { cache: 'no-store' },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        setState({
          isLive: !!data.isLive,
          liveStream: data.liveStream || null,
          profile: data.profile || null,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, isLoading: false, error: err.message }));
      }
    };

    fetchOnce();
    timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchOnce();
    }, POLL_INTERVAL_MS);

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
  }, [username]);

  return state;
}
