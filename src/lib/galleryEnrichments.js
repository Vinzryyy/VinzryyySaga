/**
 * Gallery enrichments: per-photo metadata from @armeniaca15's posts
 * (eventName, eventDate, caption, tweetUrl, hashtags, favoriteCount),
 * fetched from /data/gallery-enrichments.json and merged into the static
 * GALLERY_IMAGES by mediaKey or file name.
 *
 * Pure and Node-safe so the gallery context and the build step that writes
 * link previews (scripts/prerender-meta.js) build the same Album Momen.
 */

// Pulls "MEDIAKEY" out of `/archive/x/x-MEDIAKEY.jpg` (and similar).
// Returns null on legacy `/archive/img-NNN.jpg` URLs that don't have
// a mediaKey at all — those entries fall back to manual overrides
// keyed by the file basename.
const extractMediaKey = (url) => {
  if (!url) return null;
  const m = url.match(/\/x-([A-Za-z0-9_-]+)\./) || url.match(/\/media\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};

const extractFileBasename = (url) => {
  if (!url) return null;
  const m = url.match(/\/([^/]+\.(?:jpg|jpeg|png|webp|avif))(?:$|\?)/i);
  return m ? m[1] : null;
};

export const mergeEnrichments = (images, enrichmentDoc) => {
  if (!enrichmentDoc) return images;
  const byMediaKey = enrichmentDoc.byMediaKey || {};
  const manualByFile = enrichmentDoc.manualByFile || {};
  const excludeSet = new Set(enrichmentDoc.excludeMediaKeys || []);

  // Drop excluded mediaKeys before mapping — promo materials, off-topic
  // content, etc. List lives in data/gallery-excludes.json and
  // is bundled into the enrichment JSON by build-gallery-enrichments.js.
  const filtered = excludeSet.size === 0
    ? images
    : images.filter((img) => {
        const mk = extractMediaKey(img.url || img.thumbnail);
        return !mk || !excludeSet.has(mk);
      });

  return filtered.map((img) => {
    const mk = extractMediaKey(img.url || img.thumbnail);
    const meta = (mk && byMediaKey[mk]) || null;
    const manual = (() => {
      const base = extractFileBasename(img.url);
      return base ? manualByFile[base] : null;
    })();
    if (!meta && !manual) return img;
    const enriched = { ...img };
    if (meta) {
      enriched.eventName = meta.eventName || img.title;
      enriched.eventDate = meta.eventDate || img.date;
      enriched.uploadDate = meta.uploadDate || img.date;
      enriched.caption = meta.caption || null;
      enriched.hashtags = meta.hashtags || [];
      enriched.tweetUrl = meta.tweetUrl || null;
      enriched.tweetId = meta.tweetId || null;
      enriched.favoriteCount = meta.favoriteCount ?? null;
      enriched.metaSource = meta.source || 'x';
      // Replace the placeholder title + description for downstream
      // consumers that only know `title` / `description`.
      if (meta.eventName) {
        enriched.title = meta.eventName;
        enriched.description = meta.eventName;
      }
    }
    if (manual) {
      enriched.eventName = manual.eventName || enriched.eventName || img.title;
      enriched.eventDate = manual.eventDate || enriched.eventDate || img.date;
      enriched.metaSource = 'manual';
      if (manual.eventName) {
        enriched.title = manual.eventName;
        enriched.description = manual.eventName;
      }
    }
    return enriched;
  });
};
