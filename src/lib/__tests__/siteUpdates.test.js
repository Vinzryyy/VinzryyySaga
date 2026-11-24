import { beforeEach, describe, expect, it } from 'vitest';
import { isNewSince, latestDate, markSeen, readLastSeen } from '../siteUpdates';
import { SITE_UPDATES } from '../../data/siteUpdates';

describe('siteUpdates', () => {
  beforeEach(() => localStorage.clear());

  it('marks nothing new on a first visit, then only newer updates', () => {
    const u = { date: '2026-11-24' };
    expect(isNewSince(u, null)).toBe(false);
    expect(isNewSince(u, '2026-11-23')).toBe(true);
    expect(isNewSince(u, '2026-11-24')).toBe(false);
  });

  it('remembers the last visit in this browser', () => {
    expect(readLastSeen()).toBe(null);
    markSeen('2026-11-24');
    expect(readLastSeen()).toBe('2026-11-24');
  });

  it('data is newest first with valid dates and internal links', () => {
    const dates = SITE_UPDATES.map((u) => u.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const u of SITE_UPDATES) {
      expect(u.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(u.to.startsWith('/')).toBe(true);
      expect(u.title && u.text && u.icon).toBeTruthy();
    }
    expect(latestDate(SITE_UPDATES)).toBe(dates[0]);
  });
});
