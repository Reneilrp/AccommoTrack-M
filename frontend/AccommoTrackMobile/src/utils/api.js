import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/index.js';
import { triggerForcedLogout } from '../navigation/RootNavigation.js';
import { useAuthStore } from '../stores/auth/authStore.js';
import { getOrCreateDeviceFingerprint } from '../utils/deviceFingerprint.js';
import { extractErrorMessage } from './error.js';

const PRODUCTION_API_BASE_URL = 'https://accommotrack.me/api';
const REFRESH_ENDPOINT_PATH = '/refresh-token';
const TRUSTED_DEVICE_HEADER = 'X-Device-Trusted';
const DEVICE_FINGERPRINT_HEADER = 'X-Device-Fingerprint';
const TRUSTED_DEVICE_STORAGE_KEY = 'trusted_device';

// Request Deduplication
const pendingRequests = new Map();

const getRequestKey = (config) => {
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join('|');
};

const buildRequestUrl = (baseURL, url) => {
  if (!url) return baseURL || '';

  const isAbsolute = /^https?:\/\//i.test(url);
  if (isAbsolute) return url;

  const normalizedBase = (baseURL || '').replace(/\/+$/, '');
  const normalizedPath = String(url).replace(/^\/+/, '');
  return normalizedBase ? `${normalizedBase}/${normalizedPath}` : normalizedPath;
};

const extractHost = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isLanOrLocalHost = (host) => {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
};

const shouldRetryWithProductionHost = (error) => {
  const isNetworkError =
    !error.response &&
    (error.code === 'ERR_NETWORK' ||
      String(error.message || '').toLowerCase().includes('network error'));

  if (!isNetworkError || error.config?._retryWithProductionHost) {
    return false;
  }

  const currentBase = error.config?.baseURL || API_BASE_URL;
  const currentHost = extractHost(currentBase);
  return isLanOrLocalHost(currentHost);
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Client-Platform': 'mobile',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

const originalGet = api.get;

/**
 * Optimized GET wrapper with deduplication
 */
api.get = function (url, config = {}) {
  // If deduplication is explicitly disabled, skip it.
  if (config.dedupe === false) {
    return originalGet.call(this, url, config);
  }

  const requestKey = getRequestKey({ method: 'get', url, ...config });
  
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = originalGet.call(this, url, config)
    .finally(() => {
      pendingRequests.delete(requestKey);
    });

  pendingRequests.set(requestKey, promise);
  return promise;
};

/**
 * Normalizes paginated API response to { items, pagination } format.
 * Handles both new { items, pagination } and legacy { data, current_page, ... } formats.
 */
export const normalizePaginatedResponse = (response) => {
  const rawData = response?.data ?? response ?? {};
  
  // 1. If it's already in the unified format { items: [...], pagination: {...} }
  if (rawData.items && rawData.pagination && Array.isArray(rawData.items)) {
    return {
      items: rawData.items,
      pagination: rawData.pagination
    };
  }

  // 2. If it's a standard Laravel paginated response { data: [...], current_page: 1, ... }
  if (rawData.data && Array.isArray(rawData.data) && (rawData.current_page !== undefined || rawData.total !== undefined)) {
    return {
      items: rawData.data,
      pagination: {
        current_page: rawData.current_page || 1,
        last_page: rawData.last_page || 1,
        total: rawData.total || 0,
        per_page: rawData.per_page || 15
      }
    };
  }

  // 3. If rawData is already an array, treat it as non-paginated items
  if (Array.isArray(rawData)) {
    return {
      items: rawData,
      pagination: {
        current_page: 1,
        last_page: 1,
        total: rawData.length,
        per_page: Math.max(rawData.length, 15)
      }
    };
  }

  // 4. Fallback for objects that might contain a data array but no pagination info
  if (rawData.data && Array.isArray(rawData.data)) {
    return {
      items: rawData.data,
      pagination: {
        current_page: 1,
        last_page: 1,
        total: rawData.data.length,
        per_page: Math.max(rawData.data.length, 15)
      }
    };
  }

  return {
    items: [],
    pagination: {
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 15
    }
  };
};

/**
 * Normalizes API response to { success, data, error } format.
 * Prevents Red Screen crashes by ensuring a consistent structure.
 */
export const normalizeResponse = (response) => {
  return {
    success: true,
    data: response?.data?.data ?? response?.data ?? null,
    error: null,
  };
};

/**
 * Normalizes API error to { success, data, error } format.
 */
export const normalizeError = (error) => {
  return {
    success: false,
    data: null,
    error: extractErrorMessage(error),
    status: error.response?.status,
    validationErrors: error.response?.status === 422 ? error.response.data.errors : null,
  };
};

let refreshTokenRequestPromise = null;

const parseTrustedDevicePreference = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
};

const getTrustedDevicePreference = async () => {
  const storedPreference = await AsyncStorage.getItem(TRUSTED_DEVICE_STORAGE_KEY);
  return parseTrustedDevicePreference(storedPreference);
};

const isRefreshTokenRequest = (config) => {
  if (config?._skipAuthRefresh) return true;
  return String(config?.url || '').includes(REFRESH_ENDPOINT_PATH);
};

const getStoredRefreshToken = async () => {
  return useAuthStore.getState().refreshToken || null;
};

const persistRefreshedSession = async ({ accessToken, refreshToken }) => {
  if (!accessToken) return;

  const currentState = useAuthStore.getState();
  
  // Update Zustand store which is persisted to SecureStore
  useAuthStore.getState().setAuthSession({
    authToken: accessToken,
    refreshToken: refreshToken || currentState.refreshToken || null,
    userId: currentState.userId,
    activeRole: currentState.activeRole,
  });

  // Clean up legacy AsyncStorage keys if they exist
  await Promise.all([
    AsyncStorage.removeItem('token'),
    AsyncStorage.removeItem('refresh_token'),
  ]);
};

