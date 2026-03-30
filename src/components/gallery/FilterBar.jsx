/**
 * FilterBar Component - Era-Based Editorial Version
 */

import React, { memo } from 'react';
import { useGallery } from '../../context';

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

  return (
    <div className="sticky top-20 z-[90] py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 bg-white/40 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] p-4 shadow-retro">
          
          {/* Era Selection - Editorial Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-2 scrollbar-hide no-scrollbar">
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
