import React, { memo } from 'react';
import { Search, Plus, LayoutGrid, LayoutList } from 'lucide-react';

const TenantFilters = ({ 
  searchQuery, 
  onSearchChange, 
  viewMode, 
  onViewModeChange, 
  onCreateClick 
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search tenants by name, email, or room..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-green-50 dark:bg-green-900/30 text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Grid View"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-green-50 dark:bg-green-900/30 text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="List View"
          >
            <LayoutList className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/10 active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Tenant
        </button>
      </div>
    </div>
  );
};

export default memo(TenantFilters);