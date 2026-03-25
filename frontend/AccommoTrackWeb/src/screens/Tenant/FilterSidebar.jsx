import React, { useState, useEffect } from 'react';
import { Check, Star, X } from 'lucide-react';

const FilterSidebar = ({
  filters,
  amenities,
  onApply,
  onClose,
  show,
  propertyTypes,
  selectedType,
  onSelectType,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, show]);

  const fallbackAmenities = [
    'WiFi',
    'Air Conditioning',
    'Parking',
    'Kitchen',
    'Balcony',
    'Security',
  ];

  const amenityOptions =
    Array.isArray(amenities) && amenities.length > 0
      ? amenities
      : fallbackAmenities;

  const toggleAmenity = (amenity) => {
    setLocalFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const clearAll = () => {
    const cleared = {
      priceMin: '',
      priceMax: '',
      availabilityOnly: false,
      amenities: [],
      rating: 0,
    };
    setLocalFilters(cleared);
    onApply(cleared);
    onSelectType('All'); // Also reset property type
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  return (
    <div
      className={`
        w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
        ${show ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 w-0 p-0 border-0'}
        overflow-hidden
      `}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Filters
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors lg:hidden"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Filters */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Property Type */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Property Type
            </h3>
            <div className="space-y-2">
              {propertyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onSelectType(type)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors
                    ${
                      selectedType === type
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Price Range (Monthly)
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={localFilters.priceMin}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceMin: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={localFilters.priceMax}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceMax: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Availability
            </h3>
            <button
              type="button"
              onClick={() =>
                setLocalFilters((prev) => ({
                  ...prev,
                  availabilityOnly: !prev.availabilityOnly,
                }))
              }
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                localFilters.availabilityOnly
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              <span className="font-semibold">Show only available rooms</span>
              {localFilters.availabilityOnly && <Check className="w-5 h-5" />}
            </button>
          </div>

          {/* Minimum Rating */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Minimum Rating
            </h3>
            <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      rating: prev.rating === star ? 0 : star,
                    }))
                  }
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      star <= localFilters.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Amenities
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {amenityOptions.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all text-center ${
                    localFilters.amenities.includes(amenity)
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex gap-4">
          <button
            onClick={clearAll}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
