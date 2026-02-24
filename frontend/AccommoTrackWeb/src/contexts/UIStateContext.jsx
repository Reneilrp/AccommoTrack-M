import React, { createContext, useContext, useState, useEffect } from 'react';

const UIStateContext = createContext();

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
    const saved = sessionStorage.getItem('ui_state');
    if (!saved) return INITIAL_STATE;

    try {
      const parsed = JSON.parse(saved);
      // Shallow merge to ensure new top-level keys like 'data' exist
      return {
        ...INITIAL_STATE,
        ...parsed,
        // Deep merge specific screens if necessary, but at minimum ensure 'data' exists
        data: {
          ...INITIAL_STATE.data,
          ...(parsed.data || {})
        }
      };
    } catch (e) {
      return INITIAL_STATE;
    }
  });

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('ui_state', JSON.stringify(uiState));
  }, [uiState]);

  /**
   * Update state for a specific screen
   * @param {string} screen - 'explore', 'bookings', or 'wallet'
   * @param {object} newState - partial state to merge
   */
  const updateScreenState = (screen, newState) => {
    setUIState(prev => ({
      ...prev,
      [screen]: {
        ...prev[screen],
        ...newState
      }
    }));
  };

  /**
   * Update data for a specific bucket
   * @param {string} bucket - 'dashboard', 'bookings', or 'wallet'
   * @param {any} data 
   */
  const updateData = (bucket, data) => {
    setUIState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [bucket]: data
      }
    }));
  };

  /**
   * Reset a specific screen's UI state to initial values
   * @param {string} screen 
   */
  const resetScreenState = (screen) => {
    setUIState(prev => ({
      ...prev,
      [screen]: INITIAL_STATE[screen]
    }));
  };

  return (
    <UIStateContext.Provider value={{ uiState, updateScreenState, updateData, resetScreenState }}>
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
