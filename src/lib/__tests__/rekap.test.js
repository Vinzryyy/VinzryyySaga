import { describe, it, expect } from 'vitest';
import { buildShowRecap, buildPhotoRecap, formatDateId, rekapShareText } from '../rekap';

const show = (no, date, setlist, extra = {}) => ({
  no, date, setlist, unitSong: null, position: null, partner: null, lineup: null, note: null, ...extra,
});

const LOG = {
  totalShows: 152,
  asOfDate: '2026-11-15',
  totals: { centers: 2, solos: 0, duos: 1 },
  setlists: [],
  shows: [
    show(98, '2025-12-30', 'Lama', { position: 'Center' }),
    show(101, '2026-03-02', 'Ramune', { unitSong: 'Usotsuki na Dachou', position: 'Center', partner: 'A, B' }),
    show(99, '2026-01-05', 'Ramune', { unitSong: 'Manazashi Sayonara', position: 'Duo (1st)', partner: 'Indah' }),
    show(100, '2026-01-20', 'Pertaruhan', { note: 'Show ke-100' }),
    show(150, '2026-03-15', 'Ramune', { unitSong: 'Manazashi Sayonara', position: 'Duo', partner: 'Indah' }),
    show(151, '2026-11-01', 'Pertaruhan', { note: '  ' }),
    show(152, '2027-01-02', 'Baru'),
  ],
};

describe('buildShowRecap', () => {
  const r = buildShowRecap(LOG, 2026);

  it('counts only shows in the year, ordered by show number', () => {
    expect(r.count).toBe(5);
    expect(r.first).toEqual({ no: 99, date: '2026-01-05', setlist: 'Ramune' });
    expect(r.last).toEqual({ no: 151, date: '2026-11-01', setlist: 'Pertaruhan' });
  });

  it('builds 12 monthly buckets', () => {
    expect(r.perMonth).toHaveLength(12);
    expect(r.perMonth).toEqual([2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0]);
  });

  it('sorts setlists by frequency', () => {
    expect(r.setlists).toEqual([
      { setlist: 'Ramune', count: 3 },
      { setlist: 'Pertaruhan', count: 2 },
    ]);
  });

  it('lists unit songs with counts, skipping nulls', () => {
    expect(r.unitSongs).toEqual([
      { name: 'Manazashi Sayonara', count: 2, setlists: ['Ramune'] },
      { name: 'Usotsuki na Dachou', count: 1, setlists: ['Ramune'] },
    ]);
  });

  it('groups positions ("Duo (1st)" → Duo) and lists center shows', () => {
    expect(r.positions).toEqual([
      { position: 'Duo', count: 2 },
      { position: 'Center', count: 1 },
    ]);
    expect(r.centerCount).toBe(1);
    expect(r.centerShows).toEqual([
      { no: 101, date: '2026-03-02', setlist: 'Ramune', unitSong: 'Usotsuki na Dachou', partner: 'A, B' },
    ]);
    expect(r.partners[0]).toEqual({ name: 'Indah', count: 2 });
  });

  it('finds milestone show numbers crossed in the year', () => {
    expect(r.milestones).toEqual([
      { no: 100, date: '2026-01-20', setlist: 'Pertaruhan', hundred: true },
      { no: 150, date: '2026-03-15', setlist: 'Ramune', hundred: false },
    ]);
  });

  it('keeps non-empty notes verbatim and passes asOfDate through', () => {
    expect(r.notes).toEqual([{ no: 100, date: '2026-01-20', setlist: 'Pertaruhan', note: 'Show ke-100' }]);
    expect(r.asOfDate).toBe('2026-11-15');
    expect(r.careerTotal).toBe(152);
  });

  it('handles an empty or missing log without inventing data', () => {
    const empty = buildShowRecap(null, 2026);
    expect(empty.count).toBe(0);
    expect(empty.first).toBeNull();
    expect(empty.perMonth).toEqual(Array(12).fill(0));
    expect(empty.unitSongs).toEqual([]);
    expect(empty.asOfDate).toBeNull();
  });
});

const img = (id, date, extra = {}) => ({ id, date, title: 'Placeholder', thumbnail: `/t/${id}.webp`, url: `/u/${id}.webp`, ...extra });

const IMAGES = [
  img('a', '2026-05-01', { eventDate: '2026-04-30', eventName: 'Teater A', favoriteCount: 50, tweetUrl: 'https://x.com/s/1' }),
  img('b', '2026-05-01', { eventDate: '2026-04-30', eventName: 'Teater A', favoriteCount: 50, tweetUrl: 'https://x.com/s/1' }),
  img('c', '2026-05-10', { eventDate: '2026-05-10', eventName: 'Konser B', favoriteCount: 120, tweetUrl: 'https://x.com/s/2' }),
  img('d', '2026-05-12', { eventDate: '2026-05-12', eventName: '"Meet And Greet', favoriteCount: null }),
  img('e', '2026-01-03', { eventDate: '2025-12-31', eventName: 'Akhir Tahun', favoriteCount: 999 }),
  img('f', '2026-07-01'),
];

describe('buildPhotoRecap', () => {
  const r = buildPhotoRecap(IMAGES, 2026);

  it('assigns frames to the eventDate year (fallback upload date)', () => {
    expect(r.count).toBe(5);
    expect(r.perMonth).toEqual([0, 0, 0, 2, 2, 0, 1, 0, 0, 0, 0, 0]);
    expect(r.latestDate).toBe('2026-07-01');
  });

  it('groups top events by eventDate + eventName', () => {
    expect(r.eventCount).toBe(4);
    expect(r.topEvents[0]).toMatchObject({ name: 'Teater A', date: '2026-04-30', count: 2, cover: '/t/a.webp' });
    expect(r.topEvents.map((e) => e.name)).toContain('Meet And Greet');
  });

  it('picks favorites with a numeric count, one per post', () => {
    expect(r.favorites.map((f) => f.id)).toEqual(['c', 'a']);
    expect(r.favorites[0]).toMatchObject({ favoriteCount: 120, tweetUrl: 'https://x.com/s/2', name: 'Konser B' });
  });

  it('reports the busiest month (earliest on ties)', () => {
    expect(r.busiestMonth).toEqual({ month: 3, count: 2 });
  });

  it('is empty-safe', () => {
    const e = buildPhotoRecap(undefined, 2026);
    expect(e.count).toBe(0);
    expect(e.busiestMonth).toBeNull();
    expect(e.favorites).toEqual([]);
  });
});

describe('helpers', () => {
  it('formats Indonesian dates', () => {
    expect(formatDateId('2026-11-15')).toBe('15 Nov 2026');
    expect(formatDateId('2026-08-01', { long: true })).toBe('1 Agustus 2026');
    expect(formatDateId('nope')).toBeNull();
  });

  it('builds a share summary from real counts only', () => {
    const text = rekapShareText(buildShowRecap(LOG, 2026), buildPhotoRecap(IMAGES, 2026), 'https://armeniaca.online/rekap-2026');
    expect(text).toBe(
      'Rekap 2026 · Eli JKT48\n5 panggung teater, 5 frame arsip, 2 setlist. (data hingga 15 Nov 2026)\nhttps://armeniaca.online/rekap-2026',
    );
    expect(rekapShareText(buildShowRecap(null, 2026), buildPhotoRecap([], 2026), 'u')).toBe('Rekap 2026 · Eli JKT48\nu');
  });
});
