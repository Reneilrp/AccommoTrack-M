import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../contexts/WebSocketContext';
import { landlordQueryKeys } from './useLandlordQueries';
import { tenantQueryKeys } from './useTenantQueries';

/**
 * Global Real-time Synchronization Hook
 * Listens for WebSocket events and invalidates React Query caches.
 */
export const useRealTimeSync = (user) => {
  const queryClient = useQueryClient();
  const { echo } = useWebSocket();

  useEffect(() => {
    if (!user?.id || !echo) return;

    // 1. Listen for USER-SPECIFIC events
    const userChannel = echo.private(`user.${user.id}`);
    
    // Global dashboard update ping
    userChannel.listen('.dashboard.updated', () => {
      console.log('[RealTimeSync] Dashboard update received');
      queryClient.invalidateQueries({ queryKey: landlordQueryKeys.counters() });
      if (user.role === 'landlord' || user.role === 'caretaker') {
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardStats() });
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.activities() });
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.upcomingPayments() });
        queryClient.invalidateQueries({ queryKey: ['landlordDashboardBundle'] });
        queryClient.invalidateQueries({ queryKey: ['landlordPropertySummary'] });
      } else if (user.role === 'tenant') {
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.dashboardBundle() });
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.payments() });
      }
    });

    // Specific Invoice Updates (Direct from Ledger Pulse)
    userChannel.listen('.invoice.updated', (event) => {
      console.log('[RealTimeSync] Invoice update received', event);
      if (user.role === 'tenant') {
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.payments() });
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.paymentStats() });
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.walletLogs() });
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.dashboardBundle() });
      } else {
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.upcomingPayments() });
        queryClient.invalidateQueries({ queryKey: ['landlordDashboardBundle'] });
        queryClient.invalidateQueries({ queryKey: ['landlordPropertySummary'] });
      }
    });

    // Unified Counter Updates (Direct from UserCounterService Pulse)
    userChannel.listen('.counters.updated', (event) => {
      console.log('[RealTimeSync] Global counters update received', event.counters);
      queryClient.setQueryData(landlordQueryKeys.counters(), event.counters);
    });

    // Message unread count updates
    userChannel.listen('.unread_count.updated', (event) => {
      console.log('[RealTimeSync] Unread count update received', event);
      // Dispatch custom event for legacy components if needed
      window.dispatchEvent(new CustomEvent('accommo:messages-unread-updated', { 
        detail: { count: event.unread_count } 
      }));
    });

    // 2. Role-specific channels
    if (user.role === 'tenant') {
      const tenantChannel = echo.private(`tenant.${user.id}`);
      tenantChannel.listen('.booking.updated', () => {
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.bookings() });
        queryClient.invalidateQueries({ queryKey: ['tenantStayBundle'] });
      });
    }

    return () => {
      echo.leave(`user.${user.id}`);
      if (user.role === 'tenant') {
        echo.leave(`tenant.${user.id}`);
      }
    };
  }, [user, queryClient]);
};
