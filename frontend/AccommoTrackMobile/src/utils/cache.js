import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Simple client-side cache utility using AsyncStorage for Mobile
 */
const DEFAULT_TTL = 1000 * 30; // 30 seconds

export const cacheManager = {
  /**
   * Get data from cache
   * @param {string} key 
   * @returns {Promise<any|null>} returns null if expired or missing
   */
  async get(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const { data, timestamp, ttl } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > (ttl || DEFAULT_TTL);

      if (isExpired) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return data;
    } catch (e) {
      console.warn(`Cache read error for ${key}:`, e);
      return null;
    }
  },

  /**
   * Set data to cache
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttl - Time to live in milliseconds
   */
  async set(key, data, ttl = DEFAULT_TTL) {
    try {
      const payload = {
        data,
        timestamp: Date.now(),
        ttl
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(payload));
    } catch (e) {
      console.warn(`Cache write error for ${key}:`, e);
    }
  },

  /**
   * Clear a specific cache key
   * @param {string} key 
   */
  async invalidate(key) {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (e) {
      console.warn(`Cache invalidate error for ${key}:`, e);
    }
  },

  /**
   * Clear all app-related caches
   */
  async clearAll() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('cache_'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (e) {
      console.warn('Cache clearAll error:', e);
    }
  }
};

export default cacheManager;
