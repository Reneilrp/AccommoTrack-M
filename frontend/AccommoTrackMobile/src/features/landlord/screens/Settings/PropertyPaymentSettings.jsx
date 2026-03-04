import React, { useCallback, useEffect, useState } from 'react';
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
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import api from '../../../../services/api.js';

export default function PropertyPaymentSettings({ navigation }) {
  const { theme } = useTheme();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(null); // propertyId being saved
  const [isPayMongoVerified, setIsPayMongoVerified] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (fromRefresh = false) => {
    try {
      fromRefresh ? setRefreshing(true) : setLoading(true);
      setError('');

      // Load user from storage to check PayMongo verification status
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        setIsPayMongoVerified(user?.paymongo_verification_status === 'verified');
      }

      // Load all properties
      const result = await PropertyService.getMyProperties();
      if (!result.success) throw new Error(result.error || 'Failed to load properties');

      const raw = result.data?.data || result.data || [];
      const list = Array.isArray(raw) ? raw : [];
      setProperties(
        list.map((p) => ({
          id: p.id,
          title: p.title || 'Untitled Property',
          city: p.city || '',
          acceptedPayments: Array.isArray(p.accepted_payments)
            ? p.accepted_payments
            : ['cash'],
        }))
      );
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      fromRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const toggleMethod = async (propertyId, method) => {
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;

    if (method === 'online' && !isPayMongoVerified) {
      Alert.alert(
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
        Alert.alert('Required', 'At least one payment method (Cash) must be enabled.');
        return;
      }
      updated = current.filter((m) => m !== method);
    } else {
      updated = [...current, method];
    }

    // Optimistically update UI
    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId ? { ...p, acceptedPayments: updated } : p
      )
    );

    try {
      setSaving(propertyId);
      const response = await api.post(`/landlord/properties/${propertyId}`, {
        _method: 'PUT',
        accepted_payments: updated,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error('Failed to save');
      }
    } catch (err) {
      // Revert on error
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId ? { ...p, acceptedPayments: current } : p
        )
      );
      Alert.alert('Error', err.response?.data?.message || 'Failed to update payment methods');
    } finally {
      setSaving(null);
    }
  };

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
            onRefresh={() => loadData(true)}
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
                  <Ionicons name="cash-outline" size={20} color="#16A34A" />
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
    padding: 4,
  },
  iconButtonEmpty: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
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
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
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
    marginBottom: 4,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
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
    gap: 12,
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
    gap: 12,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    paddingVertical: 4,
  },
  methodDisabled: {
    opacity: 0.5,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
