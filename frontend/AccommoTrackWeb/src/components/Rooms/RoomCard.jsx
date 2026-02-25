import React from 'react';
import { getImageUrl } from '../../utils/api';
import { Users, Edit } from 'lucide-react';

export default function RoomCard({ room, className = '', onEdit, onClick, onStatusChange }) {
  const url = (room.images && room.images.length > 0)
    ? getImageUrl(typeof room.images[0] === 'string' ? room.images[0] : (room.images[0].image_url || room.images[0].url))
    : null;
  const getStatusClasses = (status, occupied, capacity) => {
    if (status === 'maintenance') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (occupied >= capacity) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (occupied > 0) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  };

  const statusLabel = (status, occupied, capacity) => {
    if (status === 'maintenance') return 'Maintenance';
    if (occupied >= capacity) return 'Full';
    if (occupied > 0) return 'Partial';
    return 'Available';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col ${className}`} onClick={onClick}>
      <div className="relative h-48">
        {url ? (
          <img src={url} className="w-full h-full object-cover" alt={`room-${room.id}`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        <span className={`absolute top-3 right-3 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider shadow-sm ${getStatusClasses(room.status, room.occupied || 0, room.capacity || 1)}`}>
          {statusLabel(room.status, room.occupied || 0, room.capacity || 1)}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{room.title || `Room ${room.room_number}`}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{room.type_label || room.room_type} {room.floor_label ? `• ${room.floor_label}` : ''}</p>
            <div className="mt-2">
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {room.pricing_model === 'per_bed' ? 'Per Bed' : (room.capacity > 1 ? 'Full Room (split)' : 'Full Room')}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              ₱{room.monthly_rate?.toLocaleString?.()}
            </p>
            <span className="text-[10px] block text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">per month</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mb-3">
          <Users className="w-4 h-4" />
          <span className="font-medium">
            {room.occupied || 0}/{room.capacity || 1} {((room.occupied || 0) === 1 ? 'Tenant' : 'Tenants')}
            {room.available_slots > 0 && (
              <span className="text-green-600 dark:text-green-400 ml-1">({room.available_slots} available)</span>
            )}
          </span>
        </div>

        {room.tenant ? (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Current Occupant(s)</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{room.tenant}</p>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3 border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">No tenant assigned</p>
          </div>
        )}

        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {room.amenities.slice(0, 6).map((a, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase border border-green-100 dark:border-green-800/50">{typeof a === 'string' ? a : (a.name || a.title || '')}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
          <select
            value={room.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              if (typeof onStatusChange === 'function') {
                onStatusChange(room.id, e.target.value);
              }
            }}
            className={`flex-1 px-3 py-2 text-sm font-bold rounded-lg border transition-colors outline-none focus:ring-2 focus:ring-green-500/20 ${room.status === 'occupied'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
              : room.status === 'available'
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'
                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50'
            }`}
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>

          {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(room); }} 
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50" 
              title="Edit Room" 
              aria-label="Edit room"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
