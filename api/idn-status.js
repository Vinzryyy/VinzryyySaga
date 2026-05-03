/**
 * /api/idn-status?username=jkt48_eli
 *
 * Proxies IDN App's public GraphQL endpoint (api.idn.app/graphql) to:
 *   1. Fetch the user's profile (avatar, bio, follower count)
 *   2. Fetch the current global live-streams list and detect whether
 *      that user is actively streaming right now
 *
 * GraphQL doesn't filter `getLivestreams` by streamerID reliably (the
 * arg is accepted but the upstream returns the same global list), so we
 * scan the array client-side and match by `creator.username`.
 *
 * Edge-cached 20s + SWR 60s so all polling clients share a near-cached
 * read regardless of visitor count.
 *
 * Returned shape (only the fields we use):
 *   {
 *     isLive: boolean,
 *     profile: { username, name, avatar, bio, followerCount, shortId },
 *     liveStream: { slug, title, viewCount, liveAt, imageUrl, url } | null,
 *     fetchedAt: string
 *   }
 */

const GRAPHQL_URL = 'https://api.idn.app/graphql';

const gql = async (query) => {
  const r = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
};

export default async function handler(req, res) {
  const username = (req.query.username || '').trim();
  if (!username) {
    return res.status(400).json({ error: 'username query param required' });
  }
  // Defensive: only allow safe characters in the username (a-z, 0-9, _, -)
  // since we interpolate into the GraphQL query string.
  if (!/^[A-Za-z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: 'invalid username' });
  }

  try {
    const [profileResp, streamsResp] = await Promise.all([
      gql(
        `{ getPublicProfileByUsername(username: "${username}") {` +
          ' uuid username name avatar bio_description follower_count short_id' +
          ' } }',
      ),
      gql(
        '{ getLivestreams(page: 1) {' +
          ' slug title status live_at view_count image_url' +
          ' creator { username name }' +
          ' } }',
      ),
    ]);

    const profile = profileResp?.data?.getPublicProfileByUsername;
    const allStreams = streamsResp?.data?.getLivestreams || [];
    const liveEntry = allStreams.find(
      (s) => s?.creator?.username === username && s?.status === 'live',
    );

    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    return res.status(200).json({
      isLive: !!liveEntry,
      profile: profile
        ? {
            username: profile.username,
            name: profile.name,
            avatar: profile.avatar,
            bio: profile.bio_description,
            followerCount: profile.follower_count,
            shortId: profile.short_id,
          }
        : null,
      liveStream: liveEntry
        ? {
            slug: liveEntry.slug,
            title: liveEntry.title,
            viewCount: liveEntry.view_count,
            liveAt: liveEntry.live_at,
            imageUrl: liveEntry.image_url,
            url: `https://www.idn.app/${encodeURIComponent(username)}/live/${liveEntry.slug}`,
          }
        : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.setHeader('Cache-Control', 's-maxage=10');
    return res.status(500).json({
      error: err.message,
      isLive: false,
      profile: null,
      liveStream: null,
    });
  }
}
