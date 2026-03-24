import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Calendar,
  Building2,
  AlertCircle,
  Clock,
  Wrench,
  PlusCircle,
  FileWarning,
  ShieldAlert,
  XCircle,
  Loader2,
} from 'lucide-react';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function CaretakerDashboard({ __user }) {
  const __navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.caretaker_dashboard || cacheManager.get('caretaker_dashboard');

  const [stats, setStats] = useState(cachedData?.stats || null);
  const [activities, setActivities] = useState(cachedData?.activities || []);
  const [upcomingCheckouts, setUpcomingCheckouts] = useState(cachedData?.upcomingCheckouts || []);
  const [propertyPerformance, setPropertyPerformance] = useState(cachedData?.propertyPerformance || []);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState('');
  const initialLoadRef = React.useRef(!cachedData);

  const fetchVerificationStatus = React.useCallback(async () => {
    try {
      const res = await api.get('/landlord/my-verification');
      setVerificationStatus(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setVerificationStatus({ status: 'not_submitted' });
      }
    }
  }, []);

  const fetchDashboardData = React.useCallback(async () => {
    try {
      if (initialLoadRef.current) setLoading(true);
      initialLoadRef.current = false;
      setError('');

      const [statsRes, activitiesRes, paymentsRes, performanceRes] = await Promise.all([
        api.get('/landlord/dashboard/stats'),
        api.get('/landlord/dashboard/recent-activities'),
        api.get('/landlord/dashboard/upcoming-payments'),
        api.get('/landlord/dashboard/property-performance')
      ]);

      const statsData = statsRes.data;
      const activitiesData = activitiesRes.data;
      const upcomingCheckoutsData = paymentsRes.data.upcomingCheckouts || [];
      const performanceData = performanceRes.data;

      setStats(statsData);
      setActivities(activitiesData);
      setUpcomingCheckouts(upcomingCheckoutsData);
      setPropertyPerformance(performanceData);

      const dashboardState = {
        stats: statsData,
        activities: activitiesData,
        upcomingCheckouts: upcomingCheckoutsData,
        propertyPerformance: performanceData
      };

      updateData('caretaker_dashboard', dashboardState);
      cacheManager.set('caretaker_dashboard', dashboardState);

    } catch (err) {
      console.error('Error fetching caretaker dashboard data:', err);
      setError('Failed to sync with latest data');
    } finally {
      setLoading(false);
    }
  }, [updateData]);

  useEffect(() => {
    fetchDashboardData();
    fetchVerificationStatus();
  }, [fetchDashboardData, fetchVerificationStatus]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5" />;
      case 'room': return <Home className="w-5 h-5" />;
      case 'maintenance': return <Wrench className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getActivityColor = (color) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      case 'red': return 'bg-red-100 text-red-600';
      case 'gray': return 'bg-gray-100 text-gray-600';
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

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto py-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-32 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="space-y-2">
                <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm h-96 flex flex-col gap-4">
            <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm h-96 flex flex-col gap-4">
            <div className="w-40 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            {[...Array(4)].map((_, k) => (
              <div key={k} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <p className="text-red-600 text-lg font-semibold mb-2">Error loading dashboard</p>
        <button onClick={fetchDashboardData} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Retry</button>
      </div>
    );
  }

  if (!loading && (!stats?.properties?.total || stats.properties.total === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
          <Building2 className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">No Properties Assigned</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You don't have any properties assigned to your caretaker account. Please contact the landlord to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Banner (Landlord Status) */}
      {verificationStatus && verificationStatus.status !== 'approved' && (
        <div className={`rounded-xl border p-4 ${
          verificationStatus.status === 'rejected' ? 'bg-red-50 border-red-200' : 
          verificationStatus.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {verificationStatus.status === 'rejected' ? <FileWarning className="w-6 h-6 text-red-600" /> : 
               verificationStatus.status === 'pending' ? <Clock className="w-6 h-6 text-yellow-600" /> : <ShieldAlert className="w-6 h-6 text-orange-600" />}
              <div>
                <h3 className="font-semibold text-gray-900">Landlord Account Status: {verificationStatus.status.replace('_', ' ').toUpperCase()}</h3>
                <p className="text-sm text-gray-600">The landlord's account is currently being verified. Some features may be restricted.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Building2 className="w-6 h-6 text-blue-600" /></div>
            <span className="text-xs text-green-600 font-medium">{stats?.properties.active}/{stats?.properties.total} Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.properties.total}</p>
          <p className="text-sm text-gray-500">Assigned Properties</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><Home className="w-6 h-6 text-green-600" /></div>
            <span className="text-xs text-blue-600 font-medium">{stats?.rooms.occupancyRate}% Occupied</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.rooms.total}</p>
          <p className="text-sm text-gray-500">{stats?.rooms.occupied} Occupied · {stats?.rooms.available} Available</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Calendar className="w-6 h-6 text-purple-600" /></div>
            {stats?.bookings.pending > 0 && <span className="text-xs text-yellow-600 font-medium">{stats?.bookings.pending} Pending</span>}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats?.bookings.pending || 0) + (stats?.bookings.confirmed || 0)}</p>
          <p className="text-sm text-gray-500">Bookings (Confirmed & Pending)</p>
        </div>
      </div>

      {/* Activities and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-400/50 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {activities.length === 0 ? <p className="text-center py-8 text-gray-500 italic">No recent activities</p> : 
              activities.slice(0, 6).map((activity, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.color)}`}>{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{formatDate(activity.timestamp)}</p>
                  </div>
                  <span className={`px-2 py-2 text-xs font-medium rounded-full capitalize ${getActivityColor(activity.color)}`}>{activity.status}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="space-y-6">
          {/* Operational Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Operational Alerts</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-600 rounded-lg text-white"><PlusCircle className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-purple-900 dark:text-purple-300">Addon Requests</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{stats?.requests?.addons || 0}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-600 rounded-lg text-white"><Wrench className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-orange-900 dark:text-orange-300">Maintenance</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{stats?.requests?.maintenance || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upcoming Checkouts</h2>
            <div className="space-y-4">
              {upcomingCheckouts.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">None scheduled</p> :
                upcomingCheckouts.slice(0, 4).map((c) => (
                  <div key={c.id} className={`p-4 rounded-lg border ${getUrgencyColor(c.urgency)}`}>
                    <div className="flex justify-between font-semibold text-sm text-gray-900 dark:text-white"><span>{c.tenantName}</span><span>{c.daysLeft}d</span></div>
                    <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{c.propertyTitle} - Room {c.roomNumber}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Property Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Property Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propertyPerformance.map((p) => (
            <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between mb-4"><h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3><span className="text-xs font-bold text-green-600">{p.occupancyRate}%</span></div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-4"><div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${p.occupancyRate}%` }} /></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Rooms: {p.occupiedRooms}/{p.totalRooms}</span>
                <span className="capitalize">{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
