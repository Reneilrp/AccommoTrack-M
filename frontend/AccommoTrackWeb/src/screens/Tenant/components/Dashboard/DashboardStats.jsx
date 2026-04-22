import React, { memo } from 'react';
import { Home, Calendar, CreditCard, Clock } from 'lucide-react';

const DashboardStats = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    { label: 'Active Stays', value: stats.active_stays || 0, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Bookings', value: stats.pending_bookings || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Upcoming Rent', value: stats.unpaid_invoices_count || 0, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Wallet Balance', value: `₱${(stats.wallet_balance || 0).toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">{card.label}</p>
              <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none">{card.value}</h3>
            </div>
            <div className={`p-3 ${card.bg} dark:bg-opacity-10 rounded-xl`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(DashboardStats);