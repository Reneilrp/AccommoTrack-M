import React, { memo } from 'react';
import { Eye, UserCheck, Wrench } from 'lucide-react';

const MaintenanceTableRow = ({ request, onView, onAssign, getStatusBadge }) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white">#{request.id}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(request.created_at).toLocaleDateString()}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col min-w-[200px]">
          <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{request.issue_type || 'General Issue'}</span>
          <span className="text-xs text-gray-500 line-clamp-1">{request.description}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{request.property?.title}</span>
          <span className="text-xs text-gray-500">Room {request.room?.room_number}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
            {request.tenant?.first_name?.[0]}{request.tenant?.last_name?.[0]}
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{request.tenant?.first_name} {request.tenant?.last_name}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(request.status)}`}>
          {request.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-2">
          {request.status === 'pending' && (
            <button
              onClick={() => onAssign(request)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Assign Worker"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onView(request)}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default memo(MaintenanceTableRow);