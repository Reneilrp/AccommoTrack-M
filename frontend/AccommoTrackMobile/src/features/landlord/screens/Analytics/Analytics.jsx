import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../../styles/Landlord/Analytics.js';
import analyticsService from '../../../../services/AnalyticsService.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '₱0';
  const numeric = Number(value) || 0;
  return `₱${numeric.toLocaleString()}`;
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
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [timeRange, setTimeRange] = useState('month');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [properties, setProperties] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadProperties = useCallback(async () => {
    const response = await analyticsService.getProperties();
    if (response.success) {
      setProperties(response.data || []);
    }
  }, []);

  const loadAnalytics = useCallback(async (isManual = false) => {
    setErrorMessage('');
    if (!refreshing && isManual) setLoading(true);
    try {
      const response = await analyticsService.getDashboardAnalytics({
        timeRange,
        propertyId: selectedProperty,
        _t: Date.now()
      });

      if (!response.success) throw new Error(response.error);
      setAnalytics(response.data);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedProperty, timeRange, refreshing]);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleExport = async () => {
    if (!analytics) return;
    setExporting(true);
    try {
      const formatCsvVal = (val) => `"${String(val).replace(/"/g, '""')}"`;
      const rows = [
        ['AccommoTrack Analytics Report'],
        ['Generated:', new Date().toLocaleString()],
        ['Time Range:', timeRange.toUpperCase()],
        ['Property:', selectedProperty === 'all' ? 'All' : properties.find(p=>p.id==selectedProperty)?.title],
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
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const propertyOptions = useMemo(() => [
    { id: 'all', name: 'All Properties' },
    ...properties.map(p => ({ id: p.id, name: p.title || p.name }))
  ], [properties]);

  const selectedPropertyName = propertyOptions.find(p => p.id === selectedProperty)?.name || 'All Properties';

  const MONTH_MAP = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
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

  const renderContent = () => {
    if (!analytics) return null;
    const { overview, revenue, payments, tenants, properties: perf } = analytics;

    return (
      <View style={styles.body}>
        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard 
            label="Total Revenue" 
            value={formatCurrency(overview.total_revenue)} 
            tag="Cumulative"
            icon="cash-outline" color="#16a34a" bgColor="#DCFCE7"
            styles={styles}
          />
          <MetricCard 
            label="Monthly Revenue" 
            value={formatCurrency(overview.monthly_revenue)} 
            tag="This Month"
            icon="trending-up-outline" color="#059669" bgColor="#D1FAE5"
            styles={styles}
          />
          <MetricCard 
            label="Collection Rate" 
            value={`${revenue.collection_rate}%`} 
            tag="Target: 100%"
            icon="checkmark-circle" color="#2563EB" bgColor="#DBEAFE"
            styles={styles}
          />
          <MetricCard 
            label="Payment Success" 
            value={`${payments.payment_rate}%`} 
            tag="Overall"
            icon="shield-checkmark" color="#4F46E5" bgColor="#E0E7FF"
            styles={styles}
          />
          <MetricCard 
            label="Occupancy Rate" 
            value={`${overview.occupancy_rate}%`} 
            subValue={`${overview.occupied_rooms}/${overview.total_rooms} rooms`}
            tag="Occupancy"
            icon="home" color="#7C3AED" bgColor="#EDE9FE"
            styles={styles}
          />
          <MetricCard 
            label="Total Rooms" 
            value={overview.total_rooms} 
            subValue={`${overview.available_rooms} Available`}
            tag="Inventory"
            icon="business" color="#9333EA" bgColor="#F3E8FF"
            styles={styles}
          />
          <MetricCard 
            label="Active Tenants" 
            value={overview.active_tenants} 
            subValue={`+${overview.new_tenants_this_month} New`}
            tag="Active"
            icon="people-outline" color="#DB2777" bgColor="#FCE7F3"
            styles={styles}
          />
          <MetricCard 
            label="Tenant Retention" 
            value={`${tenants.average_stay_months} mo`} 
            tag="Avg Duration"
            icon="calendar" color="#D97706" bgColor="#FEF3C7"
            styles={styles}
          />
        </View>

        {/* Revenue Trend Chart (LineChart) */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Revenue Trend ({timeRange === 'week' ? 'Daily' : timeRange === 'month' ? 'Weekly' : 'Monthly'})</Text>
          {chartData ? (
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - 64}
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
                <Text style={{ color: theme.colors.textSecondary, marginTop: 10 }}>No revenue trend data available</Text>
            </View>
          )}
        </View>

        {/* Payment Status Chart (Bar Chart) */}
        {paymentChartData && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Payment Status</Text>
            <BarChart
              data={paymentChartData}
              width={SCREEN_WIDTH - 64}
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
              style={{ marginVertical: 8, borderRadius: 16, paddingLeft: 0, paddingRight: 30 }}
              showValuesOnTopOfBars={true}
            />
          </View>
        )}

        {/* Property Performance Breakdown */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Property Performance</Text>
          </View>
          {perf.map((p, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.tableColMain}>
                <Text style={styles.tablePropName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.tablePropSub}>{p.occupied_rooms} / {p.total_rooms} Rooms</Text>
                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill, 
                    { width: `${p.occupancy_rate}%`, backgroundColor: p.occupancy_rate >= 80 ? '#22c55e' : p.occupancy_rate >= 50 ? '#3b82f6' : '#f97316' }
                  ]} />
                </View>
              </View>
              <View style={styles.tableColSide}>
                <Text style={styles.tableRate}>{p.occupancy_rate}%</Text>
                <Text style={styles.tableRevenue}>{formatCurrency(p.monthly_revenue)}</Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: p.occupancy_rate >= 90 ? '#dcfce7' : p.occupancy_rate >= 50 ? '#dbeafe' : '#ffedd5' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: p.occupancy_rate >= 90 ? '#15803d' : p.occupancy_rate >= 50 ? '#1e40af' : '#9a3412' }
                  ]}>
                    {p.occupancy_rate >= 90 ? 'OPTIMAL' : p.occupancy_rate >= 50 ? 'STABLE' : 'ATTENTION'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
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
            onPress={() => loadAnalytics(true)} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleExport} disabled={exporting || !analytics}>
            {exporting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="download-outline" size={24} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={{ zIndex: 2000 }}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownOpen(!dropdownOpen)}>
            <Text style={styles.dropdownButtonText}>{selectedPropertyName}</Text>
            <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#16a34a" />
          </TouchableOpacity>
          {dropdownOpen && (
            <View style={styles.dropdownList}>
              <ScrollView>
                {propertyOptions.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.dropdownItem, selectedProperty === p.id && styles.dropdownItemSelected]}
                    onPress={() => { setSelectedProperty(p.id); setDropdownOpen(false); }}
                  >
                    <Text style={styles.dropdownItemText}>{p.name}</Text>
                    {selectedProperty === p.id && <Ionicons name="checkmark" size={18} color="#16a34a" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
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
    </SafeAreaView>
  );
}
