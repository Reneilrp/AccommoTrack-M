import React, { memo } from 'react';
import { Package, Clock, CheckCircle, TrendingUp } from 'lucide-react';

const AddonStats = ({ stats }) => {
  const cards = [
    { label: 'Active Add-ons', value: stats.total || 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Requests', value: stats.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Monthly Revenue', value: `₱${(stats.revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Approved', value: stats.approved || 0, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</h3>
            </div>
            <div className={`w-12 h-12 ${card.bg} dark:bg-opacity-10 rounded-xl flex items-center justify-center`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(AddonStats);