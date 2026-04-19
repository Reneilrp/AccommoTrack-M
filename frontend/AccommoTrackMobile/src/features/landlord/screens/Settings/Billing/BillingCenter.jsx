import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import PaymentService from '../../../../../services/PaymentService.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../../hooks/useLandlordQueryHelpers.js';

const TABS = [
  { id: 'billing', label: 'Billing', icon: 'receipt-outline' },
  { id: 'payments', label: 'Payments', icon: 'card-outline' },
  { id: 'invoices', label: 'Invoices', icon: 'document-text-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const normalizeStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized || 'pending';
};

const normalizeInvoicesPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  if (Array.isArray(payload.invoices)) return payload.invoices;

  if (Object.prototype.hasOwnProperty.call(payload, 'success')) {
    const nested = payload.data;
    if (Array.isArray(nested)) return nested;
    if (Array.isArray(nested?.data)) return nested.data;
  }

  return [];
};

const computeInvoiceTotals = (invoice) => {
  const total = Number(invoice?.amount_cents ? invoice.amount_cents / 100 : invoice?.amount || 0);

  const paid = (invoice?.transactions || [])
    .filter((tx) => ['succeeded', 'paid', 'partially_refunded'].includes((tx.status || '').toLowerCase()))
    .reduce((sum, tx) => {
      const amount = Number(tx.amount_cents ? tx.amount_cents / 100 : tx.amount || 0);
      const refunded = Number(tx.refunded_amount_cents ? tx.refunded_amount_cents / 100 : 0);
      return sum + Math.max(amount - refunded, 0);
    }, 0);

  return {
    total,
    paid,
    outstanding: Math.max(total - paid, 0),
  };
};

const buildTenantName = (invoice) => {
  const directTenant = invoice?.tenant;
  const bookingTenant = invoice?.booking?.tenant;

  const fromProfile =
    directTenant?.full_name ||
    [directTenant?.first_name, directTenant?.last_name].filter(Boolean).join(' ').trim() ||
    bookingTenant?.full_name ||
    [bookingTenant?.first_name, bookingTenant?.last_name].filter(Boolean).join(' ').trim();

  return (
    fromProfile ||
    invoice?.tenant_name ||
    invoice?.booking?.tenant_name ||
    null
  );
};

const buildRoomLabel = (invoice) => {
  const room = invoice?.booking?.room || invoice?.room || null;
  const rawRoomValue =
    room?.room_number ||
    room?.name ||
    room?.room_name ||
    invoice?.room_number ||
    invoice?.room_name ||
    invoice?.booking?.room_number ||
    invoice?.booking?.room_name ||
    null;

  if (!rawRoomValue) return null;

  const value = String(rawRoomValue).trim();
  if (!value) return null;
  return /^room\b/i.test(value) ? value : `Room ${value}`;
};

