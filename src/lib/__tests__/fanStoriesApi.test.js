// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { generateKeyPairSync, randomBytes, scryptSync } from 'node:crypto';
import handler from '../../../api/fan-stories.js';
import { formatStoryDate, validateStory } from '../fanStory';

const hash = (pw) => {
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 32, { N: 1024, r: 8, p: 1 });
  return ['scrypt', 1024, 8, 1, salt.toString('base64'), h.toString('base64')].join('$');
};
const PW = { mon: 'pw-mon', tue: 'pw-tue', wed: 'pw-wed', thu: 'pw-thu', fri: 'pw-fri', sat: 'pw-sat' };
const HASHES = Object.fromEntries(Object.entries(PW).map(([d, p]) => [d, hash(p)]));
const MONDAY = new Date(Date.UTC(2026, 10, 16, 5)); // 16 Nov 2026, 12:00 WIB
const BASE = 'https://test-default-rtdb.firebaseio.com';
const STORY = 'Pertama kali nonton teater, Eli melambai ke barisan belakang.';

describe('validateStory', () => {
  it('cleans and accepts a story', () => {
    expect(validateStory({ name: '  Arme  Bekasi ', story: `  ${STORY}\u0007  `, moment: 'dream-bakudan', momentLabel: ' Dream Bakudan ' }))
      .toEqual({ story: { name: 'Arme Bekasi', story: STORY, moment: 'dream-bakudan', momentLabel: 'Dream Bakudan' } });
    expect(validateStory({ name: 'Éli_fan.1', story: STORY }).story).toEqual({ name: 'Éli_fan.1', story: STORY });
  });

  it('rejects short stories, URLs, bad names and bad moments', () => {
    expect(validateStory({ name: 'Arme', story: 'terlalu pendek' }).error).toMatch(/minimal 20/);
    expect(validateStory({ name: 'Arme', story: 'x'.repeat(601) }).error).toMatch(/maksimal 600/);
    expect(validateStory({ name: 'Arme', story: `${STORY} cek https://spam.example` }).error).toMatch(/tautan/);
    expect(validateStory({ name: 'Arme', story: `${STORY} www.spam.example` }).error).toMatch(/tautan/);
    expect(validateStory({ name: 'A', story: STORY }).error).toMatch(/Nama/);
    expect(validateStory({ name: '<script>', story: STORY }).error).toMatch(/Nama/);
    expect(validateStory({ name: 'x'.repeat(25), story: STORY }).error).toMatch(/Nama/);
    expect(validateStory({ name: 'Arme', story: STORY, moment: '../wishes' }).error).toMatch(/Momen/);
    expect(validateStory({ name: 'Arme', story: STORY, moment: 'ok', momentLabel: 'x'.repeat(81) }).error).toMatch(/80/);
  });

  it('counts length after stripping control chars', () => {
    expect(validateStory({ name: 'Arme', story: `\u0000\u0001${'a'.repeat(19)}\u0002` }).error).toMatch(/minimal/);
  });
});

describe('formatStoryDate', () => {
  const now = MONDAY.getTime();
  it('uses relative words for recent stories and a date otherwise', () => {
    expect(formatStoryDate(now - 10_000, now)).toBe('baru saja');
    expect(formatStoryDate(now - 5 * 60_000, now)).toBe('5 menit lalu');
    expect(formatStoryDate(now - 26 * 3600_000, now)).toBe('kemarin');
    expect(formatStoryDate(now - 3 * 86400_000, now)).toBe('3 hari lalu');
    expect(formatStoryDate(Date.UTC(2026, 9, 1, 5), now)).toBe('1 Oktober 2026');
  });
});

