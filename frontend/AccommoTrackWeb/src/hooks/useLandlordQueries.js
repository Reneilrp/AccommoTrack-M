import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Centered Query Keys for Landlord Module
 */
export const landlordQueryKeys = {
  dashboardStats: () => ['landlordDashboardStats'],
  activities: () => ['landlordActivities'],
  upcomingPayments: () => ['landlordUpcomingPayments'],
  verificationStatus: () => ['landlordVerificationStatus'],
  properties: (params = {}) => ['landlordProperties', params],
  tenants: (params = {}) => ['landlordTenants', params],
  bookings: (params = {}) => ['landlordBookings', params],
  analytics: (params = {}) => ['landlordAnalytics', params],
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
