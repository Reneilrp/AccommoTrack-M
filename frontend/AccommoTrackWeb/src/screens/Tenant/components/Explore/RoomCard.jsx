import React, { memo } from 'react';
import { User, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';
import ImagePlaceholder from '../../../../components/Shared/ImagePlaceholder';

const RoomCard = ({ room, property, onOpenDetails }) => {
  const isAvailable = (room.status === 'available' || room.available_slots > 0) && room.is_available !== false;
  
  const statusBadgeText = room.reserved_by_me
    ? 'Reserved by you'
    : isAvailable ? 'Available' : 'Reserved';

  const statusBadgeClass = room.reserved_by_me || !isAvailable
    ? 'bg-amber-50 text-amber-800 border-amber-100'
    : 'bg-green-50 text-green-700 border-green-100';

  return (
    <div className="flex-none w-[210px] sm:w-[200px] md:w-[190px] bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-green-300 transition-all duration-300 snap-start overflow-hidden flex flex-col">
      <div className="relative h-32 overflow-hidden bg-gray-200 cursor-pointer" onClick={() => onOpenDetails(room, property)}>
        {getImageUrl(room.image) ? (
          <img src={getImageUrl(room.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={room.room_number} />
        ) : (
          <ImagePlaceholder className="w-full h-full" />
        )}
        <div className="absolute top-2 left-2">
           <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${statusBadgeClass}`}>
             {statusBadgeText}
           </span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1">
           <h4 className="text-sm font-bold dark:text-white">Room {room.room_number}</h4>
           <span className="text-[10px] font-bold text-gray-400">{room.available_slots}/{room.capacity} Slots</span>
        </div>
        <p className="text-[10px] text-gray-500 font-medium uppercase mb-2">{room.room_type}</p>
        <div className="mt-auto flex items-center justify-between">
           <span className="text-sm font-black text-green-600">₱{Number(room.price).toLocaleString()}</span>
           <button onClick={() => onOpenDetails(room, property)} className="text-[10px] font-bold text-gray-900 dark:text-white hover:text-green-600">Details</button>
        </div>
      </div>
    </div>
  );
};

export default memo(RoomCard);