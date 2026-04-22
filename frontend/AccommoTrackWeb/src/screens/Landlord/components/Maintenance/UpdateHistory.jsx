import React, { memo } from 'react';
import { Clock, User } from 'lucide-react';

const UpdateHistory = ({ updates, formatDate }) => {
  if (!updates || updates.length === 0) {
    return (
      <div className="py-8 text-center bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-500 italic">No updates recorded for this request yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update, idx) => (
        <div key={update.id || idx} className="relative pl-6 pb-6 last:pb-0">
          {idx < updates.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          )}
          <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-green-50 dark:bg-green-900/30 border-2 border-green-500 flex items-center justify-center z-10">
            <Clock className="w-3 h-3 text-green-600 dark:text-green-400" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                update.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {update.status}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(update.created_at)}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{update.notes}</p>
            {update.worker_name && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                <User className="w-3 h-3" />
                Updated by: {update.worker_name}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(UpdateHistory);