import { useState, useEffect, useCallback } from "react";
import { GALLERY_DATA, GALLERY_CATEGORIES } from "../utils/constants";
import { sanitizeInput } from "../utils/security";

/**
 * useGallery Hook
 * Manages gallery state, filtering, and data loading
 * @param {Object} options - Hook configuration options
 * @returns {Object} Gallery state and actions
 */
export const useGallery = (options = {}) => {
  const {
    initialCategory = GALLERY_CATEGORIES.ALL,
    itemsPerPage = 12,
    enableSearch = true,
  } = options;

  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load gallery data
  useEffect(() => {
    const loadGallery = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call delay (remove in production)
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // In production, fetch from API: await fetch('/api/gallery')
        setPhotos(GALLERY_DATA);
        setFilteredPhotos(GALLERY_DATA);
      } catch (err) {
        setError("Failed to load gallery. Please try again.");
        console.error("Gallery load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGallery();
  }, []);

  // Filter photos by category and search
  useEffect(() => {
    let result = [...photos];

    // Filter by category
    if (selectedCategory !== GALLERY_CATEGORIES.ALL) {
      result = result.filter((photo) => photo.category === selectedCategory);
    }

    // Filter by search query
    if (enableSearch && searchQuery.trim()) {
      const sanitizedQuery = sanitizeInput(searchQuery.toLowerCase());
      result = result.filter(
        (photo) =>
          photo.title.toLowerCase().includes(sanitizedQuery) ||
          photo.location.toLowerCase().includes(sanitizedQuery) ||
          photo.description.toLowerCase().includes(sanitizedQuery)
      );
    }

    setFilteredPhotos(result);
    setCurrentPage(1); // Reset to first page on filter change
  }, [photos, selectedCategory, searchQuery, enableSearch]);

  // Get paginated photos
  const paginatedPhotos = filteredPhotos.slice(
    0,
    currentPage * itemsPerPage
  );

  // Actions
  const filterByCategory = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const search = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const loadMore = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedCategory(GALLERY_CATEGORIES.ALL);
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  const hasMore = paginatedPhotos.length < filteredPhotos.length;

  return {
    // State
    photos: paginatedPhotos,
    allPhotos: filteredPhotos,
    selectedCategory,
    searchQuery,
    isLoading,
    error,
    currentPage,
    totalPages: Math.ceil(filteredPhotos.length / itemsPerPage),
    totalPhotos: filteredPhotos.length,
    hasMore,

    // Actions
    filterByCategory,
    search,
    loadMore,
    resetFilters,
  };
};

export default useGallery;
