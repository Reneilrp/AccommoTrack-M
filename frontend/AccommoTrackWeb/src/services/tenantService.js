import api, { normalizePaginatedResponse } from '../utils/api';
import { cacheManager } from '../utils/cache';

const CACHE_KEYS = {
    PROFILE: 'tenant_profile'
};

export const tenantService = {

    /**
     * Get current stay details (active booking with room, addons, payments)
     */
    async getCurrentStay() {
        try {
            const response = await api.get('/tenant/current-stay');
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error fetching current stay:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Get booking history (past/completed bookings)
     */
    async getHistory(page = 1) {
        try {
            const response = await api.get(`/tenant/history?page=${page}`);
            return { 
                success: true, 
                data: normalizePaginatedResponse(response.data) 
            };
        } catch (_err) {
            console.error('Error fetching booking history:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Request an addon for current booking
     */
    async requestAddon(payload) {
        try {
            const response = await api.post('/tenant/addons/request', payload);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error requesting addon:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Cancel a pending addon request
     */
    async cancelAddonRequest(addonId) {
        try {
            const response = await api.delete(`/tenant/addons/${addonId}/cancel`);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error cancelling addon request:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Get dashboard stats
     */
    async getDashboardStats() {
        try {
            const response = await api.get('/tenant/dashboard/stats');
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error fetching dashboard stats:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Get tenant bookings
     */
    async getBookings() {
        try {
            const response = await api.get('/tenant/bookings');
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error fetching bookings:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Get tenant payments
     */
    async getPayments() {
        try {
            const response = await api.get('/tenant/payments');
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error fetching payments:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Get Tenant Profile
     */
    async getProfile() {
        try {
            // Try cache first
            const cachedProfile = cacheManager.get(CACHE_KEYS.PROFILE);
            if (cachedProfile) return { success: true, data: cachedProfile };

            const response = await api.get('/tenant/profile');
            
            // Save to cache (5 mins)
            cacheManager.set(CACHE_KEYS.PROFILE, response.data);
            
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error fetching profile:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Cancel a booking
     */
    async cancelBooking(bookingId, reason = '') {
        try {
            const response = await api.patch(`/tenant/bookings/${bookingId}/cancel`, {
                cancellation_reason: reason
            });
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error cancelling booking:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Reschedule a pending booking
     */
    async rescheduleBooking(bookingId, newStartDate) {
        try {
            const response = await api.patch(`/tenant/bookings/${bookingId}/reschedule`, {
                start_date: newStartDate
            });
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error rescheduling booking:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Request move-out for an active stay.
     */
    async requestMoveOut(bookingId, moveOutDate, reason = '') {
        try {
            const response = await api.patch(`/tenant/bookings/${bookingId}/request-move-out`, {
                move_out_date: moveOutDate,
                reason,
            });
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error requesting move-out:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Request lease extension
     */
    async requestExtension(bookingId, payload) {
        try {
            const response = await api.post(`/bookings/${bookingId}/extend`, payload);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error requesting extension:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Request room transfer
     */
    async requestTransfer(payload) {
        try {
            const response = await api.post('/tenant/transfers', payload);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error requesting transfer:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Cancel room transfer request
     */
    async cancelTransferRequest(transferRequestId) {
        try {
            const response = await api.patch(`/tenant/transfers/${transferRequestId}/cancel`);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error cancelling transfer request:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Reviews
     */
    async getReviews() {
        try {
            const response = await api.get('/tenant/reviews');
            return { success: true, data: response.data?.data || response.data || [] };
        } catch (_err) {
            console.error('Error fetching reviews:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    async submitReview(payload) {
        try {
            const response = await api.post('/tenant/reviews', payload);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error submitting review:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    async updateReview(id, payload) {
        try {
            const response = await api.put(`/tenant/reviews/${id}`, payload);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error updating review:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    async deleteReview(id) {
        try {
            const response = await api.delete(`/tenant/reviews/${id}`);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error deleting review:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Maintenance
     */
    async submitMaintenanceRequest(payload) {
        try {
            const response = await api.post('/tenant/maintenance-requests', payload);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error submitting maintenance request:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    async getMaintenanceRequests() {
        try {
            const response = await api.get('/tenant/maintenance-requests');
            return { success: true, data: response.data?.data || response.data || [] };
        } catch (_err) {
            console.error('Error fetching maintenance requests:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Update Tenant Profile
     * @param {Object|FormData} payload 
     */
    async updateProfile(payload) {
        try {
            let response;
            
            // If it's FormData (has an image), use POST with spoofing
            if (payload instanceof FormData) {
                if (!payload.has('_method')) {
                    payload.append('_method', 'PUT');
                }
                response = await api.post('/tenant/profile', payload);
            } else {
                // Standard JSON update (more stable)
                response = await api.put('/tenant/profile', payload);
            }

            // Invalidate cache so next fetch gets fresh data
            cacheManager.invalidate(CACHE_KEYS.PROFILE);

            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error updating profile:', _err);
            return { 
                success: false, 
                error: _err?.response?.data?.message || _err.message,
                errors: _err?.response?.data?.errors || null
            };
        }
    },
    
    /**
     * Change Password
     */
    async changePassword(currentPassword, newPassword, newPasswordConfirmation) {
        try {
            const response = await api.post('/tenant/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirmation
            });
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error changing password:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Tenant: send OTP to start enabling 2FA
     */
    async sendTenantTwoFactorOtp() {
        try {
            const response = await api.post('/tenant/security/two-factor/send-otp');
            return {
                success: true,
                data: response.data?.user || null,
                twoFactor: response.data?.two_factor || null,
                message: response.data?.message || 'Verification code sent to your email address.',
            };
        } catch (_err) {
            console.error('Error sending tenant 2FA OTP:', _err);
            return {
                success: false,
                error: _err?.response?.data?.message || _err.message,
            };
        }
    },

    /**
     * Tenant: verify 2FA enable OTP
     */
    async verifyTenantTwoFactorOtp(emailOtpCode) {
        try {
            const response = await api.post('/tenant/security/two-factor/verify-otp', {
                email_otp_code: emailOtpCode,
            });
            return {
                success: true,
                data: response.data?.user || null,
                twoFactor: response.data?.two_factor || null,
                message: response.data?.message || 'Two-factor authentication enabled successfully.',
            };
        } catch (_err) {
            console.error('Error verifying tenant 2FA OTP:', _err);
            return {
                success: false,
                error: _err?.response?.data?.message || _err.message,
            };
        }
    },

    /**
     * Tenant: disable 2FA
     */
    async disableTenantTwoFactor() {
        try {
            const response = await api.post('/tenant/security/two-factor/disable');
            return {
                success: true,
                data: response.data?.user || null,
                twoFactor: response.data?.two_factor || null,
                message: response.data?.message || 'Two-factor authentication has been disabled.',
            };
        } catch (_err) {
            console.error('Error disabling tenant 2FA:', _err);
            return {
                success: false,
                error: _err?.response?.data?.message || _err.message,
            };
        }
    },

    /**
     * Tenant: fetch 2FA status
     */
    async getTenantTwoFactorStatus() {
        try {
            const response = await api.get('/tenant/security/two-factor');
            return {
                success: true,
                twoFactor: response.data?.two_factor || null,
                message: response.data?.message || 'Two-factor authentication status retrieved successfully.',
            };
        } catch (_err) {
            console.error('Error fetching tenant 2FA status:', _err);
            return {
                success: false,
                error: _err?.response?.data?.message || _err.message,
            };
        }
    },

    /**
     * Get available add-ons for active booking
     */
    async getAvailableAddons() {
        try {
            const response = await api.get('/tenant/addons/available');
            return { success: true, data: response.data };
        } catch (_err) {
            if (_err.response?.status === 404) return { success: false, status: 404 };
            console.error('Error fetching available addons:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Get current addon requests (pending/active)
     */
    async getAddonRequests() {
        try {
            const response = await api.get('/tenant/addons/requests');
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error fetching addon requests:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message };
        }
    },

    /**
     * Get recent activities for tenant
     */
    async getActivities(params = {}) {
        try {
            const response = await api.get('/tenant/dashboard/activities', { params });
            return { 
                success: true, 
                data: normalizePaginatedResponse(response.data) 
            };
        } catch (_err) {
            console.error('Error fetching tenant activities:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message, data: { items: [], pagination: null } };
        }
    },

    /**
     * Get month-by-month payment schedule breakdown for dashboard timeline
     * @param {number} months - Number of months to fetch (default: 6)
     */
    async getPaymentBreakdown(months = 6) {
        try {
            const response = await api.get(`/tenant/payments/breakdown?months=${months}`);
            return { success: true, data: response.data };
        } catch (_err) {
            console.error('Error fetching payment breakdown:', _err);
            return { success: false, error: _err?.response?.data?.message || _err.message, data: { upcoming_months: [] } };
        }
    }
};
