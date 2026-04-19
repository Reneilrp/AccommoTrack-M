import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronUp,
  Crown,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { showSuccess, showError } from '../../../utils/toast';
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

const PLAN_VISUALS = {
  free: {
    icon: ShieldCheck,
    tagline: 'Great for first-time landlords starting with one property.',
    shellClasses: 'border-slate-200 dark:border-slate-700',
    headerClasses: 'bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900/40 dark:via-gray-900 dark:to-slate-800/60',
    badgeClasses: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    ctaButtonClasses: 'bg-slate-900 hover:bg-slate-800',
  },
  basic: {
    icon: Building2,
    tagline: 'For growing rentals that need more rooms and better support.',
    shellClasses: 'border-emerald-200 dark:border-emerald-900/60',
    headerClasses: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-emerald-900/25 dark:via-gray-900 dark:to-emerald-900/10',
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    ctaButtonClasses: 'bg-emerald-600 hover:bg-emerald-700',
  },
  standard: {
    icon: BarChart3,
    tagline: 'Balanced operations and analytics for scaling portfolios.',
    shellClasses: 'border-blue-200 dark:border-blue-900/60',
    headerClasses: 'bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-blue-900/25 dark:via-gray-900 dark:to-blue-900/10',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    ctaButtonClasses: 'bg-blue-600 hover:bg-blue-700',
  },
  premium: {
    icon: Crown,
    tagline: 'Designed for high-volume properties with premium headroom.',
    shellClasses: 'border-amber-200 dark:border-amber-900/60',
    headerClasses: 'bg-gradient-to-br from-amber-50 via-white to-amber-100 dark:from-amber-900/25 dark:via-gray-900 dark:to-amber-900/10',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    ctaButtonClasses: 'bg-amber-600 hover:bg-amber-700',
  },
  default: {
    icon: ShieldCheck,
    tagline: 'Flexible plan option for your subscription needs.',
    shellClasses: 'border-gray-200 dark:border-gray-700',
    headerClasses: 'bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900/30 dark:via-gray-900 dark:to-gray-800/70',
    badgeClasses: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    ctaButtonClasses: 'bg-green-600 hover:bg-green-700',
  },
};

