// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_IMAGE, PAGES } from '../pageMeta';
import { injectMeta, prerenderRoutes, routeFile } from '../prerender';

const TEMPLATE = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const tag = (html, key, name, attr = 'content') =>
  html.match(new RegExp(`<(?:meta|link)\\s[^>]*\\b${key}="${name}"[^>]*\\b${attr}="([^"]*)"`))?.[1];
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)[1];
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const afterHead = (html) => html.slice(html.indexOf('</head>'));

describe('injectMeta', () => {
  it("puts the page's title, description, URL and image in <head>", () => {
    const html = injectMeta(TEMPLATE, PAGES.schedule);
    const title = 'Jadwal Eli · Armeniaca';
    expect(titleOf(html)).toBe(title);
    expect(tag(html, 'rel', 'canonical', 'href')).toBe('https://armeniaca.online/schedule');
    for (const [key, name] of [['property', 'og:title'], ['name', 'twitter:title']]) expect(tag(html, key, name)).toBe(title);
    for (const [key, name] of [['name', 'description'], ['property', 'og:description'], ['name', 'twitter:description']]) {
      expect(unescape(tag(html, key, name))).toBe(PAGES.schedule.description);
    }
    expect(tag(html, 'property', 'og:url')).toBe('https://armeniaca.online/schedule');
    expect(tag(html, 'property', 'og:image')).toBe(DEFAULT_IMAGE);
    expect(tag(html, 'name', 'twitter:image')).toBe(DEFAULT_IMAGE);
    expect(tag(html, 'property', 'og:image:type')).toBe('image/jpeg');
    // The default card keeps the template's alt text.
    expect(tag(html, 'property', 'og:image:alt')).toBe(tag(TEMPLATE, 'property', 'og:image:alt'));
  });

  it('leaves everything outside those tags as it was', () => {
    const html = injectMeta(TEMPLATE, PAGES.schedule);
    expect(afterHead(html)).toBe(afterHead(TEMPLATE));
    expect(html.split('\n').length).toBe(TEMPLATE.split('\n').length);
    expect(html.match(/<meta\s/g).length).toBe(TEMPLATE.match(/<meta\s/g).length);
  });

  it('escapes text, and keeps "$" patterns literal', () => {
    const html = injectMeta(TEMPLATE, { path: '/eli-notes/x', title: 'Eli & "kamu" <3 $& $1', description: 'a "b" & c' });
    expect(titleOf(html)).toBe('Eli &amp; "kamu" &lt;3 $&amp; $1 · Armeniaca');
    expect(tag(html, 'property', 'og:title')).toBe('Eli &amp; &quot;kamu&quot; &lt;3 $&amp; $1 · Armeniaca');
    expect(tag(html, 'name', 'description')).toBe('a &quot;b&quot; &amp; c');
  });

  it("uses a page's own image, with its type and the page title as alt text", () => {
    const html = injectMeta(TEMPLATE, PAGES.armepack);
    expect(tag(html, 'property', 'og:image')).toBe('https://armeniaca.online/og-petikan.png');
    expect(tag(html, 'property', 'og:image:type')).toBe('image/png');
    expect(tag(html, 'property', 'og:image:alt')).toBe('ArmePack — The Life of Armeniaca · Armeniaca');
    expect(tag(html, 'name', 'twitter:image:alt')).toBe('ArmePack — The Life of Armeniaca · Armeniaca');
  });

  it('keeps the default description when a page has none', () => {
    const html = injectMeta(TEMPLATE, { path: '/x', title: 'X' });
    expect(tag(html, 'name', 'description')).toBe(tag(TEMPLATE, 'name', 'description'));
  });

  it('fails when index.html no longer has exactly one of a tag', () => {
    expect(() => injectMeta(TEMPLATE.replace(/<link rel="canonical"[^>]*>/, ''), PAGES.schedule)).toThrow(/canonical/);
    const twice = TEMPLATE.replace(/(<meta property="og:title"[^>]*>)/, '$1$1');
    expect(() => injectMeta(twice, PAGES.schedule)).toThrow(/og:title.*found 2/);
  });
});

