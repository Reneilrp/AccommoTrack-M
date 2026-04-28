import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { 
  registerDevicePushToken, 
  unregisterCurrentDevicePushToken, 
  sendOneDayExtensionReminder 
} from '../../services/PushNotificationService.js';
import api from '../../services/api.js';
import { useAuthStore } from '../../stores/auth/authStore.js';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { MAX: 4 },
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
}));

jest.mock('../../services/api.js', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    delete: jest.fn(),
  },
  normalizeResponse: jest.fn((res) => ({ success: true, data: res.data, error: null })),
  normalizeError: jest.fn((err) => ({ success: false, data: null, error: err.message })),
}));

describe('PushNotificationService', () => {
  const mockAuthToken = 'mock-token';
  const mockUserId = 'user-123';
  const mockExpoPushToken = 'ExponentPushToken[mock]';

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ authToken: mockAuthToken, userId: mockUserId });
  });

  describe('registerDevicePushToken', () => {
    it('returns error if not authenticated', async () => {
      useAuthStore.setState({ authToken: null });
      const result = await registerDevicePushToken();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('successfully registers a new token', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: mockExpoPushToken });
      AsyncStorage.getItem.mockResolvedValue(null);
      api.post.mockResolvedValue({ data: { success: true } });

      const result = await registerDevicePushToken();

      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project-id' });
      expect(api.post).toHaveBeenCalledWith('/notifications/push-token', expect.objectContaining({
        token: mockExpoPushToken,
      }));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('device_push_token', mockExpoPushToken);
      expect(result.success).toBe(true);
      expect(result.data).toBe(mockExpoPushToken);
    });

    it('skips registration if token already cached', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: mockExpoPushToken });
      AsyncStorage.getItem.mockResolvedValue(mockExpoPushToken);

      const result = await registerDevicePushToken();

      expect(api.post).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('requests permission if not already granted', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: mockExpoPushToken });
      api.post.mockResolvedValue({ data: { success: true } });

      await registerDevicePushToken();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns error if permission is denied', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await registerDevicePushToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission not granted');
    });
  });

  describe('unregisterCurrentDevicePushToken', () => {
    it('successfully unregisters stored token', async () => {
      AsyncStorage.getItem.mockResolvedValue(mockExpoPushToken);
      api.delete.mockResolvedValue({ data: { success: true } });

      const result = await unregisterCurrentDevicePushToken();

      expect(api.delete).toHaveBeenCalledWith('/notifications/push-token', expect.objectContaining({
        data: { token: mockExpoPushToken }
      }));
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('device_push_token');
      expect(result.success).toBe(true);
    });

    it('returns success even if no token stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await unregisterCurrentDevicePushToken();
      expect(result.success).toBe(true);
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('sendOneDayExtensionReminder', () => {
    const bookingParams = {
      bookingId: 'booking-456',
      propertyTitle: 'Test Property',
      endDate: '2026-05-01'
    };

    it('schedules notification if not already sent', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await sendOneDayExtensionReminder(bookingParams);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.objectContaining({
          title: 'Extension Reminder',
          body: expect.stringContaining('Test Property'),
        })
      }));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.stringContaining('booking-456'), '1');
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('skips scheduling if already sent for this booking/date', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      AsyncStorage.getItem.mockResolvedValue('1');

      const result = await sendOneDayExtensionReminder(bookingParams);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('returns error if bookingId is missing', async () => {
      const result = await sendOneDayExtensionReminder({ bookingId: null });
      expect(result.success).toBe(false);
    });
  });
});
