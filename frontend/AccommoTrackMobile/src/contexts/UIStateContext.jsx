import React, { createContext, useContext, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const UIStateContext = createContext();

const STORAGE_KEY = 'ui_state';

const INITIAL_STATE = {
  explore: {
    search: "",
    selectedType: "All",
    selectedGender: "All",
    selectedCurfew: null
  },
  bookings: {
    activeTab: "current"
  },
  wallet: {
    searchQuery: "",
    statusFilter: "all",
  },
  messages: {
    searchQuery: "",
  },
  alert: {
    visible: false,
    title: "",
    message: "",
    buttons: [],
    options: {}
  },
  // Data buckets for instant UI mounting
  data: {
    dashboard: null,
    bookings: null,
    wallet: null,
    messages: null,
    profile: null,
    // Landlord Data Buckets
    landlord_dashboard: null,
    landlord_properties: null,
    landlord_bookings: null,
    landlord_payments: null,
    landlord_analytics: null,
    landlord_settings: null,
    landlord_property_details: {}, // Store by propertyId
    landlord_rooms: null,
    landlord_tenants: null,
  }
};

const mergeUIState = (persistedUIState = {}) => ({
  ...INITIAL_STATE,
  ...persistedUIState,
  // Alerts are transient UI and should never be restored from persisted state.
  alert: {
    ...INITIAL_STATE.alert,
  },
  data: {
    ...INITIAL_STATE.data,
    ...(persistedUIState.data || {}),
  },
});

const cloneStateSlice = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  return { ...value };
};

export const useUIStateStore = create(
  persist(
    (set) => ({
      uiState: INITIAL_STATE,
      hasHydrated: false,

      setHydrated: (value) => set({ hasHydrated: Boolean(value) }),

      updateScreenState: (screen, newState) =>
        set((state) => ({
          uiState: {
            ...state.uiState,
            [screen]: {
              ...state.uiState[screen],
              ...newState,
            },
          },
        })),

      updateData: (bucket, data) =>
        set((state) => ({
          uiState: {
            ...state.uiState,
            data: {
              ...state.uiState.data,
              [bucket]: data,
            },
          },
        })),

      invalidateData: (buckets) =>
        set((state) => {
          const bucketList = Array.isArray(buckets) ? buckets : [buckets];
          const nextData = { ...state.uiState.data };

          bucketList.forEach((bucket) => {
            if (Object.prototype.hasOwnProperty.call(nextData, bucket)) {
              nextData[bucket] = null;
            }
          });

          return {
            uiState: {
              ...state.uiState,
              data: nextData,
            },
          };
        }),

      resetScreenState: (screen) =>
        set((state) => {
          if (!Object.prototype.hasOwnProperty.call(INITIAL_STATE, screen)) {
            return state;
          }

          return {
            uiState: {
              ...state.uiState,
              [screen]: cloneStateSlice(INITIAL_STATE[screen]),
            },
          };
        }),

      showAlert: (title, message, buttons = [], options = {}) =>
        set((state) => ({
          uiState: {
            ...state.uiState,
            alert: {
              visible: true,
              title,
              message,
              buttons,
              options
            }
          }
        })),

      hideAlert: () =>
        set((state) => ({
          uiState: {
            ...state.uiState,
            alert: {
              ...state.uiState.alert,
              visible: false
            }
          }
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        uiState: {
          ...state.uiState,
          alert: {
            ...INITIAL_STATE.alert,
          },
        },
      }),
      merge: (persistedState, currentState) => {
        const persistedUIState =
          persistedState && typeof persistedState === 'object'
            ? persistedState.uiState
            : null;

        return {
          ...currentState,
          uiState: mergeUIState(persistedUIState || {}),
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Failed to load UI state:', error);
        }

        state?.setHydrated(true);
      },
    },
  ),
);

export const UIStateProvider = ({ children }) => {
  const uiState = useUIStateStore((state) => state.uiState);
  const hasHydrated = useUIStateStore((state) => state.hasHydrated);
  const updateScreenState = useUIStateStore((state) => state.updateScreenState);
  const updateData = useUIStateStore((state) => state.updateData);
  const invalidateData = useUIStateStore((state) => state.invalidateData);
  const resetScreenState = useUIStateStore((state) => state.resetScreenState);
  const showAlert = useUIStateStore((state) => state.showAlert);
  const hideAlert = useUIStateStore((state) => state.hideAlert);

  const value = useMemo(
    () => ({
      uiState,
      isLoaded: hasHydrated,
      updateScreenState,
      updateData,
      invalidateData,
      resetScreenState,
      showAlert,
      hideAlert,
    }),
    [uiState, hasHydrated, updateScreenState, updateData, invalidateData, resetScreenState, showAlert, hideAlert],
  );

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};
