import React, { memo } from 'react';
import { Building2, Home, Loader2 } from 'lucide-react';

const PropertyRoomStep = ({ 
  properties, 
  rooms, 
  selectedPropertyId, 
  selectedRoomId, 
  onPropertyChange, 
  onRoomChange, 
  loadingRooms 
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-green-600" />
          Select Property & Room
        </h3>
        <p className="text-sm text-gray-500">Choose where the new tenant will be staying.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Property *</label>
          <select
            value={selectedPropertyId}
            onChange={(e) => onPropertyChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
          >
            <option value="">Choose a property...</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Available Room *</label>
          {loadingRooms ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
          ) : (
            <select
              value={selectedRoomId}
              onChange={(e) => onRoomChange(e.target.value)}
              disabled={!selectedPropertyId}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white disabled:opacity-50"
            >
              <option value="">{selectedPropertyId ? 'Choose a room...' : 'Select a property first'}</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} — {r.room_type} (₱{Number(r.price).toLocaleString()}/mo)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(PropertyRoomStep);