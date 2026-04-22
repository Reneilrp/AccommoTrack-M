import React, { memo } from 'react';
import { Users } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';

const RoomItem = ({ room, onSelect, isSelected: _isSelected }) => {
  const isAvailable = room.status === 'available' || room.available_slots > 0;
  const isFull = !isAvailable || Number(room.available_slots || 0) === 0;

  const getGenderBadge = (restriction) => {
    const normalized = String(restriction || "mixed").toLowerCase().trim();
    if (normalized === "male" || normalized === "boy" || normalized === "boys") {
      return { label: "Boys Only", className: "bg-blue-50 text-blue-700 border border-blue-100" };
    }
    if (normalized === "female" || normalized === "girl" || normalized === "girls") {
      return { label: "Girls Only", className: "bg-rose-50 text-rose-700 border border-rose-100" };
    }
    return { label: "Mixed", className: "bg-gray-100 text-gray-700 border border-gray-200" };
  };

  const genderBadge = getGenderBadge(room.sex_restriction);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-lg transition-all flex flex-col ${isFull ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
        {getImageUrl(room.images?.[0] || room.image) ? (
          <img
            src={getImageUrl(room.images?.[0] || room.image)}
            alt={`Room ${room.room_number}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm self-start ${isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {isAvailable ? 'Available' : 'Occupied'}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex">
          {room.sex_restriction && room.sex_restriction !== 'mixed' && (
            <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${genderBadge.className}`}>
              {genderBadge.label}
            </span>
          )}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 mr-2">
            Room {room.room_number}
          </h4>
          <div className="text-right flex items-baseline justify-end gap-1 shrink-0">
             <span className="text-xl font-bold text-green-600 leading-none">
               ₱{Number(room.price || room.monthly_rate || 0).toLocaleString()}
             </span>
             <span className="text-sm text-gray-500 dark:text-gray-400 font-bold leading-none">
               / mo
             </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex px-2 py-1.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30 capitalize">
            {(room.type_label || room.room_type || "Standard Room").replace(/_/g, " ")}
          </span>
          {room.floor && (
            <span className="inline-flex px-2 py-1.5 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm">
              Flr {room.floor}
            </span>
          )}
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
          {room.description || "No description available."}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{room.occupied || 0} / {room.capacity} Slots Full</span>
          </div>
        </div>

        <div className="mt-auto">
           <button
             disabled={!isAvailable}
             onClick={() => isAvailable && onSelect(room)}
             className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
               isAvailable
                 ? "bg-green-600 text-white hover:bg-green-700 shadow-sm cursor-pointer"
                 : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-inner"
             }`}
           >
             {isAvailable ? "Book This Room" : "Not Available"}
           </button>
        </div>
      </div>
    </div>
  );
};

export default memo(RoomItem);