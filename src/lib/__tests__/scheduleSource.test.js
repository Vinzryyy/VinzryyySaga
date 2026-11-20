import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeManualEvent,
  normalizeManualFile,
  mergeSchedules,
  loadSchedule,
  __resetScheduleCache,
} from '../scheduleSource';

describe('normalizeManualEvent', () => {
  it('fills defaults for a minimal show', () => {
    const { event } = normalizeManualEvent({ title: 'Aitakatta', date: '2026-11-21', start_time: '19:00' });
    expect(event).toMatchObject({
      kind: 'SHOW',
      title: 'Aitakatta',
      date: '2026-11-21T19:00:00+07:00',
      team: 'DREAM',
      venue: 'JKT48 Theater',
      url: 'https://jkt48.com/schedule',
      source: 'manual',
    });
    expect(new Date(event.date).toISOString()).toBe('2026-11-21T12:00:00.000Z');
  });

  it('picks venue by kind', () => {
    expect(normalizeManualEvent({ title: 'VC', date: '2026-11-25', kind: 'event', is_video_call: true }).event.venue)
      .toBe('Video Call (online)');
    expect(normalizeManualEvent({ title: 'M&G', date: '2026-11-25', kind: 'EXCLUSIVE' }).event.team).toBeNull();
  });

  it('rejects bad entries with a readable reason', () => {
    expect(normalizeManualEvent({ date: '2026-11-21' }).error).toMatch(/title/);
    expect(normalizeManualEvent({ title: 'x' }).error).toMatch(/date/);
    expect(normalizeManualEvent({ title: 'x', date: '21/11/2026' }).error).toMatch(/invalid "date"/);
    expect(normalizeManualEvent({ title: 'x', date: '2026-11-21', start_time: '7pm' }).error).toMatch(/HH:MM/);
    expect(normalizeManualEvent({ title: 'x', date: '2026-11-21', kind: 'CONCERT' }).error).toMatch(/kind/);
  });

  it('collects per-entry errors for the whole file', () => {
    const { events, errors } = normalizeManualFile({
      events: [{ title: 'ok', date: '2026-11-21' }, { title: 'bad' }],
    });
    expect(events).toHaveLength(1);
    expect(errors).toEqual([{ index: 1, title: 'bad', error: 'missing "date"' }]);
  });
});

describe('mergeSchedules', () => {
  const scraped = {
    fetchedAt: '2026-09-15T00:00:00Z',
    events: [
      { kind: 'SHOW', code: 'SH1', title: 'Aitakatta (scraped)', date: '2026-11-21T19:00:00+07:00', start_time: '19:00' },
    ],
  };

  it('adds manual events and lets scraped copies win on duplicates', () => {
    const merged = mergeSchedules(scraped, {
      updatedAt: '2026-11-19',
      events: [
        { title: 'Aitakatta', date: '2026-11-21', start_time: '19:00' }, // duplicate of SH1
        { title: 'Pajama Drive', date: '2026-11-20', start_time: '19:00' },
        { title: '2Shot', kind: 'EXCLUSIVE', date: '2026-11-21', start_time: '19:00' }, // same time, different type
      ],
    });
    expect(merged.events.map((e) => e.title)).toEqual(['Pajama Drive', 'Aitakatta (scraped)', '2Shot']);
    expect(merged.manualCount).toBe(2);
    expect(merged.eventCount).toBe(3);
    expect(merged.fetchedAt).toBe('2026-11-19');
  });

  it('works with either side missing', () => {
    expect(mergeSchedules(null, { events: [{ title: 'a', date: '2026-11-20' }] }).events).toHaveLength(1);
    expect(mergeSchedules(scraped, null).events).toHaveLength(1);
    expect(mergeSchedules(null, null).events).toEqual([]);
  });
});

describe('loadSchedule', () => {
  const json = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  const notFound = () => Promise.resolve({ ok: false, status: 404 });

  beforeEach(() => __resetScheduleCache());
  afterEach(() => vi.unstubAllGlobals());

  it('still loads when the manual file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => (url.includes('manual') ? notFound() : json({ events: [] }))));
    await expect(loadSchedule()).resolves.toMatchObject({ events: [] });
  });

  it('rejects only when both files fail, and retries next time', async () => {
    const fetchMock = vi.fn(() => notFound());
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadSchedule()).rejects.toThrow('HTTP 404');
    await expect(loadSchedule()).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('admin entries (RTDB /eli_schedule)', () => {
  it('converts the REST payload and drops cancelled entries', async () => {
    const { adminPayloadToManual } = await import('../scheduleSource');
    expect(adminPayloadToManual(null)).toEqual({ events: [] });
    expect(
      adminPayloadToManual({
        a: { title: 'Dream Bakudan', date: '2026-11-28', kind: 'SHOW' },
        b: { title: 'x', date: '2026-11-29', kind: 'SHOW', status: 'cancelled' },
      }).events.map((e) => e.id),
    ).toEqual(['a']);
  });

  it('ranks scraped > admin > JSON file on duplicates', () => {
    const scraped = { events: [{ kind: 'SHOW', title: 'scraped', date: '2026-11-28T19:00:00+07:00', start_time: '19:00' }] };
    const admin = {
      a1: { kind: 'SHOW', title: 'admin dup', date: '2026-11-28', start_time: '19:00', updatedAt: Date.UTC(2026, 10, 20) },
      a2: { kind: 'SHOW', title: 'admin', date: '2026-11-29', start_time: '19:00', unit_song: 'Sahabat Atau Cinta' },
    };
    const manual = { events: [{ title: 'file dup', date: '2026-11-29', start_time: '19:00' }, { title: 'file', date: '2026-11-30' }] };
    const merged = mergeSchedules(scraped, manual, admin);
    expect(merged.events.map((e) => e.title)).toEqual(['scraped', 'admin', 'file']);
    expect(merged.events[1]).toMatchObject({ source: 'admin', id: 'a2', unit_song: 'Sahabat Atau Cinta' });
    expect(merged.fetchedAt).toBe('2026-11-20T00:00:00.000Z');
  });
});
