import React, { memo } from 'react';
import { Home, PhilippinePeso, Calendar, ChevronRight } from 'lucide-react';

const StayHistoryList = ({ history, onLoadMore, loading }) => {
  const items = history?.items || [];
  const pagination = history?.pagination;

  if (!loading && items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-700">
         <p className="text-gray-500 font-bold uppercase tracking-widest">No stay history found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-green-200 transition-all">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl text-gray-400 group-hover:text-green-600 transition-colors">
                <Home className="w-6 h-6" />
             </div>
             <div>
                <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.property?.title}</h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Room {item.room?.room_number} · {item.status}</p>
             </div>
          </div>
          <div className="flex items-center gap-8 px-4">
             <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Period</p>
                <p className="text-sm font-bold dark:text-white">{new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</p>
             </div>
             <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Paid</p>
                <p className="text-sm font-black text-green-600">₱{Number(item.total_price).toLocaleString()}</p>
             </div>
          </div>
        </div>
      ))}
      
      {pagination?.currentPage < pagination?.lastPage && (
        <button 
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 font-black uppercase tracking-widest rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-white transition-all disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load More Stays'}
        </button>
      )}
    </div>
  );
};

export default memo(StayHistoryList);