import api, { normalizeResponse, normalizeError } from './api.js';

class LandlordSubscriptionService {
  async getPlans() {
    try {
      const response = await api.get('/landlord/subscriptions/plans');
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async getCurrent() {
    try {
      const response = await api.get('/landlord/subscriptions/current');
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async getUsage() {
    try {
      const response = await api.get('/landlord/subscriptions/usage');
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async checkout(payload = {}) {
    try {
      const response = await api.post('/landlord/subscriptions/checkout', payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async syncCheckout(subscriptionId) {
    try {
      const response = await api.post(`/landlord/subscriptions/checkout/${subscriptionId}/sync`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async createCheckoutPaymentLink(subscriptionId, payload = {}) {
    try {
      const response = await api.post(`/landlord/subscriptions/checkout/${subscriptionId}/payment-link`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async createInvoicePaymongoSource(invoiceId, payload = {}) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/paymongo-source`, payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }
}

export default new LandlordSubscriptionService();
