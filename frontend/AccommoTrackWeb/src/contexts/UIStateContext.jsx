import React, { createContext, useContext, useState, useEffect } from 'react';

const UIStateContext = createContext();
const UI_STATE_STORAGE_KEY = 'ui_state';
const DATA_BUCKET_TTL_MS = 60 * 1000;

const isBucketFresh = (updatedAt) => {
  if (!updatedAt || !Number.isFinite(updatedAt)) return false;
  return Date.now() - updatedAt <= DATA_BUCKET_TTL_MS;
};

const INITIAL_STATE = {
  explore: {
    search: "",
    selectedType: "All",
    currentPage: 1,
    showMapModal: false
  },
  bookings: {
    activeTab: "current"
  },
  wallet: {
    searchQuery: "",
    statusFilter: "all",
    timeRange: "1m"
  },
  messages: {
    searchQuery: "",
    showFilters: false,
    filterProperty: ""
  },
  // Timestamps for data buckets persisted in sessionStorage.
  dataMeta: {},
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
    landlord_dorm_profiles: {}, // Store by propertyId
    landlord_property_view: 'list' // 'list', 'add'
  }
};

export const UIStateProvider = ({ children }) => {
  const [uiState, setUIState] = useState(() => {
    // Attempt to restore from sessionStorage for tab-session persistence
    const saved = sessionStorage.getItem(UI_STATE_STORAGE_KEY);
    if (!saved) return INITIAL_STATE;

    try {
      const parsed = JSON.parse(saved);
      const parsedData = parsed.data || {};
      const parsedDataMeta = parsed.dataMeta || {};

      const restoredData = { ...INITIAL_STATE.data };
      const restoredDataMeta = {};

      Object.keys(parsedData).forEach((bucket) => {
        const updatedAt = Number(parsedDataMeta[bucket]);
        if (!isBucketFresh(updatedAt)) {
          return;
        }

        restoredData[bucket] = parsedData[bucket];
        restoredDataMeta[bucket] = updatedAt;
      });

      // Shallow merge to ensure new top-level keys like 'data' exist
      return {
        ...INITIAL_STATE,
        ...parsed,
        dataMeta: restoredDataMeta,
        // Deep merge specific screens if necessary, but at minimum ensure 'data' exists
        data: restoredData
      };
    } catch (__e) {
      return INITIAL_STATE;
    }
  });

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(uiState));
  }, [uiState]);

  /**
   * Update state for a specific screen
   * @param {string} screen - 'explore', 'bookings', or 'wallet'
   * @param {object} newState - partial state to merge
   */
  const updateScreenState = React.useCallback((screen, newState) => {
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
   * @param {string} bucket - 'dashboard', 'bookings', or 'wallet'
   * @param {any} data 
   */
  const updateData = React.useCallback((bucket, data) => {
    setUIState(prev => {
      const currentBucketData = prev.data ? prev.data[bucket] : null;
      const newData = typeof data === 'function' ? data(currentBucketData) : data;
      return {
        ...prev,
        dataMeta: {
          ...prev.dataMeta,
          [bucket]: Date.now()
        },
        data: {
          ...prev.data,
          [bucket]: newData
        }
      };
    });
  }, []);

  /**
   * Invalidate one or more cached data buckets.
   * @param {string|string[]} buckets
   */
  const invalidateData = React.useCallback((buckets) => {
    const bucketList = Array.isArray(buckets) ? buckets : [buckets];
    setUIState(prev => {
      const nextData = { ...prev.data };
      const nextDataMeta = { ...prev.dataMeta };
      bucketList.forEach((bucket) => {
        if (Object.prototype.hasOwnProperty.call(nextData, bucket)) {
          nextData[bucket] = null;
        }
        delete nextDataMeta[bucket];
      });

      return {
        ...prev,
        dataMeta: nextDataMeta,
        data: nextData
      };
    });
  }, []);

  /**
   * Reset a specific screen's UI state to initial values
   * @param {string} screen 
   */
  const resetScreenState = React.useCallback((screen) => {
    setUIState(prev => ({
      ...prev,
      [screen]: INITIAL_STATE[screen]
    }));
  }, []);

  return (
    <UIStateContext.Provider value={{ uiState, updateScreenState, updateData, invalidateData, resetScreenState }}>
      {children}
    </UIStateContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};
