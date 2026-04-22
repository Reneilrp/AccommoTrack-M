import React, { memo } from 'react';
import { Calendar, Home, Wrench, AlertCircle } from 'lucide-react';

const CaretakerActivities = ({ activities, formatDate, getActivityColor, getStatusColor }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5" />;
      case 'room': return <Home className="w-5 h-5" />;
      case 'maintenance': return <Wrench className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-400/50 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activities</h2>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-center py-8 text-gray-500 italic">No recent activities</p>
        ) : (
          activities.slice(0, 6).map((activity, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.action}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-2">{formatDate(activity.timestamp)}</p>
              </div>
              <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full shrink-0 ${getStatusColor(activity)}`}>
                {activity.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(CaretakerActivities);