import React, { memo } from 'react';
import { PlusCircle, Wrench } from 'lucide-react';

const OperationalAlerts = ({ stats }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Operational Alerts</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-600 rounded-lg text-white">
              <PlusCircle className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-purple-900 dark:text-purple-300">Addon Requests</span>
          </div>
          <span className="text-lg font-bold text-purple-600">{stats?.requests?.addons || 0}</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-orange-600 rounded-lg text-white">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-orange-900 dark:text-orange-300">Maintenance</span>
          </div>
          <span className="text-lg font-bold text-orange-600">{stats?.requests?.maintenance || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(OperationalAlerts);