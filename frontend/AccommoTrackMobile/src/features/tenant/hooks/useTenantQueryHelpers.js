import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export const tenantQueryKeys = {
  dashboardCurrentStay: () => ['tenantDashboardCurrentStay'],
  dashboardBundle: () => ['tenantDashboardBundle'],
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
  const tasks = refetchers
    .filter((refetch) => typeof refetch === 'function')
    .map((refetch) => refetch());

  await Promise.all(tasks);
};

export const useTenantFocusRefetch = ({ enabled = true, refetchers = [] }) => {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      refetchTenantQueries(refetchers);
    }, [enabled, refetchers]),
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
