import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const AUTH_STORAGE_KEY = 'auth_session';
const SECURE_STORE_MAX_BYTES = 1900;

const getByteLength = (value) => {
  if (typeof value !== 'string') return 0;

  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }

  return value.length;
};

const secureStoreStorage = {
  getItem: async (name) => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (!isAvailable) return null;

      return await SecureStore.getItemAsync(name);
    } catch (error) {
      console.warn('[authStore] Failed to read SecureStore key:', name, error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (!isAvailable) return;

      if (getByteLength(value) > SECURE_STORE_MAX_BYTES) {
        console.warn('[authStore] SecureStore payload is too large, skipping persist.');
        return;
      }

      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.warn('[authStore] Failed to write SecureStore key:', name, error);
    }
  },
  removeItem: async (name) => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (!isAvailable) return;

      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.warn('[authStore] Failed to remove SecureStore key:', name, error);
    }
  },
};

const INITIAL_AUTH_STATE = {
  authToken: null,
  refreshToken: null,
  userId: null,
  biometricEnabled: false,
  activeRole: null,
  isAuthenticated: false,
};

export const useAuthStore = create(
  persist(
    (set) => ({
      ...INITIAL_AUTH_STATE,
      hasHydrated: false,

      setHydrated: (value) => set({ hasHydrated: Boolean(value) }),

      setAuthSession: ({ authToken, refreshToken = null, userId = null, activeRole = null }) => {
        const nextToken = authToken || null;

        set({
          authToken: nextToken,
          refreshToken: refreshToken || null,
          userId: userId ?? null,
          activeRole: activeRole || null,
          isAuthenticated: Boolean(nextToken),
        });
      },

      clearAuthSession: () =>
        set((state) => ({
          ...INITIAL_AUTH_STATE,
          biometricEnabled: state.biometricEnabled,
          hasHydrated: state.hasHydrated,
        })),

      setActiveRole: (activeRole) => set({ activeRole: activeRole || null }),

      setBiometricEnabled: (enabled) =>
        set({
          biometricEnabled: Boolean(enabled),
        }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => secureStoreStorage),
      partialize: (state) => ({
        authToken: state.authToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        biometricEnabled: state.biometricEnabled,
        activeRole: state.activeRole,
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }

        const mergedState = {
          ...currentState,
          ...persistedState,
        };

        return {
          ...mergedState,
          isAuthenticated: Boolean(mergedState.authToken),
        };
      },
      onRehydrateStorage: (state) => {
        return (hydratedState, error) => {
          if (error) {
            console.warn('[authStore] Failed to hydrate auth store:', error);
          }
          
          const targetState = hydratedState || state;
          if (targetState?.setHydrated) {
            targetState.setHydrated(true);
          }
        };
      },
    },
  ),
);
