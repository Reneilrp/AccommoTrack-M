import React, { useState, useEffect } from 'react';
import { tenantService } from '../../services/tenantService';
import { getImageUrl } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { SkeletonCurrentStay, Skeleton, SkeletonStatCard } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';
import { ChevronRight, Home, Calendar, Search, Wallet, Wrench } from 'lucide-react';

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

  const calculateDaysStayed = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    // Include the start day as day 1, using Math.floor to get full days
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays >= 0 ? diffDays : 0; 
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

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-6">
          {stayData?.hasActiveStay ? (
            /* Active Stay Card */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-300 dark:border-gray-700">
              <div className="relative h-48">
                <img 
                  src={getImageUrl(stayData.property?.images?.[0]?.image_url) || 'https://via.placeholder.com/800x400'} 
                  alt="Property" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                  <div className="p-6 text-white w-full">
                    <h2 className="text-2xl font-bold tracking-tight">{stayData.property?.title}</h2>
                    <p className="text-sm text-white/90 font-medium">{stayData.property?.address}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-md">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Current Room</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stayData.room?.room_number}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 capitalize">{stayData.room?.type}</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-md">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Days Stayed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {calculateDaysStayed(stayData.booking?.start_date)}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                      Since {new Date(stayData.booking?.start_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800 shadow-md">
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Monthly Rent</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatCurrency(stayData.booking?.monthly_rent)}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Due on {stayData.booking?.due_day}th of month</p>
                  </div>
                </div>

                {/* Landlord Info */}
                <div className="flex items-center gap-4 pt-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 -mx-6 -mb-6 p-6">
                  <img
                    src={getImageUrl(stayData.landlord?.profile_image) || `https://ui-avatars.com/api/?name=${stayData.landlord?.name}&background=random`}
                    alt={stayData.landlord?.name}
                    className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-600 shadow-sm"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property Manager</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{stayData.landlord?.name}</p>
                  </div>
                  <button
                    onClick={() => navigate('/messages', { 
                      state: { 
                        startConversation: { 
                          recipient_id: stayData.landlord?.id, 
                          property_id: stayData.property?.id 
                        } 
                      } 
                    })}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Zero-State Main Card */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <Home className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Ready to find your new home?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed font-medium">
                You don't have an active stay yet. Browse our verified properties and find the perfect room for your needs.
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="px-8 py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95"
              >
                Explore Properties
              </button>
            </div>
          )}

          {/* Conditional Notification for Upcoming Booking (Shown in both states if exists) */}
          {stayData?.upcomingBooking && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex items-start gap-4 shadow-sm">
              <div className="bg-blue-100 dark:bg-blue-800 p-2.5 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-blue-900 dark:text-blue-100 tracking-tight">Upcoming Stay Available</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 font-medium">
                  Your stay at <strong>{stayData.upcomingBooking.property}</strong> begins on {new Date(stayData.upcomingBooking.startDate).toLocaleDateString()}.
                </p>
                <button 
                  onClick={() => navigate('/bookings')}
                  className="text-sm text-blue-800 dark:text-blue-200 font-bold mt-2 hover:underline inline-flex items-center gap-1"
                >
                  View Booking Details &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
          {/* Top Stats Cards - Mobile/Small Layout (Only shown when NO active stay to fill the gap) */}
          {!stayData?.hasActiveStay && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Current Room</p>
                <p className="text-xl font-bold text-gray-400 dark:text-gray-600 italic">None</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Days Stayed</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">0</p>
              </div>
            </div>
          )}

          {/* Payment Overview */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Payment Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Due</span>
                <span className={`text-base font-bold ${stats?.payments?.monthlyDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                  {formatCurrency(stats?.payments?.monthlyDue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Paid</span>
                <span className="text-base font-bold text-green-600 dark:text-green-400">{formatCurrency(stats?.payments?.totalPaid || 0)}</span>
              </div>
              <button 
                onClick={() => navigate('/wallet')}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-green-600/10 text-sm"
              >
                View Payments
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Quick Actions</h3>
            <div className="space-y-2">
              {stayData?.hasActiveStay && (
                <button 
                  onClick={() => navigate(`/property/${stayData.property?.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-200 font-bold group-hover:text-green-600 transition-colors">Property Details</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                </button>
              )}
              <button 
                onClick={() => navigate('/bookings')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200 font-bold group-hover:text-green-600 transition-colors">Booking History</span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
              </button>
              <button 
                onClick={() => navigate('/maintenance')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200 font-bold group-hover:text-green-600 transition-colors">Maintenance</span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
