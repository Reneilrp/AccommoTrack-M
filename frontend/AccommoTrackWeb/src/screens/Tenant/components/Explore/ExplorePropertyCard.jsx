import React, { memo } from 'react';
import { MapPin, Star, Shield, Play, ArrowRight } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';
import PropertyCarousel from '../../PropertyCarousel';

const ExplorePropertyCard = ({ property, onClick }) => {
  const thumbnail = property.images?.find(img => img.is_thumbnail)?.path || property.images?.[0]?.path;
  const price = property.rooms?.[0]?.price || 0;

  return (
    <div 
      onClick={() => onClick(property.id)}
      className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-500"
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={getImageUrl(thumbnail)} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          alt={property.title}
        />
        <div className="absolute top-4 left-4 flex gap-2">
          {property.is_verified && (
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 animate-in fade-in duration-500">
              <Shield className="w-3.5 h-3.5 text-green-600 fill-green-600" />
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Verified</span>
            </div>
          )}
          {property.video && (
            <div className="bg-black/50 backdrop-blur-md p-2 rounded-xl text-white">
              <Play className="w-3.5 h-3.5 fill-current" />
            </div>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
           <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg animate-in slide-in-from-bottom-2 duration-500">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Starts at</p>
              <p className="text-lg font-black text-gray-900 leading-none">₱{Number(price).toLocaleString()}<span className="text-[10px] font-bold">/mo</span></p>
           </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-green-600 transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{property.avg_rating || '5.0'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-4">
          <MapPin className="w-4 h-4 text-green-600" />
          <span className="line-clamp-1 font-medium">{property.address || `${property.barangay}, ${property.city}`}</span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
           <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${property.id + i}`} alt="avatar" />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-green-50 flex items-center justify-center">
                 <span className="text-[10px] font-bold text-green-600">+{Math.floor(Math.random() * 20)}</span>
              </div>
           </div>
           <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm group-hover:gap-2 transition-all">
              <span>View Details</span>
              <ArrowRight className="w-4 h-4" />
           </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ExplorePropertyCard);