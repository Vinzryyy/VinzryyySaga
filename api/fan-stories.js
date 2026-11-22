/**
 * /api/fan-stories — Cerita Penggemar (/cerita, /admin/cerita).
 *
 *   GET  ?moment=<slug>&limit=<n>        → { stories: [{ id, name, story, moment, momentLabel, createdAt }] }
 *   POST { action:'submit', name, story, moment?, momentLabel?, clientId } → { ok }
 *   POST { action:'list_pending', password }                              → { ok, stories }
 *   POST { action:'approve', password, id, edits?:{ story?, name? } }      → { ok, id }
 *   POST { action:'reject', password, id }                                 → { ok }
 *
 * Nothing is public until an admin approves it: submissions land in
 * RTDB /fan_stories_pending (no client read/write), approval moves them to
 * /fan_stories (public read, no client write). All writes go through the
 * Firebase service account, same as /api/admin-schedule; the admin
 * password is the same daily password (ADMIN_PASSWORD_HASHES).
 *
 * Privacy: the IP is used only for in-memory rate limits and never stored.
 * Pending rows keep a hashed browser key (sha256 of clientId, 20 chars) so
 * an admin could spot repeat spam; it is dropped on approval.
 */

import { createHash, createSign } from 'node:crypto';
import { checkPassword } from './admin-schedule.js';
import { ID_RE, MOMENT_RE, validateStory } from '../src/lib/fanStory.js';

const PUBLIC_PATH = 'fan_stories';
const PENDING_PATH = 'fan_stories_pending';
const MAX_LIMIT = 50;
const CLIENT_RE = /^[A-Za-z0-9_-]{12,64}$/;

// ── Firebase (service account → OAuth → RTDB REST) ───────────────────

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

const databaseBase = () => (process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');

/** path '' = database root (used for atomic multi-path PATCH). */
const db = async (method, path, body) => {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const token = await getAccessToken(sa);
  const r = await fetch(`${databaseBase()}/${path}.json`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`database HTTP ${r.status}`);
  return r.json();
};

const isConfigured = () => {
  try {
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null').private_key.trim();
    return Boolean(databaseBase());
  } catch {
    return false;
  }
};

const adminHashes = () => {
  try {
    return JSON.parse(process.env.ADMIN_PASSWORD_HASHES || 'null');
  } catch {
    return null;
  }
};

// ── Best-effort per-IP brakes (per serverless instance, memory only) ──

const makeLimiter = (windowMs, max) => {
  const hits = new Map();
  return {
    hit(ip) {
      const now = Date.now();
      const h = hits.get(ip);
      if (!h || now - h.since > windowMs) {
        hits.set(ip, { since: now, count: 1 });
        return false;
      }
      h.count += 1;
      return h.count > max;
    },
    blocked(ip) {
      const h = hits.get(ip);
      return Boolean(h && Date.now() - h.since <= windowMs && h.count >= max);
    },
    clear(ip) {
      hits.delete(ip);
    },
  };
};

const submitLimit = makeLimiter(10 * 60 * 1000, 3);
const readLimit = makeLimiter(60 * 1000, 60);
const adminFailures = makeLimiter(15 * 60 * 1000, 5);

// ── Shapes ───────────────────────────────────────────────────────────

const toList = (rows) =>
  Object.entries(rows || {})
    .filter(([, v]) => v && typeof v.story === 'string')
    .map(([id, v]) => ({
      id,
      name: v.name || '',
      story: v.story,
      moment: v.moment || null,
      momentLabel: v.momentLabel || null,
      createdAt: Number(v.createdAt) || 0,
    }));

const newestFirst = (a, b) => b.createdAt - a.createdAt;

const readQuery = (req, key) =>
  String(req.query?.[key] ?? new URL(req.url || '/', 'http://x').searchParams.get(key) ?? '');

// ── Handler ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isConfigured()) return res.status(500).json({ error: 'Cerita penggemar belum dikonfigurasi.' });

  const ip = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  if (req.method === 'GET') {
    if (readLimit.hit(ip)) return res.status(429).json({ error: 'Terlalu sering. Coba lagi sebentar lagi.' });
    const moment = readQuery(req, 'moment');
    if (moment && !MOMENT_RE.test(moment)) return res.status(400).json({ error: 'momen tidak valid' });
    const n = Number.parseInt(readQuery(req, 'limit'), 10);
    const limit = Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : MAX_LIMIT;
    try {
      let stories = toList(await db('GET', PUBLIC_PATH));
      if (moment) stories = stories.filter((s) => s.moment === moment);
      stories = stories.sort(newestFirst).slice(0, limit);
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ stories });
    } catch (err) {
      console.error('[fan-stories]', err);
      return res.status(502).json({ error: 'Gagal memuat cerita.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { action } = body;

  // ── Public: submit ──
  if (action === 'submit') {
    if (submitLimit.hit(ip)) {
      return res.status(429).json({ error: 'Kamu sudah mengirim beberapa cerita. Coba lagi 10 menit lagi, ya.' });
    }
    if (!CLIENT_RE.test(String(body.clientId || ''))) return res.status(400).json({ error: 'clientId tidak valid' });
    const { story, error } = validateStory(body);
    if (error) return res.status(400).json({ error });
    const client = createHash('sha256').update(`fs:${body.clientId}`).digest('hex').slice(0, 20);
    try {
      await db('POST', PENDING_PATH, { ...story, createdAt: Date.now(), client });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[fan-stories]', err);
      return res.status(502).json({ error: 'Gagal mengirim cerita. Coba lagi nanti.' });
    }
  }

  if (!['list_pending', 'approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action tidak dikenal' });
  }

  // ── Admin ──
  const hashes = adminHashes();
  if (!hashes) return res.status(500).json({ error: 'server belum dikonfigurasi (lihat docs/admin-jadwal.md)' });
  if (adminFailures.blocked(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
  if (!checkPassword(body.password, hashes)) {
    adminFailures.hit(ip);
    await new Promise((r) => setTimeout(r, 800));
    return res.status(401).json({ error: 'Password salah untuk hari ini.' });
  }
  adminFailures.clear(ip);

  try {
    if (action === 'list_pending') {
      const stories = toList(await db('GET', PENDING_PATH)).sort((a, b) => a.createdAt - b.createdAt);
      return res.status(200).json({ ok: true, stories });
    }

    const id = String(body.id || '');
    if (!ID_RE.test(id)) return res.status(400).json({ error: 'id tidak valid' });

    if (action === 'reject') {
      await db('DELETE', `${PENDING_PATH}/${id}`);
      return res.status(200).json({ ok: true });
    }

    // approve
    const pending = await db('GET', `${PENDING_PATH}/${id}`);
    if (!pending) return res.status(404).json({ error: 'Cerita sudah tidak ada di antrean.' });
    const edits = body.edits && typeof body.edits === 'object' ? body.edits : {};
    const merged = {
      name: typeof edits.name === 'string' ? edits.name : pending.name,
      story: typeof edits.story === 'string' ? edits.story : pending.story,
      moment: pending.moment,
      momentLabel: pending.momentLabel,
    };
    const { story, error } = validateStory(merged);
    if (error) return res.status(400).json({ error });
    const approved = { ...story, createdAt: Number(pending.createdAt) || Date.now(), approvedAt: Date.now() };
    // One atomic multi-path update: publish + remove from the queue.
    await db('PATCH', '', {
      [`${PUBLIC_PATH}/${id}`]: approved,
      [`${PENDING_PATH}/${id}`]: null,
    });
    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error('[fan-stories]', err);
    return res.status(502).json({ error: 'Gagal memproses ke database.' });
  }
}
