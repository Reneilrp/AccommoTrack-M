import React, { memo } from 'react';

const PropertyPerformance = ({ performance }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Property Status Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {performance.map((p) => (
          <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 transition-all hover:border-green-500/30">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2">{p.title}</h3>
              <span className="text-xs font-bold text-green-600 shrink-0">{p.occupancyRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-4">
              <div 
                className="bg-green-600 h-1.5 rounded-full transition-all duration-1000" 
                style={{ width: `${p.occupancyRate}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Rooms: {p.occupiedRooms}/{p.totalRooms}</span>
              <span className="capitalize px-2 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-600">{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(PropertyPerformance);