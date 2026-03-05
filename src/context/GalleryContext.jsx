/**
 * Gallery Context
 * Centralized state management for gallery data, filters, and actions
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import {
  GALLERY_IMAGES,
  CATEGORIES,
  YEARS,
  getImageById,
  getFeaturedImages,
} from '../data/galleryData';

// Action types
const ActionTypes = {
  SET_CATEGORY_FILTER: 'SET_CATEGORY_FILTER',
  SET_YEAR_FILTER: 'SET_YEAR_FILTER',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_SELECTED_IMAGE: 'SET_SELECTED_IMAGE',
  CLEAR_SELECTED_IMAGE: 'CLEAR_SELECTED_IMAGE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOAD_IMAGES: 'LOAD_IMAGES',
};

// Initial state
const initialState = {
  images: GALLERY_IMAGES,
  filteredImages: GALLERY_IMAGES,
  categories: CATEGORIES,
  years: YEARS,
  filters: {
    category: 'all',
    year: 'all',
    searchQuery: '',
  },
  selectedImage: null,
  isLoading: false,
  error: null,
};

// Reducer
const galleryReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_CATEGORY_FILTER: {
      const newFilters = { ...state.filters, category: action.payload };
      const filtered = applyFilters(state.images, newFilters);
      return {
        ...state,
        filters: newFilters,
        filteredImages: filtered,
      };
    }

    case ActionTypes.SET_YEAR_FILTER: {
      const newFilters = { ...state.filters, year: action.payload };
      const filtered = applyFilters(state.images, newFilters);
      return {
        ...state,
        filters: newFilters,
        filteredImages: filtered,
      };
    }

    case ActionTypes.SET_SEARCH_QUERY: {
      const newFilters = { ...state.filters, searchQuery: action.payload };
      const filtered = applyFilters(state.images, newFilters);
      return {
        ...state,
        filters: newFilters,
        filteredImages: filtered,
      };
    }

    case ActionTypes.SET_SELECTED_IMAGE:
      return {
        ...state,
        selectedImage: action.payload,
      };

    case ActionTypes.CLEAR_SELECTED_IMAGE:
      return {
        ...state,
        selectedImage: null,
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case ActionTypes.LOAD_IMAGES:
      return {
        ...state,
        images: action.payload,
        filteredImages: applyFilters(action.payload, state.filters),
        isLoading: false,
        error: null,
      };

    default:
      return state;
  }
};

// Helper function to apply all filters
const applyFilters = (images, filters) => {
  let result = [...images];

  // Filter by category
  if (filters.category !== 'all') {
    result = result.filter((img) => img.category === filters.category);
  }

  // Filter by year
  if (filters.year !== 'all') {
    result = result.filter((img) => img.year === filters.year);
  }

  // Filter by search query
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim();
    result = result.filter(
      (img) =>
        img.title.toLowerCase().includes(query) ||
        img.description.toLowerCase().includes(query) ||
        img.location.toLowerCase().includes(query)
    );
  }

  return result;
};

// Create context
const GalleryContext = createContext(null);

// Provider component
export const GalleryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(galleryReducer, initialState);

  // Actions
  const setCategoryFilter = useCallback((category) => {
    dispatch({ type: ActionTypes.SET_CATEGORY_FILTER, payload: category });
  }, []);

  const setYearFilter = useCallback((year) => {
    dispatch({ type: ActionTypes.SET_YEAR_FILTER, payload: year });
  }, []);

  const setSearchQuery = useCallback((query) => {
    dispatch({ type: ActionTypes.SET_SEARCH_QUERY, payload: query });
  }, []);

  const selectImage = useCallback((image) => {
    dispatch({ type: ActionTypes.SET_SELECTED_IMAGE, payload: image });
  }, []);

  const clearSelectedImage = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_SELECTED_IMAGE });
  }, []);

  const selectImageById = useCallback(
    (id) => {
      const image = getImageById(id);
      if (image) {
        dispatch({ type: ActionTypes.SET_SELECTED_IMAGE, payload: image });
      }
    },
    []
  );

  const clearFilters = useCallback(() => {
    dispatch({ type: ActionTypes.SET_CATEGORY_FILTER, payload: 'all' });
    dispatch({ type: ActionTypes.SET_YEAR_FILTER, payload: 'all' });
    dispatch({ type: ActionTypes.SET_SEARCH_QUERY, payload: '' });
  }, []);

  // Load images from API (for future integration)
  const loadImages = useCallback(async (fetchFn) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    try {
      const images = await fetchFn();
      dispatch({ type: ActionTypes.LOAD_IMAGES, payload: images });
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: error.message || 'Failed to load images',
      });
    }
  }, []);

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      // State
      images: state.images,
      filteredImages: state.filteredImages,
      categories: state.categories,
      years: state.years,
      filters: state.filters,
      selectedImage: state.selectedImage,
      isLoading: state.isLoading,
      error: state.error,

      // Actions
      setCategoryFilter,
      setYearFilter,
      setSearchQuery,
      selectImage,
      clearSelectedImage,
      selectImageById,
      clearFilters,
      loadImages,

      // Derived state
      hasFilters:
        state.filters.category !== 'all' ||
        state.filters.year !== 'all' ||
        state.filters.searchQuery.trim() !== '',
      totalImages: state.images.length,
      filteredCount: state.filteredImages.length,
      featuredImages: getFeaturedImages(),
    }),
    [
      state,
      setCategoryFilter,
      setYearFilter,
      setSearchQuery,
      selectImage,
      clearSelectedImage,
      selectImageById,
      clearFilters,
      loadImages,
    ]
  );

  return (
    <GalleryContext.Provider value={contextValue}>
      {children}
    </GalleryContext.Provider>
  );
};

// Custom hook to use gallery context
export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
};

export default GalleryContext;
