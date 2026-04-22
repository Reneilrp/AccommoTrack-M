import React, { memo } from 'react';
import { User, CheckCircle2, AlertCircle } from 'lucide-react';

const RoomItem = ({ room, onSelect, isSelected }) => {
  const isAvailable = room.status === 'available' || room.available_slots > 0;

  return (
    <div 
      onClick={() => isAvailable && onSelect(room)}
      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-green-600 bg-green-50 dark:bg-green-900/20 shadow-md' 
          : isAvailable 
            ? 'border-gray-100 dark:border-gray-700 hover:border-green-200 bg-white dark:bg-gray-800 shadow-sm' 
            : 'border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white">Room {room.room_number}</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{room.room_type}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-green-600">₱{Number(room.price).toLocaleString()}</p>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">/ month</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
           <User className="w-3.5 h-3.5" />
           <span>{room.available_slots} Slots Left</span>
        </div>
        {isAvailable ? (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-green-600">
             <CheckCircle2 className="w-3 h-3" />
             Available
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500">
             <AlertCircle className="w-3 h-3" />
             Full
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(RoomItem);