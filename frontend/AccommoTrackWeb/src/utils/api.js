import axios from "axios";
import { getImageUrl } from "./imageUtils";

const BASE_URL = import.meta.env.VITE_APP_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BASE_URL}/api`;
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || `${BASE_URL}/storage`;
const CLIENT_PLATFORM_HEADER = "X-Client-Platform";
const AUTH_MODE_STORAGE_KEY = "authMode";
export const TRUSTED_DEVICE_STORAGE_KEY = "trustedDevice";
export const TRUSTED_DEVICE_HEADER = "X-Device-Trusted";
export const ACCESS_TOKEN_STORAGE_KEY = "authToken";
export const REFRESH_TOKEN_STORAGE_KEY = "refreshToken";
export const ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY = "authTokenExpiresAt";

// Production defaults to cookie auth.
// Development defaults to bearer auth unless VITE_WEB_USE_BEARER_AUTH=false.
const bearerAuthOverride = import.meta.env.VITE_WEB_USE_BEARER_AUTH;
export const SHOULD_USE_BEARER_AUTH =
  bearerAuthOverride === "true" ||
  (bearerAuthOverride !== "false" && !import.meta.env.PROD);

export const getPersistedAuthMode = () => {
  try {
    return localStorage.getItem(AUTH_MODE_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setPersistedAuthMode = (mode) => {
  try {
    if (mode === "token" || mode === "cookie") {
      localStorage.setItem(AUTH_MODE_STORAGE_KEY, mode);
      return;
    }
    localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

export const clearPersistedAuthMode = () => {
  setPersistedAuthMode(null);
};

const parseTrustedDevicePreference = (value) => {
  if (value === true || value === "1" || value === "true") {
    return true;
  }

  if (value === false || value === "0" || value === "false") {
    return false;
  }

  return null;
};

export const getTrustedDevicePreference = () => {
  try {
    return parseTrustedDevicePreference(localStorage.getItem(TRUSTED_DEVICE_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const setTrustedDevicePreference = (isTrusted) => {
  try {
    if (typeof isTrusted !== "boolean") {
      localStorage.removeItem(TRUSTED_DEVICE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(TRUSTED_DEVICE_STORAGE_KEY, isTrusted ? "1" : "0");
  } catch {
    // ignore storage failures
  }
};

const applyTrustedDeviceHeader = (headers) => {
  if (!headers) {
    return;
  }

  const trustedDevice = getTrustedDevicePreference();
  if (trustedDevice === null) {
    return;
  }

  if (
    headers[TRUSTED_DEVICE_HEADER] === undefined &&
    headers[TRUSTED_DEVICE_HEADER.toLowerCase()] === undefined
  ) {
    headers[TRUSTED_DEVICE_HEADER] = trustedDevice ? "true" : "false";
  }
};

export const shouldUseBearerForRequest = () => {
  return SHOULD_USE_BEARER_AUTH || getPersistedAuthMode() === "token";
};

export const applyTokenAuthPayload = (payload = {}) => {
  const accessToken = payload?.access_token || payload?.token || null;
  const refreshToken = payload?.refresh_token || null;
  const accessTokenExpiresAt = payload?.expires_at || null;

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    delete api.defaults.headers.common["Authorization"];
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  if (accessTokenExpiresAt) {
    localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, accessTokenExpiresAt);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
  }

  return accessToken;
};

export const clearStoredTokenAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
  delete api.defaults.headers.common["Authorization"];
};

const getCookieValue = (name) => {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const prefix = `${name}=`;
  const match = cookies.find((entry) => entry.startsWith(prefix));
  if (!match) return null;

  return match.substring(prefix.length);
};

const getXsrfTokenFromCookie = () => {
  const raw = getCookieValue("XSRF-TOKEN");
  if (!raw) return null;

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const isMutationMethod = (method) => {
  const normalized = (method || "get").toLowerCase();
  return normalized !== "get" && normalized !== "head" && normalized !== "options";
};

const looksLikeHtmlDocument = (value) => {
  if (typeof value !== "string") return false;
  return /^\s*</.test(value) && /<(?:!doctype\s+html|html|head|body)/i.test(value);
};

const isJsonExpectedResponse = (config) => {
  const responseType = (config?.responseType || "json").toLowerCase();
  return responseType === "json";
};

const shouldAllowHtmlResponse = (config) => {
  const header =
    config?.headers?.["X-Allow-HTML-Response"] ||
    config?.headers?.["x-allow-html-response"] ||
    config?.headers?.get?.("X-Allow-HTML-Response");
  return header === "1";
};

const ensureJsonApiResponse = (response) => {
  if (!isJsonExpectedResponse(response?.config) || shouldAllowHtmlResponse(response?.config)) {
    return response;
  }

  const contentType = (response?.headers?.["content-type"] || "").toLowerCase();
  const body = response?.data;
  const isHtmlPayload = contentType.includes("text/html") || looksLikeHtmlDocument(body);

  if (!isHtmlPayload) {
    return response;
  }

  const requestUrl = response?.config?.url || "unknown-url";
  const status = response?.status;
  const error = new Error(`Expected JSON response but received HTML from ${requestUrl}`);
  error.name = "HtmlApiResponseError";
  error.code = "ERR_HTML_RESPONSE";
  error.response = response;
  error.config = response?.config;

  console.error("[API_GUARD] HTML payload received on JSON API request", {
    url: requestUrl,
    status,
    contentType,
  });

  throw error;
};

const normalizePropertyId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const getCaretakerAssignedPropertyIds = () => {
  if (typeof window === "undefined") return null;

  let userData = null;
  try {
    userData = JSON.parse(localStorage.getItem("userData") || "null");
  } catch {
    return null;
  }

  if (!userData || userData.role !== "caretaker") {
    return null;
  }

  const ids = new Set();
  const pushId = (value) => {
    const normalized = normalizePropertyId(value);
    if (normalized) ids.add(normalized);
  };

  pushId(userData.assigned_property_id);
  pushId(userData.property_id);

  if (Array.isArray(userData.assigned_property_ids)) {
    userData.assigned_property_ids.forEach(pushId);
  }

  if (Array.isArray(userData.assigned_properties)) {
    userData.assigned_properties.forEach((property) => {
      if (property && typeof property === "object") {
        pushId(property.id ?? property.property_id);
      }
    });
  }

  return [...ids];
};

const isLandlordPropertiesCollectionRequest = (requestUrl) => {
  if (!requestUrl) return false;

  try {
    const path = new URL(requestUrl, API_BASE_URL).pathname.replace(/\/+$/, "");
    return path.endsWith("/landlord/properties");
  } catch {
    return false;
  }
};

const scopePropertiesToCaretaker = (properties, assignedIds) => {
  if (!Array.isArray(properties)) return properties;

  if (!assignedIds?.length) {
    return properties.slice(0, 1);
  }

  const allowedIds = new Set(assignedIds);
  const filtered = properties.filter((property) =>
    allowedIds.has(normalizePropertyId(property?.id)),
  );

  if (filtered.length > 0) {
    return filtered;
  }

  return properties.slice(0, 1);
};

const applyCaretakerPropertyScope = (response) => {
  const assignedIds = getCaretakerAssignedPropertyIds();
  if (assignedIds === null) return response;
  if (!isLandlordPropertiesCollectionRequest(response?.config?.url)) return response;

  if (Array.isArray(response?.data)) {
    response.data = scopePropertiesToCaretaker(response.data, assignedIds);
    return response;
  }

  if (response?.data && Array.isArray(response.data.data)) {
    response.data = {
      ...response.data,
      data: scopePropertiesToCaretaker(response.data.data, assignedIds),
    };
  }

  return response;
};

// ---------------------------------------------------------------------------
// Hybrid auth helper
// ---------------------------------------------------------------------------
// Returns true when the frontend origin matches the backend origin.
// Kept for potential future use; auth is now Bearer token via localStorage in all cases.
export const isSameOrigin = () => {
  try {
    return (
      new URL(import.meta.env.VITE_APP_URL || "/").origin ===
      window.location.origin
    );
  } catch {
    return true; // assume same-origin on parse failure
  }
};

// ---------------------------------------------------------------------------
// Axios instance with interceptors
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    Accept: "application/json",
    [CLIENT_PLATFORM_HEADER]: "web",
  },
});

let refreshTokenRequestPromise = null;

const isRefreshTokenRequest = (config) => {
  if (config?._skipAuthRefresh) {
    return true;
  }

  const url = String(config?.url || "");
  return url.includes("/refresh-token");
};

const requestNewAccessToken = async () => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const trustedDevice = getTrustedDevicePreference();
  const refreshHeaders = {
    "X-Skip-Auth-Redirect": "1",
    [CLIENT_PLATFORM_HEADER]: "web",
  };

  if (trustedDevice !== null) {
    refreshHeaders[TRUSTED_DEVICE_HEADER] = trustedDevice ? "true" : "false";
  }

  const response = await api.post(
    "/refresh-token",
    { refresh_token: refreshToken },
    {
      _skipAuthRefresh: true,
      headers: refreshHeaders,
    },
  );

  setPersistedAuthMode("token");
  const accessToken = applyTokenAuthPayload(response?.data || {});
  if (!accessToken) {
    throw new Error("Refresh endpoint did not return an access token");
  }

  return accessToken;
};

// Request interceptor — always attach Bearer token if available.
// Token is stored in localStorage for persistence across page reloads.
api.interceptors.request.use(
  (config) => {
    const useBearerAuth = shouldUseBearerForRequest();
    const persistedMode = getPersistedAuthMode();

    if (!config.headers) {
      config.headers = {};
    }

    if (!config.headers?.Accept) {
      config.headers.Accept = "application/json";
    }

    applyTrustedDeviceHeader(config.headers);

    if (!config.headers?.["X-Requested-With"]) {
      config.headers["X-Requested-With"] = "XMLHttpRequest";
    }

    config.withCredentials = true;

    if (isMutationMethod(config.method)) {
      const xsrfToken = getXsrfTokenFromCookie();
      if (xsrfToken && !config.headers?.["X-XSRF-TOKEN"] && !config.headers?.["x-xsrf-token"]) {
        config.headers["X-XSRF-TOKEN"] = xsrfToken;
      }

      if (!config.headers?.["X-Requested-With"]) {
        config.headers["X-Requested-With"] = "XMLHttpRequest";
      }
    }

    if (!useBearerAuth) {
      if (config.headers?.Authorization) {
        delete config.headers.Authorization;
      }
      if (config.url?.includes('/login') || config.url?.includes('/verify-otp')) {
        console.log('[AUTH_DEBUG] Request interceptor (auth endpoint)', {
          url: config.url,
          shouldUseBearerAuth: useBearerAuth,
          persistedAuthMode: persistedMode,
          xClientPlatform: config.headers?.[CLIENT_PLATFORM_HEADER],
          hasXsrfCookie: !!getXsrfTokenFromCookie(),
        });
      }
      return config;
    }

    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (config.url?.includes('/login') || config.url?.includes('/verify-otp')) {
        console.log('[AUTH_DEBUG] Request interceptor - Bearer attached', {
          url: config.url,
          persistedAuthMode: persistedMode,
        });
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => applyCaretakerPropertyScope(ensureJsonApiResponse(response)),
  async (error) => {
    if (error.response?.status === 419 && !error.config?._csrfRetried) {
      try {
        await initCsrfCookie();

        const retryConfig = {
          ...error.config,
          _csrfRetried: true,
        };

        const xsrfToken = getXsrfTokenFromCookie();
        if (xsrfToken) {
          retryConfig.headers = {
            ...(retryConfig.headers || {}),
            "X-XSRF-TOKEN": xsrfToken,
            "X-Requested-With": "XMLHttpRequest",
          };
        }

        return api.request(retryConfig);
      } catch {
        // Let the original 419 flow below handle cleanup.
      }
    }

    const shouldTryRefresh =
      error.response?.status === 401 &&
      shouldUseBearerForRequest() &&
      !isRefreshTokenRequest(error.config) &&
      !error.config?._retryAfterRefresh;

    if (shouldTryRefresh) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

      if (refreshToken) {
        try {
          if (!refreshTokenRequestPromise) {
            refreshTokenRequestPromise = requestNewAccessToken().finally(() => {
              refreshTokenRequestPromise = null;
            });
          }

          const newAccessToken = await refreshTokenRequestPromise;
          const retryConfig = {
            ...error.config,
            _retryAfterRefresh: true,
            headers: {
              ...(error.config?.headers || {}),
              Authorization: `Bearer ${newAccessToken}`,
            },
          };

          return api.request(retryConfig);
        } catch {
          try {
            localStorage.removeItem("userData");
            clearStoredTokenAuth();
            clearPersistedAuthMode();
            window.dispatchEvent(new CustomEvent("auth:refresh-failed"));
            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
          } catch (__e) {
            // ignore
          }

          return Promise.reject(error);
        }
      }
    }

    const skipAuthRedirect =
      error.config?.headers?.["X-Skip-Auth-Redirect"] === "1" ||
      error.config?.headers?.["x-skip-auth-redirect"] === "1" ||
      error.config?.headers?.get?.("X-Skip-Auth-Redirect") === "1";

    if (skipAuthRedirect) {
      return Promise.reject(error);
    }

    // Debug logging for cookie mode failures
     if (error.response?.status === 409) {
      console.error('[AUTH_DEBUG] ⚠️  409 Conflict Response (Full Response Data):', error.response.data);
      console.error('[AUTH_DEBUG] ⚠️  Request Details:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: {
          'X-Client-Platform': error.config?.headers?.[CLIENT_PLATFORM_HEADER],
          'Authorization': error.config?.headers?.Authorization ? '***set***' : 'not-set',
        },
      });
    }

    const isBlocked =
      error.response?.status === 403 &&
      (error.response?.data?.status === "blocked" ||
        error.response?.data?.message?.toLowerCase().includes("blocked"));

    if (isBlocked) {
      try {
        localStorage.removeItem("userData");
        clearStoredTokenAuth();
        clearPersistedAuthMode();
        window.dispatchEvent(new CustomEvent("auth:blocked"));
      } catch (__e) {
        // ignore
      }
    } else if (error.response?.status === 401) {
      try {
        localStorage.removeItem("userData");
        clearStoredTokenAuth();
        clearPersistedAuthMode();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      } catch (__e) {
        // ignore
      }
    }
    return Promise.reject(error);
  },
);

// ============================================
// Utility Functions
// ============================================

/**
 * Get authentication headers for fetch requests
 * @returns {Object} Headers object
 */
export const getAuthHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    [CLIENT_PLATFORM_HEADER]: "web",
  };

  const trustedDevice = getTrustedDevicePreference();
  if (trustedDevice !== null) {
    headers[TRUSTED_DEVICE_HEADER] = trustedDevice ? "true" : "false";
  }

  return headers;
};

/**
 * Construct full API URL
 * @param {string} endpoint - API endpoint (e.g., '/properties' or 'properties')
 * @returns {string} Full API URL
 */
export const apiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export { getImageUrl };

export default api;

export const isCancel = axios.isCancel;

export const ROOT_BASE_URL = BASE_URL;

/**
 * Initialize Sanctum SPA cookie authentication.
 * Must be called once before the first login attempt.
 * Sets the XSRF-TOKEN cookie (readable by JS) and the httpOnly laravel_session cookie.
 */
export async function initCsrfCookie() {
  const csrfEndpoints = ["/api/sanctum/csrf-cookie", "/sanctum/csrf-cookie"];
  let lastError = null;

  for (const endpoint of csrfEndpoints) {
    try {
      await rootApi.get(endpoint, {
        withCredentials: true,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          [CLIENT_PLATFORM_HEADER]: "web",
        },
      });

      const token = getXsrfTokenFromCookie();
      if (token) {
        return token;
      }

      lastError = new Error(`XSRF-TOKEN cookie was not set by ${endpoint}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to initialize CSRF cookie");
}
export const rootApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    Accept: "application/json",
    [CLIENT_PLATFORM_HEADER]: "web",
  },
});

rootApi.interceptors.response.use(
  (response) => ensureJsonApiResponse(response),
  (error) => Promise.reject(error),
);
