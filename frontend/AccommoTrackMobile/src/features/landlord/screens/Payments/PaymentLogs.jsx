import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PaymentService from '../../../../services/PaymentService.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['all', 'paid', 'pending', 'pending_verification', 'partial', 'overdue', 'refunded', 'cancelled'];

const getStatusLabel = (status) => {
  if (!status) return 'All';
  if (status === 'all') return 'All';
  if (status === 'pending_verification') return 'Cash Verify';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const buildTenantName = (invoice) => {
  const directTenant = invoice?.tenant;
  const bookingTenant = invoice?.booking?.tenant;
  const fromProfile =
    directTenant?.full_name ||
    [directTenant?.first_name, directTenant?.last_name].filter(Boolean).join(' ').trim() ||
    bookingTenant?.full_name ||
    [bookingTenant?.first_name, bookingTenant?.last_name].filter(Boolean).join(' ').trim();
  return fromProfile || invoice?.tenant_name || 'Tenant —';
};

const buildRoomLabel = (invoice) => {
  const room = invoice?.booking?.room || invoice?.room || null;
  const rawValue = room?.room_number || room?.name || invoice?.room_number || invoice?.booking?.room_number || null;
  if (!rawValue) return 'Room —';
  const value = String(rawValue).trim();
  return /^room\b/i.test(value) ? value : `Room ${value}`;
};

const getInvoiceStatus = (invoice) => {
  const bookingPayStatus = (invoice?.booking?.payment_status || invoice?.payment_status || '').toLowerCase();
  const invStatus = (invoice?.status || '').toLowerCase();
  if (invStatus === 'pending_verification' || bookingPayStatus === 'pending_verification') return 'pending_verification';
  if (bookingPayStatus === 'refunded' || invStatus === 'refunded') return 'refunded';
  if (bookingPayStatus === 'cancelled' || invStatus === 'cancelled') return 'cancelled';
  if (bookingPayStatus === 'paid' || invStatus === 'paid') return 'paid';
  if (invStatus === 'partial' || bookingPayStatus === 'partial') return 'partial';
  if (invoice?.due_date && new Date(invoice.due_date) < new Date()) return 'overdue';
  return invStatus || bookingPayStatus || 'pending';
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

const STATUS_STYLES = {
  paid: { bg: '#DCFCE7', fg: '#166534', icon: 'checkmark-circle' },
  pending_verification: { bg: '#FFEDD5', fg: '#C2410C', icon: 'shield-checkmark-outline' },
  partial: { bg: '#FEF3C7', fg: '#92400E', icon: 'hourglass-outline' },
  pending: { bg: '#FEF3C7', fg: '#92400E', icon: 'time-outline' },
  overdue: { bg: '#FEE2E2', fg: '#991B1B', icon: 'alert-circle' },
  refunded: { bg: '#F3E8FF', fg: '#7E22CE', icon: 'refresh-circle' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B', icon: 'close-circle' },
};

const getStatusStyle = (status, isDark) => {
  const base = STATUS_STYLES[status] || STATUS_STYLES.pending;
  if (isDark) {
    return { bg: `${base.fg}22`, fg: base.fg, icon: base.icon };
  }
  return base;
};

// ─── Invoice Card (compact for logs) ─────────────────────────────────────────

function InvoiceCard({ invoice, theme, onPress }) {
  const status = getInvoiceStatus(invoice);
  const ss = getStatusStyle(status, theme.isDark);
  const tenantName = buildTenantName(invoice);
  const roomLabel = buildRoomLabel(invoice);
  const property = invoice?.property?.title || invoice?.property_title || invoice?.booking?.property?.title || '—';
  const amount = invoice?.amount_cents ? invoice.amount_cents / 100 : Number(invoice?.amount || 0);

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(invoice)}
      activeOpacity={0.75}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Status icon */}
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ss.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ionicons name={ss.icon} size={20} color={ss.fg} />
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }} numberOfLines={1}>
          {tenantName}
        </Text>
        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
          {property} · {roomLabel}
        </Text>
        <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 }}>
          Issued {formatDate(invoice.issued_at || invoice.created_at)}
        </Text>
      </View>

      {/* Amount + status */}
      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.text }}>
          ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </Text>
        <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: ss.bg }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: ss.fg }}>{getStatusLabel(status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentLogs({ navigation }) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [archiveExpanded, setArchiveExpanded] = useState(false);

  // ── Fetch all invoices ──
  const invoicesQuery = useQuery({
    queryKey: landlordQueryKeys.invoices(),
    queryFn: async () => {
      const response = await PaymentService.getInvoices({ exclude_invoice_type: 'subscription', _t: Date.now() });
      if (!response.success) throw new Error(response.error || 'Failed to fetch invoices');
      let data = response.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.invoices || data.data || data.items || [];
      }
      return Array.isArray(data) ? data : [];
    },
    placeholderData: (prev) => prev,
  });

  // ── Fetch archived invoices ──
  const archivedQuery = useQuery({
    queryKey: [...landlordQueryKeys.invoices(), 'archived'],
    queryFn: async () => {
      const response = await PaymentService.getInvoices({ exclude_invoice_type: 'subscription', archive_filter: 'archived', _t: Date.now() });
      if (!response.success) return [];
      let data = response.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.invoices || data.data || data.items || [];
      }
      return Array.isArray(data) ? data : [];
    },
    placeholderData: (prev) => prev,
  });

  const invoices = useMemo(() => invoicesQuery.data || [], [invoicesQuery.data]);
  const archivedInvoices = useMemo(() => archivedQuery.data || [], [archivedQuery.data]);
  const loading = invoicesQuery.isPending && invoices.length === 0;

  const refetchers = useMemo(() => [invoicesQuery.refetch, archivedQuery.refetch], [invoicesQuery.refetch, archivedQuery.refetch]);

  useLandlordFocusRefetch({ refetchers });
  const handleRefresh = useLandlordRefreshHandler({ setRefreshing, refetchers });

  // ── Filter + search ──
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const status = getInvoiceStatus(inv);
      const matchesFilter = activeFilter === 'all' || status === activeFilter;
      if (!matchesFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const tenant = buildTenantName(inv).toLowerCase();
      const property = (inv?.property?.title || inv?.property_title || inv?.booking?.property?.title || '').toLowerCase();
      const ref = (inv?.reference || String(inv?.id || '')).toLowerCase();
      const room = buildRoomLabel(inv).toLowerCase();
      return tenant.includes(q) || property.includes(q) || ref.includes(q) || room.includes(q);
    }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [invoices, activeFilter, searchQuery]);

  const filteredArchived = useMemo(() => {
    if (!searchQuery) return archivedInvoices;
    const q = searchQuery.toLowerCase();
    return archivedInvoices.filter((inv) => {
      const tenant = buildTenantName(inv).toLowerCase();
      const property = (inv?.property?.title || inv?.property_title || inv?.booking?.property?.title || '').toLowerCase();
      return tenant.includes(q) || property.includes(q);
    });
  }, [archivedInvoices, searchQuery]);

  const handleInvoicePress = useCallback((invoice) => {
    navigation.navigate('Payments', { focusInvoiceId: invoice.id, drilldownToken: Date.now() });
  }, [navigation]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header */}
      <View style={{ backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>Payment Logs</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 }}>Full invoice history</Text>
        </View>
        <TouchableOpacity onPress={() => { invoicesQuery.refetch(); archivedQuery.refetch(); }} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: theme.colors.border }}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.text }}
            placeholder="Search tenant, property, invoice…"
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 99,
                backgroundColor: activeFilter === f ? theme.colors.primary : theme.colors.background,
                borderWidth: 1,
                borderColor: activeFilter === f ? theme.colors.primary : theme.colors.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: activeFilter === f ? '#fff' : theme.colors.textSecondary }}>
                {getStatusLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
        ListHeaderComponent={
          <>
            {/* ── ARCHIVE SECTION ────────────────────────────────────────── */}
            <TouchableOpacity
                onPress={() => setArchiveExpanded((p) => !p)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginTop: 14,
                  marginHorizontal: 16,
                  marginBottom: archiveExpanded ? 0 : 14,
                  backgroundColor: theme.colors.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  gap: 10,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.isDark ? '#1f2937' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="archive-outline" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.text }}>Payment Archive</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 }}>
                    Settled invoices older than 30 days{archivedInvoices.length > 0 ? ` · ${filteredArchived.length} records` : ''}
                  </Text>
                </View>
                <Ionicons name={archiveExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

            {archiveExpanded && (
              <View style={{ marginTop: 2, marginBottom: 14 }}>
                {archivedQuery.isPending ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : filteredArchived.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 }}>
                    <Ionicons name="archive-outline" size={36} color={theme.colors.textTertiary} />
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                      No archived payments found.{'\n'}Paid invoices older than 30 days appear here.
                    </Text>
                  </View>
                ) : (
                  filteredArchived.map((inv) => (
                    <InvoiceCard key={String(inv.id)} invoice={inv} theme={theme} onPress={handleInvoicePress} />
                  ))
                )}
              </View>
            )}

            {/* ── LOG HEADER ─────────────────────────────────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>
                Full Log
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                ({filteredInvoices.length} records)
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <InvoiceCard invoice={item} theme={theme} onPress={handleInvoicePress} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 12 }}>Loading payment logs…</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 12 }}>No invoices found</Text>
              <Text style={{ fontSize: 13, color: theme.colors.textTertiary, marginTop: 4, textAlign: 'center' }}>
                Try adjusting your search or filters
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}
