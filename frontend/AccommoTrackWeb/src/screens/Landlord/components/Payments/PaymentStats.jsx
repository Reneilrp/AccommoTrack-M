import React, { memo } from 'react';
import { PhilippinePeso, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import formatPrice from '../../../../utils/price';

const PaymentStats = ({ stats }) => {
  const statCards = [
    { label: 'Total Revenue', value: stats.totalRevenue, icon: PhilippinePeso, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Pending', value: stats.pendingAmount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Collected', value: stats.collectedAmount, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Overdue', value: stats.overdueAmount, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatPrice(stat.value)}
              </h3>
            </div>
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(PaymentStats);