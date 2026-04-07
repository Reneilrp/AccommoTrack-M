import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/index.js';
import { triggerForcedLogout } from '../navigation/RootNavigation.js';
import { useAuthStore } from '../stores/auth/authStore.js';

const PRODUCTION_API_BASE_URL = 'https://accommotrack.me/api';

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
  timeout: 15000, // 15 second timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Client-Platform': 'mobile',
  },
});

let tokenWarningShown = false;

// Automatically add Bearer token to every request (for authenticated calls)
api.interceptors.request.use(async (config) => {
  try {
    let token = useAuthStore.getState().authToken || null;
    let legacyUser = null;

    // Prefer the store first; then fallback to legacy AsyncStorage for migration compatibility.
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      try {
        legacyUser = JSON.parse(userJson);
        if (!token) {
          token = legacyUser?.token || null;
        }
      } catch {
        // ignore parse errors
      }
    }

    // Fallback to legacy keys for backwards compatibility
    if (!token) {
      token = (await AsyncStorage.getItem('token')) || null;
    }

    if (token && !useAuthStore.getState().authToken) {
      useAuthStore.getState().setAuthSession({
        authToken: token,
        userId: legacyUser?.id ?? null,
        activeRole: legacyUser?.role ?? null,
      });
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (__DEV__ && !tokenWarningShown) {
      tokenWarningShown = true;
      console.warn('[api] No auth token found for request.');
    }

    if (__DEV__) {
      const method = (config.method || 'get').toUpperCase();
      console.log('[api] Request:', method, buildRequestUrl(config.baseURL, config.url));
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
});

// Handle common errors — auto-clear session on 401 or blocked (403)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldRetryWithProductionHost(error)) {
      const retryConfig = {
        ...error.config,
        baseURL: PRODUCTION_API_BASE_URL,
        _retryWithProductionHost: true,
      };

      console.warn(
        '[api] Network error on LAN API host. Retrying with production host:',
        buildRequestUrl(retryConfig.baseURL, retryConfig.url)
      );

      return api.request(retryConfig);
    }

    const fullUrl = buildRequestUrl(error.config?.baseURL, error.config?.url);
    const requestPath = String(error.config?.url || '');
    const serverMessage = String(error.response?.data?.message || '').toLowerCase();
    const serverStatus = String(error.response?.data?.status || '').toLowerCase();

    const isExpectedNoVerificationRecord =
      error.response?.status === 404 &&
      requestPath.includes('/landlord/my-verification') &&
      (serverStatus === 'not_submitted' || serverMessage.includes('no verification record'));

    if (isExpectedNoVerificationRecord) {
      return Promise.reject(error);
    }

    // Log detailed error info for debugging
    console.error('[api] Request failed:', {
      url: error.config?.url,
      fullUrl,
      baseURL: error.config?.baseURL,
      code: error.code,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    const isBlocked =
      error.response?.status === 403 &&
      (error.response?.data?.status === 'blocked' ||
       error.response?.data?.message?.toLowerCase().includes('blocked'));

    if (error.response?.status === 401 || isBlocked) {
      try {
        useAuthStore.getState().clearAuthSession();
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user_id');
        await AsyncStorage.removeItem('isGuest');
        // Trigger navigation reset to auth stack (and show blocked toast if applicable)
        triggerForcedLogout(isBlocked);
      } catch (error) {
        console.error('Failed to clear storage on auth error:', error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;