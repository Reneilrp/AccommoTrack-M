import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/index.js';
import { triggerForcedLogout } from '../navigation/RootNavigation.js';

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
    // Log detailed error info for debugging
    console.error('[api] Request failed:', {
      url: error.config?.url,
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
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user_id');
        await AsyncStorage.removeItem('isGuest');
        // Trigger navigation reset to auth stack (and show blocked toast if applicable)
        triggerForcedLogout(isBlocked);
      } catch (e) {
        console.error('Failed to clear storage on auth error:', e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;