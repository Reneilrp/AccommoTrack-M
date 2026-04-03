import api from '../utils/api';

const verificationService = {
  /**
   * Submit landlord verification request
   * @param {FormData} formData 
   */
  async submitLandlordVerification(formData) {
    return await api.post('/landlord-verification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Resubmit tenant verification request
   * @param {FormData} formData 
   */
  async resubmitTenantVerification(formData) {
    return await api.post('/tenant/resubmit-verification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

export default verificationService;
