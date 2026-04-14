import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import api from '../../../../services/api.js';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

const EMPTY_PROPERTIES = [];

export default function PropertyPaymentSettings({ navigation }) {
  const { theme } = useTheme();
  const showAlert = Alert.alert;
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(null); // propertyId being saved
  const [actionError, setActionError] = useState('');
  const queryClient = useQueryClient();

  const paymentSettingsQuery = useQuery({
    queryKey: landlordQueryKeys.propertyPaymentSettings(),
    queryFn: async () => {
      let isPayMongoVerified = false;
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        try {
          const user = JSON.parse(userString);
          isPayMongoVerified =
            user?.paymongo_verification_status === 'verified' ||
            user?.paymongo_verification_bypass === true ||
            user?.is_paymongo_ready === true;
        } catch (_error) {
          isPayMongoVerified = false;
        }
      }

      const result = await PropertyService.getMyProperties();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load properties');
      }

      const raw = result.data?.data || result.data || [];
      const list = Array.isArray(raw) ? raw : EMPTY_PROPERTIES;

      return {
        isPayMongoVerified,
        properties: list.map((property) => ({
          id: property.id,
          title: property.title || 'Untitled Property',
          city: property.city || '',
          acceptedPayments: Array.isArray(property.accepted_payments)
            ? property.accepted_payments
            : ['cash'],
        })),
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const properties = paymentSettingsQuery.data?.properties || EMPTY_PROPERTIES;
  const isPayMongoVerified = paymentSettingsQuery.data?.isPayMongoVerified || false;
  const loading = paymentSettingsQuery.isPending && properties.length === 0;
  const fetchError = paymentSettingsQuery.error?.message || '';
  const error = actionError || fetchError;

  const refetchPaymentSettings = paymentSettingsQuery.refetch;
  const paymentSettingsRefetchers = useMemo(
    () => [refetchPaymentSettings],
    [refetchPaymentSettings],
  );

  useLandlordFocusRefetch({ refetchers: paymentSettingsRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: paymentSettingsRefetchers,
  });

  const updatePropertiesCache = useCallback(
    (updater) => {
      queryClient.setQueryData(
        landlordQueryKeys.propertyPaymentSettings(),
        (current) => {
          if (!current) return current;

          const currentProperties = Array.isArray(current.properties)
            ? current.properties
            : EMPTY_PROPERTIES;

          return {
            ...current,
            properties: updater(currentProperties),
          };
        },
      );
    },
    [queryClient],
  );

  const toggleMethod = useCallback(async (propertyId, method) => {
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;

    if (method === 'online' && !isPayMongoVerified) {
      showAlert(
        'PayMongo Not Verified',
        'You need to complete PayMongo verification before enabling online payments. Go to Settings > Payments to connect.',
        [{ text: 'OK' }]
      );
      return;
    }

    const current = property.acceptedPayments;
    let updated;
    if (current.includes(method)) {
      // Prevent removing cash if it is the only method
      if (method === 'cash' && current.length === 1) {
        showAlert('Required', 'At least one payment method (Cash) must be enabled.');
        return;
      }
      updated = current.filter((m) => m !== method);
    } else {
      updated = [...current, method];
    }

    // Optimistically update UI
    updatePropertiesCache((prev) =>
      prev.map((p) =>
        p.id === propertyId ? { ...p, acceptedPayments: updated } : p
      )
    );

    try {
      setSaving(propertyId);
      setActionError('');
      const response = await api.post(`/landlord/properties/${propertyId}`, {
        _method: 'PUT',
        accepted_payments: updated,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error('Failed to save');
      }

      await refetchLandlordQueries([refetchPaymentSettings]);
    } catch (err) {
      // Revert on error
      updatePropertiesCache((prev) =>
        prev.map((p) =>
          p.id === propertyId ? { ...p, acceptedPayments: current } : p
        )
      );
      const message = err.response?.data?.message || err.message || 'Failed to update payment methods';
      setActionError(message);
      showAlert('Error', message);
    } finally {
      setSaving(null);
    }
  }, [
    isPayMongoVerified,
    properties,
    refetchPaymentSettings,
    updatePropertiesCache,
  ]);

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Payment Methods</Text>
        <View style={styles.iconButtonEmpty} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* PayMongo status banner */}
        {!isPayMongoVerified && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle" size={20} color="#92400E" />
            <Text style={styles.warningText}>
              Your PayMongo account is not verified. Online payment toggles are
              disabled. Go to{' '}
              <Text style={styles.warningLink}>Settings {'>'} Payments</Text> to
              connect.
            </Text>
          </View>
        )}

        {isPayMongoVerified && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#166534" />
            <Text style={styles.successText}>
              PayMongo is active. You can enable online payments per property.
            </Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Payment Method Key</Text>
          <View style={styles.legendRow}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.legendText}>Cash – Tenant pays in person</Text>
          </View>
          <View style={styles.legendRow}>
            <Ionicons name="card-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.legendText}>Online – GCash, Maya, GrabPay via PayMongo</Text>
          </View>
        </View>

        {/* Error state */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Loading state */}
        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading properties...</Text>
          </View>
        )}

        {/* Property list */}
        {!loading && !error && properties.length === 0 && (
          <View style={styles.centerBox}>
            <Ionicons name="business-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No properties found.</Text>
          </View>
        )}

        {!loading &&
          properties.map((property, index) => (
            <View key={property.id} style={styles.propertyCard}>
              <View style={styles.propertyHeader}>
                <View style={styles.propertyIcon}>
                  <Ionicons name="business" size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propertyTitle} numberOfLines={1}>
                    {property.title}
                  </Text>
                  {property.city ? (
                    <Text style={styles.propertyCity}>{property.city}</Text>
                  ) : null}
                </View>
                {saving === property.id && (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                )}
              </View>

              {/* Cash toggle */}
              <View style={styles.methodRow}>
                <View style={styles.methodLeft}>
                  <Ionicons name="cash-outline" size={20} color="#16a34a" />
                  <View>
                    <Text style={styles.methodLabel}>Cash</Text>
                    <Text style={styles.methodDesc}>In-person cash payment</Text>
                  </View>
                </View>
                <Switch
                  value={property.acceptedPayments.includes('cash')}
                  onValueChange={() => toggleMethod(property.id, 'cash')}
                  trackColor={{ false: '#D1D5DB', true: theme.colors.brand200 }}
                  thumbColor={
                    property.acceptedPayments.includes('cash')
                      ? theme.colors.primary
                      : '#F3F4F6'
                  }
                  disabled={saving === property.id}
                />
              </View>

              <View style={styles.divider} />

              {/* Online toggle */}
              <View style={[styles.methodRow, !isPayMongoVerified && styles.methodDisabled]}>
                <View style={styles.methodLeft}>
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color={isPayMongoVerified ? '#2563EB' : '#9CA3AF'}
                  />
                  <View>
                    <Text
                      style={[
                        styles.methodLabel,
                        !isPayMongoVerified && styles.methodLabelDisabled,
                      ]}
                    >
                      Online
                    </Text>
                    <Text style={styles.methodDesc}>GCash, Maya, GrabPay</Text>
                  </View>
                </View>
                <Switch
                  value={property.acceptedPayments.includes('online')}
                  onValueChange={() => toggleMethod(property.id, 'online')}
                  trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                  thumbColor={
                    property.acceptedPayments.includes('online')
                      ? '#2563EB'
                      : '#F3F4F6'
                  }
                  disabled={!isPayMongoVerified || saving === property.id}
                />
              </View>
            </View>
          ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iconButton: {
    padding: 8,
  },
  iconButtonEmpty: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  warningLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  legendCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  propertyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 16,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  propertyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  propertyCity: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  methodDisabled: {
    opacity: 0.5,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  methodLabelDisabled: {
    color: theme.colors.textTertiary,
  },
  methodDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});
