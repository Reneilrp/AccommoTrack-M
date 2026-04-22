import React, { memo } from 'react';
import { MapPin, Calendar, PhilippinePeso, Building2, Shuffle, DoorOpen, CalendarDays, CheckCircle2, Star } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';
import ImagePlaceholder from '../../../../components/Shared/ImagePlaceholder';

const ActiveStayDetail = ({ stay, onTransfer, onMoveOut, onExtend, onConfirmCheckIn, onReview }) => {
  if (!stay) return null;

  const { booking, room, property } = stay;
  const thumbnail = property?.images?.find(img => img.is_thumbnail)?.path || property?.images?.[0]?.path;
  const isPendingCheckIn = booking?.status === 'confirmed' || booking?.status === 'reserved';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in duration-500">
      <div className="relative h-64 md:h-80 overflow-hidden bg-black">
        {thumbnail ? (
          <img src={getImageUrl(thumbnail)} className="w-full h-full object-cover opacity-90" alt={property?.title} />
        ) : (
          <ImagePlaceholder className="w-full h-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-8 right-8">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                 <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{property?.title}</h2>
                 <p className="flex items-center gap-2 text-white/80 font-bold text-sm mt-2">
                    <MapPin className="w-4 h-4 text-green-400" />
                    {property?.address || `${property?.city}, ${property?.province}`}
                 </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                 <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">Status</p>
                 <p className="text-sm font-black text-green-400 uppercase tracking-tight leading-none">{booking?.status}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Room Info */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <Building2 className="w-3.5 h-3.5" />
                 Room Details
              </h3>
              <div className="space-y-1">
                 <p className="text-lg font-black text-gray-900 dark:text-white">Room {room?.room_number}</p>
                 <p className="text-sm text-gray-500 font-bold uppercase tracking-tight">{room?.room_type}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                 {room?.is_aircon && (
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100">AIRCON</span>
                 )}
                 {room?.has_private_bathroom && (
                    <span className="px-2 py-1 bg-emerald-50 dark:bg-green-900/30 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100">PRIVATE BATH</span>
                 )}
              </div>
           </div>

           {/* Stay Dates */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-3.5 h-3.5" />
                 Stay Period
              </h3>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Check-in</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{new Date(booking?.start_date).toLocaleDateString()}</p>
                 </div>
                 <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Move-out</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{booking?.end_date ? new Date(booking?.end_date).toLocaleDateString() : 'None'}</p>
                 </div>
              </div>
           </div>

           {/* Pricing */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <PhilippinePeso className="w-3.5 h-3.5" />
                 Monthly Rent
              </h3>
              <div>
                 <p className="text-2xl font-black text-green-600">₱{Number(room?.price).toLocaleString()}</p>
                 <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Due every {new Date(booking?.start_date).getDate()}(th) of month</p>
              </div>
           </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {isPendingCheckIn && (
              <button 
                onClick={() => onConfirmCheckIn(booking.id)}
                className="flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all"
              >
                 <CheckCircle2 className="w-4 h-4" />
                 Confirm Check-in
              </button>
           )}
           <button 
             onClick={onReview}
             className="flex items-center justify-center gap-2 py-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-200 dark:border-gray-600 hover:bg-gray-50 transition-all"
           >
              <Star className="w-4 h-4 text-yellow-400" />
              Review Property
           </button>
           <button 
             onClick={onTransfer}
             className="flex items-center justify-center gap-2 py-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-amber-100 dark:border-amber-800/30 hover:bg-amber-100 transition-all"
           >
              <Shuffle className="w-4 h-4" />
              Room Transfer
           </button>
           <button 
             onClick={onExtend}
             className="flex items-center justify-center gap-2 py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 transition-all"
           >
              <CalendarDays className="w-4 h-4" />
              Extend Stay
           </button>
           <button 
             onClick={onMoveOut}
             className="flex items-center justify-center gap-2 py-4 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-100 dark:border-gray-600 hover:bg-gray-100 transition-all"
           >
              <DoorOpen className="w-4 h-4" />
              Give Notice
           </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ActiveStayDetail);