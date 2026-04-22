import React, { memo } from 'react';
import { Home } from 'lucide-react';

const PropertySelector = ({ properties, selectedId, onChange }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your residents, assign rooms, and handle transfers.</p>
      </div>
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
          <Home className="w-5 h-5" />
        </div>
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none pr-8 cursor-pointer"
        >
          <option value="">Select a property...</option>
          {properties.map((prop) => (
            <option key={prop.id} value={prop.id}>{prop.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default memo(PropertySelector);