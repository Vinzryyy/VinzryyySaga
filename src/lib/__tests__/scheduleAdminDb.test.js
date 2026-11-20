import { describe, it, expect } from 'vitest';
import { cleanEntry } from '../scheduleAdminDb';

describe('cleanEntry', () => {
  it('keeps allowed, non-empty fields only', () => {
    expect(
      cleanEntry({
        kind: 'SHOW', title: ' Dream Bakudan ', date: '2026-11-28', start_time: '19:00',
        end_time: '', category: '', is_video_call: false, is_birthday_show: true,
        position: 'Duo', hacker: 'x', updatedAt: 1,
      }),
    ).toEqual({
      kind: 'SHOW', title: 'Dream Bakudan', date: '2026-11-28', start_time: '19:00',
      is_birthday_show: true, position: 'Duo',
    });
  });
});
