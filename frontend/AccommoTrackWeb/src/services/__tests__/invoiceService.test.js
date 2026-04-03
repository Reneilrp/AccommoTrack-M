import invoiceService from '../invoiceService';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('invoiceService (web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getInvoices sends filters and unwraps data', async () => {
    const invoices = [{ id: 101 }, { id: 102 }];
    api.get.mockResolvedValue({ data: { data: invoices } });

    const result = await invoiceService.getInvoices({ status: 'unpaid' });

    expect(api.get).toHaveBeenCalledWith('/invoices', { params: { status: 'unpaid' } });
    expect(result).toEqual({ success: true, data: invoices });
  });

  it('verifyCash posts action payload', async () => {
    api.post.mockResolvedValue({ data: { data: { verified: true } } });

    const result = await invoiceService.verifyCash(45, 'approve');

    expect(api.post).toHaveBeenCalledWith('/invoices/45/verify-cash', { action: 'approve' });
    expect(result).toEqual({ success: true, data: { verified: true } });
  });

  it('refundTransaction maps API message on failure', async () => {
    api.post.mockRejectedValue({
      response: {
        data: { message: 'Refund exceeds paid amount' },
      },
    });

    const result = await invoiceService.refundTransaction(909, { amount_cents: 1500 });

    expect(api.post).toHaveBeenCalledWith('/transactions/909/refund', { amount_cents: 1500 });
    expect(result).toEqual({
      success: false,
      error: 'Refund exceeds paid amount',
    });
  });

  it('recordPayment falls back to error.message when API message is absent', async () => {
    api.post.mockRejectedValue(new Error('Request timed out'));

    const result = await invoiceService.recordPayment(12, { amount_cents: 5000, method: 'cash' });

    expect(result).toEqual({
      success: false,
      error: 'Request timed out',
    });
  });

  it('getSummary sends range params and unwraps success envelope', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          range: 'month',
          totals: {
            total_paid_cents: 125000,
            total_balance_cents: 50000,
          },
        },
        message: '',
      },
    });

    const result = await invoiceService.getSummary({ range: 'month' });

    expect(api.get).toHaveBeenCalledWith('/invoices/summary', {
      params: { range: 'month' },
    });
    expect(result).toEqual({
      success: true,
      data: {
        range: 'month',
        totals: {
          total_paid_cents: 125000,
          total_balance_cents: 50000,
        },
      },
      message: '',
      error: null,
    });
  });
});
