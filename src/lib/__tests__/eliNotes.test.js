import { describe, expect, it } from 'vitest';
import { QUIZ_OPTIONS, buildQuiz, embedOf, fmtMinute, noteId, notesOn, notesRecap, publishedNotes, quizPool, safeLink, validateNote } from '../eliNotes';

const note = (extra = {}) => ({
  id: '2026-11-22-idn-692',
  status: 'published',
  date: '2026-11-22',
  platform: 'idn',
  liveTitle: 'Ngobrol santai',
  at: 692,
  quote: 'Kok kalian bisa sih?',
  story: 'Eli kaget waktu penonton menebak koleksi stikernya dengan tepat, lalu tertawa lama sekali.',
  mood: 'lucu',
  ...extra,
});

describe('noteId / fmtMinute', () => {
  it('builds ids and minute labels', () => {
    expect(noteId('2026-11-22', 'idn', 692.7)).toBe('2026-11-22-idn-692');
    expect(fmtMinute(692)).toBe('11:32');
    expect(fmtMinute(3725)).toBe('1:02:05');
    expect(fmtMinute(-4)).toBe('0:00');
  });
});

describe('safeLink / embedOf', () => {
  it('accepts https links on known platforms only', () => {
    expect(safeLink('https://www.tiktok.com/@me/video/1')).toBe('https://www.tiktok.com/@me/video/1');
    expect(safeLink('http://youtube.com/watch?v=abc')).toBeNull();
    expect(safeLink('https://evil.example/youtube.com')).toBeNull();
    expect(safeLink('https://youtube.com.evil.example/')).toBeNull();
    expect(safeLink('javascript:alert(1)')).toBeNull();
  });

  it('turns YouTube links into a click-to-load player', () => {
    expect(embedOf('https://youtu.be/dQw4w9WgXcQ?t=42')).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ', start: 42 });
    expect(embedOf('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(embedOf('https://x.com/a/status/1')).toMatchObject({ kind: 'link', name: 'X' });
    expect(embedOf('https://vt.tiktok.com/abc')).toMatchObject({ kind: 'link', name: 'TikTok' });
    expect(embedOf('nope')).toBeNull();
  });
});

describe('validateNote', () => {
  it('passes a complete note', () => {
    expect(validateNote(note())).toEqual([]);
  });

  it('requires a story in the admin’s own words and a short quote', () => {
    expect(validateNote(note({ story: 'pendek' })).join(' ')).toMatch(/kata-katamu sendiri/);
    expect(validateNote(note({ quote: 'x'.repeat(200) })).join(' ')).toMatch(/Kutipan maksimal/);
    expect(validateNote(note({ mood: 'aneh' })).join(' ')).toMatch(/suasana/);
    expect(validateNote(note({ link: 'https://evil.example' })).join(' ')).toMatch(/Tautan/);
  });
});

describe('publishedNotes', () => {
  it('shows only valid published notes, newest first', () => {
    const list = publishedNotes({
      notes: [
        note({ id: '2026-11-20-idn-10', date: '2026-11-20', at: 10 }),
        note({ id: '2026-11-22-idn-692' }),
        note({ id: '2026-11-22-idn-2000', at: 2000 }),
        note({ id: '2026-11-23-idn-5', date: '2026-11-23', at: 5, status: 'draft' }),
        note({ id: '2026-11-24-idn-5', date: '2026-11-24', at: 5, story: 'x' }),
        note({ id: 'bad id', date: '2026-11-25' }),
      ],
    });
    expect(list.map((n) => n.id)).toEqual(['2026-11-22-idn-2000', '2026-11-22-idn-692', '2026-11-20-idn-10']);
    expect(list[0].year).toBe('2026');
    expect(notesOn(list, '2026-11-22')).toHaveLength(2);
    expect(publishedNotes(null)).toEqual([]);
  });
});

describe('notesRecap', () => {
  it('counts a year and picks quotes across moods', () => {
    const notes = publishedNotes({
      notes: [
        note({ id: '2026-11-22-idn-692' }),
        note({ id: '2026-11-22-idn-800', at: 800, quote: 'Lagi dong', mood: 'lucu' }),
        note({ id: '2026-10-01-showroom-5', date: '2026-10-01', platform: 'showroom', at: 5, quote: 'Terima kasih ya', mood: 'haru' }),
        note({ id: '2026-09-01-idn-5', date: '2026-09-01', at: 5, quote: '', mood: 'nyanyi' }),
        note({ id: '2025-12-01-idn-5', date: '2025-12-01', at: 5 }),
      ],
    });
    const r = notesRecap(notes, 2026);
    expect(r.count).toBe(4);
    expect(r.lives).toBe(3);
    expect(r.moods[0]).toEqual(['lucu', 2]);
    expect(r.picks.map((n) => n.id)).toEqual(['2026-11-22-idn-800', '2026-10-01-showroom-5', '2026-11-22-idn-692']);
  });
});

describe('Tebak Momen', () => {
  const many = (k) =>
    Array.from({ length: k }, (_, i) => note({ id: `2026-11-${String(i + 1).padStart(2, '0')}-idn-5`, date: `2026-11-${String(i + 1).padStart(2, '0')}`, at: 5, quote: `Kutipan ${i}` }));

  it('needs enough quoted notes on enough days', () => {
    expect(quizPool(many(5)).ready).toBe(false);
    expect(buildQuiz(many(5))).toEqual([]);
    expect(quizPool(many(6)).ready).toBe(true);
  });

  it('builds rounds with distinct options including the answer', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const quiz = buildQuiz(many(8), 5, rng);
    expect(quiz).toHaveLength(5);
    for (const q of quiz) {
      expect(q.options).toHaveLength(QUIZ_OPTIONS);
      expect(new Set(q.options).size).toBe(QUIZ_OPTIONS);
      expect(q.options).toContain(q.answer);
      expect(q.answer).toBe(q.note.date);
    }
    expect(new Set(quiz.map((q) => q.note.id)).size).toBe(5);
  });
});
