import { describe, it, expect } from 'vitest';
import { isStale } from '../freshness';

describe('isStale', () => {
  const now = new Date('2026-11-20T00:00:00Z').getTime();

  it('treats recent data as fresh', () => {
    expect(isStale('2026-11-10T00:00:00Z', 30, now)).toBe(false);
  });

  it('flags data older than the window', () => {
    expect(isStale('2026-09-15T16:34:46.598593Z', 30, now)).toBe(true);
  });

  it('flags missing or invalid timestamps', () => {
    expect(isStale(undefined, 30, now)).toBe(true);
    expect(isStale('nope', 30, now)).toBe(true);
  });
});
