import React, { memo } from 'react';
import { PhilippinePeso, MessageSquare, Wrench, Calendar, ChevronRight } from 'lucide-react';

const DashboardActivities = ({ activities = [], onSeeAll }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'payment': return <PhilippinePeso className="w-4 h-4 text-green-600" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-orange-600" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Recent Activities</h3>
        <button onClick={onSeeAll} className="text-xs font-bold text-green-600 hover:underline">See all</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {activities.length === 0 ? (
          <div className="py-12 text-center text-gray-400 italic text-sm">No recent activities</div>
        ) : (
          <div className="space-y-1">
            {activities.map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                  {getIcon(a.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{a.action}</p>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(DashboardActivities);