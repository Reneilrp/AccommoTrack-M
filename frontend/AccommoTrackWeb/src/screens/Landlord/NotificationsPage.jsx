import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Calendar, Home, Users, CreditCard, AlertCircle, Loader2, Filter } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'booking', label: 'Bookings' },
  { id: 'payment', label: 'Payments' },
  { id: 'maintenance', label: 'Maintenance' },
];

const TYPE_CONFIG = {
  booking:      { icon: Calendar,    color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  payment:      { icon: CreditCard,  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  maintenance:  { icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  message:      { icon: Bell,        color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  tenant:       { icon: Users,       color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  room:         { icon: Home,        color: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-100 dark:bg-teal-900/30' },
};

const DEFAULT_CONFIG = { icon: Bell, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };

function inferType(notification) {
  const t = (notification.type || '').toLowerCase();
  const dataType = (notification.data?.type || '').toLowerCase();
  if (t.includes('booking') || dataType === 'booking') return 'booking';
  if (t.includes('payment') || dataType === 'payment') return 'payment';
  if (t.includes('maintenance') || dataType === 'maintenance') return 'maintenance';
  if (t.includes('message') || dataType === 'message') return 'message';
  if (t.includes('tenant') || dataType === 'tenant') return 'tenant';
  if (t.includes('room') || dataType === 'room') return 'room';
  return 'default';
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 60) return `${diffMin || 1}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifRes, activitiesRes] = await Promise.allSettled([
        api.get('/notifications'),
        api.get('/landlord/dashboard/recent-activities'),
      ]);

      const rawNotifs = notifRes.status === 'fulfilled'
        ? (notifRes.value.data?.data || notifRes.value.data || [])
        : [];
      const safeNotifs = (Array.isArray(rawNotifs) ? rawNotifs : []).map(n => ({
        id: n.id,
        _kind: 'notification',
        type: inferType(n),
        title: n.data?.title || 'Notification',
        message: n.data?.message || n.data?.body || '',
        timestamp: n.created_at,
        read: !!n.read_at,
        data: n.data,
      }));

      const rawActs = activitiesRes.status === 'fulfilled'
        ? (activitiesRes.value.data?.activities || activitiesRes.value.data || [])
        : [];
      const safeActs = (Array.isArray(rawActs) ? rawActs : []).slice(0, 20).map(a => ({
        id: `act-${a.id || a.timestamp}`,
        _kind: 'activity',
        type: a.type || 'default',
        title: a.action || 'Activity',
        message: a.description || '',
        timestamp: a.timestamp,
        read: true,
        data: a,
      }));

      const merged = [...safeNotifs, ...safeActs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(merged);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.patch(`/notifications/${id}/read`); } catch {}
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.patch('/notifications/read-all'); } catch {}
  };

  const handleClick = (n) => {
    if (n._kind === 'notification' && !n.read) markAsRead(n.id);
    if (n.type === 'booking') navigate('/bookings');
    else if (n.type === 'payment') navigate('/payments');
    else if (n.type === 'maintenance') navigate('/maintenance');
    else if (n.type === 'message') navigate('/messages');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              filter === f.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {f.label}
            {f.id === 'unread' && unreadCount > 0 && (
              <span className="ml-2.5 bg-white/20 text-xs px-2.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 gap-4 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading notifications…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center gap-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-300 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(n => {
              const cfg = TYPE_CONFIG[n.type] || DEFAULT_CONFIG;
              const Icon = cfg.icon;
              return (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !n.read ? 'bg-green-50/40 dark:bg-green-900/10' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!n.read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2.5">{formatRelativeTime(n.timestamp)}</p>
                  </div>
                  {n._kind === 'notification' && !n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      className="p-2.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 flex-shrink-0 mt-2"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
