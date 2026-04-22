import React, { memo } from 'react';
import { Wrench, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const MaintenanceStats = ({ summary }) => {
  if (!summary) return null;

  const cards = [
    { label: 'Total Requests', value: summary.total || 0, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending', value: summary.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'In Progress', value: summary.in_progress || 0, icon: AlertCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Resolved', value: summary.resolved || 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
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

export default memo(MaintenanceStats);