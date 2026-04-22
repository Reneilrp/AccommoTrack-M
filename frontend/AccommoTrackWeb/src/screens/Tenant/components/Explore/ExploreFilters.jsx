import React, { memo } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';

const AMENITY_OPTIONS = ["WiFi", "Parking", "CR", "Air Condition/AC", "CCTV", "Study Area", "Lounge"];

const ExploreFilters = ({ 
  isOpen, 
  onClose, 
  selectedType, 
  onTypeChange, 
  types, 
  selectedAmenities, 
  onToggleAmenity,
  priceRange,
  onPriceChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Property Types */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Accommodation Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {types.map((type) => (
                <button
                  key={type.value}
                  onClick={() => onTypeChange(type.value)}
                  className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                    selectedType === type.value
                      ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-200'
                  }`}
                >
                  {type.label}
                  {type.count !== null && <span className="ml-1 opacity-60">({type.count})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Price Range (Monthly)</h3>
            <div className="space-y-6 px-2">
               <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                  <span>₱0</span>
                  <span>₱{Number(priceRange).toLocaleString()}</span>
               </div>
               <input 
                 type="range" 
                 min="0" 
                 max="20000" 
                 step="500"
                 value={priceRange}
                 onChange={(e) => onPriceChange(e.target.value)}
                 className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
               />
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    onClick={() => onToggleAmenity(amenity)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {isSelected && <Check className="inline-block w-3 h-3 mr-1.5" />}
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800">
           <button 
             onClick={onClose}
             className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-500/20 transition-all"
           >
             Show Results
           </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ExploreFilters);