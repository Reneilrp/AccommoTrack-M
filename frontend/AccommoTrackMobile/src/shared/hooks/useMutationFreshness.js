import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { landlordQueryKeys } from '../../features/landlord/hooks/useLandlordQueryHelpers.js';
import { tenantQueryKeys } from '../../features/tenant/hooks/useTenantQueryHelpers.js';

/**
 * Utility hook for handling post-mutation cache invalidation.
 * Ensures the UI stays fresh after actions like booking approval, payment recording, etc.
 */
export const useMutationFreshness = () => {
  const queryClient = useQueryClient();

  /**
   * Refreshes relevant data based on the mutation context.
   * @param {string} type - The type of mutation (e.g., 'booking', 'payment', 'property')
   * @param {Object} context - Optional context like propertyId, tenantId, etc.
   */
  const refreshAfterMutation = useCallback(async (type, context = {}) => {
    console.log(`[MutationFreshness] Refreshing for ${type}`, context);
    
    const { propertyId, tenantId, userId, bookingId } = context;
    const invalidations = [];

    // Common invalidations
    switch (type) {
      case 'booking':
        invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.bookings() }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() }));
        if (propertyId) {
          invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.propertyDetails(propertyId) }));
        }
        if (tenantId) {
          invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.tenantDetails(tenantId) }));
        }
        break;

      case 'payment':
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['landlord', 'invoices'] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['landlord', 'paymentSummary'] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() }));
        if (tenantId) {
          invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.tenantInvoices(tenantId) }));
        }
        break;

      case 'tenant':
        invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.tenants() }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() }));
        if (tenantId) {
          invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.tenantDetails(tenantId) }));
        }
        break;

      case 'maintenance':
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['landlord', 'maintenanceRequests'] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() }));
        break;

      case 'profile':
        if (userId) {
          invalidations.push(queryClient.invalidateQueries({ queryKey: ['user', 'profile', userId] }));
        }
        break;

      default:
        // Generic refresh of dashboards if type is unknown
        invalidations.push(queryClient.invalidateQueries({ queryKey: landlordQueryKeys.dashboardBundle() }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: tenantQueryKeys.dashboardBundle() }));
    }

    await Promise.all(invalidations);
  }, [queryClient]);

  return { refreshAfterMutation };
};

export default useMutationFreshness;
