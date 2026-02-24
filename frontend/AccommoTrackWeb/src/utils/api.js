import axios from 'axios';

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

/**
 * Get proper image URL from storage path
 * @param {string} imagePath - Image path from database
 * @returns {string|null} Full image URL
 */
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's a full URL, we want to ensure it uses the CURRENT domain
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        try {
            const url = new URL(imagePath);
            const storageMarker = '/storage/';
            const markerIndex = url.pathname.indexOf(storageMarker);
            
            if (markerIndex !== -1) {
                // Standard Laravel storage path: preserve everything after the domain
                const storagePath = url.pathname.substring(markerIndex + 1);
                return `${BASE_URL}/${storagePath}`;
            } else {
                // If it doesn't have /storage/ but IS a full URL, it might be an old absolute path 
                // or a different storage structure. We still want to use our current BASE_URL domain.
                // We'll take the path and ensure it's prefixed with storage/ if it looks like a property image
                let path = url.pathname.replace(/^\/+/, '');
                if (!path.startsWith('storage/') && (path.includes('property_images') || path.includes('room_images'))) {
                    return `${STORAGE_URL}/${path}`;
                }
                return `${BASE_URL}/${path}`;
            }
        } catch (err) {
            console.warn('Failed to parse image URL', err);
        }
        return imagePath;
    }
    
    const cleanPath = imagePath.replace(/^\/+/, '');
    
    if (cleanPath.startsWith('storage/')) {
        return `${BASE_URL}/${cleanPath}`;
    }
    
    return `${STORAGE_URL}/${cleanPath}`;
};

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