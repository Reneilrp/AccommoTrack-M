import { cacheManager } from './cache';

// Query Keys from our new hooks
const LANDLORD_QUERY_KEYS = [
  'landlordDashboardStats',
  'landlordActivities',
  'landlordUpcomingPayments',
  'landlordProperties',
  'landlordTenants',
  'landlordBookings',
  'landlordAnalytics'
];

const TENANT_QUERY_KEYS = [
  'tenantDashboardBundle',
  'tenantStayBundle',
  'tenantPayments',
  'tenantHistory',
  'tenantNotifications'
];

const toList = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const dedupe = (items) => [...new Set(items.filter(Boolean))];

const invalidateCachePrefixes = (prefixes) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const normalizedPrefixes = dedupe(toList(prefixes));
  if (normalizedPrefixes.length === 0) {
    return;
  }

  Object.keys(localStorage).forEach((storageKey) => {
    if (!storageKey.startsWith('cache_')) {
      return;
    }

    const cacheKey = storageKey.slice('cache_'.length);
    if (normalizedPrefixes.some((prefix) => cacheKey.startsWith(prefix))) {
      cacheManager.invalidate(cacheKey);
    }
  });
};

/**
 * Landlord Freshness Config
 */
export const LANDLORD_MUTATION_FRESHNESS = {
  uiBuckets: [
    'landlord_dashboard',
    'landlord_bookings',
    'landlord_payments',
    'landlord_analytics',
    'accessible_properties',
  ],
  cacheKeys: ['landlord_dashboard', 'landlord_analytics', 'accessible_properties'],
  cachePrefixes: ['analytics_', 'tenants_property_', 'rooms_property_'],
  queryKeys: LANDLORD_QUERY_KEYS
};

/**
 * Tenant Freshness Config
 */
export const TENANT_MUTATION_FRESHNESS = {
  uiBuckets: ['bookings', 'wallet', 'dashboard'],
  cacheKeys: ['tenant_profile', 'tenant_dashboard', 'tenant_stay_details'],
  cachePrefixes: ['tenant_'],
  queryKeys: TENANT_QUERY_KEYS
};

/**
 * Unified Global Refresh Function
 * Handles Legacy UIState, LocalStorage, and React Query
 */
export const refreshAfterMutation = ({
  queryClient, // Optional: React Query client
  invalidateData,
  uiBuckets,
  cacheKeys,
  cachePrefixes,
  queryKeys,
} = {}) => {
  const normalizedUiBuckets = dedupe(toList(uiBuckets));
  const normalizedCacheKeys = dedupe(toList(cacheKeys));
  const normalizedQueryKeys = dedupe(toList(queryKeys));

  // 1. Invalidate Legacy Context State
  if (typeof invalidateData === 'function' && normalizedUiBuckets.length > 0) {
    invalidateData(normalizedUiBuckets);
  }

  // 2. Invalidate LocalStorage Caches
  normalizedCacheKeys.forEach((cacheKey) => {
    cacheManager.invalidate(cacheKey);
  });

  invalidateCachePrefixes(cachePrefixes);

  // 3. Invalidate React Query (High Performance)
  if (queryClient && normalizedQueryKeys.length > 0) {
    normalizedQueryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }
};
