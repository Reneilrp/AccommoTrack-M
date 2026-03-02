import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Calendar, Home, Users, CreditCard, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const ACTIVITY_ICON_MAP = {
  booking: <Calendar className="w-4 h-4" />,
  room: <Home className="w-4 h-4" />,
  tenant: <Users className="w-4 h-4" />,
  payment: <CreditCard className="w-4 h-4" />,
};

const ACTIVITY_COLOR_MAP = {
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const [notifRes, activitiesRes] = await Promise.allSettled([
        api.get('/notifications'),
        api.get('/landlord/dashboard/recent-activities'),
      ]);

      // DB notifications
      const rawNotifs = notifRes.status === 'fulfilled'
        ? (notifRes.value.data?.data || notifRes.value.data || [])
        : [];
      const safeNotifs = (Array.isArray(rawNotifs) ? rawNotifs : []).map(n => ({
        ...n,
        _kind: 'notification',
        _sortKey: new Date(n.created_at).getTime(),
      }));

      // Recent activities (no read/unread state)
      const rawActivities = activitiesRes.status === 'fulfilled'
        ? (activitiesRes.value.data?.activities || activitiesRes.value.data || [])
        : [];
      const safeActivities = (Array.isArray(rawActivities) ? rawActivities : [])
        .slice(0, 15)
        .map(a => ({
          ...a,
          _kind: 'activity',
          _sortKey: new Date(a.timestamp).getTime(),
          read_at: true, // activities have no unread concept
        }));

      // Merge and sort newest first
      const merged = [...safeNotifs, ...safeActivities].sort((a, b) => b._sortKey - a._sortKey);

      setNotifications(merged);
      setUnreadCount(safeNotifs.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification._kind === 'notification' && !notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    setIsOpen(false);

    if (notification._kind === 'activity') {
      if (notification.type === 'booking') navigate('/bookings');
      else if (notification.type === 'payment') navigate('/wallet');
      else if (notification.type === 'room') navigate('/rooms');
      return;
    }

    if (notification.data?.type === 'booking') navigate('/bookings');
    else if (notification.data?.type === 'payment') navigate('/wallet');
    else if (notification.data?.type === 'message') navigate('/messages');
  };

  const renderItem = (item) => {
    if (item._kind === 'activity') {
      const colorClass = ACTIVITY_COLOR_MAP[item.color] || ACTIVITY_COLOR_MAP.gray;
      const icon = ACTIVITY_ICON_MAP[item.type] || <AlertCircle className="w-4 h-4" />;
      return (
        <li
          key={`activity-${item.type}-${item.id}-${item._sortKey}`}
          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
          onClick={() => handleNotificationClick(item)}
        >
          <div className="px-4 py-3 flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${colorClass}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.action}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
              </p>
            </div>
          </div>
        </li>
      );
    }

    // DB notification
    return (
      <li
        key={`notif-${item.id}`}
        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${!item.read_at ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
        onClick={() => handleNotificationClick(item)}
      >
        <div className="px-4 py-3 flex gap-3">
          <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!item.read_at ? 'bg-brand-500' : 'bg-transparent'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${!item.read_at ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              {item.data?.title || 'Notification'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
              {item.data?.message || item.data?.body || 'You have a new update.'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">No notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map(renderItem)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;