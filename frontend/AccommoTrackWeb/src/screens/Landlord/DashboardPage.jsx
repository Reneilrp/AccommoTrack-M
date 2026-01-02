import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  TrendingUp,
  LucidePhilippinePeso,
  AlertCircle,
  Loader2,
  Building2,
  XCircle,
  Bell,
  X,
  CheckCircle,
  Clock,
  CreditCard,
  LogOut,
} from 'lucide-react';
import api from '../../../utils/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  // Checklist state for new users
  const initialChecklist = [
    { key: 'property', label: 'Add a property', icon: <Building2 className="w-5 h-5 text-blue-500" />, action: 'Add now', actionColor: 'text-green-600', path: '/properties/add' },
    { key: 'payment', label: 'Set up payment methods', icon: <CreditCard className="w-5 h-5 text-purple-500" />, action: 'Set up', actionColor: 'text-green-600', path: '/settings/payments' },
    { key: 'caretaker', label: 'Add a caretaker', icon: <Users className="w-5 h-5 text-yellow-500" />, action: 'Add', actionColor: 'text-green-600', path: '/tenants?tab=caretakers' },
    { key: 'booking', label: 'Create a booking for a tenant', icon: <Calendar className="w-5 h-5 text-pink-500" />, action: 'Create', actionColor: 'text-green-600', path: '/bookings/add' },
  ];
  const [checklist, setChecklist] = useState(initialChecklist);
  const [checkedTasks, setCheckedTasks] = useState([]);
    // Mark a checklist task as complete
    const handleCheckTask = (key) => {
      setCheckedTasks((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    // Consider checklist complete if all tasks are checked
    const checklistComplete = checkedTasks.length === checklist.length;
  const [upcomingPayments, setUpcomingPayments] = useState({ upcomingCheckouts: [], unpaidBookings: [] });
  const [revenueChart, setRevenueChart] = useState({ labels: [], data: [] });
  const [propertyPerformance, setPropertyPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState([]);
  const [archivedNotifications, setArchivedNotifications] = useState([]);
  const [notificationView, setNotificationView] = useState('active');
  const [seenNotificationIds, setSeenNotificationIds] = useState(() => {
    const saved = localStorage.getItem('seenNotificationIds');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, activitiesRes, paymentsRes, chartRes, performanceRes] = await Promise.all([
        api.get('/landlord/dashboard/stats'),
        api.get('/landlord/dashboard/recent-activities'),
        api.get('/landlord/dashboard/upcoming-payments'),
        api.get('/landlord/dashboard/revenue-chart'),
        api.get('/landlord/dashboard/property-performance')
      ]);

      const statsData = statsRes.data;
      const activitiesData = activitiesRes.data;
      const paymentsData = paymentsRes.data;
      const chartData = chartRes.data;
      const performanceData = performanceRes.data;

      setStats(statsData);
      setActivities(activitiesData);
      setUpcomingPayments(paymentsData);
      setRevenueChart(chartData);
      setPropertyPerformance(performanceData);

      // Generate notifications from dashboard data
      const generatedNotifications = [];
      
      // Pending bookings notification
      if (statsData?.bookings?.pending > 0) {
        generatedNotifications.push({
          id: 'pending-bookings',
          type: 'warning',
          icon: 'calendar',
          title: 'Pending Bookings',
          message: `You have ${statsData.bookings.pending} booking${statsData.bookings.pending > 1 ? 's' : ''} waiting for confirmation.`,
          time: 'Just now',
          actionLabel: 'Review Bookings',
          actionPath: '/bookings'
        });
      }

      // Unpaid bookings notification
      if (paymentsData?.unpaidBookings?.length > 0) {
        const totalUnpaid = paymentsData.unpaidBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        generatedNotifications.push({
          id: 'unpaid-bookings',
          type: 'error',
          icon: 'payment',
          title: 'Unpaid Bookings',
          message: `${paymentsData.unpaidBookings.length} booking${paymentsData.unpaidBookings.length > 1 ? 's' : ''} with pending payment totaling ₱${totalUnpaid.toLocaleString()}.`,
          time: 'Today',
          actionLabel: 'View Payments',
          actionPath: '/bookings'
        });
      }

      // Upcoming checkouts notification
      const urgentCheckouts = paymentsData?.upcomingCheckouts?.filter(c => c.urgency === 'high') || [];
      if (urgentCheckouts.length > 0) {
        generatedNotifications.push({
          id: 'urgent-checkouts',
          type: 'warning',
          icon: 'checkout',
          title: 'Upcoming Checkouts',
          message: `${urgentCheckouts.length} tenant${urgentCheckouts.length > 1 ? 's' : ''} checking out within 3 days.`,
          time: 'Today',
          actionLabel: 'View Details',
          actionPath: '/tenants'
        });
      }

      // Low occupancy warning
      const lowOccupancyProperties = performanceData?.filter(p => p.occupancyRate < 50) || [];
      if (lowOccupancyProperties.length > 0) {
        generatedNotifications.push({
          id: 'low-occupancy',
          type: 'info',
          icon: 'property',
          title: 'Low Occupancy Alert',
          message: `${lowOccupancyProperties.length} propert${lowOccupancyProperties.length > 1 ? 'ies have' : 'y has'} less than 50% occupancy.`,
          time: 'This week',
          actionLabel: 'View Properties',
          actionPath: '/properties'
        });
      }

      // New bookings today
      const todayBookings = activitiesData?.filter(a => a.type === 'booking' && a.status === 'confirmed') || [];
      if (todayBookings.length > 0) {
        generatedNotifications.push({
          id: 'new-bookings',
          type: 'success',
          icon: 'calendar',
          title: 'New Confirmed Bookings',
          message: `${todayBookings.length} booking${todayBookings.length > 1 ? 's were' : ' was'} confirmed recently.`,
          time: 'Recently',
          actionLabel: 'View Bookings',
          actionPath: '/bookings'
        });
      }

      setNotifications(generatedNotifications);
      
      // Check for new notifications that haven't been seen
      const newNotificationIds = generatedNotifications.map(n => n.id);
      const hasNewNotifications = newNotificationIds.some(id => !seenNotificationIds.includes(id));
      
      // Auto-open if there are new notifications
      if (hasNewNotifications && generatedNotifications.length > 0) {
        setShowNotifications(true);
        // Mark all current notifications as seen
        const updatedSeenIds = [...new Set([...seenNotificationIds, ...newNotificationIds])];
        setSeenNotificationIds(updatedSeenIds);
        localStorage.setItem('seenNotificationIds', JSON.stringify(updatedSeenIds));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-5 h-5" />;
      case 'room':
        return <Home className="w-5 h-5" />;
      case 'payment':
        return <LucidePhilippinePeso className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getActivityColor = (color) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      case 'red':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNotificationIcon = (icon) => {
    switch (icon) {
      case 'calendar':
        return <Calendar className="w-5 h-5" />;
      case 'payment':
        return <CreditCard className="w-5 h-5" />;
      case 'checkout':
        return <LogOut className="w-5 h-5" />;
      case 'property':
        return <Building2 className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'error':
        return { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600', badge: 'bg-red-500' };
      case 'warning':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', badge: 'bg-yellow-500' };
      case 'success':
        return { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600', badge: 'bg-green-500' };
      case 'info':
      default:
        return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-500' };
    }
  };

  const dismissNotification = (id) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

  const archiveNotification = (id) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      setArchivedNotifications(prev => [...prev, { ...notification, archivedAt: new Date().toISOString() }]);
      setDismissedNotifications(prev => [...prev, id]);
    }
  };

  const unarchiveNotification = (id) => {
    setArchivedNotifications(prev => prev.filter(n => n.id !== id));
    setDismissedNotifications(prev => prev.filter(nId => nId !== id));
  };

  const deleteArchivedNotification = (id) => {
    setArchivedNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllArchived = () => {
    setArchivedNotifications([]);
  };

  const handleNotificationAction = (id, path) => {
    archiveNotification(id);
    setShowNotifications(false);
    navigate(path);
  };

  const activeNotifications = notifications.filter(n => !dismissedNotifications.includes(n.id));
  const unreadCount = activeNotifications.length;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-semibold mb-2">Error loading dashboard</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setNotificationView('active')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        notificationView === 'active'
                          ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Active ({activeNotifications.length})
                    </button>
                    <button
                      onClick={() => setNotificationView('archived')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        notificationView === 'archived'
                          ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Archived ({archivedNotifications.length})
                    </button>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notificationView === 'active' ? (
                      /* Active Notifications */
                      activeNotifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                          <p className="font-medium">All caught up!</p>
                          <p className="text-sm">No new notifications</p>
                        </div>
                      ) : (
                        activeNotifications.map((notification) => {
                          const style = getNotificationStyle(notification.type);
                          return (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${style.bg}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${style.icon}`}>
                                  {getNotificationIcon(notification.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                                    <div className="flex items-center gap-1 ml-2">
                                      <button
                                        onClick={() => archiveNotification(notification.id)}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                        title="Archive"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => dismissNotification(notification.id)}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                        title="Dismiss"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {notification.time}
                                    </span>
                                    {notification.actionLabel && notification.actionPath && (
                                      <button 
                                        onClick={() => handleNotificationAction(notification.id, notification.actionPath)}
                                        className="text-xs font-medium text-green-600 hover:text-green-700"
                                      >
                                        {notification.actionLabel} →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      /* Archived Notifications */
                      archivedNotifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <p className="font-medium">No archived notifications</p>
                          <p className="text-sm">Archived notifications will appear here</p>
                        </div>
                      ) : (
                        archivedNotifications.map((notification) => {
                          const style = getNotificationStyle(notification.type);
                          return (
                            <div
                              key={notification.id}
                              className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors bg-gray-50"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${style.icon} opacity-60`}>
                                  {getNotificationIcon(notification.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-700">{notification.title}</p>
                                    <div className="flex items-center gap-1 ml-2">
                                      <button
                                        onClick={() => unarchiveNotification(notification.id)}
                                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded"
                                        title="Restore"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => deleteArchivedNotification(notification.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                                        title="Delete permanently"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                                  <span className="text-xs text-gray-400 flex items-center gap-1 mt-2">
                                    <Clock className="w-3 h-3" />
                                    Archived {notification.archivedAt ? new Date(notification.archivedAt).toLocaleDateString() : 'recently'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                  
                  {notificationView === 'active' && activeNotifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
                      <button
                        onClick={() => {
                          activeNotifications.forEach(n => archiveNotification(n.id));
                        }}
                        className="flex-1 text-sm text-center text-gray-600 hover:text-gray-900 font-medium py-1 hover:bg-gray-100 rounded"
                      >
                        Archive all
                      </button>
                      <button
                        onClick={() => setDismissedNotifications(notifications.map(n => n.id))}
                        className="flex-1 text-sm text-center text-gray-600 hover:text-gray-900 font-medium py-1 hover:bg-gray-100 rounded"
                      >
                        Dismiss all
                      </button>
                    </div>
                  )}
                  
                  {notificationView === 'archived' && archivedNotifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                      <button
                        onClick={clearAllArchived}
                        className="w-full text-sm text-center text-red-600 hover:text-red-700 font-medium py-1 hover:bg-red-50 rounded"
                      >
                        Clear all archived
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Properties */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-green-600 font-medium">
                {stats?.properties.active}/{stats?.properties.total} Active
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.properties.total}</p>
            <p className="text-sm text-gray-500">Total Properties</p>
          </div>

          {/* Total Rooms */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {stats?.rooms.occupancyRate}% Occupied
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.rooms.total}</p>
            <p className="text-sm text-gray-500">
              {stats?.rooms.occupied} Occupied · {stats?.rooms.available} Available
            </p>
          </div>

          {/* Bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              {stats?.bookings.pending > 0 && (
                <span className="text-xs text-yellow-600 font-medium">
                  {stats?.bookings.pending} Pending
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{(stats?.bookings.pending || 0) + (stats?.bookings.confirmed || 0)}</p>
            <p className="text-sm text-gray-500">
              {stats?.bookings.confirmed || 0} Confirmed · {stats?.bookings.pending || 0} Pending
            </p>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="orange" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" className="lucide lucide-philippine-peso-icon lucide-philippine-peso">
                  <path d="M20 11H4" />
                  <path d="M20 7H4" />
                  <path d="M7 21V4a1 1 0 0 1 1-1h4a1 1 0 0 1 0 12H7" />
                </svg>
              </div>
              <span className="text-xs text-green-600 font-medium">
                <TrendingUp className="w-4 h-4 inline" />
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats?.revenue.monthly.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Monthly Revenue</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activities</h2>
              <div className="space-y-4">
                {activities.length === 0 && !checklistComplete ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-full bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-xl p-8 shadow-md max-w-lg mx-auto">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-8 h-8 text-blue-400" />
                        <h3 className="text-2xl font-bold text-gray-900">Welcome to AccommoTrack!</h3>
                      </div>
                      <p className="text-gray-600 mb-4">Get started by completing the steps below. Your dashboard will show recent activities once you’re set up.</p>
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-semibold text-green-700">{checkedTasks.length}/{checklist.length} Completed</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(checkedTasks.length / checklist.length) * 100}%` }}></div>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {checklist.map((item, idx) => (
                          <li key={item.key} className="flex items-center gap-3">
                            <button
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checkedTasks.includes(item.key) ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}
                              aria-label={checkedTasks.includes(item.key) ? 'Mark incomplete' : 'Mark complete'}
                              onClick={() => handleCheckTask(item.key)}
                            >
                              {checkedTasks.includes(item.key) && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>
                            <span className="flex items-center gap-2 text-base font-medium text-gray-900">
                              {item.icon}
                              <span className={checkedTasks.includes(item.key) ? 'line-through text-gray-400' : ''}>{item.label}</span>
                            </span>
                            <button
                              className={`ml-auto text-sm font-semibold ${item.actionColor} hover:underline`}
                              onClick={() => navigate(item.path)}
                              tabIndex={checkedTasks.includes(item.key) ? -1 : 0}
                              disabled={checkedTasks.includes(item.key)}
                            >
                              {item.action}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.color)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          activity.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'available' ? 'bg-green-100 text-green-800' :
                              activity.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {activity.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Checkouts & Payments */}
          <div className="space-y-6">
            {/* Upcoming Checkouts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Checkouts</h2>
              <div className="space-y-3">
                {upcomingPayments.upcomingCheckouts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming checkouts</p>
                ) : (
                  upcomingPayments.upcomingCheckouts.slice(0, 5).map((checkout) => (
                    <div key={checkout.id} className={`p-3 rounded-lg border ${getUrgencyColor(checkout.urgency)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">{checkout.tenantName}</p>
                        <span className="text-xs font-medium">{checkout.daysLeft} days</span>
                      </div>
                      <p className="text-xs text-gray-600">{checkout.propertyTitle} - Room {checkout.roomNumber}</p>
                      <p className="text-xs text-gray-500 mt-1">{checkout.endDate}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Unpaid Bookings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Unpaid Bookings</h2>
              <div className="space-y-3">
                {upcomingPayments.unpaidBookings.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">All payments up to date!</p>
                ) : (
                  upcomingPayments.unpaidBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900">{booking.tenantName}</p>
                        <span className="text-xs font-bold text-red-600">₱{booking.amount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-600">{booking.propertyTitle} - Room {booking.roomNumber}</p>
                      <span className="text-xs text-red-600 font-medium capitalize">{booking.paymentStatus}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Property Performance */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Property Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertyPerformance.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No properties yet</p>
              </div>
            ) : (
              propertyPerformance.map((property) => (
                <div key={property.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{property.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${property.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {property.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Occupancy</span>
                      <span className="font-semibold">{property.occupancyRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${property.occupancyRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Occupied</p>
                      <p className="font-semibold text-gray-900">{property.occupiedRooms}/{property.totalRooms}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Revenue</p>
                      <p className="font-semibold text-green-600">₱{property.actualRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}