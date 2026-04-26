import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api.js';

export const tenantQueryKeys = {
  dashboardCurrentStay: () => ['tenantDashboardCurrentStay'],
  dashboardBundle: () => ['tenantDashboardBundle'],
  counters: () => ['userCounters'],
  dashboardStats: () => ['tenantDashboardStats'],
  dashboardActivities: () => ['tenantDashboardActivities'],
  dashboardUpcoming: () => ['tenantDashboardUpcoming'],
  dashboardPaymentBreakdown: (months = 6) => ['tenantDashboardPaymentBreakdown', months],
  payments: (statusFilter = 'all') => ['tenantPayments', statusFilter],
  paymentStats: () => ['tenantPaymentStats'],
  paymentHistory: () => ['tenantPaymentHistory'],
  paymentsCurrentUserId: () => ['tenantPaymentsCurrentUserId'],
  paymentDetail: (invoiceId) => ['tenantPaymentDetail', invoiceId],
  bookingDetails: (bookingId) => ['tenantBookingDetails', bookingId],
  profilePage: () => ['tenantProfilePage'],
  notificationsFeed: () => ['tenantNotificationsFeed'],
  messagesConversations: () => ['tenantMessagesConversations'],
  messagesConversation: (conversationId) => ['tenantMessagesConversation', conversationId],
  messagesCurrentUserId: () => ['tenantMessagesCurrentUserId'],
  exploreProperties: ({ type = 'All', advancedFilters = {} } = {}) => [
    'tenantExploreProperties',
    type,
    advancedFilters,
  ],
  explorePropertyDetails: (propertyId, landlordPreview = false) => [
    'tenantExplorePropertyDetails',
    propertyId,
    landlordPreview,
  ],
  explorePropertyReviews: (propertyId) => ['tenantExplorePropertyReviews', propertyId],
  explorePropertyStats: (propertyId, userId = null) => [
    'tenantExplorePropertyStats',
    propertyId,
    userId,
  ],
  explorePropertySnapshot: (propertyId) => ['tenantExplorePropertySnapshot', propertyId],
  explorePropertyRooms: (propertyId) => ['tenantExplorePropertyRooms', propertyId],
  exploreRoomPaymentOptions: (roomId) => ['tenantExploreRoomPaymentOptions', roomId],
  exploreRoomPricing: ({ roomId, startDate = null, endDate = null, contractMode = 'monthly' } = {}) => [
    'tenantExploreRoomPricing',
    roomId,
    startDate,
    endDate,
    contractMode,
  ],
  myBookingsBundle: () => ['tenantMyBookingsBundle'],
  settingsBundle: () => ['tenantSettingsBundle'],
  notificationPreferences: () => ['tenantNotificationPreferences'],
  lifestylePreferences: () => ['tenantLifestylePreferences'],
  maintenanceRequests: () => ['tenantMaintenanceRequests'],
  transferRequests: () => ['tenantTransferRequests'],
  myReviews: () => ['tenantMyReviews'],
  addonsBundle: ({ bookingId = null, propertyId = null } = {}) => ['tenantAddonsBundle', bookingId, propertyId],
};

export const refetchTenantQueries = async (refetchers = []) => {
  if (!Array.isArray(refetchers)) return;
  
  const tasks = refetchers
    .filter((refetch) => typeof refetch === 'function')
    .map((refetch) => refetch());

  await Promise.all(tasks);
};

export const useTenantFocusRefetch = ({ enabled = true, refetchers = [] }) => {
  // DISABLING AGGRESSIVE FOCUS REFETCHING:
  // The app now uses global WebSockets (Echo) via useRealTimeSync.
  // Data is automatically invalidated when it changes on the server.
  // Forcing a refetch on every tab switch causes massive CPU spikes (1,000+ unnecessary API calls/min).
  // Manual Pull-to-Refresh remains fully functional.
  useFocusEffect(
    useCallback(() => {
      // Intentionally left blank to protect server CPU.
    }, []),
  );
};

export const useTenantRefreshHandler = ({ enabled = true, setRefreshing, refetchers = [] }) =>
  useCallback(async () => {
    if (!enabled) return;

    setRefreshing?.(true);
    try {
      await refetchTenantQueries(refetchers);
    } finally {
      setRefreshing?.(false);
    }
  }, [enabled, setRefreshing, refetchers]);

/**
 * Hook to fetch consolidated unread/pending counters
 */
export const useUserCounters = (enabled = true) => {
  return useQuery({
    queryKey: tenantQueryKeys.counters(),
    queryFn: async () => {
      const res = await api.get('/counters');
      return res.data?.data || {
        messages: 0,
        notifications: 0,
        maintenance: 0,
        addons: 0,
        payments: 0
      };
    },
    enabled,
    staleTime: 30 * 1000,
  });
};
