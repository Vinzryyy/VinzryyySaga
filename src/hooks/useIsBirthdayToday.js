/**
 * useIsBirthdayToday — returns true if the current time falls inside the
 * 24-hour window starting at `targetIso` (Eli's birthday at WIB midnight).
 *
 * Used at App level to fire the site-wide balloon/confetti celebration
 * overlay on every page on 15 Juni 2026 only — after that day passes the
 * overlay quietly removes itself.
 *
 * Re-checks every 60s so a visitor sitting on the page at midnight gets
 * the overlay turning on/off without needing a manual refresh.
 */

import { useEffect, useMemo, useState } from 'react';

const useIsBirthdayToday = (targetIso) => {
  const window = useMemo(() => {
    const start = new Date(targetIso).getTime();
    if (Number.isNaN(start)) return null;
    const end = start + 24 * 60 * 60 * 1000;
    return { start, end };
  }, [targetIso]);

  const compute = () => {
    if (!window) return false;
    const now = Date.now();
    return now >= window.start && now < window.end;
  };

  const [active, setActive] = useState(compute);

  useEffect(() => {
    if (!window) return undefined;
    setActive(compute());
    const id = setInterval(() => setActive(compute()), 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window]);

  return active;
};

export default useIsBirthdayToday;