const buildHistory = (invoices) => {
  const events = [];

  invoices.forEach((invoice) => {
    const reference = invoice.reference || `Invoice #${invoice.id}`;

    events.push({
      id: `invoice-issued-${invoice.id}`,
      timestamp: invoice.issued_at || invoice.created_at,
      title: 'Invoice issued',
      detail: `${reference} was issued with status ${String(invoice.status || 'pending').replace(/_/g, ' ')}.`,
      type: 'invoice',
    });

    (invoice.transactions || []).forEach((tx) => {
      events.push({
        id: `tx-${tx.id}`,
        timestamp: tx.created_at || tx.updated_at,
        title: 'Payment update',
        detail: `${reference} ${tx.method ? `(${tx.method})` : ''} ${formatCurrency(
          Number(tx.amount_cents ? tx.amount_cents / 100 : tx.amount || 0),
        )} marked ${String(tx.status || 'pending').replace(/_/g, ' ')}.`,
        type: 'payment',
      });
    });
  });

  return events
    .filter((event) => event.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export default function BillingCenterScreen({ navigation }) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('billing');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const billingCenterQuery = useQuery({
    queryKey: landlordQueryKeys.billingCenterBundle(),
    queryFn: async () => {
      const [invoiceResult, summaryResult] = await Promise.all([
        PaymentService.getInvoices({ invoice_type: 'subscription', t: Date.now() }),
        PaymentService.getInvoiceSummary({ invoice_type: 'subscription', range: 'all', t: Date.now() }),
      ]);

      if (!invoiceResult.success) {
        throw new Error(invoiceResult.error || 'Failed to load billing invoices.');
      }

      return {
        invoices: normalizeInvoicesPayload(invoiceResult.data),
        summary: summaryResult.success ? summaryResult.data : null,
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = billingCenterQuery.isPending && !billingCenterQuery.data;
  const fetchError = billingCenterQuery.error?.message || '';

  const refetchBillingCenter = billingCenterQuery.refetch;
  const billingRefetchers = useMemo(() => [refetchBillingCenter], [refetchBillingCenter]);

  useLandlordFocusRefetch({ refetchers: billingRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: billingRefetchers,
  });

  const summary = billingCenterQuery.data?.summary || null;

  const invoiceRows = useMemo(() => {
    const activeInvoices = billingCenterQuery.data?.invoices || [];
    return activeInvoices.map((invoice) => ({
      ...invoice,
      status: normalizeStatus(invoice.status),
      totals: computeInvoiceTotals(invoice),
    }));
  }, [billingCenterQuery.data?.invoices]);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return invoiceRows.filter((invoice) => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        invoice.reference,
        invoice.description,
        invoice.status,
        invoice.invoice_type,
        String(invoice.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [invoiceRows, searchTerm, statusFilter]);

  const openBillingRows = useMemo(
    () =>
      filteredInvoices.filter((invoice) => {
        if (invoice.totals.outstanding <= 0) return false;
        return ['pending', 'unpaid', 'partial', 'pending_verification', 'overdue'].includes(invoice.status);
      }),
    [filteredInvoices],
  );

  const paymentRows = useMemo(
    () =>
      filteredInvoices
        .flatMap((invoice) =>
          (invoice.transactions || []).map((tx) => ({
            id: tx.id,
            invoiceId: invoice.id,
            invoiceReference: invoice.reference,
            tenantName: buildTenantName(invoice),
            roomLabel: buildRoomLabel(invoice),
            method: tx.method || 'unknown',
            status: tx.status || 'pending',
            amount: Number(tx.amount_cents ? tx.amount_cents / 100 : tx.amount || 0),
            createdAt: tx.created_at || tx.updated_at,
          })),
        )
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [filteredInvoices],
  );

  const historyRows = useMemo(() => buildHistory(filteredInvoices), [filteredInvoices]);

  const overview = useMemo(() => {
    const fallback = invoiceRows.reduce(
      (acc, invoice) => {
        acc.totalInvoiced += invoice.totals.total;
        acc.totalPaid += invoice.totals.paid;
        acc.totalOutstanding += invoice.totals.outstanding;

        if (invoice.status === 'pending_verification') {
          acc.pendingVerification += 1;
        }
        if (invoice.status === 'overdue') {
          acc.overdue += 1;
        }

        return acc;
      },
      {
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        pendingVerification: 0,
        overdue: 0,
      },
    );

    const totals = summary?.totals;
    if (!totals) return fallback;

    return {
      totalInvoiced: Number(
        totals.total_billed ??
        ((Number.isFinite(Number(totals.total_billed_cents)) ? Number(totals.total_billed_cents) : 0) / 100),
      ),
      totalPaid: Number(
        totals.total_paid ??
        ((Number.isFinite(Number(totals.total_paid_cents)) ? Number(totals.total_paid_cents) : 0) / 100),
      ),
      totalOutstanding: Number(
        totals.total_balance ??
        ((Number.isFinite(Number(totals.total_balance_cents)) ? Number(totals.total_balance_cents) : 0) / 100),
      ),
      pendingVerification: Number(totals.pending_verification_count || 0),
      overdue: Number(totals.overdue_count || 0),
    };
  }, [invoiceRows, summary]);

  const tabCounts = useMemo(
    () => ({
      billing: openBillingRows.length,
      payments: paymentRows.length,
      invoices: filteredInvoices.length,
      history: historyRows.length,
    }),
    [openBillingRows.length, paymentRows.length, filteredInvoices.length, historyRows.length],
  );

  const subscriptionHealth = useMemo(() => {
    if (openBillingRows.length > 0) {
      return {
        tone: 'warning',
        title: 'Action Needed',
        detail: `${openBillingRows.length} subscription invoice${openBillingRows.length > 1 ? 's are' : ' is'} still open. Complete payment to avoid access issues.`,
      };
    }

    if (overview.pendingVerification > 0) {
      return {
        tone: 'info',
        title: 'Pending Verification',
        detail: `${overview.pendingVerification} payment${overview.pendingVerification > 1 ? 's are' : ' is'} waiting for verification.`,
      };
    }

    return {
      tone: 'success',
      title: 'Billing is Healthy',
      detail: 'No outstanding subscription invoices right now.',
    };
  }, [openBillingRows.length, overview.pendingVerification]);

  const styles = useMemo(() => getStyles(theme), [theme]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing Center</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {fetchError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
            <Text style={styles.errorText}>{fetchError}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.openPaymentsButton} onPress={() => navigation.navigate('Payments')}>
          <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          <Text style={styles.openPaymentsButtonText}>Open Full Payments Page</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.openSubscriptionButton} onPress={() => navigation.navigate('SubscriptionPlan')}>
          <Ionicons name="rocket-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.openSubscriptionButtonText}>Open Subscription Plan</Text>
        </TouchableOpacity>

        <View
          style={[
            styles.healthBox,
            subscriptionHealth.tone === 'warning'
              ? styles.healthBoxWarning
              : subscriptionHealth.tone === 'info'
                ? styles.healthBoxInfo
                : styles.healthBoxSuccess,
          ]}
        >
          <Text style={styles.healthTitle}>{subscriptionHealth.title}</Text>
          <Text style={styles.healthDetail}>{subscriptionHealth.detail}</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={theme.colors.textSecondary} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search invoice reference or status"
            placeholderTextColor={theme.colors.textTertiary}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'pending_verification', label: 'Pending Review' },
            { id: 'paid', label: 'Paid' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'refunded', label: 'Refunded' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, statusFilter === item.id && styles.filterChipActive]}
              onPress={() => setStatusFilter(item.id)}
            >
              <Text style={[styles.filterChipText, statusFilter === item.id && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Invoiced</Text>
            <Text style={styles.summaryValue}>{formatCurrency(overview.totalInvoiced)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.successDark }]}>{formatCurrency(overview.totalPaid)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.warningDark }]}>{formatCurrency(overview.totalOutstanding)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending Verification</Text>
            <Text style={styles.summaryValue}>{overview.pendingVerification}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overdue Invoices</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.error }]}>{overview.overdue}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons name={tab.icon} size={14} color={active ? '#166534' : theme.colors.textSecondary} />
                <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{tab.label}</Text>
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{tabCounts[tab.id] || 0}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeTab === 'billing' ? (
          <View style={styles.listSection}>
            {openBillingRows.map((invoice) => (
              <View key={invoice.id} style={styles.itemCard}>
                <View style={styles.itemRowTop}>
                  <Text style={styles.itemTitle}>{invoice.reference || `Invoice #${invoice.id}`}</Text>
                  <Text style={styles.itemAmount}>{formatCurrency(invoice.totals.outstanding)}</Text>
                </View>
                <Text style={styles.itemMeta}>
                  Due: {formatDate(invoice.due_date)} • {String(invoice.status).replace(/_/g, ' ')}
                </Text>
                {buildTenantName(invoice) ? (
                  <Text style={styles.itemMeta}>Tenant: {buildTenantName(invoice)}</Text>
                ) : null}
                {buildRoomLabel(invoice) ? <Text style={styles.itemMeta}>{buildRoomLabel(invoice)}</Text> : null}
              </View>
            ))}

            {openBillingRows.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.successDark} />
                <Text style={styles.emptyText}>No open billing items. Your subscription billing is up to date.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {activeTab === 'payments' ? (
          <View style={styles.listSection}>
            {paymentRows.slice(0, 30).map((payment) => (
              <View key={payment.id} style={styles.itemCard}>
                <View style={styles.itemRowTop}>
                  <Text style={styles.itemTitle}>{payment.invoiceReference || `Invoice #${payment.invoiceId}`}</Text>
                  <Text style={styles.itemAmount}>{formatCurrency(payment.amount)}</Text>
                </View>
                <Text style={styles.itemMeta}>
                  {payment.method} • {String(payment.status).replace(/_/g, ' ')} • {formatDate(payment.createdAt)}
                </Text>
                {payment.tenantName ? <Text style={styles.itemMeta}>Tenant: {payment.tenantName}</Text> : null}
                {payment.roomLabel ? <Text style={styles.itemMeta}>{payment.roomLabel}</Text> : null}
              </View>
            ))}

            {paymentRows.length === 0 ? <Text style={styles.emptyText}>No payment records yet.</Text> : null}
          </View>
        ) : null}

        {activeTab === 'invoices' ? (
          <View style={styles.listSection}>
            {filteredInvoices.slice(0, 30).map((invoice) => (
              <View key={invoice.id} style={styles.itemCard}>
                <View style={styles.itemRowTop}>
                  <Text style={styles.itemTitle}>{invoice.reference || `Invoice #${invoice.id}`}</Text>
                  <Text style={styles.itemAmount}>{formatCurrency(invoice.totals.total)}</Text>
                </View>
                <Text style={styles.itemMeta}>Status: {String(invoice.status).replace(/_/g, ' ')}</Text>
                {buildTenantName(invoice) ? (
                  <Text style={styles.itemMeta}>Tenant: {buildTenantName(invoice)}</Text>
                ) : null}
                {buildRoomLabel(invoice) ? <Text style={styles.itemMeta}>{buildRoomLabel(invoice)}</Text> : null}
              </View>
            ))}

            {filteredInvoices.length === 0 ? <Text style={styles.emptyText}>No invoices found.</Text> : null}
          </View>
        ) : null}

        {activeTab === 'history' ? (
          <View style={styles.listSection}>
            {historyRows.slice(0, 40).map((event) => (
              <View key={event.id} style={styles.itemCard}>
                <View style={styles.itemRowTop}>
                  <Text style={styles.itemTitle}>{event.title}</Text>
                  <Text style={styles.historyType}>{event.type}</Text>
                </View>
                <Text style={styles.itemMeta}>{event.detail}</Text>
                <Text style={styles.historyDate}>{formatDateTime(event.timestamp)}</Text>
              </View>
            ))}

            {historyRows.length === 0 ? <Text style={styles.emptyText}>No billing history entries yet.</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    iconButton: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 26,
      gap: 10,
    },
    errorBox: {
      borderWidth: 1,
      borderColor: theme.colors.errorLight,
      backgroundColor: theme.isDark ? 'rgba(127,29,29,0.3)' : '#FEF2F2',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.error,
      fontWeight: '500',
    },
    openPaymentsButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    openPaymentsButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    openSubscriptionButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.isDark ? 'rgba(15,23,42,0.45)' : '#FFFFFF',
    },
    openSubscriptionButtonText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    healthBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 3,
    },
    healthBoxWarning: {
      borderColor: theme.colors.warningLight,
      backgroundColor: theme.isDark ? 'rgba(120,53,15,0.28)' : '#FFFBEB',
    },
    healthBoxInfo: {
      borderColor: theme.colors.infoLight,
      backgroundColor: theme.isDark ? 'rgba(30,58,138,0.24)' : '#EFF6FF',
    },
    healthBoxSuccess: {
      borderColor: theme.colors.successLight,
      backgroundColor: theme.isDark ? 'rgba(6,78,59,0.26)' : '#ECFDF5',
    },
    healthTitle: {
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: '700',
    },
    healthDetail: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      lineHeight: 17,
    },
    searchBox: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 8,
      fontSize: 13,
      color: theme.colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    filterChip: {
      backgroundColor: theme.colors.backgroundTertiary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    filterChipActive: {
      backgroundColor: theme.colors.successLight,
    },
    filterChipText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: theme.colors.successDark,
      fontWeight: '700',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    summaryCard: {
      width: '48.5%',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      minHeight: 72,
      justifyContent: 'center',
    },
    summaryLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    summaryValue: {
      marginTop: 4,
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '700',
    },
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 2,
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: theme.colors.surface,
    },
    tabButtonActive: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.successLight,
    },
    tabButtonText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    tabButtonTextActive: {
      color: theme.colors.successDark,
      fontWeight: '700',
    },
    tabCount: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    tabCountActive: {
      backgroundColor: '#A7F3D0',
    },
    tabCountText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontWeight: '700',
    },
    tabCountTextActive: {
      color: '#166534',
    },
    listSection: {
      gap: 8,
      marginTop: 2,
    },
    itemCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 11,
      paddingVertical: 10,
      gap: 4,
    },
    itemRowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    itemTitle: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: '700',
    },
    itemAmount: {
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: '700',
    },
    itemMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    historyType: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      fontWeight: '700',
      backgroundColor: theme.colors.backgroundTertiary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: 'hidden',
    },
    historyDate: {
      marginTop: 2,
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    emptyBox: {
      borderWidth: 1,
      borderColor: theme.colors.successLight,
      backgroundColor: theme.isDark ? 'rgba(6,78,59,0.24)' : '#ECFDF5',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
  });
