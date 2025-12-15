import React from 'react';
import { getImageUrl } from '../../utils/api';
import { Users, Edit } from 'lucide-react';

export default function RoomCard({ room, className = '', onEdit, onClick, onStatusChange }) {
  const url = (room.images && room.images.length > 0)
    ? getImageUrl(typeof room.images[0] === 'string' ? room.images[0] : (room.images[0].image_url || room.images[0].url))
    : null;
  const getStatusClasses = (status, occupied, capacity) => {
    if (status === 'maintenance') return 'bg-yellow-100 text-yellow-700';
    if (occupied >= capacity) return 'bg-red-100 text-red-700';
    if (occupied > 0) return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
  };

  const statusLabel = (status, occupied, capacity) => {
    if (status === 'maintenance') return 'Maintenance';
    if (occupied >= capacity) return 'Full';
    if (occupied > 0) return 'Partial';
    return 'Available';
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col ${className}`} onClick={onClick}>
      <div className="relative h-48">
        {url ? (
          <img src={url} className="w-full h-full object-cover" alt={`room-${room.id}`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Users className="w-16 h-16 text-gray-400" />
          </div>
        )}

        <span className={`absolute top-3 right-3 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider ${getStatusClasses(room.status, room.occupied || 0, room.capacity || 1)}`}>
          {statusLabel(room.status, room.occupied || 0, room.capacity || 1)}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{room.title || `Room ${room.room_number}`}</h3>
            <p className="text-sm text-gray-500">{room.type_label || room.room_type} {room.floor_label ? `• ${room.floor_label}` : ''}</p>
            <div className="mt-2">
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                {room.pricing_model === 'per_bed' ? 'Per Bed' : (room.capacity > 1 ? 'Full Room (split)' : 'Full Room')}
              </span>
            </div>
          </div>

          <p className="text-xl font-bold text-green-600">
            ₱{room.monthly_rate?.toLocaleString?.()}
            <span className="text-xs block text-gray-500">per month</span>
          </p>
        </div>

        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
          <Users className="w-4 h-4" />
          <span>
            {room.occupied || 0}/{room.capacity || 1} {((room.occupied || 0) === 1 ? 'Tenant' : 'Tenants')}
            {room.available_slots > 0 && (
              <span className="text-green-600 ml-1">({room.available_slots} slot{room.available_slots === 1 ? '' : 's'} available)</span>
            )}
          </span>
        </div>

        {room.tenant ? (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <p className="text-xs text-gray-500">Current Tenant(s):</p>
            <p className="font-semibold text-gray-800">{room.tenant}</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-dashed border-gray-300 text-center">
            <p className="text-xs text-gray-500">No tenant assigned</p>
          </div>
        )}

        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {room.amenities.slice(0, 6).map((a, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">{typeof a === 'string' ? a : (a.name || a.title || '')}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
          <select
            value={room.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              if (typeof onStatusChange === 'function') {
                onStatusChange(room.id, e.target.value);
              }
            }}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${room.status === 'occupied'
              ? 'bg-red-50 text-red-700 border-red-200'
              : room.status === 'available'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>

          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(room); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Room" aria-label="Edit room">
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
