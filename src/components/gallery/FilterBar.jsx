/**
 * FilterBar Component - Era-Based Editorial Version
 *
 * Collapsible: a "minimize" toggle in the corner shrinks the whole bar
 * to a single compact pill (era name + view mode + density + count) so
 * the gallery grid gets back ~140px of vertical real-estate while
 * scrolling. State persists in localStorage so user's choice survives
 * across page navigations and reloads. Defaults to expanded on first
 * visit so the controls stay discoverable.
 */

import React, { memo, useEffect, useState } from 'react';
import { useGallery } from '../../context';

const STORAGE_KEY = 'gallery.filterBar.expanded';

const readStoredExpanded = () => {
  if (typeof window === 'undefined') return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
};

const FilterBar = memo(function FilterBar() {
  const {
    eras,
    filters,
    ui,
    setEraFilter,
    setViewMode,
    setDensity,
    clearFilters,
    hasFilters,
    activeFilterCount,
    filteredCount,
    totalImages,
  } = useGallery();

  const [isExpanded, setIsExpanded] = useState(readStoredExpanded);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isExpanded));
    } catch {
      /* storage may be unavailable (private mode etc.) — non-fatal */
    }
  }, [isExpanded]);

  const viewModes = [
    { id: 'grid', label: 'Grid', icon: 'ri-layout-grid-line' },
    { id: 'timeline', label: 'Timeline', icon: 'ri-menu-line' },
    { id: 'moodboard', label: 'Moodboard', icon: 'ri-dashboard-line' },
  ];

  const densityModes = [
    { id: 'compact', label: 'Compact' },
    { id: 'comfortable', label: 'Comfortable' },
    { id: 'editorial', label: 'Editorial' },
  ];

  // Active era label for the compact view
  const activeEraLabel =
    filters.era === 'all'
      ? 'Full Archive'
      : eras.find((e) => String(e.id) === String(filters.era))?.label || filters.era;
  const activeViewMode = viewModes.find((m) => m.id === ui.viewMode);
  const activeDensity = densityModes.find((m) => m.id === ui.density);

  // — Compact (minimized) — single pill summarising current state ----------
  if (!isExpanded) {
    return (
      <div className="sticky top-20 z-[90] py-3 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-2xl border border-white/40 rounded-full px-4 py-2 shadow-retro">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[color:var(--retro-burgundy)]/90 transition-colors"
              aria-label="Expand filter bar"
              aria-expanded="false"
            >
              <i className="ri-equalizer-2-line text-sm" />
              <span className="hidden sm:inline">Filter</span>
              <i className="ri-arrow-down-s-line text-base -mr-1" />
            </button>

            <div className="h-5 w-px bg-[color:var(--retro-burgundy)]/15" />

            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)] truncate">
              {activeEraLabel}
            </span>

            <div className="hidden md:flex items-center gap-1.5 ml-1 text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-secondary)]">
              {activeViewMode && (
                <span className="inline-flex items-center gap-1">
                  <i className={`${activeViewMode.icon} text-xs`} />
                  {activeViewMode.label}
                </span>
              )}
              {activeDensity && (
                <>
                  <span className="opacity-30">·</span>
                  <span>{activeDensity.label}</span>
                </>
              )}
            </div>

            <span className="ml-auto text-[10px] font-black tracking-[0.2em] text-[color:var(--retro-burgundy)] tabular-nums">
              {filteredCount}/{totalImages}
            </span>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-white/70 hover:bg-red-50 text-red-500 rounded-full border border-red-100 transition-all"
                title={`Reset ${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`}
                aria-label="Reset filters"
              >
                <i className="ri-restart-line text-sm" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // — Full (expanded) — original two-row layout + minimize button -----------
  return (
    <div className="sticky top-20 z-[90] py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="relative flex flex-col gap-4 bg-white/40 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] p-4 shadow-retro">
          {/* Minimize button — top-right corner, doesn't overlap content */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-[color:var(--retro-burgundy)] border border-white/60 transition-all hover:scale-105 z-10"
            aria-label="Minimize filter bar"
            aria-expanded="true"
            title="Minimize filter bar"
          >
            <i className="ri-subtract-line text-base" />
          </button>
          
          {/* Era Selection - Editorial Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-2 pr-10 scrollbar-hide no-scrollbar">
            <button
              onClick={() => setEraFilter('all')}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-full
                text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap
                transition-all duration-500
                ${
                  filters.era === 'all'
                    ? 'bg-[color:var(--retro-burgundy)] text-white shadow-lg shadow-[color:var(--retro-burgundy)]/20'
                    : 'text-[color:var(--retro-text-secondary)] hover:bg-white/50'
                }
              `}
            >
              <i className="ri-history-line text-xs" />
              <span>Full Archive</span>
            </button>

            <div className="h-6 w-[1px] bg-[color:var(--retro-burgundy)]/20 mx-2 hidden lg:block" />

            {eras.map((era) => (
              <button
                key={era.id}
                onClick={() => setEraFilter(era.id)}
                className={`
                  flex items-center gap-2 px-8 py-3 rounded-full
                  text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap
                  transition-all duration-500
                  ${
                    filters.era === era.id
                      ? 'bg-[color:var(--retro-burgundy)] text-white shadow-lg shadow-[color:var(--retro-burgundy)]/20'
                      : 'text-[color:var(--retro-text-secondary)] hover:bg-white/50'
                  }
                `}
              >
                <span>{era.label}</span>
              </button>
            ))}
          </div>

          {/* Smart Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/40 bg-[color:var(--retro-brown-dark)]/5 p-1 overflow-x-auto">
              {viewModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all ${
                    ui.viewMode === mode.id
                      ? 'bg-[color:var(--retro-burgundy)] text-white'
                      : 'text-[color:var(--retro-text-secondary)] hover:bg-white/60'
                  }`}
                >
                  <i className={`${mode.icon} mr-1`} />
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/40 bg-[color:var(--retro-brown-dark)]/5 p-1 overflow-x-auto">
              {densityModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setDensity(mode.id)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap transition-all ${
                    ui.density === mode.id
                      ? 'bg-white text-[color:var(--retro-burgundy)]'
                      : 'text-[color:var(--retro-text-secondary)] hover:bg-white/60'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-full border border-white/40 bg-[color:var(--retro-brown-dark)]/5 px-5 py-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-[color:var(--retro-burgundy)]">
                {filteredCount} / {totalImages} MOMENTS
              </span>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <span className="text-[9px] font-black tracking-[0.15em] uppercase text-[color:var(--retro-burgundy)]/70">
                    {activeFilterCount} Active
                  </span>
                )}
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-9 h-9 flex items-center justify-center bg-white/70 hover:bg-red-50 text-red-500 rounded-full border border-red-100 transition-all hover:scale-105"
                    title="Reset Eras"
                  >
                    <i className="ri-restart-line text-base" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FilterBar;
