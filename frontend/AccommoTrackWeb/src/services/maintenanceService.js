import api from '../utils/api';

export const maintenanceService = {
    /**
     * Get maintenance requests for tenant
     */
    async getTenantRequests(page = 1) {
        try {
            const response = await api.get(`/tenant/maintenance-requests?page=${page}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenant maintenance requests:', error);
            throw error;
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
     * Update maintenance request status (Landlord)
     */
    async updateStatus(id, status) {
        try {
            const response = await api.patch(`/landlord/maintenance-requests/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating maintenance request status:', error);
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
