import { describe, expect, it } from 'vitest';
import { eliEvents, hasEli, toEvent, toWIB } from '../jkt48connect';
import { mergeSchedules } from '../scheduleSource';

const show = (over = {}) => ({
  id: 'SHB149',
  title: 'Sambil Menggandeng Erat Tanganku',
  team: 'DREAM',
  start_date: '2026-11-12T12:00:00.000Z',
  end_date: '2026-11-12T14:00:00.000Z',
  members: [{ id: '112', name: 'Eli', url_key: 'helisma-putri' }],
  ...over,
});

describe('jkt48connect', () => {
  it('converts UTC to WIB wall time', () => {
    expect(toWIB('2026-11-12T12:00:00.000Z')).toEqual({ day: '2026-11-12', time: '19:00' });
    expect(toWIB('2026-11-12T20:00:00.000Z')).toEqual({ day: '2026-11-13', time: '03:00' });
    expect(toWIB('nope')).toBeNull();
  });

  it('matches Eli by member key, not by a name prefix', () => {
    expect(hasEli(show())).toBe(true);
    expect(hasEli(show({ members: [{ id: '46', name: 'Elin', url_key: 'celline-thefani' }] }))).toBe(false);
    expect(hasEli(show({ members: [] }))).toBe(false);
  });

  it('maps a show to the site event shape', () => {
    const e = toEvent(show({ seitansai: [{ id: '60' }] }));
    expect(e).toMatchObject({
      kind: 'SHOW', code: 'SHB149', date: '2026-11-12T19:00:00+07:00',
      start_time: '19:00', end_time: '21:00', team: 'DREAM', is_birthday_show: true, source: 'jkt48connect',
    });
    expect(e.members[0]).toEqual({ name: 'Eli', member_id: '112', url_key: 'helisma-putri' });
  });

  it('keeps only Eli shows in the window, oldest first, no duplicates', () => {
    const shows = [
      show({ id: 'B', start_date: '2026-11-20T12:00:00.000Z' }),
      show({ id: 'X', members: [{ id: '46', name: 'Elin', url_key: 'celline-thefani' }] }),
      show({ id: 'A', start_date: '2026-11-04T12:00:00.000Z' }),
      show({ id: 'B', start_date: '2026-11-20T12:00:00.000Z' }),
      show({ id: 'OLD', start_date: '2026-09-01T12:00:00.000Z' }),
    ];
    const out = eliEvents(shows, Date.parse('2026-10-01T00:00:00Z'));
    expect(out.map((e) => e.code)).toEqual(['A', 'B']);
  });

  it('ranks after jkt48.com but before manual entries', () => {
    const connect = { fetchedAt: '2026-11-24T00:00:00Z', events: [toEvent(show())] };
    const scraped = { events: [] };
    const manual = { events: [{ title: 'Sambil Menggandeng Erat Tanganku', date: '2026-11-12', start_time: '19:00' }] };
    const merged = mergeSchedules(scraped, manual, null, connect);
    expect(merged.events).toHaveLength(1);
    expect(merged.events[0].source).toBe('jkt48connect');
    expect(merged.connectCount).toBe(1);
    expect(merged.manualCount).toBe(0);

    const scrapedSame = { events: [{ ...toEvent(show()), source: undefined, code: 'SCRAPED' }] };
    expect(mergeSchedules(scrapedSame, null, null, connect).events.map((e) => e.code)).toEqual(['SCRAPED']);
  });
});
