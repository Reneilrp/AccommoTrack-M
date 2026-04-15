import api from './api.js';
import { TENANT_PAYMENTS_TEMP_DISABLED, INVOICE_PAYMONGO_TEMP_DISABLED, RESERVATION_FEE_TEMP_DISABLED } from '../config/index.js';

const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
};

const DEFAULT_TOGGLES = {
  tenantPaymentsDisabled: TENANT_PAYMENTS_TEMP_DISABLED,
  invoicePaymongoDisabled: INVOICE_PAYMONGO_TEMP_DISABLED,
  reservationFeeDisabled: RESERVATION_FEE_TEMP_DISABLED,
  manualGcashReservationDisabled: false,
};

let cached = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

const normalize = (payload = {}) => ({
  tenantPaymentsDisabled: toBool(payload.tenant_payments_disabled, DEFAULT_TOGGLES.tenantPaymentsDisabled),
  invoicePaymongoDisabled: toBool(payload.invoice_paymongo_disabled, DEFAULT_TOGGLES.invoicePaymongoDisabled),
  reservationFeeDisabled: toBool(payload.reservation_fee_disabled, DEFAULT_TOGGLES.reservationFeeDisabled),
  manualGcashReservationDisabled: toBool(payload.manual_gcash_reservation_disabled, DEFAULT_TOGGLES.manualGcashReservationDisabled),
});

class SystemToggleService {
  getDefaults() {
    return { ...DEFAULT_TOGGLES };
  }

  async getToggles({ force = false } = {}) {
    const now = Date.now();
    if (!force && cached && now - cachedAt < CACHE_MS) {
      return { success: true, data: { ...cached } };
    }

    try {
      const response = await api.get('/system/toggles');
      const data = normalize(response?.data?.data || {});
      cached = data;
      cachedAt = now;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        data: { ...DEFAULT_TOGGLES },
        error: error?.response?.data?.message || error?.message || 'Failed to load system toggles',
      };
    }
  }
}

export default new SystemToggleService();
