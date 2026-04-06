import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export const landlordQueryKeys = {
  properties: () => ['landlordProperties'],
  tenants: () => ['landlordTenants'],
  tenantsByProperty: (propertyId) => ['landlordTenantsByProperty', propertyId],
  roomsByProperty: (propertyId) => ['landlordRoomsByProperty', propertyId],
  roomStatsByProperty: (propertyId) => ['landlordRoomStatsByProperty', propertyId],
  bookings: () => ['landlordBookings'],
  bookingStats: () => ['landlordBookingStats'],
  extensionRequests: () => ['landlordExtensionRequests'],
  maintenanceRequestsRoot: () => ['landlordMaintenanceRequests'],
  maintenanceRequests: (options = 'all') => {
    if (typeof options === 'object' && options !== null) {
      const { statusFilter = 'all', propertyScope = 'all' } = options;
      return ['landlordMaintenanceRequests', statusFilter, propertyScope];
    }
    return ['landlordMaintenanceRequests', options, 'all'];
  },
  dashboardBundle: () => ['landlordDashboardBundle'],
  unreadNotificationCount: () => ['landlordUnreadNotificationCount'],
  pendingTransferCount: () => ['landlordPendingTransferCount'],
  propertyActivityLogs: (propertyId) => ['landlordPropertyActivityLogs', propertyId],
  propertySummary: (propertyId) => ['landlordPropertySummary', propertyId],
  propertySettings: (propertyId) => ['landlordPropertySettings', propertyId],
  propertyPaymentSettings: () => ['landlordPropertyPaymentSettings'],
  propertySummaryActivity: (propertyId) => ['landlordPropertySummaryActivity', propertyId],
  tenantDetails: (tenantId) => ['landlordTenantDetails', tenantId],
  tenantInvoices: (tenantId) => ['landlordTenantInvoices', tenantId],
  transferRequests: (options = {}) => {
    if (typeof options === 'object' && options !== null) {
      const { propertyScope = 'all' } = options;
      return ['landlordTransferRequests', propertyScope];
    }
    return ['landlordTransferRequests', options || 'all'];
  },
  reviews: (propertyScope = 'all') => ['landlordReviews', propertyScope],
  notifications: () => ['landlordNotifications'],
  messagesConversations: () => ['landlordMessagesConversations'],
  messagesConversation: (conversationId) => ['landlordMessagesConversation', conversationId],
  messagesCurrentUserId: () => ['landlordMessagesCurrentUserId'],
  settingsHub: () => ['landlordSettingsHub'],
  manualPaymentSettings: () => ['landlordManualPaymentSettings'],
  addPropertyVerification: () => ['landlordAddPropertyVerification'],
  verificationStatusBundle: () => ['landlordVerificationStatusBundle'],
  myProfile: () => ['landlordMyProfile'],
  caretakersBundle: () => ['landlordCaretakersBundle'],
  invoices: () => ['landlordInvoices'],
  invoiceSummary: (range = 'month') => ['landlordInvoiceSummary', range],
  propertyAddons: (options = 'all') => {
    if (typeof options === 'object' && options !== null) {
      const { propertyScope = 'all', propertyIdsKey = 'none' } = options;
      return ['landlordPropertyAddons', propertyScope, propertyIdsKey];
    }
    return ['landlordPropertyAddons', options, 'none'];
  },
  addonPendingRequests: (options = 'all') => {
    if (typeof options === 'object' && options !== null) {
      const { propertyScope = 'all', propertyIdsKey = 'none' } = options;
      return ['landlordAddonPendingRequests', propertyScope, propertyIdsKey];
    }
    return ['landlordAddonPendingRequests', options, 'none'];
  },
  addonActiveAddons: (options = 'all') => {
    if (typeof options === 'object' && options !== null) {
      const { propertyScope = 'all', propertyIdsKey = 'none' } = options;
      return ['landlordAddonActiveAddons', propertyScope, propertyIdsKey];
    }
    return ['landlordAddonActiveAddons', options, 'none'];
  },
  analyticsProperties: () => ['landlordAnalyticsProperties'],
  analyticsDashboard: ({ propertyId = 'all', timeRange = 'month' } = {}) => [
    'landlordAnalyticsDashboard',
    propertyId,
    timeRange,
  ],
};

export const refetchLandlordQueries = async (refetchers = []) => {
  const tasks = refetchers
    .filter((refetch) => typeof refetch === 'function')
    .map((refetch) => refetch());

  await Promise.all(tasks);
};

export const useLandlordFocusRefetch = ({ enabled = true, refetchers = [] }) => {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      refetchLandlordQueries(refetchers);
    }, [enabled, refetchers]),
  );
};

export const useLandlordRefreshHandler = ({ enabled = true, setRefreshing, refetchers = [] }) =>
  useCallback(async () => {
    if (!enabled) return;

    setRefreshing?.(true);
    try {
      await refetchLandlordQueries(refetchers);
    } finally {
      setRefreshing?.(false);
    }
  }, [enabled, setRefreshing, refetchers]);
