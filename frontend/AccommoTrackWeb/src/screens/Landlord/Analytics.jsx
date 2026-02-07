import { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Calendar,
  Download,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../utils/api';
import { SkeletonStatCard, SkeletonChart, Skeleton } from '../../components/Shared/Skeleton';

export default function Analytics({ user }) {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [properties, setProperties] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, selectedProperty]);

  const loadProperties = async () => {
    try {
      const response = await api.get('/landlord/properties');
      setProperties(response.data);
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

      const response = await api.get(`/landlord/analytics/dashboard?${params}`);
      
      setAnalytics(response.data);
    } catch (err) {
      // Handle gracefully - show empty state instead of error
      console.error('Analytics error:', err);
      // Set empty analytics data so UI shows "no properties" state
      setAnalytics(null);
      if (properties.length === 0) {
        setError(null); // No error if no properties - just show empty state
      } else {
        setError('Failed to load analytics data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Download analytics as CSV
  const downloadAnalyticsCSV = () => {
    if (!analytics) return;

    // Use "PHP" instead of ₱ symbol for Excel compatibility
    const formatCurrency = (amount) => `PHP ${Number(amount).toLocaleString()}`;

    const rows = [
      ['AccommoTrack Analytics Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Time Range:', timeRange],
      [''],
      ['=== OVERVIEW ==='],
      ['Total Revenue', formatCurrency(analytics.overview.total_revenue)],
      ['Monthly Revenue', formatCurrency(analytics.overview.monthly_revenue)],
      ['Total Rooms', analytics.overview.total_rooms],
      ['Occupied Rooms', analytics.overview.occupied_rooms],
      ['Available Rooms', analytics.overview.available_rooms],
      ['Occupancy Rate', `${analytics.overview.occupancy_rate}%`],
      ['Active Tenants', analytics.overview.active_tenants],
      ['New Tenants This Month', analytics.overview.new_tenants_this_month],
      [''],
      ['=== PAYMENTS ==='],
      ['Paid', analytics.payments.paid],
      ['Pending', analytics.payments.unpaid],
      ['Partial', analytics.payments.partial],
      ['Overdue', analytics.payments.overdue],
      ['Payment Rate', `${analytics.payments.payment_rate}%`],
      [''],
      ['=== REVENUE TREND ==='],
      ['Month', 'Revenue'],
      ...analytics.revenue.monthly_trend.map(item => [item.month, formatCurrency(item.revenue)]),
      [''],
      ['=== PROPERTIES ==='],
      ['Property Name', 'Occupancy Rate', 'Monthly Revenue'],
      ...analytics.properties.map(p => [p.name, `${p.occupancy_rate}%`, formatCurrency(p.monthly_revenue || 0)]),
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    // Add UTF-8 BOM for Excel to recognize encoding correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
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
  
  // Payment chart data derived from backend analytics if available.
  const paymentCounts = analytics?.payments || null;
  const totalPaymentCount = paymentCounts
    ? (Number(paymentCounts.paid || 0) + Number(paymentCounts.unpaid || 0) + Number(paymentCounts.partial || 0) + Number(paymentCounts.overdue || 0))
    : 0;

  const ghostPaymentData = [
    { name: 'Paid', value: 20, fill: '#d1d5db' },
    { name: 'Pending', value: 10, fill: '#e5e7eb' },
    { name: 'Partial', value: 5, fill: '#c7d2fe' },
    { name: 'Overdue', value: 2, fill: '#fca5a5' }
  ];

  const realPaymentData = [
    { name: 'Paid', value: Number(paymentCounts?.paid || 0), fill: COLORS.primary },
    { name: 'Pending', value: Number(paymentCounts?.unpaid || 0), fill: COLORS.warning },
    { name: 'Partial', value: Number(paymentCounts?.partial || 0), fill: COLORS.secondary },
    { name: 'Overdue', value: Number(paymentCounts?.overdue || 0), fill: COLORS.danger }
  ];

  const paymentChartData = totalPaymentCount === 0 ? ghostPaymentData : realPaymentData;
  // Skeleton loading state for full page
  const AnalyticsSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Key Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      
      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <SkeletonChart height="h-80" />
        <SkeletonChart height="h-80" />
      </div>
      
      {/* More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SkeletonChart height="h-72" />
        <div className="lg:col-span-2">
          <SkeletonChart height="h-72" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your property performance and insights</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Property Filter */}
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
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
                    timeRange === 'week' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeRange('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === 'month' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setTimeRange('year')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === 'year' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Year
                </button>
              </div>

              {/* Download */}
              <button
                onClick={downloadAnalyticsCSV}
                disabled={loading || !analytics}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                title="Download Report"
              >
                <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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

        {/* Empty State - No Properties */}
        {!loading && properties.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No Properties Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start by adding your first property to see analytics data like revenue, occupancy rates, and tenant insights.
            </p>
            <a
              href="/properties/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Home className="w-5 h-5" />
              Add Your First Property
            </a>
          </div>
        )}

        {loading && !analytics ? (
          <AnalyticsSkeleton />
        ) : analytics && properties.length > 0 && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-philippine-peso-icon lucide-philippine-peso"><path d="M20 11H4"/><path d="M20 7H4"/><path d="M7 21V4a1 1 0 0 1 1-1h4a1 1 0 0 1 0 12H7"/></svg>                  </div>
                  <span className="text-green-600 text-sm font-semibold">
                    {analytics.overview.monthly_revenue > 0 ? '↑' : '→'} 
                    {analytics.revenue.collection_rate}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₱{analytics.overview.total_revenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ₱{analytics.overview.monthly_revenue.toLocaleString()} this month
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Home className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-blue-600 text-sm font-semibold">
                    {analytics.overview.occupancy_rate}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.overview.occupied_rooms}/{analytics.overview.total_rooms}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {analytics.overview.available_rooms} rooms available
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-green-600 text-sm font-semibold">
                    +{analytics.overview.new_tenants_this_month}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Tenants</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.overview.active_tenants}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  New this month
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 text-sm font-semibold">months</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Stay Duration</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics.tenants.average_stay_months}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {analytics.tenants.move_ins} move-ins, {analytics.tenants.move_outs} move-outs
                </p>
              </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Trend</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Payment Status</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={paymentChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={totalPaymentCount === 0 ? '#f3f4f6' : '#f0f0f0'} />
                  <XAxis type="number" stroke={totalPaymentCount === 0 ? '#d1d5db' : '#6b7280'} style={{ fontSize: '12px' }} />
                  <YAxis type="category" dataKey="name" stroke={totalPaymentCount === 0 ? '#d1d5db' : '#6b7280'} style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={ totalPaymentCount === 0 ? { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#6b7280' } : { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value) => [value, 'Count']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} opacity={totalPaymentCount === 0 ? 0.4 : 1}>
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{paymentCounts?.paid ?? 0}</p>
                  <p className="text-xs text-gray-600">Paid</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{paymentCounts?.unpaid ?? 0}</p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{paymentCounts?.partial ?? 0}</p>
                  <p className="text-xs text-gray-600">Partial</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{paymentCounts?.overdue ?? 0}</p>
                  <p className="text-xs text-gray-600">Overdue</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Payment Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{paymentCounts?.payment_rate ?? 0}%</p>
              </div>
            </div>

            {/* Property Comparison */}
            {selectedProperty === 'all' && analytics.properties.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Property Comparison</h2>
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