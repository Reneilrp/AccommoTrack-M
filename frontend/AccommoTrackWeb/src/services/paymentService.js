import api from '../utils/api';

export const paymentService = {
    /**
     * Get all payments for the authenticated tenant
     * @param {string} status - Filter by status: 'all', 'paid', 'pending', 'overdue'
     */
    async getPayments(status = 'all', archiveFilter = 'active', page = 1) {
        try {
            const params = { page };
            if (status !== 'all') params.status = status;
            if (archiveFilter) params.archive_filter = archiveFilter;
            
            const response = await api.get('/tenant/payments', { params });
            const payload = response.data;

            // Normalize paginated response
            if (payload && payload.data && Array.isArray(payload.data)) {
                return {
                    success: true,
                    data: {
                        items: payload.data,
                        pagination: {
                            currentPage: payload.current_page,
                            lastPage: payload.last_page,
                            perPage: payload.per_page,
                            total: payload.total,
                            hasMorePages: payload.current_page < payload.last_page
                        }
                    }
                };
            }

            return {
                success: true,
                data: {
                    items: Array.isArray(payload) ? payload : (payload?.data || []),
                    pagination: null
                }
            };
        } catch (error) {
            console.error('Error fetching payments:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch payments'
            };
        }
    },

    /**
     * Get payment statistics for the tenant
     * Returns: totalPaidThisMonth, paidCount, nextDueDate
     */
    async getStats() {
        try {
            const response = await api.get('/tenant/payments/stats');
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error fetching payment stats:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch payment stats'
            };
        }
    },

    /**
     * Get single payment details
     * @param {number} id - Payment ID
     */
    async getPaymentById(id) {
        try {
            const response = await api.get(`/tenant/payments/${id}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error fetching payment details:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Payment not found'
            };
        }
    },

    /**
     * Ensure an invoice exists for a booking and return it.
     * Matches: POST /api/tenant/bookings/{id}/invoice
     */
    async createBookingInvoice(bookingId, options = null) {
        try {
            const payload = options && typeof options === 'object' && Object.keys(options).length > 0
                ? options
                : undefined;
            const response = await api.post(`/tenant/bookings/${bookingId}/invoice`, payload);
            return {
                success: true,
                data: response.data?.data || response.data
            };
        } catch (error) {
            console.error('Error creating booking invoice:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to create invoice for booking'
            };
        }
    },

    /**
     * Get the tenant's wallet credit balance for a specific property.
     * @param {number} propertyId
     */
    async getPropertyCreditBalance(propertyId) {
        try {
            const response = await api.get('/tenant/payments/credits/balance', {
                params: { property_id: propertyId }
            });
            return {
                success: true,
                data: response.data?.balance || 0
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch property wallet balance',
                data: 0
            };
        }
    },

    /**
     * Get the tenant's global wallet credit balance.
     */
    async getWalletBalance() {
        try {
            const response = await api.get('/tenant/payments/stats');
            return {
                success: true,
                data: response.data?.totalCredits || 0
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch wallet balance',
                data: 0
            };
        }
    },
    /**
     * Apply wallet credits to an invoice.
     * POST /tenant/invoices/{id}/apply-wallet-credit
     * @param {number} invoiceId
     * @param {number|string} amountCents  – Amount in decimal (e.g. 500.50)
     */
    async applyWalletCredit(invoiceId, amountCents) {
        try {
            const response = await api.post(`/tenant/invoices/${invoiceId}/apply-wallet-credit`, {
                amount_cents: amountCents
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to apply wallet credits'
            };
        }
    },

    /**
     * Generate advance monthly invoices for early payment (up to 2 months).
     */
    async createAdvanceBookingInvoices(bookingId, monthsCount = 2) {
        const normalizedMonths = Math.max(1, Math.min(Number(monthsCount) || 1, 2));

        return this.createBookingInvoice(bookingId, {
            start_from: 'next',
            months_count: normalizedMonths,
        });
    },

    /**
     * Get wallet credit transaction history for the tenant
     */
    async getWalletLogs(page = 1) {
        try {
            const response = await api.get(`/tenant/wallet-credit/logs?page=${page}`);
            const payload = response.data;

            if (payload && payload.data && Array.isArray(payload.data)) {
                return {
                    success: true,
                    data: {
                        items: payload.data,
                        pagination: {
                            currentPage: payload.current_page,
                            lastPage: payload.last_page,
                            perPage: payload.per_page,
                            total: payload.total,
                            hasMorePages: payload.current_page < payload.last_page
                        }
                    }
                };
            }

            return {
                success: true,
                data: {
                    items: Array.isArray(payload) ? payload : (payload?.data || []),
                    pagination: null
                }
            };
        } catch (error) {
            console.error('Error fetching wallet logs:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch transaction history'
            };
        }
    },

    /**
     * Toggle archive status for a single invoice
     * @param {number} invoiceId 
     */
    async archiveInvoice(invoiceId) {
        try {
            const response = await api.patch(`/tenant/invoices/${invoiceId}/archive`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error archiving invoice:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to archive invoice'
            };
        }
    },

    /**
     * Format amount to Philippine Peso
     * @param {number|string} amount 
     */
    formatAmount(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount || 0);
    },

    /**
     * Get status badge color classes (Tailwind)
     * @param {string} status 
     */
    getStatusColor(status) {
        const s = (status || "").toLowerCase();
        const colors = {
            'paid': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
            'pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
            'partial': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
            'partially paid': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
            'pending_verification': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
            'awaiting verification': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
            'overdue': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
            'unpaid': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
            'cancelled': 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
            'deferred': 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
            'refunded': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
        };
        return colors[s] || 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

export default paymentService;
