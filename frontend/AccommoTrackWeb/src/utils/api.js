import axios from "axios";
import { getImageUrl } from "./imageUtils";

const BASE_URL = import.meta.env.VITE_APP_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BASE_URL}/api`;
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || `${BASE_URL}/storage`;
const CLIENT_PLATFORM_HEADER = "X-Client-Platform";
const AUTH_MODE_STORAGE_KEY = "authMode";

// Production defaults to cookie auth. Set VITE_WEB_USE_BEARER_AUTH=true to override.
export const SHOULD_USE_BEARER_AUTH =
  !import.meta.env.PROD || import.meta.env.VITE_WEB_USE_BEARER_AUTH === "true";

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

export const shouldUseBearerForRequest = () => {
  return SHOULD_USE_BEARER_AUTH || getPersistedAuthMode() === "token";
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
  headers: {
    Accept: "application/json",
    [CLIENT_PLATFORM_HEADER]: "web",
  },
});

// Request interceptor — always attach Bearer token if available.
// Token is stored in localStorage for persistence across page reloads.
api.interceptors.request.use(
  (config) => {
    const useBearerAuth = shouldUseBearerForRequest();
    const persistedMode = getPersistedAuthMode();
    
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
        });
      }
      return config;
    }

    const token = localStorage.getItem("authToken");
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
  (response) => response,
  (error) => {
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
        localStorage.removeItem("authToken");
        clearPersistedAuthMode();
        delete api.defaults.headers.common["Authorization"];
        window.dispatchEvent(new CustomEvent("auth:blocked"));
      } catch (__e) {
        // ignore
      }
    } else if (error.response?.status === 401) {
      try {
        localStorage.removeItem("userData");
        localStorage.removeItem("authToken");
        clearPersistedAuthMode();
        delete api.defaults.headers.common["Authorization"];
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
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    [CLIENT_PLATFORM_HEADER]: "web",
  };
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
  await rootApi.get("/sanctum/csrf-cookie");
}
export const rootApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    [CLIENT_PLATFORM_HEADER]: "web",
  },
});
