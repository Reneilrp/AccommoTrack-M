import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Bell, BellOff, Check, Calendar, CreditCard, MessageSquare, AlertCircle, RefreshCw, Home, Users, ArrowLeftRight } from 'lucide-react';

const TYPE_CONFIG = {
  booking: { icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  payment: { icon: CreditCard, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  message: { icon: MessageSquare, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  room: { icon: Home, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  tenant: { icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  transfer: { icon: ArrowLeftRight, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  addon: { icon: AlertCircle, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  extension: { icon: Calendar, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  move_out: { icon: Home, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  maintenance: { icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  default: { icon: Bell, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
};

const resolveNotificationType = (rawType = '') => {
  const type = String(rawType || '').toLowerCase();
  if (type.includes('transfer')) return 'transfer';
  if (type.includes('move_out')) return 'move_out';
  if (type.includes('extension')) return 'extension';
  if (type.includes('addon')) return 'addon';
  if (type.includes('maintenance')) return 'maintenance';
  if (type.includes('message')) return 'message';
  if (type.includes('booking')) return 'booking';
  if (type.includes('payment') || type.includes('billing') || type === 'rent_paid' || type === 'cash_payment_verified') return 'payment';
  return 'default';
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');

  const isNotificationRead = (item) => Boolean(item?.is_read || item?.read_at);

  const extractNotificationRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [notifRes, activitiesRes] = await Promise.allSettled([
        api.get('/notifications?role=tenant&per_page=200'),
        api.get('/tenant/dashboard/activities'),
      ]);

      const rawNotifs = notifRes.status === 'fulfilled'
        ? extractNotificationRows(notifRes.value.data)
        : [];
      const safeNotifs = (Array.isArray(rawNotifs) ? rawNotifs : []).map((n) => ({
        id: `n-${n.id}`,
        _kind: 'notification',
        type: resolveNotificationType(n.data?.type || n.type),
        title: n.data?.title || 'Notification',
        message: n.data?.message || n.data?.body || 'You have a new update.',
        timestamp: n.created_at,
        read: isNotificationRead(n),
        raw: n,
      }));

      const rawActivities = activitiesRes.status === 'fulfilled'
        ? (activitiesRes.value?.data?.activities || activitiesRes.value?.data || [])
        : [];
      const safeActivities = (Array.isArray(rawActivities) ? rawActivities : [])
        .slice(0, 15)
        .map((a) => ({
          id: `a-${a.id || a.timestamp}`,
          _kind: 'activity',
          type: resolveNotificationType(a.type),
          title: a.action || 'Activity',
          message: a.description || '',
          timestamp: a.timestamp,
          read: true,
          raw: a,
        }));

      const seen = new Set();
      const items = [...safeNotifs, ...safeActivities]
        .filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(items);

      if (notifRes.status !== 'fulfilled' && activitiesRes.status !== 'fulfilled') {
        setFetchError('Unable to load notifications right now. Please try again.');
      } else if (notifRes.status !== 'fulfilled') {
        setFetchError('Unable to load notifications right now. Please try again.');
      } else if (activitiesRes.status !== 'fulfilled') {
        setFetchError('Recent activity feed is temporarily unavailable.');
      }
    } catch (err) {
      console.error('Error fetching notifications', err);
      setFetchError('Unable to load notifications right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    if (!id.startsWith('n-')) return;

    const previousState = notifications;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    const backendId = id.replace('n-', '');
    try {
      await api.patch(`/notifications/${backendId}/read`);
      setActionError('');
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      setNotifications(previousState);
      setActionError('Could not mark that notification as read. Please try again.');
    }
  };

  const markAllRead = async () => {
    const previousState = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.patch('/notifications/read-all?role=tenant');
      setActionError('');
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
      setNotifications(previousState);
      setActionError('Could not mark all notifications as read. Please try again.');
    }
  };

  const displayed = notifications.filter((n) => {
    if (filterType === 'bookings' && n.type !== 'booking') return false;
    if (filterType === 'payments' && n.type !== 'payment') return false;
    if (filterType === 'transfers' && n.type !== 'transfer') return false;
    if (filterType === 'addons' && n.type !== 'addon') return false;
    if (unreadOnly && n.read) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'payments', label: 'Payments' },
    { key: 'transfers', label: 'Transfers' },
    { key: 'addons', label: 'Add-ons' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You\'re all caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Check className="w-4 h-4" /> Mark all read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs + Unread Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-xl flex-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${filterType === f.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setUnreadOnly((v) => !v)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${unreadOnly
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
        >
          Unread only
        </button>
      </div>

      {(fetchError || actionError) && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{actionError || fetchError}</span>
          </div>
          <button
            onClick={fetchNotifications}
            className="text-xs font-semibold text-red-700 dark:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Notification List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-500 dark:text-gray-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-gray-500 dark:text-gray-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No notifications</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {unreadOnly ? 'No unread notifications.' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {displayed.map((notification) => {
              const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
              const Icon = config.icon;
              return (
                <li
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!notification.read ? 'bg-green-50/40 dark:bg-green-900/10' : ''
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2.5">{formatRelativeTime(notification.timestamp)}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 mt-2" />
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
