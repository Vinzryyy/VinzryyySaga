import { describe, expect, it } from 'vitest';
import { fmtDuration, liveCalendar, livePattern, monthlyTotals, noteNear, notesForRecap, perMinuteAvg, publicRecaps, recapId, recapInsights, recapProblems, recapRecords, scrubWords, yearTotals } from '../liveRecaps';

const recap = (extra = {}) => ({
  id: '2026-11-22-idn',
  date: '2026-11-22',
  platform: 'idn',
  title: 'hello',
  startedAt: '2026-11-22T16:09:48.700Z',
  durationSec: 2411,
  comments: 2972,
  commenters: 231,
  peak: { minute: 1, count: 154 },
  perMinute: [100, 154, 80],
  moments: [{ t: 692.5, reasons: ['chat 4.2× lebih ramai'], commentCount: 101 }],
  chatWords: [['wkwk', 202], ['puzzle', 63]],
  chatEmoji: [['😭', 60]],
  talkWords: [['makasih', 43]],
  ...extra,
});

describe('recapProblems / publicRecaps', () => {
  it('accepts a complete recap and rejects broken ones', () => {
    expect(recapProblems(recap())).toEqual([]);
    expect(recapProblems(recap({ id: 'x' }))).toContain('id');
    expect(recapProblems(recap({ durationSec: 10 }))).toContain('durationSec');
    expect(recapProblems(recap({ chatWords: [['a', 1]] }))).toContain('words');
  });

  it('lists valid recaps newest first', () => {
    const list = publicRecaps({
      recaps: [
        recap({ id: '2026-11-20-idn', date: '2026-11-20', startedAt: '2026-11-20T10:00:00Z' }),
        recap(),
        recap({ id: 'bad' }),
      ],
    });
    expect(list.map((r) => r.id)).toEqual(['2026-11-22-idn', '2026-11-20-idn']);
    expect(publicRecaps(null)).toEqual([]);
  });
});

describe('formatting and links to notes', () => {
  it('formats duration and average', () => {
    expect(fmtDuration(2411)).toBe('40 menit');
    expect(fmtDuration(4980)).toBe('1 jam 23 menit');
    expect(fmtDuration(3600)).toBe('1 jam');
    expect(perMinuteAvg(recap())).toBe(74);
  });

  it('finds Eli Notes for the live and near a moment', () => {
    const notes = [
      { id: 'a', date: '2026-11-22', platform: 'idn', at: 700 },
      { id: 'b', date: '2026-11-22', platform: 'showroom', at: 700 },
    ];
    const mine = notesForRecap(notes, recap());
    expect(mine.map((n) => n.id)).toEqual(['a']);
    expect(noteNear(mine, 692.5)?.id).toBe('a');
    expect(noteNear(mine, 2000)).toBeNull();
  });
});

describe('publisher helpers', () => {
  it('drops viewer handles and rude words', () => {
    const words = [['wkwk', 9], ['elvin', 5], ['puzzle', 4], ['anjing', 3], ['budi', 3], ['sayang', 2]];
    expect(scrubWords(words, ['Elvin_17', 'budiman', 'x'])).toEqual([['wkwk', 9], ['puzzle', 4], ['sayang', 2]]);
  });

  it('makes stable ids, numbering a second live on the same day', () => {
    const existing = [recap()];
    expect(recapId(existing, '2026-11-22', 'idn', recap().startedAt)).toBe('2026-11-22-idn');
    expect(recapId(existing, '2026-11-22', 'idn', '2026-11-22T20:00:00Z')).toBe('2026-11-22-idn-2');
    expect(recapId(existing, '2026-11-22', 'showroom', 'x')).toBe('2026-11-22-showroom');
  });
});

describe('context: insights, records, calendar, pattern, totals', () => {
  const mk = (id, date, startedAt, durationSec, comments, peak) =>
    recap({ id, date, startedAt, durationSec, comments, peak: { minute: 1, count: peak } });
  const list = [
    mk('2026-11-05-idn', '2026-11-05', '2026-11-05T13:00:00Z', 1800, 1000, 50), // Kamis 20:00 WIB
    mk('2026-11-12-idn', '2026-11-12', '2026-11-12T13:10:00Z', 2400, 1200, 60), // Kamis 20:10
    mk('2026-11-19-idn', '2026-11-19', '2026-11-19T13:05:00Z', 1500, 900, 40),  // Kamis 20:05
    mk('2026-10-20-showroom', '2026-10-20', '2026-10-20T05:00:00Z', 1200, 600, 30), // Selasa 12:00
    mk('2026-11-22-idn', '2026-11-22', '2026-11-22T16:09:48Z', 4000, 3000, 154),
  ];

  it('badges a record-breaking live and stays quiet for an average one', () => {
    const big = recapInsights(list, list[4]).map((b) => b.text);
    expect(big).toContain('Komentar terbanyak sepanjang arsip');
    expect(big).toContain('Live terlama sepanjang arsip');
    expect(big).toContain('Menit terheboh sepanjang arsip');
    expect(big.some((t) => /lebih ramai dari rata-rata/.test(t))).toBe(true);
    expect(recapInsights(list, list[2])).toEqual([]);
    expect(recapInsights([list[0]], list[0])).toEqual([]);
  });

  it('finds records', () => {
    const r = recapRecords(list);
    expect(r.longest.id).toBe('2026-11-22-idn');
    expect(r.hottest.id).toBe('2026-11-22-idn');
    expect(recapRecords([list[0]])).toBeNull();
  });

  it('builds a Monday-first calendar ending today', () => {
    const cal = liveCalendar(list, '2026-11-23', 4); // 23 Nov 2026 = Monday
    expect(cal).toHaveLength(4);
    expect(cal[3][0].date).toBe('2026-11-23');
    expect(cal[3][1]).toBeNull(); // future
    const days = cal.flat().filter(Boolean);
    expect(days.find((d) => d.date === '2026-11-22').lives).toBe(1);
    expect(days.find((d) => d.date === '2026-11-12').minutes).toBe(40);
  });

  it('spots the favourite day and hour, and sums months and years', () => {
    expect(livePattern(list)).toEqual({ weekday: 'Kamis', hour: 20 });
    expect(livePattern(list.slice(0, 3))).toBeNull();
    expect(monthlyTotals(list).map((m) => [m.month, m.lives])).toEqual([['2026-11', 4], ['2026-10', 1]]);
    expect(yearTotals(list, 2026)).toEqual({ lives: 5, minutes: 182, comments: 6700 });
  });
});
