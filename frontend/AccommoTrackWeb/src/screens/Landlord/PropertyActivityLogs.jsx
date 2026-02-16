import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../../utils/api';

export default function PropertyActivityLogs({ propertyId, propertyTitle, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!isOpen || !propertyId) return;
    const load = async () => {
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
    };

    load();
  }, [isOpen, propertyId]);

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
    if (!filter || filter === 'All') return true;
    const t = (log.type || '').toLowerCase();
    const title = (log.title || log.action || '').toLowerCase();
    if (filter === 'Dorm Settings') return t.includes('property') || title.includes('setting') || title.includes('profile');
    if (filter === 'Room Management') return t.includes('room') || title.includes('room') || title.includes('occupy') || title.includes('added') || title.includes('removed');
    if (filter === 'Payments') return t.includes('payment') || title.includes('payment') || title.includes('paid') || title.includes('invoice');
    if (filter === 'Due') return title.includes('due') || !!log.due_date || t.includes('due');
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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Logs</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Property activity — ordered by time</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {['All', 'Dorm Settings', 'Room Management', 'Payments', 'Due'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm ${filter === f ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading activity...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : finalList.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No activity found for this property.</div>
          ) : (
            <ul className="space-y-2">
              {finalList.map((a, i) => (
                <li key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-100 dark:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{a.title || a.action || a.type || 'Activity'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{a.by || a.user || a.actor || 'System'} — {a.created_at || a.time || ''}</div>
                      {a.details && <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{a.details}</div>}
                    </div>
                    {a.amount_cents || a.amount ? (
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{a.amount ? a.amount : `₱${Number(a.amount_cents || 0) / 100}`}</div>
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
