import adminService from '../adminService';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('adminService (web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getUsers parses legacy laravel paginator payloads', async () => {
    api.get.mockResolvedValue({
      data: {
        current_page: 1,
        last_page: 1,
        per_page: 50,
        total: 2,
        from: 1,
        to: 2,
        data: [
          {
            id: 201,
            role: 'landlord',
            email: 'landlord@example.com',
            properties: [{ id: 10 }],
          },
          {
            id: 202,
            role: 'tenant',
            email: 'tenant@example.com',
          },
        ],
      },
    });

    const result = await adminService.getUsers({ page: 1 });

    expect(api.get).toHaveBeenCalledWith('/admin/users', {
      params: { page: 1 },
    });

    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(2);
    expect(result.data.items[0].properties_count).toBe(1);
    expect(result.data.pagination).toEqual({
      currentPage: 1,
      lastPage: 1,
      perPage: 50,
      total: 2,
      from: 1,
      to: 2,
      hasMorePages: false,
    });
  });

  it('getUsers parses wrapped items/pagination payloads', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 301,
              role: 'landlord',
              email: 'wrapped-landlord@example.com',
              properties: [{ id: 90 }, { id: 91 }],
            },
          ],
          pagination: {
            currentPage: 3,
            lastPage: 5,
            perPage: 20,
            total: 81,
            from: 41,
            to: 60,
            hasMorePages: true,
          },
        },
        message: '',
      },
    });

    const result = await adminService.getUsers({ role: 'landlord' });

    expect(api.get).toHaveBeenCalledWith('/admin/users', {
      params: { role: 'landlord' },
    });

    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0].properties_count).toBe(2);
    expect(result.data.pagination).toEqual({
      currentPage: 3,
      lastPage: 5,
      perPage: 20,
      total: 81,
      from: 41,
      to: 60,
      hasMorePages: true,
    });
  });

  it('searchUserByEmail supports paginated payloads', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          current_page: 1,
          last_page: 1,
          per_page: 50,
          total: 1,
          data: [
            {
              id: 999,
              email: 'find-me@example.com',
              role: 'tenant',
            },
          ],
        },
      },
    });

    const result = await adminService.searchUserByEmail('find-me@example.com');

    expect(result).toEqual({
      success: true,
      data: {
        id: 999,
        email: 'find-me@example.com',
        role: 'tenant',
      },
      message: 'User found',
    });
  });

  it('getPaymentOversightQueue strips empty query values and normalizes records', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          current_page: 2,
          last_page: 5,
          per_page: 25,
          total: 100,
          from: 26,
          to: 50,
          data: [
            {
              id: 44,
              invoice_id: 501,
              tenant_name: 'Jane Doe',
              amount_cents: 7650,
              method: 'Bank Transfer',
              risk_flags: ['multiple_denials_tenant'],
              submitted_at: '2026-04-02T04:00:00.000Z',
            },
          ],
        },
        message: '',
      },
    });

    const result = await adminService.getPaymentOversightQueue({
      status: 'pending',
      risk_flag: 'multiple_denials',
      date_from: '',
      tenant_id: null,
      per_page: 25,
    });

    expect(api.get).toHaveBeenCalledWith('/admin/payments/oversight', {
      params: {
        status: 'pending',
        risk_flag: 'multiple_denials',
        per_page: 25,
      },
    });

    expect(result).toEqual({
      success: true,
      data: {
        items: [
          {
            id: 44,
            invoiceId: 501,
            invoiceReference: null,
            bookingId: null,
            bookingReference: null,
            roomNumber: null,
            propertyId: null,
            propertyTitle: null,
            landlordId: null,
            tenantId: null,
            tenantName: 'Jane Doe',
            amountCents: 7650,
            method: 'bank_transfer',
            reference: null,
            proofImageUrl: null,
            proofImagePath: null,
            status: null,
            transactionStatus: null,
            denialReasonCode: null,
            denialReason: null,
            riskFlags: ['multiple_denials_tenant'],
            submittedAt: '2026-04-02T04:00:00.000Z',
            updatedAt: null,
          },
        ],
        pagination: {
          currentPage: 2,
          lastPage: 5,
          perPage: 25,
          total: 100,
          from: 26,
          to: 50,
          hasMorePages: true,
        },
      },
      message: '',
    });
  });

  it('overrideApprovePayment validates note before request', async () => {
    const result = await adminService.overrideApprovePayment(123, { note: '   ' });

    expect(api.post).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      status: 422,
      error: 'Override note is required.',
    });
  });

  it('overrideApprovePayment posts trimmed note and unwraps invoice', async () => {
    api.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          invoice: {
            id: 70,
            status: 'paid',
          },
        },
        message: 'Payment override applied successfully.',
      },
    });

    const result = await adminService.overrideApprovePayment(70, { note: '  verified manually  ' });

    expect(api.post).toHaveBeenCalledWith('/admin/payments/70/override-approve', {
      note: 'verified manually',
    });

    expect(result).toEqual({
      success: true,
      data: {
        invoice: {
          id: 70,
          status: 'paid',
        },
      },
      message: 'Payment override applied successfully.',
    });
  });

  it('getAuditLogs normalizes metadata and pagination', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          current_page: 1,
          last_page: 1,
          per_page: 50,
          total: 1,
          from: 1,
          to: 1,
          data: [
            {
              id: 900,
              domain: 'payment',
              event: 'payment.admin_overridden',
              metadata: '{"note":"valid override"}',
              actor_id: 3,
              created_at: '2026-04-02T08:00:00.000Z',
            },
          ],
        },
        message: '',
      },
    });

    const result = await adminService.getAuditLogs({
      domain: 'payment',
      from: new Date('2026-04-01T00:00:00.000Z'),
      to: new Date('2026-04-02T00:00:00.000Z'),
    });

    expect(api.get).toHaveBeenCalledWith('/admin/audit-logs', {
      params: {
        domain: 'payment',
        from: '2026-04-01',
        to: '2026-04-02',
      },
    });

    expect(result.data.items[0]).toEqual({
      id: 900,
      domain: 'payment',
      event: 'payment.admin_overridden',
      severity: null,
      summary: null,
      actorId: 3,
      subjectType: null,
      subjectId: null,
      bookingId: null,
      invoiceId: null,
      paymentTransactionId: null,
      tenantId: null,
      landlordId: null,
      propertyId: null,
      metadata: { note: 'valid override' },
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: null,
    });
  });

  it('getAuditTimeline returns normalized timeline list and maps backend errors', async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: 1,
              event: 'payment.denied',
              metadata: { code: 'missing_proof' },
            },
          ],
          message: '',
        },
      })
      .mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      });

    const successResult = await adminService.getAuditTimeline({ entity_type: 'invoice', entity_id: 12 });
    expect(successResult).toEqual({
      success: true,
      data: [
        {
          id: 1,
          domain: null,
          event: 'payment.denied',
          severity: null,
          summary: null,
          actorId: null,
          subjectType: null,
          subjectId: null,
          bookingId: null,
          invoiceId: null,
          paymentTransactionId: null,
          tenantId: null,
          landlordId: null,
          propertyId: null,
          metadata: { code: 'missing_proof' },
          createdAt: null,
          updatedAt: null,
        },
      ],
      message: '',
    });

    const errorResult = await adminService.getAuditTimeline({ entity_type: 'invoice', entity_id: 12 });
    expect(errorResult).toEqual({
      success: false,
      status: 403,
      error: 'Forbidden',
    });
  });
});
