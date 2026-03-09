import axios from "axios";
import { getImageUrl } from "./imageUtils";

const BASE_URL = import.meta.env.VITE_APP_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BASE_URL}/api`;
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || `${BASE_URL}/storage`;

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
  },
});

// Request interceptor — always attach Bearer token if available.
// Token is stored in localStorage for persistence across page reloads.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isBlocked =
      error.response?.status === 403 &&
      (error.response?.data?.status === "blocked" ||
        error.response?.data?.message?.toLowerCase().includes("blocked"));

    if (isBlocked) {
      try {
        localStorage.removeItem("userData");
        localStorage.removeItem("authToken");
        delete api.defaults.headers.common["Authorization"];
        window.dispatchEvent(new CustomEvent("auth:blocked"));
      } catch (e) {
        // ignore
      }
    } else if (error.response?.status === 401) {
      try {
        localStorage.removeItem("userData");
        localStorage.removeItem("authToken");
        delete api.defaults.headers.common["Authorization"];
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      } catch (e) {
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
  },
});
