import { describe, expect, it } from 'vitest';
import { fmtDuration, liveCalendar, livePattern, monthlyTotals, noteNear, notesForRecap, perMinuteAvg, publicRecaps, recapForNote, recapId, recapInsights, recapProblems, recapRecords, scrubWords, weekLabel, weekOf, weeklySummaries, yearTotals } from '../liveRecaps';

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

describe('which live a note belongs to', () => {
  const test = recap({ id: '2026-11-24-idn', date: '2026-11-24', startedAt: '2026-11-24T09:32:04Z', durationSec: 76, title: 'Get ready' });
  const real = recap({ id: '2026-11-24-idn-2', date: '2026-11-24', startedAt: '2026-11-24T09:33:40Z', durationSec: 3510, title: 'Get ready' });
  const evening = recap({ id: '2026-11-24-idn-3', date: '2026-11-24', startedAt: '2026-11-24T14:00:00Z', durationSec: 1800, title: 'Malam' });
  const all = [test, real, evening];
  const note = (at, extra = {}) => ({ id: `n${at}`, date: '2026-11-24', platform: 'idn', at, liveTitle: 'Get ready', ...extra });

  it('uses startedAt when the note has it', () => {
    expect(recapForNote(all, note(30, { startedAt: test.startedAt }))?.id).toBe(test.id);
    expect(recapForNote(all, note(30, { startedAt: evening.startedAt, liveTitle: 'x' }))?.id).toBe(evening.id);
  });

  it('older notes: long enough, same title, then the longest', () => {
    expect(recapForNote(all, note(30))?.id).toBe(real.id);
    expect(recapForNote(all, note(1200, { liveTitle: 'Malam' }))?.id).toBe(evening.id);
    expect(recapForNote(all, note(9999))).toBeNull();
    expect(recapForNote(all, { ...note(30), date: '2026-11-23' })).toBeNull();
  });

  it('notesForRecap keeps each note with one live only', () => {
    const notes = [note(30), note(229), note(1200, { liveTitle: 'Malam' })];
    expect(notesForRecap(notes, test, all)).toEqual([]);
    expect(notesForRecap(notes, real, all).map((n) => n.id)).toEqual(['n30', 'n229']);
    expect(notesForRecap(notes, evening, all).map((n) => n.id)).toEqual(['n1200']);
  });
});

describe('ringkasan mingguan', () => {
  it('weeks start on Monday', () => {
    expect(weekOf('2026-11-24')).toBe('2026-11-23'); // Tuesday
    expect(weekOf('2026-11-23')).toBe('2026-11-23');
    expect(weekOf('2026-11-29')).toBe('2026-11-23'); // Sunday
    expect(weekOf('2026-11-30')).toBe('2026-11-30');
    expect(weekLabel('2026-11-23')).toBe('23–29 November 2026');
    expect(weekLabel('2026-11-30')).toBe('30 November – 6 Desember 2026');
    expect(weekLabel('2026-12-28')).toBe('28 Desember 2026 – 3 Januari 2027');
  });

  it('adds up lives, merges words and picks quoted notes', () => {
    const a = recap({ id: '2026-11-24-idn', date: '2026-11-24', startedAt: '2026-11-24T09:00:00Z', durationSec: 3600, comments: 200, chatWords: [['budhe', 18], ['hujan', 10]] });
    const b = recap({ id: '2026-11-26-idn', date: '2026-11-26', startedAt: '2026-11-26T09:00:00Z', durationSec: 1800, comments: 500, chatWords: [['hujan', 12], ['wkwk', 3]] });
    const old = recap({ id: '2026-11-17-idn', date: '2026-11-17', startedAt: '2026-11-17T09:00:00Z' });
    const n = (date, at, mood, quote) => ({ id: `${date}-idn-${at}`, date, at, mood, quote, platform: 'idn' });
    const notes = [n('2026-11-24', 900, 'lucu', 'A'), n('2026-11-24', 100, 'lucu', 'B'), n('2026-11-26', 50, 'haru', ''), n('2026-11-25', 10, 'seru', 'C')];
    const restart = recap({ id: '2026-11-24-idn-2', date: '2026-11-24', durationSec: 76, comments: 0 });
    const weeks = weeklySummaries([a, b, old, restart], notes);
    expect(weeks.map((w) => w.week)).toEqual(['2026-11-23', '2026-11-16']);
    const w = weeks[0];
    expect([w.lives, w.minutes, w.comments]).toEqual([2, 90, 700]);
    expect(w.busiest.id).toBe(b.id);
    expect(w.longest.id).toBe(a.id);
    expect(w.chatWords.slice(0, 2)).toEqual([['hujan', 22], ['budhe', 18]]);
    expect(w.notes.map((x) => x.at)).toEqual([50, 10, 100, 900]); // newest day first, in order within a live
    expect(w.picks.map((x) => x.quote)).toEqual(['C', 'B', 'A']); // one per mood first
    expect(w.moods[0]).toEqual(['lucu', 2]);
    expect(weeks[1].notes).toEqual([]);
  });

  it('a week with notes but no recap still shows up', () => {
    const weeks = weeklySummaries([], [{ id: 'x', date: '2026-11-02', at: 1, mood: 'lucu', quote: 'hi' }]);
    expect(weeks[0]).toMatchObject({ week: '2026-11-02', lives: 0, busiest: null });
  });
});
