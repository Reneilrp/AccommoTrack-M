import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECHO_CONFIG } from '../config/index.js';
import { useAuthStore } from '../stores/auth/authStore.js';

window.Pusher = Pusher;

const resolveEchoToken = async () => {
  const authState = useAuthStore.getState();
  let bearerToken = authState?.authToken || '';
  let parsedUser = null;

  if (bearerToken) {
    return bearerToken;
  }

  const userJson = await AsyncStorage.getItem('user');
  if (userJson) {
    try {
      parsedUser = JSON.parse(userJson);
      bearerToken = parsedUser?.token || '';
    } catch (error) {
      console.warn('[Echo] Failed to parse user JSON from AsyncStorage:', error);
    }
  }

  if (!bearerToken) {
    bearerToken = (await AsyncStorage.getItem('token')) || '';
  }

  // Legacy compatibility for older builds that used userData/authToken keys.
  if (!bearerToken) {
    const legacyUserJson = await AsyncStorage.getItem('userData');
    if (legacyUserJson) {
      try {
        const legacyUser = JSON.parse(legacyUserJson);
        bearerToken = legacyUser?.token || '';
      } catch (error) {
        console.warn('[Echo] Failed to parse legacy userData JSON:', error);
      }
    }
  }

  if (!bearerToken) {
    bearerToken = (await AsyncStorage.getItem('authToken')) || '';
  }

  if (bearerToken && !authState?.authToken) {
    useAuthStore.getState().setAuthSession({
      authToken: bearerToken,
      userId: parsedUser?.id ?? null,
      activeRole: parsedUser?.role ?? null,
    });
  }

  return bearerToken;
};

const createEcho = async () => {
  let bearerToken = '';
  try {
    bearerToken = await resolveEchoToken();
  } catch (e) {
    console.error('[Echo] Error retrieving token:', e);
  }

  const authHeaders = {
    Accept: 'application/json',
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
  };

  const config = {
    ...ECHO_CONFIG,
    auth: {
      headers: authHeaders,
    }
  };

  return new Echo(config);
};

export default createEcho;
