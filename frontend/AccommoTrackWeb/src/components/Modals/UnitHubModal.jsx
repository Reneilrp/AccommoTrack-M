import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  User, 
  MessageSquare, 
  Home, 
  Wifi, 
  Zap, 
  Droplets,
  FileText,
  MapPin,
  ChevronRight,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { showError } from '../../utils/toast';

export default function UnitHubModal({ show, onClose, booking }) {
  const navigate = useNavigate();

  if (!show || !booking) return null;

  const property = booking.property || {};
  const room = booking.room || {};
  const landlord = property.landlord || booking.landlord || {};
  const caretakers = property.caretakerAssignments || [];
  const amenities = property.amenities || [];
  const rules = property.property_rules || [];

  const handleStartChat = async (recipientId) => {
    try {
      const response = await api.post('/messages/start', {
        recipient_id: recipientId,
        property_id: property.id
      });
      onClose();
      navigate(`/messages/${response.data.id}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      showError('Could not open chat');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#111827] rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-200">
        
        {/* Header - Minimalist Image Banner */}
        <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
           {property.image_url ? (
             <img src={property.image_url} className="w-full h-full object-cover" alt={property.title} />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-4xl uppercase tracking-tighter opacity-10">
                {property.title || 'No Image'}
             </div>
           )}
           <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-[#111827] to-transparent" />
           <button 
             onClick={onClose}
             className="absolute top-6 right-6 p-2 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform active:scale-90"
           >
             <X className="w-5 h-5 text-gray-900 dark:text-white" />
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 pt-0 scrollbar-hide">
            <div className="relative -mt-16 mb-10">
                <div className="flex items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
                            <ShieldCheck className="w-4 h-4" />
                            Verified Property Hub
                        </div>
                        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight uppercase">
                            {property.title}
                        </h2>
                        <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2 font-medium">
                            <MapPin className="w-4 h-4" />
                            {property.full_address || property.street_address}
                        </p>
                    </div>
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Your Room</span>
                        <span className="text-3xl font-black text-green-600 dark:text-green-400">#{room.room_number}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column - Staff & Amenities */}
                <div className="lg:col-span-7 space-y-12">
                    
                    {/* Staff Section */}
                    <section>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Building Support Team</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Landlord */}
                            <div className="p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 hover:border-green-500/30 transition-colors group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-600">
                                        <User className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Owner/Landlord</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {landlord.first_name} {landlord.last_name}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleStartChat(landlord.id)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Start Chat
                                </button>
                            </div>

                            {/* Caretakers */}
                            {caretakers.map((assignment, idx) => {
                                const worker = assignment.caretaker;
                                if (!worker) return null;
                                return (
                                    <div key={idx} className="p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 hover:border-blue-500/30 transition-colors group">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-600">
                                                <User className="w-6 h-6 text-blue-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Building Staff</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                    {worker.first_name} {worker.last_name}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleStartChat(worker.id)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Send Message
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Amenities Section */}
                    <section>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Building Amenities</h3>
                        <div className="flex flex-wrap gap-3">
                            {amenities.length === 0 ? (
                                <p className="text-sm italic text-gray-400">No amenities listed for this property.</p>
                            ) : (
                                amenities.map((amenity, idx) => (
                                    <div key={idx} className="px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
                                        <Home className="w-4 h-4 text-green-500" />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">{amenity.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column - Rules & Curfew */}
                <div className="lg:col-span-5 space-y-12">
                    
                    {/* Curfew Alert */}
                    {(property.curfew_time || property.curfew_policy) && (
                        <section className="bg-amber-50/50 dark:bg-amber-900/10 p-8 rounded-[32px] border border-amber-100 dark:border-amber-900/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest">Curfew Notice</h3>
                            </div>
                            <p className="text-2xl font-black text-amber-900 dark:text-amber-100 tracking-tight leading-none mb-2">
                                {property.curfew_time || 'No set time'}
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300/80 font-medium">
                                {property.curfew_policy || 'Strict policy applies for early entry/late exits.'}
                            </p>
                        </section>
                    )}

                    {/* House Rules */}
                    <section>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6">House Manual</h3>
                        <div className="space-y-4">
                            {rules.length === 0 ? (
                                <div className="p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                                    <p className="text-sm text-gray-400 font-medium italic">General building policies apply.</p>
                                </div>
                            ) : (
                                rules.map((rule, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-gray-400 font-black text-[10px] bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                                            {idx + 1}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                                            {rule.rule || rule}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Move-in Memo */}
                    <section className="p-6 bg-blue-50/30 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                        <div className="flex items-center gap-3 mb-3">
                            <Info className="w-4 h-4 text-blue-500" />
                            <h3 className="text-[10px] font-black text-blue-900/60 dark:text-blue-300 uppercase tracking-widest">Lease Note</h3>
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-200 font-medium leading-relaxed">
                            Your stay officially started on <b>{new Date(booking.start_date).toLocaleDateString()}</b>. 
                            Refer to your digital contract for move-out notice periods and security deposit terms.
                        </p>
                    </section>
                </div>
            </div>
        </div>

        {/* Footer Action */}
        <div className="px-10 py-6 border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">AccommoTrack Verified Unit</p>
        </div>
      </div>
    </div>
  );
}
