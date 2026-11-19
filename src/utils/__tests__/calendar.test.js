import { describe, it, expect } from 'vitest';
import {
  addMonths,
  buildMonthGrid,
  dayKeyWIB,
  eventKindMatches,
  eventType,
  groupEventsByDay,
  monthRange,
} from '../calendar';

describe('dayKeyWIB', () => {
  it('buckets by Jakarta date, not UTC', () => {
    // 2026-11-20 18:30 UTC = 2026-11-21 01:30 WIB
    expect(dayKeyWIB('2026-11-20T18:30:00Z')).toBe('2026-11-21');
    // 2026-11-20 16:59 UTC = 2026-11-20 23:59 WIB
    expect(dayKeyWIB('2026-11-20T16:59:00Z')).toBe('2026-11-20');
  });

  it('keeps offset-tagged WIB timestamps on their own day', () => {
    expect(dayKeyWIB('2026-11-20T19:00:00+07:00')).toBe('2026-11-20');
  });

  it('returns null for invalid input', () => {
    expect(dayKeyWIB(null)).toBeNull();
    expect(dayKeyWIB('')).toBeNull();
    expect(dayKeyWIB('not a date')).toBeNull();
  });
});

describe('buildMonthGrid', () => {
  it('starts on Monday and covers whole weeks', () => {
    // November 2026 starts on a Sunday → 6 leading days from October.
    const cells = buildMonthGrid(2026, 10);
    expect(cells.length % 7).toBe(0);
    expect(cells[0].key).toBe('2026-10-26');
    expect(cells[6]).toMatchObject({ key: '2026-11-01', inMonth: true, day: 1 });
    expect(cells.filter((c) => c.inMonth)).toHaveLength(30);
  });

  it('handles leap-year February', () => {
    const cells = buildMonthGrid(2028, 1);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(29);
  });

  it('uses exactly 4 rows when a 28-day February starts on Monday', () => {
    // February 2027 starts on a Monday.
    expect(buildMonthGrid(2027, 1)).toHaveLength(28);
  });
});

describe('addMonths', () => {
  it('wraps across years in both directions', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('eventType / eventKindMatches', () => {
  const show = { kind: 'SHOW' };
  const twoShot = { kind: 'EXCLUSIVE', category: 'TWO_SHOT' };
  const photobookVC = { kind: 'EXCLUSIVE', category: 'DIGITAL_PHOTOBOOK' };
  const vcEvent = { kind: 'EVENT', is_video_call: true };
  const offsite = { kind: 'GENERAL' };

  it('classifies each kind', () => {
    expect(eventType(show)).toBe('show');
    expect(eventType(twoShot)).toBe('mg');
    expect(eventType(photobookVC)).toBe('vc');
    expect(eventType(vcEvent)).toBe('vc');
    expect(eventType(offsite)).toBe('event');
  });

  it('keeps the original filter-chip semantics', () => {
    expect(eventKindMatches(offsite, 'show')).toBe(true);
    expect(eventKindMatches(vcEvent, 'show')).toBe(false);
    expect(eventKindMatches(photobookVC, 'mg')).toBe(false);
    expect(eventKindMatches(photobookVC, 'vc')).toBe(true);
    expect(eventKindMatches(twoShot, 'all')).toBe(true);
  });
});

describe('groupEventsByDay', () => {
  it('groups by WIB date and sorts by start time', () => {
    const map = groupEventsByDay([
      { title: 'late', date: '2026-11-21T00:00:00+07:00', start_time: '19:00' },
      { title: 'early', date: '2026-11-21T00:00:00+07:00', start_time: '14:00' },
      { title: 'bad', date: 'nope' },
    ]);
    expect([...map.keys()]).toEqual(['2026-11-21']);
    expect(map.get('2026-11-21').map((e) => e.title)).toEqual(['early', 'late']);
  });
});

describe('monthRange', () => {
  it('always includes the current month', () => {
    const now = new Date('2026-11-19T05:00:00Z');
    expect(monthRange([], now)).toEqual({
      min: { year: 2026, month: 10 },
      max: { year: 2026, month: 10 },
    });
    expect(monthRange([{ date: '2027-01-10T12:00:00Z' }], now).max).toEqual({ year: 2027, month: 0 });
  });
});
