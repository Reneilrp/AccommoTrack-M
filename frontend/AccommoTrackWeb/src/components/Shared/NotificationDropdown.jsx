import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

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
      const res = await api.get('/notifications');
      setNotifications(res.data.data || res.data || []); // Handle paginated or collection response
      // Calculate unread count if not provided explicitly, or fetch separately if needed
      // Assuming API returns unread_count or we filter locally
      const unread = (res.data.data || res.data || []).filter(n => !n.read_at).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Poll every 30 seconds for new notifications (simple real-time substitute)
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
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    setIsOpen(false);

    // Navigate based on type (example logic)
    if (notification.data?.type === 'booking') {
       navigate('/bookings');
    } else if (notification.data?.type === 'payment') {
       navigate('/wallet');
    } else if (notification.data?.type === 'message') {
       navigate('/messages');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(); // Refresh on open
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
                {notifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                      !notification.read_at ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="px-4 py-3 flex gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                        !notification.read_at ? 'bg-brand-500' : 'bg-transparent'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read_at ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                          {notification.data?.title || 'Notification'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.data?.message || notification.data?.body || 'You have a new update.'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
