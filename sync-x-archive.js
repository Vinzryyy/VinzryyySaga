import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '.env');
const STATE_DIR = path.join(__dirname, '.sync');
const STATE_PATH = path.join(STATE_DIR, 'x-sync-state.json');
const AUTH_ARCHIVE_PATH = path.join(__dirname, 'armeniaca-authentic-archive.json');
const X_ARCHIVE_PATH = path.join(__dirname, 'src', 'data', 'xArchive.json');

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value.replace(/^"|"$/g, '');
    }
  });
};

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const getUser = async (username, bearerToken) => {
  const url = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get user (${response.status}): ${text}`);
  }

  const payload = await response.json();
  if (!payload?.data?.id) {
    throw new Error('X API returned no user id.');
  }
  return payload.data;
};

const getTweetsPage = async ({ userId, bearerToken, paginationToken, sinceId, maxResults }) => {
  const params = new URLSearchParams({
    max_results: String(maxResults),
    expansions: 'attachments.media_keys',
    'tweet.fields': 'created_at,text,attachments',
    'media.fields': 'type,url,preview_image_url',
    exclude: 'retweets,replies',
  });

  if (paginationToken) params.set('pagination_token', paginationToken);
  if (sinceId) params.set('since_id', sinceId);

  const url = `https://api.x.com/2/users/${userId}/tweets?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch tweets (${response.status}): ${text}`);
  }

  return response.json();
};

const normalizeTitle = (text, index) => {
  const base = (text || '').replace(/\s+/g, ' ').trim();
  if (!base) return `Eli JKT48 Moment (${index + 1})`;
  const firstLine = base.split('\n')[0].trim();
  const shortened = firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
  return shortened;
};

const toArchiveItems = (payload) => {
  const tweets = payload?.data || [];
  const mediaIncludes = payload?.includes?.media || [];
  const mediaMap = new Map(mediaIncludes.map((m) => [m.media_key, m]));

  const items = [];

  for (const tweet of tweets) {
    const mediaKeys = tweet?.attachments?.media_keys || [];
    if (mediaKeys.length === 0) continue;

    let mediaIndex = 0;
    for (const mediaKey of mediaKeys) {
      const media = mediaMap.get(mediaKey);
      if (!media) continue;
      if (media.type !== 'photo') continue;

      const mediaUrl = media.url;
      if (!mediaUrl) continue;

      const created = new Date(tweet.created_at);
      const year = String(created.getUTCFullYear());
      const month = monthNames[created.getUTCMonth()];
      const date = created.toISOString().slice(0, 10);
      const title = normalizeTitle(tweet.text, mediaIndex);

      items.push({
        id: `eli-x-${tweet.id}-${mediaIndex}`,
        url: mediaUrl,
        thumbnail: mediaUrl,
        title,
        description: (tweet.text || '').trim() || title,
        category: 'all',
        year,
        month,
        date,
        location: 'JKT48 Theater',
        dimensions: { width: 4000, height: 6000 },
        featured: false,
      });

      mediaIndex += 1;
    }
  }

  return items;
};

const mergeById = (existing, incoming) => {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
};

const run = async () => {
  parseEnvFile(ENV_PATH);

  const bearerToken = process.env.X_BEARER_TOKEN;
  const username = process.env.X_USERNAME || 'armeniaca15';
  const maxPages = Number(process.env.X_SYNC_MAX_PAGES || 3);
  const pageSize = Number(process.env.X_SYNC_PAGE_SIZE || 100);

  if (!bearerToken) {
    throw new Error('Missing X_BEARER_TOKEN. Add it to .env (see .env.example).');
  }

  const state = readJson(STATE_PATH, { since_id: null, last_synced_at: null });
  const user = await getUser(username, bearerToken);

  let paginationToken;
  let page = 0;
  let newestTweetId = state.since_id;
  const incoming = [];

  while (page < maxPages) {
    const payload = await getTweetsPage({
      userId: user.id,
      bearerToken,
      paginationToken,
      sinceId: state.since_id,
      maxResults: Math.min(Math.max(pageSize, 5), 100),
    });

    const pageItems = toArchiveItems(payload);
    incoming.push(...pageItems);

    const firstTweetId = payload?.meta?.newest_id;
    if (firstTweetId && (!newestTweetId || BigInt(firstTweetId) > BigInt(newestTweetId))) {
      newestTweetId = firstTweetId;
    }

    paginationToken = payload?.meta?.next_token;
    page += 1;

    if (!paginationToken) break;
  }

  const existingAuth = readJson(AUTH_ARCHIVE_PATH, []);
  const existingX = readJson(X_ARCHIVE_PATH, []);

  const merged = mergeById(mergeById(existingAuth, existingX), incoming);

  writeJson(AUTH_ARCHIVE_PATH, merged);
  writeJson(X_ARCHIVE_PATH, merged);

  writeJson(STATE_PATH, {
    since_id: newestTweetId || state.since_id || null,
    last_synced_at: new Date().toISOString(),
    username,
    fetched_media_items: incoming.length,
  });

  console.log(`Synced ${incoming.length} new media items for @${username}.`);
  console.log(`Archive size: ${merged.length} items.`);
};

run().catch((error) => {
  console.error('[x-sync] Failed:', error.message);
  process.exit(1);
});
