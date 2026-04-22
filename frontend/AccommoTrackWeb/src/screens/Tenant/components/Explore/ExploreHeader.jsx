import React, { memo } from 'react';
import { Search, Map, SlidersHorizontal, ArrowLeft } from 'lucide-react';

const ExploreHeader = ({ 
  searchQuery, 
  onSearchChange, 
  viewMode, 
  onViewModeChange, 
  onToggleFilters,
  activeFilterCount = 0,
  activeFilters = {} // pass active filters to display summary
}) => {
  return (
    <header className="sticky top-0 z-40 pb-4 bg-transparent dark:bg-gray-900 font-sans">
      {/* ROW 1: Navigation & Title (Could be hidden if authenticated, but kept for parity) */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 h-14 md:h-16 flex items-center justify-center shadow-sm relative">
        <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Browse Properties
        </h1>
      </div>

      {/* ROW 2: Search Bar & Filters Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col items-center gap-4 md:gap-6">
          {/* Search Row */}
          <div className="w-full flex items-center gap-3 md:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search properties, locations..."
                className="w-full pl-10 md:pl-11 pr-4 py-2 md:py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 rounded-xl transition-all outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 font-semibold shadow-sm"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <button
              onClick={onToggleFilters}
              className="relative p-2.5 md:p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 transition-all text-gray-600 dark:text-gray-300 shadow-sm group"
              aria-label="Toggle Filters"
            >
              <SlidersHorizontal className="w-5 h-5 group-hover:text-green-600 transition-colors" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onViewModeChange(viewMode === 'list' ? 'map' : 'list')}
              className={`p-2.5 md:p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 transition-all text-gray-600 dark:text-gray-300 shadow-sm group ${viewMode === 'map' ? '!bg-green-50 !border-green-300 text-green-600' : ''}`}
              aria-label="Toggle View"
            >
              <Map className={`w-5 h-5 transition-colors ${viewMode === 'map' ? 'text-green-600' : 'group-hover:text-green-600'}`} />
            </button>
          </div>

          {/* Active Filters Summary (Simplified for modular version) */}
          <div className="w-full flex flex-wrap items-center gap-2 min-h-[1.75rem]">
             {activeFilters.type && activeFilters.type !== 'All' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700">
                  Type: {activeFilters.type}
                </span>
             )}
             {activeFilters.amenities?.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
                  {activeFilters.amenities.length} Amenities
                </span>
             )}
             {activeFilters.max_price < 10000 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                  Max: ₱{activeFilters.max_price}
                </span>
             )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default memo(ExploreHeader);