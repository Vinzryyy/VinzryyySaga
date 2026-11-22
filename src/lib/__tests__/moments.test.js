import { describe, expect, it } from 'vitest';
import { buildMoments, cleanCaption, showsOn, slugify } from '../moments';

const img = (id, date, eventName, extra = {}) => ({ id, eventDate: date, eventName, location: 'JKT48 Theater', ...extra });

describe('slugify', () => {
  it('makes url-safe slugs', () => {
    expect(slugify('O’Live Milk CFD Takeover')).toBe('olive-milk-cfd-takeover');
    expect(slugify('JKT48 OFC Event “Psychology Project”')).toBe('jkt48-ofc-event-psychology-project');
    expect(slugify('Café Été')).toBe('cafe-ete');
  });
});

describe('buildMoments', () => {
  it('groups by date + event name, newest first', () => {
    const list = buildMoments([
      img('a', '2026-06-25', 'Jakarta Fair Music Concert 2026'),
      img('b', '2026-06-25', 'Jakarta Fair Music Concert 2026', { caption: 'Budhe is right', tweetUrl: 'https://x.com/1', favoriteCount: 40 }),
      img('c', '2026-06-27', 'Welcome to Surabaya'),
      img('d', '2026-06-25', 'Lain lagi'),
    ]);
    expect(list.map((m) => m.slug)).toEqual([
      '2026-06-27-welcome-to-surabaya',
      '2026-06-25-jakarta-fair-music-concert-2026',
      '2026-06-25-lain-lagi',
    ]);
    const fair = list[1];
    expect(fair.photos.map((p) => p.id)).toEqual(['a', 'b']);
    expect(fair.caption).toBe('Budhe is right');
    expect(fair.tweetUrl).toBe('https://x.com/1');
    expect(fair.favorites).toBe(40);
    expect(fair.year).toBe('2026');
  });

  it('falls back to title/date and skips undated photos', () => {
    const list = buildMoments([{ id: 'x', date: '2025-01-02', title: 'Theater' }, { id: 'y', title: 'no date' }]);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Theater');
  });

  it('keeps slugs unique when names only differ by punctuation', () => {
    const list = buildMoments([img('a', '2026-01-01', 'Show!'), img('b', '2026-01-01', 'Show?')]);
    expect(new Set(list.map((m) => m.slug)).size).toBe(2);
  });
});

describe('cleanCaption', () => {
  it('drops links, hashtags and mentions', () => {
    expect(cleanCaption('Welcome to Surabaya \n\n260627 || Juanda @H_EliJKT48 \n#EliJKT48 https://t.co/x')).toBe(
      'Welcome to Surabaya\n260627 || Juanda',
    );
  });
});

describe('showsOn', () => {
  it('finds theater shows on a date', () => {
    const log = { shows: [{ no: 1, date: '2026-01-01', setlist: 'A' }, { no: 2, date: '2026-01-02', setlist: 'B' }] };
    expect(showsOn(log, '2026-01-02')).toEqual([{ no: 2, date: '2026-01-02', setlist: 'B' }]);
    expect(showsOn(null, '2026-01-02')).toEqual([]);
  });
});
