import { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Download,
  Building2,
  LucidePhilippinePeso,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
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
import { useSidebar } from '../../contexts/SidebarContext';
import toast from 'react-hot-toast';

export default function Analytics() {
  const { effectiveTheme } = usePreferences();
  const { uiState, updateData } = useUIState();
  const { collapse } = useSidebar();
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState(() => {
    const now = new Date();
    return {
      granularity: 'month',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      weekInMonth: Math.floor((now.getDate() - 1) / 7) + 1,
    };
  });

  useEffect(() => {
    // Auto-collapse sidebar when entering analytics for wider chart area.
    if (collapse) collapse().catch(() => {});

    // Always refresh property access on analytics entry to avoid stale cached IDs.
    loadProperties();
  }, [collapse]);

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
    const hasSelectedProperty = selectedProperty !== 'all' && properties?.some(p => String(p.id) === String(selectedProperty));
    const cacheKey = `analytics_${hasSelectedProperty ? selectedProperty : 'all'}_${timeRange}`;
    const cachedForFilter = cacheManager.get(cacheKey);

    try {
      // Optimistic UI: Show cached data immediately if available
      if (cachedForFilter && !isManualRefresh) {
        setAnalytics(cachedForFilter);
        setLoading(false);
      } else if (!cachedForFilter) {
        // Only show loading if no cache exists
        setLoading(true);
      }

      setError(null);

      const params = new URLSearchParams({
        time_range: timeRange,
        _t: Date.now().toString(), // Force fresh data from server
        ...(hasSelectedProperty && { property_id: selectedProperty })
      });

      // Fetch fresh data in background
      const response = await api.get(`/landlord/analytics/dashboard?${params}`);
      
      // Update with fresh data
      setAnalytics(response.data);
      
      // Cache per filter combination
      cacheManager.set(cacheKey, response.data);
      
      // Also update global cache for backward compatibility
      const newState = { ...uiState.data?.landlord_analytics, analytics: response.data };
      updateData('landlord_analytics', newState);
    } catch (err) {
      console.error('Analytics error:', err);
      
      // Only clear analytics if we don't have cached data to fall back on
      if (!cachedForFilter) {
        setAnalytics(null);
      }

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
    // Clear all analytics caches for fresh data
    const cacheKeys = [
      'analytics_all_week',
      'analytics_all_month',
      'analytics_all_year',
      'landlord_analytics'
    ];
    
    // Clear individual property caches
    if (properties && properties.length > 0) {
      properties.forEach(p => {
        cacheKeys.push(`analytics_${p.id}_week`);
        cacheKeys.push(`analytics_${p.id}_month`);
        cacheKeys.push(`analytics_${p.id}_year`);
      });
    }
    
    cacheKeys.forEach(key => cacheManager.invalidate(key));
    updateData('landlord_analytics', null);
    
    // Force fresh load
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

  const getRangeBounds = (range) => {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    if (range === 'week') {
      // Match backend: last 7 days including today.
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    } else {
      // Default month: current calendar month.
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getWeeksInMonth = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Math.ceil(daysInMonth / 7);
  };

  const buildExportWindow = (config) => {
    const { granularity, year, month, weekInMonth } = config;

    if (granularity === 'year') {
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
        timeRangeParam: 'year',
        label: `Yearly (${year})`,
      };
    }

    if (granularity === 'week') {
      const daysInMonth = new Date(year, month, 0).getDate();
      const startDay = 1 + ((weekInMonth - 1) * 7);
      const endDay = Math.min(startDay + 6, daysInMonth);

      return {
        start: new Date(year, month - 1, startDay),
        end: new Date(year, month - 1, endDay, 23, 59, 59, 999),
        timeRangeParam: 'week',
        label: `Week ${weekInMonth} (${monthNames[month - 1]} ${year})`,
      };
    }

    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 0, 23, 59, 59, 999),
      timeRangeParam: 'month',
      label: `Monthly (${monthNames[month - 1]} ${year})`,
    };
  };

  const openExportModal = () => {
    const now = new Date();
    setExportConfig({
      granularity: timeRange,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      weekInMonth: Math.floor((now.getDate() - 1) / 7) + 1,
    });
    setShowExportModal(true);
  };

  // Download analytics as CSV
  const downloadAnalyticsCSV = async (customWindow = null) => {
    if (!analytics) return;

    const defaultWindow = getRangeBounds(timeRange);
    const exportWindow = customWindow || {
      start: defaultWindow.start,
      end: defaultWindow.end,
      timeRangeParam: timeRange,
      label: timeRange.toUpperCase(),
    };
    const { start: rangeStart, end: rangeEnd } = exportWindow;
    const rangeStartISO = rangeStart.toISOString().split('T')[0];
    const rangeEndISO = rangeEnd.toISOString().split('T')[0];

    const filenameScope = String(exportWindow.label || exportWindow.timeRangeParam || timeRange)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const defaultFilename = `AccommoTrack_Detailed_Analytics_${filenameScope}_${new Date().toISOString().split('T')[0]}.csv`;
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
        time_range: exportWindow.timeRangeParam,
        start_date: rangeStartISO,
        end_date: rangeEndISO,
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
      ['Time Range:', exportWindow.label],
      ['Start Date:', rangeStartISO],
      ['End Date:', rangeEndISO],
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
        const pendingOrUnpaid = Number(p.unpaid ?? p.pending ?? 0);
        const localTotal = Number(p.paid || 0) + pendingOrUnpaid + Number(p.partial || 0) + Number(p.overdue || 0);
        const pct = (val) => localTotal > 0 ? formatPercent((Number(val) / localTotal) * 100) : '0%';
        return [
          ['Paid', p.paid, pct(p.paid)],
          ['Pending/Unpaid', pendingOrUnpaid, pct(pendingOrUnpaid)],
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

  const handleConfirmExport = async () => {
    const exportWindow = buildExportWindow(exportConfig);
    await downloadAnalyticsCSV(exportWindow);
    setShowExportModal(false);
  };

  const COLORS = { primary: '#10b981', secondary: '#3b82f6', warning: '#f59e0b', danger: '#ef4444' };
  const paymentCounts = analytics?.payments || null;
  const pendingOrUnpaidCount = Number(paymentCounts?.unpaid ?? paymentCounts?.pending ?? 0);
  const totalPaymentCount = paymentCounts ? (Number(paymentCounts.paid || 0) + pendingOrUnpaidCount + Number(paymentCounts.partial || 0) + Number(paymentCounts.overdue || 0)) : 0;
  const ghostPaymentData = [ { name: 'Paid', value: 0, fill: '#d1d5db' }, { name: 'Pending', value: 0, fill: '#e5e7eb' }, { name: 'Partial', value: 0, fill: '#c7d2fe' }, { name: 'Overdue', value: 0, fill: '#fca5a5' } ];
  const realPaymentData = [ { name: 'Paid', value: Number(paymentCounts?.paid || 0), fill: COLORS.primary }, { name: 'Pending', value: pendingOrUnpaidCount, fill: COLORS.warning }, { name: 'Partial', value: Number(paymentCounts?.partial || 0), fill: COLORS.secondary }, { name: 'Overdue', value: Number(paymentCounts?.overdue || 0), fill: COLORS.danger } ];
  const paymentChartData = totalPaymentCount === 0 ? ghostPaymentData : realPaymentData;
  const monthlyGrowthRate = Number(analytics?.overview?.revenue_growth_rate || 0);
  const hasMonthlyGrowthData = Number.isFinite(monthlyGrowthRate);
  const isMonthlyGrowthPositive = monthlyGrowthRate >= 0;
  const revenueTrendTitle = `Revenue Trend - ${
    timeRange === 'week' ? 'Weekly' : timeRange === 'year' ? 'Yearly' : 'Monthly'
  }`;
  const formatCurrencyCompact = (value) => `₱${Number(value || 0).toLocaleString()}`;
  const allPropertiesBreakdown = (analytics?.properties || [])
    .map((property) => ({
      name: property.name || property.title || 'Unnamed Property',
      value: Number(property.monthly_revenue || 0),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const selectedPropertyBreakdown = (analytics?.revenue?.income_breakdown || [])
    .map((item) => ({
      name: item.name || 'Unknown',
      value: Number(item.value || 0),
    }))
    .filter((item) => item.value > 0);
  const incomeBreakdownRaw = selectedProperty === 'all'
    ? (allPropertiesBreakdown.length > 0 ? allPropertiesBreakdown : selectedPropertyBreakdown)
    : selectedPropertyBreakdown;
  const breakdownPalette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#f97316', '#06b6d4'];
  const incomeBreakdownTotal = incomeBreakdownRaw.reduce((sum, item) => sum + item.value, 0);
  const incomeBreakdownData = incomeBreakdownRaw.map((item, index) => ({
    ...item,
    fill: breakdownPalette[index % breakdownPalette.length],
    percent: incomeBreakdownTotal > 0 ? (item.value / incomeBreakdownTotal) * 100 : 0,
  }));
  const topIncomeSource = incomeBreakdownData[0] || null;
  const rentIncomeValue = incomeBreakdownData.find((item) => item.name?.toLowerCase().includes('rent'))?.value || 0;
  const addonIncomeValue = incomeBreakdownData.find((item) => item.name?.toLowerCase().includes('add-on') || item.name?.toLowerCase().includes('addon'))?.value || 0;
  const allPropertiesIncomeData = (analytics?.properties || []).map((property) => ({
    name: property.name || property.title || `Property ${property.id || ''}`,
    income: Number(property.revpar ?? property.income_per_property ?? property.monthly_revenue ?? 0),
  }));
  const roomIncomeData = (analytics?.room_performance || []).map((room, index) => ({
    name: room.name || room.room_name || `Room ${room.room_number || room.id || index + 1}`,
    income: Number(room.revpar ?? room.income_per_room ?? room.revenue ?? room.monthly_revenue ?? 0),
  }));
  const totalRevenueAllTime = Number(analytics?.overview?.total_revenue ?? 0);
  const collectedThisMonth = Number(analytics?.revenue?.actual_monthly ?? analytics?.overview?.monthly_revenue ?? 0);
  const monthlyRevenue = Number(analytics?.overview?.monthly_revenue ?? 0);

  const MetricCard = ({
    Icon,
    iconBgClass,
    iconColorClass,
    title,
    meta,
    value,
    valueClass = 'text-gray-900 dark:text-white',
    topRightLabel,
    topRightValue,
    topRightValueClass = 'text-xs text-gray-600 dark:text-gray-300',
    topRightIcon: TopRightIcon,
    showProgress = false,
    progressValue = 0,
    progressRemaining = 0,
    progressLabel = ''
  }) => (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
      <div className="grid grid-cols-[auto,1fr] items-center gap-3 mb-4">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${iconColorClass}`} />
        </div>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">{title}</p>
          {topRightValue ? (
            <div className="flex flex-col items-end gap-1 shrink-0">
              {topRightLabel ? <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">{topRightLabel}</p> : null}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] md:text-xs font-semibold ${topRightValueClass}`}>
                {TopRightIcon ? <TopRightIcon className="w-3.5 h-3.5" /> : null}
                <span>{topRightValue}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-[1fr,auto] items-end gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{meta}</p>
        <div className="text-right">
          <p className={`text-lg md:text-2xl font-bold ${valueClass}`}>{value}</p>
        </div>
      </div>
      
      {showProgress && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progressValue, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] md:text-xs">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{progressValue.toFixed(1)}%</span>
            <span className="text-gray-500 dark:text-gray-400">{progressLabel || `${progressRemaining.toLocaleString()} left`}</span>
          </div>
        </div>
      )}
    </div>
  );

  const CollectionEfficiencyCard = ({ collected, expected, showProgress }) => {
    const collectionRate = expected > 0 ? (collected / expected) * 100 : 0;
    const remaining = Math.max(0, expected - collected);

    return (
      <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
        <div className="grid grid-cols-[auto,1fr] items-center gap-3 mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-green-100">
            <LucidePhilippinePeso className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">Collection Efficiency</p>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] md:text-xs font-semibold shrink-0 ${
              collectionRate >= 80
                ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-800'
                : collectionRate >= 60
                ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800'
                : 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800'
            }`}>
              <span>{collectionRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-[1fr,auto] items-end gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {showProgress ? 'Collected vs expected this month' : 'Payment collection rate'}
          </p>
          <div className="text-right">
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">₱{collected.toLocaleString()}</p>
          </div>
        </div>

        {showProgress && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">Expected</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">₱{expected.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] md:text-xs">
              <span className="font-semibold text-green-600 dark:text-green-400">{collectionRate.toFixed(1)}% collected</span>
              <span className="text-gray-500 dark:text-gray-400">₱{remaining.toLocaleString()} remaining</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const PendingActionsCard = ({ bookingsCount, maintenanceCount, highPriorityCount, potentialRevenue }) => {
    const totalActions = bookingsCount + maintenanceCount;
    const hasUrgent = highPriorityCount > 0;

    return (
      <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-4 md:p-6">
        <div className="grid grid-cols-[auto,1fr] items-center gap-3 mb-4">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
            hasUrgent ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <TrendingUp className={`w-5 h-5 md:w-6 md:h-6 ${
              hasUrgent ? 'text-red-600' : 'text-amber-600'
            }`} />
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">Pending Actions</p>
            {hasUrgent ? (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] md:text-xs font-semibold shrink-0 text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800">
                <span>⚠️ {highPriorityCount} urgent</span>
              </div>
            ) : null}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Total items</span>
            <span className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{totalActions}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">📋 Bookings</span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{bookingsCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">🔧 Maintenance</span>
              <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{maintenanceCount}</span>
            </div>
            {potentialRevenue > 0 && (
              <div className="flex items-center justify-between text-[10px] md:text-xs pt-1">
                <span className="text-gray-500 dark:text-gray-400">Potential revenue</span>
                <span className="font-semibold text-green-600 dark:text-green-400">₱{potentialRevenue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
            onClick={openExportModal} 
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
          <div>
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
              onClick={openExportModal} 
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
              {/* Strategic Metrics Overview - Consistent 5 Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-8">
                {/* Card 1: Total Revenue */}
                <MetricCard
                  Icon={LucidePhilippinePeso}
                  iconBgClass="bg-green-100"
                  iconColorClass="text-green-600"
                  title="Total Revenue"
                  meta={selectedProperty === 'all' ? 'All-time across all properties' : 'All-time for this property'}
                  value={`₱${totalRevenueAllTime.toLocaleString()}`}
                />

                {/* Card 2: Monthly Revenue */}
                <MetricCard
                  Icon={TrendingUp}
                  iconBgClass="bg-teal-100"
                  iconColorClass="text-teal-600"
                  title="Monthly Revenue"
                  meta={selectedProperty === 'all' ? 'Current month across all properties' : 'Current month for this property'}
                  value={`₱${monthlyRevenue.toLocaleString()}`}
                  topRightValue={hasMonthlyGrowthData ? `${isMonthlyGrowthPositive ? '+' : ''}${monthlyGrowthRate}%` : 'No data'}
                  topRightIcon={hasMonthlyGrowthData ? (isMonthlyGrowthPositive ? ArrowUpRight : ArrowDownRight) : null}
                  topRightValueClass={hasMonthlyGrowthData
                    ? (isMonthlyGrowthPositive
                      ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-800'
                      : 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800')
                    : 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-700/50 dark:border-gray-600'}
                />

                {/* Card 3: Collected */}
                <MetricCard
                  Icon={LucidePhilippinePeso}
                  iconBgClass="bg-emerald-100"
                  iconColorClass="text-emerald-600"
                  title="Collected"
                  meta={selectedProperty === 'all' ? 'This month across all properties' : 'This month for this property'}
                  value={`₱${collectedThisMonth.toLocaleString()}`}
                />

                {/* Card 4: Active Tenants */}
                <MetricCard
                  Icon={Users}
                  iconBgClass="bg-indigo-100"
                  iconColorClass="text-indigo-600"
                  title="Active Tenants"
                  meta={selectedProperty === 'all' ? 'Across all properties' : 'In this property'}
                  value={(analytics.overview?.active_tenants || 0).toLocaleString()}
                />

                {/* Card 5: New Tenants */}
                <MetricCard
                  Icon={Users}
                  iconBgClass="bg-purple-100"
                  iconColorClass="text-purple-600"
                  title="New Tenants"
                  meta={selectedProperty === 'all' ? 'This month across all properties' : 'This month in this property'}
                  value={(analytics.overview?.new_tenants_this_month || 0).toLocaleString()}
                />
              </div>

              {/* Revenue Trend */}
              <div className="min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{revenueTrendTitle}</h2>
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

              {/* Income Breakdown */}
              <div className="min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedProperty === 'all' ? 'Income Breakdown by Property' : 'Income Breakdown'}
                  </h2>
                  <PieChartIcon className="w-5 h-5 text-gray-400" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="min-w-0">
                    <ResponsiveContainer width="100%" height={300} minWidth={0}>
                      <PieChart>
                        <Pie
                          data={incomeBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {incomeBreakdownData.map((entry, index) => (
                            <Cell key={`income-breakdown-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, payload) => {
                            const pct = payload?.payload?.percent || 0;
                            return [`${formatCurrencyCompact(value)} (${pct.toFixed(1)}%)`, 'Amount'];
                          }}
                          contentStyle={{ borderRadius: '8px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Breakdown Details</h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Scope</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {selectedProperty === 'all' ? 'All Properties' : 'Selected Property'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrencyCompact(incomeBreakdownTotal)}
                        </span>
                      </div>
                      {selectedProperty !== 'all' && addonIncomeValue > 0 ? (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Rent + Add-ons</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {`${formatCurrencyCompact(rentIncomeValue)} + ${formatCurrencyCompact(addonIncomeValue)}`}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Top Source</span>
                        <span className="font-semibold text-gray-900 dark:text-white truncate pl-2">
                          {topIncomeSource
                            ? `${topIncomeSource.name} (${topIncomeSource.percent.toFixed(1)}%)`
                            : 'No data'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-auto pr-1">
                      {incomeBreakdownData.length > 0 ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 border border-green-200 dark:border-green-800">
                          <span className="text-sm font-semibold text-green-800 dark:text-green-300">Total Income</span>
                          <span className="text-sm font-bold text-green-800 dark:text-green-300">{formatCurrencyCompact(incomeBreakdownTotal)}</span>
                        </div>
                      ) : null}
                      {incomeBreakdownData.length > 0 ? incomeBreakdownData.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrencyCompact(item.value)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.percent.toFixed(1)}%</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No income breakdown data available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Efficiency & Payments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                    {selectedProperty === 'all' ? 'Income Per Properties' : 'Income Per Room'}
                  </h2>
                  <div className={`${selectedProperty !== 'all' ? 'overflow-auto max-h-[500px] pr-2 custom-scrollbar' : ''}`}>
                    <div style={{ 
                      height: selectedProperty === 'all' 
                        ? '250px' 
                        : `${Math.max(250, (roomIncomeData.length || 0) * 45)}px` 
                    }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        {selectedProperty === 'all' ? (
                          <BarChart data={allPropertiesIncomeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={effectiveTheme === 'dark' ? '#374151' : '#f0f0f0'} />
                            <XAxis dataKey="name" stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '10px' }} />
                            <YAxis stroke={effectiveTheme === 'dark' ? '#9ca3af' : '#6b7280'} style={{ fontSize: '10px' }} />
                            <Tooltip 
                              formatter={(value) => '₱' + (Number(value) || 0).toLocaleString()}
                              contentStyle={{ borderRadius: '8px' }}
                            />
                            <Bar dataKey="income" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <BarChart 
                            data={roomIncomeData} 
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
                            <Bar dataKey="income" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
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

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowExportModal(false)}>
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Export CSV</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Period Type</label>
                <select
                  value={exportConfig.granularity}
                  onChange={(e) => {
                    const nextGranularity = e.target.value;
                    setExportConfig((prev) => ({
                      ...prev,
                      granularity: nextGranularity,
                      weekInMonth: 1,
                    }));
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Year</label>
                <select
                  value={exportConfig.year}
                  onChange={(e) => setExportConfig((prev) => ({ ...prev, year: Number(e.target.value), weekInMonth: 1 }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {[...Array(7)].map((_, idx) => {
                    const year = new Date().getFullYear() - 5 + idx;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>

              {exportConfig.granularity !== 'year' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Month</label>
                  <select
                    value={exportConfig.month}
                    onChange={(e) => setExportConfig((prev) => ({ ...prev, month: Number(e.target.value), weekInMonth: 1 }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    {monthNames.map((name, index) => (
                      <option key={name} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {exportConfig.granularity === 'week' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Week in Month</label>
                  <select
                    value={exportConfig.weekInMonth}
                    onChange={(e) => setExportConfig((prev) => ({ ...prev, weekInMonth: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    {[...Array(getWeeksInMonth(exportConfig.year, exportConfig.month))].map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>Week {idx + 1}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExport}
                disabled={loading || !analytics}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
