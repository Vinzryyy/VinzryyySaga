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

describe('jkt48connect exclusives (M&G)', () => {
  const detail = {
    code: 'EX3B84',
    title: '2-Shot - AYO SENYUMLAH',
    category: 'TWO_SHOT',
    purchase_url: 'https://jkt48.com/purchase/exclusive?code=EX3B84',
    default_price: 100000,
    sales_status: 'open',
    last_changed_at: '2026-11-24T00:00:00Z',
    sales_periods: [{ label: 'OFC', starts_at: '2026-11-23T20:00:00+07:00', ends_at: '2026-12-20T07:00:00+07:00', status: 'open' }],
    sessions: [
      { label: 'Sesi 1', date: '2026-11-21', start_time: '11:45:00', end_time: '12:45:00', lanes: [{ label: 'Jalur 1', member_name: 'Helisma Putri', status: 'available' }] },
      { label: 'Sesi 2', date: '2026-12-20', start_time: '13:30:00', end_time: '14:30:00', lanes: [
        { label: 'Jalur 3', member_name: 'Celline Thefani', status: 'available' },
        { label: 'Jalur 11', member_name: 'Helisma Putri', status: 'sold_out' },
      ] },
      { label: 'Sesi 3 (16:00 WITA)', date: '2026-12-21', start_time: '16:00:00', lanes: [{ label: 'Jalur 2', member_name: 'Helisma Putri', status: 'available', remaining_quantity: 4 }] },
    ],
  };

  it('finds only Eli lanes, with local time zones', async () => {
    const { eliLanes, sessionZone } = await import('../jkt48connect');
    const lanes = eliLanes(detail);
    expect(lanes.map((l) => l.jalur)).toEqual(['Jalur 1', 'Jalur 11', 'Jalur 2']);
    expect(lanes[1]).toMatchObject({ soldOut: true, iso: '2026-12-20T13:30:00+07:00' });
    expect(lanes[2]).toMatchObject({ zone: 'WITA', iso: '2026-12-21T16:00:00+08:00', remainingQuota: 4 });
    expect(sessionZone({ label: 'Sesi 1' })).toBe('WIB');
  });

  it('maps sessions to schedule events with sold-out status', async () => {
    const { exclusiveEvents } = await import('../jkt48connect');
    const evs = exclusiveEvents(detail, Date.parse('2026-12-01T00:00:00Z'));
    expect(evs).toHaveLength(2);
    expect(evs[0]).toMatchObject({ kind: 'EXCLUSIVE', category: 'TWO_SHOT', start_time: '13:30', eli_jalur: ['Jalur 11'], sold_out: true });
    expect(evs[1].remaining_total).toBe(4);
  });

  it('lists a sale only while open and Eli has a session left', async () => {
    const { exclusiveSale } = await import('../jkt48connect');
    const sale = exclusiveSale(detail, '2026-11-24');
    expect(sale.eliSessions.map((x) => x.sessionDate)).toEqual(['2026-12-20', '2026-12-21']);
    expect(sale.eliSessions[0]).not.toHaveProperty('iso');
    expect(sale).toMatchObject({ code: 'EX3B84', soonestSessionDate: '2026-12-20', defaultPrice: 100000 });
    expect(exclusiveSale(detail, '2026-12-22')).toBeNull();
    expect(exclusiveSale({ ...detail, sales_status: 'closed', sales_periods: [] }, '2026-11-24')).toBeNull();
  });
});
