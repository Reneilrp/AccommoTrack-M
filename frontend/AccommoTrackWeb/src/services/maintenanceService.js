import api from '../utils/api';

export const maintenanceService = {
    /**
     * Get maintenance requests for tenant
     */
    async getTenantRequests(page = 1) {
        try {
            const response = await api.get(`/tenant/maintenance-requests?page=${page}`);
            return {
                success: true,
                data: this.normalizePaginatedResponse(response.data)
            };
        } catch (error) {
            console.error('Error fetching tenant maintenance requests:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch maintenance requests'
            };
        }
    },

    /**
     * Helper to normalize Laravel paginated and non-paginated responses
     */
    normalizePaginatedResponse(payload) {
        if (payload && payload.data && Array.isArray(payload.data)) {
            return {
                items: payload.data,
                pagination: {
                    currentPage: payload.current_page,
                    lastPage: payload.last_page,
                    perPage: payload.per_page,
                    total: payload.total,
                    hasMorePages: payload.current_page < payload.last_page
                }
            };
        }
        return {
            items: Array.isArray(payload) ? payload : (payload?.data || []),
            pagination: null
        };
    },

    /**
     * Get single maintenance request details with history
     */
    async getRequestDetails(id) {
        try {
            const response = await api.get(`/tenant/maintenance-requests/${id}`);
            return {
                success: true,
                data: response.data?.data || response.data
            };
        } catch (error) {
            console.error('Error fetching maintenance request details:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Request not found'
            };
        }
    },

    /**
     * Create a maintenance request (Tenant)
     * @param {FormData} formData 
     */
    async createRequest(formData) {
        try {
            const response = await api.post('/tenant/maintenance-requests', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error creating maintenance request:', error);
            throw error;
        }
    },

    /**
     * Get maintenance requests for landlord
     */
    async getLandlordRequests(params = {}) {
        try {
            const response = await api.get('/landlord/maintenance-requests', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching landlord maintenance requests:', error);
            throw error;
        }
    },

    /**
     * Get maintenance summary for landlord dashboard
     */
    async getSummary(params = {}) {
        try {
            const response = await api.get('/landlord/maintenance-requests/summary', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching landlord maintenance summary:', error);
            throw error;
        }
    },

    /**
     * Update maintenance request status (Landlord)
     */
    async updateStatus(id, status, notes = null) {
        try {
            const response = await api.patch(`/landlord/maintenance-requests/${id}/status`, { status, notes });
            return response.data;
        } catch (error) {
            console.error('Error updating maintenance request status:', error);
            throw error;
        }
    },

    /**
     * Assign maintenance request to a worker (Landlord)
     */
    async assignWorker(id, workerId) {
        try {
            const response = await api.patch(`/landlord/maintenance-requests/${id}/assign`, { worker_id: workerId });
            return response.data;
        } catch (error) {
            console.error('Error assigning maintenance worker:', error);
            throw error;
        }
    },

    /**
     * Mark maintenance request as completed (Landlord/Caretaker)
     */
    async completeRequest(id, notes = null) {
        try {
            const response = await api.post(`/landlord/maintenance-requests/${id}/complete`, { notes });
            return response.data;
        } catch (error) {
            console.error('Error completing maintenance request:', error);
            throw error;
        }
    },

    /**
     * Priority colors for UI
     */
    getPriorityColor(priority) {
        switch (priority?.toLowerCase()) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    },

    /**
     * Status colors for UI
     */
    getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }
};

export default maintenanceService;
