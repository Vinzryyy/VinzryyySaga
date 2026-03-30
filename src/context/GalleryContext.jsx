/**
 * Gallery Context - Era-Based Version
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import {
  GALLERY_IMAGES,
  CATEGORIES,
  getFeaturedImages,
  getAvailableEras,
} from '../data/galleryData';

const ActionTypes = {
  SET_ERA_FILTER: 'SET_ERA_FILTER',
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  SET_DENSITY: 'SET_DENSITY',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOAD_IMAGES: 'LOAD_IMAGES',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  SET_SELECTED_IMAGE: 'SET_SELECTED_IMAGE',
  CLEAR_SELECTED_IMAGE: 'CLEAR_SELECTED_IMAGE',
};

const initialState = {
  images: GALLERY_IMAGES,
  filteredImages: GALLERY_IMAGES,
  categories: CATEGORIES,
  eras: getAvailableEras(),
  filters: {
    era: 'all',
  },
  ui: {
    viewMode: 'grid',
    density: 'comfortable',
  },
  isLoading: false,
  error: null,
  selectedImage: null,
};

const galleryReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_ERA_FILTER: {
      const newFilters = { ...state.filters, era: action.payload };
      const filtered = applyFilters(state.images, newFilters);
      return { ...state, filters: newFilters, filteredImages: filtered };
    }
    case ActionTypes.SET_VIEW_MODE:
      return { ...state, ui: { ...state.ui, viewMode: action.payload } };
    case ActionTypes.SET_DENSITY:
      return { ...state, ui: { ...state.ui, density: action.payload } };
    case ActionTypes.CLEAR_FILTERS: {
      return { ...state, filters: { era: 'all' }, filteredImages: state.images };
    }
    case ActionTypes.LOAD_IMAGES:
      return { ...state, images: action.payload, filteredImages: action.payload, isLoading: false };
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
  // Sort by date descending (newest first)
  result.sort((a, b) => new Date(b.date) - new Date(a.date));
  return result;
};

const GalleryContext = createContext(null);

export const GalleryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(galleryReducer, initialState);

  // Sync with Hash
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validEras = state.eras.map(e => e.id);
      if (validEras.includes(hash)) {
        dispatch({ type: ActionTypes.SET_ERA_FILTER, payload: hash });
      } else {
        dispatch({ type: ActionTypes.SET_ERA_FILTER, payload: 'all' });
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [state.eras]);

  const setEraFilter = useCallback((era) => dispatch({ type: ActionTypes.SET_ERA_FILTER, payload: era }), []);
  const setViewMode = useCallback((viewMode) => dispatch({ type: ActionTypes.SET_VIEW_MODE, payload: viewMode }), []);
  const setDensity = useCallback((density) => dispatch({ type: ActionTypes.SET_DENSITY, payload: density }), []);
  const clearFilters = useCallback(() => dispatch({ type: ActionTypes.CLEAR_FILTERS }), []);
  const setSelectedImage = useCallback((image) => dispatch({ type: ActionTypes.SET_SELECTED_IMAGE, payload: image }), []);
  const clearSelectedImage = useCallback(() => dispatch({ type: ActionTypes.CLEAR_SELECTED_IMAGE }), []);

  const contextValue = useMemo(() => ({
    ...state,
    setEraFilter,
    setViewMode,
    setDensity,
    clearFilters,
    setSelectedImage,
    clearSelectedImage,
    hasFilters: state.filters.era !== 'all',
    activeFilterCount: state.filters.era !== 'all' ? 1 : 0,
    totalImages: state.images.length,
    filteredCount: state.filteredImages.length,
    featuredImages: getFeaturedImages(),
  }), [state, setEraFilter, setViewMode, setDensity, clearFilters, setSelectedImage, clearSelectedImage]);

  return <GalleryContext.Provider value={contextValue}>{children}</GalleryContext.Provider>;
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) throw new Error('useGallery must be used within a GalleryProvider');
  return context;
};

export default GalleryContext;
