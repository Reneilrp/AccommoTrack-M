import React, { memo } from 'react';
import { Eye, CreditCard, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import PriceRow from '../../../../components/Shared/PriceRow';

const TenantPaymentTable = ({ invoices, onPay, onView, loading }) => {
  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    const base = "px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest";
    
    if (['paid', 'succeeded', 'confirmed'].includes(s)) 
      return `${base} bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800`;
    if (s === 'overdue')
      return `${base} bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`;
    if (s === 'pending_verification' || s === 'pending_offline')
      return `${base} bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800`;
    
    return `${base} bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800`;
  };

  if (!loading && invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
        <CheckCircle2 className="w-16 h-16 text-green-500/20 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">All caught up!</h3>
        <p className="text-sm text-gray-500 mt-1">You don't have any pending or overdue payments.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Date</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                <td className="px-8 py-5 whitespace-nowrap">
                   <span className="text-sm font-black text-gray-900 dark:text-white">#{inv.invoice_number || inv.id}</span>
                </td>
                <td className="px-8 py-5">
                   <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{inv.description || 'Monthly Rent'}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{inv.property?.title} · Room {inv.room?.room_number}</span>
                   </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                   <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{new Date(inv.due_date).toLocaleDateString()}</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                   <PriceRow amount={inv.total_amount} className="text-sm font-black text-gray-900 dark:text-white" />
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                   <span className={getStatusBadge(inv.status)}>
                     {inv.status.replace('_', ' ')}
                   </span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-right">
                   {['unpaid', 'pending', 'overdue'].includes(String(inv.status).toLowerCase()) ? (
                     <button
                       onClick={() => onPay(inv.id)}
                       className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/10 transition-all active:scale-95"
                     >
                       Pay Now
                     </button>
                   ) : (
                     <button
                       onClick={() => onView(inv)}
                       className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                     >
                       <Eye className="w-5 h-5" />
                     </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(TenantPaymentTable);