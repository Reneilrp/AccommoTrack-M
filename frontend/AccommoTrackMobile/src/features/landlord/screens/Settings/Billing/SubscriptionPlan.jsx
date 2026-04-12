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

const hasFinitePositiveLimit = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const EMPTY_LIST = [];

const DEFAULT_PLAN_CHOICES = [
  {
    slug: 'free',
    name: 'Free',
    monthly_price_cents: 0,
    annual_price_cents: 0,
    currency: 'PHP',
    max_properties: 1,
    max_rooms_total: 10,
    features: ['core_listing', 'basic_support'],
  },
  {
    slug: 'basic',
    name: 'Basic',
    monthly_price_cents: 49900,
    annual_price_cents: 499000,
    currency: 'PHP',
    max_properties: 3,
    max_rooms_total: 40,
    features: ['core_listing', 'priority_support', 'payment_reports'],
  },
  {
    slug: 'standard',
    name: 'Standard',
    monthly_price_cents: 149900,
    annual_price_cents: 1499000,
    currency: 'PHP',
    max_properties: 10,
    max_rooms_total: 200,
    features: ['core_listing', 'priority_support', 'analytics', 'payment_reports'],
  },
  {
    slug: 'premium',
    name: 'Premium',
    monthly_price_cents: 399900,
    annual_price_cents: 3999000,
    currency: 'PHP',
    max_properties: 30,
    max_rooms_total: 800,
    features: ['core_listing', 'priority_support', 'analytics', 'payment_reports', 'dedicated_support'],
  },
];

const PLAN_VISUALS = {
  free: {
    icon: 'shield-checkmark-outline',
    tagline: 'Great for first-time landlords starting with one property.',
    heroBgLight: '#F8FAFC',
    heroBgDark: 'rgba(148,163,184,0.16)',
    heroBorderLight: '#CBD5E1',
    heroBorderDark: 'rgba(148,163,184,0.35)',
    badgeBgLight: '#E2E8F0',
    badgeBgDark: 'rgba(100,116,139,0.35)',
    badgeTextLight: '#334155',
    badgeTextDark: '#E2E8F0',
    ctaLight: '#0F172A',
    ctaDark: '#334155',
  },
  basic: {
    icon: 'business-outline',
    tagline: 'For growing rentals that need more rooms and better support.',
    heroBgLight: '#ECFDF5',
    heroBgDark: 'rgba(16,185,129,0.14)',
    heroBorderLight: '#A7F3D0',
    heroBorderDark: 'rgba(16,185,129,0.35)',
    badgeBgLight: '#D1FAE5',
    badgeBgDark: 'rgba(16,185,129,0.30)',
    badgeTextLight: '#065F46',
    badgeTextDark: '#6EE7B7',
    ctaLight: '#059669',
    ctaDark: '#10B981',
  },
  standard: {
    icon: 'stats-chart-outline',
    tagline: 'Balanced operations and analytics for scaling portfolios.',
    heroBgLight: '#EFF6FF',
    heroBgDark: 'rgba(59,130,246,0.14)',
    heroBorderLight: '#BFDBFE',
    heroBorderDark: 'rgba(59,130,246,0.35)',
    badgeBgLight: '#DBEAFE',
    badgeBgDark: 'rgba(59,130,246,0.30)',
    badgeTextLight: '#1E3A8A',
    badgeTextDark: '#93C5FD',
    ctaLight: '#2563EB',
    ctaDark: '#3B82F6',
  },
  premium: {
    icon: 'diamond-outline',
    tagline: 'Designed for high-volume properties with premium headroom.',
    heroBgLight: '#FFFBEB',
    heroBgDark: 'rgba(245,158,11,0.14)',
    heroBorderLight: '#FDE68A',
    heroBorderDark: 'rgba(245,158,11,0.35)',
    badgeBgLight: '#FEF3C7',
    badgeBgDark: 'rgba(245,158,11,0.30)',
    badgeTextLight: '#92400E',
    badgeTextDark: '#FCD34D',
    ctaLight: '#D97706',
    ctaDark: '#F59E0B',
  },
  default: {
    icon: 'layers-outline',
    tagline: 'Flexible plan option for your subscription needs.',
    heroBgLight: '#F3F4F6',
    heroBgDark: 'rgba(107,114,128,0.20)',
    heroBorderLight: '#D1D5DB',
    heroBorderDark: 'rgba(156,163,175,0.35)',
    badgeBgLight: '#E5E7EB',
    badgeBgDark: 'rgba(107,114,128,0.35)',
    badgeTextLight: '#374151',
    badgeTextDark: '#E5E7EB',
    ctaLight: '#4B5563',
    ctaDark: '#6B7280',
  },
};

