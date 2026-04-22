import React, { memo } from 'react';
import { X, Wrench, User, Building2, Image as ImageIcon, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';
import UpdateHistory from './UpdateHistory';

const MaintenanceDetailModal = ({ 
  isOpen, 
  onClose, 
  request, 
  onUpdateStatus, 
  onAssign, 
  processing, 
  formatDate, 
  getStatusBadge 
}) => {
  if (!isOpen || !request) return null;

  const images = Array.isArray(request.images) ? request.images : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Request Details</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">#{request.id} · {formatDate(request.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto no-scrollbar space-y-8 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issue Reported</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{request.issue_type || 'General Maintenance'}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{request.description}</p>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reported By</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{request.tenant?.first_name} {request.tenant?.last_name}</p>
                  <p className="text-xs text-gray-500">{request.property?.title} · Room {request.room?.room_number}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" />
                Attached Photos
              </p>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-100">
                      <img 
                        src={getImageUrl(img.path)} 
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                        alt="Maintenance"
                        onClick={() => window.open(getImageUrl(img.path), '_blank')}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-video rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 italic">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                  <span className="text-xs">No photos attached</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              Status & History
            </p>
            <div className="flex items-center justify-between mb-4">
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(request.status)}`}>
                 {request.status.replace('_', ' ')}
               </span>
            </div>
            <UpdateHistory updates={request.updates} formatDate={formatDate} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-4 shrink-0">
          {request.status === 'pending' && (
            <button
              onClick={() => onAssign(request)}
              disabled={processing}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <User className="w-5 h-5" />
              Assign Staff / Caretaker
            </button>
          )}

          {(request.status === 'pending' || request.status === 'in_progress') && (
            <div className="grid grid-cols-2 gap-3">
               <button
                 onClick={() => onUpdateStatus(request.id, 'resolved')}
                 disabled={processing}
                 className="py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
               >
                 <CheckCircle2 className="w-5 h-5" /> Resolve
               </button>
               <button
                 onClick={() => onUpdateStatus(request.id, 'cancelled')}
                 disabled={processing}
                 className="py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-600 rounded-2xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-all"
               >
                 <X className="w-5 h-5" /> Cancel
               </button>
            </div>
          )}

          {request.status === 'resolved' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 flex items-center gap-3 text-green-700 dark:text-green-300">
               <CheckCircle2 className="w-6 h-6 shrink-0" />
               <p className="text-sm font-bold">This issue has been resolved and closed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(MaintenanceDetailModal);