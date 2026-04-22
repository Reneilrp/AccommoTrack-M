import React, { memo } from 'react';
import { PhilippinePeso, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react';

const FinancialSummary = ({ stay }) => {
  if (!stay) return null;
  const { booking, room: _room } = stay;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Financial Overview</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600">
                 <PhilippinePeso className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Paid</span>
           </div>
           <span className="text-sm font-black text-gray-900 dark:text-white">₱{Number(booking.total_price).toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
                 <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Security Deposit</span>
           </div>
           <span className="text-sm font-black text-gray-900 dark:text-white">₱{Number(booking.security_deposit || 0).toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600">
                 <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Unpaid Dues</span>
           </div>
           <span className="text-sm font-black text-red-500">₱0.00</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
         <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
               Settlement of your security deposit will be processed within 15-30 days after your move-out date.
            </p>
         </div>
      </div>
    </div>
  );
};

export default memo(FinancialSummary);