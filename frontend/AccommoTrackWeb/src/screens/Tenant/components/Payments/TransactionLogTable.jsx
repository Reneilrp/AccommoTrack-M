import React, { memo } from 'react';
import { FileText, Download, CheckCircle2 } from 'lucide-react';
import PriceRow from '../../../../components/Shared/PriceRow';

const TransactionLogTable = ({ logs, onDownload, loading }) => {
  if (!loading && logs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500 italic">No transaction history found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</th>
              <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                <td className="px-8 py-5 whitespace-nowrap">
                   <span className="text-sm font-black text-gray-900 dark:text-white">#{log.reference || log.id}</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                   <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{log.type || 'Payment'}</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                   <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                   <PriceRow amount={log.amount} className="text-sm font-black text-gray-900 dark:text-white" />
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                   <span className="text-xs font-medium text-gray-500 uppercase">{log.method || 'Online'}</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-right">
                   <button
                     onClick={() => onDownload(log.id)}
                     className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-green-600 rounded-xl transition-all border border-transparent hover:border-green-100"
                   >
                     <FileText className="w-5 h-5" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(TransactionLogTable);