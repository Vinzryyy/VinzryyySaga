import { describe, expect, it } from 'vitest';
import { isTheaterEntry, liveTheaterTotal, nextMilestone, pickBaseline } from '../showMilestone';

const careerStats = { theater: 417, asOfDate: '2026-11-15' };
const show = (date, extra = {}) => ({ kind: 'SHOW', date, set_list: 'Ramune no Nomikata', ...extra });

describe('isTheaterEntry', () => {
  it('counts shows and in-theater events, not video calls or M&G', () => {
    expect(isTheaterEntry({ kind: 'SHOW' })).toBe(true);
    expect(isTheaterEntry({ kind: 'EVENT' })).toBe(true);
    expect(isTheaterEntry({ kind: 'EVENT', is_video_call: true })).toBe(false);
    expect(isTheaterEntry({ kind: 'EXCLUSIVE' })).toBe(false);
  });
});

describe('pickBaseline', () => {
  it('uses the newer of show log and siteConfig', () => {
    expect(pickBaseline(careerStats, { totalShows: 410, asOfDate: '2026-11-01' })).toEqual({ total: 417, asOfDate: '2026-11-15' });
    expect(pickBaseline(careerStats, { totalShows: 420, asOfDate: '2026-11-20' })).toEqual({ total: 420, asOfDate: '2026-11-20' });
    expect(pickBaseline(careerStats, null)).toEqual({ total: 417, asOfDate: '2026-11-15' });
  });
});

describe('liveTheaterTotal', () => {
  const nowMs = new Date('2026-12-01T00:00:00+07:00').getTime();

  it('adds aired shows after the baseline only', () => {
    const events = [
      show('2026-11-12T19:00:00+07:00'), // before baseline
      show('2026-11-20T19:00:00+07:00'),
      show('2026-11-27T14:00:00+07:00'),
      show('2026-12-05T19:00:00+07:00'), // future
      { kind: 'EXCLUSIVE', date: '2026-11-28T13:30:00+07:00' },
    ];
    const r = liveTheaterTotal({ events, careerStats, showLog: null, nowMs });
    expect(r.total).toBe(419);
    expect(r.delta).toBe(2);
    expect(r.lastShow.date).toBe('2026-11-27T14:00:00+07:00');
  });

  it('works with no events', () => {
    expect(liveTheaterTotal({ events: undefined, careerStats, showLog: null, nowMs }).total).toBe(417);
  });
});

describe('nextMilestone', () => {
  it('measures from the last hundred to the next', () => {
    expect(nextMilestone(417)).toEqual({ from: 400, target: 500, done: 17, left: 83, pct: 17, ticks: [425, 450, 475] });
  });
  it('rolls over exactly at a milestone', () => {
    expect(nextMilestone(500)).toMatchObject({ from: 500, target: 600, left: 100, pct: 0 });
  });
});
