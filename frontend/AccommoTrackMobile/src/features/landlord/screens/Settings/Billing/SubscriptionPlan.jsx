import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import LandlordSubscriptionService from '../../../../../services/LandlordSubscriptionService.js';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../../hooks/useLandlordQueryHelpers.js';

const formatCurrency = (cents, currency = 'PHP') => {
  const amount = Number.isFinite(Number(cents)) ? Number(cents) / 100 : 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) return 'No end date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No end date';
  return date.toLocaleString();
};

const normalizeFeature = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getUsagePercent = (count, limit) => {
  if (limit === null || limit === undefined || Number(limit) <= 0) {
    return 0;
  }

  const percent = (Number(count || 0) / Number(limit)) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

export default function SubscriptionPlanScreen({ navigation }) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const subscriptionBundleQuery = useQuery({
    queryKey: landlordQueryKeys.subscriptionBundle(),
    queryFn: async () => {
      const [plansResult, currentResult] = await Promise.all([
        LandlordSubscriptionService.getPlans(),
        LandlordSubscriptionService.getCurrent(),
      ]);

      if (!plansResult.success) {
        throw new Error(plansResult.error || 'Failed to load subscription plans.');
      }

      if (!currentResult.success) {
        throw new Error(currentResult.error || 'Failed to load current subscription.');
      }

      return {
        plans: Array.isArray(plansResult.data) ? plansResult.data : [],
        bundle: currentResult.data || null,
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = subscriptionBundleQuery.isPending && !subscriptionBundleQuery.data;
  const fetchError = subscriptionBundleQuery.error?.message || '';
  const refetchSubscriptionBundle = subscriptionBundleQuery.refetch;
  const subscriptionRefetchers = useMemo(
    () => [refetchSubscriptionBundle],
    [refetchSubscriptionBundle],
  );

  useLandlordFocusRefetch({ refetchers: subscriptionRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: subscriptionRefetchers,
  });

  const plans = subscriptionBundleQuery.data?.plans || [];
  const bundle = subscriptionBundleQuery.data?.bundle || null;
  const usage = bundle?.usage || {};
  const currentPlan = bundle?.plan || null;
  const currentSubscription = bundle?.subscription || null;

  const canSyncCheckout = useMemo(() => {
    if (!currentSubscription) return false;
    if (currentSubscription.source !== 'self_checkout') return false;
    if (currentSubscription.status !== 'scheduled') return false;
    return Boolean(currentSubscription.metadata?.invoice_id);
  }, [currentSubscription]);

  const handleCheckout = async (plan) => {
    if (!plan?.id) return;

    setCheckoutPlanId(plan.id);
    try {
      const result = await LandlordSubscriptionService.checkout({
        plan_id: plan.id,
        billing_cycle: billingCycle,
        auto_renew: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Checkout request failed.');
      }

      const paymentRequired = Boolean(result.data?.payment_required);
      const invoiceReference = result.data?.invoice?.reference;

      Alert.alert(
        'Subscription Updated',
        paymentRequired
          ? invoiceReference
            ? `Checkout created. Invoice ${invoiceReference} is ready for payment.`
            : 'Checkout created. Complete payment to activate your plan.'
          : 'Subscription updated successfully.',
      );

      await refetchLandlordQueries(subscriptionRefetchers);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to start checkout.');
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const handleSyncCheckout = async () => {
    if (!currentSubscription?.id) return;

    setSyncing(true);
    try {
      const result = await LandlordSubscriptionService.syncCheckout(currentSubscription.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync payment status.');
      }

      Alert.alert(
        'Sync Complete',
        result.data?.activated
          ? 'Subscription activated after payment confirmation.'
          : 'Payment is still pending confirmation.',
      );

      await refetchLandlordQueries(subscriptionRefetchers);
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to sync checkout status.');
    } finally {
      setSyncing(false);
    }
  };

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
        <Text style={styles.headerTitle}>Subscription Plan</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('BillingCenter')}
        >
          <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
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

        <View style={styles.currentPlanCard}>
          <Text style={styles.cardLabel}>Current Plan</Text>
          <Text style={styles.cardTitle}>{currentPlan?.name || 'Free'}</Text>
          <Text style={styles.cardMeta}>
            Source: {String(currentSubscription?.source || 'system_default').replace(/_/g, ' ')}
          </Text>
          <Text style={styles.cardMeta}>
            Status: {String(currentSubscription?.status || 'active').replace(/_/g, ' ')}
          </Text>
          <Text style={styles.cardMeta}>Ends: {formatDateTime(currentSubscription?.ends_at)}</Text>

          {canSyncCheckout ? (
            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.disabledButton]}
              onPress={handleSyncCheckout}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color={theme.colors.warningDark} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.warningDark} />
                  <Text style={styles.syncButtonText}>Sync Payment Status</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.usageCard}>
          <Text style={styles.sectionTitle}>Usage</Text>

          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Properties</Text>
            <Text style={styles.usageValue}>
              {usage.properties_count ?? 0} / {usage.properties_limit ?? 'Unlimited'}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${getUsagePercent(usage.properties_count, usage.properties_limit)}%`,
                  backgroundColor: theme.colors.success,
                },
              ]}
            />
          </View>

          <View style={[styles.usageRow, { marginTop: 12 }]}
          >
            <Text style={styles.usageLabel}>Rooms</Text>
            <Text style={styles.usageValue}>
              {usage.rooms_count ?? 0} / {usage.rooms_limit ?? 'Unlimited'}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${getUsagePercent(usage.rooms_count, usage.rooms_limit)}%`,
                  backgroundColor: theme.colors.info,
                },
              ]}
            />
          </View>

          {usage.blocked_by_subscription ? (
            <Text style={styles.limitWarning}>
              You reached your current plan limits. Upgrade to continue adding properties or rooms.
            </Text>
          ) : null}
        </View>

        <View style={styles.planCard}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.sectionTitle}>Available Plans</Text>
            <View style={styles.cycleSwitcher}>
              <TouchableOpacity
                style={[
                  styles.cycleButton,
                  billingCycle === 'monthly' && styles.cycleButtonActive,
                ]}
                onPress={() => setBillingCycle('monthly')}
              >
                <Text
                  style={[
                    styles.cycleButtonText,
                    billingCycle === 'monthly' && styles.cycleButtonTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cycleButton,
                  billingCycle === 'annual' && styles.cycleButtonActive,
                ]}
                onPress={() => setBillingCycle('annual')}
              >
                <Text
                  style={[
                    styles.cycleButtonText,
                    billingCycle === 'annual' && styles.cycleButtonTextActive,
                  ]}
                >
                  Annual
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {plans.map((plan) => {
            const isCurrentPlan = Number(plan.id) === Number(currentPlan?.id);
            const price = billingCycle === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents;
            const features = Array.isArray(plan.features) ? plan.features : [];

            return (
              <View key={plan.id} style={[styles.planItem, isCurrentPlan && styles.planItemActive]}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {isCurrentPlan ? <Text style={styles.activeBadge}>Active</Text> : null}
                </View>

                <Text style={styles.planPrice}>
                  {formatCurrency(price, plan.currency || 'PHP')} / {billingCycle === 'annual' ? 'year' : 'month'}
                </Text>

                <Text style={styles.planMeta}>Properties: {plan.max_properties ?? 'Unlimited'}</Text>
                <Text style={styles.planMeta}>Total rooms: {plan.max_rooms_total ?? 'Unlimited'}</Text>

                {features.length > 0 ? (
                  <View style={styles.featureWrap}>
                    {features.slice(0, 4).map((feature) => (
                      <View key={`${plan.id}-${feature}`} style={styles.featureChip}>
                        <Text style={styles.featureText}>{normalizeFeature(feature)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.chooseButton,
                    (isCurrentPlan || checkoutPlanId === plan.id) && styles.disabledButton,
                  ]}
                  disabled={isCurrentPlan || checkoutPlanId === plan.id}
                  onPress={() => handleCheckout(plan)}
                >
                  {checkoutPlanId === plan.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.chooseButtonText}>
                      {isCurrentPlan ? 'Current Plan' : 'Choose Plan'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {plans.length === 0 ? (
            <Text style={styles.emptyText}>No subscription plans are currently available.</Text>
          ) : null}
        </View>
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
      paddingBottom: 24,
      gap: 12,
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
    currentPlanCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 6,
    },
    cardLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      color: theme.colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
    },
    cardMeta: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textTransform: 'capitalize',
    },
    syncButton: {
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.warningLight,
      backgroundColor: theme.isDark ? 'rgba(120,53,15,0.3)' : '#FFFBEB',
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    syncButtonText: {
      color: theme.colors.warningDark,
      fontWeight: '700',
      fontSize: 13,
    },
    usageCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 10,
    },
    usageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    usageLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    usageValue: {
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: '700',
    },
    progressTrack: {
      marginTop: 6,
      height: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.backgroundTertiary,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 6,
    },
    limitWarning: {
      marginTop: 10,
      fontSize: 12,
      color: theme.colors.error,
      fontWeight: '600',
    },
    planCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 10,
    },
    planHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    cycleSwitcher: {
      flexDirection: 'row',
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 10,
      padding: 2,
    },
    cycleButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    cycleButtonActive: {
      backgroundColor: theme.colors.surface,
    },
    cycleButtonText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    cycleButtonTextActive: {
      color: theme.colors.text,
      fontWeight: '700',
    },
    planItem: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 5,
    },
    planItemActive: {
      borderColor: theme.colors.success,
      backgroundColor: theme.isDark ? 'rgba(6,95,70,0.25)' : '#ECFDF5',
    },
    planTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    planName: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    activeBadge: {
      fontSize: 11,
      color: theme.colors.successDark,
      fontWeight: '700',
      backgroundColor: theme.colors.successLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      overflow: 'hidden',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    planPrice: {
      marginTop: 2,
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '700',
    },
    planMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    featureWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    featureChip: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    featureText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    chooseButton: {
      marginTop: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chooseButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    disabledButton: {
      opacity: 0.6,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 12,
    },
  });
