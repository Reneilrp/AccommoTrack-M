import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Rocket, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import landlordService from '../../../services/landlordService';

const formatMoney = (cents, currency = 'PHP') => {
  const amount = Number.isFinite(Number(cents)) ? Number(cents) / 100 : 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const getProgressPercent = (count, limit) => {
  if (limit === null || limit === undefined || Number(limit) <= 0) {
    return 0;
  }

  const percent = (Number(count || 0) / Number(limit)) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

const hasFinitePositiveLimit = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const formatFeatureLabel = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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

export default function SubscriptionPlan({ onOpenBillingCenter }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [bundle, setBundle] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  const usage = bundle?.usage || {};
  const currentPlan = bundle?.plan || null;
  const currentSubscription = bundle?.subscription || null;

  const canSyncCheckout = useMemo(() => {
    if (!currentSubscription) return false;
    if (currentSubscription.source !== 'self_checkout') return false;
    if (currentSubscription.status !== 'scheduled') return false;
    return Boolean(currentSubscription.metadata?.invoice_id);
  }, [currentSubscription]);

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
      : hasFinitePositiveLimit(usage.properties_limit) && Number(usage.properties_count || 0) >= Number(usage.properties_limit);

  const roomLimitReached =
    typeof usage.room_limit_reached === 'boolean'
      ? usage.room_limit_reached
      : hasFinitePositiveLimit(usage.rooms_limit) && Number(usage.rooms_count || 0) >= Number(usage.rooms_limit);

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

  const loadData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [plansResponse, currentResponse] = await Promise.all([
        landlordService.getSubscriptionPlans(),
        landlordService.getCurrentSubscription(),
      ]);

      if (!plansResponse.success) {
        throw new Error(plansResponse.error || 'Failed to load subscription plans.');
      }

      if (!currentResponse.success) {
        throw new Error(currentResponse.error || 'Failed to load current subscription.');
      }

      setPlans(Array.isArray(plansResponse.data) ? plansResponse.data : []);
      setBundle(currentResponse.data || null);
    } catch (error) {
      toast.error(error.message || 'Unable to load subscription details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleCheckout = async (plan) => {
    if (!plan?.id || plan?.is_active === false) {
      toast.error('This plan is not currently available for checkout.');
      return;
    }

    setCheckoutPlanId(plan.id);
    try {
      const response = await landlordService.checkoutSubscription({
        plan_id: plan.id,
        billing_cycle: billingCycle,
        auto_renew: true,
      });

      if (!response.success) {
        throw new Error(response.error || 'Checkout request failed.');
      }

      const paymentRequired = Boolean(response.data?.payment_required);
      const invoiceReference = response.data?.invoice?.reference;

      if (paymentRequired) {
        toast.success(
          invoiceReference
            ? `Checkout created. Invoice ${invoiceReference} is ready for payment.`
            : 'Checkout created. Complete payment to activate your plan.'
        );
      } else {
        toast.success('Subscription updated successfully.');
      }

      await loadData(true);
    } catch (error) {
      toast.error(error.message || 'Unable to start checkout.');
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const handleSyncCheckout = async () => {
    if (!currentSubscription?.id) return;

    setSyncing(true);
    try {
      const response = await landlordService.syncSubscriptionCheckout(currentSubscription.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to sync subscription payment status.');
      }

      if (response.data?.activated) {
        toast.success('Subscription activated after payment confirmation.');
      } else {
        toast.success('Payment is still pending confirmation.');
      }

      await loadData(true);
    } catch (error) {
      toast.error(error.message || 'Unable to sync checkout status.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-green-600 dark:text-green-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Subscription Plan</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your active plan and resource limits for properties and rooms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>

            {onOpenBillingCenter && (
              <button
                type="button"
                onClick={onOpenBillingCenter}
                className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold text-white"
              >
                Open Billing Center
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50/70 dark:bg-green-900/20 p-4">
            <p className="text-xs font-semibold tracking-wide uppercase text-green-700 dark:text-green-300">Current Plan</p>
            <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
              {currentPlan?.name || 'Free'}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Source: {(currentSubscription?.source || 'system_default').replace('_', ' ')}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">Subscription Status</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1 capitalize">
              {currentSubscription?.status || 'active'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ends: {formatDateTime(currentSubscription?.ends_at)}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">Billing Action</p>
            {canSyncCheckout ? (
              <button
                type="button"
                onClick={handleSyncCheckout}
                disabled={syncing}
                className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 font-semibold text-sm hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-60"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Sync Payment Status
              </button>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                No pending checkout sync needed.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Properties Used</span>
              <span>
                {usage.properties_count ?? 0} / {usage.properties_limit ?? 'Unlimited'}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-green-600 dark:bg-green-400"
                style={{ width: `${getProgressPercent(usage.properties_count, usage.properties_limit)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Rooms Used</span>
              <span>
                {usage.rooms_count ?? 0} / {usage.rooms_limit ?? 'Unlimited'}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-400"
                style={{ width: `${getProgressPercent(usage.rooms_count, usage.rooms_limit)}%` }}
              />
            </div>
          </div>

          {showLimitWarning && (
            <p className="text-sm text-red-700 dark:text-red-300 inline-flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {limitWarningMessage}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Plan Choices</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Current plan: {currentPlan?.name || 'Free'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Free Plan | Basic Plan | Standard Plan | Premium Plan
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900/40">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${billingCycle === 'monthly' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${billingCycle === 'annual' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {displayPlans.map((plan) => {
            const isCurrentPlan = Number(plan.id) === Number(currentPlan?.id);
            const planPrice = billingCycle === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents;
            const featureList = Array.isArray(plan.features) ? plan.features : [];
            const highlightedPlan = String(plan.slug || '').toLowerCase() === 'standard';
            const planKey = plan.id ? `id-${plan.id}` : `slug-${plan.slug}`;
            const isExpanded = expandedPlanId === planKey;
            const isCheckingOut = checkoutPlanId !== null && checkoutPlanId === plan.id;
            const isSelectable = Boolean(plan.isSelectable);

            return (
              <div
                key={planKey}
                className={`rounded-xl border p-4 ${isCurrentPlan ? 'border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
                      {plan.name} Tier
                      {highlightedPlan && !isCurrentPlan && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          Popular
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {formatMoney(planPrice, plan.currency)} / {billingCycle === 'annual' ? 'year' : 'month'}
                    </p>
                  </div>

                  {isCurrentPlan ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p>Properties: {plan.max_properties ?? 'Unlimited'}</p>
                  <p>Total rooms: {plan.max_rooms_total ?? 'Unlimited'}</p>
                </div>

                {featureList.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {featureList.slice(0, 3).map((feature) => (
                      <span
                        key={`${plan.id}-${feature}`}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                      >
                        {formatFeatureLabel(feature)}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedPlanId(isExpanded ? null : planKey)}
                  className="mt-3 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                >
                  {isExpanded ? 'Show Less' : 'View More'}
                </button>

                {isExpanded && (
                  <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3">
                    <p className="text-xs uppercase tracking-wide font-semibold text-blue-700 dark:text-blue-300">
                      What this plan can do
                    </p>

                    {featureList.length > 0 ? (
                      <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                        {featureList.map((feature) => (
                          <li key={`${plan.id}-detail-${feature}`}>{formatFeatureLabel(feature)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                        Core listing and account management access are included.
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                      Includes up to {plan.max_properties ?? 'Unlimited'} properties and {plan.max_rooms_total ?? 'Unlimited'} rooms.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleCheckout(plan)}
                  disabled={isCurrentPlan || isCheckingOut || !isSelectable}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCheckingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentPlan || !isSelectable ? null : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {isCurrentPlan ? 'Current Plan' : isSelectable ? 'Choose Plan' : 'Unavailable'}
                </button>
              </div>
            );
          })}
        </div>

        {displayPlans.length === 0 && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No subscription plans are currently available.
          </div>
        )}
      </div>
    </div>
  );
}