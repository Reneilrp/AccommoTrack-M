import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Calendar,
  Building2,
  Users,
  Wrench,
  PlusCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function CaretakerDashboard({ user }) {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.caretaker_dashboard || cacheManager.get('caretaker_dashboard');

  const [stats, setStats] = useState(cachedData?.stats || null);
  const [activities, setActivities] = useState(cachedData?.activities || []);
  const [upcomingCheckouts, setUpcomingCheckouts] = useState(cachedData?.upcomingCheckouts || []);
  const [propertyPerformance, setPropertyPerformance] = useState(cachedData?.propertyPerformance || []);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5" />;
      case 'room': return <Home className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Syncing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-green-200 dark:shadow-none">
        <h1 className="text-3xl font-black mb-2">Welcome back, {user?.first_name}!</h1>
        <p className="text-green-50 text-sm opacity-90">Here is what's happening at your assigned properties today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats?.properties?.total || 0}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Properties Managed</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Home className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats?.rooms?.occupancyRate}%</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Current Occupancy</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats?.bookings?.pending || 0}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Pending Bookings</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Wrench className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{stats?.requests?.maintenance || 0}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Maintenance Requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Recent Activities</h2>
            <Link to="/bookings" className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium italic">No recent activities to show</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {activities.slice(0, 5).map((activity, idx) => (
                  <div key={idx} className="p-6 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{activity.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(activity.timestamp)}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black uppercase">
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-8">
          {/* Addon Requests Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-gray-900 dark:text-white px-2">Operational Alerts</h2>
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg text-white"><PlusCircle className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-purple-900 dark:text-purple-300">Addon Requests</span>
                </div>
                <span className="text-lg font-black text-purple-600">{stats?.requests?.addons || 0}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-600 rounded-lg text-white"><Clock className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-red-900 dark:text-red-300">Upcoming Checkouts</span>
                </div>
                <span className="text-lg font-black text-red-600">{upcomingCheckouts.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Property Overview */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-gray-900 dark:text-white px-2">Property Status</h2>
            <div className="space-y-3">
              {propertyPerformance.slice(0, 3).map((p) => (
                <div key={p.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">{p.title}</span>
                    <span className="text-xs font-black text-green-600">{p.occupancyRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${p.occupancyRate}%` }} 
                    />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">
                    {p.occupiedRooms} / {p.totalRooms} Rooms Occupied
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