const getPlanVisual = (slug, isDark) => {
  const key = String(slug || '').toLowerCase();
  const visual = PLAN_VISUALS[key] || PLAN_VISUALS.default;

  return {
    icon: visual.icon,
    tagline: visual.tagline,
    heroBg: isDark ? visual.heroBgDark : visual.heroBgLight,
    heroBorder: isDark ? visual.heroBorderDark : visual.heroBorderLight,
    badgeBg: isDark ? visual.badgeBgDark : visual.badgeBgLight,
    badgeText: isDark ? visual.badgeTextDark : visual.badgeTextLight,
    ctaBg: isDark ? visual.ctaDark : visual.ctaLight,
  };
};

export default function SubscriptionPlanScreen({ navigation }) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState(null);

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

  const plans = subscriptionBundleQuery.data?.plans ?? EMPTY_LIST;
  const bundle = subscriptionBundleQuery.data?.bundle || null;
  const usage = bundle?.usage || {};
  const currentPlan = bundle?.plan || null;
  const currentSubscription = bundle?.subscription || null;

  const displayPlans = useMemo(() => {
    const normalizedPlans = Array.isArray(plans)
      ? plans.map((plan) => ({
        ...plan,
        slug: String(plan?.slug || '').toLowerCase(),
      }))
      : [];

    const plansBySlug = new Map(
      normalizedPlans
        .filter((plan) => plan.slug)
        .map((plan) => [plan.slug, plan]),
    );

    const canonicalPlans = DEFAULT_PLAN_CHOICES.map((fallbackPlan) => {
      const matchedPlan = plansBySlug.get(fallbackPlan.slug);

      if (matchedPlan) {
        return {
          ...fallbackPlan,
          ...matchedPlan,
          slug: fallbackPlan.slug,
          isSelectable: Boolean(matchedPlan.id) && matchedPlan.is_active !== false,
        };
      }

      return {
        ...fallbackPlan,
        id: null,
        is_active: false,
        isSelectable: false,
        isPlaceholder: true,
      };
    });

    const canonicalSlugs = new Set(DEFAULT_PLAN_CHOICES.map((plan) => plan.slug));

    const extraPlans = normalizedPlans
      .filter((plan) => !canonicalSlugs.has(plan.slug))
      .sort((first, second) => {
        const firstSortOrder = Number(first?.sort_order ?? 0);
        const secondSortOrder = Number(second?.sort_order ?? 0);

        if (firstSortOrder !== secondSortOrder) {
          return firstSortOrder - secondSortOrder;
        }

        return Number(first?.id || 0) - Number(second?.id || 0);
      })
      .map((plan) => ({
        ...plan,
        isSelectable: Boolean(plan.id) && plan.is_active !== false,
      }));

    return [...canonicalPlans, ...extraPlans];
  }, [plans]);

  const propertyLimitReached =
    typeof usage.property_limit_reached === 'boolean'
      ? usage.property_limit_reached
      : hasFinitePositiveLimit(usage.properties_limit)
        && Number(usage.properties_count || 0) >= Number(usage.properties_limit);

  const roomLimitReached =
    typeof usage.room_limit_reached === 'boolean'
      ? usage.room_limit_reached
      : hasFinitePositiveLimit(usage.rooms_limit)
        && Number(usage.rooms_count || 0) >= Number(usage.rooms_limit);

  const showLimitWarning = propertyLimitReached || roomLimitReached;

  const limitWarningMessage = useMemo(() => {
    if (propertyLimitReached && roomLimitReached) {
      return 'You reached your property and room limits. Upgrade to continue adding properties and rooms.';
    }

    if (propertyLimitReached) {
      return 'You reached your property limit for the current plan. Upgrade to add more properties.';
    }

    if (roomLimitReached) {
      return 'You reached your room limit for the current plan. Upgrade to add more rooms.';
    }

    return '';
  }, [propertyLimitReached, roomLimitReached]);

  const canSyncCheckout = useMemo(() => {
    if (!currentSubscription) return false;
    if (currentSubscription.source !== 'self_checkout') return false;
    if (currentSubscription.status !== 'scheduled') return false;
    return Boolean(currentSubscription.metadata?.invoice_id);
  }, [currentSubscription]);

  const handleCheckout = async (plan) => {
    if (!plan?.id || plan?.is_active === false) {
      Alert.alert('Unavailable Plan', 'This plan is not currently available for checkout.');
      return;
    }

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
            <Text style={styles.usageLabel}>Properties Used</Text>
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
            <Text style={styles.usageLabel}>Rooms Used</Text>
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

          {showLimitWarning ? (
            <Text style={styles.limitWarning}>
              {limitWarningMessage}
            </Text>
          ) : null}
        </View>

        <View style={styles.planCard}>
          <View style={styles.planHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Plan Choices</Text>
              <Text style={styles.planHeaderMeta}>Current plan: {currentPlan?.name || 'Free'}</Text>
              <Text style={styles.planHeaderMeta} numberOfLines={1}>
                Free Plan | Basic Plan | Standard Plan | Premium Plan
              </Text>
            </View>
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

          {displayPlans.map((plan) => {
            const isCurrentPlan = Number(plan.id) === Number(currentPlan?.id);
            const price = billingCycle === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents;
            const features = Array.isArray(plan.features) ? plan.features : [];
            const planKey = plan.id ? `id-${plan.id}` : `slug-${plan.slug}`;
            const isExpanded = expandedPlanId === planKey;
            const isCheckingOut = checkoutPlanId !== null && checkoutPlanId === plan.id;
            const isSelectable = Boolean(plan.isSelectable);
            const highlightedPlan = String(plan.slug || '').toLowerCase() === 'standard';
            const isFreeTier = String(plan.slug || '').toLowerCase() === 'free';
            const visual = getPlanVisual(plan.slug, theme.isDark);

            return (
              <View key={planKey} style={[styles.planItem, isCurrentPlan && styles.planItemActive]}>
                <View style={[styles.planHero, { backgroundColor: visual.heroBg, borderColor: visual.heroBorder }]}>
                  <View style={styles.planHeroTopRow}>
                    <View style={[styles.planTierBadge, { backgroundColor: visual.badgeBg }]}>
                      <Ionicons name={visual.icon} size={13} color={visual.badgeText} />
                      <Text
                        style={[styles.planTierBadgeText, { color: visual.badgeText }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {plan.name} Plan
                      </Text>
                    </View>

                    {isCurrentPlan ? (
                      <Text style={styles.activeBadge}>Active</Text>
                    ) : highlightedPlan ? (
                      <Text style={styles.popularBadge}>Popular</Text>
                    ) : null}
                  </View>

                  <Text style={styles.planTagline} numberOfLines={2}>
                    {visual.tagline}
                  </Text>

                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>{formatCurrency(price, plan.currency || 'PHP')}</Text>
                    <Text style={styles.planPriceCycle}>/ {billingCycle === 'annual' ? 'year' : 'month'}</Text>
                  </View>
                </View>

                <View style={styles.planBody}>
                  <View style={styles.planCapacityGrid}>
                    <View style={styles.planCapacityTile}>
                      <Text style={styles.planCapacityLabel}>Properties</Text>
                      <Text style={styles.planCapacityValue}>{plan.max_properties ?? 'Unlimited'}</Text>
                    </View>
                    <View style={styles.planCapacityTile}>
                      <Text style={styles.planCapacityLabel}>Rooms</Text>
                      <Text style={styles.planCapacityValue}>{plan.max_rooms_total ?? 'Unlimited'}</Text>
                    </View>
                  </View>

                  <Text style={styles.planIncludedLabel}>Included</Text>
                  {features.length > 0 ? (
                    <View style={styles.planBulletList}>
                      {features.slice(0, 2).map((feature) => (
                        <View key={`${plan.id}-${feature}`} style={styles.planBulletRow}>
                          <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                          <Text style={styles.planBulletText}>{normalizeFeature(feature)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.planMeta}>Core listing and account management access.</Text>
                  )}

                  {!isFreeTier ? (
                    <TouchableOpacity
                      onPress={() => setExpandedPlanId(isExpanded ? null : planKey)}
                      style={styles.viewMoreButton}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.viewMoreButtonText}>{isExpanded ? 'Show Less' : 'View More'}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {isExpanded && !isFreeTier ? (
                    <View style={styles.planDetailsBox}>
                      <Text style={styles.planDetailsTitle}>What this plan can do</Text>
                      {features.length > 0 ? (
                        <View style={styles.planDetailsList}>
                          {features.map((feature) => (
                            <View key={`${plan.id}-detail-${feature}`} style={styles.planDetailsRow}>
                              <Ionicons name="checkmark-circle-outline" size={13} color={theme.colors.infoDark} />
                              <Text style={styles.planDetailsItem}>{normalizeFeature(feature)}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.planDetailsItem}>Core listing and account management access are included.</Text>
                      )}
                      <Text style={styles.planDetailsMeta}>
                        Includes up to {plan.max_properties ?? 'Unlimited'} properties and {plan.max_rooms_total ?? 'Unlimited'} rooms.
                      </Text>
                    </View>
                  ) : null}

                  {!isSelectable && !isCurrentPlan ? (
                    <Text style={styles.unavailableNote}>This tier is currently unavailable for checkout.</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.chooseButton,
                      { backgroundColor: isSelectable ? visual.ctaBg : '#94A3B8' },
                      (isCurrentPlan || isCheckingOut || !isSelectable) && styles.disabledButton,
                    ]}
                    disabled={isCurrentPlan || isCheckingOut || !isSelectable}
                    onPress={() => handleCheckout(plan)}
                  >
                    {isCheckingOut ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={styles.chooseButtonContent}>
                        {!isCurrentPlan && isSelectable ? (
                          <Ionicons name="rocket-outline" size={15} color="#FFFFFF" />
                        ) : null}
                        <Text style={styles.chooseButtonText}>
                          {isCurrentPlan ? 'Current Plan' : isSelectable ? 'Choose Plan' : 'Unavailable'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {displayPlans.length === 0 ? (
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
    planHeaderMeta: {
      marginTop: -6,
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
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
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      shadowColor: '#000000',
      shadowOpacity: theme.isDark ? 0 : 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    planItemActive: {
      borderColor: theme.colors.success,
      shadowColor: theme.colors.success,
      shadowOpacity: theme.isDark ? 0.2 : 0.16,
      elevation: 3,
    },
    planHero: {
      borderBottomWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 11,
      gap: 8,
    },
    planHeroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    planTierBadge: {
      flex: 1,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    planTierBadgeText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.2,
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
    popularBadge: {
      fontSize: 10,
      color: theme.colors.infoDark,
      fontWeight: '700',
      backgroundColor: theme.colors.infoLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      overflow: 'hidden',
      textTransform: 'uppercase',
      letterSpacing: 0.35,
    },
    planTagline: {
      width: '100%',
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: '500',
      lineHeight: 17,
      minHeight: 34,
    },
    planPriceRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    planPrice: {
      fontSize: 20,
      color: theme.colors.text,
      fontWeight: '800',
    },
    planPriceCycle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginBottom: 2,
    },
    planBody: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 8,
    },
    planCapacityGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    planCapacityTile: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: theme.colors.backgroundTertiary,
      gap: 2,
    },
    planCapacityLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontWeight: '700',
    },
    planCapacityValue: {
      fontSize: 15,
      color: theme.colors.text,
      fontWeight: '700',
    },
    planIncludedLabel: {
      marginTop: 2,
      fontSize: 11,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.45,
      fontWeight: '700',
    },
    planMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    planBulletList: {
      gap: 4,
    },
    planBulletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    planBulletText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: '500',
    },
    viewMoreButton: {
      marginTop: 2,
      alignSelf: 'flex-start',
      paddingVertical: 3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewMoreButtonText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    planDetailsBox: {
      marginTop: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.infoLight,
      backgroundColor: theme.isDark ? 'rgba(30,58,138,0.25)' : '#EFF6FF',
      padding: 10,
      gap: 5,
    },
    planDetailsTitle: {
      fontSize: 12,
      color: theme.colors.infoDark,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    planDetailsList: {
      gap: 4,
    },
    planDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    planDetailsItem: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.text,
      fontWeight: '500',
    },
    planDetailsMeta: {
      marginTop: 2,
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    unavailableNote: {
      marginTop: 2,
      fontSize: 11,
      color: theme.colors.warningDark,
      fontWeight: '600',
    },
    chooseButton: {
      marginTop: 4,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chooseButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
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
