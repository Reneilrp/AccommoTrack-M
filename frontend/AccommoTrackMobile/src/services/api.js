import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/index.js';
import { triggerForcedLogout } from '../navigation/RootNavigation.js';
import { useAuthStore } from '../stores/auth/authStore.js';

const PRODUCTION_API_BASE_URL = 'https://accommotrack.me/api';
const REFRESH_ENDPOINT_PATH = '/refresh-token';
const TRUSTED_DEVICE_HEADER = 'X-Device-Trusted';
const TRUSTED_DEVICE_STORAGE_KEY = 'trusted_device';

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
  timeout: 60000, // 60 second timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Client-Platform': 'mobile',
  },
});

let refreshTokenRequestPromise = null;

const parseTrustedDevicePreference = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return null;
};

const getTrustedDevicePreference = async (legacyUser = null) => {
  const storedPreference = await AsyncStorage.getItem(TRUSTED_DEVICE_STORAGE_KEY);
  const parsedStoredPreference = parseTrustedDevicePreference(storedPreference);
  if (parsedStoredPreference !== null) {
    return parsedStoredPreference;
  }

  return parseTrustedDevicePreference(legacyUser?.trusted_device);
};

const isRefreshTokenRequest = (config) => {
  if (config?._skipAuthRefresh) {
    return true;
  }

  return String(config?.url || '').includes(REFRESH_ENDPOINT_PATH);
};

const getStoredRefreshToken = async () => {
  const stateRefreshToken = useAuthStore.getState().refreshToken || null;
  if (stateRefreshToken) {
    return stateRefreshToken;
  }

  return (await AsyncStorage.getItem('refresh_token')) || null;
};

const persistRefreshedSession = async ({ accessToken, refreshToken }) => {
  if (!accessToken) {
    return;
  }

  const currentState = useAuthStore.getState();
  let currentUser = null;

  const userJson = await AsyncStorage.getItem('user');
  if (userJson) {
    try {
      currentUser = JSON.parse(userJson);
    } catch {
      currentUser = null;
    }
  }

  if (currentUser && typeof currentUser === 'object') {
    currentUser.token = accessToken;
    if (refreshToken) {
      currentUser.refresh_token = refreshToken;
    } else {
      delete currentUser.refresh_token;
    }
    await AsyncStorage.setItem('user', JSON.stringify(currentUser));
  }

  await AsyncStorage.setItem('token', accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem('refresh_token', refreshToken);
  } else {
    await AsyncStorage.removeItem('refresh_token');
  }

  useAuthStore.getState().setAuthSession({
    authToken: accessToken,
    refreshToken: refreshToken || null,
    userId: currentUser?.id ?? currentState.userId ?? null,
    activeRole: currentUser?.role ?? currentState.activeRole ?? null,
  });
};

const requestNewAccessToken = async () => {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const trustedDevice = await getTrustedDevicePreference();
  const refreshHeaders = {
    'X-Client-Platform': 'mobile',
    'X-Skip-Auth-Redirect': '1',
  };

  if (trustedDevice !== null) {
    refreshHeaders[TRUSTED_DEVICE_HEADER] = trustedDevice ? 'true' : 'false';
  }

  const response = await api.post(
    REFRESH_ENDPOINT_PATH,
    { refresh_token: refreshToken },
    {
      _skipAuthRefresh: true,
      headers: refreshHeaders,
    }
  );

  const payload = response?.data || {};
  const nextAccessToken = payload.access_token || payload.token || null;
  const nextRefreshToken = payload.refresh_token || refreshToken;

  if (!nextAccessToken) {
    throw new Error('Refresh endpoint did not return an access token');
  }

  await persistRefreshedSession({
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  });

  return nextAccessToken;
};

let tokenWarningShown = false;

// Automatically add Bearer token to every request (for authenticated calls)
api.interceptors.request.use(async (config) => {
  try {
    if (!config.headers) {
      config.headers = {};
    }

    const isFormDataPayload = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormDataPayload) {
      const currentContentType = typeof config.headers?.get === 'function'
        ? config.headers.get('Content-Type')
        : (config.headers['Content-Type'] || config.headers['content-type']);

      const isJsonContentType = String(currentContentType || '')
        .toLowerCase()
        .includes('application/json');

      if (isJsonContentType) {
        if (typeof config.headers?.delete === 'function') {
          config.headers.delete('Content-Type');
        } else {
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
        }
      }
    }

    let token = useAuthStore.getState().authToken || null;
    let refreshToken = useAuthStore.getState().refreshToken || null;
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

    if (!refreshToken) {
      refreshToken = (await AsyncStorage.getItem('refresh_token')) || null;
    }

    if (token && (!useAuthStore.getState().authToken || (refreshToken && !useAuthStore.getState().refreshToken))) {
      useAuthStore.getState().setAuthSession({
        authToken: token,
        refreshToken,
        userId: legacyUser?.id ?? null,
        activeRole: legacyUser?.role ?? null,
      });
    }

    const trustedDevice = await getTrustedDevicePreference(legacyUser);
    if (trustedDevice !== null) {
      config.headers[TRUSTED_DEVICE_HEADER] = trustedDevice ? 'true' : 'false';
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (__DEV__ && !tokenWarningShown) {
      tokenWarningShown = true;
      console.warn('[api] No auth token found for request.');
    }

    if (__DEV__) {
      const method = (config.method || 'get').toUpperCase();
      const url = buildRequestUrl(config.baseURL, config.url);
      console.log(`[api] Request: ${method} ${url}`);
      if (config.data) {
        // Log keys only for large payloads like FormData
        if (config.data instanceof FormData) {
          console.log('[api] Payload (FormData keys):', Object.keys(config.data?._parts || []).map(k => config.data._parts[k][0]));
        } else {
          console.log('[api] Payload:', JSON.stringify(config.data).substring(0, 500));
        }
      }
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
          console.error('[api] Refresh token attempt failed:', refreshError?.response?.data || refreshError?.message || refreshError);
        }
      }
    }

    if (error.response?.status === 401 || isBlocked) {
      try {
        useAuthStore.getState().clearAuthSession();
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refresh_token');
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