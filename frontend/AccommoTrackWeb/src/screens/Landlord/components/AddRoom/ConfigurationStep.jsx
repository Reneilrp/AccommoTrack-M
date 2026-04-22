import React, { memo } from 'react';

const ConfigurationStep = ({ data, onChange, errors }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Room Configuration</h3>
        <p className="text-sm text-gray-500">Define the capacity and layout of the room.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Total Beds/Capacity *</label>
          <input
            type="number"
            min="1"
            value={data.total_beds}
            onChange={(e) => onChange('total_beds', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.total_beds ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all`}
            placeholder="e.g. 1, 2, 4"
          />
          {errors.total_beds && <p className="text-xs text-red-500 mt-1">{errors.total_beds}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Number of Bathrooms</label>
          <input
            type="number"
            min="0"
            value={data.number_of_bathrooms}
            onChange={(e) => onChange('number_of_bathrooms', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all"
            placeholder="e.g. 1"
          />
        </div>

        <div className="flex items-center gap-4">
           <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={data.is_aircon}
                onChange={(e) => onChange('is_aircon', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Air Conditioned</span>
           </label>
        </div>

        <div className="flex items-center gap-4">
           <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={data.has_private_bathroom}
                onChange={(e) => onChange('has_private_bathroom', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Private Bathroom</span>
           </label>
        </div>
      </div>
    </div>
  );
};

export default memo(ConfigurationStep);