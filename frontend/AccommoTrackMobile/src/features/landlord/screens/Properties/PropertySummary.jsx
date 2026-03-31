import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
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

export default function PropertySummaryScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const propertyId = route.params?.propertyId || route.params?.property?.id;
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [dashData, setDashData] = useState({
    pendingBookings: [],
    overdueInvoices: [],
    pendingAddonRequests: [],
    maintenanceRequests: [],
    transferRequests: [],
    recentReviews: [],
  });
  const [dashLoading, setDashLoading] = useState(true);

  const occupancy = useMemo(() => {
    if (!property) return { total: 0, available: 0, occupied: 0, percentage: 0 };
    const total = Number(property.total_rooms) || 0;
    const available = Number(property.available_rooms) || 0;
    const occupied = Math.max(total - available, 0);
    const percentage = total ? Math.round((occupied / total) * 100) : 0;
    return { total, available, occupied, percentage };
  }, [property]);

  const loadProperty = useCallback(
    async (fromRefresh = false) => {
      if (!propertyId) {
        setError('Missing property identifier.');
        setLoading(false);
        setDashLoading(false);
        return;
      }

      fromRefresh ? setRefreshing(true) : setLoading(true);
      setDashLoading(true);

      try {
        setError('');
        
        // Fetch property info
        const response = await PropertyService.getProperty(propertyId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to load property');
        }
        setProperty(response.data);

        // Fetch dashboard data
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

        setDashData({
          pendingBookings: getResData(bookingsRes),
          overdueInvoices: (invoicesRes.status === 'fulfilled' ? invoicesRes.value?.data?.data : []) || [],
          pendingAddonRequests: addonRequestsRes.status === 'fulfilled' ? (addonRequestsRes.value?.data?.pendingRequests || []) : [],
          maintenanceRequests: (maintenanceRes.status === 'fulfilled' ? maintenanceRes.value?.data?.data : []) || [],
          transferRequests: getResData(transfersRes),
          recentReviews: getResData(reviewsRes),
        });

      } catch (err) {
        console.error('Failed to load property or activity', err);
        setError(err.message || 'Unable to load property details.');
      } finally {
        fromRefresh ? setRefreshing(false) : setLoading(false);
        setDashLoading(false);
      }
    },
    [propertyId]
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProperty(false);
    });
    return unsubscribe;
  }, [navigation, loadProperty]);

  const handleRefresh = useCallback(() => {
    if (!propertyId) return;
    loadProperty(true);
  }, [loadProperty, propertyId]);

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

  const title = property?.title || property?.name || 'Property Name';
  const street = property?.street_address || '';
  const city = property?.city || '';
  const province = property?.province || '';
  const status = property?.current_status || 'pending';
  const id = property?.id;
  
  const address = [street, city, province].filter(Boolean).join(', ') || 'No address set';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButtonBg} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {property && (
            <>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.helperText}>{address}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{status}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{occupancy.total}</Text>
                    <Text style={styles.statLabel}>Total Rooms</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{occupancy.available}</Text>
                    <Text style={styles.statLabel}>Available</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{`${occupancy.percentage}%`}</Text>
                    <Text style={styles.statLabel}>Occupancy</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.primaryBtn}
                  onPress={() => navigation.navigate('RoomManagement', { propertyId: id })}
                >
                  <Ionicons name="bed-outline" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Manage Rooms</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, styles.outlineBtnBlue]}
                  onPress={() => navigation.navigate('Tenants', { propertyId: id })}
                >
                  <Ionicons name="people-outline" size={20} color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 14 }}>Manage Tenants</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: '#F59E0B' }]}
                  onPress={() => navigation.navigate('MaintenanceRequests')}
                >
                  <Ionicons name="construct-outline" size={20} color="#F59E0B" />
                  <Text style={{ color: '#F59E0B', fontWeight: '600', fontSize: 14 }}>Maintenance Requests</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: '#F43F5E' }]}
                  onPress={() => navigation.navigate('Reviews')}
                >
                  <Ionicons name="star-outline" size={20} color="#F43F5E" />
                  <Text style={{ color: '#F43F5E', fontWeight: '600', fontSize: 14 }}>Guest Reviews</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, styles.outlineBtnPrimary]}
                  onPress={() => navigation.navigate('DormProfileSettings', { propertyId: id })}
                >
                  <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>Property Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, styles.outlineBtnPrimary]}
                  onPress={() => navigation.navigate('AddonManagement', { propertyId: id, propertyTitle: title })}
                >
                  <Ionicons name="sparkles-outline" size={20} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>Manage Add-ons</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, styles.outlineBtnSecondary]}
                  onPress={() => navigation.navigate('PropertyActivityLogs', { propertyId: id, propertyTitle: title })}
                >
                  <Ionicons name="list-outline" size={20} color="#6B7280" />
                  <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 14 }}>Activity Logs</Text>
                </TouchableOpacity>
              </View>

              {/* Activity & Requests Section */}
              <View style={[styles.sectionCard, { marginTop: 16 }]}>
                <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                  <Text style={styles.sectionTitle}>Activity & Requests</Text>
                  <View style={{ backgroundColor: theme.colors.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{activityItems.length} items</Text>
                  </View>
                </View>

                {dashLoading ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : activityItems.length === 0 ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>No activities found.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12, marginTop: 12 }}>
                    {activityItems.map((item) => (
                      <View key={item.key} style={{ padding: 12, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: 12, backgroundColor: theme.colors.background }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: getThemeColorForType(item.type, theme) }}>{item.type}</Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.text }}>{item.tenant}</Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{item.room}</Text>
                            {item.note ? <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>{item.note}</Text> : null}
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
                              if (item.type === 'payment') navigation.navigate('Payments');
                              else if (item.type === 'maintenance') navigation.navigate('MaintenanceRequests');
                              else if (item.type === 'review') navigation.navigate('Reviews');
                              else if (item.type === 'transfer') navigation.navigate('Bookings', { propertyId: propertyId });
                              else if (item.type === 'addon') navigation.navigate('AddonManagement', { propertyId: propertyId });
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
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
