import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../../contexts/ThemeContext';
import Button from '../components/Button';
import { styles } from '../../../styles/Landlord/Analytics';
import LandlordAnalyticsService from '../../../services/LandlordAnalyticsService';

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '₱0';
  const numeric = Number(value) || 0;
  return `₱${numeric.toLocaleString()}`;
};

const TimeRangeButton = ({ label, value, isSelected, onPress }) => (
  <Button
    onPress={() => onPress(value)}
    style={[
      styles.timeButton,
      isSelected ? styles.timeButtonActive : styles.timeButtonInactive
    ]}
    type="transparent"
  >
    <Text
      style={[
        styles.timeButtonText,
        isSelected ? styles.timeButtonTextActive : styles.timeButtonTextInactive
      ]}
    >
      {label}
    </Text>
  </Button>
);

const StatCard = ({ title, value, color, icon, hint, bgColor }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardHeader}>
      <View style={[styles.statIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      {hint ? <Text style={[styles.statHint, { color }]}>{hint}</Text> : null}
    </View>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const BarChartItem = ({ label, revenue, maxRevenue }) => {
  const heightPercent = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  return (
    <View style={styles.barItem}>
      <View style={styles.barWrapper}>
        <View style={[styles.bar, { height: `${heightPercent}%` }]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
};

const paymentPalette = [
  { key: 'paid', label: 'Paid', color: '#059669', background: '#DCFCE7' },
  { key: 'unpaid', label: 'Pending', color: '#D97706', background: '#FEF3C7' },
  { key: 'partial', label: 'Partial', color: '#2563EB', background: '#DBEAFE' },
  { key: 'overdue', label: 'Overdue', color: '#DC2626', background: '#FEE2E2' }
];

const bookingPalette = [
  { key: 'confirmed', label: 'Confirmed', color: '#059669', background: '#DCFCE7' },
  { key: 'pending', label: 'Pending', color: '#D97706', background: '#FEF3C7' },
  { key: 'completed', label: 'Completed', color: '#2563EB', background: '#DBEAFE' },
  { key: 'cancelled', label: 'Cancelled', color: '#DC2626', background: '#FEE2E2' }
];

export default function Analytics({ navigation }) {
  const { theme } = useTheme();
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
    const response = await LandlordAnalyticsService.fetchProperties();
    if (response.success) {
      setProperties(response.data || []);
    } else {
      setErrorMessage((prev) => prev || response.error);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const response = await LandlordAnalyticsService.fetchDashboard({
        timeRange,
        propertyId: selectedProperty
      });

      if (!response.success) {
        throw new Error(response.error || 'Unable to load analytics');
      }

      setAnalytics(response.data);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedProperty, timeRange]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  const downloadAnalyticsCSV = async () => {
    if (!analytics) return;
    
    try {
      setExporting(true);
      
      const formatVal = (amount) => `PHP ${Number(amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
      const formatPct = (val) => `${Number(val || 0).toFixed(1)}%`;
      
      const totalPaymentCount = (analytics.payments?.paid || 0) + (analytics.payments?.unpaid || 0) + (analytics.payments?.partial || 0) + (analytics.payments?.overdue || 0) || 1;

      const rows = [
        ['AccommoTrack Analytics Report'],
        ['Generated:', new Date().toLocaleString()],
        ['Time Range:', timeRange.toUpperCase()],
        ['Property Filter:', selectedProperty === 'all' ? 'All Properties' : (properties?.find(p => p.id == selectedProperty)?.title || 'Selected Property')],
        [''],
        ['=== BUSINESS OVERVIEW ==='],
        ['Metric', 'Value'],
        ['Total Revenue', formatVal(analytics.overview.total_revenue)],
        ['Monthly Revenue', formatVal(analytics.overview.monthly_revenue)],
        ['Revenue Collection Rate', formatPct(analytics.revenue.collection_rate)],
        ['Occupancy Rate', formatPct(analytics.overview.occupancy_rate)],
        [''],
        ['=== INVENTORY & TENANTS ==='],
        ['Metric', 'Value'],
        ['Total Rooms', analytics.overview.total_rooms],
        ['Occupied Rooms', analytics.overview.occupied_rooms],
        ['Available Rooms', analytics.overview.available_rooms],
        ['Active Tenants', analytics.overview.active_tenants],
        ['New Tenants', analytics.overview.new_tenants_this_month],
        ['Avg Stay Duration', `${analytics.tenants.average_stay_months} months`],
        [''],
        ['=== REVENUE TREND ==='],
        ['Period', 'Revenue'],
        ...analytics.revenue.monthly_trend.map(item => [item.month, formatVal(item.revenue)]),
        [''],
        ['=== PAYMENT PERFORMANCE ==='],
        ['Status', 'Count', 'Percent'],
        ['Paid', analytics.payments.paid, formatPct((analytics.payments.paid / totalPaymentCount) * 100)],
        ['Pending', analytics.payments.unpaid, formatPct((analytics.payments.unpaid / totalPaymentCount) * 100)],
        ['Partial', analytics.payments.partial, formatPct((analytics.payments.partial / totalPaymentCount) * 100)],
        ['Overdue', analytics.payments.overdue, formatPct((analytics.payments.overdue / totalPaymentCount) * 100)],
        [''],
        ['=== PROPERTY PERFORMANCE ==='],
        ['Property', 'Occupancy', 'Revenue'],
        ...analytics.properties.map(p => [
          p.name, 
          formatPct(p.occupancy_rate), 
          formatVal(p.monthly_revenue)
        ])
      ];

      const csvContent = rows.map(e => e.map(i => `"${String(i).replace(/"/g, '""')}"`).join(",")).join("\n");
      const filename = `Analytics_${new Date().getTime()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'CSV saved to documents.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate or share CSV.');
    } finally {
      setExporting(false);
    }
  };

  const overview = analytics?.overview;
  const roomTypes = analytics?.roomTypes || [];
  const revenueTrend = analytics?.revenue?.monthly_trend || [];
  const payments = analytics?.payments || {};
  const bookings = analytics?.bookings || {};
  const topProperty = analytics?.properties?.[0] || null;

  const statCards = useMemo(() => [
    {
      title: 'Total Revenue',
      value: formatCurrency(overview?.total_revenue),
      icon: 'cash-outline',
      color: '#059669',
      bgColor: '#DCFCE7',
      hint: overview ? `${analytics?.revenue?.collection_rate || 0}%` : null
    },
    {
      title: 'Occupancy Rate',
      value: overview ? `${overview.occupancy_rate || 0}%` : '0%',
      icon: 'home-outline',
      color: '#2563EB',
      bgColor: '#DBEAFE',
      hint: overview ? `${overview.occupied_rooms || 0}/${overview.total_rooms || 0}` : null
    },
    {
      title: 'Active Tenants',
      value: overview?.active_tenants?.toString() || '0',
      icon: 'people-outline',
      color: '#7C3AED',
      bgColor: '#EDE9FE',
      hint: overview ? `+${overview.new_tenants_this_month || 0}` : null
    },
    {
      title: 'Avg Stay',
      value: `${analytics?.tenants?.average_stay_months || 0} mo`,
      icon: 'time-outline',
      color: '#D97706',
      bgColor: '#FEF3C7',
      hint: analytics?.tenants ? `${analytics.tenants.move_ins || 0} in` : null
    }
  ], [analytics, overview]);

  const propertyComparisonVisible =
    selectedProperty === 'all' && (analytics?.properties?.length || 0) > 1;

  const maxRevenue = useMemo(() => {
    if (!revenueTrend.length) return 0;
    return Math.max(...revenueTrend.map((item) => Number(item.revenue) || 0));
  }, [revenueTrend]);

  const propertyOptions = useMemo(
    () => [
      { id: 'all', name: 'All Properties' },
      ...(properties || []).map((p) => ({ id: p.id, name: p.name || p.title || 'Unnamed Property' }))
    ],
    [properties]
  );

  const selectedPropertyName = useMemo(() => {
    const found = propertyOptions.find((p) => p.id === selectedProperty);
    return found?.name || 'All Properties';
  }, [propertyOptions, selectedProperty]);

  const handleSelectProperty = (id) => {
    setSelectedProperty(id);
    setDropdownOpen(false);
  };

  const renderContent = () => (
    <View style={styles.body}>
      {/* Key Metrics - Horizontal Scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.statsScrollContainer}
      >
        {statCards.map((card, index) => (
          <StatCard key={card.title + index} {...card} />
        ))}
      </ScrollView>

      {/* Revenue Trend Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Revenue Trend</Text>
        {revenueTrend.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No revenue data yet</Text>
            <Text style={styles.emptySubtitle}>Try a different time range.</Text>
          </View>
        ) : (
          <View style={styles.barChartContainer}>
            {revenueTrend.map((item) => (
              <BarChartItem
                key={`${item.month}-${item.revenue}`}
                label={item.month}
                revenue={Number(item.revenue) || 0}
                maxRevenue={maxRevenue}
              />
            ))}
          </View>
        )}
      </View>

      {/* Room Type Performance - Horizontal Scroll */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Room Type Performance</Text>
        {roomTypes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No room data</Text>
            <Text style={styles.emptySubtitle}>Rooms will appear here once added.</Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomScrollContainer}
          >
            {roomTypes.map((room) => (
              <View key={room.type_key || room.type} style={styles.roomCard}>
                <View style={styles.roomCardHeader}>
                  <Text style={styles.roomType}>{room.type}</Text>
                  <Text style={styles.roomRevenueValue}>{formatCurrency(room.revenue)}</Text>
                </View>
                <Text style={styles.roomDetails}>{room.occupied} of {room.total} occupied</Text>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[styles.progressBarFill, { width: `${room.occupancy_rate || 0}%` }]}
                  />
                </View>
                <Text style={styles.roomOccupancy}>
                  {room.occupancy_rate || 0}% • {room.available || 0} available
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Payment Status - 2x2 Grid with Horizontal Scroll */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Payment Status</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paymentScrollContainer}
        >
          {paymentPalette.map((item) => (
            <View key={item.key} style={[styles.paymentCard, { backgroundColor: item.background }]}>
              <Text style={[styles.paymentValue, { color: item.color }]}>
                {payments[item.key] || 0}
              </Text>
              <Text style={[styles.paymentLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.collectionFooter}>
          <Text style={styles.collectionLabel}>Collection Rate</Text>
          <Text style={styles.collectionValue}>{payments.payment_rate || 0}%</Text>
        </View>
      </View>

      {/* Booking Status - Horizontal Scroll */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Booking Status</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paymentScrollContainer}
        >
          {bookingPalette.map((item) => (
            <View key={item.key} style={[styles.paymentCard, { backgroundColor: item.background }]}>
              <Text style={[styles.paymentValue, { color: item.color }]}>
                {bookings[item.key] || 0}
              </Text>
              <Text style={[styles.paymentLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.collectionFooter}>
          <Text style={styles.collectionLabel}>Total Bookings</Text>
          <Text style={styles.collectionValue}>{bookings.total || 0}</Text>
        </View>
      </View>

      {/* Property Comparison */}
      {propertyComparisonVisible && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Property Comparison</Text>
          <View style={styles.propertyList}>
            {analytics.properties.map((property) => (
              <View key={property.id} style={styles.propertyRow}>
                <View>
                  <Text style={styles.propertyName}>{property.name}</Text>
                  <Text style={styles.propertySubtext}>
                    {property.occupied_rooms}/{property.total_rooms} occupied
                  </Text>
                </View>
                <View style={styles.propertyStats}>
                  <Text style={styles.propertyOccupancy}>{property.occupancy_rate}%</Text>
                  <Text style={styles.propertyRevenue}>{formatCurrency(property.monthly_revenue)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Insights - Horizontal Scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.insightsScrollContainer}
      >
        <View style={[styles.insightCard, { backgroundColor: '#059669' }]}>
          <Text style={styles.insightTitle}>Top Property</Text>
          {topProperty ? (
            <>
              <Text style={styles.insightValue}>{topProperty.name}</Text>
              <Text style={styles.insightDetail}>
                {topProperty.occupancy_rate || 0}% • {formatCurrency(topProperty.monthly_revenue)}
              </Text>
            </>
          ) : (
            <Text style={styles.insightDetail}>No property data yet</Text>
          )}
        </View>
        <View style={[styles.insightCard, { backgroundColor: '#2563EB' }]}>
          <Text style={styles.insightTitle}>Collection Rate</Text>
          <Text style={styles.insightValue}>{analytics?.revenue?.collection_rate || 0}%</Text>
          <Text style={styles.insightDetail}>
            {formatCurrency(analytics?.revenue?.actual_monthly)} collected
          </Text>
        </View>
        <View style={[styles.insightCard, { backgroundColor: '#7C3AED' }]}>
          <Text style={styles.insightTitle}>Booking Overview</Text>
          <Text style={styles.insightValue}>{bookings.total || 0}</Text>
          <Text style={styles.insightDetail}>
            {bookings.confirmed || 0} confirmed • {bookings.pending || 0} pending
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={downloadAnalyticsCSV}
          disabled={exporting || loading || !analytics}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Row - Sticky */}
      <View style={styles.filtersContainer}>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownOpen(!dropdownOpen)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownButtonText} numberOfLines={1}>
              {selectedPropertyName}
            </Text>
            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {propertyOptions.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.dropdownItem,
                    selectedProperty === property.id && styles.dropdownItemSelected
                  ]}
                  onPress={() => handleSelectProperty(property.id)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedProperty === property.id && styles.dropdownItemTextSelected
                    ]}
                    numberOfLines={1}
                  >
                    {property.name}
                  </Text>
                  {selectedProperty === property.id && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={styles.timeButtonContainer}>
          {['week', 'month', 'year'].map((range) => (
            <TimeRangeButton
              key={range}
              label={range.charAt(0).toUpperCase() + range.slice(1)}
              value={range}
              isSelected={timeRange === range}
              onPress={setTimeRange}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading && !analytics ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingLabel}>Loading analytics...</Text>
          </View>
        ) : (
          analytics ? renderContent() : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No analytics yet</Text>
              <Text style={styles.emptySubtitle}>Add properties or change the filters to see insights.</Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}