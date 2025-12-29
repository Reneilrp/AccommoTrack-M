import { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function Analytics({ user }) {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [properties, setProperties] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API = '/api';
  const token = localStorage.getItem('auth_token');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, selectedProperty]);

  const loadProperties = async () => {
    try {
      const response = await fetch(`${API}/landlord/properties`, { headers });
      if (!response.ok) throw new Error('Failed to load properties');
      const data = await response.json();
      setProperties(data);
    } catch (err) {
      console.error('Failed to load properties:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        time_range: timeRange,
        ...(selectedProperty !== 'all' && { property_id: selectedProperty })
      });

      const response = await fetch(`${API}/landlord/analytics/dashboard?${params}`, { headers });
      
      if (!response.ok) throw new Error('Failed to load analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    primary: '#10b981',
    secondary: '#3b82f6',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899'
  };

  const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.warning, COLORS.danger];

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Track your property performance and insights</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Property Filter */}
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Properties</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>

              {/* Time Range */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeRange('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === 'week' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeRange('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === 'month' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setTimeRange('year')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === 'year' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Year
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={loadAnalytics}
                disabled={loading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-philippine-peso-icon lucide-philippine-peso"><path d="M20 11H4"/><path d="M20 7H4"/><path d="M7 21V4a1 1 0 0 1 1-1h4a1 1 0 0 1 0 12H7"/></svg>                  </div>
                  <span className="text-green-600 text-sm font-semibold">
                    {analytics.overview.monthly_revenue > 0 ? '↑' : '→'} 
                    {analytics.revenue.collection_rate}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{analytics.overview.total_revenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ₱{analytics.overview.monthly_revenue.toLocaleString()} this month
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Home className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-blue-600 text-sm font-semibold">
                    {analytics.overview.occupancy_rate}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.overview.occupied_rooms}/{analytics.overview.total_rooms}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.overview.available_rooms} rooms available
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-green-600 text-sm font-semibold">
                    +{analytics.overview.new_tenants_this_month}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Active Tenants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.overview.active_tenants}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  New this month
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-gray-600 text-sm font-semibold">months</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Avg Stay Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.tenants.average_stay_months}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.tenants.move_ins} move-ins, {analytics.tenants.move_outs} move-outs
                </p>
              </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Revenue Trend</h2>
                <div className="text-sm text-gray-500">
                  Expected: ₱{analytics.revenue.expected_monthly.toLocaleString()} • 
                  Collected: ₱{analytics.revenue.actual_monthly.toLocaleString()}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.revenue.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value) => ['₱' + Number(value).toLocaleString(), 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={COLORS.primary} 
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Payment Status</h2>
              {analytics.payments.payment_rate === 0 ? (
                // Ghost Chart: faint, grayed-out healthy chart as a preview
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={[ 
                      { name: 'Paid', value: 20, fill: '#d1d5db' },
                      { name: 'Pending', value: 10, fill: '#e5e7eb' },
                      { name: 'Partial', value: 5, fill: '#c7d2fe' },
                      { name: 'Overdue', value: 2, fill: '#fca5a5' }
                    ]}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis type="number" stroke="#d1d5db" style={{ fontSize: '12px' }} />
                    <YAxis type="category" dataKey="name" stroke="#d1d5db" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#6b7280' }}
                      formatter={(value) => [value, 'Count']}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} opacity={0.4}>
                      {[
                        { name: 'Paid', fill: '#d1d5db' },
                        { name: 'Pending', fill: '#e5e7eb' },
                        { name: 'Partial', fill: '#c7d2fe' },
                        { name: 'Overdue', fill: '#fca5a5' }
                      ].map((entry, index) => (
                        <Cell key={`ghost-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={[ 
                      { name: 'Paid', value: analytics.payments.paid, fill: COLORS.primary },
                      { name: 'Pending', value: analytics.payments.unpaid, fill: COLORS.warning },
                      { name: 'Partial', value: analytics.payments.partial, fill: COLORS.secondary },
                      { name: 'Overdue', value: analytics.payments.overdue, fill: COLORS.danger }
                    ]}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [value, 'Count']}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {[
                        { name: 'Paid', fill: COLORS.primary },
                        { name: 'Pending', fill: COLORS.warning },
                        { name: 'Partial', fill: COLORS.secondary },
                        { name: 'Overdue', fill: COLORS.danger }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{analytics.payments.paid}</p>
                  <p className="text-xs text-gray-600">Paid</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{analytics.payments.unpaid}</p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{analytics.payments.partial}</p>
                  <p className="text-xs text-gray-600">Partial</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{analytics.payments.overdue}</p>
                  <p className="text-xs text-gray-600">Overdue</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Payment Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.payments.payment_rate}%</p>
              </div>
            </div>

            {/* Property Comparison */}
            {selectedProperty === 'all' && analytics.properties.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Property Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.properties}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="occupancy_rate" name="Occupancy %" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="monthly_revenue" name="Revenue (₱)" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-sm p-6 text-white">
                <h3 className="text-lg font-bold mb-4">Top Performing Property</h3>
                <div className="space-y-2">
                  {analytics.properties && analytics.properties[0] ? (
                    <>
                      <p className="text-3xl font-bold">{analytics.properties[0].name}</p>
                      <p className="text-green-100">
                        {analytics.properties[0].occupancy_rate}% occupancy • 
                        ₱{analytics.properties[0].monthly_revenue?.toLocaleString() || 0} revenue
                      </p>
                    </>
                  ) : (
                    <p className="text-green-100">No property data available</p>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm p-6 text-white">
                <h3 className="text-lg font-bold mb-4">Collection Rate</h3>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{analytics.revenue.collection_rate}%</p>
                  <p className="text-blue-100">
                    ₱{analytics.revenue.actual_monthly.toLocaleString()} of 
                    ₱{analytics.revenue.expected_monthly.toLocaleString()} collected
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-sm p-6 text-white">
                <h3 className="text-lg font-bold mb-4">Booking Status</h3>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{analytics.bookings.total}</p>
                  <p className="text-purple-100">
                    {analytics.bookings.confirmed} confirmed • 
                    {analytics.bookings.pending} pending
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}