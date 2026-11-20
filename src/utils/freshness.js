/**
 * freshness — "is this scraped data too old to show?"
 *
 * Scrapers only bump `fetchedAt` on a successful run, so an old
 * timestamp means the source has been failing (e.g. jkt48.com blocking
 * the GH Action). Components use this to hide time-sensitive strips
 * rather than present months-old data as "terbaru".
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** True when `fetchedAt` is missing, invalid, or older than `maxAgeDays`. */
export const isStale = (fetchedAt, maxAgeDays, now = Date.now()) => {
  if (!fetchedAt) return true;
  const t = new Date(fetchedAt).getTime();
  if (Number.isNaN(t)) return true;
  return now - t > maxAgeDays * DAY_MS;
};
