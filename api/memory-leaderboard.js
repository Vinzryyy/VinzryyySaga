/**
 * /api/memory-leaderboard — daily ranking for Pasangkan Momen (mode Harian).
 *
 *   GET  ?level=sedang            → { date, level, entries: [{ name, timeMs, moves, stars }] }
 *   POST { level, date, name, clientId, log, pauses }
 *                                 → { ok, rank, best, entries }
 *
 * The browser never sends its own time or moves. It sends the flip log, the
 * server rebuilds today's board from the same seed and replays the game
 * (verifyRun), so only a real finished game can rank. Names are stored
 * already masked ("Malvin" → "M****n"); the raw name is never saved.
 *
 * Storage: RTDB /memory_lb/{date}/{level}/{playerKey}, written with the
 * Firebase service account (same as /api/admin-schedule), one row per
 * browser per day per level, kept only if it beats the previous one.
 */

import { createHash, createSign } from 'node:crypto';
import {
  LEVEL_IDS,
  MEMORY_POOL_URL,
  NAME_RE,
  compareResults,
  createBoard,
  dailySeed,
  maskName,
  poolForDay,
  verifyRun,
} from '../src/lib/memoryGame.js';

const TOP_N = 20;
const CLIENT_RE = /^[A-Za-z0-9_-]{12,64}$/;

const wibDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

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

// ── Photo pool (same static file the page uses) ──────────────────────

let poolCache = null;
const loadPool = async (req) => {
  if (poolCache && Date.now() - poolCache.at < 10 * 60 * 1000) return poolCache.items;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const r = await fetch(`${proto}://${req.headers.host}${MEMORY_POOL_URL}`);
  if (!r.ok) throw new Error(`pool HTTP ${r.status}`);
  const items = (await r.json()).items;
  poolCache = { at: Date.now(), items };
  return items;
};

// ── Ranking ──────────────────────────────────────────────────────────

const ranked = (rows) =>
  Object.entries(rows || {})
    .map(([key, v]) => ({ key, ...v }))
    .filter((v) => Number.isFinite(v.timeMs) && Number.isFinite(v.moves))
    .sort((a, b) => compareResults(a, b) || (a.at || 0) - (b.at || 0));

const publicRow = ({ name, timeMs, moves, stars }) => ({ name, timeMs, moves, stars });

const isConfigured = () => {
  try {
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null').private_key.trim();
    return Boolean(process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL);
  } catch {
    return false;
  }
};

// Best-effort spam brake (per serverless instance).
const hits = new Map();
const tooMany = (ip) => {
  const h = hits.get(ip);
  const now = Date.now();
  if (!h || now - h.since > 10 * 60 * 1000) {
    hits.set(ip, { since: now, count: 1 });
    return false;
  }
  h.count += 1;
  return h.count > 30;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isConfigured()) return res.status(500).json({ error: 'Papan peringkat belum dikonfigurasi.' });

  const today = wibDate();

  if (req.method === 'GET') {
    const level = String(req.query?.level || new URL(req.url, 'http://x').searchParams.get('level') || '');
    if (!LEVEL_IDS.includes(level)) return res.status(400).json({ error: 'level tidak valid' });
    try {
      const rows = ranked(await db('GET', `memory_lb/${today}/${level}`));
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
      return res.status(200).json({ date: today, level, total: rows.length, entries: rows.slice(0, TOP_N).map(publicRow) });
    } catch (err) {
      console.error('[memory-leaderboard]', err);
      return res.status(502).json({ error: 'Gagal memuat peringkat.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ error: 'Terlalu sering. Coba lagi sebentar lagi.' });

  const { level, date, name, clientId, log, pauses } = req.body || {};
  if (!LEVEL_IDS.includes(level)) return res.status(400).json({ error: 'level tidak valid' });
  if (date !== today) return res.status(400).json({ error: 'Papan harian sudah berganti. Main lagi papan hari ini, ya.' });
  const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(cleanName)) return res.status(400).json({ error: 'Nama 2–16 huruf/angka.' });
  if (!CLIENT_RE.test(String(clientId || ''))) return res.status(400).json({ error: 'clientId tidak valid' });

  try {
    const pool = await loadPool(req);
    const { deck } = createBoard(poolForDay(pool, today), level, dailySeed(today, level));
    const run = verifyRun(deck, log, pauses);
    if (!run.ok) return res.status(400).json({ error: 'Hasil permainan tidak bisa diverifikasi.', reason: run.error });

    const playerKey = createHash('sha256').update(`mm:${clientId}`).digest('hex').slice(0, 20);
    const path = `memory_lb/${today}/${level}`;
    const prev = await db('GET', `${path}/${playerKey}`);
    const entry = { name: maskName(cleanName), timeMs: run.timeMs, moves: run.moves, stars: run.stars, at: Date.now() };
    const improved = !prev || compareResults(entry, prev) < 0;
    if (improved) await db('PUT', `${path}/${playerKey}`, entry);
    else if (prev.name !== entry.name) await db('PATCH', `${path}/${playerKey}`, { name: entry.name });

    const rows = ranked(await db('GET', path));
    const rank = rows.findIndex((r) => r.key === playerKey) + 1;
    const best = rows[rank - 1];
    return res.status(200).json({
      ok: true,
      improved,
      rank,
      total: rows.length,
      best: best ? publicRow(best) : null,
      entries: rows.slice(0, TOP_N).map(publicRow),
    });
  } catch (err) {
    console.error('[memory-leaderboard]', err);
    return res.status(502).json({ error: 'Gagal menyimpan ke peringkat.' });
  }
}
