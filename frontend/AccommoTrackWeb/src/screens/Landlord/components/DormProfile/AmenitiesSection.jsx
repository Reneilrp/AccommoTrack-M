import React, { memo } from 'react';
import { Sparkles, Plus, Trash } from 'lucide-react';

const AMENITY_OPTIONS = [
  'WiFi', 'Air Conditioning', 'Kitchen', 'Laundry', 
  'Parking', 'Gym', 'Swimming Pool', 'Security 24/7',
  'CCTV', 'Study Area', 'Lounge', 'Drinking Water'
];

const AmenitiesSection = ({ 
  selectedAmenities, 
  customAmenities, 
  onToggleAmenity, 
  onAddCustom, 
  onRemoveCustom, 
  newCustomValue, 
  onCustomValueChange, 
  isEditing 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-green-600" />
        Amenities & Features
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {AMENITY_OPTIONS.map((amenity) => {
          const isSelected = selectedAmenities.includes(amenity);
          return (
            <button
              key={amenity}
              type="button"
              disabled={!isEditing}
              onClick={() => onToggleAmenity(amenity)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                isSelected
                  ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-500/20'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              } disabled:opacity-60`}
            >
              {amenity}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom Amenities</label>
        {isEditing && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCustomValue}
              onChange={(e) => onCustomValueChange(e.target.value)}
              placeholder="e.g. Roof deck garden"
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm dark:text-white"
            />
            <button
              type="button"
              onClick={onAddCustom}
              className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {customAmenities.map((amenity, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg group">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{amenity}</span>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onRemoveCustom(idx)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {!isEditing && customAmenities.length === 0 && selectedAmenities.length === 0 && (
            <p className="text-sm text-gray-400 italic">No amenities listed.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(AmenitiesSection);