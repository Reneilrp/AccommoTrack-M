import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Loader2,
  Building2,
  XCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState({ upcomingCheckouts: [], unpaidBookings: [] });
  const [revenueChart, setRevenueChart] = useState({ labels: [], data: [] });
  const [propertyPerformance, setPropertyPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = '/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, activitiesRes, paymentsRes, chartRes, performanceRes] = await Promise.all([
        fetch(`${API_URL}/landlord/dashboard/stats`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/landlord/dashboard/recent-activities`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/landlord/dashboard/upcoming-payments`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/landlord/dashboard/revenue-chart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/landlord/dashboard/property-performance`, { headers: getAuthHeaders() })
      ]);

      if (!statsRes.ok || !activitiesRes.ok || !paymentsRes.ok || !chartRes.ok || !performanceRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [statsData, activitiesData, paymentsData, chartData, performanceData] = await Promise.all([
        statsRes.json(),
        activitiesRes.json(),
        paymentsRes.json(),
        chartRes.json(),
        performanceRes.json()
      ]);

      setStats(statsData);
      setActivities(activitiesData);
      setUpcomingPayments(paymentsData);
      setRevenueChart(chartData);
      setPropertyPerformance(performanceData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-5 h-5" />;
      case 'room':
        return <Home className="w-5 h-5" />;
      case 'payment':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getActivityColor = (color) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      case 'red':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-semibold mb-2">Error loading dashboard</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Properties */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-green-600 font-medium">
                {stats?.properties.active}/{stats?.properties.total} Active
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.properties.total}</p>
            <p className="text-sm text-gray-500">Total Properties</p>
          </div>

          {/* Total Rooms */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {stats?.rooms.occupancyRate}% Occupied
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.rooms.total}</p>
            <p className="text-sm text-gray-500">
              {stats?.rooms.occupied} Occupied · {stats?.rooms.available} Available
            </p>
          </div>

          {/* Active Tenants */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-yellow-600 font-medium">
                {stats?.bookings.pending} Pending
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.tenants.active}</p>
            <p className="text-sm text-gray-500">Active Tenants</p>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-green-600 font-medium">
                <TrendingUp className="w-4 h-4 inline" />
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats?.revenue.monthly.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Monthly Revenue</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activities</h2>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activities</p>
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.color)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        activity.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        activity.status === 'available' ? 'bg-green-100 text-green-800' :
                        activity.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Checkouts & Payments */}
          <div className="space-y-6">
            {/* Upcoming Checkouts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Checkouts</h2>
              <div className="space-y-3">
                {upcomingPayments.upcomingCheckouts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming checkouts</p>
                ) : (
                  upcomingPayments.upcomingCheckouts.slice(0, 5).map((checkout) => (
                    <div key={checkout.id} className={`p-3 rounded-lg border ${getUrgencyColor(checkout.urgency)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">{checkout.tenantName}</p>
                        <span className="text-xs font-medium">{checkout.daysLeft} days</span>
                      </div>
                      <p className="text-xs text-gray-600">{checkout.propertyTitle} - Room {checkout.roomNumber}</p>
                      <p className="text-xs text-gray-500 mt-1">{checkout.endDate}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Unpaid Bookings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Unpaid Bookings</h2>
              <div className="space-y-3">
                {upcomingPayments.unpaidBookings.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">All payments up to date!</p>
                ) : (
                  upcomingPayments.unpaidBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900">{booking.tenantName}</p>
                        <span className="text-xs font-bold text-red-600">₱{booking.amount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-600">{booking.propertyTitle} - Room {booking.roomNumber}</p>
                      <span className="text-xs text-red-600 font-medium capitalize">{booking.paymentStatus}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Property Performance */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Property Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertyPerformance.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No properties yet</p>
              </div>
            ) : (
              propertyPerformance.map((property) => (
                <div key={property.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{property.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      property.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Occupancy</span>
                      <span className="font-semibold">{property.occupancyRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${property.occupancyRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Occupied</p>
                      <p className="font-semibold text-gray-900">{property.occupiedRooms}/{property.totalRooms}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Revenue</p>
                      <p className="font-semibold text-green-600">₱{property.actualRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}