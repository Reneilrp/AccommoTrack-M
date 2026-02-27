import axios from 'axios';
import { getImageUrl } from './imageUtils';

const BASE_URL = import.meta.env.VITE_APP_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BASE_URL}/api`;
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || `${BASE_URL}/storage`;

// Axios instance with interceptors
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Accept': 'application/json',
    }
});

// Request interceptor to add the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            try {
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            } catch (e) {
                // ignore
            }
        }
        return Promise.reject(error);
    }
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
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};

/**
 * Construct full API URL
 * @param {string} endpoint - API endpoint (e.g., '/properties' or 'properties')
 * @returns {string} Full API URL
 */
export const apiUrl = (endpoint) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
};

export { getImageUrl };

export default api;

export const isCancel = axios.isCancel;

export const ROOT_BASE_URL = BASE_URL;
export const rootApi = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Accept': 'application/json',
    }
});