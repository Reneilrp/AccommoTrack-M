import React, { memo } from 'react';
import { Plus, CheckCircle, X } from 'lucide-react';

const AMENITY_OPTIONS = [
  'WiFi', 'Air Conditioning', 'Kitchen', 'Laundry', 
  'Parking', 'Gym', 'Swimming Pool', 'Security 24/7',
  'CCTV', 'Study Area', 'Lounge', 'Drinking Water'
];

const AmenitiesStep = ({ 
  selectedAmenities, 
  onToggleAmenity, 
  customAmenities, 
  onAddCustom, 
  onRemoveCustom, 
  newCustomValue, 
  onCustomValueChange 
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Amenities</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Amenity</label>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="e.g., Water Heater"
              value={newCustomValue}
              onChange={(e) => onCustomValueChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddCustom();
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={onAddCustom}
              disabled={!newCustomValue.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Press Enter or click Add to include a custom amenity</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Common Amenities:</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {AMENITY_OPTIONS.map((amenity) => (
              <button
                key={amenity}
                onClick={() => onToggleAmenity(amenity)}
                className={`px-4 py-4 rounded-lg border-2 text-left transition-all ${selectedAmenities.includes(amenity)
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>

        {/* Current selected amenities (added + selected) */}
        {(selectedAmenities.length > 0 || customAmenities.length > 0) && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Your Amenities:</p>
            <div className="grid grid-cols-3 gap-4">
              {selectedAmenities.map((amenity) => (
                <div
                  key={amenity}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 group hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{amenity}</p>
                  <button
                    onClick={() => onToggleAmenity(amenity)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {customAmenities.map((amenity, index) => (
                <div
                  key={`custom-${index}`}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 group hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{amenity}</p>
                  <button
                    onClick={() => onRemoveCustom(index)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AmenitiesStep);