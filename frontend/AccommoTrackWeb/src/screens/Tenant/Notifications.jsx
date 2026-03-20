import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { tenantService } from '../../services/tenantService';
import { Bell, BellOff, Check, Calendar, CreditCard, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

const TYPE_CONFIG = {
  booking: { icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  payment: { icon: CreditCard, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  message: { icon: MessageSquare, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  default: { icon: Bell, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
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

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [notifRes, bookingsRes, paymentsRes] = await Promise.allSettled([
        api.get('/notifications'),
        tenantService.getBookings(),
        tenantService.getPayments(),
      ]);

      const items = [];

      // Backend notifications
      const rawNotifs = notifRes.status === 'fulfilled'
        ? (notifRes.value.data?.data || notifRes.value.data || [])
        : [];
      (Array.isArray(rawNotifs) ? rawNotifs : []).forEach((n) => {
        items.push({
          id: `n-${n.id}`,
          type: n.data?.type || 'default',
          title: n.data?.title || 'Notification',
          message: n.data?.message || n.data?.body || '',
          timestamp: n.created_at,
          read: !!n.read_at,
          raw: n,
        });
      });

      // Booking activity
      const bookings = bookingsRes.status === 'fulfilled'
        ? (bookingsRes.value?.data || bookingsRes.value || [])
        : [];
      (Array.isArray(bookings) ? bookings : []).forEach((b) => {
        items.push({
          id: `b-${b.id}`,
          type: 'booking',
          title: `Booking ${b.reference || b.id}`,
          message: `Status: ${b.status}`,
          timestamp: b.updated_at || b.created_at,
          read: b.status === 'confirmed' || b.status === 'cancelled',
          raw: b,
        });
      });

      // Payment activity
      const payments = paymentsRes.status === 'fulfilled'
        ? (paymentsRes.value?.data || paymentsRes.value || [])
        : [];
      (Array.isArray(payments) ? payments : []).forEach((p) => {
        items.push({
          id: `p-${p.id}`,
          type: 'payment',
          title: `Invoice ${p.invoice_reference || p.id}`,
          message: `Payment status: ${p.status}`,
          timestamp: p.updated_at || p.created_at,
          read: p.status === 'paid',
          raw: p,
        });
      });

      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(items);
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (id.startsWith('n-')) {
      const backendId = id.replace('n-', '');
      await api.patch(`/notifications/${backendId}/read`).catch(() => {});
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await api.patch('/notifications/read-all').catch(() => {});
  };

  const displayed = notifications.filter((n) => {
    if (filterType === 'bookings' && n.type !== 'booking') return false;
    if (filterType === 'payments' && n.type !== 'payment') return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'payments', label: 'Payments' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You\'re all caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
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

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filterType === f.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No notifications</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You're all caught up!</p>
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
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !notification.read ? 'bg-green-50/40 dark:bg-green-900/10' : ''
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{formatRelativeTime(notification.timestamp)}</p>
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
