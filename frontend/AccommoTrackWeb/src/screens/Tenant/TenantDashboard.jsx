import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { tenantService } from '../../services/tenantService';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import DashboardStats from './components/Dashboard/DashboardStats';
import DashboardActivities from './components/Dashboard/DashboardActivities';
import CurrentStayCard from './components/Dashboard/CurrentStayCard';
import { Skeleton } from '../../components/Shared/Skeleton';

export default function TenantDashboard() {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.tenant_dashboard || cacheManager.get('tenant_dashboard');

  const [stats, setStats] = useState(cachedData?.stats || null);
  const [activities, setActivities] = useState(cachedData?.activities || []);
  const [activeStay, setActiveStay] = useState(cachedData?.activeStay || null);
  const [loading, setLoading] = useState(!cachedData);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const [statsRes, activitiesRes, staysRes] = await Promise.all([
      tenantService.getDashboardStats(),
      tenantService.getActivities(),
      tenantService.getActiveStays()
    ]);

    if (statsRes.success) setStats(statsRes.data);
    if (activitiesRes.success) setActivities(activitiesRes.data);
    if (staysRes.success && staysRes.data.length > 0) setActiveStay(staysRes.data[0]);

    const dashboardState = {
      stats: statsRes.data,
      activities: activitiesRes.data,
      activeStay: staysRes.data?.[0] || null
    };

    updateData('tenant_dashboard', dashboardState);
    cacheManager.set('tenant_dashboard', dashboardState);
    setLoading(false);
  }, [updateData]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto py-8 animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
          <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
             Welcome back!
             <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
           </h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Here is what's happening with your stay.</p>
        </div>
        <button onClick={fetchDashboardData} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <section>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Current Residence</h2>
              {activeStay ? (
                <CurrentStayCard stay={activeStay} onDetails={() => navigate('/bookings')} />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm group cursor-pointer hover:border-green-200 transition-all" onClick={() => navigate('/explore')}>
                   <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4 group-hover:text-green-500 transition-colors" />
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white">No active stay</h3>
                   <p className="text-sm text-gray-500 mt-1">Find your next perfect place in the explore page.</p>
                </div>
              )}
           </section>
        </div>

        <aside className="h-full">
           <DashboardActivities activities={activities} onSeeAll={() => navigate('/notifications')} />
        </aside>
      </div>
    </div>
  );
}