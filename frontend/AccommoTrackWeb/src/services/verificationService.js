import api from '../utils/api';

const verificationService = {
  /**
   * Submit landlord verification request
   * @param {FormData} formData 
   */
  async submitLandlordVerification(formData) {
    try {
      const res = await api.post('/landlord-verification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  },

  /**
   * Resubmit tenant verification request
   * @param {FormData} formData 
   */
  async resubmitTenantVerification(formData) {
    try {
      const res = await api.post('/tenant/resubmit-verification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }
};

export default verificationService;
