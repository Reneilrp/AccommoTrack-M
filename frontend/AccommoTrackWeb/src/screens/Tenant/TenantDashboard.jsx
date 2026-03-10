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
  const [selectedStayIndex, setSelectedStayIndex] = useState(0);

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
    if (!startDate) return 0;
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

  const hasActiveStays = stayData?.stays && stayData.stays.length > 0;
  const currentStay = hasActiveStays ? (stayData.stays[selectedStayIndex] || stayData.stays[0]) : null;

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
        {hasActiveStays ? (
          <>
            {/* Stay Selector for Multi-stay */}
            {stayData.stays.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {stayData.stays.map((stay, idx) => (
                  <button
                    key={stay.booking.id}
                    onClick={() => setSelectedStayIndex(idx)}
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border transition-all whitespace-nowrap shadow-sm ${
                      selectedStayIndex === idx
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${selectedStayIndex === idx ? 'bg-white' : 'bg-green-500'}`} />
                    <span className="text-sm font-bold">{stay.property?.title} <span className="opacity-60 font-normal ml-1">Rm {stay.room?.roomNumber || stay.room?.room_number}</span></span>
                  </button>
                ))}
              </div>
            )}

            {/* Horizontal Property Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row">
              {/* Left Side: Image */}
              <div className="md:w-1/3 h-48 md:h-auto relative">
                <img 
                  src={currentStay.property?.image || getImageUrl(currentStay.property?.image_url) || 'https://via.placeholder.com/800x400'} 
                  alt="Property" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden flex items-end p-4">
                   <h2 className="text-xl font-bold text-white tracking-tight leading-tight drop-shadow-md">{currentStay.property?.title}</h2>
                </div>
              </div>
              
              {/* Right Side: Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="p-6">
                  <div className="hidden md:flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{currentStay.property?.title}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentStay.property?.address || currentStay.property?.full_address}</p>
                    </div>
                    <button 
                      onClick={() => navigate(`/property/${currentStay.property?.id}`)}
                      className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </div>

                  {/* Specific Stats Row */}
                  <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 border-gray-100 dark:border-gray-700 pt-4 md:pt-0">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {currentStay.room?.roomNumber || currentStay.room?.room_number}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{currentStay.room?.roomType || currentStay.room?.type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Days Stayed</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {calculateDaysStayed(currentStay.booking?.startDate || currentStay.booking?.start_date)}
                      </p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rent</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(currentStay.booking?.monthlyRent || currentStay.booking?.monthly_rent)}
                      </p>
                      <p className="text-xs text-gray-500">/ mo</p>
                    </div>
                  </div>
                </div>

                {/* Footer (Landlord) */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={getImageUrl(currentStay.landlord?.profile_image) || `https://ui-avatars.com/api/?name=${currentStay.landlord?.name}&background=random`}
                      alt={currentStay.landlord?.name}
                      className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 object-cover"
                    />
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none">Property Manager</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mt-0.5">{currentStay.landlord?.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/messages', { 
                      state: { 
                        startConversation: { 
                          recipient_id: currentStay.landlord?.id, 
                          property_id: currentStay.property?.id 
                        } 
                      } 
                    })}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    Message
                  </button>
                </div>
              </div>
            </div>
          </>
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