export default function SubscriptionPlan({ onOpenBillingCenter }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [bundle, setBundle] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [paymongoInvoiceId, setPaymongoInvoiceId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  const usage = bundle?.usage || {};
  const currentPlan = bundle?.plan || null;
  const currentSubscription = bundle?.subscription || null;
  const normalizedSubscriptionStatus = String(currentSubscription?.status || 'active').toLowerCase();
  const isSelfCheckoutSubscription = currentSubscription?.source === 'self_checkout';
  const needsPaymentCompletion = normalizedSubscriptionStatus === 'scheduled' && isSelfCheckoutSubscription;
  const pendingSubscriptionId = currentSubscription?.id || null;
  const pendingCheckoutUrl = currentSubscription?.metadata?.payment_checkout_url || null;

  const canSyncCheckout = useMemo(() => {
    if (!currentSubscription) return false;
    if (currentSubscription.source !== 'self_checkout') return false;
    return currentSubscription.status === 'scheduled';
  }, [currentSubscription]);

  const statusMeta = useMemo(() => {
    if (needsPaymentCompletion) {
      return {
        label: 'Payment Required',
        tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
        hint: 'Your plan is scheduled but not active yet. Complete payment to unlock full access.',
      };
    }

    if (normalizedSubscriptionStatus === 'active') {
      return {
        label: 'Active',
        tone: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        hint: 'Your subscription is active and your limits are currently enforced by this plan.',
      };
    }

    if (normalizedSubscriptionStatus === 'revoked' || normalizedSubscriptionStatus === 'expired') {
      return {
        label: normalizedSubscriptionStatus.charAt(0).toUpperCase() + normalizedSubscriptionStatus.slice(1),
        tone: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        hint: 'Your subscription is no longer active. Choose a plan to continue with full access.',
      };
    }

    return {
      label: (normalizedSubscriptionStatus || 'active').replace('_', ' '),
      tone: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      hint: 'Review your billing status and keep your subscription up to date.',
    };
  }, [needsPaymentCompletion, normalizedSubscriptionStatus]);

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
      showError(error.message || 'Unable to load subscription details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const buildSubscriptionReturnUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'subscription-plan');
    url.searchParams.set('subscription_payment', 'returned');
    return url.toString();
  };

  const openPaymongoCheckout = (checkoutUrl) => {
    const popup = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      return false;
    }

    return true;
  };

  const beginPaymongoCheckoutForSubscription = async (subscriptionId) => {
    if (!subscriptionId) {
      showError('Unable to continue payment. Subscription checkout context is missing.');
      return false;
    }

    setPaymongoInvoiceId(subscriptionId);

    try {
      const response = await landlordService.createSubscriptionCheckoutPayment(subscriptionId, {
        method: 'qrph',
        return_url: buildSubscriptionReturnUrl(),
      });

      if (!response.success) {
        throw new Error(response.error || 'Unable to start PayMongo checkout.');
      }

      const checkoutUrl =
        response.data?.payment?.checkout_url ||
        response.data?.link?.data?.attributes?.checkout_url ||
        response.data?.checkout_url ||
        response.data?.source?.data?.attributes?.redirect?.checkout_url ||
        null;

      if (!checkoutUrl) {
        throw new Error('PayMongo checkout URL was not returned.');
      }

      const opened = openPaymongoCheckout(checkoutUrl);
      if (!opened) {
        throw new Error('Popup blocked. Allow popups and try again.');
      }

      return true;
    } catch (error) {
      showError(error.message || 'Unable to open PayMongo checkout.');
      return false;
    } finally {
      setPaymongoInvoiceId(null);
    }
  };

  const handleCheckout = async (plan) => {
    if (!plan?.id || plan?.is_active === false) {
      showError('This plan is not currently available for checkout.');
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

      if (paymentRequired) {
        const subscriptionId = response.data?.subscription?.id;
        showSuccess('Subscription started. Continue with PayMongo payment to activate your plan.');

        const launched = await beginPaymongoCheckoutForSubscription(subscriptionId);
        if (!launched) {
          await loadData(true);
        }
      } else {
        showSuccess('Subscription activated successfully.');
        await loadData(true);
      }
    } catch (error) {
      showError(error.message || 'Unable to start checkout.');
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
        showSuccess('Subscription activated after payment confirmation.');
      } else {
        showSuccess('Payment is still pending confirmation.');
      }

      await loadData(true);
    } catch (error) {
      showError(error.message || 'Unable to sync checkout status.');
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
            <span className={`mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.tone}`}>
              {needsPaymentCompletion ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {statusMeta.label}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ends: {formatDateTime(currentSubscription?.ends_at)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
              {statusMeta.hint}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">Next Action</p>
            {needsPaymentCompletion ? (
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => beginPaymongoCheckoutForSubscription(pendingSubscriptionId)}
                  disabled={!pendingSubscriptionId || paymongoInvoiceId === pendingSubscriptionId}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {paymongoInvoiceId === pendingSubscriptionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Continue PayMongo Payment
                </button>
                <button
                  type="button"
                  onClick={handleSyncCheckout}
                  disabled={syncing || !canSyncCheckout}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 font-semibold text-sm hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-60"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Check Payment Status
                </button>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 inline-flex items-start gap-1.5">
                  <Clock3 className="w-3.5 h-3.5 mt-0.5" />
                  {pendingCheckoutUrl
                    ? 'Checkout link is ready. Complete payment in PayMongo, then use Check Payment Status if the update is delayed.'
                    : 'Payment checkout link is still being prepared. Refresh and try again in a moment.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                No immediate action required.
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {displayPlans.map((plan) => {
            const isCurrentPlan = Number(plan.id) === Number(currentPlan?.id);
            const planPrice = billingCycle === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents;
            const featureList = Array.isArray(plan.features) ? plan.features : [];
            const highlightedPlan = String(plan.slug || '').toLowerCase() === 'standard';
            const planSlug = String(plan.slug || '').toLowerCase();
            const isFreeTier = planSlug === 'free';
            const visual = PLAN_VISUALS[planSlug] || PLAN_VISUALS.default;
            const TierIcon = visual.icon;
            const planKey = plan.id ? `id-${plan.id}` : `slug-${plan.slug}`;
            const isExpanded = expandedPlanId === planKey;
            const isCheckingOut = checkoutPlanId !== null && checkoutPlanId === plan.id;
            const isSelectable = Boolean(plan.isSelectable);

            return (
              <div
                key={planKey}
                className={`h-full flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${visual.shellClasses} ${isCurrentPlan ? 'ring-2 ring-green-400/70 dark:ring-green-500/60' : ''}`}
              >
                <div className={`p-4 ${visual.headerClasses}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${visual.badgeClasses}`}>
                        <TierIcon className="w-3.5 h-3.5" />
                        {plan.name} Plan
                      </span>
                    </div>

                    {isCurrentPlan ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : highlightedPlan ? (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <p
                    className="mt-2 w-full text-xs text-gray-600 dark:text-gray-300 leading-5"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {visual.tagline}
                  </p>

                  <div className="mt-4 flex items-end gap-2">
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      {formatMoney(planPrice, plan.currency)}
                    </p>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 pb-1">
                      / {billingCycle === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-gray-900/40 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Properties</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{plan.max_properties ?? 'Unlimited'}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Rooms</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{plan.max_rooms_total ?? 'Unlimited'}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Included</p>
                    {featureList.length > 0 ? (
                      <div className="space-y-1.5">
                        {featureList.slice(0, 2).map((feature) => (
                          <p key={`${plan.id}-${feature}`} className="text-sm text-gray-700 dark:text-gray-200 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            {formatFeatureLabel(feature)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-200">Core listing and account management.</p>
                    )}
                  </div>

                  {!isFreeTier && (
                    <button
                      type="button"
                      onClick={() => setExpandedPlanId(isExpanded ? null : planKey)}
                      className="mt-3 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline inline-flex items-center gap-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Show Less' : 'View More'}
                    </button>
                  )}

                  {isExpanded && !isFreeTier && (
                    <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-blue-700 dark:text-blue-300">
                        What this plan can do
                      </p>

                      {featureList.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {featureList.map((feature) => (
                            <p key={`${plan.id}-detail-${feature}`} className="text-sm text-gray-700 dark:text-gray-200 inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                              {formatFeatureLabel(feature)}
                            </p>
                          ))}
                        </div>
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

                  <div className="mt-auto pt-4 space-y-3">
                    {!isSelectable && !isCurrentPlan && (
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        This tier is currently unavailable for checkout.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCheckout(plan)}
                      disabled={isCurrentPlan || isCheckingOut || !isSelectable}
                      className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                        isCurrentPlan
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : isSelectable
                            ? `${visual.ctaButtonClasses} text-white`
                            : 'bg-gray-400 dark:bg-gray-600 text-white'
                      }`}
                    >
                      {isCheckingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCurrentPlan || !isSelectable ? null : (
                        <Rocket className="w-4 h-4" />
                      )}
                      {isCurrentPlan ? 'Current Plan' : isSelectable ? `Subscribe to ${plan.name}` : 'Unavailable'}
                    </button>
                  </div>
                </div>
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