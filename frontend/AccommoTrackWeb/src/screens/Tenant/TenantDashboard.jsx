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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      {/* Top Row: Global Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-green-600" />
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Rooms</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stayData?.stays?.length || 0}</p>
            {stayData?.upcomingBooking && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full shadow-sm">
                +1 Upcoming
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-purple-600" />
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Rent / mo</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalMonthlyRent)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outstanding Due</p>
          </div>
          <p className={`text-2xl font-bold ${stats?.payments?.monthlyDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(stats?.payments?.monthlyDue || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lifetime Paid</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats?.payments?.totalPaid || 0)}
          </p>
        </div>
      </div>

      {/* Middle Area: The "My Stays" Hub */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white px-1">My Active Stays</h3>
        
        {hasActiveStays ? (
          <div className={`grid gap-6 ${stayData.stays.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {stayData.stays.map((stay) => (
              <div key={stay.booking.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
                {/* Top: Image */}
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={stay.property?.image || getImageUrl(stay.property?.image_url) || 'https://via.placeholder.com/800x400'} 
                    alt="Property" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-white tracking-tight leading-tight">{stay.property?.title}</h2>
                      <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{stay.property?.address || stay.property?.full_address}</p>
                    </div>
                    <div className="bg-green-600 px-3 py-1 rounded-full shadow-lg shadow-green-900/40 border border-green-500/50">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">Active</p>
                    </div>
                  </div>
                </div>
                
                {/* Middle: Details */}
                <div className="p-5 flex-1 space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <Home className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Room</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mt-0.5">
                          {stay.room?.roomNumber || stay.room?.room_number}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/property/${stay.property?.id}`)}
                      className="text-green-600 dark:text-green-400 hover:text-green-700 text-xs font-bold transition-colors"
                    >
                      View Property
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="bg-gray-50/50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Days Stayed</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white">
                        {stay.booking?.daysStayed ?? 0}
                      </p>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Rent</p>
                      <p className="text-lg font-black text-green-600 dark:text-green-400">
                        {formatCurrency(stay.booking?.unit_price || stay.booking?.monthlyRent || stay.booking?.monthly_rent)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer: Manager */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={getImageUrl(stay.landlord?.profile_image) || `https://ui-avatars.com/api/?name=${stay.landlord?.name}&background=random`}
                      alt={stay.landlord?.name}
                      className="w-8 h-8 rounded-full border border-white dark:border-gray-600 object-cover shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Property Manager</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {stay.landlord?.name || 'Landlord'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/messages', { 
                      state: { 
                        startConversation: true,
                        recipient: { 
                          id: stay.landlord?.id,
                          name: stay.landlord?.name
                        }, 
                        property: { 
                          id: stay.property?.id,
                          title: stay.property?.title || stay.property?.name
                        } 
                      } 
                    })}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <MessageSquare className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Send Message</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Zero-State Main Card */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Home className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Ready to find your new home?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto font-medium">
              You don't have an active stay yet. Browse our verified properties and find the perfect room for your needs.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md shadow-green-600/20 active:scale-95"
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
                onClick={() => navigate('/payments')}
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
