import axios from 'axios';

// Base URL configuration from environment variables
const BASE_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BASE_URL}/api`;
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || `${BASE_URL}/storage`;

// Axios instance with interceptors
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});
    
// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - redirect to login
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
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
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
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

/**
 * Get proper image URL from storage path
 * @param {string} imagePath - Image path from database
 * @returns {string|null} Full image URL
 */
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        try {
            const url = new URL(imagePath);
            const storageMarker = '/storage/';
            const markerIndex = url.pathname.indexOf(storageMarker);
            if (markerIndex !== -1) {
                const storagePath = url.pathname.substring(markerIndex + 1); // keep leading 'storage'
                return `${BASE_URL}/${storagePath}`;
            }
        } catch (err) {
            console.warn('Failed to parse image URL', err);
        }
        return imagePath;
    }
    
    // Remove leading slash if present
    const cleanPath = imagePath.replace(/^\/+/, '');
    
    // If path already includes 'storage/', use it as is
    if (cleanPath.startsWith('storage/')) {
        return `${BASE_URL}/${cleanPath}`;
    }
    
    // Otherwise, assume it's relative to storage directory
    return `${STORAGE_URL}/${cleanPath}`;
};

// Export the axios instance as default
export default api;