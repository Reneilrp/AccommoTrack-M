// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.254.106:8000/api';

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
    const token =
      (await AsyncStorage.getItem('auth_token')) ||
      (await AsyncStorage.getItem('token'));

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