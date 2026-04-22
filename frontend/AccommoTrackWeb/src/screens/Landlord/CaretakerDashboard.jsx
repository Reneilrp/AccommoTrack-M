import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, XCircle, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import CaretakerStats from './components/Caretaker/CaretakerStats';
import CaretakerActivities from './components/Caretaker/CaretakerActivities';
import OperationalAlerts from './components/Caretaker/OperationalAlerts';
import UpcomingCheckouts from './components/Caretaker/UpcomingCheckouts';
import PropertyPerformance from './components/Caretaker/PropertyPerformance';

export default function CaretakerDashboard() {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.caretaker_dashboard || cacheManager.get('caretaker_dashboard');

  const [stats, setStats] = useState(cachedData?.stats || null);
  const [activities, setActivities] = useState(cachedData?.activities || []);
  const [upcomingCheckouts, setUpcomingCheckouts] = useState(cachedData?.upcomingCheckouts || []);
  const [propertyPerformance, setPropertyPerformance] = useState(cachedData?.propertyPerformance || []);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState('');
  const initialLoadRef = useRef(!cachedData);

  const fetchDashboardData = useCallback(async () => {
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

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'medium': return 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      default: return 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-700';
    }
  };

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto py-8 animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
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
        <p className="text-gray-500 dark:text-gray-400 max-w-md">You don't have any properties assigned to your account. Contact your landlord for access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Caretaker Dashboard</h1>
            <p className="text-sm text-gray-500">Overview of your assigned properties and daily tasks.</p>
         </div>
         <button onClick={fetchDashboardData} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
         </button>
      </div>

      <CaretakerStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CaretakerActivities 
            activities={activities} 
            formatDate={formatDate} 
            getActivityColor={() => 'bg-green-100 text-green-600'}
            getStatusColor={() => 'bg-blue-100 text-blue-600'}
          />
        </div>

        <div className="space-y-8">
          <OperationalAlerts stats={stats} />
          <UpcomingCheckouts checkouts={upcomingCheckouts} getUrgencyColor={getUrgencyColor} />
        </div>
      </div>

      <PropertyPerformance performance={propertyPerformance} />
    </div>
  );
}