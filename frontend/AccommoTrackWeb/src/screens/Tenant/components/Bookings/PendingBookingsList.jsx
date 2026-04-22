import React, { memo } from 'react';
import { Clock, XCircle, CreditCard, ChevronRight } from 'lucide-react';

const PendingBookingsList = ({ bookings, onCancel, onPay, loading }) => {
  if (!loading && bookings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-700">
         <p className="text-gray-500 font-bold uppercase tracking-widest">No pending bookings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <div key={b.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl">
                <Clock className="w-6 h-6" />
             </div>
             <div>
                <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{b.property?.title || 'Property'}</h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Room {b.room?.room_number} · {b.status}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             {b.status === 'payment_pending' && (
                <button 
                  onClick={() => onPay(b.id)}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-500/20"
                >
                   <CreditCard className="w-4 h-4" /> Pay Now
                </button>
             )}
             <button 
               onClick={() => onCancel(b.id)}
               className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all"
             >
                <XCircle className="w-4 h-4 mr-2 inline" /> Cancel
             </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(PendingBookingsList);