import React, { memo } from 'react';
import { Search, Plus, Filter, RefreshCw } from 'lucide-react';

const PropertyFilters = ({ searchQuery, onSearchChange, filterStatus, onStatusChange, onRefresh, loading, propertyCount }) => {
  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  return (
    <div className="flex flex-col p-4 border-b border-gray-300 dark:border-gray-700 gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          All Properties ({propertyCount || 0})
        </h2>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh"
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md shadow-blue-500/20 flex-shrink-0"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-2 overflow-x-auto no-scrollbar">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`flex-1 md:flex-none px-4 py-2.5 text-xs md:text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                filterStatus === opt.value
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(PropertyFilters);