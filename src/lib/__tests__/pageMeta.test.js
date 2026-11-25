// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TITLE, PAGES, articleMeta, fullTitle, galleryYearMeta, momentMeta, noteMeta, pageUrl, recapMeta, weekMeta } from '../pageMeta';
import { weekSentences, weeklySummaries } from '../liveRecaps';

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

const recap = (extra = {}) => ({
  id: '2026-11-22-idn',
  date: '2026-11-22',
  platform: 'idn',
  title: 'hello',
  startedAt: '2026-11-22T16:09:48.700Z', // Minggu 23.09 WIB
  durationSec: 2411,
  comments: 2972,
  commenters: 231,
  chatWords: [['wkwk', 202], ['puzzle', 63]],
  talkWords: [['makasih', 43]],
  ...extra,
});

describe('fullTitle / pageUrl', () => {
  it('adds the site name, and uses the bare site URL for the homepage', () => {
    expect(fullTitle('Jadwal Eli')).toBe('Jadwal Eli · Armeniaca');
    expect(fullTitle()).toBe(DEFAULT_TITLE);
    expect(pageUrl('/schedule')).toBe('https://armeniaca.online/schedule');
    expect(pageUrl('/')).toBe('https://armeniaca.online');
  });
});

describe('PAGES', () => {
  const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
  const routes = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));

  it('points every entry at a route that exists, once, with a description', () => {
    const paths = Object.values(PAGES).map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const [name, page] of Object.entries(PAGES)) {
      expect(routes.has(page.path), `${name}: ${page.path} is not a route in App.jsx`).toBe(true);
      expect(page.description.length, name).toBeGreaterThan(20);
    }
  });
});

describe('detail pages', () => {
  it('describes a note by its quote, or its live when it has none', () => {
    expect(noteMeta(note())).toEqual({
      path: '/eli-notes/2026-11-22-idn-692',
      title: '“Kok kalian bisa sih?” · Eli Notes',
      description: 'IDN Live · 22 November 2026 · menit 11:32. Eli kaget waktu penonton menebak koleksi stikernya dengan tepat, lalu tertawa lama sekali.',
    });
    expect(noteMeta(note({ quote: '' })).title).toBe('Ngobrol santai · Eli Notes');
    expect(noteMeta(note({ story: 'x'.repeat(300) })).description.endsWith(`. ${'x'.repeat(140)}`)).toBe(true);
  });

  it('describes a recap by its day in WIB, length and comments', () => {
    expect(recapMeta(recap())).toEqual({
      path: '/rekap-live/2026-11-22-idn',
      title: 'Rekap live Minggu, 22 November 2026',
      description: 'Live IDN Live Eli JKT48, Minggu, 22 November 2026: 40 menit, 2.972 komentar, momen paling ramai dan topik obrolannya.',
    });
  });

  it('summarises a week from its recaps and notes', () => {
    const weeks = weeklySummaries([recap(), recap({ id: '2026-11-20-idn', date: '2026-11-20', startedAt: '2026-11-20T12:00:00Z', comments: 1000, durationSec: 1200 })], [note()]);
    expect(weekMeta(weeks[0], weeks[1])).toEqual({
      path: '/rekap-live/minggu/2026-11-16',
      title: 'Ringkasan mingguan 16–22 November 2026',
      description: 'Seminggu live Eli JKT48 (16–22 November 2026): Eli live 2 kali, total 1 jam, dengan 3.972 komentar. Paling ramai live Minggu pukul 23.09, 2.972 komentar. Kata yang paling sering diketik penonton: “wkwk”. 1 momen kami tulis di Eli Notes.',
    });
    expect(weekSentences(weeks[0], { lives: 1, minutes: 30 })).toContain('Itu 30 menit lebih lama dari minggu sebelumnya.');
    expect(weekSentences({ ...weeks[0], lives: 0 })).toEqual(['Minggu ini tidak ada live yang terekam, tapi ada catatan dari live Eli.', '1 momen kami tulis di Eli Notes.']);
  });

  it('describes a moment, an article and a gallery year', () => {
    expect(momentMeta({ slug: '2026-11-21-sctv-awards-2026', name: 'SCTV Awards 2026', date: '2026-11-21', photos: [{}, {}, {}] })).toEqual({
      path: '/momen/2026-11-21-sctv-awards-2026',
      title: 'SCTV Awards 2026 · Album Momen',
      description: 'SCTV Awards 2026 (21 November 2026): 3 foto Eli JKT48 dari arsip @armeniaca15.',
    });
    expect(articleMeta({ slug: 'videotron-project-2026', title: 'Videotron Project', subtitle: 'Double-sided videotron' })).toEqual({
      path: '/news/videotron-project-2026',
      title: 'Videotron Project',
      description: 'Double-sided videotron',
    });
    expect(articleMeta({ slug: 'x', title: 'Judul' }).description).toBe('Judul');
    expect(galleryYearMeta('2025')).toEqual({
      path: '/gallery/2025',
      title: 'Memoria 2025',
      description: 'Frame-frame Eli JKT48 dari Memoria tahun 2025. Kenangan visual Helisma Putri di sepanjang tahun 2025.',
    });
  });
});
