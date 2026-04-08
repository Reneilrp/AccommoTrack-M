import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../../styles/Landlord/Analytics.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import analyticsService from '../../../../services/AnalyticsService.js';

const EMPTY_PROPERTIES = [];

const MONTH_MAP = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const EXPORT_YEAR_MIN = 2024;

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '₱0';
  const numeric = Number(value) || 0;
  return `₱${numeric.toLocaleString()}`;
};

const shareOrNotify = async (fileUri) => {
  const isAvailable = typeof Sharing?.isAvailableAsync === 'function'
    ? await Sharing.isAvailableAsync()
    : true;

  if (isAvailable) {
    await Sharing.shareAsync(fileUri);
    return;
  }

  Alert.alert('Export complete', `CSV saved to: ${fileUri}`);
};

const getOccupancyStatusMeta = (rateValue) => {
  const rate = Number(rateValue) || 0;

  if (rate >= 90) {
    return {
      label: 'OPTIMAL',
      backgroundColor: '#dcfce7',
      textColor: '#15803d',
    };
  }

  if (rate >= 50) {
    return {
      label: 'STABLE',
      backgroundColor: '#dbeafe',
      textColor: '#1e40af',
    };
  }

  return {
    label: 'ATTENTION',
    backgroundColor: '#ffedd5',
    textColor: '#9a3412',
  };
};

