import React, { memo } from 'react';
import { Building2, Home, Users, CheckCircle } from 'lucide-react';

const PropertyStats = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    { label: 'Total Properties', value: stats.total || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Rooms', value: stats.rooms || 0, icon: Home, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Tenants', value: stats.tenants || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg Occupancy', value: `${stats.occupancy || 0}%`, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{card.value}</p>
            </div>
            <div className={`w-10 h-10 ${card.bg} dark:bg-opacity-20 rounded-lg flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(PropertyStats);