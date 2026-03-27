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
  AlertCircle,
  RotateCcw,
  ArrowUpRight,
  Zap,
  PieChart as PieChartIcon
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
import api from '../../utils/api';
import { SkeletonStatCard, SkeletonChart, Skeleton } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';
import { cacheManager } from '../../utils/cache';
import { usePreferences } from '../../contexts/PreferencesContext';
import toast from 'react-hot-toast';

export default function Analytics() {
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
  const [didAutoResetProperty, setDidAutoResetProperty] = useState(false);

  useEffect(() => {
    // Always refresh property access on analytics entry to avoid stale cached IDs.
    loadProperties();
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

  const loadAnalytics = async (isManualRefresh = false) => {
    try {
      if (!cachedData || isManualRefresh) setLoading(true);
      setError(null);

      const hasSelectedProperty = selectedProperty !== 'all' && properties?.some(p => String(p.id) === String(selectedProperty));

      const params = new URLSearchParams({
        time_range: timeRange,
        _t: Date.now().toString(), // Force fresh data from server
        ...(hasSelectedProperty && { property_id: selectedProperty })
      });

      const response = await api.get(`/landlord/analytics/dashboard?${params}`);
      
      setAnalytics(response.data);
      const newState = { ...uiState.data?.landlord_analytics, analytics: response.data };
      updateData('landlord_analytics', newState);
      cacheManager.set('landlord_analytics', newState);
    } catch (err) {
      console.error('Analytics error:', err);
      setAnalytics(null);

      // If a stale/invalid property filter is selected, reset once to "all" and retry via effect.
      if (err?.response?.status === 403 && selectedProperty !== 'all' && !didAutoResetProperty) {
        setDidAutoResetProperty(true);
        setSelectedProperty('all');
      }

      if (properties?.length > 0) {
        const serverMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
        setError(serverMessage || 'Failed to load analytics data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalytics(true);
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, selectedProperty]);

  useEffect(() => {
    if (selectedProperty === 'all') {
      setDidAutoResetProperty(false);
    }
  }, [selectedProperty]);

  // Download analytics as CSV
  const downloadAnalyticsCSV = async () => {
    if (!analytics) return;

    const defaultFilename = `AccommoTrack_Detailed_Analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    const triggerCsvDownload = (blob, filename = defaultFilename) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    };

    // Prefer server-side export when backend route exists.
    try {
      const hasSelectedProperty = selectedProperty !== 'all' && properties?.some(p => String(p.id) === String(selectedProperty));
      const params = {
        time_range: timeRange,
        ...(hasSelectedProperty ? { property_id: selectedProperty } : {})
      };
      const response = await api.get('/landlord/analytics/export-csv', {
        params,
        responseType: 'blob'
      });

      const blob = response?.data;
      if (blob && blob.size > 0) {
        const disposition = response.headers?.['content-disposition'] || '';
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        const filename = match ? match[1].replace(/['"]/g, '') : defaultFilename;
        triggerCsvDownload(blob, filename);
        return;
      }
    } catch (error) {
      if (error.response?.status && error.response.status !== 404) {
        toast.error('Server export unavailable. Downloading local report instead.');
      }
    }
    
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
      ['Monthly Growth', `${analytics.overview.revenue_growth_rate}%`, 'Month-over-Month'],
      ['Income Per Room', formatCurrency(analytics.overview.revpar), 'Business Health'],
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
      ...(() => {
        // Fix #5: Compute locally to avoid closure dependency on outer totalPaymentCount
        const p = analytics.payments;
        const localTotal = Number(p.paid || 0) + Number(p.unpaid || 0) + Number(p.partial || 0) + Number(p.overdue || 0);
        const pct = (val) => localTotal > 0 ? formatPercent((Number(val) / localTotal) * 100) : '0%';
        return [
          ['Paid', p.paid, pct(p.paid)],
          ['Pending/Unpaid', p.unpaid, pct(p.unpaid)],
          ['Partial Payments', p.partial, pct(p.partial)],
          ['Overdue Invoices', p.overdue, pct(p.overdue)],
          ['Overall Payment Success Rate', formatPercent(p.payment_rate)],
        ];
      })(),
      [''],
      ['=== PROPERTY PERFORMANCE BREAKDOWN ==='],
      ['Property Name', 'Occupancy Rate', 'Rooms (Occ/Total)', 'Monthly Revenue', 'Income / Room', 'Status'],
      ...analytics.properties.map(p => [
        p.name, 
        formatPercent(p.occupancy_rate), 
        `${p.occupied_slots}/${p.total_slots}`,
        formatCurrency(p.monthly_revenue || 0),
        formatCurrency(p.revpar || 0),
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
    triggerCsvDownload(blob, defaultFilename);
  };

  const COLORS = { primary: '#10b981', secondary: '#3b82f6', warning: '#f59e0b', danger: '#ef4444' };
  const paymentCounts = analytics?.payments || null;
  const totalPaymentCount = paymentCounts ? (Number(paymentCounts.paid || 0) + Number(paymentCounts.unpaid || 0) + Number(paymentCounts.partial || 0) + Number(paymentCounts.overdue || 0)) : 0;
  const ghostPaymentData = [ { name: 'Paid', value: 0, fill: '#d1d5db' }, { name: 'Pending', value: 0, fill: '#e5e7eb' }, { name: 'Partial', value: 0, fill: '#c7d2fe' }, { name: 'Overdue', value: 0, fill: '#fca5a5' } ];
  const realPaymentData = [ { name: 'Paid', value: Number(paymentCounts?.paid || 0), fill: COLORS.primary }, { name: 'Pending', value: Number(paymentCounts?.unpaid || 0), fill: COLORS.warning }, { name: 'Partial', value: Number(paymentCounts?.partial || 0), fill: COLORS.secondary }, { name: 'Overdue', value: Number(paymentCounts?.overdue || 0), fill: COLORS.danger } ];
  const paymentChartData = totalPaymentCount === 0 ? ghostPaymentData : realPaymentData;
  const computedPaymentRate = analytics ? (() => {
    const paid = Number(analytics.payments.paid || 0);
    const total = paid + Number(analytics.payments.unpaid || 0) + Number(analytics.payments.partial || 0) + Number(analytics.payments.overdue || 0);
    return total > 0 ? Math.round((paid / total) * 100) : (Number(analytics.payments.payment_rate) || 0);
  })() : 0;

  const MetricCard = ({ Icon, iconBgClass, iconColorClass, title, meta, value, valueClass = 'text-gray-900 dark:text-white' }) => (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
      <div className="grid grid-cols-[auto,1fr] items-center gap-3 mb-4">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${iconColorClass}`} />
        </div>
        <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      </div>
      <div className="grid grid-cols-[1fr,auto] items-end gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{meta}</p>
        <p className={`text-lg md:text-2xl font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  );

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
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex-1 lg:flex-none">
            <Building2 className="w-5 h-5 text-gray-500" />
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

          <button 
            onClick={handleRefresh} 
            disabled={loading} 
            className="flex items-center justify-center gap-2 p-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all disabled:opacity-50 lg:hidden"
            title="Refresh Data"
          >
            <RotateCcw className={`w-5 h-5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
            {['week', 'month', 'year'].map(r => (
              <button 
                key={r} 
                onClick={() => setTimeRange(r)} 
                className={`px-4 py-2.5 rounded-md text-xs font-bold transition-all ${timeRange === r ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button 
              onClick={handleRefresh} 
              disabled={loading} 
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RotateCcw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button 
              onClick={downloadAnalyticsCSV} 
              disabled={loading || !analytics} 
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all disabled:opacity-50"
              title="Download CSV Report"
            >
              <Download className="w-4 h-4 text-green-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        {(loading || propertiesLoading) && !analytics ? (
          <AnalyticsSkeleton />
        ) : (properties && properties.length > 0) ? (
          analytics ? (
            <>
              {/* Strategic Metrics Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <MetricCard
                  Icon={LucidePhilippinePeso}
                  iconBgClass="bg-green-100"
                  iconColorClass="text-green-600"
                  title="Total Revenue"
                  meta="Cumulative"
                  value={`₱${(analytics.overview?.total_revenue || 0).toLocaleString()}`}
                />

                <MetricCard
                  Icon={TrendingUp}
                  iconBgClass="bg-emerald-100"
                  iconColorClass="text-emerald-600"
                  title="Monthly Revenue"
                  meta="Actual Paid"
                  value={`₱${(analytics.overview?.monthly_revenue || 0).toLocaleString()}`}
                />

                <MetricCard
                  Icon={ArrowUpRight}
                  iconBgClass="bg-blue-100"
                  iconColorClass="text-blue-600"
                  title="Monthly Growth"
                  meta="Vs Prev Month"
                  value={`${analytics.overview?.revenue_growth_rate || 0}%`}
                  valueClass={(analytics.overview?.revenue_growth_rate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
                />

                <MetricCard
                  Icon={Zap}
                  iconBgClass="bg-yellow-100"
                  iconColorClass="text-yellow-600"
                  title="Income per Room"
                  meta="Monthly Average"
                  value={`₱${(analytics.overview?.revpar || 0).toLocaleString()}`}
                  valueClass="text-yellow-600"
                />
              </div>

              {/* Occupancy and Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2 min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Trend</h2>
                  <ResponsiveContainer width="100%" height={300} minWidth={0}>
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
                        formatter={(value) => ['₱' + Number(value || 0).toLocaleString(), 'Revenue']} 
                      />
                      <Line type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Income Breakdown</h2>
                    <PieChartIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={analytics.revenue?.income_breakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill={COLORS.primary} />
                        <Cell fill={COLORS.secondary} />
                      </Pie>
                      <Tooltip 
                        formatter={(value) => '₱' + (Number(value) || 0).toLocaleString()}
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Efficiency & Payments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                    {selectedProperty === 'all' ? 'Income per Room' : 'Room Performance'}
                  </h2>
                  <div className={`${selectedProperty !== 'all' ? 'overflow-auto max-h-[500px] pr-2 custom-scrollbar' : ''}`}>
                    <div style={{ 
                      height: selectedProperty === 'all' 
                        ? '250px' 
                        : `${Math.max(250, (analytics.room_performance?.length || 0) * 45)}px` 
                    }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        {selectedProperty === 'all' ? (
                          <BarChart data={analytics.properties || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={effectiveTheme === 'dark' ? '#374151' : '#f0f0f0'} />
                            <XAxis dataKey="name" stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '10px' }} />
                            <YAxis stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '10px' }} />
                            <Tooltip 
                              formatter={(value) => '₱' + (Number(value) || 0).toLocaleString()}
                              contentStyle={{ borderRadius: '8px' }}
                            />
                            <Bar dataKey="revpar" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <BarChart 
                            data={analytics.room_performance || []} 
                            layout="vertical" 
                            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={effectiveTheme === 'dark' ? '#374151' : '#f0f0f0'} />
                            <XAxis 
                              type="number" 
                              stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} 
                              style={{ fontSize: '10px' }} 
                              tickFormatter={(value) => '₱' + value.toLocaleString()}
                            />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} 
                              style={{ fontSize: '10px' }} 
                              width={70}
                            />
                            <Tooltip 
                              formatter={(value) => ['₱' + (Number(value) || 0).toLocaleString(), 'Income/Room']}
                              contentStyle={{ borderRadius: '8px' }}
                            />
                            <Bar dataKey="revpar" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Invoicing Health</h2>
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                    <BarChart data={paymentChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={effectiveTheme === 'dark' ? '#374151' : '#f0f0f0'} />
                      <XAxis type="number" stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <YAxis type="category" dataKey="name" stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {paymentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Property Performance Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-300 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Property Performance Breakdown</h2>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Property Name</th>
                        <th className="px-6 py-4 font-semibold">Occupancy Rate</th>
                        <th className="px-6 py-4 font-semibold">Rooms (Occ/Total)</th>
                        <th className="px-6 py-4 font-semibold">Monthly Revenue</th>
                        <th className="px-6 py-4 font-semibold">Income / Room</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
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
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.occupied_slots} / {p.total_slots}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">₱{(p.monthly_revenue || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">₱{(p.revpar || 0).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-2 rounded-full text-xs font-semibold ${
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
              <Building2 className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No Properties Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">Start by adding your first property to see analytics data.</p>
            <a href="/properties" className="inline-flex items-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
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
