import React, { memo } from 'react';
import { MapPin, Calendar, PhilippinePeso, ArrowRight } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';

const CurrentStayCard = ({ stay, onDetails }) => {
  if (!stay) return null;

  const thumbnail = stay.property?.images?.find(img => img.is_thumbnail)?.path || stay.property?.images?.[0]?.path;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row h-full">
      <div className="md:w-2/5 relative h-48 md:h-auto">
        <img 
          src={getImageUrl(thumbnail)} 
          className="w-full h-full object-cover" 
          alt={stay.property?.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r" />
        <div className="absolute bottom-4 left-4 text-white">
           <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Residence</p>
           <h4 className="text-xl font-black uppercase tracking-tighter">{stay.property?.title}</h4>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                 <Calendar className="w-3 h-3" />
                 Check-in
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(stay.start_date).toLocaleDateString()}</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                 <MapPin className="w-3 h-3" />
                 Room
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">#{stay.room?.room_number}</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                 <PhilippinePeso className="w-3 h-3" />
                 Monthly
              </p>
              <p className="text-sm font-bold text-green-600">₱{Number(stay.room?.price).toLocaleString()}</p>
           </div>
        </div>

        <button 
          onClick={onDetails}
          className="w-full py-3.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-green-600 hover:text-white text-gray-600 dark:text-gray-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group"
        >
          Manage Stay
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default memo(CurrentStayCard);