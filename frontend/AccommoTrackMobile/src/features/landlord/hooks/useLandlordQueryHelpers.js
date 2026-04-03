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
  maintenanceRequests: (statusFilter = 'all') => ['landlordMaintenanceRequests', statusFilter],
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
  transferRequests: () => ['landlordTransferRequests'],
  reviews: () => ['landlordReviews'],
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
  propertyAddons: (propertyId) => ['landlordPropertyAddons', propertyId],
  addonPendingRequests: (propertyId) => ['landlordAddonPendingRequests', propertyId],
  addonActiveAddons: (propertyId) => ['landlordAddonActiveAddons', propertyId],
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
