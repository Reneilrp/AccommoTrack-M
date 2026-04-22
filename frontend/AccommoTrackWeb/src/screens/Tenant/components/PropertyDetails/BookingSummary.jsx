import React, { memo } from 'react';
import { Calendar, DollarSign, Loader2 } from 'lucide-react';

const BookingSummary = ({ room, startDate, onDateChange, onBook, loading }) => {
  if (!room) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-6">Your Booking</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Move-in Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            <input 
              type="date" 
              value={startDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white font-bold"
            />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 space-y-3">
           <div className="flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400">
              <span>Monthly Rent</span>
              <span className="text-gray-900 dark:text-white">₱{Number(room.price).toLocaleString()}</span>
           </div>
           <div className="flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400">
              <span>Advance Rent (1mo)</span>
              <span className="text-gray-900 dark:text-white">₱{Number(room.price).toLocaleString()}</span>
           </div>
           {room.security_deposit > 0 && (
             <div className="flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400">
                <span>Security Deposit</span>
                <span className="text-gray-900 dark:text-white">₱{Number(room.security_deposit).toLocaleString()}</span>
             </div>
           )}
           <div className="pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
              <span className="text-lg font-black text-gray-900 dark:text-white uppercase">Total Due</span>
              <span className="text-xl font-black text-green-600">
                ₱{(Number(room.price) * 2 + Number(room.security_deposit || 0)).toLocaleString()}
              </span>
           </div>
        </div>

        <button 
          onClick={onBook}
          disabled={loading || !startDate}
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
          Confirm & Pay
        </button>

        <p className="text-[9px] text-gray-400 text-center uppercase font-bold leading-relaxed px-4">
          By clicking, you agree to the dorm's house rules and terms of lease.
        </p>
      </div>
    </div>
  );
};

export default memo(BookingSummary);