describe('prerenderRoutes', () => {
  const note = {
    id: '2026-11-22-idn-692', status: 'published', date: '2026-11-22', platform: 'idn', liveTitle: 'Ngobrol santai', at: 692,
    quote: 'Kok kalian bisa sih?', story: 'Eli kaget waktu penonton menebak koleksi stikernya dengan tepat.', mood: 'lucu',
  };
  const recap = {
    id: '2026-11-22-idn', date: '2026-11-22', platform: 'idn', startedAt: '2026-11-22T16:09:48.700Z', durationSec: 2411, comments: 2972,
    chatWords: [['wkwk', 202]], talkWords: [],
  };
  const images = [
    { year: '2026', eventDate: '2026-11-21', eventName: 'SCTV Awards 2026', url: '/archive/x/x-A.webp' },
    { year: '2026', eventDate: '2026-11-21', eventName: 'SCTV Awards 2026', url: '/archive/x/x-B.webp' },
    { year: '2025', date: '2025-06-15', title: 'Seitansai', url: '/archive/img-001.webp' },
  ];
  const articles = [{ slug: 'request-hour-2026', title: 'JKT48 Request Hour 2026', subtitle: 'Setlist Best 40' }];

  it('lists static pages, gallery years, moments, notes, recaps, weeks and news, without the homepage', () => {
    const { routes, skipped } = prerenderRoutes({ notes: [note], recaps: [recap], images, articles });
    const paths = routes.map((r) => r.path);
    expect(skipped).toEqual([]);
    expect(paths).not.toContain('/');
    expect(paths).toEqual(expect.arrayContaining([
      '/schedule', '/eli-notes', '/gallery/2025', '/gallery/2026', '/momen/2026-11-21-sctv-awards-2026', '/momen/2025-06-15-seitansai',
      '/eli-notes/2026-11-22-idn-692', '/rekap-live/2026-11-22-idn', '/rekap-live/minggu/2026-11-16', '/news/request-hour-2026',
    ]));
    expect(paths.length).toBe(Object.keys(PAGES).length - 1 + 2 + 2 + 1 + 1 + 1 + 1);
    expect(routes.find((r) => r.path === '/momen/2026-11-21-sctv-awards-2026').meta.description).toMatch(/: 2 foto/);
  });

  it('gives /rekap-live/minggu the newest week, or the plain page without any', () => {
    const withWeeks = prerenderRoutes({ notes: [note], recaps: [recap] }).routes.find((r) => r.path === '/rekap-live/minggu');
    expect(withWeeks.meta.path).toBe('/rekap-live/minggu/2026-11-16');
    const none = prerenderRoutes().routes.find((r) => r.path === '/rekap-live/minggu');
    expect(none.meta).toBe(PAGES.rekapLiveWeekly);
  });

  it('skips unsafe or duplicate URLs and broken data, and keeps the rest', () => {
    const { routes, skipped } = prerenderRoutes({
      notes: [{ ...note, story: undefined }],
      articles: [...articles, { ...articles[0] }, { slug: '../../etc', title: 'x' }, { slug: 'ada spasi', title: 'x' }],
    });
    expect(skipped.map((s) => s.path)).toEqual(['/eli-notes/2026-11-22-idn-692', '/news/request-hour-2026', '/news/../../etc', '/news/ada spasi']);
    expect(skipped[1].reason).toMatch(/duplicate/);
    expect(routes.filter((r) => r.path.startsWith('/news/')).map((r) => r.path)).toEqual(['/news/request-hour-2026']);
  });

  it('maps a URL to its file in dist/', () => {
    expect(routeFile('/eli-notes/2026-11-22-idn-692')).toBe('eli-notes/2026-11-22-idn-692/index.html');
    expect(routeFile('/schedule')).toBe('schedule/index.html');
  });
});
