import React, { memo } from 'react';
import PropertyMap from '../../../../components/Shared/PropertyMap';

const ExploreMap = ({ properties, onPropertyClick }) => {
  return (
    <div className="flex-1 relative z-0">
      <PropertyMap 
        properties={properties} 
        onMarkerClick={(p) => onPropertyClick(p.id)}
        className="h-full w-full"
      />
      
      {/* Floating Legend/Summary */}
      <div className="absolute bottom-6 left-6 z-[400] bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-xs animate-in slide-in-from-left-4 duration-500">
         <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">Map Legend</h4>
         <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-200" />
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Available Accommodations</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200" />
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Limited Slots Remaining</span>
            </div>
         </div>
         <p className="mt-4 text-[9px] text-gray-400 font-medium leading-relaxed">
            Click on any marker to view quick details and pricing for that property.
         </p>
      </div>
    </div>
  );
};

export default memo(ExploreMap);