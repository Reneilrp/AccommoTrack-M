import React, { memo } from 'react';
import { Home, Users, MapPin, Star, MoreHorizontal, Settings, Eye } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';

const PropertyCard = ({ property, onManage, onEdit, _onToggleStatus }) => {
  const thumbnail = property.images?.find(img => img.is_thumbnail)?.path || property.images?.[0]?.path;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={getImageUrl(thumbnail)} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          alt={property.title}
          onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Property+Image'; }}
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${
            property.current_status === 'approved' ? 'bg-green-500/90 text-white' : 'bg-amber-500/90 text-white'
          }`}>
            {property.current_status}
          </span>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{property.title}</h3>
          <div className="flex items-center gap-1 text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{property.avg_rating || 'N/A'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-4">
          <MapPin className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{property.city}, {property.province}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Rooms</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{property.total_rooms || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Occupancy</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{property.occupancy_rate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="mt-auto flex gap-2">
          <button
            onClick={() => onManage(property)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-green-500/10"
          >
            <Eye className="w-4 h-4" /> Manage
          </button>
          <button
            onClick={() => onEdit(property)}
            className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all border border-gray-100 dark:border-gray-600"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(PropertyCard);