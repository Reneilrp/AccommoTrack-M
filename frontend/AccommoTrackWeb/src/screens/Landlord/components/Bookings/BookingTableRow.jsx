import React, { memo } from 'react';
import { Eye, UserPlus } from 'lucide-react';

const BookingTableRow = ({ booking, onView, onConvert }) => {
  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold uppercase border";
    
    switch (s) {
      case 'confirmed':
      case 'active':
        return `${baseClasses} bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800`;
      case 'pending':
      case 'pending_reservation':
        return `${baseClasses} bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800`;
      case 'completed':
        return `${baseClasses} bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-700 border-gray-100`;
    }
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {booking.tenant_name || (booking.user ? `${booking.user.first_name} ${booking.user.last_name}` : 'Unknown')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{booking.user?.email || booking.tenant_email}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm text-gray-900 dark:text-white font-medium">{booking.property?.title}</span>
          <span className="text-xs text-gray-500">Room {booking.room?.room_number}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm text-gray-900 dark:text-white">{new Date(booking.start_date).toLocaleDateString()}</span>
          <span className="text-xs text-gray-500">to {new Date(booking.end_date).toLocaleDateString()}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
        ₱{Number(booking.total_price).toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getStatusBadge(booking.status)}>
          {booking.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-2">
          {booking.is_proxy && (
            <button
              onClick={() => onConvert(booking)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Convert to regular tenant"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onView(booking)}
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

export default memo(BookingTableRow);