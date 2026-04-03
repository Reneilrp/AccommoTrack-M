import React, { useEffect, useState } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import api from '../../utils/api';

export default function PropertyActivityLogs({ propertyId, propertyTitle, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the updated dashboard endpoint that supports filtering by property_id
      const res = await api.get(`/landlord/dashboard/recent-activities?property_id=${propertyId}`);
      const data = res.data || [];
      setLogs(Array.isArray(data) ? data : (data.activities || data.items || []));
    } catch (err) {
      console.error('Failed to fetch property activity', err);
      setError(err.response?.data?.message || err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!isOpen || !propertyId) return;
    fetchLogs();
  }, [isOpen, propertyId, fetchLogs]);

  if (!isOpen) return null;

  const matchesFilter = (log) => {
    // only include logs that relate to this property when propertyId/propertyTitle is provided
    if (propertyId || propertyTitle) {
      const desc = (log.description || log.details || log.action || '').toString().toLowerCase();
      const propTitleLower = (propertyTitle || '').toString().toLowerCase();
      const propIdMatch = Boolean(log.property_id || log.propertyId || log.property);
      const propIdMatches = propIdMatch ? (String(log.property_id || log.propertyId || log.property).indexOf(String(propertyId)) !== -1) : false;
      const titleMatches = propTitleLower ? desc.indexOf(propTitleLower) !== -1 : false;
      if (!(propIdMatches || titleMatches)) return false;
    }

    // Category filter
    if (filter !== 'All') {
      const t = (log.type || '').toLowerCase();
      const title = (log.title || log.action || '').toLowerCase();
      
      let categoryMatch = false;
      if (filter === 'Dorm Settings') categoryMatch = t === 'property' || title.includes('setting') || title.includes('profile');
      else if (filter === 'Room Management') categoryMatch = t === 'room' || title.includes('room') || title.includes('occupy') || title.includes('added') || title.includes('removed');
      else if (filter === 'Payments') categoryMatch = t === 'payment' || title.includes('payment') || title.includes('paid') || title.includes('invoice');
      else if (filter === 'Maintenance') categoryMatch = t === 'maintenance' || title.includes('maintenance');
      else if (filter === 'Add-ons') categoryMatch = t === 'addon' || title.includes('addon');
      else if (filter === 'Due') categoryMatch = title.includes('due') || !!log.due_date || t.includes('due');
      
      if (!categoryMatch) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const text = `${log.title} ${log.action} ${log.description} ${log.details} ${log.by} ${log.user} ${log.actor}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  };

  const sorted = [...logs].sort((a, b) => {
    const ta = new Date(a.created_at || a.time || a.timestamp || 0).getTime();
    const tb = new Date(b.created_at || b.time || b.timestamp || 0).getTime();
    // default: newest first
    return tb - ta;
  });

  // For Due filter we want far due -> near due (descending by due_date)
  const finalList = sorted
    .filter(matchesFilter)
    .sort((a, b) => {
      if (filter !== 'Due') return 0;
      const da = new Date(a.due_date || a.due || 0).getTime();
      const db = new Date(b.due_date || b.due || 0).getTime();
      return db - da; // far (later date) first
    });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Activity Logs</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Property activity — ordered by time</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-6 space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search logs by action, tenant, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
              {['All', 'Dorm Settings', 'Room Management', 'Payments', 'Maintenance', 'Add-ons', 'Due'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${filter === f 
                    ? 'bg-green-600 text-white shadow-md shadow-green-500/20' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading activity logs...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 font-medium">{error}</div>
          ) : finalList.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No activity found for this property.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {finalList.map((a, i) => (
                <li key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 transition-colors shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-semibold leading-tight">{a.title || a.action || a.type || 'Activity'}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 uppercase bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded">
                          {a.by || a.user || a.actor || 'System'}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                          {a.created_at || a.time || ''}
                        </span>
                      </div>
                      {a.details && <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic border-l-2 border-gray-200 dark:border-gray-700 pl-4">{a.details}</div>}
                    </div>
                    {a.amount_cents || a.amount ? (
                      <div className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-2 rounded-lg border border-green-100 dark:border-green-900/30">
                        {a.amount ? a.amount : `₱${Number(a.amount_cents || 0) / 100}`}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
