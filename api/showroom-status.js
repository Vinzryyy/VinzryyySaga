/**
 * /api/showroom-status?room=JKT48_Eli
 *
 * Proxies SHOWROOM's public room/status endpoint to bypass CORS
 * (showroom-live.com sends no Access-Control-Allow-Origin, so the
 * browser can't read the response directly). Server-side fetch is
 * unrestricted.
 *
 * Cached at the Vercel edge for 20s with stale-while-revalidate so a
 * polling client refreshes are cheap (≈3 origin hits per minute total
 * regardless of visitor count). Live status doesn't need
 * sub-second freshness.
 *
 * Returned shape (only the fields we actually use, dropping the rest
 * of the upstream payload to keep responses small):
 *   { isLive: boolean, roomName: string, startedAt: number|null,
 *     liveId: number, fetchedAt: string }
 */

export default async function handler(req, res) {
  const room = (req.query.room || '').trim();
  if (!room) {
    return res.status(400).json({ error: 'room query param required' });
  }

  try {
    const upstream = await fetch(
      `https://www.showroom-live.com/api/room/status?room_url_key=${encodeURIComponent(room)}`,
      {
        headers: {
          // Send a real-looking UA — SHOWROOM sometimes 403s otherwise
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      },
    );

    if (!upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=10');
      return res
        .status(upstream.status)
        .json({ error: `upstream ${upstream.status}`, isLive: false });
    }

    const data = await upstream.json();

    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    return res.status(200).json({
      isLive: data.is_live === true,
      roomName: data.room_name || null,
      startedAt: data.started_at || null,
      liveId: data.live_id || 0,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.setHeader('Cache-Control', 's-maxage=10');
    return res.status(500).json({ error: err.message, isLive: false });
  }
}
