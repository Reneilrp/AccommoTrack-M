import api from '../utils/api';

export const paymentService = {
    /**
     * Get all payments for the authenticated tenant
     * @param {string} status - Filter by status: 'all', 'paid', 'pending', 'overdue'
     */
    async getPayments(status = 'all') {
        try {
            const params = status !== 'all' ? { status } : {};
            const response = await api.get('/tenant/payments', { params });
            return {
                success: true,
                data: response.data
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
     * Format amount to Philippine Peso
     * @param {number} amount 
     */
    formatAmount(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount || 0);
    },

    /**
     * Get status badge color classes (Tailwind)
     * @param {string} status 
     */
    getStatusColor(status) {
        const s = (status || "").toLowerCase();
        const colors = {
            'paid': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'partial': 'bg-yellow-100 text-yellow-800',
            'partially paid': 'bg-yellow-100 text-yellow-800',
            'pending_verification': 'bg-orange-100 text-orange-800',
            'awaiting verification': 'bg-orange-100 text-orange-800',
            'overdue': 'bg-red-100 text-red-800',
            'unpaid': 'bg-red-100 text-red-800',
            'cancelled': 'bg-red-100 text-red-800',
            'refunded': 'bg-purple-100 text-purple-800',
        };
        return colors[s] || 'bg-gray-100 text-gray-800';
    }
};

export default paymentService;
