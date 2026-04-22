import React, { memo } from 'react';
import { ArrowLeft, List, PackagePlus, Building2, Users, Wrench, Star } from 'lucide-react';

const PropertyHeader = ({ 
  title, 
  onBack, 
  onShowLogs, 
  notificationCounts, 
  isCaretaker, 
  ctPerms, 
  onNavigate, 
  id 
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center relative min-h-[40px]">
          <div className="absolute left-0 flex items-center">
            <button
              onClick={onBack}
              className="p-2 bg-white dark:bg-gray-800 text-green-600 rounded-full shadow-sm border dark:border-gray-700 hover:scale-110 transition-all flex-shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center px-12">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[500px]">
              {title || 'Untitled Property'}
            </h1>
          </div>

          <div className="absolute right-0 flex items-center gap-2">
            <button
              onClick={onShowLogs}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Activity logs"
            >
              <List className="w-5 h-5" />
            </button>
            {(!isCaretaker || ctPerms.canManageAddons) && (
              <button
                onClick={() => onNavigate(`/addons?property_id=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                title="Add-ons service"
              >
                <PackagePlus className="w-5 h-5" />
                {notificationCounts.addons > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
                    {notificationCounts.addons > 99 ? '99+' : notificationCounts.addons}
                  </span>
                )}
              </button>
            )}
            {(!isCaretaker || ctPerms.canManageRooms) && (
              <button
                onClick={() => onNavigate(`/rooms?property=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Room management"
              >
                <Building2 className="w-5 h-5" />
              </button>
            )}
            {(!isCaretaker || ctPerms.canManageTenants) && (
              <button
                onClick={() => onNavigate(`/tenants?property=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Tenant management"
              >
                <Users className="w-5 h-5" />
              </button>
            )}
            {(!isCaretaker || ctPerms.canManageMaintenance) && (
              <button
                onClick={() => onNavigate(`/maintenance?property_id=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                title="Maintenance Requests"
              >
                <Wrench className="w-5 h-5" />
                {notificationCounts.maintenance > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
                    {notificationCounts.maintenance > 99 ? '99+' : notificationCounts.maintenance}
                  </span>
                )}
              </button>
            )}
            {!isCaretaker && (
              <button
                onClick={() => onNavigate(`/reviews?property_id=${id}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Reviews"
              >
                <Star className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default memo(PropertyHeader);