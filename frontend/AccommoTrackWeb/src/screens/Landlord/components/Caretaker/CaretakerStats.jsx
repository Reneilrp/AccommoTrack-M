import React, { memo } from 'react';
import { Building2, Home, Calendar } from 'lucide-react';

const CaretakerStats = ({ stats }) => {
  if (!stats) return null;

  const statCards = [
    { 
      label: 'Assigned Properties', 
      value: stats.properties.total, 
      subValue: `${stats.properties.active}/${stats.properties.total} Active`,
      icon: Building2, 
      color: 'text-green-600', 
      bg: 'bg-green-100' 
    },
    { 
      label: 'Total Rooms', 
      value: stats.rooms.total, 
      subValue: `${stats.rooms.occupancyRate}% Occupied`,
      icon: Home, 
      color: 'text-green-600', 
      bg: 'bg-green-100' 
    },
    { 
      label: 'Active Bookings', 
      value: (stats.bookings.pending || 0) + (stats.bookings.confirmed || 0), 
      subValue: stats.bookings.pending > 0 ? `${stats.bookings.pending} Pending` : 'All confirmed',
      icon: Calendar, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100' 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <span className={`text-xs font-medium ${stat.color}`}>{stat.subValue}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          <p className="text-sm text-gray-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default memo(CaretakerStats);