import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

let tokenWarningShown = false;

// Automatically add Bearer token to every request (for authenticated calls)
api.interceptors.request.use(async (config) => {
  try {
    // Prefer the stored `user` object which may contain the token
    let token = null;
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        token = user?.token || null;
      } catch (e) {
        // ignore parse errors
      }
    }

    // Fallback to legacy keys for backwards compatibility
    if (!token) {
      token = (await AsyncStorage.getItem('token')) || null;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!tokenWarningShown) {
      tokenWarningShown = true;
      console.warn('[api] No auth token found before request to', config.url);
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
});

// Handle common errors (optional pero maganda)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error info for debugging
    console.error('[api] Request failed:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    
    if (error.response?.status === 401) {
      // Optional: Auto logout if token expired
      console.log('Token expired or invalid');
    }
    return Promise.reject(error);
  }
);

export default api;