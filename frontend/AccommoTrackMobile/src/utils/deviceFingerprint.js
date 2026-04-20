import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEVICE_FINGERPRINT_STORAGE_KEY = 'device_fingerprint';

const createDeviceFingerprint = () => {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateDeviceFingerprint = async () => {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_FINGERPRINT_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated = createDeviceFingerprint();
    await AsyncStorage.setItem(DEVICE_FINGERPRINT_STORAGE_KEY, generated);

    return generated;
  } catch {
    return null;
  }
};
