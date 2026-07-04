/**
 * ArmeniacaTown peta — shared hooks.
 * Extracted from TamanPeta.jsx to keep the page file smaller.
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscribeToTreeSupports } from '../../../lib/treeDb';

// useArmeniacaProgress — subscribes to Firebase tree_support count.
// Dev override: ?count=N bypasses Firebase and forces a specific value.
export const useArmeniacaProgress = () => {
  const [state, setState] = useState({ count: 0, loaded: false });
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const override = params.get('count');
      if (override !== null) {
        const n = parseInt(override, 10);
        if (!Number.isNaN(n)) {
          setState({ count: Math.max(0, n), loaded: true });
          return undefined;
        }
      }
    }
    const unsubscribe = subscribeToTreeSupports((count) => {
      setState({ count, loaded: true });
    });
    return unsubscribe;
  }, []);
  return state;
};

// WIB hour decimal (e.g. 14.5 = 14:30). Updates every minute.
const computeWibHourDecimal = () => {
  try {
    const fmt = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = fmt.formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return h + m / 60;
  } catch {
    return 12;
  }
};

export const useWibHour = () => {
  const [hour, setHour] = useState(() => computeWibHourDecimal());
  useEffect(() => {
    const id = setInterval(() => setHour(computeWibHourDecimal()), 60_000);
    return () => clearInterval(id);
  }, []);
  return hour;
};
