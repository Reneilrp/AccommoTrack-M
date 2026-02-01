import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';
import { getImageUrl } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import { SkeletonCurrentStay, Skeleton, SkeletonStatCard } from '../../../components/Shared/Skeleton';

const TenantDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stayData, setStayData] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [currentStay, dashboardStats] = await Promise.all([
        tenantService.getCurrentStay(),
        tenantService.getDashboardStats()
      ]);
      setStayData(currentStay);
      setStats(dashboardStats);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
        </div>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
      </div>

      {/* Active Stay Section */}
      {stayData?.hasActiveStay ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Card - Current Room */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="relative h-48">
              <img 
                src={getImageUrl(stayData.property?.images?.[0]?.image_url) || 'https://via.placeholder.com/800x400'} 
                alt="Property" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white w-full">
                  <h2 className="text-2xl font-bold">{stayData.property?.title}</h2>
                  <p className="text-white/90">{stayData.property?.address}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-brand-50 p-4 rounded-lg border border-brand-100">
                  <p className="text-sm text-brand-600 font-medium uppercase tracking-wider">Current Room</p>
                  <p className="text-2xl font-bold text-brand-900 mt-1">
                    {stayData.room?.room_number}
                  </p>
                  <p className="text-xs text-brand-700 mt-1 capitalize">{stayData.room?.type}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">Days Stayed</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {calculateDaysStayed(stayData.booking?.start_date)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Since {new Date(stayData.booking?.start_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <p className="text-sm text-purple-600 font-medium uppercase tracking-wider">Monthly Rent</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {formatCurrency(stayData.booking?.monthly_rent)}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">Due on {stayData.booking?.due_day}th of month</p>
                </div>
              </div>

              {/* Landlord Info */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6">
                <img
                  src={getImageUrl(stayData.landlord?.profile_image) || `https://ui-avatars.com/api/?name=${stayData.landlord?.name}&background=random`}
                  alt={stayData.landlord?.name}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Property Manager</p>
                  <p className="text-base font-bold text-gray-800">{stayData.landlord?.name}</p>
                </div>
                <button
                  onClick={() => navigate('/messages')}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>

          {/* Side Card - Quick Stats */}
          <div className="space-y-6">
            {/* Payment Status */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Payment Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <span className="text-gray-600">Pending Due</span>
                  <span className="font-bold text-red-600">{formatCurrency(stats?.payments?.monthlyDue || 0)}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="font-bold text-green-600">{formatCurrency(stats?.payments?.totalPaid || 0)}</span>
                </div>
                <button 
                  onClick={() => navigate('/wallet')}
                  className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                >
                  View Wallet
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate(`/property/${stayData.property?.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-gray-700">View Property Details</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button 
                  onClick={() => navigate('/bookings')}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-gray-700">Booking History</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Empty State
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Stay</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You don't have any active bookings at the moment. Explore our properties to find your next home.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm"
          >
            Explore Properties
          </button>

          {stayData?.upcomingBooking && (
            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-lg mx-auto text-left flex items-start gap-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-blue-900">Upcoming Stay Available</p>
                <p className="text-sm text-blue-700 mt-1">
                  You have a booking at <strong>{stayData.upcomingBooking.property}</strong> starting on {new Date(stayData.upcomingBooking.startDate).toLocaleDateString()}.
                </p>
                <button 
                  onClick={() => navigate('/bookings')}
                  className="text-sm text-blue-800 font-semibold mt-2 hover:underline"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TenantDashboard;