const MetricCard = ({ label, value, subValue, tag, icon, color, bgColor, styles }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={[styles.metricIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.metricTag}>{tag}</Text>
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    {subValue ? <Text style={styles.metricSubValue}>{subValue}</Text> : null}
  </View>
);

export default function Analytics({ navigation }) {
  const { width: viewportWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme, viewportWidth), [theme, viewportWidth]);
  const chartWidth = React.useMemo(
    () => Math.max(260, Math.min(viewportWidth - 64, 920)),
    [viewportWidth],
  );
  const now = React.useMemo(() => new Date(), []);
  const [timeRange, setTimeRange] = useState('month');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState(() => ({
    granularity: 'month',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    weekInMonth: Math.floor((now.getDate() - 1) / 7) + 1,
  }));

  const propertiesQuery = useQuery({
    queryKey: landlordQueryKeys.analyticsProperties(),
    queryFn: async () => {
      const response = await analyticsService.getProperties();
      if (!response.success) {
        throw new Error(response.error || 'Unable to load properties');
      }

      return Array.isArray(response.data) ? response.data : EMPTY_PROPERTIES;
    },
    placeholderData: (previousData) => previousData,
  });

  const properties = propertiesQuery.data || EMPTY_PROPERTIES;
  const effectiveSelectedProperty = properties.length === 1
    ? String(properties[0].id)
    : selectedProperty;
  const showPropertySelector = properties.length > 1;

  const analyticsQuery = useQuery({
    queryKey: landlordQueryKeys.analyticsDashboard({ propertyId: effectiveSelectedProperty, timeRange }),
    enabled: !propertiesQuery.isPending,
    queryFn: async () => {
      const response = await analyticsService.getDashboardAnalytics({
        timeRange,
        propertyId: effectiveSelectedProperty,
        _t: Date.now(),
      });
      if (!response.success) {
        throw new Error(response.error || 'Unable to load analytics');
      }

      return response.data || null;
    },
    placeholderData: (previousData) => previousData,
  });
  const analytics = analyticsQuery.data || null;
  const loading = analyticsQuery.isPending && !analytics;
  const isAnalyticsFetching = analyticsQuery.isFetching;
  const errorMessage = analyticsQuery.error?.message || propertiesQuery.error?.message || '';
  const refetchProperties = propertiesQuery.refetch;
  const refetchAnalytics = analyticsQuery.refetch;
  const analyticsRefetchers = useMemo(
    () => [refetchProperties, refetchAnalytics],
    [refetchProperties, refetchAnalytics],
  );

  useLandlordFocusRefetch({ refetchers: analyticsRefetchers });

  useEffect(() => {
    if (properties.length > 1 && selectedProperty !== 'all') {
      const stillExists = properties.some(
        (property) => String(property.id) === String(selectedProperty),
      );

      if (!stillExists) {
        setSelectedProperty('all');
      }
    }
  }, [properties, selectedProperty]);

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: analyticsRefetchers,
  });

  const getWeeksInMonth = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Math.max(1, Math.ceil(daysInMonth / 7));
  };

  const buildExportWindow = (config) => {
    const { granularity, year, month, weekInMonth } = config;

    if (granularity === 'year') {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return {
        start,
        end,
        timeRangeParam: 'year',
        label: `Yearly (${year})`,
      };
    }

    if (granularity === 'week') {
      const daysInMonth = new Date(year, month, 0).getDate();
      const startDay = 1 + ((weekInMonth - 1) * 7);
      const endDay = Math.min(startDay + 6, daysInMonth);
      const start = new Date(year, month - 1, startDay);
      const end = new Date(year, month - 1, endDay, 23, 59, 59, 999);

      return {
        start,
        end,
        timeRangeParam: 'week',
        label: `Week ${weekInMonth} (${MONTH_NAMES[month - 1]} ${year})`,
      };
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return {
      start,
      end,
      timeRangeParam: 'month',
      label: `Monthly (${MONTH_NAMES[month - 1]} ${year})`,
    };
  };

  const openExportModal = () => {
    const exportNow = new Date();
    const baseConfig = {
      granularity: timeRange,
      year: exportNow.getFullYear(),
      month: exportNow.getMonth() + 1,
      weekInMonth: Math.floor((exportNow.getDate() - 1) / 7) + 1,
    };

    const maxWeek = getWeeksInMonth(baseConfig.year, baseConfig.month);
    setExportConfig({
      ...baseConfig,
      weekInMonth: Math.min(baseConfig.weekInMonth, maxWeek),
    });
    setShowExportModal(true);
  };

  const adjustExportYear = (delta) => {
    setExportConfig((prev) => {
      const currentYear = new Date().getFullYear();
      const nextYear = Math.min(currentYear + 1, Math.max(EXPORT_YEAR_MIN, prev.year + delta));
      const maxWeek = getWeeksInMonth(nextYear, prev.month);
      return {
        ...prev,
        year: nextYear,
        weekInMonth: Math.min(prev.weekInMonth, maxWeek),
      };
    });
  };

  const adjustExportMonth = (delta) => {
    setExportConfig((prev) => {
      let nextMonth = prev.month + delta;
      let nextYear = prev.year;

      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      } else if (nextMonth < 1) {
        nextMonth = 12;
        nextYear -= 1;
      }

      const currentYear = new Date().getFullYear();
      nextYear = Math.min(currentYear + 1, Math.max(EXPORT_YEAR_MIN, nextYear));

      const maxWeek = getWeeksInMonth(nextYear, nextMonth);
      return {
        ...prev,
        month: nextMonth,
        year: nextYear,
        weekInMonth: Math.min(prev.weekInMonth, maxWeek),
      };
    });
  };

  const adjustExportWeek = (delta) => {
    setExportConfig((prev) => {
      const maxWeek = getWeeksInMonth(prev.year, prev.month);
      return {
        ...prev,
        weekInMonth: Math.min(maxWeek, Math.max(1, prev.weekInMonth + delta)),
      };
    });
  };

  const handleExport = async (windowConfig = null) => {
    if (!analytics) return;
    setExporting(true);
    try {
      const exportWindow = windowConfig || {
        timeRangeParam: timeRange,
        label: timeRange.toUpperCase(),
      };
      const rangeStart = exportWindow?.start
        ? exportWindow.start.toISOString().split('T')[0]
        : null;
      const rangeEnd = exportWindow?.end
        ? exportWindow.end.toISOString().split('T')[0]
        : null;

      const exportResponse = await analyticsService.exportAnalyticsCsv({
        time_range: exportWindow.timeRangeParam || timeRange,
        ...(rangeStart ? { start_date: rangeStart } : {}),
        ...(rangeEnd ? { end_date: rangeEnd } : {}),
        ...(effectiveSelectedProperty !== 'all' ? { property_id: effectiveSelectedProperty } : {}),
      });

      if (exportResponse.success && exportResponse.data) {
        const normalizedLabel = String(exportWindow.label || timeRange)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
        const serverFileName = exportResponse.filename || `AccommoTrack_Analytics_${normalizedLabel}_${new Date().toISOString().split('T')[0]}.csv`;
        const serverFileUri = `${FileSystem.documentDirectory}${serverFileName}`;
        await FileSystem.writeAsStringAsync(serverFileUri, exportResponse.data, {
          encoding: FileSystem.EncodingType.UTF8
        });
        await shareOrNotify(serverFileUri);
        return;
      }

      const formatCsvVal = (val) => `"${String(val).replace(/"/g, '""')}"`;
      const rows = [
        ['AccommoTrack Analytics Report'],
        ['Generated:', new Date().toLocaleString()],
        ['Time Range:', exportWindow.label || timeRange.toUpperCase()],
        ...(rangeStart ? [['Start Date:', rangeStart]] : []),
        ...(rangeEnd ? [['End Date:', rangeEnd]] : []),
        ['Property:', effectiveSelectedProperty === 'all' ? 'All' : properties.find((p) => String(p.id) === String(effectiveSelectedProperty))?.title],
        [''],
        ['Metric', 'Value'],
        ['Total Revenue', analytics.overview.total_revenue],
        ['Monthly Revenue', analytics.overview.monthly_revenue],
        ['Collection Rate', `${analytics.revenue.collection_rate}%`],
        ['Occupancy Rate', `${analytics.overview.occupancy_rate}%`]
      ];
      const csv = rows.map(r => r.map(formatCsvVal).join(',')).join('\n');
      const fileUri = `${FileSystem.documentDirectory}Analytics_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await shareOrNotify(fileUri);
    } catch (_err) {
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmExport = async () => {
    const exportWindow = buildExportWindow(exportConfig);
    await handleExport(exportWindow);
    setShowExportModal(false);
  };

  const revenueTrend = useMemo(() => analytics?.revenue?.monthly_trend || [], [analytics]);
  
  const chartData = useMemo(() => {
    let trend = revenueTrend;
    
    // If no data, create a "zeroed" blank state based on timeRange
    if (!trend || trend.length === 0) {
      if (timeRange === 'week') {
        trend = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          trend.push({ month: d.toISOString().split('T')[0], revenue: 0 });
        }
      } else if (timeRange === 'month') {
        trend = [
          { month: 'Week 1', revenue: 0 },
          { month: 'Week 2', revenue: 0 },
          { month: 'Week 3', revenue: 0 },
          { month: 'Week 4', revenue: 0 },
        ];
      } else {
        trend = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          trend.push({ month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`, revenue: 0 });
        }
      }
    }

    const formatLabel = (period) => {
      if (!period) return '';
      if (timeRange === 'week') {
        const date = new Date(period);
        return isNaN(date.getTime()) ? period : date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      if (timeRange === 'month') {
        if (typeof period === 'string' && period.includes('Week')) {
            return period.replace('Week ', 'W');
        }
        return period;
      }
      if (timeRange === 'year') {
        const parts = period.split('-');
        if (parts.length > 1) {
            return MONTH_MAP[parts[1]] || period;
        }
        return period;
      }
      return period;
    };

    return {
      labels: trend.map(t => formatLabel(t.month || t.period)),
      datasets: [{ 
          data: trend.map(t => Number(t.revenue) || 0),
          color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
          strokeWidth: 2
      }]
    };
  }, [revenueTrend, timeRange]);

  const paymentChartData = useMemo(() => {
    if (!analytics?.payments) return null;
    const { paid, unpaid, partial, overdue } = analytics.payments;
    return {
      labels: ['Paid', 'Pending', 'Partial', 'Overdue'],
      datasets: [{
        data: [paid || 0, unpaid || 0, partial || 0, overdue || 0]
      }]
    };
  }, [analytics]);

  const incomeBreakdownData = useMemo(() => {
    if (!analytics) return [];

    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4'];

    const allPropertiesBreakdown = (analytics.properties || [])
      .map((property) => ({
        name: property.name || property.title || 'Unnamed Property',
        value: Number(property.monthly_revenue || 0),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const selectedPropertyBreakdown = (analytics.revenue?.income_breakdown || [])
      .map((item) => ({
        name: item.name || 'Unknown',
        value: Number(item.value || 0),
      }))
      .filter((item) => item.value > 0);

    const raw = effectiveSelectedProperty === 'all'
      ? (allPropertiesBreakdown.length > 0 ? allPropertiesBreakdown : selectedPropertyBreakdown)
      : selectedPropertyBreakdown;

    return raw
      .map((item, index) => ({
        name: item.name,
        population: item.value,
        color: palette[index % palette.length],
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 11,
      }));
  }, [analytics, effectiveSelectedProperty, theme.colors.textSecondary]);

  const incomeBreakdownTotal = useMemo(
    () => incomeBreakdownData.reduce((sum, item) => sum + Number(item.population || 0), 0),
    [incomeBreakdownData],
  );

  const incomePerformanceData = useMemo(() => {
    if (!analytics) return null;

    const source = effectiveSelectedProperty === 'all'
      ? (analytics.properties || []).map((property, index) => ({
          label: property.name || property.title || `P${index + 1}`,
          value: Number(property.revpar ?? property.monthly_revenue ?? 0),
        }))
      : (analytics.room_performance || []).map((room, index) => ({
          label: room.name || room.room_name || room.room_number || `R${index + 1}`,
          value: Number(room.revpar ?? room.income_per_room ?? room.revenue ?? room.monthly_revenue ?? 0),
        }));

    const ranked = source
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    if (ranked.length === 0) return null;

    return {
      labels: ranked.map((item) => String(item.label).slice(0, 8)),
      datasets: [{
        data: ranked.map((item) => item.value),
      }],
      raw: ranked,
    };
  }, [analytics, effectiveSelectedProperty]);

  const renderContent = () => {
    if (!analytics) return null;
    const {
      overview,
      revenue,
      tenants,
      properties: propertyPerformance = [],
      room_performance: roomPerformance = [],
    } = analytics;
    const monthlyGrowthRate = Number(overview?.revenue_growth_rate || 0);
    const growthPrefix = monthlyGrowthRate > 0 ? '+' : '';
    const showRoomPerformance = effectiveSelectedProperty !== 'all';

    return (
      <View style={styles.body}>
        {/* Metric Cards Grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metricsScroll}
          contentContainerStyle={styles.metricsGrid}
        >
          <MetricCard 
            label="Total Revenue" 
            value={formatCurrency(overview.total_revenue)} 
            tag="All-Time"
            icon="cash-outline" color="#16a34a" bgColor="#DCFCE7"
            styles={styles}
          />
          <MetricCard 
            label="Monthly Revenue" 
            value={formatCurrency(overview.monthly_revenue)} 
            subValue={`${growthPrefix}${monthlyGrowthRate}% vs last month`}
            tag="Current Month"
            icon="trending-up-outline" color="#16a34a" bgColor="#D1FAE5"
            styles={styles}
          />
          <MetricCard 
            label="Collected" 
            value={formatCurrency(revenue.actual_monthly ?? overview.monthly_revenue)} 
            tag="This Month"
            icon="wallet-outline" color="#0f766e" bgColor="#CCFBF1"
            styles={styles}
          />
          <MetricCard 
            label="Active Tenants" 
            value={overview.active_tenants} 
            tag={effectiveSelectedProperty === 'all' ? 'Across Properties' : 'This Property'}
            icon="people-outline" color="#4F46E5" bgColor="#E0E7FF"
            styles={styles}
          />
          <MetricCard 
            label="New Tenants" 
            value={overview.new_tenants_this_month} 
            subValue={`${tenants.average_stay_months} mo avg stay`}
            tag="This Month"
            icon="person-add-outline" color="#9333EA" bgColor="#F3E8FF"
            styles={styles}
          />
        </ScrollView>

        {/* Revenue Trend Chart (LineChart) */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Revenue Trend ({timeRange === 'week' ? 'Daily' : timeRange === 'month' ? 'Weekly' : 'Monthly'})</Text>
          {chartData ? (
            <LineChart
              data={chartData}
              width={chartWidth}
              height={220}
              yAxisLabel="₱"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#16a34a"
                }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16, paddingLeft: 0, paddingRight: 40 }}
            />
          ) : (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="stats-chart-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>No revenue trend data available</Text>
            </View>
          )}
        </View>

        {/* Payment Status Chart (Bar Chart) */}
        {paymentChartData && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Invoicing Health</Text>
            <BarChart
              data={paymentChartData}
              width={chartWidth}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero={true}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.textSecondary,
                style: { borderRadius: 16 },
                fillShadowGradient: '#2563EB',
                fillShadowGradientOpacity: 1,
              }}
              verticalLabelRotation={0}
              style={{ marginVertical: 8, borderRadius: 16, paddingLeft: 0, paddingRight: 32 }}
              showValuesOnTopOfBars={true}
            />
          </View>
        )}

        {/* Income Mix */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>{effectiveSelectedProperty === 'all' ? 'Income Breakdown per Property' : 'Income Breakdown'}</Text>
          {incomeBreakdownData.length > 0 ? (
            <>
              <PieChart
                data={incomeBreakdownData}
                width={chartWidth}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => theme.colors.textSecondary,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="6"
                hasLegend
                absolute
              />
              <Text style={{ marginTop: 8, color: theme.colors.textSecondary, fontSize: 12 }}>
                Total: {formatCurrency(incomeBreakdownTotal)}
              </Text>
            </>
          ) : (
            <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="pie-chart-outline" size={44} color={theme.colors.textTertiary} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>No income mix data available</Text>
            </View>
          )}
        </View>

        {/* Income Performance (Property or Room) */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>{effectiveSelectedProperty === 'all' ? 'Income Per Properties' : 'Income Per Room'}</Text>
          {incomePerformanceData ? (
            <>
              <BarChart
                data={incomePerformanceData}
                width={chartWidth}
                height={240}
                yAxisLabel="₱"
                yAxisSuffix=""
                fromZero={true}
                chartConfig={{
                  backgroundColor: theme.colors.surface,
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => theme.colors.textSecondary,
                  style: { borderRadius: 16 },
                  fillShadowGradient: '#10B981',
                  fillShadowGradientOpacity: 1,
                }}
                verticalLabelRotation={0}
                style={{ marginVertical: 8, borderRadius: 16, paddingLeft: 0, paddingRight: 32 }}
                showValuesOnTopOfBars={false}
              />
              {incomePerformanceData.raw.map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.label}</Text>
                  <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>{formatCurrency(item.value)}</Text>
                </View>
              ))}
            </>
          ) : (
            <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="bar-chart-outline" size={44} color={theme.colors.textTertiary} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>No income performance data available</Text>
            </View>
          )}
        </View>

        {/* Property / Room Performance Breakdown */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>{showRoomPerformance ? 'Room Performance Breakdown' : 'Property Performance Breakdown'}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tableContentContainer}
          >
            <View style={styles.tableGrid}>
              {showRoomPerformance ? (
                <>
                  <View style={styles.tableHeadRow}>
                    <Text style={[styles.tableHeadCell, { width: 180 }]}>Room Name</Text>
                    <Text style={[styles.tableHeadCell, { width: 130 }]}>Occupancy Rate</Text>
                    <Text style={[styles.tableHeadCell, { width: 110 }]}>Capacity</Text>
                    <Text style={[styles.tableHeadCell, { width: 150 }]}>Monthly Revenue</Text>
                    <Text style={[styles.tableHeadCell, { width: 140 }]}>Income / Room</Text>
                    <Text style={[styles.tableHeadCell, { width: 130 }]}>Status</Text>
                  </View>

                  {roomPerformance.length > 0 ? roomPerformance.map((room, index) => {
                    const occupancyRate = Number(room.occupancy_rate || 0);
                    const statusMeta = getOccupancyStatusMeta(occupancyRate);

                    return (
                      <View key={room.id || index} style={styles.tableBodyRow}>
                        <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={1}>
                          {room.name || room.room_name || room.room_number || `Room ${index + 1}`}
                        </Text>
                        <Text style={[styles.tableCell, { width: 130 }]}>{occupancyRate}%</Text>
                        <Text style={[styles.tableCell, { width: 110 }]}>{Number(room.capacity || 0)}</Text>
                        <Text style={[styles.tableCell, { width: 150 }]}>{formatCurrency(room.revenue ?? room.monthly_revenue ?? 0)}</Text>
                        <Text style={[styles.tableCell, { width: 140 }]}>{formatCurrency(room.revpar ?? room.income_per_room ?? 0)}</Text>
                        <View style={[styles.tableStatusCell, { width: 130 }]}>
                          <View style={[styles.statusBadge, { marginTop: 0, backgroundColor: statusMeta.backgroundColor }]}>
                            <Text style={[styles.statusBadgeText, { color: statusMeta.textColor }]}>{statusMeta.label}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  }) : (
                    <View style={styles.tableEmptyRow}>
                      <Text style={styles.tableEmptyText}>No room performance data available.</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.tableHeadRow}>
                    <Text style={[styles.tableHeadCell, { width: 180 }]}>Property Name</Text>
                    <Text style={[styles.tableHeadCell, { width: 130 }]}>Occupancy Rate</Text>
                    <Text style={[styles.tableHeadCell, { width: 140 }]}>Rooms (Occ/Total)</Text>
                    <Text style={[styles.tableHeadCell, { width: 150 }]}>Monthly Revenue</Text>
                    <Text style={[styles.tableHeadCell, { width: 140 }]}>Income / Room</Text>
                    <Text style={[styles.tableHeadCell, { width: 130 }]}>Status</Text>
                  </View>

                  {propertyPerformance.length > 0 ? propertyPerformance.map((property, index) => {
                    const occupancyRate = Number(property.occupancy_rate || 0);
                    const statusMeta = getOccupancyStatusMeta(occupancyRate);

                    return (
                      <View key={property.id || index} style={styles.tableBodyRow}>
                        <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={1}>
                          {property.name || property.title || `Property ${index + 1}`}
                        </Text>
                        <Text style={[styles.tableCell, { width: 130 }]}>{occupancyRate}%</Text>
                        <Text style={[styles.tableCell, { width: 140 }]}>
                          {Number(property.occupied_slots ?? property.occupied_rooms ?? 0)} / {Number(property.total_slots ?? property.total_rooms ?? 0)}
                        </Text>
                        <Text style={[styles.tableCell, { width: 150 }]}>{formatCurrency(property.monthly_revenue ?? 0)}</Text>
                        <Text style={[styles.tableCell, { width: 140 }]}>{formatCurrency(property.revpar ?? property.income_per_property ?? 0)}</Text>
                        <View style={[styles.tableStatusCell, { width: 130 }]}>
                          <View style={[styles.statusBadge, { marginTop: 0, backgroundColor: statusMeta.backgroundColor }]}>
                            <Text style={[styles.statusBadgeText, { color: statusMeta.textColor }]}>{statusMeta.label}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  }) : (
                    <View style={styles.tableEmptyRow}>
                      <Text style={styles.tableEmptyText}>No property performance data available.</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      {/* Standard Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity 
            style={[styles.iconButton, { marginRight: 8 }]} 
            onPress={handleRefresh}
            testID="analytics-refresh-button"
            disabled={isAnalyticsFetching}
          >
            {isAnalyticsFetching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={openExportModal}
            testID="analytics-open-export-modal-button"
            disabled={exporting || !analytics}
          >
            {exporting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="download-outline" size={24} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {showPropertySelector ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selectedProperty === 'all' ? theme.colors.primary : theme.colors.border,
                backgroundColor: selectedProperty === 'all' ? theme.colors.primary : theme.colors.surface,
              }}
              onPress={() => setSelectedProperty('all')}
            >
              <Text style={{ color: selectedProperty === 'all' ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                All Properties
              </Text>
            </TouchableOpacity>
            {properties.map((property) => {
              const propertyKey = String(property.id);
              const isActive = String(selectedProperty) === propertyKey;
              return (
                <TouchableOpacity
                  key={property.id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  }}
                  onPress={() => setSelectedProperty(propertyKey)}
                >
                  <Text style={{ color: isActive ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                    {property.title || property.name || `Property ${property.id}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.timeButtonContainer}>
          {['week', 'month', 'year'].map(r => (
            <TouchableOpacity 
              key={r} 
              style={[styles.timeButton, timeRange === r && styles.timeButtonActive]}
              onPress={() => setTimeRange(r)}
            >
              <Text style={[styles.timeButtonText, timeRange === r && styles.timeButtonTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View style={styles.errorBanner}><Text style={styles.errorText}>{errorMessage}</Text></View>
        ) : null}

        {loading && !analytics ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={styles.loadingLabel}>Synchronizing analytics...</Text>
          </View>
        ) : renderContent()}
      </ScrollView>

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowExportModal(false)}
      >
        <Pressable style={styles.exportModalOverlay} onPress={() => setShowExportModal(false)}>
          <Pressable style={styles.exportModalCard} onPress={() => {}}>
            <Text style={styles.exportModalTitle}>Export Analytics Report</Text>

            <Text style={styles.exportLabel}>Granularity</Text>
            <View style={styles.exportSegmentRow}>
              {['week', 'month', 'year'].map((unit) => {
                const active = exportConfig.granularity === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.exportSegmentButton, active && styles.exportSegmentButtonActive]}
                    onPress={() => setExportConfig((prev) => ({ ...prev, granularity: unit }))}
                  >
                    <Text style={[styles.exportSegmentText, active && styles.exportSegmentTextActive]}>
                      {unit.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.exportLabel}>Year</Text>
            <View style={styles.exportStepperRow}>
              <TouchableOpacity style={styles.exportStepButton} onPress={() => adjustExportYear(-1)}>
                <Ionicons name="remove" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.exportStepperValue}>{exportConfig.year}</Text>
              <TouchableOpacity style={styles.exportStepButton} onPress={() => adjustExportYear(1)}>
                <Ionicons name="add" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {exportConfig.granularity !== 'year' && (
              <>
                <Text style={styles.exportLabel}>Month</Text>
                <View style={styles.exportStepperRow}>
                  <TouchableOpacity style={styles.exportStepButton} onPress={() => adjustExportMonth(-1)}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.exportStepperValue}>{MONTH_NAMES[exportConfig.month - 1]}</Text>
                  <TouchableOpacity style={styles.exportStepButton} onPress={() => adjustExportMonth(1)}>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {exportConfig.granularity === 'week' && (
              <>
                <Text style={styles.exportLabel}>Week In Month</Text>
                <View style={styles.exportStepperRow}>
                  <TouchableOpacity style={styles.exportStepButton} onPress={() => adjustExportWeek(-1)}>
                    <Ionicons name="remove" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.exportStepperValue}>Week {exportConfig.weekInMonth}</Text>
                  <TouchableOpacity style={styles.exportStepButton} onPress={() => adjustExportWeek(1)}>
                    <Ionicons name="add" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.exportActionsRow}>
              <TouchableOpacity
                style={[styles.exportActionButton, styles.exportCancelButton]}
                onPress={() => setShowExportModal(false)}
                disabled={exporting}
              >
                <Text style={styles.exportCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportActionButton, styles.exportConfirmButton]}
                onPress={handleConfirmExport}
                testID="analytics-export-confirm-button"
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.exportConfirmText}>Export CSV</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
