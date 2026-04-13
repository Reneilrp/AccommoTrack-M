import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import api from '../../../../services/api.js';
import { getStyles } from '../../../../styles/Landlord/DormProfile.js';

const getThemeColorForType = (type, theme) => {
  switch (type) {
    case 'booking': return '#3B82F6';
    case 'payment': return '#EF4444';
    case 'maintenance': return '#F97316';
    case 'transfer': return '#A855F7';
    case 'addon': return '#14B8A6';
    case 'review': return '#EAB308';
    default: return theme.colors.primary;
  }
};

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const EMPTY_DASH_DATA = {
  pendingBookings: [],
  overdueInvoices: [],
  pendingAddonRequests: [],
  maintenanceRequests: [],
  transferRequests: [],
  recentReviews: [],
};

const HEADER_MENU_WIDTH = 220;
const FILTER_MENU_WIDTH = 200;
const FILTER_MENU_HEIGHT = 304;
const MENU_VERTICAL_GAP = 2;

export default function PropertySummaryScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const propertyId = route.params?.propertyId || route.params?.property?.id;
  const propertyTitle = route.params?.property?.title || route.params?.property?.name || 'Property';

  const filterButtonRef = React.useRef(null);
  const [filterMenuPos, setFilterMenuPos] = useState({ top: 120, left: 16 });
  const [refreshing, setRefreshing] = useState(false);
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  const openAnchoredMenu = (ref, menuWidth, menuHeight, setPosition, setVisible, fallbackTop) => {
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const minLeft = 8;
    const maxLeft = Math.max(8, screenWidth - menuWidth - 8);
    const minTop = 8;
    const maxTop = Math.max(8, screenHeight - menuHeight - 8);

    const node = ref.current;
    if (!node) {
      setPosition({
        top: clamp(fallbackTop, minTop, maxTop),
        left: clamp(screenWidth - menuWidth - 16, minLeft, maxLeft),
      });
      setVisible(true);
      return;
    }

    const setFromCoords = (x, y, width, height) => {
      const rawLeft = x + width - menuWidth;
      const left = clamp(rawLeft, minLeft, maxLeft);
      const belowTop = y + height + MENU_VERTICAL_GAP;
      const aboveTop = y - menuHeight - MENU_VERTICAL_GAP;
      let top = belowTop;

      if (belowTop + menuHeight > screenHeight - 8 && aboveTop >= 8) {
        top = aboveTop;
      }

      setPosition({ top: clamp(top, minTop, maxTop), left });
      setVisible(true);
    };

    if (typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => setFromCoords(x, y, width, height));
      return;
    }

    if (typeof node.measure === 'function') {
      node.measure((fx, fy, width, height, px, py) => setFromCoords(px, py, width, height));
      return;
    }

    setPosition({
      top: clamp(fallbackTop, minTop, maxTop),
      left: clamp(screenWidth - menuWidth - 16, minLeft, maxLeft),
    });
    setVisible(true);
  };

  const activityQuery = useQuery({
    queryKey: landlordQueryKeys.propertySummaryActivity(propertyId),
    enabled: Boolean(propertyId),
    queryFn: async () => {
      const [bookingsRes, invoicesRes, addonRequestsRes, maintenanceRes, transfersRes, reviewsRes] = await Promise.allSettled([
        api.get(`/bookings?property_id=${propertyId}&status=pending`),
        api.get(`/invoices?property_id=${propertyId}&status=overdue`),
        api.get(`/landlord/properties/${propertyId}/addons/pending`),
        api.get(`/landlord/maintenance-requests?property_id=${propertyId}&status=pending`),
        api.get(`/landlord/transfers?property_id=${propertyId}&status=pending`),
        api.get(`/landlord/reviews?property_id=${propertyId}&limit=3`),
      ]);

      const getResData = (res) => {
        if (res.status !== 'fulfilled') return [];
        const payload = res.value?.data;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
      };

      return {
        pendingBookings: getResData(bookingsRes),
        overdueInvoices: (invoicesRes.status === 'fulfilled' ? invoicesRes.value?.data?.data : []) || [],
        pendingAddonRequests: addonRequestsRes.status === 'fulfilled' ? (addonRequestsRes.value?.data?.pendingRequests || []) : [],
        maintenanceRequests: (maintenanceRes.status === 'fulfilled' ? maintenanceRes.value?.data?.data : []) || [],
        transferRequests: getResData(transfersRes),
        recentReviews: getResData(reviewsRes),
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = activityQuery.isPending && !activityQuery.data;
  const error = activityQuery.error?.message || '';
  const dashData = activityQuery.data || EMPTY_DASH_DATA;
  const dashLoading = activityQuery.isPending && !activityQuery.data;
  const refetchActivity = activityQuery.refetch;
  const summaryRefetchers = useMemo(() => [refetchActivity], [refetchActivity]);

  useLandlordFocusRefetch({ enabled: Boolean(propertyId), refetchers: summaryRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    enabled: Boolean(propertyId),
    setRefreshing,
    refetchers: summaryRefetchers,
  });

  const activityItems = useMemo(() => {
    const readName = (entity, fallback = 'Tenant') => {
      if (entity?.name) return entity.name;
      const full = [entity?.first_name, entity?.last_name].filter(Boolean).join(' ').trim();
      if (full) return full;
      return fallback;
    };
    
    const normalizeAmount = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const extractSuggestedPrice = (value) => {
      if (!value || typeof value !== 'string') return null;
      const match = value.match(/suggested\s*price\s*:\s*₱?\s*([\d,]+(?:\.\d+)?)/i);
      if (!match?.[1]) return null;
      return normalizeAmount(match[1].replace(/,/g, ''));
    };

    const toTimestamp = (value) => {
      if (!value) return 0;
      const t = new Date(value).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    const {
      pendingBookings,
      overdueInvoices,
      pendingAddonRequests,
      maintenanceRequests,
      transferRequests,
      recentReviews,
    } = dashData;

    return [
      ...pendingBookings.map((b) => ({
        key: `booking-${b.id}`,
        id: b.id,
        type: 'booking',
        tenant: readName(b.tenant, b.tenant_name || 'Tenant'),
        room: b.room?.name || b.room_name || 'Room —',
        date: b.start_date || b.created_at,
        status: 'Pending',
        amount: null,
        note: b.payment_plan || 'Monthly',
      })),
      ...overdueInvoices.map((inv) => ({
        key: `payment-${inv.id}`,
        id: inv.id,
        type: 'payment',
        tenant: readName(inv.tenant, inv.tenant_name || 'Tenant'),
        room: inv.room?.name || inv.room_name || 'Room —',
        date: inv.due_date || inv.created_at,
        status: 'Overdue',
        amount: normalizeAmount(inv.amount ?? inv.total_amount),
        note: inv.month || inv.period || 'Invoice',
      })),
      ...maintenanceRequests.map((m) => ({
        key: `maintenance-${m.id}`,
        id: m.id,
        type: 'maintenance',
        tenant: readName(m.tenant, m.tenant_name || 'Tenant'),
        room: m.room?.name || m.room_name || 'Room —',
        date: m.created_at || m.updated_at,
        status: m.status || 'Open',
        amount: null,
        note: m.title || m.issue || 'Maintenance issue',
      })),
      ...transferRequests.map((t) => ({
        key: `transfer-${t.id}`,
        id: t.id,
        type: 'transfer',
        tenant: readName(t.tenant, t.tenant_name || 'Tenant'),
        room: `${t.from_room?.name || t.from_room_name || '—'} → ${t.to_room?.name || t.to_room_name || '—'}`,
        date: t.created_at || t.updated_at,
        status: t.status || 'Pending',
        amount: null,
        note: 'Room transfer',
      })),
      ...pendingAddonRequests.map((req) => {
        const requestNote = req.requestNote || req.request_note || '';
        const parsedSuggestedPrice = extractSuggestedPrice(requestNote);
        return {
          key: `addon-${req.requestId}`,
          id: req.requestId,
          bookingId: req.bookingId,
          addonId: req.addonId,
          type: 'addon',
          tenant: readName(req.tenant, 'Tenant'),
          room: `Room ${req.roomNumber || '—'}`,
          date: req.requestedAt || req.requested_at || req.createdAt || req.created_at,
          status: req.status || 'Pending',
          amount: normalizeAmount(req.suggestedPrice ?? req.suggested_price ?? parsedSuggestedPrice ?? req.price ?? req.amount),
          note: req.addonName || 'Add-on request',
        };
      }),
      ...recentReviews.map((r) => ({
        key: `review-${r.id}`,
        id: r.id,
        type: 'review',
        tenant: readName(r.tenant, r.reviewer_name || 'Tenant'),
        room: r.room?.name || r.room_name || 'Room —',
        date: r.created_at || r.updated_at,
        status: `${Math.round(Number(r.rating) || 0)} stars`,
        amount: null,
        note: r.landlord_response ? 'Replied' : 'Needs reply',
      })),
    ].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
  }, [dashData]);

  const activityFilterOptions = useMemo(
    () => [
      { key: 'all', label: 'All Activity' },
      { key: 'booking', label: 'Bookings' },
      { key: 'payment', label: 'Payments' },
      { key: 'maintenance', label: 'Maintenance' },
      { key: 'transfer', label: 'Transfers' },
      { key: 'addon', label: 'Add-ons' },
      { key: 'review', label: 'Reviews' },
    ],
    [],
  );

  const filteredActivityItems = useMemo(() => {
    if (activityFilter === 'all') return activityItems;
    return activityItems.filter((item) => item.type === activityFilter);
  }, [activityItems, activityFilter]);

  const headerMenuActions = useMemo(
    () => [
      { key: 'rooms', label: 'Manage Rooms', icon: 'bed-outline', onPress: () => navigation.navigate('RoomManagement', { propertyId: propertyId }) },
      { key: 'tenants', label: 'Manage Tenants', icon: 'people-outline', onPress: () => navigation.navigate('Tenants', { propertyId: propertyId }) },
      { key: 'maintenance', label: 'Maintenance Requests', icon: 'construct-outline', onPress: () => navigation.navigate('MaintenanceRequests', { propertyId: propertyId, propertyTitle: propertyTitle }) },
      { key: 'reviews', label: 'Reviews', icon: 'star-outline', onPress: () => navigation.navigate('Reviews', { propertyId: propertyId, propertyTitle: propertyTitle }) },
      { key: 'transfers', label: 'Transfer Requests', icon: 'swap-horizontal-outline', onPress: () => navigation.navigate('TransferRequests', { propertyId: propertyId, propertyTitle: propertyTitle }) },
      { key: 'settings', label: 'Property Settings', icon: 'settings-outline', onPress: () => navigation.navigate('DormProfileSettings', { propertyId: propertyId }) },
      { key: 'addons', label: 'Manage Add-ons', icon: 'sparkles-outline', onPress: () => navigation.navigate('AddonManagement', { propertyId: propertyId, propertyTitle: propertyTitle }) },
      { key: 'logs', label: 'Activity Logs', icon: 'list-outline', onPress: () => navigation.navigate('PropertyActivityLogs', { propertyId: propertyId, propertyTitle: propertyTitle }) },
    ],
    [navigation, propertyId, propertyTitle],
  );

  if (!propertyId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.centered, { padding: 24 }]}>
          <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
            Unable to load property. Please go back and select a property again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButtonBg} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Summary</Text>
        <View style={{ width: 48, alignItems: 'flex-end', justifyContent: 'center', position: 'relative', zIndex: 40 }}>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setHeaderMenuVisible((current) => !current)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {headerMenuVisible && (
            <View
              style={{
                position: 'absolute',
                top: 38,
                right: 0,
                width: HEADER_MENU_WIDTH,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 12,
                backgroundColor: theme.colors.backgroundSecondary,
                paddingVertical: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: theme.isDark ? 0.3 : 0.12,
                shadowRadius: 8,
                elevation: 8,
                zIndex: 41,
                overflow: 'hidden',
              }}
            >
              {headerMenuActions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  onPress={() => {
                    setHeaderMenuVisible(false);
                    action.onPress();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderBottomWidth: action.key === 'logs' ? 0 : 1,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Ionicons name={action.icon} size={16} color={theme.colors.textSecondary} />
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setHeaderMenuVisible(false)}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <>
              {/* Activity & Requests Section ONLY */}
              <View style={styles.sectionCard}>
                <View style={[styles.sectionHeader, { marginBottom: 8 }]}> 
                  <Text style={styles.sectionTitle}>Activity & Requests</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: theme.colors.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{filteredActivityItems.length} items</Text>
                    </View>
                    <TouchableOpacity
                      ref={filterButtonRef}
                      onPress={() => {
                        setHeaderMenuVisible(false);
                        openAnchoredMenu(filterButtonRef, FILTER_MENU_WIDTH, FILTER_MENU_HEIGHT, setFilterMenuPos, setFilterMenuVisible, 120);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: theme.colors.background,
                      }}
                    >
                      <Ionicons name="filter-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                        {activityFilterOptions.find((option) => option.key === activityFilter)?.label || 'Filter'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {dashLoading ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : filteredActivityItems.length === 0 ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>No activities found.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12, marginTop: 12 }}>
                    {filteredActivityItems.map((item) => (
                      <View key={item.key} style={{ padding: 12, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: 12, backgroundColor: theme.colors.background }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: getThemeColorForType(item.type, theme) }}>{item.type}</Text>
                              {item.type === 'addon' && item.note ? (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: getThemeColorForType(item.type, theme),
                                    marginLeft: 8,
                                    flexShrink: 1,
                                  }}
                                  numberOfLines={1}
                                >
                                  {item.note}
                                </Text>
                              ) : null}
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.text }}>{item.tenant}</Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{item.room}</Text>
                            {item.note && item.type !== 'addon' ? <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{item.note}</Text> : null}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{formatDisplayDate(item.date)}</Text>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', marginTop: 4, color: item.status === 'Overdue' || item.status === 'Open' ? theme.colors.error : (item.status === 'Pending' ? '#F59E0B' : theme.colors.textSecondary) }}>{item.status}</Text>
                            {item.amount !== null && (
                              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 }}>₱{item.amount.toLocaleString()}</Text>
                            )}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                          <TouchableOpacity 
                            onPress={() => {
                              if (item.type === 'payment') {
                                navigation.navigate('Payments', {
                                  filter: 'overdue',
                                  searchQuery: propertyTitle || '',
                                  drilldownToken: Date.now(),
                                });
                              }
                              else if (item.type === 'maintenance') navigation.navigate('MaintenanceRequests', { propertyId: propertyId, propertyTitle: propertyTitle });
                              else if (item.type === 'review') navigation.navigate('Reviews', { propertyId: propertyId, propertyTitle: propertyTitle });
                              else if (item.type === 'transfer') navigation.navigate('TransferRequests', { propertyId: propertyId, propertyTitle: propertyTitle });
                              else if (item.type === 'addon') navigation.navigate('AddonManagement', { propertyId: propertyId, propertyTitle: propertyTitle });
                              else navigation.navigate('Bookings', { propertyId: propertyId });
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.primary }}>View</Text>
                            <Ionicons name="chevron-forward" size={12} color={theme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Modal
                transparent
                statusBarTranslucent
                navigationBarTranslucent
                presentationStyle="overFullScreen"
                visible={filterMenuVisible}
                animationType="fade"
                onRequestClose={() => setFilterMenuVisible(false)}
              >
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setFilterMenuVisible(false)}>
                  <View style={{ position: 'absolute', top: filterMenuPos.top, left: filterMenuPos.left }}>
                    <Pressable
                      onPress={() => {}}
                      style={{
                        width: FILTER_MENU_WIDTH,
                        backgroundColor: theme.colors.surface,
                        borderRadius: 12,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      {activityFilterOptions.map((option) => {
                        const isActive = option.key === activityFilter;
                        return (
                          <TouchableOpacity
                            key={option.key}
                            onPress={() => {
                              setActivityFilter(option.key);
                              setFilterMenuVisible(false);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                            }}
                          >
                            <Text style={{ color: isActive ? theme.colors.primary : theme.colors.text, fontSize: 14, fontWeight: isActive ? '700' : '500' }}>
                              {option.label}
                            </Text>
                            {isActive ? <Ionicons name="checkmark" size={16} color={theme.colors.primary} /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
          </>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
