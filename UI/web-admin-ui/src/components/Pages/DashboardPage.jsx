import React, { useState } from 'react';

export default function DashboardPage({ user }) {
  // Sample data - replace with API calls later
  const [stats] = useState({
    totalRooms: 12,
    occupied: 9,
    available: 3,
    monthlyRevenue: 42500,
    pendingPayments: 3
  });

  const [recentActivities] = useState([
    { 
      id: 1,
      type: 'payment', 
      title: 'Payment received from John Doe',
      subtitle: 'Room 101 • 2 hours ago',
      amount: '₱5,000',
      icon: 'check',
      color: 'green'
    },
    { 
      id: 2,
      type: 'inquiry', 
      title: 'New tenant inquiry',
      subtitle: 'Sarah Williams • 5 hours ago',
      icon: 'user',
      color: 'blue'
    },
    { 
      id: 3,
      type: 'maintenance', 
      title: 'Maintenance request',
      subtitle: 'Room 203 • 1 day ago',
      icon: 'alert',
      color: 'yellow'
    },
    { 
      id: 4,
      type: 'booking', 
      title: 'New booking confirmed',
      subtitle: 'Room 305 • 2 days ago',
      icon: 'calendar',
      color: 'purple'
    }
  ]);

  const [upcomingPayments] = useState([
    { tenant: 'John Doe', room: '101', amount: '₱5,000', dueDate: 'Nov 15' },
    { tenant: 'Jane Smith', room: '204', amount: '₱6,500', dueDate: 'Nov 18' },
    { tenant: 'Mike Johnson', room: '308', amount: '₱5,500', dueDate: 'Nov 20' }
  ]);

  const getActivityIcon = (type, color) => {
    const colors = {
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600'
    };

    const icons = {
      check: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      user: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      alert: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      calendar: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    };

    return (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors[color]}`}>
        {icons[type]}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 text-sm mt-1">Welcome back, {user?.first_name}! Here's your property overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Rooms */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Rooms</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalRooms}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Occupied */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Occupied</p>
              <p className="text-3xl font-bold text-green-600">{stats.occupied}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Monthly Revenue</p>
              <p className="text-3xl font-bold text-blue-600">₱{stats.monthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pending Payments</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingPayments}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                {getActivityIcon(activity.icon, activity.color)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.subtitle}</p>
                </div>
                {activity.amount && (
                  <span className="text-sm font-semibold text-green-600">{activity.amount}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Payments</h2>
          <div className="space-y-3">
            {upcomingPayments.map((payment, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{payment.tenant}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Room {payment.room}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-green-600">{payment.amount}</p>
                  <p className="text-xs text-gray-500">Due {payment.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
            View All Payments
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
            <svg className="w-8 h-8 text-gray-400 group-hover:text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-semibold text-gray-700 group-hover:text-green-600">Add Room</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
            <svg className="w-8 h-8 text-gray-400 group-hover:text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm font-semibold text-gray-700 group-hover:text-green-600">Add Tenant</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
            <svg className="w-8 h-8 text-gray-400 group-hover:text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-gray-700 group-hover:text-green-600">View Reports</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
            <svg className="w-8 h-8 text-gray-400 group-hover:text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-semibold text-gray-700 group-hover:text-green-600">Manage Bookings</p>
          </button>
        </div>
      </div>
    </div>
  );
}