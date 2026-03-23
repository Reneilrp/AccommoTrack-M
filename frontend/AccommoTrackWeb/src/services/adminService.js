import api from './api';

const adminService = {
  /**
   * Get all landlord verifications (approval list)
   */
  async getLandlordVerifications() {
    return await api.get('/admin/landlord-verifications');
  },

  /**
   * Approve a landlord user
   * @param {number|string} userId 
   */
  async approveLandlord(userId) {
    return await api.post(`/admin/users/${userId}/approve`);
  },

  /**
   * Reject a landlord verification
   * @param {number|string} verificationId 
   * @param {string} reason 
   */
  async rejectLandlordVerification(verificationId, reason) {
    return await api.post(`/admin/landlord-verifications/${verificationId}/reject`, {
      reason
    });
  },

  /**
   * Get inquiries for admin
   * @param {number} page 
   */
  async getInquiries(page = 1) {
    return await api.get(`/admin/inquiries?page=${page}`);
  },

  /**
   * Reply to an inquiry
   * @param {number|string} inquiryId 
   * @param {string} reply 
   */
  async replyToInquiry(inquiryId, reply) {
    return await api.post(`/admin/inquiries/${inquiryId}/reply`, {
      reply
    });
  },

  /**
   * Delete an inquiry
   * @param {number|string} inquiryId 
   */
  async deleteInquiry(inquiryId) {
    return await api.delete(`/admin/inquiries/${inquiryId}`);
  },

  /**
   * Get properties by status for approval
   * @param {string} status - 'pending', 'approved', 'rejected'
   */
  async getPropertiesByStatus(status = 'pending') {
    return await api.get(`/admin/properties/${status}`);
  },

  /**
   * Approve a property
   * @param {number|string} propertyId 
   */
  async approveProperty(propertyId) {
    return await api.post(`/admin/properties/${propertyId}/approve`);
  },

  /**
   * Reject a property
   * @param {number|string} propertyId 
   */
  async rejectProperty(propertyId) {
    return await api.post(`/admin/properties/${propertyId}/reject`);
  },

  /**
   * Put property into maintenance mode
   * @param {number|string} propertyId 
   */
  async propertyMaintenance(propertyId) {
    return await api.post(`/admin/properties/${propertyId}/maintenance`);
  },

  /**
   * Get all users for management
   */
  async getUsers() {
    return await api.get('/admin/users');
  },

  /**
   * Block a user account
   * @param {number|string} userId 
   */
  async blockUser(userId) {
    return await api.post(`/admin/users/${userId}/block`);
  },

  /**
   * Unblock a user account
   * @param {number|string} userId 
   */
  async unblockUser(userId) {
    return await api.post(`/admin/users/${userId}/unblock`);
  },

  /**
   * Get admin dashboard statistics
   */
  async getDashboardStats() {
    return await api.get('/admin/dashboard/stats');
  },

  /**
   * Get recent activities for admin dashboard
   */
  async getRecentActivities() {
    return await api.get('/admin/dashboard/recent-activities');
  }
};

export default adminService;
