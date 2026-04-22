import React, { memo } from 'react';
import { Wrench, CheckCircle2, Clock, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';
import UpdateHistory from '../../../Landlord/components/Maintenance/UpdateHistory';

const MaintenanceRequestDetail = ({ request, formatDate }) => {
  if (!request) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 border-dashed p-12 text-center">
        <div>
           <Wrench className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
           <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Select a request to view details</p>
        </div>
      </div>
    );
  }

  const images = Array.isArray(request.images) ? request.images : [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{request.issue_type}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ticket #{request.id} · Created {formatDate(request.created_at)}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            request.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'
          }`}>
            {request.status.replace('_', ' ')}
          </span>
        </div>

        <div className="space-y-4">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issue Description</p>
           <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">{request.description}</p>
        </div>
      </div>

      <div className="p-8 overflow-y-auto no-scrollbar flex-1 space-y-8">
        {/* Images */}
        {images.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <ImageIcon className="w-3.5 h-3.5" />
               Evidence Photos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50">
                  <img 
                    src={getImageUrl(img.path || img)} 
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                    alt="Evidence"
                    onClick={() => window.open(getImageUrl(img.path || img), '_blank')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-700">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update History</p>
           <UpdateHistory updates={request.updates || []} formatDate={formatDate} />
        </div>
      </div>
    </div>
  );
};

export default memo(MaintenanceRequestDetail);