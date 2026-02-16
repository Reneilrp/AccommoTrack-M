import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Calendar,
  TrendingUp,
  LucidePhilippinePeso,
  AlertCircle,
  Building2,
  XCircle,
  Clock,
  ShieldAlert,
  FileWarning,
} from 'lucide-react';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const isCaretaker = user?.role === 'caretaker';
  const dashboardKey = isCaretaker ? 'caretaker_dashboard' : 'landlord_dashboard';
  const cachedData = uiState.data?.[dashboardKey] || cacheManager.get(dashboardKey);

  const [stats, setStats] = useState(cachedData?.stats || null);
  const [activities, setActivities] = useState(cachedData?.activities || []);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState(cachedData?.upcomingPayments || { upcomingCheckouts: [], unpaidBookings: [] });
  const [propertyPerformance, setPropertyPerformance] = useState(cachedData?.propertyPerformance || []);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const res = await api.get('/landlord/my-verification');
      setVerificationStatus(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setVerificationStatus({ status: 'not_submitted' });
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      if (!cachedData) setLoading(true);
      setError('');

      const [statsRes, activitiesRes, paymentsRes, performanceRes] = await Promise.all([
        api.get('/landlord/dashboard/stats'),
        api.get('/landlord/dashboard/recent-activities'),
        api.get('/landlord/dashboard/upcoming-payments'),
        api.get('/landlord/dashboard/property-performance')
      ]);

      const statsData = statsRes.data;
      const activitiesData = activitiesRes.data;
      const paymentsData = paymentsRes.data;
      const performanceData = performanceRes.data;

      setStats(statsData);
      setActivities(activitiesData);
      setUpcomingPayments(paymentsData);
      setPropertyPerformance(performanceData);

      const dashboardState = {
        stats: statsData,
        activities: activitiesData,
        upcomingPayments: paymentsData,
        propertyPerformance: performanceData
      };

      updateData(dashboardKey, dashboardState);
      cacheManager.set(dashboardKey, dashboardState);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5" />;
      case 'room': return <Home className="w-5 h-5" />;
      case 'payment': return <LucidePhilippinePeso className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getActivityColor = (color) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      case 'red': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm h-96" />
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <p className="text-red-600 text-lg font-semibold mb-2">Error loading dashboard</p>
        <button onClick={fetchDashboardData} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Banner */}
      {verificationStatus && verificationStatus.status !== 'approved' && verificationStatus.user?.is_verified !== true && (
        <div className={`rounded-xl border p-4 ${
          verificationStatus.status === 'rejected' ? 'bg-red-50 border-red-200' : 
          verificationStatus.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {verificationStatus.status === 'rejected' ? <FileWarning className="w-6 h-6 text-red-600" /> : 
               verificationStatus.status === 'pending' ? <Clock className="w-6 h-6 text-yellow-600" /> : <ShieldAlert className="w-6 h-6 text-orange-600" />}
              <div>
                <h3 className="font-semibold text-gray-900">Account Status: {verificationStatus.status.replace('_', ' ').toUpperCase()}</h3>
                <p className="text-sm text-gray-600">Please complete your verification in Settings to unlock all features.</p>
              </div>
            </div>
            <Link to="/settings" state={{ tab: 'verification' }} className="px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg text-sm font-medium shadow-sm">View Status</Link>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isCaretaker ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Building2 className="w-6 h-6 text-blue-600" /></div>
            <span className="text-xs text-green-600 font-medium">{stats?.properties.active}/{stats?.properties.total} Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.properties.total}</p>
          <p className="text-sm text-gray-500">Total Properties</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><Home className="w-6 h-6 text-green-600" /></div>
            <span className="text-xs text-blue-600 font-medium">{stats?.rooms.occupancyRate}% Occupied</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.rooms.total}</p>
          <p className="text-sm text-gray-500">{stats?.rooms.occupied} Occupied · {stats?.rooms.available} Available</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Calendar className="w-6 h-6 text-purple-600" /></div>
            {stats?.bookings.pending > 0 && <span className="text-xs text-yellow-600 font-medium">{stats?.bookings.pending} Pending</span>}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats?.bookings.pending || 0) + (stats?.bookings.confirmed || 0)}</p>
          <p className="text-sm text-gray-500">Bookings (Confirmed & Pending)</p>
        </div>

        {!isCaretaker && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                 <LucidePhilippinePeso className="w-6 h-6 text-orange-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{stats?.revenue?.monthly?.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Monthly Revenue</p>
          </div>
        )}
      </div>

      {/* Activities and Alerts */}
      <div className={`grid grid-cols-1 ${isCaretaker ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-6`}>
        <div className={`${isCaretaker ? 'lg:col-span-2' : 'lg:col-span-2'} bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6`}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {activities.length === 0 ? <p className="text-center py-8 text-gray-500 italic">No recent activities</p> : 
              activities.slice(0, 6).map((activity, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.color)}`}>{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getActivityColor(activity.color)}`}>{activity.status}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upcoming Checkouts</h2>
            <div className="space-y-3">
              {upcomingPayments.upcomingCheckouts.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">None scheduled</p> :
                upcomingPayments.upcomingCheckouts.slice(0, 4).map((c) => (
                  <div key={c.id} className={`p-3 rounded-lg border ${getUrgencyColor(c.urgency)}`}>
                    <div className="flex justify-between font-semibold text-sm text-gray-900 dark:text-white"><span>{c.tenantName}</span><span>{c.daysLeft}d</span></div>
                    <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{c.propertyTitle} - Room {c.roomNumber}</p>
                  </div>
                ))
              }
            </div>
          </div>

          {!isCaretaker && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Unpaid Bookings</h2>
              <div className="space-y-3">
                {upcomingPayments.unpaidBookings.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">All paid up!</p> :
                  upcomingPayments.unpaidBookings.slice(0, 4).map((b) => (
                    <div key={b.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex justify-between font-semibold text-sm text-gray-900 dark:text-white"><span>{b.tenantName}</span><span>₱{b.amount.toLocaleString()}</span></div>
                      <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{b.propertyTitle} - Room {b.roomNumber}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Property Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propertyPerformance.map((p) => (
            <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between mb-3"><h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3><span className="text-xs font-bold text-green-600">{p.occupancyRate}%</span></div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-3"><div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${p.occupancyRate}%` }} /></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Rooms: {p.occupiedRooms}/{p.totalRooms}</span>
                {!isCaretaker && <span>Rev: ₱{p.actualRevenue?.toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
