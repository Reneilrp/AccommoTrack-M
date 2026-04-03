import { cacheManager } from './cache';

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

export const LANDLORD_MUTATION_FRESHNESS = {
  uiBuckets: [
    'landlord_dashboard',
    'landlord_bookings',
    'landlord_payments',
    'landlord_analytics',
  ],
  cacheKeys: ['landlord_dashboard', 'landlord_analytics'],
  cachePrefixes: ['analytics_'],
};

export const refreshAfterMutation = ({
  invalidateData,
  uiBuckets,
  cacheKeys,
  cachePrefixes,
} = {}) => {
  const normalizedUiBuckets = dedupe(toList(uiBuckets));
  const normalizedCacheKeys = dedupe(toList(cacheKeys));

  if (typeof invalidateData === 'function' && normalizedUiBuckets.length > 0) {
    invalidateData(normalizedUiBuckets);
  }

  normalizedCacheKeys.forEach((cacheKey) => {
    cacheManager.invalidate(cacheKey);
  });

  invalidateCachePrefixes(cachePrefixes);
};