describe('handler', () => {
  const res = () => {
    const r = { statusCode: 0, body: null, headers: {} };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    return r;
  };
  const req = (body, ip = '1.1.1.1') => ({ method: 'POST', body, headers: { 'x-forwarded-for': ip } });
  const CID = 'abcdef0123456789abcdef0123456789';

  /** fetch mock: token endpoint + an in-memory RTDB keyed by path. */
  const mockDb = (data = {}) => {
    const calls = [];
    const fetchMock = vi.fn(async (url, opts = {}) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        return { ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
      }
      const path = url.slice(BASE.length + 1).replace(/\.json$/, '');
      const body = opts.body ? JSON.parse(opts.body) : undefined;
      calls.push({ method: opts.method, path, body, auth: opts.headers?.Authorization });
      if (opts.method === 'POST') return { ok: true, json: async () => ({ name: '-Nnew' }) };
      if (opts.method === 'GET') return { ok: true, json: async () => data[path] ?? null };
      return { ok: true, json: async () => body ?? null };
    });
    vi.stubGlobal('fetch', fetchMock);
    return { fetchMock, calls };
  };

  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    vi.stubEnv('ADMIN_PASSWORD_HASHES', JSON.stringify(HASHES));
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', JSON.stringify({
      client_email: 'svc@test.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    }));
    vi.stubEnv('FIREBASE_DATABASE_URL', `${BASE}/`);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rejects invalid submissions before touching the database', async () => {
    const { fetchMock } = mockDb();
    for (const body of [
      { action: 'submit', name: 'Arme', story: 'pendek', clientId: CID },
      { action: 'submit', name: 'Arme', story: `${STORY} http://spam.example`, clientId: CID },
      { action: 'submit', name: '!', story: STORY, clientId: CID },
    ]) {
      const r = res();
      await handler(req(body, '9.9.9.1'), r);
      expect(r.statusCode).toBe(400);
    }
    const r = res();
    await handler(req({ action: 'submit', name: 'Arme', story: STORY, clientId: 'short' }, '9.9.9.2'), r);
    expect(r.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('writes submissions to the pending path with a hashed client key, no IP', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONDAY);
    const { calls } = mockDb();
    const r = res();
    await handler(req({ action: 'submit', name: 'Arme', story: STORY, moment: 'dream-bakudan', momentLabel: 'Dream Bakudan', clientId: CID }, '5.5.5.5'), r);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    const [{ method, path, body, auth }] = calls;
    expect(method).toBe('POST');
    expect(path).toBe('fan_stories_pending');
    expect(auth).toBe('Bearer tok');
    expect(body).toEqual({
      name: 'Arme', story: STORY, moment: 'dream-bakudan', momentLabel: 'Dream Bakudan',
      createdAt: MONDAY.getTime(), client: expect.stringMatching(/^[0-9a-f]{20}$/),
    });
    expect(JSON.stringify(body)).not.toContain('5.5.5.5');
    expect(JSON.stringify(body)).not.toContain(CID);
  });

  it('rate-limits submissions to 3 per 10 minutes per IP', async () => {
    mockDb();
    const codes = [];
    for (let i = 0; i < 4; i++) {
      const r = res();
      await handler(req({ action: 'submit', name: 'Arme', story: STORY, clientId: CID }, '6.6.6.6'), r);
      codes.push(r.statusCode);
    }
    expect(codes).toEqual([200, 200, 200, 429]);
  });

  it('returns only approved stories, newest first, filtered by moment', async () => {
    mockDb({
      fan_stories: {
        a: { name: 'A', story: STORY, createdAt: 1, moment: 'm1', momentLabel: 'M1', approvedAt: 5 },
        b: { name: 'B', story: STORY, createdAt: 3 },
        c: { name: 'C', story: STORY, createdAt: 2, moment: 'm1' },
      },
    });
    const all = res();
    await handler({ method: 'GET', query: {}, headers: {} }, all);
    expect(all.statusCode).toBe(200);
    expect(all.body.stories.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(all.body.stories[2]).toEqual({ id: 'a', name: 'A', story: STORY, moment: 'm1', momentLabel: 'M1', createdAt: 1 });

    const m = res();
    await handler({ method: 'GET', query: { moment: 'm1', limit: '1' }, headers: {} }, m);
    expect(m.body.stories.map((s) => s.id)).toEqual(['c']);

    const bad = res();
    await handler({ method: 'GET', query: { moment: '../x' }, headers: {} }, bad);
    expect(bad.statusCode).toBe(400);
  });

  it('rejects a wrong admin password with 401', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONDAY);
    const { fetchMock } = mockDb();
    const r = res();
    await handler(req({ action: 'list_pending', password: 'pw-tue' }, '2.2.2.2'), r);
    expect(r.statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists pending stories for the admin', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONDAY);
    mockDb({ fan_stories_pending: { p2: { name: 'B', story: STORY, createdAt: 2, client: 'x' }, p1: { name: 'A', story: STORY, createdAt: 1 } } });
    const r = res();
    await handler(req({ action: 'list_pending', password: 'pw-mon' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.stories.map((s) => s.id)).toEqual(['p1', 'p2']);
    expect(r.body.stories[1]).not.toHaveProperty('client');
  });

  it('approves: moves pending → fan_stories (with edits) and deletes pending atomically', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONDAY);
    const { calls } = mockDb({
      'fan_stories_pending/-Np1': { name: 'Arme', story: STORY, moment: 'm1', momentLabel: 'M1', createdAt: 123, client: 'abc' },
    });
    const r = res();
    await handler(req({ action: 'approve', password: 'pw-mon', id: '-Np1', edits: { story: `${STORY} Terima kasih, Eli.` } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual({ ok: true, id: '-Np1' });
    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch.path).toBe('');
    expect(patch.body).toEqual({
      'fan_stories/-Np1': {
        name: 'Arme', story: `${STORY} Terima kasih, Eli.`, moment: 'm1', momentLabel: 'M1',
        createdAt: 123, approvedAt: MONDAY.getTime(),
      },
      'fan_stories_pending/-Np1': null,
    });
  });

  it('approve validates edits and handles missing ids', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONDAY);
    const { calls } = mockDb({ 'fan_stories_pending/-Np1': { name: 'Arme', story: STORY, createdAt: 1 } });
    const bad = res();
    await handler(req({ action: 'approve', password: 'pw-mon', id: '-Np1', edits: { story: 'pendek' } }), bad);
    expect(bad.statusCode).toBe(400);
    const gone = res();
    await handler(req({ action: 'approve', password: 'pw-mon', id: '-Nmissing' }), gone);
    expect(gone.statusCode).toBe(404);
    const traversal = res();
    await handler(req({ action: 'reject', password: 'pw-mon', id: '../wishes' }), traversal);
    expect(traversal.statusCode).toBe(400);
    expect(calls.some((c) => c.method !== 'GET')).toBe(false);
  });

  it('rejects: deletes the pending story', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONDAY);
    const { calls } = mockDb();
    const r = res();
    await handler(req({ action: 'reject', password: 'pw-mon', id: '-Np1' }), r);
    expect(r.statusCode).toBe(200);
    expect(calls).toEqual([{ method: 'DELETE', path: 'fan_stories_pending/-Np1', body: undefined, auth: 'Bearer tok' }]);
  });
});
