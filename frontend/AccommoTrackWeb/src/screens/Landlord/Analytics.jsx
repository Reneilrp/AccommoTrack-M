import { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Calendar,
  Download,
  Building2,
  LucidePhilippinePeso,
  TrendingUp,
  CheckCircle,
  AlertCircle
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
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import { usePreferences } from '../../contexts/PreferencesContext';

export default function Analytics({ user }) {
  const { effectiveTheme } = usePreferences();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_analytics || cacheManager.get('landlord_analytics');
  const accessibleProperties = uiState.data?.accessible_properties || cacheManager.get('accessible_properties');

  const [timeRange, setTimeRange] = useState('month');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [properties, setProperties] = useState(accessibleProperties || cachedData?.properties || []);
  const [analytics, setAnalytics] = useState(cachedData?.analytics || null);
  const [loading, setLoading] = useState(!cachedData);
  const [propertiesLoading, setPropertiesLoading] = useState(!accessibleProperties && !cachedData?.properties);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessibleProperties || accessibleProperties.length === 0) {
      loadProperties();
    }
  }, []);

  const loadProperties = async () => {
    try {
      setPropertiesLoading(true);
      const response = await api.get('/properties/accessible');
      const data = response.data || [];
      setProperties(data);
      updateData('accessible_properties', data);
      cacheManager.set('accessible_properties', data);
    } catch (err) {
      console.error('Failed to load properties:', err);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      if (!cachedData) setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        time_range: timeRange,
        ...(selectedProperty !== 'all' && { property_id: selectedProperty })
      });

      const response = await api.get(`/landlord/analytics/dashboard?${params}`);
      
      setAnalytics(response.data);
      const newState = { ...uiState.data?.landlord_analytics, analytics: response.data };
      updateData('landlord_analytics', newState);
      cacheManager.set('landlord_analytics', newState);
    } catch (err) {
      console.error('Analytics error:', err);
      setAnalytics(null);
      if (properties?.length > 0) {
        setError('Failed to load analytics data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, selectedProperty]);

  // Download analytics as CSV
  const downloadAnalyticsCSV = () => {
    if (!analytics) return;
    
    const formatCurrency = (amount) => `PHP ${Number(amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    const formatPercent = (val) => `${Number(val || 0).toFixed(1)}%`;
    
    const rows = [
      ['AccommoTrack Analytics Detailed Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Time Range:', timeRange.toUpperCase()],
      ['Property Filter:', selectedProperty === 'all' ? 'All Properties' : (properties?.find(p => p.id == selectedProperty)?.title || 'Selected Property')],
      [''],
      ['=== BUSINESS OVERVIEW ==='],
      ['Metric', 'Value', 'Status'],
      ['Total Revenue', formatCurrency(analytics.overview.total_revenue), 'Cumulative'],
      ['Monthly Revenue', formatCurrency(analytics.overview.monthly_revenue), 'Current Month'],
      ['Revenue Collection Rate', formatPercent(analytics.revenue.collection_rate), 'Target: 100%'],
      ['Occupancy Rate', formatPercent(analytics.overview.occupancy_rate), analytics.overview.occupancy_rate > 80 ? 'High' : 'Moderate'],
      [''],
      ['=== INVENTORY & TENANTS ==='],
      ['Total Rooms', analytics.overview.total_rooms],
      ['Occupied Rooms', analytics.overview.occupied_rooms],
      ['Available Rooms', analytics.overview.available_rooms],
      ['Active Tenants', analytics.overview.active_tenants],
      ['New Tenants (Current Period)', analytics.overview.new_tenants_this_month],
      ['Average Stay Duration', `${analytics.tenants.average_stay_months} months`],
      [''],
      ['=== REVENUE TREND ANALYSIS ==='],
      ['Period/Month', 'Revenue Amount', 'Growth Status'],
      ...analytics.revenue.monthly_trend.map((item, idx, arr) => {
        const prev = arr[idx - 1]?.revenue || 0;
        const growth = prev > 0 ? ((item.revenue - prev) / prev * 100).toFixed(1) + '%' : 'N/A';
        return [item.month, formatCurrency(item.revenue), growth === 'N/A' ? '-' : (item.revenue >= prev ? `+${growth}` : growth)];
      }),
      [''],
      ['=== PAYMENT PERFORMANCE ==='],
      ['Payment Status', 'Count', 'Percentage of Total'],
      ['Paid', analytics.payments.paid, formatPercent((analytics.payments.paid / totalPaymentCount) * 100)],
      ['Pending/Unpaid', analytics.payments.unpaid, formatPercent((analytics.payments.unpaid / totalPaymentCount) * 100)],
      ['Partial Payments', analytics.payments.partial, formatPercent((analytics.payments.partial / totalPaymentCount) * 100)],
      ['Overdue Invoices', analytics.payments.overdue, formatPercent((analytics.payments.overdue / totalPaymentCount) * 100)],
      ['Overall Payment Success Rate', formatPercent(analytics.payments.payment_rate)],
      [''],
      ['=== PROPERTY PERFORMANCE BREAKDOWN ==='],
      ['Property Name', 'Occupancy Rate', 'Rooms (Occ/Total)', 'Monthly Revenue', 'Efficiency Status'],
      ...analytics.properties.map(p => [
        p.name, 
        formatPercent(p.occupancy_rate), 
        `${p.occupied_rooms}/${p.total_rooms}`,
        formatCurrency(p.monthly_revenue || 0),
        p.occupancy_rate >= 90 ? 'Optimal' : (p.occupancy_rate >= 50 ? 'Stable' : 'Needs Attention')
      ]),
      [''],
      ['=== END OF REPORT ==='],
      ['Confidential Property Data - AccommoTrack System']
    ];

    const csvContent = rows.map(row => {
      return row.map(cell => {
        const stringVal = String(cell ?? '');
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    }).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `AccommoTrack_Detailed_Analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const COLORS = { primary: '#10b981', secondary: '#3b82f6', warning: '#f59e0b', danger: '#ef4444' };
  const paymentCounts = analytics?.payments || null;
  const totalPaymentCount = paymentCounts ? (Number(paymentCounts.paid || 0) + Number(paymentCounts.unpaid || 0) + Number(paymentCounts.partial || 0) + Number(paymentCounts.overdue || 0)) : 0;
  const ghostPaymentData = [ { name: 'Paid', value: 20, fill: '#d1d5db' }, { name: 'Pending', value: 10, fill: '#e5e7eb' }, { name: 'Partial', value: 5, fill: '#c7d2fe' }, { name: 'Overdue', value: 2, fill: '#fca5a5' } ];
  const realPaymentData = [ { name: 'Paid', value: Number(paymentCounts?.paid || 0), fill: COLORS.primary }, { name: 'Pending', value: Number(paymentCounts?.unpaid || 0), fill: COLORS.warning }, { name: 'Partial', value: Number(paymentCounts?.partial || 0), fill: COLORS.secondary }, { name: 'Overdue', value: Number(paymentCounts?.overdue || 0), fill: COLORS.danger } ];
  const paymentChartData = totalPaymentCount === 0 ? ghostPaymentData : realPaymentData;

  const AnalyticsSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <SkeletonChart height="h-80" />
        <SkeletonChart height="h-80" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex-1 lg:flex-none">
            <Building2 className="w-5 h-5 text-gray-400" />
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="border-none bg-transparent focus:ring-0 text-sm font-bold text-gray-700 dark:text-white flex-1"
            >
              <option value="all">All Properties</option>
              {properties?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          
          <button 
            onClick={downloadAnalyticsCSV} 
            disabled={loading || !analytics} 
            className="flex items-center justify-center gap-2 p-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all disabled:opacity-50 lg:hidden"
            title="Download CSV Report"
          >
            <Download className="w-5 h-5 text-green-600" />
          </button>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {['week', 'month', 'year'].map(r => (
              <button 
                key={r} 
                onClick={() => setTimeRange(r)} 
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === r ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button 
            onClick={downloadAnalyticsCSV} 
            disabled={loading || !analytics} 
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all disabled:opacity-50"
            title="Download CSV Report"
          >
            <Download className="w-4 h-4 text-green-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="min-h-0">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        {(loading || propertiesLoading) && !analytics ? (
          <AnalyticsSkeleton />
        ) : (properties && properties.length > 0) ? (
          analytics ? (
            <>
              {/* Key Metrics - Business Overview & Inventory */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                {/* Row 1: Financials */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <LucidePhilippinePeso className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cumulative</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">₱{analytics.overview.total_revenue.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Month</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly Revenue</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">₱{analytics.overview.monthly_revenue.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Target: 100%</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Collection Rate</p>
                  <p className={`text-lg md:text-2xl font-bold ${analytics.revenue.collection_rate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {analytics.revenue.collection_rate}%
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <LucidePhilippinePeso className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Overall</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Rate</p>
                  <p className={`text-lg md:text-2xl font-bold ${analytics.payments.payment_rate >= 90 ? 'text-green-600' : 'text-orange-600'}`}>
                    {analytics.payments.payment_rate}%
                  </p>
                </div>

                {/* Row 2: Operations */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Home className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Occupancy</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Occupancy Rate</p>
                  <p className={`text-lg md:text-2xl font-bold ${analytics.overview.occupancy_rate >= 80 ? 'text-green-600' : 'text-blue-600'}`}>
                    {analytics.overview.occupancy_rate}%
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Inventory</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Rooms</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{analytics.overview.total_rooms}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 md:w-6 md:h-6 text-pink-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Tenants</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{analytics.overview.active_tenants}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Stay</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tenant Retention</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{analytics.tenants.average_stay_months} mo</p>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.revenue.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#374151' : '#f0f0f0'} />
                    <XAxis dataKey="month" stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                    <YAxis stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: effectiveTheme === 'dark' ? '#1f2937' : '#fff', 
                        border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        color: effectiveTheme === 'dark' ? '#fff' : '#000'
                      }} 
                      itemStyle={{ color: effectiveTheme === 'dark' ? '#fff' : '#000' }}
                      formatter={(value) => ['₱' + Number(value).toLocaleString(), 'Revenue']} 
                    />
                    <Line type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Payment Status</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={paymentChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#374151' : (totalPaymentCount === 0 ? '#f3f4f6' : '#f0f0f0')} />
                    <XAxis type="number" stroke={effectiveTheme === 'dark' ? '#9ca3af' : (totalPaymentCount === 0 ? '#d1d5db' : '#6b7280')} style={{ fontSize: '12px' }} />
                    <YAxis type="category" dataKey="name" stroke={effectiveTheme === 'dark' ? '#9ca3af' : (totalPaymentCount === 0 ? '#d1d5db' : '#6b7280')} style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: effectiveTheme === 'dark' ? '#1f2937' : '#fff', 
                        border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        color: effectiveTheme === 'dark' ? '#fff' : '#000'
                      }} 
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} opacity={totalPaymentCount === 0 ? 0.4 : 1}>
                      {paymentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Property Performance Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-300 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Property Performance Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Property Name</th>
                        <th className="px-6 py-4 font-semibold">Occupancy Rate</th>
                        <th className="px-6 py-4 font-semibold">Rooms (Occ/Total)</th>
                        <th className="px-6 py-4 font-semibold">Monthly Revenue</th>
                        <th className="px-6 py-4 font-semibold">Efficiency Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {analytics.properties.map((p, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${p.occupancy_rate >= 80 ? 'bg-green-500' : p.occupancy_rate >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                                  style={{ width: `${p.occupancy_rate}%` }}
                                />
                              </div>
                              <span className="text-gray-600 dark:text-gray-300">{p.occupancy_rate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.occupied_rooms} / {p.total_rooms}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">₱{(p.monthly_revenue || 0).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              p.occupancy_rate >= 90 ? 'bg-green-100 text-green-700' : 
                              p.occupancy_rate >= 50 ? 'bg-blue-100 text-blue-700' : 
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {p.occupancy_rate >= 90 ? 'Optimal' : (p.occupancy_rate >= 50 ? 'Stable' : 'Needs Attention')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>
          )
        ) : (!loading && !propertiesLoading && properties !== null) ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No Properties Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">Start by adding your first property to see analytics data.</p>
            <a href="/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
              <Home className="w-5 h-5" /> Add Your First Property
            </a>
          </div>
        ) : (
          <AnalyticsSkeleton />
        )}
      </div>
    </div>
  );
}
