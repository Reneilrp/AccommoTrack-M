/**
 * Simple client-side cache utility using LocalStorage
 */
const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

export const cacheManager = {
  /**
   * Get data from cache
   * @param {string} key 
   * @returns {any|null} returns null if expired or missing
   */
  get(key) {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const { data, timestamp, ttl } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > (ttl || DEFAULT_TTL);

      if (isExpired) {
        localStorage.removeItem(`cache_${key}`);
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
  set(key, data, ttl = DEFAULT_TTL) {
    try {
      const payload = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(payload));
    } catch (e) {
      console.warn(`Cache write error for ${key}:`, e);
    }
  },

  /**
   * Clear a specific cache key
   * @param {string} key 
   */
  invalidate(key) {
    localStorage.removeItem(`cache_${key}`);
  },

  /**
   * Clear all app-related caches
   */
  clearAll() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};
