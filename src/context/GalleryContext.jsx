/**
 * Gallery Context - Era-Based Version
 *
 * On mount, fetches /data/gallery-enrichments.json and merges per-image
 * metadata (eventName, eventDate, caption, tweetUrl, hashtags,
 * favoriteCount) into the static GALLERY_IMAGES dataset. The merge is
 * keyed by mediaKey — extracted from each image's URL stem
 * (`/archive/x/x-{MEDIAKEY}.jpg`) — so the static gallery file stays
 * untouched and the enrichment can be regenerated independently via
 * `node scripts/build-gallery-enrichments.js`.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';

const ActionTypes = {
  SET_ERA_FILTER: 'SET_ERA_FILTER',
  SET_EVENT_QUERY: 'SET_EVENT_QUERY',
  LOAD_IMAGES: 'LOAD_IMAGES',
  LOAD_GALLERY_DATA: 'LOAD_GALLERY_DATA',
  APPLY_ENRICHMENTS: 'APPLY_ENRICHMENTS',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  SET_SELECTED_IMAGE: 'SET_SELECTED_IMAGE',
  CLEAR_SELECTED_IMAGE: 'CLEAR_SELECTED_IMAGE',
};

const initialState = {
  images: [],
  filteredImages: [],
  categories: [{ id: 'all', label: 'All Memoria', icon: 'ri-gallery-line' }],
  eras: [],
  filters: {
    era: 'all',
    eventQuery: '',
  },
  isLoading: true,
  error: null,
  selectedImage: null,
  enrichmentsLoaded: false,
  featuredImages: [],
};

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

const mergeEnrichments = (images, enrichmentDoc) => {
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

const galleryReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_ERA_FILTER: {
      const newFilters = { ...state.filters, era: action.payload };
      const filtered = applyFilters(state.images, newFilters);
      return { ...state, filters: newFilters, filteredImages: filtered };
    }
    case ActionTypes.SET_EVENT_QUERY: {
      const newFilters = { ...state.filters, eventQuery: action.payload };
      const filtered = applyFilters(state.images, newFilters);
      return { ...state, filters: newFilters, filteredImages: filtered };
    }
    case ActionTypes.CLEAR_FILTERS: {
      const newFilters = { era: 'all', eventQuery: '' };
      return { ...state, filters: newFilters, filteredImages: applyFilters(state.images, newFilters) };
    }
    case ActionTypes.LOAD_IMAGES:
      return { ...state, images: action.payload, filteredImages: action.payload, isLoading: false };
    case ActionTypes.LOAD_GALLERY_DATA: {
      const { images, eras, categories, featuredImages } = action.payload;
      return {
        ...state,
        images,
        filteredImages: applyFilters(images, state.filters),
        eras,
        categories,
        featuredImages,
        isLoading: false,
      };
    }
    case ActionTypes.APPLY_ENRICHMENTS: {
      const enriched = mergeEnrichments(state.images, action.payload);
      return {
        ...state,
        images: enriched,
        filteredImages: applyFilters(enriched, state.filters),
        featuredImages: enriched.filter((img) => img.featured),
        enrichmentsLoaded: true,
      };
    }
    case ActionTypes.SET_SELECTED_IMAGE:
      return { ...state, selectedImage: action.payload };
    case ActionTypes.CLEAR_SELECTED_IMAGE:
      return { ...state, selectedImage: null };
    default:
      return state;
  }
};

const applyFilters = (images, filters) => {
  let result = [...images];
  if (filters.era !== 'all') {
    result = result.filter((img) => img.era === filters.era);
  }
  if (filters.eventQuery && filters.eventQuery.trim()) {
    const q = filters.eventQuery.trim().toLowerCase();
    result = result.filter((img) => {
      const hay = `${img.eventName || img.title || ''} ${img.caption || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }
  // Sort by event date (preferred when available) descending, falling
  // back to upload date so unmatched legacy frames still order sensibly.
  result.sort((a, b) => {
    const da = new Date(a.eventDate || a.date).getTime();
    const db = new Date(b.eventDate || b.date).getTime();
    return db - da;
  });
  return result;
};

const GalleryContext = createContext(null);

export const GalleryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(galleryReducer, initialState);

  const setEraFilter = useCallback((era) => dispatch({ type: ActionTypes.SET_ERA_FILTER, payload: era }), []);
  const setEventQuery = useCallback((q) => dispatch({ type: ActionTypes.SET_EVENT_QUERY, payload: q }), []);
  const clearFilters = useCallback(() => dispatch({ type: ActionTypes.CLEAR_FILTERS }), []);
  const setSelectedImage = useCallback((image) => dispatch({ type: ActionTypes.SET_SELECTED_IMAGE, payload: image }), []);
  const clearSelectedImage = useCallback(() => dispatch({ type: ActionTypes.CLEAR_SELECTED_IMAGE }), []);

  // Lazy-load galleryData — the 168KB image array is dynamically imported
  // so it doesn't block first paint. Entry bundle stays lean; data loads
  // in parallel with React's initial render. Enrichments chain after.
  useEffect(() => {
    let cancelled = false;
    import('../data/galleryData').then((mod) => {
      if (cancelled) return;
      dispatch({
        type: ActionTypes.LOAD_GALLERY_DATA,
        payload: {
          images: mod.GALLERY_IMAGES,
          eras: mod.getAvailableEras(),
          categories: mod.CATEGORIES,
          featuredImages: mod.getFeaturedImages(),
        },
      });
      // Chain enrichments after gallery data is loaded
      fetch('/data/gallery-enrichments.json', { cache: 'force-cache' })
        .then((r) => (r.ok ? r.json() : null))
        .then((doc) => {
          if (cancelled || !doc) return;
          dispatch({ type: ActionTypes.APPLY_ENRICHMENTS, payload: doc });
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const contextValue = useMemo(() => ({
    ...state,
    setEraFilter,
    setEventQuery,
    clearFilters,
    setSelectedImage,
    clearSelectedImage,
    hasFilters: state.filters.era !== 'all' || !!state.filters.eventQuery,
    activeFilterCount:
      (state.filters.era !== 'all' ? 1 : 0) + (state.filters.eventQuery ? 1 : 0),
    totalImages: state.images.length,
    filteredCount: state.filteredImages.length,
  }), [state, setEraFilter, setEventQuery, clearFilters, setSelectedImage, clearSelectedImage]);

  return <GalleryContext.Provider value={contextValue}>{children}</GalleryContext.Provider>;
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) throw new Error('useGallery must be used within a GalleryProvider');
  return context;
};

export default GalleryContext;
