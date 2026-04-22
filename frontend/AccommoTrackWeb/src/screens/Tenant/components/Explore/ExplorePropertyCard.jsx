import React, { memo } from 'react';
import { MapPin, Play, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PropertyCarousel from '../../PropertyCarousel';

const ExplorePropertyCard = ({ property, onClick }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-md border border-gray-300 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 cursor-pointer group"
        onClick={() => onClick(property.id)}
      >
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors flex items-center gap-2">
              {property.title || property.name}
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green-600 dark:text-green-500" />
            </h2>
            <span className="px-2.5 py-0.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wide border border-green-100 dark:border-green-800">
              {(property.type || '')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/boardinghouse/i, 'Boarding House')
                .replace(/bedspacer/i, 'Bed Spacer')
                .split(/[-_\s]+/)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ')}
            </span>
          </div>
          {(property.location || property.address) && (
            <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 mt-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">
                {property.location || property.address}
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {property.video_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/properties/${property.id}`, {
                  state: { openVideo: true },
                });
              }}
              className="flex items-center gap-2.5 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" /> Video Tour
            </button>
          )}
          <span className="px-4 py-2 border border-green-600 dark:border-green-500 text-green-700 dark:text-green-400 text-sm font-bold rounded-lg group-hover:bg-green-50 dark:group-hover:bg-green-900/30 transition-colors">
            More Details →
          </span>
        </div>
      </div>

      {/* Carousel */}
      <PropertyCarousel
        property={property}
        onOpenDetails={(room, prop) => navigate(`/properties/${prop.id}`)}
      />
    </div>
  );
};

export default memo(ExplorePropertyCard);