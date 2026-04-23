import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { tenantService } from '../services/tenantService';
import { paymentService } from '../services/paymentService';
import { maintenanceService } from '../services/maintenanceService';
import api from '../utils/api';

/**
 * Centered Query Keys for Tenant Module (Web)
 * Mirrored from mobile implementation for consistency.
 */
export const tenantQueryKeys = {
  dashboardBundle: () => ['tenantDashboardBundle'],
  dashboardStats: () => ['tenantDashboardStats'],
  dashboardStay: () => ['tenantDashboardStay'],
  activities: () => ['tenantActivities'],
  paymentBreakdown: (months = 6) => ['tenantPaymentBreakdown', months],
  bookings: () => ['tenantBookings'],
  history: (page = 1) => ['tenantHistory', page],
  payments: () => ['tenantPayments'],
  paymentStats: () => ['tenantPaymentStats'],
  walletLogs: (page = 1) => ['tenantWalletLogs', page],
  transfers: () => ['tenantTransfers'],
  profile: () => ['tenantProfile'],
  maintenance: (page = 1) => ['tenantMaintenance', page],
  notifications: () => ['tenantNotifications'],
};

/**
 * Consolidated Dashboard Data Fetching (Optimized Bundle)
 */
export const useTenantDashboardBundle = () => {
  return useQuery({
    queryKey: tenantQueryKeys.dashboardBundle(),
    queryFn: async () => {
      const [stayRes, statsRes, activityRes, breakdownRes] = await Promise.all([
        tenantService.getCurrentStay(),
        tenantService.getDashboardStats(),
        tenantService.getActivities(),
        tenantService.getPaymentBreakdown(3),
      ]);

      return {
        stay: stayRes.success ? stayRes.data : null,
        stats: statsRes.success ? statsRes.data : null,
        activities: activityRes.success ? activityRes.data : [],
        breakdown: breakdownRes.success ? breakdownRes.data : { upcoming_months: [] },
      };
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch Tenant Stay Bundle (equivalent to mobile tenantMyBookingsBundle)
 */
export const useTenantStayBundle = () => {
  return useQuery({
    queryKey: ['tenantStayBundle'],
    queryFn: async () => {
      const [stayRes, bookingsRes] = await Promise.all([
        tenantService.getCurrentStay(),
        tenantService.getBookings()
      ]);

      if (!stayRes.success) throw new Error(stayRes.error || 'Failed to fetch stay data');
      
      const stays = stayRes.data?.stays || stayRes.data?.data?.stays || [];
      const pendingCheckIns = stayRes.data?.pendingCheckIns || stayRes.data?.data?.pendingCheckIns || [];
      const upcomingBooking = stayRes.data?.upcomingBooking || stayRes.data?.upcoming_booking || stayRes.data?.data?.upcomingBooking || null;
      
      const rawBookings = bookingsRes.success ? bookingsRes.data : [];
      const bookingsList = Array.isArray(rawBookings) 
        ? rawBookings 
        : (rawBookings?.items || rawBookings?.data || []);
      
      return {
        stays,
        pendingCheckIns,
        upcomingBooking,
        bookingsList
      };
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch Tenant Booking History
 */
export const useTenantHistory = (page = 1) => {
  return useQuery({
    queryKey: tenantQueryKeys.history(page),
    queryFn: async () => {
      const response = await tenantService.getHistory(page);
      if (!response.success) throw new Error(response.error || 'Failed to fetch history');
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Fetch Tenant Transfers
 */
export const useTenantTransfers = () => {
  return useQuery({
    queryKey: tenantQueryKeys.transfers(),
    queryFn: async () => {
      const response = await api.get('/tenant/transfers');
      return response?.data?.data || response?.data?.transfers || response?.data || [];
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch Tenant Payments
 */
export const useTenantPayments = (status = 'all', archiveFilter = 'active') => {
  return useQuery({
    queryKey: ['tenantPayments', status, archiveFilter],
    queryFn: async () => {
      const response = await paymentService.getPayments(status, archiveFilter);
      if (!response.success) throw new Error(response.error || 'Failed to fetch payments');
      // paymentService returns { items: [...], pagination: {...} }
      // Always normalize to a plain array so spread/iteration never throws
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch Tenant Payment Stats
 */
export const useTenantPaymentStats = () => {
  return useQuery({
    queryKey: tenantQueryKeys.paymentStats(),
    queryFn: async () => {
      const response = await paymentService.getStats();
      if (!response.success) throw new Error(response.error || 'Failed to fetch payment stats');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 export const useTenantWalletLogs = (page = 1) => {
   return useQuery({
     queryKey: tenantQueryKeys.walletLogs(page),
     queryFn: async () => {
       const response = await paymentService.getWalletLogs(page);
       if (!response.success) throw new Error(response.error || 'Failed to fetch wallet logs');

       const payload = response.data || {};
       const items = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.data) ? payload.data : []);

       return {
         data: items,
         meta: payload.pagination || null
       };
     },
     staleTime: 5 * 60 * 1000,
   });
 };
    placeholderData: keepPreviousData,
  });
};

/**
 * Fetch Tenant Maintenance Requests
 */
export const useTenantMaintenance = (page = 1) => {
  return useQuery({
    queryKey: tenantQueryKeys.maintenance(page),
    queryFn: async () => {
      const response = await maintenanceService.getTenantRequests(page);
      
      const payload = response.data || {};
      return {
        data: Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []),
        meta: payload.meta || payload || null
      };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
};

/**
 * Fetch Tenant Notifications
 */
export const useTenantNotifications = () => {
  return useQuery({
    queryKey: tenantQueryKeys.notifications(),
    queryFn: async () => {
      const response = await api.get('/tenant/notifications');
      return response.data?.data || response.data || [];
    },
    staleTime: 1 * 60 * 1000,
  });
};
