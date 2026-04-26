import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Centered Query Keys for Landlord Module
 */
export const landlordQueryKeys = {
  dashboardStats: () => ['landlordDashboardStats'],
  counters: () => ['userCounters'],
  activities: () => ['landlordActivities'],
  upcomingPayments: () => ['landlordUpcomingPayments'],
  verificationStatus: () => ['landlordVerificationStatus'],
  properties: (params = {}) => ['landlordProperties', params],
  tenants: (params = {}) => ['landlordTenants', params],
  bookings: (params = {}) => ['landlordBookings', params],
  analytics: (params = {}) => ['landlordAnalytics', params],
  propertySummary: (propertyId) => ['landlordPropertySummary', propertyId],
};

/**
 * Consolidated Property Summary Data (Optimized Bundle)
 */
export const useLandlordPropertySummary = (propertyId) => {
  return useQuery({
    queryKey: landlordQueryKeys.propertySummary(propertyId),
    queryFn: async () => {
      if (!propertyId) return null;
      
      const [bookingsRes, invoicesRes, addonRequestsRes, maintenanceRes, transfersRes, reviewsRes, roomsRes] = await Promise.allSettled([
        api.get(`/bookings?property_id=${propertyId}&status=pending`),
        api.get(`/invoices?property_id=${propertyId}&status=overdue`),
        api.get(`/landlord/properties/${propertyId}/addons/pending`),
        api.get(`/landlord/maintenance-requests?property_id=${propertyId}&status=pending`),
        api.get(`/landlord/transfers?property_id=${propertyId}&status=pending`),
        api.get(`/landlord/reviews?property_id=${propertyId}&limit=3`),
        api.get(`/rooms/property/${propertyId}`),
      ]);

      const get = (res) => {
        if (res.status !== 'fulfilled') return [];
        const payload = res.value?.data;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
      };

      const rooms = get(roomsRes);
      const totalRooms = rooms.length;
      
      // Local helper to resolve status (mirroring UI logic)
      const occupiedRooms = rooms.filter((room) => {
        const slots = Number(room.available_slots ?? room.availableSlots ?? 0);
        return slots <= 0;
      }).length;

      const pendingAddonRequests = addonRequestsRes.status === 'fulfilled'
        ? (addonRequestsRes.value?.data?.pendingRequests || [])
        : [];

      return {
        pendingBookings: get(bookingsRes),
        overdueInvoices: (invoicesRes.status === 'fulfilled' ? invoicesRes.value?.data?.data : []) || [],
        pendingAddonRequests,
        maintenanceRequests: (maintenanceRes.status === 'fulfilled' ? maintenanceRes.value?.data?.data : []) || [],
        transferRequests: get(transfersRes),
        recentReviews: get(reviewsRes),
        occupiedRooms,
        totalRooms,
      };
    },
    enabled: !!propertyId,
    staleTime: 60 * 1000,
  });
};

/**
 * Consolidated Dashboard Data Fetching (Optimized Bundle)
 */
export const useLandlordDashboardBundle = () => {
  return useQuery({
    queryKey: ['landlordDashboardBundle'],
    queryFn: async () => {
      const [statsRes, activitiesRes, paymentsRes] = await Promise.all([
        api.get('/landlord/dashboard/stats'),
        api.get('/landlord/dashboard/recent-activities'),
        api.get('/landlord/dashboard/upcoming-payments')
      ]);

      return {
        stats: statsRes.data,
        activities: activitiesRes.data,
        upcomingPayments: paymentsRes.data
      };
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch Landlord Dashboard Stats
 */
export const useLandlordStats = () => {
  return useQuery({
    queryKey: landlordQueryKeys.dashboardStats(),
    queryFn: async () => {
      const res = await api.get('/landlord/dashboard/stats');
      return res.data;
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch Recent Activities
 */
export const useLandlordActivities = () => {
  return useQuery({
    queryKey: landlordQueryKeys.activities(),
    queryFn: async () => {
      const res = await api.get('/landlord/dashboard/recent-activities');
      return res.data;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch Upcoming Payments / Dashboard Alerts
 */
export const useLandlordUpcomingPayments = () => {
  return useQuery({
    queryKey: landlordQueryKeys.upcomingPayments(),
    queryFn: async () => {
      const res = await api.get('/landlord/dashboard/upcoming-payments');
      return res.data;
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch Landlord Verification Status
 */
export const useLandlordVerificationStatus = (isCaretaker = false) => {
  return useQuery({
    queryKey: landlordQueryKeys.verificationStatus(),
    queryFn: async () => {
      if (isCaretaker) return null;
      try {
        const res = await api.get('/landlord/my-verification');
        return res.data;
      } catch (err) {
        if (err.response?.status === 404) {
          return { status: 'not_submitted' };
        }
        throw err;
      }
    },
    enabled: !isCaretaker,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch Landlord Properties
 */
export const useLandlordProperties = (params = {}) => {
  return useQuery({
    queryKey: landlordQueryKeys.properties(params),
    queryFn: async () => {
      const res = await api.get('/landlord/properties', { params });
      return res.data?.data || res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch consolidated unread/pending counters
 */
export const useUserCounters = (enabled = true) => {
  return useQuery({
    queryKey: landlordQueryKeys.counters(),
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
    refetchOnWindowFocus: true,
  });
};
