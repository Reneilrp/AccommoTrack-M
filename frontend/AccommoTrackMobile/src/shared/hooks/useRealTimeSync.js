import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Echo from '../../utils/echo.js';
import { landlordQueryKeys } from '../../features/landlord/hooks/useLandlordQueryHelpers.js';
import { tenantQueryKeys } from '../../features/tenant/hooks/useTenantQueryHelpers.js';

/**
 * Global Real-time Synchronization Hook for Mobile
 * Listens for WebSocket events and invalidates React Query caches.
 */
export const useRealTimeSync = (user) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const echo = Echo.instance;
    if (!echo) return;

    // 1. Listen for USER-SPECIFIC events
    const userChannel = echo.private(`user.${user.id}`);
    
    // Global dashboard update ping
    userChannel.listen('.dashboard.updated', () => {
      console.log('[RealTimeSync] Dashboard update received');
      
      if (user.role === 'landlord' || user.role === 'caretaker') {
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() });
      } else if (user.role === 'tenant') {
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.dashboardBundle() });
      }
    });

    // Unified Counter Updates
    userChannel.listen('.counters.updated', (event) => {
      console.log('[RealTimeSync] Global counters update received', event.counters);
      const queryKey = (user.role === 'landlord' || user.role === 'caretaker')
        ? landlordQueryKeys.counters()
        : tenantQueryKeys.counters();
      queryClient.setQueryData(queryKey, event.counters);
    });

    // Specific Invoice Updates (Direct from Ledger Pulse)
    userChannel.listen('.invoice.updated', (event) => {
      console.log('[RealTimeSync] Invoice update received', event);
      if (user.role === 'tenant') {
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.payments() });
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.paymentStats() });
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.dashboardBundle() });
      } else {
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() });
      }
    });

    // Message unread count updates
    userChannel.listen('.unread_count.updated', (event) => {
      console.log('[RealTimeSync] Unread count update received', event);
      // You can add logic here to update global unread count state if needed
      if (user.role === 'landlord' || user.role === 'caretaker') {
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.unreadNotificationCount() });
      }
    });

    // 2. Role-specific channels
    if (user.role === 'tenant') {
      const tenantChannel = echo.private(`tenant.${user.id}`);
      tenantChannel.listen('.booking.updated', () => {
        console.log('[RealTimeSync] Booking update received');
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.dashboardBundle() });
      });
    }

    return () => {
      echo.leave(`user.${user.id}`);
      if (user.role === 'tenant') {
        echo.leave(`tenant.${user.id}`);
      }
    };
  }, [user?.id, user?.role, queryClient]);
};

export default useRealTimeSync;
