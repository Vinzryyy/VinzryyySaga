/**
 * 🧜‍♀️ ARMENIACA TIME TRAVELER (v4 — observer mode)
 * --------------------------------------------------
 * Why v4: X virtualizes /media — old posts get unloaded from the DOM as
 * you scroll past them, so a one-shot scan at the bottom only captures
 * what's currently on screen. v4 attaches a MutationObserver and
 * captures images **as they enter the DOM**, so scrolling slowly from
 * top to bottom now picks up every post once.
 *
 * INSTRUCTIONS
 * 1. Open https://x.com/armeniaca15/media
 * 2. F12 → Console → paste this whole block, hit Enter.
 * 3. A floating panel appears bottom-right with a live capture count.
 * 4. Scroll slowly from top to bottom — go end-to-end. The count keeps
 *    going up as new posts render in.
 * 5. When count stabilizes, click "Download JSON" on the panel.
 * 6. File saves as `armeniaca-authentic-archive.json`. Replace the
 *    existing one in the repo root, then run `npm run import-x-archive`.
 *
 * Tip: if you suspect you missed a section, scroll back up through it —
 * the observer captures URLs once (deduped by media key), so re-passes
 * are free.
 */

(function timeTravelExtractV4() {
  if (window.__armeniacaObserver) {
    console.log('Already running. Use the floating panel to download / stop.');
    return;
  }

  // Twitter Snowflake epoch (Oct 12, 2010) — used to decode tweet ID
  // back to its real created_at timestamp without having to scrape the
  // tweet's own metadata.
  const TWITTER_EPOCH = 1288834974657n;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Map keyed by media key (the unique part of the pbs.twimg.com URL).
  // De-duplicates if the same photo renders twice during scroll.
  const captured = new Map();

  const extractMediaKey = (src) => {
    const m = src.match(/\/media\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  };

  const processImage = (img) => {
    if (!img?.src || !img.src.includes('pbs.twimg.com/media/')) return;
    // Skip tiny avatars / preview thumbs that occasionally match the URL.
    if ((img.naturalWidth || img.width) < 120) return;

    const mediaKey = extractMediaKey(img.src);
    if (!mediaKey || captured.has(mediaKey)) return;

    // Tweet ID lives on the closest <a href="/.../status/{id}/photo/{n}"> —
    // we need it both as the entry id and as the source of the date.
    const tweetLink = img.closest('a[href*="/status/"]')?.href || '';
    const tweetIdMatch = tweetLink.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) return; // can't date it without an ID, skip.

    const tweetId = tweetIdMatch[1];
    const timestamp = Number((BigInt(tweetId) >> 22n) + TWITTER_EPOCH);
    const dateObj = new Date(timestamp);
    const fullDate = dateObj.toISOString().split('T')[0];
    const year = String(dateObj.getFullYear());
    const month = monthNames[dateObj.getMonth()];

    // Caption — usually empty for media-only posts. Fallback to the
    // generic moment label so the importer always has *something*.
    const container =
      img.closest('article') ||
      img.closest('[data-testid="cellInnerDiv"]') ||
      img.parentElement?.parentElement?.parentElement;
    const tweetText =
      container?.querySelector('[data-testid="tweetText"]')?.innerText?.trim() ||
      'Eli JKT48 Moment';
    let title = tweetText.split('\n')[0] || 'Eli JKT48';
    if (title.length > 60) title = `${title.slice(0, 57)}...`;

    const baseUrl = img.src.split('?')[0];

    captured.set(mediaKey, {
      id: `eli-tt-${mediaKey}`,
      url: `${baseUrl}?format=jpg&name=large`,
      thumbnail: `${baseUrl}?format=jpg&name=small`,
      title,
      description: tweetText,
      category: 'all',
      year,
      month,
      date: fullDate,
      location: 'JKT48 Theater',
      dimensions: { width: 4000, height: 6000 },
      featured: false, // re-marked at download time so newest stay featured
      tweetId,
    });

    updatePanel();
  };

  const scanAll = () => {
    document.querySelectorAll('img[src*="pbs.twimg.com/media/"]').forEach(processImage);
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'IMG') processImage(node);
        node.querySelectorAll?.('img[src*="pbs.twimg.com/media/"]').forEach(processImage);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.__armeniacaObserver = observer;

  // ─── Floating UI panel ──────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'armeniaca-extractor-panel';
  panel.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
    background: linear-gradient(135deg, #7A2E2E, #9B7BB4); color: white;
    padding: 14px 16px; border-radius: 12px;
    font-family: -apple-system, system-ui, sans-serif; font-size: 13px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35); width: 240px;
    backdrop-filter: blur(8px);
  `;
  panel.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 8px; display:flex; align-items:center; gap:6px;">
      <span>🧜‍♀️</span><span>Armeniaca Extractor v4</span>
    </div>
    <div id="ae-count" style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">0</div>
    <div id="ae-range" style="font-size: 10px; opacity: 0.8; margin-bottom: 10px;">no captures yet</div>
    <button id="ae-download" style="
      width: 100%; background: white; color: #7A2E2E; border: none;
      padding: 8px 12px; border-radius: 6px; font-weight: 700; cursor: pointer;
      font-size: 12px;
    ">Download JSON</button>
    <button id="ae-stop" style="
      width: 100%; background: transparent; color: white;
      border: 1px solid rgba(255,255,255,0.4); padding: 6px 8px;
      border-radius: 6px; cursor: pointer; margin-top: 6px; font-size: 11px;
    ">Stop & Remove Panel</button>
  `;
  document.body.appendChild(panel);

  const updatePanel = () => {
    const countEl = document.getElementById('ae-count');
    const rangeEl = document.getElementById('ae-range');
    if (!countEl || !rangeEl) return;
    countEl.textContent = `${captured.size} captured`;
    if (captured.size === 0) {
      rangeEl.textContent = 'no captures yet';
      return;
    }
    const dates = [...captured.values()].map((e) => e.date);
    dates.sort();
    rangeEl.textContent = `${dates[0]} → ${dates[dates.length - 1]}`;
  };

  document.getElementById('ae-download').onclick = () => {
    const list = [...captured.values()].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    list.forEach((entry, idx) => {
      entry.featured = idx < 6; // first 6 newest are featured
    });
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'armeniaca-authentic-archive.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log(`✅ Downloaded ${list.length} entries.`);
  };

  document.getElementById('ae-stop').onclick = () => {
    observer.disconnect();
    panel.remove();
    delete window.__armeniacaObserver;
    console.log('Extractor stopped & cleaned up.');
  };

  // First sweep — picks up whatever's already in DOM at injection time.
  scanAll();

  console.log(
    '%c 🧜‍♀️ ARMENIACA EXTRACTOR v4 — observer mode active.',
    'background:#7A2E2E;color:white;font-size:13px;padding:4px 8px;border-radius:4px;'
  );
  console.log('Scroll slowly from top of /media to bottom. Watch the floating panel.');
})();
