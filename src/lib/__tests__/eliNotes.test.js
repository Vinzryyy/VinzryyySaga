import { describe, expect, it } from 'vitest';
import { embedOf, fmtMinute, noteId, notesOn, publishedNotes, safeLink, validateNote } from '../eliNotes';

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
