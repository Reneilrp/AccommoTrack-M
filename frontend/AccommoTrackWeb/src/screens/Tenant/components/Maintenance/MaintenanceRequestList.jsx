import React, { memo } from 'react';
import { Wrench, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

const MaintenanceRequestList = ({ requests, selectedId, onSelect, loading }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <Wrench className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No maintenance requests yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          onClick={() => onSelect(req)}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
            selectedId === req.id 
              ? 'border-green-600 bg-green-50 dark:bg-green-900/20 shadow-md' 
              : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-green-200'
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className={`p-3 rounded-xl shrink-0 ${
              selectedId === req.id ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'
            }`}>
              {getStatusIcon(req.status)}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white truncate">{req.issue_type || 'General Issue'}</h4>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                #{req.id} · {new Date(req.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors ${selectedId === req.id ? 'text-green-600' : ''}`} />
        </div>
      ))}
    </div>
  );
};

export default memo(MaintenanceRequestList);