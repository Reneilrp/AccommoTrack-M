import React, { useState } from 'react';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('month');

  const stats = {
    totalRevenue: 127500,
    occupancyRate: 75,
    averageStayDuration: 3.5,
    newTenants: 8
  };

  const revenueData = [
    { month: 'Jan', revenue: 95000 },
    { month: 'Feb', revenue: 105000 },
    { month: 'Mar', revenue: 115000 },
    { month: 'Apr', revenue: 108000 },
    { month: 'May', revenue: 120000 },
    { month: 'Jun', revenue: 127500 }
  ];

  const roomPerformance = [
    { type: 'Single Room', occupied: 8, total: 10, revenue: 45000 },
    { type: 'Double Room', occupied: 6, total: 8, revenue: 36000 },
    { type: 'Quad Room', occupied: 3, total: 4, revenue: 21000 }
  ];

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
  const minRevenue = Math.min(...revenueData.map(d => d.revenue));

  // Bar height calculation
  const calculateBarHeight = (revenue) => {
    const range = maxRevenue - minRevenue;
    const normalizedHeight = range === 0 ? 50 : ((revenue - minRevenue) / range) * 80 + 20;
    return Math.max(normalizedHeight, 25);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">Track your dormitory performance and insights</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${timeRange === 'week' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${timeRange === 'month' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Month
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${timeRange === 'year' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Year
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-green-600 text-sm font-semibold">↑ 12%</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">₱{stats.totalRevenue.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-green-600 text-sm font-semibold">↑ 5%</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Occupancy Rate</p>
            <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-gray-600 text-sm font-semibold">months</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Avg Stay Duration</p>
            <p className="text-2xl font-bold text-gray-900">{stats.averageStayDuration}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <span className="text-green-600 text-sm font-semibold">↑ 3</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">New Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{stats.newTenants}</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue Trend</h2>
          <div className="h-64 relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-500 py-2">
              <span>₱{maxRevenue.toLocaleString()}</span>
              <span>₱{Math.round((maxRevenue * 0.75)).toLocaleString()}</span>
              <span>₱{Math.round((maxRevenue * 0.5)).toLocaleString()}</span>
              <span>₱{Math.round((maxRevenue * 0.25)).toLocaleString()}</span>
              <span>₱0</span>
            </div>

            <div className="ml-16 flex justify-between h-full gap-3 border-b border-gray-300 pb-2">
              {revenueData.map((data, index) => {
                const height = calculateBarHeight(data.revenue);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end h-full"> {/* CHANGED: Added justify-end */}
                    <div
                      className="w-full bg-green-500 rounded-t-lg hover:bg-green-600 transition-all cursor-pointer relative group"
                      style={{ height: `${height}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ₱{data.revenue.toLocaleString()}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 font-medium">{data.month}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Room Performance</h2>
          <div className="space-y-4">
            {roomPerformance.map((room, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{room.type}</h3>
                    <p className="text-sm text-gray-500">
                      {room.occupied} of {room.total} occupied
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">₱{room.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Monthly revenue</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(room.occupied / room.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {Math.round((room.occupied / room.total) * 100)}% occupancy rate
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-sm p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Top Performing Room</h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold">Single Room</p>
              <p className="text-green-100">80% occupancy • ₱45,000 revenue</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Payment Collection</h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold">92%</p>
              <p className="text-blue-100">On-time payment rate this month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}