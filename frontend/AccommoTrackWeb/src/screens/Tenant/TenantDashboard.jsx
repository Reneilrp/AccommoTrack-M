import React, { useState, useEffect } from 'react';
import { tenantService } from '../../services/tenantService';
import { getImageUrl } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { SkeletonCurrentStay, Skeleton, SkeletonStatCard } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';
import { ChevronRight, Home, Calendar, Search, Wallet, Wrench, AlertCircle, MessageSquare } from 'lucide-react';

const TenantDashboard = () => {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  
  // Use cached data from UIState if available
  const cachedData = uiState.data.dashboard;
  
  const [loading, setLoading] = useState(!cachedData);
  const [stayData, setStayData] = useState(cachedData?.stayData || null);
  const [stats, setStats] = useState(cachedData?.stats || null);

  const fetchDashboardData = async () => {
    try {
      // Only set loading true if we have no cached data
      if (!cachedData) setLoading(true);
      
      const [currentStay, dashboardStats] = await Promise.all([
        tenantService.getCurrentStay(),
        tenantService.getDashboardStats()
      ]);
      
      setStayData(currentStay);
      setStats(dashboardStats);
      
      // Update the global UI State for instant mount next time
      updateData('dashboard', { stayData: currentStay, stats: dashboardStats });
      
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleFocusRefresh = () => {
      fetchDashboardData();
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
      }
    };

    const handleNotificationRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('accommo:tenant-data-refresh', handleNotificationRefresh);

    return () => {
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('accommo:tenant-data-refresh', handleNotificationRefresh);
    };
  }, []);

  // Helper to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Skeleton for dashboard loading state
  if (loading) {
    return (
      <div className="space-y-6 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonCurrentStay />
          </div>
          <div className="space-y-6">
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        </div>
      </div>
    );
  }

  const hasActiveStays = stayData?.stays && stayData.stays.length > 0;

  // Calculate Total Monthly Rent across all active stays
  const totalMonthlyRent = hasActiveStays 
    ? stayData.stays.reduce((total, stay) => total + (stay.booking?.monthlyRent || stay.booking?.monthly_rent || 0), 0)
    : 0;

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto">
      {/* Top Row: Global Metrics (Matching Mobile's primary 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Room Card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 mb-2">
            <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {hasActiveStays 
              ? stayData.stays.map(s => s.room?.roomNumber || s.room?.room_number).join(', ')
              : 'None'}
          </p>
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Current Room(s)</p>
        </div>

        {/* Days Stayed Card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 mb-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stayData?.hasActiveStay ? (stayData.booking?.daysStayed ?? 0) : '0'}
          </p>
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Days Stayed</p>
        </div>

        {/* Monthly Rent Card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 mb-2">
            <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalMonthlyRent)}
          </p>
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Total Monthly Rent</p>
        </div>

        {/* Outstanding Due Card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className={`text-2xl font-bold ${stats?.payments?.monthlyDue > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(stats?.payments?.monthlyDue || 0)}
          </p>
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Outstanding Due</p>
        </div>
      </div>

      {/* Middle Area: The "My Stays" Hub */}
      <div className="space-y-6">
        {hasActiveStays ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stayData.stays.map((stay) => (
              <div
                key={stay.booking.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/bookings')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate('/bookings');
                  }
                }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/60"
              >
                {/* Property Image and Overlay */}
                <div className="relative h-52">
                  <img 
                    src={stay.property?.image || getImageUrl(stay.property?.image_url) || 'https://via.placeholder.com/800x400'} 
                    alt="Property" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4">
                    <h2 className="text-xl font-bold text-white">{stay.property?.title}</h2>
                    <p className="text-sm text-gray-200">{stay.property?.address || stay.property?.full_address}</p>
                  </div>
                </div>

                {/* Property Content */}
                <div className="p-4">
                  {/* Landlord Section */}
                  <div className="flex items-center gap-3">
                    <img
                      src={getImageUrl(stay.landlord?.profile_image) || `https://ui-avatars.com/api/?name=${stay.landlord?.name}&background=random`}
                      alt={stay.landlord?.name}
                      className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-600 object-cover shadow"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Property Manager</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {stay.landlord?.name || 'Landlord'}
                      </p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate('/messages', { state: { startConversation: true, recipient: { id: stay.landlord?.id, name: stay.landlord?.name }, property: { id: stay.property?.id, title: stay.property?.title || stay.property?.name } } });
                      }}
                      className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Zero-State Main Card */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <Home className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ready to find your new home?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              You don't have an active stay yet. Browse our verified properties and find the perfect room for your needs.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Explore Properties
            </button>
          </div>
        )}

        {/* Bottom Alerts/Notifications */}
        <div className="space-y-3">
          {stayData?.upcomingBooking && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-blue-800/50 p-2 rounded-lg shadow-sm">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-100 tracking-tight">Upcoming Stay at {stayData.upcomingBooking.property}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mt-0.5">
                    Begins on {new Date(stayData.upcomingBooking.startDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/bookings')}
                className="text-xs bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-bold px-4 py-2 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800 hover:bg-blue-50 transition-colors"
              >
                View
              </button>
            </div>
          )}

          {stats?.payments?.monthlyDue > 0 && (
             <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-red-800/50 p-2 rounded-lg shadow-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-100 tracking-tight">Outstanding Balance Due</p>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium mt-0.5">
                    You have an unpaid balance of {formatCurrency(stats?.payments?.monthlyDue)}.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (stats?.payments?.latestUnpaidInvoiceId) {
                    navigate(`/checkout/${stats.payments.latestUnpaidInvoiceId}`);
                  } else {
                    navigate('/payments');
                  }
                }}
                className="text-xs bg-white dark:bg-gray-800 text-red-700 dark:text-red-300 font-bold px-4 py-2 rounded-lg shadow-sm border border-red-100 dark:border-red-800 hover:bg-red-50 transition-colors"
              >
                Pay Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
