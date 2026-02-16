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
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';

export default function Analytics({ user }) {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_analytics || cacheManager.get('landlord_analytics');

  const [timeRange, setTimeRange] = useState('month');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [properties, setProperties] = useState(cachedData?.properties || null);
  const [analytics, setAnalytics] = useState(cachedData?.analytics || null);
  const [loading, setLoading] = useState(!cachedData);
  const [propertiesLoading, setPropertiesLoading] = useState(!cachedData);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, selectedProperty]);

  const loadProperties = async () => {
    try {
      if (!cachedData) setPropertiesLoading(true);
      const response = await api.get('/landlord/properties');
      const data = response.data || [];
      setProperties(data);
      const newState = { ...uiState.data?.landlord_analytics, properties: data };
      updateData('landlord_analytics', newState);
      cacheManager.set('landlord_analytics', newState);
    } catch (err) {
      console.error('Failed to load properties:', err);
      setProperties([]);
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
      <div className="flex flex-row items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
          <Building2 className="w-5 h-5 text-gray-400" />
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm font-semibold text-gray-700 dark:text-white"
          >
            <option value="all">All Properties</option>
            {properties?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {['week', 'month', 'year'].map(r => (
              <button 
                key={r} 
                onClick={() => setTimeRange(r)} 
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${timeRange === r ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={downloadAnalyticsCSV} 
          disabled={loading || !analytics} 
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all disabled:opacity-50"
          title="Download CSV Report"
        >
          <Download className="w-4 h-4 text-green-600" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      <div className="min-h-0">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        {(loading || propertiesLoading) && !analytics ? (
          <AnalyticsSkeleton />
        ) : (properties && properties.length > 0) ? (
          analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11H4"/><path d="M20 7H4"/><path d="M7 21V4a1 1 0 0 1 1-1h4a1 1 0 0 1 0 12H7"/></svg>
                    </div>
                    <span className="text-green-600 text-sm font-semibold">{analytics.revenue.collection_rate}%</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{analytics.overview.total_revenue.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Home className="w-6 h-6 text-blue-600" /></div>
                    <span className="text-blue-600 text-sm font-semibold">{analytics.overview.occupancy_rate}%</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.overview.occupied_rooms}/{analytics.overview.total_rooms}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Users className="w-6 h-6 text-purple-600" /></div>
                    <span className="text-green-600 text-sm font-semibold">+{analytics.overview.new_tenants_this_month}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Tenants</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.overview.active_tenants}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center"><Calendar className="w-6 h-6 text-yellow-600" /></div>
                    <span className="text-gray-600 text-sm font-semibold">months</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Stay Duration</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.tenants.average_stay_months}</p>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.revenue.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} formatter={(value) => ['₱' + Number(value).toLocaleString(), 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Payment Status</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={paymentChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={totalPaymentCount === 0 ? '#f3f4f6' : '#f0f0f0'} />
                    <XAxis type="number" stroke={totalPaymentCount === 0 ? '#d1d5db' : '#6b7280'} style={{ fontSize: '12px' }} />
                    <YAxis type="category" dataKey="name" stroke={totalPaymentCount === 0 ? '#d1d5db' : '#6b7280'} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} opacity={totalPaymentCount === 0 ? 0.4 : 1}>
                      {paymentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
