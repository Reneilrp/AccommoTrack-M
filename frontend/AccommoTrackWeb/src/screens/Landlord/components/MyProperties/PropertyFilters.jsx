import React, { memo } from 'react';
import { Search, Plus, Filter } from 'lucide-react';

const PropertyFilters = ({ searchQuery, onSearchChange, filterStatus, onStatusChange, onAddClick }) => {
  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'draft', label: 'Drafts' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search properties by name, city, or address..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-400 shrink-0">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Status</span>
        </div>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filterStatus === opt.value
                ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        onClick={onAddClick}
        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/10 active:scale-95 whitespace-nowrap"
      >
        <Plus className="w-5 h-5" />
        Add Property
      </button>
    </div>
  );
};

export default memo(PropertyFilters);