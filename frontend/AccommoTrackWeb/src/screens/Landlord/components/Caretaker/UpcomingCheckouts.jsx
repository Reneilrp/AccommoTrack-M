import React, { memo } from 'react';

const UpcomingCheckouts = ({ checkouts, getUrgencyColor }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upcoming Checkouts</h2>
      <div className="space-y-4">
        {checkouts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">None scheduled</p>
        ) : (
          checkouts.slice(0, 4).map((c) => (
            <div key={c.id} className={`p-4 rounded-lg border ${getUrgencyColor(c.urgency)} transition-all`}>
              <div className="flex justify-between font-semibold text-sm text-gray-900 dark:text-white">
                <span>{c.tenantName}</span>
                <span className="font-bold">{c.daysLeft}d left</span>
              </div>
              <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                {c.propertyTitle} — Room {c.roomNumber}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(UpcomingCheckouts);