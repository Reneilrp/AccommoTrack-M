import api from '../utils/api';

const EMPTY_PAGINATION = {
  currentPage: 1,
  lastPage: 1,
  perPage: 0,
  total: 0,
  from: null,
  to: null,
  hasMorePages: false,
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toNullableInt = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringOrNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return fallback;
};

const toStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item !== null && item !== undefined)
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
};

const normalizeEnvelope = (payload) => {
  if (isPlainObject(payload) && Object.prototype.hasOwnProperty.call(payload, 'success')) {
    return {
      success: Boolean(payload.success),
      data: payload.data ?? null,
      message: typeof payload.message === 'string' ? payload.message : '',
    };
  }

  return {
    success: true,
    data: payload ?? null,
    message: '',
  };
};

const normalizeRequestError = (error) => ({
  success: false,
  status: error?.response?.status,
  error: error?.response?.data?.message || error?.message || 'Request failed',
});

const normalizeQueryValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeQueryValue(entry))
      .filter((entry) => entry !== null && entry !== undefined && entry !== '');
  }

  return value;
};

const buildQueryParams = (params = {}) => {
  if (!isPlainObject(params)) {
    return {};
  }

  return Object.entries(params).reduce((accumulator, [key, rawValue]) => {
    const value = normalizeQueryValue(rawValue);
    if (value === null || value === undefined || value === '') {
      return accumulator;
    }

    if (Array.isArray(value) && value.length === 0) {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
};

const hasPaginationFields = (value) => {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    value.current_page !== undefined ||
    value.currentPage !== undefined ||
    value.last_page !== undefined ||
    value.lastPage !== undefined ||
    value.per_page !== undefined ||
    value.perPage !== undefined ||
    value.total !== undefined
  );
};

const resolvePaginationPayload = (payload) => {
  if (!isPlainObject(payload)) {
    return null;
  }

  const candidates = [
    payload,
    isPlainObject(payload.pagination) ? payload.pagination : null,
    isPlainObject(payload.meta) ? payload.meta : null,
    isPlainObject(payload.data) ? payload.data : null,
    isPlainObject(payload.data?.pagination) ? payload.data.pagination : null,
    isPlainObject(payload.data?.meta) ? payload.data.meta : null,
  ].filter(Boolean);

  return candidates.find((candidate) => hasPaginationFields(candidate)) || null;
};

const normalizePagination = (payload) => {
  const source = resolvePaginationPayload(payload);

  if (!source) {
    return { ...EMPTY_PAGINATION };
  }

  const currentPage = toInt(source.current_page ?? source.currentPage, 1);
  const lastPage = toInt(source.last_page ?? source.lastPage, 1);
  const perPage = toInt(source.per_page ?? source.perPage, 0);
  const total = toInt(source.total, 0);

  return {
    currentPage,
    lastPage,
    perPage,
    total,
    from: toNullableInt(source.from),
    to: toNullableInt(source.to),
    hasMorePages: toBoolean(source.has_more_pages ?? source.hasMorePages, currentPage < lastPage),
  };
};

const extractCollectionItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isPlainObject(payload)) {
    return [];
  }

  const directArrayKeys = ['data', 'items', 'users', 'results', 'rows', 'records', 'list'];
  for (const key of directArrayKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  const nestedObjectKeys = ['data', 'payload', 'result'];
  for (const key of nestedObjectKeys) {
    if (isPlainObject(payload[key])) {
      const nestedItems = extractCollectionItems(payload[key]);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }
  }

  return [];
};

const getPaginatedItems = (payload) => {
  return extractCollectionItems(payload);
};

const normalizeManualMethod = (method) => {
  if (typeof method !== 'string') {
    return null;
  }

  return method.trim().toLowerCase().replace(/[-\s]+/g, '_');
};

const parseMetadata = (metadata) => {
  if (isPlainObject(metadata)) {
    return metadata;
  }

  if (typeof metadata === 'string' && metadata.trim() !== '') {
    try {
      const parsed = JSON.parse(metadata);
      return isPlainObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
};

const normalizeOversightRecord = (record) => {
  const item = isPlainObject(record) ? record : {};

  return {
    id: toNullableInt(item.id),
    invoiceId: toNullableInt(item.invoice_id ?? item.invoiceId),
    invoiceReference: toStringOrNull(item.invoice_reference ?? item.invoiceReference),
    bookingId: toNullableInt(item.booking_id ?? item.bookingId),
    bookingReference: toStringOrNull(item.booking_reference ?? item.bookingReference),
    roomNumber: toStringOrNull(item.room_number ?? item.roomNumber),
    propertyId: toNullableInt(item.property_id ?? item.propertyId),
    propertyTitle: toStringOrNull(item.property_title ?? item.propertyTitle),
    landlordId: toNullableInt(item.landlord_id ?? item.landlordId),
    tenantId: toNullableInt(item.tenant_id ?? item.tenantId),
    tenantName: toStringOrNull(item.tenant_name ?? item.tenantName),
    amountCents: toInt(item.amount_cents ?? item.amountCents, 0),
    method: normalizeManualMethod(item.method),
    reference: toStringOrNull(item.reference),
    proofImageUrl: toStringOrNull(item.proof_image_url ?? item.proofImageUrl),
    proofImagePath: toStringOrNull(item.proof_image_path ?? item.proofImagePath),
    status: toStringOrNull(item.status),
    transactionStatus: toStringOrNull(item.transaction_status ?? item.transactionStatus),
    denialReasonCode: toStringOrNull(item.denial_reason_code ?? item.denialReasonCode),
    denialReason: toStringOrNull(item.denial_reason ?? item.denialReason),
    riskFlags: toStringArray(item.risk_flags ?? item.riskFlags),
    submittedAt: toStringOrNull(item.submitted_at ?? item.submittedAt),
    updatedAt: toStringOrNull(item.updated_at ?? item.updatedAt),
  };
};

const normalizeAuditLogRecord = (record) => {
  const item = isPlainObject(record) ? record : {};

  return {
    id: toNullableInt(item.id),
    domain: toStringOrNull(item.domain),
    event: toStringOrNull(item.event),
    severity: toStringOrNull(item.severity),
    summary: toStringOrNull(item.summary),
    actorId: toNullableInt(item.actor_id ?? item.actorId),
    subjectType: toStringOrNull(item.subject_type ?? item.subjectType),
    subjectId: toNullableInt(item.subject_id ?? item.subjectId),
    bookingId: toNullableInt(item.booking_id ?? item.bookingId),
    invoiceId: toNullableInt(item.invoice_id ?? item.invoiceId),
    paymentTransactionId: toNullableInt(item.payment_transaction_id ?? item.paymentTransactionId),
    tenantId: toNullableInt(item.tenant_id ?? item.tenantId),
    landlordId: toNullableInt(item.landlord_id ?? item.landlordId),
    propertyId: toNullableInt(item.property_id ?? item.propertyId),
    metadata: parseMetadata(item.metadata),
    createdAt: toStringOrNull(item.created_at ?? item.createdAt),
    updatedAt: toStringOrNull(item.updated_at ?? item.updatedAt),
  };
};

const adminService = {
  /**
   * Approve a landlord user
   * @param {number|string} userId 
   */
  async approveLandlord(userId) {
    return await api.post(`/admin/users/${userId}/approve`);
  },

  /**
   * Move a landlord to partial verification state.
   * @param {number|string} userId
   * @param {number} durationDays
   */
  async partialVerifyLandlord(userId, durationDays = 7) {
    return await api.post(`/admin/users/${userId}/partial-verify`, {
      duration_days: durationDays,
    });
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
   * @param {Object} params - {page, per_page}
   */
  async getPropertiesByStatus(status = 'pending', params = {}) {
    try {
      const res = await api.get(`/admin/properties/${status}`, { params });
      const payload = res.data;

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
    } catch (err) {
      return normalizeRequestError(err);
    }
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
   * @param {Object} params - {page, per_page, role, search, etc}
   */
  async getUsers(params = {}) {
    try {
      const response = await api.get('/admin/users', {
        params: buildQueryParams(params),
      });

      const envelope = normalizeEnvelope(response?.data);
      const payload = envelope.data;

      // Handle both paginated and non-paginated (legacy) responses
      const items = getPaginatedItems(payload);
      const pagination = normalizePagination(payload);

      return {
        success: envelope.success,
        data: {
          items: items.map((user) => {
            const userData = { ...user };
            // Add property info for landlords
            if (user.role === 'landlord') {
              userData.properties_count = Array.isArray(user.properties) ? user.properties.length : 0;
            }
            return userData;
          }),
          pagination,
        },
        message: envelope.message,
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Get all landlord verification requests
   * @param {Object} params - {page, per_page, status, etc}
   */
  async getLandlordVerifications(params = {}) {
    try {
      const res = await api.get('/admin/landlord-verifications', { params });
      const payload = res.data;
      
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
    } catch (err) {
      return normalizeRequestError(err);
    }
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
  },

  /**
   * Update admin password.
   * @param {{current_password: string, new_password: string, new_password_confirmation: string}} payload
   */
  async updatePassword(payload) {
    try {
      const response = await api.post('/change-password', payload);
      return { success: true, message: response?.data?.message || 'Password updated successfully' };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Get admin payment control settings.
   */
  async getPaymentControlSettings() {
    try {
      const response = await api.get('/admin/settings/payment-controls');
      const envelope = normalizeEnvelope(response?.data);
      const payload = isPlainObject(envelope.data) ? envelope.data : {};

      return {
        success: envelope.success,
        data: {
          tenantPaymentsDisabled: toBoolean(payload.tenant_payments_disabled, false),
          invoicePaymongoDisabled: toBoolean(
            payload.invoice_paymongo_disabled,
            toBoolean(payload.tenant_payments_disabled, false),
          ),
          paymongoTestModeEnabled: toBoolean(payload.paymongo_test_mode_enabled, false),
          reservationFeeDisabled: toBoolean(payload.reservation_fee_disabled, false),
          manualGcashReservationDisabled: toBoolean(payload.manual_gcash_reservation_disabled, false),
          mobileLatestVersion: toStringOrNull(payload.mobile_latest_version) || '1.0.0',
          mobileDownloadUrl: toStringOrNull(payload.mobile_download_url) || 'https://accommotrack.me/downloads/AccommoTrack.apk',
          mobileForceUpdate: toBoolean(payload.mobile_force_update, true),
          systemForcedNow: toStringOrNull(payload.system_forced_now) || '',
        },
        message: envelope.message,
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Update admin payment control settings.
    * @param {{tenantPaymentsDisabled: boolean, reservationFeeDisabled: boolean, manualGcashReservationDisabled: boolean, mobileLatestVersion: string, mobileDownloadUrl: string, mobileForceUpdate: boolean, systemForcedNow: string}} payload
   */
  async updatePaymentControlSettings(payload = {}) {
    try {
      const tenantPaymentsDisabled = Boolean(payload.tenantPaymentsDisabled);
      const invoicePaymongoDisabled = payload.invoicePaymongoDisabled === undefined
        ? tenantPaymentsDisabled
        : Boolean(payload.invoicePaymongoDisabled);

      const body = {
        tenant_payments_disabled: tenantPaymentsDisabled,
        invoice_paymongo_disabled: invoicePaymongoDisabled,
        paymongo_test_mode_enabled: Boolean(payload.paymongoTestModeEnabled),
        reservation_fee_disabled: Boolean(payload.reservationFeeDisabled),
        manual_gcash_reservation_disabled: Boolean(payload.manualGcashReservationDisabled),
        mobile_latest_version: String(payload.mobileLatestVersion || '1.0.0'),
        mobile_download_url: String(payload.mobileDownloadUrl || 'https://accommotrack.me/downloads/AccommoTrack.apk'),
        mobile_force_update: Boolean(payload.mobileForceUpdate),
        system_forced_now: String(payload.systemForcedNow || ''),
      };
      const response = await api.put('/admin/settings/payment-controls', body);
      const envelope = normalizeEnvelope(response?.data);
      const data = isPlainObject(envelope.data) ? envelope.data : {};

      return {
        success: envelope.success,
        data: {
          tenantPaymentsDisabled: toBoolean(data.tenant_payments_disabled, body.tenant_payments_disabled),
          invoicePaymongoDisabled: toBoolean(data.invoice_paymongo_disabled, body.invoice_paymongo_disabled),
          paymongoTestModeEnabled: toBoolean(data.paymongo_test_mode_enabled, body.paymongo_test_mode_enabled),
          reservationFeeDisabled: toBoolean(data.reservation_fee_disabled, body.reservation_fee_disabled),
          manualGcashReservationDisabled: toBoolean(data.manual_gcash_reservation_disabled, body.manual_gcash_reservation_disabled),
          mobileLatestVersion: toStringOrNull(data.mobile_latest_version) || body.mobile_latest_version,
          mobileDownloadUrl: toStringOrNull(data.mobile_download_url) || body.mobile_download_url,
          mobileForceUpdate: toBoolean(data.mobile_force_update, body.mobile_force_update),
          systemForcedNow: toStringOrNull(data.system_forced_now) || body.system_forced_now,
        },
        message: envelope.message,
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Get subscription plans for admin grants UI.
   * @param {{include_inactive?: boolean}} params
   */
  async getSubscriptionPlans(params = {}) {
    try {
      const response = await api.get('/admin/subscriptions/plans', {
        params: buildQueryParams(params),
      });
      const envelope = normalizeEnvelope(response?.data);

      return {
        success: envelope.success,
        data: Array.isArray(envelope.data) ? envelope.data : [],
        message: envelope.message,
        error: envelope.success ? null : (envelope.message || 'Failed to fetch subscription plans.'),
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Grant a subscription plan to a landlord (admin override)
   * @param {{landlord_id: number|string, plan_id: number|string, starts_at?: string, duration_months?: number, ends_at?: string, auto_renew?: boolean, notes?: string}} payload
   */
  async grantSubscription(payload = {}) {
    try {
      const response = await api.post('/admin/subscriptions/grants', payload);
      const envelope = normalizeEnvelope(response?.data);

      return {
        success: envelope.success,
        data: envelope.data,
        message: envelope.message,
        error: envelope.success ? null : (envelope.message || 'Failed to grant subscription.'),
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Extend an existing admin grant
   * @param {number|string} grantId
   * @param {{add_months?: number, ends_at?: string, notes?: string}} payload
   */
  async extendSubscriptionGrant(grantId, payload = {}) {
    try {
      const response = await api.patch(`/admin/subscriptions/grants/${grantId}/extend`, payload);
      const envelope = normalizeEnvelope(response?.data);

      return {
        success: envelope.success,
        data: envelope.data,
        message: envelope.message,
        error: envelope.success ? null : (envelope.message || 'Failed to extend subscription grant.'),
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Revoke an existing admin grant
   * @param {number|string} grantId
   * @param {{reason?: string}} payload
   */
  async revokeSubscriptionGrant(grantId, payload = {}) {
    try {
      const response = await api.post(`/admin/subscriptions/grants/${grantId}/revoke`, payload);
      const envelope = normalizeEnvelope(response?.data);

      return {
        success: envelope.success,
        data: envelope.data,
        message: envelope.message,
        error: envelope.success ? null : (envelope.message || 'Failed to revoke subscription grant.'),
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Get current subscription + timeline for a landlord
   * @param {number|string} landlordId
   */
  async getSubscriptionOverview(landlordId) {
    try {
      const response = await api.get(`/admin/subscriptions/landlords/${landlordId}`);
      const envelope = normalizeEnvelope(response?.data);

      return {
        success: envelope.success,
        data: envelope.data,
        message: envelope.message,
        error: envelope.success ? null : (envelope.message || 'Failed to fetch subscription overview.'),
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Get payment oversight queue (manual payments)
   * @param {Object} params
   */
  async getPaymentOversightQueue(params = {}) {
    try {
      const response = await api.get('/admin/payments/oversight', {
        params: buildQueryParams(params),
      });

      const envelope = normalizeEnvelope(response?.data);
      const payload = envelope.data;

      return {
        success: envelope.success,
        data: {
          items: getPaginatedItems(payload).map(normalizeOversightRecord),
          pagination: normalizePagination(payload),
        },
        message: envelope.message,
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Override approve a denied manual payment
   * @param {number|string} invoiceId
   * @param {{note: string}|string} payload
   */
  async overrideApprovePayment(invoiceId, payload = {}) {
    const noteValue = typeof payload === 'string' ? payload : payload?.note;
    const note = typeof noteValue === 'string' ? noteValue.trim() : '';

    if (!note) {
      return {
        success: false,
        status: 422,
        error: 'Override note is required.',
      };
    }

    try {
      const response = await api.post(`/admin/payments/${invoiceId}/override-approve`, { note });
      const envelope = normalizeEnvelope(response?.data);
      const payloadData = isPlainObject(envelope.data) ? envelope.data : {};

      return {
        success: envelope.success,
        data: {
          invoice: isPlainObject(payloadData.invoice) ? payloadData.invoice : null,
        },
        message: envelope.message,
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Get admin audit logs
   * @param {Object} params
   */
  async getAuditLogs(params = {}) {
    try {
      const response = await api.get('/admin/audit-logs', {
        params: buildQueryParams(params),
      });

      const envelope = normalizeEnvelope(response?.data);
      const payload = envelope.data;

      return {
        success: envelope.success,
        data: {
          items: getPaginatedItems(payload).map(normalizeAuditLogRecord),
          pagination: normalizePagination(payload),
        },
        message: envelope.message,
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Get audit timeline for an entity
   * @param {Object} params
   */
  /**
   * Clear all platform caches (Cloudflare edge + Laravel app cache)
   */
  async clearGlobalCache() {
    try {
      const response = await api.post('/admin/clear-cache');
      return normalizeEnvelope(response?.data);
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  async getAuditTimeline(params = {}) {
    try {
      const response = await api.get('/admin/audit-logs/timeline', {
        params: buildQueryParams(params),
      });

      const envelope = normalizeEnvelope(response?.data);
      const payload = envelope.data;
      const timeline = Array.isArray(payload)
        ? payload
        : (isPlainObject(payload) && Array.isArray(payload.data) ? payload.data : []);

      return {
        success: envelope.success,
        data: timeline.map(normalizeAuditLogRecord),
        message: envelope.message,
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Enable PayMongo verification bypass for a landlord (testing)
   * @param {number|string} userId
   */
  async enablePaymongoBypass(userId) {
    try {
      const response = await api.post(`/admin/users/${userId}/paymongo-bypass/enable`);
      return normalizeEnvelope(response?.data);
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Generate a password reset link for a user without sending email.
   * This is useful for inquiry replies where admin wants to manually send the link.
   * @param {number|string} userId
   * @param {string} reason
   */
  async generateUserPasswordResetLink(userId, reason) {
    try {
      const response = await api.post(`/admin/users/${userId}/generate-reset-link`, { reason });
      return normalizeEnvelope(response?.data);
    } catch (error) {
      return normalizeRequestError(error);
    }
  },

  /**
   * Search for a user by email to get their ID for password reset.
   * @param {string} email
   */
  async searchUserByEmail(email) {
    try {
      const response = await api.get('/admin/users');
      const envelope = normalizeEnvelope(response?.data);
      const users = extractCollectionItems(envelope.data);
      
      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      return {
        success: true,
        data: user || null,
        message: user ? 'User found' : 'User not found',
      };
    } catch (error) {
      return normalizeRequestError(error);
    }
  },
};

export default adminService;
