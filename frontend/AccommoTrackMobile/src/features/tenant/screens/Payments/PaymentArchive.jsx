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
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentArchive() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const archivedPayments = useMemo(() => archivedPaymentsQuery.data || [], [archivedPaymentsQuery.data]);
  const loading = archivedPaymentsQuery.isLoading;

  const refetchers = useMemo(
    () => [archivedPaymentsQuery.refetch],
    [archivedPaymentsQuery.refetch],
  );

  useTenantFocusRefetch({ refetchers });
  const onRefresh = useTenantRefreshHandler({ setRefreshing, refetchers });

  const filteredArchived = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const sorted = [...archivedPayments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (!q) return sorted;
    return sorted.filter((p) => {
      const prop = (p.propertyName || '').toLowerCase();
      const ref = (p.referenceNo || '').toLowerCase();
      const room = (p.roomNumber || '').toLowerCase();
      return prop.includes(q) || ref.includes(q) || room.includes(q);
    });
  }, [archivedPayments, searchQuery]);

  const handlePaymentPress = useCallback((payment) => {
    const id = payment.invoiceId || payment.invoice_id || payment.id;
    if (id) navigation.navigate('PaymentDetail', { invoiceId: id });
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header */}
      <View style={{ backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>Payment Archive</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 }}>Settled payments older than 30 days</Text>
        </View>
        <TouchableOpacity
          onPress={() => archivedPaymentsQuery.refetch()}
          style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: theme.colors.border }}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.text }}
            placeholder="Search archived property, room, ref…"
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
      </View>

      <FlatList
        data={filteredArchived}
        keyExtractor={(item) => String(item.id || Math.random())}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        renderItem={({ item }) => (
          <PaymentCard payment={item} theme={theme} onPress={() => handlePaymentPress(item)} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 12 }}>Loading archive…</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
              <Ionicons name="archive-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 12 }}>Archive is empty</Text>
              <Text style={{ fontSize: 13, color: theme.colors.textTertiary, marginTop: 4, textAlign: 'center' }}>
                Paid invoices older than 30 days will appear here.
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}
