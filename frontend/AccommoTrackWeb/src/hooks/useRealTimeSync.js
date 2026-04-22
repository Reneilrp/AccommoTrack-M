import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '../utils/echo';
import { landlordQueryKeys } from './useLandlordQueries';
import { tenantQueryKeys } from './useTenantQueries';

/**
 * Global Real-time Synchronization Hook
 * Listens for WebSocket events and invalidates React Query caches.
 */
export const useRealTimeSync = (user) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const echo = getEcho();
    if (!echo) return;

    // 1. Listen for USER-SPECIFIC events
    const userChannel = echo.private(`user.${user.id}`);
    
    // Global dashboard update ping
    userChannel.listen('.dashboard.updated', () => {
      console.log('[RealTimeSync] Dashboard update received');
      
      if (user.role === 'landlord' || user.role === 'caretaker') {
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardStats() });
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.activities() });
        queryClient.invalidateQueries({ queryKey: landlordQueryKeys.upcomingPayments() });
      } else if (user.role === 'tenant') {
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.dashboardBundle() });
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.payments() });
      }
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
