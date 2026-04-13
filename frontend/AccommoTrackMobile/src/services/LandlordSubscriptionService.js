import api from './api.js';

const unwrapResponse = (payload) => {
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'success')
  ) {
    return {
      success: Boolean(payload.success),
      data: payload.data ?? null,
      message: payload.message || '',
    };
  }

  return {
    success: true,
    data: payload?.data ?? payload ?? null,
    message: '',
  };
};

class LandlordSubscriptionService {
  async getPlans() {
    try {
      const response = await api.get('/landlord/subscriptions/plans');
      const result = unwrapResponse(response.data);

      return {
        success: result.success,
        data: Array.isArray(result.data) ? result.data : [],
        message: result.message,
        error: result.success ? null : (result.message || 'Failed to load subscription plans'),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error.response?.data?.message || error.message || 'Failed to load subscription plans',
      };
    }
  }

  async getCurrent() {
    try {
      const response = await api.get('/landlord/subscriptions/current');
      const result = unwrapResponse(response.data);

      return {
        success: result.success,
        data: result.data || null,
        message: result.message,
        error: result.success ? null : (result.message || 'Failed to load current subscription'),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || error.message || 'Failed to load current subscription',
      };
    }
  }

  async getUsage() {
    try {
      const response = await api.get('/landlord/subscriptions/usage');
      const result = unwrapResponse(response.data);

      return {
        success: result.success,
        data: result.data || null,
        message: result.message,
        error: result.success ? null : (result.message || 'Failed to load subscription usage'),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || error.message || 'Failed to load subscription usage',
      };
    }
  }

  async checkout(payload = {}) {
    try {
      const response = await api.post('/landlord/subscriptions/checkout', payload);
      const result = unwrapResponse(response.data);

      return {
        success: result.success,
        data: result.data || null,
        message: result.message,
        error: result.success ? null : (result.message || 'Checkout request failed'),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || error.message || 'Checkout request failed',
        status: error.response?.status,
      };
    }
  }

  async syncCheckout(subscriptionId) {
    try {
      const response = await api.post(`/landlord/subscriptions/checkout/${subscriptionId}/sync`);
      const result = unwrapResponse(response.data);

      return {
        success: result.success,
        data: result.data || null,
        message: result.message,
        error: result.success ? null : (result.message || 'Failed to sync checkout status'),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || error.message || 'Failed to sync checkout status',
        status: error.response?.status,
      };
    }
  }

  async createCheckoutPaymentLink(subscriptionId, payload = {}) {
    try {
      const response = await api.post(`/landlord/subscriptions/checkout/${subscriptionId}/payment-link`, payload);
      const result = unwrapResponse(response.data);

      return {
        success: result.success,
        data: result.data || null,
        message: result.message,
        error: result.success ? null : (result.message || 'Failed to start PayMongo checkout'),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || error.message || 'Failed to start PayMongo checkout',
        status: error.response?.status,
      };
    }
  }

  async createInvoicePaymongoSource(invoiceId, payload = {}) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/paymongo-source`, payload);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to start PayMongo checkout',
        status: error.response?.status,
      };
    }
  }
}

export default new LandlordSubscriptionService();
