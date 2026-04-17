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
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import PaymentService from '../../../../services/PaymentService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import {
  tenantQueryKeys,
  useTenantFocusRefetch,
  useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'refunded', label: 'Refunded' },
];

const getStatusStyle = (status, isDark) => {
  const s = (status || '').toLowerCase();
  const map = {
    paid: { bg: '#DCFCE7', fg: '#166534', icon: 'checkmark-circle' },
    partial: { bg: '#FEF3C7', fg: '#92400E', icon: 'hourglass-outline' },
    overdue: { bg: '#FEE2E2', fg: '#991B1B', icon: 'alert-circle' },
    refunded: { bg: '#F3E8FF', fg: '#7E22CE', icon: 'refresh-circle' },
    cancelled: { bg: '#F3F4F6', fg: '#4B5563', icon: 'close-circle' },
  };
  const base = map[s] || { bg: '#FEF3C7', fg: '#92400E', icon: 'time-outline' };
  if (isDark) return { bg: `${base.fg}22`, fg: base.fg, icon: base.icon };
  return base;
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatCurrency = (amount) => {
  const v = Number(amount) || 0;
  return `₱${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)}`;
};

// ─── Payment Card ─────────────────────────────────────────────────────────────

function PaymentCard({ payment, theme, onPress }) {
  const status = (payment.status || '').toLowerCase();
  const ss = getStatusStyle(status, theme.isDark);
  const isPayable = ['pending', 'unpaid', 'partial', 'overdue'].includes(status);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
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
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ss.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ionicons name={ss.icon} size={20} color={ss.fg} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }} numberOfLines={1}>
          {payment.propertyName || '—'}
        </Text>
        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
          Room {payment.roomNumber || 'N/A'} · {formatDate(payment.date)}
        </Text>
        {payment.referenceNo ? (
          <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 }} numberOfLines={1}>
            Ref: {payment.referenceNo}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.text }}>
          {formatCurrency(payment.amount)}
        </Text>
        <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: ss.bg }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: ss.fg }}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
          </Text>
        </View>
        {isPayable && (
          <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: '700', marginTop: 4 }}>Tap to Pay →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentHistory() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [archiveExpanded, setArchiveExpanded] = useState(false);

  // ── All payments ────────────────────────────────────────────────────────────
  const allPaymentsQuery = useQuery({
    queryKey: [...tenantQueryKeys.paymentHistory(), 'all'],
    queryFn: async () => {
      const res = await PaymentService.getPayments('all', 'all');
      if (res?.success && Array.isArray(res.data)) return res.data;
      return [];
    },
    placeholderData: (prev) => prev,
  });

  // ── Archived payments ────────────────────────────────────────────────────────
  const archivedPaymentsQuery = useQuery({
    queryKey: [...tenantQueryKeys.paymentHistory(), 'archived'],
    queryFn: async () => {
      const res = await PaymentService.getPayments('all', 'archived');
      if (res?.success && Array.isArray(res.data)) return res.data;
      return [];
    },
    placeholderData: (prev) => prev,
  });

  const allPayments = useMemo(() => allPaymentsQuery.data || [], [allPaymentsQuery.data]);
  const archivedPayments = useMemo(() => archivedPaymentsQuery.data || [], [archivedPaymentsQuery.data]);
  const loading = allPaymentsQuery.isLoading;

  const refetchers = useMemo(
    () => [allPaymentsQuery.refetch, archivedPaymentsQuery.refetch],
    [allPaymentsQuery.refetch, archivedPaymentsQuery.refetch],
  );

  useTenantFocusRefetch({ refetchers });
  const onRefresh = useTenantRefreshHandler({ setRefreshing, refetchers });

  // ── Filter helpers ──────────────────────────────────────────────────────────

  const applyFilter = useCallback((list) => {
    const q = (searchQuery || '').trim().toLowerCase();
    return list
      .filter((p) => {
        const status = (p.status || '').toLowerCase();
        const matchFilter = activeFilter === 'all' || status === activeFilter ||
          (activeFilter === 'pending' && ['pending', 'unpaid', 'awaiting verification'].includes(status));
        if (!matchFilter) return false;
        if (!q) return true;
        const prop = (p.propertyName || '').toLowerCase();
        const ref = (p.referenceNo || '').toLowerCase();
        const room = (p.roomNumber || '').toLowerCase();
        const method = (p.method || '').toLowerCase();
        return prop.includes(q) || ref.includes(q) || room.includes(q) || method.includes(q);
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [searchQuery, activeFilter]);

  const filteredAll = useMemo(() => applyFilter(allPayments), [applyFilter, allPayments]);
  const filteredArchived = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return archivedPayments;
    return archivedPayments.filter((p) => {
      const prop = (p.propertyName || '').toLowerCase();
      const ref = (p.referenceNo || '').toLowerCase();
      return prop.includes(q) || ref.includes(q);
    });
  }, [archivedPayments, searchQuery]);

  const handlePaymentPress = useCallback((payment) => {
    const id = payment.invoiceId || payment.invoice_id || payment.id;
    if (id) navigation.navigate('PaymentDetail', { invoiceId: id });
  }, [navigation]);

  // ─────────────────────────────────────────────────────────────────────────────

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
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 }}>Full payment history</Text>
        </View>
        <TouchableOpacity
          onPress={() => { allPaymentsQuery.refetch(); archivedPaymentsQuery.refetch(); }}
          style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: theme.colors.border }}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.text }}
            placeholder="Search property, room, reference…"
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setActiveFilter(f.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 99,
                backgroundColor: activeFilter === f.value ? theme.colors.primary : theme.colors.background,
                borderWidth: 1,
                borderColor: activeFilter === f.value ? theme.colors.primary : theme.colors.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: activeFilter === f.value ? '#fff' : theme.colors.textSecondary }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredAll}
        keyExtractor={(item) => String(item.id || Math.random())}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListHeaderComponent={
          <>
            {/* ── ARCHIVE SECTION ──────────────────────────────── */}
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
                  Settled payments older than 30 days{archivedPayments.length > 0 ? ` · ${filteredArchived.length} records` : ''}
                </Text>
              </View>
              <Ionicons name={archiveExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {archiveExpanded && (
              <View style={{ marginTop: 2, marginBottom: 14 }}>
                {archivedPaymentsQuery.isPending ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : filteredArchived.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 }}>
                    <Ionicons name="archive-outline" size={36} color={theme.colors.textTertiary} />
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                      No archived payments yet.{'\n'}Paid invoices older than 30 days appear here.
                    </Text>
                  </View>
                ) : (
                  filteredArchived.map((p) => (
                    <PaymentCard key={String(p.id)} payment={p} theme={theme} onPress={() => handlePaymentPress(p)} />
                  ))
                )}
              </View>
            )}

            {/* ── LOG HEADER ──────────────────────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>Full Log</Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>({filteredAll.length} records)</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <PaymentCard payment={item} theme={theme} onPress={() => handlePaymentPress(item)} />
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
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 12 }}>No payments found</Text>
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
