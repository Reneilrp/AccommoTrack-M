import React, { memo } from 'react';
import { Eye, FileText } from 'lucide-react';
import formatPrice from '../../../../utils/price';

const PaymentTableRow = ({ payment, onView, onPrint, getStatusColor }) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            #{payment.invoice_number || payment.id}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
            {new Date(payment.created_at).toLocaleDateString()}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {payment.user?.first_name} {payment.user?.last_name}
          </span>
          <span className="text-xs text-gray-500">{payment.property?.title} · Room {payment.room?.room_number}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
        {formatPrice(payment.total_amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(payment.status)}`}>
          {payment.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">
        {payment.method || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-2">
          {['paid', 'succeeded'].includes(payment.status.toLowerCase()) && (
            <button
              onClick={() => onPrint(payment)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Print Receipt"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onView(payment)}
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

export default memo(PaymentTableRow);