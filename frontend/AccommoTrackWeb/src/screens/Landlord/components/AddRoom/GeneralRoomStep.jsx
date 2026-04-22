import React, { memo } from 'react';

const GeneralRoomStep = ({ data, onChange, errors }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Room Details</h3>
        <p className="text-sm text-gray-500">Provide identification and basic description for the room.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Room Number/Name *</label>
          <input
            type="text"
            value={data.room_number}
            onChange={(e) => onChange('room_number', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.room_number ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all`}
            placeholder="e.g. 101, Room A, Loft 2"
          />
          {errors.room_number && <p className="text-xs text-red-500 mt-1">{errors.room_number}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Floor Level</label>
          <input
            type="text"
            value={data.floor_level}
            onChange={(e) => onChange('floor_level', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all"
            placeholder="e.g. 2nd Floor, Ground"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Room Type *</label>
          <select
            value={data.room_type}
            onChange={(e) => onChange('room_type', e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${errors.room_type ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all`}
          >
            <option value="">Select a type...</option>
            <option value="single">Single Room</option>
            <option value="double">Double Room</option>
            <option value="shared">Shared Dorm</option>
            <option value="studio">Studio</option>
            <option value="suite">Suite</option>
          </select>
          {errors.room_type && <p className="text-xs text-red-500 mt-1">{errors.room_type}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Billing Policy *</label>
          <select
            value={data.billing_policy}
            onChange={(e) => onChange('billing_policy', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
          >
            <option value="monthly">Monthly Recurring</option>
            <option value="daily">Daily/Transient</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white resize-none"
          placeholder="What makes this room special?"
        />
      </div>
    </div>
  );
};

export default memo(GeneralRoomStep);