import { beforeEach, describe, expect, it } from 'vitest';
import { armepackStatus, memoryStatus, quizStatus, todayList } from '../arcadeStatus';
import { getJakartaDate } from '../petikanStorage';
import { STORAGE_KEY } from '../miniGamesStorage';

const now = new Date('2026-11-24T05:00:00Z'); // 12:00 WIB
const today = getJakartaDate(now);

describe('arcadeStatus', () => {
  beforeEach(() => localStorage.clear());

  it('fresh visitor: everything still to do', () => {
    const pool = [{ id: 'a', era: 'helisma-show', tier: 'muda', title: 'A' }];
    const a = armepackStatus(pool, now);
    expect(a).toMatchObject({ canPluck: true, buah: 0, owned: 0, total: 1, setsComplete: 0, setsTotal: 3 });
    const list = todayList({ armepack: a, quiz: quizStatus(now), memory: memoryStatus(now) });
    expect(list.map((x) => x.done)).toEqual([false, false, false]);
    expect(list[2].to).toBe('/mini-games/memory?mode=harian');
  });

  it('reads what the games already stored', () => {
    // These keys exist only in the browser (jsdom here); nothing real is touched.
    localStorage.setItem('aprikot_last_pluck', today);
    localStorage.setItem('aprikot_buah', '7');
    localStorage.setItem('aprikot_quiz_state', JSON.stringify({ date: today, answered: { q1: 'correct', q2: 'wrong', q3: 'correct', q4: 'x', q5: 'x' } }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      memory: { daily: { mudah: { date: today, moves: 10, timeMs: 1 }, sedang: { date: '2026-11-01', moves: 1, timeMs: 1 } } },
      challenge: { best: { stage: 4, cleared: false } },
    }));
    const pool = [{ id: 'eli-gen7-debut', era: 'helisma-show', tier: 'langka', title: 'x' }];
    const a = armepackStatus(pool, now);
    expect([a.canPluck, a.buah]).toEqual([false, 7]);
    expect(quizStatus(now)).toEqual({ answered: 5, total: 5 });
    expect(memoryStatus(now)).toEqual({ dailyDone: 1, dailyTotal: 3, challenge: 'Tingkat 4/7' });
    const list = todayList({ armepack: a, quiz: quizStatus(now), memory: memoryStatus(now) });
    expect(list.map((x) => x.done)).toEqual([true, true, false]);
  });
});
