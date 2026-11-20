// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { generateKeyPairSync, randomBytes, scryptSync } from 'node:crypto';
import handler, { checkPassword, wibWeekday } from '../../../api/admin-schedule.js';
import { validateEntry } from '../scheduleEntry';

// Cheap scrypt params so tests stay fast; same format as the real script.
const hash = (pw) => {
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 32, { N: 1024, r: 8, p: 1 });
  return ['scrypt', 1024, 8, 1, salt.toString('base64'), h.toString('base64')].join('$');
};
const PW = { mon: 'pw-mon', tue: 'pw-tue', wed: 'pw-wed', thu: 'pw-thu', fri: 'pw-fri', sat: 'pw-sat' };
const HASHES = Object.fromEntries(Object.entries(PW).map(([d, p]) => [d, hash(p)]));
const at = (day) => new Date(Date.UTC(2026, 10, 16 + day, 5)); // 16 Nov 2026 = Monday

describe('checkPassword', () => {
  it('accepts only the WIB weekday password, and any on Sunday', () => {
    expect(wibWeekday(at(0))).toBe('Mon');
    expect(checkPassword('pw-mon', HASHES, at(0))).toBe(true);
    expect(checkPassword('pw-tue', HASHES, at(0))).toBe(false);
    expect(checkPassword('pw-sat', HASHES, at(5))).toBe(true);
    Object.values(PW).forEach((p) => expect(checkPassword(p, HASHES, at(6))).toBe(true));
    expect(checkPassword('wrong', HASHES, at(6))).toBe(false);
    expect(checkPassword('', HASHES, at(6))).toBe(false);
  });

  it('switches day at WIB midnight', () => {
    expect(checkPassword('pw-mon', HASHES, new Date(Date.UTC(2026, 10, 16, 16, 59)))).toBe(true);
    expect(checkPassword('pw-mon', HASHES, new Date(Date.UTC(2026, 10, 16, 17, 1)))).toBe(false);
  });
});

describe('validateEntry', () => {
  it('cleans and accepts a show', () => {
    expect(validateEntry({ kind: 'SHOW', title: ' Dream Bakudan ', date: '2026-11-28', start_time: '19:00', venue: '', x: 1 }))
      .toEqual({ entry: { kind: 'SHOW', title: 'Dream Bakudan', date: '2026-11-28', start_time: '19:00' } });
  });
  it('rejects bad values', () => {
    expect(validateEntry({ kind: 'SHOW', title: 'x', date: '28/11/2026' }).error).toMatch(/date/);
    expect(validateEntry({ kind: 'CONCERT', title: 'x', date: '2026-11-28' }).error).toMatch(/kind/);
    expect(validateEntry({ kind: 'SHOW', title: 'x', date: '2026-11-28', url: 'http://x' }).error).toMatch(/https/);
    expect(validateEntry({ kind: 'SHOW', title: 'x'.repeat(121), date: '2026-11-28' }).error).toMatch(/panjang/);
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

  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    vi.stubEnv('ADMIN_PASSWORD_HASHES', JSON.stringify(HASHES));
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', JSON.stringify({
      client_email: 'svc@test.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    }));
    vi.stubEnv('FIREBASE_DATABASE_URL', 'https://test-default-rtdb.firebaseio.com/');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rejects a wrong password with 401', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const r = res();
    const p = handler(req({ password: 'pw-tue', action: 'check' }, '2.2.2.2'), r);
    await p;
    expect(r.statusCode).toBe(401);
  });

  it('locks an IP after 5 failures', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    for (let i = 0; i < 5; i++) await handler(req({ password: 'bad' }, '3.3.3.3'), res());
    const r = res();
    await handler(req({ password: 'pw-mon', action: 'check' }, '3.3.3.3'), r);
    expect(r.statusCode).toBe(429);
  }, 15000);

  it('validates before writing', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const r = res();
    await handler(req({ password: 'pw-mon', action: 'save', entry: { kind: 'SHOW', title: 'x', date: 'nope' } }), r);
    expect(r.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves via OAuth token + RTDB REST, then deletes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const fetchMock = vi.fn(async (url, opts) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        return { ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
      }
      return { ok: true, json: async () => (opts.method === 'POST' ? { name: '-Nabc' } : null) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const r = res();
    await handler(req({ password: 'pw-mon', action: 'save', entry: { kind: 'SHOW', title: 'Dream Bakudan', date: '2026-11-28', start_time: '19:00' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual({ ok: true, id: '-Nabc' });
    const [dbUrl, dbOpts] = fetchMock.mock.calls[1];
    expect(dbUrl).toBe('https://test-default-rtdb.firebaseio.com/eli_schedule.json');
    expect(dbOpts.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(dbOpts.body)).toEqual({
      kind: 'SHOW', title: 'Dream Bakudan', date: '2026-11-28', start_time: '19:00', updatedAt: { '.sv': 'timestamp' },
    });

    const d = res();
    await handler(req({ password: 'pw-mon', action: 'delete', id: '-Nabc' }), d);
    expect(d.statusCode).toBe(200);
    expect(fetchMock.mock.calls.at(-1)[0]).toBe('https://test-default-rtdb.firebaseio.com/eli_schedule/-Nabc.json');

    const bad = res();
    await handler(req({ password: 'pw-mon', action: 'delete', id: '../wishes' }), bad);
    expect(bad.statusCode).toBe(400);
  });
});
