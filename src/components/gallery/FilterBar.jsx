/**
 * FilterBar Component
 * Category and year filters for gallery
 * 
 * Features:
 * - Category filter with icons
 * - Year filter dropdown
 * - Search functionality
 * - Active state indicators
 * - Clear all filters
 */

import React, { memo } from 'react';
import { useGallery } from '../../context';
import { useSecurity } from '../../hooks/useSecurity';

const FilterBar = memo(function FilterBar() {
  const {
    categories,
    years,
    filters,
    setCategoryFilter,
    setYearFilter,
    setSearchQuery,
    clearFilters,
    hasFilters,
    filteredCount,
    totalImages,
  } = useGallery();

  const { createDebouncedHandler } = useSecurity();

  // Debounced search handler
  const handleSearchChange = createDebouncedHandler((value) => {
    setSearchQuery(value);
  }, 300);

  return (
    <div className="sticky top-20 z-40 bg-[color:var(--retro-bg-primary)]/95 backdrop-blur-md border-b border-[color:var(--retro-border)] py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setCategoryFilter(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full
                  text-sm font-medium whitespace-nowrap
                  transition-all duration-200
                  ${
                    filters.category === category.id
                      ? 'bg-[color:var(--retro-gold)] text-[color:var(--retro-bg-dark)] shadow-lg shadow-[color:var(--retro-gold)]/30'
                      : 'bg-[color:var(--retro-bg-secondary)]/50 text-[color:var(--retro-text-secondary)] hover:bg-[color:var(--retro-bg-tertiary)] hover:text-[color:var(--retro-text-primary)]'
                  }
                `}
                aria-pressed={filters.category === category.id}
              >
                <i className={category.icon} />
                <span className="hidden sm:inline">{category.label}</span>
              </button>
            ))}
          </div>

          {/* Right Side - Year, Search, Count */}
          <div className="flex items-center gap-4">
            {/* Year Filter */}
            <div className="relative">
              <select
                value={filters.year}
                onChange={(e) => setYearFilter(e.target.value)}
                className="
                  appearance-none bg-white/50 text-[color:var(--color-text-primary)]
                  pl-4 pr-10 py-2 rounded-lg
                  text-sm font-medium
                  border border-[color:var(--color-bg-tertiary)]
                  focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]
                  cursor-pointer
                "
                aria-label="Filter by year"
              >
                <option value="all">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-light)] pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative hidden md:block">
              <input
                type="search"
                placeholder="Search photos..."
                defaultValue={filters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="
                  w-48 lg:w-64 bg-white/50 text-[color:var(--color-text-primary)]
                  pl-10 pr-4 py-2 rounded-lg
                  text-sm
                  border border-[color:var(--color-bg-tertiary)]
                  focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]
                  placeholder-[color:var(--color-text-light)]
                "
                aria-label="Search photos"
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-light)]" />
            </div>

            {/* Results Count */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-[color:var(--color-text-secondary)]">
              <span className="text-[color:var(--color-text-primary)] font-medium">{filteredCount}</span>
              <span>/</span>
              <span>{totalImages}</span>
              <span>photos</span>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="
                  flex items-center gap-1 px-3 py-2
                  text-sm text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]
                  bg-white/50 hover:bg-[color:var(--color-bg-tertiary)]
                  rounded-lg
                  transition-colors
                "
                aria-label="Clear all filters"
              >
                <i className="ri-close-circle-line" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search - Visible only on small screens */}
        <div className="mt-4 md:hidden">
          <div className="relative">
            <input
              type="search"
              placeholder="Search photos..."
              defaultValue={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="
                w-full bg-white/50 text-[color:var(--color-text-primary)]
                pl-10 pr-4 py-2 rounded-lg
                text-sm
                border border-[color:var(--color-bg-tertiary)]
                focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]
                placeholder-[color:var(--color-text-light)]
              "
              aria-label="Search photos"
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-light)]" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default FilterBar;
