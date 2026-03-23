import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const UIStateProvider = ({ children }) => {
  const [uiState, setUIState] = useState(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUIState({
            ...INITIAL_STATE,
            ...parsed,
            data: {
              ...INITIAL_STATE.data,
              ...(parsed.data || {})
            }
          });
        }
      } catch (e) {
        console.warn('Failed to load UI state:', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadState();
  }, []);

  // Persist state to AsyncStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uiState)).catch(e => {
        console.warn('Failed to save UI state:', e);
      });
    }
  }, [uiState, isLoaded]);

  /**
   * Update state for a specific screen
   * @param {string} screen - e.g., 'explore', 'bookings'
   * @param {object} newState - partial state to merge
   */
  const updateScreenState = useCallback((screen, newState) => {
    setUIState(prev => ({
      ...prev,
      [screen]: {
        ...prev[screen],
        ...newState
      }
    }));
  }, []);

  /**
   * Update data for a specific bucket
   * @param {string} bucket 
   * @param {any} data 
   */
  const updateData = useCallback((bucket, data) => {
    setUIState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [bucket]: data
      }
    }));
  }, []);

  /**
   * Invalidate one or more cached data buckets.
   * @param {string|string[]} buckets
   */
  const invalidateData = useCallback((buckets) => {
    const bucketList = Array.isArray(buckets) ? buckets : [buckets];
    setUIState(prev => {
      const nextData = { ...prev.data };
      bucketList.forEach((bucket) => {
        if (Object.prototype.hasOwnProperty.call(nextData, bucket)) {
          nextData[bucket] = null;
        }
      });

      return {
        ...prev,
        data: nextData
      };
    });
  }, []);

  /**
   * Reset a specific screen's UI state to initial values
   * @param {string} screen 
   */
  const resetScreenState = useCallback((screen) => {
    setUIState(prev => ({
      ...prev,
      [screen]: INITIAL_STATE[screen]
    }));
  }, []);

  return (
    <UIStateContext.Provider value={{ uiState, isLoaded, updateScreenState, updateData, invalidateData, resetScreenState }}>
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
