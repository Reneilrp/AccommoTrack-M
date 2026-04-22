import React, { memo } from 'react';
import { Home, MapPin, Settings } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';

const PropertyCard = ({ property, onManage, onEdit }) => {
  const imageUrl = getImageUrl(property.images?.[0] || property.image_url);

  return (
    <div
      className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors cursor-pointer group relative"
      role="button"
      tabIndex={0}
      onClick={() => onManage(property)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onManage(property); } }}
    >
      {/* Settings Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(property); }}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors z-10"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Property Image */}
        <div className="w-full lg:w-60 lg:h-48 h-56 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-600 border-2 border-dashed border-gray-300 dark:border-gray-500 flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={property.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg></div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 pr-8">
          <div className="flex items-center justify-between gap-4 mb-2 pt-0 lg:pt-2">
            <div className="flex items-center gap-4 min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{property.title}</h3>
              <span className="hidden sm:inline text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider flex-shrink-0">
                • {property.property_type?.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize flex-shrink-0 ${
                property.current_status === 'active' && !property.is_published
                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  : property.current_status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : property.current_status === 'inactive'
                      ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              {property.current_status === 'active' && !property.is_published ? 'hidden' : property.current_status}
            </span>
          </div>

          {/* Mobile-only type display (if hidden in header) */}
          <div className="sm:hidden mb-2">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
              {property.property_type?.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="truncate">{property.street_address}, {property.city}</span>
          </div>

          {property.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
              {property.description}
            </p>
          )}

          {/* Property Stats */}
          <div className="flex items-center gap-8 mt-auto pt-4 justify-center sm:justify-start">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available Rooms</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{property.available_rooms || 0}</p>
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Total Rooms</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{property.total_rooms || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(PropertyCard);