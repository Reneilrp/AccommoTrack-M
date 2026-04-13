import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import api from './api.js';
import { useAuthStore } from '../stores/auth/authStore.js';

const DEVICE_PUSH_TOKEN_STORAGE_KEY = 'device_push_token';
const REGISTERED_PUSH_TOKEN_PREFIX = 'registered_push_token';
const EXTENSION_REMINDER_PREFIX = 'extension_one_day_reminder';
const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

if (!isTestEnv && typeof Notifications?.setNotificationHandler === 'function') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const getRegistrationCacheKey = () => {
  const userId = useAuthStore.getState().userId ?? 'unknown';
  return `${REGISTERED_PUSH_TOKEN_PREFIX}:${userId}`;
};

const resolveExpoProjectId = () => {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    null
  );
};

export const registerDevicePushToken = async () => {
  if (isTestEnv) {
    return null;
  }

  if (!useAuthStore.getState().authToken) {
    return null;
  }

  try {
    if (Platform.OS === 'android' && typeof Notifications?.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22C55E',
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermission?.status;

    if (finalStatus !== 'granted') {
      const requestedPermission = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermission?.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = resolveExpoProjectId();
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenResponse?.data || null;

    if (!expoPushToken) {
      return null;
    }

    const registrationCacheKey = getRegistrationCacheKey();
    const alreadyRegisteredToken = await AsyncStorage.getItem(registrationCacheKey);
    if (alreadyRegisteredToken === expoPushToken) {
      return expoPushToken;
    }

    await api.post('/notifications/push-token', {
      token: expoPushToken,
      platform: Platform.OS,
    });

    await AsyncStorage.setItem(DEVICE_PUSH_TOKEN_STORAGE_KEY, expoPushToken);
    await AsyncStorage.setItem(registrationCacheKey, expoPushToken);

    return expoPushToken;
  } catch (error) {
    console.warn('[PushNotificationService] Failed to register Expo push token:', error?.message || error);
    return null;
  }
};

export const unregisterCurrentDevicePushToken = async () => {
  if (isTestEnv) {
    return;
  }

  try {
    const registrationCacheKey = getRegistrationCacheKey();
    const storedToken = await AsyncStorage.getItem(DEVICE_PUSH_TOKEN_STORAGE_KEY);
    if (!storedToken) {
      await AsyncStorage.removeItem(registrationCacheKey);
      return;
    }

    if (!useAuthStore.getState().authToken) {
      await AsyncStorage.removeItem(DEVICE_PUSH_TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(registrationCacheKey);
      return;
    }

    await api.delete('/notifications/push-token', {
      data: {
        token: storedToken,
      },
    });

    await AsyncStorage.removeItem(DEVICE_PUSH_TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(registrationCacheKey);
  } catch (error) {
    console.warn('[PushNotificationService] Failed to unregister Expo push token:', error?.message || error);
  }
};

export const sendOneDayExtensionReminder = async ({ bookingId, propertyTitle, endDate }) => {
  if (isTestEnv || !bookingId) {
    return false;
  }

  try {
    if (!useAuthStore.getState().authToken) {
      return false;
    }

    const permission = await Notifications.getPermissionsAsync();
    if (permission?.status !== 'granted') {
      return false;
    }

    const userId = useAuthStore.getState().userId ?? 'unknown';
    const normalizedEndDate = String(endDate || 'unknown');
    const cacheKey = `${EXTENSION_REMINDER_PREFIX}:${userId}:${bookingId}:${normalizedEndDate}`;
    const alreadySent = await AsyncStorage.getItem(cacheKey);
    if (alreadySent === '1') {
      return false;
    }

    const safePropertyTitle = String(propertyTitle || '').trim();
    const body = safePropertyTitle
      ? `Your stay at ${safePropertyTitle} ends tomorrow. Tap Extend in My Bookings if you want to continue.`
      : 'Your stay ends tomorrow. Tap Extend in My Bookings if you want to continue.';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Extension Reminder',
        body,
        sound: 'default',
        data: {
          type: 'extension_one_day_reminder',
          booking_id: bookingId,
          end_date: normalizedEndDate,
        },
      },
      trigger: null,
    });

    await AsyncStorage.setItem(cacheKey, '1');
    return true;
  } catch (error) {
    console.warn('[PushNotificationService] Failed to send one-day extension reminder:', error?.message || error);
    return false;
  }
};
