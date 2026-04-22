import React, { useState, useEffect, useCallback, memo } from 'react';
import { PhilippinePeso, Users, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import landlordService from '../../services/landlordService';

const TenantLogs = ({ propertyId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, _setFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await landlordService.getTenantLogs({ 
      property_id: propertyId,
      type: filter !== 'all' ? filter : undefined 
    });
    if (res.success) {
      setLogs(res.data.items || res.data || []);
    }
    setLoading(false);
  }, [propertyId, filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'payment': return <PhilippinePeso className="w-4 h-4 text-green-600" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'maintenance': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tenant Activity Logs</h3>
        <button onClick={fetchLogs} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6">
        {loading && logs.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 dark:bg-gray-700 animate-pulse rounded-xl" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-gray-500 italic">No activity logs found.</p>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm shrink-0">
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {log.tenant_name} · <span className="font-medium text-gray-500">{log.action}</span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{log.description}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mt-2">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TenantLogs);