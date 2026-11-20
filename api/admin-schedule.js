/**
 * /api/admin-schedule — password-gated writes to RTDB /eli_schedule.
 *
 * Request (POST JSON):
 *   { password, action: 'check' }
 *   { password, action: 'save', entry, id? }   // id = update, no id = new
 *   { password, action: 'delete', id }
 *
 * Password: one per weekday in WIB (Asia/Jakarta); on Sunday any of the
 * six works. Only scrypt hashes are stored, in the ADMIN_PASSWORD_HASHES
 * env var (generate with `npm run hash-admin-passwords`):
 *   {"mon":"scrypt$...","tue":"...","wed":"...","thu":"...","fri":"...","sat":"..."}
 *
 * Writes go through the RTDB REST API authenticated as the Firebase
 * service account (FIREBASE_SERVICE_ACCOUNT env var, the JSON key from
 * Firebase Console → Project settings → Service accounts). Clients can't
 * write /eli_schedule directly — database.rules.json denies it.
 */

import { createSign, scryptSync, timingSafeEqual } from 'node:crypto';
import { validateEntry } from '../src/lib/scheduleEntry.js';

const PATH = 'eli_schedule';
const ID_RE = /^[-A-Za-z0-9_]{1,40}$/;
const DAY_KEYS = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };

// ── Password ────────────────────────────────────────────────────────

export const wibWeekday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Jakarta' }).format(now);

export const verifyHash = (password, stored) => {
  const [algo, n, r, p, saltB64, hashB64] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * Number(n) * Number(r) * Number(p),
  });
  return timingSafeEqual(actual, expected);
};

/** Hashes valid right now: today's weekday, or all six on Sunday. */
export const hashesForToday = (hashes, now = new Date()) => {
  const day = wibWeekday(now);
  if (day === 'Sun') return Object.values(DAY_KEYS).map((k) => hashes[k]).filter(Boolean);
  return hashes[DAY_KEYS[day]] ? [hashes[DAY_KEYS[day]]] : [];
};

export const checkPassword = (password, hashes, now = new Date()) => {
  if (typeof password !== 'string' || !password || password.length > 100) return false;
  // Check every candidate (no early exit) so timing doesn't reveal which.
  return hashesForToday(hashes, now).reduce((ok, h) => verifyHash(password, h) || ok, false);
};

// Best-effort brute-force brake (per serverless instance).
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const isLocked = (ip) => {
  const f = failures.get(ip);
  return f && Date.now() - f.since < WINDOW_MS && f.count >= MAX_FAILURES;
};
const noteFailure = (ip) => {
  const f = failures.get(ip);
  if (!f || Date.now() - f.since > WINDOW_MS) failures.set(ip, { since: Date.now(), count: 1 });
  else f.count += 1;
};

// ── Service-account access token (RS256 JWT → OAuth) ────────────────

let cachedToken = null;
const b64url = (buf) => Buffer.from(buf).toString('base64url');

const getAccessToken = async (sa) => {
  if (cachedToken && cachedToken.exp - 60 > Date.now() / 1000) return cachedToken.value;
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!r.ok) throw new Error(`token HTTP ${r.status}`);
  const j = await r.json();
  cachedToken = { value: j.access_token, exp: iat + (j.expires_in || 3600) };
  return cachedToken.value;
};

const db = async (method, path, body) => {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const base = (process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL).replace(/\/+$/, '');
  const token = await getAccessToken(sa);
  const r = await fetch(`${base}/${path}.json`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`database HTTP ${r.status}`);
  return r.json();
};

// ── Handler ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  let hashes;
  try {
    hashes = JSON.parse(process.env.ADMIN_PASSWORD_HASHES || 'null');
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null').private_key.trim();
    if (!hashes || !(process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL)) throw new Error();
  } catch {
    return res.status(500).json({ error: 'server belum dikonfigurasi (lihat docs/admin-jadwal.md)' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (isLocked(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });

  const { password, action, entry, id } = req.body || {};
  if (!checkPassword(password, hashes)) {
    noteFailure(ip);
    await new Promise((r) => setTimeout(r, 800));
    return res.status(401).json({ error: 'Password salah untuk hari ini.' });
  }
  failures.delete(ip);

  try {
    if (action === 'check') return res.status(200).json({ ok: true, day: wibWeekday() });

    if (action === 'save') {
      if (id !== undefined && !ID_RE.test(String(id))) return res.status(400).json({ error: 'id tidak valid' });
      const { entry: clean, error } = validateEntry(entry);
      if (error) return res.status(400).json({ error });
      const data = { ...clean, updatedAt: { '.sv': 'timestamp' } };
      if (id) {
        await db('PUT', `${PATH}/${id}`, data);
        return res.status(200).json({ ok: true, id });
      }
      const created = await db('POST', PATH, data);
      return res.status(200).json({ ok: true, id: created.name });
    }

    if (action === 'delete') {
      if (!ID_RE.test(String(id || ''))) return res.status(400).json({ error: 'id tidak valid' });
      await db('DELETE', `${PATH}/${id}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'action tidak dikenal' });
  } catch (err) {
    console.error('[admin-schedule]', err);
    return res.status(502).json({ error: 'Gagal menyimpan ke database.' });
  }
}