const requestNewAccessToken = async () => {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) throw new Error('Missing refresh token');

  const trustedDevice = await getTrustedDevicePreference();
  const refreshHeaders = {
    'X-Client-Platform': 'mobile',
    'X-Skip-Auth-Redirect': '1',
  };

  const deviceFingerprint = await getOrCreateDeviceFingerprint();
  if (deviceFingerprint) refreshHeaders[DEVICE_FINGERPRINT_HEADER] = deviceFingerprint;
  if (trustedDevice !== null) refreshHeaders[TRUSTED_DEVICE_HEADER] = trustedDevice ? 'true' : 'false';

  const response = await api.post(
    REFRESH_ENDPOINT_PATH,
    { refresh_token: refreshToken },
    { _skipAuthRefresh: true, headers: refreshHeaders }
  );

  const payload = response?.data || {};
  const nextAccessToken = payload.access_token || payload.token || null;
  const nextRefreshToken = payload.refresh_token || refreshToken;

  if (!nextAccessToken) throw new Error('Refresh endpoint did not return an access token');

  await persistRefreshedSession({
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  });

  return nextAccessToken;
};

let tokenWarningShown = false;

// Request Interceptor
api.interceptors.request.use(async (config) => {
  try {
    if (!config.headers) config.headers = {};

    const isFormDataPayload =
      config.data &&
      (config.data instanceof FormData ||
        config.data.constructor?.name === 'FormData' ||
        typeof config.data.append === 'function' ||
        Array.isArray(config.data._parts));

    if (isFormDataPayload) {
      const hasContentType = config.headers?.['Content-Type'] || config.headers?.['content-type'];
      if (!hasContentType) {
        if (typeof config.headers?.delete === 'function') {
          config.headers.delete('Content-Type');
        } else {
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
        }
      }
    }

    let token = useAuthStore.getState().authToken;

    // Fast hydration check: if store isn't hydrated, attempt direct SecureStore read for critical path
    if (!token && !useAuthStore.getState().hasHydrated) {
      try {
        const isAvailable = await SecureStore.isAvailableAsync();
        if (isAvailable) {
          const raw = await SecureStore.getItemAsync('auth_session');
          if (raw) {
            const parsed = JSON.parse(raw);
            token = parsed.state?.authToken;
          }
        }
      } catch (e) {
        // Fallback to waiting for hydration or normal store access
      }
    }

    const trustedDevice = await getTrustedDevicePreference();
    if (trustedDevice !== null) config.headers[TRUSTED_DEVICE_HEADER] = trustedDevice ? 'true' : 'false';

    const deviceFingerprint = await getOrCreateDeviceFingerprint();
    if (deviceFingerprint) config.headers[DEVICE_FINGERPRINT_HEADER] = deviceFingerprint;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (__DEV__ && !tokenWarningShown && !isRefreshTokenRequest(config)) {
      tokenWarningShown = true;
      console.warn('[api] No auth token found for request:', config.url);
    }

    if (__DEV__) {
      const method = (config.method || 'get').toUpperCase();
      const url = buildRequestUrl(config.baseURL, config.url);
      console.log(`[api] Request: ${method} ${url}`);
    }
  } catch (error) {
    console.error('Error in request interceptor:', error);
  }
  return config;
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldRetryWithProductionHost(error)) {
      const retryConfig = {
        ...error.config,
        baseURL: PRODUCTION_API_BASE_URL,
        _retryWithProductionHost: true,
      };
      return api.request(retryConfig);
    }

    const requestPath = String(error.config?.url || '');
    const serverMessage = String(error.response?.data?.message || '').toLowerCase();
    const serverStatus = String(error.response?.data?.status || '').toLowerCase();

    // Special case for missing verification
    const isExpectedNoVerificationRecord =
      error.response?.status === 404 &&
      requestPath.includes('/landlord/my-verification') &&
      (serverStatus === 'not_submitted' || serverMessage.includes('no verification record'));

    if (isExpectedNoVerificationRecord) return Promise.reject(error);

    const isBlocked =
      error.response?.status === 403 &&
      (error.response?.data?.status === 'blocked' ||
       error.response?.data?.message?.toLowerCase().includes('blocked'));

    const shouldTryRefresh =
      error.response?.status === 401 &&
      !isBlocked &&
      !isRefreshTokenRequest(error.config) &&
      !error.config?._retryAfterRefresh;

    if (shouldTryRefresh) {
      const refreshToken = await getStoredRefreshToken();

      if (refreshToken) {
        try {
          if (!refreshTokenRequestPromise) {
            refreshTokenRequestPromise = requestNewAccessToken().finally(() => {
              refreshTokenRequestPromise = null;
            });
          }

          const refreshedAccessToken = await refreshTokenRequestPromise;
          const retryConfig = {
            ...error.config,
            _retryAfterRefresh: true,
            headers: {
              ...(error.config?.headers || {}),
              Authorization: `Bearer ${refreshedAccessToken}`,
            },
          };

          return api.request(retryConfig);
        } catch (refreshError) {
          console.error('[api] Refresh token attempt failed:', refreshError?.response?.data || refreshError?.message);
        }
      }
    }

    if (error.response?.status === 401 || isBlocked) {
      try {
        useAuthStore.getState().clearAuthSession();
        await Promise.all([
          AsyncStorage.removeItem('user'),
          AsyncStorage.removeItem('user_id'),
          AsyncStorage.removeItem('isGuest'),
        ]);
        triggerForcedLogout(isBlocked);
      } catch (err) {
        console.error('Failed to clear storage on auth error:', err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;