import React, { memo } from 'react';
import { Search, Map, List, SlidersHorizontal } from 'lucide-react';

const ExploreHeader = ({ 
  searchQuery, 
  onSearchChange, 
  viewMode, 
  onViewModeChange, 
  onToggleFilters 
}) => {
  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center">
        {/* Search Bar */}
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
          <input
            type="text"
            placeholder="Where would you like to stay? (e.g. Pagadian City, near STI)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white shadow-sm"
          />
        </div>

        {/* View Toggle & Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onToggleFilters}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
          </button>

          <button
            onClick={() => onViewModeChange(viewMode === 'list' ? 'map' : 'list')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
          >
            {viewMode === 'list' ? (
              <>
                <Map className="w-5 h-5" />
                <span>Show Map</span>
              </>
            ) : (
              <>
                <List className="w-5 h-5" />
                <span>Show List</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ExploreHeader);