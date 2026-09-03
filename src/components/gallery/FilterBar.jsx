/**
 * FilterBar — sticky era pills + event search for /gallery.
 *
 * IG-style: a horizontally-scrolling pill row of era filters with a
 * compact search input on the right. No view-mode / density toggles
 * (the IG grid is the only mode now). Sits sticky just under the
 * navbar so filtering is always one tap away while scrolling the grid.
 */

import React, { memo, useEffect, useState } from 'react';
import { useGallery } from '../../context';

const FilterBar = memo(function FilterBar() {
  const {
    eras,
    filters,
    setEraFilter,
    setEventQuery,
    clearFilters,
    hasFilters,
    activeFilterCount,
    filteredCount,
    totalImages,
  } = useGallery();

  // Local input mirror so typing stays snappy; pushes to context on
  // change. Context is the source of truth for the actual filter.
  const [eventInput, setEventInput] = useState(filters.eventQuery || '');
  useEffect(() => {
    setEventInput(filters.eventQuery || '');
  }, [filters.eventQuery]);
  const handleEventChange = (e) => {
    const v = e.target.value;
    setEventInput(v);
    setEventQuery(v);
  };

  return (
    <div className="sticky top-[68px] sm:top-[72px] z-30 bg-[color:var(--retro-bg-primary)]/90 backdrop-blur-md border-y border-[color:var(--retro-brown-dark)]/10 px-4 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto py-3 flex flex-col md:flex-row md:items-center gap-3">
        {/* Search — full width on mobile, fixed width on desktop. */}
        <label className="relative flex-shrink-0 md:w-72">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--retro-text-muted)]" />
          <input
            type="search"
            value={eventInput}
            onChange={handleEventChange}
            placeholder="Cari event… (mis. Indosiar, Festival)"
            aria-label="Cari berdasarkan nama event atau caption"
            className="
              w-full pl-9 pr-9 py-2 rounded-full
              bg-white border border-[color:var(--retro-brown-dark)]/15
              focus:border-[color:var(--retro-burgundy)]/50
              focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/15 focus:outline-none
              text-sm text-[color:var(--retro-text-primary)] placeholder-[color:var(--retro-text-muted)]
              transition-colors
            "
          />
          {eventInput && (
            <button
              type="button"
              onClick={() => { setEventInput(''); setEventQuery(''); }}
              aria-label="Bersihkan pencarian event"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[color:var(--retro-brown-dark)]/8 hover:bg-[color:var(--retro-burgundy)]/15 hover:text-[color:var(--retro-burgundy)] flex items-center justify-center text-[color:var(--retro-text-muted)] text-sm transition-colors"
            >
              <i className="ri-close-line" />
            </button>
          )}
        </label>

        {/* Era pills — horizontally scrollable, mirrors IG/X tab bar. */}
        <div
          className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          role="tablist"
          aria-label="Filter era"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filters.era === 'all'}
            onClick={() => setEraFilter('all')}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all border ${
              filters.era === 'all'
                ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)] shadow-md'
                : 'bg-white text-[color:var(--retro-text-secondary)] border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)]'
            }`}
          >
            <i className="ri-history-line text-xs" />
            All
          </button>
          {eras.map((era) => (
            <button
              key={era.id}
              type="button"
              role="tab"
              aria-selected={String(filters.era) === String(era.id)}
              onClick={() => setEraFilter(era.id)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all border ${
                String(filters.era) === String(era.id)
                  ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)] shadow-md'
                  : 'bg-white text-[color:var(--retro-text-secondary)] border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)]'
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>

        {/* Count + reset — flush right on desktop, separate row on mobile. */}
        <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0">
          <span className="text-[10px] font-black tracking-[0.2em] text-[color:var(--retro-text-muted)] tabular-nums whitespace-nowrap">
            <span className="text-[color:var(--retro-burgundy)]">{filteredCount.toLocaleString('id-ID')}</span>
            <span className="opacity-50"> / {totalImages.toLocaleString('id-ID')}</span>
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-[0.18em] transition-colors"
              title={`Reset ${activeFilterCount} filter aktif`}
              aria-label="Reset semua filter"
            >
              <i className="ri-restart-line text-sm" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default FilterBar;
